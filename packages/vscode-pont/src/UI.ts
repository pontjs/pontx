import * as vscode from "vscode";

export class PontVSCodeUI {
  pontBar: vscode.StatusBarItem;
  generateBar: vscode.StatusBarItem;

  create() {
    this.pontBar = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left
    );
    this.pontBar.command = "pont.openPontUI";

    this.generateBar = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left
    );
    this.generateBar.command = "pont.regenerate";
  }
}
