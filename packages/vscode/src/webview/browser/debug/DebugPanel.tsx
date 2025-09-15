/**
 * @author: jasonHzq
 * @description: 调试控制面板组件，用于在调试环境中测试不同数据
 */

import React from "react";

interface DebugPanelProps {
  onClearData: () => void;
  onToggleTheme: () => void;
  onLoadApiData: () => void;
  onLoadSchemaData: () => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({
  onClearData,
  onToggleTheme,
  onLoadApiData,
  onLoadSchemaData,
}) => {
  return (
    <div className="debug-panel">
      <h3>🔧 调试控制面板</h3>
      <div className="debug-buttons">
        <button onClick={onLoadApiData} className="debug-btn">
          📄 加载 API 数据
        </button>
        <button onClick={onLoadSchemaData} className="debug-btn">
          📋 加载 Schema 数据
        </button>
        <button onClick={onClearData} className="debug-btn">
          🗑️ 清空数据
        </button>
        <button onClick={onToggleTheme} className="debug-btn">
          🎨 切换主题
        </button>
      </div>
      <div className="debug-info">
        <p>💡 这是调试环境，使用模拟的 VSCode API</p>
        <p>📄 点击按钮切换 API 和 Schema 数据渲染</p>
        <p>📱 在真实 VSCode 中，这些数据会来自扩展</p>
      </div>
    </div>
  );
};
