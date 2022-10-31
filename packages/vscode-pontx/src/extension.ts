"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { PontManager } from "pontx-manager";
import { pontService } from "./Service";
import { findPontxConfig, pontConsole, registerConfigSchema, VSCodeLogger } from "./utils";
import { PontCommands } from "./commands";
import { pontUI } from "./UI";
import { PontSerializer, PontWebView } from "./webview";
import { PontAPIExplorer, PontFileDecoration } from "./explorer";

export async function activate(context: vscode.ExtensionContext) {
  if (!vscode.workspace.rootPath) {
    return;
  }
  registerConfigSchema(context);
  const [configDir, pontxConfig] = await findPontxConfig();

  if (!pontxConfig) {
    return;
  }

  vscode.commands.executeCommand("setContext", "pontx.hasPontxConfig", true);
  pontService.context = context;

  try {
    const pontManager = await PontManager.constructorFromPontConfig(pontxConfig, configDir, new VSCodeLogger());

    if (pontManager) {
      console.log('Congratulations, your extension "pontx" is now active!');
      pontService.startup(pontManager, context);
      context.subscriptions.push(
        vscode.window.registerWebviewPanelSerializer(PontWebView.viewType, new PontSerializer()),
      );
      context.subscriptions.push(new PontFileDecoration());
    }
  } catch (e) {
    vscode.window.showErrorMessage(e.message);
    pontConsole.appendLine(e.message);
    pontConsole.appendLine(e.stack);
  }
}

export async function deactivate() {}
