# SDK 工程 Agent SKILL 创建指南

本文档是一份指导性文档，用于帮助 Agent 为任何通过 pontx 构建的 SDK 工程（以下称 Project_A）创建高质量的 Agent SKILL。该 SKILL 的目标是让 AI Agent 能高效使用 Project_A 的 SDK（代码集成）和 CLI（命令行调用）。

> **注意**: 本文档是通用指南。Agent 应根据具体工程的运行时环境（nodejs/browser）、SDK 类型、API 特点等进行定制化生成。

---

## 一、SKILL 触发词与描述设计

SKILL 的 `description` 字段是 Agent 决定是否启用该 SKILL 的关键依据。设计原则：

### 1. 覆盖 SDK 和 CLI 两个维度

description 必须同时包含 SDK 代码集成和 CLI 命令行调用两个维度的触发词。用户可能以任何一种方式与 API 交互。

### 2. 关键词维度清单

确保 description 覆盖以下维度：

| 维度 | 触发词示例 |
|------|-----------|
| **项目名称** | Project_A 的名称、包名、CLI 名称 |
| **SDK 代码调用** | SDK 客户端、API client、类型安全调用、import API |
| **CLI 命令** | CLI 名称 + 子命令（call、search、list、show-api、gen） |
| **API 搜索浏览** | 搜索 API、查找接口、浏览 API 列表 |
| **代码生成** | 生成调用代码、生成 API 请求代码、SDK 代码生成 |
| **配置** | pontx.config.ts、API 数据源配置 |
| **问题排查** | API 调试、请求失败、认证问题 |

### 3. 示例模板

```yaml
description: "Project_A SDK 和 CLI — 用于 [业务域] 的 API 客户端。当用户提到 [项目名]、[CLI名]、[包名]、调用 [业务域] API、搜索/浏览/调用 [业务域] 接口、生成 API 调用代码、配置 API 数据源、使用 [CLI名] 命令（call/search/list/show-api/gen）时，使用此 SKILL。"
```

---

## 二、Agent 使用 SDK 的最佳实践工作流

Agent 在用户项目中集成 SDK 代码时，应遵循以下工作流。核心理念：**先探索、再确认、后生成**。

### 工作流概览

```
发现 API → 查看详情 → 试调用验证 → 生成代码 → 集成到项目
```

### Step 1: 发现 API

使用 CLI 命令搜索和浏览可用的 API：

```bash
# 列出所有可用 API
<cli-name> list apis

# 按关键词搜索
<cli-name> search <keyword>

# 列出所有标签分组
<cli-name> list tags
```

> Agent 应先了解有哪些 API 可用，不要凭猜测直接编写调用代码。

### Step 2: 查看 API 详情

确认 API 的参数、请求体、响应类型：

```bash
# 方式 1: show-api 命令
<cli-name> show-api <tag> <api>

# 方式 2: call -h（推荐，直接显示入参详情和调用示例）
<cli-name> call <tag> <api> -h
```

输出会包含：参数列表（名称、类型、是否必需）、请求体结构、响应类型。Agent 应仔细阅读这些信息，而非凭经验猜测参数。

### Step 3: 试调用验证传参

在生成代码前，先通过 CLI 调用一次 API，确认对参数的理解正确：

```bash
# GET 等安全接口 — 直接调用，不要加 --dry-run，确保请求成功并拿到真实响应
<cli-name> call <tag> <api> --id=123

# POST/PUT/DELETE 等有副作用的接口 — 加 --dry-run 预览
<cli-name> call <tag> <api> --name=test --dry-run
```

这一步非常关键。通过实际调用（或 dry-run），Agent 能确认：
- 参数名称和格式是否正确
- 必填参数是否齐全
- 响应结构是否符合预期

> **处理大量返回数据**: API 返回结果可能包含大量数据，Agent 应避免直接阅读全部内容，而是有选择地读取：
> - 通过管道筛选：`<cli-name> call <tag> <api> --id=123 | grep "keyword"`
> - 写入临时文件后按需读取：`<cli-name> call <tag> <api> --id=123 > /tmp/pontx-result-$(date +%s)-$$.json`（时间戳+PID 确保文件名唯一，避免并行调用冲突）
> - 使用 `-q` JMESPath 只提取所需部分：`<cli-name> call <tag> <api> -q "data[0:3]"`
> 
> 这样既节省 tokens，也让 Agent 注意力更集中。

### Step 4: 生成 SDK 调用代码

确认无误后，使用 `gen` 命令生成类型安全的调用代码：

```bash
# 生成基础请求代码
<cli-name> gen <tag> <api>

# 带参数生成（代码中会预填参数）
<cli-name> gen <tag> <api> --params '{"id": 123}'

# 生成 React Hooks 风格代码
<cli-name> gen <tag> <api> --case reactHooks

# 查看可用的代码模板
<cli-name> list-cases
```

### Step 5: 集成到项目

将生成的代码集成到用户项目中。Agent 应注意：

1. **使用项目现有的 SDK client 实例**：检查项目中是否已创建 client，避免重复创建
2. **遵循项目的代码风格**：文件组织、命名规范、import 路径等
3. **处理错误和边界情况**：根据响应类型添加必要的错误处理
4. **类型安全**：使用生成的类型定义，不要用 `any`

#### SDK Client 使用模式

```typescript
// 典型的 SDK 调用模式（具体 API 因项目而异）
import { client } from './path/to/sdk-client';

// 调用 API — 参数有类型提示
const result = await client.<tag>.<api>({ param1: value1 });
```

Agent 应根据项目实际使用的 SDK（nodejs-sdk / browser-sdk）和 client 类型，选择正确的调用方式。

---

## 三、Agent 使用 CLI 的最佳实践工作流

当用户需要通过命令行直接调用 API（而非在代码中集成）时，Agent 应遵循以下工作流。

### 工作流概览

```
探索命令 → 搜索 API → 查看详情 → 安全预览 → 执行调用
```

### Step 1: 探索命令结构

**使用 `-h` 逐层探索**，这是 CLI 最核心的设计：

```bash
<cli-name> -h                        # 所有可用命令
<cli-name> call -h                   # 可用的 Tags 列表
<cli-name> call <tag> -h             # 该 tag 下的所有 APIs
<cli-name> call <tag> <api> -h       # 该 API 的入参详情 + 调用示例
```

Agent 不确定下一步怎么写时，追加 `-h` 即可。

### Step 2: 搜索目标 API

```bash
<cli-name> search <keyword>
<cli-name> search <keyword> --max 20
```

### Step 3: 查看 API 详情

```bash
# 推荐用 call -h，直接显示入参和调用示例
<cli-name> call <tag> <api> -h

# 或用 show-api 查看完整元数据
<cli-name> show-api <tag> <api>

# 查看关联的 Schema 定义
<cli-name> show-schema <schemaName>
```

### Step 4: 安全预览（dry-run）

**有副作用的接口（POST/PUT/DELETE）必须先预览**：

```bash
<cli-name> call <tag> <api> --param1 value1 --dry-run
```

dry-run 会输出完整的 HTTP 请求内容（URL、方法、Headers、Body），但不实际发送。

**GET 等安全接口可直接调用**，无需 dry-run。

### Step 5: 执行调用

```bash
# 基本调用
<cli-name> call <tag> <api> --param1 value1

# POST 请求传 body
<cli-name> call <tag> <api> --body '{"key": "value"}'

# 从文件读取 body
<cli-name> call <tag> <api> --body @data.json

# 指定环境
<cli-name> call <tag> <api> --param1 value1 --env dev

# 使用 JMESPath 筛选结果
<cli-name> call <tag> <api> --param1 value1 -q "data[].name"

# 保存结果到文件
<cli-name> call <tag> <api> --param1 value1 -o result.json
```

### 安全守则

Agent 在使用 CLI 调用 API 时必须遵循：

1. **有副作用的接口先 `--dry-run`**：POST/PUT/DELETE 等必须先预览
2. **GET 等安全接口直接调用**：不要加 `--dry-run`，直接调用能确保请求成功并获取真实响应
3. **用 `-h` 确认参数**：不要猜测参数名和格式
4. **小心 DELETE/PUT 操作**：这些会修改或删除真实数据，需向用户二次确认
5. **保护凭证**：使用环境变量传递 token，不要在命令行中硬编码
6. **注意环境**：使用 `--env` 明确指定目标环境，避免误操作生产环境
7. **避免大量 tokens 涌入**：API 返回可能很大，通过管道 `grep`、`-q` JMESPath 筛选、或写入 `/tmp` 唯一命名临时文件后按需读取，而非直接阅读全部内容

---

## 四、SKILL 文件结构建议

### frontmatter 设计

```yaml
---
name: <cli-name>
description: "<见上方触发词设计>"
version: "<版本号>"
---
```

### 内容组织

建议按以下结构组织 SKILL 内容：

1. **标题和概述** — 一句话说明这个 CLI/SDK 是做什么的
2. **Quick Start** — 安装和最基本的使用方式（SDK + CLI 各一个示例）
3. **命令层级结构** — CLI 命令树，直观展示所有可用命令
4. **Core Workflows** — 核心工作流：
   - API 发现与浏览
   - 查看 API 详情
   - 代码生成（SDK 场景）
   - API 调用（CLI 场景）
5. **`-h` 逐层探索指南** — 表格展示每一层 `-h` 的输出内容
6. **命令速查表** — 所有命令的一行说明
7. **Safety & Best Practices** — 安全最佳实践

### reference 子文件拆分策略

当 SKILL 内容超过 300 行时，应将详细内容拆分到 `references/` 子目录：

| 候选文件 | 内容 | 何时拆分 |
|---------|------|---------|
| `cli-commands.md` | 所有 CLI 命令的完整参数和示例 | 命令超过 5 个时 |
| `sdk-usage.md` | SDK Client 创建、调用模式、高级用法 | SDK 功能丰富时 |
| `config.md` | 配置文件详解 | 配置项较多时 |

SKILL.md 中用 `> **MUST READ**: 执行前先阅读 references/xxx.md` 指向子文件。

### 自动生成 vs 手动补充

`pontx cli build` 命令会自动生成基础的 CLI SKILL（基于 `sdk-template.ts` 模板）。Agent 在此基础上应补充：

1. **SDK 使用工作流** — 自动生成的 SKILL 只包含 CLI 用法，SDK 代码集成部分需要根据项目实际使用的 SDK 类型补充
2. **项目特定的最佳实践** — 认证方式、环境配置、错误处理模式等
3. **reference 子文件** — 当内容过长时拆分

---

## 相关文档

- [项目初始化指南](./project-init.md) — pontx 项目初始化的完整流程
- [CLI 调用工作流](./cli-call-workflow.md) — pontx CLI 调用 API 的详细工作流
- [CLI 命令参考](./cli-commands.md) — 所有 CLI 命令的参数和用法
- [构建 SDK CLI](./sdk-cli-build.md) — 构建独立 CLI 工具的完整流程
