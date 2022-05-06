import * as fp from "lodash/fp";
import * as _ from "lodash";

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
