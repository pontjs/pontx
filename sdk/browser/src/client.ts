import { PontxSpecMeta } from "./type";

type ContentType =
  | "text/html"
  | "text/plain"
  | "multipart/form-data"
  | "application/json"
  | "application/x-www-form-urlencoded"
  | "application/octet-stream"
  | string;

/** 请求头类型 */
export interface RequestHeaders {
  /** 认证信息 */
  Authorization?: string;
  /** 内容类型 */
  "Content-Type"?: ContentType;
  /** 接受的内容类型 */
  Accept?: string;
  /** 用户代理 */
  "User-Agent"?: string;
  /** 自定义请求头 */
  [key: string]: string | undefined;
}

/** API 方法类型 */
export type APIMethod = {
  /** query/path 请求参数 */
  params: Record<string, any>;
  /** 请求体参数 */
  bodyParams?: any;
  /** 响应类型 */
  Response: any;
  /** HTTP 方法 */
  method: string;
  /** API 路径 */
  path?: string;
  /** 请求的 Content-Type */
  consume?: RequestHeaders["Content-Type"];
  /** 响应的 Content-Type */
  produce?: RequestHeaders["Accept"];
  /** 是否已废弃 */
  deprecated?: boolean;
};

type RequestOptions<BodyParams> = BodyParams extends undefined
  ? Omit<RequestInit, "body" | "method">
  : Omit<RequestInit, "body" | "method"> & { body: BodyParams };

type RequestFn<Params, BodyParams, Response> = (
  params: Params,
  requestOptions?: RequestOptions<BodyParams>
) => Promise<Response>;

export type Controller<T extends Record<string, APIMethod>> = {
  [K in keyof T]: {
    getFetchKey: (params: T[K]["params"]) => string;
    request: RequestFn<T[K]["params"], T[K]["bodyParams"], T[K]["Response"]>;
    queryOptions: (
      params: T[K]["params"],
      requestConfig?: RequestOptions<T[K]["bodyParams"]>
    ) => {
      fetchKey: string;
      fetchFn: () => Promise<T[K]["Response"]>;
    };
  };
};

/** 客户端类型 */
export type Client<T extends Record<string, Record<string, APIMethod>>> = {
  [K in keyof T]: Controller<T[K]>;
};

export function buildUrl(
  pathname: string,
  params: Record<string, any>,
  pathMark = ""
) {
  // 创建 params 的副本，避免修改原对象
  const paramsCopy = { ...params };

  // 替换路径中的参数
  const url = pathname.replace(/\{([^}]+)\}/g, (match, key) => {
    // 如果参数存在，使用参数值
    if (paramsCopy[key] !== undefined) {
      const value = paramsCopy[key];
      delete paramsCopy[key];
      return encodeURIComponent(String(value));
    }
    // 如果参数不存在，使用 pathMark
    return pathMark;
  });

  // 处理剩余的查询参数
  const queryParams = new URLSearchParams();
  Object.entries(paramsCopy).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        // 处理数组参数
        value.forEach((v) => queryParams.append(key, String(v)));
      } else if (typeof value === "object") {
        // 处理对象参数
        queryParams.append(key, JSON.stringify(value));
      } else {
        // 处理基本类型参数
        queryParams.append(key, String(value));
      }
    }
  });

  const queryString = queryParams.toString();
  return queryString ? `${url}?${queryString}` : url;
}

/** 创建 API 客户端 */
export function createClient<
  T extends Record<string, Record<string, APIMethod>>
>(config: {
  fetchFn: any;
  pontxSpecMeta: PontxSpecMeta;
  pathMark?: string;
  getFetchUrl?: (path: string, params: Record<string, any>) => string;
}): Client<T> {
  const { fetchFn, pontxSpecMeta: apiMetaConfig } = config;

  return new Proxy({} as Client<T>, {
    get(target, controllerName: string) {
      if (!target[controllerName]) {
        (target as any)[controllerName] = new Proxy({} as Controller<any>, {
          get(_, methodName: string) {
            const apiMeta =
              apiMetaConfig?.apis?.[`${controllerName}/${methodName}`];
            const getFetchKey = (params) => {
              if (config.getFetchUrl) {
                return config.getFetchUrl(apiMeta.path!, params);
              }

              return buildUrl(apiMeta.path!, params, config.pathMark);
            };

            const request = async (params: any, requestOptions?: any) => {
              try {
                const headers: RequestHeaders = {};

                // 设置 Content-Type
                if (apiMeta.consumes?.length) {
                  headers["Content-Type"] = apiMeta.consumes[0];
                }

                // 设置 Accept
                if (apiMeta.produces?.length) {
                  headers["Accept"] = apiMeta.produces[0];
                }

                const requestInit = {
                  method: apiMeta.method?.toUpperCase?.(),
                  headers: headers,
                  ...requestOptions,
                };

                if (apiMeta.hasBody && requestOptions.body) {
                  requestInit.body = serializeRequestBody(
                    requestOptions.body,
                    headers["Content-Type"] || "application/json"
                  );
                }

                const fetchKey = getFetchKey(params);

                return config.fetchFn(fetchKey, requestInit);
              } catch (error) {
                throw error;
              }
            };

            const queryOptions = (params: any) => {
              return {
                fetchKey: getFetchKey(params),
                fetchFn: () => {
                  return request(params);
                },
              };
            };

            return {
              getFetchKey,
              request,
              queryOptions,
            };
          },
        });
      }
      return target[controllerName];
    },
  });
}

export function serializeRequestBody(body: any, contextType: ContentType) {
  if (!body) {
    return body;
  }

  if (contextType === "application/json") {
    return JSON.stringify(body || {});
  } else if (contextType === "application/x-www-form-urlencoded") {
    const formData = new URLSearchParams();
    Object.keys(body || {}).forEach((key) => {
      formData.append(key, body[key]);
    });
    return formData;
  } else if (contextType === "multipart/form-data") {
    const formData = new FormData();
    Object.keys(body || {}).forEach((key) => {
      formData.append(key, body[key]);
    });
    return formData;
  } else if (contextType === "text/plain") {
    return body;
  }

  return body;
}
