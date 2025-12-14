# Graceful Client

优雅的 API 客户端实现，提供更符合直觉的参数传递方式。

## 特性

1. **优雅的参数顺序**：path 参数 → query/body 合并参数 → 单独 body → requestInit
2. **类型安全**：完整的 TypeScript 类型推导
3. **自动参数映射**：自动处理 query 和 body 中的参数名冲突
4. **智能参数合并**：当 body 是 JSON 对象时，自动与 query 参数合并

## 文件结构

```
graceful-client/
├── index.ts           # 主实现文件
├── type.ts            # 类型定义
├── example.ts         # 使用示例
├── petstore/          # 示例 API 定义
│   ├── schemas.ts     # 数据模型
│   ├── apis.ts        # API 类型定义
│   ├── apiMeta.ts     # API 运行时元数据
│   └── index.ts       # 入口文件
└── README.md          # 本文件
```

## 使用方式

### 1. 创建客户端

```typescript
import { createGracefulClient } from './index';
import { apiMeta } from './petstore/apiMeta';
import type { APIs } from './petstore/apis';

const client = createGracefulClient<APIs>(apiMeta, {
  baseURL: 'https://petstore.swagger.io/v2',
  headers: {
    'Authorization': 'Bearer token',
  },
});
```

### 2. 调用 API

#### 场景 1: 只有 path 参数

```typescript
// GET /pet/{petId}
const pet = await client.pet.getPetById(123);
```

#### 场景 2: 只有 query 参数

```typescript
// GET /user/login?username=john&password=123
const token = await client.user.loginUser({
  username: 'john',
  password: '123456',
});
```

#### 场景 3: 只有 body 参数

```typescript
// PUT /pet
await client.pet.updatePet({
  id: 123,
  name: 'doggie',
  status: 'available',
});
```

#### 场景 4: path + body（不能合并，如 multipart/form-data）

```typescript
// POST /pet/{petId}/uploadImage
const formData = new FormData();
formData.append('file', file);

await client.pet.uploadFile(123, formData);
```

#### 场景 5: query + body 合并（有参数冲突）

```typescript
// POST /user/search?name=john&age=25
// Body: { name: "John Doe", city: "NYC" }

// 参数名冲突时自动加前缀
const users = await client.user.searchUser({
  query_name: 'john',      // query 中的 name
  age: 25,                 // query 中的 age
  body_name: 'John Doe',   // body 中的 name
  city: 'NYC',             // body 中的 city
});
```

#### 场景 6: 多个 path 参数

```typescript
// GET /user/{userId}/post/{postId}
const post = await client.user.getUserPost('user123', 456);
```

#### 场景 7: 带 requestInit 参数

```typescript
// 所有 API 都可以传入 requestInit
await client.pet.getPetById(123, {
  headers: {
    'X-Custom-Header': 'value',
  },
  signal: abortController.signal,
});
```

## API Meta 格式

```typescript
{
  "pet/getPetById": {
    method: "GET",
    path: "/pet/{petId}",
    pathParams: ["petId"],           // path 参数列表（按顺序）
    queryParams: null,               // query 参数列表
    bodyParams: null                 // body 元数据
  },

  "user/searchUser": {
    method: "POST",
    path: "/user/search",
    pathParams: null,
    queryParams: ["name", "age"],    // query 参数列表
    bodyParams: {
      contentType: "application/json",
      canMerge: true,                // 可以与 query 合并
      fields: ["name", "city"]       // body 字段列表
    },
    paramMapping: {                  // 参数名冲突时的映射关系
      query_name: { source: "query", field: "name" },
      body_name: { source: "body", field: "name" }
    }
  }
}
```

## API Types 格式

```typescript
export namespace user {
  /**
   * searchUser 的请求参数（query + body 合并）
   */
  export type SearchUserParams = {
    /** User name to search (from query) */
    query_name: string;
    /** User age (from query) */
    age?: number;
    /** Full name (from body) */
    body_name: string;
    /** City name (from body) */
    city?: string;
  };

  /**
   * POST /user/search
   * @summary Search users
   */
  export type searchUser = (
    params: SearchUserParams,
    requestInit?: RequestInit
  ) => Promise<Array<schemas.User>>;
}
```

## 实现原理

### 参数提取逻辑

1. **path 参数**：根据 `pathParams` 数组顺序，从 args 中依次提取
2. **query + body 合并**：
   - 当 `canMerge: true` 且同时有 query 和 body 时，从一个对象中提取
   - 根据 `paramMapping` 还原原始字段名
   - 根据 `queryParams` 和 `bodyParams.fields` 区分参数归属
3. **单独的 body**：当 `canMerge: false` 时（如 FormData），单独传递
4. **requestInit**：永远是最后一个可选参数

### URL 构建

1. 替换 path 中的参数：`/pet/{petId}` → `/pet/123`
2. 添加 query 参数：使用 `URLSearchParams`
3. 拼接完整 URL：`baseURL + path + queryString`

### 请求体序列化

- `application/json`：`JSON.stringify(body)`
- `application/x-www-form-urlencoded`：`URLSearchParams`
- `multipart/form-data`：直接传递（FormData/File/Blob）

## 优势

1. **类型安全**：完整的 TypeScript 类型推导和检查
2. **参数直观**：参数顺序符合直觉
3. **自动处理**：自动处理参数冲突和序列化
4. **IDE 友好**：完整的参数提示和文档
