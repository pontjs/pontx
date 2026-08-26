/**
 * @author jasonHzq
 * @description CLI 工厂函数 - 创建层级式 Pontx CLI
 *
 * 命令结构：
 * pontx
 * ├── init / check / generate / mocks / service / skill / cache:clean / add-spec
 * ├── completion
 * ├── cli (init / build)
 * ├── list specs
 * └── <specName>                    ← 动态注册
 *     ├── call <tag> <api>
 *     ├── show-api <tag> <api>
 *     ├── gen <tag> <api>
 *     ├── show-schema <schema>
 *     ├── search <keyword>
 *     ├── list-cases
 *     └── list (tags / apis / schemas / streams)
 */

import { Command } from "commander";
import { createCliContext } from "./context";
import { createLogger } from "../logger/logger";
import { getLogLevelFromEnv } from "../logger/utils";
import type { LogLevel } from "../logger/types";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { registerCliCommands } from "./commands/cli-commands";
import { listSpecsCommand } from "./commands/list-specs";
import { loadSpecInfos, registerSpecCommands } from "./spec-commands";
import { registerSpecListCommands } from "./commands/spec/list-commands";
import { registerHubCommands } from "./hub/commands";
import { registerQualityCommands } from "../quality/commands";

/* 兼容 ESM 和 CJS 的 __dirname */
const getPackageDir = () => {
  if (typeof import.meta !== "undefined" && import.meta.url) {
    return dirname(fileURLToPath(import.meta.url));
  }
  return __dirname;
};

export interface CreateCliOptions {
  /**
   * pontx.config.ts 所在的根目录
   */
  rootDir: string;

  /**
   * CLI 的命令名称
   * @default 'pontx'
   */
  binName?: string;

  /**
   * CLI arguments used to decide whether config-backed spec commands are needed.
   * @default process.argv.slice(2)
   */
  argv?: readonly string[];
}

function isConfigIndependentInvocation(args: readonly string[]): boolean {
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--") return args[index + 1] === "hub";
    if (arg === "--debug") continue;
    if (arg === "--format" || arg === "--get-completions") {
      index++;
      continue;
    }
    if (arg.startsWith("--format=") || arg.startsWith("--get-completions=")) {
      continue;
    }
    if (arg.startsWith("-")) continue;
    return arg === "hub";
  }
  return false;
}

/**
 * 创建 CLI 程序（异步，因为需要加载 spec 信息来注册动态子命令）
 */
export async function createCli(options: CreateCliOptions): Promise<Command> {
  const {
    rootDir,
    binName = "pontx",
    argv = process.argv.slice(2),
  } = options;

  /* 读取 package.json 版本号 */
  const packageDir = getPackageDir();
  const packageFilePath = path.join(packageDir, "..", "package.json");
  const packageInfo = JSON.parse(fs.readFileSync(packageFilePath, "utf8"));
  const currentVersion = packageInfo.version;

  /* 日志级别 */
  const hasDebugFlag = process.argv.includes("--debug");
  const envLevel = getLogLevelFromEnv();
  const logLevel: LogLevel = hasDebugFlag
    ? "debug"
    : envLevel === "debug" || envLevel === "trace"
      ? envLevel
      : "info";

  /* 创建上下文 */
  const ctx = createCliContext(
    rootDir,
    createLogger(logLevel, { prefix: `[${binName} cli]` }),
  );
  const { getManager, logger } = ctx;

  /* 创建 commander 程序 */
  const program = new Command(binName);
  program.version(currentVersion).usage("[命令] [配置项]");
  program.description(`${binName} cli`);
  program.enablePositionalOptions();

  /* 全局选项 */
  program.option("--debug", "启用调试日志");
  program.option(
    "--get-completions <line>",
    "(internal) Get shell completions",
  );
  program.option("--format <format>", "Output format for completions", "plain");

  /* ========== 注册全局命令 ========== */
  registerGlobalCommands(program, ctx, getManager, logger, binName, rootDir);

  /* Hub 命令仅依赖远程目录，避免探测或加载本地 pontx.config.ts。 */
  if (isConfigIndependentInvocation(argv)) return program;

  /* ========== 动态注册 spec 子命令 ========== */
  const specInfos = await loadSpecInfos(rootDir);

  if (specInfos.length === 1) {
    /* 单 spec：在根级别注册 spec 命令（跳过 list 避免冲突）+ 在全局 list 中追加 spec list 子命令 */
    registerSpecCommands(program, specInfos[0], ctx, { skipList: true });
    /* 在全局 list 上追加 tags/apis/schemas/streams 子命令 */
    const globalListCmd = program.commands.find((c) => c.name() === "list");
    if (globalListCmd) {
      registerSpecListCommands(globalListCmd, specInfos[0].name, ctx);
    }
    /* 同时注册 spec 名子命令（完整版，包含 list），但隐藏（避免 help 重复） */
    const specCmd = program.command(specInfos[0].name, { hidden: true });
    registerSpecCommands(specCmd, specInfos[0], ctx);
  } else if (specInfos.length > 1) {
    /* 多 spec：每个 spec 注册一个子命令 */
    for (const info of specInfos) {
      const specCmd = program.command(info.name).description(`${info.name} API 操作`);
      registerSpecCommands(specCmd, info, ctx);
    }
  }

  return program;
}

/**
 * 注册全局命令（不需要 spec 上下文）
 */
function registerGlobalCommands(
  program: Command,
  ctx: any,
  getManager: any,
  logger: any,
  binName: string,
  rootDir: string,
) {
  program
    .command("init")
    .description("初始化生成 pontx.config.ts 配置文件")
    .option("--url <url>", "远程数据源 URL")
    .option("--name <name>", "数据源名称")
    .option("--localPath <path>", "本地数据源路径")
    .option("--outDir <dir>", "生成代码的输出目录", "src/apis")
    .option("--runtime <runtime>", "运行时环境: nodejs | browser", "nodejs")
    .option("--skip-install", "跳过安装 SDK 依赖")
    .action(async (options) => {
      const { initCommand } = await import("./commands/init");
      await initCommand(rootDir, options, logger);
    });

  program
    .command("check")
    .description("检测本地和远程元数据的兼容性")
    .action(async () => {
      const manager = await getManager();
      const { checkCommand } = await import("./commands/check");
      await checkCommand(manager);
    });

  program
    .command("generate")
    .description("拉取远程数据源并生成代码")
    .option("--use-remote", "使用远程元数据生成")
    .action(async (options) => {
      const manager = await getManager();
      const { PontxManager } = await import("../manager");

      if (options.useRemote) {
        manager.resolvedConfig.origins.forEach((origin: any) => {
          origin.spec = origin.remoteSpec;
        });
      }

      await PontxManager.generateCode(manager);
      logger.info("Pontx SDK 生成完成!");
    });

  program
    .command("mocks")
    .description("拉取远程数据源并生成 Mocks")
    .action(async () => {});

  program
    .command("service")
    .description("启动 Pontx 服务；可直接传 OAS spec 文件路径或远程 URL 打开调试页面")
    .argument("[spec]", "OAS spec 文件路径或远程 URL，例如 ./OAS.json")
    .option("-p, --port <port>", "Web 服务端口", "3000")
    .option("-i, --interval <interval>", "同步间隔（毫秒）", "300000")
    .option("--no-watch", "禁用文件监听")
    .option("--no-sync", "禁用定时同步")
    .option("--no-web", "禁用 Web 服务")
    .option("-l, --log-level <level>", "日志级别", "info")
    .addHelpText(
      "after",
      `
示例:
  $ pontx service ./OAS.json
  $ pontx service ./openapi.json -p 3000
  $ pontx service https://petstore.swagger.io/v2/swagger.json
`,
    )
    .action(async (spec, options) => {
      const { PontxService } = await import("../service/service");
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

      if (spec) {
        serviceConfig.specSource = spec;
      }

      const serviceLogger = serviceConfig.logLevel
        ? createLogger(serviceConfig.logLevel as LogLevel, {
            prefix: `[${binName} service]`,
          })
        : logger;

      const service = new PontxService(rootDir, serviceConfig, serviceLogger);

      service.on("started", ({ port }: { port: number }) => {
        logger.info("Web 服务地址: http://localhost:" + port);
        logger.info(
          "状态接口: http://localhost:" + port + "/api/status",
        );
        logger.info(
          "Specs 接口: http://localhost:" + port + "/api/specs",
        );
      });

      service.on("stopped", () => {
        logger.info("PontxService 已停止");
      });

      service.on("error", (error) => {
        logger.error(
          "PontxService 发生错误",
          error instanceof Error ? error : new Error(String(error)),
        );
        process.exit(1);
      });

      let stopping = false;
      const gracefulStop = async () => {
        if (stopping) return;
        stopping = true;
        logger.info("\n正在停止服务...");
        await service.stop();
        process.exit(0);
      };

      process.on("SIGINT", gracefulStop);
      process.on("SIGTERM", gracefulStop);

      try {
        await service.start();
      } catch (error) {
        logger.error(
          "服务启动失败",
          error instanceof Error ? error : new Error(String(error)),
        );
        process.exit(1);
      }
    });

  program
    .command("completion")
    .description("管理 shell 自动补全")
    .argument("[action]", "install | generate | uninstall", "install")
    .option("--shell <shell>", "Shell 类型: bash | zsh | fish")
    .option("--output <path>", "输出脚本到文件")
    .action(async (action, options) => {
      const { completionCommand } = await import("./commands/completion");
      await completionCommand(action, { ...options, binName });
    });

  program
    .command("skill")
    .description("安装 Agent SKILL")
    .action(async (options) => {
      const { skillCommand } = await import("./commands/skill");
      await skillCommand(options);
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

  /* 全局 list 命令：只保留 list specs */
  const listCmd = program
    .command("list")
    .alias("ls")
    .description("列举 API 信息（默认列举所有 specs）")
    .option("--use-remote", "使用远程元数据")
    .option("--json", "以 JSON 格式输出")
    .passThroughOptions()
    .action(async (options) => {
      await listSpecsCommand(ctx, options);
    });

  listCmd
    .command("specs")
    .description("列举所有 specs")
    .option("--use-remote", "使用远程元数据")
    .option("--json", "以 JSON 格式输出")
    .action(async (options) => {
      await listSpecsCommand(ctx, options);
    });

  /* SDK CLI 管理命令 */
  const cliCmd = program.command("cli").description("SDK CLI 管理命令");
  registerCliCommands(cliCmd);

  /* PontxSpec Metadata 静态与动态质量评估 */
  registerQualityCommands(program);

  /* 远程精选 API Hub；不依赖本地 pontx.config.ts */
  registerHubCommands(program);
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
