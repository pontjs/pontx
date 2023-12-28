const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
  mode: "production",
  entry: [
    path.resolve(__dirname, "src/components/components.scss"),
    path.resolve(__dirname, "src/components/components.less"),
  ],
  output: {
    path: path.resolve(__dirname, "dist/static"),
  },
  resolve: {
    extensions: [".css", ".less", ".scss", ".js"],
    modules: ["node_modules"],
    alias: {},
  },
  module: {
    rules: [
      {
        test: /\.less$/,
        include: [path.resolve(__dirname, "src")],
        use: [
          MiniCssExtractPlugin.loader,
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
        test: /\.scss$/,
        include: [path.resolve(__dirname, "src"), path.resolve(__dirname, "node_modules")],
        use: [
          MiniCssExtractPlugin.loader,
          "css-loader",
          {
            loader: "postcss-loader",
            options: {
              postcssOptions: {
                plugins: [require("postcss-nested")()],
              },
            },
          },
          "sass-loader",
        ],
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
      filename: "components.css",
    }),
  ],
};
