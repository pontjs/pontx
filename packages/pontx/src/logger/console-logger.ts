/**
 * @author jasonHzq
 * @description Console Logger 适配器
 *
 * 将标准 Console 对象适配为 Pontx Logger 接口
 * 用于简单场景或测试场景
 */

import { Logger, LogLevel, LogLevels, LogMeta } from './types';
import { formatJson } from './utils';

/**
 * Console Logger 适配器
 *
 * 将标准的 console 对象包装为符合 Logger 接口的实例
 * 适用于不需要复杂格式化的简单场景
 */
export class ConsoleLogger implements Logger {
  private console: Console;
  private _level: LogLevel;
  private warnedMessages = new Set<string>();
  private loggedErrors = new WeakSet<Error>();

  public hasWarned = false;

  constructor(level: LogLevel = 'info', console: Console = globalThis.console) {
    this._level = level;
    this.console = console;
  }

  get level(): LogLevel {
    return this._level;
  }

  set level(value: LogLevel) {
    this._level = value;
  }

  isLevelEnabled(level: LogLevel): boolean {
    return LogLevels[level] <= LogLevels[this._level];
  }

  trace(message: string, meta?: LogMeta): void {
    if (!this.isLevelEnabled('trace')) return;
    this.console.debug(this.formatMessage(message, meta));
  }

  debug(message: string, meta?: LogMeta): void {
    if (!this.isLevelEnabled('debug')) return;
    this.console.debug(this.formatMessage(message, meta));
  }

  info(message: string, meta?: LogMeta): void {
    if (!this.isLevelEnabled('info')) return;
    this.console.info(this.formatMessage(message, meta));
  }

  warn(message: string, meta?: LogMeta): void {
    if (!this.isLevelEnabled('warn')) return;
    this.hasWarned = true;
    this.console.warn(this.formatMessage(message, meta));
  }

  error(message: string, error?: Error | LogMeta, meta?: LogMeta): void {
    if (!this.isLevelEnabled('error')) return;

    this.hasWarned = true;

    const actualError = error instanceof Error ? error : undefined;
    const actualMeta = error instanceof Error ? meta : error;

    if (actualError) {
      this.loggedErrors.add(actualError);
    }

    this.console.error(
      this.formatMessage(message, actualMeta),
      actualError || ''
    );
  }

  fatal(message: string, error?: Error | LogMeta, meta?: LogMeta): void {
    if (!this.isLevelEnabled('fatal')) return;

    this.hasWarned = true;

    const actualError = error instanceof Error ? error : undefined;
    const actualMeta = error instanceof Error ? meta : error;

    if (actualError) {
      this.loggedErrors.add(actualError);
    }

    this.console.error(
      `[FATAL] ${this.formatMessage(message, actualMeta)}`,
      actualError || ''
    );
  }

  warnOnce(message: string, meta?: LogMeta): void {
    if (this.warnedMessages.has(message)) {
      return;
    }

    this.warn(message, meta);
    this.warnedMessages.add(message);
  }

  hasErrorLogged(error: Error): boolean {
    return this.loggedErrors.has(error);
  }

  /**
   * 格式化消息
   */
  private formatMessage(message: string, meta?: LogMeta): string {
    if (!meta || Object.keys(meta).length === 0) {
      return message;
    }

    // 过滤内部字段
    const { timestamp, prefix, ...otherMeta } = meta;

    if (Object.keys(otherMeta).length === 0) {
      return message;
    }

    return `${message} ${formatJson(otherMeta)}`;
  }
}

/**
 * 创建 Console Logger 实例
 *
 * @param level - 日志级别
 * @param console - Console 对象
 * @returns Logger 实例
 *
 * @example
 * ```typescript
 * const logger = createConsoleLogger('info');
 * logger.info('Hello World');
 * ```
 */
export function createConsoleLogger(
  level: LogLevel = 'info',
  console: Console = globalThis.console
): Logger {
  return new ConsoleLogger(level, console);
}
