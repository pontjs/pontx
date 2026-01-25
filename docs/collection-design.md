# Pontx Collection 设计方案（最终版）

## 配置文件层次结构

```
pontx.config.ts                  # 全局配置
  ├── executeApi                 # API 执行配置（Auth、baseURL 等）
  └── collections                # Collection 配置
      ├── dir: './collections'   # Collection 目录
      └── variables              # 全局变量

collections/
  ├── environments/              # 环境配置目录（独立）
  │   ├── dev.yaml              # 开发环境
  │   ├── test.yaml             # 测试环境
  │   └── prod.yaml             # 生产环境
  │
  └── workflows/                 # Collection 目录（业务流程）
      ├── petstore-purchase.yaml
      ├── user-registration.yaml
      └── order-management.yaml
```

## 设计原则

**关注点分离：**
1. **pontx.config.ts** - 全局配置（Auth、插件等）
2. **environments/*.yaml** - 环境变量和通用参数
3. **workflows/*.yaml** - 业务场景和 API 调用流程

## 1. 全局配置（pontx.config.ts）

```typescript
// pontx.config.ts
export default defineConfig({
  specs: [
    { name: 'petstore', url: 'https://api.example.com/swagger.json' }
  ],

  // API 执行配置（Auth 在这里统一配置）
  executeApi: {
    baseURL: 'https://api.example.com',
    environments: {
      dev: { baseURL: 'https://dev-api.example.com' },
      test: { baseURL: 'https://test-api.example.com' },
      prod: { baseURL: 'https://api.example.com' }
    },
    beforeRequest: async (request) => {
      // 统一的认证逻辑
      const token = await getAuthToken();
      request.init.headers = {
        ...request.init.headers,
        'Authorization': `Bearer ${token}`
      };
      return request;
    }
  },

  // Collection 配置
  collections: {
    // Collection 文件目录
    dir: './collections/workflows',

    // 环境配置目录
    environmentsDir: './collections/environments',

    // 全局变量（可选，跨所有 collection 和环境）
    globalVariables: {
      projectId: 'my-project',
      version: 'v1'
    }
  }
});
```

## 2. 环境配置（独立文件）

### 2.1 开发环境

```yaml
# collections/environments/dev.yaml
name: Development Environment

# 环境变量
variables:
  # 从系统环境变量读取
  apiKey: ${env.DEV_API_KEY}
  userId: ${env.DEV_USER_ID}

  # 静态配置
  debug: true
  timeout: 30000
  defaultStatus: available
  defaultQuantity: 1

# 默认参数（所有请求自动应用）
defaults:
  # 通用参数自动绑定
  params:
    apiKey: "{{apiKey}}"
    userId: "{{userId}}"
    debug: "{{debug}}"

  # 通用 headers
  headers:
    X-Debug: "true"
    X-Environment: dev

# 参数模板（可选，供 Collection 引用）
templates:
  pagination:
    page: 1
    pageSize: 10

  standardHeaders:
    Content-Type: application/json
    Accept: application/json
```

### 2.2 生产环境

```yaml
# collections/environments/prod.yaml
name: Production Environment

variables:
  apiKey: ${env.PROD_API_KEY}
  userId: ${env.PROD_USER_ID}
  debug: false
  timeout: 5000
  defaultStatus: available
  defaultQuantity: 1

defaults:
  params:
    apiKey: "{{apiKey}}"
    userId: "{{userId}}"
    debug: "{{debug}}"

  headers:
    X-Debug: "false"
    X-Environment: prod

templates:
  pagination:
    page: 1
    pageSize: 20  # 生产环境更大的分页
```

## 3. Collection 文件（业务流程）

### 示例 1：纯粹的业务流程

```yaml
# collections/workflows/petstore-purchase.yaml
name: Petstore Purchase Workflow

# Collection 特定变量（业务相关）
variables:
  petName: Fluffy
  petId: 0
  orderId: 0

# 业务流程
requests:
  - name: Create Pet
    api: petstore.pet.addPet
    params:
      body:
        name: "{{petName}}"
        photoUrls: []
        status: "{{defaultStatus}}"  # 从环境配置自动获取
    save:
      petId: response.id

  - name: Upload Pet Image
    api: petstore.pet.uploadFile
    dependsOn: Create Pet
    params:
      petId: "{{petId}}"
      additionalMetadata: Pet photo
      file: ./test-data/pet.jpg

  - name: Place Order
    api: petstore.store.placeOrder
    dependsOn: Create Pet
    params:
      body:
        petId: "{{petId}}"
        quantity: "{{defaultQuantity}}"  # 从环境配置自动获取
        status: placed
    save:
      orderId: response.id

  - name: Get Order Status
    api: petstore.store.getOrderById
    dependsOn: Place Order
    params:
      orderId: "{{orderId}}"
```

**注意：**
- ✅ 不需要定义 `apiKey`、`userId`（由环境配置提供）
- ✅ 不需要定义 `defaults`（由环境配置提供）
- ✅ 只关注业务流程和场景

### 示例 2：使用环境模板

```yaml
# collections/workflows/user-list.yaml
name: User List with Pagination

variables:
  searchKeyword: ""
  currentPage: 1

requests:
  - name: Get User List
    api: petstore.user.getUserList
    params:
      keyword: "{{searchKeyword}}"
      # 使用环境配置中的 pagination 模板
      page: "{{currentPage}}"
      pageSize: "{{templates.pagination.pageSize}}"  # 从环境模板获取
```

## CLI 使用

### 运行 Collection（指定环境）

```bash
# 使用开发环境
pontx collection run petstore-purchase --env dev
# 等价于：加载 collections/environments/dev.yaml

# 使用生产环境
pontx collection run petstore-purchase --env prod
# 等价于：加载 collections/environments/prod.yaml

# 覆盖环境变量
pontx collection run petstore-purchase --env dev \
  --var petName="Lucky Dog" \
  --var defaultQuantity=2

# 使用自定义环境文件
pontx collection run petstore-purchase --env-file ./my-custom-env.yaml
```

### 管理环境配置

```bash
# 列出所有环境
pontx collection envs

# 输出：
# Available environments:
#   dev   - Development Environment
#   test  - Test Environment
#   prod  - Production Environment

# 查看环境变量
pontx collection env dev --show-vars

# 输出：
# Environment: dev
# Variables:
#   apiKey: *** (hidden)
#   userId: 123
#   debug: true
#   defaultStatus: available
#   defaultQuantity: 1

# 验证环境配置
pontx collection env dev --validate

# 创建新环境
pontx collection env create staging
```

## 配置加载顺序

```
1. 全局配置（pontx.config.ts）
   └── collections.globalVariables

2. 环境配置（environments/{env}.yaml）
   ├── variables
   └── defaults

3. Collection 配置（workflows/{name}.yaml）
   └── variables

4. 命令行参数（--var）
   └── 覆盖所有配置
```

### 优先级示例

```yaml
# pontx.config.ts
collections: {
  globalVariables: {
    timeout: 5000
  }
}

# environments/dev.yaml
variables:
  timeout: 10000  # 覆盖全局

# workflows/my-collection.yaml
variables:
  timeout: 15000  # 覆盖环境

# 命令行
--var timeout=20000  # 覆盖所有（最高优先级）
```

## 变量作用域

| 变量类型 | 定义位置 | 作用域 | 用途 |
|---------|---------|--------|------|
| **全局变量** | pontx.config.ts | 所有环境、所有 Collection | 项目级别配置（如 projectId） |
| **环境变量** | environments/*.yaml | 当前环境的所有 Collection | 环境相关配置（如 apiKey） |
| **Collection 变量** | workflows/*.yaml | 当前 Collection | 业务场景变量（如 petId） |
| **命令行变量** | --var | 运行时覆盖 | 临时测试 |

## 实际项目结构示例

```
my-project/
├── pontx.config.ts                    # 全局配置（Auth、插件）
├── .env.dev                           # 环境变量文件（不提交 Git）
├── .env.prod
│
├── collections/
│   ├── environments/                  # 环境配置（提交 Git）
│   │   ├── dev.yaml                  # 开发环境配置
│   │   ├── test.yaml                 # 测试环境配置
│   │   ├── staging.yaml              # 预发环境配置
│   │   └── prod.yaml                 # 生产环境配置
│   │
│   └── workflows/                     # Collection 业务流程（提交 Git）
│       ├── pet/
│       │   ├── pet-crud.yaml         # 宠物增删改查
│       │   └── pet-purchase.yaml     # 宠物购买流程
│       ├── user/
│       │   ├── user-registration.yaml
│       │   └── user-profile.yaml
│       └── order/
│           ├── order-create.yaml
│           └── order-query.yaml
│
└── src/
    └── api/                           # 生成的 API 代码
```

## 环境变量文件（.env.dev）

```bash
# .env.dev（不提交到 Git）
DEV_API_KEY=secret-dev-key-123
DEV_USER_ID=dev-user-456

# .env.prod（不提交到 Git）
PROD_API_KEY=secret-prod-key-789
PROD_USER_ID=prod-user-012
```

## 最佳实践

### 1. 敏感信息管理

```yaml
# ✅ 推荐：从环境变量读取
# environments/prod.yaml
variables:
  apiKey: ${env.PROD_API_KEY}  # 从 .env.prod 读取
  userId: ${env.PROD_USER_ID}

# ❌ 不推荐：硬编码敏感信息
variables:
  apiKey: "secret-key-123"  # 不要这样做！
```

### 2. 环境隔离

```bash
# 开发环境
export ENV=dev
pontx collection run petstore-purchase --env dev

# 生产环境（使用不同的 .env 文件）
export ENV=prod
pontx collection run petstore-purchase --env prod
```

### 3. 团队协作

```gitignore
# .gitignore
.env.*              # 环境变量文件不提交
!.env.example       # 但提交示例文件
```

```bash
# .env.example（提交到 Git）
DEV_API_KEY=your-dev-api-key-here
DEV_USER_ID=your-dev-user-id-here
```

### 4. 环境配置复用

```yaml
# environments/_base.yaml（基础配置）
variables:
  defaultTimeout: 10000
  defaultPageSize: 20

templates:
  pagination: &pagination
    page: 1
    pageSize: "{{defaultPageSize}}"

# environments/dev.yaml（继承基础配置）
extends: ./_base.yaml

variables:
  apiKey: ${env.DEV_API_KEY}
  # defaultTimeout 继承自 _base.yaml

# environments/prod.yaml
extends: ./_base.yaml

variables:
  apiKey: ${env.PROD_API_KEY}
  defaultTimeout: 5000  # 覆盖基础配置
```

## 对比总结

### 之前的方案（问题）

```yaml
# ❌ 每个 Collection 都要写 defaults
# collections/petstore-purchase.yaml
defaults:
  params:
    apiKey: "{{apiKey}}"
    userId: "{{userId}}"

# collections/user-registration.yaml
defaults:
  params:
    apiKey: "{{apiKey}}"  # 重复！
    userId: "{{userId}}"  # 重复！
```

### 新方案（清晰）

```yaml
# ✅ 环境配置独立
# collections/environments/dev.yaml
defaults:
  params:
    apiKey: "{{apiKey}}"
    userId: "{{userId}}"

# ✅ Collection 只关注业务
# collections/workflows/petstore-purchase.yaml
requests:
  - name: Create Pet
    params:
      body:
        name: Fluffy
        # apiKey 和 userId 自动从环境配置获取
```

## 优势

1. **关注点分离**
   - ✅ 环境配置 vs 业务流程分离
   - ✅ Collection 文件更简洁

2. **易于维护**
   - ✅ 修改环境配置不影响 Collection
   - ✅ 新增环境只需新建一个文件

3. **团队协作**
   - ✅ 环境配置可以提交 Git
   - ✅ 敏感信息在 .env 文件中（不提交）

4. **灵活切换**
   - ✅ 一条命令切换环境：`--env dev/test/prod`
   - ✅ 支持自定义环境文件
