import * as _ from "lodash";
import * as PontSpec from "pont-spec";

export type DiffResult<T> = T & { diffs: { [key in keyof T]: any }; type: "update" | "create" | "delete" };

export function diffList<T>(localList: T[], remoteList: T[], diffId = "name") {
  const creates = _.differenceBy(remoteList, localList, diffId).map((schema) => {
    return {
      ...schema,
      type: "create",
    };
  });
  const deletes = _.differenceBy(localList, remoteList, diffId).map((schema) => {
    return {
      ...schema,
      type: "delete",
    };
  });
  const updates: T[] = _.intersectionBy(localList, remoteList, diffId)
    .map((schema: T) => {
      if (_.isEqual(localList, remoteList)) {
        return null;
      }
      return diffObject(
        schema,
        remoteList?.find((item) => item[diffId] === schema[diffId]),
      );
    })
    .filter((item) => item && (item?.type as any) !== "equal");

  return [...deletes, ...updates, ...creates];
}

const diffObject = <T>(localSpec: T, remoteSpec: T, shouldDiffObject = false): DiffResult<T> => {
  const remoteSpecKeys = Object.keys(remoteSpec || {});
  const localSpecKeys = Object.keys(localSpec || {});
  const diffs = {} as DiffResult<T>["diffs"];
  const diffReuslt = {
    type: "update",
    ...localSpec,
    ...remoteSpec,
  } as any;
  let hasDiffResult = false;

  remoteSpecKeys.forEach((key) => {
    if (remoteSpec[key] && !localSpec[key]) {
      diffs[key] = {
        type: "create",
      };
    }
    if (remoteSpec[key] && localSpec[key] && !_.isEqual(remoteSpec[key], localSpec[key])) {
      if (["parameters", "mods", "interfaces", "baseClasses"].includes(key)) {
        diffReuslt[key] = diffList(localSpec[key], remoteSpec[key]);
        if (diffReuslt[key]?.length) {
          hasDiffResult = true;
        }
      } else if (shouldDiffObject && typeof diffReuslt[key] === "object") {
        const objDiff = diffObject(localSpec[key], remoteSpec[key], true);
        if (objDiff?.type !== "equal") {
          diffReuslt[key] = objDiff;
          hasDiffResult = true;
        }
      } else if (["responses"].includes(key)) {
        const responsesDiff = diffObject(localSpec[key], remoteSpec[key], true);
        if (responsesDiff?.type !== "equal") {
          diffReuslt[key] = responsesDiff;
          hasDiffResult = true;
        }
      } else {
        diffs[key] = {
          remoteValue: remoteSpec[key],
          type: "update",
        };
      }
    }
  });

  localSpecKeys.forEach((key) => {
    if (localSpec[key] && !remoteSpec[key]) {
      diffs[key] = { type: "delete" };
    }
  });

  if (!hasDiffResult && !Object.keys(diffs)?.length) {
    return { type: "equal" } as any;
  }

  return {
    ...diffReuslt,
    diffs,
  };
};

export const diffPontSpec = (localSpec: PontSpec.PontSpec, remoteSpec: PontSpec.PontSpec) => {
  return diffObject(localSpec, remoteSpec);
};
