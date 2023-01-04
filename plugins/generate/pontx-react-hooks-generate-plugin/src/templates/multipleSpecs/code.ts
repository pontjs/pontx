import { GetFilesBySpecs, indentation, SnippetsProvider, TypeScriptGenerator } from "pontx-generate";
import * as PontSpec from "pontx-spec";
import * as _ from "lodash";
import { generateClassComment } from "pontx-generate/lib/language/TypeScript";

export const getRuntimeAPIMetaCode = (api: PontSpec.PontAPI) => {
  return JSON.stringify(
    {
      method: api.method,
      path: api.path,
      hasBody: api.parameters?.some((param) => param?.in === "body"),
    },
    null,
    2,
  );
};

export const entryIndexTs = (specs: PontSpec.PontSpec[]) =>
  `import * as API from "./API";
import * as defs from "./defs";

export {
  API,
  defs
}
`;

export const entryAPITs = (specs: PontSpec.PontSpec[]) =>
  `${specs.map((spec) => `export { API as ${spec.name} } from "./${spec.name}/index";`).join("\n") + "\n"}`;

export const entryDefsTs = (specs: PontSpec.PontSpec[]) =>
  `${specs.map((spec) => `export { defs as ${spec.name} } from "./${spec.name}/index";`).join("\n") + "\n"}`;

export const apiTsCode = (api: PontSpec.PontAPI, name: string, specName: string) => {
  const paramTypes = TypeScriptGenerator.generateParametersTsCode(api, specName);
  const isGet = api.method?.toUpperCase() === "GET";
  const hasBody = api.parameters?.some((param) => param?.in === "body");

  const code = [
    `const Methods = getAPIMethods({ path: '${api.path}', method: '${api.method}', hasBody: ${hasBody} });`,
    ``,
    `export ${paramTypes};`,
    `export type APIReponse = ${TypeScriptGenerator.generateSchemaCode(api.responses["200"]?.schema)};`,
    `type HooksParams = (() => Params) | Params;`,
    `export const trigger: (params?: HooksParams, shouldRevalidate?: boolean) => any = Methods.trigger;`,
    `type Mutate = (params?: HooksParams, newValue?: any, shouldRevalidate?: boolean) => any`,
    `export const mutate: Mutate = Methods.mutate;`,
    `export const request: {
  ${TypeScriptGenerator.generateApiRequestCode(api, specName)}
} = Methods.request;`,
    `export const ${isGet ? "useRequest" : "useDeprecatedRequest"}: {
  (params?: HooksParams, options?: ConfigInterface): {
    isLoading: boolean;
    data: APIReponse;
    error: Error;
    mutate: Mutate;
  }
} = Methods.${isGet ? "useRequest" : "useDeprecatedRequest"};`,
  ].join("\n");

  return code;
};

export const specIndexTs = (spec: PontSpec.PontSpec) => {
  return `import { getAPIMethods } from '../builtin/core';

type ObjectMap<Key extends string | number | symbol = any, Value = any> = {
  [key in Key]: Value;
};

declare type ConfigInterface = import("swr").ConfigInterface;

export namespace defs {
${_.map(spec.definitions, (schema, name) => {
  const comment = generateClassComment(schema, name);
  return indentation(2)(comment + "export " + TypeScriptGenerator.generateBaseClassTsCode(schema, name, true));
}).join("\n\n")}
}

export namespace API {
  ${_.map(spec.apis, (api, name) => {
    const apiContentTsCode = indentation(2)(apiTsCode(api, name, ""));
    const apiCommentCode = TypeScriptGenerator.apiComment(api);
    const apiNamespaceCode = indentation(2)(`${apiCommentCode}export namespace ${name} {
${apiContentTsCode}
};`);
    return apiNamespaceCode;
  }).join("\n\n")}
}
`;
};

// export const metaData = {
//   apis: {
// ${_.map(spec.apis, (api) => {
//   return indentation(4)(`${api.name}: ${getRuntimeAPIMetaCode(api)}`);
// }).join("\n")}
//   },
//   defs: {
// ${_.map(spec.definitions, (schema, name) => {
//   return indentation(4)(`${name}: '${name}',`);
// }).join("\n")}
//   },
// };
