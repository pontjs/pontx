import { createContainer } from "unstated-next";
import * as React from "react";
// import * as spec from "../mocks/spec.json";
import { PontSpec, Interface, BaseClass } from "pont-spec";
import { PontUIService } from "../service";

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

const useContext = () => {
  const [localSpecs, changeSpecs] = React.useState([] as PontSpec[]);
  const [remoteSpecs, changeRemoteSpecs] = React.useState([] as PontSpec[]);
  // const specs = [spec as any] as PontSpec[];
  const [selectedMeta, changeSelectedMeta] = React.useState(null as any as Interface | BaseClass);
  const [currSpec, changeCurrSpec] = React.useState(localSpecs?.[0]);
  const [page, changePage] = React.useState(PageType.Diff);
  const remoteSpec = remoteSpecs?.find((spec) => spec.name === currSpec?.name) || remoteSpecs[0];

  const fetchPontSpecs = React.useCallback(() => {
    return PontUIService.requestPontSpecs().then((result) => {
      changeSpecs(result.localSpecs);
      changeCurrSpec(getLocalSpec(result.localSpecs, result.currentOriginName as any));
      changeRemoteSpecs(result.remoteSpecs);
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
