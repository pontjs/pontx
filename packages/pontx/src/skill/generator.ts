/**
 * @author pontx
 * @description SKILL 内容生成器，读取项目信息并生成个性化的 SKILL.md 内容
 */

import { getSkillTemplate } from './template';
import * as fs from 'fs';
import * as path from 'path';

/**
 * SKILL 生成上下文
 */
export interface SkillContext {
  /** Pontx 版本号 */
  pontxVersion: string;
  /** 项目配置的数据源列表 */
  projectSpecs?: string[];
  /** 是否有配置文件 */
  hasConfig: boolean;
}

/**
 * 生成 SKILL 内容
 * 读取项目配置信息，替换模板中的变量
 */
export async function generateSkillContent(): Promise<string> {
  const context = await buildContext();
  const template = getSkillTemplate();

  // 简单的变量替换
  let content = template;
  content = content.replace(/\{\{pontxVersion\}\}/g, context.pontxVersion);
  content = content.replace(
    /\{\{projectSpecs\}\}/g,
    context.projectSpecs?.join(', ') || 'Not configured'
  );

  return content;
}

/**
 * 构建 SKILL 生成上下文
 * 读取 pontx 版本和项目配置信息
 */
async function buildContext(): Promise<SkillContext> {
  // 读取 package.json 获取版本
  const packageJsonPath = path.join(__dirname, '../../package.json');
  let pontxVersion = '1.0.0'; // 默认版本

  try {
    const packageJson = JSON.parse(
      fs.readFileSync(packageJsonPath, 'utf-8')
    );
    pontxVersion = packageJson.version || pontxVersion;
  } catch (e) {
    // 读取失败，使用默认版本
  }

  const context: SkillContext = {
    pontxVersion,
    hasConfig: false,
  };

  // 尝试读取项目配置（不抛出错误）
  try {
    const { createCliContext } = await import('../cli-context');
    const cliContext = createCliContext(process.cwd());
    const manager = await cliContext.getManager();

    context.hasConfig = true;
    context.projectSpecs = manager.resolvedConfig.origins.map((o) => o.name);
  } catch (e) {
    // 项目没有配置文件，使用默认值
    context.hasConfig = false;
  }

  return context;
}
