/**
 * 客户端代理系统
 *
 * 本模块实现了基于 Proxy 的客户端，根据 PontxSpecMeta 元数据动态生成 API 方法对象
 *
 * 功能：
 * - 两层 Proxy (client.controller.method)
 * - 动态方法生成 (request, getFetchKey, queryOptions)
 * - 自动设置请求头 (Content-Type, Accept)
 * - 请求体序列化
 * - 支持自定义使用方法
 */

import type { PontxSpecMeta, PontxAPI, RequestFn, RequestOptions } from '../types';
import { buildUrl } from './build-url';
import { serializeRequestBody } from './request-body';

/**
 * 构建代理客户端的配置选项
 */
export interface ProxyClientOptions {
  /**
   * 自定义 URL 构建函数
   */
  getFetchUrl?: (path: string, params: Record<string, unknown>) => string;

  /**
   * 缺失路径参数的占位符
   */
  pathMark?: string;

  /**
   * 为每个 API 方法对象添加自定义方法的函数
   */
  makeCustomUsages?: (
    usages: Record<string, any>,
    apiMeta?: PontxAPI
  ) => Record<string, any>;
}

/**
 * 解析 API key 提取控制器和方法名
 * @param apiKey - API key 格式为 "controller/method" 或 "namespace/controller/method"
 * @returns [controllerPath, methodName]
 */
function parseApiKey(apiKey: string): [string[], string] {
  const parts = apiKey.split('/');
  const methodName = parts[parts.length - 1];
  const controllerPath = parts.slice(0, -1);
  return [controllerPath, methodName];
}

/**
 * 从 API 元数据和用户选项构建请求头
 */
function buildHeaders(
  apiMeta: PontxAPI,
  options?: RequestOptions
): Record<string, string> {
  const headers: Record<string, string> = {};

  // 从 consumes 数组设置 Content-Type（第一个元素）
  if (apiMeta.consumes && apiMeta.consumes.length > 0) {
    headers['Content-Type'] = apiMeta.consumes[0];
  }

  // 从 produces 数组设置 Accept（第一个元素）
  if (apiMeta.produces && apiMeta.produces.length > 0) {
    headers['Accept'] = apiMeta.produces[0];
  }

  // 合并用户提供的请求头（用户请求头覆盖默认值）
  if (options?.headers) {
    Object.assign(headers, options.headers);
  }

  return headers;
}

/**
 * 生成用于缓存的 fetch key
 * @param apiKey - API key (controller/method)
 * @param params - 请求参数
 * @returns 唯一的缓存键
 */
function generateFetchKey(
  apiKey: string,
  params: Record<string, unknown>
): string {
  // 按字母顺序排序参数以确保一致性
  const sortedKeys = Object.keys(params).sort();
  const queryParts = sortedKeys.map(key => `${key}=${params[key]}`);

  if (queryParts.length === 0) {
    return apiKey;
  }

  return `${apiKey}?${queryParts.join('&')}`;
}

/**
 * 创建包含 request、getFetchKey 和 queryOptions 的 API 方法对象
 */
function createApiMethod(
  apiKey: string,
  apiMeta: PontxAPI,
  requestFn: RequestFn,
  options?: ProxyClientOptions
): any {
  const { getFetchUrl, pathMark, makeCustomUsages } = options || {};

  // 基础使用方法对象
  const usages = {
    /**
     * 执行 API 请求
     */
    request: async (params: Record<string, unknown> = {}, requestOptions?: RequestOptions) => {
      // 构建 URL
      let url: string;
      if (getFetchUrl) {
        url = getFetchUrl(apiMeta.path, params);
      } else {
        url = buildUrl(apiMeta.path, params, { pathMark });
      }

      // 构建请求头
      const headers = buildHeaders(apiMeta, requestOptions);

      // 准备请求初始化对象
      const init: RequestInit & { _apiKey?: string } = {
        method: apiMeta.method,
        headers,
        _apiKey: apiKey, // 为功能模块添加 API key (mock, validation 等)
      };

      // 如果存在请求体则序列化
      if (requestOptions?.body) {
        const contentType = headers['Content-Type'] || 'application/json';
        init.body = serializeRequestBody(requestOptions.body, contentType);
      }

      // 执行请求
      const response = await requestFn(url, init);

      // 解析 JSON 响应
      const data = await response.json();
      return data;
    },

    /**
     * 获取用于缓存的 fetch key
     */
    getFetchKey: (params: Record<string, unknown> = {}) => {
      return generateFetchKey(apiKey, params);
    },

    /**
     * 获取数据获取库（React Query、SWR 等）的查询选项
     */
    queryOptions: (params: Record<string, unknown> = {}, requestOptions?: RequestOptions) => {
      const fetchKey = generateFetchKey(apiKey, params);

      return {
        queryKey: [fetchKey],
        queryFn: () => usages.request(params, requestOptions),
      };
    },
  };

  // 如果提供了自定义使用方法则添加
  if (makeCustomUsages) {
    return makeCustomUsages(usages, apiMeta);
  }

  return usages;
}

/**
 * 从 API 元数据构建代理客户端
 *
 * 创建支持 client.controller.method 访问模式的两层 Proxy
 *
 * @param requestFn - 执行 API 调用的请求函数
 * @param pontxSpecMeta - API 元数据
 * @param options - 代理客户端选项
 * @returns 具有动态 API 方法的代理客户端
 *
 * @example
 * ```typescript
 * const client = buildProxyClient(fetch, pontxSpecMeta);
 *
 * // 访问 API 方法
 * const user = await client.users.getUser.request({ userId: '123' });
 *
 * // 获取缓存键
 * const key = client.users.getUser.getFetchKey({ userId: '123' });
 *
 * // 获取 React Query 的查询选项
 * const options = client.users.getUser.queryOptions({ userId: '123' });
 * ```
 */
export function buildProxyClient(
  requestFn: RequestFn,
  pontxSpecMeta: PontxSpecMeta,
  options?: ProxyClientOptions
): any {
  // 从 API keys 构建控制器映射
  const controllerMap = new Map<string, Map<string, any>>();

  for (const [apiKey, apiMeta] of Object.entries(pontxSpecMeta.apis)) {
    const [controllerPath, methodName] = parseApiKey(apiKey);

    // 构建嵌套控制器结构
    let currentMap = controllerMap;
    for (const controllerName of controllerPath) {
      if (!currentMap.has(controllerName)) {
        currentMap.set(controllerName, new Map());
      }
      currentMap = currentMap.get(controllerName)!;
    }

    // 将方法添加到最终的控制器
    currentMap.set(
      methodName,
      createApiMethod(apiKey, apiMeta, requestFn, options)
    );
  }

  // 将 Map 结构转换为嵌套的 Proxy 对象
  function buildProxyFromMap(map: Map<string, any>): any {
    const target: any = {};

    for (const [key, value] of map.entries()) {
      if (value instanceof Map) {
        // 嵌套控制器 - 创建嵌套 Proxy
        target[key] = buildProxyFromMap(value);
      } else {
        // API 方法对象
        target[key] = value;
      }
    }

    return new Proxy(target, {
      get(target, prop: string) {
        if (prop in target) {
          return target[prop];
        }

        // 对不存在的 API 抛出错误
        throw new Error(`API "${prop}" not found in client`);
      },
    });
  }

  return buildProxyFromMap(controllerMap);
}
