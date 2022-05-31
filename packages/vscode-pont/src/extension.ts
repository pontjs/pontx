"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { PontManager } from "pont-manager";
import * as path from "path";
import { pontService } from "./Service";
import { VSCodeLogger } from "./utils";
import { PontCommands } from "./commands";
import { pontUI } from "./UI";
import { PontWebView } from "./webview";

class VSCodePontManager {
  watcherDispose: vscode.Disposable;
  hasCommandsRegistered = false;

  start(manager: PontManager, context) {
    if (this.watcherDispose?.dispose) {
      this.watcherDispose.dispose();
    }

    pontService.updatePontManger(manager);

    if (!this.hasCommandsRegistered) {
      PontCommands.registerCommands(context);
      this.hasCommandsRegistered = true;
    }

    const config = manager.innerManagerConfig;
    const lockWatcher = vscode.workspace.createFileSystemWatcher(
      path.join(config.outDir, PontManager.lockFilename),
      true,
      false,
      true,
    );
    this.watcherDispose = lockWatcher.onDidChange(async () => {
      const pontManager = await PontManager.readLocalPontMeta(pontService.pontManager);
      pontService.updatePontManger(pontManager);
    });
  }
}

const vscodePontManager = new VSCodePontManager();

export async function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "pont" is now active!');
  const pontManager = await PontManager.constructorFromRootDir(vscode.workspace.rootPath, new VSCodeLogger());
  if (pontManager) {
    pontUI.create();
    vscodePontManager.start(pontManager, context);
  }

  const fileWatcher = vscode.workspace.createFileSystemWatcher("**/pont-config.json");

  fileWatcher.onDidCreate(async (uri) => {
    const manager = await PontManager.constructorFromRootDir(uri.toString());
    pontService.updatePontManger(manager);
  });
  fileWatcher.onDidChange(async (uri) => {
    const manager = await PontManager.constructorFromRootDir(uri.toString());
    pontService.updatePontManger(manager);
  });

  if (vscode.window.registerWebviewPanelSerializer) {
    // Make sure we register a serializer in activation event
    vscode.window.registerWebviewPanelSerializer(PontWebView.viewType, {
      async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {},
    });
  }
}

export async function deactivate() {}
