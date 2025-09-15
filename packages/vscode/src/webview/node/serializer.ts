/**
 * @author: jasonHzq
 * @description: WebView 状态序列化管理器，负责保存和恢复 WebView 面板状态
 */

import * as vscode from "vscode";
import { WebViewState } from "./webview-manager";

/**
 * WebView 序列化管理器
 */
export class WebViewSerializer {
  private static readonly STORAGE_KEY = "pontx.webview.states";

  /**
   * 保存 WebView 状态到全局状态
   */
  public static async saveWebViewStates(
    context: vscode.ExtensionContext,
    states: WebViewState[]
  ): Promise<void> {
    try {
      await context.globalState.update(this.STORAGE_KEY, states);
    } catch (error) {
      console.error("Failed to save webview states:", error);
    }
  }

  /**
   * 从全局状态加载 WebView 状态
   */
  public static async loadWebViewStates(
    context: vscode.ExtensionContext
  ): Promise<WebViewState[]> {
    try {
      const states = context.globalState.get<WebViewState[]>(
        this.STORAGE_KEY,
        []
      );
      return states;
    } catch (error) {
      console.error("Failed to load webview states:", error);
      return [];
    }
  }

  /**
   * 清除所有保存的 WebView 状态
   */
  public static async clearWebViewStates(
    context: vscode.ExtensionContext
  ): Promise<void> {
    try {
      await context.globalState.update(this.STORAGE_KEY, undefined);
    } catch (error) {
      console.error("Failed to clear webview states:", error);
    }
  }

  /**
   * 生成 WebView 状态的唯一标识符
   */
  public static generateStateId(state: WebViewState): string {
    return `${state.specName}-${state.nodeName}-${JSON.stringify(
      state.jsonPath
    )}`;
  }

  /**
   * 验证 WebView 状态是否有效
   */
  public static validateWebViewState(state: WebViewState): boolean {
    return !!(
      state.id &&
      state.title &&
      state.contentType &&
      state.data &&
      state.specName &&
      state.nodeName &&
      Array.isArray(state.jsonPath)
    );
  }

  /**
   * 过滤有效的 WebView 状态
   */
  public static filterValidStates(states: WebViewState[]): WebViewState[] {
    return states.filter((state) => this.validateWebViewState(state));
  }
}
