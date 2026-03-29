/**
 * @author pontx
 * @description SDK CLI 运行入口
 */

import * as path from "path";
import * as fs from "fs";
import { Command } from "commander";
import type { CLIConfig } from "./types";
import { createSdkCliContext } from "./context-adapter";
import { searchCommand } from "../commands/search";
import { showApiCommand } from "../commands/show-api";
import { callCommand } from "../commands/call";
import { genCommand } from "../commands/gen";
import { showSchemaCommand } from "../commands/show-schema";
import { listCasesCommand } from "../commands/list-cases";
import { createLogger } from "../logger/logger";
import {
  CompletionEngine,
  CompletionDataSource,
  createCompletionInput,
  ParamInfo,
} from "../completion";
import type { PontxSpec } from "@pontx/spec";
import { registerSdkListCommands } from "./list-commands";
import { listSpecsCommand } from "../commands/list-specs";

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

    // 获取 CLI 目录和 spec 路径
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
  // 使用 banner 注入的 __CLI_DIR__（cli.cjs 的 __dirname）
  const cliDir =
    typeof globalThis.__CLI_DIR__ !== "undefined"
      ? globalThis.__CLI_DIR__
      : __dirname; // fallback for development

  // 2. 解析 spec 路径（api-lock.json 与 cli.cjs 在同一目录）
  const specPath = path.join(cliDir, "api-lock.json");

  // 3. 检查文件是否存在（提供友好的错误提示）
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
  program.enablePositionalOptions(); // 启用位置选项，支持子命令的 passThroughOptions

  // 从 package.json 读取版本号
  const version = getPackageVersion(cliDir);
  if (version) {
    program.version(version);
  }

  // 全局选项（用于自动补全）
  program.option(
    "--get-completions <line>",
    "(internal) Get shell completions"
  );
  program.option("--format <format>", "Output format for completions", "plain");

  // 注册子命令
  registerSdkCommands(program, config, specPath, name);

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
 * 注册 SDK CLI 子命令
 */
function registerSdkCommands(
  program: Command,
  config: CLIConfig,
  specPath: string,
  binName: string
): void {
  // 创建 logger
  const logger = createLogger("info", { prefix: "[sdk cli]" });

  // 创建 CLI context
  const context = createSdkCliContext(config, specPath, logger);

  // search 命令
  program
    .command("search <keyword>")
    .description("搜索 API")
    .option("-m, --max <count>", "最大结果数", "6")
    .option("--remote", "搜索远程元数据")
    .action(async (keyword, options) => {
      try {
        await searchCommand(context, keyword, {
          max: parseInt(options.max, 10),
          useRemote: options.remote,
        });
      } catch (error: any) {
        logger.error("搜索失败", error);
        process.exit(1);
      }
    });

  // show-api 命令
  program
    .command("show-api <api-path>")
    .description("显示 API 详情")
    .option("--remote", "显示远程元数据")
    .action(async (apiPath, options) => {
      try {
        await showApiCommand(context, apiPath, {
          useRemote: options.remote,
        });
      } catch (error: any) {
        logger.error("显示 API 失败", error);
        process.exit(1);
      }
    });

  // call 命令
  program
    .command("call <api-path> [args...]")
    .description("调用 API")
    .option("-e, --env <env>", "环境名称")
    .option("-H, --header <header...>", "额外的 HTTP 头")
    .option("-o, --output <file>", "输出到文件")
    .option("--debug", "调试模式")
    .option("--dry-run", "仅显示请求信息，不发送请求")
    .option("--use-remote", "使用远程元数据")
    .option("-q, --query <jmespath>", "使用 JMESPath 查询响应")
    .allowUnknownOption(true)
    .action(async (apiPath, rawArgs, options) => {
      try {
        await callCommand(context, apiPath, rawArgs, options);
      } catch (error: any) {
        logger.error("调用 API 失败", error);
        process.exit(1);
      }
    });

  // gen 命令
  program
    .command("gen <api-path>")
    .description("生成 API 调用示例代码")
    .option(
      "--case <case>",
      "代码模板名称，常见值: request, reactHooks, cliCommand。可用 list-cases 查询",
      "request"
    )
    .option(
      "--params <json>",
      "参照 API 元数据中的 parameters 构造的请求参数，JSON 格式字符串"
    )
    .option("--body <json>", "API 请求体参数，JSON 格式")
    .option("--use-remote", "使用远程元数据")
    .action(async (apiPath, options) => {
      try {
        await genCommand(context, apiPath, options);
      } catch (error: any) {
        logger.error("生成代码失败", error);
        process.exit(1);
      }
    });

  // show-schema 命令
  program
    .command("show-schema <schema-path>")
    .description("查看 Schema 元数据")
    .option("--use-remote", "使用远程元数据")
    .action(async (schemaPath, options) => {
      try {
        await showSchemaCommand(context, schemaPath, options);
      } catch (error: any) {
        logger.error("显示 Schema 失败", error);
        process.exit(1);
      }
    });

  // list-cases 命令
  program
    .command("list-cases")
    .description("获取可用的代码生成 case 列表")
    .action(async () => {
      try {
        const manager = await context.getManager();
        await listCasesCommand(manager);
      } catch (error: any) {
        logger.error("获取 case 列表失败", error);
        process.exit(1);
      }
    });

  // SDK list 命令（父命令）
  const listCmd = program
    .command("list")
    .alias("ls")
    .description("列举 API 信息（默认列举所有 specs）")
    // 父命令定义自己的选项（用于默认行为）
    .option("--use-remote", "使用远程元数据")
    .option("--json", "以 JSON 格式输出")
    // 允许子命令使用未知选项
    .passThroughOptions()
    .action(async (options) => {
      // 默认行为：列举所有 specs（仅当没有子命令时执行）
      try {
        await listSpecsCommand(context, options);
      } catch (error: any) {
        logger.error("列举 specs 失败", error);
        process.exit(1);
      }
    });
  registerSdkListCommands(listCmd, context);

  // completion 命令
  program
    .command("completion")
    .description("管理 shell 自动补全")
    .argument("[action]", "install | generate | uninstall", "install")
    .option("--shell <shell>", "Shell 类型: bash | zsh | fish")
    .option("--output <path>", "输出脚本到文件")
    .action(async (action, options) => {
      const { completionCommand } = await import("../commands/completion");
      await completionCommand(action, { ...options, binName });
    });
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
      // SDK CLI 只有一个 spec，不需要补全 spec 名称
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

      // Handle both with and without tags
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
    // 如果 spec 不存在，不提供补全
    return;
  }

  // 检测是否有 tags
  let hasTags = false;
  if (spec.apis) {
    hasTags = Object.keys(spec.apis).some((key) => key.includes("/"));
  }

  const dataSource = createSdkCompletionDataSource(specPath);

  // 使用 singleSpecName 模式
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
    // Fish format: "value\tdescription"
    for (const s of result.suggestions) {
      console.log(s.description ? `${s.value}\t${s.description}` : s.value);
    }
  } else {
    // Plain format
    for (const s of result.suggestions) {
      console.log(s.value);
    }
  }
}
