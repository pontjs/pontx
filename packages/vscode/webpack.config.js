//@ts-check

"use strict";

const path = require("path");
const fs = require("fs");

// 辅助函数：自动查找pnpm依赖路径
function findPnpmDependency(depName) {
  const pnpmDir = path.resolve(__dirname, "../../node_modules/.pnpm");
  try {
    const entries = fs.readdirSync(pnpmDir);
    const match = entries.find(entry => entry.startsWith(`${depName}@`));
    if (match) {
      return path.join(pnpmDir, match, "node_modules", depName);
    }
  } catch (e) {
    console.warn(`Could not find pnpm dependency: ${depName}`);
  }
  return null;
}

// 需要显式解析的依赖
const dependencies = ["picocolors", "commander", "lodash", "baidu-translate-service", "tslib", "typescript"];
const aliasConfig = {};

dependencies.forEach(dep => {
  const depPath = findPnpmDependency(dep);
  if (depPath) {
    aliasConfig[dep] = depPath;
  }
});

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

/** @type WebpackConfig */
const extensionConfig = {
  target: "node", // VS Code extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/
  mode: "none", // this leaves the source code as close as possible to the original (when packaging we set this to 'production')

  entry: "./src/extension.ts", // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
  output: {
    // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
    path: path.resolve(__dirname, "dist"),
    filename: "extension.js",
    libraryTarget: "commonjs2",
  },
  stats: {
    assets: true,
    entrypoints: true,
    chunks: true,
    modules: true,
    reasons: true,
    warnings: true,
    errors: true,

    // 添加更详细的依赖信息
    moduleAssets: true,
    nestedModules: true,
    source: false, // 不显示源码，避免输出太长
  },
  externals: {
    vscode: "commonjs vscode", // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
    // modules added here also need to be added in the .vscodeignore file
  },
  resolve: {
    // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
    extensions: [".ts", ".js", ".cjs"],
    modules: [
      "node_modules",
      path.resolve(__dirname, "../../node_modules"),
      path.resolve(__dirname, "../../node_modules/.pnpm"),
    ],
    alias: {
      ...aliasConfig, // 动态生成的依赖别名
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "ts-loader",
          },
        ],
      },
      {
        test: /\.cjs$/,
        include: /node_modules/,
        type: "javascript/auto", // 告诉 Webpack 按 JS 模块处理
      },
    ],
  },
  devtool: "nosources-source-map",
  infrastructureLogging: {
    level: "log", // enables logging required for problem matchers
  },
  optimization: {
  }
};
module.exports = [extensionConfig];
