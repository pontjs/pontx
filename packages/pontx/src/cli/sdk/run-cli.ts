/**
 * @author pontx
 * @description SDK CLI 运行入口
 *
 * SDK CLI 天然是单 spec 模式，复用 registerSpecCommands 注册命令。
 * 命令格式：yuque call doc getDoc（位置参数风格）
 */

import * as path from "path";
import * as fs from "fs";
import { Command } from "commander";
import type { CLIConfig } from "./types";
import { createSdkCliContext } from "./context-adapter";
import { createLogger } from "../../logger/logger";
import { registerSpecCommands, type SpecInfo } from "../spec-commands";
import { listSpecsCommand } from "../commands/list-specs";
import {
  CompletionEngine,
  CompletionDataSource,
  createCompletionInput,
  ParamInfo,
} from "../completion";
import type { PontxSpec } from "@pontx/spec";

/* 声明 banner 注入的全局变量 */
declare global {
  var __CLI_DIR__: string | undefined;
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

    const cliDir =
      typeof globalThis.__CLI_DIR__ !== "undefined"
        ? globalThis.__CLI_DIR__
        : __dirname;
    const specPath = path.join(cliDir, "api-lock.json");

    await handleCompletionRequest(
      config.name,
      specPath,
      line,
      wordIndex,
      format
    );
    process.exit(0);
  }

  // 1. 获取 CLI 所在目录
  const cliDir =
    typeof globalThis.__CLI_DIR__ !== "undefined"
      ? globalThis.__CLI_DIR__
      : __dirname;

  // 2. 解析 spec 路径
  const specPath = path.join(cliDir, "api-lock.json");

  // 3. 检查文件是否存在
  if (!fs.existsSync(specPath)) {
    const errorMsg = [
      `错误：找不到 API 规范文件`,
      `  期望路径: ${specPath}`,
      ``,
      `提示：`,
      `  - 请先运行 'pontx cli build' 命令构建 CLI`,
      `  - 确保 package.json 的 files 字段包含 dist 目录`,
    ].join("\n");
    throw new Error(errorMsg);
  }

  // 4. 创建 CLI 程序
  const program = createSdkCli({
    name: config.name,
    config,
    specPath,
    cliDir,
  });

  // 5. 运行 CLI
  await program.parseAsync(process.argv);
}

/**
 * 创建 SDK CLI 程序
 */
function createSdkCli(options: {
  name: string;
  config: CLIConfig;
  specPath: string;
  cliDir: string;
}): Command {
  const { name, config, specPath, cliDir } = options;
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

  /* 创建上下文 */
  const logger = createLogger("info", { prefix: "[sdk cli]" });
  const context = createSdkCliContext(config, specPath, logger);

  /* 加载 spec 获取 hasTags 信息 */
  const spec = loadSpec(specPath);
  const specName = spec?.name || name;
  const hasTags = spec?.apis
    ? Object.keys(spec.apis).some((key) => key.includes("/"))
    : false;

  const specInfo: SpecInfo = {
    name: specName,
    hasTags,
    description: spec?.info?.description || spec?.info?.title,
  };

  /* 使用 registerSpecCommands 注册所有 spec 作用域命令（单 spec，直接在根级别） */
  registerSpecCommands(program, specInfo, context);

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
 * 加载 spec 文件
 */
function loadSpec(specPath: string): PontxSpec | null {
  try {
    if (fs.existsSync(specPath)) {
      const content = fs.readFileSync(specPath, "utf-8");
      return JSON.parse(content);
    }
  } catch {
    // Ignore errors
  }
  return null;
}

/**
 * 创建 SDK 补全数据源
 */
function createSdkCompletionDataSource(
  specPath: string
): CompletionDataSource {
  return {
    async getSpecs(): Promise<string[]> {
      return [];
    },

    async getTags(specName: string): Promise<string[]> {
      const spec = loadSpec(specPath);
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
      const spec = loadSpec(specPath);
      if (!spec?.apis) return [];

      const apis: Array<{ name: string; description?: string }> = [];
      for (const [apiKey, api] of Object.entries(spec.apis)) {
        if (tagName) {
          if (apiKey.startsWith(`${tagName}/`)) {
            const name = apiKey.split("/")[1];
            apis.push({
              name,
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
      const spec = loadSpec(specPath);
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
  specPath: string,
  line: string,
  wordIndex: number,
  format: string = "plain"
): Promise<void> {
  const spec = loadSpec(specPath);
  if (!spec) {
    return;
  }

  let hasTags = false;
  if (spec.apis) {
    hasTags = Object.keys(spec.apis).some((key) => key.includes("/"));
  }

  const dataSource = createSdkCompletionDataSource(specPath);

  const completionOptions: any = {
    singleSpecName: spec.name || "",
    hasTags,
  };

  const engine = new CompletionEngine(completionOptions, dataSource);

  const input = createCompletionInput(line, wordIndex);
  const result = await engine.complete(input);

  if (format === "zsh") {
    // Zsh format: "value\tdescription\tgroup" (tab-separated)
    for (const s of result.suggestions) {
      const desc = s.description || '';
      const group = s.group || '';
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
