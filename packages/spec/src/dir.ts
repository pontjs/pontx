import { PontxSpec } from "./spec.js";

export enum PontxDirectoryNodeType {
  Directory = "directory",
  Api = "api",
  Struct = "struct",
  Overview = "overview",
  MarkDoc = "MarkDoc",
  Change = "change",
}

/**
 * 定义 API 目录节点
 */
export class PontxDirectoryNode {
  /** 目录标题 */
  title?: string;
  /** 目录标题国际化 */
  titleIntl?: Record<string, string> = {};
  /** 子节点 */
  children: Array<PontxDirectoryNode> = [];
  /** 节点类型 */
  type: PontxDirectoryNodeType;
  /** 节点名称 */
  name: string;

  /**
   * 构造纯 API 目录节点
   * @param pontxSpec
   * @param namespaceName
   * @returns
   */
  static constructorPureApiItems(pontxSpec: PontxSpec, namespaceName = "") {
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

  static constructorApiDir(pontxSpec: PontxSpec) {
    const namespaces = PontxSpec.getNamespaceNames(pontxSpec);

    return (namespaces || []).map((name) => {
      return {
        type: PontxDirectoryNodeType.Directory,
        name,
        title: pontxSpec?.tags?.find((tag) => tag.name === name)?.description,
        children: PontxDirectoryNode.constructorPureApiItems(pontxSpec, name),
      };
    });
  }

  static constructorPontxDir(pontxSpec: PontxSpec) {
    if (!pontxSpec?.apis) {
      return [];
    }

    const structs = Object.keys(pontxSpec?.components?.schemas || {}).map(
      (structName) => {
        const schema = pontxSpec?.components?.schemas[structName];

        return {
          type: PontxDirectoryNodeType.Struct,
          title: schema.title || schema.description,
          children: [],
          name: structName,
        };
      }
    );

    let apiDirs = [];
    const namesapces = PontxSpec.getNamespaceNames(pontxSpec);
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

  static removeNode(
    dirs: PontxDirectoryNode[],
    nodeType: PontxDirectoryNodeType,
    nodeName?: string
  ) {
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
          const children = PontxDirectoryNode.removeNode(
            dir.children,
            nodeType,
            nodeName
          );

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
