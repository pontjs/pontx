/**
 * @author pontx-generator
 * @description 生成器类型定义
 */

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
