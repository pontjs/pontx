# Shell 自动补全

本文档介绍如何安装和配置 Pontx CLI 的 Shell 自动补全功能。

## 概述

Shell 自动补全可以提升命令行使用效率：

- 按 `Tab` 自动补全命令
- 自动补全 API 路径（`specName.tagName.apiName`）
- 补全命令选项和参数

## 安装补全

### 自动安装（推荐）

```bash
# 自动检测 Shell 类型并安装
pontx completion install
```

### 手动指定 Shell

```bash
# Zsh
pontx completion install --shell zsh

# Bash
pontx completion install --shell bash

# Fish
pontx completion install --shell fish
```

### 重新加载配置

安装后需要重新加载 Shell 配置：

```bash
# Zsh
source ~/.zshrc

# Bash
source ~/.bashrc

# 或者重新打开终端
```

## 验证安装

```bash
# 输入 pontx 后按 Tab
pontx <Tab>

# 应该看到命令列表：
# call     check    completion    generate    init    list    ...
```

## 补全功能

### 命令补全

```bash
pontx <Tab>
# 显示所有可用命令

pontx li<Tab>
# 补全为 pontx list
```

### 子命令补全

```bash
pontx list <Tab>
# 显示：apis  schemas  specs  tags
```

### 选项补全

```bash
pontx call --<Tab>
# 显示：--body  --debug  --dry-run  --env  --header  --help  ...
```

### API 路径补全

```bash
pontx call <Tab>
# 显示项目中配置的 API 路径

pontx call mySpec.<Tab>
# 显示该 spec 下的 tags

pontx call mySpec.user.<Tab>
# 显示该 tag 下的 APIs
```

## 各 Shell 配置详��

### Zsh

补全脚本位置：`~/.zsh/completions/_pontx`

手动生成脚本：

```bash
pontx completion generate --shell zsh > ~/.zsh/completions/_pontx
```

确保 `.zshrc` 中包含：

```bash
fpath=(~/.zsh/completions $fpath)
autoload -Uz compinit && compinit
```

### Bash

补全脚本位置：`~/.bash_completion.d/pontx`

手动生成脚本：

```bash
pontx completion generate --shell bash > ~/.bash_completion.d/pontx
```

确保 `.bashrc` 中包含：

```bash
if [ -d ~/.bash_completion.d ]; then
  for f in ~/.bash_completion.d/*; do
    source "$f"
  done
fi
```

### Fish

补全脚本位置：`~/.config/fish/completions/pontx.fish`

手动生成脚本：

```bash
pontx completion generate --shell fish > ~/.config/fish/completions/pontx.fish
```

## 卸载补全

```bash
pontx completion uninstall
```

或手动删除对应的补全脚本文件。

## SDK CLI 补全

如果你构建了自己的 SDK CLI，也可以为其安装补全：

```bash
# 假设你的 CLI 名称是 my-api-cli
my-api-cli completion install
```

## 故障排除

### 补全不生效

1. 确认已重新加载 Shell 配置
2. 检查补全脚本是否存在
3. 确认 Shell 类型正确

```bash
# 检查当前 Shell
echo $SHELL

# 检查补全脚本
ls -la ~/.zsh/completions/_pontx  # Zsh
ls -la ~/.bash_completion.d/pontx  # Bash
```

### API 路径补全不显示

确保当前目录存在有效的 `pontx.config.ts`：

```bash
# 检查配置
pontx list specs
```

### 补全很慢

API 路径补全需要解析配置文件，首次可能较慢。后续会使用缓存。

清理缓存：

```bash
pontx cache:clean
```

## 相关文档

- [CLI 命令参考](./cli-commands.md)
- [项目初始化](./project-init.md)
