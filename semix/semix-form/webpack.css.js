const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
  mode: "production",
  entry: [path.resolve(__dirname, "src/styles.less")],
  output: {
    path: path.resolve(__dirname, "dist"),
  },
  resolve: {
    extensions: [".css", ".less", ".scss"],
    alias: {},
  },
  module: {
    rules: [
      {
        test: /\.scss$/,
        include: [path.resolve(__dirname, "src"), path.resolve(__dirname, "node_modules")],
        use: [MiniCssExtractPlugin.loader, "css-loader", "postcss-loader", "sass-loader"],
      },
      {
        test: /\.less$/,
        include: [path.resolve(__dirname, "src"), path.resolve(__dirname, "node_modules")],
        use: [MiniCssExtractPlugin.loader, "css-loader", "postcss-loader", "less-loader"],
      },
      {
        test: /\.css$/,
        include: [path.resolve(__dirname, "src"), path.resolve(__dirname, "node_modules")],
        use: [MiniCssExtractPlugin.loader, "css-loader"],
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
      filename: "index.css",
    }),
  ],
};
