import * as PontSpec from "pontx-spec";
import * as _ from "lodash";

/** 生成单个接口元数据 */
export const apiSpecJSON = (api: PontSpec.PontAPI, controllerName: string, specName: string) => {
  const apiMeta = {
    method: api.method,
    hasBody: !!api.parameters?.find((param) => param?.in === "body"),
    hasParams: !!api.parameters?.find((param) => param?.in !== "body"),
    consumes: api?.consumes,
    produces: api?.produces,
    apiName: api.name,
    path: api.path,
    specName,
    controllerName,
  };
  if (api?.security) {
    return {
      ...apiMeta,
      security: api.security,
    };
  }
  return apiMeta;
};

export const pontxSpecJSON = (spec: PontSpec.PontSpec) => {
  const hasController = PontSpec.PontSpec.checkHasMods(spec);
  const apis = {};

  if (hasController) {
    const mods = PontSpec.PontSpec.getMods(spec);
    _.map(mods, (controller) => {
      const mod = {};
      apis[controller.name as string] = mod;
      _.map(controller.interfaces, (api) => {
        mod[api.name] = apiSpecJSON(api, controller.name as string, spec.name);
      });
    });
  } else {
    _.map(spec.apis, (api) => {
      apis[api.name] = apiSpecJSON(api, "", spec.name);
    });
  }

  const securityInfo = {};
  if (spec.securitySchemes) {
    securityInfo["securitySchemes"] = spec.securitySchemes;
  }
  if (spec.security) {
    securityInfo["security"] = spec.security;
  }

  return {
    apis,
    hasController,
    specName: spec.name,
    description: spec.description,
    basePath: spec.basePath,
    host: spec.host,
    ...securityInfo,
  };
};

export const specJSON = (spec: PontSpec.PontSpec) => {
  const sourceSpec = pontxSpecJSON(spec);

  const code = JSON.stringify(sourceSpec, null, 2);

  return `const specMeta = ${code};\nexport default specMeta;`;
};
