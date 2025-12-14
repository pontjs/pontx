import { ApiCallerContext, FetchInit } from '../types/base';
import { buildHeaders } from './build-headers';
import { buildUrl } from './build-url';
import { serializeRequestBody } from './request-body';

/**
 * Create API method object with request, getFetchKey, and queryOptions
 */
export function buildApiCaller(context: ApiCallerContext) {
  const {
    apiSelector,
    apiMeta,
    requestFn,
    getFetchUrl,
    pathMark,
    makeCustomUsages,
  } = context;

  let apiKey = apiSelector?.controllerName
    ? `${apiSelector.controllerName}/${apiSelector.apiName}`
    : apiSelector.apiName;

  if (apiSelector.specName) {
    apiKey = `${apiSelector.specName}/${apiKey}`;
  }

  const getFetchKey = (params) => {
    if (getFetchUrl) {
      return getFetchUrl(apiMeta.path!, params);
    }

    return buildUrl(apiMeta.path!, params, pathMark || 'a');
  };

  const request = async (
    params: Record<string, unknown>,
    requestOptions = {} as RequestInit,
  ) => {
    const headers = buildHeaders(apiMeta, requestOptions);

    const requestInit: FetchInit = {
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
      _apiKey: apiKey,
      ...requestOptions,
    };

    const methodSupportsBody = ['POST', 'PUT', 'PATCH'].includes(
      requestInit.method,
    );
    if (requestOptions?.body && (apiMeta.hasBody || methodSupportsBody)) {
      requestInit.body = serializeRequestBody(
        requestOptions.body,
        headers['Content-Type'] || 'application/json',
      );
    }

    const url = getFetchKey(params);

    return requestFn(url, requestInit);
  };

  const queryOptions = (
    params: Record<string, unknown>,
    requestOptions?: RequestInit,
  ) => {
    const fetchKey = getFetchKey(params);

    return {
      fetchFn: () => {
        // use query 使用，只有 GET 方法，因此不需要传入 requestInit
        return request(params, requestOptions);
      },
      fetchKey,
      queryKey: [fetchKey],
    };
  };

  const usages = {
    request,
    getFetchKey,
    queryOptions,
  };

  if (makeCustomUsages) {
    const customUsages = makeCustomUsages(usages, apiMeta) || {};

    return {
      ...usages,
      ...customUsages,
    };
  }

  return usages;
}
