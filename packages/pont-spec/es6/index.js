import { PontJsonSchema } from "./dataType";
import { Parameter } from "./parameter";
import { getDuplicateById, mapifyImmutableOperate, mapifyOperateList, mapifyGet } from "./utils";
import * as _ from "lodash";
export { PontJsonSchema, Parameter, mapifyImmutableOperate, mapifyOperateList, mapifyGet };
export class Interface {
}
export class Mod {
    constructor(mod) {
        this.interfaces = [];
        this.interfaces = _.orderBy(mod.interfaces, "path");
    }
}
export class BaseClass {
}
export class PontSpec {
    constructor(ds) {
        this.baseClasses = [];
        this.mods = [];
        if (ds) {
            PontSpec.reOrder(ds);
        }
    }
    static reOrder(ds) {
        return Object.assign(Object.assign({}, ds), { baseClasses: _.orderBy(ds.baseClasses, "name"), mods: _.orderBy(ds.mods, "name") });
    }
    static validateLock(ds) {
        const errors = [];
        ds.mods.forEach((mod) => {
            if (!mod.name) {
                errors.push(`lock 文件不合法，发现没有 name 属性的模块;`);
            }
        });
        ds.baseClasses.forEach((base) => {
            if (!base.name) {
                errors.push(`lock 文件不合法，发现没有 name 属性的基类;`);
            }
        });
        const dupMod = getDuplicateById(ds.mods, "name");
        const dupBase = getDuplicateById(ds.baseClasses, "name");
        if (dupMod) {
            errors.push(`模块 ${dupMod.name} 重复了。`);
        }
        if (dupBase) {
            errors.push(`基类 ${dupBase.name} 重复了。`);
        }
        if (errors && errors.length) {
            throw new Error(errors.join("\n"));
        }
        return errors;
    }
    static serialize(ds) {
        return JSON.stringify(ds, null, 2);
    }
    static constructorByName(name) {
        return {
            name,
            baseClasses: [],
            mods: [],
        };
    }
    static isEmptySpec(spec) {
        var _a, _b;
        if (((_a = spec === null || spec === void 0 ? void 0 : spec.mods) === null || _a === void 0 ? void 0 : _a.length) || ((_b = spec === null || spec === void 0 ? void 0 : spec.baseClasses) === null || _b === void 0 ? void 0 : _b.length)) {
            return false;
        }
        return true;
    }
    static findBaseClazz(spec, clazzName) {
        var _a, _b;
        for (let index = 0; index < ((_a = spec.baseClasses) === null || _a === void 0 ? void 0 : _a.length); index++) {
            const clazz = (_b = spec.baseClasses) === null || _b === void 0 ? void 0 : _b[index];
            if (clazz.name === clazzName) {
                return clazz;
            }
        }
    }
    static findApi(spec, modName, apiName) {
        return mapifyGet(spec, ["mods", modName, "interfaces", apiName]);
    }
}
//# sourceMappingURL=index.js.map