# Pontx SDK CLI 能力设计方案

## 目标

让 pontx 生成的 SDK 包能够：
1. **独立使用**：SDK 包自带 CLI（如 `x search`, `x call`, `x gen`, `x show-api`）
2. **项目集成**：业务项目通过 `pontx add-spec x-sdk` 集成后，用 `pontx call x.store.list` 统一调用

## 设计概要

### 核心 API（方案 B：runCLI 内置运行能力）

```typescript
// x-sdk/pontx.cli.ts
import { runCLI } from "pontx";

// 当这个文件被执行时，自动启动 CLI
// name 从 package.json 的 pontx.name 字段读取
runCLI({
  specs: [{
    name: "store",
    localPath: "dist/api-lock.json",
  }],
  executeApi: {
    baseURL: "https://api.example.com",
    beforeRequest: async (req) => { /* 添加认证 */ return req; },
  },
  generateSamples: [{
    case: "request",
    description: "基础请求",
    generateSample: (api, opts) => `import { ${api.apiName} } from 'x-sdk';`,
  }],
  // ❌ 不支持 plugins 配置
});
```

**优势**：只需要一个文件，无需生成入口模板

### 使用流程

```bash
# SDK 开发者
pontx cli init --name x       # 初始化 package.json 的 pontx 字段
pontx cli build -o dist/bin   # 编译 pontx.cli.ts → cli.cjs
npm publish                   # 发布

# SDK 用户 - 独立使用
x search "list store"
x call store.list --id 123

# SDK 用户 - 项目集成
pontx add-spec x-sdk         # 自动修改 pontx.config.ts
pontx call x.store.list --id 123
```

---

## Q&A 设计细节

### Q1: runCLI 配置项设计

```typescript
export interface CLIConfig {
  // ❌ 不包含 name，运行时从 package.json pontx.name 读取

  specs: Array<{
    name: string;
    localPath: string;  // 与 pontx.config.ts 保持一致
  }>;

  executeApi?: ExecuteApiConfig;  // API 执行配置
  generateSamples?: CLISampleConfig[];  // 代码生成模板

  // ❌ 明确不支持 plugins 配置
}
```

### Q2: runCLI 内置 CLI 能力（新方案）

**核心思路**：`runCLI` 函数本身就具备创建和运行 CLI 的能力

```typescript
// pontx/src/sdk-cli.ts
export function runCLI(config: CLIConfig): void {
  // 1. 向上查找 package.json 获取 name 和 rootDir
  const { name, rootDir } = findPackageJson();

  // 2. 创建 CLI 程序
  const program = createSdkCli({ name, cliConfig: config, rootDir });

  // 3. 运行 CLI
  program.parseAsync(process.argv);
}

function findPackageJson() {
  // 从 __dirname 向上查找 package.json
  let dir = __dirname;
  while (dir !== path.dirname(dir)) {
    const pkgPath = path.join(dir, "package.json");
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      return {
        name: pkg.pontx?.name || pkg.name,
        rootDir: dir,
      };
    }
    dir = path.dirname(dir);
  }
  throw new Error("找不到 package.json");
}
```

**编译流程简化**：

```
pontx.cli.ts (用户代码)
    ↓ esbuild 编译
dist/bin/cli.cjs (单文件，内含 runCLI 调用)
```

**生成的文件结构**：
```
x-sdk/
├── dist/
│   ├── api-lock.json
│   └── bin/
│       └── cli.cjs      # 单个文件！
├── pontx.cli.ts
└── package.json
```

**cli.cjs 内容（esbuild 直接编译 pontx.cli.ts 的结果）**：
```javascript
#!/usr/bin/env node
"use strict";

// esbuild 打包后的代码
const { runCLI } = require("pontx/sdk-cli");

runCLI({
  specs: [{ name: "store", localPath: "dist/api-lock.json" }],
  executeApi: { baseURL: "...", beforeRequest: function(req) {...} },
  generateSamples: [...],
});
```

### Q3: 命令拆分

```bash
# 初始化 package.json
pontx cli init --name <cli-name>
  修改 package.json，添加 bin 和 pontx 字段

# 构建 CLI
pontx cli build [options]
  -c, --config <path>   配置文件路径 (默认: ./pontx.cli.ts)
  -o, --out <path>      输出目录 (默认: ./dist/bin)
```

**pontx cli init --name x** 做的事情：
1. 读取 package.json
2. 添加/更新：
   ```json
   {
     "bin": { "x": "./dist/bin/cli.cjs" },
     "pontx": { "type": "sdk", "name": "x" }
   }
   ```
3. 写回 package.json
4. 打印变更

**pontx cli build** 做的事情：
1. 读取 pontx.cli.ts
2. 用 esbuild 编译成单文件 cli.cjs（包含 shebang）

---

## 实现步骤

### 1. 新增 `runCLI` 和类型定义

**文件**: `packages/pontx/src/sdk-cli.ts`

```typescript
import type { ExecuteApiConfig } from "./type";

export interface CLISpecConfig {
  name: string;
  localPath: string;  // 相对于 SDK 根目录
}

export interface CLISampleConfig {
  case: string;
  description: string;
  generateSample: (
    api: { specName: string; tagName: string; apiName: string },
    options?: { requestParams?: any; bodyParams?: any }
  ) => string | Promise<string>;
}

export interface CLIConfig {
  specs: CLISpecConfig[];
  executeApi?: ExecuteApiConfig;
  generateSamples?: CLISampleConfig[];
  // ❌ 不支持 plugins
}

/**
 * 运行 SDK CLI
 * 当 pontx.cli.ts 被执行时，调用此函数启动 CLI
 */
export function runCLI(config: CLIConfig): void {
  // 1. 向上查找 package.json 获取 name 和 rootDir
  const { name, rootDir } = findPackageJson();

  // 2. 创建 CLI 程序
  const program = createSdkCli({ name, cliConfig: config, rootDir });

  // 3. 运行 CLI
  program.parseAsync(process.argv);
}

function findPackageJson(): { name: string; rootDir: string } {
  let dir = path.dirname(__filename);
  while (dir !== path.dirname(dir)) {
    const pkgPath = path.join(dir, "package.json");
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      return {
        name: pkg.pontx?.name || pkg.name,
        rootDir: dir,
      };
    }
    dir = path.dirname(dir);
  }
  throw new Error("找不到 package.json");
}

function createSdkCli(options: { name: string; cliConfig: CLIConfig; rootDir: string }): Command {
  const { name, cliConfig, rootDir } = options;
  const program = new Command(name);

  // 注册 search, call, gen, show-api, list-templates 命令
  // 复用现有命令实现
  registerSdkCommands(program, cliConfig, rootDir);

  return program;
}
```

### 2. 新增 `pontx cli init` 命令

**文件**: `packages/pontx/src/commands/cli-init.ts`

```typescript
export interface CliInitOptions {
  name: string;      // CLI 命令名
  out?: string;      // CLI 输出目录，默认 ./dist/bin
}

export async function cliInitCommand(options: CliInitOptions) {
  const { name, out = "./dist/bin" } = options;

  // 1. 读取 package.json
  const pkgPath = path.resolve(process.cwd(), "package.json");
  const pkg = JSON.parse(await fsp.readFile(pkgPath, "utf-8"));

  // 2. 添加/更新字段
  pkg.bin = pkg.bin || {};
  pkg.bin[name] = `${out}/cli.cjs`;

  pkg.pontx = {
    type: "sdk",
    name: name,
  };

  // 3. 写回
  await fsp.writeFile(pkgPath, JSON.stringify(pkg, null, 2));

  console.log("已更新 package.json:");
  console.log(`  bin.${name} = "${out}/cli.cjs"`);
  console.log(`  pontx.name = "${name}"`);
}
```

### 3. 新增 `pontx cli build` 命令（简化版）

**文件**: `packages/pontx/src/commands/cli-build.ts`

```typescript
export interface CliBuildOptions {
  config?: string;   // 配置文件路径，默认 ./pontx.cli.ts
  out?: string;      // 输出目录，默认 ./dist/bin
}

export async function cliBuildCommand(options: CliBuildOptions) {
  const configPath = options.config || "./pontx.cli.ts";
  const outDir = options.out || "./dist/bin";

  await fsp.mkdir(outDir, { recursive: true });

  // 直接用 esbuild 编译 pontx.cli.ts → cli.cjs（单文件）
  await esbuild.build({
    entryPoints: [configPath],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile: path.join(outDir, "cli.cjs"),
    external: ["pontx"],
    banner: { js: "#!/usr/bin/env node" },  // 添加 shebang
  });

  console.log(`CLI 构建完成: ${outDir}/cli.cjs`);
}
```

### 4. 新增 `add-spec` 命令

**文件**: `packages/pontx/src/commands/add-spec.ts`

```typescript
export async function addSpecCommand(sdkName: string) {
  // 1. 解析 SDK 的 package.json
  const sdkPkgPath = require.resolve(`${sdkName}/package.json`);
  const sdkPkg = JSON.parse(await fsp.readFile(sdkPkgPath, "utf-8"));

  // 2. 读取 SDK 的 pontx.cli.ts 配置（需要编译执行）
  const sdkDir = path.dirname(sdkPkgPath);
  const cliConfigPath = path.join(sdkDir, "pontx.cli.ts");
  const cliConfig = await loadCLIConfig(cliConfigPath);

  // 3. 自动修改当前项目的 pontx.config.ts
  // 添加 SDK 的 specs 到 origins/specs 数组
}
```

### 5. 更新 cli-factory.ts 注册新命令

**文件**: `packages/pontx/src/cli-factory.ts`

添加 `cli` 子命令组：
```typescript
const cliCmd = program.command("cli").description("SDK CLI 管理");
cliCmd.command("init").requiredOption("--name <name>", "CLI 命令名").action(...);
cliCmd.command("build").option("-c, --config <path>").option("-o, --out <path>").action(...);
```

### 6. 更新导出

**文件**: `packages/pontx/src/index.ts`
- 导出 `runCLI`, `CLIConfig`

**文件**: `packages/pontx/package.json`
- 添加 `./sdk-cli` 导出入口：
```json
"exports": {
  "./sdk-cli": {
    "import": "./lib/sdk-cli.js",
    "require": "./cjs/sdk-cli.cjs"
  }
}
```

## 文件变更清单

| 文件 | 操作 | 说明 |
|-----|------|-----|
| `packages/pontx/src/cli-config.ts` | 新增 | defineCLI 和类型定义 |
| `packages/pontx/src/sdk-cli.ts` | 新增 | SDK CLI 工厂函数 |
| `packages/pontx/src/commands/cli-init.ts` | 新增 | `pontx cli init` 命令 |
| `packages/pontx/src/commands/cli-build.ts` | 新增 | `pontx cli build` 命令 |
| `packages/pontx/src/commands/add-spec.ts` | 新增 | `pontx add-spec` 命令 |
| `packages/pontx/src/cli-factory.ts` | 修改 | 注册 cli 子命令组 |
| `packages/pontx/src/index.ts` | 修改 | 导出 defineCLI, CLIConfig |
| `packages/pontx/package.json` | 修改 | 添加 ./sdk-cli 导出 |

## package.json 规范（由 `pontx cli init --name x` 自动生成）

```json
{
  "name": "x-sdk",
  "bin": {
    "x": "./dist/bin/cli.cjs"
  },
  "pontx": {
    "type": "sdk",
    "name": "x"
  },
  "files": ["dist"]
}
```

## 验证方式

1. **单元测试**: 为 `defineCLI`, `createSdkCli`, `cli init`, `cli build`, `add-spec` 编写测试
2. **集成测试**:
   - 创建示例 SDK 项目
   - 执行 `pontx cli init --name x`
   - 执行 `pontx cli build`
   - 测试生成的 CLI 命令
   - 在另一项目中测试 `pontx add-spec`
3. **手动测试**:
   ```bash
   # 构建 pontx
   cd packages/pontx && npm run build

   # 在 examples 目录创建测试 SDK
   cd ../../examples/test-sdk
   npx pontx cli init --name test
   npx pontx cli build
   node dist/bin/cli.cjs search "pet"
   ```
