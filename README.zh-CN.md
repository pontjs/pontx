# Pontx

[English](./README.md)

**官网与精选 API 目录：** [pontx.dev](https://pontx.dev/zh)

API 生命周期管理工具，基于 Pontx-Spec 协议（兼容 OAS2/OAS3，支持 ROA/RPC），提供 API 的搜索、文档生成、代码生成、SDK 管理等能力。

## 特性

- **协议兼容** — 基于 OAS2/OAS3 扩展的 Pontx-Spec 协议，同时支持 ROA 和 RPC 风格
- **代码生成** — 从 API 定义生成类型安全的客户端代码，支持多语言
- **VSCode 扩展** — API 资源管理器、智能搜索、文档查阅、一键代码生成
- **MCP Server** — 为 AI 工具提供 API 搜索与代码生成能力
- **多端 SDK** — 浏览器端、Node.js 端 SDK，开箱即用
- **CLI 工具** — 命令行管理 API 元数据、校验、Diff 分析、代码生成

## 包一览

### 核心包

| 包名 | 版本 | 说明 |
| --- | --- | --- |
| [pontx](./packages/pontx) | 1.0.0-beta.1 | CLI 工具与核心引擎 |
| [@pontx/spec](./packages/spec) | 1.0.0-beta.1 | Pontx-Spec 协议定义 |
| [@pontx/mcp](./packages/mcp) | 1.0.0-beta.0 | MCP Server 实现 |
| [vscode-pontx](./packages/vscode) | 2.0.8 | VSCode 扩展 |
| [oas-spec-ts](./packages/oas-spec-ts) | 0.6.4 | OAS2/OAS3 TypeScript 类型 |

### SDK

| 包名 | 版本 | 说明 |
| --- | --- | --- |
| [@pontx/sdk](./sdk/core) | 1.0.0-beta.1 | 核心工具库（Browser & Node.js 共享） |
| [@pontx/sdk-browser-client](./sdk/browser) | 0.0.11 | 浏览器端 SDK |
| [@pontx/nodejs-sdk](./sdk/nodejs-sdk) | 0.1.0 | Node.js SDK（>= 18） |

### 插件

| 包名 | 说明 |
| --- | --- |
| [plugin-egg](./plugins/plugin-egg) | Egg.js 框架插件 |

## 快速开始

### 安装

```bash
npm install pontx -g
```

### 安装 AI Skill（推荐）

Pontx 提供 **AI Skill**，帮助 AI 助手（Claude Code、Gemini CLI 等）理解你的 API，生成准确的代码。

```bash
pontx skill
npx skills add https://github.com/pontjs/pontx --skill pontx
```

安装后，AI 助手可以搜索 API、生成类型安全的代码、直接调用 API — 无需手动编写提示词。

> **建议**：在每个使用 API 的项目中运行 `pontx skill` — 这是获得 AI 驱动 API 开发体验的最快方式。

### 初始化配置

在项目根目录创建 `pontx.config.ts`：

```typescript
import { PontxConfig } from "pontx";

export default {
  origins: [
    {
      name: "petstore",
      url: "https://petstore.swagger.io/v2/swagger.json",
    },
  ],
} as PontxConfig;
```

### 生成代码

```bash
pontx generate
```

### 使用 SDK

```typescript
import { createClient } from "@pontx/nodejs-sdk";

const client = createClient({
  baseURL: "https://api.example.com",
});
```

## 开发

### 环境要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### 安装依赖

```bash
pnpm install
```

### 构建所有包

```bash
pnpm build:all
```

### 运行测试

```bash
pnpm test
```

### 版本发布

```bash
# 创建 changeset
pnpm changeset

# 更新版本号
pnpm changeset:version

# 发布到 npm
pnpm changeset:publish
```

## 技术栈

- **语言**: TypeScript 5+
- **构建**: Rollup / esbuild / tsup / webpack
- **测试**: Vitest
- **前端**: React + Vite + TailwindCSS
- **包管理**: pnpm workspace + Changesets

## 许可证

MIT
