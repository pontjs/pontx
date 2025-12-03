import type { ResolvedOriginConfig } from "../type";

/**
 * 全局 Spec 注册条目
 */
export interface GlobalSpecEntry {
  /** spec 包的绝对路径 */
  path: string;
  /** 该包的 spec 名称（只能有一个） */
  specName: string;
  /** 注册时间 (ISO 8601) */
  registeredAt?: string;
}

/**
 * 全局配置文件结构
 */
export interface GlobalConfig {
  version: string;
  /** key = packageName */
  globalSpecs: Record<string, GlobalSpecEntry>;
}

/**
 * Spec 解析结果
 */
export interface ResolvedSpecLocation {
  /** 来源 */
  source: "local" | "global";
  /** 全局包名（仅 source=global） */
  globalPackage?: string;
  /** spec 所在目录 */
  rootDir: string;
  /** 对应的 origin 配置 */
  originConfig: ResolvedOriginConfig;
}
