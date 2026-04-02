---
"pontx": minor
---

# SDK CLI 多 origin 支持

## 主要改动

### 1. 支持多 origin 项目

SDK CLI 现在支持多 origin（多 spec）项目：
- 单 origin：保持向后兼容，命令在根级别注册
- 多 origin：每个 spec 作为子命令注册，如 `cli currency call tag api`

### 2. 构建产物格式

- 单 origin：生成 `api-lock.json`（向后兼容）
- 多 origin：每个 spec 生成 `{name}.api-lock.json`

### 3. context-adapter 优化

- `createSdkCliContext` 直接接受 PontxSpec 对象，避免重复读取文件

### 4. ExecuteApiConfig 支持自定义 fetchFn

- 允许 SDK CLI 复用时传入自定义的 fetch 函数
