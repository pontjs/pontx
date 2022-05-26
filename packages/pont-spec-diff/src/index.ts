import { PontSpec } from "pont-spec";
import { diffList, diffMap, DiffSchemaType, getDiffMethod } from "./diff";

export function diffSpecs(currentSpecs: PontSpec[], newSpecs: PontSpec[]) {
  // if (currentSpecs?.length < 2 && newSpecs.length < 2) {
  //   return diffSpec(currentSpecs?.[0], newSpecs?.[0]);
  // }

  return diffList(
    {
      schemaType: DiffSchemaType.PontSpec,
      diffType: "list",
      nextSchema: newSpecs,
      preSchema: currentSpecs,
    },
    "name",
  );
}

export function diffSpec(currentSpec: PontSpec, newSpec: PontSpec) {
  if (newSpec && !currentSpec) {
    return {
      diffType: "detail",
      schemaType: DiffSchemaType.PontSpec,
      type: "create",
      nextSchema: newSpec,
    };
  } else if (!newSpec && currentSpec) {
    return {
      diffType: "detail",
      schemaType: DiffSchemaType.PontSpec,
      type: "create",
      preSchema: currentSpec,
    };
  }

  return getDiffMethod({
    schemaType: DiffSchemaType.PontSpec,
    diffType: "map",
    nextSchema: newSpec,
    preSchema: currentSpec,
  });
}
