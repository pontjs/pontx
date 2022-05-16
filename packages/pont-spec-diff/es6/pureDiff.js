import * as _ from "lodash";
export function diffList(localList, remoteList, paths, customDiff = {}) {
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
    const updates = _.intersectionBy(localList, remoteList, diffId)
        .map((schema) => {
        if (_.isEqual(localList, remoteList)) {
            return null;
        }
        return diffObject(schema, remoteList === null || remoteList === void 0 ? void 0 : remoteList.find((item) => item[diffId] === schema[diffId]), [...paths, diffId], customDiff);
    })
        .filter((item) => item && (item === null || item === void 0 ? void 0 : item.length))
        .reduce((pre, next) => pre.concat(next), []);
    return [...deletes, ...updates, ...creates];
}
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
const diffObject = (localSpec, remoteSpec, paths, customDiff = {}) => {
    const remoteSpecKeys = Object.keys(remoteSpec || {});
    const localSpecKeys = Object.keys(localSpec || {});
    const diffs = [];
    const objDiff = {
        localValue: localSpec,
        remoteValue: remoteSpec,
        paths,
    };
    remoteSpecKeys.forEach((key) => {
        if (remoteSpec[key] && !localSpec[key]) {
            if (schemaKeys === null || schemaKeys === void 0 ? void 0 : schemaKeys.includes(key)) {
                objDiff.type = "update";
            }
            else {
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
                if (result === null || result === void 0 ? void 0 : result.length) {
                    diffs.push(...result);
                }
            }
            else if (schemaKeys === null || schemaKeys === void 0 ? void 0 : schemaKeys.includes(key)) {
                objDiff.type = "update";
            }
            else {
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
            if (schemaKeys === null || schemaKeys === void 0 ? void 0 : schemaKeys.includes(key)) {
                objDiff.type = "update";
            }
            else {
                diffs.push({ type: "delete", paths: [...paths, key], localValue: localSpec[key] });
            }
        }
    });
    if (objDiff.type === "update") {
        diffs.push(objDiff);
    }
    return diffs;
};
export const diffApi = (localApi, remoteApi) => {
    const responsesDiff = (pre, next, customDiff) => {
        return diffObject(pre === null || pre === void 0 ? void 0 : pre["200"], next === null || next === void 0 ? void 0 : next["200"], ["responses", "200"], customDiff);
    };
    const customer = {
        schema: diffObject,
        responses: responsesDiff,
        parameters: diffList,
    };
    return diffObject(localApi, remoteApi, [], customer);
};
export const diffBaseClass = (localClazz, Clazz) => {
    const customer = {
        items: diffObject,
        properties: diffObject,
        additionalProperties: diffObject,
        schema: diffObject,
    };
    return diffObject(localClazz, Clazz, [], customer);
};
//# sourceMappingURL=pureDiff.js.map