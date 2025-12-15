# Global Spec Registry Design

## Overview

支持将第三方 spec 包全局安装后注册到 pontx，在任意目录下直接使用这些 spec，无需在每个项目中重复配置。

## Core Concepts

### 第三方 Spec 包

一个独立的 npm 包，内部包含完整的 `pontx.config.ts`，可独立运行 pontx 命令。

**约束：一个全局 spec 包只能包含一个 spec。**

```
@myorg/petstore-spec/
├── package.json
├── pontx.config.ts      # 必须，且只能配置一个 spec
├── src/
│   └── services/        # 生成的代码（可选）
└── pontx-lock.json      # 元数据缓存（可选）
```

### 全局注册

在用户级别（`~/.pontx/`）维护注册表，记录已安装的第三方 spec 包位置。

### Spec 自动查找

对于指定 specName 的命令，按优先级查找：本地项目 → 全局注册。

---

## Global Config File

**Location**: `~/.pontx/config.json`

```json
{
  "version": "1.0",
  "globalSpecs": {
    "@myorg/petstore-spec": {
      "path": "/usr/local/lib/node_modules/@myorg/petstore-spec",
      "specName": "petstore",
      "registeredAt": "2024-01-15T10:30:00Z"
    },
    "@myorg/user-api": {
      "path": "/home/user/.nvm/versions/node/v18/lib/node_modules/@myorg/user-api",
      "specName": "user-api",
      "registeredAt": "2024-01-16T14:20:00Z"
    }
  }
}
```

### Fields

Key 为 `packageName`（npm 包名）。

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `path` | string | ✓ | spec 包的绝对路径（包含 pontx.config.ts） |
| `specName` | string | ✓ | 该包的 spec 名称（只能有一个） |
| `registeredAt` | string | | 注册时间（ISO 8601） |

---

## CLI Commands

### Global Management Commands

#### `pontx global add-spec <package>`

注册一个全局 spec 包。

**Arguments**:
- `<package>`: npm 包名或本地路径

**Flow**:
1. 解析 package 参数
   - 路径（以 `/` 或 `.` 开头）→ 验证路径存在
   - 包名 → 通过 `npm root -g` 找到全局 node_modules 拼接路径
2. 验证 `pontx.config.ts` 存在
3. 加载 pontx.config.ts，验证只有一个 spec，提取 specName
4. 读取 package.json 获取 packageName
5. 以 packageName 为 key 写入 `~/.pontx/config.json`

**Examples**:
```bash
# 从全局 npm 包注册
pontx global add-spec @myorg/petstore-spec

# 从本地路径注册（将使用 package.json 中的 name 作为 key）
pontx global add-spec /path/to/my-spec
```

#### `pontx global list-specs`

列出所有已注册的全局 spec。

**Output**:
```
Global Specs:

  PACKAGE                  SPEC NAME      PATH
  @myorg/petstore-spec     petstore       /usr/local/lib/node_modules/...
  @myorg/user-api          user-api       /usr/local/lib/node_modules/...
```

#### `pontx global remove-spec <package>`

移除全局 spec 注册（不删除实际文件）。

**Arguments**:
- `<package>`: npm 包名（即注册时的 key）

**Examples**:
```bash
pontx global remove-spec @myorg/petstore-spec
```

#### `pontx global spec-info <package>`

查看某个全局 spec 的详细信息。

**Arguments**:
- `<package>`: npm 包名

**Output**:
```
Package:     @myorg/petstore-spec
Spec Name:   petstore
Path:        /usr/local/lib/node_modules/@myorg/petstore-spec
Registered:  2024-01-15 10:30:00
URL:         https://petstore.swagger.io/v2/swagger.json
```

---

## Spec Auto-Discovery

### Command Categories

#### Commands with Smart Fallback (auto-discovery)

这些命令包含 specName，自动按 本地 → 全局 顺序查找：

| Command | Path Format |
|---------|-------------|
| `pontx call <apiPath>` | `specName.tagName.apiName` |
| `pontx show-api <apiPath>` | `specName.tagName.apiName` |
| `pontx show-schema <schemaPath>` | `specName/schemaName` |
| `pontx gen <apiPath>` | `specName.tagName.apiName` |

#### Commands Requiring Explicit Context

这些命令不指定 specName，需显式 `--global <name>`：

| Command | Reason |
|---------|--------|
| `pontx ls` | 需确定列出哪个项目的 specs |
| `pontx generate` | 需确定生成代码的目标项目 |
| `pontx search <keyword>` | 搜索范围不确定 |
| `pontx check` | 需确定检查哪个项目 |
| `pontx service` | 需确定启动哪个项目的服务 |

### Discovery Flow

```
User: pontx call petstore.pet.getPetById --petId=1

1. Parse apiPath → specName = "petstore"

2. Search local project
   - Load ./pontx.config.ts
   - Check if specs contains name === "petstore"
   - If found → use local, continue

3. Search global (fallback)
   - Load ~/.pontx/config.json
   - Find globalSpec where specName === "petstore"
   - If found → switch rootDir to that package, continue

4. Not found anywhere
   - Error: Spec "petstore" not found in local project or global specs.
```

### Output Hints

当使用全局 spec 时提示用户：

```bash
$ pontx call petstore.pet.getPetById --petId=1

[info] Using global spec "petstore" from @myorg/petstore-spec
{
  "id": 1,
  "name": "doggie"
}
```

### Conflict Handling

本地和全局同名 spec 时：

```bash
# 默认使用本地（无提示）
pontx call petstore.pet.getPetById --petId=1

# 强制使用全局
pontx call petstore.pet.getPetById --petId=1 --global
# [info] Using global spec "petstore" from @myorg/petstore-spec (overriding local)
```

---

## Type Definitions

```typescript
// src/types/global-config.ts

export interface GlobalSpecEntry {
  /** spec 包的绝对路径 */
  path: string;
  /** 该包的 spec 名称（只能有一个） */
  specName: string;
  /** 注册时间 (ISO 8601) */
  registeredAt?: string;
}

export interface GlobalConfig {
  version: string;
  /** key = packageName */
  globalSpecs: Record<string, GlobalSpecEntry>;
}

/** Spec 解析结果 */
export interface ResolvedSpecLocation {
  /** 来源 */
  source: 'local' | 'global';
  /** 全局包名（仅 source=global） */
  globalPackage?: string;
  /** spec 所在目录 */
  rootDir: string;
  /** 对应的 origin 配置 */
  originConfig: ResolvedOriginConfig;
}
```

---

## Error Handling

| Scenario | Error Message |
|----------|---------------|
| Global config not exist | Auto-create `~/.pontx/config.json` |
| Spec package path not found | `Spec path not found: /path/to/...` |
| No pontx.config.ts in package | `No pontx.config.ts found in /path/to/...` |
| Package has multiple specs | `Global spec package must contain exactly one spec, but @myorg/xxx has N specs.` |
| Package already registered | Prompt to overwrite, or use `--force` |
| `--global` package not found | `Global spec package "@myorg/xxx" not found. Run 'pontx global list' to see available specs.` |
| npm package not installed | `Package @myorg/xxx not found in global node_modules. Run 'npm install -g @myorg/xxx' first.` |
| specName not found anywhere | `Spec "xxx" not found in local project or global specs.` |

---

## Usage Example

```bash
# Step 1: Install spec package globally
npm install -g @myorg/petstore-spec

# Step 2: Register to pontx
pontx global add-spec @myorg/petstore-spec

# Step 3: Verify registration
pontx global list-specs

# Step 4: Use from anywhere (auto-discovery)
pontx call petstore.pet.getPetById --petId=1
pontx show-api petstore.pet.listPets
pontx gen petstore.pet.addPet

# Step 5: Commands requiring explicit context
pontx ls --global @myorg/petstore-spec
pontx generate --global @myorg/petstore-spec
pontx search "pet" --global @myorg/petstore-spec
```

---

## Third-Party Spec Package Guidelines

### Required Structure

```
@myorg/petstore-spec/
├── package.json         # Required
├── pontx.config.ts      # Required
└── pontx-lock.json      # Recommended (metadata cache)
```

### package.json Recommendations

```json
{
  "name": "@myorg/petstore-spec",
  "version": "1.0.0",
  "description": "Petstore API specification for pontx",
  "keywords": ["pontx", "pontx-spec", "api"],
  "files": [
    "pontx.config.ts",
    "pontx-lock.json"
  ]
}
```

### pontx.config.ts Example

**注意：全局 spec 包只能配置一个 spec。**

```typescript
import { defineConfig } from "pontx";

export default defineConfig({
  outDir: "./src/services",
  specs: [
    {
      url: "https://petstore.swagger.io/v2/swagger.json",
      name: "petstore",
    },
    // 不能配置多个 spec！
  ],
});
```
