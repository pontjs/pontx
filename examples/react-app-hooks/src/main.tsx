import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { SWRConfig } from "swr";
import { PublicConfiguration } from "swr/_internal";

const swrGlobalConfig = {
  /** 错误重试，默认关闭 */
  shouldRetryOnError: false,
  /** 获取焦点时，不重新请求 */
  revalidateOnFocus: false,
  /** 接口缓存 1 分钟 */
  dedupingInterval: 60 * 1000,
} as Partial<PublicConfiguration>;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SWRConfig value={swrGlobalConfig}>
      <App />
    </SWRConfig>
  </React.StrictMode>,
);
