import { Parameter, PontxAPI } from "../../api.js";
import { generateSchemaCode } from "./schema.js";
import { checkNeedQuotationMark, indentation } from "../utils.js";
import { PontxSpec, TagGroup } from "../../spec.js";
import _ from "lodash";
import {
  generateApiComment,
  generateTagComment,
  generateSchemaComment,
} from "../comment.js";

/** 生成单个接口的类型和 SDK 代码，可扩展其它方法 */
export const apiDTsCode = (api: PontxAPI) => {
  const paramTypes = generateParametersTsCode(api, false);
  const bodyParam = api.parameters?.find((param) => param.in === "body");
  let bodyParamType = "undefined";
  if (bodyParam) {
    const bodyParamSchema = bodyParam?.schema;
    bodyParamType = generateSchemaCode(bodyParamSchema, "schemas.");
  }
  let method = api?.method;

  const code = [
    `params: ${paramTypes};`,
    method ? `method: '${method.toUpperCase()}';` : "",
    `bodyParams: ${bodyParamType};`,
    `Response: ${generateSchemaCode(
      api.responses["200"]?.schema,
      "schemas."
    )};`,
  ]
    .filter((id) => id)
    .join("\n");

  return code;
};

/** 生成 API 请求代码 */
export const generateApiRequestCode = (api: PontxAPI) => {
  const bodyParam = api.parameters?.find((param) => param.in === "body");
  if (bodyParam) {
    const bodyParamSchema = bodyParam?.schema;
    const bodyParamType = generateSchemaCode(bodyParamSchema);
    return `(params: Params, bodyParams: ${bodyParamType}, options?: RequestInit): Promise<APIResponse>`;
  }

  return `(params: Params, options?: any): Promise<APIResponse>`;
};

export const generateParametersTsCode = (api: PontxAPI, useClass = true) => {
  const getParameterCode = (parameter: Parameter) => {
    const optionalSignal =
      parameter?.schema?.required || parameter?.required ? "" : "?";

    let name = parameter.name;
    if (checkNeedQuotationMark(name)) {
      name = `'${name}'`;
    }

    const fieldTypeDeclaration = `${optionalSignal}: ${generateSchemaCode(
      parameter.schema,
      "schemas."
    )}`;
    const comment = generateSchemaComment(parameter.schema, parameter.name);

    return `${comment}${name}${fieldTypeDeclaration};`;
  };

  const normalParams = api.parameters.filter(
    (param) => param.in === "path" || param.in === "query"
  );

  if (!normalParams?.length) {
    if (useClass) {
      return "class Params { }";
    } else {
      return "{}";
    }
  }

  return `${useClass ? "class Params " : ""}{
${indentation(2)(
  normalParams.map((param) => getParameterCode(param)).join("\n")
)}
}`;
};

export function generatePureApis(apis: Record<string, PontxAPI>) {
  const code = _.map(apis, (api, name) => {
    const pureApiName = name?.includes("/") ? name.split("/").pop() : name;
    return `${generateApiComment(api)}${pureApiName}: {\n${indentation(2)(
      apiDTsCode(api)
    )}\n}`;
  }).join("\n\n");

  return code;
}

export function generateSpecApis(spec: PontxSpec) {
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
        generatePureApis(spec.apis)
      )}\n};\n`
    );
  }

  const tagGroupsTypes = tagGroups
    .map((tagGroup) => {
      const tagComment = generateTagComment(tagGroup);
      const tagGroupCode = `${tagGroup.name}: {\n${indentation(2)(
        generatePureApis(tagGroup.apis)
      )}\n}`;

      return tagComment + tagGroupCode;
    })
    .join("\n\n");

  return (
    prefix + `export type APIs = {\n${indentation(2)(tagGroupsTypes)}\n};\n`
  );
}

function generateApiMeta(
  api: PontxAPI
  // tag?: Pick<TagGroup, "name" | "description">
) {
  const apiMeta = {
    method: api.method,
    hasBody: !!api.parameters?.find((param) => param?.in === "body"),
    hasParams: !!api.parameters?.find((param) => param?.in !== "body"),
    consumes: api?.consumes,
    produces: api?.produces,
    path: api.path,
    // tag,
  };

  return apiMeta;
}

export function generateSpecMeta(spec: PontxSpec) {
  const tagGroups = PontxSpec.getTagGroups(spec);
  const hasTags = !!tagGroups.length;

  const specMeta = {
    name: spec.name,
    security: spec.security,
    url: spec.servers,
    apis: _.mapValues(spec.apis, (api, apiName) => {
      // const tag = tagGroups.find((tagGroup) => tagGroup.apis[apiName]);

      return generateApiMeta(api);
    }),
    hasTags,
  };

  return `export const specMeta = ${JSON.stringify(specMeta, null, 2)};`;
}
