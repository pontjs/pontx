/**
 * @author jsonHzq
 * @description diff 管理
 */
import * as _ from "lodash";
import { PontSpec, Mod, PontAPI, PontJsonSchema } from "pont-spec";
import { diffPontSpec, DiffResult } from "pont-spec-diff";
import * as React from "react";
import { Table } from "@alicloud/console-components";
// import { SchemaRow } from "../../components/SchemaTable/comps/SchemaRow";

export type ProcessedDiffs<T> = {
  name?: string;
  description?: string;
  processType: "untracked" | "discard" | "staged";
} & DiffResult<T>;

export function getPontSpecByProcessType(diffs, processType: "untracked" | "discard" | "staged") {
  const mapApi = (api: ProcessedDiffs<PontAPI>) => {
    if (api.processType === processType) {
      return api;
    } else if (processType === "untracked" && !api.processType) {
      return { ...api, processType: "untracked" };
    }
    return null;
  };
  const mapMod = (mod: ProcessedDiffs<Mod>) => {
    const interfaces = (mod?.interfaces || []).map(mapApi as any).filter((id) => id);

    if (!mod.processType && processType === "untracked") {
      return {
        ...mod,
        processType: "untracked",
        interfaces,
      };
    } else if (mod.processType === processType) {
      return { ...mod, interfaces };
    } else if (interfaces.length) {
      return { ...mod, interfaces, processType, diffType: "equal" };
    }

    return null;
  };
  const newDefs = Object.keys(diffs?.definitions || {}).reduce((result, key) => {
    let clazz = diffs.definitions[key] as ProcessedDiffs<PontJsonSchema>;
    if (!clazz.processType && processType === "untracked") {
      clazz = {
        ...clazz,
        processType: "untracked",
      };
    } else if (clazz.processType !== processType) {
      clazz = null as any;
    }
    if (clazz) {
      return { ...result, [key]: clazz };
    }
  }, {} as any);

  return {
    ...diffs,
    mods: (diffs?.mods || []).map(mapMod as any).filter((id) => id),
    definitions: newDefs,
  } as ProcessedDiffs<PontSpec>;
}

export function changeAllMetaProcessType(
  diffs,
  fromProcessType: "untracked" | "discard" | "staged",
  processType: "untracked" | "discard" | "staged",
): any {
  const mapApi = (api: ProcessedDiffs<PontAPI>) => {
    if ((api.processType || "untracked") === fromProcessType) {
      return { ...api, processType };
    }
    return api;
  };
  const mapMod = (mod: ProcessedDiffs<Mod>) => {
    const newProcessType = (mod.processType || "untracked") === fromProcessType ? processType : mod.processType;
    return { ...mod, processType: newProcessType, interfaces: (mod.interfaces || []).map((api) => mapApi(api as any)) };
  };
  const mapClazz = (clazz: ProcessedDiffs<PontJsonSchema>) => {
    const newProcessType = (clazz.processType || "untracked") === fromProcessType ? processType : clazz.processType;
    return { ...clazz, processType: newProcessType };
  };

  return {
    ...diffs,
    mods: (diffs.mods || []).map(mapMod as any),
    definitions: _.mapValues(diffs.definitions || {}, mapClazz),
  };
}

export function getNewSpec(diffs: ProcessedDiffs<PontSpec>, localSpec, remoteSpec): PontSpec {
  const stagedDiffs: any = getPontSpecByProcessType(diffs, "staged");
  let newMods = [...localSpec.mods];
  stagedDiffs.mods.forEach((mod) => {
    const diffsMod: ProcessedDiffs<Mod> = mod as any;
    if (diffsMod.diffType === "create") {
      const remoteMod = (remoteSpec.mods || []).find((mod) => mod.name === diffsMod.name);
      if (remoteMod) {
        newMods.push(remoteMod);
      }
    } else if (diffsMod.diffType === "delete") {
      newMods = newMods.filter((mod) => mod.name !== diffsMod.name);
    } else if (diffsMod.diffType === "update") {
      const localMod = (localSpec.mods || []).find((mod) => mod.name === diffsMod.name);
      const remoteMod = (remoteSpec.mods || []).find((mod) => mod.name === diffsMod.name);
      let newApis = [...(localMod?.interfaces || [])];

      (diffsMod.interfaces || []).forEach((api) => {
        const apiDiff: ProcessedDiffs<PontAPI> = api as any;
        const remoteApi = (remoteMod?.interfaces || []).find((api) => api.name === apiDiff.name);

        if (apiDiff.diffType === "create") {
          if (remoteApi) {
            newApis.push(remoteApi);
          }
        } else if (apiDiff.diffType === "delete") {
          newApis = newApis.filter((api) => api.name !== apiDiff.name);
        } else if (apiDiff.diffType === "update") {
          newApis = newApis.map((api) => {
            if (api.name === apiDiff.name) {
              return remoteApi as PontAPI;
            }
            return api;
          });
        }
      });
      const newMod = {
        ...remoteMod,
        interfaces: newApis,
      } as Mod;
      newMods = (newMods || []).map((mod) => {
        if (mod.name === newMod.name) {
          return newMod;
        }
        return mod;
      });
    }
  });

  const defs = { ...localSpec.definitions };

  _.forEach(stagedDiffs.definitions, (schema, name) => {
    const remoteClazz = remoteSpec.definitions[name];

    if ((schema?.diffType as any) === "create") {
      if (remoteClazz) {
        defs[name] = remoteClazz;
      }
    } else if ((schema?.diffType as any) === "delete") {
      delete defs[name];
    } else if ((schema?.diffType as any) === "update") {
      defs[name] = remoteClazz;
    }
  });
  return {
    ...localSpec,
    mods: newMods,
    definitions: defs,
  };
}

export const getDiffs = (diffResult: DiffResult<any>) => {
  const diffItems = Object.keys(diffResult.diffs || {}).map((key) => {
    return {
      fieldName: key,
      diffType: diffResult.diffs[key]?.diffType,
      localValue: diffResult[key],
      remoteValue: diffResult.diffs[key]?.remoteValue,
    };
  });

  if (!diffItems?.length) {
    return null;
  }

  return (
    <Table
      columns={[
        {
          dataIndex: "diffType",
          title: "变更类型",
          cell: (type) => {
            const textMap = {
              update: "变更",
              create: "新增",
              delete: "删除",
            };
            return textMap[type];
          },
        },
        {
          dataIndex: "fieldName",
          title: "字段",
        },
        {
          dataIndex: "localValue",
          title: "本地数据",
          cell(value) {
            if (typeof value === "object") {
              return JSON.stringify(value, null, 2);
            }
            return value;
          },
        },
        {
          dataIndex: "remoteValue",
          title: "传入数据",
          cell(value) {
            if (typeof value === "object") {
              return JSON.stringify(value, null, 2);
            }
            return value;
          },
        },
      ]}
      dataSource={diffItems}
    ></Table>
  );
};
