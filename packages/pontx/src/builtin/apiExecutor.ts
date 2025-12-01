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
 * 解析和分类参数
 */
function parseParams(
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
 * 规范化 baseUrl，确保包含协议前缀
 */
function normalizeBaseUrl(baseUrl: string): string {
  if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
    return `https://${baseUrl}`;
  }
  return baseUrl;
}

/**
 * 构建完整 URL
 */
function buildUrl(
  baseUrl: string,
  path: string,
  pathParams: Record<string, unknown>,
  queryParams: Record<string, unknown>
): string {
  // 规范化 baseUrl
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);

  // 替换路径参数: /users/{userId} -> /users/123
  let finalPath = path.replace(/\{([^}]+)\}/g, (_, key) => {
    return String(pathParams[key] ?? `{${key}}`);
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
 * 构建请求配置
 */
function buildRequestConfig(
  method: string,
  headerParams: Record<string, unknown>,
  bodyParams: Record<string, unknown>,
  requestBodyDef?: ApiExecutorContext["apiMeta"]["requestBody"]
): RequestInit {
  const headers: Record<string, string> = {};

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

  // 确定 Content-Type 和构建请求体
  const contentType = requestBodyDef?.content
    ? Object.keys(requestBodyDef.content)[0]
    : "application/json";

  headers["Content-Type"] = contentType;

  let body: string | undefined;
  if (contentType === "application/json") {
    body = JSON.stringify(bodyParams);
  } else if (contentType === "application/x-www-form-urlencoded") {
    body = new URLSearchParams(bodyParams as Record<string, string>).toString();
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
    apiMeta.requestBody
  );

  // 5. 发送请求并处理响应
  try {
    const response = await fetch(url, requestConfig);
    return await handleResponse(response);
  } catch (error) {
    throw new Error(
      `API 调用失败: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
