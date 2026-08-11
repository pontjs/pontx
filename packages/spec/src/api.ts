import { ExternalDocumentationObject, PontxJsonSchema } from "./schema.js";
import _ from "lodash";
import { OAS3 } from "oas-spec-ts";

export type OAS3API = OAS3.OperationObject;

/** 整体请求示例中的输入位置。 */
export enum PontxRequestInputLocation {
  Path = "path",
  Query = "query",
  Header = "header",
  Body = "body",
}

/** 动态输入的取值来源。 */
export enum PontxRequestInputSourceKind {
  Operation = "operation",
  Runtime = "runtime",
}

/** 无法安全固化在示例中的动态输入。 */
export type PontxUnresolvedRequestInput = {
  in: PontxRequestInputLocation;
  name: string;
  source:
    | {
        kind: PontxRequestInputSourceKind.Operation;
        operationId: string;
      }
    | {
        kind: PontxRequestInputSourceKind.Runtime;
        reason: string;
      };
};

/** 一次完整请求所需的稳定输入。 */
export type PontxRequestExampleValue = string | number | boolean;
export type PontxRequestExampleRequest = {
  path?: Record<string, PontxRequestExampleValue>;
  query?: Record<string, PontxRequestExampleValue>;
  headers?: Record<string, string>;
  body?: unknown;
};

/** OAS `x-pontx-request-examples` 对应的 PontxSpec 请求示例。 */
export type PontxRequestExample = {
  summary?: string;
  request?: PontxRequestExampleRequest;
  expectedStatus: string;
  unresolved?: PontxUnresolvedRequestInput[];
  serverUrl?: string;
  verifiedAt?: string;
};

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
  /** OpenAPI operationId；用于跨 Endpoint 的请求示例依赖。 */
  operationId?: string;
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
  /** 每个条目是一组可以整体使用的请求输入。 */
  requestExamples?: Record<string, PontxRequestExample>;
  /** 安全 */
  security?: Array<OAS3.SecurityRequirementObject>;
  /** 外部文档 */
  externalDocs?: ExternalDocumentationObject;

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

export function getSuccessResponse(
  responses?: PontxAPI["responses"]
): ResponseObject | undefined {
  if (!responses) {
    return undefined;
  }

  if (responses["200"]) {
    return responses["200"];
  }

  const successStatus = Object.keys(responses)
    .filter((status) => /^2\d\d$/.test(status))
    .sort((a, b) => Number(a) - Number(b))[0];

  return successStatus ? responses[successStatus] : undefined;
}
