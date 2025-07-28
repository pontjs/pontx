/**
 * @author: jasonHzq
 * @description: 同步管理器，负责定时同步和手动同步功能
 */

import { createLogger, Logger } from "../logger";
import { PontxManager } from "../manager";

/**
 * 同步管理器
 */
export class SyncManager {
  /** 日志记录器 */
  private logger: Logger;

  /** PontxManager 实例 */
  private manager: PontxManager | null = null;

  /** 定时器实例 */
  private syncTimer: NodeJS.Timeout | null = null;

  /** 同步间隔（毫秒） */
  private syncInterval: number;

  /** 最后一次同步时间 */
  private lastSyncTime: Date | null = null;

  /** 同步错误计数 */
  private syncErrorCount = 0;

  /** 事件回调函数 */
  private onSyncSuccess?: (time: Date) => void;
  private onSyncError?: (error: Error) => void;

  constructor(syncInterval: number, logger: Logger) {
    this.syncInterval = syncInterval;
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
    onSyncSuccess?: (time: Date) => void;
    onSyncError?: (error: Error) => void;
  }): void {
    this.onSyncSuccess = handlers.onSyncSuccess;
    this.onSyncError = handlers.onSyncError;
  }

  /**
   * 启动定时同步
   */
  start(): void {
    this.logger.info(`启动定时同步，间隔: ${this.syncInterval}ms`);

    this.syncTimer = setInterval(async () => {
      try {
        await this.performSync();
      } catch (error) {
        this.logger.error("定时同步失败", error);
      }
    }, this.syncInterval);
  }

  /**
   * 停止定时同步
   */
  stop(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      this.logger.info("定时同步已停止");
    }
  }

  /**
   * 手动触发同步
   */
  async sync(): Promise<void> {
    if (!this.manager) {
      throw new Error("PontxManager 未初始化");
    }

    try {
      this.logger.info("开始手动同步...");
      await this.performSync();
      this.logger.info("手动同步完成");
    } catch (error) {
      this.logger.error("手动同步失败", error);
      throw error;
    }
  }

  /**
   * 执行同步操作
   */
  private async performSync(): Promise<void> {
    if (!this.manager) return;

    try {
      this.logger.info("开始同步远程数据...");

      // 重新获取远程数据
      await PontxManager.fetchRemotePontMeta(this.manager);

      this.lastSyncTime = new Date();
      this.syncErrorCount = 0;

      this.logger.info("同步完成");
      this.onSyncSuccess?.(this.lastSyncTime);
    } catch (error) {
      this.syncErrorCount++;
      this.logger.error("同步失败", error);
      this.onSyncError?.(error);
      throw error;
    }
  }

  /**
   * 获取同步信息
   */
  getSyncInfo() {
    return {
      lastSyncTime: this.lastSyncTime,
      syncErrorCount: this.syncErrorCount,
      syncInterval: this.syncInterval,
      isRunning: !!this.syncTimer,
    };
  }
}
