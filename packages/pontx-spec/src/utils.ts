import immutableSet from "lodash/fp/set";
import * as _ from "lodash";

export type ObjectMap<T> = {
  [key: string]: T;
};

// /**
//  * 像 map 一样操作数组
//  */
// export function mapifyOperateList<T extends { name: string }>(
//   operate: "assign" | "delete" | "update",
//   name: string,
//   newValueOrUpdator: ((data: T) => T) | T,
//   list: T[],
// ): T[] {
//   if (operate === "delete") {
//     return (list || []).filter((item) => item.name !== name);
//   }

//   const newValue = newValueOrUpdator as T;
//   const updator = newValueOrUpdator as (data: T) => T;

//   const index = (list || []).findIndex((item) => item.name === name);
//   if (index === -1) {
//     if (operate === "assign") {
//       return [...(list || []), newValue];
//     }
//     return list;
//   }

//   return (list || []).map((item) => {
//     if (item.name === name) {
//       if (operate === "update") {
//         return updator(item);
//       }
//       return newValue;
//     }
//     return item;
//   });
// }

// /**
//  * @param pathes ['mods', 'modA', 'name']
//  * @param newValue newModAName
//  * @param obj spec
//  * @returns
//  */
// export function mapifyImmutableOperate(
//   result: any,
//   operate: "delete" | "assign" | "update",
//   pathes: Array<string | number>,
//   newValueOrUpdator?: any,
// ) {
//   const newValue = newValueOrUpdator;
//   if (!pathes?.length) {
//     return newValue;
//   }

//   let [currentPath, ...restPathes] = pathes;

//   if (!restPathes?.length) {
//     let returnValue = null;
//     if (Array.isArray(result) && typeof currentPath === "string") {
//       returnValue = mapifyOperateList(operate, currentPath, newValue, result);
//     } else if (operate === "delete") {
//       const { [currentPath]: __, ...rest } = result || {};
//       returnValue = rest;
//     } else if (operate === "update") {
//       const updated = newValueOrUpdator(_.get(result, currentPath));
//       returnValue = immutableSet(currentPath, updated, result);
//     } else {
//       returnValue = immutableSet(currentPath, newValue, result);
//     }

//     return returnValue;
//   }

//   if (Array.isArray(result) && typeof currentPath === "string") {
//     currentPath = result.findIndex((item) => item?.name === currentPath);
//   }
//   const pathNewValue = mapifyImmutableOperate(result[currentPath], operate, restPathes, newValue);

//   return immutableSet(currentPath, pathNewValue, result);
// }

// /**
//  * 像 map 一样操作数组
//  * @param pathes ['mods', 'modA', 'name']
//  * @param newValue newModAName
//  * @param obj spec
//  * @returns
//  */
// export function mapifyGet(result: any, pathes: Array<string | number>) {
//   if (!pathes?.length) {
//     return result;
//   }

//   let [currentPath, ...restPathes] = pathes;

//   if (Array.isArray(result) && typeof currentPath === "string") {
//     currentPath = result.findIndex((item) => item?.name === currentPath);
//   }
//   return mapifyGet(result[currentPath], restPathes);
// }

export function orderMap<T>(map: ObjectMap<T>) {
  const result = {} as ObjectMap<T>;

  _.orderBy(Object.keys(map || {})).forEach((key) => {
    result[key] = map[key];
  });

  return result;
}

export function removeMapKeys<T extends ObjectMap<any>>(obj: T, checkRemoveKey: (key: string) => boolean): T {
  if (!obj) {
    return obj;
  }

  return Object.keys(obj || {})
    .filter((key) => !checkRemoveKey(key))
    .reduce((result, key) => {
      return {
        ...result,
        [key]: obj[key],
      };
    }, {} as T);
}
