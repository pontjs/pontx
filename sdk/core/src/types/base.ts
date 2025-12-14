/**
 * Pontx SDK Core 基础类型
 *
 * 本文件定义了 SDK 中使用的核心类型
 * 这些类型独立于配置,代表 API 客户端的基础构建块
 */

export type PontxSpecMeta = {
  name: string;
  hasTags: boolean;
  apis: Record<string, PontxAPIMeta>;
  baseUrl?: string;
};

export type PontxAPIMeta = {
  path: string;
  method:
    | 'GET'
    | 'POST'
    | 'PUT'
    | 'DELETE'
    | 'PATCH'
    | 'HEAD'
    | 'OPTIONS'
    | string;
  hasBody: boolean;
  hasParams: boolean;
  consumes?: string[];
  produces?: string[];
};

/**
 * HTTP 请求头作为键值对记录
 */
export type RequestHeaders = Record<string, string>;

/**
 * 请求序列化支持的 Content-Type 值
 */
export type ContentType =
  | 'application/json'
  | 'application/x-www-form-urlencoded'
  | 'multipart/form-data'
  | 'text/plain'
  | string;

type RequestInit = {
  method?: string;
  keepalive?: boolean;
  headers?: any;
  body?: any;
  integrity?: string;
  signal?: AbortSignal | null;
  credentials?: any;
  mode?: any;
  referrer?: string;
};

export type FetchInit = RequestInit & {
  getMetadata: () => {
    specName: string;
    controllerName: string;
    apiName: string;
    apiMeta: PontxAPIMeta;
  };
  _apiKey: string;
};

export type EnhancedRequestInit = RequestInit & {
  beforeRequest?: any;
};

export type PontxAPITypes = {
  params: any;
  bodyParams: any;
  Response: any;
  method: string;
};

export type BaseRequestFn = (
  url: string,
  init: EnhancedRequestInit,
) => Promise<any>;
export type PontxRequestFn = <APITypes extends PontxAPITypes>(
  params: APITypes['params'],
  init: EnhancedRequestInit & { body?: APITypes['bodyParams'] },
) => Promise<APITypes['Response']>;
export type GracefulRequestFn = any;
export type RpcRequestFn = <RequestParams, RpcResponse>(
  requestParams: RequestParams,
  init: EnhancedRequestInit,
) => Promise<RpcResponse>;

/**
 * 标准 fetch 函数签名
 * 兼容原生 fetch 和自定义实现
 */
export type FetchFunction = (
  url: string,
  init?: FetchInit,
) => Promise<Response>;

export type ApiCallerContext = {
  apiSelector: {
    specName: string;
    controllerName: string;
    apiName: string;
  };

  apiMeta: PontxAPIMeta;

  requestFn: FetchFunction;

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
    init: FetchInit,
  ) => Promise<{ url: string; init: FetchInit }>;

  /**
   * Function to add custom methods to each API method object
   */
  makeCustomUsages?: (
    usages: Record<string, any>,
    apiMeta?: PontxAPIMeta,
  ) => Record<string, any>;
};
