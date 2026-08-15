/**
 * @author jasonHzq
 * @description 将 Smithy JSON AST 导入为不伪造 REST path 的 Pontx RPC 契约。
 */

import { Parameter, PontxAPI } from "../api.js";
import { PontxJsonSchema } from "../schema.js";
import { PontxSpec, PontxStyle } from "../spec.js";

type SmithyReference = { target?: string };

type SmithyMember = SmithyReference & {
  traits?: Record<string, unknown>;
};

type SmithyShape = {
  type?: string;
  traits?: Record<string, unknown>;
  members?: Record<string, SmithyMember>;
  member?: SmithyMember;
  key?: SmithyMember;
  value?: SmithyMember;
  input?: SmithyReference;
  output?: SmithyReference;
  errors?: SmithyReference[];
  operations?: SmithyReference[];
  version?: string;
};

/** Smithy 2.0 JSON AST 的最小可验证子集。 */
export type SmithyJsonAst = {
  smithy?: string;
  shapes?: Record<string, SmithyShape>;
};

/** Smithy 导入选项；服务和协议都保持为显式、稳定的边界。 */
export type ImportSmithyOptions = {
  name: string;
  serviceId?: string;
  tagName?: string;
  /** 模型同时声明多个协议时，调用方必须传入经官方文档复核的协议。 */
  protocol?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function localName(shapeId: string): string {
  return shapeId.split("#").at(-1) || shapeId;
}

function documentation(shape?: SmithyShape | SmithyMember): string | undefined {
  const value = shape?.traits?.["smithy.api#documentation"];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function getTrait(shape: SmithyShape | undefined, name: string): unknown {
  return shape?.traits?.[name];
}

function referenceSchema(target: string | undefined, shapes: Record<string, SmithyShape>): PontxJsonSchema {
  if (!target) return { type: "generic", genericRef: { name: "unknown" } };
  if (!shapes[target]) return primitiveSchema(target);
  return {
    type: "generic",
    genericRef: { $ref: `#/components/schemas/${localName(target)}` },
  };
}

function primitiveSchema(target: string): PontxJsonSchema {
  const kind = localName(target).toLowerCase();
  if (["byte", "short", "integer", "int", "long", "biginteger"].includes(kind)) {
    return { type: "integer" };
  }
  if (["float", "double", "bigdecimal"].includes(kind)) return { type: "number" };
  if (kind === "boolean") return { type: "boolean" };
  if (kind === "timestamp") return { type: "string", format: "date-time" };
  if (kind === "blob") return { type: "string", contentEncoding: "base64" };
  if (kind === "document") return { type: "generic", genericRef: { name: "unknown" } };
  if (kind === "unit") return { type: "object" };
  return { type: "string" };
}

function getEnumValues(shape: SmithyShape): string[] | undefined {
  const trait = getTrait(shape, "smithy.api#enum");
  if (!Array.isArray(trait)) return undefined;
  const values = trait
    .map((entry) => isRecord(entry) && typeof entry.value === "string" ? entry.value : undefined)
    .filter((value): value is string => Boolean(value));
  return values.length ? values : undefined;
}

function shapeSchema(
  shapeId: string,
  shape: SmithyShape,
  shapes: Record<string, SmithyShape>
): PontxJsonSchema {
  const description = documentation(shape);
  const common = description ? { description } : {};
  const enumValues = getEnumValues(shape);
  if (enumValues) return { type: "string", enum: enumValues, ...common };

  switch (shape.type) {
    case "structure": {
      const properties = Object.fromEntries(Object.entries(shape.members || {}).map(([name, member]) => {
        const schema = referenceSchema(member.target, shapes);
        const memberDescription = documentation(member);
        return [name, memberDescription ? { ...schema, description: memberDescription } : schema];
      }));
      const required = Object.entries(shape.members || {})
        .filter(([, member]) => Boolean(member.traits?.["smithy.api#required"]))
        .map(([name]) => name);
      return {
        type: "object",
        ...common,
        properties,
        ...(required.length ? { required } : {}),
      };
    }
    case "list":
    case "set":
      return { type: "array", ...common, items: referenceSchema(shape.member?.target, shapes) };
    case "map":
      return { type: "object", ...common, additionalProperties: referenceSchema(shape.value?.target, shapes) };
    case "union":
      return {
        type: "generic",
        genericRef: { name: "unknown" },
        ...common,
        oneOf: Object.values(shape.members || {}).map((member) => referenceSchema(member.target, shapes)),
      };
    default:
      return { ...primitiveSchema(shapeId), ...common };
  }
}

function findService(
  shapes: Record<string, SmithyShape>,
  requestedServiceId?: string
): [string, SmithyShape] {
  if (requestedServiceId) {
    const service = shapes[requestedServiceId];
    if (service?.type !== "service") throw new TypeError(`Smithy service not found: ${requestedServiceId}`);
    return [requestedServiceId, service];
  }
  const services = Object.entries(shapes).filter(([, shape]) => shape.type === "service");
  if (services.length !== 1) {
    throw new TypeError("Smithy source must contain exactly one service or specify serviceId");
  }
  return services[0];
}

function detectedProtocol(service: SmithyShape): string | undefined {
  const traits = service.traits || {};
  if (Object.prototype.hasOwnProperty.call(traits, "aws.protocols#awsQuery")) return "aws-query";
  if (Object.prototype.hasOwnProperty.call(traits, "aws.protocols#awsQueryCompatible")) return "aws-query";
  if (Object.prototype.hasOwnProperty.call(traits, "aws.protocols#awsJson1_0")) return "aws-json-1.0";
  return undefined;
}

function responseSchema(
  target: string | undefined,
  shapes: Record<string, SmithyShape>
): PontxJsonSchema | undefined {
  return target ? referenceSchema(target, shapes) : undefined;
}

/**
 * Imports a Smithy JSON AST as an RPC PontxSpec. The resulting contract keeps
 * logical actions distinct without inventing non-existent REST resource paths.
 */
export function importSmithy(
  input: unknown,
  options: ImportSmithyOptions
): PontxSpec {
  if (!isRecord(input) || !isRecord(input.shapes)) {
    throw new TypeError("Smithy document must be an object with a shapes map");
  }
  const source = input as SmithyJsonAst;
  if (source.smithy !== "2.0") throw new TypeError("Only Smithy 2.0 JSON AST documents can be imported");
  const shapes = source.shapes as Record<string, SmithyShape>;
  const [serviceId, service] = findService(shapes, options.serviceId);
  const protocol = options.protocol || detectedProtocol(service);
  if (!protocol) throw new TypeError("Smithy service does not declare a supported protocol");
  const tagName = options.tagName || localName(serviceId);
  const serviceDocs = documentation(service);
  const sigv4 = getTrait(service, "aws.auth#sigv4");
  const signing = isRecord(sigv4)
    ? { scheme: "aws-sigv4", ...(typeof sigv4.name === "string" ? { service: sigv4.name } : {}) }
    : undefined;

  const apis: Record<string, PontxAPI> = {};
  for (const reference of service.operations || []) {
    const operationId = reference.target;
    const operation = operationId ? shapes[operationId] : undefined;
    if (!operationId || !operation || operation.type !== "operation") {
      throw new TypeError(`Smithy service references an invalid operation: ${operationId || "unknown"}`);
    }
    const action = localName(operationId);
    const output = responseSchema(operation.output?.target, shapes);
    const errors = (operation.errors || [])
      .map((error) => responseSchema(error.target, shapes))
      .filter((schema): schema is PontxJsonSchema => Boolean(schema));
    apis[`${tagName}/${action}`] = {
      operationId: action,
      summary: action,
      description: documentation(operation),
      tags: [tagName],
      parameters: operation.input?.target
        ? [{
            name: "input",
            in: "body",
            required: true,
            schema: referenceSchema(operation.input.target, shapes),
          } as Parameter]
        : [],
      responses: {
        success: { description: "Successful response", schema: output },
        ...(errors.length ? {
          error: {
            description: "Declared service error",
            schema: { type: "generic", genericRef: { name: "unknown" }, oneOf: errors },
          },
        } : {}),
      },
      rpc: {
        action,
        method: "POST",
        ...(protocol === "aws-query" ? { contentType: "application/x-www-form-urlencoded" } : {}),
      },
    };
  }

  const schemas = Object.fromEntries(Object.entries(shapes)
    .filter(([, shape]) => shape.type !== "service" && shape.type !== "operation")
    .map(([shapeId, shape]) => [localName(shapeId), shapeSchema(shapeId, shape, shapes)]));

  return {
    pontx: "2.1",
    name: options.name,
    info: { title: serviceDocs ? localName(serviceId) : tagName, version: service.version || "" },
    style: PontxStyle.RPC,
    rpc: {
      protocol,
      version: service.version,
      signing,
      endpointRuleSet: getTrait(service, "smithy.rules#endpointRuleSet"),
    },
    tags: [{ name: tagName, ...(serviceDocs ? { description: serviceDocs } : {}) }],
    apis,
    components: { schemas },
  } as PontxSpec;
}
