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
import { PontSerializer, PontWebView } from "./webview";
import { PontAPIExplorer, PontFileDecoration } from "./explorer";

export async function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "pont" is now active!');
  if (!vscode.workspace.rootPath) {
    return;
  }
  pontService.context = context;
  const pontManager = await PontManager.constructorFromRootDir(vscode.workspace.rootPath, new VSCodeLogger());
  if (pontManager) {
    pontService.startup(pontManager, context);
    context.subscriptions.push(
      vscode.window.registerWebviewPanelSerializer(PontWebView.viewType, new PontSerializer()),
    );
    context.subscriptions.push(new PontFileDecoration());
  }
}

export async function deactivate() {}
