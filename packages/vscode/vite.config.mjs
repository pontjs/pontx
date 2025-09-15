/**
 * @author: jasonHzq
 * @description: Vite 配置文件，用于 WebView 调试环境
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 查找 pnpm 依赖路径
function findPnpmDependency(depName) {
  const possiblePaths = [
    path.resolve(__dirname, "node_modules", depName),
    path.resolve(__dirname, "../../node_modules", depName),
    path.resolve(
      __dirname,
      "../../node_modules/.pnpm",
      depName + "@*",
      "node_modules",
      depName
    ),
  ];

  for (const depPath of possiblePaths) {
    try {
      require.resolve(depPath);
      return depPath;
    } catch (e) {
      // 继续尝试下一个路径
    }
  }
  return null;
}

// 配置别名
const aliasConfig = {};
const dependencies = ["@pontx/shadcn-ui"];

dependencies.forEach((dep) => {
  const depPath = findPnpmDependency(dep);
  if (depPath) {
    aliasConfig[dep] = depPath;
  }
});

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, "src/webview/browser"),
  base: "/",
  build: {
    outDir: path.resolve(__dirname, "dist/webview"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "src/webview/browser/index.html"),
      },
      output: {
        entryFileNames: "browser.js",
        chunkFileNames: "[name].js",
        assetFileNames: "[name].[ext]",
      },
    },
    sourcemap: true,
    minify: false, // 调试时不压缩
  },
  resolve: {
    alias: {
      ...aliasConfig,
      "@": path.resolve(__dirname, "src/webview/browser"),
    },
  },
  define: {
    // 替换 Node.js 环境变量为浏览器安全的值
    "process.env.NODE_ENV": JSON.stringify("development"),
    "process.env": JSON.stringify({}),
    "process.browser": JSON.stringify(true),
    "process.version": JSON.stringify(""),
  },
  server: {
    port: 3002,
    host: "localhost",
    open: true,
    cors: true,
  },
  optimizeDeps: {
    include: ["react", "react-dom"],
  },
});
