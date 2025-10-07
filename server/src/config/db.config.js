// config/db.config.js
const fs = require("fs");
const path = require("path");
const xml2js = require("xml2js");
const selfsigned = require("selfsigned");

// ===== File paths =====
const xmlFilePath = process.env.DB_XML_FILE_PATH;
const privateKeyPath = path.join(__dirname, process.env.DB_PRIVATE_KEY);
const certificatePath = path.join(__dirname, process.env.DB_CERTIFICATE);

// ===== Step 1: Ensure certificates exist =====
let privateKey, certificate;
try {
  privateKey = fs.readFileSync(privateKeyPath, "utf8");
  certificate = fs.readFileSync(certificatePath, "utf8");
  console.log("Certificates found. Using existing files.");
} catch {
  console.log("Certificates not found. Generating new certificates...");
  const attrs = [{ name: "commonName", value: "localhost" }];
  const pems = selfsigned.generate(attrs, { days: 365 });
  fs.writeFileSync(privateKeyPath, pems.private);
  fs.writeFileSync(certificatePath, pems.cert);
  privateKey = pems.private;
  certificate = pems.cert;
}

// ===== Step 2: Read XML synchronously =====
const xmlData = fs.readFileSync(xmlFilePath, "utf-8");

let activeSqlServer;
xml2js.parseString(xmlData, { explicitArray: true }, (err, result) => {
  if (err) throw new Error("Error parsing XML: " + err.message);

  const databases = result.DatabaseConfig.Database;
  activeSqlServer = databases.find(
    (db) => db.$.Type === "SQLServer" && db.$.Active === "1"
  );

  if (!activeSqlServer) {
    throw new Error("No active SQLServer configuration found in XML.");
  }
});

// ===== Step 3: Build config =====
const dbConfig = {
  user: activeSqlServer.User_Id[0],
  password: activeSqlServer.Password[0],
  server: activeSqlServer.Data_Source[0],
  database: activeSqlServer.Initial_Catalog[0],
  requestTimeout: 600000,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 300000,
  },
  options: {
    encrypt: true,
    trustServerCertificate: true,
    cryptoCredentialsDetails: {
      minVersion: "TLSv1",
    },
    ssl: {
      rejectUnauthorized: false,
      ca: fs.readFileSync(privateKeyPath),
    },
  },
};

const httpsPort = process.env.DB_PORT_HTTPS;
const httpPort = process.env.DB_PORT_HTTP;

module.exports = {
  dbConfig,
  httpPort,
  httpsPort,
  privateKey,
  certificate,
};
