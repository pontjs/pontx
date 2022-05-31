/**
 * @author jsonHzq
 * @description diff 管理
 */
import * as _ from "lodash";
import * as PontSpec from "pont-spec";
import { diffPontSpec, DiffResult } from "pont-spec-diff";
import { BaseClass } from "../apiDoc/BaseClass";
import * as React from "react";
import { Table } from "@alicloud/console-components";
import { SchemaRow } from "../../components/SchemaTable/comps/SchemaRow";

export type ProcessedDiffs<T> = {
  name?: string;
  description?: string;
  processType: "untracked" | "discard" | "staged";
} & DiffResult<T>;

export function getPontSpecByProcessType(
  diffs: ProcessedDiffs<PontSpec.PontSpec>,
  processType: "untracked" | "discard" | "staged",
): ProcessedDiffs<PontSpec.PontSpec> {
  const mapApi = (api: ProcessedDiffs<PontSpec.Interface>) => {
    if (api.processType === processType) {
      return api;
    } else if (processType === "untracked" && !api.processType) {
      return { ...api, processType: "untracked" };
    }
    return null;
  };
  const mapMod = (mod: ProcessedDiffs<PontSpec.Mod>) => {
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
      return { ...mod, interfaces, processType, type: "equal" };
    }

    return null;
  };
  const mapClazz = (clazz: ProcessedDiffs<PontSpec.BaseClass>) => {
    if (!clazz.processType && processType === "untracked") {
      return {
        ...clazz,
        processType: "untracked",
      };
    } else if (clazz.processType === processType) {
      return clazz;
    }

    return null;
  };

  return {
    ...diffs,
    mods: (diffs?.mods || []).map(mapMod as any).filter((id) => id),
    baseClasses: (diffs?.baseClasses || []).map(mapClazz as any).filter((id) => id),
  } as ProcessedDiffs<PontSpec.PontSpec>;
}

export function changeAllMetaProcessType(
  diffs: ProcessedDiffs<PontSpec.PontSpec>,
  fromProcessType: "untracked" | "discard" | "staged",
  processType: "untracked" | "discard" | "staged",
) {
  const mapApi = (api: ProcessedDiffs<PontSpec.Interface>) => {
    if ((api.processType || "untracked") === fromProcessType) {
      return { ...api, processType };
    }
    return api;
  };
  const mapMod = (mod: ProcessedDiffs<PontSpec.Mod>) => {
    const newProcessType = (mod.processType || "untracked") === fromProcessType ? processType : mod.processType;
    return { ...mod, processType: newProcessType, interfaces: (mod.interfaces || []).map((api) => mapApi(api as any)) };
  };
  const mapClazz = (clazz: ProcessedDiffs<PontSpec.BaseClass>) => {
    const newProcessType = (clazz.processType || "untracked") === fromProcessType ? processType : clazz.processType;
    return { ...clazz, processType: newProcessType };
  };

  return {
    ...diffs,
    mods: (diffs.mods || []).map(mapMod as any),
    baseClasses: (diffs.baseClasses || []).map(mapClazz as any),
  };
}

export function getNewSpec(
  diffs: ProcessedDiffs<PontSpec.PontSpec>,
  localSpec: PontSpec.PontSpec,
  remoteSpec: PontSpec.PontSpec,
): PontSpec.PontSpec {
  const stagedDiffs = getPontSpecByProcessType(diffs, "staged");
  let newMods = [...localSpec.mods];
  stagedDiffs.mods.forEach((mod) => {
    const diffsMod: ProcessedDiffs<PontSpec.Mod> = mod as any;
    if (diffsMod.type === "create") {
      const remoteMod = (remoteSpec.mods || []).find((mod) => mod.name === diffsMod.name);
      if (remoteMod) {
        newMods.push(remoteMod);
      }
    } else if (diffsMod.type === "delete") {
      newMods = newMods.filter((mod) => mod.name !== diffsMod.name);
    } else if (diffsMod.type === "update") {
      const localMod = (localSpec.mods || []).find((mod) => mod.name === diffsMod.name);
      const remoteMod = (remoteSpec.mods || []).find((mod) => mod.name === diffsMod.name);
      let newApis = [...(localMod?.interfaces || [])];

      (diffsMod.interfaces || []).forEach((api) => {
        const apiDiff: ProcessedDiffs<PontSpec.Interface> = api as any;
        const remoteApi = (remoteMod?.interfaces || []).find((api) => api.name === apiDiff.name);

        if (apiDiff.type === "create") {
          if (remoteApi) {
            newApis.push(remoteApi);
          }
        } else if (apiDiff.type === "delete") {
          newApis = newApis.filter((api) => api.name !== apiDiff.name);
        } else if (apiDiff.type === "update") {
          newApis = newApis.map((api) => {
            if (api.name === apiDiff.name) {
              return remoteApi as PontSpec.Interface;
            }
            return api;
          });
        }
      });
      const newMod = {
        ...remoteMod,
        interfaces: newApis,
      } as PontSpec.Mod;
      newMods = (newMods || []).map((mod) => {
        if (mod.name === newMod.name) {
          return newMod;
        }
        return mod;
      });
    }
  });

  let newBaseClasses = [...localSpec.baseClasses];
  stagedDiffs.baseClasses.forEach((clazz) => {
    const clazzDiff: ProcessedDiffs<PontSpec.BaseClass> = clazz as any;
    const remoteClazz = (remoteSpec.baseClasses || []).find((clazz) => clazz.name === clazzDiff.name);

    if (clazzDiff.type === "create") {
      if (remoteClazz) {
        newBaseClasses.push(remoteClazz);
      }
    } else if (clazzDiff.type === "delete") {
      newBaseClasses = newBaseClasses.filter((clazz) => clazz.name !== clazzDiff.name);
    } else if (clazzDiff.type === "update") {
      newBaseClasses = newBaseClasses.map((clazz) => {
        if (clazz.name === remoteClazz?.name) {
          return remoteClazz;
        }
        return clazz;
      });
    }
  });

  return {
    ...localSpec,
    mods: newMods,
    baseClasses: newBaseClasses,
  };
}

export const getDiffs = (diffResult: DiffResult<any>) => {
  const diffItems = Object.keys(diffResult.diffs || {}).map((key) => {
    return {
      fieldName: key,
      diffType: diffResult.diffs[key]?.type,
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
