import * as PontSpec from "pontx-spec";
import * as _ from "lodash";
import { TypeScriptGenerator } from "../../language";
import { indentation } from "../../utils";

export type request<T> = (params: number, T) => Promise<any>;

export const apiInterface = (api: PontSpec.PontAPI, controllerName: string, specName: string) => {
  const prefix = controllerName ? `API.${controllerName}.${api.name}` : `API.${api.name}`;
  const Params = `${prefix}.Params`;
  const BodyParams = `${prefix}.bodyParams`;
  const Response = `${prefix}.APIResponse`;
  const Method = `${prefix}.method`;
  const apiCommentCode = TypeScriptGenerator.apiComment(api);

  return apiCommentCode + `${api.name}: RequestMethods<${Params}, ${BodyParams}, ${Response}, ${Method}>;`;
};
