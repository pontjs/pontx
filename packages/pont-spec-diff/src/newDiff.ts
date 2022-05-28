import * as _ from "lodash";
import * as PontSpec from "pont-spec";

const diffs = {
  name: "main",
  mods: [
    {
      name: "a",
      interfaces: [
        {
          name: "xx",
          type: "update",
        },
      ],
      description: "b",
      diffs: {
        description: {
          type: "update",
          originValue: "",
        },
      },
    },
  ],
  baseClasses: [{}],
};

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
      return {
        ...schema,
        type: "update",
        diffs: diffObject(
          schema,
          remoteList?.find((item) => item[diffId] === schema[diffId]),
        ),
      };
    })
    .filter((item) => item);

  return [...deletes, ...updates, ...creates];
}

type DiffResult<T> = T & { diffs: { [key in keyof T]: any }; type: "update" | "create" | "delete" };

const diffObject = <T>(localSpec: T, remoteSpec: T): DiffResult<T> => {
  const remoteSpecKeys = Object.keys(remoteSpec || {});
  const localSpecKeys = Object.keys(localSpec || {});
  const diffs = {} as DiffResult<T>["diffs"];
  const diffReuslt = {
    type: "update",
    ...localSpec,
    ...remoteSpec,
  } as any;

  remoteSpecKeys.forEach((key) => {
    if (remoteSpec[key] && !localSpec[key]) {
      diffs[key] = {
        type: "create",
      };
    }
    if (remoteSpec[key] && localSpec[key] && !_.isEqual(remoteSpec[key], localSpec[key])) {
      if (["parameters", "mods", "interfaces", "baseClasses"].includes(key)) {
        diffReuslt[key] = diffList(localSpec[key], remoteSpec[key]);
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

  return {
    ...diffReuslt,
    diffs,
  };
};

export const diffPontSpec = (localSpec: PontSpec.PontSpec, remoteSpec: PontSpec.PontSpec) => {
  return diffObject(localSpec, remoteSpec);
};
