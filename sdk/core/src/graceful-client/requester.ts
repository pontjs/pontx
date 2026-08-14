/**
 * @author jasonHzq
 * @description Graceful Client Requester 模块
 *
 * 提供优雅的 API 请求函数创建功能，支持灵活的参数传递方式。
 * Graceful 模式允许将参数分离传递，提高代码可读性和类型安全性。
 */

import { buildUrl } from "../core";
import {
  BaseRequesterConfig,
  createBaseRequestInit,
  FetchRequesterConfig,
} from "../core/create-requester";
import { serializeRequestBody } from "../core/request-body";
import { PontxAPIMeta } from "../types";
import { ApiRequesterConfig } from "../types/base";
import { extractParams } from "./extract-params";

/**
 * Graceful API 元数据定义
 *
 * 相比标准的 PontxAPIMeta，GracefulApiMeta 提供了更详细的参数信息，
 * 支持参数自动分离和智能合并。
 */
export type GracefulApiMeta = {
  readonly method: string;
  readonly path: string;
  readonly pathParams: readonly string[] | null;
  readonly queryParams: readonly string[] | null;
  readonly bodyParams: {
    readonly contentType: string;
    readonly canMerge: boolean;
    readonly fields?: readonly string[];
  } | null;
  readonly paramMapping?: Record<
    string,
    { readonly source: "query" | "body"; readonly field: string }
  >;
};

/**
 * 将 GracefulApiMeta 转换为 PontxAPIMeta
 *
 * 用于兼容性转换，因为某些内部函数需要标准的 PontxAPIMeta 格式。
 *
 * @param meta - Graceful 风格的 API 元数据
 * @returns 标准的 PontxAPIMeta 格式
 *
 * @example
 * ```typescript
 * const gracefulMeta: GracefulApiMeta = {
 *   method: 'POST',
 *   path: '/users/:id',
 *   pathParams: ['id'],
 *   queryParams: ['page', 'size'],
 *   bodyParams: {
 *     contentType: 'application/json',
 *     canMerge: true,
 *     fields: ['name', 'email']
 *   }
 * };
 * const apiMeta = convertGracefulMetaToAPIMeta(gracefulMeta);
 * // 返回: { method: 'POST', path: '/users/:id', hasBody: true, hasParams: true, consumes: ['application/json'] }
 * ```
 */
function convertGracefulMetaToAPIMeta(meta: GracefulApiMeta): PontxAPIMeta {
  return {
    method: meta.method,
    path: meta.path,
    hasBody: meta.bodyParams !== null,
    hasParams:
      (meta.pathParams?.length || 0) > 0 || (meta.queryParams?.length || 0) > 0,
    consumes: meta.bodyParams ? [meta.bodyParams.contentType] : undefined,
  };
}

/**
 * 创建 Graceful 风格的 API 请求函数
 *
 * 此函数生成一个支持灵活参数传递的请求函数，允许将路径参数、查询参数和请求体参数分离传递。
 * 相比标准的请求函数，Graceful 模式提供更好的类型推断和代码可读性。
 *
 * @param requesterConfig - 请求器配置，包含 API 元数据和请求选项
 * @param requesterConfig.getFetchUrl - 可选的自定义 URL 构建函数
 * @param requesterConfig.pathMark - URL 路径参数标记，默认为 "a"
 * @param requesterConfig.baseRequestFn - 基础请求函数，默认为 fetch
 * @param requesterConfig.pontxSpecMeta - Pontx 规范元数据
 * @param requesterConfig.apiKey - 要调用的 API 的 key
 * @param requesterConfig.baseUrl - API 基础 URL
 * @param requesterConfig.beforeRequest - 请求前的钩子函数
 * @param requesterConfig.bodySerializers - 自定义请求体序列化器
 * @returns 返回一个可接受灵活参数的请求函数
 *
 * @example
 * ```typescript
 * const requester = createGracefulRequester({
 *   apiKey: 'user.getById',
 *   pontxSpecMeta: specMeta,
 *   baseUrl: 'https://api.example.com',
 * });
 *
 * // 使用方式 1: 分离传递参数
 * await requester({ id: '123' }, { page: 1 }, { name: 'John' });
 * // pathParams: { id: '123' }, queryParams: { page: 1 }, bodyParams: { name: 'John' }
 *
 * // 使用方式 2: 合并传递参数
 * await requester({ id: '123', page: 1, name: 'John' });
 * // 自动根据 API 元数据分离参数
 * ```
 */
export function createGracefulRequester(
  config: BaseRequesterConfig & FetchRequesterConfig
): any {
  const { getFetchUrl, pathMark = "a", baseRequestFn = fetch } = config;
  const baseUrl = config?.baseUrl;

  return (requesterConfig: ApiRequesterConfig) => {
    const apiMeta = config.pontxSpecMeta?.apis?.[requesterConfig.apiKey];

    /**
     * 构建完整的请求 URL
     *
     * @param params - URL 参数（包含路径参数和查询参数）
     * @returns 完整的请求 URL
     */
    const getFetchKey = (params: any) => {
      if (getFetchUrl) {
        return getFetchUrl(apiMeta.path!, params);
      }

      const fetchKey = buildUrl(apiMeta.path!, params, pathMark || "a");
      if (baseUrl) {
        return baseUrl + fetchKey;
      }

      return fetchKey;
    };

    /**
     * 实际的请求执行函数
     *
     * 处理流程：
     * 1. 从灵活的参数列表中提取 pathParams、queryParams、bodyParams 和 requestInit
     * 2. 合并基础请求配置和用户提供的配置
     * 3. 序列化请求体（如果有）
     * 4. 构建完整的请求 URL
     * 5. 执行 beforeRequest 钩子（如果配置）
     * 6. 发起实际的网络请求
     *
     * @param args - 可变参数列表，支持多种传参方式
     * @returns Promise<Response> - 返回 fetch Response 对象
     */
    const requester = async (...args: any[]) => {
      /* 1. 提取参数（graceful 格式） */
      const {
        pathParams,
        queryParams,
        bodyParams,
        requestInit: init,
      } = extractParams(args, apiMeta as any);

      /* 2. 合并请求配置 */
      const baseRequestInit = createBaseRequestInit(requesterConfig);
      const pontxApiMeta = convertGracefulMetaToAPIMeta(apiMeta as any);
      const requestInit = {
        ...baseRequestInit,
        ...init,
        headers: {
          ...(baseRequestInit?.headers || {}),
          ...(init?.headers || {}),
        },
      };

      /* 3. 序列化请求体 */
      if (pontxApiMeta.hasBody && bodyParams) {
        const contentType = Object.entries(requestInit.headers || {}).reduce(
          (selected, [name, value]) =>
            name.toLowerCase() === "content-type" ? String(value) : selected,
          "application/json"
        );
        requestInit.body = serializeRequestBody(
          bodyParams,
          contentType,
          config.bodySerializers
        );

        if (requestInit.body instanceof FormData) {
          for (const headerName of Object.keys(requestInit.headers || {})) {
            if (headerName.toLowerCase() === "content-type") {
              delete requestInit.headers[headerName];
            }
          }
        }
      }

      /* 4. 构建完整 URL */
      const url = getFetchKey({
        ...pathParams,
        ...queryParams,
      });

      /* 5. 执行 beforeRequest 钩子 */
      if (config?.beforeRequest) {
        const newRequest = await config.beforeRequest(url, requestInit);
        if (newRequest) {
          return baseRequestFn(newRequest.url, newRequest.init);
        }
      }

      /* 6. 发起网络请求 */
      return baseRequestFn(url, requestInit);
    };

    return requester;
  };
}
