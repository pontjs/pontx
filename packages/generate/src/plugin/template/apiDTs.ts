import * as PontSpec from "pontx-spec";
import * as _ from "lodash";
import { TypeScriptGenerator } from "../../language";

/** 生成单个接口的类型和 SDK 代码，可扩展其它方法 */
export const apiDTsCode = (api: PontSpec.PontAPI, controllerName: string, specName: string) => {
  const paramTypes = TypeScriptGenerator.generateParametersTsCode(api, specName, false);
  const bodyParam = api.parameters?.find((param) => param.in === "body");
  let bodyParamType = "undefined";
  if (bodyParam) {
    const bodyParamSchema = bodyParam?.schema;
    bodyParamType = TypeScriptGenerator.generateSchemaCode(bodyParamSchema, specName);
  }
  let method = api?.method;

  const code = [
    `export ${paramTypes};`,
    method ? `export type method = '${method.toUpperCase()}';` : "",
    `export type bodyParams = ${bodyParamType};`,
    `export type APIResponse = ${TypeScriptGenerator.generateSchemaCode(api.responses["200"]?.schema)};`,
  ]
    .filter((id) => id)
    .join("\n");

  return code;
};
