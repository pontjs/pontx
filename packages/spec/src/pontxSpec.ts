/**
 * @author jasonHzq
 * @description PontxSpec 的统一加载、版本校验、locale 同构校验和 OAS 导入入口。
 */

import { OAS2, OAS3 } from "oas-spec-ts";
import { PontxAPI } from "./api.js";
import { checkIsOas2, parseOAS2 } from "./parse/parseOAS2.js";
import { checkIsOas3, parseOAS3 } from "./parse/parseOAS3.js";
import { PontxSpec, PontxStyle } from "./spec.js";

/** 当前运行时支持的 PontxSpec 协议版本。 */
export const SUPPORTED_PONTX_VERSIONS = ["2.1"] as const;

/** PontxSpec 校验问题。 */
export type PontxSpecValidationIssue = {
  path: string;
  code: string;
  message: string;
};

/** PontxSpec 校验结果。 */
export type PontxSpecValidationResult = {
  valid: boolean;
  issues: PontxSpecValidationIssue[];
};

/** PontxSpec 加载选项。 */
export type LoadPontxSpecOptions = {
  /** 要求规范名与目录产品 slug 一致。 */
  expectedName?: string;
};

/** OAS 导入选项。 */
export type ImportOpenAPIOptions = {
  /** 导入后的稳定 PontxSpec 名称。 */
  name?: string;
};

/** PontxSpec 校验失败。 */
export class PontxSpecValidationError extends Error {
  issues: PontxSpecValidationIssue[];

  constructor(issues: PontxSpecValidationIssue[]) {
    super(issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n"));
    this.name = "PontxSpecValidationError";
    this.issues = issues;
  }
}

const HTTP_METHODS = new Set([
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "OPTIONS",
  "HEAD",
  "PATCH",
  "TRACE",
]);

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function issue(
  issues: PontxSpecValidationIssue[],
  path: string,
  code: string,
  message: string
) {
  issues.push({ path, code, message });
}

function validateApi(
  apiKey: string,
  api: PontxAPI,
  style: PontxStyle,
  issues: PontxSpecValidationIssue[]
) {
  const path = `$.apis.${apiKey}`;
  if (!isRecord(api)) {
    issue(issues, path, "invalid_api", "Endpoint 必须是对象");
    return;
  }
  if (!isRecord(api.responses)) {
    issue(issues, `${path}.responses`, "missing_responses", "Endpoint 必须声明 responses");
  }
  if (api.tags && (!Array.isArray(api.tags)
    || api.tags.some((tag) => typeof tag !== "string" || !tag.trim()))) {
    issue(issues, `${path}.tags`, "invalid_tags", "tags 必须是非空字符串数组");
  }

  if (style === PontxStyle.RPC) {
    if (!isRecord(api.rpc) || typeof api.rpc.action !== "string" || !api.rpc.action.trim()) {
      issue(issues, `${path}.rpc.action`, "missing_rpc_action", "RPC Endpoint 必须声明稳定的 rpc.action");
    }
    return;
  }

  if (style !== PontxStyle.RESTFul) return;

  if (typeof api.path !== "string" || !api.path.startsWith("/")) {
    issue(issues, `${path}.path`, "missing_rest_path", "RESTFul Endpoint 必须声明以 / 开头的 path");
  }
  if (typeof api.method !== "string" || !HTTP_METHODS.has(api.method)) {
    issue(issues, `${path}.method`, "invalid_rest_method", "RESTFul Endpoint 必须声明有效的 HTTP method");
  }
}

/** 校验 PontxSpec 公共结构；HTTP 字段只对 RESTFul 风格生效。 */
export function validatePontxSpec(
  input: unknown,
  options: LoadPontxSpecOptions = {}
): PontxSpecValidationResult {
  const issues: PontxSpecValidationIssue[] = [];
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: [{ path: "$", code: "invalid_document", message: "PontxSpec 必须是对象" }],
    };
  }

  if (!(SUPPORTED_PONTX_VERSIONS as readonly string[]).includes(input.pontx)) {
    issue(
      issues,
      "$.pontx",
      "unsupported_version",
      `pontx 必须是受支持的版本：${SUPPORTED_PONTX_VERSIONS.join(", ")}`
    );
  }
  if (!Object.values(PontxStyle).includes(input.style)) {
    issue(issues, "$.style", "invalid_style", "style 必须显式声明为 RPC、RESTFul 或 GraphQL");
  }
  if (input.style === PontxStyle.RPC
    && (!isRecord(input.rpc) || typeof input.rpc.protocol !== "string" || !input.rpc.protocol.trim())) {
    issue(issues, "$.rpc.protocol", "missing_rpc_protocol", "RPC 契约必须声明稳定的 rpc.protocol");
  }
  if (typeof input.name !== "string" || !input.name.trim()) {
    issue(issues, "$.name", "invalid_name", "name 必须是非空字符串");
  } else if (options.expectedName && input.name !== options.expectedName) {
    issue(issues, "$.name", "unexpected_name", `name 必须与产品 slug ${options.expectedName} 一致`);
  }
  if (!isRecord(input.apis)) {
    issue(issues, "$.apis", "invalid_apis", "apis 必须是以稳定 Endpoint ID 为键的对象");
  } else if (Object.values(PontxStyle).includes(input.style)) {
    for (const [apiKey, api] of Object.entries(input.apis)) {
      if (!apiKey.trim()) {
        issue(issues, "$.apis", "empty_api_key", "Endpoint ID 不能为空");
        continue;
      }
      validateApi(apiKey, api as PontxAPI, input.style, issues);
    }
  }
  if (!isRecord(input.components) || !isRecord(input.components.schemas)) {
    issue(issues, "$.components.schemas", "invalid_schemas", "components.schemas 必须是对象");
  }
  if (input.tags && (!Array.isArray(input.tags)
    || input.tags.some((tag) => !isRecord(tag) || typeof tag.name !== "string"))) {
    issue(issues, "$.tags", "invalid_tag_definitions", "tags 必须包含稳定的 name");
  }

  return { valid: issues.length === 0, issues };
}

/** 从对象或 JSON 文本加载并校验 PontxSpec。 */
export function loadPontxSpec(
  input: unknown,
  options: LoadPontxSpecOptions = {}
): PontxSpec {
  let value = input;
  if (typeof input === "string") {
    try {
      value = JSON.parse(input);
    } catch (error) {
      throw new PontxSpecValidationError([{
        path: "$",
        code: "invalid_json",
        message: error instanceof Error ? error.message : "JSON 解析失败",
      }]);
    }
  }

  const result = validatePontxSpec(value, options);
  if (!result.valid) throw new PontxSpecValidationError(result.issues);
  return value as PontxSpec;
}

const TRANSLATABLE_KEYS = new Set([
  "title",
  "summary",
  "description",
  "stabilityNote",
  "disabledReason",
]);

const IDENTIFIER_MAP_KEYS = new Set([
  "$defs",
  "callbacks",
  "definitions",
  "headers",
  "links",
  "parameters",
  "properties",
  "requestBodies",
  "responses",
  "schemas",
  "securitySchemes",
  "webhooks",
]);

function isLiteralBranch(segments: string[]): boolean {
  return segments.some((segment, index) => {
    if (segment === "value" && segments[index - 2] === "examples") return true;
    if (IDENTIFIER_MAP_KEYS.has(segments[index - 1])) return false;
    if (segment === "examples" && segments[index - 1] === "components") return false;
    return ["example", "examples", "enum", "const", "default", "request"].includes(segment);
  });
}

function isOAuthScopeText(segments: string[]): boolean {
  const scopesIndex = segments.lastIndexOf("scopes");
  return scopesIndex >= 0
    && segments.includes("securitySchemes")
    && scopesIndex === segments.length - 2;
}

/** 去除允许翻译的文案值，同时保留字段存在性和所有协议语义。 */
function localeShape(value: unknown, segments: string[] = []): unknown {
  const key = segments.at(-1) ?? "";
  const namedExampleText = segments.at(-3) === "examples"
    && (key === "summary" || key === "description");
  const requestExampleText = segments.includes("requestExamples") && key === "summary";
  if (typeof value === "string" && (
    ["stabilityNote", "disabledReason"].includes(key)
    || segments.includes("x-enum-descriptions")
    || isOAuthScopeText(segments)
    || namedExampleText
    || requestExampleText
    || (TRANSLATABLE_KEYS.has(key) && !isLiteralBranch(segments))
  )) return "<translated>";
  if (key === "enumValueTitles" && isRecord(value)) {
    return Object.fromEntries(Object.keys(value).sort().map((name) => [name, "<translated>"]));
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => localeShape(item, [...segments, String(index)]));
  }
  if (!isRecord(value)) return value;

  return Object.fromEntries(Object.keys(value).sort()
    .map((name) => [name, localeShape(value[name], [...segments, name])]));
}

function firstShapeDifference(
  base: unknown,
  locale: unknown,
  path = "$"
): { path: string; base: unknown; locale: unknown } | undefined {
  if (Object.is(base, locale)) return undefined;
  if (Array.isArray(base) && Array.isArray(locale)) {
    if (base.length !== locale.length) return { path, base: base.length, locale: locale.length };
    for (let index = 0; index < base.length; index += 1) {
      const difference = firstShapeDifference(base[index], locale[index], `${path}[${index}]`);
      if (difference) return difference;
    }
    return undefined;
  }
  if (isRecord(base) && isRecord(locale)) {
    const baseKeys = Object.keys(base);
    const localeKeys = Object.keys(locale);
    if (JSON.stringify(baseKeys) !== JSON.stringify(localeKeys)) {
      return { path, base: baseKeys, locale: localeKeys };
    }
    for (const key of baseKeys) {
      const difference = firstShapeDifference(base[key], locale[key], `${path}.${key}`);
      if (difference) return difference;
    }
    return undefined;
  }
  return { path, base, locale };
}

/** 验证 locale PontxSpec 只能改动可翻译文案。 */
export function validatePontxSpecLocale(
  baseInput: unknown,
  localeInput: unknown
): PontxSpecValidationResult {
  const base = loadPontxSpec(baseInput);
  const locale = loadPontxSpec(localeInput);
  const baseShape = JSON.stringify(localeShape(base));
  const localeStructure = JSON.stringify(localeShape(locale));
  if (baseShape === localeStructure) return { valid: true, issues: [] };
  const difference = firstShapeDifference(localeShape(base), localeShape(locale));

  return {
    valid: false,
    issues: [{
      path: difference?.path ?? "$",
      code: "locale_structure_mismatch",
      message: `locale PontxSpec 只能修改允许的文案；结构差异位于 ${difference?.path ?? "$"}`,
    }],
  };
}

/** 将 OAS2/OAS3 一次性导入为可独立维护的 PontxSpec。 */
export function importOpenAPI(
  input: unknown,
  options: ImportOpenAPIOptions = {}
): PontxSpec {
  if (!isRecord(input)) {
    throw new TypeError("OpenAPI document must be an object");
  }

  const name = options.name
    ?? (typeof input["x-pontx-name"] === "string" ? input["x-pontx-name"] : undefined)
    ?? (typeof input.info?.title === "string" ? input.info.title : "imported-api");
  let spec: PontxSpec;
  if (checkIsOas3(input)) {
    spec = parseOAS3(input as OAS3.OpenAPIObject, name);
  } else if (checkIsOas2(input as OAS2.SwaggerObject)) {
    spec = parseOAS2(input as OAS2.SwaggerObject, name);
  } else {
    throw new TypeError("Only OpenAPI 2.0 and OpenAPI 3.x documents can be imported");
  }

  spec.pontx = SUPPORTED_PONTX_VERSIONS[0];
  spec.style = PontxStyle.RESTFul;
  return loadPontxSpec(spec, { expectedName: name });
}
