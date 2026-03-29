---
"pontx": minor
---

# OpenCLI 规范引入与 CLI 架构重构

## 主要改动

### 1. CLI 架构重构为层级子命令结构

引入 OpenCLI 规范定义命令元数据，CLI 从扁平结构重构为层级子命令结构，支持 `-h` 逐层查看帮助。

### 2. 新增命令

- `pontx skill` - 生成 AI SKILL 文件
- `pontx init` - 项目初始化
- `pontx list-commands` - 列出所有可用命令
- `pontx list-specs` - 列出所有 API 规范
- `pontx <spec>` 子命令系列：
  - `call` - 调用 API
  - `gen` - 代码生成
  - `search` - 搜索 API
  - `show-api` / `show-schema` - 查看 API 详情和 Schema
  - `list-apis` / `list-tags` / `list-schemas` / `list-cases` - 列出元数据

### 3. 补全系统重写

全新的 Shell 补全系统，支持 bash/zsh/fish，基于 manifest 缓存实现高性能补全。

- zsh 补全显示优化，支持多行描述和原生 padding 对齐
- 子命令和选项值的智能补全

### 4. SDK CLI 增强

- 新增 `init-skill` 命令
- 修复 SDK CLI skill 命令的三个问题
- 统一 CLI 参数格式为点分隔风格（show-schema）
