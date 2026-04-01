# Pontx

[English](./README.md)

API 生命周期管理 CLI — 从终端搜索、探索、生成代码、直接调用 API。

基于 Pontx-Spec 协议（兼容 OAS2/OAS3，支持 ROA/RPC）。

## 安装

```bash
npm install pontx -g
```

## 安装 AI Skill（推荐）

Pontx 提供 AI Skill，帮助 AI 助手（Claude Code、Gemini CLI 等）理解你的 API 上下文，生成准确的代码。

```bash
pontx skill
```

安装后，AI 助手将能够：

- 搜索和探索你的 API，获取完整上下文
- 生成类型安全的 SDK 代码，参数准确
- 直接调用 API，正确处理认证
- 遵循最佳实践（变更前 dry-run、用 `-h` 发现参数）

> **建议**：在每个使用 API 的项目中运行 `pontx skill` — 这是获得 AI 驱动 API 开发体验的最快方式。

## 快速开始

### 1. 初始化

```bash
pontx init
```

在项目中生成 `pontx.config.ts`：

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

### 2. 探索 API

```bash
pontx list apis              # 列出所有 API
pontx search <keyword>       # 模糊搜索
pontx show-api <tag> <api>   # 查看 API 详情
```

### 3. 生成代码

```bash
pontx generate               # 生成所有 SDK 代码
pontx gen <tag> <api>        # 生成单个 API 代码
```

### 4. 调用 API

```bash
pontx call <tag> <api> --dry-run   # 预览请求
pontx call <tag> <api> -p key=val  # 执行调用
```

## CLI 命令

| 命令 | 说明 |
| --- | --- |
| `pontx init` | 初始化配置文件 |
| `pontx list specs` | 列出所有数据源 |
| `pontx list tags` | 列出所有 API 标签 |
| `pontx list apis` | 列出所有 API |
| `pontx list schemas` | 列出所有数据模型 |
| `pontx search <keyword>` | 搜索 API |
| `pontx show-api <tag> <api>` | 查看 API 详情 |
| `pontx show-schema <schema>` | 查看 Schema 详情 |
| `pontx gen <tag> <api>` | 生成单个 API 调用代码 |
| `pontx generate` | 生成所有 SDK 代码 |
| `pontx call <tag> <api>` | 调用 API（推荐先加 `--dry-run`） |
| `pontx cli init` | 初始化 SDK CLI 项目 |
| `pontx cli build` | 构建 SDK CLI |
| `pontx completion install` | 安装 Shell 补全 |
| `pontx skill` | 安装 AI Skill |
| `pontx cache:clean` | 清理构建缓存 |

> 在任意层级追加 `-h` 可发现子命令和参数：`pontx call -h`、`pontx call pet -h`、`pontx call pet getPetById -h`

## 构建 SDK CLI

为团队的 API 创建独立的、可分发的命令行工具：

```bash
mkdir my-api-cli && cd my-api-cli
npm init -y
npm install pontx

pontx cli init --name my-api-cli
pontx cli build
```

构建产物：
- 可直接使用的 CLI 二进制文件
- AI Skill（`skills/<cli-name>/SKILL.md`），包含从 API spec 提取的真实示例

## Shell 补全

```bash
pontx completion install     # 自动检测 Shell（zsh/bash/fish）
```

支持命令、API 标签、API 名称和参数的 Tab 补全。

## 配置

完整配置选项请参考 [`pontx.config.ts` 文档](https://github.com/pontjs/pontx)：

- **origins** — API 数据源（URL、本地文件或自定义 fetcher）
- **outDir** — 代码生成输出目录
- **plugins** — 代码生成插件
- **executeApi** — API 调用配置（请求头、认证、基础 URL）
- **translateConfig** — 中文标识符翻译为英文

## 环境要求

- Node.js >= 18.0.0

## 许可证

MIT
