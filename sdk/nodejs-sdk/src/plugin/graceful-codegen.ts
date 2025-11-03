/**
 * Graceful Codegen Plugin
 *
 * This plugin enhances the generated apiMeta.ts and apis.ts files
 * to include metadata required by the graceful client:
 * - pathParams: string[]
 * - queryParams: string[]
 * - bodyType: 'object' | 'array' | 'string' | ...
 * - consume: string (in API types)
 */

import {
  PontxSpec,
  generateApiComment,
  generateParametersTsCode,
  generateSchemaCode,
  generateTagComment,
  indentation,
} from "@pontx/spec";
import type { PontxAPI } from "@pontx/spec";

/**
 * Body type enumeration
 */
export type BodyType =
  | "object"
  | "map"
  | "array"
  | "string"
  | "number"
  | "boolean"
  | "integer"
  | "none";

/**
 * Enhanced API metadata for graceful client
 */
export interface GracefulApiMeta {
  method: string;
  consumes?: string[];
  produces?: string[];
  path: string;
  pathParams: string[];
  queryParams: string[];
  bodyType: BodyType;
}

/**
 * Extract path parameter names from API
 */
export function extractPathParams(api: PontxAPI): string[] {
  return (api.parameters || [])
    .filter((p) => p.in === "path")
    .map((p) => p.name);
}

/**
 * Extract query parameter names from API
 */
export function extractQueryParams(api: PontxAPI): string[] {
  return (api.parameters || [])
    .filter((p) => p.in === "query")
    .map((p) => p.name);
}

/**
 * Detect body type from API schema
 *
 * Rules:
 * - No body parameter -> 'none'
 * - Schema type: 'object' -> 'object'
 * - Schema type: 'array' -> 'array'
 * - Schema type: 'string' -> 'string'
 * - Schema type: 'number' -> 'number'
 * - Schema type: 'boolean' -> 'boolean'
 * - Schema type: 'integer' -> 'integer'
 * - Complex schemas (oneOf, allOf, anyOf) -> 'object' (default)
 */
export function detectBodyType(api: PontxAPI): BodyType {
  const bodyParam = api.parameters?.find((p) => p.in === "body");

  if (!bodyParam?.schema) {
    return "none";
  }

  const schema = bodyParam.schema;

  // Based on JSON Schema type
  switch (schema.type) {
    case "object":
      return "object";
    case "array":
      return "array";
    case "string":
      return "string";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "integer":
      return "integer";
    default:
      // Complex types (oneOf, allOf, anyOf, $ref) default to 'object'
      return "object";
  }
}

/**
 * Generate enhanced API metadata
 */
export function generateGracefulApiMeta(spec: PontxSpec): string {
  const apis: Record<string, GracefulApiMeta> = {};

  for (const [apiKey, api] of Object.entries(spec.apis)) {
    apis[apiKey] = {
      method: api.method,
      consumes: api.consumes,
      produces: api.produces,
      path: api.path,
      pathParams: extractPathParams(api),
      queryParams: extractQueryParams(api),
      bodyType: detectBodyType(api),
    };
  }

  const specMeta = {
    name: spec.name,
    security: spec.security,
    url: spec.servers,
    apis,
  };

  return `export const specMeta = ${JSON.stringify(specMeta, null, 2)};`;
}

/**
 * Generate API type definition with consume field
 */
function apiDTsCodeGraceful(api: PontxAPI): string {
  const paramTypes = generateParametersTsCode(api, false);
  const bodyParam = api.parameters?.find((param) => param.in === "body");

  let bodyParamType = "undefined";
  if (bodyParam) {
    const bodyParamSchema = bodyParam?.schema;
    bodyParamType = generateSchemaCode(bodyParamSchema, "schemas.");
  }

  const method = api?.method;
  const consume = api.consumes?.[0]; // Take first consume type

  const code = [
    `params: ${paramTypes};`,
    method ? `method: '${method.toUpperCase()}';` : "",
    consume ? `consume: '${consume}';` : "", // New field
    `bodyParams: ${bodyParamType};`,
    `Response: ${generateSchemaCode(
      api.responses["200"]?.schema,
      "schemas."
    )};`,
  ]
    .filter((id) => id)
    .join("\n");

  return code;
}

/**
 * Generate pure APIs with consume field
 */
function generatePureApisGraceful(apis: Record<string, PontxAPI>): string {
  const apiCodes = Object.entries(apis).map(([name, api]) => {
    const pureApiName = name?.includes("/") ? name.split("/").pop() : name;
    return `${generateApiComment(api)}${pureApiName}: {\n${indentation(2)(
      apiDTsCodeGraceful(api)
    )}\n}`;
  });

  return apiCodes.join("\n\n");
}

/**
 * Generate enhanced APIs TypeScript file
 */
export function generateGracefulApis(spec: PontxSpec): string {
  const tagGroups = PontxSpec.getTagGroups(spec);
  let prefix = `import type * as schemas from "./schemas";\n\n`;

  if (
    !spec?.components?.schemas ||
    !Object.keys(spec.components.schemas).length
  ) {
    prefix = "";
  }

  if (!tagGroups.length) {
    return (
      prefix +
      `export type APIs = {\n${indentation(2)(
        generatePureApisGraceful(spec.apis)
      )}\n};\n`
    );
  }

  const tagGroupsTypes = tagGroups
    .map((tagGroup) => {
      const tagComment = generateTagComment(tagGroup);
      const tagGroupCode = `${tagGroup.name}: {\n${indentation(2)(
        generatePureApisGraceful(tagGroup.apis)
      )}\n}`;

      return tagComment + tagGroupCode;
    })
    .join("\n\n");

  return (
    prefix + `export type APIs = {\n${indentation(2)(tagGroupsTypes)}\n};\n`
  );
}
