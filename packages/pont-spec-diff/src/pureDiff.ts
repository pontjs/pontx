import * as _ from "lodash";
import * as PontSpec from "pont-spec";

export type DiffResult = { remoteValue: any; localValue: any; paths: string[]; type: "update" | "create" | "delete" };

export function diffList<T>(
  localList: T[],
  remoteList: T[],
  paths: string[],
  customDiff = {} as CustomDiff,
): DiffResult[] {
  const diffId = "name";
  const creates = _.differenceBy(remoteList, localList, diffId).map((schema) => {
    return {
      [diffId]: schema[diffId],
      remoteValue: schema,
      paths: [...paths, schema[diffId]],
      type: "create",
    };
  });
  const deletes = _.differenceBy(localList, remoteList, diffId).map((schema) => {
    return {
      [diffId]: schema[diffId],
      localValue: schema,
      paths: [...paths, schema[diffId]],
      type: "delete",
    };
  });
  const updates: any[] = _.intersectionBy(localList, remoteList, diffId)
    .map((schema: T) => {
      if (_.isEqual(localList, remoteList)) {
        return null;
      }
      return diffObject(
        schema,
        remoteList?.find((item) => item[diffId] === schema[diffId]),
        [...paths, diffId],
        customDiff,
      );
    })
    .filter((item) => item && (item?.length as any))
    .reduce((pre, next) => pre.concat(next), []);

  return [...deletes, ...updates, ...creates];
}

type CustomDiff = {
  [key: string]: <T>(pre: T, next: T, paths: string[], customDiff) => DiffResult[];
};

const schemaKeys = [
  "type",
  "typeName",
  "examples",
  "example",
  "default",
  "isDefsType",
  "templateArgs",
  "templateIndex",
  "title",
  "description",
  "format",
  "required",
  "enum",
  "example",
  "examples",
  "maxItems",
  "minItems",
  "maximum",
  "minimum",
  "maxLength",
  "minLength",
];

const diffObject = <T>(localSpec: T, remoteSpec: T, paths: string[], customDiff = {} as CustomDiff): DiffResult[] => {
  const remoteSpecKeys = Object.keys(remoteSpec || {});
  const localSpecKeys = Object.keys(localSpec || {});
  const diffs = [];
  const objDiff = {
    localValue: localSpec,
    remoteValue: remoteSpec,
    paths,
  } as DiffResult;

  remoteSpecKeys.forEach((key) => {
    if (remoteSpec[key] && !localSpec[key]) {
      if (schemaKeys?.includes(key)) {
        objDiff.type = "update";
      } else {
        diffs.push({
          type: "create",
          remoteValue: remoteSpec[key],
          paths: [...paths, key],
        });
      }
    }

    if (remoteSpec[key] && localSpec[key] && !_.isEqual(remoteSpec[key], localSpec[key])) {
      if (customDiff[key]) {
        const result = customDiff[key](localSpec[key], remoteSpec[key], [...paths, key], customDiff);
        if (result?.length) {
          diffs.push(...result);
        }
      } else if (schemaKeys?.includes(key)) {
        objDiff.type = "update";
      } else {
        diffs.push({
          localValue: localSpec[key],
          remoteValue: remoteSpec[key],
          paths: [...paths, key],
          type: "update",
        });
      }
    }
  });

  localSpecKeys.forEach((key) => {
    if (localSpec[key] && !remoteSpec[key]) {
      if (schemaKeys?.includes(key)) {
        objDiff.type = "update";
      } else {
        diffs.push({ type: "delete", paths: [...paths, key], localValue: localSpec[key] });
      }
    }
  });

  if (objDiff.type === "update") {
    diffs.push(objDiff);
  }

  return diffs;
};

export const diffApi = (localApi: PontSpec.Interface, remoteApi: PontSpec.Interface): DiffResult[] => {
  const responsesDiff = (pre, next, customDiff) => {
    return diffObject(pre?.["200"], next?.["200"], ["responses", "200"], customDiff);
  };

  const customer = {
    schema: diffObject as any,
    responses: responsesDiff,
    parameters: diffList,
  } as CustomDiff;
  return diffObject(localApi, remoteApi, [], customer);
};

export const diffBaseClass = (localClazz: PontSpec.BaseClass, Clazz: PontSpec.BaseClass): DiffResult[] => {
  const customer = {
    items: diffObject as any,
    properties: diffObject as any,
    additionalProperties: diffObject as any,
    schema: diffObject as any,
  } as CustomDiff;
  return diffObject(localClazz, Clazz, [], customer);
};
