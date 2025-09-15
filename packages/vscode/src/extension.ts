// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { PontxTreeDataProvider } from "./explorer/explorer";
import { PontxService } from "pontx";
import { fetchRemote, findMeta, regenerate, revealMetaFile } from "./commands";
import { WebViewManager } from "./webview/node/webview-manager";
import * as path from "path";

// 移除 webpack 特定的声明，ncc 不需要

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "pontx" is now active!');

  // 使用新的 workspaceFolders API 替代已弃用的 rootPath
  const workspaceFolders = vscode.workspace.workspaceFolders;

  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showWarningMessage(
      "请在包含 pontx.config.ts 的工作区中使用 Pontx 扩展"
    );
    return;
  }

  // 如果有多个工作区文件夹，尝试找到包含 pontx.config.ts 的文件夹
  let rootPath: string;

  if (workspaceFolders.length === 1) {
    rootPath = workspaceFolders[0].uri.fsPath;
  } else {
    // 多工作区情况下，查找包含 pontx.config.ts 的文件夹
    const configFolder = workspaceFolders.find((folder) => {
      try {
        const fs = require("fs");
        const path = require("path");
        const configPath = path.join(folder.uri.fsPath, "pontx.config.ts");
        return fs.existsSync(configPath);
      } catch {
        return false;
      }
    });

    if (configFolder) {
      rootPath = configFolder.uri.fsPath;
    } else {
      rootPath = workspaceFolders[0].uri.fsPath;
    }
  }

  const pontxService = new PontxService(rootPath, {
    logLevel: "info",
  });

  try {
    await pontxService.start();
  } catch (error) {
    console.error("Pontx service 启动失败:", error);
    vscode.window.showErrorMessage(
      `Pontx 扩展启动失败: ${error.message}\n\n请确保工作区包含有效的 pontx.config.ts 文件`
    );

    // 提供更详细的调试信息
    console.error("详细错误信息:", {
      message: error.message,
      stack: error.stack,
      rootPath,
      extensionPath: context.extensionPath,
    });
    return;
  }

  const treeDataProvider = new PontxTreeDataProvider(
    context.extensionUri,
    pontxService.getManager()
  );
  vscode.window.createTreeView("pontxApiExplorer", { treeDataProvider });

  // 初始化 WebView 管理器
  const webViewManager = WebViewManager.getInstance(
    context.extensionUri,
    context
  );

  // 恢复保存的 WebView 状态
  await webViewManager.restoreSavedStates();

  // 注册刷新命令
  context.subscriptions.push(
    vscode.commands.registerCommand("pontx.refreshTree", () =>
      treeDataProvider.refresh()
    )
  );

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  const disposable = vscode.commands.registerCommand(
    "pontx.revealMeta",
    (meta) => {
      revealMetaFile(pontxService.getManager(), meta);
    }
  );

  const findMetaDisposable = vscode.commands.registerCommand(
    "pontx.findMeta",
    () => {
      findMeta(pontxService, context.extensionUri);
    }
  );

  // 注册打开文档命令
  const openDocDisposable = vscode.commands.registerCommand(
    "pontx.openDoc",
    (item) => {
      webViewManager.createOrShowWebView(item);
    }
  );

  const regenerateDisposable = vscode.commands.registerCommand(
    "pontx.regenerate",
    async () => {
      await regenerate(pontxService);
    }
  );

  const fetchRemoteDisposable = vscode.commands.registerCommand(
    "pontx.fetchRemote",
    async () => {
      await fetchRemote(pontxService);
    }
  );

  const openConfigDisposable = vscode.commands.registerCommand(
    "pontx.config",
    async () => {
      const pontxManager = pontxService.getManager();

      if (!pontxManager) {
        return;
      }

      const configPath = pontxManager?.resolvedConfig?.configPath;

      try {
        const textDocument = await vscode.workspace.openTextDocument(
          vscode.Uri.file(configPath)
        );
        await vscode.window.showTextDocument(textDocument);
      } catch (error) {
        vscode.window.showErrorMessage(
          "无法打开配置文件，请检查配置文件路径是否存在！"
        );
      }
    }
  );

  context.subscriptions.push(
    disposable,
    openDocDisposable,
    findMetaDisposable,
    regenerateDisposable,
    fetchRemoteDisposable,
    openConfigDisposable
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
