import { GetFilesBySpecs, indentation, SnippetsProvider, TypeScriptGenerator } from "pontx-generate";
import * as PontSpec from "pontx-spec";
import * as _ from "lodash";
import { PontManager } from "pontx-manager";
import { specIndexDTsWithoutController } from "./template/specIndexDTsWithoutController";
import { specIndexDTsWithController } from "./template/specIndexDTsWithController";
import { specJSON } from "./template/metaJSON";
import { specInterfaceDts } from "./template/specInterfaceDts";

export const getFilesBySpecs: GetFilesBySpecs = async (origins, requestMethodsTypeCode?: string) => {
  const specs = (origins || []).map((origin) => origin.spec);

  const specDirs = _.map(specs, (spec) => {
    const withoutControllers = PontSpec.PontSpec.getMods(spec)?.[0]?.name === PontSpec.WithoutModsName;
    const specDts = withoutControllers ? specIndexDTsWithoutController(spec) : specIndexDTsWithController(spec);

    return {
      [spec.name]: {
        "type.d.ts": specDts,
        "meta.json": specJSON(spec),
        "spec.d.ts": specInterfaceDts(spec, requestMethodsTypeCode),
        [PontManager.lockFilename]: JSON.stringify(spec, null, 2),
      },
    };
  }).reduce((pre, curr) => {
    return {
      ...pre,
      ...curr,
    };
  }, {});

  return {
    ...specDirs,
    // "index.ts": specsIndexTs(specs),
  };
};
