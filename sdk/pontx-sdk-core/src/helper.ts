import { SpecMeta, RequestOptions, APIMeta } from "./types";

export const mapValues = (obj: any, fn: any) => {
  return Object.keys(obj || {}).reduce((result: any, key) => {
    result[key] = fn(obj[key], key);
    return result;
  }, {});
};

/** join url protocol, hostname, basePath */
export const getSpecUrlPrefix = (specMeta: SpecMeta, protocol = "") => {
  if (!specMeta) {
    return "";
  }

  let protocolPrefix = "https://";
  if (protocol === "http") {
    protocolPrefix = "http://";
  } else if (protocol === "https") {
    protocolPrefix = "https://";
  } else if (protocol) {
    protocolPrefix = protocol;
  }

  if (typeof window === "undefined") {
    if (specMeta?.host) {
      if (specMeta.basePath) {
        return protocolPrefix + specMeta.host + specMeta.basePath;
      }
      return protocolPrefix + specMeta.host;
    }
    return "";
  }

  if (specMeta.host) {
    if (specMeta.basePath) {
      return protocolPrefix + specMeta.host + specMeta.basePath;
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
export const addParamsToUrl = (path: string, params: any = {}, placemarker = "") => {
  const allParms = { ...(params || {}) };
  const pathUrl = path.replace(/{([^}]+)}/g, (match, paramKey) => {
    delete allParms[paramKey];
    return encodeURIComponent(params[paramKey] || placemarker);
  });
  const query = Object.keys(allParms)
    .map((key) => {
      if (typeof allParms[key] === "undefined" || allParms[key] === null) {
        return "";
      }
      return `${key}=${encodeURIComponent(allParms[key])}`;
    })
    .filter((id) => id)
    .join("&");

  return `${pathUrl}${query ? `?${query}` : ""}`;
};

const getResponseContentType = (result: Response) => {
  const contentType = result?.headers?.get("Content-Type");
  if (contentType) {
    const result = contentType?.split?.(";")?.[0]?.trim?.();

    return result;
  }
};

export const handleResponse = async (result: Response, defaultResponseContentType = "application/json") => {
  const responseContentType = getResponseContentType(result) || defaultResponseContentType;

  if (responseContentType === "application/json") {
    return result.json();
  } else if (responseContentType === "application/xml") {
    return result.text();
  } else if (responseContentType === "text/plain") {
    return result.text();
  }

  return result;
};

export const handleResponseWithTransformers = (
  result: Response,
  transformResponse: RequestOptions["transformResponse"],
) => {
  if (Array.isArray(transformResponse)) {
    return transformResponse.reduce((prev, current) => {
      return current(prev);
    }, result);
  } else if (typeof transformResponse === "function") {
    return transformResponse(result);
  }

  return result;
};

export const getSDKOptionsFormSpecJSON = (spec: SpecMeta) => {
  const result = {};

  if (spec?.securitySchemes) {
    result["securitySchemes"] = spec.securitySchemes;
  }

  return result;
};
