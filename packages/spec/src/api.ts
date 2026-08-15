import { ExternalDocumentationObject, PontxJsonSchema } from "./schema.js";
import _ from "lodash";
import { OAS3 } from "oas-spec-ts";

export type OAS3API = OAS3.OperationObject;

/** Endpoint 文档证据的审核状态。 */
export enum PontxDocumentationStatus {
  Official = "official",
  Verified = "verified",
  Community = "community",
  Unknown = "unknown",
}

/** Endpoint 的执行类别；执行器可据此实施审批策略。 */
export enum PontxExecutionPermission {
  Read = "read",
  Mutation = "mutation",
}

/** Endpoint 的来源证据和审核信息。 */
export type PontxEndpointDocumentation = {
  status?: PontxDocumentationStatus | string;
  evidence?: string[];
  verifiedAt?: string;
  stabilityNote?: string;
};

/** Endpoint 是否允许由某个消费方执行。 */
export type PontxEndpointExecution = {
  enabled: boolean;
  permission?: PontxExecutionPermission;
  disabledReason?: string;
};

/** 不依赖传输协议的 Endpoint 元数据。 */
export type PontxEndpointMetadata = {
  documentation?: PontxEndpointDocumentation;
  execution?: PontxEndpointExecution;
};

/** RPC Endpoint 的逻辑 action 与真实传输映射；不使用伪造的 REST path。 */
export type PontxRpcOperation = {
  /** 供应商协议内稳定的 action 名称，例如 AWS Query 的 SendMessage。 */
  action: string;
  /** 真实 HTTP 方法；省略时由协议运行时决定。 */
  method?: "GET" | "POST";
  /** 请求体媒体类型，例如 application/x-www-form-urlencoded。 */
  contentType?: string;
};

/** 媒体类型对应的消息定义。 */
export type PontxMediaTypeObject = {
  schema?: PontxJsonSchema;
  example?: unknown;
  examples?: Record<string, unknown>;
  encoding?: Record<string, unknown>;
};

/** A named event carried by a Server-Sent Events Endpoint. */
export type PontxSseEvent = {
  /** Human-readable event documentation. */
  description?: string;
  /** The decoded `data:` payload schema for JSON events. */
  schema?: PontxJsonSchema;
  /** Whether this event marks a normal, provider-defined stream terminal. */
  terminal?: boolean;
  /** Whether `data:` is JSON or must remain literal text. */
  dataFormat: "json" | "text";
};

/**
 * A typed Server-Sent Events contract attached to an ordinary HTTP Endpoint.
 *
 * SSE remains an HTTP request (and therefore keeps its real path and method),
 * but its response is an unbounded event sequence rather than a one-shot text
 * response. Unknown events are deliberately preserved for forward compatibility.
 */
export type PontxSseStream = {
  events: Record<string, PontxSseEvent>;
  unknownEventPolicy: "preserve";
};

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
  description?: string;
  /** OAS3 requestBody 的完整媒体类型映射。 */
  content?: Record<string, PontxMediaTypeObject>;
}

export type HeaderObject = {
  name?: string;
  description?: string;
  externalDocs?: ExternalDocumentationObject;
};

export type ResponseObject = {
  schema?: PontxJsonSchema;
  /** 响应的完整媒体类型映射；`schema` 保留为首选媒体类型兼容字段。 */
  content?: Record<string, PontxMediaTypeObject>;
  headers?: {
    [key: string]: HeaderObject;
  };
  description?: string;
};

export class PontxAPI {
  /** @deprecated */
  name?: string;
  /** 路径,路径参数用 {} 包裹，如 /api/user/{id} */
  path?: string;
  /** 方法 */
  method?:
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
  /** 文档证据和执行策略；不依赖 OAS 扩展字段。 */
  metadata?: PontxEndpointMetadata;
  /** 每个条目是一组可以整体使用的请求输入。 */
  requestExamples?: Record<string, PontxRequestExample>;
  /** 安全 */
  security?: Array<OAS3.SecurityRequirementObject>;
  /** 外部文档 */
  externalDocs?: ExternalDocumentationObject;
  /** Endpoint 级服务器覆盖。 */
  servers?: OAS3.ServerObject[];
  /** 回调契约；由生成器按能力决定是否执行。 */
  callbacks?: Record<string, unknown>;
  /** RPC 传输绑定；RPC Endpoint 不声明 REST path 或 method。 */
  rpc?: PontxRpcOperation;
  /** Typed Server-Sent Events response contract for this HTTP Endpoint. */
  sse?: PontxSseStream;

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

    Object.values(api.sse?.events || {}).forEach((event) => {
      if (event.schema) {
        structs.push(...PontxJsonSchema.getUsedStructNames(event.schema));
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
