/**
 * @author jasonHzq
 * @description HTTP API Executor 内置实现
 * 根据 API 元数据和运行时参数执行 HTTP 请求
 */

import type {
  ApiExecutionContext,
  ApiResponse,
  ApiRequest,
  ApiError,
  ExecuteApiConfig
} from "../types";
import type { Parameter } from "@pontx/spec";

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
 * 构建相对 URL（path + query），不包含 baseURL。
 * 用于 fetchFn 模式，fetchFn 自行处理 baseURL。
 */
export function buildPathUrl(
  path: string,
  pathParams: Record<string, unknown>,
  queryParams: Record<string, unknown>
): string {
  let finalPath = path.replace(/\{([^}]+)\}/g, (_, key) => {
    const value = pathParams[key];
    if (value === undefined || value === null) {
      return `{${key}}`;
    }
    return encodeURIComponent(String(value));
  });

  const queryString = new URLSearchParams(
    Object.entries(queryParams).map(([k, v]) => [k, String(v)])
  ).toString();

  return `${finalPath}${queryString ? `?${queryString}` : ""}`;
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
 * 合并配置获取最终的 baseURL
 */
function resolveBaseUrl(context: ApiExecutionContext): string {
  // 优先级：context.env.baseURL > config.environments[env.name] > config.baseURL > origin.spec.servers[0].url
  const { env, executeApiConfig, resolvedConfig, api } = context;

  // 1. 来自 CLI --env 参数的直接 URL
  if (env?.baseURL) {
    return env.baseURL;
  }

  // 2. 来自配置的环境
  if (env?.name && executeApiConfig?.environments?.[env.name]) {
    return executeApiConfig.environments[env.name].baseURL;
  }

  // 3. 配置的默认 baseURL
  if (executeApiConfig?.baseURL) {
    return executeApiConfig.baseURL;
  }

  // 4. origin spec 中的 server URL
  const origin = resolvedConfig.origins.find((o) => o.name === api.specName);
  const serverUrl = origin?.spec?.servers?.[0]?.url;
  if (serverUrl) {
    return serverUrl;
  }

  throw new Error(
    `未找到 baseURL，请在配置中设置 executeApi.baseURL 或使用 --env 参数指定`
  );
}

/**
 * 合并配置获取最终的 headers
 */
function resolveHeaders(context: ApiExecutionContext): Record<string, string> {
  const { env, executeApiConfig } = context;
  const headers: Record<string, string> = {};

  // 1. 全局默认 headers
  if (executeApiConfig?.headers) {
    Object.assign(headers, executeApiConfig.headers);
  }

  // 2. 环境特定 headers
  if (env?.name && executeApiConfig?.environments?.[env.name]?.headers) {
    Object.assign(headers, executeApiConfig.environments[env.name].headers);
  }

  return headers;
}

/**
 * 合并配置获取超时时间
 */
function resolveTimeout(context: ApiExecutionContext): number {
  const { env, executeApiConfig } = context;

  // 环境特定超时 > 全局超时 > 默认 30s
  if (env?.name && executeApiConfig?.environments?.[env.name]?.timeout) {
    return executeApiConfig.environments[env.name].timeout!;
  }

  return executeApiConfig?.timeout || 30000;
}

/**
 * 构建最终请求对象，包含参数分类、baseURL、请求体和 beforeRequest 钩子。
 */
export async function buildApiRequest(
  context: ApiExecutionContext
): Promise<ApiRequest> {
  const { api, meta, params, executeApiConfig, logger } = context;
  const hasFetchFn = !!executeApiConfig?.fetchFn;
  const configHeaders = resolveHeaders(context);

  const { pathParams, queryParams, headerParams, bodyParams } = parseParams(
    meta.parameters,
    params
  );

  let url: string;
  if (hasFetchFn) {
    url = buildPathUrl(meta.path, pathParams, queryParams);
    logger.debug(`Path URL: ${url}`);
  } else {
    const baseUrl = resolveBaseUrl(context);
    url = buildUrl(baseUrl, meta.path, pathParams, queryParams);
    logger.debug(`Base URL: ${baseUrl}`);
  }

  const requestInit = buildRequestConfig(
    meta.method,
    { ...configHeaders, ...headerParams },
    bodyParams,
    meta.consumes,
    meta.produces
  );

  let request: ApiRequest = {
    url,
    init: requestInit,
    meta: {
      specName: api.specName,
      tagName: api.tagName,
      apiName: api.apiName,
      method: meta.method,
      path: meta.path,
    },
  };

  if (executeApiConfig?.beforeRequest) {
    try {
      request = await executeApiConfig.beforeRequest(request);
    } catch (error) {
      logger.error(
        'beforeRequest hook failed',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  return request;
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function headersToEntries(
  headers: RequestInit["headers"]
): Array<[string, string]> {
  if (!headers) {
    return [];
  }

  if (headers instanceof Headers) {
    return Array.from(headers.entries());
  }

  if (Array.isArray(headers)) {
    return headers.map(([key, value]) => [key, String(value)]);
  }

  return Object.entries(headers).map(([key, value]) => [key, String(value)]);
}

function bodyToCurlData(body: BodyInit): string {
  if (typeof body === "string") {
    return body;
  }

  if (body instanceof URLSearchParams) {
    return body.toString();
  }

  if (body instanceof FormData) {
    return "[FormData body omitted]";
  }

  if (body instanceof Blob) {
    return `[Blob body: ${body.size} bytes]`;
  }

  return String(body);
}

/**
 * 将 ApiRequest 转换为可复制执行的 cURL 命令。
 */
export function requestToCurl(request: ApiRequest): string {
  const method = String(
    request.init.method || request.meta.method || "GET"
  ).toUpperCase();
  const parts = ["curl", "-X", shellQuote(method), shellQuote(request.url)];

  for (const [key, value] of headersToEntries(request.init.headers)) {
    parts.push("-H", shellQuote(`${key}: ${value}`));
  }

  if (request.init.body !== undefined && request.init.body !== null) {
    parts.push(
      "--data-raw",
      shellQuote(bodyToCurlData(request.init.body as BodyInit))
    );
  }

  return parts.join(" ");
}

/**
 * 创建 API 错误对象
 */
function createApiError(
  error: unknown,
  request: ApiRequest,
  response?: Response
): ApiError {
  const message = error instanceof Error ? error.message : String(error);
  const apiError = new Error(message) as ApiError;
  apiError.name = 'ApiError';
  apiError.request = request;

  if (response) {
    apiError.response = {
      data: null,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      raw: response
    };
    apiError.type = 'http';
  } else if (message.includes('timeout')) {
    apiError.type = 'timeout';
  } else if (message.includes('network') || message.includes('fetch')) {
    apiError.type = 'network';
  } else {
    apiError.type = 'unknown';
  }

  return apiError;
}

/**
 * 带超时的 fetch 封装
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeout: number,
  customFetch?: (url: string, init: RequestInit) => Promise<Response>
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  const fetchImpl = customFetch || fetch;

  try {
    const response = await fetchImpl(url, {
      ...init,
      signal: controller.signal,
    });
    return response;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 内置 HTTP API 执行器实现
 * 支持 ExecuteApiConfig 配置
 */
export async function builtinExecuteApi(
  context: ApiExecutionContext
): Promise<ApiResponse> {
  const { api, executeApiConfig, logger } = context;

  // 1. 解析配置
  const hasFetchFn = !!executeApiConfig?.fetchFn;
  const timeout = resolveTimeout(context);

  logger.debug(`Executing API: ${api.specName}.${api.tagName}.${api.apiName}`);

  // 2. 构建请求对象并应用 beforeRequest 钩子
  const request = await buildApiRequest(context);

  // 3. 发送请求
  if (hasFetchFn) {
    // fetchFn 模式：返回值即最终结果，错误即最终错误，跳过后续响应处理
    const data = await executeApiConfig!.fetchFn!(request.url, request.init);
    logger.debug(`API call successful (fetchFn mode)`);
    return {
      data,
      status: 200,
      headers: {},
    };
  }

  let rawResponse: Response;
  try {
    rawResponse = await fetchWithTimeout(request.url, request.init, timeout);
  } catch (error) {
    const apiError = createApiError(error, request);

    // 调用错误处理钩子
    if (executeApiConfig?.onError) {
      try {
        await executeApiConfig.onError(apiError);
      } catch (hookError) {
        logger.error('onError hook failed', hookError instanceof Error ? hookError : new Error(String(hookError)));
      }
    }

    throw apiError;
  }

  // 8. 处理响应
  let data: unknown;
  try {
    data = await handleResponse(rawResponse);
  } catch (error) {
    const apiError = createApiError(error, request, rawResponse);

    if (executeApiConfig?.onError) {
      try {
        await executeApiConfig.onError(apiError);
      } catch (hookError) {
        logger.error('onError hook failed', hookError instanceof Error ? hookError : new Error(String(hookError)));
      }
    }

    throw apiError;
  }

  // 9. 构建响应对象
  let response: ApiResponse = {
    data,
    status: rawResponse.status,
    headers: Object.fromEntries(rawResponse.headers.entries()),
    raw: rawResponse,
  };

  // 10. 应用 afterResponse 钩子
  if (executeApiConfig?.afterResponse) {
    try {
      response.data = await executeApiConfig.afterResponse(response);
    } catch (error) {
      logger.error('afterResponse hook failed', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  logger.debug(`API call successful, status: ${response.status}`);

  return response;
}
