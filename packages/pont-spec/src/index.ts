import { OAS2 } from "oas-spec-ts";
import { PontJsonSchema } from "./dataType";
import { Parameter } from "./parameter";
import { orderMap, ObjectMap, removeMapKeys } from "./utils";
import * as _ from "lodash";
import { PontJsonPointer } from "./jsonpointer";

export { PontJsonSchema, Parameter, ObjectMap, PontJsonPointer, removeMapKeys };

type ResponseObject = {
  schema: PontJsonSchema;
  headers: OAS2.HeadersObject;
};
export class PontAPI {
  consumes: string[];
  parameters: Parameter[];
  description: string;
  responses: {
    [key: string]: ResponseObject;
  };
  method: string;
  name: string;
  title?: string;
  path: string;
  deprecated: boolean;
  ext?: any;
}

export class PontDirectory {
  /** 生成 SDK 的 NameSpace, Controller */
  namespace?: string;
  /** 目录标题 */
  title: string;
  titleIntl?: ObjectMap<string> = {};
  children?: Array<PontDirectory | string> = [];

  static getAPIsInDir(dir: PontDirectory): string[] {
    return (dir.children || []).reduce((apis, child) => {
      if (typeof child === "string") {
        return [...apis, child];
      } else if (child.children?.length) {
        return [...apis, ...PontDirectory.getAPIsInDir(child)];
      }
      return apis;
    }, [] as string[]);
  }
}

export const WithoutModsName = Symbol("WithoutModsName");

export class Mod {
  name: string | Symbol;
  interfaces: PontAPI[] = [];
  description?: string;
}

export class PontSpec {
  public name: string;
  public definitions: ObjectMap<PontJsonSchema>;
  /** 如果有 namespace，则 map key 可能为 namespace.apiName，否则为 apiName */
  public apis: ObjectMap<PontAPI>;
  public directories: PontDirectory[] = [];
  /** 扩展字段 */
  public ext?: any;

  static reOrder(ds: PontSpec): PontSpec {
    return {
      ...ds,
      definitions: orderMap(ds.definitions),
      apis: orderMap(ds.apis),
    };
  }

  static getMods(spec: PontSpec): Mod[] {
    if (!spec) {
      return [];
    }
    const mods = (spec.directories || [])
      ?.map((dir) => {
        if (dir.namespace) {
          const apis = PontDirectory.getAPIsInDir(dir)
            .map((apiName) => {
              return spec.apis?.[apiName];
            })
            .filter((api) => api);

          if (apis.length) {
            return {
              name: dir.namespace,
              interfaces: apis,
              description: dir.title,
            };
          }
          return null;
        }
        return null;
      })
      .filter((mod) => mod);

    if (!mods.length) {
      return [
        {
          name: WithoutModsName,
          interfaces: Object.keys(spec.apis || {})
            .map((apiName) => spec.apis?.[apiName])
            .filter((api) => api),
        },
      ];
    }
    return mods;
  }

  static updateMod(spec: PontSpec, mod: Mod) {
    // 更新 apis
    const newApis = removeMapKeys(spec.apis, (name) => (name + "").startsWith(mod.name + "/"));
    mod.interfaces.forEach((api) => {
      newApis[`${mod.name}/${api.name}`] = api;
    });

    // 更新 dir
    const newDir = PontJsonPointer.set(spec.directories, `namespace=${mod.name}`, {
      title: mod.description,
      namespace: mod.name,
      children: mod.interfaces.map((api) => `${mod.name}/${api.name}`),
    });

    return { ...spec, apis: newApis, directories: newDir } as PontSpec;
  }

  static removeMod(spec: PontSpec, modName: string) {
    // 更新 apis
    const newApis = removeMapKeys(spec.apis, (name) => (name + "").startsWith(modName + "/"));

    // 更新 dir
    const newDir = (spec.directories || []).filter((dir) => dir.namespace !== modName);

    return { ...spec, apis: newApis, directories: newDir } as PontSpec;
  }

  // validate the if the dataSource is valid
  static validateLock(ds: PontSpec) {
    const errors = [] as string[];
    return errors;
  }

  static serialize(ds: PontSpec) {
    return JSON.stringify(ds, null, 2);
  }

  constructor(ds?: PontSpec) {
    if (ds) {
      PontSpec.reOrder(ds);
    }
  }

  static constructorByName(name: string) {
    return {
      name,
      definitions: {} as ObjectMap<PontJsonSchema>,
      apis: {},
      directories: [],
    } as PontSpec;
  }

  static isEmptySpec(spec: PontSpec) {
    if (!_.isEmpty(spec?.apis) || !_.isEmpty(spec?.definitions)) {
      return false;
    }

    return true;
  }

  static getClazzCnt(spec: PontSpec) {
    return Object.keys(spec?.definitions || {}).length;
  }
}

export class PontSpecs {
  static updateSpec(specs: PontSpec[], specName: string, newSpec: PontSpec) {
    if (specName) {
      const specIndex = specs?.findIndex((spec) => spec.name === specName);

      if (specIndex === -1) {
        return [...specs, newSpec];
      }
      return specs.map((spec, index) => {
        if (index === specIndex) {
          return newSpec;
        }
        return spec;
      });
    }

    return [newSpec];
  }

  static checkIsSingleSpec(specs: PontSpec[]) {
    return specs.length <= 1 && !specs?.[0]?.name;
  }

  static getSpecByName = (specs: PontSpec[], specName: string) => {
    return specs?.find((spec) => spec.name === specName) || specs?.[0];
  };

  static getSpecIndex = (specs: PontSpec[], specName: string) => {
    const index = specs?.findIndex((spec) => spec.name === specName);

    if (index === -1) {
      return 0;
    }

    return index;
  };

  static getUpdateSpecIndex = (specs: PontSpec[], specName: string) => {
    const index = specs?.findIndex((spec) => spec.name === specName);
    if (specName && index === -1) {
      return specs.length;
    } else if (index === -1 && !specs?.[0]?.name) {
      return 0;
    }

    return index;
  };
}
