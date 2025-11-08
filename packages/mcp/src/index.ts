#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  buildFuse,
  buildPontxManager,
  callApiExecutor,
  getApiMeta,
  getSchemaMeta,
  makeCode,
  searchApis,
  updatePontxManager,
} from "./utils.js";
import fs from "fs";
import path from "path";
import { PontxManager } from "pontx";
import Fuse from "fuse.js";

// 特殊标记，表示 MCP 是全局配置的
const GLOBAL_MCP_MARKER = "GLOBAL_MCP";

// 检测是否是全局配置模式
const isGlobalMode = process.argv?.[2] === GLOBAL_MCP_MARKER;

// 默认项目路径（仅在非全局模式下有效）
const defaultProjectPath = isGlobalMode
  ? undefined
  : process.argv?.[2] || process.env.PONTX_PROJECT_PATH || process.cwd();

// 增强的调试日志功能
const DEBUG_FILE =
  process.env.PONTX_DEBUG_FILE || path.join(process.cwd(), "mcp-debug.log");
const isDebugMode =
  process.env.DEBUG?.includes("pontx") || process.env.PONTX_DEBUG === "true";

const debug = (info: string, level: "info" | "error" | "warn" = "info") => {
  if (!isDebugMode) return;

  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${info}\n`;

  try {
    // 写入文件（追加模式）
    fs.appendFileSync(DEBUG_FILE, logMessage);

    // 同时输出到 stderr（不会污染 stdio 的 JSON-RPC 通信）
    console.error(`[PontX Debug] ${info}`);
  } catch (e) {
    console.error(`[PontX Debug] Failed to write debug log: ${e}`);
  }
};

// 缓存管理器，避免重复构建
const managerCache = new Map<
  string,
  { pontxManager: PontxManager; fuse: Fuse<any>; timestamp: number }
>();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存过期时间

// 获取或创建 PontxManager 和 Fuse 实例
async function getOrCreateManager(projectPath: string) {
  const normalizedPath = path.resolve(projectPath);
  const cached = managerCache.get(normalizedPath);

  // 检查缓存是否有效
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    // 更新缓存的 PontxManager
    const updatedManager = await updatePontxManager(cached.pontxManager);
    const updatedFuse = buildFuse(updatedManager);

    // 更新缓存
    managerCache.set(normalizedPath, {
      pontxManager: updatedManager,
      fuse: updatedFuse,
      timestamp: Date.now(),
    });

    return { pontxManager: updatedManager, fuse: updatedFuse };
  }

  // 创建新的实例
  const pontxManager = await buildPontxManager(normalizedPath);
  const fuse = buildFuse(pontxManager);

  // 存入缓存
  managerCache.set(normalizedPath, {
    pontxManager,
    fuse,
    timestamp: Date.now(),
  });

  return { pontxManager, fuse };
}

const server = new Server(
  {
    name: "pontx",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
      // prompts: {},
    },
    instructions: `搜索当前工程可以调用的后端接口、 OpenAPI 接口，并获取该接口的元数据（包括出入参等），并生成符合项目风格的不同场景的 API 调用代码。`,
  }
);

async function main() {
  const transport = new StdioServerTransport();

  // 打印模式信息到 stderr（MCP 协议要求 stdout 只用于 JSON-RPC 通信）
  // 注意：这里使用 console.error 不是因为这是错误，而是因为需要输出到 stderr
  if (isGlobalMode) {
    console.error(
      "[PontX MCP] Running in GLOBAL mode - projectPath is required for all tools"
    );
    debug("MCP Server started in GLOBAL mode");
  } else {
    console.error(
      `[PontX MCP] Running in PROJECT mode - default path: ${defaultProjectPath}`
    );
    debug(
      `MCP Server started in PROJECT mode with path: ${defaultProjectPath}`
    );
  }

  if (isDebugMode) {
    console.error(
      `[PontX MCP] Debug mode enabled, logs will be written to: ${DEBUG_FILE}`
    );
  }

  // 初始化时尝试加载默认项目的配置（仅在非全局模式下）
  let defaultManager: PontxManager | null = null;
  let defaultSamples: any[] = [];

  if (!isGlobalMode && defaultProjectPath) {
    try {
      const { pontxManager } = await getOrCreateManager(defaultProjectPath);
      defaultManager = pontxManager;
      defaultSamples = await PontxManager.listSamples(defaultManager);
    } catch (e) {
      // 默认项目路径可能没有 pontx 配置，这是正常的
      console.error("No default Pontx config found at default path");
    }
  }

  // 移除固定的 sampleEnums 和 sampleDescriptions，改为动态获取

  // tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "searchApis",
          description: "搜索当前项目可以调用的 API 接口",
          inputSchema: {
            type: "object",
            properties: {
              projectPath: {
                type: "string",
                description: isGlobalMode
                  ? "项目根路径（必填）"
                  : "项目根路径，如果不提供则使用默认路径",
              },
              query: { type: "string", description: "搜索关键字" },
              maxCount: {
                type: "number",
                description: "最大返回数量，默认值为 6",
              },
            },
            required: isGlobalMode ? ["query", "projectPath"] : ["query"],
          },
        },
        {
          name: "getApiMeta",
          description:
            "通过 searchApi 搜索结果中的 specName, tagName, apiName 字段，查询 API 元数据，包括入参、出参等",
          inputSchema: {
            type: "object",
            properties: {
              projectPath: {
                type: "string",
                description: isGlobalMode
                  ? "项目根路径（必填）"
                  : "项目根路径，如果不提供则使用默认路径",
              },
              specName: {
                type: "string",
              },
              tagName: {
                type: "string",
              },
              apiName: {
                type: "string",
              },
            },
            required: isGlobalMode
              ? ["specName", "apiName", "projectPath"]
              : ["specName", "apiName"],
          },
        },
        {
          name: "getSchemaMeta",
          description:
            "通过 getApiMeta 返回元数据中引用的 Schema，查询 Schema 元数据",
          inputSchema: {
            type: "object",
            properties: {
              projectPath: {
                type: "string",
                description: isGlobalMode
                  ? "项目根路径（必填）"
                  : "项目根路径，如果不提供则使用默认路径",
              },
              schemaName: {
                type: "string",
                description:
                  "例如 ResultDTO，可以从 $res 字段提取，例如 '#/components/schemas/ResultDTO'",
              },
              specName: {
                type: "string",
                description: "searchApi 搜索结果中的 specName",
              },
            },
            required: isGlobalMode
              ? ["schemaName", "specName", "projectPath"]
              : ["schemaName", "specName"],
          },
        },
        {
          name: "makeRequestCode",
          description: "生成项目中精准的 API 调用的示例代码",
          inputSchema: {
            type: "object",
            properties: {
              projectPath: {
                type: "string",
                description: isGlobalMode
                  ? "项目根路径（必填）"
                  : "项目根路径，如果不提供则使用默认路径",
              },
              requestParams: {
                type: "string",
                description:
                  '参照 API 元数据中的 parameters，来构造 API 请求参数。是一个 JSON 字符串。如 {"query": "abc"}',
              },
              case: {
                type: "string",
                description:
                  "代码生成模板名称，常见值: request (基础请求), reactHooks (React Hooks)。不同项目可能有自定义模板，请先使用 listSampleCases 查询可用模板",
              },
              specName: {
                type: "string",
                description: "specName",
              },
              tagName: {
                type: "string",
                description: "tagName",
              },
              apiName: {
                type: "string",
                description: "apiName",
              },
            },
            required: isGlobalMode
              ? ["case", "specName", "apiName", "projectPath"]
              : ["case", "specName", "apiName"],
          },
        },
        {
          name: "listSampleCases",
          description: "获取指定项目可用的代码生成模板列表",
          inputSchema: {
            type: "object",
            properties: {
              projectPath: {
                type: "string",
                description: isGlobalMode
                  ? "项目根路径（必填）"
                  : "项目根路径，如果不提供则使用默认路径",
              },
            },
          },
        },
        {
          name: "callApi",
          description: "调用 API，并获取返回结果",
          inputSchema: {
            type: "object",
            properties: {
              projectPath: {
                type: "string",
                description: isGlobalMode
                  ? "项目根路径（必填）"
                  : "项目根路径，如果不提供则使用默认路径",
              },
              specName: {
                type: "string",
              },
              tagName: {
                type: "string",
              },
              apiName: {
                type: "string",
              },
              params: {
                type: "string",
                description:
                  'API 请求参数，包括 path 和 query 参数。是一个 JSON 字符串。如 {"name": "abc"}',
              },
              bodyParams: {
                type: "string",
                description: "API 请求体参数",
              },
              baseUrl: {
                type: "string",
                description:
                  "API 请求基础 URL，如果不提供则使用项目 spec 中默认的 baseUrl",
              },
            },
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    debug(
      `Tool called: ${request.params.name} with args: ${JSON.stringify(
        request.params.arguments
      )}`
    );

    switch (request.params.name) {
      case "searchApis": {
        try {
          const projectPath =
            (request.params.arguments?.projectPath as string) ||
            defaultProjectPath;

          debug(
            `searchApis: projectPath=${projectPath}, query=${request.params.arguments?.query}`
          );

          // 全局模式下检查 projectPath 是否提供
          if (isGlobalMode && !projectPath) {
            return {
              content: [
                {
                  type: "text",
                  text: `错误：在全局模式下，projectPath 参数是必填的。\n请提供项目路径，例如：{ "projectPath": "/path/to/your/project" }`,
                },
              ],
            };
          }

          const { fuse } = await getOrCreateManager(projectPath);
          const result = await searchApis(
            request.params.arguments?.query as any,
            fuse,
            request.params.arguments?.maxCount as number
          );

          return {
            content: result.map((item) => {
              return {
                type: "text",
                text: JSON.stringify(item),
              };
            }),
          };
        } catch (e: any) {
          return {
            content: [
              {
                type: "text",
                text: `搜索 API 失败: ${e.message}`,
              },
            ],
          };
        }
      }

      case "getApiMeta": {
        try {
          const projectPath =
            (request.params.arguments?.projectPath as string) ||
            defaultProjectPath;

          // 全局模式下检查 projectPath 是否提供
          if (isGlobalMode && !projectPath) {
            return {
              content: [
                {
                  type: "text",
                  text: `错误：在全局模式下，projectPath 参数是必填的。\n请提供项目路径，例如：{ "projectPath": "/path/to/your/project" }`,
                },
              ],
            };
          }

          const { pontxManager } = await getOrCreateManager(projectPath);
          const apiMeta = await getApiMeta(
            pontxManager,
            request.params.arguments?.specName as string,
            request.params.arguments?.tagName as string,
            request.params.arguments?.apiName as string
          );

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(apiMeta),
              },
            ],
          };
        } catch (e: any) {
          return {
            content: [
              {
                type: "text",
                text: "获取元数据失败 " + e.message,
              },
            ],
          };
        }
      }

      case "getSchemaMeta": {
        try {
          const projectPath =
            (request.params.arguments?.projectPath as string) ||
            defaultProjectPath;

          // 全局模式下检查 projectPath 是否提供
          if (isGlobalMode && !projectPath) {
            return {
              content: [
                {
                  type: "text",
                  text: `错误：在全局模式下，projectPath 参数是必填的。\n请提供项目路径，例如：{ "projectPath": "/path/to/your/project" }`,
                },
              ],
            };
          }

          const { pontxManager } = await getOrCreateManager(projectPath);
          const schemaMeta = await getSchemaMeta(
            pontxManager,
            request.params.arguments?.specName as string,
            request.params.arguments?.schemaName as string
          );

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(schemaMeta),
              },
            ],
          };
        } catch (e: any) {
          return {
            content: [
              {
                type: "text",
                text: "获取 Schema 元数据失败 " + e.message,
              },
            ],
          };
        }
      }

      case "listSampleCases": {
        try {
          const projectPath =
            (request.params.arguments?.projectPath as string) ||
            defaultProjectPath;

          // 全局模式下检查 projectPath 是否提供
          if (isGlobalMode && !projectPath) {
            return {
              content: [
                {
                  type: "text",
                  text: `错误：在全局模式下，projectPath 参数是必填的。\n请提供项目路径，例如：{ "projectPath": "/path/to/your/project" }`,
                },
              ],
            };
          }

          const { pontxManager } = await getOrCreateManager(projectPath);
          const samples = await PontxManager.listSamples(pontxManager);

          const sampleList = samples.map((sample) => ({
            case: sample.case,
            description: sample.description,
          }));

          // 检测 pontx 库是否支持内置生成器（但不作为默认值）
          const builtinSupport = [];
          // 注：这些只是 pontx 库可能支持的内置生成器，不是所有项目都会使用
          if (!samples.find((s) => s.case === "request")) {
            builtinSupport.push({
              case: "request",
              description: "pontx 内置基础请求生成器（如果可用）",
              type: "builtin",
            });
          }
          if (!samples.find((s) => s.case === "reactHooks")) {
            builtinSupport.push({
              case: "reactHooks",
              description: "pontx 内置 React Hooks 生成器（如果可用）",
              type: "builtin",
            });
          }

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    projectPath,
                    projectSamples: sampleList,
                    pontxBuiltinGenerators: builtinSupport,
                    note: "项目配置的模板优先级高于 pontx 内置生成器",
                  },
                  null,
                  2
                ),
              },
            ],
          };
        } catch (e: any) {
          return {
            content: [
              {
                type: "text",
                text: `获取代码模板列表失败: ${e.message}`,
              },
            ],
          };
        }
      }

      case "makeRequestCode": {
        try {
          const projectPath =
            (request.params.arguments?.projectPath as string) ||
            defaultProjectPath;

          // 全局模式下检查 projectPath 是否提供
          if (isGlobalMode && !projectPath) {
            return {
              content: [
                {
                  type: "text",
                  text: `错误：在全局模式下，projectPath 参数是必填的。\n请提供项目路径，例如：{ "projectPath": "/path/to/your/project" }`,
                },
              ],
            };
          }

          const { pontxManager } = await getOrCreateManager(projectPath);
          const requestedCase = request.params.arguments?.case as string;

          // 直接尝试生成代码，让 makeCode 函数处理回退逻辑
          // makeCode 会：
          // 1. 先尝试项目的 samples
          // 2. 如果没找到，尝试 pontx 内置的生成器（request/reactHooks）
          // 3. 都没有才报错
          const code = await makeCode(pontxManager, {
            case: requestedCase,
            specName: request.params.arguments?.specName as string,
            tagName: request.params.arguments?.tagName as string,
            apiName: request.params.arguments?.apiName as string,
            requestParams: request.params.arguments?.requestParams
              ? JSON.parse(request.params.arguments?.requestParams as any)
              : {},
            bodyParams: request.params.arguments?.bodyParams
              ? JSON.parse(request.params.arguments?.bodyParams as any)
              : {},
          });

          return {
            content: [
              {
                type: "text",
                text: code,
              },
            ],
          };
        } catch (e: any) {
          // 获取项目实际支持的 samples 以提供更准确的错误信息
          try {
            const projectPath =
              (request.params.arguments?.projectPath as string) ||
              defaultProjectPath;
            const { pontxManager } = await getOrCreateManager(projectPath);
            const samples = await PontxManager.listSamples(pontxManager);
            const projectCases = samples.map((s) => s.case);

            let errorMessage = `代码生成失败: ${e.message}\n\n`;

            if (e.message.includes("找不到 case")) {
              errorMessage += `该项目配置的代码模板：\n`;
              if (projectCases.length > 0) {
                errorMessage += projectCases.map((c) => `  - ${c}`).join("\n");
              } else {
                errorMessage += `  (无项目自定义模板)`;
              }

              errorMessage += `\n\npontx 可能支持的内置生成器：\n`;
              errorMessage += `  - request (如果 pontx.generateApiRequestCode 可用)\n`;
              errorMessage += `  - reactHooks (如果 pontx.generateApiUseRequestCode 可用)\n`;
              errorMessage += `\n请使用 listSampleCases 查询详细信息`;
            }

            return {
              content: [
                {
                  type: "text",
                  text: errorMessage,
                },
              ],
            };
          } catch {
            // 如果获取 samples 失败，返回原始错误
            return {
              content: [
                {
                  type: "text",
                  text: `代码生成失败: ${e.message}\n\n请使用 listSampleCases 查询可用的代码模板`,
                },
              ],
            };
          }
        }
      }

      case "callApi": {
        const projectPath =
          (request.params.arguments?.projectPath as string) ||
          defaultProjectPath;

        // 全局模式下检查 projectPath 是否提供
        if (isGlobalMode && !projectPath) {
          return {
            content: [
              {
                type: "text",
                text: `错误：在全局模式下，projectPath 参数是必填的。\n请提供项目路径，例如：{ "projectPath": "/path/to/your/project" }`,
              },
            ],
          };
        }

        const { pontxManager } = await getOrCreateManager(projectPath);
        const result = await callApiExecutor(
          pontxManager,
          request.params.arguments?.specName as string,
          request.params.arguments?.tagName as string,
          request.params.arguments?.apiName as string,
          request.params.arguments?.params
            ? JSON.parse(request.params.arguments?.params as any)
            : undefined,
          request.params.arguments?.bodyParams
            ? JSON.parse(request.params.arguments?.bodyParams as any)
            : undefined,
          request.params.arguments?.baseUrl as string
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result),
            },
          ],
        };
      }

      default:
        throw new Error("Unknown tool");
    }
  });

  // server.setRequestHandler(ListPromptsRequestSchema, async () => {
  //   return {
  //     prompts: [
  //       {
  //         name: "searchApis",
  //         description: "搜索当前项目可以调用的 API 接口",
  //         inputSchema: {
  //           type: "object",
  //         },
  //       },
  //     ],
  //   };
  // });

  // server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  //   return {
  //     prompt: {
  //       name: "searchApis",
  //     },
  //   };
  // });

  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
