require("dotenv").config();
const express = require("express");
const sql = require("mssql");
const { dbConfig } = require("../config/db.config");

const app = express();
app.use(express.json());

// table creation

async function createTableIfNotExists() {
  try {
    const focusCompanyCode = process.env.focusCompanyCode;
    dbConfig.database = `Focus8${focusCompanyCode}`;
    const pool = new sql.ConnectionPool(dbConfig);
    const connection = await pool.connect();

    const sqlMasterQuery = ` IF NOT EXISTS (
      SELECT 1 FROM sys.tables WHERE name = 'EX_Integration_Status_Master'
    )
    BEGIN
      CREATE TABLE EX_Integration_Status_Master (
        Master_Type VARCHAR(200),
        Master_Id INT,
        Name VARCHAR(200),
        Code VARCHAR(200),
        Created_Date DATE,
        Created_Time TIME,
        Status INT, -- 0 - unposted, 1 - posted, 2 - failed, 3 - do not retry
        Error_Message VARCHAR(MAX),
        Retry_Count INT,
        Last_Retry_Date DATE
      )
    END`;
    await connection.query(sqlMasterQuery);
    console.log("Table checked/created successfully");
  } catch (error) {
    console.log("Error creating table:", error);
  }
}

async function extTableMaster(masterData) {
  try {
    const focusCompanyCode = process.env.focusCompanyCode;
    dbConfig.database = `Focus8${focusCompanyCode}`;
    console.log("config1", dbConfig);
    console.log("extTableMasterRes", masterData);
    try {
      // Create a connection pool
      const pool = new sql.ConnectionPool(dbConfig);
      const connection = await pool.connect();
      // Step 1: Insert master data
      const sqlInsertQuery = `
MERGE EX_Integration_Status_Master AS target
USING (VALUES (
    'Member',
    ${masterData.Master_Id},
    '${masterData.Name}',
    '${masterData.Code}',
    '${new Date().toISOString().split("T")[0]}',
    '${new Date().toTimeString().split(" ")[0]}',
    ${masterData.Status},
    ${masterData.Error_Message ? `'${masterData.Error_Message}'` : "NULL"},
    ${masterData.Retry_Count ?? 0},
    ${masterData.Last_Retry_Date ? `'${masterData.Last_Retry_Date}'` : "NULL"}
)) AS source (Master_Type, Master_Id, Name, Code, Created_Date, Created_Time, Status, Error_Message, Retry_Count, Last_Retry_Date)
ON target.Code = source.Code
WHEN MATCHED THEN
    UPDATE SET
        Master_Type    = source.Master_Type,
        Master_Id      = source.Master_Id,
        Name           = source.Name,
        Created_Date   = source.Created_Date,
        Created_Time   = source.Created_Time,
        Status         = source.Status,
        Error_Message  = source.Error_Message,
        Retry_Count    = source.Retry_Count,
        Last_Retry_Date = source.Last_Retry_Date
WHEN NOT MATCHED THEN
    INSERT (Master_Type, Master_Id, Name, Code, Created_Date, Created_Time, Status, Error_Message, Retry_Count, Last_Retry_Date)
    VALUES (source.Master_Type, source.Master_Id, source.Name, source.Code, source.Created_Date, source.Created_Time, source.Status, source.Error_Message, source.Retry_Count, source.Last_Retry_Date);
`;

      console.log("SQL Insert Query:\n", sqlInsertQuery);

      const request = connection.request();
      //   request.input("Master_Type", sql.VarChar, "Member");
      //   request.input("Master_Id", sql.Int, masterData.Master_Id);
      //   request.input("Name", sql.VarChar, masterData.Name);
      //   request.input("Code", sql.VarChar, masterData.Code);
      //   //   current date
      //   request.input(
      //     "Created_Date",
      //     sql.Date,
      //     new Date().toISOString().split("T")[0]
      //   );
      //   //   current time
      //   request.input(
      //     "Created_Time",
      //     sql.Time,
      //     new Date().toTimeString().split(" ")[0]
      //   );
      //   request.input("Status", sql.Int, masterData.Status);
      //   request.input("Error_Message", sql.VarChar, masterData.Error_Message);
      //   request.input("Retry_Count", sql.Int, masterData.Retry_Count);
      //   request.input(
      //     "Last_Retry_Date",
      //     sql.Date,
      //     masterData.Last_Retry_Date || null
      //   );
      await request.query(sqlInsertQuery);
      console.log("Master data inserted successfully");
    } catch (error) {
      console.log("Error inserting master data:", error);
    }
  } catch (err) {
    console.log("Error in extTableMaster:", err);
  }
}

module.exports = {
  createTableIfNotExists,
  extTableMaster,
};
