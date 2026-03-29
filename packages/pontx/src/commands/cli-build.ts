/**
 * @author pontx
 * @description pontx cli build 命令实现
 */

import * as path from "path";
import * as fs from "fs";
import * as fsp from "fs/promises";
import { pathToFileURL } from "node:url";
import type { CLIConfig } from "../sdk-cli/types";
import { PontxManager } from "../manager";
import { createLogger } from "../logger/logger";
import type { PontxSpec, PontxAPI } from "@pontx/spec";
import { writeSkillFile } from "../skill/shared";
import {
  SDK_SKILL_TEMPLATE,
  getApiPathExample,
  getApiMethodExample,
  getApiPathFormatHelp,
  getApiPathFormatShort,
} from "../skill/sdk-template";

/**
 * 从 spec 提取的真实示例数据
 */
interface RealExamples {
  /** API 路径示例，如 "pet.getPetById" 或 "getUserInfo" */
  apiPathExample: string;
  /** 搜索关键词示例 */
  searchKeyword: string;
  /** Schema 名称示例 */
  schemaExample: string;
  /** 参数示例，如 "--petId 123" */
  paramExample: string;
  /** 参数 JSON 示例，如 '{"petId": 123}' */
  paramJsonExample: string;
  /** 带参数的 API 路径示例 */
  apiWithParamsExample: string;
  /** API 方法名示例（不带 tag 前缀） */
  apiMethodExample: string;
}

export interface CliBuildOptions {
  /** 配置文件路径，默认 ./pontx.cli.ts */
  config?: string;
  /** 输出目录，默认 ./dist/bin */
  out?: string;
}

/**
 * 解析构建选项
 */
export function resolveBuildOptions(options: CliBuildOptions): {
  configPath: string;
  configDir: string;
  outDir: string;
  outFile: string;
} {
  const configPath = path.resolve(options.config || "./pontx.cli.ts");
  const configDir = path.dirname(configPath);
  const outDir = path.resolve(options.out || "./dist/bin");
  const outFile = path.join(outDir, "cli.cjs");
  return { configPath, configDir, outDir, outFile };
}

/* loadCLIConfig 已移除 - spec 现在从 pontx.config.ts 中读取 */

/**
 * 从 pontx.config.ts 读取 spec
 * @param rootDir - 项目根目录
 * @returns PontxSpec 对象
 */
async function getSpecFromPontxConfig(rootDir: string): Promise<PontxSpec> {
  const logger = createLogger("info", { prefix: "[cli build]" });

  // 1. 从项目根目录加载 PontxManager
  logger.debug(`加载 pontx.config.ts from ${rootDir}`);
  const manager = await PontxManager.constructorFromRootDir(rootDir, logger);

  // 2. 验证只有一个 origin
  const origins = manager.resolvedConfig.origins;
  if (origins.length === 0) {
    throw new Error(
      `错误：未找到 origin 配置\n` +
        `提示：请在 pontx.config.ts 中配置 origins`
    );
  }
  if (origins.length > 1) {
    throw new Error(
      `错误：SDK CLI 目前只支持单 origin 项目\n` +
        `  当前配置了 ${origins.length} 个 origins: ${origins.map(o => o.name).join(", ")}\n\n` +
        `提示：多 origin 项目暂不支持 SDK CLI 功能`
    );
  }

  // 3. 获取 spec
  const origin = origins[0];
  if (!origin.spec) {
    throw new Error(
      `错误：origin "${origin.name}" 尚未生成本地 spec\n\n` +
        `提示：请先运行 'pontx generate' 生成 API 规范文件`
    );
  }

  logger.debug(`从 origin "${origin.name}" 读取 spec`);
  return origin.spec;
}

/**
 * 将 spec 序列化为 JSON 并写入文件
 * @param spec - PontxSpec 对象
 * @param outDir - 输出目录
 */
async function writeSpecToFile(
  spec: PontxSpec,
  outDir: string
): Promise<void> {
  const targetSpecPath = path.join(outDir, "api-lock.json");

  // 序列化 spec 为格式化的 JSON
  const specJson = JSON.stringify(spec, null, 2);

  // 确保目录存在
  await fsp.mkdir(path.dirname(targetSpecPath), { recursive: true });

  // 写入文件
  await fsp.writeFile(targetSpecPath, specJson, "utf-8");

  console.log(`✓ 已生成 api-lock.json`);
}

/**
 * 从 package.json 的 bin 字段获取 CLI 命令名
 * @param configDir - 配置文件所在目录（SDK 根目录）
 * @returns CLI 命令名，如果没有 bin 字段则返回 null
 */
function getBinNameFromPackageJson(configDir: string): string | null {
  const pkgPath = path.join(configDir, "package.json");
  if (!fs.existsSync(pkgPath)) {
    return null;
  }

  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    if (pkg.bin) {
      if (typeof pkg.bin === "string") {
        // bin 是字符串时，使用包名作为命令名
        return pkg.name?.split("/").pop() || null;
      } else if (typeof pkg.bin === "object") {
        // bin 是对象时，取第一个 key
        const keys = Object.keys(pkg.bin);
        return keys.length > 0 ? keys[0] : null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 根据 schema 类型生成示例值
 */
function generateExampleValue(schema?: { type?: string }): string {
  if (!schema?.type) {
    return '"example"';
  }
  switch (schema.type) {
    case "integer":
    case "number":
      return "123";
    case "boolean":
      return "true";
    case "array":
      return "[]";
    case "object":
      return "{}";
    default:
      return '"example"';
  }
}

/**
 * 从 PontxSpec 中提取真实示例
 * @param spec - PontxSpec 对象
 * @param hasTags - 是否有 tags
 */
function extractRealExamples(spec: PontxSpec, hasTags: boolean): RealExamples {
  const apiKeys = Object.keys(spec.apis || {});
  const schemaNames = Object.keys(spec.components?.schemas || {});

  /* 获取第一个 API */
  const firstApiKey = apiKeys[0] || "";

  /* API 路径示例 */
  let apiPathExample = "";
  let apiMethodExample = "";
  if (firstApiKey) {
    if (hasTags && firstApiKey.includes("/")) {
      const [tag, api] = firstApiKey.split("/");
      apiPathExample = `${tag}.${api}`;
      apiMethodExample = api;
    } else {
      apiPathExample = firstApiKey;
      apiMethodExample = firstApiKey;
    }
  } else {
    apiPathExample = hasTags ? "<tag>.<apiName>" : "<apiName>";
    apiMethodExample = "<apiName>";
  }

  /* 搜索关键词（取 tag 名或 API 名的一部分） */
  let searchKeyword = "";
  if (firstApiKey) {
    if (hasTags && firstApiKey.includes("/")) {
      searchKeyword = firstApiKey.split("/")[0];
    } else {
      /* 从 API 名中提取关键词，去掉常见动词前缀 */
      searchKeyword = firstApiKey
        .replace(/^(get|list|create|update|delete|fetch|query|find)/i, "")
        .toLowerCase();
      /* 如果去掉前缀后为空，使用原名 */
      if (!searchKeyword) {
        searchKeyword = firstApiKey.toLowerCase();
      }
    }
  } else {
    searchKeyword = "api";
  }

  /* Schema 名称 */
  const schemaExample = schemaNames[0] || "<SchemaName>";

  /* 参数示例 - 遍历找到第一个有参数的 API */
  let paramName = "";
  let paramValue = "";
  let apiWithParamsExample = "";

  for (const apiKey of apiKeys) {
    const api = spec.apis[apiKey] as PontxAPI;
    const params = api?.parameters || [];
    if (params.length > 0) {
      const param = params[0];
      paramName = param.name;
      paramValue = generateExampleValue(param.schema);
      /* 转换 API 路径格式 */
      if (hasTags && apiKey.includes("/")) {
        apiWithParamsExample = apiKey.replace("/", ".");
      } else {
        apiWithParamsExample = apiKey;
      }
      break;
    }
  }

  /* 如果没有找到有参数的 API，使用泛化示例 */
  const paramExample = paramName
    ? `--${paramName} ${paramValue}`
    : "--<param> <value>";
  const paramJsonExample = paramName
    ? `{"${paramName}": ${paramValue}}`
    : '{"<param>": "<value>"}';

  /* 如果没有找到有参数的 API，使用第一个 API */
  if (!apiWithParamsExample) {
    apiWithParamsExample = apiPathExample;
  }

  return {
    apiPathExample,
    searchKeyword,
    schemaExample,
    paramExample,
    paramJsonExample,
    apiWithParamsExample,
    apiMethodExample,
  };
}

/**
 * 生成 SDK SKILL.md 文件
 * @param spec - PontxSpec 对象
 * @param configDir - 配置文件所在目录（SDK 根目录）
 * @param binName - CLI 命令名
 */
async function generateSdkSkillFile(
  spec: PontxSpec,
  configDir: string,
  binName: string
): Promise<void> {
  const logger = createLogger("info", { prefix: "[cli build]" });

  /* 检测是否有 tags */
  const apis = spec.apis || {};
  const hasTags = Object.keys(apis).some((key) => key.includes("/"));

  /* 读取 package.json */
  const pkgPath = path.join(configDir, "package.json");
  const pkg = fs.existsSync(pkgPath)
    ? JSON.parse(fs.readFileSync(pkgPath, "utf-8"))
    : {};

  /* 从 spec 提取真实示例 */
  const realExamples = extractRealExamples(spec, hasTags);

  /* 获取动态内容（使用真实示例） */
  const apiPathExample = getApiPathExample(hasTags, realExamples.apiPathExample);
  const apiMethodExample = getApiMethodExample(hasTags, realExamples.apiMethodExample);
  const apiPathFormat = getApiPathFormatHelp(hasTags, realExamples.apiPathExample);
  const apiPathFormatShort = getApiPathFormatShort(hasTags);

  /* 生成 SKILL description（frontmatter，不能有换行） */
  const specDescription = spec.info?.description || "";
  const specDescPart = specDescription
    ? ` ${specDescription.replace(/[\r\n]+/g, " ").trim()}`
    : "";
  const skillDescription =
    `使用 ${binName} CLI 搜索、查看和调用 API。${specDescPart}`.trim();

  /* 生成资源链接 */
  const repoLink = pkg.repository?.url
    ? `- 源码: ${pkg.repository.url}`
    : "";
  const homeLink = pkg.homepage ? `- 文档: ${pkg.homepage}` : "";
  const externalDocsLink =
    spec.externalDocs?.url
      ? `- 外部文档: [${spec.externalDocs?.description || spec.externalDocs?.url}](${spec.externalDocs?.url})`
      : "";

  /* 替换模板变量 */
  const content = SDK_SKILL_TEMPLATE.replace(/\{\{CLI_NAME\}\}/g, binName)
    .replace(/\{\{SDK_NAME\}\}/g, pkg.name || binName)
    .replace(/\{\{SKILL_DESCRIPTION\}\}/g, skillDescription)
    .replace(/\{\{SPEC_TITLE\}\}/g, spec.info?.title || spec.name || "")
    .replace(/\{\{SPEC_DESCRIPTION\}\}/g, specDescription)
    .replace(/\{\{VERSION\}\}/g, spec.info?.version || pkg.version || "1.0.0")
    .replace(/\{\{API_PATH_EXAMPLE\}\}/g, apiPathExample)
    .replace(/\{\{API_METHOD_EXAMPLE\}\}/g, apiMethodExample)
    .replace(/\{\{API_PATH_FORMAT\}\}/g, apiPathFormat)
    .replace(/\{\{API_PATH_FORMAT_SHORT\}\}/g, apiPathFormatShort)
    .replace(/\{\{SEARCH_KEYWORD_EXAMPLE\}\}/g, realExamples.searchKeyword)
    .replace(/\{\{SCHEMA_NAME_EXAMPLE\}\}/g, realExamples.schemaExample)
    .replace(/\{\{PARAM_EXAMPLE\}\}/g, realExamples.paramExample)
    .replace(/\{\{PARAM_JSON_EXAMPLE\}\}/g, realExamples.paramJsonExample)
    .replace(/\{\{API_WITH_PARAMS_EXAMPLE\}\}/g, realExamples.apiWithParamsExample)
    .replace(/\{\{REPOSITORY_LINK\}\}/g, repoLink)
    .replace(/\{\{HOMEPAGE_LINK\}\}/g, homeLink)
    .replace(/\{\{EXTERNAL_DOCS_LINK\}\}/g, externalDocsLink);

  /* 输出到 skills/[binName]/SKILL.md */
  const skillPath = path.join(configDir, "skills", binName, "SKILL.md");
  await writeSkillFile(skillPath, content);

  logger.info(`✓ 已生成 SKILL 文件: ${path.relative(configDir, skillPath)}`);
}

/**
 * 更新 SDK 的 package.json，添加 pontx.specDir 字段
 * @param configDir - 配置文件所在目录（SDK 根目录）
 * @param outDir - 输出目录（spec 所在目录）
 */
async function updateSdkPackageJson(
  configDir: string,
  outDir: string
): Promise<void> {
  const pkgPath = path.join(configDir, "package.json");

  // 检查 package.json 是否存在
  if (!fs.existsSync(pkgPath)) {
    console.warn(`⚠ 警告: 未找到 package.json: ${pkgPath}`);
    return;
  }

  // 读取 package.json
  const pkg = JSON.parse(await fsp.readFile(pkgPath, "utf-8"));

  // 计算相对路径
  const relativeSpecDir = path.relative(configDir, outDir);

  // 更新 pontx.specDir
  pkg.pontx = {
    ...pkg.pontx,
    specDir: relativeSpecDir || "./dist/bin",
  };

  // 写回 package.json
  await fsp.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");

  console.log(`✓ 已更新 package.json: pontx.specDir = "${relativeSpecDir}"`);
}

/**
 * 生成 esbuild 配置
 */
export function generateEsbuildConfig(
  configPath: string,
  outFile: string
): import("esbuild").BuildOptions {
  /* 生成 shebang 和注入 __CLI_DIR__ */
  const banner = [
    "#!/usr/bin/env node",
    "/* 注入 CLI 目录用于定位 api-lock.json */",
    "globalThis.__CLI_DIR__ = __dirname;",
  ].join("\n");

  return {
    entryPoints: [configPath],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile: outFile,
    external: ["pontx"],
    banner: { js: banner },
    minify: false,
    sourcemap: false,
    target: "node18",
    logLevel: "warning",
  };
}

/**
 * 构建 SDK CLI
 * 将 pontx.cli.ts 编译为可执行的 cli.cjs
 */
export async function cliBuildCommand(options: CliBuildOptions): Promise<void> {
  const { configPath, configDir, outDir, outFile } =
    resolveBuildOptions(options);

  // 1. 检查配置文件是否存在
  if (!fs.existsSync(configPath)) {
    throw new Error(`配置文件不存在: ${configPath}`);
  }

  // 2. 创建输出目录
  await fsp.mkdir(outDir, { recursive: true });

  // 3. 从 pontx.config.ts 读取 spec 并写入到构建目录
  const spec = await getSpecFromPontxConfig(configDir);
  await writeSpecToFile(spec, outDir);

  // 4. 更新 package.json，添加 pontx.specDir 字段
  await updateSdkPackageJson(configDir, outDir);

  // 5. 动态导入 esbuild（避免在不需要时加载）
  const esbuild = await import("esbuild");

  // 6. 编译 pontx.cli.ts → cli.cjs
  const esbuildConfig = generateEsbuildConfig(configPath, outFile);
  await esbuild.build(esbuildConfig);

  // 7. 设置可执行权限（Unix 系统）
  if (process.platform !== "win32") {
    await fsp.chmod(outFile, 0o755);
  }

  // 8. 生成 SKILL.md 文件
  const binName = getBinNameFromPackageJson(configDir);
  if (binName) {
    await generateSdkSkillFile(spec, configDir, binName);
  } else {
    console.warn(`⚠ 警告: 未找到 bin 字段，跳过 SKILL.md 生成`);
  }

  // 9. 输出结果
  console.log(`✓ CLI 构建完成: ${outFile}`);
}
