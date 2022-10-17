const nodeExternals = require("webpack-node-externals");
const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
  // target: "node",
  // externals: [nodeExternals()],
  // mode: "production",
  entry: path.resolve(__dirname, "..", "src/server.ts"),
  output: {
    path: path.resolve(__dirname, "..", "lib"),
    publicPath: "/lib/",
    library: "app",
    libraryTarget: "commonjs",
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
    alias: {},
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: "ts-loader",
            options: {
              happyPackMode: true,
              reportFiles: ["!src/scripts/**", "./src/**/*.{ts,tsx}"],
              configFile: path.resolve(__dirname, "../tsconfig.json"),
            },
          },
        ],
      },
      {
        test: /\.less$/,
        include: [
          path.resolve(__dirname, "../../../pontx-ui"),
          path.resolve(__dirname, "../node_modules/pontx-ui/lib"),
          path.resolve(__dirname, "../src"),
        ],
        use: [
          { loader: MiniCssExtractPlugin.loader },
          "css-loader",
          {
            loader: "less-loader",
            options: {
              lessOptions: {
                sourceMap: true,
                javascriptEnabled: true,
              },
            },
          },
        ],
      },
      {
        test: /\.css$/,
        include: [
          path.resolve(__dirname, "../../../pontx-ui"),
          path.resolve(__dirname, "../node_modules/pontx-ui/lib"),
          path.resolve(__dirname, "../src"),
        ],
        use: [{ loader: MiniCssExtractPlugin.loader }, "css-loader"],
      },
      {
        test: /\.(ttf|eot|otf|svg|png)$/,
        use: "file-loader",
      },
      {
        test: /\.(woff|woff2)$/,
        use: "url-loader",
      },
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: "[name].css",
    }),
  ],
};
