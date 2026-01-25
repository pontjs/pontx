/**
 * @author jasonHzq
 * @description Pontx Logger 统一导出
 *
 * 提供统一的日志能力，支持多种使用场景
 */

/* 类型定义 */
export type {
  Logger,
  LogLevel,
  LogMeta,
  LoggerOptions,
  // 兼容旧版类型
  LegacyLoggerOptions,
  LogOptions,
  LogErrorOptions,
} from './types';

export { LogLevels } from './types';

/* 核心 Logger */
export { PontxLogger, createLogger } from './logger';

/* Console Logger 适配器 */
export { ConsoleLogger, createConsoleLogger } from './console-logger';

/* 工具函数 */
export {
  formatTime,
  formatJson,
  isValidLogLevel,
  getLogLevelFromEnv,
  shouldLog,
  truncate,
  formatErrorStack,
  extractErrorInfo,
} from './utils';
