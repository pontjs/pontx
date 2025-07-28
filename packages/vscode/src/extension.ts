// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { PontxTreeDataProvider } from "./explorer/explorer";
import { PontxService } from "pontx";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "pontx" is now active!');

  const rootPath = vscode.workspace.rootPath;

  const pontxService = new PontxService(rootPath);

  await pontxService.start();

  const treeDataProvider = new PontxTreeDataProvider(
    context.extensionUri,
    pontxService.getManager()
  );
  vscode.window.createTreeView("pontxApiExplorer", { treeDataProvider });

  // 注册刷新命令
  context.subscriptions.push(
    vscode.commands.registerCommand("pontx.refreshTree", () =>
      treeDataProvider.refresh()
    )
  );

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  const disposable = vscode.commands.registerCommand("pontx.helloWorld", () => {
    // The code you place here will be executed every time your command is executed
    // Display a message box to the user
    vscode.window.showInformationMessage("Hello World from vscode!");
  });

  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
