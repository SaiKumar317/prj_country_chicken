const path = require("path");

module.exports = {
  entry: {
    main: "./src/index.js",
    "db.config": "./src/config/db.config.js",
    onlineSalesOrder: "./src/controller/onlineSalesOrder.js",
    onAuthorizeSo: "./src/controller/onAuthorizeSo.js",

    countryChickenRouter: "./src/routes/countryChickenRouter.js",
  },
  output: {
    path: path.join(
      "C:\\inetpub\\wwwroot\\country_chicken",
      "online_sales_order"
    ),
    publicPath: "/",
    filename: "[name].js",
    clean: true,
  },
  mode: "production",
  target: "node",

  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: "babel-loader",
      },
    ],
  },
};
