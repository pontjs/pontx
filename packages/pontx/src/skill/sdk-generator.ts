/**
 * @author pontx
 * @description SDK CLI SKILL 内容生成器
 *
 * 从 src/sdk-cli/commands/init-skill.ts 提取核心逻辑，
 * 提供元数据读取和模板渲染能力。
 */

import * as fs from "fs";
import * as path from "path";
import {
  SDK_SKILL_TEMPLATE,
  getApiPathExample,
  getApiMethodExample,
  getApiPathFormatHelp,
  getApiPathFormatShort,
} from "./sdk-template";

/**
 * SKILL 元数据
 */
export interface SkillMetadata {
  /** SDK 包名（npm 包名，用于 npm install） */
  name: string;
  /** CLI 命令名（bin 字段的 key，用于命令示例） */
  binName: string;
  /** 版本 */
  version: string;
  /** 是否有 tags */
  hasTags: boolean;
  /** 仓库链接 */
  repository?: string;
  /** 主页链接 */
  homepage?: string;
  /** spec 标题（来自 spec.info.title） */
  specTitle?: string;
  /** spec 描述（来自 spec.info.description） */
  specDescription?: string;
  /** spec 版本（来自 spec.info.version） */
  specVersion?: string;
  /** 外部文档 URL（来自 spec.externalDocs.url） */
  externalDocsUrl?: string;
  /** 外部文档描述（来自 spec.externalDocs.description） */
  externalDocsDescription?: string;
}

/**
 * 查找 package.json 文件
 * @param startDir 起始目录
 */
function findPackageJson(startDir: string): string {
  let dir = startDir;
  while (dir !== path.dirname(dir)) {
    const pkgPath = path.join(dir, "package.json");
    if (fs.existsSync(pkgPath)) {
      return pkgPath;
    }
    dir = path.dirname(dir);
  }
  throw new Error("找不到 package.json 文件");
}

/**
 * 提取 SDK SKILL 元数据（从 api-lock.json + package.json）
 * @param specPath api-lock.json 路径
 * @param cliDir CLI 目录
 * @param binName CLI 命令名（bin 字段的 key）
 */
export function extractSkillMetadata(
  specPath: string,
  cliDir: string,
  binName: string
): SkillMetadata {
  /* 读取 api-lock.json */
  if (!fs.existsSync(specPath)) {
    throw new Error(
      `找不到 api-lock.json 文件: ${specPath}\n请先运行 'pontx cli build' 构建 SDK`
    );
  }

  const spec = JSON.parse(fs.readFileSync(specPath, "utf-8"));

  /* 检测是否有 tags */
  const apis = spec.apis || {};
  const hasTags = Object.keys(apis).some((key) => key.includes("/"));

  /* 读取 package.json */
  const pkgPath = findPackageJson(cliDir);
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

  return {
    name: pkg.name,
    binName,
    version: pkg.version,
    hasTags,
    repository: pkg.repository?.url,
    homepage: pkg.homepage,
    specTitle: spec.info?.title,
    specDescription: spec.info?.description,
    specVersion: spec.info?.version,
    externalDocsUrl: spec.externalDocs?.url,
    externalDocsDescription: spec.externalDocs?.description,
  };
}

/**
 * 生成 SDK SKILL.md 内容
 * @param specPath api-lock.json 路径
 * @param cliDir CLI 目录
 * @param binName CLI 命令名（bin 字段的 key）
 */
export function generateSdkSkillContent(
  specPath: string,
  cliDir: string,
  binName: string
): string {
  const metadata = extractSkillMetadata(specPath, cliDir, binName);

  /* 获取动态内容 */
  const apiPathExample = getApiPathExample(metadata.hasTags);
  const apiMethodExample = getApiMethodExample(metadata.hasTags);
  const apiPathFormat = getApiPathFormatHelp(metadata.hasTags);
  const apiPathFormatShort = getApiPathFormatShort(metadata.hasTags);

  /* 生成 SKILL description（frontmatter，不能有换行） */
  const specDescPart = metadata.specDescription
    ? ` ${metadata.specDescription.replace(/[\r\n]+/g, " ").trim()}`
    : "";
  const skillDescription =
    `使用 ${metadata.binName} CLI 搜索、查看和调用 API。${specDescPart}`.trim();

  /* 生成资源链接 */
  const repoLink = metadata.repository
    ? `- 源码: ${metadata.repository}`
    : "";
  const homeLink = metadata.homepage ? `- 文档: ${metadata.homepage}` : "";
  const externalDocsLink =
    metadata.externalDocsUrl
      ? `- 外部文档: [${metadata.externalDocsDescription || metadata.externalDocsUrl}](${metadata.externalDocsUrl})`
      : "";

  /* 替换模板变量 */
  return SDK_SKILL_TEMPLATE.replace(/\{\{CLI_NAME\}\}/g, metadata.binName)
    .replace(/\{\{SDK_NAME\}\}/g, metadata.name)
    .replace(/\{\{SKILL_DESCRIPTION\}\}/g, skillDescription)
    .replace(/\{\{SPEC_TITLE\}\}/g, metadata.specTitle || "")
    .replace(/\{\{SPEC_DESCRIPTION\}\}/g, metadata.specDescription || "")
    .replace(/\{\{VERSION\}\}/g, metadata.specVersion || metadata.version)
    .replace(/\{\{API_PATH_EXAMPLE\}\}/g, apiPathExample)
    .replace(/\{\{API_METHOD_EXAMPLE\}\}/g, apiMethodExample)
    .replace(/\{\{API_PATH_FORMAT\}\}/g, apiPathFormat)
    .replace(/\{\{API_PATH_FORMAT_SHORT\}\}/g, apiPathFormatShort)
    .replace(/\{\{REPOSITORY_LINK\}\}/g, repoLink)
    .replace(/\{\{HOMEPAGE_LINK\}\}/g, homeLink)
    .replace(/\{\{EXTERNAL_DOCS_LINK\}\}/g, externalDocsLink);
}
