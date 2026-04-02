/**
 * @author pontx
 * @description SDK CLI 运行入口
 *
 * 支持单 spec 和多 spec 模式，复用 registerSpecCommands 注册命令。
 * 单 spec：命令在根级别，如 yuque call doc getDoc
 * 多 spec：每个 spec 作为子命令，如 cli currency call tag api
 */

import * as path from "path";
import * as fs from "fs";
import { Command } from "commander";
import type { CLIConfig } from "./types";
import { createSdkCliContext } from "./context-adapter";
import { createLogger } from "../logger/logger";
import {
  registerSpecCommands,
  type SpecInfo,
  type ApiSummary,
  type TagSummary,
} from "../cli/spec-commands";
import { listSpecsCommand } from "../commands/list-specs";
import {
  CompletionEngine,
  CompletionDataSource,
  createCompletionInput,
  ParamInfo,
} from "../completion";
import type { PontxSpec } from "@pontx/spec";
import { PontxManager } from "../manager";
import { resolvePlugin } from "../plugin";

/* 声明 banner 注入的全局变量 */
declare global {
  var __CLI_DIR__: string | undefined;
}

/**
 * 获取 CLI 所在目录
 */
function getCliDir(): string {
  return typeof globalThis.__CLI_DIR__ !== "undefined"
    ? globalThis.__CLI_DIR__
    : __dirname;
}

/**
 * 从 CLI 目录加载 specs
 * 单 origin：读取 api-lock.json
 * 多 origin：扫描 *.api-lock.json
 */
function loadSpecs(cliDir: string): PontxSpec[] {
  /* 优先检查单 origin 的 api-lock.json */
  const singlePath = path.join(cliDir, "api-lock.json");
  if (fs.existsSync(singlePath)) {
    try {
      const content = fs.readFileSync(singlePath, "utf-8");
      return [JSON.parse(content) as PontxSpec];
    } catch {
      /* ignore */
    }
  }

  /* 扫描 *.api-lock.json（多 origin） */
  const specs: PontxSpec[] = [];
  try {
    const files = fs.readdirSync(cliDir);
    for (const file of files) {
      if (file.endsWith(".api-lock.json")) {
        const filePath = path.join(cliDir, file);
        const content = fs.readFileSync(filePath, "utf-8");
        specs.push(JSON.parse(content) as PontxSpec);
      }
    }
  } catch {
    /* ignore */
  }

  return specs;
}

/**
 * 从 PontxSpec 构建完整的 SpecInfo（包含 tags 和 apis，用于上下文帮助）
 * 复用 loadSpecInfos 相同的逻辑
 */
function buildSpecInfo(spec: PontxSpec, fallbackName: string): SpecInfo {
  const specName = spec?.name || fallbackName;
  const specApis = spec?.apis || {};
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
  const specTags =
    (spec as any)?.tags as Array<{ name?: string; description?: string }> || [];
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
    name: specName,
    hasTags,
    description: spec?.info?.description || spec?.info?.title,
    tags: hasTags ? [...tagMap.values()] : undefined,
    apis,
  };
}

/**
 * 运行 SDK CLI
 * @param config CLI 配置
 */
export async function runCLI(config: CLIConfig): Promise<void> {
  // 处理 --get-completions 请求
  const args = process.argv;
  const completionIndex = args.indexOf("--get-completions");

  if (completionIndex !== -1) {
    const line = args[completionIndex + 1];
    const wordIndex = parseInt(args[completionIndex + 2], 10) || 0;
    const formatIndex = args.indexOf("--format");
    const format = formatIndex !== -1 ? args[formatIndex + 1] : "plain";

    const cliDir = getCliDir();
    const specs = loadSpecs(cliDir);

    await handleCompletionRequest(config.name, specs, line, wordIndex, format);
    process.exit(0);
  }

  // 1. 获取 CLI 所在目录
  const cliDir = getCliDir();

  // 2. 加载 specs
  const specs = loadSpecs(cliDir);
  if (specs.length === 0) {
    const errorMsg = [
      `错误：找不到 API 规范文件`,
      `  搜索目录: ${cliDir}`,
      ``,
      `提示：`,
      `  - 请先运行 'pontx cli build' 命令构建 CLI`,
      `  - 确保 package.json 的 files 字段包含 dist 目录`,
    ].join("\n");
    throw new Error(errorMsg);
  }

  // 3. 创建 CLI 程序
  const program = createSdkCli({
    name: config.name,
    config,
    specs,
    cliDir,
  });

  // 4. 运行 CLI
  await program.parseAsync(process.argv);
}

/**
 * 创建 SDK CLI 程序
 */
function createSdkCli(options: {
  name: string;
  config: CLIConfig;
  specs: PontxSpec[];
  cliDir: string;
}): Command {
  const { name, config, specs, cliDir } = options;
  const program = new Command(name);
  program.enablePositionalOptions();

  const version = getPackageVersion(cliDir);
  if (version) {
    program.version(version);
  }

  /* 全局选项 */
  program.option(
    "--get-completions <line>",
    "(internal) Get shell completions"
  );
  program.option("--format <format>", "Output format for completions", "plain");

  const logger = createLogger("info", { prefix: "[sdk cli]" });

  if (specs.length === 1) {
    /* 单 spec：命令在根级别（复用 registerSpecCommands） */
    const spec = specs[0];
    const context = createSdkCliContext(config, spec, logger);
    const specInfo = buildSpecInfo(spec, name);
    registerSpecCommands(program, specInfo, context);
  } else {
    /* 多 spec：每个 spec 注册为子命令（复用 factory.ts 模式） */
    const specNames: Array<{ name: string; desc: string }> = [];
    for (const spec of specs) {
      const specName = spec.name || "unknown";
      const context = createSdkCliContext(config, spec, logger);
      const specInfo = buildSpecInfo(spec, specName);
      const fullDesc = spec.info?.title || spec.info?.description || specName;
      const shortDesc = fullDesc.split("\n")[0].trim();
      specNames.push({ name: specName, desc: shortDesc });
      const specCmd = program
        .command(specName)
        .description(shortDesc);
      specCmd.enablePositionalOptions();
      registerSpecCommands(specCmd, specInfo, context);
    }

    /* 在 help 输出前追加 specs 概览 */
    const maxLen = Math.max(...specNames.map((s) => s.name.length));
    const specLines = specNames
      .map((s) => `  ${s.name.padEnd(maxLen + 2)}${s.desc}`)
      .join("\n");
    program.addHelpText(
      "before",
      `\n可用的 Specs:\n\n${specLines}\n\n使用 '${name} <spec> -h' 查看 spec 下的命令。\n`
    );

    /* 全局 list 命令展示所有 specs */
    const allSpecsContext = createMultiSpecContext(config, specs, logger);
    const listCmd = program
      .command("list")
      .alias("ls")
      .description("列举信息（默认列举所有 specs）")
      .option("--json", "以 JSON 格式输出")
      .passThroughOptions()
      .action(async (opts) => {
        try {
          await listSpecsCommand(allSpecsContext, opts);
        } catch (error: any) {
          logger.error("列举 specs 失败", error);
          process.exit(1);
        }
      });
    listCmd
      .command("specs")
      .description("列举所有 specs")
      .option("--json", "以 JSON 格式输出")
      .action(async (opts) => {
        try {
          await listSpecsCommand(allSpecsContext, opts);
        } catch (error: any) {
          logger.error("列举 specs 失败", error);
          process.exit(1);
        }
      });
  }

  /* completion 命令 */
  program
    .command("completion")
    .description("管理 shell 自动补全")
    .argument("[action]", "install | generate | uninstall", "install")
    .option("--shell <shell>", "Shell 类型: bash | zsh | fish")
    .option("--output <path>", "输出脚本到文件")
    .action(async (action, opts) => {
      const { completionCommand } = await import("../commands/completion");
      await completionCommand(action, { ...opts, binName: name });
    });

  return program;
}

/**
 * 获取 package.json 中的版本号
 */
function getPackageVersion(startDir: string): string | null {
  let dir = startDir;
  while (dir !== path.dirname(dir)) {
    const pkgPath = path.join(dir, "package.json");
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
        return pkg.version || null;
      } catch {
        return null;
      }
    }
    dir = path.dirname(dir);
  }
  return null;
}

/**
 * 创建包含所有 specs 的 context（用于多 spec 模式下的全局 list 命令）
 */
function createMultiSpecContext(
  config: CLIConfig,
  specs: PontxSpec[],
  logger: ReturnType<typeof createLogger>
) {
  const origins = specs.map((spec) => ({
    name: spec.name,
    url: "",
    spec,
    remoteSpec: undefined,
    outDir: "",
  }));

  const resolvedConfig = {
    rootDir: "",
    configDir: "",
    configPath: "",
    outDir: "",
    origins,
    resolvedPlugin: resolvePlugin([], config.executeApi),
    executeApiConfig: config.executeApi,
  };

  const manager = new PontxManager();
  manager.resolvedConfig = resolvedConfig;
  manager.logger = logger;
  resolvedConfig.resolvedPlugin.configResolved(resolvedConfig);

  return {
    getManager: async () => manager,
    tryGetLocalManager: async () => manager,
    logger,
  };
}

/**
 * 创建 SDK 补全数据源
 */
function createSdkCompletionDataSource(
  specs: PontxSpec[]
): CompletionDataSource {
  const specMap = new Map(specs.map((s) => [s.name, s]));

  function findSpec(specName: string): PontxSpec | undefined {
    return specMap.get(specName) || specs[0];
  }

  return {
    async getSpecs(): Promise<string[]> {
      return specs.length > 1
        ? specs.map((s) => s.name).filter(Boolean)
        : [];
    },

    async getTags(specName: string): Promise<string[]> {
      const spec = findSpec(specName);
      if (!spec?.apis) return [];

      const tags = new Set<string>();
      for (const apiKey of Object.keys(spec.apis)) {
        if (apiKey.includes("/")) {
          tags.add(apiKey.split("/")[0]);
        }
      }

      return [...tags].sort();
    },

    async getApis(
      specName: string,
      tagName?: string
    ): Promise<Array<{ name: string; description?: string }>> {
      const spec = findSpec(specName);
      if (!spec?.apis) return [];

      const apis: Array<{ name: string; description?: string }> = [];
      for (const [apiKey, api] of Object.entries(spec.apis)) {
        if (tagName) {
          if (apiKey.startsWith(`${tagName}/`)) {
            const apiName = apiKey.split("/")[1];
            apis.push({
              name: apiName,
              description: (api as any).summary || (api as any).description,
            });
          }
        } else {
          apis.push({
            name: apiKey,
            description: (api as any).summary || (api as any).description,
          });
        }
      }

      return apis.sort((a, b) => a.name.localeCompare(b.name));
    },

    async getParams(
      specName: string,
      tagName: string,
      apiName: string
    ): Promise<ParamInfo[]> {
      const spec = findSpec(specName);
      if (!spec?.apis) return [];

      const apiKey = tagName ? `${tagName}/${apiName}` : apiName;
      const api = spec.apis[apiKey] as any;
      if (!api?.parameters) return [];

      return api.parameters.map((p: any) => ({
        name: p.name,
        required: p.required || false,
        type: p.schema?.type || "string",
        description: p.description || p.schema?.description,
      }));
    },
  };
}

/**
 * 处理补全请求
 */
async function handleCompletionRequest(
  binName: string,
  specs: PontxSpec[],
  line: string,
  wordIndex: number,
  format: string = "plain"
): Promise<void> {
  if (specs.length === 0) return;

  const dataSource = createSdkCompletionDataSource(specs);

  const completionOptions: any =
    specs.length === 1
      ? {
          singleSpecName: specs[0].name || "",
          hasTags: specs[0].apis
            ? Object.keys(specs[0].apis).some((key) => key.includes("/"))
            : false,
        }
      : {};

  const engine = new CompletionEngine(completionOptions, dataSource);

  const input = createCompletionInput(line, wordIndex);
  const result = await engine.complete(input);

  if (format === "zsh") {
    for (const s of result.suggestions) {
      const desc = s.description || "";
      const group = s.group || "";
      console.log(`${s.value}\t${desc}\t${group}`);
    }
  } else if (format === "fish") {
    for (const s of result.suggestions) {
      console.log(s.description ? `${s.value}\t${s.description}` : s.value);
    }
  } else {
    for (const s of result.suggestions) {
      console.log(s.value);
    }
  }
}
