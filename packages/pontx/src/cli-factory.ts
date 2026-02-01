/**
 * @author jasonHzq
 * @description CLI 工厂函数 - 用于创建自定义的 Pontx CLI
 */

import { Command } from "commander";
import { createCliContext } from "./cli-context";
import { createLogger } from "./logger/logger";
import { getLogLevelFromEnv } from "./logger/utils";
import type { LogLevel } from "./logger/types";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { registerCliCommands } from "./commands/cli-commands";
import { registerListCommands } from "./commands/list-commands";
import { listSpecsCommand } from "./commands/list-specs";

// 兼容 ESM 和 CJS 的 __dirname
const getPackageDir = () => {
  // ESM 模式
  if (typeof import.meta !== "undefined" && import.meta.url) {
    return dirname(fileURLToPath(import.meta.url));
  }
  // CJS 模式
  return __dirname;
};

export interface CreateCliOptions {
  /**
   * pontx.config.ts 所在的根目录
   * - pontx 命令: process.cwd()（当前执行目录）
   */
  rootDir: string;

  /**
   * CLI 的命令名称
   * - 用于 completion 脚本生成
   * - 用于日志前缀显示
   * @default 'pontx'
   */
  binName?: string;
}

/**
 * 创建 CLI 程序
 */
export function createCli(options: CreateCliOptions): Command {
  const { rootDir, binName = "pontx" } = options;

  // 读取 package.json 获取版本号
  const packageDir = getPackageDir();
  const packageFilePath = path.join(packageDir, "..", "package.json");
  const packageInfo = JSON.parse(fs.readFileSync(packageFilePath, "utf8"));
  const currentVersion = packageInfo.version;

  // 检查 --debug 标志并结合环境变量
  const hasDebugFlag = process.argv.includes("--debug");
  const envLevel = getLogLevelFromEnv();
  const logLevel: LogLevel = hasDebugFlag
    ? "debug"
    : envLevel === "debug" || envLevel === "trace"
    ? envLevel
    : "info";

  // 创建 CLI 上下文
  const ctx = createCliContext(
    rootDir,
    createLogger(logLevel, { prefix: `[${binName} cli]` })
  );
  const { getManager, logger } = ctx;

  // 创建 commander 程序
  const program = new Command(binName);
  program.version(currentVersion).usage("[命令] [配置项]");
  program.description(`${binName} cli`);
  program.enablePositionalOptions(); // 启用位置选项，支持子命令的 passThroughOptions

  // 全局选项
  program.option("--debug", "启用调试日志");
  program.option(
    "--get-completions <line>",
    "(internal) Get shell completions"
  );
  program.option("--format <format>", "Output format for completions", "plain");

  // 注册所有命令
  registerCommands(program, ctx, getManager, logger, binName, rootDir);

  return program;
}

/**
 * 注册所有命令
 */
function registerCommands(
  program: Command,
  ctx: any,
  getManager: any,
  logger: any,
  binName: string,
  rootDir: string
) {
  program
    .command("check")
    .description("检测本地和远程元数据的兼容性")
    .action(async () => {
      const manager = await getManager();
      const { checkCommand } = await import("./commands/check");
      await checkCommand(manager);
    });


  program
    .command("search <keyword>")
    .description("搜索当前项目可调用的 API 接口")
    .option("--max <count>", "最大返回数量，默认 6", "6")
    .option("--spec <specName>", "指定搜索的 spec 名称")
    .option("--use-remote", "使用远程元数据")
    .action(async (keyword, options) => {
      const { searchCommand } = await import("./commands/search");
      await searchCommand(ctx, keyword, options);
    });

  program
    .command("show-api <apiPath>")
    .description(
      "查看 API 元数据，包括入参、出参等。apiPath 格式: specName.tagName.apiName，特殊字符用引号包裹"
    )
    .option("--use-remote", "使用远程元数据")
    .action(async (apiPath, options) => {
      const { showApiCommand } = await import("./commands/show-api");
      await showApiCommand(ctx, apiPath, options);
    });

  program
    .command("show-schema <schemaPath>")
    .description(
      "查看 Schema 元数据。schemaPath 格式: specName/schemaName，schemaName 可从 API 元数据的 $ref 字段提取。例如 '#/components/schemas/ResultDTO' 的 schemaName 是 ResultDTO"
    )
    .option("--use-remote", "使用远程元数据")
    .action(async (schemaPath, options) => {
      const { showSchemaCommand } = await import("./commands/show-schema");
      await showSchemaCommand(ctx, schemaPath, options);
    });

  program
    .command("gen <apiPath>")
    .description(
      "生成项目中精准的 API 调用示例代码。apiPath 格式: specName.tagName.apiName，特殊字符用引号包裹"
    )
    .option(
      "--case <case>",
      "代码模板名称，常见值: request (基础请求), reactHooks (React Hooks)。可用 pontx list-templates 命令查询",
      "request"
    )
    .option(
      "--params <json>",
      "参照 API 元数据中的 parameters 构造的请求参数，JSON 格式字符串"
    )
    .option("--body <json>", "API 请求体参数，JSON 格式")
    .option("--use-remote", "使用远程元数据")
    .action(async (apiPath, options) => {
      const { genCommand } = await import("./commands/gen");
      await genCommand(ctx, apiPath, options);
    });

  program
    .command("list-templates")
    .description("获取当前项目可用的代码生成模板列表")
    .action(async () => {
      const manager = await getManager();
      const { listTemplatesCommand } = await import(
        "./commands/list-templates"
      );
      await listTemplatesCommand(manager);
    });

  // pontx list (父命令)
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
      await listSpecsCommand(ctx, options);
    });
  registerListCommands(listCmd, ctx);

  program
    .command("call <apiPath>")
    .description(
      '调用 API 接口。apiPath 格式: specName.tagName.apiName，特殊字符用引号包裹。参数: --paramName value，body: --body \'{"key":"value"}\' 或 --body @file.json'
    )
    .option(
      "-H, --header <header>",
      "添加请求头 (可多次使用)",
      (val, acc: string[]) => {
        acc.push(val);
        return acc;
      },
      []
    )
    .option("-o, --output <path>", "输出结果到文件 (支持相对/绝对路径)")
    .option(
      "-q, --query <expression>",
      'JMESPath 查询表达式，用于筛选返回结果 (例如: "[].{Id: Id, Name: Name}")'
    )
    .option("--debug", "显示详细请求/响应信息")
    .option("--dry-run", "只显示请求，不实际执行")
    .option("--use-remote", "使用远程元数据")
    .option("-e, --env <env>", "指定环境/baseUrl")
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .action(async (apiPath, options, command) => {
      const { callCommand } = await import("./commands/call");
      const callIndex = process.argv.indexOf("call");
      const rawArgs = callIndex !== -1 ? process.argv.slice(callIndex + 2) : [];
      await callCommand(ctx, apiPath, rawArgs, options);
    });

  program
    .command("mocks")
    .description("拉取远程数据源并生成 Mocks")
    .action(async () => {});

  program
    .command("generate")
    .description("拉取远程数据源并生成代码")
    .option("--use-remote", "使用远程元数据生成")
    .action(async (options) => {
      const manager = await getManager();
      const { PontxManager } = await import("./manager");

      if (options.useRemote) {
        manager.resolvedConfig.origins.forEach((origin: any) => {
          origin.spec = origin.remoteSpec;
        });
      }

      await PontxManager.generateCode(manager);
      logger.info("Pontx SDK 生成完毕!");
    });

  program
    .command("completion")
    .description("管理 shell 自动补全")
    .argument("[action]", "install | generate | uninstall", "install")
    .option("--shell <shell>", "Shell 类型: bash | zsh | fish")
    .option("--output <path>", "输出脚本到文件")
    .action(async (action, options) => {
      const { completionCommand } = await import("./commands/completion");
      // 传递 binName 给 completion 命令
      await completionCommand(action, { ...options, binName });
    });

  program
    .command("skill")
    .description("生成 AI SKILL 文件（用于 Claude Code 等 AI 工具）")
    .option("-o, --output <path>", "自定义输出路径")
    .option("--global", "输出到全局目录 (~/.claude/skills/pontx/)")
    .option("--print", "打印内容到 stdout（不生成文件）")
    .action(async (options) => {
      const { skillCommand } = await import("./commands/skill");
      await skillCommand(options);
    });

  program
    .command("service")
    .description("启动 Pontx 服务")
    .option("-p, --port <port>", "Web 服务端口", "3000")
    .option("-i, --interval <interval>", "同步间隔（毫秒）", "300000")
    .option("--no-watch", "禁用文件监听")
    .option("--no-sync", "禁用定时同步")
    .option("--no-web", "禁用 Web 服务")
    .option("-l, --log-level <level>", "日志级别", "info")
    .action(async (options) => {
      const { PontxService } = await import("./service/service");
      const argvs = process.argv;

      const serviceConfig: any = {};

      if (argvs.includes("-p") || argvs.includes("--port")) {
        serviceConfig.port = parseInt(options.port);
      }
      if (argvs.includes("-i") || argvs.includes("--interval")) {
        serviceConfig.syncInterval = parseInt(options.interval);
      }
      if (argvs.includes("--no-watch")) {
        serviceConfig.enableFileWatch = false;
      }
      if (argvs.includes("--no-sync")) {
        serviceConfig.enableAutoSync = false;
      }
      if (argvs.includes("--no-web")) {
        serviceConfig.enableWebServer = false;
      }
      if (argvs.includes("-l") || argvs.includes("--log-level")) {
        serviceConfig.logLevel = options.logLevel;
      }

      const serviceLogger = serviceConfig.logLevel
        ? createLogger(serviceConfig.logLevel as LogLevel, {
            prefix: `[${binName} service]`,
          })
        : logger;

      const service = new PontxService(rootDir, serviceConfig, serviceLogger);

      service.on("started", () => {
        logger.info("PontxService 启动成功");
        logger.info("Web 服务地址: http://localhost:" + options.port);
        logger.info(
          "状态接口: http://localhost:" + options.port + "/api/status"
        );
        logger.info(
          "Specs 接口: http://localhost:" + options.port + "/api/specs"
        );
      });

      service.on("stopped", () => {
        logger.info("PontxService 已停止");
      });

      service.on("error", (error) => {
        logger.error(
          "PontxService 发生错误",
          error instanceof Error ? error : new Error(String(error))
        );
        process.exit(1);
      });

      process.on("SIGINT", async () => {
        logger.info("\n正在停止服务...");
        await service.stop();
      });

      process.on("SIGTERM", async () => {
        logger.info("\n正在停止服务...");
        await service.stop();
        process.exit(0);
      });

      try {
        await service.start();
      } catch (error) {
        logger.error(
          "服务启动失败",
          error instanceof Error ? error : new Error(String(error))
        );
        process.exit(1);
      }
    });

  program
    .command("cache:clean")
    .description("清理配置文件编译缓存")
    .action(async () => {
      const { cleanCacheCommand } = await import("./commands/cache");
      await cleanCacheCommand(rootDir, logger);
    });

  program
    .command("add-spec <sdk-name>")
    .description("从已安装的 SDK 包添加 API 规范到 package.json")
    .option("--name <custom-name>", "自定义 spec 名称")
    .action(async (sdkName, options) => {
      const { addSpecCommand } = await import("./commands/add-spec");
      await addSpecCommand(sdkName, {
        name: options.name,
      });
    });

  // 注册 SDK CLI 管理命令（不依赖 pontx.config.ts）
  const cliCmd = program.command("cli").description("SDK CLI 管理命令");
  registerCliCommands(cliCmd);
}

/**
 * 运行 CLI 程序
 */
export async function runCli(program: Command): Promise<void> {
  const args = process.argv;
  const completionIndex = args.indexOf("--get-completions");

  if (completionIndex !== -1) {
    const line = args[completionIndex + 1];
    const wordIndex = parseInt(args[completionIndex + 2], 10) || 0;
    const formatIndex = args.indexOf("--format");
    const format = formatIndex !== -1 ? args[formatIndex + 1] : "plain";

    const { handleCompletionRequest } = await import("./commands/completion");
    await handleCompletionRequest(line, wordIndex, format);
    process.exit(0);
  }

  await program.parseAsync(process.argv);
}
