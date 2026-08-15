import { OAS2, OAS3 } from "oas-spec-ts";
import { PontxSpec } from "./spec.js";
import _ from "lodash";

export function parsePontxSpec2OAS2(spec: PontxSpec): OAS2.SwaggerObject {
  if (spec.style === "RPC") {
    throw new Error("RPC style is not supported in OAS2");
  }

  const definitions = spec.components.schemas;
  const tags = PontxSpec.getTagGroups(spec).map((tagGroup) => {
    return {
      name: tagGroup.name,
      description: tagGroup.description,
    };
  });
  const paths = {};

  _.forEach(spec.apis, (api, key) => {
    let apiPath = api.path;

    if (!apiPath) {
      apiPath = key;
    }

    if (apiPath) {
      if (!paths[apiPath]) {
        paths[apiPath] = {};
      }
      const seps = key?.split("/") || [];
      const preSep = seps.slice(0, -1)?.join("/");
      const oasApi = {
        ...(preSep ? { tags: [preSep] } : {}),
        summary: api.summary,
        description: api.description,
        operationId: api.operationId || api.name,
        parameters: api.parameters,
        responses: api.responses,
        ...(api.requestExamples
          ? { "x-pontx-request-examples": api.requestExamples }
          : {}),
        ...(api.sse ? { "x-pontx-sse": api.sse } : {}),
      } as OAS2.OperationObject;
      if (api.deprecated) {
        oasApi.deprecated = api.deprecated;
      }
      if (api.consumes?.length) {
        oasApi.consumes = api.consumes;
      }

      if (api.produces?.length) {
        oasApi.produces = api.produces;
      }

      paths[apiPath][api.method || "POST"] = oasApi;
    }
  });

  const swagger = {
    swagger: "2.0",
    info: spec.info,
    securityDefinitions: spec.components.securitySchemes,
    security: spec.security,
    externalDocs: spec.externalDocs,
    tags,
    paths,
    definitions,
  } as OAS2.SwaggerObject;

  const serverUrl = spec.servers?.[0]?.url;

  if (serverUrl?.includes("/")) {
    if (serverUrl.indexOf("/") > 0) {
      swagger.host = serverUrl.split("/")[0];
      swagger.basePath = serverUrl.split("/").slice(1).join("/");
    } else {
      swagger.basePath = serverUrl;
    }
  } else {
    swagger.host = serverUrl;
  }

  return swagger;
}

export function parsePontSpec2OAS3(spec: PontxSpec) {
  if (spec.style === "RPC") {
    throw new Error("RPC style is not supported in OAS3");
  }

  const tags = PontxSpec.getTagGroups(spec).map((tagGroup) => {
    return {
      name: tagGroup.name,
      description: tagGroup.description,
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
        ...(preSep ? { tags: [preSep] } : {}),
        summary: api.summary || api.title,
        description: api.description,
        operationId: api.operationId || apiName || api.name,
        parameters: (api.parameters || [])
          .filter((param) => param.in !== "body")
          .map((param) => {
            return {
              ...param,
              schema: param.schema || {},
            };
          }),
        responses: _.mapValues(api.responses, (response) => {
          const content = response.content && Object.keys(response.content).length
            ? Object.fromEntries(Object.entries(response.content).map(([mediaType, media]) => [
                mediaType,
                { schema: media.schema },
              ]))
            : {
                [api?.produces?.[0] || "application/json"]: {
                  schema: response.schema,
                },
              };
          return {
            description: response.description,
            headers: response.headers,
            content,
          } as OAS3.ResponseObject;
        }),
        ...(api.requestExamples
          ? { "x-pontx-request-examples": api.requestExamples }
          : {}),
        ...(api.sse ? { "x-pontx-sse": api.sse } : {}),
      } as OAS3.OperationObject;

      if (api.security) {
        oas3Api.security = api.security;
      }

      if (api.deprecated) {
        oas3Api.deprecated = api.deprecated;
      }

      const bodyParam = api.parameters?.find((param) => param.in === "body");
      if (bodyParam) {
        const consumeTypes = api?.consumes?.length
          ? api.consumes
          : ["application/json"];
        oas3Api.requestBody = {
          required: bodyParam.required,
          content: Object.fromEntries(consumeTypes.map((consumeType) => [
            consumeType,
            {
              schema: bodyParam.schema || {},
            },
          ])),
        } as OAS3.RequestBodyObject;
      }

      paths[api.path][api.method] = oas3Api;
    }
  });

  return {
    openapi: "3.0.0",
    info: spec.info,
    servers: spec.servers,
    paths,
    components: spec.components,
    security: spec.security,
    tags,
    externalDocs: spec.externalDocs,
  } as unknown as OAS3.OpenAPIObject;
}
