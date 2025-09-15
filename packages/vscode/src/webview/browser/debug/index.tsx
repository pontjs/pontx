/**
 * @author: jasonHzq
 * @description: WebView 调试环境入口文件，包含调试功能
 */

import React from "react";
import { createRoot } from "react-dom/client";
import { DebugWebViewApp } from "./DebugWebViewApp";
import "./mock-vscode-api"; // 导入模拟的 VSCode API

/**
 * WebView 调试应用初始化
 */
function initializeWebView() {
  const container = globalThis.document?.getElementById("root");
  if (!container) {
    console.error("Root container not found");
    return;
  }

  const root = createRoot(container);
  root.render(<DebugWebViewApp />);
}

// 页面加载完成后初始化
if (globalThis.document?.readyState === "loading") {
  globalThis.document?.addEventListener("DOMContentLoaded", initializeWebView);
} else {
  initializeWebView();
}
