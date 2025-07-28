/**
 * @author: jasonHzq
 * @description: PontxService 相关类型定义
 */

import { EventEmitter } from "events";

/**
 * 文件监听器接口
 */
export interface FileWatcher {
  /** 监听的文件路径 */
  path: string;
  /** 监听器实例 */
  watcher: any;
  /** 监听器类型 */
  type: "config" | "plugin" | "lock";
}

/**
 * 服务状态
 */
export enum ServiceStatus {
  /** 未启动 */
  STOPPED = "stopped",
  /** 启动中 */
  STARTING = "starting",
  /** 运行中 */
  RUNNING = "running",
  /** 停止中 */
  STOPPING = "stopping",
  /** 错误状态 */
  ERROR = "error",
}

/**
 * 服务事件接口
 */
export interface ServiceEvents {
  /** 服务启动完成 */
  started: () => void;
  /** 服务停止完成 */
  stopped: () => void;
  /** 服务错误 */
  error: (error: Error) => void;
  /** 同步完成 */
  synced: (time: Date) => void;
  /** 同步错误 */
  syncError: (error: Error) => void;
  /** 配置文件变化 */
  configChanged: () => void;
  /** 配置文件错误 */
  configError: (error: Error) => void;
  /** 插件文件变化 */
  pluginChanged: () => void;
  /** 插件文件错误 */
  pluginError: (error: Error) => void;
  /** API 锁定文件变化 */
  lockFileChanged: (specName: string) => void;
  /** API 锁定文件错误 */
  lockFileError: (error: Error) => void;
}

/**
 * 服务接口
 */
export interface IPontxService extends EventEmitter {
  /** 启动服务 */
  start(): Promise<void>;
  /** 停止服务 */
  stop(): Promise<void>;
  /** 获取服务状态 */
  getStatus(): ServiceStatus;
  /** 获取服务信息 */
  getServiceInfo(): any;
  /** 手动触发同步 */
  sync(): Promise<void>;
}

/**
 * 文件监听器接口
 */
export interface IFileWatcher {
  /** 启动文件监听 */
  start(): Promise<void>;
  /** 停止文件监听 */
  stop(): void;
  /** 获取监听的文件列表 */
  getWatchedFiles(): FileWatcher[];
}
