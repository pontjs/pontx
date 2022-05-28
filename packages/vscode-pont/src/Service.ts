import { PontManager } from "pont-manager";
import * as vscode from "vscode";
import * as path from "path";
import { PontCommands } from "./commands";
import { PontVSCodeUI } from "./UI";
import { PontSpec } from "pont-spec";

export class PontService {
  pontManager: PontManager;

  watcherDispose: vscode.Disposable;

  updatePontManger(pontManager: PontManager) {
    this.pontManager = pontManager;
  }

  /** 执行 webview 事件 */
  async exectService(message) {
    const result = await Promise.resolve(this[message.type](message.value));

    return { requestId: message.requestId, type: message.type, data: result };
  }

  async requestPontSpecs(): Promise<PontSpec[]> {
    return this.pontManager.localPontSpecs;
  }

  async syncRemoteSpec(specNames = "") {
    const manager = await PontManager.fetchRemotePontMeta(this.pontManager);
    this.updatePontManger(manager);
  }

  async requestGenerateSdk() {
    await PontManager.generateCode(this.pontManager);
  }

  updateAPI = ({ modName, apiName, specName }) => {
    this.updatePontManger(PontManager.syncInterface(this.pontManager, apiName, modName, specName));
  };

  updateBaseClass = ({ baseClassName, specName = "" }) => {
    this.updatePontManger(PontManager.syncBaseClass(this.pontManager, baseClassName, specName));
  };
}

export const pontService = new PontService();
