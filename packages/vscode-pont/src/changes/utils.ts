import { diffPontSpec, DiffResult } from "pont-spec-diff";
import {
  PontSpec,
  Mod,
  PontAPI,
  PontJsonSchema,
  ObjectMap,
  PontJsonPointer,
  removeMapKeys,
  PontSpecs,
  PontDirectory,
} from "pont-spec";
import { PontManager } from "pont-manager";

export class StagedChange {
  metaType: MetaType;
  specName?: string;
  modName?: string | Symbol;
  apiName?: string;
  structName?: string;

  static checkIsEqual(change: StagedChange, meta: StagedChange) {
    if (change.metaType === meta.metaType) {
      switch (meta.metaType) {
        case MetaType.API: {
          return ["apiName", "modName", "specName"].every((key) => meta[key] === change[key]);
        }
        case MetaType.Struct: {
          return ["structName", "specName"].every((key) => meta[key] === change[key]);
        }
        case MetaType.Mod: {
          return ["specName", "modName"].every((key) => meta[key] === change[key]);
        }
        case MetaType.Definitions: {
          return ["specName"].every((key) => meta[key] === change[key]);
        }
        case MetaType.Spec: {
          return ["specName"].every((key) => meta[key] === change[key]);
        }
        case MetaType.All: {
          return true;
        }
      }
    }
    return false;
  }
}

export type PontSpecWithMods = {
  mods: Mod[];
  name: string;
  definitions: PontSpec["definitions"];
  ext?: any;
};

export function getPontSpecByProcessType(
  specDiffs: PontSpecWithMods,
  processType: "untracked" | "staged",
  stagedChanges: StagedChange[],
): PontSpecWithMods {
  const changedDiffs = {
    ...specDiffs,
    mods: (specDiffs.mods || []).map((mod) => {
      const apis = (mod.interfaces || []).filter((api) => (api as any).diffType && (api as any).diffType !== "equal");
      return { ...mod, interfaces: apis } as Mod;
    }),
    definitions: removeMapKeys(specDiffs.definitions, (name) => {
      const struct = specDiffs.definitions[name];
      if (struct?.diffType && struct?.diffType !== "equal") {
        return false;
      }
      return true;
    }),
  };

  const filterApi = (api: PontAPI, modName: string | Symbol) => {
    const hasStaged = stagedChanges.find((change) =>
      StagedChange.checkIsEqual(change, {
        metaType: MetaType.API,
        apiName: api.name,
        modName,
        specName: specDiffs.name,
      }),
    );
    if (hasStaged && processType === "staged") {
      return true;
    } else if (!hasStaged && processType === "untracked") {
      return true;
    }
    return false;
  };
  const mapMod = (mod: Mod): Mod | false => {
    const apis = mod.interfaces.filter((api) => filterApi(api, mod.name));

    if (apis.length) {
      return {
        ...mod,
        interfaces: apis,
      };
    }
    return false;
  };
  const filterStruct = (struct: PontJsonSchema) => {
    const hasStaged = stagedChanges.find((change) =>
      StagedChange.checkIsEqual(change, {
        metaType: MetaType.Struct,
        structName: struct.name,
        specName: specDiffs.name,
      }),
    );
    if ((hasStaged && processType === "staged") || (!hasStaged && processType === "untracked")) {
      return true;
    }
    return false;
  };

  const newDefs = removeMapKeys(changedDiffs.definitions, (name) => {
    if (filterStruct(changedDiffs.definitions?.[name])) {
      return false;
    }
    return true;
  });

  return {
    ...changedDiffs,
    mods: (changedDiffs?.mods || []).map(mapMod as any).filter((id) => id) as any,
    definitions: newDefs,
  };
}

export enum MetaType {
  All,
  Spec,
  Mod,
  Definitions,
  Struct,
  API,
}

export class PontSpecDiffs extends PontSpec {
  static updateSpecsProcessType(
    specDiffs: PontSpecWithMods[],
    meta: { metaType: MetaType; specName?: string; modName?: string; apiName?: string; structName?: string },
    processType: "staged" | "untracked",
    stagedChanges: StagedChange[],
  ) {
    const hasSingleSpec = specDiffs?.length === 1 && !specDiffs[0]?.name;
    const specIndex = hasSingleSpec ? 0 : specDiffs?.findIndex((spec) => spec.name === meta.specName);

    const duplicateIndex = stagedChanges?.findIndex((change) => {
      return StagedChange.checkIsEqual(change, meta);
    });

    if (meta.metaType === MetaType.API || meta.metaType === MetaType.Struct) {
      if (processType === "staged") {
        if (duplicateIndex !== -1) {
          return stagedChanges;
        }
        return [...stagedChanges, meta];
      } else if (processType === "untracked") {
        if (duplicateIndex !== -1) {
          return stagedChanges.filter((change, index) => index !== duplicateIndex);
        }
        return stagedChanges;
      }
    } else if (meta.metaType === MetaType.Mod) {
      const mod: Mod = PontJsonPointer.get(specDiffs, `[${specIndex}].mods[name=${meta.modName}]`);

      return (mod.interfaces || []).reduce(
        (result, api) => {
          return PontSpecDiffs.updateSpecsProcessType(
            specDiffs,
            {
              metaType: MetaType.API,
              apiName: api.name,
              modName: meta.modName,
              specName: meta.specName,
            },
            processType,
            result,
          );
        },
        [
          ...stagedChanges,
          {
            modName: meta.modName,
            specName: meta.specName,
            metaType: MetaType.Mod,
          },
        ] as StagedChange[],
      );
    } else if (meta.metaType === MetaType.Definitions) {
      const defs: PontSpec["definitions"] = PontJsonPointer.get(specDiffs, `[${specIndex}].definitions`);

      return Object.keys(defs || {}).reduce((result, name) => {
        return PontSpecDiffs.updateSpecsProcessType(
          specDiffs,
          {
            metaType: MetaType.Struct,
            structName: name,
            specName: meta.specName,
          },
          processType,
          result,
        );
      }, stagedChanges);
    } else if (meta.metaType === MetaType.Spec) {
      const spec: PontSpecWithMods = PontJsonPointer.get(specDiffs, `[${specIndex}]`);

      const firstResult = (spec.mods || []).reduce(
        (result, mod) => {
          return PontSpecDiffs.updateSpecsProcessType(
            specDiffs,
            {
              metaType: MetaType.Mod,
              modName: mod.name as any,
              specName: meta.specName,
            },
            processType,
            result,
          );
        },
        [
          ...stagedChanges,
          {
            MetaType: MetaType.Spec,
            specName: meta.specName,
          },
        ] as StagedChange[],
      );
      return PontSpecDiffs.updateSpecsProcessType(
        specDiffs,
        {
          metaType: MetaType.Definitions,
          specName: meta.specName,
        },
        processType,
        firstResult,
      );
    } else if (meta.metaType === MetaType.All) {
      return (specDiffs || []).reduce((result, spec) => {
        return PontSpecDiffs.updateSpecsProcessType(
          specDiffs,
          {
            metaType: MetaType.Spec,
            specName: spec.name,
          },
          processType,
          result,
        );
      }, stagedChanges);
    }
  }

  static updateSpecsByProcessType(
    stagedSpecs: PontSpec[],
    pontManager: PontManager,
    meta: { metaType: MetaType; specName?: string; modName?: string; apiName?: string; structName?: string },
    processType: "staged" | "untracked",
  ) {
    const [fromSpecs, toSpecs] =
      processType === "staged"
        ? [pontManager.localPontSpecs, pontManager.remotePontSpecs]
        : [stagedSpecs, pontManager.localPontSpecs];

    switch (meta.metaType) {
      case MetaType.All: {
        return toSpecs;
      }
      case MetaType.Spec: {
        return PontSpecs.updateSpec(stagedSpecs, meta.specName, PontSpecs.getSpecByName(toSpecs, meta.specName));
      }
      case MetaType.Mod: {
        const fromSpecIndex = PontSpecs.getUpdateSpecIndex(fromSpecs, meta.specName);
        const toSpecIndex = PontSpecs.getSpecIndex(toSpecs, meta.specName);
        const toApis = toSpecs[toSpecIndex]?.apis;
        const toDir = PontJsonPointer.get(
          toSpecs,
          `${toSpecIndex}.directories[namespace=${meta.modName}]`,
        ) as PontDirectory;
        if (!toDir) {
          const result = PontJsonPointer.remove(fromSpecs, `${fromSpecIndex}.directories[namespace=${meta.modName}]`);
          return PontJsonPointer.removeMapKeyBy(result, `${fromSpecIndex}.apis`, (key) => {
            if ((key + "" || "").split("/")?.[0] === meta.modName) {
              return true;
            }
            return false;
          });
        }

        const result = PontJsonPointer.set(fromSpecs, `${fromSpecIndex}.directories[namespace=${meta.modName}]`, toDir);
        const newApis = (toDir?.children || []).reduce((result, name: string) => {
          return {
            ...result,
            name: toApis[name],
          };
        }, {});
        return PontJsonPointer.update(result, `${fromSpecIndex}.apis`, (apis) => {
          return {
            ...apis,
            ...newApis,
          };
        });
      }
      case MetaType.Definitions: {
        const fromSpecIndex = PontSpecs.getUpdateSpecIndex(fromSpecs, meta.specName);
        const toSpecIndex = PontSpecs.getSpecIndex(toSpecs, meta.specName);
        const toDefs = PontJsonPointer.get(toSpecs, `${toSpecIndex}.definitions`);

        return PontJsonPointer.set(fromSpecs, `${fromSpecIndex}.definitions`, toDefs);
      }
      case MetaType.API: {
        const fromSpecIndex = PontSpecs.getUpdateSpecIndex(fromSpecs, meta.specName);
        const toSpecIndex = PontSpecs.getSpecIndex(toSpecs, meta.specName);
        const toApi = PontJsonPointer.get(toSpecs, `${toSpecIndex}.apis.[${meta.modName}/${meta.apiName}]`);

        return PontJsonPointer.set(fromSpecs, `${fromSpecIndex}.apis[${meta.modName}/${meta.apiName}]`, toApi);
      }
      case MetaType.Struct: {
        const fromSpecIndex = PontSpecs.getUpdateSpecIndex(fromSpecs, meta.specName);
        const toSpecIndex = PontSpecs.getSpecIndex(toSpecs, meta.specName);
        const toStruct = PontJsonPointer.get(toSpecs, `${toSpecIndex}.definitions.${meta.structName}`);

        return PontJsonPointer.set(fromSpecs, `${fromSpecIndex}.definitions.${meta.structName}`, toStruct);
      }
    }
  }
}
