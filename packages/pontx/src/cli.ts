import { program } from "commander";
import * as path from "path";
import * as fs from "fs";
import { PontxManager } from "./manager";
import { PontxService, ServiceConfig } from "./service/service";
import { createCliContext } from "./cli-context";
import { createLogger } from "./logger/logger";
import { getLogLevelFromEnv } from "./logger/utils";
import type { LogLevel } from "./logger/types";

const packageFilePath = path.join(__dirname, "..", "package.json");
const packageInfo = JSON.parse(fs.readFileSync(packageFilePath, "utf8"));

const currentVersion = packageInfo.version;
const rootDir = process.cwd();

// Check for --debug flag in argv and combine with environment variables
const hasDebugFlag = process.argv.includes('--debug');
const envLevel = getLogLevelFromEnv();
const logLevel: LogLevel = hasDebugFlag ? 'debug' : (envLevel === 'debug' || envLevel === 'trace' ? envLevel : 'info');

// 创建 CLI 上下文（使用根据 --debug 和环境变量决定的日志级别）
const ctx = createCliContext(rootDir, createLogger(logLevel, { prefix: '[pontx cli]' }));
const { getManager, tryGetLocalManager, logger } = ctx;

program.version(currentVersion).usage("[命令] [配置项]");
program.description("pontx cli");

// Global options
program.option("--debug", "启用调试日志");
program.option("--get-completions <line>", "(internal) Get shell completions");
program.option("--format <format>", "Output format for completions", "plain");

program
  .command("check")
  .description("检测本地和远程元数据的兼容性")
  .action(async () => {
    const manager = await getManager();
    const { checkCommand } = await import("./commands/check");
    await checkCommand(manager);
  });

program
  .command("ls")
  .description("查看数据源")
  .action(async () => {
    const manager = await getManager();
    // Output data to stdout (for piping)
    console.log(
      manager.resolvedConfig.origins.map((origin) => origin.name).join("\n")
    );
  });

program
  .command("search <keyword>")
  .description("搜索当前项目可调用的 API 接口")
  .option("--max <count>", "最大返回数量，默认 6", "6")
  .option("--use-remote", "使用远程元数据")
  .action(async (keyword, options) => {
    const { searchCommand } = await import("./commands/search");
    await searchCommand(ctx, keyword, options);
  });

program
  .command("show-api <apiPath>")
  .description(
    '查看 API 元数据，包括入参、出参等。apiPath 格式: specName.tagName.apiName，特殊字符用引号包裹'
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
    '生成项目中精准的 API 调用示例代码。apiPath 格式: specName.tagName.apiName，特殊字符用引号包裹'
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
    const { listTemplatesCommand } = await import("./commands/list-templates");
    await listTemplatesCommand(manager);
  });

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
    "JMESPath 查询表达式，用于筛选返回结果 (例如: \"[].{Id: Id, Name: Name}\")"
  )
  .option("--debug", "显示详细请求/响应信息")
  .option("--dry-run", "只显示请求，不实际执行")
  .option("--use-remote", "使用远程元数据")
  .option("-e, --env <env>", "指定环境/baseUrl")
  .allowUnknownOption(true)
  .allowExcessArguments(true)
  .action(async (apiPath, options, command) => {
    const { callCommand } = await import("./commands/call");
    // Get raw args: all args after 'call' command
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

    if (options.useRemote) {
      manager.resolvedConfig.origins.forEach((origin) => {
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
    await completionCommand(action, options);
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
    const argvs = process.argv;

    // 只收集用户显式指定的参数
    const serviceConfig: Partial<ServiceConfig> = {};

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

    // 如果用户显式指定了 service 的 log-level，则创建新 logger
    // 否则使用 CLI 的 logger（继承 --debug）
    const serviceLogger = serviceConfig.logLevel
      ? createLogger(serviceConfig.logLevel as LogLevel, { prefix: '[pontx service]' })
      : logger;

    const service = new PontxService(rootDir, serviceConfig as ServiceConfig, serviceLogger);

    // 监听服务事件
    service.on("started", () => {
      logger.info("PontxService 启动成功");
      logger.info("Web 服务地址: http://localhost:" + options.port);
      logger.info("状态接口: http://localhost:" + options.port + "/api/status");
      logger.info("Specs 接口: http://localhost:" + options.port + "/api/specs");
    });

    service.on("stopped", () => {
      logger.info("PontxService 已停止");
    });

    service.on("error", (error) => {
      logger.error("PontxService 发生错误", error instanceof Error ? error : new Error(String(error)));
      process.exit(1);
    });

    // 处理进程信号
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
      logger.error("服务启动失败", error instanceof Error ? error : new Error(String(error)));
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

// Handle --get-completions before normal parsing
async function main() {
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

main().catch((e) => {
  const error = e instanceof Error ? e : new Error(String(e));
  logger.error("命令执行失败", error);
  process.exit(1);
});
