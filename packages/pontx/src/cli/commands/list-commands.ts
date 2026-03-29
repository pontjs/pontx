/**
 * @author jasonHzq
 * @description 全局 list 子命令注册（只保留 specs）
 *
 * spec 作用域的 list 子命令（tags/apis/schemas）已移至 spec/list-commands.ts
 */

import type { Command } from "commander";
import type { CliContext } from "../context";
import { listSpecsCommand } from "./list-specs";

/**
 * 注册全局 list 子命令
 * @param listCmd list 父命令对象
 * @param ctx CLI 上下文
 */
export function registerListCommands(listCmd: Command, ctx: CliContext): void {
  /* pontx list specs */
  listCmd
    .command("specs")
    .description("列举所有 specs")
    .option("--use-remote", "使用远程元数据")
    .option("--json", "以 JSON 格式输出")
    .action(async (options) => {
      await listSpecsCommand(ctx, options);
    });
}
