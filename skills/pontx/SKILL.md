---
name: pontx
description: "Manage PontxSpec API lifecycles with the Pontx CLI and SDK: import OAS when needed, discover and inspect APIs, configure pontx.config.ts, preview or call supported Endpoints, and generate type-safe TypeScript clients. Use this skill whenever the user mentions Pontx, PontxSpec, pontx.config.ts, Pontx CLI commands, OpenAPI/OAS import or project setup, API search, Schema inspection, SDK code generation, or troubleshooting a Pontx project."
metadata:
  author: pontx
  tags:
    - api
    - openapi
    - sdk
    - code-generation
---

# Pontx AI Skill

Pontx 是一个 API 生命周期管理工具，提供 API 搜索、探索、文档生成、SDK 代码生成和直接调用等能力。

## 协议边界

PontxSpec 是 Pontx 的 canonical API 规范。OAS2/OAS3 是兼容的导入格式：普通应用可以直接将上游 OAS 作为 `pontx.config.ts` 输入；但在 `pontx-api-metadata` 中，必须先一次性导入并审查为 `products/<slug>/spec.pontx.json`，之后 metadata、Hub 和 SDK 只能读取该 PontxSpec。不要把 `sources/openapi.json`、`catalog/catalog.json` 或 `catalog/source.json` 重新作为真源。

`style: "RESTFul"` 才可使用 HTTP `method/path` 与 Playground/CLI 执行流程。RPC 等其他 style 仍可加载、检查、索引和生成支持它的产物；没有执行适配器时必须显示为不可执行，不能伪造 REST 请求。

> **IMPORTANT**: 本文件是工作流索引。每个工作流的详细步骤、参数、分支逻辑都在 `references/` 目录下的对应文件中。**执行任何工作流之前，必须先读取对应的 reference 文件，不要仅凭本文件中的概要信息执行操作。**

**Tip**: 运行 `pontx list` 查看当前项目配置的 API specs。**在任何子命令后追加 `-h` 可逐层探索命令结构。**

---

## 1. 项目初始化 (Project Init)

为项目配置 Pontx，生成 `pontx.config.ts` 并安装对应的 SDK 依赖。

初始化涉及运行时环境选择（nodejs/browser）、SDK 包选择、是否构建独立 CLI 等多个决策分支。

> **MUST READ**: 执行初始化前，**必须先完整阅读** `references/project-init.md`。该文件包含必须询问用户的问题、4 条不同的初始化路径（A/B/C/D）、以及每条路径的完整步骤。不要跳过这些步骤。

---

## 2. SDK 集成 (SDK Integration)

在 TypeScript/JavaScript 项目中搜索 API、查看详情、生成类型安全的 SDK 代码。

核心流程：
1. `pontx list apis` / `pontx search <keyword>` — 发现 API
2. `pontx show-api [tag] <api>` — 查看参数、响应类型等详情
3. **试调用验证传参** — 在生成代码前先调用一次，确认对参数的理解正确：
   - GET 等安全接口：**直接调用，不要加 `--dry-run`**，这样能确保调用成功并拿到真实响应验证参数理解，如 `pontx call [tag] <api> --id=123`
   - POST/PUT/DELETE 等有副作用的接口：加 `--dry-run` 预览，如 `pontx call [tag] <api> --name=test --dry-run`
4. **高效处理返回结果** — API 返回可能很大，应通过管道 `grep`、`-q` JMESPath 筛选、或写入 `/tmp` 临时文件后按需读取，避免直接阅读全部内容
5. `pontx gen [tag] <api>` / `pontx generate` — 确认无误后生成 SDK 代码

> **MUST READ**: 查看 `references/cli-commands.md` 了解每个命令的完整选项和用法。

---

## 3. CLI 调用 API (CLI Call Workflow)

通过 `pontx call` 命令直接调用 API，无需生成代码。包含探索、搜索、预览（dry-run）、调用的完整流程。

> **MUST READ**: 执行 API 调用工作流前，**必须先完整阅读** `references/cli-call-workflow.md`。该文件包含完整的 5 步工作流、所有命令参数、安全最佳实践和故障排除指南。

---

## 4. 配置文件 (pontx.config.ts)

Pontx 的核心配置文件，控制数据源、输出目录、插件、API 调用配置等。

> **MUST READ**: 创建或修改配置文件前，**必须先完整阅读** `references/pontx-config.md`。该文件包含所有配置字段（specs、executeApi、plugins、service、translateConfig）的详细说明和完整示例。

---

## 5. 构建独立 CLI 工具 (Build SDK CLI)

为团队构建独立的、可分发的命令行工具来调用 API（区别于 SDK 代码集成）。

> **MUST READ**: 执行 CLI 构建前，**必须先完整阅读** `references/sdk-cli-build.md`。该文件包含从项目创建到发布的完整 6 步流程、`pontx.cli.ts` 的完整配置说明和高级用法。

---

## 6. 为 SDK 工程创建 Agent SKILL (SDK Project SKILL Guide)

为通过 pontx 构建的 SDK 工程创建高质量的 Agent SKILL，让 AI Agent 能高效使用该工程的 SDK 和 CLI。

> **MUST READ**: 创建 SDK 工程的 Agent SKILL 前，**必须先完整阅读** `references/sdk-project-skill-guide.md`。该文件包含 SKILL 触发词设计、Agent 使用 SDK 和 CLI 的最佳实践工作流、以及 SKILL 文件结构建议。

---

## 7. Shell 自动补全 (Shell Completion)

为 Pontx CLI 安装 Shell 自动补全（支持 Zsh/Bash/Fish），包括命令补全和 API 路径补全。

> **MUST READ**: 配置补全前，**必须先完整阅读** `references/shell-completion.md`。该文件包含各 Shell 的安装方法、验证步骤和故障排除。

---

## 8. 命令层级结构

```
pontx
├── 全局命令
│   ├── init / check / generate / mocks / service [spec] / skill / cache:clean / add-spec
│   ├── completion
│   ├── cli (init|build)
│   └── list specs
├── Spec 作用域命令（单 spec 时省略 spec 名）
│   ├── call <tag> <api>
│   ├── show-api <tag> <api>
│   ├── gen <tag> <api>
│   ├── show-schema <schema>
│   ├── search <keyword>
│   ├── list-cases
│   └── list (tags|apis|schemas)
└── <specName>（多 spec 时，每个 spec 一个子命令）
    └── (同上 spec 作用域命令)
```

**核心特性：`-h` 逐层帮助** — 在任意子命令层级追加 `-h` 都能获取上下文帮助：

```bash
pontx -h                        # 所有全局命令 + spec 命令
pontx call -h                   # 可用的 Tags 列表
pontx call pet -h               # pet 下的所有 APIs
pontx call pet getPetById -h    # getPetById 的入参详情 + 示例
```

> **MUST READ**: 查看 `references/cli-commands.md` 了解每个命令的完整选项、参数和示例。

---

## Safety & Best Practices

- **保护凭证**: 使用环境变量，不要硬编码 token
- **使用 `--debug`**: 排查问题时启用详细日志

> 更多安全实践（dry-run 策略、结果处理等）见 Section 2 的核心流程和 `references/cli-call-workflow.md`。

---

## Reference 文件索引

| 文件                              | 内容                                       |
| --------------------------------- | ------------------------------------------ |
| `references/project-init.md`      | 项目初始化完整流程（含决策分支）           |
| `references/pontx-config.md`      | pontx.config.ts 所有配置选项详解           |
| `references/cli-call-workflow.md` | CLI 调用 API 的完整工作流                  |
| `references/cli-commands.md`      | 所有 CLI 命令的参数和用法                  |
| `references/sdk-cli-build.md`     | 构建独立 CLI 工具的完整流程                |
| `references/sdk-project-skill-guide.md` | SDK 工程 Agent SKILL 创建指南        |
| `references/shell-completion.md`  | Shell 自动补全安装和配置                   |

---

_Generated by `pontx skill`_

_This SKILL file helps AI assistants (Claude Code, Gemini CLI, etc.) understand and use Pontx CLI effectively._
