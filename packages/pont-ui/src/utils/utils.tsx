import * as fp from "lodash/fp";
import * as _ from "lodash";
import { PontSpec } from "pont-spec";

export const immutableSet = (path, newValue, originValue?) => {
  if (originValue === undefined) {
    return (originValue) => {
      return fp.set(path, newValue, originValue);
    };
  }
  return fp.set(path, newValue, originValue);
};

const saveGet = (value, path) => {
  if (Array.isArray(path)) {
    if (path.length) {
      return _.get(value, path);
    } else {
      return value;
    }
  } else {
    if (path) {
      return _.get(value, path);
    }
    return value;
  }
};

export const immutableUpdate = (path, updater: (originValue) => any, originValue?) => {
  if (originValue === undefined) {
    return (originValue) => {
      const originPartValue = saveGet(originValue, path);
      if ((Array.isArray(path) && !path.length) || !path) {
        return updater(originValue);
      }
      return fp.set(path, updater(originPartValue), originValue);
    };
  }

  const originPartValue = saveGet(originValue, path);
  if (!path) {
    return updater(originValue);
  }
  return fp.set(path, updater(originPartValue), originValue);
};

function fuzzyMatch(texts: Array<string | undefined>, keyword: string) {
  if (!keyword) {
    return true;
  }

  return (texts || []).some((text) => {
    if (!text) {
      return false;
    }

    if (text?.toUpperCase()?.includes(keyword?.toUpperCase())) {
      return true;
    }

    return false;
  });
}

export function filterSpec(spec: PontSpec, searchKeyword: string): PontSpec {
  if (!searchKeyword || !spec) {
    return spec;
  }

  const mods = (spec?.mods || [])
    .map((mod) => {
      const apis = (mod.interfaces || []).filter((api) => {
        return fuzzyMatch([api?.name, api?.description, api?.title, api?.path], searchKeyword);
      });

      // const modMatch = fuzzyMatch([mod.description, mod.name], searchKeyword);

      if (apis?.length) {
        return { ...mod, interfaces: apis };
      }
      return null;
    })
    .filter((mod) => mod) as any;
  const baseClasses = (spec?.baseClasses || []).filter((base) => {
    return fuzzyMatch([base?.name, base?.schema?.description, base?.schema?.title], searchKeyword);
  });

  return {
    ...spec,
    mods,
    baseClasses,
  };
}
