import { PontxManager } from "../manager";
import { createLogger } from "../logger/logger";
import type { Logger } from "../logger/types";

export interface CliContext {
  /** 静默尝试获取本地 manager，失败返回 null */
  tryGetLocalManager: () => Promise<PontxManager | null>;
  /** 获取本地 manager（懒加载单例） */
  getManager: () => Promise<PontxManager>;
  /** 日志实例 */
  logger: Logger;
}

/**
 * 创建 CLI 上下文
 * @param rootDir - 项目根目录
 * @param logger - 可选的日志实例
 */
export function createCliContext(rootDir: string, logger?: Logger): CliContext {
  const contextLogger = logger || createLogger("info", { prefix: "[pontx cli]" });

  // 懒加载单例：只在需要时初始化 PontxManager
  let managerInstance: PontxManager | null = null;

  async function getManager(): Promise<PontxManager> {
    if (!managerInstance) {
      managerInstance = await PontxManager.constructorFromRootDir(
        rootDir,
        contextLogger
      );
    }
    return managerInstance;
  }

  /**
   * 静默尝试获取本地 manager
   * 用于全局 spec 查找场景，避免在本地配置不存在时输出错误信息
   */
  async function tryGetLocalManager(): Promise<PontxManager | null> {
    if (managerInstance) {
      return managerInstance;
    }

    const silentLogger = createLogger("silent", {
      prefix: "[pontx cli]",
    });

    try {
      managerInstance = await PontxManager.constructorFromRootDir(
        rootDir,
        silentLogger
      );
      return managerInstance;
    } catch (e) {
      return null;
    }
  }

  return {
    tryGetLocalManager,
    getManager,
    logger: contextLogger,
  };
}
