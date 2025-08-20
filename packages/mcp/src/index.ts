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
  callTool,
  getApiMeta,
  makeCode,
  searchApis,
  updatePontxManager,
} from "./utils.js";
import fs from "fs";
import path from "path";
import { PontxManager } from "pontx";

const projectRootPath = process.argv?.[2] || process.cwd();

const debug = (info: string) => {
  fs.writeFileSync(path.join(process.cwd(), "debug.log"), info);
};

async function prepare() {
  const pontxManager = await buildPontxManager(projectRootPath);
  const fuse = buildFuse(pontxManager);

  return {
    pontxManager,
    fuse,
  };
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
  let { pontxManager, fuse } = await prepare();

  const updateFuse = async () => {
    pontxManager = await updatePontxManager(pontxManager);
    fuse = buildFuse(pontxManager);
  };

  const samples = await PontxManager.listSamples(pontxManager);
  const sampleEnums = samples.map((sample) => sample.case);
  const sampleDescriptions = samples
    .map((sample) => {
      return `  * ${sample.case}: ${sample.description}`;
    })
    .join("\n");

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
              query: { type: "string", description: "搜索关键字" },
            },
          },
        },
        {
          name: "getApiMeta",
          description:
            "通过 searchApi 搜索结果中的 specName, tagName, apiName 字段，查询 API 元数据，包括入参、出参等",
          inputSchema: {
            type: "object",
            properties: {
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
          },
        },
        {
          name: "makeRequestCode",
          description: "生成项目中精准的 API 调用的示例代码",
          inputSchema: {
            type: "object",
            properties: {
              requestParams: {
                type: "string",
                description:
                  '参照 API 元数据中的 parameters，来构造 API 请求参数。是一个 JSON 字符串。如 {"query": "abc"}',
              },
              case: {
                type: "string",
                enum: sampleEnums,
                description: `请求方式, 可选值为:\n ${sampleDescriptions}`,
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
          },
        },
        // {
        //   name: "callTool",
        //   description: "调用 API 工具",
        //   inputSchema: {
        //     type: "object",
        //     properties: {
        //       specName: {
        //         type: "string",
        //       },
        //       tagName: {
        //         type: "string",
        //       },
        //       apiName: {
        //         type: "string",
        //       },
        //       params: {
        //         type: "string",
        //       },
        //       bodyParams: {
        //         type: "string",
        //       },
        //     },
        //   },
        // },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    switch (request.params.name) {
      case "searchApis": {
        await updateFuse();
        const result = await searchApis(
          request.params.arguments?.query as any,
          fuse
        );

        return {
          content: result.map((item) => {
            return {
              type: "text",
              text: JSON.stringify(item),
            };
          }),
        };
      }

      case "getApiMeta": {
        try {
          await updateFuse();
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

      case "makeRequestCode": {
        try {
          const code = await makeCode(pontxManager, {
            case: request.params.arguments?.case as any,
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
          return {
            content: [
              {
                type: "text",
                text: "代码生成失败: " + e.message,
              },
            ],
          };
        }
      }

      // case "callTool": {
      //   const result = await callTool(
      //     pontxManager,
      //     request.params.arguments?.specName as string,
      //     request.params.arguments?.tagName as string,
      //     request.params.arguments?.apiName as string,
      //     request.params.arguments?.params
      //       ? JSON.parse(request.params.arguments?.params as any)
      //       : undefined,
      //     request.params.arguments?.bodyParams
      //       ? JSON.parse(request.params.arguments?.bodyParams as any)
      //       : undefined
      //   );

      //   return {
      //     content: [
      //       {
      //         type: "text",
      //         text: JSON.stringify(result),
      //       },
      //     ],
      //   };
      // }

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
