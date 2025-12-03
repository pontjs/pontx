import type { ApiExecutorContext } from "../type";
import type { Parameter } from "@pontx/spec";

/**
 * HTTP API Executor 内置插件
 * 根据 API 元数据和运行时参数执行 HTTP 请求
 */

interface ParsedParams {
  pathParams: Record<string, unknown>;
  queryParams: Record<string, unknown>;
  headerParams: Record<string, unknown>;
  bodyParams: Record<string, unknown>;
}

/**
 * Parse and classify parameters based on their location in the API definition.
 * Parameters are classified into path, query, header, and body params.
 * Unmatched parameters are treated as body parameters.
 *
 * @param parameters - Array of parameter definitions from the API spec
 * @param toolParams - Runtime parameter values provided by the caller
 * @returns Parsed parameters classified by location
 */
export function parseParams(
  parameters: Parameter[] | undefined,
  toolParams: Record<string, unknown>
): ParsedParams {
  const result: ParsedParams = {
    pathParams: {},
    queryParams: {},
    headerParams: {},
    bodyParams: {},
  };

  const usedKeys = new Set<string>();

  // 根据参数定义分类
  parameters?.forEach((param) => {
    const value = toolParams[param.name];
    if (value === undefined) return;

    usedKeys.add(param.name);
    switch (param.in) {
      case "path":
        result.pathParams[param.name] = value;
        break;
      case "query":
        result.queryParams[param.name] = value;
        break;
      case "header":
        result.headerParams[param.name] = value;
        break;
      case "body":
        if (value) {
          result.bodyParams = value as any;
          break;
        }
    }
  });

  // 未使用的参数作为 body 参数
  Object.entries(toolParams).forEach(([key, value]) => {
    if (!usedKeys.has(key)) {
      result.bodyParams[key] = value;
    }
  });

  return result;
}

/**
 * Normalize base URL to ensure it has a protocol prefix.
 * If no protocol is specified, defaults to https://.
 *
 * @param baseUrl - The base URL to normalize
 * @returns Normalized URL with protocol
 */
export function normalizeBaseUrl(baseUrl: string): string {
  if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
    return `https://${baseUrl}`;
  }
  return baseUrl;
}

/**
 * Build complete URL from base URL, path, and parameters.
 * Handles path parameter substitution and query string construction.
 *
 * @param baseUrl - The base URL (will be normalized)
 * @param path - The API path with optional {param} placeholders
 * @param pathParams - Values for path parameters
 * @param queryParams - Values for query string parameters
 * @returns Complete URL with substituted path params and query string
 */
export function buildUrl(
  baseUrl: string,
  path: string,
  pathParams: Record<string, unknown>,
  queryParams: Record<string, unknown>
): string {
  // 规范化 baseUrl
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);

  // 替换路径参数: /users/{userId} -> /users/123
  let finalPath = path.replace(/\{([^}]+)\}/g, (_, key) => {
    const value = pathParams[key];
    if (value === undefined || value === null) {
      return `{${key}}`;
    }
    return encodeURIComponent(String(value));
  });

  // 构建查询字符串
  const queryString = new URLSearchParams(
    Object.entries(queryParams).map(([k, v]) => [k, String(v)])
  ).toString();

  return `${normalizedBaseUrl.replace(/\/$/, "")}${finalPath}${
    queryString ? `?${queryString}` : ""
  }`;
}

/**
 * Build fetch RequestInit configuration from method, headers, and body.
 * Handles content type detection and body serialization for different formats
 * (JSON, form-urlencoded, multipart, text).
 *
 * @param method - HTTP method (GET, POST, PUT, etc.)
 * @param headerParams - Custom header parameters
 * @param bodyParams - Body parameters to serialize
 * @param consumes - Content types the API accepts (used to determine Content-Type)
 * @param produces - Content types the API produces (used to set Accept header)
 * @returns RequestInit object for fetch()
 */
export function buildRequestConfig(
  method: string,
  headerParams: Record<string, unknown>,
  bodyParams: Record<string, unknown>,
  consumes?: string[],
  produces?: string[]
): RequestInit {
  const headers: Record<string, string> = {};

  // 添加 Accept 头（基于 produces）
  if (produces?.length && !headerParams["Accept"]) {
    headers["Accept"] = produces[0];
  }

  // 添加自定义 header 参数
  Object.entries(headerParams).forEach(([key, value]) => {
    headers[key] = String(value);
  });

  // 如果是 GET/HEAD 请求或没有 body 参数，不设置请求体
  if (
    ["GET", "HEAD"].includes(method.toUpperCase()) ||
    Object.keys(bodyParams).length === 0
  ) {
    return { method: method.toUpperCase(), headers };
  }

  // 确定 Content-Type：优先使用 headerParams 中的，其次使用 consumes，最后默认 application/json
  const contentType =
    (headerParams["Content-Type"] as string) ||
    (consumes?.length ? consumes[0] : "application/json");

  headers["Content-Type"] = contentType;

  let body: BodyInit | undefined;
  if (contentType === "application/json") {
    body = JSON.stringify(bodyParams);
  } else if (contentType === "application/x-www-form-urlencoded") {
    // 对非原始类型值进行 JSON.stringify
    const flatParams: Record<string, string> = {};
    Object.entries(bodyParams).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        return;
      } else if (typeof value === "object") {
        flatParams[key] = JSON.stringify(value);
      } else {
        flatParams[key] = String(value);
      }
    });
    body = new URLSearchParams(flatParams).toString();
  } else if (contentType === "multipart/form-data") {
    // FormData 不需要手动设置 Content-Type，浏览器/Node 会自动添加 boundary
    delete headers["Content-Type"];
    const formData = new FormData();
    Object.entries(bodyParams).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        return;
      } else if (value instanceof Blob || value instanceof File) {
        formData.append(key, value);
      } else if (typeof value === "object") {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, String(value));
      }
    });
    body = formData;
  } else if (contentType === "text/plain" || contentType.startsWith("text/")) {
    // 纯文本：如果只有一个参数，直接取值；否则 JSON 序列化
    const values = Object.values(bodyParams);
    if (values.length === 1 && typeof values[0] !== "object") {
      body = String(values[0]);
    } else {
      body = JSON.stringify(bodyParams);
    }
  } else {
    // 默认使用 JSON
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(bodyParams);
  }

  return { method: method.toUpperCase(), headers, body };
}

/**
 * 处理响应
 */
async function handleResponse(response: Response): Promise<unknown> {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `HTTP ${response.status} ${response.statusText}: ${errorText}`
    );
  }

  const contentType = response.headers.get("content-type");
  return contentType?.includes("application/json")
    ? response.json()
    : response.text();
}

/**
 * HTTP API Executor 实现
 */
export async function builtinApiExecutor(
  context: ApiExecutorContext
): Promise<unknown> {
  const { apiMeta, toolParams, options } = context;

  const resolvedOrigin = (options?.resolvedConfig?.origins || []).find(
    (origin) => origin.name === context?.apiSelector?.specName
  );

  // 1. 获取基础 URL
  const baseUrl = context?.baseUrl || resolvedOrigin?.spec?.servers?.[0]?.url;
  if (!baseUrl) {
    throw new Error(`未提供 baseUrl，请在调用时提供 baseUrl。`);
  }

  // 2. 解析和分类参数
  const { pathParams, queryParams, headerParams, bodyParams } = parseParams(
    apiMeta.parameters,
    toolParams
  );

  // 3. 构建完整 URL
  const url = buildUrl(baseUrl, apiMeta.path, pathParams, queryParams);

  // 4. 构建请求配置
  const requestConfig = buildRequestConfig(
    apiMeta.method,
    headerParams,
    bodyParams,
    apiMeta.consumes,
    apiMeta.produces
  );

  // 5. 调用 beforeRequest 钩子（如果提供）
  let finalUrl = url;
  let finalRequestConfig = requestConfig;

  if (context.beforeRequest) {
    const modified = await context.beforeRequest({
      url,
      requestInit: requestConfig,
    });
    finalUrl = modified.url;
    finalRequestConfig = modified.requestInit;
  }

  // 6. 发送请求并处理响应
  try {
    const response = await fetch(finalUrl, finalRequestConfig);
    return await handleResponse(response);
  } catch (error) {
    throw new Error(
      `API 调用失败: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
