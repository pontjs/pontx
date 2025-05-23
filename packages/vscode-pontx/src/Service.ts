import { getSpecByName, PontManager } from "pontx-manager";
import * as vscode from "vscode";
import * as path from "path";
import { pontUI } from "./UI";
import { PontSpec } from "pontx-spec";
import { PontExplorer } from "./explorer";
import { PontCommands } from "./commands";
import * as _ from "lodash";
import { batchDispose, showProgress, VSCodeLogger } from "./utils";

export class PontService {
  pontManager: PontManager;
  context: vscode.ExtensionContext;

  configFileWatcherDisposes: vscode.Disposable[];
  lockFileWatcherDisposes: vscode.Disposable[];

  hasCommandsRegistered = false;
  hasTreeProviderRegistered = false;

  treeDataProvider: PontExplorer;

  updatePontManger(pontManager: PontManager) {
    this.pontManager = pontManager;
    this.start();
    this.watchPontLock();
  }

  startup(pontManager: PontManager, context: vscode.ExtensionContext) {
    this.pontManager = pontManager;
    this.context = context;
    this.start();
    this.watchPontConfig();
    this.watchPontLock();
  }

  start() {
    if (!pontUI.pontBar) {
      pontUI.create(this.pontManager);
    } else {
      pontUI.update(this.pontManager);
    }

    if (this.treeDataProvider) {
      this.treeDataProvider.refresh(this.pontManager);
    } else {
      this.treeDataProvider = new PontExplorer(this.pontManager, this.context, (newManager: PontManager) => {
        this.updatePontManger(newManager);
        vscode.commands.executeCommand("pontx.regenerate");
      });
    }

    if (!this.hasTreeProviderRegistered) {
      vscode.window.registerTreeDataProvider("pontExplorer", pontService.treeDataProvider);
      this.hasTreeProviderRegistered = true;
    }

    if (!this.hasCommandsRegistered) {
      PontCommands.registerCommands(this.context);
      this.hasCommandsRegistered = true;
    }
  }

  watchPontLock() {
    const config = this.pontManager.innerManagerConfig;

    batchDispose(this.lockFileWatcherDisposes);

    const lockWatcher = vscode.workspace.createFileSystemWatcher(
      config.outDir + "/**/" + PontManager.lockFilename,
      true,
      false,
      true,
    );
    this.lockFileWatcherDisposes = [
      lockWatcher.onDidChange(this._watchPontLock.bind(this)),
      lockWatcher.onDidCreate(this._watchPontLock.bind(this)),
    ];
  }

  private async _watchPontLock(e) {
    await showProgress("本地数据源更新中", this.pontManager, async (report) => {
      // report("检测到 api-lock.json 文件变化，本地数据源已自动更新");
      // const pontManager = await PontManager.readLocalPontMeta(pontService.pontManager);
      // const equal = _.isEqual(pontManager.localPontSpecs, pontService.pontManager.localPontSpecs);
      // console.log(equal);
      // pontService.updatePontManger(pontManager);
      // report("本地数据源更新成功");
    });
  }

  watchPontConfig() {
    const fileWatcher = vscode.workspace.createFileSystemWatcher("**/pontx-config.json");
    batchDispose(this.configFileWatcherDisposes);

    this.configFileWatcherDisposes = [
      fileWatcher.onDidChange(async (uri) => this._watchPontConfig(uri, true)),
      fileWatcher.onDidCreate(async (uri) => this._watchPontConfig(uri, false)),
    ];
  }

  private async _watchPontConfig(uri: vscode.Uri, isChange = false) {
    const logger = this.pontManager ? this.pontManager.logger : new VSCodeLogger();
    const message = isChange
      ? "检测到 pontx-config.json 内容变化，Pont 重启中..."
      : "检测到 pontx-config.json 创建，Pont 重启中...";

    await showProgress("Pont 重启中", this.pontManager, async (report) => {
      report(message);
      const manager = await PontManager.constructorFromRootDir(path.join(uri.path, ".."), logger);

      if (manager) {
        this.updatePontManger(manager);
        report("pont 启动成功");
      }
    });
  }

  /** 执行 webview 事件 */
  async exectService(message) {
    const result = await Promise.resolve(this[message.type](message.value));

    return { requestId: message.requestId, type: message.type, data: result };
  }

  async openMeta(meta: { name: string; spec: any; specName: string; type: "baseClass" | "api" }) {
    vscode.commands.executeCommand("pontAPIs.openMeta", meta);
  }

  async requestDefinitions(specName: string) {
    const specs = this.pontManager.localPontSpecs;
    const spec = getSpecByName(specs, specName);
    if (spec) {
      return spec.definitions || {};
    }
    return {};
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
