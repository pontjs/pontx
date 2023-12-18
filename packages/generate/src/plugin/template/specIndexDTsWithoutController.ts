import * as _ from "lodash";
import * as PontSpec from "pontx-spec";
import { apiDTsCode } from "./apiDTs";
import { TypeScriptGenerator } from "../../language";
import { indentation } from "../../utils";
import { generateClassComment } from "../../language/TypeScript";

export const specIndexDTsWithoutController = (spec: PontSpec.PontSpec) => {
  return `
type ObjectMap<Key extends string | number | symbol = any, Value = any> = {
  [key in Key]: Value;
};

export namespace defs {
${_.map(spec.definitions, (schema, name) => {
  const comment = generateClassComment(schema, name);
  return indentation(2)(comment + "export " + TypeScriptGenerator.generateBaseClassTsCode(schema, name, true));
}).join("\n\n")}
}

export namespace API {
  ${_.map(spec.apis, (api, name) => {
    const apiContentTsCode = indentation(2)(apiDTsCode(api, name, ""));
    const apiCommentCode = TypeScriptGenerator.apiComment(api);
    const apiNamespaceCode = indentation(2)(`${apiCommentCode}export namespace ${name} {
${apiContentTsCode}
};`);
    return apiNamespaceCode;
  }).join("\n\n")}
}
`;
};
