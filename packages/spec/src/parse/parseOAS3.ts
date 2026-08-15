import { OAS3 } from "oas-spec-ts";
import {
  getIdentifierFromOperatorId,
  getIdentifierFromUrl,
  getMaxSamePath,
  makeNamesUnique,
  resolveRef,
} from "./utils.js";
import _ from "lodash";
import { Parameter, PontxAPI } from "../api.js";
import { PontxJsonSchema } from "../schema.js";
import { PontxSpec } from "../spec.js";
import { fixOASTags } from "./parseOASTags.js";

/**
 * 将 OAS 3.0/3.1 Schema 归一化为 PontxJsonSchema。
 *
 * OAS 使用单值 example、布尔 exclusiveMinimum/Maximum 以及 nullable type
 * union，PontxSpec 则使用 examples、数值排他边界和单一主类型。统一在解析
 * 边界转换，避免生成器、CLI 和质量评估各自解释一遍。
 */
function normalizeOAS3Schema(schema: unknown): PontxJsonSchema | undefined {
  if (!schema || typeof schema !== "object") return schema as PontxJsonSchema | undefined;

  const source = schema as Record<string, any>;
  const normalized = { ...source } as Record<string, any>;
  const hasSchemaShape = source.type || source.$ref || source.properties || source.items
    || source.allOf || source.anyOf || source.oneOf || source.not
    || source.enum || Object.prototype.hasOwnProperty.call(source, "const");
  if (!hasSchemaShape) {
    normalized.type = "generic";
    normalized.genericRef = { name: "unknown" };
  }
  const sourceType = source.type;
  if (Array.isArray(sourceType)) {
    const nonNullTypes = sourceType.filter((type) => type !== "null");
    if (nonNullTypes.length === 1 && nonNullTypes.length !== sourceType.length) {
      normalized.type = nonNullTypes[0];
      normalized.nullable = true;
    }
  }

  if (Object.prototype.hasOwnProperty.call(source, "example")
    && (!Array.isArray(source.examples) || source.examples.length === 0)) {
    normalized.examples = [source.example];
  }
  delete normalized.example;

  if (source.exclusiveMinimum === true && typeof source.minimum === "number") {
    normalized.exclusiveMinimum = source.minimum;
  } else if (source.exclusiveMinimum === false) {
    delete normalized.exclusiveMinimum;
  }
  if (source.exclusiveMaximum === true && typeof source.maximum === "number") {
    normalized.exclusiveMaximum = source.maximum;
  } else if (source.exclusiveMaximum === false) {
    delete normalized.exclusiveMaximum;
  }

  const enumDescriptions = source["x-enum-descriptions"];
  if (Array.isArray(source.enum) && Array.isArray(enumDescriptions)) {
    normalized.enumValueTitles = Object.fromEntries(source.enum
      .map((value, index) => [String(value), enumDescriptions[index]])
      .filter((entry) => typeof entry[1] === "string" && entry[1].trim().length > 0));
  }

  if (source.properties) {
    normalized.properties = Object.fromEntries(Object.entries(source.properties)
      .map(([name, property]) => [name, normalizeOAS3Schema(property)]));
  }
  if (source.items) normalized.items = normalizeOAS3Schema(source.items);
  if (source.additionalProperties && typeof source.additionalProperties === "object") {
    normalized.additionalProperties = normalizeOAS3Schema(source.additionalProperties);
  }
  for (const keyword of ["allOf", "anyOf", "oneOf"] as const) {
    if (Array.isArray(source[keyword])) {
      normalized[keyword] = source[keyword].map(normalizeOAS3Schema);
    }
  }
  if (source.not) normalized.not = normalizeOAS3Schema(source.not);

  return normalized as PontxJsonSchema;
}

export function parseOAS3Interface(
  inter: OAS3.OperationObject & { path: string; method: string },
  swagger: OAS3.OpenAPIObject
) {
  const { path, method } = inter;
  let produces = [];
  const responses = _.mapValues(inter.responses, (response) => {
    const finalResponse = resolveRef<OAS3.ResponseObject>(response, swagger) || response;
    const { content, headers, description, ...rest } = finalResponse || {};
    const resolvedHeaders = headers
      ? Object.fromEntries(Object.entries(headers).map(([name, header]) => [
          name,
          resolveRef(header, swagger) || header,
        ]))
      : headers;
    const responseProduces = Object.keys(content || {});
    const onlyKey = responseProduces[0];
    const schema = content?.[onlyKey]?.schema;
    const responseSchema = normalizeOAS3Schema(schema);
    produces = _.union(produces, responseProduces);
    return { ...rest, description, schema: responseSchema, headers: resolvedHeaders as any };
  });

  const parameters = (inter.parameters || []).map((param) => {
    const finalParam = resolveRef(param, swagger) || param;
    const { required, name, schema, in: paramIn, ...rest } = finalParam;
    const paramSchema = normalizeOAS3Schema({ ...rest, ...(schema || {}) });

    return {
      in: paramIn as any,
      name: name.includes("/") ? name.split("/").join("") : name,
      required,
      schema: paramSchema,
    } as Parameter;
  });
  let consumes = [];
  if (inter.requestBody) {
    const requestBody = resolveRef<OAS3.RequestBodyObject>(
      inter.requestBody,
      swagger
    );

    if (requestBody) {
      const consumeContent = requestBody.content;
      const declaredConsumes = consumeContent ? Object.keys(consumeContent) : [];
      const consume = declaredConsumes[0];
      if (consume) {
        consumes = _.uniq(declaredConsumes.map((contentType) =>
          contentType.split(";")[0] || contentType
        ));

        const bodyParma = {
          name: "body",
          in: "body" as any,
          required: requestBody.required === true,
          schema: normalizeOAS3Schema(consumeContent[consume]?.schema),
        } as Parameter;
        parameters.push(bodyParma);
      }
    }
  }

  const pontAPI = {
    summary: inter.summary,
    operationId: inter.operationId,
    consumes,
    description: inter.description,
    method,
    path,
    responses,
    deprecated: inter.deprecated,
    parameters: _.unionBy(parameters, "name"),
    produces: produces,
    security: inter.security,
    requestExamples: inter["x-pontx-request-examples"],
  } as PontxAPI;

  return pontAPI;
}

export function parseSwagger2APIs(originSwagger: OAS3.OpenAPIObject) {
  const swagger = fixOASTags(originSwagger);
  const allSwaggerInterfaces = [] as Array<
    OAS3.OperationObject & { path: string; method: string }
  >;

  if (!swagger.paths) {
    return {
      tags: [],
      apis: {},
    };
  }

  Object.keys(swagger.paths).forEach((path) => {
    const methodInters = swagger.paths[path];

    const methods = [
      "get",
      "delete",
      "put",
      "post",
      "patch",
      "options",
      "head",
      "trace",
    ];
    methods.forEach((method) => {
      const inter = methodInters[method] as OAS3.OperationObject;
      if (!inter) {
        return;
      }
      allSwaggerInterfaces.push({
        ...inter,
        path,
        method: method?.toUpperCase(),
        tags: inter.tags || [],
        parameters: _.unionWith(
          inter.parameters,
          methodInters.parameters || [],
          (param1, param2) => {
            const param1Name = param1.name || param1["$ref"];
            const param2Name = param2.name || param2["$ref"];

            return param1Name === param2Name;
          }
        ),
      });
    });
  });

  const apiGroups = (swagger.tags || []).map((tag) => {
    const tagApis = allSwaggerInterfaces.filter((inter) => {
      return inter.tags.includes(tag.name);
    });

    const samePath = getMaxSamePath(
      tagApis
        // 所有 tagApi 都有 operationId，如果过滤，则 samePath 就是空的。
        // .filter((inter) => !inter.operationId)
        .map((inter) => {
          if (inter.path?.startsWith?.("/")) {
            return inter.path.slice(1);
          }

          return inter.path;
        })
    );

    const tagApiNames = [];

    tagApis.forEach((inter) => {
      let apiName = "";
      if (inter.operationId) {
        apiName = getIdentifierFromOperatorId(inter.operationId);
      }

      if (!apiName || tagApiNames.includes(apiName)) {
        apiName = getIdentifierFromUrl(
          inter.path,
          (inter.method || "").toLowerCase(),
          samePath
        );
      }

      tagApiNames.push(apiName);
    });

    const uniqueApiNames = makeNamesUnique(tagApiNames);

    return {
      name: tag.name,
      apis: tagApis,
      apiNames: uniqueApiNames,
    };
  });

  const untaggedApis = allSwaggerInterfaces.filter(
    (inter) => !inter.tags.length
  );
  if (untaggedApis.length) {
    const apiNames = makeNamesUnique(untaggedApis.map((inter) => {
      return inter.operationId
        ? getIdentifierFromOperatorId(inter.operationId)
        : getIdentifierFromUrl(inter.path, (inter.method || "").toLowerCase());
    }));
    apiGroups.push({ name: "", apis: untaggedApis, apiNames });
  }

  const apis = apiGroups.reduce(
    (result: Record<string, PontxAPI>, apiGroup) => {
      return apiGroup.apiNames.reduce((currResult, apiName, index) => {
        const apiKey = apiGroup?.name ? `${apiGroup.name}/${apiName}` : apiName;
        return {
          ...currResult,
          [apiKey]: parseOAS3Interface(apiGroup.apis[index], swagger),
        };
      }, result);
    },
    {} as any
  );
  return { apis, tags: swagger.tags };
}

export function parseOAS3(
  swagger: OAS3.OpenAPIObject,
  name: string
): PontxSpec {
  const { apis, tags } = parseSwagger2APIs(swagger);

  const components = swagger?.components ? {
    ...swagger.components,
    schemas: Object.fromEntries(Object.entries(swagger.components.schemas || {})
      .map(([schemaName, schema]) => [schemaName, normalizeOAS3Schema(schema)])),
  } : undefined;

  const pontDs = {
    components,
    apis,
    name,
    servers: swagger?.servers,
    info: {
      description: swagger?.info?.description || swagger?.info?.title || "",
      version: swagger?.info?.version || "1.0.0",
      title: swagger?.info?.title || "",
    },
    security: swagger?.security,
    externalDocs: swagger?.externalDocs,
    ext: {},
    tags,
  } as PontxSpec;

  return pontDs;
}

export function checkIsOas3(oas) {
  return (
    !oas?.swagger && oas?.openapi && (oas?.openapi as string)?.startsWith("3")
  );
}
