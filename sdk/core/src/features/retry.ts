/**
 * @author jasonHzq
 * @description Retry 模块 - 自动重试，支持指数/线性退避
 *
 * 本模块为失败的请求提供重试功能，支持可配置的
 * 退避策略和重试条件。
 *
 * 功能特性：
 * - 可配置最大重试次数
 * - 支持指数和线性退避策略
 * - 智能重试逻辑 (仅重试 5xx 和网络错误)
 * - 可自定义可重试错误配置
 * - 重试耗尽时提供详细错误信息
 */

import type { FetchFunction } from "../types";
import { FetchInit } from "../types/base";

/**
 * Retry 功能配置
 */
export interface RetryConfig {
  /**
   * 最大重试次数
   * @default 3
   */
  maxAttempts?: number;

  /**
   * 重试延迟的退避策略
   * - 'exponential': 1s, 2s, 4s, 8s, ...
   * - 'linear': 1s, 2s, 3s, 4s, ...
   * @default 'exponential'
   */
  backoff?: "exponential" | "linear";

  /**
   * 自定义可重试的错误代码或 HTTP 状态码
   * 如果提供，仅重试这些错误
   * 如果未提供，默认重试 5xx 和网络错误
   */
  retryableErrors?: Array<string | number>;
}

/**
 * Retry 相关错误代码
 */
export const RETRY_ERROR_CODES = {
  RETRY_EXHAUSTED: "RETRY_EXHAUSTED",
} as const;

/**
 * 默认重试配置
 */
const DEFAULT_CONFIG: Required<Omit<RetryConfig, "retryableErrors">> = {
  maxAttempts: 3,
  backoff: "exponential",
};

/**
 * 默认可重试的网络错误代码
 */
const DEFAULT_NETWORK_ERRORS = [
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "ENETUNREACH",
];

/**
 * 最大延迟上限（毫秒）- 10 秒
 */
const MAX_DELAY_MS = 10000;

/**
 * 基础延迟（毫秒）- 1 秒
 */
const BASE_DELAY_MS = 1000;

/**
 * 使用指定的退避策略计算重试延迟时间
 *
 * @param attempt - 当前尝试次数 (从 1 开始)
 * @param strategy - 退避策略 ('exponential' 或 'linear')
 * @returns 延迟的毫秒数
 */
function calculateDelay(
  attempt: number,
  strategy: "exponential" | "linear"
): number {
  let delay: number;

  if (strategy === "exponential") {
    // 指数退避: 1s, 2s, 4s, 8s, 16s...
    // 公式: BASE_DELAY * 2^(attempt - 1)
    delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
  } else {
    // 线性退避: 1s, 2s, 3s, 4s, 5s...
    // 公式: BASE_DELAY * attempt
    delay = BASE_DELAY_MS * attempt;
  }

  // 限制最大延迟
  return Math.min(delay, MAX_DELAY_MS);
}

/**
 * 创建延迟 Promise
 *
 * @param ms - 延迟的毫秒数
 * @returns 在指定时间后 resolve 的 Promise
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 检查错误是否可重试
 *
 * 默认可重试条件：
 * - 5xx 状态码 (服务器错误)
 * - 网络错误 (ECONNREFUSED, ETIMEDOUT 等)
 * - 没有状态码的错误 (视为网络错误)
 *
 * 不可重试条件：
 * - 4xx 状态码 (客户端错误 - 错误请求、认证等)
 *
 * @param error - 要检查的错误
 * @param customRetryableErrors - 自定义可重试的错误代码/状态码
 * @returns 如果错误可重试则返回 true
 */
function isRetryableError(
  error: any,
  customRetryableErrors?: Array<string | number>
): boolean {
  // 如果指定了自定义可重试错误，优先检查它们
  if (customRetryableErrors && customRetryableErrors.length > 0) {
    // 检查错误代码是否匹配
    if (error.code && customRetryableErrors.includes(error.code)) {
      return true;
    }
    // 检查状态码是否匹配
    if (error.status && customRetryableErrors.includes(error.status)) {
      return true;
    }
    // 如果存在自定义列表但不匹配，则不可重试
    return false;
  }

  // 检查 HTTP 状态码
  if (error.status !== undefined) {
    // 5xx 错误可重试 (服务器错误)
    if (error.status >= 500 && error.status < 600) {
      return true;
    }
    // 4xx 错误不可重试 (客户端错误)
    if (error.status >= 400 && error.status < 500) {
      return false;
    }
  }

  // 检查网络错误代码
  if (error.code && DEFAULT_NETWORK_ERRORS.includes(error.code)) {
    return true;
  }

  // 如果没有状态码，视为网络错误 (可重试)
  // 这会处理通用的网络失败
  return true;
}

/**
 * 为请求函数添加重试功能的包装函数
 *
 * 这个装饰器会根据配置的策略和重试条件
 * 自动重试失败的请求。
 *
 * @param requestFn - 要包装的原始请求函数
 * @param config - 重试配置
 * @returns 带有重试功能的包装后的请求函数
 *
 * @example
 * ```ts
 * const retryFetch = withRetry(fetch, {
 *   maxAttempts: 3,
 *   backoff: 'exponential',
 * });
 * ```
 */
export function withRetry(
  requestFn: FetchFunction,
  config?: RetryConfig
): FetchFunction {
  // 如果未提供配置，返回原始函数
  if (!config) {
    return requestFn;
  }

  // 与默认值合并
  const {
    maxAttempts = DEFAULT_CONFIG.maxAttempts,
    backoff = DEFAULT_CONFIG.backoff,
    retryableErrors,
  } = config;

  // 返回保持相同签名的包装函数
  return async (url: string, init?: FetchInit): Promise<Response> => {
    let lastError: Error | undefined;
    let attempt = 0;

    // 重试循环
    while (attempt < maxAttempts) {
      attempt++;

      try {
        // 尝试请求
        const response = await requestFn(url, init);
        return response; // 成功 - 立即返回
      } catch (error: any) {
        lastError = error;

        // 检查是否为最后一次尝试
        const isLastAttempt = attempt >= maxAttempts;

        // 检查错误是否可重试
        const shouldRetry = isRetryableError(error, retryableErrors);

        // 如果不可重试或已是最后一次尝试，立即抛出
        if (!shouldRetry || isLastAttempt) {
          // 如果是最后一次尝试，包装为 RETRY_EXHAUSTED 错误
          if (isLastAttempt && shouldRetry) {
            const exhaustedError = new Error(
              `请求在 ${maxAttempts} 次尝试后失败。最后的错误: ${error.message}`
            );
            exhaustedError.name = RETRY_ERROR_CODES.RETRY_EXHAUSTED;
            (exhaustedError as any).code = RETRY_ERROR_CODES.RETRY_EXHAUSTED;
            (exhaustedError as any).attempts = maxAttempts;
            (exhaustedError as any).lastError = error;
            throw exhaustedError;
          }

          // 不可重试的错误 - 立即抛出
          throw error;
        }

        // 计算下次重试的延迟
        const delayMs = calculateDelay(attempt, backoff);

        // 等待后再重试
        await delay(delayMs);

        // 继续下一次迭代 (重试)
      }
    }

    // 由于上面的循环逻辑，这里永远不应该到达
    // 但 TypeScript 需要它来保证穷尽性
    throw lastError || new Error("重试已耗尽");
  };
}
