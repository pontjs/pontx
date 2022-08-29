import { PontManager } from "pont-manager";
import { diffPontSpec, diffPontSpecs } from "pont-spec-diff";
import * as vscode from "vscode";
import * as _ from "lodash";

export class PontVSCodeUI {
  pontBar: vscode.StatusBarItem;

  create(manager: PontManager) {
    this.pontBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    this.pontBar.command = "pont.openPontPanel";
    this.pontBar.color = "white";
    this.pontBar.text = "pont";
    this.pontBar.show();

    // if (hasMultiOrigins && currentSpec?.name) {
    //   this.originBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    //   this.originBar.command = "pont.switchOrigin";
    //   this.originBar.color = "white";
    //   this.originBar.text = currentSpec?.name;
    //   this.originBar.show();
    // }

    // this.generateBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    // this.generateBar.command = "pont.regenerate";
    // this.generateBar.color = "yellow";
    // this.generateBar.text = "generate";
    // this.generateBar.show();

    // this.restartBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    // this.restartBar.command = "pont.restart";
    // this.restartBar.color = "yellow";
    // this.restartBar.text = "restart";
    // this.restartBar.show();
  }

  update(pontManager: PontManager) {
    const diffs = diffPontSpecs(pontManager.localPontSpecs, pontManager.remotePontSpecs);
    const diffsCnt = diffs.length;

    if (this.pontBar) {
      this.pontBar.color = diffsCnt ? "yellow" : "white";
      this.pontBar.text = `pont(${diffsCnt})`;
    }
  }
}

export const pontUI = new PontVSCodeUI();
