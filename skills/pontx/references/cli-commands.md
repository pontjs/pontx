# CLI 命令参考

本文档提供 Pontx CLI 所有命令的详细参考。

## 命令概览

| 命令 | 说明 |
|------|------|
| `pontx init` | 初始化配置文件 |
| `pontx list` | 列出资源 |
| `pontx search` | 搜索 API |
| `pontx show-api` | 查看 API 详情 |
| `pontx show-schema` | 查看 Schema 详情 |
| `pontx gen` | 生成 API 调用代码 |
| `pontx generate` | 生成所有 SDK 代码 |
| `pontx call` | 调用 API |
| `pontx check` | 检测元数据兼容性 |
| `pontx service` | 启动 Pontx 服务 |
| `pontx completion` | 管理 Shell 补全 |
| `pontx cache:clean` | 清理缓存 |
| `pontx add-spec` | 添加外置 Spec |
| `pontx cli` | SDK CLI 管理 |
| `pontx skill` | 安装 AI Skill |

## 全局选项

所有命令都支持以下选项：

| 选项 | 说明 |
|------|------|
| `--help`, `-h` | 显示帮助信息 |
| `--version`, `-V` | 显示版本号 |
| `--debug` | 启用调试日志 |

---

## pontx init

初始化生成 `pontx.config.ts` 配置文件。

```bash
pontx init [options]
```

### 选项

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `--url <url>` | 远程数据源 URL | - |
| `--name <name>` | 数据源名称 | "api" |
| `--localPath <path>` | 本地数据源路径 | - |
| `--outDir <dir>` | 输出目录 | "src/apis" |

### 示例

```bash
# 基本初始化
pontx init

# 指定远程数据源
pontx init --url "https://api.example.com/swagger.json" --name "my-api"

# 指定本地文件
pontx init --localPath "./openapi.json" --name "local"
```

---

## pontx list

列出各种资源信息。

```bash
pontx list [type] [options]
```

### 子命令

| 子命令 | 说明 |
|--------|------|
| `pontx list specs` | 列出所有数据源 |
| `pontx list apis` | 列出所有 API |
| `pontx list tags` | 列出所有 API 标签 |
| `pontx list schemas` | 列出所有数据模型 |

### 选项

| 选项 | 说明 |
|------|------|
| `--use-remote` | 使用远程元数据 |
| `--json` | 以 JSON 格式输出 |
| `--spec <name>` | 指定 spec 名称（仅 apis/tags/schemas） |

### 示例

```bash
# 列出所有 specs（默认行为）
pontx list

# 列出所有 API
pontx list apis

# 列出指定 spec 的 API
pontx list apis --spec mySpec

# JSON 格式输出
pontx list schemas --json
```

---

## pontx search

搜索 API 接口。

```bash
pontx search <keyword> [options]
```

### 参数

| 参数 | 说明 |
|------|------|
| `keyword` | 搜索关键词 |

### 选项

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `--max <count>` | 最大返回数量 | 6 |
| `--spec <name>` | 指定搜索的 spec | 全部 |
| `--use-remote` | 使用远程元数据 | false |

### 示例

```bash
# 搜索包含 "user" 的 API
pontx search user

# 限制结果数量
pontx search user --max 20

# 在指定 spec 中搜索
pontx search "create" --spec mySpec
```

---

## pontx show-api

查看 API 元数据详情。

```bash
pontx show-api <apiPath> [options]
```

### 参数

| 参数 | 说明 |
|------|------|
| `apiPath` | API 路径，格式: `specName.tagName.apiName` |

### 选项

| 选项 | 说明 |
|------|------|
| `--use-remote` | 使用远程元数据 |

### 示例

```bash
# 查看 API 详情
pontx show-api mySpec.user.info

# 特殊字符用引号包裹
pontx show-api "mySpec.user-manage.get-info"
```

### 输出内容

- HTTP 方法和路径
- 参数列表（名称、类型、位置、是否必需、描述）
- 请求体结构
- 响应类型
- 示例

---

## pontx show-schema

查看 Schema 元数据详情。

```bash
pontx show-schema <schemaPath> [options]
```

### 参数

| 参数 | 说明 |
|------|------|
| `schemaPath` | Schema 路径，格式: `specName.schemaName` |

### 选项

| 选项 | 说明 |
|------|------|
| `--use-remote` | 使用远程元数据 |

### 示例

```bash
# 查看 Schema 详情
pontx show-schema mySpec.UserDTO

# 从 API $ref 提取 schemaName
# $ref: "#/components/schemas/ResultDTO" -> schemaName 是 ResultDTO
pontx show-schema mySpec.ResultDTO
```

---

## pontx gen

生成 API 调用示例代码。

```bash
pontx gen <apiPath> [options]
```

### 参数

| 参数 | 说明 |
|------|------|
| `apiPath` | API 路径，格式: `specName.tagName.apiName` |

### 选项

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `--case <case>` | 代码模板名称 | "request" |
| `--params <json>` | 请求参数（JSON 格式） | - |
| `--body <json>` | 请求体参数（JSON 格式） | - |
| `--use-remote` | 使用远程元数据 | false |

### 模板类型

| 模板 | 说明 |
|------|------|
| `request` | 基础请求代码 |
| `reactHooks` | React Hooks 风格 |
| `cliCommand` | CLI shell 命令 |

使用 `pontx list-cases` 查看所有可用模板。

### 示例

```bash
# 生成基础请求代码
pontx gen mySpec.user.info

# 生成 React Hooks 代码
pontx gen mySpec.user.info --case reactHooks

# 生成 CLI 调用命令
pontx gen mySpec.user.info --case cliCommand

# 带参数生成
pontx gen mySpec.user.info --params '{"id": 123}'
```

---

## pontx generate

生成所有 API 的 SDK 代码。

```bash
pontx generate [options]
```

### 选项

| 选项 | 说明 |
|------|------|
| `--use-remote` | 使用远程元数据生成 |

### 示例

```bash
# 生成 SDK 代码
pontx generate

# 使用远程最新元数据
pontx generate --use-remote
```

---

## pontx call

调用 API 接口。

```bash
pontx call <apiPath> [options] [--paramName value...]
```

### 参数

| 参数 | 说明 |
|------|------|
| `apiPath` | API 路径，格式: `specName.tagName.apiName` |

### 选项

| 选项 | 简写 | 说明 |
|------|------|------|
| `--dry-run` | - | 仅预览请求，不发送 |
| `--body <json>` | - | 请求体（JSON 或 @文件名） |
| `--header <header>` | `-H` | 请求头（可多次使用） |
| `--output <path>` | `-o` | 输出到文件 |
| `--query <expr>` | `-q` | JMESPath 查询表达式 |
| `--env <env>` | `-e` | 指定环境 |
| `--debug` | - | 显示详细信息 |
| `--use-remote` | - | 使用远程元数据 |

### 示例

```bash
# 预览请求
pontx call mySpec.user.info --dry-run --id 123

# 发送请求
pontx call mySpec.user.info --id 123

# POST 请求
pontx call mySpec.user.create --body '{"name": "John"}'

# 从文件读取 body
pontx call mySpec.user.create --body @data.json

# 添加请求头
pontx call mySpec.user.info -H "Authorization: Bearer token"

# 输出到文件
pontx call mySpec.user.list -o result.json

# 使用 JMESPath 筛选
pontx call mySpec.user.list -q "[].{Id: id, Name: name}"

# 指定环境
pontx call mySpec.user.info --env prod
```

---

## pontx check

检测本地和远程元数据的兼容性。

```bash
pontx check
```

检测内容：
- API 变更（新增、删除、修改）
- 参数变更
- 响应类型变更
- Breaking changes

---

## pontx service

启动 Pontx 服务（Web 服务、文件监听、定时同步）。

```bash
pontx service [options]
```

### 选项

| 选项 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `--port <port>` | `-p` | Web 服务端口 | 3000 |
| `--interval <ms>` | `-i` | 同步间隔（毫秒） | 300000 |
| `--no-watch` | - | 禁用文件监听 | - |
| `--no-sync` | - | 禁用定时同步 | - |
| `--no-web` | - | 禁用 Web 服务 | - |
| `--log-level <level>` | `-l` | 日志级别 | "info" |

### 示例

```bash
# 启动服务
pontx service

# 指定端口
pontx service -p 8080

# 仅启用 Web 服务
pontx service --no-watch --no-sync
```

---

## pontx completion

管理 Shell 自动补全。

```bash
pontx completion [action] [options]
```

### 动作

| 动作 | 说明 |
|------|------|
| `install` | 安装补全（默认） |
| `generate` | 生成补全脚本 |
| `uninstall` | 卸载补全 |

### 选项

| 选项 | 说明 |
|------|------|
| `--shell <shell>` | Shell 类型: bash / zsh / fish |
| `--output <path>` | 输出脚本到文件 |

### 示例

```bash
# 安装补全
pontx completion install

# 指定 Shell
pontx completion install --shell zsh

# 生成脚本
pontx completion generate --shell bash > ~/.bash_completion.d/pontx
```

---

## pontx cache:clean

清理配置文件编译缓存。

```bash
pontx cache:clean
```

缓存位于 `node_modules/.pontx-cache/`。

---

## pontx add-spec

从已安装的 SDK 包添加 API 规范。

```bash
pontx add-spec <sdk-name> [options]
```

### 参数

| 参数 | 说明 |
|------|------|
| `sdk-name` | SDK 包名 |

### 选项

| 选项 | 说明 |
|------|------|
| `--name <name>` | 自定义 spec 名称 |

### 示例

```bash
# 添加 SDK 包的 spec
pontx add-spec @company/user-sdk

# 自定义名称
pontx add-spec @company/user-sdk --name user-api
```

---

## pontx cli

SDK CLI 管理命令。

### pontx cli init

初始化 SDK CLI 配置。

```bash
pontx cli init --name <cli-name> [options]
```

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `--name <name>` | CLI 命令名 | 必填 |
| `--out <dir>` | 输出目录 | "./dist/bin" |

### pontx cli build

构建 SDK CLI。

```bash
pontx cli build [options]
```

| 选项 | 说明 |
|------|------|
| `--watch` | 监听模式 |
| `--out <dir>` | 输出目录 |

---

## pontx skill

安装 Pontx AI Skill 文件。

```bash
pontx skill
```

将 SKILL.md 安装到项目根目录，供 AI 助手（Claude Code、Gemini CLI 等）使用。

---

## pontx list-cases

获取可用的代码生成 case 列表。

```bash
pontx list-cases
```

---

## 环境变量

| 变量 | 说明 |
|------|------|
| `PONTX_LOG_LEVEL` | 日志级别: trace / debug / info / warn / error |
| `DEBUG=pontx` | 启用 debug 级别日志 |
| `NODE_ENV=development` | 自动使用 debug 级别 |

## 相关文档

- [项目初始化](./project-init.md)
- [配置文件详解](./pontx-config.md)
- [CLI 调用工作流](./cli-call-workflow.md)
- [构建 SDK CLI](./sdk-cli-build.md)
- [Shell 补全](./shell-completion.md)
