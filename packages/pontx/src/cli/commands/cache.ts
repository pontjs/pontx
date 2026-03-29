/**
 * @author jasonHzq
 * @description 缓存管理命令
 */

import * as path from "path";
import * as fs from "fs";
import fsp from "node:fs/promises";
import colors from "picocolors";
import { findNearestNodeModules } from "../../utils";
import type { Logger } from "../../logger/types";

/**
 * 获取缓存目录路径
 */
function getCacheDir(rootDir: string): string | null {
  const nodeModulesDir = findNearestNodeModules(rootDir);
  if (!nodeModulesDir) {
    return null;
  }
  return path.join(nodeModulesDir, ".pontx-cache");
}

/**
 * 计算文件夹大小
 */
async function getFolderSize(dirPath: string): Promise<number> {
  let totalSize = 0;

  try {
    const entries = await fsp.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        totalSize += await getFolderSize(fullPath);
      } else if (entry.isFile()) {
        const stats = await fsp.stat(fullPath);
        totalSize += stats.size;
      }
    }
  } catch (e) {
    // 忽略错误
  }

  return totalSize;
}

/**
 * 格式化字节大小
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * 清理缓存命令
 */
export async function cleanCacheCommand(
  rootDir: string,
  logger: Logger
): Promise<void> {
  const cacheDir = getCacheDir(rootDir);

  if (!cacheDir) {
    logger.warn(colors.yellow("未找到 node_modules 目录"));
    return;
  }

  if (!fs.existsSync(cacheDir)) {
    logger.info("无缓存文件");
    return;
  }

  try {
    // 计算缓存大小
    const size = await getFolderSize(cacheDir);

    // 删除缓存
    await fsp.rm(cacheDir, { recursive: true, force: true });

    logger.info(
      colors.green(
        `✓ 缓存已清理 (释放 ${formatBytes(size)})\n` +
          colors.dim(`  位置: ${cacheDir}`)
      )
    );
  } catch (error: any) {
    logger.error(colors.red(`清理缓存失败: ${error.message}`));
    throw error;
  }
}

/**
 * 查看缓存信息命令
 */
export async function cacheInfoCommand(
  rootDir: string,
  logger: Logger
): Promise<void> {
  const cacheDir = getCacheDir(rootDir);

  if (!cacheDir) {
    logger.warn(colors.yellow("未找到 node_modules 目录"));
    return;
  }

  if (!fs.existsSync(cacheDir)) {
    logger.info("无缓存文件");
    return;
  }

  try {
    const entries = await fsp.readdir(cacheDir);
    const size = await getFolderSize(cacheDir);

    logger.info(colors.bold("缓存信息:"));
    logger.info(`  位置: ${colors.cyan(cacheDir)}`);
    logger.info(`  文件数: ${colors.cyan(entries.length.toString())}`);
    logger.info(`  总大小: ${colors.cyan(formatBytes(size))}`);

    if (entries.length > 0) {
      logger.info("\n" + colors.dim("  提示: 运行 'pontx cache:clean' 清理缓存"));
    }
  } catch (error: any) {
    logger.error(colors.red(`获取缓存信息失败: ${error.message}`));
    throw error;
  }
}
