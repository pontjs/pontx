import immutableSet from "lodash/fp/set";

export function getDuplicateById<T>(arr: T[], idKey = "name"): null | T {
  if (!arr || !arr.length) {
    return null;
  }

  let result;

  arr.forEach((item, itemIndex) => {
    if (arr.slice(0, itemIndex).find((o) => o[idKey] === item[idKey])) {
      result = item;
      return;
    }
  });

  return result;
}

/**
 * 像 map 一样操作数组
 */
export function mapifyOperateList<T extends { name: string }>(
  operate: "assign" | "delete",
  name: string,
  newValue: T,
  list: T[],
): T[] {
  if (operate === "delete") {
    return (list || []).filter((item) => item.name !== name);
  }

  const index = (list || []).findIndex((item) => item.name === name);
  if (index === -1) {
    return [...(list || []), newValue];
  }

  return (list || []).map((item) => {
    if (item.name === name) {
      return newValue;
    }
    return item;
  });
}

/**
 * @param pathes ['mods', 'modA', 'name']
 * @param newValue newModAName
 * @param obj spec
 * @returns
 */
export function mapifyImmutableOperate(
  result: any,
  operate: "delete" | "assign",
  pathes: Array<string | number>,
  newValue?: any,
) {
  if (!pathes?.length) {
    return newValue;
  }

  let [currentPath, ...restPathes] = pathes;

  if (!restPathes?.length) {
    let returnValue = null;
    if (Array.isArray(result) && typeof currentPath === "string") {
      returnValue = mapifyOperateList(operate, currentPath, newValue, result);
    } else if (operate === "delete") {
      const { [currentPath]: __, ...rest } = result || {};
      returnValue = rest;
    } else {
      returnValue = immutableSet(currentPath, newValue, result);
    }

    return returnValue;
  }

  if (Array.isArray(result) && typeof currentPath === "string") {
    currentPath = result.findIndex((item) => item?.name === currentPath);
  }
  const pathNewValue = mapifyImmutableOperate(result[currentPath], operate, restPathes, newValue);

  return immutableSet(currentPath, pathNewValue, result);
}

/**
 * 像 map 一样操作数组
 * @param pathes ['mods', 'modA', 'name']
 * @param newValue newModAName
 * @param obj spec
 * @returns
 */
export function mapifyGet(result: any, pathes: Array<string | number>) {
  if (!pathes?.length) {
    return result;
  }

  let [currentPath, ...restPathes] = pathes;

  if (Array.isArray(result) && typeof currentPath === "string") {
    currentPath = result.findIndex((item) => item?.name === currentPath);
  }
  return mapifyGet(result[currentPath], restPathes);
}
