/**
 * @author jasonHzq
 * @description 请求器创建模块
 *
 * 本模块负责创建不同类型的 API 请求函数：
 * - createFetchRequester: 创建标准的 Fetch 风格请求器
 * - createBaseRequestInit: 创建基础请求配置
 *
 * 核心功能：
 * - URL 构建和参数处理
 * - 请求头构建
 * - 请求体序列化
 * - 请求前钩子支持
 */

import { PontxSpecMeta } from "../types";
import {
  ApiRequesterConfig,
  BaseRequestFn,
  CreateRequester,
  EnhancedRequestInit,
  PontxRequestFn,
} from "../types/base";
import { buildHeaders } from "./build-headers";
import { buildUrl } from "./build-url";
import { serializeRequestBody, BodySerializers } from "./request-body";

/**
 * 基础请求器配置
 */
export type BaseRequesterConfig = {
  /** Pontx 规范元数据 */
  pontxSpecMeta: PontxSpecMeta;

  /** 自定义的基础请求函数，默认为 fetch */
  baseRequestFn?: BaseRequestFn;

  /**
   * 按 Content-Type 注册的自定义请求体序列化器
   * 会与默认序列化器合并，自定义的优先级更高
   * @example
   * {
   *   'application/json': (body) => JSON.stringify(body, null, 2),
   *   'application/x-custom': (body) => customSerialize(body)
   * }
   */
  bodySerializers?: BodySerializers;
};

/**
 * 创建基础请求配置
 *
 * 根据 API 元数据和用户配置生成标准的 RequestInit 对象。
 * 包含 HTTP 方法、请求头和元数据获取函数。
 *
 * @param requesterConfig - 请求器配置
 * @param requestInit - 用户提供的额外请求配置
 * @returns 合并后的请求配置对象
 *
 * @example
 * ```typescript
 * const baseInit = createBaseRequestInit(
 *   {
 *     apiKey: 'user.getById',
 *     pontxSpecMeta: specMeta,
 *     apiSelector: { specName: 'api', controllerName: 'user', apiName: 'getById' }
 *   },
 *   { headers: { 'Authorization': 'Bearer token' } }
 * );
 * // 返回: { method: 'GET', headers: {...}, getMetadata: () => {...}, ... }
 * ```
 */
export function createBaseRequestInit(
  requesterConfig: ApiRequesterConfig,
  requestInit: EnhancedRequestInit = {}
) {
  const apiMeta = requesterConfig.apiMeta;
  const apiSelector = requesterConfig.apiSelector;
  const headers = buildHeaders(apiMeta, requestInit);

  const retRequestInit = {
    method: apiMeta.method?.toUpperCase?.(),
    headers: headers,
    getMetadata: () => {
      return {
        specName: apiSelector.specName,
        controllerName: apiSelector.controllerName,
        apiName: apiSelector.apiName,
        apiMeta: apiMeta,
      };
    },
    _apiKey: requesterConfig.apiKey,
    ...requestInit,
  };

  return retRequestInit;
}

/**
 * Fetch 请求器特有的配置
 */
export type FetchRequesterConfig = {
  /** API 基础 URL */
  baseUrl?: string;

  /** 自定义 URL 构建函数 */
  getFetchUrl?: (path: string, params: Record<string, unknown>) => string;

  /** 缺失路径参数的占位符，默认为 "a" */
  pathMark?: string;

  /** 请求前的钩子函数，可用于添加认证、日志等 */
  beforeRequest?: (
    url: string,
    init: EnhancedRequestInit
  ) => Promise<{ url: string; init: EnhancedRequestInit }>;
};

/**
 * 创建标准的 Fetch 风格请求器
 *
 * 生成一个符合 Pontx 标准的请求函数，接受 params 和 init 两个参数。
 * 处理完整的请求流程：URL 构建、请求体序列化、钩子执行、网络请求。
 *
 * @param requesterConfig - 请求器配置，包含 API 元数据和请求选项
 * @returns Pontx 标准请求函数
 *
 * @example
 * ```typescript
 * const requester = createFetchRequester({
 *   apiKey: 'user.getById',
 *   pontxSpecMeta: specMeta,
 *   apiSelector: { specName: 'api', controllerName: 'user', apiName: 'getById' },
 *   baseUrl: 'https://api.example.com'
 * });
 *
 * // 调用方式
 * const response = await requester({ id: '123' }, { body: { name: 'John' } });
 * ```
 */
export function createFetchRequester(
  config: BaseRequesterConfig & FetchRequesterConfig
): CreateRequester {
  const { getFetchUrl, pathMark = "a", baseRequestFn = fetch } = config;
  const baseUrl = config?.baseUrl;

  return (requesterConfig: ApiRequesterConfig) => {
    const apiMeta = config.pontxSpecMeta?.apis?.[requesterConfig.apiKey];

    /**
     * 构建完整的请求 URL
     *
     * @param params - URL 参数（路径参数 + 查询参数）
     * @returns 完整的请求 URL
     */
    const getFetchKey = (params) => {
      // 如果提供了自定义 URL 构建函数，优先使用
      if (getFetchUrl) {
        return getFetchUrl(apiMeta.path!, params);
      }

      // 使用内置的 URL 构建函数
      const fetchKey = buildUrl(apiMeta.path!, params, pathMark || "a");
      if (baseUrl) {
        return baseUrl + fetchKey;
      }

      return fetchKey;
    };

    /**
     * 实际的请求执行函数
     *
     * @param params - URL 参数（路径参数 + 查询参数）
     * @param init - 请求配置（包含 body 等）
     * @returns Promise<Response>
     */
    const requester = async (params: any, init?: any) => {
      /* 1. 创建基础请求配置 */
      const requestInit = createBaseRequestInit(requesterConfig);

      /* 2. 序列化请求体 */
      if (apiMeta.hasBody && init?.body) {
        requestInit.body = serializeRequestBody(
          init.body,
          requestInit?.headers?.["Content-Type"] || "application/json",
          config.bodySerializers
        );
      }

      /* 3. 构建完整 URL */
      const url = getFetchKey(params);

      /* 4. 执行 beforeRequest 钩子 */
      if (config?.beforeRequest) {
        const newRequest = await config.beforeRequest(url, requestInit);
        if (newRequest) {
          return config.baseRequestFn(newRequest.url, newRequest.init);
        }
      }

      /* 5. 发起网络请求 */
      return config.baseRequestFn(url, requestInit);
    };

    return requester;
  };
}
