import { PontManager } from "pont-manager";
import { PontAPI, Mod, ObjectMap, PontJsonSchema, PontSpec, PontJsonPointer } from "pont-spec";
import { diffPontSpecs, DiffResult } from "pont-spec-diff";
import * as vscode from "vscode";
import { getPontSpecByProcessType, MetaType, PontSpecDiffs, PontSpecWithMods, StagedChange } from "./changes/utils";
import * as path from "path";
import { viewMetaFile } from "./utils";

export class PontAPITreeItem extends vscode.TreeItem {
  specName?: string;
  modName?: string | Symbol;
  structName?: string;
  apiName?: string;
  isDefs?: boolean;
}

export class PontAPIExplorer {
  static getModItems(spec: PontSpec) {
    const mods = (PontSpec.getMods(spec) || []).map((mod) => {
      return {
        specName: spec.name,
        modName: mod?.name,
        label: `${mod.name}(${mod.interfaces?.length})`,
        description: mod?.description,
        contextValue: "Mod",
        resourceUri: vscode.Uri.parse(`pont-manager://spec/${spec.name}/mods/${mod.name}`),
        tooltip: mod?.description || undefined,
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
      } as PontAPITreeItem;
    });

    if (spec?.definitions && Object.keys(spec.definitions).length) {
      const defs = {
        specName: spec.name,
        isDefs: true,
        contextValue: "Definitions",
        label: `definitions`,
        resourceUri: vscode.Uri.parse(`pont-manager://spec/${spec.name}/definitions`),
        description: "数据结构",
        tooltip: "数据结构",
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
      };
      return [defs, ...mods];
    }
    return mods;
  }
}

export class PontFileDecoration implements vscode.FileDecorationProvider, vscode.Disposable {
  private readonly disposable: vscode.Disposable;
  dispose() {
    this.disposable.dispose();
  }
  onDidChangeFileDecorations?: vscode.Event<vscode.Uri | vscode.Uri[]>;
  provideFileDecoration(
    uri: vscode.Uri,
    token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.FileDecoration> {
    if (uri.scheme === "pont-changes") {
      const textMap = {
        delete: "D",
        update: "M",
        create: "C",
        equal: "E",
        untracked: "U",
      };
      const labelMap = {
        delete: "传入的新元数据中已删除",
        update: "传入的新元数据中已更新",
        create: "传入的新元数据中已新增",
        equal: "与传入的新元数据等同，但子元数据存在不同",
        untracked: "Untracked",
      };
      const colorMap = {
        update: new vscode.ThemeColor("pontx.decorations.modifiedForegroundColor"),
        delete: new vscode.ThemeColor("pontx.decorations.deletedForegroundColor"),
        create: new vscode.ThemeColor("pontx.decorations.addedForegroundColor"),
        untracked: new vscode.ThemeColor("pontx.decorations.untrackedForegroundColor"),
      };
      const [contextValue, diffType] = uri.path.split("/");

      if (textMap[diffType]) {
        return {
          badge: textMap[diffType],
          color: colorMap[diffType],
          tooltip: labelMap[diffType],
        };
      }
    }

    return undefined;
  }
  constructor() {
    this.disposable = vscode.Disposable.from(
      // Register the current branch decorator separately (since we can only have 2 char's per decoration)
      // vscode.window.registerFileDecorationProvider({
      // 	provideFileDecoration: (uri, token) => {
      // 		return
      // 	},
      // }),
      vscode.window.registerFileDecorationProvider(this),
    );
  }
}

export class PontChangeTreeItem extends vscode.TreeItem {
  schema?: any;
  specName?: string;
  modName?: string | Symbol;
  apiName?: string;
  structName?: string;
}

function getMetaTypeByContextValue(contextValue: string) {
  if (contextValue.endsWith("ChangesAPI")) {
    return MetaType.API;
  } else if (contextValue.endsWith("ChangesStruct")) {
    return MetaType.Struct;
  } else if (contextValue.endsWith("ChangesSpec")) {
    return MetaType.Spec;
  } else if (contextValue.endsWith("ChangesDefinitions")) {
    return MetaType.Definitions;
  } else if (contextValue.endsWith("ChangesMod")) {
    return MetaType.Mod;
  } else if (contextValue.endsWith("Changes")) {
    return MetaType.All;
  }
}

export class PontExplorer implements vscode.TreeDataProvider<PontChangeTreeItem | PontAPITreeItem> {
  specsDiffs: any[] = [];
  // stagedChanges = [] as StagedChange[];
  stagedLocalSpecs = [] as PontSpec[];
  stagedDiffs: any[] = [];
  allDiffs: any[] = [];

  getAPIManagerChildren(element?: PontAPITreeItem): vscode.ProviderResult<PontAPITreeItem[]> {
    if (element.contextValue === "pontAPIsManager") {
      const hasSingleSpec = this.pontManager.localPontSpecs?.length <= 1 && !this.pontManager.localPontSpecs[0]?.name;
      if (hasSingleSpec) {
        return PontAPIExplorer.getModItems(this.pontManager.localPontSpecs[0]);
      }

      return this.pontManager.localPontSpecs.map((spec) => {
        return {
          specName: spec.name,
          contextValue: "Spec",
          resourceUri: vscode.Uri.parse(`pont-manager://spec/${spec.name}`),
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
    const spec = this.pontManager?.localPontSpecs?.find((spec) => spec.name === element.specName);
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
          iconPath: vscode.Uri.joinPath(this.context.extensionUri, "resources/struct-outline.svg"),
          collapsibleState: vscode.TreeItemCollapsibleState.None,
          command: {
            command: "pont.openPontUI",
            title: "open",
            arguments: [
              {
                specName: spec.name,
                name: key,
                pageType: "document",
                schemaType: "struct",
              },
            ],
          },
        };
      });
    } else if (element.modName && spec) {
      const mod = PontSpec.getMods(spec)?.find((mod) => mod.name === element.modName);
      return (mod?.interfaces || []).map((api) => {
        return {
          specName: spec.name,
          modName: mod?.name,
          apiName: api?.name,
          contextValue: "API",
          resourceUri: vscode.Uri.parse(`pont-manager://spec/${spec.name}/apis/${mod.name}/${api.name}`),
          label: `${api.name}`,
          iconPath: vscode.Uri.joinPath(this.context.extensionUri, "resources/api-outline.svg"),
          description: api?.description || api?.title,
          tooltip: api?.title || api?.description,
          collapsibleState: vscode.TreeItemCollapsibleState.None,
          command: {
            command: "pont.openPontUI",
            title: "open",
            arguments: [
              {
                specName: spec.name,
                modName: mod?.name,
                name: api?.name,
                pageType: "document",
                schemaType: "api",
                spec: api,
              },
            ],
          },
        };
      });
    } else {
      return PontAPIExplorer.getModItems(spec);
    }
  }
  resolveTreeItem?(
    item: vscode.TreeItem,
    element: vscode.TreeItem,
    token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.TreeItem> {
    throw new Error("Method not implemented.");
  }

  updateDiffs() {
    this.specsDiffs = diffPontSpecs(this.stagedLocalSpecs, this.pontManager.remotePontSpecs) || [];
    this.stagedDiffs = diffPontSpecs(this.pontManager.localPontSpecs, this.stagedLocalSpecs) || [];
    this.allDiffs = diffPontSpecs(this.pontManager.localPontSpecs, this.pontManager.remotePontSpecs) || [];
  }

  constructor(
    private pontManager: PontManager,
    private context: vscode.ExtensionContext,
    private updatePontManager: Function,
  ) {
    this.stagedLocalSpecs = pontManager.localPontSpecs;
    this.updateDiffs();

    vscode.commands.registerCommand("pontChanges.stage", (meta) => {
      this.stagedLocalSpecs = PontSpecDiffs.updateSpecsByProcessType(
        this.stagedLocalSpecs,
        this.pontManager,
        {
          metaType: getMetaTypeByContextValue(meta.contextValue),
          apiName: meta.apiName,
          modName: meta.modName,
          specName: meta.specName,
          structName: meta.structName,
        },
        "staged",
      );
      this.updateDiffs();
      this._onDidChangeTreeData.fire();
    });
    vscode.commands.registerCommand("pontChanges.unStage", (meta) => {
      this.stagedLocalSpecs = PontSpecDiffs.updateSpecsByProcessType(
        this.stagedLocalSpecs,
        this.pontManager,
        {
          metaType: getMetaTypeByContextValue(meta.contextValue),
          apiName: meta.apiName,
          modName: meta.modName,
          specName: meta.specName,
          structName: meta.structName,
        },
        "untracked",
      );
      this.updateDiffs();
      this._onDidChangeTreeData.fire();
    });
    vscode.commands.registerCommand("pontChanges.batchStage", (meta) => {
      this.stagedLocalSpecs = PontSpecDiffs.updateSpecsByProcessType(
        this.stagedLocalSpecs,
        this.pontManager,
        {
          metaType: getMetaTypeByContextValue(meta.contextValue),
          apiName: meta.apiName,
          modName: meta.modName,
          specName: meta.specName,
          structName: meta.structName,
        },
        "staged",
      );
      this.updateDiffs();
      this._onDidChangeTreeData.fire();
    });
    vscode.commands.registerCommand("pontChanges.batchUnStage", (meta) => {
      this.stagedLocalSpecs = PontSpecDiffs.updateSpecsByProcessType(
        this.stagedLocalSpecs,
        this.pontManager,
        {
          metaType: getMetaTypeByContextValue(meta.contextValue),
          apiName: meta.apiName,
          modName: meta.modName,
          specName: meta.specName,
          structName: meta.structName,
        },
        "untracked",
      );
      this.updateDiffs();
      this._onDidChangeTreeData.fire();
    });
    vscode.commands.registerCommand("pontChanges.stageAll", (meta) => {
      this.stagedLocalSpecs = PontSpecDiffs.updateSpecsByProcessType(
        this.stagedLocalSpecs,
        this.pontManager,
        {
          metaType: getMetaTypeByContextValue(meta.contextValue),
          apiName: meta.apiName,
          modName: meta.modName,
          specName: meta.specName,
          structName: meta.structName,
        },
        "staged",
      );
      this.updateDiffs();
      this._onDidChangeTreeData.fire();
    });
    vscode.commands.registerCommand("pontChanges.unStageAll", (meta) => {
      this.stagedLocalSpecs = PontSpecDiffs.updateSpecsByProcessType(
        this.stagedLocalSpecs,
        this.pontManager,
        {
          metaType: getMetaTypeByContextValue(meta.contextValue),
          apiName: meta.apiName,
          modName: meta.modName,
          specName: meta.specName,
          structName: meta.structName,
        },
        "untracked",
      );
      this.updateDiffs();
      this._onDidChangeTreeData.fire();
    });
    vscode.commands.registerCommand("pontChanges.commit", (meta) => {
      const newManager = {
        ...this.pontManager,
        localPontSpecs: this.stagedLocalSpecs,
      };

      this.updatePontManager(newManager);
    });

    vscode.commands.registerCommand("pontAPIs.openMeta", async (meta) => {
      viewMetaFile({
        ...meta,
        specType: meta.contextValue,
        pontManager: this.pontManager,
      });
    });
  }
  private _onDidChangeTreeData = new vscode.EventEmitter<PontChangeTreeItem | PontAPITreeItem | void>();

  onDidChangeTreeData?: vscode.Event<
    void | PontChangeTreeItem | PontAPITreeItem | PontAPITreeItem[] | PontChangeTreeItem[]
  > = this._onDidChangeTreeData.event;

  refresh(pontManager: PontManager) {
    this.pontManager = pontManager;
    this.stagedLocalSpecs = pontManager.localPontSpecs;
    this.updateDiffs();
    this._onDidChangeTreeData.fire();
  }

  getTreeItem<T>(element: T): T | Thenable<T> {
    return element;
  }

  static getAPIChangesModItems(spec: PontSpecWithMods, contextValue: string): PontChangeTreeItem[] {
    const mods = (spec?.mods || []).map((mod: DiffResult<Mod>) => {
      return {
        label: `${mod.name}(${mod.interfaces.length})`,
        specName: spec.name,
        modName: mod.name,
        resourceUri: vscode.Uri.parse(`pont-changes://${contextValue}Mod/${mod.diffType}`),
        contextValue: contextValue + "Mod",
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
        schema: mod,
      };
    });
    if (spec?.definitions && Object.keys(spec.definitions).length) {
      const defs = {
        label: `数据结构(${Object.keys(spec.definitions).length})`,
        specName: spec.name,
        contextValue: contextValue + "Definitions",
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
        schema: spec.definitions,
      };
      return [defs, ...mods];
    }
    return mods;
  }

  static getApiItems(extensionUri, mod: DiffResult<Mod>, specName: string, contextValue: string): PontChangeTreeItem[] {
    return (mod?.interfaces || []).map((api: DiffResult<PontAPI>) => {
      return {
        label: api.name,
        specName,
        modName: mod.name,
        apiName: api.name,
        description: api.title || api.description,
        tooltip: api.description || api.title,
        contextValue: contextValue + "API",
        collapsibleState: vscode.TreeItemCollapsibleState.None,
        schema: api,
        resourceUri: vscode.Uri.parse(`pont-changes://${contextValue}API/${api.diffType}`),
        iconPath: vscode.Uri.joinPath(extensionUri, "resources/api-outline.svg"),
        command: {
          command: "pont.openPontUI",
          title: "open",
          arguments: [
            {
              specName,
              modName: mod.name,
              name: api.name,
              pageType: "changes",
              schemaType: "api",
            },
          ],
        },
      } as PontChangeTreeItem;
    });
  }

  static getStructItems(
    extensionUri,
    definitions: DiffResult<ObjectMap<PontJsonSchema>>,
    specName: string,
    contextValue: string,
  ): PontChangeTreeItem[] {
    return Object.keys(definitions || {}).map((name) => {
      const schema = definitions[name];
      return {
        label: name,
        specName,
        structName: name,
        description: schema.title || schema.description,
        tooltip: schema.description || schema.title,
        contextValue: contextValue + "Struct",
        iconPath: vscode.Uri.joinPath(extensionUri, "resources/struct-outline.svg"),
        resourceUri: vscode.Uri.parse(`pont-changes://${contextValue}API/${schema.diffType}`),
        collapsibleState: vscode.TreeItemCollapsibleState.None,
        schema,
        command: {
          command: "pont.openPontUI",
          title: "open",
          arguments: [
            {
              specName,
              name,
              pageType: "changes",
              schemaType: "struct",
            },
          ],
        },
      };
    });
  }

  static getSpecCnt(spec: any): number {
    if (!spec) {
      return 0;
    }
    return spec.mods?.length + Object.keys(spec.definitions || {}).length;
  }

  getAPIChangesChildren(element?: PontChangeTreeItem): vscode.ProviderResult<PontChangeTreeItem[]> {
    const hasSingleSpec = PontManager.checkIsSingleSpec(this.pontManager);

    if (element.contextValue === "pontChangesManager") {
      const stagedItemCnt = hasSingleSpec ? PontExplorer?.getSpecCnt(this.stagedDiffs[0]) : this.stagedDiffs.length;
      const changesItemCnt = hasSingleSpec ? PontExplorer?.getSpecCnt(this.specsDiffs[0]) : this.specsDiffs.length;

      return [
        {
          label: `Staged Changes(${stagedItemCnt})`,
          description: "已暂存的变更",
          tooltip: "按需更新远程的变更",
          contextValue: "StagedChanges",
          resourceUri: vscode.Uri.parse(`pont-changes://StagedChanges`),
          collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
        },
        {
          label: `Changes(${changesItemCnt})`,
          description: "远程API更新",
          tooltip: "按需更新远程的变更",
          contextValue: "Changes",
          resourceUri: vscode.Uri.parse(`pont-changes://Changes`),
          collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
        },
      ];
    }

    if (element.contextValue === "StagedChanges" || element.contextValue === "Changes") {
      const specs = element.contextValue === "StagedChanges" ? this.stagedDiffs : this.specsDiffs;
      if (hasSingleSpec) {
        return PontExplorer.getAPIChangesModItems(specs[0], element.contextValue);
      }

      return specs
        .map((diffs) => {
          const itemCnt = PontExplorer.getSpecCnt(diffs);

          return {
            label: `${diffs.name}(${itemCnt})`,
            specName: diffs.name,
            itemCnt,
            contextValue: element.contextValue === "StagedChanges" ? "StagedChangesSpec" : "ChangesSpec",
            collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
            resourceUri: vscode.Uri.parse(`pont-changes://${element.contextValue}/${diffs.diffType}`),
            schema: diffs,
          };
        })
        .filter((child) => child.itemCnt > 0);
    }
    if (["StagedChangesSpec", "ChangesSpec"].includes(element.contextValue)) {
      const firstContext = element.contextValue?.startsWith("StagedChanges") ? "StagedChanges" : "Changes";
      return PontExplorer.getAPIChangesModItems(element.schema, firstContext);
    } else if (["StagedChangesMod", "ChangesMod"].includes(element.contextValue)) {
      const firstContext = element.contextValue?.startsWith("StagedChanges") ? "StagedChanges" : "Changes";
      return PontExplorer.getApiItems(this.context.extensionUri, element.schema, element.specName, firstContext);
    } else if (["StagedChangesDefinitions", "ChangesDefinitions"].includes(element.contextValue)) {
      const firstContext = element.contextValue?.startsWith("StagedChanges") ? "StagedChanges" : "Changes";
      return PontExplorer.getStructItems(this.context.extensionUri, element.schema, element.specName, firstContext);
    }
    return [];
  }

  getChildren(
    element?: PontChangeTreeItem | PontAPITreeItem,
  ): vscode.ProviderResult<(PontChangeTreeItem | PontAPITreeItem)[]> {
    if (!element) {
      const hasSingleSpec = this.allDiffs?.length <= 1 && !this.allDiffs[0]?.name;
      const diffCnt = hasSingleSpec ? PontExplorer?.getSpecCnt(this.allDiffs?.[0]) : this.allDiffs?.length;

      return [
        {
          label: `API 变更管理(${diffCnt})`,
          contextValue: "pontChangesManager",
          resourceUri: vscode.Uri.parse(`pont-changes://manager`),
          collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
        },
        {
          label: "API 管理",
          contextValue: "pontAPIsManager",
          resourceUri: vscode.Uri.parse(`pont-manager://manager`),
          collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
        },
      ];
    }

    if (element.contextValue.includes("Change")) {
      return this.getAPIChangesChildren(element);
    }
    return this.getAPIManagerChildren(element);
  }
}
