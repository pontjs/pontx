import { PontxSpec, PontxSpecs } from "@pontx/spec";
import { lookForFiles } from "./utils";
import { createLogger, Logger } from "./logger";
import fsp from "node:fs/promises";
import * as path from "path";
import { LOCK_FILENAME } from "./const";
import { resolveConfig } from "./config";
import { reGenerateFiles } from "./generate";
import type { ResolvedConfig } from "./type";

export class PontxManager {
  resolvedConfig: ResolvedConfig;

  logger: Logger;

  /** 当前管理的 specName */
  currentSpecName = "";

  static readonly lockFilename = LOCK_FILENAME;
  static readonly configFilename = "pontx.config.ts";

  static async constructorFromRootDir(
    rootDir: string,
    logger = createLogger("info", {
      prefix: "[pontx manager]",
    })
  ) {
    const configPathname = await lookForFiles(
      rootDir,
      PontxManager.configFilename
    );

    if (configPathname) {
      return PontxManager.constructorFromPontxConfigPath(
        configPathname,
        rootDir,
        logger
      );
    } else {
      logger.error("未找到 Pontx 配置文件");
    }
  }

  static async constructorFromPontxConfigPath(
    configPathname: string,
    rootDir: string,
    logger = createLogger("info", {
      prefix: "[pontx manager]",
    })
  ) {
    const resolvedConfig = await resolveConfig(configPathname, {
      rootDir,
      customLogger: logger,
      logLevel: "info",
    });

    return PontxManager.constructorFromPontxConfig(resolvedConfig, logger);
  }

  static async constructorFromPontxConfig(
    resolvedConfig: ResolvedConfig,
    logger = createLogger("info", {
      prefix: "[pontx manager]",
    })
  ) {
    const manager = new PontxManager();
    manager.resolvedConfig = resolvedConfig;
    manager.logger = logger;

    resolvedConfig.resolvedPlugin.configResolved(resolvedConfig);

    await PontxManager.readLocalSpecs(manager);
    await PontxManager.fetchRemotePontMeta(manager);
    return manager;
  }

  static async readLocalSpecs(manager: PontxManager): Promise<PontxManager> {
    const allFilePromises = manager.resolvedConfig.origins.map(
      async (config) => {
        const filePath = config.name
          ? path.join(
              manager.resolvedConfig.outDir,
              config.name,
              PontxManager.lockFilename
            )
          : path.join(manager.resolvedConfig.outDir, PontxManager.lockFilename);

        // 本地元数据是否存在
        const stat = await fsp.stat(filePath).catch(() => null);
        if (stat) {
          const localDataStr = await fsp.readFile(filePath, {
            encoding: "utf8",
          });
          try {
            const spec = JSON.parse(localDataStr) as PontxSpec;
            config.spec = spec;
          } catch (e) {
            manager.logger.error(
              "读取本地文件失败，文件内容不符合 JSON 规范。" + e.message,
              {
                prefix: config.name,
              }
            );
          }
        }
      }
    );

    await Promise.all(allFilePromises);

    return manager;
  }

  static async fetchRemotePontMeta(manager: PontxManager) {
    const remoteSpecPromises = manager.resolvedConfig.origins.map(
      async (origin) => {
        origin.fetchedMeta = await manager.resolvedConfig.resolvedPlugin.fetch(
          origin.url,
          {
            originConfig: origin,
            resolvedConfig: manager.resolvedConfig,
          }
        );

        if (origin.fetchedMeta) {
          origin.fetchedMeta =
            await manager.resolvedConfig.resolvedPlugin.transformMeta(
              origin.fetchedMeta,
              {
                originConfig: origin,
                resolvedConfig: manager.resolvedConfig,
              }
            );
          origin.remoteSpec =
            await manager.resolvedConfig.resolvedPlugin.parseMeta(
              origin.fetchedMeta,
              {
                originConfig: origin,
                resolvedConfig: manager.resolvedConfig,
              }
            );
        }

        if (!origin.fetchedMeta) {
          // todo
          // const cacheSpec = await fetchRemoteCacheSpec(
          //   manager.logger,
          //   manager.resolvedConfig.outDir,
          //   origin.name
          // );
          // return cacheSpec;
        }

        origin.remoteSpec =
          await manager.resolvedConfig.resolvedPlugin.transform(
            origin.remoteSpec,
            {
              originConfig: origin,
              resolvedConfig: manager.resolvedConfig,
            }
          );

        if (!origin.spec) {
          origin.spec = origin.remoteSpec;
        }
      }
    );

    await Promise.all(remoteSpecPromises);
  }

  static async generateCode(manager: PontxManager) {
    try {
      const result = await manager.resolvedConfig.resolvedPlugin.generateEntry({
        resolvedConfig: manager.resolvedConfig,
      });
      if (result) {
        await reGenerateFiles(result, manager.resolvedConfig.outDir);
      }
    } catch (e) {
      manager.logger.error(e.message, e.stack);
    }
  }

  static async listSamples(manager: PontxManager) {
    const samples = await manager.resolvedConfig.resolvedPlugin.generateSamples(
      {
        resolvedConfig: manager.resolvedConfig,
      }
    );

    return samples;
  }
}
