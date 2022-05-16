export class PontJsonSchema {
    constructor() {
        this.templateIndex = -1;
        this.templateArgs = [];
    }
    static toString(schema) {
        var _a, _b, _c;
        if (!schema) {
            return "any";
        }
        if (typeof (schema === null || schema === void 0 ? void 0 : schema.templateIndex) === "number" && (schema === null || schema === void 0 ? void 0 : schema.templateIndex) !== -1) {
            return `T${schema.templateIndex}`;
        }
        if ((_a = schema.enum) === null || _a === void 0 ? void 0 : _a.length) {
            return schema.enum.map((el) => (typeof el === "string" ? `'${el}'` : el)).join(" | ");
        }
        if ((_b = schema.templateArgs) === null || _b === void 0 ? void 0 : _b.length) {
            const defName = schema.isDefsType ? `defs.${schema.typeName}` : schema.typeName;
            if ((_c = schema.templateArgs) === null || _c === void 0 ? void 0 : _c.length) {
                return `${defName}<${schema.templateArgs.map((arg) => PontJsonSchema.toString(arg)).join(", ")}>`;
            }
            return defName;
        }
        switch (schema === null || schema === void 0 ? void 0 : schema.typeName) {
            case "long":
            case "integer": {
                return "number";
            }
            case "file": {
                return "File";
            }
            case "Array":
            case "array": {
                if (schema.items) {
                    return `Array<${PontJsonSchema.toString(schema.items)}>`;
                }
                return "[]";
            }
            case "object": {
                if (schema === null || schema === void 0 ? void 0 : schema.properties) {
                    return `{ ${Object.keys(schema.properties)
                        .map((propName) => {
                        var _a;
                        return `${propName}: ${PontJsonSchema.toString((_a = schema.properties) === null || _a === void 0 ? void 0 : _a[propName])}`;
                    })
                        .join("; ")} }`;
                }
                if (schema === null || schema === void 0 ? void 0 : schema.additionalProperties) {
                    return `map<string, ${PontJsonSchema.toString(schema === null || schema === void 0 ? void 0 : schema.additionalProperties)}>`;
                }
            }
        }
        return (schema === null || schema === void 0 ? void 0 : schema.typeName) || "any";
    }
    static create() {
        return { type: "string" };
    }
    static checkIsMap(schema) {
        if ((schema === null || schema === void 0 ? void 0 : schema.type) === "object" && !schema.properties) {
            return true;
        }
        return false;
    }
    static getDescription(schema) { }
}
//# sourceMappingURL=dataType.js.map