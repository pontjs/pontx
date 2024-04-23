import { PontManager } from "pontx-manager";
import * as vscode from "vscode";
import * as _ from "lodash";
import { PontSpec } from "pontx-spec";

export class PontVSCodeUI {
  pontBar: vscode.StatusBarItem;

  create(manager: PontManager) {
    this.pontBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    this.pontBar.command = "pontx.openPontPanel";
    this.pontBar.color = "white";
    this.pontBar.text = "pont";
    this.pontBar.show();

    // if (hasMultiOrigins && currentSpec?.name) {
    //   this.originBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    //   this.originBar.command = "pontx.switchOrigin";
    //   this.originBar.color = "white";
    //   this.originBar.text = currentSpec?.name;
    //   this.originBar.show();
    // }

    // this.generateBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    // this.generateBar.command = "pontx.regenerate";
    // this.generateBar.color = "yellow";
    // this.generateBar.text = "generate";
    // this.generateBar.show();

    // this.restartBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    // this.restartBar.command = "pontx.restart";
    // this.restartBar.color = "yellow";
    // this.restartBar.text = "restart";
    // this.restartBar.show();
  }

  update(pontManager: PontManager) {
    const diffs = PontSpec.diffSpecs(pontManager.localPontSpecs, pontManager.remotePontSpecs);

    pontManager.localPontSpecs, pontManager.remotePontSpecs;
    const diffsCnt = diffs.length;

    if (this.pontBar) {
      this.pontBar.color = diffsCnt ? "yellow" : "white";
      this.pontBar.text = `pont(${diffsCnt})`;
    }
  }
}

export const pontUI = new PontVSCodeUI();
