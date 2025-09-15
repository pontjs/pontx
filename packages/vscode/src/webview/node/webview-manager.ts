/**
 * @author: jasonHzq
 * @description: WebView 管理器，负责创建、管理和序列化 WebView 面板
 */

import * as vscode from "vscode";
import { PontxTreeItem, PontxTreeItemType } from "../../type";
import { PontxAPI, PontxJsonSchema } from "@pontx/spec";
import { WebViewSerializer } from "./serializer";
import { PontxJsonSchemaMap } from "../../type";

/**
 * WebView 面板的状态数据
 */
export interface WebViewState {
  /** 面板 ID */
  id: string;
  /** 面板标题 */
  title: string;
  /** 内容类型 */
  contentType: "api" | "schema";
  /** 数据内容，包含 components.schemas 以支持 $ref 解析 */
  data: (PontxAPI | PontxJsonSchema) & {
    components?: {
      schemas?: PontxJsonSchemaMap;
    };
  };
  /** 所属 spec 名称 */
  specName: string;
  /** 节点名称 */
  nodeName: string;
  /** JSON 路径 */
  jsonPath: (string | number)[];
}

/**
 * WebView 管理器类
 */
export class WebViewManager {
  private static instance: WebViewManager;
  private panels: Map<string, vscode.WebviewPanel> = new Map();
  private panelStates: Map<string, WebViewState> = new Map();
  private extensionUri: vscode.Uri;
  private context?: vscode.ExtensionContext;

  private constructor(extensionUri: vscode.Uri) {
    this.extensionUri = extensionUri;
  }

  /**
   * 获取单例实例
   */
  public static getInstance(
    extensionUri: vscode.Uri,
    context?: vscode.ExtensionContext
  ): WebViewManager {
    if (!WebViewManager.instance) {
      WebViewManager.instance = new WebViewManager(extensionUri);
    }
    if (context) {
      WebViewManager.instance.context = context;
    }
    return WebViewManager.instance;
  }

  /**
   * 创建或切换到 WebView 面板
   */
  public async createOrShowWebView(item: PontxTreeItem): Promise<void> {
    // 只处理 API 和 Schema 类型的节点
    if (
      item.type !== PontxTreeItemType.API &&
      item.type !== PontxTreeItemType.Schema
    ) {
      return;
    }

    const state = this.createWebViewState(item);
    const panelId = this.generatePanelId(state);

    // 检查面板是否已存在
    const existingPanel = this.panels.get(panelId);
    if (existingPanel) {
      // 如果面板已存在，切换到该面板
      existingPanel.reveal();
      return;
    }

    // 创建新的 WebView 面板
    const panel = vscode.window.createWebviewPanel(
      "pontx-doc-viewer",
      state.title,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this.extensionUri, "dist", "webview"),
        ],
      }
    );

    // 设置面板图标
    panel.iconPath = this.getIconPath(state.contentType);

    // 设置面板内容
    panel.webview.html = this.getWebviewContent(panel.webview, state);

    // 处理面板关闭事件
    panel.onDidDispose(() => {
      this.panels.delete(panelId);
      this.panelStates.delete(panelId);
      // 保存当前状态
      this.saveCurrentStates();
    });

    // 处理消息
    panel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.type) {
          case "ready":
            // WebView 准备就绪，发送数据
            panel.webview.postMessage({
              type: "data",
              data: state,
            });
            break;
          default:
            break;
        }
      },
      undefined,
      []
    );

    // 保存面板引用和状态
    this.panels.set(panelId, panel);
    this.panelStates.set(panelId, state);

    // 保存当前状态
    this.saveCurrentStates();
  }

  /**
   * 创建 WebView 状态数据
   */
  private createWebViewState(item: PontxTreeItem): WebViewState {
    const contentType = item.type === PontxTreeItemType.API ? "api" : "schema";
    const title = `${item.specName} - ${item.name}`;

    return {
      id: this.generatePanelId({
        specName: item.specName!,
        nodeName: item.name,
        jsonPath: item.jsonPath,
      }),
      title,
      contentType,
      data: item.data,
      specName: item.specName!,
      nodeName: item.name,
      jsonPath: item.jsonPath,
    };
  }

  /**
   * 生成面板 ID
   */
  private generatePanelId(state: Partial<WebViewState>): string {
    return `${state.specName}-${state.nodeName}-${JSON.stringify(
      state.jsonPath
    )}`;
  }

  /**
   * 根据内容类型获取图标路径
   */
  private getIconPath(contentType: "api" | "schema"): vscode.Uri {
    const iconName = contentType === "api" ? "api.svg" : "struct-outline.svg";
    return vscode.Uri.joinPath(this.extensionUri, "resources", iconName);
  }

  /**
   * 获取 WebView HTML 内容
   */
  private getWebviewContent(
    webview: vscode.Webview,
    state: WebViewState
  ): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "dist", "webview", "browser.js")
    );

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${state.title}</title>
</head>
<body>
    <div id="root"></div>
    <script src="${scriptUri}"></script>
</body>
</html>`;
  }

  /**
   * 序列化所有面板状态
   */
  public serializeWebViewStates(): WebViewState[] {
    const states: WebViewState[] = [];

    for (const [panelId, panel] of this.panels) {
      // 这里可以从面板中获取状态数据
      // 由于 VSCode 的限制，我们需要在创建面板时保存状态
      // 实际实现中，状态应该在面板创建时保存
    }

    return states;
  }

  /**
   * 反序列化并恢复面板状态
   */
  public async restoreWebViewStates(states: WebViewState[]): Promise<void> {
    for (const state of states) {
      // 创建对应的 TreeItem
      const item: PontxTreeItem = {
        type:
          state.contentType === "api"
            ? PontxTreeItemType.API
            : PontxTreeItemType.Schema,
        name: state.nodeName,
        jsonPath: state.jsonPath,
        specName: state.specName,
        data: state.data,
      };

      // 恢复面板
      await this.createOrShowWebView(item);
    }
  }

  /**
   * 获取所有活跃的面板状态
   */
  public getActivePanelStates(): WebViewState[] {
    const states: WebViewState[] = [];

    for (const [panelId, state] of this.panelStates) {
      const panel = this.panels.get(panelId);
      if (panel) {
        states.push(state);
      }
    }

    return states;
  }

  /**
   * 保存当前所有面板状态
   */
  private async saveCurrentStates(): Promise<void> {
    if (!this.context) {
      return;
    }

    const states = this.getActivePanelStates();
    await WebViewSerializer.saveWebViewStates(this.context, states);
  }

  /**
   * 恢复保存的面板状态
   */
  public async restoreSavedStates(): Promise<void> {
    if (!this.context) {
      return;
    }

    const savedStates = await WebViewSerializer.loadWebViewStates(this.context);
    const validStates = WebViewSerializer.filterValidStates(savedStates);

    for (const state of validStates) {
      // 创建对应的 TreeItem
      const item: PontxTreeItem = {
        type:
          state.contentType === "api"
            ? PontxTreeItemType.API
            : PontxTreeItemType.Schema,
        name: state.nodeName,
        jsonPath: state.jsonPath,
        specName: state.specName,
        data: state.data,
      };

      // 恢复面板
      await this.createOrShowWebView(item);
    }
  }

  /**
   * 清除所有保存的状态
   */
  public async clearSavedStates(): Promise<void> {
    if (!this.context) {
      return;
    }

    await WebViewSerializer.clearWebViewStates(this.context);
  }
}
