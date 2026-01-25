/**
 * @author pontx
 * @description CLI 管理命令注册
 */

import { Command } from "commander";
import { cliBuildCommand } from "./cli-build";
import { cliInitCommand, formatInitResult } from "./cli-init";

/**
 * 注册 SDK CLI 子命令到 cli 命令组
 */
export function registerCliCommands(cliCmd: Command): void {
  // pontx cli init --name <name>
  cliCmd
    .command("init")
    .description("初始化 SDK CLI，更新 package.json 的 bin 字段")
    .requiredOption("--name <name>", "CLI 命令名（如 x, my-cli）")
    .option("-o, --out <path>", "CLI 输出目录", "./dist/bin")
    .action(async (options) => {
      try {
        const result = await cliInitCommand({
          name: options.name,
          out: options.out,
        });
        console.log(formatInitResult(result));
      } catch (error: any) {
        console.error(`错误: ${error.message}`);
        process.exit(1);
      }
    });

  // pontx cli build
  cliCmd
    .command("build")
    .description("构建 SDK CLI，将 pontx.cli.ts 编译为 cli.cjs")
    .option("-c, --config <path>", "配置文件路径", "./pontx.cli.ts")
    .option("-o, --out <path>", "输出目录", "./dist/bin")
    .action(async (options) => {
      try {
        await cliBuildCommand({
          config: options.config,
          out: options.out,
        });
      } catch (error: any) {
        console.error(`错误: ${error.message}`);
        process.exit(1);
      }
    });
}
