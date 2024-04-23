import * as PontSpec from "pontx-spec";
import * as _ from "lodash";
import { TypeScriptGenerator, indentation } from "pontx-generate";

export type request<T> = (params: number, T) => Promise<any>;

export const apiInterface = (api: PontSpec.PontAPI, controllerName: string, specName: string) => {
  const prefix = controllerName ? `API.${controllerName}.${api.name}` : `API.${api.name}`;
  const Params = `${prefix}.Params`;
  const BodyParams = `${prefix}.bodyParams`;
  const Response = `${prefix}.APIResponse`;
  const Method = `${prefix}.method`;
  const apiCommentCode = TypeScriptGenerator.apiComment(api);

  return apiCommentCode + `${api.name}: (request: ${prefix}.Request, options?: RequestOptions) => Promise<${Response}>`;
};

export const toUpperCamelCase = (str: string) => {
  if (!str?.length) {
    return str;
  }

  return str.slice(0, 1).toUpperCase() + str.slice(1);
};

/** 生成单个接口的类型和 SDK 代码，可扩展其它方法 */
export const specInterfaceDts = (spec: PontSpec.PontSpec) => {
  const hasMods = PontSpec.PontSpec.checkHasMods(spec);
  const mods = PontSpec.PontSpec.getMods(spec);

  const prefixCode = `import type { API, defs } from './type.d.ts';
type RequestOptions = {}

`;

  if (hasMods) {
    return (
      prefixCode +
      [
        `export namespace Services {`,
        _.map(mods, (controller) => {
          const controllerComment = controller?.description ? `/** ${controller.description} */\n` : "";

          const controllerCode = [
            `export interface ${toUpperCamelCase(controller.name as any)}Service {`,
            _.map(controller.interfaces, (api, name) => {
              const apiContentTsCode = indentation(2)(apiInterface(api, controller.name as string, spec.name));
              return apiContentTsCode;
            }).join("\n\n"),
            `}`,
          ].join("\n");

          return indentation(2)(controllerComment + controllerCode);
        }).join("\n\n"),
        `}`,
      ].join("\n")
    );
  }

  return (
    prefixCode +
    [
      `export namespace ${toUpperCamelCase(spec.name)}Service {`,
      _.map(spec.apis, (api, name) => {
        const apiContentTsCode = indentation(2)(apiInterface(api, "", spec.name));
        return apiContentTsCode;
      }).join("\n\n"),
      `}`,
    ].join("\n")
  );
};
