/**
 * @author: jasonHzq
 * @description: WebView 专用的 Webpack 配置文件，用于构建浏览器端代码
 */

const path = require("path");
const webpack = require("webpack");

/**
 * WebView 构建配置
 */
const webviewConfig = {
  target: "web", // WebView 运行在浏览器环境中
  mode: "none",
  entry: "./src/webview/browser/production/index.tsx",
  output: {
    path: path.resolve(__dirname, "dist", "webview"),
    filename: "browser.js",
    libraryTarget: "var",
    library: "pontxWebView",
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js", ".jsx"],
    modules: [
      "node_modules",
      path.resolve(__dirname, "../../node_modules"),
      path.resolve(__dirname, "../../node_modules/.pnpm"),
    ],
    alias: {
      "@pontx/shadcn-ui": path.resolve(
        __dirname,
        "node_modules/@pontx/shadcn-ui"
      ),
    },
    fallback: {
      // 为浏览器环境提供 Node.js 模块的 polyfill
      buffer: false,
      fs: false,
      path: false,
      crypto: false,
      stream: false,
      util: false,
      os: false,
      child_process: false,
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "ts-loader",
            options: {
              configFile: path.resolve(
                __dirname,
                "src/webview/browser/tsconfig.json"
              ),
              transpileOnly: true, // 只转译，不进行类型检查
            },
          },
        ],
      },
      {
        test: /\.css$/,
        include: [
          path.resolve(__dirname, "node_modules"),
          path.resolve(__dirname, "../../node_modules"),
          //production entry
          path.resolve(__dirname, "src/webview/browser/production"),
        ],
        use: [
          {
            loader: "style-loader",
            options: {
              injectType: "styleTag",
            },
          },
          {
            loader: "css-loader",
            options: {},
          },
        ],
      },
    ],
  },
  devtool: "source-map",
  optimization: {
    // 禁用代码分割，确保所有代码打包到一个文件中
    splitChunks: false,
  },
  plugins: [
    new webpack.DefinePlugin({
      // 替换 process.env 变量，避免浏览器环境中的运行时错误
      "process.env.NODE_ENV": JSON.stringify("production"),
      "process.env": JSON.stringify({}),
      // 替换其他可能的环境变量
      "process.browser": JSON.stringify(true),
      "process.version": JSON.stringify(""),
    }),
  ],
  externals: {
    // 排除 VSCode API，因为它在 WebView 环境中不可用
    vscode: "commonjs vscode",
  },
};

module.exports = webviewConfig;
