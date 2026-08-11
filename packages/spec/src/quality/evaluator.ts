/**
 * @author jasonHzq
 * @description PontxSpec 静态质量规则、递归 Schema 检查与 50 分制评分
 */

import { PontxDirectoryNode, PontxDirectoryNodeType } from "../dir.js";
import {
  PontxRequestInputSourceKind,
  type Parameter,
  type PontxAPI,
  type PontxRequestExample,
} from "../api.js";
import type { PontxJsonSchema } from "../schema.js";
import type { PontxSpec } from "../spec.js";
import {
  PontxQualityInput,
  PontxQualityReport,
  QualityConfidence,
  QualityDimensionScore,
  QualityFinding,
  QualityGrade,
  QualitySeverity,
} from "./types.js";
import {
  collectProse,
  constraintsAreConsistent,
  getQualityGrade,
  isExampleMeaningful,
  isExampleValid,
  isText,
  round,
  stableValue,
  stripProse,
} from "./helpers.js";

interface DimensionDefinition {
  id: string;
  title: string;
  weight: number;
}

interface EntityCounter {
  checked: number;
  passed: number;
}

interface DimensionCounter extends EntityCounter {
  definition: DimensionDefinition;
  entities: Map<string, EntityCounter>;
}

type FindingInput = Omit<QualityFinding, "severity"> & { severity?: QualitySeverity };
type RecordCheck = (
  dimension: string,
  entity: string,
  passed: boolean,
  finding?: FindingInput,
) => void;

const DIMENSIONS: DimensionDefinition[] = [
  { id: "structure", title: "PontxSpec 结构与引用", weight: 6 },
  { id: "directory", title: "目录与可发现性", weight: 6 },
  { id: "contract", title: "Endpoint 调用契约", weight: 8 },
  { id: "description", title: "描述与约束", weight: 10 },
  { id: "examples", title: "叶子字段示例", weight: 6 },
  { id: "requestExamples", title: "整体请求示例", weight: 4 },
  { id: "runtime", title: "响应、鉴权与环境", weight: 5 },
  { id: "i18n", title: "国际化对齐", weight: 5 },
];

const VALID_METHODS = new Set([
  "GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH", "TRACE",
]);
const VALID_PARAM_LOCATIONS = new Set(["query", "body", "path", "formData", "header"]);

const STRUCTURAL_ALLOF_BRANCH_KEYS = new Set([
  "type", "required", "multipleOf", "maximum", "exclusiveMaximum", "minimum",
  "exclusiveMinimum", "maxLength", "minLength", "pattern", "format",
  "contentMediaType", "contentEncoding", "maxItems", "minItems", "uniqueItems",
  "maxProperties", "minProperties", "additionalProperties", "nullable",
]);

/** 判断字段是否已在父 Schema 或其 allOf 引用链中获得面向用户的说明。 */
function hasDocumentedProperty(
  schema: PontxJsonSchema,
  propertyName: string,
  schemas: Record<string, PontxJsonSchema>,
  seen = new Set<PontxJsonSchema>(),
): boolean {
  if (seen.has(schema)) return false;
  seen.add(schema);
  if (schema.$ref?.startsWith("#/components/schemas/")) {
    const name = schema.$ref.split("/").pop() || "";
    return !!schemas[name] && hasDocumentedProperty(schemas[name], propertyName, schemas, seen);
  }
  const property = schema.properties?.[propertyName];
  if (property && (isText(property.description) || isText(property.title))) return true;
  const allOf = (schema as PontxJsonSchema & { allOf?: PontxJsonSchema[] }).allOf || [];
  return allOf.some((branch) => hasDocumentedProperty(branch, propertyName, schemas, seen));
}

/**
 * 匿名 allOf 分支若只收紧已描述字段的结构约束，可继承父 Schema 的说明。
 * 含属性、枚举、常量或嵌套 Schema 的分支仍需独立说明，避免隐藏新的业务语义。
 */
function canInheritAllOfBranchDescription(
  branch: PontxJsonSchema,
  parent: PontxJsonSchema,
  schemas: Record<string, PontxJsonSchema>,
): boolean {
  if (!isText(parent.description) && !isText(parent.title)) return false;
  if (isText(branch.description) || isText(branch.title)) return false;
  const keys = Object.keys(branch);
  if (!keys.length || !keys.every((key) => STRUCTURAL_ALLOF_BRANCH_KEYS.has(key))) return false;
  if (branch.required !== undefined && !Array.isArray(branch.required)) return false;
  if (branch.additionalProperties !== undefined
    && typeof branch.additionalProperties !== "boolean") return false;
  return (branch.required || []).every((propertyName) =>
    hasDocumentedProperty(parent, propertyName, schemas));
}

/** 评估 PontxSpec 静态质量并返回可机器消费的报告。 */
export function evaluatePontxQuality(input: PontxQualityInput): PontxQualityReport {
  const spec = input?.spec;
  const findings: QualityFinding[] = [];
  const counters = new Map<string, DimensionCounter>(DIMENSIONS.map((definition) => [
    definition.id,
    { definition, checked: 0, passed: 0, entities: new Map() },
  ]));

  const record = (
    dimension: string,
    entity: string,
    passed: boolean,
    finding?: FindingInput,
  ) => {
    const counter = counters.get(dimension)!;
    counter.checked++;
    if (passed) counter.passed++;
    const entityCounter = counter.entities.get(entity) || { checked: 0, passed: 0 };
    entityCounter.checked++;
    if (passed) entityCounter.passed++;
    counter.entities.set(entity, entityCounter);
    if (!passed && finding) {
      findings.push({ ...finding, severity: finding.severity || QualitySeverity.Error });
    }
  };

  if (!spec || typeof spec !== "object" || !spec.apis || typeof spec.apis !== "object") {
    const invalid: QualityFinding = {
      ruleId: "structure.loadable",
      severity: QualitySeverity.Critical,
      path: "$",
      message: "输入不是可加载的 PontxSpec，或缺少 apis。",
      remediation: "提供包含 name、apis 和有效 PontxAPI 定义的 PontxSpec JSON。",
    };
    return {
      score: null,
      grade: QualityGrade.Invalid,
      staticScore: 0,
      dynamicScore: null,
      provisional: true,
      coverage: {},
      confidence: QualityConfidence.Low,
      dimensions: [],
      criticals: [invalid],
      findings: [invalid],
      metadata: { apiCount: 0, schemaCount: 0, locales: [], generatedAt: new Date().toISOString() },
    };
  }

  const apis = spec.apis || {};
  const schemas = spec.components?.schemas || {};
  const operationIds = new Set(Object.entries(apis).map(([apiKey, api]) =>
    api.operationId || apiKey.split("/").pop() || apiKey));
  record("structure", "spec", isText(spec.name), {
    ruleId: "structure.spec-name", path: "$.name", message: "PontxSpec 缺少 name。",
    remediation: "填写稳定且非空的 PontxSpec name。",
  });
  record("structure", "spec", Object.keys(apis).length > 0, {
    ruleId: "structure.apis", path: "$.apis", message: "PontxSpec 没有 API。",
    remediation: "至少声明一个 PontxAPI。", severity: QualitySeverity.Critical,
  });
  record("description", "spec", isText(spec.info?.title) && isText(spec.info?.description), {
    ruleId: "description.spec", path: "$.info", message: "PontxSpec info 缺少 title 或 description。",
    remediation: "填写 API 集合的名称、用途和边界说明。",
  });

  const schemaUsers = new Map<string, Set<string>>();
  const noteSchemaUser = (ref: string, apiKey: string) => {
    const name = ref.split("/").pop() || ref;
    const users = schemaUsers.get(name) || new Set<string>();
    users.add(apiKey);
    schemaUsers.set(name, users);
  };
  const seenSchemas = new Set<PontxJsonSchema>();
  const checkedRefs = new Set<string>();

  const visitSchema = (
    schema: PontxJsonSchema | undefined,
    path: string,
    entity: string,
    apiKey?: string,
    descriptionOptional = false,
  ) => {
    if (!schema || typeof schema !== "object") {
      record("structure", entity, false, {
        ruleId: "structure.schema", path, message: "Schema 缺失或不是对象。",
        remediation: "提供有效的 PontxJsonSchema。",
      });
      return;
    }
    if (schema.$ref) {
      if (apiKey) noteSchemaUser(schema.$ref, apiKey);
      const name = schema.$ref.split("/").pop() || "";
      const target = schema.$ref.startsWith("#/components/schemas/") ? schemas[name] : undefined;
      const refEntity = `schema:${name || schema.$ref}`;
      if (!checkedRefs.has(schema.$ref)) {
        checkedRefs.add(schema.$ref);
        record("structure", refEntity, !!target, {
          ruleId: "structure.ref", path: `${path}.$ref`, message: `无法解析 Schema 引用 ${schema.$ref}。`,
          remediation: "修正 $ref，确保目标存在于 components.schemas。", severity: QualitySeverity.Critical,
          affectedApis: apiKey ? [apiKey] : undefined,
        });
      }
      if (target) visitSchema(target, `$.components.schemas[${JSON.stringify(name)}]`, refEntity, apiKey);
      return;
    }
    if (seenSchemas.has(schema)) return;
    seenSchemas.add(schema);

    const type = schema.type;
    const schemaRecord = schema as PontxJsonSchema & {
      allOf?: PontxJsonSchema[];
      anyOf?: PontxJsonSchema[];
      oneOf?: PontxJsonSchema[];
      not?: PontxJsonSchema;
    };
    const compositions = [schemaRecord.allOf, schemaRecord.anyOf, schemaRecord.oneOf]
      .filter(Array.isArray) as PontxJsonSchema[][];
    const hasComposition = compositions.some((items) => items.length > 0) || !!schemaRecord.not;
    record("structure", entity, isText(type) || hasComposition, {
      ruleId: "structure.schema-type", path: `${path}.type`, message: "Schema 缺少 type。",
      remediation: "为 Schema 声明 PontxSpec 支持的明确 type 或有效组合结构。", affectedApis: apiKey ? [apiKey] : undefined,
    });
    record("description", entity, descriptionOptional || isText(schema.description) || isText(schema.title), {
      ruleId: "description.schema", path, message: "Schema 或字段缺少描述。",
      remediation: "填写面向使用者的 title 或 description。", affectedApis: apiKey ? [apiKey] : undefined,
    });
    record("description", entity, constraintsAreConsistent(schema), {
      ruleId: "constraints.consistent", path, message: "Schema 约束互相冲突、枚举重复或 required 指向不存在的属性。",
      remediation: "修正范围、长度、枚举或 required/properties 定义。", affectedApis: apiKey ? [apiKey] : undefined,
    });

    const isContainer = type === "object" || type === "array" || type === "generic"
      || !!schema.properties || !!schema.items || !!schema.genericRef || hasComposition;
    if (!isContainer) {
      const hasExamples = Array.isArray(schema.examples) && schema.examples.length > 0;
      record("examples", entity, hasExamples, {
        ruleId: "examples.leaf", path: `${path}.examples`, message: "叶子字段缺少显式 examples。",
        remediation: "添加至少一个符合类型和约束的 examples 值；default、const、enum 不替代示例。",
        affectedApis: apiKey ? [apiKey] : undefined,
      });
      if (hasExamples) {
        record("examples", entity, schema.examples!.every((value) =>
          isExampleValid(schema, value) && isExampleMeaningful(schema, value)), {
          ruleId: "examples.valid", path: `${path}.examples`, message: "示例值不符合字段类型、枚举或约束，或为明显占位值。",
          remediation: "将 examples 修正为能通过当前 Schema 约束的真实值。",
          affectedApis: apiKey ? [apiKey] : undefined,
        });
      }
    }

    if (type === "array") {
      record("structure", entity, !!schema.items, {
        ruleId: "structure.array-items", path: `${path}.items`, message: "数组 Schema 缺少 items。",
        remediation: "声明数组元素 PontxJsonSchema。", affectedApis: apiKey ? [apiKey] : undefined,
      });
    }
    if (schema.items) visitSchema(schema.items, `${path}.items`, entity, apiKey);
    for (const [propertyName, property] of Object.entries(schema.properties || {})) {
      visitSchema(property, `${path}.properties[${JSON.stringify(propertyName)}]`, entity, apiKey);
    }
    if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
      visitSchema(schema.additionalProperties, `${path}.additionalProperties`, entity, apiKey);
    }
    for (const [index, argument] of (schema.genericRef?.typeArguments || []).entries()) {
      visitSchema(argument, `${path}.genericRef.typeArguments[${index}]`, entity, apiKey);
    }
    for (const keyword of ["allOf", "anyOf", "oneOf"] as const) {
      for (const [index, branch] of (schemaRecord[keyword] || []).entries()) {
        const isStructuralAllOfBranch = keyword === "allOf"
          && canInheritAllOfBranchDescription(branch, schema, schemas);
        visitSchema(branch, `${path}.${keyword}[${index}]`, entity, apiKey, isStructuralAllOfBranch);
      }
    }
    if (schemaRecord.not) visitSchema(schemaRecord.not, `${path}.not`, entity, apiKey);
    if (schema.enum?.length) {
      const titles = schema.enumValueTitles || {};
      record("description", entity, schema.enum.every((value) => isText(titles[String(value)])), {
        ruleId: "description.enum-values", path: `${path}.enumValueTitles`,
        message: "枚举值缺少 enumValueTitles 描述。",
        remediation: "为每个 enum 值添加对应的 enumValueTitles。", affectedApis: apiKey ? [apiKey] : undefined,
      });
    }
  };

  for (const [schemaName, schema] of Object.entries(schemas)) {
    visitSchema(schema, `$.components.schemas[${JSON.stringify(schemaName)}]`, `schema:${schemaName}`);
  }

  for (const [apiKey, api] of Object.entries(apis)) {
    const apiPath = `$.apis[${JSON.stringify(apiKey)}]`;
    const keyParts = apiKey.split("/");
    record("structure", `api:${apiKey}`, isText(apiKey) && keyParts.length <= 2 && keyParts.every(isText), {
      ruleId: "structure.api-key", path: apiPath, message: `API key "${apiKey}" 不能被 CLI 稳定寻址。`,
      remediation: "使用 apiName 或 tag/apiName 两级 key。", severity: QualitySeverity.Critical,
      affectedApis: [apiKey],
    });
    record("description", `api:${apiKey}`, isText(api.description) || isText(api.summary), {
      ruleId: "description.api", path: apiPath, message: "API 缺少 summary/description。",
      remediation: "填写能表达用途、输入和副作用的 API 描述。", affectedApis: [apiKey],
    });
    record("contract", `api:${apiKey}`, isText(api.path) && api.path.startsWith("/"), {
      ruleId: "contract.path", path: `${apiPath}.path`, message: "API path 缺失或不是绝对路径。",
      remediation: "使用以 / 开始并包含明确占位符的 path。", affectedApis: [apiKey],
    });
    record("contract", `api:${apiKey}`, VALID_METHODS.has(String(api.method).toUpperCase()), {
      ruleId: "contract.method", path: `${apiPath}.method`, message: "API method 缺失或不受支持。",
      remediation: "使用 PontxAPI 支持的大写 HTTP method。", affectedApis: [apiKey],
    });

    const params = api.parameters || [];
    const parameterKeys = new Set<string>();
    for (const [index, parameter] of params.entries()) {
      const paramPath = `${apiPath}.parameters[${index}]`;
      const parameterKey = `${parameter.in}:${parameter.name}`;
      record("contract", `api:${apiKey}`, isText(parameter.name) && VALID_PARAM_LOCATIONS.has(parameter.in), {
        ruleId: "contract.parameter", path: paramPath, message: "参数 name 或 in 非法。",
        remediation: "填写非空参数名及受支持的位置。", affectedApis: [apiKey],
      });
      record("contract", `api:${apiKey}`, !parameterKeys.has(parameterKey), {
        ruleId: "contract.parameter-unique", path: paramPath, message: `参数 ${parameterKey} 重复。`,
        remediation: "同一 API 中保持 in/name 组合唯一。", affectedApis: [apiKey],
      });
      parameterKeys.add(parameterKey);
      const parameterRefName = parameter.schema?.$ref?.split("/").pop() || "";
      const parameterRefTarget = parameterRefName ? schemas[parameterRefName] : undefined;
      record("description", `api:${apiKey}`, isText(parameter.schema?.description)
        || isText(parameterRefTarget?.description) || isText(parameterRefTarget?.title), {
        ruleId: "description.parameter", path: `${paramPath}.schema.description`, message: `参数 ${parameter.name} 缺少描述。`,
        remediation: "在 parameter.schema.description 中说明语义、格式和限制。", affectedApis: [apiKey],
      });
      visitSchema(parameter.schema, `${paramPath}.schema`, `api:${apiKey}`, apiKey);
    }
    const placeholders = Array.from(api.path?.matchAll?.(/\{([^}]+)\}/g) || []).map((match) => match[1]).sort();
    const pathParams = params.filter((parameter) => parameter.in === "path");
    const declaredPathParams = pathParams.map((parameter) => parameter.name).sort();
    record("contract", `api:${apiKey}`,
      JSON.stringify(placeholders) === JSON.stringify(declaredPathParams) && pathParams.every((parameter) => parameter.required), {
        ruleId: "contract.path-parameters", path: `${apiPath}.parameters`,
        message: "path 占位符与必填 path 参数不一致。",
        remediation: "为每个占位符声明同名且 required=true 的 path 参数，并移除多余参数。",
        severity: QualitySeverity.Critical, affectedApis: [apiKey],
      });
    record("contract", `api:${apiKey}`, params.filter((parameter) => parameter.in === "body").length <= 1, {
      ruleId: "contract.body-count", path: `${apiPath}.parameters`, message: "一个 API 声明了多个 body 参数。",
      remediation: "合并为一个 object body Schema。", affectedApis: [apiKey],
    });
    checkRequestExamples(api, apiKey, apiPath, spec, operationIds, record);
    checkRuntime(api, apiKey, apiPath, spec, record, visitSchema);
  }

  checkDirectory(input.directory || PontxDirectoryNode.constructorPontxDir(spec), apis, schemas, record);
  checkLocales(input, spec, record);

  const dimensions: QualityDimensionScore[] = DIMENSIONS.map((definition) => {
    const counter = counters.get(definition.id)!;
    const micro = counter.checked ? counter.passed / counter.checked : 1;
    const entityRatios = Array.from(counter.entities.values()).map((entity) => entity.checked ? entity.passed / entity.checked : 1);
    const macro = entityRatios.length ? entityRatios.reduce((sum, value) => sum + value, 0) / entityRatios.length : 1;
    const coverage = (micro + macro) / 2;
    return {
      id: definition.id, title: definition.title, weight: definition.weight,
      score: round(definition.weight * coverage), coverage: round(coverage),
      checked: counter.checked, passed: counter.passed,
    };
  });
  const staticScore = round(dimensions.reduce((sum, dimension) => sum + dimension.score, 0));
  const criticals = findings.filter((finding) => finding.severity === QualitySeverity.Critical);
  const projectedScore = round(staticScore * 2);
  return {
    score: projectedScore,
    grade: getQualityGrade(projectedScore, criticals.length > 0),
    staticScore,
    dynamicScore: null,
    provisional: true,
    coverage: Object.fromEntries(dimensions.map((dimension) => [dimension.id, dimension.coverage])),
    confidence: QualityConfidence.Medium,
    dimensions,
    criticals,
    findings,
    metadata: {
      specName: spec.name,
      apiCount: Object.keys(apis).length,
      schemaCount: Object.keys(schemas).length,
      locales: Object.keys(input.locales || {}),
      generatedAt: new Date().toISOString(),
    },
  };
}

const REQUEST_EXAMPLE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FORBIDDEN_EXAMPLE_HEADERS = new Set([
  "authorization", "cookie", "host", "proxy-authorization", "x-api-key",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function hasOwn(value: unknown, key: string): boolean {
  return isRecord(value) && Object.prototype.hasOwnProperty.call(value, key);
}

function isRequestScalar(value: unknown): value is string | number | boolean {
  return ["string", "number", "boolean"].includes(typeof value)
    && (typeof value !== "number" || Number.isFinite(value));
}

function requestValues(request: Record<string, unknown>, location: string): Record<string, unknown> {
  const key = location === "header" ? "headers" : location;
  return isRecord(request[key]) ? request[key] as Record<string, unknown> : {};
}

function escapeJsonPointer(value: string): string {
  return value.replace(/~/g, "~0").replace(/\//g, "~1");
}

function isRequestBodyValid(
  schema: PontxJsonSchema,
  value: unknown,
  schemas: Record<string, PontxJsonSchema>,
  unresolved: Set<string>,
  pointer = "",
  seen = new Set<PontxJsonSchema>(),
): boolean {
  if (value === null) return isExampleValid(schema, value);
  if (schema.$ref) {
    const name = schema.$ref.startsWith("#/components/schemas/")
      ? schema.$ref.split("/").pop() || ""
      : "";
    return !!schemas[name] && isRequestBodyValid(schemas[name], value, schemas, unresolved, pointer, seen);
  }
  if (seen.has(schema)) return true;
  const nextSeen = new Set(seen).add(schema);
  const composed = schema as PontxJsonSchema & {
    allOf?: PontxJsonSchema[];
    anyOf?: PontxJsonSchema[];
    oneOf?: PontxJsonSchema[];
  };
  if (composed.allOf?.length && !composed.allOf.every((item) =>
    isRequestBodyValid(item, value, schemas, unresolved, pointer, nextSeen))) return false;
  if (composed.anyOf?.length && !composed.anyOf.some((item) =>
    isRequestBodyValid(item, value, schemas, unresolved, pointer, nextSeen))) return false;
  if (composed.oneOf?.length && composed.oneOf.filter((item) =>
    isRequestBodyValid(item, value, schemas, unresolved, pointer, nextSeen)).length !== 1) return false;

  if (schema.type === "array" || schema.items) {
    return Array.isArray(value) && (!schema.items || value.every((item, index) =>
      isRequestBodyValid(schema.items!, item, schemas, unresolved, `${pointer}/${index}`, nextSeen)));
  }
  if (schema.type === "object" || schema.properties) {
    if (!isRecord(value)) return false;
    for (const name of schema.required || []) {
      const childPointer = `${pointer}/${escapeJsonPointer(name)}`;
      if (!hasOwn(value, name) && !unresolved.has(childPointer)) return false;
    }
    for (const [name, child] of Object.entries(schema.properties || {})) {
      if (hasOwn(value, name) && !isRequestBodyValid(
        child, value[name], schemas, unresolved,
        `${pointer}/${escapeJsonPointer(name)}`, nextSeen,
      )) return false;
    }
    return true;
  }
  return isExampleValid(schema, value);
}

/** 校验一个 Endpoint 的整体请求示例是否完整、可寻址且不携带凭证。 */
function checkRequestExamples(
  api: PontxAPI,
  apiKey: string,
  apiPath: string,
  spec: PontxSpec,
  operationIds: Set<string>,
  record: RecordCheck,
) {
  const examples = api.requestExamples as unknown;
  const validCollection = isRecord(examples) && Object.keys(examples).length > 0;
  record("requestExamples", `api:${apiKey}`, validCollection, {
    ruleId: "request-examples.required",
    path: `${apiPath}.requestExamples`,
    message: "Endpoint 缺少整体请求示例。",
    remediation: "至少添加一个 requestExamples 条目；从 OAS 导入时使用 x-pontx-request-examples。",
    affectedApis: [apiKey],
  });
  if (!validCollection) return;

  const parameters = api.parameters || [];
  const parameterMap = new Map(parameters.map((parameter) =>
    [`${parameter.in}:${parameter.name}`, parameter]));
  const bodyParameter = parameters.find((parameter) => parameter.in === "body");
  const securitySchemes = spec.components?.securitySchemes || {};
  const apiKeyParameters = Object.values(securitySchemes)
    .filter((scheme) => scheme?.type === "apiKey")
    .map((scheme) => ({
      location: scheme.in === "header" ? "header" : "query",
      name: scheme.name?.toLowerCase(),
    }));
  const approvedServers = new Set([
    ...(spec.servers || []).map((server) => server?.url),
    ...Object.values(spec.envs || {}).flatMap((env) => (env.servers || []).map((server) => server?.url)),
  ].filter(isText).map((url) => url.replace(/\/$/, "")));

  for (const [id, rawExample] of Object.entries(examples)) {
    const examplePath = `${apiPath}.requestExamples[${JSON.stringify(id)}]`;
    const example = rawExample as PontxRequestExample;
    record("requestExamples", `api:${apiKey}`, REQUEST_EXAMPLE_ID.test(id), {
      ruleId: "request-examples.id", path: examplePath,
      message: `整体请求示例 ID ${id} 不稳定。`,
      remediation: "使用小写字母、数字和单连字符组成稳定 ID。", affectedApis: [apiKey],
    });

    const request = isRecord(example) && isRecord(example.request) ? example.request : {};
    const unresolved = isRecord(example) && Array.isArray(example.unresolved) ? example.unresolved : [];
    const shapeValid = isRecord(example) && isRecord(example.request)
      && ["path", "query", "headers"].every((location) =>
        example.request?.[location] === undefined || isRecord(example.request[location]))
      && (example.unresolved === undefined || Array.isArray(example.unresolved));
    record("requestExamples", `api:${apiKey}`, shapeValid, {
      ruleId: "request-examples.shape", path: examplePath,
      message: "整体请求示例的 request 或 unresolved 结构非法。",
      remediation: "request 使用 path/query/headers 对象和可选 body；unresolved 使用数组。", affectedApis: [apiKey],
    });

    const unresolvedKeys = new Set<string>();
    let unresolvedValid = shapeValid;
    for (const input of unresolved) {
      if (!isRecord(input) || !isText(input.in) || !isText(input.name) || !isRecord(input.source)) {
        unresolvedValid = false;
        continue;
      }
      const key = `${input.in}:${input.name}`;
      const declared = input.in === "body"
        ? !!bodyParameter && (input.name === "body" || input.name === "/" || input.name.startsWith("/"))
        : parameterMap.has(key);
      const sourceValid = input.source.kind === PontxRequestInputSourceKind.Operation
        ? isText(input.source.operationId) && operationIds.has(input.source.operationId)
        : input.source.kind === PontxRequestInputSourceKind.Runtime && isText(input.source.reason);
      if (!declared || !sourceValid || unresolvedKeys.has(key)) unresolvedValid = false;
      unresolvedKeys.add(key);
    }
    record("requestExamples", `api:${apiKey}`, unresolvedValid, {
      ruleId: "request-examples.unresolved", path: `${examplePath}.unresolved`,
      message: "动态输入未声明、重复，或引用了无效的来源 Endpoint/运行时原因。",
      remediation: "让每个动态输入对应已声明参数，并填写有效 operationId 或 runtime reason。", affectedApis: [apiKey],
    });

    let valuesValid = shapeValid;
    for (const location of ["path", "query", "header"] as const) {
      for (const [name, value] of Object.entries(requestValues(request, location))) {
        const parameter = parameterMap.get(`${location}:${name}`);
        if (!parameter || !parameter.schema || !isRequestScalar(value)
          || unresolvedKeys.has(`${location}:${name}`)
          || !isExampleValid(parameter.schema, value)
          || (location === "header" && typeof value !== "string")) {
          valuesValid = false;
        }
      }
    }
    if (hasOwn(request, "body") && !bodyParameter) valuesValid = false;
    if (hasOwn(request, "body") && bodyParameter?.schema) {
      const unresolvedBodyPointers = new Set(Array.from(unresolvedKeys)
        .filter((key) => key.startsWith("body:"))
        .map((key) => key.slice("body:".length)));
      if (!isRequestBodyValid(
        bodyParameter.schema,
        request.body,
        spec.components?.schemas || {},
        unresolvedBodyPointers,
      )) valuesValid = false;
    }
    record("requestExamples", `api:${apiKey}`, valuesValid, {
      ruleId: "request-examples.values", path: `${examplePath}.request`,
      message: "整体请求示例包含未声明、类型不匹配或同时标记为动态的输入。",
      remediation: "只填写当前 Endpoint 声明的输入，并让值符合参数 Schema。", affectedApis: [apiKey],
    });

    const requiredComplete = parameters.filter((parameter) => parameter.required).every((parameter) => {
      if (parameter.in === "body") return hasOwn(request, "body") || unresolvedKeys.has("body:body");
      return hasOwn(requestValues(request, parameter.in), parameter.name)
        || unresolvedKeys.has(`${parameter.in}:${parameter.name}`);
    });
    record("requestExamples", `api:${apiKey}`, requiredComplete, {
      ruleId: "request-examples.required-inputs", path: examplePath,
      message: "整体请求示例没有覆盖全部必填输入。",
      remediation: "为每个必填输入提供稳定值，或在 unresolved 中声明动态来源。", affectedApis: [apiKey],
    });

    const expectedStatus = isRecord(example) ? String(example.expectedStatus ?? "") : "";
    const statusValid = /^2(?:\d\d|[xX]{2})$/.test(expectedStatus)
      && Object.prototype.hasOwnProperty.call(api.responses || {}, expectedStatus);
    record("requestExamples", `api:${apiKey}`, statusValid, {
      ruleId: "request-examples.success-status", path: `${examplePath}.expectedStatus`,
      message: "expectedStatus 不是 Endpoint 已声明的 2xx 响应。",
      remediation: "填写 responses 中实际声明的成功状态码。", affectedApis: [apiKey],
    });

    const headers = requestValues(request, "header");
    const hasForbiddenHeader = Object.keys(headers)
      .some((name) => FORBIDDEN_EXAMPLE_HEADERS.has(name.toLowerCase()));
    const hasApiKey = apiKeyParameters.some(({ location, name }) => name
      && Object.keys(requestValues(request, location)).some((inputName) => inputName.toLowerCase() === name));
    const serverUrl = isRecord(example) && example.serverUrl;
    const serverValid = serverUrl === undefined
      || (isText(serverUrl) && approvedServers.has(serverUrl.replace(/\/$/, "")));
    record("requestExamples", `api:${apiKey}`, !hasForbiddenHeader && !hasApiKey && serverValid, {
      ruleId: "request-examples.safety", path: examplePath,
      message: "整体请求示例包含凭证字段或未经声明的 serverUrl。",
      remediation: "移除凭证值，并只引用 PontxSpec 中批准的 server URL。", affectedApis: [apiKey],
      severity: QualitySeverity.Critical,
    });
  }
}

function checkRuntime(
  api: PontxAPI,
  apiKey: string,
  apiPath: string,
  spec: PontxSpec,
  record: RecordCheck,
  visitSchema: (schema: PontxJsonSchema | undefined, path: string, entity: string, apiKey?: string) => void,
) {
  const responses = api.responses || {};
  const responseCodes = Object.keys(responses);
  record("runtime", `api:${apiKey}`, responseCodes.some((code) => /^2\d\d$/.test(code)), {
    ruleId: "runtime.success-response", path: `${apiPath}.responses`, message: "API 缺少明确的 2xx 响应。",
    remediation: "声明至少一个成功状态码及其响应 Schema。", affectedApis: [apiKey],
  });
  record("runtime", `api:${apiKey}`, responseCodes.some((code) => !/^2\d\d$/.test(code)), {
    ruleId: "runtime.error-response", path: `${apiPath}.responses`, message: "API 缺少错误或 default 响应。",
    remediation: "至少声明一个常见错误状态或 default 响应及其语义。", affectedApis: [apiKey],
  });
  for (const [status, response] of Object.entries(responses)) {
    record("description", `api:${apiKey}`, isText(response?.description), {
      ruleId: "description.response", path: `${apiPath}.responses[${JSON.stringify(status)}]`,
      message: `响应 ${status} 缺少描述。`, remediation: "说明响应条件和语义。", affectedApis: [apiKey],
    });
    for (const [headerName, header] of Object.entries(response?.headers || {})) {
      record("description", `api:${apiKey}`, isText(header?.description), {
        ruleId: "description.response-header",
        path: `${apiPath}.responses[${JSON.stringify(status)}].headers[${JSON.stringify(headerName)}]`,
        message: `响应头 ${headerName} 缺少描述。`, remediation: "说明响应头的语义和格式。", affectedApis: [apiKey],
      });
    }
    if (response?.schema) visitSchema(response.schema, `${apiPath}.responses[${JSON.stringify(status)}].schema`, `api:${apiKey}`, apiKey);
  }
  const securitySchemes = spec.components?.securitySchemes || {};
  for (const requirement of api.security || spec.security || []) {
    for (const schemeName of Object.keys(requirement)) {
      record("runtime", `api:${apiKey}`, !!securitySchemes[schemeName], {
        ruleId: "runtime.security", path: `${apiPath}.security`, message: `安全方案 ${schemeName} 未定义。`,
        remediation: "在 components.securitySchemes 中声明引用的安全方案。", affectedApis: [apiKey],
      });
    }
  }
  const hasServer = (spec.servers || []).some((server) => isText(server?.url));
  const hasEnvServer = Object.values(spec.envs || {}).some((env) => (env.servers || []).some((server) => isText(server?.url)));
  record("runtime", `api:${apiKey}`, hasServer || hasEnvServer, {
    ruleId: "runtime.server", path: "$.servers", message: "PontxSpec 没有可解析的 server/env URL。",
    remediation: "在 servers 或 envs.<name>.servers 中提供基础 URL。", affectedApis: [apiKey],
  });
}

function checkDirectory(
  directory: PontxDirectoryNode[],
  apis: Record<string, PontxAPI>,
  schemas: Record<string, PontxJsonSchema>,
  record: RecordCheck,
) {
  const apiCounts = new Map<string, number>();
  const schemaCounts = new Map<string, number>();
  const walk = (nodes: PontxDirectoryNode[], path: string) => {
    for (const [index, node] of (nodes || []).entries()) {
      const nodePath = `${path}[${index}]`;
      if (node.type !== PontxDirectoryNodeType.Overview) {
        record("directory", `directory:${node.name}`, isText(node.title), {
          ruleId: "directory.title", path: `${nodePath}.title`, message: `目录节点 ${node.name} 缺少标题。`,
          remediation: "通过 API、Tag 或 Schema 的 title/summary/description 补全目录标题。",
        });
      }
      if (node.type === PontxDirectoryNodeType.Api) apiCounts.set(node.name, (apiCounts.get(node.name) || 0) + 1);
      if (node.type === PontxDirectoryNodeType.Struct) schemaCounts.set(node.name, (schemaCounts.get(node.name) || 0) + 1);
      walk(node.children || [], `${nodePath}.children`);
    }
  };
  walk(directory || [], "$.directory");
  for (const apiKey of Object.keys(apis)) {
    record("directory", `api:${apiKey}`, apiCounts.get(apiKey) === 1, {
      ruleId: "directory.api-reachable", path: `$.apis[${JSON.stringify(apiKey)}]`,
      message: `API ${apiKey} 在目录中不是恰好出现一次。`, remediation: "修复 tag/目录映射，确保 API 唯一可达。",
      affectedApis: [apiKey],
    });
  }
  for (const schemaName of Object.keys(schemas)) {
    record("directory", `schema:${schemaName}`, schemaCounts.get(schemaName) === 1, {
      ruleId: "directory.schema-reachable", path: `$.components.schemas[${JSON.stringify(schemaName)}]`,
      message: `Schema ${schemaName} 在目录中不是恰好出现一次。`, remediation: "修复结构目录，确保 Schema 唯一可达。",
    });
  }
}

function checkLocales(
  input: PontxQualityInput,
  spec: PontxSpec,
  record: RecordCheck,
) {
  const locales = input.locales || {};
  const sourceStructure = JSON.stringify(stableValue(stripProse(spec)));
  const sourceProse = collectProse(spec);
  for (const [locale, localizedSpec] of Object.entries(locales)) {
    const localizedStructure = JSON.stringify(stableValue(stripProse(localizedSpec)));
    const localizedProse = collectProse(localizedSpec);
    record("i18n", `locale:${locale}`, sourceStructure === localizedStructure, {
      ruleId: "i18n.structure", path: "$", locale,
      message: `${locale} PontxSpec 与默认语言结构不一致。`,
      remediation: "仅翻译 prose，保持 API、参数、Schema、约束、示例和安全语义完全同构。",
      severity: QualitySeverity.Critical,
    });
    for (const prosePath of sourceProse.keys()) {
      record("i18n", `locale:${locale}`, localizedProse.has(prosePath), {
        ruleId: "i18n.prose", path: prosePath, locale,
        message: `${locale} 缺少对应的翻译文本。`, remediation: "补全与默认语言同一路径的非空翻译。",
      });
    }
  }
}
