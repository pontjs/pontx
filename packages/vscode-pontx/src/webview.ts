import * as vscode from "vscode";
import { htmlTemplate } from "./utils";
import * as path from "path";
import { pontService } from "./Service";
import { ObjectMap } from "pontx-spec";
import * as fs from "fs-extra";
export type PanelConfig = {
  specName: string;
  modName: string;
  name: string;
  pageType: "document" | "changes";
  schemaType: "api" | "struct";
};

const getPanelKey = (panelConfig: PanelConfig) => {
  if (panelConfig.schemaType === "api") {
    return `${panelConfig.pageType}/${panelConfig.specName}/${panelConfig.modName}/${panelConfig.name}`;
  } else {
    return `${panelConfig.pageType}/${panelConfig.specName}/${panelConfig.name}`;
  }
};

const getPanelConfig = (panelKey: string) => {
  const [pageType, specName, name1, name2] = (panelKey || "").split("/");
  if (name2) {
    return {
      pageType,
      schemaType: "api",
      specName,
      modName: name1,
      name: name2,
    };
  } else {
    return {
      pageType,
      schemaType: "struct",
      specName,
      name: name2,
    };
  }
};

export class PontWebView {
  static viewType = "pontx-ui";
  static webviewPanels = {} as ObjectMap<vscode.WebviewPanel>;

  openTab(extensionUri: vscode.Uri, panelConfig: PanelConfig) {
    const panelKey = getPanelKey(panelConfig);
    const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

    let webview = PontWebView.webviewPanels[panelKey];
    // If we already have a panel, show it.
    if (webview) {
      webview.reveal(column);
      return;
    }

    // Otherwise, create a new panel.
    PontWebView.webviewPanels[panelKey] = vscode.window.createWebviewPanel(
      PontWebView.viewType,
      panelConfig.name,
      column || vscode.ViewColumn.One,
      {
        // Enable javascript in the webview
        enableScripts: true,
      },
    );
    webview = PontWebView.webviewPanels[panelKey];
    webview.onDidDispose(() => {
      webview.dispose();
      webview = null;
      delete PontWebView.webviewPanels[panelKey];
    });
    webview.title = panelConfig.name;
    const iconPath =
      panelConfig?.schemaType === "api"
        ? vscode.Uri.joinPath(extensionUri, "resources/api-outline.svg")
        : vscode.Uri.joinPath(extensionUri, "resources/struct-outline.svg");
    webview.iconPath = iconPath;
    webview.webview.html = htmlTemplate(
      {
        getUri: (assetUri) => webview.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, assetUri)),
        cspSource: webview.webview.cspSource,
      },
      panelConfig,
    );
    webview.webview.onDidReceiveMessage((message) => {
      if (message.type && message.requestId) {
        pontService.exectService(message).then((result) => {
          webview.webview.postMessage(result);
        });
      }
    });
  }

  openAPIPreviewTab(extensionUri: vscode.Uri, apiMeta, filePath) {
    const panelKey = filePath;
    const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

    let webview = PontWebView.webviewPanels[panelKey];
    // If we already have a panel, show it.
    if (webview) {
      webview.reveal(column);
      return;
    }

    // Otherwise, create a new panel.
    PontWebView.webviewPanels[panelKey] = vscode.window.createWebviewPanel(
      PontWebView.viewType,
      apiMeta.name,
      vscode.ViewColumn.Beside,
      {
        // Enable javascript in the webview
        enableScripts: true,
      },
    );
    const filewatcher = vscode.workspace.createFileSystemWatcher(filePath, true, false, true);
    filewatcher.onDidChange(async (e) => {
      const newFileContent = await fs.readFile(filePath, "utf8");
      try {
        const meta = JSON.parse(newFileContent);
        webview.webview.postMessage({
          type: "updateItemMeta",
          data: meta,
        });
      } catch (e) {}
    });

    webview = PontWebView.webviewPanels[panelKey];
    webview.onDidDispose(() => {
      filewatcher.dispose();
      webview.dispose();
      webview = null;
      delete PontWebView.webviewPanels[panelKey];
    });
    webview.title = apiMeta.name;
    const iconPath = vscode.Uri.joinPath(extensionUri, "resources/api-outline.svg");
    webview.iconPath = iconPath;
    webview.webview.html = htmlTemplate(
      {
        getUri: (assetUri) => webview.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, assetUri)),
        cspSource: webview.webview.cspSource,
      },
      {
        specName: "",
        modName: "",
        name: apiMeta.name,
        spec: apiMeta,
        pageType: "document",
        schemaType: "api",
      },
    );
    webview.webview.onDidReceiveMessage((message) => {
      if (message.type && message.requestId) {
        pontService.exectService(message).then((result) => {
          webview.webview.postMessage(result);
        });
      }
    });
  }
}

export class PontSerializer implements vscode.WebviewPanelSerializer {
  async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
    // `state` is the state persisted using `setState` inside the webview
    console.log(`Got state: ${state}`);

    // Restore the content of our webview.
    //
    // Make sure we hold on to the `webviewPanel` passed in here and
    // also restore any event listeners we need on it.
    // webviewPanel.webview.html = getWebviewContent();

    webviewPanel.webview.html = htmlTemplate(
      {
        getUri: (assetUri) =>
          webviewPanel.webview.asWebviewUri(vscode.Uri.joinPath(pontService.context.extensionUri, assetUri)),
        cspSource: webviewPanel.webview.cspSource,
      },
      state,
    );
    webviewPanel.webview.onDidReceiveMessage((message) => {
      if (message.type && message.requestId) {
        pontService.exectService(message).then((result) => {
          webviewPanel.webview.postMessage(result);
        });
      }
    });
  }
}
