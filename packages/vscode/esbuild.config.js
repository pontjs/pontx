/**
 * @author: jasonHzq
 * @description: esbuild 配置文件，用于解决模块解析问题
 */

const esbuild = require("esbuild");

const buildConfig = {
  entryPoints: ["src/extension.ts"],
  bundle: true,
  platform: "node",
  target: "node16",
  format: "cjs",
  outfile: "dist/extension.js",
  sourcemap: false,
  external: ["vscode"],
  // 处理 JSON 模块
  loader: {
    ".json": "json",
  },
  // 重要：确保 @stoplight/json 被打包而不是作为外部依赖
  mainFields: ["module", "main"],
  // 插件配置
  plugins: [],
};

// 构建函数
async function build() {
  try {
    await esbuild.build(buildConfig);
    console.log("Build completed successfully");
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  build();
}

module.exports = buildConfig;
