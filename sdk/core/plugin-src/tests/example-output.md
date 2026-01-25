# Path Params Order 修复示例

## 问题描述

当 API 的 path 中存在多个 path 参数（如 `/api/{userId}/posts/{postId}`），且 `parameters` 数组中的顺序与 path 中的顺序不一致时，生成的代码应该以 path 中的顺序为准。

## 修复前的问题

假设有以下 API 定义：

```typescript
{
  path: "/api/{userId}/posts/{postId}",
  method: "GET",
  parameters: [
    { name: "postId", in: "path", required: true, schema: { type: "string" } },
    { name: "userId", in: "path", required: true, schema: { type: "string" } }
  ]
}
```

注意：`parameters` 数组中 `postId` 在前，`userId` 在后，与 path 中的顺序相反。

### 修复前生成的代码

**apiMeta.ts:**
```typescript
pathParams: ["postId", "userId"]  // 错误：按照 parameters 数组顺序
```

**apis.ts:**
```typescript
getUserPosts: (
  postId: string,  // 错误：按照 parameters 数组顺序
  userId: string,
  requestInit?: RequestInit,
) => Promise<any>;
```

## 修复后的效果

### 修复后生成的代码

**apiMeta.ts:**
```typescript
pathParams: ["userId", "postId"]  // 正确：按照 path 中的顺序
```

**apis.ts:**
```typescript
getUserPosts: (
  userId: string,  // 正确：按照 path 中的顺序
  postId: string,
  requestInit?: RequestInit,
) => Promise<any>;
```

## 实现原理

添加了 `extractPathParamsOrder` 函数，从 path 中提取参数名称并保持顺序：

```typescript
function extractPathParamsOrder(path: string): string[] {
  const regex = /\{([^}]+)\}/g;
  const params: string[] = [];
  let match;
  while ((match = regex.exec(path)) !== null) {
    params.push(match[1]);
  }
  return params;
}
```

该函数会按照参数在 path 中出现的顺序返回参数名称数组，然后在生成代码时使用这个顺序。

## 测试覆盖

已添加两个测试用例：

1. **两个参数的情况**：测试 `/api/{userId}/posts/{postId}`
2. **三个或更多参数的情况**：测试 `/api/{orgId}/projects/{projectId}/resources/{resourceId}`

所有测试均通过 ✅
