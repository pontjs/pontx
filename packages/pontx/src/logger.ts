/**
 * @author jasonHzq
 * @description Logger 兼容层
 *
 * 保留旧版 Logger 接口，内部使用新版实现
 * 确保现有代码无需修改即可使用新 Logger
 *
 * @deprecated 推荐直接使用 ./logger 模块中的新版 Logger
 */

import { createLogger as createNewLogger } from './logger/logger';
import type { Logger as NewLogger, LogLevel as NewLogLevel, LogMeta } from './logger/types';

/* ========== 旧版类型定义（保持向后兼容） ========== */

/**
 * @deprecated 使用新版 LogLevel (trace/debug/info/warn/error/fatal/silent)
 */
export type LogType = "error" | "warn" | "info";

/**
 * @deprecated 使用新版 LogLevel
 */
export type LogLevel = LogType | "silent";

/**
 * @deprecated 新版使用不同的权重映射
 */
export const LogLevels: Record<LogLevel, number> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
};

/**
 * @deprecated 使用新版 LogMeta
 */
export interface LogOptions {
  timestamp?: boolean;
}

/**
 * @deprecated 使用新版 LogMeta
 */
export interface LogErrorOptions extends LogOptions {
  error?: Error | null;
  prefix?: string;
}

/**
 * @deprecated 使用新版 Logger 接口
 */
export interface Logger {
  info(msg: string, options?: LogOptions): void;
  warn(msg: string, options?: LogOptions): void;
  warnOnce(msg: string, options?: LogOptions): void;
  error(msg: string, options?: LogErrorOptions): void;
  hasErrorLogged(error: Error): boolean;
  hasWarned: boolean;
}

/**
 * @deprecated 使用新版 LoggerOptions
 */
export interface LoggerOptions {
  prefix?: string;
  customLogger?: Logger;
  console?: Console;
}

/* ========== 旧版到新版的适配器 ========== */

/**
 * 将旧版 Logger 包装为符合旧接口的实例
 */
class LegacyLoggerAdapter implements Logger {
  private newLogger: NewLogger;

  constructor(newLogger: NewLogger) {
    this.newLogger = newLogger;
  }

  get hasWarned(): boolean {
    return this.newLogger.hasWarned || false;
  }

  info(msg: string, options?: LogOptions): void {
    const meta = this.convertOptions(options);
    this.newLogger.info(msg, meta);
  }

  warn(msg: string, options?: LogOptions): void {
    const meta = this.convertOptions(options);
    this.newLogger.warn(msg, meta);
  }

  warnOnce(msg: string, options?: LogOptions): void {
    const meta = this.convertOptions(options);
    this.newLogger.warnOnce(msg, meta);
  }

  error(msg: string, options?: LogErrorOptions): void {
    const error = options?.error || undefined;
    const meta = this.convertErrorOptions(options);

    if (error) {
      this.newLogger.error(msg, error, meta);
    } else {
      this.newLogger.error(msg, meta);
    }
  }

  hasErrorLogged(error: Error): boolean {
    return this.newLogger.hasErrorLogged?.(error) || false;
  }

  /**
   * 将旧版 LogOptions 转换为新版 LogMeta
   */
  private convertOptions(options?: LogOptions): LogMeta | undefined {
    if (!options) return undefined;

    return {
      timestamp: options.timestamp,
    };
  }

  /**
   * 将旧版 LogErrorOptions 转换为新版 LogMeta
   */
  private convertErrorOptions(options?: LogErrorOptions): LogMeta | undefined {
    if (!options) return undefined;

    return {
      timestamp: options.timestamp,
      prefix: options.prefix,
    };
  }
}

/* ========== 兼容旧版的工厂函数 ========== */

/**
 * 创建 Logger 实例（兼容旧版 API）
 *
 * @param level - 日志级别 (silent/error/warn/info)
 * @param options - Logger 配置选项
 * @returns Logger 实例
 *
 * @deprecated 推荐使用 ./logger 中的 createLogger
 *
 * @example
 * ```typescript
 * // 旧版用法（仍然可用）
 * const logger = createLogger('info', { prefix: '[app]' });
 * logger.info('message');
 * logger.error('error', { error: new Error('fail') });
 *
 * // 推荐新版用法
 * import { createLogger } from './logger';
 * const logger = createLogger('info', { prefix: '[app]' });
 * logger.info('message');
 * logger.error('error', new Error('fail'));
 * logger.debug('debug info');  // 新增
 * ```
 */
export function createLogger(
  level: LogLevel = "info",
  options: LoggerOptions = {}
): Logger {
  // 如果提供了自定义 logger，直接返回
  if (options.customLogger) {
    return options.customLogger;
  }

  // 将旧版 level 映射到新版
  const newLevel = mapLegacyLevel(level);

  // 创建新版 logger
  const newLogger = createNewLogger(newLevel, {
    prefix: options.prefix,
    // 注意：旧版的 console 参数被忽略，新版统一输出到 stderr
  });

  // 包装为旧版接口
  return new LegacyLoggerAdapter(newLogger);
}

/**
 * 将旧版日志级别映射到新版
 */
function mapLegacyLevel(level: LogLevel): NewLogLevel {
  switch (level) {
    case 'silent':
      return 'silent';
    case 'error':
      return 'error';
    case 'warn':
      return 'warn';
    case 'info':
      return 'info';
    default:
      return 'info';
  }
}

/* ========== 重新导出新版 Logger（推荐使用） ========== */

/**
 * 推荐直接导入新版 Logger
 *
 * @example
 * ```typescript
 * // 推荐方式
 * import { createNewLogger, PontxLogger } from './logger';
 *
 * const logger = createNewLogger('debug', {
 *   prefix: '[app]',
 *   json: false
 * });
 *
 * logger.trace('trace');
 * logger.debug('debug');
 * logger.info('info');
 * logger.warn('warn');
 * logger.error('error', error);
 * logger.fatal('fatal', error);
 * ```
 */
export { createNewLogger };
export { PontxLogger } from './logger/logger';
export { ConsoleLogger, createConsoleLogger } from './logger/console-logger';
export { getLogLevelFromEnv } from './logger/utils';

export type {
  Logger as NewLogger,
  LogLevel as NewLogLevel,
  LogMeta,
  LoggerOptions as NewLoggerOptions,
} from './logger/types';
