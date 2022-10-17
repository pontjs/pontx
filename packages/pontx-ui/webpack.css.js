const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
  mode: "production",
  entry: path.resolve(__dirname, "src/components/styles.less"),
  output: {
    path: path.resolve(__dirname, "dist/static"),
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
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
        test: /\.css$/,
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
      filename: "[name].css",
    }),
  ],
};
