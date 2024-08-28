const path = require("path");

module.exports = {
  entry: "./src/index.tsx",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "self-assessment.js",
    library: "SelfAssessment",
    libraryTarget: "umd",
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules\/(?!yoga-layout)/, // Process yoga-layout with ts-loader
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.module\.scss$/,
        use: [
          "style-loader",
          {
            loader: "css-loader",
            options: {
              modules: {
                localIdentName: "[local]", // Use '[name]__[local]__[hash:base64:5]' for scoped names
              },
            },
          },
          "sass-loader",
        ],
        include: /\.module\.scss$/,
        exclude: /node_modules/,
      },
      {
        test: /\.scss$/,
        use: ["style-loader", "css-loader", "sass-loader"],
        exclude: /\.module\.scss$/,
      },
      {
        test: /\.svg$/,
        use: "file-loader",
      },
    ],
  },
  devServer: {
    static: {
      directory: path.join(__dirname, "dist"),
    },
    compress: true,
    port: 9000,
  },
};
