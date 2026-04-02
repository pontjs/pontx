/**
 * @author pontx
 * @description SDK CLI Context 适配器
 * 将 SDK CLI 配置（api-lock.json + executeApi）适配成主 CLI 命令所需的 CliContext
 */

import { PontxSpec } from "@pontx/spec";
import { PontxManager } from "../manager";
import type { CliContext } from "../cli-context";
import type { ResolvedConfig, ResolvedOriginConfig } from "../type";
import type { CLIConfig } from "./types";
import type { Logger } from "../logger/types";
import { resolvePlugin } from "../plugin";

/**
 * 从 SDK CLI 配置创建 CliContext
 * @param config SDK CLI 配置
 * @param spec PontxSpec 对象
 * @param logger 日志实例
 */
export function createSdkCliContext(
  config: CLIConfig,
  spec: PontxSpec,
  logger: Logger
): CliContext {
  let managerInstance: PontxManager | null = null;

  async function getManager(): Promise<PontxManager> {
    if (managerInstance) {
      return managerInstance;
    }

    // 1. 创建最小化的 origin 配置
    const origin: ResolvedOriginConfig = {
      name: spec.name,
      url: "",
      spec: spec,
      remoteSpec: undefined,
      outDir: "",
    };

    // 3. 创建最小化的 resolvedConfig
    const resolvedConfig: ResolvedConfig = {
      rootDir: "",
      configDir: "",
      configPath: "",
      outDir: "",
      origins: [origin],
      resolvedPlugin: resolvePlugin([], config.executeApi),
      executeApiConfig: config.executeApi,
    };

    // 4. 创建 manager
    managerInstance = new PontxManager();
    managerInstance.resolvedConfig = resolvedConfig;
    managerInstance.logger = logger;

    // 调用 configResolved 钩子
    resolvedConfig.resolvedPlugin.configResolved(resolvedConfig);

    return managerInstance;
  }

  return {
    getManager,
    tryGetLocalManager: getManager,
    logger,
  };
}
