/**
 * @author: jasonHzq
 * @description: 加载状态组件
 */

import React from "react";

/**
 * 加载状态组件
 */
export const LoadingSpinner: React.FC = () => {
  return (
    <div className="loading-container">
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>加载中...</p>
      </div>
    </div>
  );
};
