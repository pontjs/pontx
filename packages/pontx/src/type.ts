import { PontxSpec, Parameter, PontxAPI } from "@pontx/spec";
import { TranslateConfig } from "./builtin/translate";
import type { LogLevel } from "./logger/types";

export type PluginHookOptions = {
  originConfig?: ResolvedOriginConfig;
  resolvedConfig: ResolvedConfig;
};

/**
 * Request configuration for beforeRequest hook
 */
export interface ApiRequestConfig {
  url: string;
  requestInit: RequestInit;
}

/**
 * API Executor Context
 * Provides complete context for plugin apiExecutor hook to execute API calls
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
  beforeRequest?: (
    config: ApiRequestConfig
  ) => ApiRequestConfig | Promise<ApiRequestConfig>;
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
   * Execute API call with runtime parameters
   * Used by MCP Studio to execute API tools at runtime
   * @param context - Complete execution context including API metadata and runtime parameters
   * @returns Raw API response data (unwrapped)
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
  [x: string]: any;
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
  [x: string]: any;
}
