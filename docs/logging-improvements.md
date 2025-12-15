# 日志系统改进

## 改进内容

### 1. 统一日志输出方案
- ✅ 所有日志信息输出到 **stderr**
- ✅ 数据输出（JSON、代码等）输出到 **stdout**
- ✅ 支持全局 `--debug` 选项控制日志级别

### 2. 关键修改

#### Logger 模块 (`src/logger.ts`)
```typescript
// 将所有日志输出改为 stderr
process.stderr.write(format(type, msg, options) + '\n');
```

#### CLI 入口 (`src/cli.ts`)
```typescript
// 添加全局 --debug 选项
const hasDebugFlag = process.argv.includes('--debug');
const logLevel = hasDebugFlag ? 'info' : 'error';
const ctx = createCliContext(rootDir, createLogger(logLevel));
```

#### Call 命令 (`src/commands/call.ts`)
```typescript
// 辅助信息输出到 stderr
if (logger) {
  logger.info(requestInfo);
} else {
  process.stderr.write(requestInfo + '\n');
}

// JSON 数据输出到 stdout
console.log(output);
```

## 使用示例

### 默认行为（只显示错误）
```bash
# 纯 JSON 输出，没有额外日志
pontx call aone.issueManagement.getIssueById --id 76010710

# 输出纯 JSON，可以直接用 jq 处理
pontx call aone.issueManagement.getIssueById --id 76010710 2>/dev/null | jq -r '.result.subject'
# 输出: DefaultPrivateZone 解析页面 翻页不显示"每页数量"
```

### 启用调试日志
```bash
# 显示详细信息（输出到 stderr）
pontx call aone.issueManagement.getIssueById --id 76010710 --debug
# stderr: Using global spec "aone" from @ali/aone-pontx-spec
# stdout: {...JSON 数据...}
```

### 管道使用（JSON 解析）
```bash
# 日志输出到 stderr，JSON 输出到 stdout
# 可以直接用 jq 处理
pontx call aone.issueManagement.getIssueById --id 76010710 | jq -r '.success'
# 输出: true

# 忽略日志信息，只处理 JSON
pontx call aone.issueManagement.getIssueById --id 76010710 2>/dev/null | jq .
```

### 保存输出
```bash
# JSON 保存到文件（默认无日志干扰）
pontx call aone.issueManagement.getIssueById --id 76010710 > result.json

# 完全静默保存
pontx call aone.issueManagement.getIssueById --id 76010710 2>/dev/null > result.json
```

## 测试验证

所有场景测试通过：✅

```bash
# 测试1: 纯 JSON 输出可以被 jq 解析
$ pontx call aone.issueManagement.getIssueById --id 76010710 2>/dev/null | jq -r '.result.subject'
✅ DefaultPrivateZone 解析页面 翻页不显示"每页数量"

# 测试2: 默认模式无日志干扰
$ pontx call aone.issueManagement.getIssueById --id 76010710 | jq -r '.success'
✅ true

# 测试3: Debug 模式日志到 stderr
$ pontx call aone.issueManagement.getIssueById --id 76010710 --debug
✅ stderr: Using global spec "aone" from @ali/aone-pontx-spec
✅ stdout: {...有效的 JSON...}

# 测试4: 保存 JSON 到文件
$ pontx call aone.issueManagement.getIssueById --id 76010710 > result.json
✅ 文件包含有效 JSON (12287 bytes)
```

## 日志级别说明

| 级别 | 用途 | 何时显示 |
|------|------|----------|
| `error` | 错误信息 | 总是显示 |
| `warn` | 警告信息 | 默认不显示，需要 `--debug` |
| `info` | 提示信息 | 默认不显示，需要 `--debug` |
| `silent` | 完全静默 | 内部使用 |

## 兼容性

- ✅ 与现有命令完全兼容
- ✅ 默认行为：只显示错误，输出干净的数据
- ✅ `--debug` 选项：显示详细日志（向后兼容之前的 `--debug` 行为）

## 影响的命令

- ✅ `call` - 纯 JSON 输出到 stdout
- ✅ `show-api` - 纯 JSON 输出到 stdout（已有正确实现）
- ✅ `show-schema` - 纯 JSON 输出到 stdout（已有正确实现）
- ✅ `gen` - 纯代码输出到 stdout（已有正确实现）
- ✅ `ls` - 纯数据输出到 stdout，提示信息到 stderr
- ✅ `check` - 检查结果日志输出到 stderr
- ✅ `service` - 服务日志输出到 stderr
