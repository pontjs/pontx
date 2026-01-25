# @pontx/nodejs-sdk

为 pontx 提供的 Node.js SDK，具有完整的 TypeScript 支持、API 校验、Mock 和重试功能。

## 环境要求

- Node.js >= 18.0.0（使用原生 `fetch` 和 `FormData`）

## 功能特性

- 完整的 TypeScript 支持和类型安全
- 原生 Node.js fetch API 集成（无外部依赖）
- 使用 Zod 进行请求/响应校验（可选的 peer 依赖）
- 内置重试逻辑，支持指数退避
- 请求/响应拦截器
- 用于测试的 Mock 服务器功能
- 双模块格式支持（ESM + CommonJS）

## 安装

```bash
npm install @pontx/nodejs-sdk
# 或
pnpm add @pontx/nodejs-sdk
# 或
yarn add @pontx/nodejs-sdk
```

### 可选：安装 Zod 进行校验

```bash
npm install zod
```

## 使用方法

即将推出...

## 开发

```bash
# 构建包
pnpm build

# 监听模式
pnpm watch

# 运行测试
pnpm test

# 监听模式运行测试
pnpm test:watch
```

## 许可证

MIT
