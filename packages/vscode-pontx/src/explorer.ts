import { getSpecByName, PontManager } from "pontx-manager";
import { DiffItem, PontSpec } from "pontx-spec";
import * as vscode from "vscode";
import { getMetaTypeByContextValue, MetaType, PontSpecDiffs } from "./changes/utils";
import { viewMetaFile } from "./utils";
import { PontxManagerTreeItemType, PontxManageTreeItem } from "./changes/TreeItem";
import { SpecDiffTree } from "pontx-spec";
import { PontxChangesTreeItem, PontxChangesTreeItemType } from "./changes/ChangexTreeItem";

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
    if (uri.scheme === "pontx-changes") {
      const textMap = {
        deleted: "D",
        updated: "M",
        created: "C",
        equal: "E",
        untracked: "U",
      };
      const labelMap = {
        deleted: "传入的新元数据中已删除",
        updated: "传入的新元数据中已更新",
        created: "传入的新元数据中已新增",
        equal: "与传入的新元数据等同，但子元数据存在不同",
        untracked: "Untracked",
      };
      const colorMap = {
        updated: new vscode.ThemeColor("pontx.decorations.modifiedForegroundColor"),
        deleted: new vscode.ThemeColor("pontx.decorations.deletedForegroundColor"),
        created: new vscode.ThemeColor("pontx.decorations.addedForegroundColor"),
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
    this.disposable = vscode.Disposable.from(vscode.window.registerFileDecorationProvider(this));
  }
}

export class PontExplorer implements vscode.TreeDataProvider<any> {
  /** changes: diff(staged, remote) */
  changedSpecDiffTrees = [] as SpecDiffTree[];
  stagedLocalSpecs = [] as PontSpec[];

  /** staged changes: diffs(local, staged) */
  stagedSpecDiffTrees = [] as SpecDiffTree[];

  resolveTreeItem?(
    item: vscode.TreeItem,
    element: vscode.TreeItem,
    token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.TreeItem> {
    // throw new Error("Method not implemented.");
    return null;
  }

  updateDiffs() {
    // vscode-pontx 是数据消费端。一般来说远程的代码新，本地的代码旧。
    // 因此 Diff 工具仅用做拉取远程代码，而不是提交本地代码。

    // Changes = 远程更新，但还未暂存的代码 = 远程最新代码 - 暂存区的代码
    const changedDiffs = PontSpec.diffSpecs(this.stagedLocalSpecs, this.pontManager.remotePontSpecs) || [];
    this.changedSpecDiffTrees = changedDiffs
      .map((diff) => {
        if (diff.diffType === "updated") {
          return DiffItem.getSpecDiffTree(diff.diffItems, diff.name);
        }

        const tree = new SpecDiffTree();
        tree.diffType = diff.diffType;
        tree.name = diff.name;

        return tree;
      })
      .filter((id) => id);

    // 暂存区 Changes = 暂存区的代码 - 本地老代码
    const stagedDiffs = PontSpec.diffSpecs(this.pontManager.localPontSpecs, this.stagedLocalSpecs) || [];
    this.stagedSpecDiffTrees = stagedDiffs.map((diff) => {
      if (diff.diffType === "updated") {
        return DiffItem.getSpecDiffTree(diff.diffItems, diff.name);
      }

      const tree = new SpecDiffTree();
      tree.diffType = diff.diffType;
      tree.name = diff.name;

      return tree;
    });
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
      if (!meta) {
        return;
      }
      this.stagedLocalSpecs = PontSpecDiffs.updateSpecsByProcessType(
        this.stagedLocalSpecs,
        this.pontManager,
        {
          metaType: getMetaTypeByContextValue(meta?.contextValue),
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
  private _onDidChangeTreeData = new vscode.EventEmitter<PontxChangesTreeItemType | PontxManagerTreeItemType | void>();

  onDidChangeTreeData?: vscode.Event<
    void | PontxManagerTreeItemType | PontxChangesTreeItemType | PontxManagerTreeItemType[] | PontxChangesTreeItemType[]
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

  getChildren(
    element?: PontxChangesTreeItemType | PontxManagerTreeItemType,
  ): vscode.ProviderResult<(PontxChangesTreeItemType | PontxManagerTreeItemType)[]> {
    if (!element) {
      const diffCnt = this.changedSpecDiffTrees?.length + this.stagedSpecDiffTrees?.length;

      return [
        PontxChangesTreeItem.createRootItem(this.context.extensionUri, diffCnt),
        PontxManageTreeItem.createRootItem(this.context.extensionUri),
      ];
    }

    if (element.contextValue.includes("Change")) {
      return PontxChangesTreeItem.getAPIChangesChildren(
        element as any,
        this.pontManager,
        this.stagedSpecDiffTrees,
        this.changedSpecDiffTrees,
        this.context.extensionUri,
      );
    }
    return PontxManageTreeItem.getAPIManagerChildren(element as any, this.pontManager, this.context.extensionUri);
  }
}
