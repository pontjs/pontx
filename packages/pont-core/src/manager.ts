import { PontSpec } from "pont-spec";
import { InnerOriginConfig, PontInnerManagerConfig } from "./config";
import * as path from "path";
import * as fs from "fs-extra";
import { PontLogger, PontLoggerSpec } from "./logger";
import { lookForFiles } from "./scan";
import immutableSet from "lodash/fp/set";

export class PontManager {
  innerManagerConfig = new PontInnerManagerConfig();
  /** 本地使用的元数据 */
  localPontSpecs = [] as PontSpec[];
  /** 从远程更新的元数据 */
  remotePontSpecs = [] as PontSpec[];
  logger = new PontLogger();

  /** 当前管理的 originName */
  currentOriginName = "";

  static readonly lockFilename = "api-lock.json";
  static readonly configFilename = "pont-config.json";

  static async constructorFromRootDir(
    rootDir: string,
    logger = new PontLogger()
  ) {
    try {
      const configPathname = await lookForFiles(
        rootDir,
        PontManager.configFilename
      );

      if (configPathname) {
        const configContent = fs.readFileSync(configPathname, "utf8");
        const publicConfig = JSON.parse(configContent);

        const manager = new PontManager();
        manager.logger = logger;
        manager.innerManagerConfig =
          PontInnerManagerConfig.constructorFromPublicConfig(
            publicConfig,
            logger,
            path.resolve(configPathname, "../")
          );

        return manager;
      } else {
        logger.error("未找到 Pont 配置文件");
      }
    } catch (e) {
      logger.error("Pont 创建失败:" + e.message);
    }
  }

  /** 读取本地 api-lock.json 文件 */
  static async privateReadLockFile(manager: PontManager) {
    const origins = manager.innerManagerConfig.origins;

    if (origins?.length === 1) {
      let lockFile = path.join(
        manager.innerManagerConfig.outDir,
        PontManager.lockFilename
      );
      const isExists = fs.existsSync(lockFile);
      if (isExists) {
        const localDataStr = await fs.readFile(lockFile, {
          encoding: "utf8",
        });

        try {
          return [JSON.parse(localDataStr)];
        } catch (e) {
          manager.logger.error({
            processType: "read",
            message: "读取本地文件失败，文件内容不符合 JSON 规范。" + e.message,
          });
          return [new PontSpec()];
        }
      }
      return [new PontSpec()];
    } else {
      const allFilePromises = manager.innerManagerConfig.origins.map(
        async (config) => {
          const filePath = path.join(
            manager.innerManagerConfig.outDir,
            config.name,
            PontManager.lockFilename
          );
          const isExists = fs.existsSync(filePath);
          if (isExists) {
            const localDataStr = await fs.readFile(filePath, {
              encoding: "utf8",
            });
            try {
              const spec = JSON.parse(localDataStr) as PontSpec;
              if (spec?.name === config.name) {
                return spec;
              }
            } catch (e) {
              manager.logger.error({
                originName: config.name,
                processType: "read",
                message:
                  "读取本地文件失败，文件内容不符合 JSON 规范。" + e.message,
              });
            }
          }
          return PontSpec.constructorByName(config.name);
        }
      );
      return Promise.all(allFilePromises);
    }
  }

  /** 流程方法：读取本地元数据 */
  static async readLocalPontMeta(manager: PontManager): Promise<PontManager> {
    const localSpecs = await this.privateReadLockFile(manager);
    // 重新排序
    const specs = localSpecs.map((spec) => {
      return PontSpec.reOrder(spec);
    });

    // 文件校验
    specs.forEach((spec) => {
      PontSpec.validateLock(spec).forEach((message) => {
        manager.logger.error({
          originName: spec.name,
          message,
          processType: "read",
        });
      });
    });

    return {
      ...manager,
      localPontSpecs: specs,
    };
  }

  /** 流程方法：拉取并解析远程元数据 */
  static async fetchRemotePontMeta(manager: PontManager): Promise<PontManager> {
    const remoteSpecPromises = manager.innerManagerConfig.origins.map(
      async (origin) => {
        const metaStr = await origin.plugins.fetch.instance.apply(
          origin,
          origin.plugins.fetch.options
        );

        if (!metaStr) {
          manager.logger.error("未获取到远程数据");
        }

        const spec = await origin.plugins.parser.instance.apply(
          metaStr,
          origin.plugins.parser.options
        );

        if (!spec) {
          manager.logger.error("远程数据未解析成功！");
        }

        spec.name = origin.name;

        return spec;
      }
    );

    const remoteSpecs = await Promise.all(remoteSpecPromises);

    // 文件校验
    remoteSpecs.forEach((spec) => {
      PontSpec.validateLock(spec).forEach((message) => {
        manager.logger.error({
          originName: spec.name,
          message,
          processType: "parser",
        });
      });
    });

    return {
      ...manager,
      remotePontSpecs: remoteSpecs,
    };
  }

  static async generateCode(manager: PontManager) {
    const generatorPlugin = manager.innerManagerConfig.plugins.generate;
    return Promise.resolve(
      generatorPlugin.instance.apply(manager, generatorPlugin.options)
    );
  }

  // 展示方法
  static showDiffs(manager: PontManager) {}
  static syncMod(manager: PontManager) {}
  static syncBaseClass(manager: PontManager) {}

  /** 流程方法：同步远程元数据 */
  static syncAll(manager: PontManager): PontManager {
    const localOriginIndex = manager.localPontSpecs?.findIndex(
      (spec) => spec.name === manager.currentOriginName
    );
    const remoteOriginIndex = manager.remotePontSpecs?.findIndex(
      (spec) => spec.name === manager.currentOriginName
    );

    if (remoteOriginIndex === -1) {
      manager.logger.error("远程数据源不存在!");
      return manager;
    }

    if (localOriginIndex !== -1) {
      return immutableSet(
        ["localPontSpecs", localOriginIndex],
        manager.remotePontSpecs[remoteOriginIndex],
        manager
      );
    } else {
      const newLocalPontSpecs = [
        ...manager.localPontSpecs,
        manager.remotePontSpecs[remoteOriginIndex],
      ];
      return { ...manager, localPontSpecs: newLocalPontSpecs };
    }
  }

  /** 管理方法，切换当前管理的数据源 */
  static switchOriginName(
    manager: PontManager,
    originName: string
  ): PontManager {
    if (manager.currentOriginName === originName) {
    } else if (
      !manager.innerManagerConfig.origins?.find(
        (origin) => origin.name === originName
      )
    ) {
    } else {
      return {
        ...manager,
        currentOriginName: originName,
      };
    }
  }
}
