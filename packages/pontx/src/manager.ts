import { PontxSpec, PontxSpecs } from "@pontx/spec";
import { lookForFiles } from "./utils";
import { createLogger } from "./logger/logger";
import type { Logger } from "./logger/types";
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
      logger.debug(`找到配置文件: ${configPathname}`);
      return PontxManager.constructorFromPontxConfigPath(
        configPathname,
        rootDir,
        logger
      );
    } else {
      const error = new Error(`未找到 Pontx 配置文件 (${PontxManager.configFilename})`);
      logger.error("配置文件查找失败", error, {
        rootDir,
        searchFor: PontxManager.configFilename
      });
      throw error;
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

    logger.debug('开始读取本地 specs');
    await PontxManager.readLocalSpecs(manager);

    logger.debug('开始获取远程元数据');
    try {
      await PontxManager.fetchRemotePontMeta(manager);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      manager.logger.warn("获取远程 Pontx 元数据失败", err);
    }

    logger.debug('Manager 初始化完成');
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
          manager.logger.debug(`读取本地 spec: ${config.name}`);
          const localDataStr = await fsp.readFile(filePath, {
            encoding: "utf8",
          });
          try {
            const spec = JSON.parse(localDataStr) as PontxSpec;
            config.spec = spec;
          } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            manager.logger.error(
              `读取本地 spec 失败 (${config.name})`,
              error,
              { filePath }
            );
          }
        } else {
          manager.logger.debug(`本地 spec 不存在: ${config.name}`);
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
      manager.logger.debug('开始生成代码');
      const result = await manager.resolvedConfig.resolvedPlugin.generateEntry({
        resolvedConfig: manager.resolvedConfig,
      });
      if (result) {
        manager.logger.debug(`生成文件到: ${manager.resolvedConfig.outDir}`);
        await reGenerateFiles(result, manager.resolvedConfig.outDir);
        manager.logger.info('代码生成完成');
      } else {
        manager.logger.warn('插件未返回生成结果');
      }
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      manager.logger.error('代码生成失败', error);
      throw error;
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
