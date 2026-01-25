/**
 * @author jasonHzq
 * @description Logger 工具函数
 *
 * 提供时间格式化、JSON 序列化、日志级别解析等工具函数
 */

import { LogLevel, LogLevels } from './types';

/* 时间格式化器（懒初始化） */
let timeFormatter: Intl.DateTimeFormat;

/**
 * 格式化当前时间
 * 格式: HH:MM:SS
 *
 * @returns 格式化的时间字符串
 */
export function formatTime(): string {
  if (!timeFormatter) {
    timeFormatter = new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
  }
  return timeFormatter.format(new Date());
}

/**
 * 安全地序列化对象为 JSON
 * 如果序列化失败，返回字符串形式
 *
 * @param obj - 要序列化的对象
 * @param indent - 缩进空格数
 * @returns JSON 字符串
 */
export function formatJson(obj: any, indent?: number): string {
  try {
    return JSON.stringify(obj, null, indent);
  } catch (e) {
    return String(obj);
  }
}

/**
 * 检查字符串是否是有效的日志级别
 *
 * @param level - 待检查的字符串
 * @returns 是否是有效的日志级别
 */
export function isValidLogLevel(level: string): level is LogLevel {
  return level in LogLevels;
}

/**
 * 从环境变量获取日志级别
 *
 * 优先级:
 * 1. PONTX_LOG_LEVEL - 显式指定日志级别
 * 2. DEBUG - 包含 'pontx' 时启用 debug
 * 3. PONTX_DEBUG - 设置为 'true' 时启用 debug
 * 4. NODE_ENV - development 启用 debug，test 启用 warn
 * 5. 默认 - info
 *
 * @returns 解析出的日志级别
 */
export function getLogLevelFromEnv(): LogLevel {
  // 1. 显式指定 PONTX_LOG_LEVEL
  const explicitLevel = process.env.PONTX_LOG_LEVEL?.toLowerCase();
  if (explicitLevel && isValidLogLevel(explicitLevel)) {
    return explicitLevel;
  }

  // 2. DEBUG 变量（兼容 MCP 的 debug 机制）
  if (process.env.DEBUG?.includes('pontx')) {
    return 'debug';
  }

  // 3. PONTX_DEBUG 变量
  if (process.env.PONTX_DEBUG === 'true') {
    return 'debug';
  }

  // 4. NODE_ENV
  if (process.env.NODE_ENV === 'development') {
    return 'debug';
  }

  if (process.env.NODE_ENV === 'test') {
    return 'warn';
  }

  // 5. 默认级别
  return 'info';
}

/**
 * 比较两个日志级别
 *
 * @param level1 - 第一个日志级别
 * @param level2 - 第二个日志级别
 * @returns level1 >= level2 返回 true
 */
export function shouldLog(level1: LogLevel, level2: LogLevel): boolean {
  return LogLevels[level1] <= LogLevels[level2];
}

/**
 * 截断长文本
 *
 * @param text - 原始文本
 * @param maxLength - 最大长度
 * @returns 截断后的文本
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * 格式化错误堆栈
 * 移除无关的堆栈信息，保留有用部分
 *
 * @param stack - 错误堆栈字符串
 * @param maxLines - 最大保留行数
 * @returns 格式化后的堆栈
 */
export function formatErrorStack(stack: string | undefined, maxLines: number = 10): string {
  if (!stack) return '';

  const lines = stack.split('\n');

  // 过滤掉 node_modules 的堆栈（可选）
  const filteredLines = lines.filter((line, index) => {
    // 保留第一行（错误消息）
    if (index === 0) return true;
    // 过滤 node_modules（可根据需要调整）
    // return !line.includes('node_modules');
    return true;
  });

  // 限制行数
  const limitedLines = filteredLines.slice(0, maxLines);

  return limitedLines.join('\n');
}

/**
 * 从 Error 对象提取关键信息
 *
 * @param error - Error 对象
 * @returns 提取的错误信息
 */
export function extractErrorInfo(error: Error): {
  message: string;
  stack?: string;
  name?: string;
  code?: string;
  [key: string]: any;
} {
  const info: any = {
    message: error.message,
    name: error.name,
  };

  // 提取 stack
  if (error.stack) {
    info.stack = formatErrorStack(error.stack);
  }

  // 提取自定义属性（如 code、status 等）
  const customProps = ['code', 'status', 'statusCode', 'errno', 'syscall', 'path'];
  for (const prop of customProps) {
    if ((error as any)[prop] !== undefined) {
      info[prop] = (error as any)[prop];
    }
  }

  return info;
}
