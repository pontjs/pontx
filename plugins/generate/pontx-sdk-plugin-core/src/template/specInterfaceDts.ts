import { GetFilesBySpecs, indentation, SnippetsProvider, TypeScriptGenerator } from "pontx-generate";
import * as PontSpec from "pontx-spec";
import * as _ from "lodash";

export type request<T> = (params: number, T) => Promise<any>;

export const apiInterface = (api: PontSpec.PontAPI, controllerName: string, specName: string) => {
  const prefix = controllerName ? `API.${controllerName}.${api.name}` : `API.${api.name}`;
  const Params = `${prefix}.Params`;
  const BodyParams = `${prefix}.bodyParams`;
  const Response = `${prefix}.APIReponse`;
  const apiCommentCode = TypeScriptGenerator.apiComment(api);

  return apiCommentCode + `${api.name}: RequestMethods<${Params}, ${BodyParams}, ${Response}>;`;
};

const DEFAULT_REQUEST_METHODS_TYPE_CODE = `
type OptionalBodyRequest<Params, BodyParams, Response> = BodyParams extends null | undefined
  ? (params: Params, options?: RequestInit) => Promise<Response>
  : (params: Params, options?: { body: BodyParams } & Omit<RequestInit, "body" | "params">) => Promise<Response>;

type RequestMethods<Params = any, BodyParams = any, Response = any> = {
  request: OptionalBodyRequest<Params, BodyParams, Response>;
};
`;

/** 生成单个接口的类型和 SDK 代码，可扩展其它方法 */
export const specInterfaceDts = (
  spec: PontSpec.PontSpec,
  requestMethodsTypeCode = DEFAULT_REQUEST_METHODS_TYPE_CODE,
) => {
  const hasMods = PontSpec.PontSpec.checkHasMods(spec);
  const mods = PontSpec.PontSpec.getMods(spec);

  const prefixCode = `import type { API, defs } from './type.d.ts';
${requestMethodsTypeCode}
`;

  if (hasMods) {
    return (
      prefixCode +
      [
        `export type APIs = {`,
        _.map(mods, (controller) => {
          const controllerComment = controller?.description ? `/** ${controller.description} */\n` : "";

          const controllerCode = [
            `${controller.name}: {`,
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
      `export type APIs = {`,
      _.map(spec.apis, (api, name) => {
        const apiContentTsCode = indentation(2)(apiInterface(api, "", spec.name));
        return apiContentTsCode;
      }).join("\n\n"),
      `}`,
    ].join("\n")
  );
};
