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
import { Parameter, PontxAPI } from "../api.js";
import { PontxJsonSchema } from "../schema.js";
import { PontxSpec } from "../spec.js";
import { parseOAS2Schemas } from "./schemas.js";
import { fixOASTags } from "./parseOASTags.js";

export function parseOAS2Interface(
  inter: OAS2.OperationObject & { path: string; method: string },
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
    consumes: inter.consumes,
    produces: inter.produces,
    description: inter.description,
    method: inter.method?.toUpperCase(),
    path: inter.path,
    responses,
    deprecated: inter.deprecated,
    parameters: unionBy(parameters, "name"),
  } as PontxAPI;

  return pontAPI;
}

export function parseSwagger2APIs(
  originSwagger: OAS2.SwaggerObject,
  defNames: string[]
) {
  const swagger = fixOASTags(originSwagger);
  const allSwaggerInterfaces = [] as Array<
    OAS2.OperationObject & { path: string; method: string }
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
        tags: inter.tags || ["common"],
        parameters: unionBy(
          inter.parameters,
          methodInters.parameters || [],
          "name"
        ),
      });
    });
  });

  const apiGroups = swagger.tags.map((tag) => {
    const tagApis = allSwaggerInterfaces.filter((inter) => {
      return (
        inter.tags.includes(tag.name) || inter.tags.includes(tag.description)
      );
    });

    const samePath = getMaxSamePath(
      tagApis
        .filter((inter) => !inter.operationId)
        .map((inter) => {
          if (inter.path?.startsWith?.("/")) {
            return inter.path.slice(1);
          }

          return inter.path;
        })
    );

    const tagApiNames = tagApis.map((inter) => {
      if (inter.operationId) {
        return getIdentifierFromOperatorId(inter.operationId);
      }

      return getIdentifierFromUrl(inter.path, inter.method, samePath);
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
    components: {
      schemas: definitions,
    },
    apis,
    tags,
    name,
    info: {
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
  } as PontxSpec;

  return pontDs;
}

export function checkIsOas2(oas: OAS2.SwaggerObject) {
  if (oas?.paths && oas?.swagger?.startsWith("2")) {
    return true;
  }

  return false;
}
