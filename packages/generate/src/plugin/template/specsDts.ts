import * as _ from "lodash";
import * as PontSpec from "pontx-spec";

export const specsDts = (specs: PontSpec.PontSpec[]) => {
  const imports = specs.map((spec) => `import { ${spec.name} } from "./${spec.name}/type";`).join("\n");

  return "";
};
