import { ApiKeyAuth, Authentication, HttpBasicAuth, OAuth, VoidAuth } from "./auth";
import { addParamsToUrl, handleResponse, handleResponseWithTransformers } from "./helper";
import { RequestOptions, SpecMeta } from "./types";

export class RequestBaseConfig {}

export class HttpRequestConfig {
  baseURL?: string;
  transformRequest?: RequestOptions["transformRequest"];
  transformResponse?: RequestOptions["transformResponse"];
  headers?: {
    [key: string]: string;
  };
  securitySchemes?: SpecMeta["securitySchemes"];
  accessToken?: string;
}

export class PontxBaseRequester<RequestConfig extends RequestBaseConfig = any> {
  static create<T extends RequestBaseConfig>(config: T) {
    return new PontxBaseRequester(config);
  }

  constructor(public config?: RequestConfig) {
    if (!config) {
      this.config = new RequestBaseConfig() as any;
    }
  }

  getRequestConfig(): RequestConfig {
    return null;
  }

  request(options): Promise<any> {
    return null;
  }
}

export class PontxHttpRequester extends PontxBaseRequester<HttpRequestConfig> {
  constructor(public config = new HttpRequestConfig()) {
    super(config);

    if (config.securitySchemes) {
      Object.keys(config.securitySchemes).forEach((key) => {
        const securityScheme = config.securitySchemes[key];
        if (securityScheme.type === "apiKey") {
          const apiKey = new ApiKeyAuth(securityScheme.in, securityScheme.name);
          this.authentications[key] = apiKey;
        } else if (securityScheme.type === "http") {
          if (securityScheme?.scheme === "bearer") {
            const auth = new OAuth();
            this.authentications[key] = auth;
          }
        }
      });
    }

    if (typeof window === "undefined") {
      // this.fetchMethod = require("node-fetch");
    } else {
      this.fetchMethod = window.fetch.bind(window);
    }
  }

  protected authentications = {
    default: <Authentication>new VoidAuth(),
  } as {
    default: Authentication;
    [x: string]: Authentication;
  };

  getAuthentication(type: "apiKey" | "accessToken") {
    let ClazzType = null;
    if (type === "apiKey") {
      ClazzType = ApiKeyAuth;
    } else if (type === "accessToken") {
      ClazzType = OAuth;
    }

    let result = null;

    Object.keys(this.authentications || {}).forEach((key) => {
      if (result) {
        return;
      }

      const auth = this.authentications[key];

      if (ClazzType && auth instanceof ClazzType) {
        result = auth;
        return;
      }
    });

    return result;
  }

  set baseURL(baseURL: string) {
    this.config.baseURL = baseURL;
  }

  get baseURL() {
    return this.config.baseURL;
  }

  public setApiKey(key: string, value: string) {
    (this.authentications as any)[key].apiKey = value;
  }

  set accessToken(token: string) {
    const auth = this.getAuthentication("accessToken");
    if (auth) {
      auth.accessToken = token;
    }
  }

  getRequestConfig(): HttpRequestConfig {
    return this.config;
  }

  getFetchUrl(url: string, params: any = {}) {
    const fetchUrl = addParamsToUrl(url, params);

    return fetchUrl;
  }

  getBaseUrl(options: RequestOptions) {
    const config = this.getRequestConfig() || this.config;
    let baseUrl = "";

    if (typeof options.baseURL !== "undefined") {
      baseUrl = options.baseURL;
    } else if (typeof config.baseURL !== "undefined") {
      baseUrl = config.baseURL;
    } else if (typeof options.specBaseURL !== "undefined") {
      baseUrl = options.specBaseURL;
    }

    return baseUrl;
  }

  async handleResponse(res, options: RequestOptions) {
    let result;
    if (options?.handleResponse) {
      result = await Promise.resolve(options.handleResponse(res, options?.apiMeta?.produces?.[0]));
    } else {
      result = await handleResponse(res);
    }

    if (options?.transformResponse) {
      return handleResponseWithTransformers(result, options.transformResponse);
    }

    return result;
  }

  handleRequest(options: RequestOptions): RequestOptions {
    const requestOptions = { ...options };

    requestOptions.method = (options.method || options?.apiMeta?.method)?.toUpperCase?.() as any;

    if (!requestOptions.headers) {
      requestOptions.headers = {};
    }
    const contextType = options?.headers?.["Content-Type"] || "application/json";
    requestOptions.headers["Content-Type"] = contextType;

    if (options?.body) {
      if (contextType === "application/json") {
        requestOptions.body = JSON.stringify(options.body || {});
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

    if (options?.security?.length) {
      const security = options.security;
      security.forEach((item) => {
        const key = Object.keys(item)?.[0];
        if (key) {
          const auth = this.authentications[key];
          if (auth) {
            auth.applyToRequest(requestOptions);
          }
        }
      });
    }
    return requestOptions;
  }

  fetchMethod: typeof fetch;

  request(options: RequestOptions) {
    const { url, params, ...restOptions } = options;
    const baseUrl = this.getBaseUrl(options);
    const fetchUrl = baseUrl + this.getFetchUrl(options.url, options.params);
    const fetchOptions = this.handleRequest(restOptions);

    const fetchMethod = this.fetchMethod;
    return fetchMethod(fetchUrl, fetchOptions).then(async (res) => {
      return this.handleResponse(res, options);
    });
  }
}

const defaultPontxRequester = new PontxHttpRequester(new HttpRequestConfig());

export { defaultPontxRequester };
