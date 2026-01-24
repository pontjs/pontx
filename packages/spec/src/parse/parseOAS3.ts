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
import { PontxSpec } from "../spec.js";
import { fixOASTags } from "./parseOASTags.js";

export function parseOAS3Interface(
  inter: OAS3.OperationObject & { path: string; method: string },
  swagger: OAS3.OpenAPIObject
) {
  const { path, method } = inter;
  let produces = [];
  const responses = _.mapValues(inter.responses, (response) => {
    const { content, headers, description, ...rest } = response || {};
    const responseProduces = Object.keys(content || {});
    const onlyKey = responseProduces[0];
    const schema = content?.[onlyKey]?.schema;
    const responseSchema = schema;
    produces = _.union(produces, responseProduces);
    return { ...rest, schema: responseSchema, headers: headers as any };
  });

  const parameters = (inter.parameters || []).map((param) => {
    const finalParam = resolveRef(param, swagger) || param;
    const { required, name, schema, in: paramIn, ...rest } = finalParam;
    const paramSchema = { ...rest, ...(schema || {}) };

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
      const consume = consumeContent ? Object.keys(consumeContent)[0] : null;
      if (consume) {
        const stardardConsume = consume?.split(";")?.[0] || consume;
        consumes = [stardardConsume];

        const bodyParma = {
          name: "body",
          in: "body" as any,
          required: true,
          schema: consumeContent[consume]?.schema,
        } as Parameter;
        parameters.push(bodyParma);
      }
    }
  }

  const pontAPI = {
    summary: inter.summary,
    consumes,
    description: inter.description,
    method,
    path,
    responses,
    deprecated: inter.deprecated,
    parameters: _.unionBy(parameters, "name"),
    produces: produces,
    security: inter.security,
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
        tags: inter.tags || ["common"],
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

  const pontDs = {
    components: swagger?.components,
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
