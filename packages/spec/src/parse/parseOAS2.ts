import { OAS2 } from "oas-spec-ts";
import {
  getIdentifierFromOperatorId,
  getIdentifierFromUrl,
  getMaxSamePath,
  toDashCase,
  transformTagName,
  checkHasNonVarialbeCh,
  makeNamesUnique,
} from "./utils.js";
import { OAS2JsonSchemaContext, parseOAS2JsonSchema } from "./schema.js";
import _ from "lodash";
const { mapValues, unionBy, union } = _;
import {
  Parameter,
  PontxAPI,
  PontxDocumentationStatus,
  PontxEndpointMetadata,
  PontxExecutionPermission,
  PontxSseStream,
} from "../api.js";
import { PontxJsonSchema } from "../schema.js";
import { PontxSpec } from "../spec.js";
import { parseOAS2Schemas } from "./schemas.js";
import { fixOASTags } from "./parseOASTags.js";

/** 将 OAS 扩展迁移为 PontxSpec 的类型化 Endpoint 元数据。 */
function parseEndpointMetadata(inter: Record<string, any>): PontxEndpointMetadata | undefined {
  const documentation = inter["x-pontx-documentation-status"]
    || inter["x-pontx-evidence"]
    || inter["x-pontx-verified-at"]
    || inter["x-pontx-stability-note"]
    ? {
        status: inter["x-pontx-documentation-status"] as PontxDocumentationStatus | string,
        evidence: inter["x-pontx-evidence"],
        verifiedAt: inter["x-pontx-verified-at"],
        stabilityNote: inter["x-pontx-stability-note"],
      }
    : undefined;
  const hasExecution = typeof inter["x-pontx-proxy-enabled"] === "boolean"
    || typeof inter["x-pontx-execution-enabled"] === "boolean";
  const execution = hasExecution
    ? {
        enabled: inter["x-pontx-execution-enabled"] ?? inter["x-pontx-proxy-enabled"],
        permission: inter["x-pontx-execution-permission"] as PontxExecutionPermission,
        disabledReason: inter["x-pontx-execution-disabled-reason"]
          ?? inter["x-pontx-proxy-disabled-reason"],
      }
    : undefined;
  return documentation || execution ? { documentation, execution } : undefined;
}

/** 保留导入器尚未识别的 OAS 扩展字段。 */
function getExtensions(value: Record<string, any>): Record<string, unknown> | undefined {
  const migratedExtensions = new Set([
    "x-pontx-documentation-status",
    "x-pontx-evidence",
    "x-pontx-verified-at",
    "x-pontx-stability-note",
    "x-pontx-proxy-enabled",
    "x-pontx-proxy-disabled-reason",
    "x-pontx-execution-enabled",
    "x-pontx-execution-permission",
    "x-pontx-execution-disabled-reason",
    "x-pontx-request-examples",
    "x-pontx-sse",
  ]);
  const extensions = Object.fromEntries(Object.entries(value)
    .filter(([key]) => key.startsWith("x-") && !migratedExtensions.has(key)));
  return Object.keys(extensions).length ? extensions : undefined;
}

function parseSseContract(inter: Record<string, any>): PontxSseStream | undefined {
  const declared = inter["x-pontx-sse"];
  if (declared && typeof declared === "object" && !Array.isArray(declared)) {
    return declared as PontxSseStream;
  }
  const hasSse = (inter.produces || []).some((mediaType: unknown) =>
    typeof mediaType === "string"
      && mediaType.split(";", 1)[0]?.trim().toLowerCase() === "text/event-stream"
  );
  return hasSse
    ? { events: { message: { dataFormat: "text" } }, unknownEventPolicy: "preserve" }
    : undefined;
}

export function parseOAS2Interface(
  inter: OAS2.OperationObject & { path: string; method: string; sourceTags?: string[] },
  context: OAS2JsonSchemaContext
) {
  const responses = mapValues(inter.responses, (response) => {
    const responseSchema = response.schema
      ? parseOAS2JsonSchema(response.schema as PontxJsonSchema, context)
      : new PontxJsonSchema();
    return { ...response, schema: responseSchema };
  });

  const parameters = (inter.parameters || []).map((param) => {
    const { required, name, schema, ["in"]: paramIn, ...rest } = param;
    const paramSchema = { ...rest, ...(schema || {}) };

    return {
      in: param.in as any,
      name: name.includes("/") ? name.split("/").join("") : name,
      required,
      schema: parseOAS2JsonSchema(paramSchema as PontxJsonSchema, context),
    } as Parameter;
  });

  const pontAPI = {
    summary: inter.summary,
    operationId: inter.operationId,
    consumes: inter.consumes,
    produces: inter.produces,
    description: inter.description,
    tags: inter.sourceTags ?? inter.tags,
    method: inter.method?.toUpperCase(),
    path: inter.path,
    responses,
    deprecated: inter.deprecated,
    parameters: unionBy(parameters, "name"),
    requestExamples: inter["x-pontx-request-examples"],
    security: inter.security,
    externalDocs: inter.externalDocs,
    metadata: parseEndpointMetadata(inter),
    sse: parseSseContract(inter),
    ext: getExtensions(inter),
  } as PontxAPI;

  return pontAPI;
}

export function parseSwagger2APIs(
  originSwagger: OAS2.SwaggerObject,
  defNames: string[]
) {
  const swagger = fixOASTags(originSwagger);
  const allSwaggerInterfaces = [] as Array<
    OAS2.OperationObject & { path: string; method: string; sourceTags?: string[] }
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
      const inter = methodInters[method] as OAS2.OperationObject;
      if (!inter) {
        return;
      }

      allSwaggerInterfaces.push({
        ...inter,
        path,
        method: method?.toUpperCase(),
        sourceTags: (originSwagger.paths?.[path]?.[method] as OAS2.OperationObject)?.tags ?? [],
        tags: inter.tags || [],
        parameters: unionBy(
          inter.parameters,
          methodInters.parameters || [],
          "name"
        ),
      });
    });
  });

  const apiGroups = (swagger.tags || []).map((tag) => {
    const tagApis = allSwaggerInterfaces.filter((inter) => {
      return (
        inter.tags[0] === tag.name || inter.tags[0] === tag.description
      );
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
    const apis = tagApis.map((tagAPI) => {
      return parseOAS2Interface(tagAPI, {
        schemaNames: defNames,
        classTemplateArgCodes: [],
        isSchemaNameAst: false,
      });
    });

    return {
      name: tag.name,
      apis,
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
    apiGroups.push({
      name: "",
      apis: untaggedApis.map((api) => parseOAS2Interface(api, {
        schemaNames: defNames,
        classTemplateArgCodes: [],
        isSchemaNameAst: false,
      })),
      apiNames,
    });
  }

  const apis = apiGroups.reduce(
    (result: Record<string, PontxAPI>, apiGroup) => {
      return apiGroup.apiNames.reduce((currResult, apiName, index) => {
        const apiKey = apiGroup?.name ? `${apiGroup.name}/${apiName}` : apiName;
        return {
          ...currResult,
          [apiKey]: apiGroup.apis[index],
        };
      }, result);
    },
    {} as any
  );
  return { apis, tags: swagger.tags };
}

export function parseOAS2(swagger: OAS2.SwaggerObject, name = ""): PontxSpec {
  const schemas = parseOAS2Schemas(swagger);
  const defNames = schemas.map((schema) => schema.name);
  const { apis, tags } = parseSwagger2APIs(swagger, defNames);
  const definitions = schemas.reduce((result, schema) => {
    return {
      ...result,
      [schema.name]: schema.schema,
    };
  }, {});

  let serverUrl = swagger.host + swagger.basePath;
  if (!swagger.basePath) {
    serverUrl = swagger.host;
  } else if (!swagger.host) {
    serverUrl = swagger.basePath;
  }

  const pontDs = {
    pontx: new PontxSpec().pontx,
    style: new PontxSpec().style,
    components: {
      schemas: definitions,
    },
    apis,
    tags,
    name,
    info: {
      ...swagger.info,
      version: swagger.info?.version,
      title: swagger.info?.title,
      description: swagger.info?.description,
    },
    servers: [
      {
        url: serverUrl,
      },
    ],
    security: swagger.security,
    externalDocs: swagger.externalDocs,
    ext: getExtensions(swagger as any),
  } as PontxSpec;

  return pontDs;
}

export function checkIsOas2(oas: OAS2.SwaggerObject) {
  if (oas?.paths && oas?.swagger?.startsWith("2")) {
    return true;
  }

  return false;
}
