/**
 * @author jasonHzq
 * @description Pontx Logger 核心实现
 *
 * 提供统一的日志输出能力，支持：
 * - 6 级日志标准（trace/debug/info/warn/error/fatal）
 * - 文本和 JSON 两种输出格式
 * - 彩色输出
 * - 日志级别控制
 * - 错误追踪和去重
 */

import colors from 'picocolors';
import { Logger, LoggerOptions, LogLevel, LogLevels, LogMeta } from './types';
import { formatTime, formatJson, extractErrorInfo } from './utils';

/**
 * Pontx Logger 实现类
 */
export class PontxLogger implements Logger {
  /* Logger 配置选项 */
  private options: Required<Omit<LoggerOptions, 'customLogger'>>;

  /* 已记录的错误对象集合（用于去重） */
  private loggedErrors = new WeakSet<Error>();

  /* 已警告的消息集合（用于 warnOnce） */
  private warnedMessages = new Set<string>();

  /* 是否已输出过警告 */
  public hasWarned = false;

  constructor(options: LoggerOptions = {}) {
    this.options = {
      level: options.level || 'info',
      prefix: options.prefix || '[pontx]',
      destination: options.destination || process.stderr,
      colorize: options.colorize ?? true,
      json: options.json ?? false,
    };
  }

  /* ========== 日志级别控制 ========== */

  get level(): LogLevel {
    return this.options.level;
  }

  set level(value: LogLevel) {
    this.options.level = value;
  }

  isLevelEnabled(level: LogLevel): boolean {
    return LogLevels[level] <= LogLevels[this.options.level];
  }

  /* ========== 6 级日志方法 ========== */

  trace(message: string, meta?: LogMeta): void {
    this.log('trace', message, undefined, meta);
  }

  debug(message: string, meta?: LogMeta): void {
    this.log('debug', message, undefined, meta);
  }

  info(message: string, meta?: LogMeta): void {
    this.log('info', message, undefined, meta);
  }

  warn(message: string, meta?: LogMeta): void {
    this.hasWarned = true;
    this.log('warn', message, undefined, meta);
  }

  error(message: string, error?: Error | LogMeta, meta?: LogMeta): void {
    this.hasWarned = true;

    // 兼容两种调用方式:
    // 1. logger.error('msg', error, meta)
    // 2. logger.error('msg', meta)
    const actualError = error instanceof Error ? error : undefined;
    const actualMeta = error instanceof Error ? meta : error;

    this.log('error', message, actualError, actualMeta);
  }

  fatal(message: string, error?: Error | LogMeta, meta?: LogMeta): void {
    this.hasWarned = true;

    const actualError = error instanceof Error ? error : undefined;
    const actualMeta = error instanceof Error ? meta : error;

    this.log('fatal', message, actualError, actualMeta);
  }

  warnOnce(message: string, meta?: LogMeta): void {
    if (this.warnedMessages.has(message)) {
      return;
    }

    this.hasWarned = true;
    this.warn(message, meta);
    this.warnedMessages.add(message);
  }

  /* ========== 错误追踪 ========== */

  hasErrorLogged(error: Error): boolean {
    return this.loggedErrors.has(error);
  }

  /* ========== 核心日志输出方法 ========== */

  /**
   * 核心日志输出方法
   * 所有日志方法最终都调用这个方法
   */
  private log(
    level: LogLevel,
    message: string,
    error?: Error,
    meta?: LogMeta
  ): void {
    // 检查日志级别
    if (!this.isLevelEnabled(level)) {
      return;
    }

    // 记录错误对象（用于去重）
    if (error) {
      this.loggedErrors.add(error);
    }

    // 格式化输出
    const output = this.format(level, message, error, meta);

    // 输出到目标流
    this.options.destination.write(output + '\n');
  }

  /**
   * 格式化日志输出
   */
  private format(
    level: LogLevel,
    message: string,
    error?: Error,
    meta?: LogMeta
  ): string {
    // JSON 格式
    if (this.options.json) {
      return this.formatJson(level, message, error, meta);
    }

    // 文本格式
    return this.formatText(level, message, error, meta);
  }

  /**
   * 格式化为 JSON
   */
  private formatJson(
    level: LogLevel,
    message: string,
    error?: Error,
    meta?: LogMeta
  ): string {
    const logObject: any = {
      level,
      time: Date.now(),
      msg: message,
    };

    // 添加错误信息
    if (error) {
      const errorInfo = extractErrorInfo(error);
      Object.assign(logObject, {
        error: errorInfo.message,
        errorName: errorInfo.name,
        stack: errorInfo.stack,
      });

      // 添加其他错误属性
      const { message: _, name: __, stack: ___, ...otherProps } = errorInfo;
      if (Object.keys(otherProps).length > 0) {
        Object.assign(logObject, otherProps);
      }
    }

    // 添加元数据
    if (meta) {
      const { timestamp: _t, prefix: _p, ...otherMeta } = meta;
      Object.assign(logObject, otherMeta);
    }

    return formatJson(logObject);
  }

  /**
   * 格式化为文本
   */
  private formatText(
    level: LogLevel,
    message: string,
    error?: Error,
    meta?: LogMeta
  ): string {
    const parts: string[] = [];

    // 1. 时间戳
    if (meta?.timestamp) {
      const time = formatTime();
      parts.push(this.colorize(colors.dim(time)));
    }

    // 2. 前缀 + 级别
    const prefix = meta?.prefix || this.options.prefix;
    const tag = this.formatTag(level, prefix);
    parts.push(tag);

    // 3. 消息
    parts.push(message);

    // 组装基础日志
    let output = parts.join(' ');

    // 4. 错误堆栈
    if (error?.stack) {
      // 错误堆栈使用灰色，保持可读性
      output += '\n' + this.colorize(colors.gray(error.stack));
    }

    // 5. 元数据
    if (meta) {
      const metaOutput = this.formatMeta(meta);
      if (metaOutput) {
        // 元数据使用灰色
        output += '\n' + this.colorize(colors.gray(metaOutput));
      }
    }

    return output;
  }

  /**
   * 格式化标签（前缀 + 级别）
   */
  private formatTag(level: LogLevel, prefix: string): string {
    const levelUpper = level.toUpperCase();
    const tag = `${prefix} ${levelUpper}`;

    if (!this.options.colorize) {
      return tag;
    }

    // 根据级别着色
    switch (level) {
      case 'trace':
      case 'debug':
        return colors.gray(tag);
      case 'info':
        return colors.cyan(tag);
      case 'warn':
        return colors.yellow(tag);
      case 'error':
      case 'fatal':
        return colors.red(colors.bold(tag));
      default:
        return tag;
    }
  }

  /**
   * 格式化元数据
   */
  private formatMeta(meta: LogMeta): string {
    // 过滤掉内部使用的字段
    const { timestamp, prefix, ...otherMeta } = meta;

    if (Object.keys(otherMeta).length === 0) {
      return '';
    }

    return formatJson(otherMeta, 2);
  }

  /**
   * 着色辅助方法
   */
  private colorize(text: string): string {
    return this.options.colorize ? text : colors.reset(text);
  }
}

/**
 * 创建 Logger 实例
 *
 * @param level - 日志级别
 * @param options - Logger 配置选项
 * @returns Logger 实例
 *
 * @example
 * ```typescript
 * // 基础使用
 * const logger = createLogger('info');
 * logger.info('Hello Pontx');
 *
 * // 自定义配置
 * const logger = createLogger('debug', {
 *   prefix: '[my-app]',
 *   colorize: true,
 *   json: false
 * });
 *
 * // 使用自定义 Logger
 * const customLogger = new MyLogger();
 * const logger = createLogger('info', { customLogger });
 * ```
 */
export function createLogger(
  level?: LogLevel,
  options?: LoggerOptions
): Logger {
  // 支持自定义 logger（用于依赖注入或测试）
  if (options?.customLogger) {
    return options.customLogger;
  }

  return new PontxLogger({
    level,
    ...options,
  });
}
