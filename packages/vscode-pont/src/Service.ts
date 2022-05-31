import { PontManager } from "pont-manager";
import * as vscode from "vscode";
import * as path from "path";
import { pontUI } from "./UI";
import { PontSpec } from "pont-spec";
import { diffPontSpec } from "pont-spec-diff";

export class PontService {
  pontManager: PontManager;

  watcherDispose: vscode.Disposable;

  updatePontManger(pontManager: PontManager) {
    this.pontManager = pontManager;
    pontUI.update(this.pontManager);
  }

  /** 执行 webview 事件 */
  async exectService(message) {
    const result = await Promise.resolve(this[message.type](message.value));

    return { requestId: message.requestId, type: message.type, data: result };
  }

  async requestPontSpecs(): Promise<{ localSpecs: PontSpec[]; remoteSpecs: PontSpec[]; currentOriginName: string }> {
    return {
      localSpecs: this.pontManager.localPontSpecs,
      remoteSpecs: this.pontManager.remotePontSpecs,
      currentOriginName: this.pontManager.currentOriginName,
    };
  }

  async syncRemoteSpec(specNames = "") {
    const manager = await PontManager.fetchRemotePontMeta(this.pontManager);
    this.updatePontManger(manager);
  }

  async updateLocalSpec(pontSpec: PontSpec) {
    const localPontSpecs = [...this.pontManager.localPontSpecs];
    const specIndex = this.pontManager.localPontSpecs.findIndex((spec) => spec.name == pontSpec.name) || 0;
    localPontSpecs[specIndex] = pontSpec;
    const newPontManager = {
      ...this.pontManager,
      localPontSpecs,
    };
    this.updatePontManger(newPontManager);
    PontManager.generateCode(this.pontManager);
    return;
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
