const mapValues = (obj: any, fn: any) => {
  return Object.keys(obj || {}).reduce((result: any, key) => {
    result[key] = fn(obj[key], key);
    return result;
  }, {});
};

type ContextType =
  | "application/json"
  | "application/x-www-form-urlencoded"
  | "multipart/form-data"
  | "text/plain"
  | "application/octet-stream"
  | "application/xml";
export type FetchType = (url: string, options?: any) => Promise<any>;
export type APIMeta = {
  method: "post" | "get" | "delete" | "put" | "patch" | "options" | "head";
  consumes?: ContextType[];
  produces?: ContextType[];
  apiName: string;
  hasBody?: boolean;
  path: string;
  specName?: string;
  controllerName?: string;
};
export type SpecMeta = {
  basePath?: string;
  host?: string;
  hasController?: boolean;
  specName?: string;
  description?: string;
  apis?: {
    [controllerOrApiName: string]:
      | APIMeta
      | {
          [apiName: string]: APIMeta;
        };
  };
};

export type RequestConfig = {
  apiMeta?: any;
  specMeta?: SpecMeta;
  [x: string]: any;
};
type RequestType = (url: any, options?: any, config?: RequestConfig) => Promise<any>;

/** 构造请求方法的辅助类 */
export class PontxFetcher {
  protocol = "//";

  /** path 参数未传入时，path 参数取值的占位符 */
  placemarker: string = "";

  /** join url protocol, hostname, basePath */
  getUrlPrefix = (specMeta: SpecMeta) => {
    if (!specMeta) {
      return "";
    }

    if (typeof window === "undefined") {
      if (specMeta?.host) {
        if (specMeta.basePath) {
          return this.protocol + specMeta.host + specMeta.basePath;
        }
        return this.protocol + specMeta.host;
      }
      return "";
    }

    if (specMeta.host) {
      if (specMeta.basePath) {
        return this.protocol + specMeta.host + specMeta.basePath;
      }
      return specMeta.host;
    }
    // browser 环境下，默认使用当前域名
    if (specMeta.basePath) {
      return specMeta.basePath;
    }

    return "";
  };

  /** join url pathname and search by path params and query params */
  getUrl = (path: string, params: any = {}) => {
    const allParms = { ...(params || {}) };
    const pathUrl = path.replace(/{([^}]+)}/g, (match, paramKey) => {
      delete allParms[paramKey];
      return encodeURIComponent(params[paramKey] || this.placemarker);
    });
    const query = Object.keys(allParms)
      .map((key) => {
        return `${key}=${encodeURIComponent(allParms[key])}`;
      })
      .join("&");

    return `${pathUrl}${query ? `?${query}` : ""}`;
  };

  getFetchOptions(fetchUrl: string, options: any, config: RequestConfig) {
    const apiMeta = config.apiMeta;
    const requestOptions = { ...options };
    requestOptions.method = apiMeta.method.toUpperCase();
    const contextType = apiMeta.consumes?.[0] || "application/json";
    if (contextType !== "application/json") {
      requestOptions["content-type"] = contextType;
    }

    if (apiMeta?.hasBody) {
      if (contextType === "application/json") {
        requestOptions.body = JSON.stringify(options.body);
      } else if (contextType === "application/x-www-form-urlencoded") {
        if (options.body) {
          const formData = new URLSearchParams();
          Object.keys(options.body || {}).forEach((key) => {
            formData.append(key, options.body[key]);
          });
          requestOptions.body = formData;
        }
      } else if (contextType === "multipart/form-data") {
        if (options.body) {
          const formData = new FormData();
          Object.keys(options.body || {}).forEach((key) => {
            formData.append(key, options.body[key]);
          });
          requestOptions.body = formData;
        }
      } else if (contextType === "text/plain") {
        requestOptions.body = options.body;
      }
    }

    return requestOptions;
  }

  async beforeRequest(params: any, requestOptions, config: RequestConfig) {
    const fetchUrl = this.getUrlPrefix(config.specMeta) + this.getUrl(config.apiMeta.path, params);
    const fetchOptions = this.getFetchOptions(fetchUrl, requestOptions, config);

    return {
      url: fetchUrl,
      options: fetchOptions,
    };
  }

  async handleResponse(result: Response, url: string, fetchOptions, config: RequestConfig) {
    const responseContentType = config.apiMeta.produces?.[0] || "application/json";

    if (responseContentType === "application/json") {
      return result.json();
    } else if (responseContentType === "application/octet-stream") {
      return result.blob();
    } else if (responseContentType === "application/xml") {
      return result.text();
    } else if (responseContentType === "text/plain") {
      return result.text();
    }

    return result;
  }

  request: RequestType = async (params: any, requestOptions, config: RequestConfig) => {
    const { url, options } = await this.beforeRequest(params, requestOptions, config);

    const result = await this.fetch(url, options);
    return this.handleResponse(result, url, options, config);
  };

  // 默认使用浏览器标准 fetch
  fetch: FetchType = fetch;
}

export type SdkMethods = {
  request: RequestType;
  [x: string]: any;
};

export type SdkMethodsFnType = (
  apiMeta: APIMeta,
  fetche: PontxFetcher,
  options: { specMeta: SpecMeta; [x: string]: any },
) => SdkMethods;

export class PontxSDK {
  /** 接口请求的辅助方法 */
  fetcher = new PontxFetcher();
  /** 生成接口请求方法的必要的元数据 */
  specMeta: SpecMeta;
  /** 生成每个接口的请求方法，如 request/useRequest/..., 生成的方法需要和生成的类型一致 */
  SdkMethodsFn: SdkMethodsFnType;

  constructor(options?: { specMeta?: SpecMeta; SdkMethodsFn?: SdkMethodsFnType }) {
    if (options?.specMeta) {
      this.specMeta = options.specMeta;
    }

    if (options?.SdkMethodsFn) {
      this.SdkMethodsFn = options.SdkMethodsFn;
    } else {
      this.SdkMethodsFn = (apiMeta, fetcher, { specMeta }) => {
        return {
          request: (params: any, fetchOptions: any = {}, ...args) => {
            return fetcher.request(params, fetchOptions, { apiMeta, specMeta });
          },
        };
      };
    }
  }

  getClient<APIs>(specMeta?: SpecMeta): APIs {
    let client = {} as any;
    if (specMeta) {
      this.specMeta = specMeta;
    }
    const meta = this.specMeta;

    if (meta.hasController) {
      client = mapValues(meta.apis, (controller) => {
        return mapValues(controller, (action) => {
          return this.SdkMethodsFn(action, this.fetcher, { specMeta: this.specMeta });
        });
      });
    } else {
      client = mapValues(meta.apis, (action) => {
        return this.SdkMethodsFn(action, this.fetcher, { specMeta: this.specMeta });
      });
    }
    return client;
  }
}

export type * from "./type.d.ts";
