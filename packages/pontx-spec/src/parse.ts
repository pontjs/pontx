import { OAS2, OAS3 } from "oas-spec-ts";
import { PontSpec } from "./type";
import _ from "lodash";
import { PontJsonSchema } from "./dataType";

export function parsePontSpec2OAS2(spec: PontSpec) {
  if (spec.style === "RPC") {
    throw new Error("RPC style is not supported in OAS2");
  }

  const definitions = _.mapValues(spec.definitions || {}, (schema) => {
    return PontJsonSchema.mapPontxSchema(schema, (subSchema) => {
      const { typeName, templateArgs, ...rest } = subSchema;
      return rest;
    });
  });
  const namespaces = PontSpec.getNamespaceNames(spec);
  const tags = namespaces.map((name) => {
    return {
      name,
      description: spec.namespaces?.[name]?.title,
    };
  });
  const paths = {};

  _.forEach(spec.apis, (api, key) => {
    if (api.path) {
      if (!paths[api.path]) {
        paths[api.path] = {};
      }
      const seps = key?.split("/") || [];
      const preSep = seps.slice(0, -1)?.join("/");
      const oasApi = {
        tags: [preSep],
        summary: api.summary,
        description: api.description,
        operationId: api.name,
        parameters: api.parameters,
        responses: api.responses,
      } as OAS2.OperationObject;
      if (api.deprecated) {
        oasApi.deprecated = api.deprecated;
      }
      if (api.consumes?.length) {
        oasApi.consumes = api.consumes;
      }

      if (api.consumes?.length) {
        oasApi.produces = api.produces;
      }

      paths[api.path][api.method] = oasApi;
    }
  });

  const noPathApi = Object.keys(spec.apis || {})?.length && _.every(spec.apis, (api, name) => !api.path);
  if (noPathApi) {
    return {
      swagger: "2.0",
      info: {
        title: spec.title,
        description: spec.description,
        version: spec.version,
      },
      host: spec.host,
      basePath: spec.basePath,
      externalDocs: spec.externalDocs,
      tags,
      apis: spec.apis,
      definitions: spec.definitions,
    };
  }

  return {
    swagger: "2.0",
    info: {
      title: spec.title,
      description: spec.description,
      version: spec.version,
    },
    host: spec.host,
    basePath: spec.basePath,
    externalDocs: spec.externalDocs,
    tags,
    paths,
    definitions,
  } as OAS2.SwaggerObject;
}

const parseOAS3Schema = (schema: PontJsonSchema) => {
  const resultSchema = PontJsonSchema.mapPontxSchema(schema, (subSchema) => {
    const { typeName, templateArgs, required, ...rest } = subSchema;

    if (rest.type === "object" && rest.properties) {
      if (Array.isArray(rest.required)) {
        return rest;
      }

      const newRequired = Object.keys(rest.properties).filter((key) => rest.properties[key]?.required);

      if (newRequired?.length) {
        return {
          ...rest,
          required: newRequired,
        };
      }
    }

    if (rest?.$ref) {
      if (rest.$ref.startsWith("#/definitions/")) {
        return {
          ...rest,
          $ref: "#/components/schemas/" + rest.$ref?.slice("#/definitions/".length),
        };
      }
    }

    return rest;
  });

  return resultSchema;
};

export function parsePontSpec2OAS3(spec: PontSpec) {
  if (spec.style === "RPC") {
    throw new Error("RPC style is not supported in OAS3");
    return null;
  }

  const definitions = _.mapValues(spec.definitions || {}, (schema) => {
    return parseOAS3Schema(schema);
  });
  const namespaces = PontSpec.getNamespaceNames(spec);
  const tags = namespaces.map((name) => {
    return {
      name,
      description: spec.namespaces?.[name]?.title,
    };
  });
  const paths = {};

  _.forEach(spec.apis, (api, key) => {
    if (api.path) {
      if (!paths[api.path]) {
        paths[api.path] = {};
      }
      const seps = key?.split("/") || [];
      const preSep = seps.slice(0, -1)?.join("/");
      const apiName = key.split("/").pop();

      const oas3Api = {
        tags: [preSep],
        summary: api.summary || api.title,
        description: api.description,
        operationId: apiName || api.name,
        parameters: (api.parameters || [])
          .filter((param) => param.in !== "body")
          .map((param) => {
            return {
              ...param,
              schema: parseOAS3Schema(param.schema),
            };
          }),
        responses: _.mapValues(api.responses, (response) => {
          const produce = api?.produces?.[0] || "application/json";
          return {
            description: response.description,
            headers: response.headers,
            content: {
              [produce]: {
                schema: parseOAS3Schema(response.schema),
              },
            },
          } as OAS3.ResponseObject;
        }),
      } as OAS3.OperationObject;

      if (api.security) {
        oas3Api.security = api.security;
      }

      if (api.deprecated) {
        oas3Api.deprecated = api.deprecated;
      }

      const bodyParam = api.parameters?.find((param) => param.in === "body");
      if (bodyParam) {
        const consumeType = api?.consumes?.[0] || "application/json";
        oas3Api.requestBody = {
          content: {
            [consumeType]: {
              schema: parseOAS3Schema(bodyParam.schema),
            },
          },
        } as OAS3.RequestBodyObject;
      }

      paths[api.path][api.method] = oas3Api;
    }
  });

  let serverUrl = spec.host || "";
  if (serverUrl) {
    if (!serverUrl.startsWith("http")) {
      serverUrl = "https://" + serverUrl;
    }
  }

  if (spec.basePath) {
    serverUrl = serverUrl + spec.basePath;
  }

  return {
    openapi: "3.0.0",
    info: {
      title: spec.title,
      description: spec.description,
      version: spec.version,
    },
    servers: serverUrl ? [{ url: serverUrl }] : [],
    paths,
    components: {
      schemas: definitions,
      securitySchemes: spec.securitySchemes,
    } as OAS3.ComponentsObject,
    tags,
    externalDocs: spec.externalDocs,
  } as OAS3.OpenAPIObject;
}
