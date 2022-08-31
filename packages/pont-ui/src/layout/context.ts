import { createContainer } from "unstated-next";
import * as React from "react";
// import * as spec from "../mocks/spec.json";
import { PontSpec, PontAPI } from "pont-spec";
// import { PontUIService } from "../service";
import { PontUIService } from "../service";
import { diffPontSpec } from "pont-spec-diff";
import * as _ from "lodash";

export enum PageType {
  Doc = "doc",
  Diff = "diff",
}

const getLocalSpec = (specs: PontSpec[], specName: string) => {
  if (specs.length > 1) {
    const foundSpec = specs.find((spec) => spec.name === specName);
    if (!foundSpec) {
      return specs[0];
    } else {
      return foundSpec;
    }
  } else {
    return specs[0];
  }
};

export type Meta = {
  modName?: string;
  name: string;
  type: "api" | "baseClass";
  spec?: any;
};

const useContext = () => {
  const [localSpecs, changeSpecs] = React.useState([] as PontSpec[]);
  const [remoteSpecs, changeRemoteSpecs] = React.useState([] as PontSpec[]);
  // const specs = [spec as any] as PontSpec[];
  const [selectedMeta, changeSelectedMeta] = React.useState(null as Meta);
  const [currSpec, changeCurrSpec] = React.useState(localSpecs?.[0]);
  const [page, changePage] = React.useState(PageType.Diff);
  const remoteSpec = remoteSpecs?.find((spec) => spec.name === currSpec?.name) || remoteSpecs[0];

  const fetchPontSpecs = React.useCallback(() => {
    return PontUIService.requestPontSpecs().then((result) => {
      const localSpec = getLocalSpec(result.localSpecs, result?.currentOriginName || "");
      changeCurrSpec(localSpec);
      changeRemoteSpecs(result.remoteSpecs);
      changeSpecs(result.localSpecs);

      const remoteSpec = result.remoteSpecs?.find((spec) => spec.name === localSpec?.name) || remoteSpecs?.[0];
      const diffs = diffPontSpec(localSpec, remoteSpec);
      const diffsCnt = ((diffs as any)?.mods?.length || 0) + (_.isEmpty(diffs?.definitions) ? 0 : 1);

      if (diffsCnt) {
        changePage(PageType.Diff);
      } else {
        changePage(PageType.Doc);
      }
    });
  }, []);

  React.useEffect(() => {
    fetchPontSpecs();
  }, []);

  return {
    specs: localSpecs,
    page,
    remoteSpecs,
    changePage,
    fetchPontSpecs,
    changeCurrSpec,
    currSpec,
    remoteSpec,
    selectedMeta,
    changeSelectedMeta,
  };
};

export const LayoutContext = createContainer(useContext);
