import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import { promises as fsp } from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import type { GlobalConfig, GlobalSpecEntry } from "./types";
import { resolveConfig } from "../config";

const execAsync = promisify(exec);

/** Global config directory name under user home */
const GLOBAL_CONFIG_DIR = ".pontx";

/** Global config file name */
const GLOBAL_CONFIG_FILE = "config.json";

/** Cache for global npm root path */
let cachedGlobalNodeModules: string | null = null;

/**
 * 获取全局配置目录路径 (~/.pontx/)
 */
export function getGlobalConfigDir(): string {
  return path.join(os.homedir(), GLOBAL_CONFIG_DIR);
}

/**
 * 获取全局配置文件路径 (~/.pontx/config.json)
 */
export function getGlobalConfigPath(): string {
  return path.join(getGlobalConfigDir(), GLOBAL_CONFIG_FILE);
}

/**
 * 加载全局配置
 * 如果文件不存在，返回默认空配置
 */
export async function loadGlobalConfig(): Promise<GlobalConfig> {
  const configPath = getGlobalConfigPath();

  try {
    const content = await fsp.readFile(configPath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    if (error.code === "ENOENT") {
      // 文件不存在，返回默认配置
      return {
        version: "1.0",
        globalSpecs: {},
      };
    }
    throw error;
  }
}

/**
 * 保存全局配置到文件
 * 自动创建目录（如果不存在）
 */
export async function saveGlobalConfig(config: GlobalConfig): Promise<void> {
  const configDir = getGlobalConfigDir();
  const configPath = getGlobalConfigPath();

  // 确保目录存在
  await fsp.mkdir(configDir, { recursive: true });

  // 写入配置文件
  await fsp.writeFile(configPath, JSON.stringify(config, null, 2), "utf-8");
}

/**
 * Get global npm root path with caching
 * @returns Global node_modules path
 */
async function getGlobalNodeModules(): Promise<string> {
  if (cachedGlobalNodeModules) {
    return cachedGlobalNodeModules;
  }

  try {
    const { stdout } = await execAsync("npm root -g");
    cachedGlobalNodeModules = stdout.trim();
    return cachedGlobalNodeModules;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to resolve global node_modules: ${message}`);
  }
}

/**
 * Resolve package path from package name or local path
 * - Paths starting with / or . are treated as local paths
 * - Otherwise treated as npm package name, resolved from global node_modules
 *
 * @param packageNameOrPath - npm package name or local path
 * @returns Absolute path to the package
 */
export async function resolvePackagePath(packageNameOrPath: string): Promise<string> {
  // Check if it's a local path
  if (packageNameOrPath.startsWith("/") || packageNameOrPath.startsWith(".")) {
    const absolutePath = path.isAbsolute(packageNameOrPath)
      ? packageNameOrPath
      : path.resolve(process.cwd(), packageNameOrPath);

    // Verify path exists
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Spec path not found: ${absolutePath}`);
    }

    return absolutePath;
  }

  // npm package name, resolve from global node_modules
  const globalNodeModules = await getGlobalNodeModules();
  const packagePath = path.join(globalNodeModules, packageNameOrPath);

  // Verify package exists
  if (!fs.existsSync(packagePath)) {
    throw new Error(
      `Package ${packageNameOrPath} not found in global node_modules. Run 'npm install -g ${packageNameOrPath}' first.`
    );
  }

  return packagePath;
}

/**
 * 注册全局 spec
 * @param packageNameOrPath npm 包名或本地路径
 * @param options.force 是否强制覆盖已存在的注册
 * @returns 返回 { packageName, specName } 用于显示成功消息
 */
export async function addGlobalSpec(
  packageNameOrPath: string,
  options?: { force?: boolean }
): Promise<{ packageName: string; specName: string }> {
  // 1. 解析路径
  const packagePath = await resolvePackagePath(packageNameOrPath);

  // 2. 验证 pontx.config.ts 存在
  const configPath = path.join(packagePath, "pontx.config.ts");
  if (!fs.existsSync(configPath)) {
    throw new Error(`No pontx.config.ts found in ${packagePath}`);
  }

  // 3. 加载 pontx.config.ts，验证只有一个 spec
  const resolvedConfig = await resolveConfig(configPath, {
    rootDir: packagePath,
    logLevel: "silent",
  });

  const specs = resolvedConfig.origins;
  if (!specs || specs.length === 0) {
    throw new Error(
      `Global spec package must contain at least one spec, but ${packageNameOrPath} has none.`
    );
  }
  if (specs.length > 1) {
    throw new Error(
      `Global spec package must contain exactly one spec, but ${packageNameOrPath} has ${specs.length} specs.`
    );
  }

  const specName = specs[0].name;

  // 4. 读取 package.json 获取 packageName
  const packageJsonPath = path.join(packagePath, "package.json");
  let packageName: string;

  try {
    const packageJsonContent = await fsp.readFile(packageJsonPath, "utf-8");
    const packageJson = JSON.parse(packageJsonContent);
    packageName = packageJson.name;

    if (!packageName) {
      throw new Error("package.json does not contain a valid 'name' field");
    }
  } catch (error) {
    throw new Error(
      `Failed to read package.json from ${packagePath}: ${error.message}`
    );
  }

  // 5. 检查是否已注册
  const config = await loadGlobalConfig();

  if (config.globalSpecs[packageName] && !options?.force) {
    throw new Error(
      `Package "${packageName}" is already registered. Use --force to overwrite.`
    );
  }

  // 6. 写入配置
  config.globalSpecs[packageName] = {
    path: packagePath,
    specName,
    registeredAt: new Date().toISOString(),
  };

  await saveGlobalConfig(config);

  return { packageName, specName };
}

/**
 * 移除全局 spec 注册
 * @param packageName npm 包名
 */
export async function removeGlobalSpec(packageName: string): Promise<void> {
  const config = await loadGlobalConfig();

  if (!config.globalSpecs[packageName]) {
    throw new Error(
      `Global spec package "${packageName}" not found. Run 'pontx global list-specs' to see available specs.`
    );
  }

  delete config.globalSpecs[packageName];
  await saveGlobalConfig(config);
}

/**
 * 获取单个全局 spec 信息
 * @param packageName npm 包名
 * @returns spec 信息，如果不存在返回 null
 */
export async function getGlobalSpec(
  packageName: string
): Promise<GlobalSpecEntry | null> {
  const config = await loadGlobalConfig();
  return config.globalSpecs[packageName] || null;
}

/**
 * 列出所有全局 spec
 * @returns 全局 spec 列表 (packageName, entry)
 */
export async function listGlobalSpecs(): Promise<
  Array<{ packageName: string; entry: GlobalSpecEntry }>
> {
  const config = await loadGlobalConfig();

  return Object.entries(config.globalSpecs).map(([packageName, entry]) => ({
    packageName,
    entry,
  }));
}

/**
 * 根据 specName 查找全局 spec
 * @param specName spec 名称
 * @returns 找到的 spec 信息，如果不存在返回 null
 */
export async function findGlobalSpecByName(
  specName: string
): Promise<{ packageName: string; entry: GlobalSpecEntry } | null> {
  const config = await loadGlobalConfig();

  for (const [packageName, entry] of Object.entries(config.globalSpecs)) {
    if (entry.specName === specName) {
      return { packageName, entry };
    }
  }

  return null;
}
