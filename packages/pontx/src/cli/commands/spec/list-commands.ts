/**
 * @author jasonHzq
 * @description Spec 作用域 list 子命令注册
 */

import type { Command } from "commander";
import type { CliContext } from "../../context";
import { listTagsCommand } from "./list-tags";
import { listApisCommand } from "./list-apis";
import { listSchemasCommand } from "./list-schemas";
import { listStreamsCommand } from "./list-streams";

/**
 * 注册 spec 作用域 list 子命令
 * @param listCmd list 父命令对象
 * @param specName spec 名称（从父命令上下文获取）
 * @param ctx CLI 上下文
 */
export function registerSpecListCommands(listCmd: Command, specName: string, ctx: CliContext): void {
  /* pontx <spec> list tags */
  listCmd
    .command("tags")
    .description("列举 tags")
    .option("--use-remote", "使用远程元数据")
    .option("--json", "以 JSON 格式输出")
    .action(async (options) => {
      await listTagsCommand(ctx, specName, options);
    });

  /* pontx <spec> list apis */
  listCmd
    .command("apis")
    .description("列举 APIs")
    .option("--tag <tagName>", "指定 tag 名称（可选）")
    .option("--use-remote", "使用远程元数据")
    .option("--json", "以 JSON 格式输出")
    .action(async (options) => {
      await listApisCommand(ctx, specName, options.tag, options);
    });

  /* pontx <spec> list schemas */
  listCmd
    .command("schemas")
    .description("列举 schemas")
    .option("--use-remote", "使用远程元数据")
    .option("--json", "以 JSON 格式输出")
    .action(async (options) => {
      await listSchemasCommand(ctx, specName, options);
    });

  /* pontx <spec> list streams */
  listCmd
    .command("streams")
    .description("列举流式接口 / AsyncAPI operations（不会建立连接）")
    .option("--use-remote", "使用远程元数据")
    .option("--json", "以 JSON 格式输出")
    .action(async (options) => {
      await listStreamsCommand(ctx, specName, options);
    });
}
