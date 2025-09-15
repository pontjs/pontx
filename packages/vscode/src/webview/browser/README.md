# WebView Browser 目录结构

## 概述

WebView Browser 目录已经重构，将调试代码和生产代码完全分离，确保 Webpack 打包时只包含生产环境需要的代码。

## 目录结构

```
src/webview/browser/
├── components/           # 共享组件
│   └── LoadingSpinner.tsx
├── debug/               # 调试环境代码
│   ├── index.tsx        # 调试环境入口
│   ├── DebugWebViewApp.tsx  # 调试环境主组件
│   ├── DebugPanel.tsx   # 调试控制面板
│   └── mock-vscode-api.ts   # 模拟 VSCode API
├── production/          # 生产环境代码
│   ├── index.tsx        # 生产环境入口
│   └── ProductionWebViewApp.tsx  # 生产环境主组件
├── index.tsx           # 默认入口（指向调试环境）
├── index.html          # HTML 模板
├── styles.css          # 样式文件
├── types.ts            # 类型定义
└── tsconfig.json       # TypeScript 配置
```

## 构建配置

### 开发环境（Vite）

- **入口文件**: `src/webview/browser/index.tsx` → `debug/index.tsx`
- **启动命令**: `pnpm run dev:webview`
- **功能**: 包含完整的调试功能，如 DebugPanel、模拟数据等

### 生产环境（Webpack）

- **入口文件**: `src/webview/browser/production/index.tsx`
- **构建命令**: `pnpm run compile:webview`
- **功能**: 只包含生产环境必需的代码，不包含任何调试功能

## 代码分离策略

### 调试代码（debug/ 目录）

- `DebugPanel.tsx`: 调试控制面板组件
- `mock-vscode-api.ts`: 模拟 VSCode API 实现
- `DebugWebViewApp.tsx`: 包含调试功能的主组件
- `index.tsx`: 调试环境入口，自动加载模拟 API

### 生产代码（production/ 目录）

- `ProductionWebViewApp.tsx`: 纯净的生产环境主组件
- `index.tsx`: 生产环境入口，不包含任何调试代码

### 共享代码

- `components/LoadingSpinner.tsx`: 加载动画组件
- `styles.css`: 样式文件
- `types.ts`: TypeScript 类型定义

## 验证结果

✅ **Webpack 构建验证**: 生产环境构建结果中不包含任何调试代码
✅ **Vite 开发验证**: 开发环境保持完整的调试功能
✅ **代码分离**: 调试代码和生产代码完全隔离

## 使用方式

### 开发调试

```bash
pnpm run dev:webview
```

访问 http://localhost:3002 进行调试

### 生产构建

```bash
pnpm run compile:webview
```

生成纯净的生产环境代码到 `dist/webview/`

### 完整打包

```bash
pnpm run package
```

同时构建扩展和生产环境 WebView 代码
