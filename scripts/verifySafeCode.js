// Invoked on the commit-msg git hook by yorkie.

const chalk = require("chalk");
const fs = require("fs-extra");
const path = require("path");

// 校验示例项目
const examplePontConfig = require("../examples/hooks-app/config/pontx-config.json");
if (examplePontConfig.origin && examplePontConfig.origin.url !== "https://petstore.swagger.io/v2/swagger.json") {
  console.log();
  console.error(`  ${chalk.red(`[ERROR]: examples/hooks-app pont-config url 不合法`)}\n\n`);

  process.exit(1);
}

// 校验 pont-ui mocks
const contextCode = fs.readFileSync(path.join(__dirname, "../packages/pontx-ui/src/layout/context.ts"), "utf-8");
const hasPontUIUseMocks = (contextCode || "").includes(`\nimport * as spec from "../mocks/spec.json";`);
if (hasPontUIUseMocks) {
  console.log();
  console.error(`  ${chalk.red(`[ERROR]: packages/pont-ui/src/layout/context.ts 引用了 mocks 数据`)}\n\n`);

  process.exit(1);
}
