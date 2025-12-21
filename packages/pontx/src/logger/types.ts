/**
 * @author jasonHzq
 * @description Pontx Logger 类型定义
 *
 * 提供统一的日志接口，支持 6 级日志标准（RFC 5424 Syslog）
 */

/**
 * 日志级别
 *
 * - silent: 静默，无任何输出
 * - fatal: 致命错误，程序即将崩溃
 * - error: 错误，功能失败但程序继续运行
 * - warn: 警告，潜在问题
 * - info: 一般信息，关键操作
 * - debug: 调试信息，详细流程
 * - trace: 追踪信息，非常详细的调试信息
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'silent';

/**
 * 日志级别权重映射
 * 数值越小，级别越高（优先级越高）
 */
export const LogLevels: Record<LogLevel, number> = {
  silent: 0,  // 静默，无输出
  fatal: 10,  // 致命错误
  error: 20,  // 错误
  warn: 30,   // 警告
  info: 40,   // 信息
  debug: 50,  // 调试
  trace: 60,  // 追踪
};

/**
 * 日志元数据
 * 用于携带额外的上下文信息
 */
export interface LogMeta {
  /** 是否显示时间戳 */
  timestamp?: boolean;
  /** 临时前缀（覆盖默认前缀） */
  prefix?: string;
  /** 其他自定义字段 */
  [key: string]: any;
}

/**
 * Logger 核心接口
 *
 * 提供 6 个级别的日志方法，支持日志级别控制
 */
export interface Logger {
  /**
   * 追踪日志（最详细）
   * 用于逐行追踪程序执行流程
   */
  trace(message: string, meta?: LogMeta): void;

  /**
   * 调试日志
   * 用于开发时的详细信息
   */
  debug(message: string, meta?: LogMeta): void;

  /**
   * 信息日志
   * 用于记录关键操作和状态变更
   */
  info(message: string, meta?: LogMeta): void;

  /**
   * 警告日志
   * 用于潜在问题，不影响主流程
   */
  warn(message: string, meta?: LogMeta): void;

  /**
   * 错误日志
   * 用于功能失败，但程序可继续运行
   *
   * @param message - 错误消息
   * @param error - Error 对象或元数据
   * @param meta - 额外元数据（当 error 是 Error 对象时）
   */
  error(message: string, error?: Error | LogMeta, meta?: LogMeta): void;

  /**
   * 致命错误日志
   * 用于程序即将崩溃的严重错误
   *
   * @param message - 错误消息
   * @param error - Error 对象或元数据
   * @param meta - 额外元数据（当 error 是 Error 对象时）
   */
  fatal(message: string, error?: Error | LogMeta, meta?: LogMeta): void;

  /**
   * 警告日志（去重）
   * 相同消息只输出一次
   */
  warnOnce(message: string, meta?: LogMeta): void;

  /**
   * 当前日志级别
   */
  level: LogLevel;

  /**
   * 检查指定级别是否启用
   */
  isLevelEnabled(level: LogLevel): boolean;

  /**
   * 检查错误是否已记录
   * 用于避免重复记录同一个错误
   */
  hasErrorLogged?(error: Error): boolean;

  /**
   * 是否已输出过警告
   */
  hasWarned?: boolean;
}

/**
 * Logger 配置选项
 */
export interface LoggerOptions {
  /** 日志级别，默认 'info' */
  level?: LogLevel;

  /** 日志前缀，默认 '[pontx]' */
  prefix?: string;

  /** 输出目标流，默认 process.stderr */
  destination?: NodeJS.WritableStream;

  /** 是否启用彩色输出，默认 true */
  colorize?: boolean;

  /** 是否使用 JSON 格式输出，默认 false */
  json?: boolean;

  /** 自定义 Logger 实例（用于依赖注入） */
  customLogger?: Logger;
}

/**
 * 兼容旧版 Logger 的选项
 * @deprecated 使用 LoggerOptions 代替
 */
export interface LegacyLoggerOptions {
  prefix?: string;
  customLogger?: Logger;
  console?: Console;
}

/**
 * 兼容旧版的日志选项
 * @deprecated 使用 LogMeta 代替
 */
export interface LogOptions {
  timestamp?: boolean;
}

/**
 * 兼容旧版的错误日志选项
 * @deprecated 使用 LogMeta 代替
 */
export interface LogErrorOptions extends LogOptions {
  error?: Error | null;
  prefix?: string;
}
