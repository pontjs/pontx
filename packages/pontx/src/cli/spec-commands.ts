/**
 * @author jasonHzq
 * @description Spec 作用域命令注册 + 轻量级 spec 信息加载
 *
 * 架构设计：
 * - loadSpecInfos: 优先从 completion manifest 缓存读取 spec 名称和 hasTags 信息（~5ms），
 *   fallback 到静默加载 PontxManager
 * - registerSpecCommands: 在给定的 Commander 父命令下注册所有 spec 作用域子命令
 *   （call, show-api, gen, show-schema, search, list-cases, list）
 */

import type { Command } from "commander";
import type { CliContext } from "./context";
import { registerSpecListCommands } from "./commands/spec/list-commands";
import { listTagsCommand } from "./commands/spec/list-tags";
import * as fs from "fs";
import * as path from "path";

/**
 * Tag 摘要信息
 */
export interface TagSummary {
  name: string;
  description?: string;
  apiCount: number;
}

/**
 * API 摘要信息
 */
export interface ApiSummary {
  /** 如 "pet/getPetById" 或 "getPetById" */
  key: string;
  /** 纯 API 名 */
  name: string;
  tag?: string;
  description?: string;
  method?: string;
  apiPath?: string;
  params?: ParamSummary[];
}

/**
 * API 参数摘要
 */
export interface ParamSummary {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  enum?: string[];
  in?: string;
}

/**
 * Spec 基本信息（用于动态注册子命令）
 */
export interface SpecInfo {
  name: string;
  hasTags: boolean;
  description?: string;
  /** 预加载的 tag 摘要（用于 -h 上下文帮助） */
  tags?: TagSummary[];
  /** 预加载的 API 摘要（用于 -h 上下文帮助） */
  apis?: ApiSummary[];
}

/**
 * 轻量级加载 spec 信息
 * 优先从 completion manifest 缓存读取，fallback 到静默加载 manager
 */
export async function loadSpecInfos(rootDir: string): Promise<SpecInfo[]> {
  /* 1. 尝试从 manifest 缓存读取 */
  const manifest = tryLoadManifestSync(rootDir);
  if (manifest && manifest.length > 0) {
    return manifest;
  }

  /* 2. Fallback: 静默加载 manager */
  try {
    const { PontxManager } = await import("../manager");
    const { createLogger } = await import("../logger/logger");
    const silentLogger = createLogger("silent", { prefix: "[pontx cli]" });
    const manager = await PontxManager.constructorFromRootDir(rootDir, silentLogger);
    return manager.resolvedConfig.origins.map((o) => {
      const specApis = o.spec?.apis || {};
      const apiKeys = Object.keys(specApis);
      const hasTags = apiKeys.some((k) => k.includes("/"));

      const apis: ApiSummary[] = apiKeys.map((key) => {
        const hasSlash = key.includes("/");
        const api = specApis[key] as any;
        return {
          key,
          name: hasSlash ? key.split("/")[1] : key,
          tag: hasSlash ? key.split("/")[0] : undefined,
          description: api?.title || api?.summary || api?.description,
          method: api?.method,
          apiPath: api?.path,
          params: (api?.parameters || []).map((p: any) => ({
            name: p.name,
            type: p.schema?.type || (p.in === "body" ? "object" : "string"),
            required: p.required || false,
            description: p.schema?.description || p.description,
            enum: p.schema?.enum,
            in: p.in,
          })),
        };
      });

      /* 从 spec.tags 获取 tag description */
      const specTags = (o.spec as any)?.tags as Array<{ name?: string; description?: string }> || [];
      const tagDescMap = new Map<string, string>();
      for (const t of specTags) {
        if (t.name && t.description) {
          tagDescMap.set(t.name.toLowerCase(), t.description);
        }
      }

      const tagMap = new Map<string, TagSummary>();
      if (hasTags) {
        for (const a of apis) {
          if (!a.tag) continue;
          const existing = tagMap.get(a.tag);
          if (existing) {
            existing.apiCount++;
          } else {
            tagMap.set(a.tag, {
              name: a.tag,
              description: tagDescMap.get(a.tag.toLowerCase()),
              apiCount: 1,
            });
          }
        }
      }

      return {
        name: o.name,
        hasTags,
        description: o.spec?.info?.description || o.spec?.info?.title,
        tags: hasTags ? [...tagMap.values()] : undefined,
        apis,
      };
    });
  } catch {
    return [];
  }
}

/**
 * 同步尝试从 manifest 缓存读取 spec 信息
 */
function tryLoadManifestSync(rootDir: string): SpecInfo[] | null {
  try {
    const manifestPath = path.join(rootDir, "node_modules", ".pontx-cache", "completion-manifest.json");
    if (!fs.existsSync(manifestPath)) {
      return null;
    }
    const content = fs.readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(content);
    if (!manifest || manifest.version !== 1) {
      return null;
    }
    const allSpecs = [
      ...(manifest.local?.specs || []),
      ...(manifest.external?.specs || []),
    ];
    if (allSpecs.length === 0) {
      return null;
    }
    return allSpecs.map((s: any) => {
      /* 构建 tag name 规范化映射：API key 前缀 → s.tags 中的正式名称 */
      const tagNameMap = new Map<string, string>();
      for (const t of s.tags || []) {
        if (t.name) {
          tagNameMap.set(t.name.toLowerCase(), t.name);
        }
      }

      const apis: ApiSummary[] = (s.apis || []).map((a: any) => {
        const key = a.name || "";
        const hasSlash = key.includes("/");
        const rawTag = hasSlash ? key.split("/")[0] : undefined;
        /* 优先使用 s.tags 中定义的规范 tag name，避免缓存中 API key 前缀大小写不一致 */
        const tag = rawTag
          ? tagNameMap.get(rawTag.toLowerCase()) || rawTag
          : undefined;
        return {
          key,
          name: hasSlash ? key.split("/")[1] : key,
          tag,
          description: a.title || a.description,
          params: (a.params || []).map((p: any) => ({
            name: p.name,
            type: p.type || "string",
            required: p.required || false,
            description: p.description,
            enum: p.enum,
            in: p.in,
          })),
        };
      });
      const hasTags = apis.some((a) => a.tag);

      /* 按 tag 聚合 */
      const tagMap = new Map<string, TagSummary>();
      if (hasTags) {
        for (const a of apis) {
          if (!a.tag) continue;
          const existing = tagMap.get(a.tag);
          if (existing) {
            existing.apiCount++;
          } else {
            const tagEntry = (s.tags || []).find(
              (t: any) => t.name?.toLowerCase() === a.tag?.toLowerCase()
            );
            tagMap.set(a.tag, {
              name: a.tag,
              description: tagEntry?.description,
              apiCount: 1,
            });
          }
        }
      }

      return {
        name: s.name,
        hasTags,
        description: s.description,
        tags: hasTags ? [...tagMap.values()] : undefined,
        apis,
      };
    });
  } catch {
    return null;
  }
}

/**
 * 从 process.argv 提取 call 命令之后的原始参数（用于 API 参数解析）
 */
function extractRawArgs(command: string): string[] {
  const argv = process.argv;
  const cmdIndex = argv.indexOf(command);
  if (cmdIndex === -1) return [];

  /* 跳过命令后的位置参数，找到第一个 flag */
  let startIndex = cmdIndex + 1;
  while (startIndex < argv.length && !argv[startIndex].startsWith("-")) {
    startIndex++;
  }
  return argv.slice(startIndex);
}

/**
 * 收集重复选项值的辅助函数
 */
function collectOption(val: string, acc: string[]): string[] {
  acc.push(val);
  return acc;
}

export interface RegisterSpecCommandsOptions {
  /** 跳过 list 命令注册（用于单 spec 根级别，避免与全局 list 冲突） */
  skipList?: boolean;
}

/**
 * 在给定的 Commander 父命令下注册所有 spec 作用域命令
 */
export function registerSpecCommands(
  parent: Command,
  specInfo: SpecInfo,
  ctx: CliContext,
  options?: RegisterSpecCommandsOptions
): void {
  const { name: specName, hasTags } = specInfo;

  /* ========== call ========== */
  const callCmd = parent.command("call");
  if (hasTags) {
    callCmd.argument("<tag>", "Tag/命名空间");
    callCmd.argument("<api>", "API 名称");
  } else {
    callCmd.argument("<api>", "API 名称");
  }
  callCmd
    .description("调用 API 接口")
    .option("-H, --header <header>", "添加请求头 (可多次使用)", collectOption, [])
    .option("-o, --output <path>", "输出结果到文件")
    .option("-q, --query <expression>", "JMESPath 查询表达式")
    .option("--debug", "显示详细请求/响应信息")
    .option("--curl", "输出脱敏 cURL 请求预览")
    .option("--dry-run", "只显示请求，不实际执行")
    .option("--confirm <token>", "确认并执行与 dry-run 完全一致的变更请求")
    .option("--use-remote", "使用远程元数据")
    .option("-e, --env <env>", "指定环境/baseUrl")
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .action(async (...args) => {
      const { callCommand } = await import("./commands/spec/call");
      const rawArgs = extractRawArgs("call");
      if (hasTags) {
        const [tag, api, options] = args;
        await callCommand(ctx, specName, tag, api, rawArgs, options);
      } else {
        const [api, options] = args;
        await callCommand(ctx, specName, "", api, rawArgs, options);
      }
    });
  addApiHelpText(callCmd, "call", specInfo);

  /* ========== show-api ========== */
  const showApiCmd = parent.command("show-api");
  if (hasTags) {
    showApiCmd.argument("<tag>", "Tag/命名空间");
    showApiCmd.argument("<api>", "API 名称");
  } else {
    showApiCmd.argument("<api>", "API 名称");
  }
  showApiCmd
    .description("查看 API 元数据")
    .option("--use-remote", "使用远程元数据")
    .action(async (...args) => {
      const { showApiCommand } = await import("./commands/spec/show-api");
      if (hasTags) {
        await showApiCommand(ctx, specName, args[0], args[1], args[2]);
      } else {
        await showApiCommand(ctx, specName, "", args[0], args[1]);
      }
    });
  addApiHelpText(showApiCmd, "show-api", specInfo);

  /* ========== gen ========== */
  const genCmd = parent.command("gen");
  if (hasTags) {
    genCmd.argument("<tag>", "Tag/命名空间");
    genCmd.argument("<api>", "API 名称");
  } else {
    genCmd.argument("<api>", "API 名称");
  }
  genCmd
    .description("生成 API 调用示例代码")
    .option("--case <case>", "代码模板名称", "request")
    .option("--params <json>", "请求参数，JSON 格式")
    .option("--body <json>", "请求体参数，JSON 格式")
    .option("--use-remote", "使用远程元数据")
    .action(async (...args) => {
      const { genCommand } = await import("./commands/spec/gen");
      if (hasTags) {
        await genCommand(ctx, specName, args[0], args[1], args[2]);
      } else {
        await genCommand(ctx, specName, "", args[0], args[1]);
      }
    });
  addApiHelpText(genCmd, "gen", specInfo);

  /* ========== show-schema ========== */
  parent
    .command("show-schema <schema>")
    .description("查看 Schema 元数据")
    .option("--use-remote", "使用远程元数据")
    .action(async (schemaName, options) => {
      const { showSchemaCommand } = await import("./commands/spec/show-schema");
      await showSchemaCommand(ctx, specName, schemaName, options);
    });

  /* ========== search ========== */
  parent
    .command("search <keyword>")
    .description("搜索 API 接口")
    .option("--max <count>", "最大返回数量", "6")
    .option("--use-remote", "使用远程元数据")
    .action(async (keyword, options) => {
      const { searchCommand } = await import("./commands/spec/search");
      await searchCommand(ctx, specName, keyword, options);
    });

  /* ========== list-cases ========== */
  parent
    .command("list-cases")
    .description("获取可用的代码生成 case 列表")
    .action(async () => {
      const { listCasesCommand } = await import("./commands/spec/list-cases");
      await listCasesCommand(ctx);
    });

  /* ========== list (tags/apis/schemas) ========== */
  if (!options?.skipList) {
    const listCmd = parent
      .command("list")
      .alias("ls")
      .description("列举信息（默认列举 tags）")
      .option("--use-remote", "使用远程元数据")
      .option("--json", "以 JSON 格式输出")
      .passThroughOptions()
      .action(async (opts) => {
        /* 默认行为：列举 tags */
        await listTagsCommand(ctx, specName, opts);
      });
    registerSpecListCommands(listCmd, specName, ctx);
  }
}

/**
 * 为 API 路径命令（call/show-api/gen）添加上下文帮助
 *
 * - pontx call -h                     → 显示可用 tags（有 tags 时）或前 10 个 APIs
 * - pontx call <tag> -h               → 显示该 tag 下的 APIs
 * - pontx call <tag> <api> -h         → 显示该 API 的入参信息
 * - pontx call <api> -h（无 tags 时） → 显示该 API 的入参信息
 */
function addApiHelpText(cmd: Command, cmdName: string, specInfo: SpecInfo): void {
  const { hasTags, tags, apis, name: specName } = specInfo;

  cmd.addHelpText("after", () => {
    if (!apis) return "";

    /* 从 process.argv 提取位置参数 */
    const argv = process.argv;
    const cmdIndex = argv.indexOf(cmdName);
    if (cmdIndex === -1) return "";

    /* 收集命令后的非 flag 位置参数 */
    const positionals: string[] = [];
    for (let i = cmdIndex + 1; i < argv.length; i++) {
      if (argv[i].startsWith("-")) break;
      positionals.push(argv[i]);
    }

    if (hasTags) {
      const [providedTag, providedApi] = positionals;

      /* ---- 第三层: pontx call <tag> <api> -h → API 参数帮助 ---- */
      if (providedTag && providedApi) {
        const api = apis.find((a) => a.tag === providedTag && a.name === providedApi);
        if (api) return formatApiParamHelp(api, cmdName, specName, providedTag);
        return `\nAPI "${providedTag}/${providedApi}" 未找到。使用 'pontx ${cmdName} ${providedTag} -h' 查看可用 APIs。`;
      }

      /* ---- 第二层: pontx call <tag> -h → 该 tag 下的 APIs ---- */
      if (providedTag) {
        const tagApis = apis.filter((a) => a.tag === providedTag);
        if (tagApis.length === 0) {
          return `\nTag "${providedTag}" 下没有找到 API。\n使用 'pontx list tags' 查看所有可用 tags。`;
        }
        const lines = [`\n"${providedTag}" 下可用的 APIs (${tagApis.length} 个):\n`];
        for (const a of tagApis) {
          lines.push(a.description ? `  ${a.name}  ${a.description}` : `  ${a.name}`);
        }
        return lines.join("\n");
      }

      /* ---- 第一层: pontx call -h → 可用 tags ---- */
      if (tags && tags.length > 0) {
        const lines = ["\n可用的 Tags:\n"];
        for (const t of tags) {
          const desc = t.description ? `  ${t.description}` : "";
          lines.push(`  ${t.name}  (${t.apiCount} APIs)${desc}`);
        }
        lines.push(`\n提示: '${cmdName} <tag> -h' 查看 tag 下的 APIs, '${cmdName} <tag> <api> -h' 查看 API 参数。`);
        return lines.join("\n");
      }
    } else {
      const [providedApi] = positionals;

      /* ---- 无 tags + 有 api: pontx call <api> -h → API 参数帮助 ---- */
      if (providedApi) {
        const api = apis.find((a) => a.name === providedApi);
        if (api) return formatApiParamHelp(api, cmdName, specName);
        return `\nAPI "${providedApi}" 未找到。使用 'pontx search <keyword>' 搜索。`;
      }

      /* ---- 无 tags + 无 api: pontx call -h → 前 10 个 APIs ---- */
      if (apis.length > 0) {
        const shown = apis.slice(0, 10);
        const lines = [`\n可用的 APIs (共 ${apis.length} 个${apis.length > 10 ? "，显示前 10 个" : ""}):\n`];
        for (const a of shown) {
          lines.push(a.description ? `  ${a.name}  ${a.description}` : `  ${a.name}`);
        }
        if (apis.length > 10) {
          lines.push(`\n使用 'pontx search <keyword>' 搜索更多 APIs。`);
        }
        return lines.join("\n");
      }
    }

    return "";
  });
}

/**
 * 格式化 API 参数帮助信息
 */
function formatApiParamHelp(api: ApiSummary, cmdName: string, specName: string, tagName?: string): string {
  const lines: string[] = [];
  const apiDisplay = tagName ? `${tagName}/${api.name}` : api.name;

  lines.push("");
  lines.push(`API: ${apiDisplay}`);
  if (api.description) lines.push(`  ${api.description}`);
  if (api.method || api.apiPath) {
    lines.push(`  ${(api.method || "GET").toUpperCase()} ${api.apiPath || ""}`);
  }

  const params = api.params || [];
  if (params.length === 0) {
    lines.push("\n  该 API 无参数。");
  } else {
    const required = params.filter((p) => p.required);
    const optional = params.filter((p) => !p.required);

    if (required.length > 0) {
      lines.push("\n必填参数:");
      for (const p of required) {
        const desc = p.description ? `  ${p.description}` : "";
        const enumStr = p.enum ? ` [${p.enum.join("|")}]` : "";
        lines.push(`  --${p.name} <${p.type}>${enumStr}${desc}`);
      }
    }

    if (optional.length > 0) {
      lines.push("\n可选参数:");
      for (const p of optional) {
        const desc = p.description ? `  ${p.description}` : "";
        const enumStr = p.enum ? ` [${p.enum.join("|")}]` : "";
        lines.push(`  --${p.name} <${p.type}>${enumStr}${desc}`);
      }
    }

    /* 生成示例命令 */
    const cmdParts = [cmdName];
    if (tagName) cmdParts.push(tagName);
    cmdParts.push(api.name);
    for (const p of required) {
      cmdParts.push(`--${p.name} <${p.type}>`);
    }
    lines.push(`\n示例: pontx ${cmdParts.join(" ")}`);
  }

  return lines.join("\n");
}
