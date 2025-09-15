import { PontxJsonSchema } from "@pontx/spec";

/** 节点类型枚举 */
export enum PontxTreeItemType {
  SpecsRoot = "specs-root",
  Spec = "spec",
  Tag = "tag",
  API = "api",
  Schema = "schema",
  Schemas = "schemas",
}

/** TreeItem 节点数据结构 */
export type PontxTreeItem<T = any> = {
  /** 节点类型 */
  type: PontxTreeItemType;
  /** 节点名称 */
  name: string;
  /** 唯一 id，jsonPath */
  jsonPath: (string | number)[];
  /** 额外数据 */
  data?: T;
  /** 所属 spec 名称 */
  specName?: string;
};

export type PontxJsonSchemaMap = Record<string, PontxJsonSchema>;
