import { PontxAPI } from "./api.js";
import { ExternalDocumentationObject, PontxJsonSchema } from "./schema.js";
import { OAS3 } from "oas-spec-ts";
import _ from "lodash";
import { sortObjectFields } from "./utils.js";
import { produce } from "immer";
import type { PontxAsyncApiSpec } from "./asyncapi.js";

/** PontxSpec 支持的 API 风格。 */
export enum PontxStyle {
  RPC = "RPC",
  RESTFul = "RESTFul",
  GraphQL = "GraphQL",
  AsyncAPI = "AsyncAPI",
}

/** PontxSpec 服务器；`id` 是跨 locale 和消费者稳定的本地身份。 */
export type PontxServer = OAS3.ServerObject & {
  id?: string;
};

/** RPC 服务的传输边界；规则保持为上游契约数据，不在 OAS 中伪造。 */
export type PontxRpcService = {
  /** 稳定协议标识，例如 aws-query。 */
  protocol: string;
  /** 供应商服务版本，例如 2012-11-05。 */
  version?: string;
  /** 签名机制及其服务名；绝不包含凭证。 */
  signing?: {
    scheme: string;
    service?: string;
  };
  /** 上游端点规则，供协议运行时按原样解释。 */
  endpointRuleSet?: unknown;
};

export type PontxComponents = {
  schemas: Record<string, PontxJsonSchema>;
  responses?: Record<string, unknown>;
  parameters?: Record<string, unknown>;
  examples?: Record<string, unknown>;
  requestBodies?: Record<string, unknown>;
  headers?: Record<string, unknown>;
  securitySchemes?: {
    [x: string]: OAS3.SecuritySchemeObject;
  };
  links?: Record<string, unknown>;
  callbacks?: Record<string, unknown>;
};

export type TagGroup = {
  name: string;
  apis: Record<string, PontxAPI>;
  description?: string;
};

export class PontxSpec {
  name: string;
  info?: OAS3.InfoObject = {};
  /** pontx 协议版本 */
  pontx = "2.1";
  components?: PontxComponents = {
    schemas: {},
  };
  /** key 为 api 名称，如果包含命名空间，使用 "/" 分隔。如 "pet/addPet", value 为 api 定义 */
  apis: Record<string, PontxAPI>;
  /** 命名空间描述，在 pontx 中，tag.name 即为命名空间。一个 API 仅有一个 tag。 */
  tags?: OAS3.TagObject[];
  servers?: PontxServer[];
  externalDocs?: ExternalDocumentationObject;
  /** AsyncAPI 3.x contract, kept separate so streams are never treated as HTTP Endpoints. */
  asyncapi?: PontxAsyncApiSpec;
  /** RPC 服务协议；与 RESTFul 的 servers/path/method 模型分开。 */
  rpc?: PontxRpcService;
  /** 异步回调定义；它不是 HTTP paths 的替代真源。 */
  webhooks?: Record<string, unknown>;
  envs?: {
    [x: string]: Partial<PontxSpec>;
  };
  security? = [] as Array<{
    [x: string]: string[];
  }>;
  style: PontxStyle = PontxStyle.RESTFul;

  /** 扩展字段 */
  ext?: any;

  /** 将所有字段按字母排序 */
  static reOrder(ds: PontxSpec): PontxSpec {
    return sortObjectFields(ds);
  }

  static checkHasMods(spec: PontxSpec): boolean {
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

  /** 获取所有命名空间名称 */
  static getNamespaceNames(spec: PontxSpec) {
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
      if (namespace) {
        namespaces.push(namespace);
      }
    });

    return _.union(namespaces);
  }

  static getTagGroups(spec: PontxSpec): TagGroup[] {
    const namespaceNames = PontxSpec.getNamespaceNames(spec);

    if (!namespaceNames?.length) {
      return [];
    }

    return namespaceNames.map((name) => {
      const tag = spec.tags?.find((tag) => tag.name === name);
      const tagApis = PontxSpec.getApisInNamespace(spec, name);

      if (tag) {
        return {
          ...tag,
          apis: _.pick(spec.apis, tagApis),
        } as TagGroup;
      }

      return {
        name,
        apis: _.pick(spec.apis, tagApis),
      } as TagGroup;
    });
  }

  static addApi(
    spec: PontxSpec,
    apiName: string,
    apiSpec: PontxAPI
  ): PontxSpec {
    const newApis = { ...(spec?.apis || {}), [apiName]: apiSpec };

    return {
      ...spec,
      apis: newApis,
    };
  }

  static addStruct(
    spec: PontxSpec,
    structName: string,
    struct: PontxJsonSchema
  ): PontxSpec {
    return produce(spec, (draft) => {
      draft.components.schemas[structName] = struct;
    });
  }

  /** 添加命名空间(Tag) */
  static addNamespace(
    spec: PontxSpec,
    namespace: string,
    title: string
  ): PontxSpec {
    return produce(spec, (draft) => {
      if (draft.tags?.find((tag) => tag.name === namespace)) {
        return;
      }

      if (!draft?.tags) {
        draft.tags = [
          {
            name: namespace,
            description: title,
          },
        ];
      } else {
        draft.tags.push({
          name: namespace,
          description: title,
        });
      }
    });
  }

  /** 删除 API */
  static removeApi(spec: PontxSpec, apiName: string): PontxSpec {
    return produce(spec, (draft) => {
      delete draft.apis[apiName];
    });
  }

  /** 删除数据结构 */
  static removeStruct(spec: PontxSpec, structName: string): PontxSpec {
    return produce(spec, (draft) => {
      delete draft.components.schemas[structName];
    });
  }

  static udpateApi(
    spec: PontxSpec,
    apiName: string,
    apiSpec: PontxAPI
  ): PontxSpec {
    return produce(spec, (draft) => {
      draft.apis[apiName] = apiSpec;
    });
  }

  /** 重命名 API */
  static reNameApi(
    spec: PontxSpec,
    fullApiName: string,
    newFullApiName: string
  ): PontxSpec {
    return produce(spec, (draft) => {
      const api = draft.apis[fullApiName];

      if (!api) {
        return draft;
      }
      if (api.name) {
        delete api.name;
      }
      delete draft.apis[fullApiName];
      draft.apis[newFullApiName] = api;
    });
  }

  /** 重命名数据结构 */
  static reNameStruct(spec: PontxSpec, structName, newStructName: string) {
    return produce(spec, (draft) => {
      const struct = draft.components.schemas[structName];

      if (!struct) {
        return spec;
      }

      delete draft.components.schemas[structName];
      draft.components.schemas[newStructName] = struct;
    });
  }

  static reNameTag(spec: PontxSpec, tagName: string, newTagName: string) {
    return produce(spec, (draft) => {
      const tag = draft.tags?.find((tag) => tag.name === tagName);
      if (tag) {
        tag.name = newTagName;
      }

      draft.apis = _.mapValues(draft.apis, (api) => {
        if ((api.tags || []).includes(tagName)) {
          api.tags = api.tags.map((tag) =>
            tag === tagName ? newTagName : tag
          );
        }
        return api;
      });
    });
  }

  static udpateStruct(
    spec: PontxSpec,
    structName: string,
    struct: PontxJsonSchema
  ): PontxSpec {
    return produce(spec, (draft) => {
      draft.components.schemas[structName] = struct;
    });
  }

  static getApisInNamespace(spec: PontxSpec, namespaceName: string) {
    const allApiNames = Object.keys(spec?.apis || {});

    return allApiNames.filter((name) => {
      return name?.startsWith(`${namespaceName}/`);
    });
  }

  static moveApi(spec: PontxSpec, apiName: string, namespace: string) {
    if (!spec || !spec.apis) {
      return spec;
    }

    return produce(spec, (draft) => {
      const [oldNamespace, api] = apiName?.split?.("/") || [];
      const newApiName = `${namespace}/${api}`;

      const apiSpec = draft.apis[apiName];
      delete draft.apis[apiName];

      if (draft.apis[newApiName]) {
        return;
      }

      draft.apis[newApiName] = apiSpec;
    });
  }

  /**
   *
   * @param spec pontx-spec
   * @param metaType api | struct | tag
   * @param metaName namespace/name | name
   */
  static getMeta(
    spec: PontxSpec,
    metaType: "api" | "struct" | "tag",
    metaName: string
  ) {
    if (metaType === "api") {
      const api = spec?.apis?.[metaName];
      return api;
    } else if (metaType === "struct") {
      const struct = spec?.components?.schemas?.[metaName];
      return struct;
    } else if (metaType === "tag") {
      const tag = spec?.tags?.find((tag) => tag.name === metaName);
      return tag;
    }
  }

  static getSubSpecByTags(spec: PontxSpec, tagNames: string[]) {
    const specNamespaces = PontxSpec.getNamespaceNames(spec);

    if (!specNamespaces.length) {
      return spec;
    }
    return produce(spec, (draft) => {
      draft.tags = draft.tags?.filter((tag) => tagNames.includes(tag.name));
      Object.keys(draft.apis || {}).forEach((apiName) => {
        const namespaceName = apiName.split("/")?.[0];
        if (!tagNames.includes(namespaceName)) {
          delete draft.apis[apiName];
        }
      });
      return PontxSpec.removeUnUsedStructs(draft);
    });
  }

  static getSubSpecWithTag(spec: PontxSpec, tagName: string) {
    return PontxSpec.getSubSpecByTags(spec, [tagName]);
  }

  static getSubSpecWithAPIKey(spec: PontxSpec, apiKey: string) {
    const api = spec.apis[apiKey];
    const structNames = PontxAPI.getUsedStructNames(api);

    return produce(spec, (draft) => {
      draft.apis = {
        [apiKey]: api,
      };
      if (!draft.components) {
        draft.components = {} as PontxComponents;
      }
      draft.components.schemas = _.pickBy(
        draft.components.schemas || {},
        (struct, structName) => structNames.includes(structName)
      );
    });
  }

  static getSubSpecWithStruct(spec: PontxSpec, structName: string) {
    const allAPIs = Object.keys(spec?.apis || {});

    const usedApis = allAPIs.filter((apiName) => {
      const api = spec.apis[apiName];
      const structNames = PontxAPI.getUsedStructNames(api);

      return structNames?.includes(structName);
    });

    return produce(spec, (draft) => {
      draft.apis = _.pickBy(draft.apis, (api, apiName) =>
        usedApis.includes(apiName)
      );
      if (!draft.components) {
        draft.components = {} as PontxComponents;
      }
      draft.components.schemas = {
        [structName]: spec.components.schemas[structName],
      };
    });
  }

  static removeUnUsedStructs(spec: PontxSpec) {
    const allAPIs = Object.keys(spec?.apis || {});
    let usedStructs = [];

    allAPIs.forEach((apiName) => {
      const api = spec.apis[apiName];
      const structNames = PontxAPI.getUsedStructNames(api);

      if (structNames) {
        usedStructs.push(...structNames);
      }
    }, [] as string[]);
    usedStructs = _.union(usedStructs);

    const newSchemas = _.pickBy(
      spec.components.schemas || {},
      (struct, structName) => usedStructs.includes(structName)
    );

    return produce(spec, (draft) => {
      draft.components.schemas = newSchemas;
    });
  }

  static serialize(ds: PontxSpec) {
    return JSON.stringify(ds, null, 2);
  }

  static constructorByName(name: string) {
    return {
      ...new PontxSpec(),
      name,
      apis: {},
      tags: [],
    } as PontxSpec;
  }

  static isEmptySpec(spec: PontxSpec) {
    if (!_.isEmpty(spec?.apis) || !_.isEmpty(spec?.components?.schemas)) {
      return false;
    }

    return true;
  }

  static getSchemasCnt(spec: PontxSpec) {
    return Object.keys(spec?.components?.schemas || {}).length;
  }
}

export class PontxSpecs {
  static updateSpec(specs: PontxSpec[], specName: string, newSpec: PontxSpec) {
    if (!specs?.length) {
      return [newSpec];
    }
    if (!specName && !specs?.[0]?.name) {
      return [newSpec];
    }

    return produce(specs, (draft) => {
      const specIndex = draft?.findIndex((spec) => spec.name === specName);

      if (specIndex === -1) {
        draft.push(newSpec);
      } else {
        draft[specIndex] = newSpec;
      }
    });
  }

  static checkIsSingleSpec(specs: PontxSpec[]) {
    return specs.length === 1 && !specs?.[0]?.name;
  }

  static getSpecByName = (specs: PontxSpec[], specName: string) => {
    return specs?.find((spec) => spec.name === specName) || specs?.[0];
  };
}
