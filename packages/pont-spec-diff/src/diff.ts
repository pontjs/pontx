import * as _ from "lodash";
import * as PontSpec from "pont-spec";

export type DiffResult<T> = T & { diffs: { [key in keyof T]: any }; diffType: "update" | "create" | "delete" };

export function diffList<T>(localList: T[], remoteList: T[], diffId = "name", customDiff) {
  const creates = _.differenceBy(remoteList, localList, diffId).map((schema) => {
    return {
      ...schema,
      diffType: "create",
    };
  });
  const deletes = _.differenceBy(localList, remoteList, diffId).map((schema) => {
    return {
      ...schema,
      diffType: "delete",
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
        customDiff,
      );
    })
    .filter((item) => item && (item?.diffType as any) !== "equal");

  return [...deletes, ...updates, ...creates];
}

type CustomDiff = {
  [key: string]: <T>(pre: T, next: T, custom) => { diffs: any; diffType: string };
};

const diffObject = <T>(localSpec: T, remoteSpec: T, customDiff = {} as CustomDiff): DiffResult<T> => {
  const remoteSpecKeys = Object.keys(remoteSpec || {});
  const localSpecKeys = Object.keys(localSpec || {});
  const diffs = {} as DiffResult<T>["diffs"];
  const diffReuslt = {
    diffType: "update",
    ...localSpec,
    ...remoteSpec,
  } as any;
  let hasDiffResult = false;

  remoteSpecKeys.forEach((key) => {
    if (remoteSpec[key] && !localSpec[key]) {
      diffs[key] = {
        diffType: "create",
      };
    }

    if (remoteSpec[key] && localSpec[key] && !_.isEqual(remoteSpec[key], localSpec[key])) {
      if (customDiff[key]) {
        const { diffs, diffType } = customDiff[key](localSpec[key], remoteSpec[key], customDiff);
        if (diffType !== "equal") {
          hasDiffResult = true;
          diffReuslt[key] = diffs;
        }
      } else {
        diffs[key] = {
          remoteValue: remoteSpec[key],
          diffType: "update",
        };
      }
    }
  });

  localSpecKeys.forEach((key) => {
    if (localSpec[key] && !remoteSpec[key]) {
      diffs[key] = { diffType: "delete" };
    }
  });

  if (!hasDiffResult && !Object.keys(diffs)?.length) {
    return { diffType: "equal" } as any;
  }

  return {
    ...diffReuslt,
    diffs,
  };
};

// const listDiff = (pre, next, customDiff) => {
//   const diffs = diffList(pre, next, "name", customDiff);
//   return { diffs, type: diffs?.length ? "update" : "equal" };
// };
// const objDiff = (pre, next, customDiff) => {
//   const diffs = diffObject(pre, next, customDiff);
//   return { diffs: diffs?.diffs, type: diffs?.type };
// };

// const responsesDiff = (pre, next, customDiff) => {
//   return objDiff(pre?.["200"], next?.["200"], customDiff);
// };

// const apiCustomer = {
//   items: objDiff,
//   properties: objDiff,
//   schema: objDiff,
//   additionalProperties: diffObject as any,
//   responses: responsesDiff,
//   parameters: listDiff,
// } as CustomDiff;

export const diffPontSpec = (localSpec: PontSpec.PontSpec, remoteSpec: PontSpec.PontSpec) => {
  const listDiff = (pre, next, customDiff) => {
    const diffs = diffList(pre, next, "name", customDiff);
    return { diffs, diffType: diffs?.length ? "update" : "equal" };
  };
  const defDiff = (pre, next, customDiff) => {
    const diffResult = diffObject(pre, next, customDiff);

    const result = _.mapValues(diffResult.diffs || {}, (value, key) => {
      if (pre[key] && !next[key]) {
        return { ...pre[key], diffType: "delete" };
      } else if (next[key] && !pre[key]) {
        return { ...next[key], diffType: "create" };
      }
      return diffObject(pre[key], next[key], customDiff);
    });
    return {
      diffType: "update",
      diffs: result,
    };
  };

  const customer = {
    mods: listDiff,
    interfaces: listDiff,
    definitions: defDiff as any,
  } as CustomDiff;

  return diffObject(localSpec, remoteSpec, customer);
};
