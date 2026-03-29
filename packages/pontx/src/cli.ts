/**
 * @author jasonHzq
 * @description Pontx CLI 入口文件
 */

import { createCli, runCli } from "./cli-factory";

// 导出工厂函数供其他包使用
export { createCli, runCli };

// 主函数 - 仅在作为入口文件运行时执行
async function main() {
  const program = await createCli({
    rootDir: process.cwd(),
    binName: "pontx",
  });
  await runCli(program);
}

main().catch((e) => {
  const error = e instanceof Error ? e : new Error(String(e));
  console.error("命令执行失败:", error.message);
  process.exit(1);
});
