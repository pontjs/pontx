/**
 * @author pontx
 * @description SDK CLI 类型定义
 */

import type { ExecuteApiConfig } from "../../types/execute-api";

/**
 * 代码生成示例配置
 */
export interface CLISampleConfig {
  /** 示例标识 */
  case: string;
  /** 示例描述 */
  description: string;
  /** 生成示例代码的函数 */
  generateSample: (
    api: { specName: string; tagName: string; apiName: string },
    options?: { requestParams?: any; bodyParams?: any }
  ) => string | Promise<string>;
}

/**
 * SDK CLI 配置
 * 注意：spec 从 pontx.config.ts 中自动读取，不再需要在此配置
 */
export interface CLIConfig {
  /** CLI 命令名 */
  name: string;
  /** API 执行配置 */
  executeApi?: ExecuteApiConfig;
  /** 代码生成示例配置 */
  generateSamples?: CLISampleConfig[];
}
