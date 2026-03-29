# 项目初始化指南（AI Agent 执行指南）

本文档是 AI Agent 执行项目初始化时的操作指南，包含明确的询问流程和分支执行步骤。

---

## 第一步：询问用户

在执行任何初始化操作前，**必须先询问用户以下问题**：

### 问题 1: 运行时环境

询问用户**调用 API 的运行时环境**（即 API 请求在哪里发起）：

| 选项 | 说明 | 适用场景 |
|------|------|----------|
| **nodejs** | Node.js 运行时 | 后端服务、CLI 工具、SSR 应用 |
| **browser** | 浏览器运行时 | 前端 Web 应用、React/Vue 项目 |

> **提示**：前端项目通常选择 `browser`，因为 API 请求在浏览器端发起。

### 问题 2: 是否构建独立 CLI

询问用户是否需要构建独立的命令行工具：

| 选项 | 说明 | 使用方式 |
|------|------|----------|
| **是** | 需要命令行直接调用 API | `my-api call user.info --id 123` |
| **否** | 只需要 SDK 集成 | 在代码中 `import` 后调用 |

---

## 第二步：按选择执行初始化

根据用户的选择，执行对应的初始化路径。

---

### 路径 A: Node.js + 仅 SDK

适用于：Node.js 后端项目、只需要在代码中调用 API。

#### 1. 安装依赖

```bash
# 安装 pontx（开发依赖）和 Node.js SDK（运行时依赖）
npm install pontx --save-dev
npm install @pontx/nodejs-sdk
```

#### 2. 初始化配置

```bash
pontx init --runtime nodejs --url "<API_SPEC_URL>" --name "<API_NAME>"
```

> 将 `<API_SPEC_URL>` 替换为实际的 OpenAPI/Swagger 规范 URL，`<API_NAME>` 替换为 API 名称。

#### 3. 生成 SDK 代码

```bash
pontx generate
```

#### 4. 使用 API

```typescript
import { apiClient } from "./src/api";

// 类型安全的 API 调用
const result = await apiClient.user.info({ id: 123 });
```

---

### 路径 B: Node.js + CLI 构建

适用于：需要构建独立 CLI 工具（如 `my-api call xxx`）的 Node.js 项目。

#### 1. 安装依赖

```bash
npm install pontx --save-dev
npm install @pontx/nodejs-sdk
```

#### 2. 初始化配置

```bash
pontx init --runtime nodejs --url "<API_SPEC_URL>" --name "<API_NAME>"
```

#### 3. 生成 SDK 代码

```bash
pontx generate
```

#### 4. 构建 CLI 工具

请参考 **[构建 SDK CLI](./sdk-cli-build.md)** 文档完成以下步骤：
- 初始化 CLI 配置 (`pontx cli init`)
- 创建 `pontx.cli.ts` 配置文件
- 构建 CLI (`pontx cli build`)
- 本地测试和发布

---

### 路径 C: Browser + 仅 SDK

适用于：前端 Web 应用（React/Vue 等）、只需要在代码中调用 API。

#### 1. 安装依赖

```bash
# 安装 pontx（开发依赖）和浏览器 SDK（运行时依赖）
npm install pontx --save-dev
npm install @pontx/sdk-browser-client
```

#### 2. 初始化配置

```bash
pontx init --runtime browser --url "<API_SPEC_URL>" --name "<API_NAME>"
```

> 将 `<API_SPEC_URL>` 替换为实际的 OpenAPI/Swagger 规范 URL，`<API_NAME>` 替换为 API 名称。

#### 3. 生成 SDK 代码

```bash
pontx generate
```

#### 4. 使用 API

```typescript
import { apiClient } from "./src/api";

// 类型安全的 API 调用
const result = await apiClient.user.info({ id: 123 });
```

---

### 路径 D: Browser + CLI 构建

适用于：前端项目 + 需要独立 CLI 工具。

#### 1. 安装依赖

```bash
npm install pontx --save-dev
npm install @pontx/sdk-browser-client
```

#### 2. 初始化配置

```bash
pontx init --runtime browser --url "<API_SPEC_URL>" --name "<API_NAME>"
```

#### 3. 生成 SDK 代码

```bash
pontx generate
```

#### 4. 构建 CLI 工具

请参考 **[构建 SDK CLI](./sdk-cli-build.md)** 文档完成以下步骤：
- 初始化 CLI 配置 (`pontx cli init`)
- 创建 `pontx.cli.ts` 配置文件
- 构建 CLI (`pontx cli build`)
- 本地测试和发布

---

## 附录

### 命令参数参考

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--url <url>` | 远程 OpenAPI/Swagger 规范 URL | - |
| `--name <name>` | 数据源名称（用于 API 路径前缀） | "api" |
| `--localPath <path>` | 本地 OpenAPI/Swagger 文件路径 | - |
| `--outDir <dir>` | SDK 代码输出目录 | "src/apis" |
| `--runtime <runtime>` | 运行时环境: `nodejs` \| `browser` | "nodejs" |
| `--skip-install` | 跳过自动安装 SDK 依赖 | false |

### 生成的文件说明

初始化完成后，会生成以下文件：

| 文件 | 说明 |
|------|------|
| `pontx.config.ts` | Pontx 配置文件 |
| `src/api.ts` | API 客户端入口 |
| `src/apis/<name>/` | 生成的 SDK 代码目录 |

### 运行时环境对比

| 特性 | Node.js | Browser |
|------|---------|---------|
| SDK 包 | `@pontx/nodejs-sdk` | `@pontx/sdk-browser-client` |
| 客户端创建 | `createGracefulClient` | `createClient` |
| 插件支持 | `gracefulCodegenPlugin()` | 无需插件 |
| 高级功能 | 验证、重试、超时 | 自定义 fetch |

### 常见问题

#### Q: 配置文件已存在怎么办？

`pontx init` 不会覆盖已存在的配置文件。如需重新生成，请先删除现有的 `pontx.config.ts`。

#### Q: 支持哪些 API 规范格式？

- OpenAPI 3.0/3.1 (推荐)
- Swagger 2.0
- Pontx Spec (内部扩展格式)

#### Q: 如何验证配置是否正确？

```bash
# 列出配置的数据源
pontx list specs

# 列出所有 API
pontx list apis
```

#### Q: 可以手动安装 SDK 依赖吗？

可以使用 `--skip-install` 跳过自动安装，然后手动安装：

```bash
# Node.js 运行时
npm install @pontx/nodejs-sdk

# 浏览器运行时
npm install @pontx/sdk-browser-client
```

---

## 相关文档

- [构建 SDK CLI](./sdk-cli-build.md) - 了解如何构建和发布独立的 CLI 工具
- [配置文件详解](./pontx-config.md) - 了解完整的配置选项
- 运行 `pontx --help` 查看所有命令
