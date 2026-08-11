/**
 * @author jasonHzq
 * @description 使用 PontxSpec 响应 Schema 离线校验动态评估 fixture
 */

import {
  QualitySeverity,
  type PontxAPI,
  type PontxJsonSchema,
  type PontxSpec,
  type QualityFinding,
} from "@pontx/spec";
import type { PontxEvalCase } from "./types";

type ExtendedSchema = PontxJsonSchema & {
  allOf?: PontxJsonSchema[];
  anyOf?: PontxJsonSchema[];
  oneOf?: PontxJsonSchema[];
  nullable?: boolean;
};

interface SchemaViolation {
  pointer: string;
  message: string;
}

interface ValidationContext {
  spec: PontxSpec;
  refs: Set<string>;
}

const MAX_FINDINGS_PER_CASE = 20;

function escapePointerSegment(value: string): string {
  return value.replace(/~/g, "~0").replace(/\//g, "~1");
}

function equalValue(left: unknown, right: unknown): boolean {
  return Object.is(left, right) || JSON.stringify(left) === JSON.stringify(right);
}

function resolveLocalRef(spec: PontxSpec, ref: string): PontxJsonSchema | undefined {
  if (!ref.startsWith("#/")) return undefined;
  let current: unknown = spec;
  for (const rawSegment of ref.slice(2).split("/")) {
    const segment = rawSegment.replace(/~1/g, "/").replace(/~0/g, "~");
    if (!current || typeof current !== "object" || !(segment in current)) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current && typeof current === "object" ? current as PontxJsonSchema : undefined;
}

function validateType(schema: PontxJsonSchema, value: unknown): boolean {
  switch (schema.type) {
    case "array": return Array.isArray(value);
    case "boolean": return typeof value === "boolean";
    case "integer": return typeof value === "number" && Number.isInteger(value);
    case "number": return typeof value === "number" && Number.isFinite(value);
    case "object": return !!value && typeof value === "object" && !Array.isArray(value);
    case "string": return typeof value === "string";
    default: return true;
  }
}

function typeLabel(schema: PontxJsonSchema): string {
  return schema.type || "declared schema";
}

function validateSchema(
  schema: PontxJsonSchema,
  value: unknown,
  pointer: string,
  context: ValidationContext,
): SchemaViolation[] {
  const extended = schema as ExtendedSchema;
  const violations: SchemaViolation[] = [];
  if (value === null && extended.nullable) return [];
  if (schema.$ref) {
    const visitKey = `${schema.$ref}\u0000${pointer}`;
    if (context.refs.has(visitKey)) return [];
    const resolved = resolveLocalRef(context.spec, schema.$ref);
    if (!resolved) return [{ pointer, message: `无法解析响应 Schema 引用 ${schema.$ref}。` }];
    const refs = new Set(context.refs);
    refs.add(visitKey);
    return validateSchema(resolved, value, pointer, { ...context, refs });
  }
  if (schema.const !== undefined && !equalValue(schema.const, value)) {
    return [{ pointer, message: `响应值不等于声明的 const ${JSON.stringify(schema.const)}。` }];
  }
  if (schema.enum?.length && !schema.enum.some((item) => equalValue(item, value))) {
    return [{ pointer, message: `响应值 ${JSON.stringify(value)} 不在声明的 enum ${JSON.stringify(schema.enum)} 中。` }];
  }
  if (extended.allOf?.length) {
    violations.push(...extended.allOf.flatMap((branch) => validateSchema(branch, value, pointer, context)));
  }
  if (extended.anyOf?.length) {
    const alternatives = extended.anyOf.map((branch) => validateSchema(branch, value, pointer, context));
    if (!alternatives.some((branchViolations) => branchViolations.length === 0)) {
      violations.push({ pointer, message: "响应值不符合任一 anyOf 分支。" });
    }
  }
  if (extended.oneOf?.length) {
    const matches = extended.oneOf.filter((branch) => validateSchema(branch, value, pointer, context).length === 0);
    if (matches.length !== 1) {
      violations.push({ pointer, message: `响应值匹配 ${matches.length} 个 oneOf 分支，期望恰好匹配一个。` });
    }
  }
  if (!validateType(schema, value)) {
    return [{ pointer, message: `响应值类型不符合声明的 ${typeLabel(schema)}。` }];
  }
  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      violations.push({ pointer, message: `响应字符串长度小于 minLength ${schema.minLength}。` });
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      violations.push({ pointer, message: `响应字符串长度大于 maxLength ${schema.maxLength}。` });
    }
    if (schema.pattern) {
      try {
        if (!new RegExp(schema.pattern).test(value)) {
          violations.push({ pointer, message: `响应字符串不符合 pattern ${schema.pattern}。` });
        }
      } catch {
        // 无效 pattern 属于 Metadata 自身的静态契约问题，不在 fixture 校验中猜测语义。
      }
    }
  }
  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) {
      violations.push({ pointer, message: `响应数值小于 minimum ${schema.minimum}。` });
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      violations.push({ pointer, message: `响应数值大于 maximum ${schema.maximum}。` });
    }
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      violations.push({ pointer, message: `响应数组长度小于 minItems ${schema.minItems}。` });
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      violations.push({ pointer, message: `响应数组长度大于 maxItems ${schema.maxItems}。` });
    }
    if (schema.items) {
      value.forEach((item, index) => {
        violations.push(...validateSchema(schema.items!, item, `${pointer}/${index}`, context));
      });
    }
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    for (const required of schema.required || []) {
      if (!Object.prototype.hasOwnProperty.call(record, required)) {
        violations.push({
          pointer: `${pointer}/${escapePointerSegment(required)}`,
          message: `响应对象缺少必填字段 ${required}。`,
        });
      }
    }
    for (const [name, propertySchema] of Object.entries(schema.properties || {})) {
      if (Object.prototype.hasOwnProperty.call(record, name)) {
        violations.push(...validateSchema(
          propertySchema,
          record[name],
          `${pointer}/${escapePointerSegment(name)}`,
          context,
        ));
      }
    }
  }
  return violations;
}

function responseSchema(api: PontxAPI, status: number): PontxJsonSchema | undefined {
  const exact = api.responses?.[String(status)];
  const wildcard = api.responses?.[`${Math.floor(status / 100)}XX`]
    || api.responses?.[`${Math.floor(status / 100)}xx`];
  return exact?.schema || wildcard?.schema;
}

/** 校验成功 fixture 响应；非 2xx 或未声明 Schema 时不推断响应契约。 */
export function validateFixtureResponse(
  spec: PontxSpec,
  api: PontxAPI,
  item: PontxEvalCase,
): QualityFinding[] {
  const status = item.fixture.status ?? 200;
  if (status < 200 || status >= 300) return [];
  const schema = responseSchema(api, status);
  if (!schema) return [];
  const root = `eval:${item.id}#/fixture/data`;
  const violations = validateSchema(schema, item.fixture.data, root, { spec, refs: new Set() });
  return violations.slice(0, MAX_FINDINGS_PER_CASE).map((violation) => ({
    ruleId: "dynamic.response-schema-conformance",
    severity: QualitySeverity.Error,
    path: violation.pointer,
    message: violation.message,
    remediation: "使成功响应 Metadata Schema 与权威 fixture 一致；不要修改 golden fixture 来迎合错误 Metadata。",
    affectedApis: [item.expected.api],
  }));
}
