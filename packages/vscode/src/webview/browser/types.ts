/**
 * @author: jasonHzq
 * @description: WebView 浏览器端类型定义
 */

import { PontxAPI, PontxJsonSchema } from "@pontx/spec";

export type PontxJsonSchemaMap = Record<string, PontxJsonSchema>;

/**
 * WebView 面板的状态数据
 */
export interface WebViewState {
  /** 面板 ID */
  id: string;
  /** 面板标题 */
  title: string;
  /** 内容类型 */
  contentType: "api" | "schema";
  /** 数据内容，包含 components.schemas 以支持 $ref 解析 */
  data: (PontxAPI | PontxJsonSchema) & {
    components?: {
      schemas?: PontxJsonSchemaMap;
    };
  };
  /** 所属 spec 名称 */
  specName: string;
  /** 节点名称 */
  nodeName: string;
  /** JSON 路径 */
  jsonPath: (string | number)[];
}

/**
 * VSCode API 类型扩展
 */
declare global {
  interface Window {
    acquireVsCodeApi?: () => {
      postMessage: (message: any) => void;
      getState: () => any;
      setState: (state: any) => void;
    };
  }
}
