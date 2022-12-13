import { GetFilesBySpecs, SnippetsProvider } from "pontx-generate";
import * as _ from "lodash";
import { getBuiltinStructure } from "../utils";

import { apiTsCode, entryIndexTs, getRuntimeAPIMetaCode, specIndexTs } from "./code";
import { specIndexTsWithModule } from "./useModule";
import { PontSpec, PontManager } from "pontx-manager";
import { WithoutModsName } from "pontx-spec";
export { apiTsCode, entryIndexTs, getRuntimeAPIMetaCode, specIndexTs };

export { specIndexTsWithModule, template as templateWithModule } from "./useModule";

export const snippetsProvider: SnippetsProvider = (info) => {
  const assignModule = info.controllerName ? `.${info.controllerName}` : "";
  const snippets = [
    {
      name: "request async",
      code: `try {
  const data = await API.${info.originName}${assignModule}.${info.api.name}.request({  });
} catch (e) {
}`,
    },
  ];

  if (info.api.method?.toUpperCase() === "GET") {
    snippets.push({
      name: "useRequest",
      code: `const { data, isLoading, error, mutate } = API.${info.originName}${assignModule}.${info.api.name}.useRequest({  })`,
    });
  }

  return snippets;
};

export const getFilesBySpecs: GetFilesBySpecs = async (origins) => {
  const specs = (origins || []).map((origin) => origin.spec);

  const specDirs = _.map(specs, (spec) => {
    const hasNoMod = PontSpec.PontSpec.getMods(spec)?.[0]?.name === WithoutModsName;
    const code = hasNoMod ? specIndexTs(spec) : specIndexTsWithModule(spec);

    return {
      [spec.name]: {
        "index.ts": code,
        [PontManager.lockFilename]: JSON.stringify(spec, null, 2),
      },
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
