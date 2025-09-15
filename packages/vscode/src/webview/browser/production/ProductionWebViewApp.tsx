/**
 * @author: jasonHzq
 * @description: WebView 生产环境主应用组件，不包含调试功能
 */

import React, { useState, useEffect } from "react";
import { WebViewState } from "../types";
import { LoadingSpinner } from "../components/LoadingSpinner";
import "@pontx/shadcn-ui/styles";
import { ApiDocumentation, SchemaViewer } from "@pontx/shadcn-ui";
import "./production-styles.css";

/**
 * WebView 生产环境主组件
 */
export const ProductionWebViewApp: React.FC = () => {
  const [state, setState] = useState<WebViewState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 监听来自 VSCode 扩展的消息
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      switch (message.type) {
        case "data":
          setState(message.data);
          setLoading(false);
          break;
        case "error":
          setError(message.error);
          setLoading(false);
          break;
        default:
          break;
      }
    };

    // 获取 VSCode API
    const vscode = (globalThis as any).acquireVsCodeApi?.();
    if (vscode) {
      // 监听消息
      globalThis.addEventListener("message", handleMessage);

      // 通知扩展 WebView 已准备就绪
      vscode.postMessage({ type: "ready" });
    } else {
      setError("VSCode API not available");
      setLoading(false);
    }

    return () => {
      globalThis.removeEventListener("message", handleMessage);
    };
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>加载错误</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="error-container">
        <h2>无数据</h2>
        <p>未接收到任何数据</p>
      </div>
    );
  }

  return (
    <div className="webview-app">
      <header className="webview-header">
        <h1>{state.title}</h1>
        <div className="webview-meta">
          <span className="spec-name">Spec: {state.specName}</span>
          <span className="content-type">
            {state.contentType === "api" ? "API" : "Schema"}
          </span>
        </div>
      </header>

      <main className="webview-content">
        {state.contentType === "api" ? (
          ApiDocumentation ? (
            <ApiDocumentation api={state.data as any} />
          ) : (
            <div className="fallback-content">
              <h2>API 文档</h2>
              <pre>{JSON.stringify(state.data, null, 2)}</pre>
            </div>
          )
        ) : SchemaViewer ? (
          <SchemaViewer schema={state.data as any} name={state.nodeName} />
        ) : (
          <div className="fallback-content">
            <h2>Schema 文档</h2>
            <pre>{JSON.stringify(state.data, null, 2)}</pre>
          </div>
        )}
      </main>
    </div>
  );
};
