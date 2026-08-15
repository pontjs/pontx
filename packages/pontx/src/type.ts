import { PontxSpec, Parameter, PontxAPI } from "@pontx/spec";
import { TranslateConfig } from "./builtin/translate";
import type { LogLevel } from "./logger/types";
import {
  ApiExecutionContext,
  ApiResponse,
  ExecuteApiConfig,
} from "./types/execute-api";

// 重新导出 executeApi 相关类型
export type {
  ApiRequest,
  ApiResponse,
  ApiError,
  EnvironmentConfig,
  ExecuteApiConfig,
  ApiExecutionContext,
} from "./types";

export type PluginHookOptions = {
  originConfig?: ResolvedOriginConfig;
  resolvedConfig: ResolvedConfig;
};

/**
 * @deprecated 使用 ApiExecutionContext 代替
 */
export interface ApiExecutorContext {
  /** API selector identifying the API */
  apiSelector: {
    specName: string;
    tagName: string;
    apiName: string;
  };

  /** API metadata from PontxSpec (based on PontxAPI) */
  apiMeta: {
    path: string;
    method: string;
    description?: string;
    /** Parameters including body params (in: "body") */
    parameters?: Parameter[];
    responses?: PontxAPI["responses"];
    /** MIME types the API can consume (for Content-Type header) */
    consumes?: string[];
    /** MIME types the API can produce (for Accept header) */
    produces?: string[];
    /** Typed SSE metadata, if this Endpoint has an event-stream response. */
    sse?: PontxAPI["sse"];
  };

  /** key: param name, value: param value */
  toolParams: Record<string, unknown>;

  baseUrl?: string;

  /** Plugin hook options with resolved configuration */
  options?: PluginHookOptions;

  /**
   * Hook called before sending the request
   * Allows modifying url, headers, body, etc.
   * @param config - The request configuration (url and RequestInit)
   * @returns Modified request configuration
   */
  beforeRequest?: (config: {
    url: string;
    requestInit: RequestInit;
  }) =>
    | { url: string; requestInit: RequestInit }
    | Promise<{ url: string; requestInit: RequestInit }>;
}

export type Plugin = {
  name: string;
  configResolved?: (resolvedConfig: ResolvedConfig) => any;
  /** 拉取 origin 配置中的元数据，返回元数据字符串 */
  fetch?: (url: string, options: PluginHookOptions) => Promise<string>;
  /** 在 parseMeta 之前调用，事先处理元数据字符串。每个插件都会调用。 */
  transformMeta?: (
    metaString: string,
    options: PluginHookOptions
  ) => Promise<string>;
  /** 拉取元数据后，对元数据进行处理，返回 Pontx 标准元数据字符串 */
  parseMeta?: (
    metaString: string,
    options: PluginHookOptions
  ) => Promise<PontxSpec>;
  /** 对 Pontx 标准元数据进行处理，返回新的 Pontx 标准元数据 */
  transform?: (
    spec: PontxSpec,
    options: PluginHookOptions
  ) => Promise<PontxSpec>;
  /** 生成服务端、客户端代码 */
  generate?: (
    spec: PontxSpec,
    options: PluginHookOptions
  ) => Promise<Record<string, string | any>>;
  /** 生成入口文件 */
  generateEntry?: (
    options: Omit<PluginHookOptions, "originConfig">
  ) => Promise<Record<string, string | any>>;
  /** 生成 mock 代码及服务 */
  mocks?: (options: PluginHookOptions) => Promise<void>;
  /** 生成 API 调用示例代码 */
  generateSamples?: (options: PluginHookOptions) => Promise<
    Array<{
      case: string;
      description: string;
      generateSample(
        apiSelector: {
          specName: string;
          tagName: string;
          apiName: string;
        },
        options?: {
          requestParams: any;
          bodyParams: any;
        }
      ): Promise<string>;
    }>
  >;
  /**
   * 执行 API 调用钩子
   *
   * @param context - API 执行上下文
   * @returns API 响应或 null（返回 null 表示由下一个插件处理）
   *
   * 执行顺序：
   * - 按插件注册顺序执行
   * - 首个返回非 null 值的插件中止后续执行
   * - 如果所有插件都返回 null，使用内置执行器
   */
  executeApi?: (context: ApiExecutionContext) => Promise<ApiResponse | null>;

  /**
   * @deprecated 使用 executeApi 代替
   */
  apiExecutor?: (context: ApiExecutorContext) => Promise<unknown>;
  /**
   * Check for breaking changes and issues between local and remote metadata
   * @param localSpec - Local metadata (pontx-lock.json), null if not exists
   * @param remoteSpec - Remote latest metadata
   * @param options - Plugin hook options
   * @returns Array of check results, empty array if no issues found
   */
  check?: (
    localSpec: PontxSpec | null,
    remoteSpec: PontxSpec,
    options: PluginHookOptions
  ) => Promise<CheckResult[]>;
};

export type Lifecycle =
  | "configResolved"
  | "fetch"
  | "transformMeta"
  | "parseMeta"
  | "transform"
  | "generate"
  | "generateEntry"
  | "mocks"
  | "executeApi"
  | "apiExecutor"
  | "check";

/**
 * Check result for metadata validation
 */
export interface CheckResult {
  /** Issue severity level */
  level: "error" | "warning" | "info";
  /** Issue type identifier */
  type: string;
  /** Human-readable issue description */
  message: string;
  /** Related API information */
  api?: {
    tagName: string;
    apiName: string;
    method?: string;
    path?: string;
  };
  /** Additional details about the issue */
  details?: any;
}

export interface ResolvedOriginConfig {
  /** 远程数据源地址 */
  url?: string;
  /** 本地数据源绝对路径 */
  localPath?: string;
  /** 数据源名称 */
  name: string;
  /** Pontx 标准元数据 */
  spec?: PontxSpec;
  /** 远程数据源标准元数据 */
  remoteSpec?: PontxSpec;
  /** 拉取元数据 */
  fetchedMeta?: string;
  /** 是否在 Spec 中包含 Tag 或 namespace。默认是 true */
  includeTags?: boolean;

  [x: string]: any;
}

export interface ResolvedConfig {
  /** 项目根目录 */
  rootDir: string;
  /** 配置文件目录，即 __dirname */
  configDir: string;
  configPath: string;
  /** 生成 SDK 代码的绝对路径 */
  outDir: string;
  /** 数据源 */
  origins: ResolvedOriginConfig[];
  /** 翻译配置 */
  translateConfig?: TranslateConfig;
  /** 插件配置 */
  resolvedPlugin?: Plugin;
  service?: ServiceConfig;
  /** API 调用配置 */
  executeApiConfig?: ExecuteApiConfig;
}

/**
 * 服务配置类型，支持在 pontx.config.ts 中声明并被服务层复用
 */
export interface ServiceConfig {
  /** Web 服务端口，默认 3000 */
  port?: number;
  /** 定时同步间隔（毫秒），默认 5 分钟 */
  syncInterval?: number;
  /** 是否启用定时同步，默认 true */
  enableAutoSync?: boolean;
  /** 是否启用文件监听，默认 true */
  enableFileWatch?: boolean;
  /** 是否启用 Web 服务，默认 true */
  enableWebServer?: boolean;
  /** 日志级别 */
  logLevel?: LogLevel;
  /** 直接指定 spec 来源（文件路径或 URL），用于零配置快速启动 */
  specSource?: string;
}

/** 用户配置 */
export interface PontxConfig {
  /** 生成SDK代码的相对路径 */
  outDir: string;
  /** API 规范配置（推荐使用） */
  specs?: OriginConfig[];
  /** 数据源（兼容旧版，建议使用 specs） */
  origins?: OriginConfig[];
  /** 翻译配置 */
  translateConfig?: TranslateConfig;
  /** 插件配置 */
  plugins?: Plugin[];
  /** 服务配置 */
  service?: ServiceConfig;
  /**
   * API 调用配置
   * 用于 pontx call 命令和 API Debugger 调试器
   * 参考 Axios 配置设计
   */
  executeApi?: ExecuteApiConfig;
  [x: string]: any;
}

/** package.json 中的 pontx 配置 */
export interface PackageJsonPontxConfig {
  /** SDK 包使用：spec 文件所在目录 */
  specDir?: string;
  /**
   * 项目使用：外置 spec 配置
   * 支持字符串（SDK 包名）或对象（自定义配置）
   */
  specs?: Array<
    | string
    | {
        /** 自定义 spec 名称（可选，默认使用 SDK 的 spec.name） */
        name?: string;
        /** SDK 包名 */
        sdk: string;
      }
  >;
}

/** 数据源配置 */
export interface OriginConfig {
  /** 远程数据源 */
  url?: string;
  /** 本地数据源，支持相对路径 */
  localPath?: string;
  /** 数据源名称 */
  name: string;
  /** 环境变量 */
  env?: string;
  /** 环境变量配置 */
  envs?: any;
  /** 标记为外置 spec（从 node_modules 加载，不支持代码生成） */
  external?: boolean;
  /** 关联的 SDK 包名（仅用于外置 spec） */
  sdk?: string;
  [x: string]: any;
}
