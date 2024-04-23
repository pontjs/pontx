import {
  DiffItem,
  Mod,
  ObjectMap,
  PontAPI,
  PontJsonSchema,
  PontSpec,
  PontSpecs,
  SpecDiffTree,
  WithoutModsName,
} from "pontx-spec";
import * as vscode from "vscode";
import { PontSpecWithMods } from "./utils";
import { PontManager, getSpecByName } from "pontx-manager";
import { pontService } from "../Service";
import _ from "lodash";

export type MetaType = "api" | "struct" | "controller" | "definitions" | "spec" | "root" | "status-root" | "dirInfo";
export type MetaStatusType = "Changes" | "StagedChanges";

export class PontxChangesTreeItem {
  metaType: MetaType;
  meta: any;
  remoteMeta?: any;
  metaName: string;
  diffItems?: DiffItem[];
  metaFullName?: string;
  metaStatus: MetaStatusType;
  diffCnt?: number;
  extensionUri?: vscode.Uri;
  diffType?: string;
  modName?: string;
  specName: string;

  static getElementType(element: PontxChangesTreeItemType): MetaType {
    if (element.contextValue === "pontChangesManager") {
      return "root";
    }
    if (element.contextValue === "StagedChanges" || element.contextValue === "Changes") {
      return "status-root";
    }
    if (element.contextValue === "StagedChangesSpec" || element.contextValue === "ChangesSpec") {
      return "spec";
    }
    if (element.contextValue === "StagedChangesMod" || element.contextValue === "ChangesMod") {
      return "controller";
    }
    if (element.contextValue === "StagedChangesAPI" || element.contextValue === "ChangesAPI") {
      return "api";
    }
    if (element.contextValue === "StagedChangesStruct" || element.contextValue === "ChangesStruct") {
      return "struct";
    }
    if (element.contextValue === "StagedChangesDefinitions" || element.contextValue === "ChangesDefinitions") {
      return "definitions";
    }
  }

  static createRootItem(extensionUri: vscode.Uri, diffCnt = 0) {
    return {
      label: `API 变更管理(${diffCnt || 0})`,
      contextValue: "pontChangesManager",
      resourceUri: vscode.Uri.parse(`pontx-changes://manager`),
      collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
    };
  }

  static createStatusRootItem(metaStatus: MetaStatusType, diffCnt = 0) {
    if (metaStatus === "StagedChanges") {
      return {
        label: `Staged Changes(${diffCnt || 0})`,
        description: "已暂存的变更",
        tooltip: "按需更新远程的变更",
        contextValue: "StagedChanges",
        resourceUri: vscode.Uri.parse(`pontx-changes://StagedChanges`),
        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
      };
    } else if (metaStatus === "Changes") {
      return {
        label: `Changes(${diffCnt || 0})`,
        description: "远程API更新",
        tooltip: "按需更新远程的变更",
        contextValue: "Changes",
        resourceUri: vscode.Uri.parse(`pontx-changes://Changes`),
        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
      };
    }
  }

  static createSpecItem(meta: { specDiffItem: SpecDiffTree; metaStatus: MetaStatusType }) {
    const diffCnt = DiffItem.getSpecDiffCnt(meta.specDiffItem);
    if (meta?.metaStatus === "Changes" && meta?.specDiffItem?.specDiff?.type === "specInfo" && !diffCnt) {
      return {
        label: `${meta.specDiffItem?.name}基本信息配置`,
        specName: meta.specDiffItem?.name,
        itemCnt: 1,
        contextValue: meta.metaStatus + "Spec",
        collapsibleState: vscode.TreeItemCollapsibleState.None,
        resourceUri: vscode.Uri.parse(`pontx-changes://${meta.metaStatus}/${meta.specDiffItem.diffType}`),
        schema: meta.specDiffItem,
      };
    }

    return {
      label: `${meta.specDiffItem?.name}(${diffCnt || 0})`,
      specName: meta.specDiffItem?.name,
      itemCnt: diffCnt || 0,
      contextValue: meta.metaStatus + "Spec",
      collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
      resourceUri: vscode.Uri.parse(`pontx-changes://${meta.metaStatus}/${meta.specDiffItem.diffType}`),
      schema: meta.specDiffItem,
    };
  }

  static createControllerItem(meta: {
    controllerDiff: DiffItem;
    metaStatus: MetaStatusType;
    mod: Mod;
    specName: string;
  }) {
    const diffCnt = meta.controllerDiff?.diffItems.length || 0;
    const { mod, specName, controllerDiff, metaStatus } = meta;

    if (mod.name === WithoutModsName || mod.name === "apis") {
      return {
        label: diffCnt ? `apis(${diffCnt})` : "apis",
        specName,
        modName: "apis",
        resourceUri: vscode.Uri.parse(`pontx-changes://${metaStatus}Mod/${controllerDiff.diffType}`),
        contextValue: metaStatus + "Mod",
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
        diffItems: controllerDiff.diffItems,
      };
    }

    return {
      label: diffCnt ? `${mod.name}(${diffCnt})` : mod.name,
      specName,
      modName: mod.name,
      resourceUri: vscode.Uri.parse(`pontx-changes://${metaStatus}Mod/${controllerDiff.diffType || "updated"}`),
      contextValue: metaStatus + "Mod",
      collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
      diffItems: controllerDiff.diffItems,
    };
  }

  static create(treeMeta: PontxChangesTreeItem) {
    const specName = treeMeta.specName;

    switch (treeMeta.metaType) {
      // case "dir": {
      //   const api = treeMeta.meta;
      //   const modName = treeMeta.modName;

      //   return {
      //     label: api.name,
      //     specName,
      //     modName,
      //     apiName: api.name,
      //     description: api.title || api.summary,
      //     tooltip: api.description || api.summary,
      //     contextValue: treeMeta.metaStatus + "API",
      //     collapsibleState: vscode.TreeItemCollapsibleState.None,
      //     schema: api,
      //     resourceUri: vscode.Uri.parse(`pontx-changes://${treeMeta.metaStatus}API/${treeMeta.diffType}`),
      //     iconPath: vscode.Uri.joinPath(treeMeta.extensionUri, "resources/api-outline.svg"),
      //     command: {
      //       command: "pontx.openPontUI",
      //       title: "open",
      //       arguments: [
      //         {
      //           specName,
      //           modName,
      //           spec: treeMeta?.meta,
      //           remoteSpec: treeMeta?.remoteMeta,
      //           name: api.name,
      //           pageType: "changes",
      //           schemaType: "api",
      //         },
      //       ],
      //     },
      //   };
      // }
      case "api": {
        const schema = treeMeta.meta || treeMeta.remoteMeta;
        const modName = treeMeta.modName;

        return {
          label: schema.name,
          specName,
          modName,
          apiName: schema.name,
          description: schema.title || schema.summary,
          tooltip: schema.description || schema.summary,
          contextValue: treeMeta.metaStatus + "API",
          collapsibleState: vscode.TreeItemCollapsibleState.None,
          schema: schema,
          resourceUri: vscode.Uri.parse(`pontx-changes://${treeMeta.metaStatus}API/${treeMeta.diffType}`),
          iconPath: vscode.Uri.joinPath(treeMeta.extensionUri, "resources/api-outline.svg"),
          command: {
            command: "pontx.openPontUI",
            title: "open",
            arguments: [
              {
                specName,
                modName,
                spec: treeMeta?.meta,
                remoteSpec: treeMeta?.remoteMeta,
                name: schema.name,
                pageType: "changes",
                schemaType: "api",
              },
            ],
          },
        };
      }
      case "struct": {
        const schema = treeMeta.meta || treeMeta.remoteMeta;
        const name = treeMeta.metaName;

        return {
          label: name,
          specName,
          structName: name,
          description: schema.title || schema.description,
          tooltip: schema.description || schema.title,
          contextValue: treeMeta.metaStatus + "Struct",
          iconPath: vscode.Uri.joinPath(treeMeta.extensionUri, "resources/struct-outline.svg"),
          resourceUri: vscode.Uri.parse(`pontx-changes://${treeMeta.metaStatus}Struct/${treeMeta.diffType}`),
          collapsibleState: vscode.TreeItemCollapsibleState.None,
          schema,
          command: {
            command: "pontx.openPontUI",
            title: "open",
            arguments: [
              {
                specName,
                name,
                spec: treeMeta.meta,
                remoteSpec: treeMeta.remoteMeta,
                pageType: "changes",
                schemaType: "struct",
              },
            ],
          },
        };
      }
    }
  }

  static getSpecChildren(specDiff: SpecDiffTree, metaStatus: MetaStatusType) {
    if (!specDiff) {
      return [];
    }

    const localSpec = PontSpecs.getSpecByName(pontService.pontManager.localPontSpecs, specDiff.name);
    const remoteSpec = PontSpecs.getSpecByName(pontService.pontManager.remotePontSpecs, specDiff.name);

    if (!localSpec && !remoteSpec) {
      return [];
    }
    const specName = specDiff.name;

    const dirs = specDiff.controllers || [];
    const isPureApis = dirs?.length === 1 && dirs?.[0]?.name === (WithoutModsName as any);

    if (isPureApis) {
      // PontxChangesTreeItem.getControllerApiItems(apiDiffs, spec.name, contextValue)
      return;
    }

    let mods = dirs.map((dir) => {
      const remoteMod = PontSpec.getModByName(remoteSpec, dir.name);
      const localMod = PontSpec.getModByName(localSpec, dir.name);
      const mod = localMod || remoteMod;

      return PontxChangesTreeItem.createControllerItem({
        mod,
        controllerDiff: dir,
        specName,
        metaStatus,
      });
    });

    if (specDiff?.apis?.length) {
      return specDiff.apis.map((api) => {
        const localApi = localSpec?.apis?.[api?.name];
        const remoteApi = remoteSpec?.apis?.[api?.name];

        return PontxChangesTreeItem.create({
          meta: localApi,
          metaName: api?.name,
          metaStatus,
          metaType: "api",
          specName,
          modName: "",
          extensionUri: pontService.context.extensionUri,
          diffType: api.diffType,
          remoteMeta: remoteApi,
        });
      });
    }

    if (specDiff.definitions?.length) {
      const defs = {
        label: `数据结构(${(specDiff.definitions || []).length})`,
        specName,
        resourceUri: vscode.Uri.parse(`pontx-changes://${metaStatus}Definitions/updated`),
        contextValue: metaStatus + "Definitions",
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
        diffItems: specDiff.definitions,
        schema: localSpec.definitions || remoteSpec.definitions,
      };
      return [defs, ...mods];
    }
    return mods;
  }

  static getControllerChildren(apiDiffs: DiffItem[], specName: string, metaStatus: PontxChangesTreeItem["metaStatus"]) {
    const localSpec = getSpecByName(pontService.pontManager.localPontSpecs, specName);
    const remoteSpec = getSpecByName(pontService.pontManager.remotePontSpecs, specName);

    return (apiDiffs || [])
      .map((apiDiff) => {
        if (apiDiff.type === "dir") {
          return null;
        }

        const apiKey = apiDiff.name;
        const localApi = localSpec?.apis?.[apiKey];
        const remoteApi = remoteSpec?.apis?.[apiKey];
        const modName = apiKey.includes("/") ? apiKey.split("/")?.[0] : "";

        return PontxChangesTreeItem.create({
          meta: localApi,
          metaName: apiDiff?.name,
          metaStatus,
          metaType: "api",
          specName,
          modName,
          extensionUri: pontService.context.extensionUri,
          diffType: apiDiff.diffType,
          remoteMeta: remoteApi,
        });
      })
      .filter((id) => id);
  }

  static getDefinitionsChildren(extensionUri, diffItems: DiffItem[], specName: string, metaStatus: MetaStatusType) {
    const localSpec = getSpecByName(pontService.pontManager.localPontSpecs, specName);
    const remoteSpec = getSpecByName(pontService.pontManager.remotePontSpecs, specName);

    return (diffItems || []).map((diff) => {
      const localSchema = localSpec?.definitions?.[diff?.name];
      const remoteSchema = remoteSpec?.definitions?.[diff?.name];

      return PontxChangesTreeItem.create({
        extensionUri,
        meta: localSchema,
        metaName: diff.name,
        metaStatus,
        metaType: "struct",
        specName,
        diffType: diff.diffType,
        remoteMeta: remoteSchema,
      });
    });
  }

  static getAPIChangesChildren(
    element: PontxChangesTreeItemType,
    pontManager: PontManager,
    stagedDiffs: SpecDiffTree[],
    changedDiffs: SpecDiffTree[],
    extensionUri: vscode.Uri,
  ): vscode.ProviderResult<any[]> {
    const hasSingleSpec = PontManager.checkIsSingleSpec(pontManager);
    const elementType = PontxChangesTreeItem.getElementType(element);
    const metaStatus = element.contextValue?.startsWith("StagedChanges") ? "StagedChanges" : "Changes";

    if (elementType === "root") {
      const stagedItemCnt = hasSingleSpec ? DiffItem?.getSpecDiffCnt(stagedDiffs[0]) : stagedDiffs.length;
      const changesItemCnt = hasSingleSpec ? DiffItem?.getSpecDiffCnt(changedDiffs[0]) : changedDiffs.length;

      return [
        PontxChangesTreeItem.createStatusRootItem("StagedChanges", stagedItemCnt),
        PontxChangesTreeItem.createStatusRootItem("Changes", changesItemCnt),
      ];
    }

    if (elementType === "status-root") {
      const specs = element.contextValue === "StagedChanges" ? stagedDiffs : changedDiffs;

      if (hasSingleSpec) {
        return PontxChangesTreeItem.getSpecChildren(specs[0], metaStatus) as any;
      }

      return specs
        .map((specDiffItem) => {
          return PontxChangesTreeItem.createSpecItem({ metaStatus, specDiffItem });
        })
        .filter((child) => child.itemCnt > 0);
    }
    if (elementType === "spec") {
      return PontxChangesTreeItem.getSpecChildren(element.schema, metaStatus) as any;
    } else if (elementType === "controller") {
      return PontxChangesTreeItem.getControllerChildren(element.diffItems, element.specName, metaStatus);
    } else if (elementType === "definitions") {
      return PontxChangesTreeItem.getDefinitionsChildren(extensionUri, element.diffItems, element.specName, metaStatus);
    }
    return [];
  }
}

export type PontxChangesTreeItemType = ReturnType<typeof PontxChangesTreeItem.create> & { diffItems: DiffItem[] };
