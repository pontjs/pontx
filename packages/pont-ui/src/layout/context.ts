import { createContainer } from "unstated-next";
import * as React from "react";
// import * as spec from "../mocks/spec.json";
import { PontSpec, Interface, BaseClass } from "pont-spec";
import { PontUIService } from "../service";
import { diffPontSpec, diffSpec } from "pont-spec-diff";

const useCurrentSpec = (specs: PontSpec[]) => {
  const [currSpec, changeCurrSpec] = React.useState(specs?.[0]);

  React.useEffect(() => {
    if (specs?.length) {
      if (specs.length > 1) {
        if (!specs.find((spec) => spec.name === currSpec.name)) {
          changeCurrSpec(specs[0]);
        }
      } else if (!currSpec) {
        changeCurrSpec(specs[0]);
      }
    }
  }, [specs]);

  return {
    currSpec,
    changeCurrSpec,
  };
};

export enum PageType {
  Doc = "doc",
  Diff = "diff",
}

const useContext = () => {
  const [localSpecs, changeSpecs] = React.useState([] as PontSpec[]);
  const [remoteSpecs, changeRemoteSpecs] = React.useState([] as PontSpec[]);
  // const specs = [spec as any] as PontSpec[];
  const [selectedMeta, changeSelectedMeta] = React.useState(null as any as Interface | BaseClass);
  const { currSpec, changeCurrSpec } = useCurrentSpec(localSpecs || []);
  const [page, changePage] = React.useState(PageType.Doc);

  const fetchPontSpecs = React.useCallback(() => {
    return PontUIService.requestPontSpecs().then((result) => {
      changeSpecs(result.localSpecs);
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
    selectedMeta,
    changeSelectedMeta,
  };
};

export const LayoutContext = createContainer(useContext);
