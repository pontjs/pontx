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
export type Fetcher = (url: string, options?: any) => Promise<any>;
export type APIMeta = {
  method: "post" | "get" | "delete" | "put" | "patch" | "options" | "head";
  consumes: ContextType[];
  produces: ContextType[];
  apiName: string;
  hasBody?: boolean;
  path: string;
  specName?: string;
  controllerName?: string;
};
export type SpecMeta = {
  basePath?: string;
  host?: string;
};

type GetRequest = (apiMeta: any) => (url: any, params: any, options?: any) => Promise<any>;

export class FetchHelper {
  private meta: SpecMeta;
  constructor() {}

  setMeta(meta: SpecMeta) {
    this.meta = meta;
  }

  getMeta() {
    return this.meta;
  }

  getUrl = (path: string, params: any) => {
    const allParms = { ...(params || {}) };
    const pathUrl = path.replace(/{([^}]+)}/g, (match, paramKey) => {
      delete allParms[paramKey];
      return encodeURIComponent(params[paramKey]);
    });
    const query = Object.keys(allParms)
      .map((key) => {
        return `${key}=${encodeURIComponent(allParms[key])}`;
      })
      .join("&");

    return `${this.getUrlPrefix()}${pathUrl}${query ? `?${query}` : ""}`;
  };

  getUrlPrefix = () => {
    if (window.location.hostname === "localhost") {
      if (this.meta.host) {
        if (this.meta.basePath) {
          return "//" + this.meta.host + this.meta.basePath;
        }
        return this.meta.host;
      }
      if (this.meta.basePath) {
        return this.meta.basePath;
      }
    }
    return "";
  };

  request: GetRequest =
    (apiMeta: APIMeta) =>
    (url, options, ...args: any[]) => {
      const requestOptions = { ...options };
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

      const result = fetch(url, requestOptions);
      const responseContentType = apiMeta.produces?.[0] || "application/json";

      if (responseContentType === "application/json") {
        return result.then((res) => res.json());
      } else if (responseContentType === "application/octet-stream") {
        return result.then((res) => res.blob());
      } else if (responseContentType === "application/xml") {
        return result.then((res) => res.text());
      } else if (responseContentType === "text/plain") {
        return result.then((res) => res.text());
      } else {
        return result;
      }
    };
}

export type FetchAPIs = (
  meta: SpecMeta,
  apiMeta: APIMeta,
  fetchHelper: FetchHelper,
) => {
  request: (params: any, options?: any) => Promise<any>;
  [x: string]: any;
};

export const getFetchAPIs = (meta: SpecMeta, apiMeta: APIMeta, fetchHelper: FetchHelper) => {
  return {
    request: (params: any, options: any = {}) => {
      const url = fetchHelper.getUrl(apiMeta.path, params);
      return fetchHelper.request(apiMeta)(url, options);
    },
  };
};

export class PontxSDK {
  getFetchAPIs = getFetchAPIs;
  fetchHelper = new FetchHelper();

  constructor(options?: { getFetchAPIs?: FetchAPIs; fetchHelper?: FetchHelper }) {
    if (options?.getFetchAPIs) {
      this.getFetchAPIs = options.getFetchAPIs;
    }
    if (options?.fetchHelper) {
      this.fetchHelper = options.fetchHelper;
    }
  }

  getClient<APIs>(meta: any, options?: { getFetchAPIs?: FetchAPIs; fetchHelper?: FetchHelper }): APIs {
    let client = {} as any;

    const fetchHelper = options?.fetchHelper || this.fetchHelper;
    const fetchAPIs = options?.getFetchAPIs || this.getFetchAPIs;

    fetchHelper.setMeta(meta);

    if (meta.hasController) {
      client = mapValues(meta.apis, (controller) => {
        return mapValues(controller, (action) => {
          return fetchAPIs(meta, action, fetchHelper);
        });
      });
    } else {
      client = mapValues(meta.apis, (action) => {
        return fetchAPIs(meta, action, fetchHelper);
      });
    }
    return client;
  }
}

export type * from "./type.d.ts";
