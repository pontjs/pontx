/**
 * @author: jasonHzq
 * @description: 文件监听器，负责监听配置文件、插件文件和 API 锁定文件的变化
 */

import * as fs from "fs";
import * as path from "path";
import fsp from "node:fs/promises";
import { createLogger } from "../logger/logger";
import type { Logger } from "../logger/types";
import { PontxManager } from "../manager";
import { ResolvedConfig } from "../type";
import { FileWatcher, IFileWatcher } from "./types";

/**
 * 文件监听器实现
 */
export class FileWatcherService implements IFileWatcher {
  /** 日志记录器 */
  private logger: Logger;

  /** 配置文件路径 */
  private configPath: string;

  /** PontxManager 实例 */
  private manager: PontxManager | null = null;

  /** 文件监听器列表 */
  private fileWatchers: FileWatcher[] = [];

  /** 事件回调函数 */
  private onConfigChange?: () => void;
  private onLockFileChange?: (specName: string) => void;

  private lastConfigContent: string | null = null;

  /** 每个 lock 文件的最后内容缓存 */
  private lastLockFileContents: Record<string, string> = {};

  constructor(configPath: string, logger: Logger) {
    this.configPath = configPath;
    this.logger = logger;
  }

  /**
   * 设置 PontxManager 实例
   */
  setManager(manager: PontxManager): void {
    this.manager = manager;
  }

  /**
   * 设置事件回调
   */
  setEventHandlers(handlers: {
    onConfigChange?: () => void;
    onLockFileChange?: (specName: string) => void;
  }): void {
    this.onConfigChange = handlers.onConfigChange;
    this.onLockFileChange = handlers.onLockFileChange;
  }

  /**
   * 启动文件监听
   */
  async start(): Promise<void> {
    this.logger.info("启动文件监听...");

    // 监听配置文件
    await this.watchConfigFile();

    // 监听 api-lock.json 文件
    await this.watchLockFiles();

    this.logger.info(
      `文件监听启动成功，共监听 ${this.fileWatchers.length} 个文件`
    );
  }

  /**
   * 停止文件监听
   */
  stop(): void {
    for (const fileWatcher of this.fileWatchers) {
      fileWatcher.watcher.close();
    }
    this.fileWatchers = [];
    this.logger.info("文件监听已停止");
  }

  /**
   * 获取监听的文件列表
   */
  getWatchedFiles(): FileWatcher[] {
    return this.fileWatchers.map((w) => ({
      path: w.path,
      watcher: w.watcher,
      type: w.type,
    }));
  }

  /**
   * 监听配置文件
   */
  private async watchConfigFile(): Promise<void> {
    const configPath = this.configPath;

    try {
      await fsp.access(configPath);
    } catch {
      this.logger.warn(`配置文件不存在: ${configPath}`);
      return;
    }

    // 初始化内容
    this.lastConfigContent = await fsp.readFile(configPath, "utf-8");

    const watcher = fs.watch(
      configPath,
      { persistent: true },
      async (eventType, filename) => {
        try {
          const newContent = await fsp.readFile(configPath, "utf-8");
          if (newContent !== this.lastConfigContent) {
            this.logger.info(`配置文件发生变化: ${eventType} - ${filename}`);
            this.lastConfigContent = newContent;
            this.onConfigChange?.();
          }
        } catch (e) {
          this.logger.error("读取配置文件失败", e);
        }
      }
    );

    this.fileWatchers.push({
      path: configPath,
      watcher,
      type: "config",
    });
  }

  /**
   * 监听 api-lock.json 文件
   */
  private async watchLockFiles(): Promise<void> {
    if (!this.manager?.resolvedConfig) return;

    const config = this.manager.resolvedConfig;

    for (const origin of config.origins) {
      const lockPath = origin.name
        ? path.join(config.outDir, origin.name, "api-lock.json")
        : path.join(config.outDir, "api-lock.json");

      try {
        await fsp.access(lockPath);
      } catch {
        // 文件不存在，跳过
        continue;
      }

      // 初始化内容缓存
      try {
        this.lastLockFileContents[lockPath] = await fsp.readFile(
          lockPath,
          "utf-8"
        );
      } catch {
        this.lastLockFileContents[lockPath] = "";
      }

      const watcher = fs.watch(
        lockPath,
        { persistent: true },
        async (eventType, filename) => {
          try {
            const newContent = await fsp.readFile(lockPath, "utf-8");
            if (newContent !== this.lastLockFileContents[lockPath]) {
              this.logger.info(
                `API 锁定文件发生变化: ${eventType} - ${filename}`
              );
              this.lastLockFileContents[lockPath] = newContent;
              this.onLockFileChange?.(origin.name);
            }
          } catch (e) {
            this.logger.error("读取 API 锁定文件失败", e);
          }
        }
      );

      this.fileWatchers.push({
        path: lockPath,
        watcher,
        type: "lock",
      });
    }
  }
}
