/**
 * @author jasonHzq
 * @description 使用真实请求构造器验证全部 PontxAPI 的 CLI 可调用性
 */

import type { PontxAPI, PontxJsonSchema, PontxSpec, QualityFinding } from "@pontx/spec";
import { QualitySeverity } from "@pontx/spec";
import { buildApiRequest } from "../builtin/apiExecutor";
import { createLogger } from "../logger/logger";
import type { ApiExecutionContext } from "../types";

/** 从显式叶子 examples 递归构造值。 */
export function exampleForSchema(
  schema: PontxJsonSchema | undefined,
  spec: PontxSpec,
  seen = new Set<string>(),
): unknown {
  if (!schema) return undefined;
  if (schema.$ref) {
    const name = schema.$ref.split("/").pop() || "";
    if (seen.has(name)) return undefined;
    seen.add(name);
    return exampleForSchema(spec.components?.schemas?.[name], spec, seen);
  }
  if (!(["object", "array", "generic"] as unknown[]).includes(schema.type) && schema.examples?.length) {
    return schema.examples[0];
  }
  const allOf = (schema as PontxJsonSchema & { allOf?: PontxJsonSchema[] }).allOf;
  if (allOf?.length) {
    const result: Record<string, unknown> = {};
    const required = new Set<string>();
    for (const branch of allOf) {
      for (const name of branch.required || []) required.add(name);
      const branchValue = exampleForSchema(branch, spec, new Set(seen));
      if (branchValue && typeof branchValue === "object" && !Array.isArray(branchValue)) {
        Object.assign(result, branchValue);
      }
    }
    return Array.from(required).every((name) => result[name] !== undefined) ? result : undefined;
  }
  if (schema.type === "array") {
    const item = exampleForSchema(schema.items, spec, new Set(seen));
    return item === undefined ? undefined : [item];
  }
  if (schema.type === "object" || schema.properties) {
    const result: Record<string, unknown> = {};
    for (const [name, property] of Object.entries(schema.properties || {})) {
      const value = exampleForSchema(property, spec, new Set(seen));
      if (value !== undefined) result[name] = value;
    }
    const required = schema.required || [];
    return required.every((name) => result[name] !== undefined) ? result : undefined;
  }
  if (schema.type === "generic" && schema.genericRef?.typeArguments?.length) {
    return exampleForSchema(schema.genericRef.typeArguments[0], spec, new Set(seen));
  }
  return undefined;
}

function requiredParams(api: PontxAPI, spec: PontxSpec): { params: Record<string, unknown>; missing: string[] } {
  const params: Record<string, unknown> = {};
  const missing: string[] = [];
  for (const parameter of api.parameters || []) {
    if (!parameter.required) continue;
    const value = exampleForSchema(parameter.schema, spec);
    if (value === undefined) missing.push(parameter.name);
    else params[parameter.name] = value;
  }
  return { params, missing };
}

/** 对所有 API 构造请求，确保必填示例可以形成无占位符请求。 */
export async function validatePontxCliCompatibility(spec: PontxSpec): Promise<{
  coverage: number;
  findings: QualityFinding[];
}> {
  const findings: QualityFinding[] = [];
  const entries = Object.entries(spec.apis || {});
  let passed = 0;
  const baseURL = spec.servers?.[0]?.url || "https://pontx-eval.invalid";
  for (const [apiKey, api] of entries) {
    const { params, missing } = requiredParams(api, spec);
    if (missing.length) {
      findings.push({
        ruleId: "deterministic.required-examples",
        severity: QualitySeverity.Error,
        path: `$.apis[${JSON.stringify(apiKey)}].parameters`,
        message: `必填参数无法从叶子 examples 构造：${missing.join(", ")}。`,
        remediation: "补齐所有必填参数 Schema 的叶子 examples。",
        affectedApis: [apiKey],
      });
      continue;
    }
    const [tagName, apiName] = apiKey.includes("/") ? apiKey.split("/") : ["", apiKey];
    const context: ApiExecutionContext = {
      api: { specName: spec.name, tagName, apiName },
      meta: {
        path: api.path, method: api.method, description: api.description,
        parameters: api.parameters, responses: api.responses,
        consumes: api.consumes, produces: api.produces,
      },
      params,
      executeApiConfig: { baseURL },
      resolvedConfig: {
        origins: [{ name: spec.name, spec }], rootDir: "", configDir: "",
      } as ApiExecutionContext["resolvedConfig"],
      logger: createLogger("silent"),
    };
    try {
      const request = await buildApiRequest(context);
      if (/\{[^}]+\}/.test(request.url)) throw new Error(`unresolved path placeholder in ${request.url}`);
      passed++;
    } catch (error) {
      findings.push({
        ruleId: "deterministic.request",
        severity: QualitySeverity.Critical,
        path: `$.apis[${JSON.stringify(apiKey)}]`,
        message: `CLI 请求构造失败：${error instanceof Error ? error.message : String(error)}`,
        remediation: "修复 path 参数、server、body 或媒体类型定义。",
        affectedApis: [apiKey],
      });
    }
  }
  return { coverage: entries.length ? passed / entries.length : 0, findings };
}
