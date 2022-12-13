import * as _ from "lodash";
import { GetFilesBySpecs, indentation, TypeScriptGenerator } from "pontx-generate";
import * as PontSpec from "pontx-spec";
import { getBuiltinStructure } from "../utils";
import { apiTsCode, entryIndexTs, getRuntimeAPIMetaCode } from "./code";

export const specIndexTsWithModule = (spec: PontSpec.PontSpec) => {
  const specModules = PontSpec.PontSpec.getMods(spec);
  return `import { getAPIMethods } from '../builtin/core';

type ObjectMap<Key extends string | number | symbol = any, Value = any> = {
  [key in Key]: Value;
};

declare type ConfigInterface = import("swr").ConfigInterface;

export namespace defs {
${_.map(spec.definitions, (schema, name) => {
  return indentation(2)("export " + TypeScriptGenerator.generateBaseClassTsCode(schema, name, true));
}).join("\n\n")}
}

export namespace API {
  ${_.map(specModules, (apiModule) => {
    const apiModuleComment = apiModule?.description ? `/** ${apiModule.description} */\n` : "";
    const apisCode = _.map(apiModule.interfaces, (api) => {
      const apiContentTsCode = indentation(2)(apiTsCode(api, api.name, ""));
      const apiNamespaceCode = indentation(2)(`export namespace ${api.name} {\n${apiContentTsCode}\n};`);
      return apiNamespaceCode;
    }).join("\n\n");
    const moduleCode = `${apiModuleComment}export namespace ${apiModule.name} {\n${apisCode}\n}`;
    return indentation(2)(moduleCode);
  }).join("\n\n")}
}
`;
};

export const template = async (specs: PontSpec.PontSpec[]) => {
  const specDirs = _.map(specs, (spec, name) => {
    return {
      [name]: specIndexTsWithModule(spec),
    };
  }).reduce((pre, curr) => {
    return {
      ...pre,
      ...curr,
    };
  }, {});
  const builtinStructure = await getBuiltinStructure();

  return {
    ...specDirs,
    builtin: builtinStructure,
    "index.ts": entryIndexTs(specs),
  };
};

// export const metaData = {
//   apis: {\n${_.map(specModules, (apiModule) => {
//     const apisCode = _.map(apiModule.interfaces, (api) => {
//       return indentation(2)(`${api.name}: ${getRuntimeAPIMetaCode(api)},`);
//     }).join("\n");
//     const moduleCode = `${apiModule.name}: {\n${apisCode}\n},`;
//     return indentation(4)(moduleCode);
//   }).join("\n\n")}
//   },
//   defs: {
// ${_.map(spec.definitions, (schema, name) => {
//   return indentation(4)(`${name}: '${name}',`);
// }).join("\n")}
//   },
// };
