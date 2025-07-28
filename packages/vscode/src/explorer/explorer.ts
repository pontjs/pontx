/**
 * @author: jasonHzq
 * @description: pontx VSCode 插件左侧 API TreeView 实现，支持按 spec name、tag name 分组，节点唯一 id 为 jsonPath。
 */

import * as vscode from "vscode";
import { PontxManager, ResolvedConfig } from "pontx";
import { PontxAPI, PontxJsonSchema, PontxSpec, TagGroup } from "@pontx/spec";
import _ from "lodash";

/** 节点类型枚举 */
export enum PontxTreeItemType {
  SpecsRoot = "specs-root",
  Spec = "spec",
  Tag = "tag",
  API = "api",
  Schema = "schema",
  Schemas = "schemas",
}

/** TreeItem 节点数据结构 */
export type PontxTreeItem<T = any> = {
  /** 节点类型 */
  type: PontxTreeItemType;
  /** 节点名称 */
  name: string;
  /** 唯一 id，jsonPath */
  jsonPath: (string | number)[];
  /** 额外数据 */
  data?: T;
  /** 所属 spec 名称 */
  specName?: string;
};

/**
 * 获取不同类型 treeItem 的配置，如 icon、title 等
 */
export function getTreeItemConfig(item: PontxTreeItem) {
  switch (item.type) {
    case PontxTreeItemType.Spec: {
      const spec = item.data as PontxSpec;
      const tags = PontxSpec.getTagGroups(spec);
      const schemas = spec?.components?.schemas;

      let cnt = 0;
      if (tags?.length) {
        cnt += tags.length;
      } else {
        const apiCnt = Object.keys(spec?.apis || {}).length;
        cnt += apiCnt;
      }
      if (schemas && !_.isEmpty(schemas)) {
        cnt += 1;
      }

      return {
        icon: new vscode.ThemeIcon("file-directory"),
        label: `${spec?.name}(${cnt})`,
        tooltip: spec.name,
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
      };
    }
    case PontxTreeItemType.Tag: {
      const tagGroup = item.data as TagGroup;

      return {
        icon: new vscode.ThemeIcon("file-directory"),
        tooltip: tagGroup?.description || "",
        label: `${tagGroup?.name}(${tagGroup?.apis?.length || 0})`,
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
      };
    }
    case PontxTreeItemType.API: {
      const api = item.data as PontxAPI;

      return {
        icon: "resources/api-outline.svg",
        tooltip: api.summary || api.description || "",
        label: item.name,
        collapsibleState: vscode.TreeItemCollapsibleState.None,
      };
    }
    case PontxTreeItemType.Schema: {
      const schema = item.data as PontxJsonSchema;

      return {
        icon: "resources/struct-outline.svg",
        tooltip: schema.description || "",
        label: item.name,
        collapsibleState: vscode.TreeItemCollapsibleState.None,
      };
    }
    default:
      return {};
  }
}

/**
 * pontx API TreeView 的数据提供者
 */
export class PontxTreeDataProvider
  implements vscode.TreeDataProvider<PontxTreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    PontxTreeItem | undefined | void
  > = new vscode.EventEmitter<PontxTreeItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<PontxTreeItem | undefined | void> =
    this._onDidChangeTreeData.event;

  constructor(
    private extensionUri: vscode.Uri,
    private manager: PontxManager
  ) {}

  /** 刷新树 */
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /** 获取节点配置 */
  getTreeItem(element: PontxTreeItem): vscode.TreeItem {
    const config = getTreeItemConfig(element);
    const treeItem = new vscode.TreeItem(config.label, config.collapsibleState);

    if (config.icon && typeof config.icon === "string") {
      treeItem.iconPath = vscode.Uri.joinPath(this.extensionUri, config.icon);
    } else {
      treeItem.iconPath = config.icon;
    }

    treeItem.tooltip = config.tooltip;

    return treeItem;
  }

  /** 获取子节点 */
  async getChildren(element?: PontxTreeItem): Promise<PontxTreeItem[]> {
    if (!element) {
      // 根节点：spec name
      return this.getSpecsRootNodes();
    }

    switch (element.type) {
      case PontxTreeItemType.SpecsRoot: {
        return this.getSpecNodes();
      }
      case PontxTreeItemType.Spec: {
        const tagGroups = PontxSpec.getTagGroups(element.data);
        const schemas = this.getSchemasNodes(element);
        if (tagGroups?.length) {
          return [...this.getTagNodes(element), ...schemas];
        }
        return [...this.getApiNodes(element), ...schemas];
      }
      case PontxTreeItemType.Tag: {
        return this.getApiNodes(element);
      }
      case PontxTreeItemType.Schemas: {
        return this.getSchemasNodes(element);
      }
      default:
        return [];
    }
  }

  getSpecsRootNodes(): PontxTreeItem[] {
    return [
      {
        type: PontxTreeItemType.SpecsRoot,
        name: "接口管理",
        jsonPath: [],
      } as PontxTreeItem,
    ];
  }

  /** 获取所有 spec 节点 */
  getSpecNodes(): PontxTreeItem[] {
    const origins = this.manager?.resolvedConfig?.origins || [];

    return origins.map((origin) => {
      return {
        type: PontxTreeItemType.Spec,
        name: origin.name,
        jsonPath: [],
        specName: origin.name,
        data: origin.spec,
      } as PontxTreeItem;
    });
  }

  /** 获取 tag 节点 */
  getTagNodes(specNode: PontxTreeItem): PontxTreeItem[] {
    const spec = specNode.data;
    const tags = PontxSpec.getTagGroups(spec);

    return (tags || []).map((tag) => {
      return {
        type: PontxTreeItemType.Tag,
        name: tag.name,
        jsonPath: ["tags", { name: tag.name }],
        specName: specNode.specName,
        data: tag,
      } as PontxTreeItem;
    });
  }

  getSchemasNodes(specNode: PontxTreeItem): PontxTreeItem[] {
    const spec: PontxSpec = specNode.data;

    return [
      {
        type: PontxTreeItemType.Schemas,
        name: "schemas",
        jsonPath: ["components", "schemas"],
        data: spec?.components?.schemas,
        specName: specNode.specName,
      } as PontxTreeItem,
    ];
  }

  getApiNodes(tagNode: PontxTreeItem): PontxTreeItem[] {
    if (tagNode.type === PontxTreeItemType.Tag) {
      const tagGroup = tagNode.data as TagGroup;
      const apis = tagGroup?.apis || {};

      return Object.keys(apis).map((apiName) => {
        const api = apis[apiName];

        return {
          type: PontxTreeItemType.API,
          name: apiName,
          jsonPath: ["apis", apiName],
          specName: tagNode.specName,
          data: api,
        } as PontxTreeItem;
      });
    }

    const spec = tagNode.data as PontxSpec;
    const apis = spec?.apis || {};

    return Object.keys(apis).map((apiName) => {
      const api = apis[apiName];

      return {
        type: PontxTreeItemType.API,
        name: apiName,
        jsonPath: ["apis", apiName],
        specName: tagNode.specName,
        data: api,
      } as PontxTreeItem;
    });
  }

  getSchemaNodes(schemasNode: PontxTreeItem): PontxTreeItem[] {
    const schemas = schemasNode.data;

    return Object.keys(schemas || {}).map((schemaName) => {
      const schema = schemas[schemaName];

      return {
        type: PontxTreeItemType.Schema,
        name: schemaName,
        jsonPath: ["components", "schemas", schemaName],
        specName: schemasNode.specName,
        data: schema,
      } as PontxTreeItem;
    });
  }
}
