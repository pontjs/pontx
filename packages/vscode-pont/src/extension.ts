"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { PontManager } from "pont-manager";
import * as path from "path";
import { pontService } from "./Service";
import { VSCodeLogger } from "./utils";

export async function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "pont" is now active!');
  const pontManager = await PontManager.constructorFromRootDir(vscode.workspace.rootPath, new VSCodeLogger());
  if (pontManager) {
    pontService.start(pontManager, context);
  }

  const fileWatcher = vscode.workspace.createFileSystemWatcher("**/pont-config.json");

  fileWatcher.onDidCreate(async (uri) => {
    const manager = await PontManager.constructorFromRootDir(uri.toString());
    pontService.updatePontManger(manager, context);
  });
  fileWatcher.onDidChange(async (uri) => {
    const manager = await PontManager.constructorFromRootDir(uri.toString());
    pontService.updatePontManger(manager, context);
  });
}

export async function deactivate() {}
