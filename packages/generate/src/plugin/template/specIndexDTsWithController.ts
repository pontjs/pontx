import * as _ from "lodash";
import * as PontSpec from "pontx-spec";
import { apiDTsCode } from "./apiDTs";
import { TypeScriptGenerator } from "../../language";
import { indentation } from "../../utils";

export const specIndexDTsWithController = (spec: PontSpec.PontSpec) => {
  const specModules = PontSpec.PontSpec.getMods(spec);
  return `type ObjectMap<Key extends string | number | symbol = any, Value = any> = {
  [key in Key]: Value;
};

export namespace defs {
${_.map(spec.definitions, (schema, name) => {
  return indentation(2)("export " + TypeScriptGenerator.generateBaseClassTsCode(schema, name, false));
}).join("\n\n")}
}

export namespace API {
  ${_.map(specModules, (apiModule) => {
    const apiModuleComment = apiModule?.description ? `/** ${apiModule.description} */\n` : "";
    const apisCode = _.map(apiModule.interfaces, (api) => {
      const apiContentTsCode = indentation(2)(apiDTsCode(api, api.name, ""));
      const apiCommentCode = TypeScriptGenerator.apiComment(api);
      const apiNamespaceCode = indentation(2)(
        `${apiCommentCode}export namespace ${api.name} {\n${apiContentTsCode}\n}`,
      );
      return apiNamespaceCode;
    }).join("\n\n");
    const moduleCode = `${apiModuleComment}export namespace ${apiModule.name} {\n${apisCode}\n}`;
    return indentation(2)(moduleCode);
  }).join("\n\n")}
}
`;
};
