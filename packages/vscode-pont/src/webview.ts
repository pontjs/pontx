import * as vscode from "vscode";
import { htmlTemplate } from "./utils";
import * as path from "path";
import { pontService } from "./Service";

export class PontWebView {
  static viewType = "pont-ui";
  static webviewPanel = null as vscode.WebviewPanel;

  openTab(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

    // If we already have a panel, show it.
    if (PontWebView.webviewPanel) {
      PontWebView.webviewPanel.reveal(column);
      return;
    }

    // Otherwise, create a new panel.
    PontWebView.webviewPanel = vscode.window.createWebviewPanel(
      PontWebView.viewType,
      "Pont UI",
      column || vscode.ViewColumn.One,
      {
        // Enable javascript in the webview
        enableScripts: true,
      },
    );
    PontWebView.webviewPanel.onDidDispose(() => {
      PontWebView.webviewPanel.dispose();
      PontWebView.webviewPanel = null;
    });
    PontWebView.webviewPanel.webview.html = htmlTemplate({
      getUri: (assetUri) => PontWebView.webviewPanel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, assetUri)),
      cspSource: PontWebView.webviewPanel.webview.cspSource,
    });
    PontWebView.webviewPanel.webview.onDidReceiveMessage((message) => {
      if (message.type && message.requestId) {
        pontService.exectService(message).then((result) => {
          PontWebView.webviewPanel.webview.postMessage(result);
        });
      }
    });
  }
}
