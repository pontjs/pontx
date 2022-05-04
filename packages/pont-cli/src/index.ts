import { program } from "commander";
import * as path from "path";
import * as fs from "fs-extra";
import { PontManager, PontLogger } from "pont-manager";
import { cliLog, error } from "./debugLog";
import "pont-meta-fetch-plugin";
import "pont-oas2-parser-plugin";
import "pont-react-hooks-generate-plugin";

const packageFilePath = path.join(__dirname, "..", "package.json");
const packageInfo = JSON.parse(fs.readFileSync(packageFilePath, "utf8"));

const currentVersion = packageInfo.version;

program.version(currentVersion).usage("[命令] [配置项]");

program.description("powerful api code generator");

(async function () {
  try {
    const rootDir = process.cwd();
    const logger = new PontLogger();
    logger.log = cliLog;

    let manager = await PontManager.constructorFromRootDir(rootDir, logger);

    manager = await PontManager.readLocalPontMeta(manager).then(PontManager.fetchRemotePontMeta);

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
      .command("ls")
      .description("查看数据源")
      .action(() => {
        manager.logger.info(manager.innerManagerConfig.origins.map((origin) => origin.name).join("\n"));
      });

    // program
    //   .command("diff")
    //   .description("对比数据源")
    //   .action(() => {
    //     manager.calDiffs();
    //     const { modDiffs, boDiffs } = manager.diffs;

    //     console.log("模块：");
    //     console.log(
    //       modDiffs
    //         .map((mod) => `${mod.name}(${mod.details.join(",").slice(0, 20)})`)
    //         .join("\n")
    //     );
    //     console.log("基类");
    //     console.log(
    //       boDiffs
    //         .map((bo) => `${bo.name}(${bo.details.join(",").slice(0, 20)})`)
    //         .join("\n")
    //     );
    //   });

    program
      .command("select <dsName>")
      .description("选择数据源")
      .action((dsName) => {
        manager = PontManager.switchOriginName(manager, dsName);
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
      .description("拉取远程数据源并生成代码")
      .action(async () => {
        manager.localPontSpecs = manager.remotePontSpecs;
        PontManager.generateCode(manager);
      });

    program.parse(process.argv);
  } catch (e) {
    console.error(e.stack);
    error(e.toString());
  }
})();
