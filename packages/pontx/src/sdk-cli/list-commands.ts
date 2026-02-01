/**
 * @author jasonHzq
 * @description SDK CLI 中的 list 子命令注册
 */

import type { Command } from "commander";
import type { CliContext } from "../cli-context";
import { createLogger } from "../logger/logger";
import { listSpecsCommand } from "../commands/list-specs";
import { listTagsCommand } from "../commands/list-tags";
import { listApisCommand } from "../commands/list-apis";
import { listSchemasCommand } from "../commands/list-schemas";

const logger = createLogger();

/**
 * 获取 spec 名称（SDK CLI 模式下，如果没有指定则使用唯一的 spec）
 */
async function getSpecName(
  context: CliContext,
  specName?: string
): Promise<string> {
  if (specName) {
    return specName;
  }
  const manager = await context.getManager();
  const origin = manager.resolvedConfig.origins[0];
  if (!origin) {
    throw new Error("No spec found");
  }
  return origin.name;
}

/**
 * 注册 SDK CLI 的 list 子命令
 * @param listCmd list 父命令对象
 * @param context SDK CLI 上下文
 */
export function registerSdkListCommands(
  listCmd: Command,
  context: CliContext
): void {
  // SDK list specs
  listCmd
    .command("specs")
    .description("列举所有 specs")
    .option("--use-remote", "使用远程元数据")
    .option("--json", "以 JSON 格式输出")
    .action(async (options) => {
      try {
        await listSpecsCommand(context, options);
      } catch (error: any) {
        logger.error("列举 specs 失败", error);
        process.exit(1);
      }
    });

  // SDK list tags
  listCmd
    .command("tags")
    .description("列举所有 tags")
    .option("--spec <specName>", "指定 spec 名称（可选，默认使用唯一的 spec）")
    .option("--use-remote", "使用远程元数据")
    .option("--json", "以 JSON 格式输出")
    .action(async (options) => {
      try {
        const specName = await getSpecName(context, options.spec);
        await listTagsCommand(context, specName, options);
      } catch (error: any) {
        logger.error("列举 tags 失败", error);
        process.exit(1);
      }
    });

  // SDK list apis
  listCmd
    .command("apis")
    .description("列举 APIs")
    .option("--spec <specName>", "指定 spec 名称（可选，默认使用唯一的 spec）")
    .option("--tag <tagName>", "指定 tag 名称（可选）")
    .option("--use-remote", "使用远程元数据")
    .option("--json", "以 JSON 格式输出")
    .action(async (options) => {
      try {
        const specName = await getSpecName(context, options.spec);
        await listApisCommand(context, specName, options.tag, options);
      } catch (error: any) {
        logger.error("列举 APIs 失败", error);
        process.exit(1);
      }
    });

  // SDK list schemas
  listCmd
    .command("schemas")
    .description("列举所有 schemas")
    .option("--spec <specName>", "指定 spec 名称（可选，默认使用唯一的 spec）")
    .option("--use-remote", "使用远程元数据")
    .option("--json", "以 JSON 格式输出")
    .action(async (options) => {
      try {
        const specName = await getSpecName(context, options.spec);
        await listSchemasCommand(context, specName, options);
      } catch (error: any) {
        logger.error("列举 schemas 失败", error);
        process.exit(1);
      }
    });
}
