# Pontx CLI 接入指南

## 概述

如果你的项目使用 pontx 管理 API，你可以基于 pontx 快速创建自己的 CLI 工具，复用 pontx 的所有命令和功能，包括：

- ✅ API 调用 (`call`)
- ✅ 代码生成 (`gen`)
- ✅ API 查看 (`show-api`, `show-schema`)
- ✅ API 搜索 (`search`)
- ✅ **Shell 自动补全 (支持单 spec 模式)**
- ✅ 所有其他 pontx 命令

## 快速接入（3 步）

### 1. 添加依赖

在你的 `package.json` 中添加 pontx 依赖：

```json
{
  "dependencies": {
    "pontx": "^0.1.13"
  }
}
```

### 2. 创建 CLI 入口文件

创建 `bin/your-cli.cjs` 文件：

```javascript
#!/usr/bin/env node

/**
 * @description Your CLI - 基于 pontx 的命令行工具
 */

require("pontx/setup-cli")("your-cli-name");
```

**重要**: 文件必须使用 `.cjs` 扩展名（CommonJS 格式）。

### 3. 配置 package.json

在 `package.json` 中添加 bin 字段：

```json
{
  "name": "your-package",
  "version": "1.0.0",
  "bin": {
    "your-cli": "./bin/your-cli.cjs"
  },
  "files": ["bin", "pontx.config.ts", "src/apis"]
}
```

完成！现在你的 CLI 就可以使用了。

## 高级配置

### 自定义根目录

如果你的 `pontx.config.ts` 不在包根目录，可以指定：

```javascript
require("pontx/setup-cli")("your-cli", {
  rootDir: "/path/to/config/dir",
});
```

### 多配置文件支持

pontx 会自动查找以下配置文件（按优先级）：

1. `pontx.config.ts`
2. `pontx.config.js`
3. `pontx.config.mjs`
4. `pontx.config.cjs`

## 使用指南

### 开发阶段

在开发时，使用 `npm link` 测试你的 CLI：

```bash
# 在你的包目录中
npm link

# 现在可以直接使用你的 CLI
your-cli --help
your-cli call <API>
```

### 发布后

用户安装你的包后，可以直接使用：

```bash
# 全局安装
npm install -g your-package

# 或在项目中使用
npx your-package your-cli call <API>
```

## Shell 自动补全接入

你的 CLI 自动继承了 pontx 的补全功能，**无需额外配置**！

### 为用户提供补全安装指南

在你的 README 中添加补全安装说明：

#### README.md 示例

```markdown
# Your CLI

## 安装

\`\`\`bash
npm install -g your-package
\`\`\`

## Shell 自动补全

### Zsh

在 `~/.zshrc` 中添加：

\`\`\`bash

# Your CLI completion

eval "$(your-cli completion generate --shell=zsh)"
\`\`\`

然后重新加载：

\`\`\`bash
source ~/.zshrc
\`\`\`

### Bash

在 `~/.bashrc` 中添加：

\`\`\`bash

# Your CLI completion

eval "$(your-cli completion generate --shell=bash)"
\`\`\`

然后重新加载：

\`\`\`bash
source ~/.bashrc
\`\`\`

### Fish

运行：

\`\`\`bash
your-cli completion generate --shell=fish > ~/.config/fish/completions/your-cli.fish
\`\`\`

### 验证补全

\`\`\`bash
your-cli <TAB> # 显示所有子命令
your-cli call <TAB> # 显示 API 补全
\`\`\`

## 单 Spec 模式

如果你的项目只配置了一个 spec，补全会自动使用简化格式：

\`\`\`bash

# 有 tags 的情况

your-cli call tag.apiName

# 无 tags 的情况

your-cli call apiName
\`\`\`
```

### 提供一键安装脚本（可选）

你可以提供一个安装脚本简化用户操作：

#### scripts/install-completion.sh

```bash
#!/bin/bash

CLI_NAME="your-cli"
SHELL_TYPE="${1:-$(basename $SHELL)}"

echo "Installing $CLI_NAME completion for $SHELL_TYPE..."

case "$SHELL_TYPE" in
  zsh)
    PROFILE="$HOME/.zshrc"
    COMPLETION_LINE="eval \"\$($CLI_NAME completion generate --shell=zsh)\""
    ;;
  bash)
    PROFILE="$HOME/.bashrc"
    COMPLETION_LINE="eval \"\$($CLI_NAME completion generate --shell=bash)\""
    ;;
  fish)
    mkdir -p ~/.config/fish/completions
    $CLI_NAME completion generate --shell=fish > ~/.config/fish/completions/$CLI_NAME.fish
    echo "Completion installed for Fish!"
    exit 0
    ;;
  *)
    echo "Unsupported shell: $SHELL_TYPE"
    echo "Supported shells: bash, zsh, fish"
    exit 1
    ;;
esac

# 检查是否已存在
if grep -q "$CLI_NAME completion" "$PROFILE" 2>/dev/null; then
  echo "Completion already installed in $PROFILE"
  exit 0
fi

# 添加补全配置
echo "" >> "$PROFILE"
echo "# $CLI_NAME CLI completion" >> "$PROFILE"
echo "$COMPLETION_LINE" >> "$PROFILE"

echo "Completion installed! Please run: source $PROFILE"
```

使用方式：

```bash
# 自动检测 shell
bash scripts/install-completion.sh

# 指定 shell
bash scripts/install-completion.sh zsh
```

## 补全功能特性

你的 CLI 会自动获得以下补全特性：

### 1. 命令补全

```bash
your-cli <TAB>
# 显示: call, gen, show-api, show-schema, search, generate, etc.
```

### 2. API 路径补全

```bash
your-cli call <TAB>
# 单 spec 有 tags: 显示所有 tags
# 单 spec 无 tags: 显示所有 APIs
# 多 spec: 显示所有 specs

your-cli call spec.<TAB>
# 显示 spec 下的所有 tags 或 APIs
```

### 3. 选项补全

```bash
your-cli call api --<TAB>
# 显示: --env, --debug, --output, --query, etc.
```

### 4. 智能模式切换

- **单 spec 模式**: 自动省略 specName
  - 有 tags: `tag.api`
  - 无 tags: `api`
- **多 spec 模式**: 必须包含 specName
  - `spec.tag.api`

### 5. 性能优化

- 使用缓存（默认 60 秒 TTL）
- 只在需要时加载 spec 数据
- 异步加载，不阻塞 shell

## 最佳实践

### 1. 版本管理

确保 pontx 版本与功能需求匹配：

```json
{
  "dependencies": {
    "pontx": "^0.1.13" // 单 spec 模式需要 >= 0.1.13
  }
}
```

### 2. 文档完整性

在你的 README 中包含：

- ✅ 安装说明
- ✅ 基本使用示例
- ✅ 补全安装指南
- ✅ 常见问题解答

### 3. 测试验证

发布前确保测试：

```bash
# 1. 链接本地包
npm link

# 2. 测试基本命令
your-cli --help
your-cli ls
your-cli call <API>

# 3. 测试补全
your-cli completion generate --shell=zsh

# 4. 安装补全并测试
eval "$(your-cli completion generate --shell=zsh)"
your-cli <TAB>
```

### 4. 包文件配置

确保 `files` 字段包含必要文件：

```json
{
  "files": [
    "bin", // CLI 入口文件
    "dist", // 构建产物
    "pontx.config.ts", // 配置文件
    "src/apis" // API 元数据
  ]
}
```

## 故障排查

### CLI 命令找不到

**问题**: 运行 `your-cli` 提示命令不存在

**解决**:

```bash
# 开发时
npm link

# 或全局安装
npm install -g your-package

# 检查是否在 PATH 中
which your-cli
```

### 补全不工作

**问题**: 按 Tab 没有补全提示

**检查清单**:

1. ✅ CLI 命令可用 (`which your-cli`)
2. ✅ 补全已安装 (`type _your-cli` for zsh)
3. ✅ 项目有 `pontx.config.ts`
4. ✅ 已生成 `api-lock.json` (`your-cli generate`)

**解决步骤**:

```bash
# 1. 确认 CLI 可用
which your-cli

# 2. 重新安装补全
source ~/.zshrc  # 或 ~/.bashrc

# 3. 清除补全缓存 (Zsh)
rm ~/.zcompdump*
autoload -Uz compinit && compinit
```

### 单 spec 模式未生效

**问题**: 补全仍要求输入完整路径

**检查**:

```bash
# 查看有几个 spec
your-cli ls

# 应该只显示一个 spec，如果有多个，单 spec 模式不会启用
```

### 常见问题

**Q: 我可以自定义 CLI 命令吗？**

A: 目前 `setup-cli` 提供的是完整的 pontx 命令集。如果需要自定义，可以直接使用 `createCli` 和 `runCli` API：

```javascript
const { createCli, runCli } = require("pontx/cjs/cli-factory.cjs");

const program = createCli({
  rootDir: process.cwd(),
  binName: "your-cli",
});

// 添加自定义命令
program
  .command("custom")
  .description("自定义命令")
  .action(() => {
    console.log("执行自定义逻辑");
  });

runCli(program);
```

**Q: 补全性能如何？**

A: 补全使用了智能缓存机制（默认 60 秒 TTL），首次补全会加载数据，后续补全非常快速（< 10ms）。

**Q: 支持哪些 Shell？**

A: 支持 Bash、Zsh 和 Fish，覆盖了绝大多数开发者使用的 Shell。

**Q: 如何更新补全脚本？**

A: 动态加载方式（`eval "$(...)"`）会自动使用最新版本。文件方式需要重新生成：

```bash
your-cli completion generate --shell=zsh > ~/.zsh/completions/_your-cli
```

## 发布检查清单

发布前确认：

- [ ] `bin/your-cli.cjs` 文件存在且可执行
- [ ] `package.json` 配置了 `bin` 字段
- [ ] `files` 字段包含必要文件
- [ ] 测试了基本命令 (`your-cli --help`)
- [ ] 测试了补全生成 (`your-cli completion generate`)
- [ ] README 包含补全安装说明
- [ ] 版本号符合语义化版本规范

## 总结

通过 `setup-cli`，你可以：

1. **3 行代码** 创建完整功能的 CLI
2. **零配置** 获得 Shell 自动补全
3. **自动适应** 单 spec 模式简化格式
4. **无缝集成** pontx 的所有功能

这让你可以专注于业务逻辑，而不用担心 CLI 基础设施！
