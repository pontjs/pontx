import * as path from "path";
import { PontxManager } from "../manager";
import type { ResolvedSpecLocation } from "./types";
import type { CliContext } from "../cli-context";
import { findGlobalSpecByName, getGlobalSpec } from "./registry";
import { createLogger, Logger } from "../logger";
import { resolveConfig } from "../config";

/**
 * Result of resolving a manager for a spec
 */
export interface ResolvedManagerResult {
  /** The PontxManager instance */
  manager: PontxManager;
  /** Whether the spec is from global registry */
  isGlobal: boolean;
  /** Global package name (only when isGlobal is true) */
  globalPackage?: string;
}

/**
 * Resolve a PontxManager for a given spec name.
 * Searches local project first, then global registry.
 * Handles all the logic for determining which manager to use and logging hints.
 *
 * @param specName - The spec name to resolve
 * @param ctx - CLI context providing access to local and global managers
 * @param options.forceGlobal - Force using global spec (skip local search)
 * @returns Resolved manager result
 * @throws Error if spec is not found in local project or global registry
 */
export async function resolveManagerForSpec(
  specName: string,
  ctx: CliContext,
  options?: { forceGlobal?: boolean }
): Promise<ResolvedManagerResult> {
  // Try to get local manager (only when not forcing global)
  // Use silent mode to avoid error output when local config doesn't exist
  let localManager: PontxManager | null = null;
  if (!options?.forceGlobal) {
    localManager = await ctx.tryGetLocalManager();
  }

  // Use resolveSpecByName for auto-discovery
  const result = await resolveSpecByName(specName, localManager, {
    forceGlobal: options?.forceGlobal,
  });

  if (!result) {
    throw new Error(
      `Spec "${specName}" not found in local project or global specs.`
    );
  }

  if (result.source === "global") {
    const manager = await createManagerFromGlobalSpec(
      result.globalPackage!,
      ctx.logger
    );

    // Output hint
    const hint = options?.forceGlobal && localManager ? " (overriding local)" : "";
    ctx.logger.info(
      `Using global spec "${specName}" from ${result.globalPackage}${hint}`
    );

    return {
      manager,
      isGlobal: true,
      globalPackage: result.globalPackage,
    };
  }

  // Local spec
  return {
    manager: localManager!,
    isGlobal: false,
  };
}

/**
 * 根据 specName 解析 spec 位置
 * 查找优先级：本地项目 → 全局注册
 *
 * @param specName spec 名称
 * @param localManager 本地项目的 PontxManager，如果为 null 则跳过本地查找
 * @param options.forceGlobal 是否强制使用全局 spec（跳过本地查找）
 * @returns 解析结果，如果找不到返回 null
 */
export async function resolveSpecByName(
  specName: string,
  localManager: PontxManager | null,
  options?: { forceGlobal?: boolean }
): Promise<ResolvedSpecLocation | null> {
  // 1. 优先查找本地项目（除非强制使用全局）
  if (!options?.forceGlobal && localManager) {
    const localOrigin = localManager.resolvedConfig.origins.find(
      (origin) => origin.name === specName
    );

    if (localOrigin) {
      return {
        source: "local",
        rootDir: localManager.resolvedConfig.rootDir,
        originConfig: localOrigin,
      };
    }
  }

  // 2. 查找全局注册
  const globalSpec = await findGlobalSpecByName(specName);

  if (globalSpec) {
    const { packageName, entry } = globalSpec;

    // 加载全局 spec 的配置
    const configPath = path.join(entry.path, "pontx.config.ts");
    const resolvedConfig = await resolveConfig(configPath, {
      rootDir: entry.path,
      logLevel: "silent",
    });

    // 返回第一个（唯一）origin
    const originConfig = resolvedConfig.origins[0];

    return {
      source: "global",
      globalPackage: packageName,
      rootDir: entry.path,
      originConfig,
    };
  }

  // 3. 未找到
  return null;
}

/**
 * 从全局 spec 包创建 PontxManager
 *
 * @param packageName 全局包名
 * @param logger 日志记录器
 * @returns PontxManager 实例
 * @throws 如果包不存在或无法加载
 */
export async function createManagerFromGlobalSpec(
  packageName: string,
  logger: Logger = createLogger("info", { prefix: "[pontx manager]" })
): Promise<PontxManager> {
  // 1. 获取全局 spec 信息
  const entry = await getGlobalSpec(packageName);

  if (!entry) {
    throw new Error(
      `Global spec package "${packageName}" not found. Run 'pontx global list-specs' to see available specs.`
    );
  }

  // 2. 验证路径存在
  const configPath = path.join(entry.path, "pontx.config.ts");

  // 3. 从配置路径创建 manager
  return PontxManager.constructorFromPontxConfigPath(
    configPath,
    entry.path,
    logger
  );
}

/**
 * 根据包名获取全局 spec 的 rootDir
 *
 * @param packageName npm 包名
 * @returns spec 所在的根目录路径
 * @throws 如果包不存在
 */
export async function getGlobalSpecRootDir(packageName: string): Promise<string> {
  const entry = await getGlobalSpec(packageName);

  if (!entry) {
    throw new Error(
      `Global spec package "${packageName}" not found. Run 'pontx global list-specs' to see available specs.`
    );
  }

  return entry.path;
}
