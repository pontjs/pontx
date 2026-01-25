/**
 * @author jasonHzq
 * @description Mock 模块 - 静态 Mock 数据用于测试
 *
 * 本模块提供 Mock 功能，在不发起真实 API 请求的情况下进行测试。
 * 它拦截请求并返回预配置的静态数据。
 *
 * 功能特性：
 * - 通过 API key 配置静态 Mock 数据
 * - 可配置响应延迟
 * - 可开启/关闭 Mock 功能
 * - 在响应头中添加 x-mock 标识
 * - 返回标准 Response 对象格式
 */

import type { FetchFunction } from "../types";
import { BaseRequestFn, EnhancedRequestInit } from "../types/base";

/**
 * Mock 功能配置
 */
export interface MockConfig {
  /**
   * 是否启用 Mock 功能
   * @default true
   */
  enabled?: boolean;

  /**
   * Mock 数据，按 API key 索引 (例如: 'user/getUser')
   * 每个 key 代表一个 API 端点及其对应的 Mock 响应
   */
  data: Record<string, any>;

  /**
   * 返回 Mock 数据前的延迟时间（毫秒）
   * 用于模拟网络延迟
   * @default 0
   */
  delay?: number;
}

/**
 * Mock 相关错误代码
 */
export const MOCK_ERROR_CODES = {
  MOCK_NOT_FOUND: "MOCK_NOT_FOUND",
} as const;

/**
 * 创建延迟 Promise
 * @param ms - 延迟的毫秒数
 * @returns 在指定时间后 resolve 的 Promise
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 从数据创建 Mock Response 对象
 * @param data - 要返回的 Mock 数据
 * @returns 带有 x-mock 标识的标准 Response 对象
 */
function createMockResponse(data: unknown): Response {
  // 将数据序列化为 JSON 字符串
  const body = JSON.stringify(data);

  // 创建带有标准 headers 的 Response
  return new Response(body, {
    status: 200,
    statusText: "OK",
    headers: {
      "content-type": "application/json",
      "x-mock": "true", // 标记这是一个 Mock 响应
    },
  });
}

/**
 * 为请求函数添加 Mock 功能的包装函数
 *
 * 这个装饰器在配置后会拦截 API 请求并返回静态 Mock 数据，
 * 而不会执行实际的网络请求。
 *
 * @param requestFn - 要包装的原始请求函数
 * @param config - Mock 配置
 * @returns 带有 Mock 功能的包装后的请求函数
 *
 * @example
 * ```ts
 * const mockFetch = withMock(fetch, {
 *   enabled: true,
 *   data: {
 *     'user/getUser': { id: '123', name: 'Mock User' },
 *     'user/list': [{ id: '1' }, { id: '2' }],
 *   },
 *   delay: 500, // 可选：模拟 500ms 网络延迟
 * });
 * ```
 */
export function withMock(requestFn: BaseRequestFn, config?: MockConfig) {
  // 如果未配置 Mock 或明确禁用，返回原始函数
  if (!config || config.enabled === false) {
    return requestFn;
  }

  // 提取配置值并设置默认值
  const { data, delay: delayMs = 0 } = config;

  // 返回包装后的函数
  return async (url: string, init?: EnhancedRequestInit) => {
    // 从 init._apiKey 提取 API key
    const apiKey = (init as any)?._apiKey;

    // 如果未提供 API key，抛出错误
    if (!apiKey) {
      const error = new Error(
        "Mock 需要在 RequestInit 中提供 _apiKey 来识别 API。"
      );
      error.name = MOCK_ERROR_CODES.MOCK_NOT_FOUND;
      (error as any).code = MOCK_ERROR_CODES.MOCK_NOT_FOUND;
      throw error;
    }

    // 检查该 API 是否存在 Mock 数据
    const hasMockData = apiKey in data;

    if (!hasMockData) {
      const error = new Error(
        `未找到 API "${apiKey}" 的 Mock 数据。` +
          `请为该 API 配置 Mock 数据。`
      );
      error.name = MOCK_ERROR_CODES.MOCK_NOT_FOUND;
      (error as any).code = MOCK_ERROR_CODES.MOCK_NOT_FOUND;
      (error as any).apiKey = apiKey;
      throw error;
    }

    // 获取该 API 的 Mock 数据
    const mockData = data[apiKey];

    // 如果配置了延迟，应用延迟
    if (delayMs > 0) {
      await delay(delayMs);
    }

    // 返回 Mock 响应
    return createMockResponse(mockData);
  };
}

/**
 * 类型守卫函数，检查响应是否为 Mock 响应
 *
 * @param response - 要检查的 Response 对象
 * @returns 如果响应的 x-mock header 设置为 'true' 则返回 true
 *
 * @example
 * ```ts
 * const response = await fetch('/api/users');
 * if (isMockResponse(response)) {
 *   console.log('这是一个 Mock 响应');
 * }
 * ```
 */
export function isMockResponse(response: Response): boolean {
  return response.headers.get("x-mock") === "true";
}
