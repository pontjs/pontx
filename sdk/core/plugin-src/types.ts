/**
 * @author pontx-generator
 * @description 生成器类型定义
 */

import type { PontxSpec } from '@pontx/spec';

/**
 * 文件树节点类型
 */
export type FileTree = {
  [key: string]: string | FileTree;
};

/**
 * 生成器配置
 */
export interface GeneratorConfig {
  /** Spec 名称 */
  specName?: string;
}

/**
 * Pontx 插件接口(简化版)
 * 只包含代码生成所需的最小接口
 */
export type Plugin = {
  /** 插件名称 */
  name: string;
  /** 生成代码 */
  generate?: (
    spec: PontxSpec,
    options?: any
  ) => Promise<Record<string, string | any>>;
}
