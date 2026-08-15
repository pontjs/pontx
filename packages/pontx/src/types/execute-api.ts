/**
 * @author jasonHzq
 * @description ExecuteApi 相关类型定义
 * 用于 API 调用配置和执行上下文
 */

import type { Parameter } from "@pontx/spec";
import type { Logger } from "../logger/types";
import type { ResolvedConfig } from "../type";

/**
 * API 请求配置（用于钩子）
 */
export interface ApiRequest {
  /** 完整 URL */
  url: string;
  /** Fetch API 的 RequestInit */
  init: RequestInit;
  /** API 元信息（只读，供参考） */
  readonly meta: {
    /** Spec 名称 */
    specName: string;
    /** Tag 名称 */
    tagName: string;
    /** API 名称 */
    apiName: string;
    /** HTTP 方法 */
    method: string;
    /** API 路径 */
    path: string;
  };
}

/**
 * API 响应（用于钩子）
 */
export interface ApiResponse {
  /** 响应数据 */
  data: unknown;
  /** HTTP 状态码 */
  status: number;
  /** 响应头 */
  headers: Record<string, string>;
  /** 原始 Response 对象（可选） */
  raw?: Response;
}

/**
 * API 错误
 */
export interface ApiError extends Error {
  /** 请求信息 */
  request?: ApiRequest;
  /** 响应信息（如果有） */
  response?: ApiResponse;
  /** 错误类型 */
  type: 'network' | 'timeout' | 'http' | 'unknown';
}

/**
 * 环境配置
 */
export interface EnvironmentConfig {
  /** 环境基础 URL */
  baseURL: string;
  /** 环境特定请求头 */
  headers?: Record<string, string>;
  /** 环境超时配置（毫秒） */
  timeout?: number;
}

/**
 * API 调用配置
 * 用于 pontx call 命令和 API Debugger 调试器
 * 参考 Axios 配置设计
 */
export interface ExecuteApiConfig {
  /**
   * 默认基础 URL
   * 示例: 'https://api.example.com'
   */
  baseURL?: string;

  /**
   * 请求超时时间（毫秒）
   * 默认: 30000 (30秒)
   */
  timeout?: number;

  /**
   * 默认请求头
   * 示例: { 'Content-Type': 'application/json' }
   */
  headers?: Record<string, string>;

  /**
   * Additional exact field names to redact from CLI request summaries and
   * cURL previews. The underlying request and mutation confirmation digest
   * remain unchanged.
   */
  previewSensitiveFields?: string[];

  /**
   * 自定义请求函数
   *
   * 当提供时，builtinExecuteApi 直接调用此函数，其返回值作为最终结果，
   * 抛出的错误作为最终错误。跳过后续的响应解析（handleResponse）、
   * afterResponse 钩子等处理步骤。
   *
   * 传入的 url 为相对路径（path + query），不包含 baseURL，
   * 因为 SDK 的 fetchFn 通常已内置 baseURL 处理。
   *
   * 典型用法：SDK 项目将已有的 fetchFn 传入，避免重复配置。
   */
  fetchFn?: (url: string, init: RequestInit) => Promise<any>;

  /**
   * 环境配置
   * pontx call api --env dev 时会使用对应环境配置
   */
  environments?: Record<string, EnvironmentConfig>;

  /**
   * 请求前钩子
   * 可用于添加认证、日志等
   */
  beforeRequest?: (request: ApiRequest) => ApiRequest | Promise<ApiRequest>;

  /**
   * 响应后钩子
   * 可用于统一解包、错误处理等
   */
  afterResponse?: (response: ApiResponse) => unknown | Promise<unknown>;

  /**
   * 错误处理钩子
   */
  onError?: (error: ApiError) => void | Promise<void>;
}

/**
 * API 执行上下文
 * 提供给 executeApi 钩子的完整上下文
 */
export interface ApiExecutionContext {
  /**
   * API 选择器
   */
  api: {
    /** Spec 名称 */
    specName: string;
    /** Tag 名称 */
    tagName: string;
    /** API 名称 */
    apiName: string;
  };

  /**
   * API 元数据
   */
  meta: {
    /** API 路径 */
    path: string;
    /** HTTP 方法 */
    method: string;
    /** API 描述 */
    description?: string;
    /** 参数定义 */
    parameters?: Parameter[];
    /** 响应定义 */
    responses?: Record<string, any>;
    /** 支持的请求内容类型 */
    consumes?: string[];
    /** 支持的响应内容类型 */
    produces?: string[];
  };

  /**
   * 运行时参数
   * 用户通过 CLI 或 MCP 传入的参数
   */
  params: Record<string, unknown>;

  /**
   * 环境/基础 URL
   * 优先级：CLI --env 参数 > ExecuteApiConfig.environments > ExecuteApiConfig.baseURL
   */
  env?: {
    /** 环境名称（如果使用 --env dev） */
    name?: string;
    /** 基础 URL */
    baseURL?: string;
  };

  /**
   * 调用配置（来自 pontx.config.ts）
   */
  executeApiConfig?: ExecuteApiConfig;

  /**
   * 完整的已解析配置（供高级使用）
   */
  resolvedConfig: ResolvedConfig;

  /**
   * 日志器
   */
  logger: Logger;
}
