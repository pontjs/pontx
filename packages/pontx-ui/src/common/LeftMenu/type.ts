import { PontDirectory, PontSpec } from "pontx-spec";

export enum DirectoryType {
  Directory = "directory",
  Api = "api",
  Struct = "struct",
  Change = "change",
  Overview = "overview",
  MarkDoc = "MarkDoc",
}

export class DirectoryNode {
  type = DirectoryType.Api;
  name: string;
  title: string;
  expanded? = false;
  detail: any;
  children: DirectoryNode[] = [];

  static isEqualNode(node: DirectoryNode, selectedKey: string) {
    if (!selectedKey) {
      return false;
    }

    return DirectoryNode.getNodeKey(node) === selectedKey;
  }

  static getNodeKey(node: DirectoryNode) {
    if (!node) {
      return "";
    }
    return `${node.type}/${node.name}`;
  }

  static parseNodeKey(key: string) {
    if (!key) {
      return {};
    }

    const [type, ...args] = key.split("/");

    return {
      type,
      name: args.join("/"),
    };
  }

  static updateDirExpanded(node: DirectoryNode, selectedKey?: string) {
    const newNode = { ...node };
    if (node.type === DirectoryType.Directory) {
      if (node.children?.length) {
        newNode.children = node.children.map((child) => {
          return DirectoryNode.updateDirExpanded(
            {
              ...child,
              expanded: false,
            },
            selectedKey,
          );
        });
      }

      if (
        (newNode.children || []).find((child) => DirectoryNode.isEqualNode(child, selectedKey)) ||
        (newNode.children || []).some((child) => child.expanded)
      ) {
        newNode.expanded = true;
      }
    }

    return newNode;
  }

  static constructorApiDir(pontxSpec: PontSpec, dirs: (PontDirectory | string)[], namespace = "") {
    return (dirs || []).map((dir) => {
      if (typeof dir === "string") {
        const apiKey = dir;
        const api = pontxSpec.apis[apiKey];

        if (!api) {
          return null;
        }

        return {
          type: DirectoryType.Api,
          expanded: false,
          name: apiKey,
          title: api.title || api.summary || api.description,
          children: [],
          detail: api,
        } as DirectoryNode;
      }

      let currNamespace = dir.namespace;
      if (namespace) {
        currNamespace = namespace + "/" + currNamespace;
      }

      return {
        type: DirectoryType.Directory,
        expanded: false,
        detail: {
          isTag: !!dir.namespace,
        },
        name: dir.namespace,
        title: dir.title || dir.namespace,
        children: DirectoryNode.constructorApiDir(pontxSpec, dir.children || [], currNamespace),
      };
    });
  }

  /** 默认只展开当前节点所在目录。 */
  static constructorPontxDir(pontxSpec: PontSpec, selectedKey: string): DirectoryNode[] {
    const { apis, directories, definitions } = pontxSpec || {};

    if (!apis || !directories) {
      return [];
    }

    const structs = Object.keys(definitions || {}).map((structName) => {
      const schema = definitions[structName];

      return {
        type: DirectoryType.Struct,
        title: schema.title || schema.description,
        children: [],
        expanded: false,
        name: structName,
        detail: schema,
      };
    });

    const apiDirs = DirectoryNode.constructorApiDir(pontxSpec, pontxSpec.directories);
    const structDir = DirectoryNode.updateDirExpanded({
      name: "definitions",
      title: "数据结构" + `(${structs.length || 0})`,
      children: structs,
      type: DirectoryType.Directory,
      expanded: true,
      detail: {},
    });
    const apiRootDir = DirectoryNode.updateDirExpanded(
      {
        children: apiDirs,
        name: "apis",
        title: "API 列表" + `(${apiDirs.length || 0})`,
        type: DirectoryType.Directory,
        expanded: true,
        detail: {},
      },
      selectedKey,
    );

    const rootDir = (
      [
        // {
        //   name: DirectoryType.Change,
        //   title: '变更历史',
        //   children: [],
        //   type: DirectoryType.Change,
        //   deprecated: false,
        // },
        structDir,
        apiRootDir,
      ] as DirectoryNode[]
    ).filter((dir) => {
      if (dir.name === "definitions" && !structs.length) {
        return false;
      }
      return true;
    });

    return rootDir;
  }

  static findSelectedNode(dir: DirectoryNode[], selectedKey: string): DirectoryNode {
    for (let i = 0; i < dir.length; i++) {
      const node = dir[i];
      if (DirectoryNode.isEqualNode(node, selectedKey)) {
        return node;
      }

      if (node.children?.length) {
        const childNode = DirectoryNode.findSelectedNode(node.children, selectedKey);
        if (childNode) return childNode;
      }
    }
    return null;
  }

  static findOpenKeys(dir: DirectoryNode[]): string[] {
    return dir.reduce((prev, cur) => {
      if (cur.children?.length) {
        return prev.concat(cur.expanded ? [`${cur.type}/${cur.name}`] : [], DirectoryNode.findOpenKeys(cur.children));
      } else {
        return prev.concat(cur.expanded ? [`${cur.type}/${cur.name}`] : []);
      }
    }, []);
  }

  static getSelectedFullKeys(dirs: DirectoryNode[], activeKey: string): string[] {
    const keyPaths = [];

    for (let i = 0; i < dirs.length; i++) {
      const dir = dirs[i];
      if (DirectoryNode.isEqualNode(dir, activeKey)) {
        keyPaths.push(DirectoryNode.getNodeKey(dir));
        return keyPaths;
      }

      if (dir.children?.length) {
        const childKeyPaths = DirectoryNode.getSelectedFullKeys(dir.children, activeKey);
        if (childKeyPaths?.length) {
          keyPaths.push(DirectoryNode.getNodeKey(dir));
          return keyPaths.concat(childKeyPaths);
        }
      }
    }
  }

  // 搜到的节点默认打开
  static filterNodeBySearch(dir: DirectoryNode[], searchValue: string): DirectoryNode[] {
    if (!searchValue) {
      return dir;
    }

    const filterDirChildrenBySearch = (node: DirectoryNode, search: string) => {
      if (node.children?.length) {
        return node.children.filter((child) => {
          if (child.type === DirectoryType.Directory) {
            return !!filterDirChildrenBySearch(child, search)?.length;
          } else {
            return [child.name || "", child?.title || ""]
              .map((str) => str.toLocaleLowerCase())
              .some((str) => str.includes(search?.toLocaleLowerCase?.()));
          }
        });
      }
      return [];
    };

    const filterDirectoryNode = (node) => {
      if (node.type == DirectoryType.Api) return true;
      if (!node.children?.length) return false;
      return node.children.some((child) => filterDirectoryNode(child));
    };

    return dir
      .map((node) => {
        const children = filterDirChildrenBySearch(node, searchValue);

        return {
          ...node,
          children: filterDirChildrenBySearch(node, searchValue),
          expanded: node.expanded || (searchValue && !!children),
        };
      })
      .filter(filterDirectoryNode);
  }

  static toggleExpanded(dir: DirectoryNode[], selectedKey: string) {
    const resultDir = dir.map((node) => {
      if (node.type !== DirectoryType.Directory) {
        return node;
      }
      if (DirectoryNode.isEqualNode(node, selectedKey)) {
        return {
          ...node,
          expanded: !node.expanded,
        };
      } else if (node.children?.length && node.children?.some((child) => child.type === DirectoryType.Directory)) {
        return {
          ...node,
          children: DirectoryNode.toggleExpanded(node.children, selectedKey),
        };
      }
      return node;
    });

    return resultDir;
  }
}
