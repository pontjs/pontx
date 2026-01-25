# Pontx Shell 自动补全安装指南

## 概述

Pontx CLI 支持 Bash、Zsh 和 Fish shell 的自动补全功能，可以帮助你：

- 补全子命令 (如 `call`, `gen`, `show-api`)
- 补全 API 路径 (支持单 spec 模式的简化格式)
- 补全命令选项
- 补全参数名称

## 快速安装

### 查看安装说明

```bash
pontx completion install
```

系统会自动检测你的 shell 并显示对应的安装指南。

### 生成补全脚本

```bash
# 生成当前 shell 的补全脚本
pontx completion generate

# 指定 shell 类型
pontx completion generate --shell=zsh
pontx completion generate --shell=bash
pontx completion generate --shell=fish

# 输出到文件
pontx completion generate --shell=zsh --output=~/.zsh/completions/_pontx
```

## 详细安装步骤

### Zsh (推荐)

#### 方法 1: 动态加载 (推荐)

在 `~/.zshrc` 中添加：

```bash
# Pontx completion
eval "$(pontx completion generate --shell=zsh)"
```

然后重新加载配置：

```bash
source ~/.zshrc
```

#### 方法 2: 保存到文件

1. 生成补全脚本到 fpath 目录：

```bash
# 创建目录（如果不存在）
mkdir -p ~/.zsh/completions

# 生成补全脚本
pontx completion generate --shell=zsh > ~/.zsh/completions/_pontx
```

2. 在 `~/.zshrc` 中添加（在 `compinit` 之前）：

```bash
# 添加补全目录到 fpath
fpath=(~/.zsh/completions $fpath)

# 初始化补全系统
autoload -Uz compinit && compinit
```

3. 重新加载配置：

```bash
source ~/.zshrc
```

### Bash

#### Ubuntu/Debian

1. 生成补全脚本：

```bash
pontx completion generate --shell=bash | sudo tee /etc/bash_completion.d/pontx > /dev/null
```

2. 重新加载 shell 或运行：

```bash
source /etc/bash_completion.d/pontx
```

#### macOS (使用 Homebrew)

1. 安装 bash-completion (如果未安装)：

```bash
brew install bash-completion@2
```

2. 在 `~/.bash_profile` 或 `~/.bashrc` 中添加：

```bash
# Bash completion
[[ -r "/opt/homebrew/etc/profile.d/bash_completion.sh" ]] && . "/opt/homebrew/etc/profile.d/bash_completion.sh"

# Pontx completion
eval "$(pontx completion generate --shell=bash)"
```

3. 重新加载配置：

```bash
source ~/.bash_profile  # 或 source ~/.bashrc
```

### Fish

1. 生成补全脚本：

```bash
pontx completion generate --shell=fish > ~/.config/fish/completions/pontx.fish
```

2. 补全会自动生效，或重新加载 Fish：

```bash
source ~/.config/fish/config.fish
```

## 验证安装

安装完成后，测试补全是否工作：

```bash
# 输入以下命令然后按 Tab 键
pontx <TAB>              # 应该显示所有子命令
pontx call <TAB>         # 应该显示 API 路径补全
pontx call pet.<TAB>     # 在单 spec 模式下，补全 tag 下的 API
```

## 单 Spec 模式补全示例

当你的项目只有一个 spec 时，补全会自动使用简化格式：

### 有 Tags 的情况

```bash
pontx call <TAB>
# 显示所有 tags
# - pet
# - store
# - user

pontx call pet.<TAB>
# 显示 pet tag 下的 APIs
# - addPet
# - deletePet
# - findPetsByStatus
# - getPetById
# - updatePet
```

### 无 Tags 的情况

```bash
pontx call <TAB>
# 直接显示所有 APIs
# - getUser
# - createUser
# - deleteUser
# - updateUser
```

## 卸载

### 查看卸载说明

```bash
pontx completion uninstall
```

### 手动卸载

#### Zsh

从 `~/.zshrc` 中删除相关行：

```bash
# 删除这行
eval "$(pontx completion generate --shell=zsh)"
```

或删除补全文件：

```bash
rm ~/.zsh/completions/_pontx
```

#### Bash

删除补全文件：

```bash
# Ubuntu/Debian
sudo rm /etc/bash_completion.d/pontx

# macOS
# 从 ~/.bash_profile 或 ~/.bashrc 中删除相关行
```

#### Fish

删除补全文件：

```bash
rm ~/.config/fish/completions/pontx.fish
```

## 故障排查

### 补全不工作

1. **确认 pontx 在 PATH 中**

```bash
which pontx
```

如果没有找到，请确保 pontx 已正确安装并在 PATH 中。

2. **确认补全脚本已加载**

**Zsh:**

```bash
# 检查是否加载
type _pontx
# 应该显示 _pontx 是一个 shell 函数
```

**Bash:**

```bash
# 检查是否加载
type _pontx_completion
```

**Fish:**

```bash
# 检查补全文件
ls ~/.config/fish/completions/pontx.fish
```

3. **重新初始化补全系统**

**Zsh:**

```bash
# 删除补全缓存
rm ~/.zcompdump*
# 重新初始化
autoload -Uz compinit && compinit
```

**Bash:**

```bash
# 重新加载配置
source ~/.bashrc
```

**Fish:**

```bash
# 重新加载配置
source ~/.config/fish/config.fish
```

### 补全速度慢

补全系统使用了缓存机制（默认 60 秒 TTL），首次补全可能需要加载 spec 数据。后续补全会使用缓存，速度会明显提升。

如果补全一直很慢：

1. 检查项目是否有 `api-lock.json` 文件
2. 确认 `pontx.config.ts` 配置正确
3. 尝试运行 `pontx generate` 生成 SDK

### 单 Spec 模式未生效

确认项目配置：

1. 检查 `pontx.config.ts` 中只配置了一个 spec
2. 运行 `pontx ls` 查看有几个 spec
3. 确认 `api-lock.json` 文件存在

## 高级配置

### 自定义缓存时间

补全系统默认缓存 60 秒，如果你想调整：

编辑补全脚本，修改 `cacheTTL` 参数（目前需要在代码级别修改）。

### 调试补全

启用调试信息：

```bash
# Zsh
pontx completion --get-completions "pontx call pet." 2
```

这会显示补全引擎的输出，帮助你诊断问题。

## 补全功能特性

### 智能补全

- ✅ 自动检测单 spec 模式
- ✅ 根据是否有 tags 调整补全策略
- ✅ 支持点分隔格式 (`spec.tag.api`)
- ✅ 支持斜杠格式 (`spec/tag/api`)
- ✅ 支持引号包裹特殊字符 (`spec."tag-name"."api/name"`)

### 补全内容

1. **子命令**: call, gen, show-api, show-schema, search, etc.
2. **API 路径**:
   - Spec 名称
   - Tag 名称
   - API 名称
3. **选项**: --env, --debug, --output, etc.
4. **参数**: 根据 API 元数据补全参数名

### 性能优化

- ✅ 使用内存缓存（默认 60 秒 TTL）
- ✅ 只在需要时加载 spec 数据
- ✅ 异步加载，不阻塞 shell

## 相关命令

```bash
# 查看所有补全相关命令
pontx completion --help

# 生成补全脚本
pontx completion generate

# 查看安装说明
pontx completion install

# 查看卸载说明
pontx completion uninstall
```

## 注意事项

1. 补全需要在有 `pontx.config.ts` 的项目目录中才能正常工作
2. 首次补全会读取 `api-lock.json` 文件，确保已运行过 `pontx generate`
3. 修改 spec 配置后，补全缓存会在 60 秒后自动更新
4. 单 spec 模式的检测是实时的，切换项目会自动适应

## 更新补全脚本

当 pontx 升级后，建议重新生成补全脚本：

```bash
# Zsh (动态加载方式会自动更新)
source ~/.zshrc

# Zsh (文件方式)
pontx completion generate --shell=zsh > ~/.zsh/completions/_pontx
autoload -Uz compinit && compinit -f

# Bash
pontx completion generate --shell=bash | sudo tee /etc/bash_completion.d/pontx > /dev/null
source /etc/bash_completion.d/pontx

# Fish
pontx completion generate --shell=fish > ~/.config/fish/completions/pontx.fish
```

## 支持

如果遇到问题，请：

1. 查看本文档的故障排查部分
2. 检查 pontx 版本: `pontx --version`
