var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import immutableSet from "lodash/fp/set";
export function getDuplicateById(arr, idKey = "name") {
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
export function mapifyOperateList(operate, name, newValue, list) {
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
export function mapifyImmutableOperate(result, operate, pathes, newValue) {
    if (!(pathes === null || pathes === void 0 ? void 0 : pathes.length)) {
        return newValue;
    }
    let [currentPath, ...restPathes] = pathes;
    if (!(restPathes === null || restPathes === void 0 ? void 0 : restPathes.length)) {
        let returnValue = null;
        if (Array.isArray(result) && typeof currentPath === "string") {
            returnValue = mapifyOperateList(operate, currentPath, newValue, result);
        }
        else if (operate === "delete") {
            const _a = result || {}, _b = currentPath, __ = _a[_b], rest = __rest(_a, [typeof _b === "symbol" ? _b : _b + ""]);
            returnValue = rest;
        }
        else {
            returnValue = immutableSet(currentPath, newValue, result);
        }
        return returnValue;
    }
    if (Array.isArray(result) && typeof currentPath === "string") {
        currentPath = result.findIndex((item) => (item === null || item === void 0 ? void 0 : item.name) === currentPath);
    }
    const pathNewValue = mapifyImmutableOperate(result[currentPath], operate, restPathes, newValue);
    return immutableSet(currentPath, pathNewValue, result);
}
export function mapifyGet(result, pathes) {
    if (!(pathes === null || pathes === void 0 ? void 0 : pathes.length)) {
        return result;
    }
    let [currentPath, ...restPathes] = pathes;
    if (Array.isArray(result) && typeof currentPath === "string") {
        currentPath = result.findIndex((item) => (item === null || item === void 0 ? void 0 : item.name) === currentPath);
    }
    return mapifyGet(result[currentPath], restPathes);
}
//# sourceMappingURL=utils.js.map