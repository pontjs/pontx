import { ExternalDocumentationObject, PontxJsonSchema } from "./schema.js";
import _ from "lodash";
import { OAS3 } from "oas-spec-ts";

export type OAS3API = OAS3.OperationObject;

export class Parameter {
  schema: PontxJsonSchema;
  name: string;
  required: boolean;
  in: "query" | "body" | "path" | "formData" | "header";
}

export type HeaderObject = {
  name?: string;
  description?: string;
  externalDocs?: ExternalDocumentationObject;
};

export type ResponseObject = {
  schema?: PontxJsonSchema;
  headers?: {
    [key: string]: HeaderObject;
  };
  description?: string;
};

export class PontxAPI {
  /** @deprecated */
  name?: string;
  /** 路径,路径参数用 {} 包裹，如 /api/user/{id} */
  path: string;
  /** 方法 */
  method:
    | "GET"
    | "POST"
    | "PUT"
    | "DELETE"
    | "OPTIONS"
    | "HEAD"
    | "PATCH"
    | "TRACE";
  /** 标题 */
  title?: string;
  /** 摘要 */
  summary?: string;
  /** 描述 */
  description?: string;
  /** 标签 */
  tags?: string[];
  /** 消费的媒体类型 */
  consumes?: string[] = [];
  /** 生产的媒体类型 */
  produces?: string[] = [];
  /** 参数 */
  parameters?: Parameter[] = [];
  /** 响应 */
  responses: {
    default?: ResponseObject;
    [statusCode: string]: ResponseObject;
  };
  /** 是否废弃 */
  deprecated?: boolean;
  /** 扩展 */
  ext?: any;
  /** 安全 */
  security?: Array<OAS3.SecurityRequirementObject>;
  /** 外部文档 */
  externalDocs?: ExternalDocumentationObject;
  /** Path 参数名数组 (用于 graceful client 参数分类) */
  pathParams?: string[];
  /** Query 参数名数组 (用于 graceful client 参数分类) */
  queryParams?: string[];
  /**
   * Body 类型 (用于 graceful client 签名选择)
   * - object: JSON 对象，使用二参数模式 (params 合并)
   * - map: Map 类型，使用三参数模式
   * - array: JSON 数组，使用三参数模式
   * - string: 字符串，使用三参数模式
   * - number: 数字，使用三参数模式
   * - boolean: 布尔值，使用三参数模式
   * - integer: 整数，使用三参数模式
   * - none: 无 body (GET/DELETE 等)
   */
  bodyType?: 'object' | 'map' | 'array' | 'string' | 'number' | 'boolean' | 'integer' | 'none';

  static getUsedStructNames(api: PontxAPI) {
    const structs = [] as string[];

    (api.parameters || []).forEach((param) => {
      if (param.schema) {
        const structNames = PontxJsonSchema.getUsedStructNames(param.schema);
        structs.push(...structNames);
      }
    });

    Object.keys(api.responses || {}).forEach((status) => {
      const res = api.responses[status];
      if (res) {
        const structNames = PontxJsonSchema.getUsedStructNames(res.schema);
        structs.push(...structNames);
      }
    });

    return _.union(structs);
  }
}
