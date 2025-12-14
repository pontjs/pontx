import { PontxSpecMeta } from '../types';
import {
  BaseRequestFn,
  EnhancedRequestInit,
  PontxRequestFn,
} from '../types/base';
import { buildHeaders } from './build-headers';
import { buildUrl } from './build-url';
import { serializeRequestBody } from './request-body';

export type BaseRequesterConfig = {
  apiSelector: {
    specName: string;
    controllerName: string;
    apiName: string;
  };
  pontxSpecMeta: PontxSpecMeta;
  apiKey: string;

  // 自定义配置项
  baseRequestFn: BaseRequestFn;
};

export function createBaseRequestInit(
  requesterConfig: BaseRequesterConfig,
  requestInit: EnhancedRequestInit = {},
) {
  const apiMeta = requesterConfig.pontxSpecMeta?.apis?.[requesterConfig.apiKey];
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

export type FetchRequesterConfig = {
  baseUrl?: string;

  /**
   * Custom URL builder function
   */
  getFetchUrl?: (path: string, params: Record<string, unknown>) => string;

  /**
   * Placeholder for missing path parameters
   */
  pathMark?: string;

  beforeRequest?: (
    url: string,
    init: EnhancedRequestInit,
  ) => Promise<{ url: string; init: EnhancedRequestInit }>;
};

export function createFetchRequester(
  requesterConfig: BaseRequesterConfig & FetchRequesterConfig,
): PontxRequestFn {
  const {
    getFetchUrl,
    pathMark = 'a',
    baseRequestFn = fetch,
  } = requesterConfig;
  const apiMeta = requesterConfig.pontxSpecMeta?.apis?.[requesterConfig.apiKey];
  const baseUrl = requesterConfig?.baseUrl;

  const getFetchKey = (params) => {
    if (getFetchUrl) {
      return getFetchUrl(apiMeta.path!, params);
    }

    const fetchKey = buildUrl(apiMeta.path!, params, pathMark || 'a');
    if (baseUrl) {
      return baseUrl + fetchKey;
    }

    return fetchKey;
  };

  const requester = async (params: any, init?: any) => {
    const requestInit = createBaseRequestInit(requesterConfig);
    if (apiMeta.hasBody && init?.body) {
      requestInit.body = serializeRequestBody(
        init.body,
        requestInit?.headers?.['Content-Type'] || 'application/json',
      );
    }

    const url = getFetchKey(params);

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

export type CreateRpcRequester = {
  (requesterConfig: {
    apiSelector: {
      specName: string;
      controllerName: string;
      apiName: string;
    };
    pontxSpec: PontxSpecMeta;
    apiKey: string;

    // 自定义配置项
    baseRequestFn: BaseRequestFn;

    baseUrl?: string;

    /**
     * Custom URL builder function
     */
    getFetchUrl?: (apiKey: string, params: Record<string, unknown>) => string;

    beforeRequest?: (
      url: string,
      init: EnhancedRequestInit,
    ) => Promise<{ url: string; init: EnhancedRequestInit }>;
  }): Promise<any>;
};
