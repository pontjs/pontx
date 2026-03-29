# CLI 调用 API 工作流

本文档详细介绍如何通过 `pontx call` 命令直接调用 API。

## 概述

CLI Call Workflow 允许你直接通过命令行调用 API，无需生成 SDK 代码。适用于：

- 快速测试 API
- 调试接口问题
- 自动化脚本
- CI/CD 流程中的接口验证

## 完整工作流程

### Step 1: 探索可用 API

使用 `-h` 逐层探索命令结构，或用 `list` 命令查看资源。

```bash
# 查看所有可用命令和 spec
pontx -h

# 列出所有数据源
pontx list specs

# 列出所有 API 标签
pontx list tags

# 列出所有 API
pontx list apis

# 多 spec 时指定 spec
pontx mySpec list tags
pontx mySpec list apis

# 用 -h 逐层探索
pontx call -h            # 查看可用的 Tags
pontx call user -h       # 查看 user 标签下的所有 APIs
```

### Step 2: 搜索目标 API

```bash
# 关键词搜索
pontx search user

# 搜索创建类 API
pontx search "create"

# 限制搜索结果数量
pontx search user --max 10

# 多 spec 时在指定 spec 中搜索
pontx mySpec search user
```

### Step 3: 查看 API 元数据

两种方式查看 API 参数详情：

```bash
# 方式 1: 使用 show-api 命令
pontx show-api user info

# 方式 2: 使用 call -h（推荐，直接显示入参详情和示例）
pontx call user info -h

# 多 spec 时
pontx mySpec show-api user info
pontx mySpec call user info -h
```

输出包含：
- API 路径和 HTTP 方法
- 参数列表（名称、类型、是否必需、描述）
- 请求体结构
- 响应类型
- 示例请求

### Step 4: 调用 API

#### 4a. 预览请求（推荐先执行）

```bash
# 干运行模式 - 只预览不发送
pontx call user info --dry-run --id 123
```

输出内容：
- 完整的 HTTP 请求 URL
- HTTP 方法
- 请求头（Headers）
- 请求体（Body）
- **不会发送实际请求**

#### 4b. 发送请求

```bash
# GET 请求 - 路径/查询参数
pontx call user info --id 123

# 多个参数
pontx call user search --keyword "john" --page 1 --pageSize 20
```

#### 4c. POST/PUT 请求

```bash
# 使用 --body 传递 JSON
pontx call user create --body '{"name": "John", "email": "john@example.com"}'

# 更新请求
pontx call user update --id 123 --body '{"name": "Jane"}'
```

#### 4d. 从文件读取参数

```bash
# 创建参数文件
cat > params.json << 'EOF'
{
  "name": "John Doe",
  "email": "john@example.com",
  "profile": {
    "age": 30,
    "city": "Beijing"
  }
}
EOF

# 使用 @文件名 语法
pontx call user create --body @params.json
```

#### 4e. 添加请求头

```bash
# 添加自定义请求头
pontx call user info --id 123 \
  -H "Authorization: Bearer token123" \
  -H "X-Custom-Header: value"
```

#### 4f. 指定环境

```bash
# 使用 pontx.config.ts 中配置的环境
pontx call user info --id 123 --env dev
pontx call user info --id 123 --env prod
```

### Step 5: 处理响应

#### 输出到文件

```bash
pontx call user list -o result.json
```

#### 使用 JMESPath 筛选

```bash
# 只提取 data 字段
pontx call user list -q "data"

# 提取特定字段
pontx call user list -q "[].{Id: id, Name: name}"

# 条件筛选
pontx call user list -q "[?status=='active']"
```

## 命令参数参考

| 参数 | 简写 | 说明 |
|------|------|------|
| `--dry-run` | - | 仅预览请求，不实际发送 |
| `--body <json>` | - | 请求体（JSON 或 @文件名） |
| `--header <header>` | `-H` | 添加请求头（可多次使用） |
| `--output <path>` | `-o` | 输出结果到文件 |
| `--query <expr>` | `-q` | JMESPath 查询表达式 |
| `--env <env>` | `-e` | 指定环境配置 |
| `--debug` | - | 显示详细请求/响应信息 |
| `--use-remote` | - | 使用远程元数据 |

## 安全最佳实践

### 1. 总是先预览

```bash
# 先用 --dry-run 检查请求内容
pontx call order delete --id 123 --dry-run

# 确认无误后再执行
pontx call order delete --id 123
```

### 2. 验证参数格式

```bash
# 使用 -h 查看 API 需要的参数（推荐）
pontx call order delete -h

# 或使用 show-api
pontx show-api order delete

# 确认参数类型和必填项
```

### 3. 谨慎使用修改类操作

- `DELETE` - 删除数据，不可恢复
- `PUT` - 覆盖更新
- `POST` - 创建新数据
- `PATCH` - 部分更新

建议：修改类操作前先在测试环境验证。

### 4. 保护认证凭证

```bash
# 使用环境变量
export API_TOKEN="your-secret-token"

# 在 pontx.config.ts 中配置 beforeRequest 钩子
# 而不是在命令行中硬编码 token
```

### 5. 生产环境谨慎操作

```bash
# 明确指定环境
pontx call user delete --id 123 --env dev  # 开发环境
# pontx call user delete --id 123 --env prod  # 生产环境（谨慎！）
```

## 常见问题

### Q: 如何调试请求失败？

```bash
# 使用 --debug 查看详细信息
pontx call user info --id 123 --debug
```

### Q: 如何处理复杂的嵌套参数？

使用文件传递：

```bash
cat > complex-params.json << 'EOF'
{
  "filters": {
    "status": ["active", "pending"],
    "dateRange": {
      "start": "2024-01-01",
      "end": "2024-12-31"
    }
  },
  "pagination": {
    "page": 1,
    "size": 20
  }
}
EOF

pontx call report generate --body @complex-params.json
```

### Q: 如何在脚本中使用？

```bash
#!/bin/bash

# 获取用户列表并提取 ID
USER_IDS=$(pontx call user list -q "[].id" | jq -r '.[]')

# 遍历处理
for id in $USER_IDS; do
  echo "Processing user: $id"
  pontx call user process --id "$id"
done
```

## 相关文档

- [项目初始化](./project-init.md)
- [配置文件详解](./pontx-config.md)
- [CLI 命令参考](./cli-commands.md)
