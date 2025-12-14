import { buildUrl } from '../core';
import {
  BaseRequesterConfig,
  createBaseRequestInit,
  FetchRequesterConfig,
} from '../core/create-requester';
import { serializeRequestBody } from '../core/request-body';
import { PontxAPIMeta } from '../types';
import { extractParams } from './extract-params';

/**
 * Graceful API Meta 定义
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
    { readonly source: 'query' | 'body'; readonly field: string }
  >;
};

/**
 * 将 GracefulApiMeta 转换为 PontxAPIMeta
 * buildApiCaller 需要 PontxAPIMeta 格式
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

export function createGracefulRequester(
  requesterConfig: BaseRequesterConfig & FetchRequesterConfig,
): any {
  const {
    getFetchUrl,
    pathMark = 'a',
    baseRequestFn = fetch,
  } = requesterConfig;
  const apiMeta = requesterConfig.pontxSpecMeta?.apis?.[requesterConfig.apiKey];
  const baseUrl = requesterConfig?.baseUrl;

  const getFetchKey = (params: any) => {
    if (getFetchUrl) {
      return getFetchUrl(apiMeta.path!, params);
    }

    const fetchKey = buildUrl(apiMeta.path!, params, pathMark || 'a');
    if (baseUrl) {
      return baseUrl + fetchKey;
    }

    return fetchKey;
  };

  const requester = async (...args: any[]) => {
    /* 1. 提取参数（graceful 格式） */
    const {
      pathParams,
      queryParams,
      bodyParams,
      requestInit: init,
    } = extractParams(args, apiMeta as any);
    const baseRequestInit = createBaseRequestInit(requesterConfig);
    const pontxApiMeta = convertGracefulMetaToAPIMeta(apiMeta as any);
    const requestInit = {
      ...init,
      ...baseRequestInit,
    };

    if (pontxApiMeta.hasBody && bodyParams) {
      requestInit.body = serializeRequestBody(
        init.body,
        requestInit?.headers?.['Content-Type'] || 'application/json',
      );
    }

    const url = getFetchKey({
      ...pathParams,
      ...queryParams,
    });

    if (requesterConfig?.beforeRequest) {
      const newRequest = await requesterConfig.beforeRequest(url, requestInit);
      if (newRequest) {
        return requesterConfig.baseRequestFn(newRequest.url, newRequest.init);
      }
    }

    return requesterConfig.baseRequestFn(url, requestInit);
  };

  return requester;
}
