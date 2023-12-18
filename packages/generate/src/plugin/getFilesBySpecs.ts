import { GetFilesBySpecs, SnippetsProvider } from "./plugin";
import * as PontSpec from "pontx-spec";
import * as _ from "lodash";
import { PontManager } from "pontx-manager";
import { specIndexDTsWithoutController } from "./template/specIndexDTsWithoutController";
import { specIndexDTsWithController } from "./template/specIndexDTsWithController";
import { specJSON } from "./template/metaJSON";
import { specInterfaceDts } from "./template/specInterfaceDts";
import { getRootFiles } from "./template/rootFiles";

export const getFilesBySpecs: GetFilesBySpecs = async (origins, requestMethodsTypeCode?: string) => {
  const specDirs = _.map(origins, (origin) => {
    const spec = origin.spec;
    const withoutControllers = PontSpec.PontSpec.getMods(spec)?.[0]?.name === PontSpec.WithoutModsName;
    const specDts = withoutControllers ? specIndexDTsWithoutController(spec) : specIndexDTsWithController(spec);
    const myRequestMethodsTypeCode =
      origin.conf?.plugins?.generate?.options?.requestMethodsCode ||
      origin.conf?.plugins?.generate?.options?.requestMethods ||
      requestMethodsTypeCode;

    return {
      [spec.name]: {
        "type.d.ts": specDts,
        "meta.json": specJSON(spec),
        "spec.d.ts": specInterfaceDts(spec, myRequestMethodsTypeCode),
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
    ...getRootFiles(origins),
  };
};
