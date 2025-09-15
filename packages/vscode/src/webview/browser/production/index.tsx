/**
 * @author: jasonHzq
 * @description: WebView 生产环境入口文件，不包含调试代码
 */

import React from "react";
import { createRoot } from "react-dom/client";
import { ProductionWebViewApp } from "./ProductionWebViewApp";
import "@pontx/shadcn-ui/styles.css";

/**
 * WebView 应用初始化
 */
function initializeWebView() {
  const container = globalThis.document?.getElementById("root");
  if (!container) {
    console.error("Root container not found");
    return;
  }

  const root = createRoot(container);
  root.render(<ProductionWebViewApp />);
}

// 页面加载完成后初始化
if (globalThis.document?.readyState === "loading") {
  globalThis.document?.addEventListener("DOMContentLoaded", initializeWebView);
} else {
  initializeWebView();
}
