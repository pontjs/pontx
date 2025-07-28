/**
 * @author: jasonHzq
 * @description: PontxService 主类，整合文件监听、同步管理和 Web 服务功能
 */

import { EventEmitter } from "events";
import { PontxManager } from "../manager";
import { createLogger, Logger } from "../logger";
import { ServiceStatus, IPontxService } from "./types";
import { FileWatcherService } from "./file-watcher";
import { SyncManager } from "./sync-manager";
import { WebServer } from "./web-server";
import type { ServiceConfig } from "../type";

/**
 * PontxService 主类
 * 整合文件监听、同步管理和 Web 服务功能
 */
export class PontxService extends EventEmitter implements IPontxService {
  /** 服务配置 */
  private config: ServiceConfig;

  /** 日志记录器 */
  private logger: Logger;

  /** 服务状态 */
  private status: ServiceStatus = ServiceStatus.STOPPED;

  /** PontxManager 实例 */
  private manager: PontxManager | null = null;

  /** 文件监听器 */
  private fileWatcher: FileWatcherService;

  /** 元数据同步管理器 */
  private syncManager: SyncManager;

  /** Web 服务器 */
  private webServer: WebServer;

  /** 项目根目录 */
  private rootDir: string;

  /** 默认服务配置 */
  private static defaultConfig: ServiceConfig = {
    port: 3000,
    syncInterval: 5 * 60 * 1000, // 5 分钟
    enableFileWatch: true,
    enableAutoSync: true,
    enableWebServer: true,
    logLevel: "info",
  };

  getManager() {
    return this.manager;
  }

  /**
   * 构造函数
   * @param rootDir 项目根目录
   * @param config 构造函数传入的服务配置
   */
  constructor(rootDir: string, config?: ServiceConfig) {
    super();
    this.rootDir = rootDir;
    this.config = config || {};
    this.logger = createLogger(this.config.logLevel!, {
      prefix: "[pontx service]",
    });
  }

  /**
   * 启动服务
   */
  async start(): Promise<void> {
    try {
      this.status = ServiceStatus.STARTING;
      this.logger.info("正在启动 PontxService...");

      // 初始化 PontxManager
      await this.initializeManager();

      // 合并 config：默认值 < managerConfig < constructorConfig
      const managerConfig = this.manager.resolvedConfig?.service;
      this.config = {
        ...PontxService.defaultConfig,
        ...(managerConfig || {}),
        ...this.config,
      };

      // 初始化组件
      this.syncManager = new SyncManager(
        this.config.syncInterval!,
        this.logger
      );
      this.webServer = new WebServer(this.config.port!, this.logger);
      this.fileWatcher = new FileWatcherService(
        this.manager.resolvedConfig.configPath,
        this.logger
      );
      this.setupEventHandlers();

      // 设置各个组件的 manager
      this.syncManager.setManager(this.manager!);
      this.webServer.setManager(this.manager!);
      this.fileWatcher.setManager(this.manager!);

      // 启动文件监听
      if (this.config.enableFileWatch) {
        await this.fileWatcher.start();
      }

      // 启动定时同步
      if (this.config.enableAutoSync) {
        this.syncManager.start();
      }

      // 启动 Web 服务
      if (this.config.enableWebServer) {
        await this.webServer.start();
      }

      this.status = ServiceStatus.RUNNING;
      this.logger.info("PontxService 启动成功");
      this.emit("started");
    } catch (error) {
      this.status = ServiceStatus.ERROR;
      this.logger.error("PontxService 启动失败", { error });
      this.emit("error", error);
      throw error;
    }
  }

  /**
   * 停止服务
   */
  async stop(): Promise<void> {
    try {
      this.status = ServiceStatus.STOPPING;
      this.logger.info("正在停止 PontxService...");

      // 停止文件监听
      this.fileWatcher.stop();

      // 停止定时同步
      this.syncManager.stop();

      // 停止 Web 服务
      await this.webServer.stop();

      this.status = ServiceStatus.STOPPED;
      this.logger.info("🛑 PontxService 已停止");
      this.emit("stopped");
    } catch (error) {
      this.logger.error("PontxService 停止失败", { error });
      this.emit("error", error);
      throw error;
    }
  }

  /**
   * 获取服务状态
   */
  getStatus(): ServiceStatus {
    return this.status;
  }

  /**
   * 获取服务信息
   */
  getServiceInfo() {
    return {
      status: this.status,
      config: this.config,
      fileWatchers: this.fileWatcher.getWatchedFiles(),
      syncInfo: this.syncManager.getSyncInfo(),
      webServer: {
        port: this.config.port,
        enabled: this.config.enableWebServer,
      },
    };
  }

  /**
   * 手动触发同步
   */
  async sync(): Promise<void> {
    await this.syncManager.sync();
  }

  /**
   * 初始化 PontxManager 并合并配置
   */
  private async initializeManager(): Promise<void> {
    this.logger.info("初始化 PontxManager...");
    this.manager = await PontxManager.constructorFromRootDir(
      this.rootDir,
      this.logger
    );
    if (!this.manager) {
      throw new Error("无法初始化 PontxManager");
    }
    this.logger.info("PontxManager 初始化成功");
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    this.fileWatcher.setEventHandlers({
      onConfigChange: () => {
        this.logger.info("配置文件发生变化，重新初始化...");
        this.handleConfigChange();
      },
      onLockFileChange: (specName: string) => {
        this.logger.info(`API 锁定文件发生变化: ${specName}`);
        this.handleLockFileChange(specName);
      },
    });
    this.syncManager.setEventHandlers({
      onSyncSuccess: (time: Date) => {
        this.logger.info(`🔄 同步完成: ${time.toLocaleString()}`);
        this.emit("synced", time);
      },
      onSyncError: (error: Error) => {
        this.logger.error("❌ 同步失败", { error });
        this.emit("syncError", error);
      },
    });
  }

  /**
   * 处理配置文件变化
   */
  private async handleConfigChange(): Promise<void> {
    try {
      await this.initializeManager();
      this.fileWatcher.setManager(this.manager!);
      this.syncManager.setManager(this.manager!);
      this.webServer.setManager(this.manager!);
      this.fileWatcher.stop();
      await this.fileWatcher.start();
      this.emit("configChanged");
      this.logger.info("配置重新加载完成");
    } catch (error) {
      this.logger.error("配置重新加载失败", { error });
      this.emit("configError", error);
    }
  }

  /**
   * 处理 API 锁定文件变化
   */
  private async handleLockFileChange(specName: string): Promise<void> {
    try {
      if (this.manager) {
        await PontxManager.readLocalSpecs(this.manager);
        await PontxManager.generateCode(this.manager);
      }
      this.emit("lockFileChanged", specName);
      this.logger.info("API 锁定文件重新加载完成");
    } catch (error) {
      this.logger.error("API 锁定文件重新加载失败", { error });
      this.emit("lockFileError", error);
    }
  }
}

// 重新导出类型
export { ServiceStatus } from "./types";
export type { ServiceConfig } from "../type";
