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
    alias: {
      // png-js inflates PNGs with fflate's `unzlib`, which spawns a Web Worker
      // from a blob: URL that a strict CSP blocks — hanging the PDF export.
      // Route it to a main-thread stand-in. The trailing `$` matches only the
      // bare specifier, so the shim's own `fflate/browser` import still
      // resolves to the real package.
      fflate$: path.resolve(__dirname, "src/utils/pdf/fflateNoWorker.ts"),
    },
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
      {
        test: /\.ya?ml$/,
        type: "asset/source",
      },
      {
        test: /\.ttf$/,
        type: "asset/inline",
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
