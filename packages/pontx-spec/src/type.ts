import { OAS2 } from "oas-spec-ts";
import { PontJsonSchema } from "./dataType";
import { Parameter } from "./parameter";
import { ObjectMap, orderMap, removeMapKeys } from "./utils";
import { PontJsonPointer } from "./jsonpointer";
import { ExternalDocumentationObject } from "oas-spec-ts/lib/oas2.0/swagger2.0";
import { DiffItem } from "./diff";
import isEmpty from "lodash/isEmpty";
import union from "lodash/union";
import unionBy from "lodash/unionBy";
import differenceBy from "lodash/differenceBy";
import pickBy from "lodash/pickBy";
import _ from "lodash";

export type ResponseObject = {
  schema: PontJsonSchema;
  headers?: OAS2.HeadersObject;
  description?: string;
};
export class PontAPI {
  /** @deprecated */
  name?: string;
  consumes?: string[] = [];
  produces?: string[] = [];
  parameters?: Parameter[] = [];
  description?: string;
  responses: {
    [key: string]: ResponseObject;
  };
  method: string;
  title?: string;
  summary?: string;
  path: string;
  deprecated?: boolean;
  ext?: any;
  security?: Array<{
    [x: string]: string[];
  }>;
  externalDocs?: {
    url?: string;
    description?: string;
  };

  static getUsedStructNames(api: PontAPI) {
    const structs = [] as string[];
    (api.parameters || []).forEach((param) => {
      if (param.schema) {
        const structNames = PontJsonSchema.getUsedStructNames(param.schema);
        structs.push(...structNames);
      }
    });

    Object.keys(api.responses || {}).forEach((status) => {
      const res = api.responses[status];
      if (res) {
        const structNames = PontJsonSchema.getUsedStructNames(res.schema);
        structs.push(...structNames);
      }
    });

    return union(structs);
  }
}

export enum PontxDirectoryNodeType {
  Directory = "directory",
  Api = "api",
  Struct = "struct",
  Overview = "overview",
  MarkDoc = "MarkDoc",
  Change = "change",
}

export class PontxDirectoryNode {
  /** 目录标题 */
  title?: string;
  titleIntl?: ObjectMap<string> = {};
  children: Array<PontxDirectoryNode> = [];
  type: PontxDirectoryNodeType;
  name: string;

  static constructorPureApiItems(pontxSpec: PontSpec, namespaceName = "") {
    const apis = Object.keys(pontxSpec.apis || {});

    return (apis || [])
      .filter((apiName) => {
        if (!namespaceName) {
          return true;
        }

        if (apiName && apiName.startsWith(namespaceName + "/")) {
          return true;
        }
        return false;
      })
      .map((apiName) => {
        const api = pontxSpec.apis[apiName];

        if (!api) {
          return null;
        }

        return {
          type: PontxDirectoryNodeType.Api,
          name: apiName,
          title: api.title || api.summary || api.description,
          children: [],
        } as PontxDirectoryNode;
      });
  }

  static constructorApiDir(pontxSpec: PontSpec) {
    const namespaces = PontSpec.getNamespaceNames(pontxSpec);

    return (namespaces || []).map((name) => {
      return {
        type: PontxDirectoryNodeType.Directory,
        name,
        title: pontxSpec?.namespaces?.[name]?.title,
        children: PontxDirectoryNode.constructorPureApiItems(pontxSpec, name),
      };
    });
  }

  static constructorPontxDir(pontxSpec: PontSpec) {
    if (!pontxSpec?.apis) {
      return [];
    }

    const { definitions } = pontxSpec;

    const structs = Object.keys(definitions || {}).map((structName) => {
      const schema = definitions[structName];

      return {
        type: PontxDirectoryNodeType.Struct,
        title: schema.title || schema.description,
        children: [],
        name: structName,
      };
    });

    let apiDirs = [];
    const namesapces = PontSpec.getNamespaceNames(pontxSpec);
    if (!namesapces?.length && Object.keys(pontxSpec?.apis || {}).length) {
      apiDirs = PontxDirectoryNode.constructorPureApiItems(pontxSpec);
    } else {
      apiDirs = PontxDirectoryNode.constructorApiDir(pontxSpec);
    }

    const structDir = {
      name: "definitions",
      title: "数据结构" + `(${structs.length || 0})`,
      children: structs,
      type: PontxDirectoryNodeType.Directory,
    } as PontxDirectoryNode;
    const apiRootDir = {
      children: apiDirs,
      name: "apis",
      title: "API 列表" + `(${apiDirs.length || 0})`,
      type: PontxDirectoryNodeType.Directory,
    } as PontxDirectoryNode;

    const rootDir = [
      {
        name: "Overview",
        title: "总览",
        children: [],
        type: PontxDirectoryNodeType.Overview,
      },
      structDir,
      apiRootDir,
    ] as PontxDirectoryNode[];

    return rootDir;
  }

  static removeNode(dirs: PontxDirectoryNode[], nodeType: PontxDirectoryNodeType, nodeName?: string) {
    return (dirs || [])
      .filter((dir) => {
        if (dir.type === nodeType) {
          if (nodeName && dir.name === nodeName) {
            return false;
          }

          if (!nodeName && !dir.name) {
            return false;
          }
        }

        return true;
      })
      .map((dir) => {
        if (dir.children?.length) {
          const children = PontxDirectoryNode.removeNode(dir.children, nodeType, nodeName);

          return {
            ...dir,
            children,
          };
        }
        return dir;
      });
  }

  static getAPIsInDir(dir: PontxDirectoryNode): string[] {
    return (dir.children || []).reduce((apis, child) => {
      if (child?.type === PontxDirectoryNodeType.Api) {
        return [...apis, child?.name];
      } else if (child.children?.length) {
        return [...apis, ...PontxDirectoryNode.getAPIsInDir(child)];
      }

      return apis;
    }, [] as string[]);
  }
}

export class PontNamespace {
  /** 标题 */
  title: string;
  titleIntl?: ObjectMap<string> = {};
}

export const WithoutModsName = Symbol("WithoutModsName");

export class Mod {
  name: string | Symbol;
  interfaces: Array<PontAPI & { name: string }> = [];
  description?: string;
}

export class PontSpec {
  public name: string;
  public description?: string;
  public title?: string;
  public version?: string;
  public pontx? = "2.0";
  public definitions: ObjectMap<PontJsonSchema>;
  /** 如果有 namespace，则 map key 可能为 namespace.apiName，否则为 apiName */
  public apis: ObjectMap<PontAPI>;
  // public directories: PontDirectory[] = [];
  public namespaces: {
    [x: string]: PontNamespace;
  } = {};
  public basePath?: string;
  public host?: string;
  public externalDocs?: ExternalDocumentationObject;
  public envs?: {
    [x: string]: Partial<PontSpec>;
  };
  public security? = [] as Array<{
    [x: string]: string[];
  }>;
  public securitySchemes?: {
    [x: string]: {
      type?: "apiKey" | "http" | "oauth2" | "openIdConnect";
      description?: string;
      name?: string;
      in?: "query" | "header" | "cookie";
      scheme?: "basic" | "bearer";
      bearerFormat?: string;
      flows?: {
        implicit?: {
          authorizationUrl: string;
          scopes: { [x: string]: string };
        };
        password?: {
          tokenUrl: string;
          scopes: { [x: string]: string };
        };
        clientCredentials?: {
          tokenUrl: string;
          scopes: { [x: string]: string };
        };
        authorizationCode?: {
          authorizationUrl: string;
          tokenUrl: string;
          scopes: { [x: string]: string };
        };
      };
      openIdConnectUrl?: string;
    };
  };
  public docDirectories?: PontxDirectoryNode[];
  public style?: "RPC" | "RESTFul" | "GraphQL" = "RESTFul";

  /** 扩展字段 */
  public ext?: any;

  static reOrder(ds: PontSpec): PontSpec {
    return {
      ...ds,
      definitions: orderMap(ds.definitions),
      apis: orderMap(ds.apis),
    };
  }

  static checkHasMods(spec: PontSpec): boolean {
    if (!spec) {
      return false;
    }
    let hasMocs = false;

    const apiNames = Object.keys(spec.apis || {});
    if (!apiNames?.length) {
      return false;
    }
    const firstApiName = apiNames[0];

    if (firstApiName.includes("/")) {
      return true;
    }
    return false;
  }

  static getNamespaceNames(spec: PontSpec) {
    const fullApiNames = Object.keys(spec.apis || {});
    const namespaces = [] as string[];

    fullApiNames.forEach((name) => {
      if (!name) {
        return;
      }

      if (!name?.includes?.("/")) {
        return;
      }

      const [namespace] = name.split("/");

      if (namespace && !namespaces.includes(namespace)) {
        namespaces.push(namespace);
      }
    });

    if (spec.namespaces) {
      const namespaceNames = Object.keys(spec.namespaces);

      return _.union(namespaces, namespaceNames);
    }

    return namespaces;
  }

  static merge(spec1: PontSpec, spec2: PontSpec): PontSpec {
    const newSpec = {
      ...spec1,
      ...spec2,
      apis: {
        ...(spec1.apis || {}),
        ...(spec2.apis || {}),
      },
      definitions: {
        ...(spec1.definitions || {}),
        ...(spec2.definitions || {}),
      },
      namespaces: {
        ...(spec1.namespaces || {}),
        ...(spec2.namespaces || {}),
      },
    };

    return PontSpec.reOrder(newSpec);
  }

  static addApi(spec: PontSpec, apiName: string, apiSpec: PontAPI): PontSpec {
    const newApis = { ...(spec?.apis || {}), [apiName]: apiSpec };

    return {
      ...spec,
      apis: newApis,
    };
  }

  static addStruct(spec: PontSpec, structName: string, struct: PontAPI): PontSpec {
    const newDefinitions = { ...(spec?.definitions || {}), [structName]: struct };

    return {
      ...spec,
      definitions: newDefinitions,
    };
  }

  static addMod(spec: PontSpec, namespace: string, title: string): PontSpec {
    return {
      ...spec,
      namespaces: {
        ...(spec.namespaces || {}),
        [namespace]: {
          title,
        },
      },
    };
  }

  static removeApi(spec: PontSpec, apiName: string): PontSpec {
    const newApis = { ...(spec?.apis || {}) };
    delete newApis[apiName];

    const newDirs = PontxDirectoryNode.removeNode(spec.docDirectories, PontxDirectoryNodeType.Api, apiName);

    return {
      ...spec,
      apis: newApis,
      docDirectories: newDirs,
    };
  }

  static removeStruct(spec: PontSpec, structName: string): PontSpec {
    const newDefinitions = { ...(spec?.definitions || {}) };
    delete newDefinitions[structName];

    return {
      ...spec,
      definitions: newDefinitions,
    };
  }

  static udpateApi(spec: PontSpec, apiName: string, apiSpec: PontAPI): PontSpec {
    const newApis = { ...(spec?.apis || {}), [apiName]: apiSpec };

    return {
      ...spec,
      apis: newApis,
    };
  }

  static reNameApi(spec: PontSpec, fullApiName: string, newApiName: string) {
    const api = spec.apis[fullApiName];

    if (!api) {
      return spec;
    }

    const newApi = { ...api };
    if (newApi.name) {
      newApi.name = newApiName;
    }

    const newApis = {
      ...(spec.apis || {}),
    };
    delete newApis[fullApiName];

    // if (fullApiName?.includes?.("/")) {
    //   const [controllerName] = fullApiName.split("/");
    //   const newFullApiName = `${controllerName}/${newApiName}`;
    //   newApis[newFullApiName] = newApi;

    //   if (spec.docDirectories?.length) {
    //     const newDirs = spec.docDirectories.map((dir) => {
    //       if (dir.children?.includes(fullApiName)) {
    //         return {
    //           ...dir,
    //           children: dir.children.map((name) => {
    //             if (name === fullApiName) {
    //               return newFullApiName;
    //             }
    //             return name;
    //           }),
    //         };
    //       }
    //       return dir;
    //     });

    //     return {
    //       ...spec,
    //       apis: newApis,
    //       directories: newDirs,
    //     } as PontSpec;
    //   }
    // }

    newApis[newApiName] = newApi;

    return {
      ...spec,
      apis: newApis,
    } as PontSpec;
  }

  static udpateStruct(spec: PontSpec, structName: string, struct: PontJsonSchema): PontSpec {
    const newDefinitions = { ...(spec?.definitions || {}), [structName]: struct };

    return {
      ...spec,
      definitions: newDefinitions,
    };
  }

  static getModByName(spec: PontSpec, modName: string) {
    const mods = PontSpec.getMods(spec);
    return mods.find((mod) => mod.name === modName);
  }

  static getApisInNamespace(spec: PontSpec, namespaceName: string) {
    const allApiNames = Object.keys(spec?.apis || {});

    return allApiNames.filter((name) => {
      return name?.startsWith(`${namespaceName}/`);
    });
  }

  /** 获取所有 API 分组，包括空分组 */
  static getAllApiGroups(spec: PontSpec) {
    const apiNames = PontSpec.getNamespaceNames(spec);

    const namesapces = Object.keys(spec?.namespaces || {});

    return _.union(apiNames, namesapces);
  }

  static getMods(spec: PontSpec): Mod[] {
    if (!spec) {
      return [];
    }

    const modNames = PontSpec.getNamespaceNames(spec);

    if (modNames.length) {
      return modNames.map((modName) => {
        const namespaceInfo = spec.namespaces?.[modName];
        const apiNames = PontSpec.getApisInNamespace(spec, modName);

        const apis = apiNames
          .map((name) => {
            const api = spec.apis?.[name];

            if (api) {
              const apiName = (name || "").split("/")?.[1];

              return {
                ...api,
                name: apiName,
              };
            }

            return api;
          })
          .filter((id) => id);

        return {
          name: modName,
          description: namespaceInfo?.title,
          interfaces: apis,
        } as Mod;
      });
    }

    if (!modNames.length) {
      return [
        {
          name: WithoutModsName,
          interfaces: Object.keys(spec.apis || {})
            .map((apiName) => {
              const api = spec.apis?.[apiName];

              if (api) {
                return {
                  ...api,
                  name: apiName,
                };
              }
              return api;
            })
            .filter((api) => api) as any,
        },
      ];
    }

    return [];
  }

  static updateMod(spec: PontSpec, mod: Mod) {
    // 更新 apis
    const newApis = removeMapKeys(spec.apis, (name) => (name + "").startsWith(mod.name + "/"));
    mod.interfaces.forEach((api) => {
      newApis[`${mod.name}/${api.name}`] = api;
    });

    // 更新 namespace
    let namespaces = spec.namespaces || {};
    if (mod.description) {
      namespaces[mod.name as string] = {
        ...(namespaces[mod.name as string] || {}),
        title: mod.description,
      };
    }

    return { ...spec, apis: newApis, namespaces } as PontSpec;
  }

  static removeMod(spec: PontSpec, modName: string) {
    // 更新 apis
    const newApis = removeMapKeys(spec.apis, (name) => (name + "").startsWith(modName + "/"));

    let namespaces = spec.namespaces || {};
    if (namespaces[modName]) {
      delete namespaces[modName];
    }

    return { ...spec, apis: newApis, namespaces } as PontSpec;
  }

  static moveApi(spec: PontSpec, apiName: string, namespace: string) {
    if (!spec || !spec.apis) {
      return spec;
    }

    const newApis = { ...(spec.apis || {}) };
    const [oldNamespace, api] = apiName?.split?.("/") || [];
    const newApiName = `${namespace}/${api}`;

    newApis[newApiName] = newApis[apiName];
    delete newApis[apiName];

    return {
      ...spec,
      apis: newApis,
    } as PontSpec;
  }

  static diff(preSpec: PontSpec, newSpec: PontSpec): DiffItem[] {
    const dirDiffs = PontSpec.getDirsDiff(preSpec, newSpec);
    const metaDiffs = PontSpec.getMetasDiff(preSpec, newSpec);

    const preInfo = PontSpec._getSpecInfo(preSpec);
    const newInfo = PontSpec._getSpecInfo(newSpec);

    let infoDiff = null;
    if (JSON.stringify(preInfo) !== JSON.stringify(newInfo)) {
      infoDiff = {
        type: "specInfo",
        diffType: "updated",
        name: newSpec?.name || preSpec?.name,
        pre: preInfo,
        new: newInfo,
      };
    }

    if (infoDiff) {
      return [infoDiff, ...dirDiffs, ...metaDiffs];
    }

    return [...dirDiffs, ...metaDiffs];
  }

  static diffSpecs(preSpecs: PontSpec[], newSpecs: PontSpec[]): DiffItem[] {
    const deletedSpecs = differenceBy(preSpecs || [], newSpecs || [], "name").map((spec) => {
      return {
        diffType: "deleted",
        pre: spec,
        name: spec.name,
        type: "spec",
      } as DiffItem;
    });

    const rest = (newSpecs || [])
      .map((spec) => {
        const preSpec = (preSpecs || []).find((pre) => pre.name === spec.name);

        if (!preSpec) {
          return {
            name: spec.name,
            type: "spec",
            diffType: "created",
          } as DiffItem;
        }

        const specDiffs = PontSpec.diff(preSpec, spec);

        if (specDiffs?.length) {
          return {
            name: spec.name,
            diffType: "updated",
            type: "spec",
            diffItems: specDiffs,
          } as DiffItem;
        }
        return null;
      })
      .filter((id) => id);

    return [...deletedSpecs, ...rest];
  }

  static _getSpecInfo(spec: PontSpec) {
    const { apis, definitions, namespaces, ...rest } = spec || {};

    return rest;
  }

  // todo: rename to getNamespaceDiff
  static getDirsDiff(preSpec: PontSpec, nextSpec: PontSpec): DiffItem[] {
    const preNamespaces = PontSpec.getNamespaceNames(preSpec);
    const nextNamespaces = PontSpec.getNamespaceNames(nextSpec);

    const createdDirs: DiffItem[] = nextNamespaces
      .filter((name) => !preNamespaces.includes(name))
      .map((name) => {
        return {
          type: "dir",
          name: name,
          diffType: "created",
        };
      });
    const deletedDirs: DiffItem[] = (preNamespaces || [])
      .filter((name) => !nextNamespaces.includes(name))
      .map((name) => {
        return {
          type: "dir",
          name,
          diffType: "deleted",
        };
      });

    const updatedDirs: DiffItem[] = (nextNamespaces || [])
      .filter((name) => preNamespaces.includes(name))
      .map((name) => {
        const preNamespace = preSpec?.namespaces?.[name];
        const nextNamespace = nextSpec?.namespaces?.[name];

        if (JSON.stringify(preNamespace) !== JSON.stringify(nextNamespace)) {
          return {
            type: "dir",
            name: name,
            diffType: "updated",
          };
        }

        return null;
      });

    return [...createdDirs, ...deletedDirs, ...updatedDirs].filter((id) => id);
  }

  /**
   *
   * @param spec pontx-spec
   * @param key type/namespace/name | type/name
   */
  static getMetaByKey(spec: PontSpec, key: string) {
    const [type, ...names] = key.split("/");
    if (type === "api") {
      const api = spec?.apis?.[names.join("/")];
      return api;
    } else if (type === "struct") {
      const struct = spec?.definitions?.[names.join("/")];
      return struct;
    }
  }

  static getMetasDiff(preSpec: PontSpec, newSpec: PontSpec): DiffItem[] {
    const allAPIs = Object.keys(preSpec?.apis || {});
    const allStructs = Object.keys(preSpec?.definitions || {} || {});

    const newApis = Object.keys(newSpec?.apis || {});
    const newStructs = Object.keys(newSpec?.definitions || {} || {});

    const deletedApis: DiffItem[] = allAPIs
      .filter((apiName) => !newApis.includes(apiName))
      .map((apiName) => {
        return {
          type: "api",
          name: apiName,
          diffType: "deleted",
        };
      });
    const deletedStructs: DiffItem[] = allStructs
      .filter((structName) => !newStructs.includes(structName))
      .map((structName) => {
        return {
          type: "struct",
          name: structName,
          diffType: "deleted",
        };
      });

    const apiDiffs: DiffItem[] = newApis.map((apiName) => {
      if (!allAPIs.includes(apiName)) {
        return {
          type: "api",
          name: apiName,
          diffType: "created",
        };
      }
      if (newApis.includes(apiName)) {
        const preApi = preSpec.apis?.[apiName];
        const newApi = newSpec.apis?.[apiName];

        if (JSON.stringify(preApi) !== JSON.stringify(newApi)) {
          return {
            type: "api",
            name: apiName,
            diffType: "updated",
            pre: allAPIs[apiName],
          };
        }
      }
    });
    const structDiffs: DiffItem[] = newStructs.map((structName) => {
      if (!allStructs.includes(structName)) {
        return {
          type: "struct",
          name: structName,
          diffType: "created",
        };
      }

      if (newStructs.includes(structName)) {
        const preStruct = preSpec.definitions?.[structName];
        const newStruct = newSpec.definitions?.[structName];

        if (JSON.stringify(preStruct) !== JSON.stringify(newStruct)) {
          return {
            type: "struct",
            name: structName,
            diffType: "updated",
            pre: allStructs[structName],
          };
        }
      }
    });

    return [...deletedStructs, ...structDiffs, ...deletedApis, ...apiDiffs].filter((id) => id);
  }

  static pickSpecByControllers(spec: PontSpec, controllers: string[]) {
    const specControllers = PontSpec.getNamespaceNames(spec);

    if (!specControllers.length) {
      return spec;
    }

    const newControllers = specControllers.filter((name) => controllers.includes(name));
    const newApiNames = [];
    newControllers.forEach((name) => {
      newApiNames.push(...PontSpec.getApisInNamespace(spec, name));
    });
    const newNamespace = _.pickBy(spec.namespaces || {}, (value, name) => {
      return controllers?.includes(name);
    });

    const newSpec = {
      ...spec,
      namespaces: newNamespace,
      apis: pickBy(spec.apis, (api, apiName) => newApiNames.includes(apiName)),
    } as PontSpec;

    return PontSpec.removeUnUsedStructs(newSpec);
  }

  static getSubSpecWithAPI(spec: PontSpec, controllerName: string, apiName: string) {
    const apiKey = typeof controllerName === "string" && controllerName ? `${controllerName}/${apiName}` : apiName;
    const api = spec.apis[apiKey];
    const structNames = PontAPI.getUsedStructNames(api);

    const newSpec = {
      ...spec,
      apis: { [apiKey]: api },
      definitions: pickBy(spec.definitions, (struct, structName) => structNames.includes(structName)),
    } as PontSpec;

    return newSpec;
  }

  static getSubSpecWithStruct(spec: PontSpec, structName: string) {
    const allAPIs = Object.keys(spec?.apis || {});

    const usedApis = allAPIs.filter((apiName) => {
      const api = spec.apis[apiName];
      const structNames = PontAPI.getUsedStructNames(api);

      return structNames?.includes(structName);
    });

    const newSpec = {
      ...spec,
      apis: pickBy(spec.apis, (api, apiName) => usedApis.includes(apiName)),
      definitions: { [structName]: spec.definitions[structName] },
    } as PontSpec;

    return newSpec;
  }

  static removeUnUsedStructs(spec: PontSpec) {
    const allAPIs = Object.keys(spec?.apis || {});
    const allStructs = Object.keys(spec?.definitions || {} || {});
    let usedStructs = [];
    allAPIs.forEach((apiName) => {
      const api = spec.apis[apiName];
      const structNames = PontAPI.getUsedStructNames(api);

      if (structNames) {
        usedStructs.push(...structNames);
      }
    }, [] as string[]);
    usedStructs = union(usedStructs);

    const newSpec = {
      ...spec,
      definitions: pickBy(spec.definitions, (struct, structName) => usedStructs.includes(structName)),
    };

    return newSpec;
  }

  static getCreatedMetas(preSpec: PontSpec, newSpec: PontSpec): DiffItem[] {
    const allAPIs = Object.keys(preSpec?.apis || {});
    const allStructs = Object.keys(preSpec?.definitions || {} || {});

    const newApis = Object.keys(newSpec?.apis || {});
    const newStructs = Object.keys(newSpec?.definitions || {} || {});

    const createdApis = newApis.filter((apiName) => !allAPIs.includes(apiName));
    const createdStructs = newStructs.filter((structName) => !allStructs.includes(structName));

    return [
      ...createdApis.map((apiName) => {
        return {
          type: "api",
          name: apiName,
          diffType: "created",
        } as DiffItem;
      }),
      ...createdStructs.map((structName) => {
        return {
          type: "struct",
          name: structName,
          diffType: "created",
        } as DiffItem;
      }),
    ];
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
      pontx: "2.0",
      name,
      definitions: {} as ObjectMap<PontJsonSchema>,
      apis: {},
      directories: [],
      namespaces: {},
    } as PontSpec;
  }

  static isEmptySpec(spec: PontSpec) {
    if (!isEmpty(spec?.apis) || !isEmpty(spec?.definitions)) {
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
