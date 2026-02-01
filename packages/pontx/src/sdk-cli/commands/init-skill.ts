/**
 * @author jasonHzq
 * @description SDK CLI SKILL 生成命令
 * 用于生成 Claude Code SKILL 文件，教会 AI 如何使用 SDK CLI
 */

import * as fs from "fs";
import * as path from "path";
import { CLIConfig } from "../types";
import {
  SKILL_MD_TEMPLATE,
  getApiPathExample,
  getApiMethodExample,
  getApiPathFormatHelp,
} from "../templates/skill-template";

/**
 * SKILL 元数据
 */
interface SkillMetadata {
  /** SDK 名称 */
  name: string;
  /** 描述 */
  description: string;
  /** 版本 */
  version: string;
  /** API 总数 */
  apiCount: number;
  /** 是否有 tags */
  hasTags: boolean;
  /** 仓库链接 */
  repository?: string;
  /** 主页链接 */
  homepage?: string;
}

/**
 * SKILL 生成选项
 */
interface SkillGenerationOptions {
  /** 输出路径，默认 ./.claude/skills/<sdk-name> */
  output?: string;
  /** 覆盖已存在的文件 */
  force?: boolean;
}

/**
 * 查找 package.json 文件
 * @param startDir 起始目录
 * @returns package.json 的绝对路径
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
 * 提取 SKILL 元数据
 * @param specPath api-lock.json 路径
 * @param cliDir CLI 目录
 * @returns SKILL 元数据
 */
function extractSkillMetadata(
  specPath: string,
  cliDir: string
): SkillMetadata {
  // 1. 读取 api-lock.json
  if (!fs.existsSync(specPath)) {
    throw new Error(
      `找不到 api-lock.json 文件: ${specPath}\n请先运行 'pontx cli build' 构建 SDK`
    );
  }

  const spec = JSON.parse(fs.readFileSync(specPath, "utf-8"));

  // 2. 检测是否有 tags
  const apis = spec.apis || {};
  const hasTags = Object.keys(apis).some((key) => key.includes("/"));

  // 3. 统计 API 数量
  const apiCount = Object.keys(apis).length;

  // 4. 读取 package.json
  const pkgPath = findPackageJson(cliDir);
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

  // 5. 提取必要信息
  return {
    name: pkg.name,
    description: pkg.description || `${pkg.name} SDK`,
    version: pkg.version,
    apiCount,
    hasTags,
    repository: pkg.repository?.url,
    homepage: pkg.homepage,
  };
}

/**
 * 生成 SKILL.md 内容
 * @param metadata SKILL 元数据
 * @param config CLI 配置
 * @returns SKILL.md 文件内容
 */
function generateSkillMd(
  metadata: SkillMetadata,
  config: CLIConfig
): string {
  // 获取 API 路径示例
  const apiPathExample = getApiPathExample(metadata.hasTags);

  // 获取 API 方法示例
  const apiMethodExample = getApiMethodExample(metadata.hasTags);

  // 获取 API 路径格式说明
  const apiPathFormat = getApiPathFormatHelp(metadata.hasTags);

  // 生成资源链接
  const repoLink = metadata.repository
    ? `- 源码: ${metadata.repository}`
    : "";
  const homeLink = metadata.homepage ? `- 文档: ${metadata.homepage}` : "";

  // 替换模板变量
  return SKILL_MD_TEMPLATE.replace(/{{SDK_NAME}}/g, metadata.name)
    .replace(/{{DESCRIPTION}}/g, metadata.description)
    .replace(/{{VERSION}}/g, metadata.version)
    .replace(/{{API_COUNT}}/g, metadata.apiCount.toString())
    .replace(/{{API_PATH_EXAMPLE}}/g, apiPathExample)
    .replace(/{{API_METHOD_EXAMPLE}}/g, apiMethodExample)
    .replace(/{{API_PATH_FORMAT}}/g, apiPathFormat)
    .replace(/{{REPOSITORY_LINK}}/g, repoLink)
    .replace(/{{HOMEPAGE_LINK}}/g, homeLink);
}

/**
 * init-skill 命令实现
 * @param config CLI 配置
 * @param cliDir CLI 目录
 * @param specPath api-lock.json 路径
 * @param options 生成选项
 */
export async function initSkillCommand(
  config: CLIConfig,
  cliDir: string,
  specPath: string,
  options: SkillGenerationOptions
): Promise<void> {
  try {
    // 1. 提取元数据
    const metadata = extractSkillMetadata(specPath, cliDir);

    // 2. 确定输出路径
    const outputDir =
      options.output || `./.claude/skills/${metadata.name}`;
    const absoluteOutputDir = path.resolve(process.cwd(), outputDir);

    // 3. 检查目录是否存在
    if (fs.existsSync(absoluteOutputDir) && !options.force) {
      throw new Error(
        `目录已存在: ${absoluteOutputDir}\n使用 --force 选项覆盖已存在的文件`
      );
    }

    // 4. 生成 SKILL.md
    const skillContent = generateSkillMd(metadata, config);

    // 5. 写入文件
    fs.mkdirSync(absoluteOutputDir, { recursive: true });
    const skillFilePath = path.join(absoluteOutputDir, "SKILL.md");
    fs.writeFileSync(skillFilePath, skillContent, "utf-8");

    // 6. 输出成功信息
    console.log(`✓ SKILL 文件已生成: ${skillFilePath}`);
    console.log(`\n包含 ${metadata.apiCount} 个 API 接口`);
    console.log(`\n使用方式:`);
    console.log(`  1. 在 Claude Code 中输入 "/${metadata.name}" 查看可用命令`);
    console.log(`  2. 使用 "/${metadata.name} search <keyword>" 搜索 API`);
    console.log(`  3. 使用 "/${metadata.name} show-api <api-path>" 查看详情`);
  } catch (error: any) {
    throw new Error(`生成 SKILL 失败: ${error.message}`);
  }
}
