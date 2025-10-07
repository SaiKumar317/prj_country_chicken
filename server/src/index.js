require("dotenv").config();
const express = require("express");
const selfsigned = require("selfsigned");
const https = require("https");
const http = require("http");
const fs = require("fs");
const app = express();
const cors = require("cors");
const countryChickenRouter = require("./routes/countryChickenRouter");
const { createTableIfNotExists } = require("./controller/extTableMaster");
const {
  createTransactionTableIfNotExists,
} = require("./controller/extTableTransaction");
const {
  dbConfig,
  httpPort,
  httpsPort,
  privateKey,
  certificate,
} = require("./config/db.config");
const path = require("path");

app.use(cors());
app.use(express.json());

// All Routes
app.use("/", countryChickenRouter);

createTableIfNotExists();
createTransactionTableIfNotExists();

// HTTP server
const httpServer = http.createServer(app);

httpServer.listen(httpPort, () => {
  console.log(`HTTP Server running on http://localhost:${httpPort}`);
});

// HTTPS server

try {
  const credentials = {
    key: privateKey,
    cert: certificate,
  };

  const httpsServer = https.createServer(credentials, app);
  const ipAddress = "0.0.0.0";

  httpsServer.listen(httpsPort, ipAddress, () => {
    console.log(`HTTPS Server running on https://localhost:${httpsPort}`);
  });

  httpsServer.on("error", (error) => {
    console.error("Server error:", error);
  });
} catch (serverError) {
  console.error("Error creating HTTPS server:", serverError);
}
