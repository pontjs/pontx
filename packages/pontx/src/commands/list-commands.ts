/**
 * @author jasonHzq
 * @description 注册 pontx list 子命令
 */

import type { Command } from "commander";
import type { CliContext } from "../cli-context";
import { listSpecsCommand } from "./list-specs";
import { listTagsCommand } from "./list-tags";
import { listApisCommand } from "./list-apis";
import { listSchemasCommand } from "./list-schemas";

/**
 * 推断 spec 名称：如果未指定且只有一个 spec，自动使用它
 */
async function resolveSpecName(ctx: CliContext, specName?: string): Promise<string> {
  if (specName) return specName;
  const manager = await ctx.getManager();
  const origins = manager.resolvedConfig.origins;
  if (origins.length === 1) return origins[0].name;
  throw new Error("Multiple specs found. Please specify one with --spec <specName>");
}

/**
 * 注册 list 子命令
 * @param listCmd list 父命令对象
 * @param ctx CLI 上下文
 */
export function registerListCommands(listCmd: Command, ctx: CliContext): void {
  // pontx list specs
  listCmd
    .command("specs")
    .description("列举所有 specs")
    .option("--use-remote", "使用远程元数据")
    .option("--json", "以 JSON 格式输出")
    .action(async (options) => {
      await listSpecsCommand(ctx, options);
    });

  // pontx list tags
  listCmd
    .command("tags")
    .description("列举指定 spec 下的 tags")
    .option("--spec <specName>", "指定 spec 名称")
    .option("--use-remote", "使用远程元数据")
    .option("--json", "以 JSON 格式输出")
    .action(async (options) => {
      options.spec = await resolveSpecName(ctx, options.spec);
      await listTagsCommand(ctx, options.spec, options);
    });

  // pontx list apis
  listCmd
    .command("apis")
    .description("列举指定 spec 下的 APIs")
    .option("--spec <specName>", "指定 spec 名称")
    .option("--tag <tagName>", "指定 tag 名称（可选）")
    .option("--use-remote", "使用远程元数据")
    .option("--json", "以 JSON 格式输出")
    .action(async (options) => {
      options.spec = await resolveSpecName(ctx, options.spec);
      await listApisCommand(ctx, options.spec, options.tag, options);
    });

  // pontx list schemas
  listCmd
    .command("schemas")
    .description("列举指定 spec 下的 schemas")
    .option("--spec <specName>", "指定 spec 名称")
    .option("--use-remote", "使用远程元数据")
    .option("--json", "以 JSON 格式输出")
    .action(async (options) => {
      options.spec = await resolveSpecName(ctx, options.spec);
      await listSchemasCommand(ctx, options.spec, options);
    });
}
