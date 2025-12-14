# Graceful Client 入参设计

## 概述

Graceful Client 提供了一种优雅的 API 调用方式，通过智能的参数处理和合并策略，简化了 API 调用的复杂度。

## 核心设计原则

### 1. 参数顺序规则

API 方法的参数按照以下顺序排列：

```typescript
methodName(
  pathParam1,           // 1. Path 参数（按路径中出现顺序）
  pathParam2,
  params,               // 2. Query + Body 合并参数（条件性）
  body,                 // 3. 独立 Body 参数（条件性）
  requestInit?          // 4. RequestInit（可选，始终最后）
)
```

### 2. 参数分类

#### Path 参数
- **位置**：最前面，按照路径中 `{param}` 出现的顺序
- **必需性**：通常为必需参数
- **示例**：`/pet/{petId}` → `petId` 参数

```typescript
getPetById(
  petId: number,
  requestInit?: RequestInit
) => Promise<Pet>
```

#### Query 参数
- **位置**：通过 `params` 对象传递
- **类型**：对象，包含所有查询参数
- **示例**：`/pet/findByStatus?status=available`

```typescript
findPetsByStatus(
  params: { status: Array<'available' | 'pending' | 'sold'> },
  requestInit?: RequestInit
) => Promise<Pet[]>
```

#### Body 参数

Body 参数的处理分为三种情况：

##### 情况 1：可合并的 JSON Body

当同时满足以下条件时，Query 和 Body 参数会合并到一个 `params` 对象中：
- `Content-Type` 为 `application/json`
- Body schema 类型为 `object`
- 有 Query 参数存在

```typescript
// 原始定义：Query(username, password) + Body(user object)
// 合并后
updateUser(
  username: string,                    // Path 参数
  params: {
    // Query 参数
    notify?: boolean,
    // Body 参数（来自 user object 的字段）
    email?: string,
    firstName?: string,
    lastName?: string,
  },
  requestInit?: RequestInit
) => Promise<User>
```

##### 情况 2：不可合并的 Body

以下情况 Body 作为独立参数：
- `Content-Type` 不是 `application/json`（如 `multipart/form-data`, `application/x-www-form-urlencoded`）
- Body 不是 object 类型（如数组、字符串）
- 只有 Body 没有 Query 参数

**示例 1：FormData**
```typescript
uploadFile(
  petId: number,
  body: {
    additionalMetadata?: string,
    file?: File
  },
  requestInit?: RequestInit
) => Promise<ApiResponse>
```

**示例 2：Array Body**
```typescript
createUsersWithListInput(
  body: Array<User>,
  requestInit?: RequestInit
) => Promise<void>
```

**示例 3：form-urlencoded**
```typescript
updatePetWithForm(
  petId: number,
  body: {
    name?: string,
    status?: string
  },
  requestInit?: RequestInit
) => Promise<void>
```

##### 情况 3：仅 JSON Body（无 Query）

当只有 Body 参数且为 JSON object 时，body 字段会被展开到 `params` 对象：

```typescript
// 不展开（保持独立 body）
updatePet(
  body: Pet,
  requestInit?: RequestInit
) => Promise<void>
```

### 3. 参数类型定义

参数类型使用 `declare namespace` 组织，命名规则为 `{Controller}{Method}Params` 或 `{Controller}{Method}Body`：

```typescript
export declare namespace user {
  // Query + 可合并 Body 的参数类型
  export type UserLoginParams = {
    /** The user name for login */
    username: string;
    /** The password for login in clear text */
    password: string;
  };
}

export declare namespace pet {
  // FormData Body 的类型
  export type PetUploadFileBody = {
    /** Additional data to pass to server */
    additionalMetadata?: string;
    /** file to upload */
    file?: File;
  };
}
```

## 参数处理流程

### 1. 参数提取（extractParams）

`extractParams` 函数负责将调用时的参数数组解析为结构化的参数对象：

```typescript
function extractParams(args: any[], meta: GracefulApiMeta): {
  pathParams: Record<string, any>;
  queryParams: Record<string, any>;
  bodyParams: any;
  requestInit?: RequestInit;
}
```

**处理步骤：**

1. **提取 Path 参数**
   ```typescript
   if (meta.pathParams && meta.pathParams.length > 0) {
     meta.pathParams.forEach((paramName) => {
       result.pathParams[paramName] = args[argIndex++];
     });
   }
   ```

2. **判断参数合并策略**
   ```typescript
   const hasQuery = meta.queryParams && meta.queryParams.length > 0;
   const hasBody = meta.bodyParams !== null;
   const canMerge = meta.bodyParams?.canMerge ?? false;
   ```

3. **根据策略提取参数**
   - **Query + Body 合并**：从单个 `params` 对象中分离
   - **仅 Query**：提取 query 参数对象
   - **独立 Body**：提取 body 参数

4. **提取 RequestInit**
   ```typescript
   if (argIndex < args.length) {
     result.requestInit = args[argIndex];
   }
   ```

### 2. URL 构建（buildRequestUrl）

复用 `core/build-url.ts` 的功能：

```typescript
function buildRequestUrl(
  baseURL: string,
  path: string,
  pathParams: Record<string, any>,
  queryParams: Record<string, any>,
): string {
  // 1. 合并 path 和 query 参数
  const allParams = { ...pathParams, ...queryParams };

  // 2. 使用 core 的 buildUrl 构建路径（替换 {param} + 添加查询字符串）
  const pathWithQuery = buildUrl(path, allParams);

  // 3. 拼接 baseURL
  return new URL(pathWithQuery, baseURL).toString();
}
```

**buildUrl 功能**：
- 替换路径中的 `{param}` 为实际值（经过 URL 编码）
- 将剩余参数作为 query string 添加
- 处理数组参数（重复 key）
- 处理对象参数（JSON 序列化）

### 3. Body 序列化（serializeBody）

复用 `core/request-body.ts` 的序列化功能：

```typescript
function serializeBody(body: any, contentType: string): any {
  if (body === null || body === undefined) {
    return undefined;
  }

  return serializeRequestBody(body, contentType as ContentType);
}
```

**支持的 Content-Type**：

#### application/json
```typescript
// 自动 JSON.stringify
{ name: "Fluffy", status: "available" }
// → '{"name":"Fluffy","status":"available"}'
```

#### application/x-www-form-urlencoded
```typescript
// 转换为 URLSearchParams
{ name: "Fluffy", status: "available" }
// → 'name=Fluffy&status=available'
```

#### multipart/form-data
```typescript
// 转换为 FormData
{
  additionalMetadata: "Pet photo",
  file: fileObject
}
// → FormData {
//      additionalMetadata: "Pet photo",
//      file: File
//    }
```

**FormData 处理细节**：
- File/Blob 对象直接 append
- 数组字段：每个元素单独 append（同 key）
- 对象字段：JSON.stringify 后 append
- 基本类型：String() 后 append
- null/undefined：跳过

## 参数冲突处理

### 问题场景

当 Query 参数和 Body 参数有同名字段时，需要通过 `paramMapping` 解决冲突：

```typescript
// 假设 API 有：
// Query: { name: string }
// Body: { name: string, age: number }

// 生成时添加前缀
export type UserUpdateParams = {
  query_name: string;   // 原 query.name
  body_name: string;    // 原 body.name
  age: number;
};
```

### 参数映射元数据

```typescript
{
  paramMapping: {
    "query_name": { source: "query", field: "name" },
    "body_name": { source: "body", field: "name" }
  }
}
```

### 运行时还原

`extractParams` 根据 `paramMapping` 将带前缀的字段还原：

```typescript
if (meta.paramMapping) {
  Object.entries(mergedParams).forEach(([key, value]) => {
    const mapping = meta.paramMapping![key];
    if (mapping) {
      if (mapping.source === 'query') {
        result.queryParams[mapping.field] = value;
      } else {
        result.bodyParams[mapping.field] = value;
      }
    }
  });
}
```

## 完整调用示例

### 示例 1：Path + Query

```typescript
// API 定义
findPetsByStatus(
  params: pet.PetFindPetsByStatusParams,
  requestInit?: RequestInit
) => Promise<Pet[]>

// 调用
const pets = await client.pet.findPetsByStatus({
  status: ['available', 'pending']
});

// 生成请求
// GET /pet/findByStatus?status=available&status=pending
```

### 示例 2：Path + FormData Body

```typescript
// API 定义
uploadFile(
  petId: number,
  body: pet.PetUploadFileBody,
  requestInit?: RequestInit
) => Promise<ApiResponse>

// 调用
const response = await client.pet.uploadFile(
  123,
  {
    additionalMetadata: "My pet photo",
    file: fileFromInput
  }
);

// 生成请求
// POST /pet/123/uploadImage
// Content-Type: multipart/form-data
// Body: FormData { additionalMetadata, file }
```

### 示例 3：Path + Query + JSON Body 合并

```typescript
// API 定义（假设）
updateUser(
  username: string,
  params: user.UserUpdateParams,
  requestInit?: RequestInit
) => Promise<User>

// 类型定义
export type UserUpdateParams = {
  // Query 参数
  notify?: boolean;
  // Body 参数（JSON object 展开）
  email?: string;
  firstName?: string;
  lastName?: string;
}

// 调用
const user = await client.user.updateUser(
  'john',
  {
    notify: true,      // → query
    email: 'new@example.com',   // → body
    firstName: 'John'   // → body
  }
);

// 生成请求
// PUT /user/john?notify=true
// Content-Type: application/json
// Body: {"email":"new@example.com","firstName":"John"}
```

### 示例 4：仅 Body（Array）

```typescript
// API 定义
createUsersWithListInput(
  body: Array<User>,
  requestInit?: RequestInit
) => Promise<void>

// 调用
await client.user.createUsersWithListInput([
  { username: 'user1', email: 'user1@example.com' },
  { username: 'user2', email: 'user2@example.com' }
]);

// 生成请求
// POST /user/createWithList
// Content-Type: application/json
// Body: [{"username":"user1",...},{"username":"user2",...}]
```

## API Meta 结构

运行时使用的元数据结构（apiMeta.ts）：

```typescript
export const apiMeta = {
  name: "Swagger Petstore",
  url: [{ url: "petstore.swagger.io/v2" }],
  apis: {
    "pet/uploadFile": {
      method: "POST",
      path: "/pet/{petId}/uploadImage",
      pathParams: ["petId"],
      queryParams: null,
      bodyParams: {
        contentType: "multipart/form-data",
        canMerge: false
      }
    },
    "user/loginUser": {
      method: "GET",
      path: "/user/login",
      pathParams: null,
      queryParams: ["username", "password"],
      bodyParams: null
    }
  }
} as const;
```

### 字段说明

- **method**: HTTP 方法
- **path**: API 路径模板（包含 `{param}`）
- **pathParams**: Path 参数名称数组（按顺序）
- **queryParams**: Query 参数名称数组
- **bodyParams**: Body 参数配置
  - **contentType**: Content-Type 头
  - **canMerge**: 是否可与 Query 合并
  - **fields**: Body 对象的字段列表（可选，用于合并时判断）
- **paramMapping**: 参数冲突映射（可选）

## 类型安全

### 生成的类型定义（apis.ts）

```typescript
export declare namespace pet {
  export type PetFindPetsByStatusParams = {
    /** Status values that need to be considered for filter */
    status: Array<'available' | 'pending' | 'sold'>;
  };

  export type PetUploadFileBody = {
    /** Additional data to pass to server */
    additionalMetadata?: string;
    /** file to upload */
    file?: File;
  };
}

export type pet = {
  /**
   * uploads an image
   *
   * @example
   * ```ts
   * // TODO: Add example
   * ```
   */
  uploadFile: (
    /** ID of pet to update */
    petId: number,
    body: pet.PetUploadFileBody,
    requestInit?: RequestInit,
  ) => Promise<schemas.ApiResponse>;

  /**
   * Finds Pets by status
   *
   * Multiple status values can be provided with comma separated strings
   *
   * @example
   * ```ts
   * // TODO: Add example
   * ```
   */
  findPetsByStatus: (
    params: pet.PetFindPetsByStatusParams,
    requestInit?: RequestInit,
  ) => Promise<Array<schemas.Pet>>;
};

export type APIs = {
  /** pet 模块 */
  pet: pet;
  /** store 模块 */
  store: store;
  /** user 模块 */
  user: user;
};

export declare namespace APIs {
  export { pet };
  export { store };
  export { user };
}
```

### TypeScript 类型推导

```typescript
// 创建客户端
const client = createGracefulClient<APIs>(apiMeta, { baseURL: '...' });

// 完整的类型推导和智能提示
client.pet.uploadFile(
  123,                    // ✓ petId: number
  {
    additionalMetadata: "...",  // ✓ string
    file: fileObj               // ✓ File
  },
  { headers: { ... } }    // ✓ RequestInit
);

// 编译时错误检查
client.pet.uploadFile(
  "123",  // ✗ 类型错误：应为 number
  {}      // ✗ 缺少必需字段
);
```

## 设计优势

### 1. 参数简化
- 自动合并相关参数，减少函数参数数量
- 智能判断是否合并，避免类型不兼容问题

### 2. 类型安全
- 完整的 TypeScript 类型定义
- IDE 智能提示和自动完成
- 编译时参数验证

### 3. 灵活性
- 支持多种 Content-Type
- 处理各种参数组合
- 可扩展的参数映射机制

### 4. 代码复用
- 复用 `core/build-url.ts` 的 URL 构建逻辑
- 复用 `core/request-body.ts` 的序列化逻辑
- 统一的参数处理流程

### 5. 符合直觉
- 参数顺序符合自然思维（path → params → body → options）
- 命名清晰（params 表示参数对象，body 表示请求体）
- 与 RESTful 规范一致

## 扩展点

### 1. 自定义序列化

可以通过 RequestInit 传入自定义 body：

```typescript
client.pet.updatePet(
  customSerializedBody,
  {
    headers: { 'Content-Type': 'application/xml' }
  }
);
```

### 2. 请求拦截

通过包装 fetch 函数实现：

```typescript
const client = createGracefulClient<APIs>(apiMeta, {
  baseURL: '...',
  fetch: async (url, init) => {
    // 请求前处理
    console.log('Request:', url, init);
    const response = await fetch(url, init);
    // 响应后处理
    return response;
  }
});
```

### 3. 全局 Headers

```typescript
const client = createGracefulClient<APIs>(apiMeta, {
  baseURL: '...',
  headers: {
    'Authorization': 'Bearer token',
    'X-Custom-Header': 'value'
  }
});
```

## 参考实现

- **核心实现**: `src/client/graceful-client/index.ts`
- **代码生成器**: `plugin/generator/`
- **URL 构建**: `src/core/build-url.ts`
- **Body 序列化**: `src/core/request-body.ts`
- **类型定义**: `src/types/`
