/**
 * @author: jasonHzq
 * @description: pontx VSCode 插件左侧 API TreeView 实现，支持按 spec name、tag name 分组，节点唯一 id 为 jsonPath。
 */

import * as vscode from "vscode";
import { PontxManager, ResolvedConfig } from "pontx";
import { PontxAPI, PontxJsonSchema, PontxSpec, TagGroup } from "@pontx/spec";
import _ from "lodash";
import { PontxTreeItem, PontxTreeItemType } from "../type";
import { WebViewManager } from "../webview/node/webview-manager";
import { PontxJsonSchemaMap } from "../type";

/**
 * 获取不同类型 treeItem 的配置，如 icon、title 等
 */
export function getTreeItemConfig(item: PontxTreeItem) {
  switch (item.type) {
    case PontxTreeItemType.SpecsRoot: {
      const origins = item.data as any[];
      const specCnt = origins.length || 0;

      return {
        icon: new vscode.ThemeIcon("file-directory"),
        label: `API Specs(${specCnt})`,
        tooltip: "All API Specifications",
        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
      };
    }
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
    case PontxTreeItemType.Schemas: {
      const schemas = item.data as {
        [x: string]: PontxJsonSchema;
      };
      const schemaCnt = Object.keys(schemas).length || 0;

      return {
        icon: new vscode.ThemeIcon("file-directory"),
        label: `Schemas(${schemaCnt})`,
        tooltip: `Schemas`,
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
      };
    }
    case PontxTreeItemType.Tag: {
      const tagGroup = item.data as TagGroup;
      const apiCnt = Object.keys(tagGroup?.apis || {}).length || 0;

      return {
        icon: new vscode.ThemeIcon("file-directory"),
        tooltip: tagGroup?.description || "",
        label: `${tagGroup?.name}(${apiCnt})`,
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

  /** 缓存 spec 的 components.schemas，避免重复复制 */
  private schemasCache = new Map<string, PontxJsonSchemaMap>();

  constructor(
    private extensionUri: vscode.Uri,
    private manager: PontxManager
  ) {}

  /**
   * 获取对应 spec 的 components.schemas，使用缓存优化内存使用
   */
  private getSpecSchemas(specName?: string): PontxJsonSchemaMap | undefined {
    if (!specName || !this.manager?.resolvedConfig?.origins) {
      return undefined;
    }

    // 先从缓存中获取
    if (this.schemasCache.has(specName)) {
      return this.schemasCache.get(specName);
    }

    // 从 manager 中获取并缓存
    const origin = this.manager.resolvedConfig.origins.find(
      (o) => o.name === specName
    );
    const schemas = origin?.spec?.components?.schemas;

    if (schemas) {
      this.schemasCache.set(specName, schemas);
    }

    return schemas;
  }

  /**
   * 清理缓存，在 spec 数据更新时调用
   */
  private clearSchemasCache(specName?: string): void {
    if (specName) {
      this.schemasCache.delete(specName);
    } else {
      this.schemasCache.clear();
    }
  }

  /** 刷新树 */
  refresh(): void {
    // 清理缓存，确保数据一致性
    this.clearSchemasCache();
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

    // 为 API 和 Schema 节点添加点击命令
    if (
      element.type === PontxTreeItemType.API ||
      element.type === PontxTreeItemType.Schema
    ) {
      treeItem.command = {
        command: "pontx.openDoc",
        title: "查看文档",
        arguments: [element],
      };
    }

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
          return [...schemas, ...this.getTagNodes(element)];
        }
        return [...schemas, ...this.getApiNodes(element)];
      }
      case PontxTreeItemType.Tag: {
        return this.getApiNodes(element);
      }
      case PontxTreeItemType.Schemas: {
        return this.getSchemaNodes(element);
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
        data: this.manager?.resolvedConfig?.origins || [],
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
    // 使用缓存获取 components.schemas
    const componentsSchemas = this.getSpecSchemas(tagNode.specName);

    if (tagNode.type === PontxTreeItemType.Tag) {
      const tagGroup = tagNode.data as TagGroup;
      const apis = tagGroup?.apis || {};

      return Object.keys(apis).map((apiName) => {
        const api = apis[apiName];
        let pureName = apiName;
        if (apiName?.includes("/")) {
          const [groupName, ...names] = apiName.split("/");
          if (groupName === tagGroup?.name) {
            pureName = names.join("/");
          }
        }

        // 共享引用：直接使用缓存的 schemas
        const dataWithComponents = componentsSchemas
          ? {
              ...api,
              components: {
                schemas: componentsSchemas,
              },
            }
          : api;

        return {
          type: PontxTreeItemType.API,
          name: pureName,
          jsonPath: ["apis", apiName],
          specName: tagNode.specName,
          data: dataWithComponents,
        } as PontxTreeItem;
      });
    }

    const spec = tagNode.data as PontxSpec;
    const apis = spec?.apis || {};

    return Object.keys(apis).map((apiName) => {
      const api = apis[apiName];

      // 共享引用：直接使用缓存的 schemas
      const dataWithComponents = componentsSchemas
        ? {
            ...api,
            components: {
              schemas: componentsSchemas,
            },
          }
        : api;

      return {
        type: PontxTreeItemType.API,
        name: apiName,
        jsonPath: ["apis", apiName],
        specName: tagNode.specName,
        data: dataWithComponents,
      } as PontxTreeItem;
    });
  }

  getSchemaNodes(schemasNode: PontxTreeItem): PontxTreeItem[] {
    const schemas = schemasNode.data;

    // 使用缓存获取 components.schemas
    const componentsSchemas = this.getSpecSchemas(schemasNode.specName);

    return Object.keys(schemas || {}).map((schemaName) => {
      const schema = schemas[schemaName];

      // 共享引用：直接使用缓存的 schemas
      const dataWithComponents = componentsSchemas
        ? {
            ...schema,
            components: {
              schemas: componentsSchemas,
            },
          }
        : schema;

      return {
        type: PontxTreeItemType.Schema,
        name: schemaName,
        jsonPath: ["components", "schemas", schemaName],
        specName: schemasNode.specName,
        data: dataWithComponents,
      } as PontxTreeItem;
    });
  }
}
