# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

PONTX 是一个 API 生命周期管理工具，基于 pontx-spec 协议（兼容 OAS2/OAS3，支持 ROA/RPC），提供 API 的编辑、管理、文档生成、代码生成等能力。

## 架构设计

### Monorepo 结构

使用 pnpm workspace 管理的 monorepo，包含以下主要模块：

#### 核心包 (packages/)
- **@pontx/spec**: PONTX 协议定义，基于 OAS2/OAS3 扩展，支持 ROA/RPC
- **pontx**: 核心包，包含元数据处理、校验、Diff 分析、代码生成、CLI 工具
- **@pontx/mcp**: MCP Server 实现，提供 API 搜索、代码生成等能力
- **@pontx/vscode**: VSCode 扩展，提供 API 管理、搜索、文档查阅、代码生成等功能
- **oas-spec-ts**: OAS2/OAS3 协议的 TypeScript 类型定义

#### SDK 包 (sdk/)
- **@pontx/sdk-core**: 浏览器和 Node.js 共享的核心工具库
- **@pontx/sdk-browser-client**: 浏览器端 SDK
- **@pontx/nodejs-sdk**: Node.js SDK (>= 18)

#### 插件 (plugins/)
- **plugin-egg**: Egg.js 框架的 Pontx 插件

### 构建系统

- **TypeScript**: 所有包使用 TypeScript 5+ 开发
- **核心包构建**: 使用 Rollup，同时生成 ESM (lib/) 和 CJS (cjs/) 两种格式
- **SDK 构建**: @pontx/sdk-core 使用 tsup，其他 SDK 使用 Rollup
- **VSCode 扩展**: extension 使用 esbuild，webview 使用 webpack

## 常用命令

### 包管理
```bash
# 安装依赖
pnpm install

# 测试（使用 Vitest）
pnpm test
```

### 构建命令

#### 构建 pontx 核心包
```bash
cd packages/pontx
npm run build        # 构建
npm run watch        # 监听模式
npm run clean        # 清理构建产物
```

#### 构建 @pontx/spec
```bash
cd packages/spec
npm run build        # 构建
npm run watch        # 监听模式
npm run build:doc    # 生成 API 文档
```

#### 构建 @pontx/mcp
```bash
cd packages/mcp
npm run build        # 构建（使用 tsc）
npm run watch        # 监听模式
npm run dev          # 开发模式
```

#### 构建 VSCode 扩展
```bash
cd packages/vscode
npm run package           # 完整打包（extension + webview）
npm run package:vsix      # 生成 VSIX 安装包
npm run compile           # 仅构建 extension（esbuild）
npm run compile:webview   # 仅构建 webview（webpack）
npm run watch             # 监听 extension
npm run watch:webview     # 监听 webview
npm run dev:webview       # 开发 webview（Vite）
```

#### 构建 SDK
```bash
# @pontx/sdk-core
cd sdk/core
npm run build        # 使用 tsup
npm run dev          # 监听模式

# @pontx/sdk-browser-client
cd sdk/browser
npm run build        # 使用 rollup
npm run watch        # 监听模式

# @pontx/nodejs-sdk
cd sdk/nodejs-sdk
npm run build        # 使用 rollup
npm run watch        # 监听模式
npm run test         # 运行测试
npm run test:unit    # 单元测试
npm run test:types   # 类型测试
```

### 版本发布流程

```bash
# 1. 提交代码
git add . && git commit -m 'feat: xxx'

# 2. 创建 changeset
npm run changeset
# 选择有修改的包名

# 3. 更新版本
npm run changeset:version

# 4. 构建需要发布的包
cd packages/xx
npm run build

# 5. （可选）排除不需要发布的包（如 private 的包）
git checkout -- packages/vscode

# 6. 发布到 npm
npm run changeset:publish

# 7. 提交版本更新
git add . && git commit -m 'chore: release version x.x.x'
```

## 代码规范

### 文件头部注释
每个文件需包含作者信息和描述：
```typescript
/**
 * @author jasonHzq
 * @description 文件描述和架构设计概要
 */
```

### 类型优先级
优先使用 enum，其次是 string literal

### 注释规范
- 所有类、属性、函数、方法、参数添加必要的中文注释
- 使用多行注释 `/** ... */` 或 `/* ... */`
- 单文件代码不超过 500 行

### TypeScript 规范
- 强制使用 optional chaining: `a?.b?.[0]`
- 类型定义必须完备
- React 组件规范：
```typescript
export class XProps {
  /** 属性描述 */
  a = 0;
}

export const X: React.FC<XProps> = (props) => {};

X.defaultProps = new XProps();
```

## 环境要求

- **Node.js**: >= 18.0.0
- **pnpm**: >= 8.0.0（推荐）

## 技术栈

- **前端**: React + Vite + TypeScript + TailwindCSS
- **测试**: Vitest
- **状态管理**: Zustand
- **构建工具**: Rollup, esbuild, webpack, tsup
- **包管理**: pnpm workspace

## 关键概念

### Pontx-Spec 协议
基于 OAS2/OAS3 的扩展协议，兼容 ROA 和 RPC 风格的 API 定义。提供了完整的 API 元数据描述能力。

### 代码生成
pontx 核心包提供多种代码生成能力：
- `generateFiles`: 生成 API 客户端代码
- `reGenerateFiles`: 重新生成文件
- `generateApiRequestCode`: 生成 API 请求代码
- `generateApiUseRequestCode`: 生成 React hooks 风格的请求代码
- `generateRemoteCache`: 生成远程缓存

### 插件系统
支持插件扩展，通过 Plugin 接口实现自定义功能。

## 配置文件

项目使用 `pontx.config.ts` 作为配置文件，VSCode 扩展会自动检测此文件激活相关功能。

### 配置文件加载机制

Pontx 使用混合方案加载 TypeScript 配置文件：
- **普通模式**：使用 esbuild 编译，速度快（50-100ms），持久化缓存（后续 5-10ms）
- **调试模式**：使用 tsx register，支持 VSCode 断点调试

调试模式会在检测到 `--inspect` 参数时自动启用。

### 调试配置文件

用户可以在 VSCode 中调试 `pontx.config.ts`：

1. 在项目中创建 `.vscode/launch.json`：
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "调试 Pontx",
      "program": "${workspaceFolder}/node_modules/.bin/pontx",
      "args": ["build"],
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal",
      "sourceMaps": true,
      "outFiles": [
        "${workspaceFolder}/node_modules/.pontx-cache/**/*.js"
      ],
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

2. 在 `pontx.config.ts` 中设置断点
3. 按 F5 开始调试

支持的配置文件格式：
- `pontx.config.ts` - TypeScript（推荐，支持调试）
- `pontx.config.js` - JavaScript
- `pontx.config.mjs` - ES Module
- `pontx.config.cjs` - CommonJS

### 缓存管理

编译缓存位于 `node_modules/.pontx-cache/`，使用内容 hash 作为缓存键。

清理缓存：
```bash
pontx cache:clean
```

## 日志和调试

### 日志级别控制

Pontx 支持通过环境变量和 CLI 参数控制日志输出级别：

```bash
# 方式 1: 环境变量
export PONTX_LOG_LEVEL=debug  # trace | debug | info | warn | error | fatal
export DEBUG=pontx            # 启用 debug 级别
export NODE_ENV=development   # 自动使用 debug 级别

# 方式 2: CLI 参数
pontx generate --debug
pontx service --debug
```

### 日志级别说明

- **info** (默认): 关键操作信息
- **debug**: 详细调试信息，适合开发和排查问题
- **warn**: 警告信息
- **error**: 错误信息

### 开发规范

开发者请参考 [Logger 开发规范](docs/logger-development.md) 了解如何在代码中正确使用 logger。
