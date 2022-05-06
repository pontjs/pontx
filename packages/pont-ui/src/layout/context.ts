import { createContainer } from "unstated-next";
import * as React from "react";
import * as spec from "../mocks/spec.json";
import { PontSpec, Interface, BaseClass } from "pont-spec";

const useCurrentSpec = (specs: PontSpec[]) => {
  const [currSpec, changeCurrSpec] = React.useState(specs[0]);

  React.useEffect(() => {
    if (specs.length) {
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

const useContext = () => {
  const specs = [spec as any] as PontSpec[];
  const [selectedMeta, changeSelectedMeta] = React.useState(null as any as Interface | BaseClass);
  const { currSpec, changeCurrSpec } = useCurrentSpec(specs);

  return {
    specs,
    changeCurrSpec,
    currSpec,
    selectedMeta,
    changeSelectedMeta,
  };
};

export const LayoutContext = createContainer(useContext);
