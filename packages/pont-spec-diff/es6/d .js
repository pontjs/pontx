export class ApiDiffOp {
    static getParameterDiffItems(diffResult, paramName) {
        const { paths, type, localValue, remoteValue } = diffResult;
        const [fieldName, ...rest] = paths;
        switch (fieldName) {
            case "in": {
                return `参数${paramName}的位置由 ${localValue} 变更为 ${remoteValue}`;
            }
            case "required": {
                if (remoteValue) {
                    return `参数${paramName}的位置由 ${localValue} 变更为 ${remoteValue}`;
                }
            }
        }
    }
    static getAPIDiffItems(diffResult) {
        const { paths, type, localValue, remoteValue } = diffResult;
        const [fieldName, ...rest] = paths;
        switch (fieldName) {
            case "deprecated": {
                return `deprecated 变更为${remoteValue}`;
            }
            case "description":
            case "title":
            case "method":
            case "path": {
                return `${fieldName} 由 ${localValue} 变更为 ${remoteValue}`;
            }
            case "parameters": {
                const [paramName, ...others] = rest;
                if (!(others === null || others === void 0 ? void 0 : others.length)) {
                    if (type === "create") {
                        return "新增请求参数" + paramName;
                    }
                    else if (type === "delete") {
                        return "删除请求参数" + paramName;
                    }
                    else if (type === "update") {
                        return "变更请求参数" + paramName;
                    }
                }
            }
            case "responses": {
            }
        }
    }
}
//# sourceMappingURL=d%20.js.map