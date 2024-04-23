import { GetFilesBySpecs, SnippetsProvider } from "./plugin";
import * as PontSpec from "pontx-spec";
import * as _ from "lodash";
import { PontManager } from "pontx-manager";
import { specIndexDTsWithoutController } from "./template/specIndexDTsWithoutController";
import { specIndexDTsWithController } from "./template/specIndexDTsWithController";
import { specJSON } from "./template/metaJSON";
import { getRootFiles } from "./template/rootFiles";
import { SpecTsOptions, apiRequestTs, specDTs, specJs } from "./template/specTs";
import { getFetchTs } from "./template/fetch";
import { specIndexTs } from "./template/specIndex";

export const getFilesBySpecs: GetFilesBySpecs = async (origins, options) => {
  const specDirs = _.map(origins, (origin) => {
    const spec = origin.spec;
    const withoutControllers = PontSpec.PontSpec.getMods(spec)?.[0]?.name === PontSpec.WithoutModsName;
    const typeDts = withoutControllers ? specIndexDTsWithoutController(spec) : specIndexDTsWithController(spec);
    const apiSDKOptions = new SpecTsOptions(options);

    return {
      [spec.name]: {
        "type.d.ts": typeDts,
        "meta.js": specJSON(spec),
        "spec.d.ts": specDTs(spec),
        "index.ts": specIndexTs(),
        "request.ts": apiRequestTs(apiSDKOptions),
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
