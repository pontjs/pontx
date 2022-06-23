import { PontManager } from "pont-manager";
import { diffPontSpec } from "pont-spec-diff";
import * as vscode from "vscode";
import * as _ from "lodash";

export class PontVSCodeUI {
  pontBar: vscode.StatusBarItem;
  generateBar: vscode.StatusBarItem;
  restartBar: vscode.StatusBarItem;

  create() {
    this.pontBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    this.pontBar.command = "pont.openPontUI";
    this.pontBar.color = "white";
    this.pontBar.text = "Pont";
    this.pontBar.show();

    this.generateBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    this.generateBar.command = "pont.regenerate";
    this.generateBar.color = "yellow";
    this.generateBar.text = "generate";
    this.generateBar.show();

    this.restartBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    this.restartBar.command = "pont.restart";
    this.restartBar.color = "yellow";
    this.restartBar.text = "restart";
    this.restartBar.show();
  }

  update(pontManager: PontManager) {
    const localSpec = PontManager.getCurrentSpec(pontManager);
    const remoteSpec =
      pontManager.remotePontSpecs?.find((spec) => spec.name === localSpec?.name) || pontManager.remotePontSpecs?.[0];

    if (remoteSpec && localSpec) {
      const diffs = diffPontSpec(localSpec, remoteSpec);
      const diffsCnt = diffs?.mods?.length + (_.isEmpty(diffs?.definitions) ? 0 : 1);
      if (this.pontBar) {
        if (diffsCnt) {
          this.pontBar.color = "yellow";
          this.pontBar.text = "Pont(" + diffsCnt + ")";
          this.generateBar?.show();
          this.restartBar?.show();
        } else {
          this.pontBar.color = "white";
          this.pontBar.text = "Pont(" + 0 + ")";
          this.generateBar?.show();
          this.restartBar?.show();
        }
      }
    }
  }
}

export const pontUI = new PontVSCodeUI();
