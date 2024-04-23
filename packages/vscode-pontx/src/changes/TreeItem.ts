import { DiffItem, Mod, ObjectMap, PontAPI, PontJsonSchema, PontSpec, SpecDiffTree, WithoutModsName } from "pontx-spec";
import * as vscode from "vscode";
import { PontSpecWithMods } from "./utils";
import { PontManager, getSpecByName } from "pontx-manager";
import { pontService } from "../Service";
import _ from "lodash";

export class PontxManageTreeItem {
  metaType: "api" | "struct" | "controller" | "definitions" | "spec" | "root";
  meta: any;
  modName?: string;
  metaName: string;
  metaFullName?: string;
  specName: string;

  extensionUri?: vscode.Uri;

  static createRootItem(extensionUri: vscode.Uri) {
    return {
      label: "API 管理",
      contextValue: "pontAPIsManager",
      resourceUri: vscode.Uri.parse(`pontx-manager://manager`),
      collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
    };
  }

  static create(treeMeta: PontxManageTreeItem) {
    switch (treeMeta.metaType) {
      case "root": {
        return {
          label: "API 管理",
          contextValue: "pontAPIsManager",
          resourceUri: vscode.Uri.parse(`pontx-manager://manager`),
          collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
        };
      }
      case "spec": {
        const spec = treeMeta.meta;

        return {
          specName: spec.name,
          contextValue: "Spec",
          resourceUri: vscode.Uri.parse(`pontx-manager://spec/${spec.name}`),
          label: `${spec.name}(${
            PontSpec.getMods(spec)?.length + (Object.keys(spec.definitions || {}).length ? 1 : 0)
          })`,
          collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
        };
      }
      case "struct": {
        const schema = treeMeta.meta;
        const key = treeMeta.metaName;
        const specName = treeMeta.specName;

        return {
          specName,
          structName: key,
          label: key,
          description: schema?.description || schema?.title,
          tooltip: schema?.title || schema?.description,
          contextValue: "Struct",
          iconPath: vscode.Uri.joinPath(pontService.context.extensionUri, "resources/struct-outline.svg"),
          collapsibleState: vscode.TreeItemCollapsibleState.None,
          command: {
            command: "pontx.openPontUI",
            title: "open",
            arguments: [
              {
                specName,
                name: key,
                spec: schema,
                pageType: "document",
                schemaType: "struct",
              },
            ],
          },
        };
      }
      case "api": {
        const api = treeMeta.meta;
        const modName = treeMeta.modName;
        const specName = treeMeta.specName;

        return {
          specName: specName,
          modName,
          apiName: api?.name,
          contextValue: "API",
          resourceUri: vscode.Uri.parse(`pontx-manager://spec/${specName}/apis/${api.name}`),
          label: `${api.name}`,
          iconPath: vscode.Uri.joinPath(pontService.context.extensionUri, "resources/api-outline.svg"),
          description: api?.title || api?.summary,
          tooltip: api?.description || api?.summary,
          collapsibleState: vscode.TreeItemCollapsibleState.None,
          command: {
            command: "pontx.openPontUI",
            title: "open",
            arguments: [
              {
                specName: specName,
                modName: modName,
                spec: api,
                name: api?.name,
                pageType: "document",
                schemaType: "api",
              },
            ],
          },
        };
      }
      case "definitions": {
        const specName = treeMeta.specName;

        return {
          specName,
          isDefs: true,
          contextValue: "Definitions",
          label: `definitions`,
          resourceUri: vscode.Uri.parse(`pontx-manager://spec/${specName}/definitions`),
          description: "数据结构",
          tooltip: "数据结构",
          collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
        };
      }
      case "controller": {
        const mod = treeMeta.meta;
        const specName = treeMeta.specName;

        if (mod.name === WithoutModsName) {
          return {
            specName,
            modName: "apis",
            label: `apis(${mod.interfaces?.length})`,
            description: mod?.description,
            contextValue: "Mod",
            resourceUri: vscode.Uri.parse(`pontx-manager://spec/${specName}/mods/apis`),
            tooltip: mod?.description || undefined,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
          };
        }

        return {
          specName,
          modName: mod?.name,
          label: `${mod.name}(${mod.interfaces?.length})`,
          description: mod?.description,
          contextValue: "Mod",
          resourceUri: vscode.Uri.parse(`pontx-manager://spec/${specName}/mods/${mod.name}`),
          tooltip: mod?.description || undefined,
          collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
        };
      }
    }
  }

  static getModItems(spec: PontSpec) {
    const specMods = PontSpec.getMods(spec) || [];
    const withoutMods = specMods?.length === 1 && specMods?.[0]?.name === WithoutModsName;

    const mods = withoutMods
      ? PontxManageTreeItem.getAPIItems(specMods[0].interfaces, "", spec.name)
      : specMods.map((mod) => {
          return PontxManageTreeItem.create({
            meta: mod,
            metaName: mod.name as any,
            metaType: "controller",
            specName: spec.name,
            modName: mod?.name as any,
          });
        });

    if (spec?.definitions && Object.keys(spec.definitions).length) {
      const defs = PontxManageTreeItem.create({
        meta: null,
        metaName: "definitions",
        metaType: "definitions",
        specName: spec.name,
      });
      return [defs, ...mods];
    }
    return mods;
  }

  static getAPIItems(apis: PontAPI[], modName: string, specName: string) {
    return (apis || []).map((api) => {
      return PontxManageTreeItem.create({
        metaType: "api",
        meta: api,
        metaName: api.name,
        modName,
        specName,
      });
    });
  }

  static getAPIManagerChildren(
    element: PontxManagerTreeItemType,
    pontManager: PontManager,
    extensionUri: vscode.Uri,
  ): vscode.ProviderResult<PontxManagerTreeItemType[]> {
    if (element.contextValue === "pontAPIsManager") {
      const hasSingleSpec = pontManager.localPontSpecs?.length <= 1 && !pontManager.localPontSpecs[0]?.name;
      if (hasSingleSpec) {
        return PontxManageTreeItem.getModItems(pontManager.localPontSpecs[0]);
      }

      return pontManager.localPontSpecs.map((spec) => {
        return {
          specName: spec.name,
          contextValue: "Spec",
          resourceUri: vscode.Uri.parse(`pontx-manager://spec/${spec.name}`),
          label: `${spec.name}(${
            PontSpec.getMods(spec)?.length + (Object.keys(spec.definitions || {}).length ? 1 : 0)
          })`,
          collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
        };
      });
    }

    if (element.apiName) {
      return [];
    } else if (element.structName) {
      return [];
    }
    const spec = pontManager?.localPontSpecs?.find((spec) => spec.name === element.specName);
    if (element.isDefs && spec) {
      return Object.keys(spec.definitions || {}).map((key) => {
        const schema = spec.definitions[key];

        return {
          specName: spec.name,
          structName: key,
          label: key,
          description: schema?.description || schema?.title,
          tooltip: schema?.title || schema?.description,
          contextValue: "Struct",
          iconPath: vscode.Uri.joinPath(extensionUri, "resources/struct-outline.svg"),
          collapsibleState: vscode.TreeItemCollapsibleState.None,
          command: {
            command: "pontx.openPontUI",
            title: "open",
            arguments: [
              {
                specName: spec.name,
                name: key,
                spec: schema,
                pageType: "document",
                schemaType: "struct",
              },
            ],
          },
        };
      });
    } else if (element.modName && spec) {
      const mod = PontSpec.getMods(spec)?.find((mod) => mod.name === element.modName);

      return PontxManageTreeItem.getAPIItems(mod.interfaces, mod.name as string, spec.name);
    } else {
      return PontxManageTreeItem.getModItems(spec);
    }
  }
}

export type PontxManagerTreeItemType = ReturnType<typeof PontxManageTreeItem.create>;
