import { program } from "commander";
import * as path from "path";
import * as fs from "fs";
import { PontxManager } from "./manager";
import { createLogger } from "./logger";
import { PontxService, ServiceConfig } from "./service/service";

const packageFilePath = path.join(__dirname, "..", "package.json");
const packageInfo = JSON.parse(fs.readFileSync(packageFilePath, "utf8"));

const currentVersion = packageInfo.version;

program.version(currentVersion).usage("[命令] [配置项]");

program.description("pontx cli");

const logger = createLogger("info", {
  prefix: "[pontx cli]",
});

(async function () {
  try {
    const rootDir = process.cwd();
    logger.info("Pontx CLI 启动中...");
    const manager = await PontxManager.constructorFromRootDir(rootDir, logger);

    logger.info("Pontx CLI 启动成功！");

    program
      .command("check")
      .description("检测本地和远程元数据的兼容性")
      .action(async () => {
        const { checkCommand } = await import("./commands/check");
        await checkCommand(manager);
      });

    program
      .command("ls")
      .description("查看数据源")
      .action(() => {
        logger.info(
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
        await searchCommand(manager, keyword, {
          max: parseInt(options.max),
          useRemote: options.useRemote,
        });
      });

    program
      .command("show-api <apiPath>")
      .description(
        "查看 API 元数据，包括入参、出参等。apiPath 格式: specName/tagName/apiName"
      )
      .option("--use-remote", "使用远程元数据")
      .action(async (apiPath, options) => {
        const { showApiCommand } = await import("./commands/show-api");
        await showApiCommand(manager, apiPath, {
          useRemote: options.useRemote,
        });
      });

    program
      .command("show-schema <schemaPath>")
      .description(
        "查看 Schema 元数据。schemaPath 格式: specName/schemaName，schemaName 可从 API 元数据的 $ref 字段提取。例如 '#/components/schemas/ResultDTO' 的 schemaName 是 ResultDTO"
      )
      .option("--use-remote", "使用远程元数据")
      .action(async (schemaPath, options) => {
        const { showSchemaCommand } = await import("./commands/show-schema");
        await showSchemaCommand(manager, schemaPath, {
          useRemote: options.useRemote,
        });
      });

    program
      .command("gen <apiPath>")
      .description(
        "生成项目中精准的 API 调用示例代码。apiPath 格式: specName/tagName/apiName"
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
        await genCommand(manager, apiPath, options);
      });

    program
      .command("list-templates")
      .description("获取当前项目可用的代码生成模板列表")
      .action(async () => {
        const { listTemplatesCommand } = await import(
          "./commands/list-templates"
        );
        await listTemplatesCommand(manager);
      });

    program
      .command("mocks")
      .description("拉取远程数据源并生成 Mocks")
      .action(async () => {});

    program
      .command("generate")
      .description("拉取远程数据源并生成代码")
      .option("--use-remote", "使用远程元数据生成")
      .action(async () => {
        const argvs = process.argv;

        if (argvs.includes("--use-remote")) {
          logger.info("Pontx 已切换使用最新远程数据");
          manager.resolvedConfig.origins.forEach((origin) => {
            origin.spec = origin.remoteSpec;
          });
        }

        await PontxManager.generateCode(manager);
        logger.info("Pontx SDK 生成完毕!");
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

        const service = new PontxService(
          rootDir,
          serviceConfig as ServiceConfig
        );

        // 监听服务事件
        service.on("started", () => {
          console.log("✅ PontxService 启动成功");
          console.log("🌐 Web 服务地址: http://localhost:" + options.port);
          console.log(
            "📊 状态接口: http://localhost:" + options.port + "/api/status"
          );
          console.log(
            "📋 Specs 接口: http://localhost:" + options.port + "/api/specs"
          );
        });

        service.on("stopped", () => {
          console.log("🛑 PontxService 已停止");
        });

        service.on("error", (error) => {
          console.error("❌ PontxService 发生错误:", error);
          process.exit(1);
        });

        // 处理进程信号
        process.on("SIGINT", async () => {
          console.log("\n正在停止服务...");
          await service.stop();
        });

        process.on("SIGTERM", async () => {
          console.log("\n正在停止服务...");
          await service.stop();
          process.exit(0);
        });

        try {
          await service.start();
        } catch (error) {
          console.error("❌ 服务启动失败:", error);
          process.exit(1);
        }
      });

    program.parse(process.argv);
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      logger.error(e.message);
      logger.error(e.stack);
    } else {
      logger.error(e.message);
    }
  }
})();
