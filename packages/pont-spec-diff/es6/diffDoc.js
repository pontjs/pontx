export class BaseClazzDiffOp {
    static getFields(fields) {
        return (fields || [])
            .map((field, fieldIndex) => {
            if (fieldIndex !== (fields === null || fields === void 0 ? void 0 : fields.length) - 1 && field !== "[*]") {
                return field + ".";
            }
            return field;
        })
            .join("");
    }
    static getSchemaDiffItems(diffResult, fields) {
        const { paths, type, localValue, remoteValue } = diffResult;
        const [fieldName, ...rest] = paths;
        if (!(paths === null || paths === void 0 ? void 0 : paths.length)) {
            return {
                localValue,
                remoteValue,
                fields,
                type,
            };
        }
        switch (fieldName) {
            case "items": {
                return BaseClazzDiffOp.getSchemaDiffItems({
                    paths: rest,
                    type,
                    localValue,
                    remoteValue,
                }, [...fields, "[*]"]);
            }
            case "properties": {
                const [prop, ...others] = rest;
                return BaseClazzDiffOp.getSchemaDiffItems({
                    paths: others,
                    type,
                    localValue,
                    remoteValue,
                }, [...fields, prop]);
            }
            case "additionalProperties": {
                return BaseClazzDiffOp.getSchemaDiffItems({
                    paths: rest,
                    type,
                    localValue,
                    remoteValue,
                }, [...fields, "[*]"]);
            }
        }
    }
}
//# sourceMappingURL=diffDoc.js.map