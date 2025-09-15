/**
 * @author: jasonHzq
 * @description: WebView 调试环境主应用组件，包含调试功能
 */

import React, { useState, useEffect } from "react";
import { WebViewState } from "../types";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { DebugPanel } from "./DebugPanel";
import "../styles.css";
import "@pontx/shadcn-ui/styles";
import { ApiDocumentation, SchemaViewer } from "@pontx/shadcn-ui";

/**
 * WebView 调试环境主组件
 */
export const DebugWebViewApp: React.FC = () => {
  const [state, setState] = useState<WebViewState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDebugMode, setIsDebugMode] = useState(false);

  useEffect(() => {
    // 检测是否为调试模式
    const isDebug =
      !(globalThis as any).acquireVsCodeApi ||
      (globalThis as any).acquireVsCodeApi
        .toString()
        .includes("Mock VSCode API");
    setIsDebugMode(isDebug);

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

  // 调试功能处理函数
  const handleClearData = () => {
    setState(null);
    setError(null);
  };

  const handleToggleTheme = () => {
    document.body.classList.toggle("dark-theme");
  };

  const handleLoadApiData = () => {
    const vscode = (globalThis as any).acquireVsCodeApi?.();
    if (vscode) {
      vscode.postMessage({ type: "ready" });
    }
  };

  const handleLoadSchemaData = () => {
    const vscode = (globalThis as any).acquireVsCodeApi?.();
    if (vscode) {
      vscode.postMessage({ type: "loadSchema" });
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>加载错误</h2>
        <p>{error}</p>
        {isDebugMode && (
          <DebugPanel
            onClearData={handleClearData}
            onToggleTheme={handleToggleTheme}
            onLoadApiData={handleLoadApiData}
            onLoadSchemaData={handleLoadSchemaData}
          />
        )}
      </div>
    );
  }

  if (!state) {
    return (
      <div className="error-container">
        <h2>无数据</h2>
        <p>未接收到任何数据</p>
        {isDebugMode && (
          <DebugPanel
            onClearData={handleClearData}
            onToggleTheme={handleToggleTheme}
            onLoadApiData={handleLoadApiData}
            onLoadSchemaData={handleLoadSchemaData}
          />
        )}
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
          {isDebugMode && <span className="debug-badge">🔧 调试模式</span>}
        </div>
      </header>

      {isDebugMode && (
        <div className="debug-panel-container">
          <DebugPanel
            onClearData={handleClearData}
            onToggleTheme={handleToggleTheme}
            onLoadApiData={handleLoadApiData}
            onLoadSchemaData={handleLoadSchemaData}
          />
        </div>
      )}

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
