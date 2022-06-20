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
    if (!pontUI.pontBar) {
      pontUI.create();
    }

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
      path.join(config.configDir, config.outDir) + "/**/" + PontManager.lockFilename,
      true,
      false,
      true,
    );
    this.watcherDispose = lockWatcher.onDidChange(async () => {
      pontService.pontManager.logger.log("检测到 api-lock.json 文件变化，本地数据源已自动更新");
      const pontManager = await PontManager.readLocalPontMeta(pontService.pontManager);
      pontService.updatePontManger(pontManager);
    });
  }

  update(manager: PontManager, context) {
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
      path.join(config.configDir, config.outDir) + "/**/" + PontManager.lockFilename,
      true,
      false,
      true,
    );
    this.watcherDispose = lockWatcher.onDidChange(async () => {
      pontService.pontManager.logger.log("检测到 api-lock.json 文件变化，本地数据源已自动更新");
      const pontManager = await PontManager.readLocalPontMeta(pontService.pontManager);
      pontService.updatePontManger(pontManager);
    });
  }
}

const vscodePontManager = new VSCodePontManager();

export async function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "pont" is now active!');
  if (!vscode.workspace.rootPath) {
    return;
  }

  const pontManager = await PontManager.constructorFromRootDir(vscode.workspace.rootPath, new VSCodeLogger());
  if (pontManager) {
    vscodePontManager.start(pontManager, context);
  }

  const fileWatcher = vscode.workspace.createFileSystemWatcher("**/pont-config.json");

  fileWatcher.onDidCreate(async (uri) => {
    if (pontService.pontManager) {
      pontService.pontManager.logger.log("检测到 Pont 配置文件已创建，Pont 自动启动中...");
      const manager = await PontManager.constructorFromRootDir(
        path.join(uri.path, ".."),
        pontService.pontManager.logger,
      );

      if (manager) {
        vscodePontManager.update(manager, context);
        manager.logger.log("");
        vscode.window.showInformationMessage("pont 启动成功");
      }
    } else {
      const logger = new VSCodeLogger();
      logger.info("检测到 Pont 配置文件已创建，Pont 自动启动中...");
      const manager = await PontManager.constructorFromRootDir(path.join(uri.path, ".."), logger);
      if (manager) {
        vscodePontManager.start(pontManager, context);
        logger.info("");
        vscode.window.showInformationMessage("pont 启动成功");
      }
    }
  });
  fileWatcher.onDidChange(async (uri) => {
    if (pontService.pontManager) {
      pontService.pontManager.logger.log("检测到配置文件变化，Pont 自动重启中...");
      const manager = await PontManager.constructorFromRootDir(
        path.join(uri.path, ".."),
        pontService.pontManager.logger,
      );

      if (manager) {
        vscodePontManager.update(manager, context);
        manager.logger.log("");
        vscode.window.showInformationMessage("pont 重启成功");
      }
    } else {
      const logger = new VSCodeLogger();
      logger.info("检测到 Pont 配置文件变化，Pont 尝试启动中...");
      const manager = await PontManager.constructorFromRootDir(path.join(uri.path, ".."), logger);
      if (manager) {
        pontUI.create();
        vscodePontManager.start(pontManager, context);
        logger.info("");
        vscode.window.showInformationMessage("pont 启动成功");
      }
    }
  });

  if (vscode.window.registerWebviewPanelSerializer) {
    // Make sure we register a serializer in activation event
    vscode.window.registerWebviewPanelSerializer(PontWebView.viewType, {
      async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {},
    });
  }
}

export async function deactivate() {}
