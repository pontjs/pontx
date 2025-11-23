import { FetchFn, PontxAPI, PontxSpecMeta } from "./type";
import { buildUrl } from "./utils";

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

export type RequestOptions<BodyParams> = BodyParams extends undefined
  ? Omit<RequestInit, "body" | "method">
  : Omit<RequestInit, "body" | "method"> & { body: BodyParams };

type RequestFn<Params, BodyParams, Response> = (
  params: Params,
  requestOptions?: RequestOptions<BodyParams>
) => Promise<Response>;

export type SdkUsage<ApiTypes extends APIMethod> = {
  getFetchKey: (params: ApiTypes["params"]) => string;
  request: RequestFn<
    ApiTypes["params"],
    ApiTypes["bodyParams"],
    ApiTypes["Response"]
  >;
  queryOptions: (
    params: ApiTypes["params"],
    requestConfig?: RequestOptions<ApiTypes["bodyParams"]>
  ) => {
    fetchKey: string;
    fetchFn: () => Promise<ApiTypes["Response"]>;
  };
};

export type Controller<T extends Record<string, APIMethod>> = {
  [K in keyof T]: SdkUsage<T[K]>;
};

/** 客户端类型 */
export type Client<T extends Record<string, Record<string, APIMethod>>> = {
  [K in keyof T]: Controller<T[K]>;
};

/** 创建 API 客户端 */
export function createClient<
  T extends Record<string, Record<string, APIMethod>>
>(config: {
  fetchFn: FetchFn;
  pontxSpecMeta: PontxSpecMeta;
  pathMark?: string;
  getFetchUrl?: (path: string, params: Record<string, any>) => string;
  makeCustomUsages?: (usages: SdkUsage<any>, apiMeta?: PontxAPI) => any;
}) {
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

            const request = async (params: any, requestOptions = {} as any) => {
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
                  getMetadata: () => {
                    return {
                      specName: apiMetaConfig.name,
                      controllerName: controllerName,
                      apiName: methodName,
                      apiMeta: apiMeta,
                    };
                  },
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
                  // use query 使用，只有 GET 方法，因此不需要传入 requestInit
                  return request(params);
                },
              };
            };

            const usages = {
              getFetchKey,
              request,
              queryOptions,
            };

            if (config.makeCustomUsages) {
              const customUsages =
                config.makeCustomUsages(usages, apiMeta) || {};

              return {
                ...usages,
                ...customUsages,
              };
            }

            return usages;
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
