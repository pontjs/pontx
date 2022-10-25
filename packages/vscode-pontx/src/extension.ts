"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { PontManager } from "pontx-manager";
import { pontService } from "./Service";
import { VSCodeLogger } from "./utils";
import { PontCommands } from "./commands";
import { pontUI } from "./UI";
import { PontSerializer, PontWebView } from "./webview";
import { PontAPIExplorer, PontFileDecoration } from "./explorer";

export async function activate(context: vscode.ExtensionContext) {
  if (!vscode.workspace.rootPath) {
    return;
  }
  vscode.commands.executeCommand("setContext", "pontx.hasPontxConfig", true);

  pontService.context = context;
  const pontManager = await PontManager.constructorFromRootDir(vscode.workspace.rootPath, new VSCodeLogger());

  if (pontManager) {
    console.log('Congratulations, your extension "pontx" is now active!');
    pontService.startup(pontManager, context);
    context.subscriptions.push(
      vscode.window.registerWebviewPanelSerializer(PontWebView.viewType, new PontSerializer()),
    );
    context.subscriptions.push(new PontFileDecoration());
  }
}

export async function deactivate() {}
