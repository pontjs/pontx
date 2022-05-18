import * as vscode from "vscode";
const { getHTMLForVSCode, getRootUri } = require("vscode-pont-ui");
import * as path from "path";

// const path = require("path");
// const fs = require("fs");

// const getHTMLForVSCode = (urlJoin, cspSource) => {
//   const scriptUri = urlJoin("dist/assets/index.js");
//   const styleResetUri = urlJoin("dist/assets/index.css");
//   const html = fs.readFileSync(
//     path.join(__dirname, "../dist/index.html"),
//     "utf8"
//   );

//   const htmlResult = html
//     .replace("/assets/index.js", scriptUri)
//     .replace("/assets/index.css", styleResetUri)
//     .replace(/\{cspSource\}/g, cspSource);

//   return htmlResult;
// };

// const getRootUri = () => {
//   return vscode.Uri.file(path.join(__dirname, "../dist"));
// };

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
        // And restrict the webview to only loading content from our extension's `media` directory.
        localResourceRoots: [vscode.Uri.file(path.join(__dirname, "../node_modules/vscode-pont-ui/dist"))],
      },
    );
    PontWebView.webviewPanel.onDidDispose(() => {
      PontWebView.webviewPanel.dispose();
      PontWebView.webviewPanel = null;
    });
    PontWebView.webviewPanel.webview.html = getHTMLForVSCode(
      (path) =>
        PontWebView.webviewPanel.webview.asWebviewUri(
          vscode.Uri.joinPath(extensionUri, "node_modules/vscode-pont-ui", path),
        ),
      PontWebView.webviewPanel.webview.cspSource,
    );
  }
}
