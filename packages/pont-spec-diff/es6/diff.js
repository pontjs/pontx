import * as _ from "lodash";
export function diffList(localList, remoteList, diffId = "name", customDiff) {
    const creates = _.differenceBy(remoteList, localList, diffId).map((schema) => {
        return Object.assign(Object.assign({}, schema), { type: "create" });
    });
    const deletes = _.differenceBy(localList, remoteList, diffId).map((schema) => {
        return Object.assign(Object.assign({}, schema), { type: "delete" });
    });
    const updates = _.intersectionBy(localList, remoteList, diffId)
        .map((schema) => {
        if (_.isEqual(localList, remoteList)) {
            return null;
        }
        return diffObject(schema, remoteList === null || remoteList === void 0 ? void 0 : remoteList.find((item) => item[diffId] === schema[diffId]), customDiff);
    })
        .filter((item) => item && (item === null || item === void 0 ? void 0 : item.type) !== "equal");
    return [...deletes, ...updates, ...creates];
}
const diffObject = (localSpec, remoteSpec, customDiff = {}) => {
    var _a;
    const remoteSpecKeys = Object.keys(remoteSpec || {});
    const localSpecKeys = Object.keys(localSpec || {});
    const diffs = {};
    const diffReuslt = Object.assign(Object.assign({ type: "update" }, localSpec), remoteSpec);
    let hasDiffResult = false;
    remoteSpecKeys.forEach((key) => {
        if (remoteSpec[key] && !localSpec[key]) {
            diffs[key] = {
                type: "create",
            };
        }
        if (remoteSpec[key] && localSpec[key] && !_.isEqual(remoteSpec[key], localSpec[key])) {
            if (customDiff[key]) {
                const { diffs, type } = customDiff[key](localSpec[key], remoteSpec[key], customDiff);
                if (type !== "equal") {
                    hasDiffResult = true;
                    diffReuslt[key] = diffs;
                }
            }
            else {
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
    if (!hasDiffResult && !((_a = Object.keys(diffs)) === null || _a === void 0 ? void 0 : _a.length)) {
        return { type: "equal" };
    }
    return Object.assign(Object.assign({}, diffReuslt), { diffs });
};
export const diffPontSpec = (localSpec, remoteSpec) => {
    const listDiff = (pre, next, customDiff) => {
        const diffs = diffList(pre, next, "name", customDiff);
        return { diffs, type: (diffs === null || diffs === void 0 ? void 0 : diffs.length) ? "update" : "equal" };
    };
    const customer = {
        mods: listDiff,
        interfaces: listDiff,
        baseClasses: listDiff,
    };
    return diffObject(localSpec, remoteSpec, customer);
};
//# sourceMappingURL=diff.js.map