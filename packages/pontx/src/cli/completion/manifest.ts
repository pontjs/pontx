/**
 * @author jasonHzq
 * @description Completion manifest for persistent caching
 *
 * 为 shell completion 提供持久化缓存，缓存 API 完整信息以提升性能。
 *
 * 架构设计：
 * - 使用 manifest 文件缓存所有 API 元数据（name, title, description, params）
 * - 基于 mtime 做增量更新，避免不必要的重新扫描
 * - 分离 local 和 external specs 的缓存和指纹
 * - 支持并行读取多个 spec 文件
 */

import * as fs from "fs";
import * as path from "path";
import { LOCK_FILENAME } from "../../const";
import { resolveExternalSpecConfigs } from "../../config.js";

/**
 * Manifest 版本
 */
const MANIFEST_VERSION = 1;

/**
 * Manifest 文件名
 */
const MANIFEST_FILENAME = "completion-manifest.json";

/**
 * 参数信息（补全需要的完整信息）
 */
export interface ParamEntry {
  /** 参数名 */
  name: string;
  /** 参数类型 */
  type: string;
  /** 是否必填 */
  required: boolean;
  /** 参数描述 */
  description?: string;
  /** 枚举值（用于值补全） */
  enum?: string[];
  /** 参数位置（path/query/body/formData 等） */
  in?: string;
}

/**
 * API 信息（补全需要的完整信息）
 */
export interface ApiEntry {
  /** API 名称，如 "pet/uploadFile" */
  name: string;
  /** API 标题（summary） */
  title: string;
  /** API 描述 */
  description?: string;
  /** 参数列表 */
  params: ParamEntry[];
}

/**
 * Tag 信息
 */
export interface TagEntry {
  /** tag 名称 */
  name: string;
  /** tag 描述 */
  description?: string;
}

/**
 * Spec 信息
 */
export interface SpecEntry {
  /** spec 名称 */
  name: string;
  /** api-lock.json 绝对路径 */
  path: string;
  /** 文件 mtime (ms) */
  mtime: number;
  /** spec 描述（来自 info.title 或 info.description） */
  description?: string;
  /** 缓存的 tags 列表 */
  tags?: TagEntry[];
  /** 缓存的 API 列表 */
  apis: ApiEntry[];
}

/**
 * Completion manifest 结构
 */
export interface CompletionManifest {
  /** manifest 版本 */
  version: number;

  /** Local specs 缓存（来自 pontx.config.ts 扫描） */
  local: {
    /** pontx.config.ts 的 mtime (ms) */
    configMtime: number;
    /** 缓存的 outDir（来自 config） */
    outDir?: string;
    /** spec 路径列表 */
    specs: SpecEntry[];
  };

  /** External specs 缓存（来自 package.json） */
  external: {
    /** package.json 的 mtime (ms) */
    packageJsonMtime: number;
    /** spec 路径列表 */
    specs: SpecEntry[];
  };
}

/**
 * Manifest 加载结果
 */
export interface ManifestResult {
  /** 所有 spec 列表 */
  specs: SpecEntry[];
  /** 是否从缓存加载 */
  fromCache: boolean;
}

/**
 * 获取 manifest 文件路径
 */
function getManifestPath(cwd: string): string | null {
  const nodeModules = path.join(cwd, "node_modules");
  if (!fs.existsSync(nodeModules)) {
    return null;
  }

  const cacheDir = path.join(nodeModules, ".pontx-cache");
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  return path.join(cacheDir, MANIFEST_FILENAME);
}

/**
 * 读取 manifest 文件
 */
function readManifest(manifestPath: string): CompletionManifest | null {
  try {
    if (!fs.existsSync(manifestPath)) {
      return null;
    }

    const content = fs.readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(content) as CompletionManifest;

    // 验证版本
    if (manifest.version !== MANIFEST_VERSION) {
      return null;
    }

    return manifest;
  } catch {
    return null;
  }
}

/**
 * 写入 manifest 文件
 */
function writeManifest(
  manifestPath: string,
  manifest: CompletionManifest
): void {
  try {
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
  } catch {
    // 写入失败不影响功能，只是下次还要重建
  }
}

/**
 * 获取文件 mtime
 */
function getFileMtime(filePath: string): number {
  try {
    const stats = fs.statSync(filePath);
    return stats.mtimeMs;
  } catch {
    return 0;
  }
}

/**
 * 从 api-lock.json 解析数据
 * @returns 包含 description, tags, apis 的对象
 */
function parseApiLock(lockPath: string): {
  description?: string;
  tags: TagEntry[];
  apis: ApiEntry[];
} {
  try {
    const content = fs.readFileSync(lockPath, "utf-8");
    const lock = JSON.parse(content);

    // 提取 spec 描述（优先使用 info.title，fallback 到 info.description）
    const description = lock.info?.title || lock.info?.description;

    // 提取 tags 信息（从 lock.tags 数组）
    const tagMap = new Map<string, string>();
    if (Array.isArray(lock.tags)) {
      for (const tag of lock.tags) {
        if (tag.name) {
          tagMap.set(tag.name, tag.description || "");
        }
      }
    }

    // 从 APIs 中提取命名空间作为 tags（补充 lock.tags 中可能缺失的）
    const tagSet = new Set<string>(tagMap.keys());
    const apis: ApiEntry[] = [];

    if (lock.apis) {
      for (const [apiKey, api] of Object.entries(lock.apis)) {
        const apiData = api as any;

        // 提取命名空间（如 "pet/uploadFile" -> "pet"）
        if (apiKey.includes("/")) {
          const namespace = apiKey.split("/")[0];
          tagSet.add(namespace);
        }

        // 解析参数
        const params: ParamEntry[] = [];
        if (Array.isArray(apiData.parameters)) {
          for (const param of apiData.parameters) {
            params.push({
              name: param.name,
              type: param.schema?.type || "string",
              required: param.required || false,
              description: param.description || param.schema?.description,
              enum: param.schema?.enum,
              in: param.in,
            });
          }
        }

        apis.push({
          name: apiKey,
          title: apiData.summary || apiData.description || apiKey,
          description: apiData.description,
          params,
        });
      }
    }

    // 构建最终的 tags 列表（合并命名空间和 lock.tags）
    const tags: TagEntry[] = Array.from(tagSet)
      .sort()
      .map((name) => ({
        name,
        description: tagMap.get(name),
      }));

    return { description, tags, apis };
  } catch {
    return { tags: [], apis: [] };
  }
}

/**
 * 轻量级加载 config，只获取 outDir
 * 完全复用 config.ts 的加载逻辑
 *
 * @returns outDir 的绝对路径，加载失败返回 null
 */
async function tryLoadOutDirFromConfig(cwd: string): Promise<string | null> {
  try {
    // 导入 config.ts 的函数
    const { resolveConfigFile } = await import("../../config");

    // 查找配置文件（按优先级，复用全局常量）
    let configPath = "pontx.config.ts";

    // 复用 resolveConfigFile 加载配置（支持 TS/JS/ESM/CJS）
    const configExport = await resolveConfigFile(cwd, configPath);

    // 处理函数式配置
    const config: any = await (typeof configExport === "function"
      ? configExport()
      : configExport);

    // 提取并规范化 outDir
    if (config?.outDir) {
      const configDir = path.dirname(configPath);
      return path.isAbsolute(config.outDir)
        ? config.outDir
        : path.join(configDir, config.outDir);
    }

    return null;
  } catch {
    // 加载失败时静默返回 null
    // completion 场景不应抛出错误影响用户体验
    return null;
  }
}

/**
 * 扫描指定 outDir 中的 specs
 */
async function scanOutDir(outDir: string): Promise<SpecEntry[]> {
  const specs: SpecEntry[] = [];

  if (!fs.existsSync(outDir)) {
    return specs;
  }

  try {
    const entries = fs.readdirSync(outDir, { withFileTypes: true });

    // 检查子目录中的 api-lock.json
    const specDirs = entries.filter((e) => e.isDirectory());
    const lockPaths = await Promise.all(
      specDirs.map((dir) => {
        const lockPath = path.join(outDir, dir.name, LOCK_FILENAME);
        return fs.existsSync(lockPath)
          ? { name: dir.name, path: lockPath }
          : null;
      })
    );

    for (const item of lockPaths) {
      if (item) {
        const lockData = parseApiLock(item.path);
        specs.push({
          name: item.name,
          path: item.path,
          mtime: getFileMtime(item.path),
          description: lockData.description,
          tags: lockData.tags,
          apis: lockData.apis,
        });
      }
    }

    // 检查 outDir 根目录的 api-lock.json（单 spec 模式）
    const directLockPath = path.join(outDir, LOCK_FILENAME);
    if (fs.existsSync(directLockPath) && specs.length === 0) {
      const lockData = parseApiLock(directLockPath);
      specs.push({
        name: "",
        path: directLockPath,
        mtime: getFileMtime(directLockPath),
        description: lockData.description,
        tags: lockData.tags,
        apis: lockData.apis,
      });
    }
  } catch {
    // 忽略错误
  }

  return specs;
}

/**
 * 扫描 local specs（来自 pontx.config.ts）
 *
 * 优先级：
 * 1. 使用缓存的 outDir（如果有）
 * 2. 加载真实 config 获取 outDir
 * 3. Fallback 到扫描常见目录
 */
async function scanLocalSpecs(
  cwd: string,
  cachedOutDir?: string
): Promise<{ outDir?: string; specs: SpecEntry[] }> {
  // 优先级 1: 使用缓存的 outDir
  if (cachedOutDir) {
    const specs = await scanOutDir(cachedOutDir);
    if (specs.length > 0) {
      return { outDir: cachedOutDir, specs };
    }
  }

  // 优先级 2: 加载真实 config 获取 outDir
  const configOutDir = await tryLoadOutDirFromConfig(cwd);
  if (configOutDir) {
    const specs = await scanOutDir(configOutDir);
    // 即使 specs 为空，也返回 outDir（可能是新项目）
    return { outDir: configOutDir, specs };
  }

  // 优先级 3: Fallback 到扫描常见目录
  const possibleOutDirs = [
    path.join(cwd, "src", "services"),
    path.join(cwd, "src", "apis"),
    path.join(cwd, "src", "api"),
    path.join(cwd, "services"),
    path.join(cwd, "apis"),
    path.join(cwd, "api"),
    path.join(cwd, ".pontx"),
  ];

  for (const outDir of possibleOutDirs) {
    const specs = await scanOutDir(outDir);
    if (specs.length > 0) {
      return { outDir, specs };
    }
  }

  // 没找到任何 specs
  return { specs: [] };
}

/**
 * 扫描 external specs（来自 package.json）
 *
 * 读取 package.json 中的 pontx.specs 配置，定位 SDK 包中的 api-lock.json
 */
async function scanExternalSpecs(cwd: string): Promise<SpecEntry[]> {
  // 使用核心函数解析外置 spec 配置
  const configs = await resolveExternalSpecConfigs(cwd);
  const validConfigs = configs.filter(
    (c): c is NonNullable<typeof c> => c !== null
  );

  // 并行解析 API entries
  const results = await Promise.all(
    validConfigs.map(async (config) => {
      try {
        // 确定 spec 名称
        let specName = config.customName;
        if (!specName) {
          try {
            const lockContent = JSON.parse(
              fs.readFileSync(config.lockPath, "utf-8")
            );
            specName = lockContent.name || config.sdkName;
          } catch {
            specName = config.sdkName;
          }
        }

        const lockData = parseApiLock(config.lockPath);
        return {
          name: specName,
          path: config.lockPath,
          mtime: getFileMtime(config.lockPath),
          description: lockData.description,
          tags: lockData.tags,
          apis: lockData.apis,
        };
      } catch {
        // 加载失败，跳过该 spec
        return null;
      }
    })
  );

  // 过滤掉失败的结果
  return results.filter((r) => r !== null) as SpecEntry[];
}

/**
 * 增量更新 spec entries
 * 只更新 mtime 变化的 spec
 */
async function updateSpecsIncremental(
  cachedSpecs: SpecEntry[]
): Promise<SpecEntry[]> {
  const results = await Promise.all(
    cachedSpecs.map(async (spec) => {
      const currentMtime = getFileMtime(spec.path);

      // mtime 没变，直接使用缓存
      if (currentMtime === spec.mtime) {
        return spec;
      }

      // mtime 变化了，重新解析
      const lockData = parseApiLock(spec.path);
      return {
        ...spec,
        mtime: currentMtime,
        description: lockData.description,
        tags: lockData.tags,
        apis: lockData.apis,
      };
    })
  );

  return results;
}

/**
 * 构建新的 manifest
 */
async function buildManifest(cwd: string): Promise<CompletionManifest> {
  const configPath = path.join(cwd, "pontx.config.ts");
  const packageJsonPath = path.join(cwd, "package.json");

  const [localResult, externalSpecs] = await Promise.all([
    scanLocalSpecs(cwd),
    scanExternalSpecs(cwd),
  ]);

  return {
    version: MANIFEST_VERSION,
    local: {
      configMtime: getFileMtime(configPath),
      outDir: localResult.outDir,
      specs: localResult.specs,
    },
    external: {
      packageJsonMtime: getFileMtime(packageJsonPath),
      specs: externalSpecs,
    },
  };
}

/**
 * 加载或重建 manifest
 *
 * 流程：
 * 1. 读取 manifest 文件
 * 2. 检查 local specs（configMtime 变化？）
 * 3. 检查 external specs（packageJsonMtime 变化？）
 * 4. 增量更新变化的部分
 * 5. 持久化更新后的 manifest
 */
export async function loadManifest(cwd: string): Promise<ManifestResult> {
  const manifestPath = getManifestPath(cwd);

  // 无法持久化，回退到纯内存模式
  if (!manifestPath) {
    const manifest = await buildManifest(cwd);
    return {
      specs: [...manifest.local.specs, ...manifest.external.specs],
      fromCache: false,
    };
  }

  // 读取缓存的 manifest
  const cachedManifest = readManifest(manifestPath);

  if (!cachedManifest) {
    // 没有缓存，重新构建
    const manifest = await buildManifest(cwd);
    writeManifest(manifestPath, manifest);
    return {
      specs: [...manifest.local.specs, ...manifest.external.specs],
      fromCache: false,
    };
  }

  // 检查 local specs 是否需要更新
  const configPath = path.join(cwd, "pontx.config.ts");
  const currentConfigMtime = getFileMtime(configPath);
  let localSpecs = cachedManifest.local.specs;
  let localOutDir = cachedManifest.local.outDir;
  let localNeedsUpdate = false;

  if (currentConfigMtime !== cachedManifest.local.configMtime) {
    // pontx.config.ts 变化了，重新扫描（使用缓存的 outDir）
    const result = await scanLocalSpecs(cwd, cachedManifest.local.outDir);
    localSpecs = result.specs;
    localOutDir = result.outDir;
    localNeedsUpdate = true;
  } else {
    // config 没变，增量更新（检查文件 mtime）
    const updatedSpecs = await updateSpecsIncremental(localSpecs);
    if (updatedSpecs !== localSpecs) {
      localSpecs = updatedSpecs;
      localNeedsUpdate = true;
    }
  }

  // 检查 external specs 是否需要更新
  const packageJsonPath = path.join(cwd, "package.json");
  const currentPackageJsonMtime = getFileMtime(packageJsonPath);
  let externalSpecs = cachedManifest.external.specs;
  let externalNeedsUpdate = false;

  if (currentPackageJsonMtime !== cachedManifest.external.packageJsonMtime) {
    // package.json 变化了，重新扫描
    externalSpecs = await scanExternalSpecs(cwd);
    externalNeedsUpdate = true;
  } else {
    // package.json 没变，增量更新
    const updatedSpecs = await updateSpecsIncremental(externalSpecs);
    if (updatedSpecs !== externalSpecs) {
      externalSpecs = updatedSpecs;
      externalNeedsUpdate = true;
    }
  }

  // 如果有更新，持久化新的 manifest
  if (localNeedsUpdate || externalNeedsUpdate) {
    const newManifest: CompletionManifest = {
      version: MANIFEST_VERSION,
      local: {
        configMtime: currentConfigMtime,
        outDir: localOutDir,
        specs: localSpecs,
      },
      external: {
        packageJsonMtime: currentPackageJsonMtime,
        specs: externalSpecs,
      },
    };
    writeManifest(manifestPath, newManifest);
  }

  return {
    specs: [...localSpecs, ...externalSpecs],
    fromCache: !localNeedsUpdate && !externalNeedsUpdate,
  };
}

/**
 * 清理 manifest 缓存
 */
export function cleanManifest(cwd: string): boolean {
  const manifestPath = getManifestPath(cwd);
  if (!manifestPath) {
    return false;
  }

  try {
    if (fs.existsSync(manifestPath)) {
      fs.unlinkSync(manifestPath);
      return true;
    }
  } catch {
    // 忽略错误
  }

  return false;
}
