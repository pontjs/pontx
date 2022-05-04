import { PontManager } from "pont-manager";
import * as vscode from "vscode";
import * as path from "path";
import { PontCommands } from "./commands";
import { PontVSCodeUI } from "./UI";

export class PontService {
  pontManager: PontManager;

  watcherDispose: vscode.Disposable;

  hasCommandsRegistered = false;

  startUI() {}

  start(manager: PontManager, context) {
    if (this.watcherDispose?.dispose) {
      this.watcherDispose.dispose();
    }

    this.pontManager = manager;
    if (!this.hasCommandsRegistered) {
      PontCommands.registerCommands(this.pontManager, this.updatePontManger, context);
      this.hasCommandsRegistered = true;
    }
    new PontVSCodeUI().create();

    const config = this.pontManager.innerManagerConfig;
    const lockWatcher = vscode.workspace.createFileSystemWatcher(
      path.join(config.outDir, PontManager.lockFilename),
      true,
      false,
      true,
    );
    this.watcherDispose = lockWatcher.onDidChange(async () => {
      this.pontManager = await PontManager.readLocalPontMeta(this.pontManager);
    });
  }

  updatePontManger(pontManager: PontManager, context) {
    if (!this.watcherDispose) {
      this.start(pontManager, context);
    } else {
      this.pontManager = pontManager;
    }
  }
}

export const pontService = new PontService();
