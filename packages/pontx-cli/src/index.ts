import { program } from "commander";
import * as path from "path";
import * as fs from "fs-extra";
import { PontManager, PontLogger } from "pontx-manager";
import { cliLog, logger } from "./debugLog";
import "pontx-meta-fetch-plugin";
import "pontx-oas2-parser-plugin";
import "pontx-oas3-parser-plugin";
import "pontx-async-sdk-plugin";

const packageFilePath = path.join(__dirname, "..", "package.json");
const packageInfo = JSON.parse(fs.readFileSync(packageFilePath, "utf8"));

const currentVersion = packageInfo.version;

program.version(currentVersion).usage("[命令] [配置项]");

program.description("powerful api code generator");

(async function () {
  try {
    const rootDir = process.cwd();
    const pontLogger = new PontLogger();
    pontLogger.log = cliLog;

    logger.pending("Pontx CLI 启动中...");
    let manager = await PontManager.constructorFromRootDir(rootDir, pontLogger);

    logger.success("Pontx CLI 启动成功！");

    manager = await PontManager.readLocalPontMeta(manager);
    logger.success("Pontx 本地数据读取成功！");
    manager = await PontManager.fetchRemotePontMeta(manager);
    logger.success("Pontx 远程数据拉取成功！");

    program
      .command("check")
      .description("检测 api-lock.json 文件")
      .action(async () => {
        manager.logger.info("api-lock.json 文件检测中...");
        manager = await PontManager.readLocalPontMeta(manager);

        process.exit(0);
      });

    program
      .command("ls")
      .description("查看数据源")
      .action(() => {
        manager.logger.info(manager.innerManagerConfig.origins.map((origin) => origin.name).join("\n"));
      });

    program
      .command("mocks")
      .description("拉取远程数据源并生成 Mocks")
      .action(async () => {
        manager.localPontSpecs = manager.remotePontSpecs;
        logger.success("Pontx 已切换使用最新远程数据");
        await PontManager.generateMocks(manager);
        logger.success("Pontx Mocks 生成完毕!");
      });

    // program
    //   .command("updateBo <boName>")
    //   .description("更新基类")
    //   .action((boName) => {
    //     manager.makeSameBase(boName);
    //     manager.regenerateFiles();
    //   });

    // program
    //   .command("updateMod <modName>")
    //   .description("更新模块")
    //   .action((modName) => {
    //     manager.makeSameMod(modName);
    //     manager.regenerateFiles();
    //   });

    program
      .command("generate")
      .option("--force", "是否比较本地远端元数据变更", false)
      .description("拉取远程数据源并生成代码")
      .action(async (options) => {
        const checkResult = PontManager.conflictDetect(manager);
        const forceOptions = options?.force;
        if (checkResult?.length && forceOptions) {
          logger.error(`存在非兼容性变更，已终止`);
          console.table(checkResult);
          process.exit(1);
          return;
        }
        if (checkResult?.length) {
          logger.warn(`存在非兼容性变更，已忽略`);
          console.table(checkResult);
        }

        manager.localPontSpecs = manager.remotePontSpecs;

        logger.success("Pontx 已切换使用最新远程数据");
        await PontManager.generateCode(manager);
        logger.success("Pontx SDK 生成完毕!");
      });

    program.parse(process.argv);
  } catch (e) {
    cliLog(e.message, "error");
    // console.error(e.stack);
    // error(e.toString());
  }
})();
