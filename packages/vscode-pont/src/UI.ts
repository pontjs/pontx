import * as vscode from "vscode";

export class PontVSCodeUI {
  pontBar: vscode.StatusBarItem;
  generateBar: vscode.StatusBarItem;

  create() {
    this.pontBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    this.pontBar.command = "pont.openPontUI";
    this.pontBar.color = "yellow";
    this.pontBar.text = "Pont";
    this.pontBar.show();

    this.generateBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    this.generateBar.command = "pont.regenerate";
    this.generateBar.color = "yellow";
    this.generateBar.text = "generate";
    this.generateBar.show();

    this.generateBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    this.generateBar.command = "pont.restart";
    this.generateBar.color = "yellow";
    this.generateBar.text = "restart";
    this.generateBar.show();
  }
}
