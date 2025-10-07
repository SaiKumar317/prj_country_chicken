require("dotenv").config();
const express = require("express");
const sql = require("mssql");
const { dbConfig } = require("../config/db.config");

const app = express();
app.use(express.json());

// Create table if not exists
async function createTransactionTableIfNotExists() {
  try {
    const focusCompanyCode = process.env.focusCompanyCode;
    dbConfig.database = `Focus8${focusCompanyCode}`;

    const pool = new sql.ConnectionPool(dbConfig);
    const connection = await pool.connect();

    const sqlTransactionQuery = `
      IF NOT EXISTS (
        SELECT 1 FROM sys.tables WHERE name = 'EX_Integration_Status_Transaction'
      )
      BEGIN
        CREATE TABLE EX_Integration_Status_Transaction (
          Document_Type INT,
          Document_Name VARCHAR(200),
          Document_No VARCHAR(200),
          OrderId VARCHAR(200),
          Document_Date DATE,
          Created_Time TIME,
          Status INT, -- 0 - unposted, 1 - posted, 2 - failed, 3 - do not retry
          Error_Message VARCHAR(MAX),
          Retry_Count INT,
          Last_Retry_Date DATE
        )
      END
    `;

    await connection.query(sqlTransactionQuery);
    console.log("Transaction table checked/created successfully");
  } catch (error) {
    console.log("Error creating transaction table:", error);
  }
}

function getSqlTime(value) {
  if (!value) {
    const now = new Date();
    return now.toTimeString().split(" ")[0]; // HH:MM:SS
  }
  if (typeof value === "string") {
    return value.split(".")[0].trim(); // remove fractional seconds if present
  }
  if (value instanceof Date) {
    return value.toTimeString().split(" ")[0];
  }
  return value;
}

// Insert into transaction table
async function extTableTransaction(transactionData) {
  try {
    const focusCompanyCode = process.env.focusCompanyCode;
    dbConfig.database = `Focus8${focusCompanyCode}`;

    const pool = new sql.ConnectionPool(dbConfig);
    const connection = await pool.connect();

    const sqlInsertQuery = `
MERGE EX_Integration_Status_Transaction AS target
USING (VALUES (
    ${transactionData.Document_Type ?? 5634},
    'Online Sales Orders',
    '${transactionData.Document_No}',
    '${transactionData.OrderId}',
    '${
      transactionData.Document_Date || new Date().toISOString().split("T")[0]
    }',
    '${getSqlTime(transactionData?.Created_Time)}',
    ${transactionData.Status},
    ${
      transactionData.Error_Message
        ? `'${transactionData.Error_Message}'`
        : "NULL"
    },
    ${transactionData.Retry_Count ?? 0},
    ${
      transactionData?.Last_Retry_Date
        ? `'${transactionData?.Last_Retry_Date}'`
        : "NULL"
    }
)) AS source (
    Document_Type, Document_Name, Document_No, OrderId, Document_Date,
    Created_Time, Status, Error_Message, Retry_Count, Last_Retry_Date
)
ON target.OrderId = source.OrderId
WHEN MATCHED THEN
    UPDATE SET 
        Document_Type = source.Document_Type,
        Document_Name = source.Document_Name,
        Document_No = source.Document_No,
        Document_Date = source.Document_Date,
        Created_Time = source.Created_Time,
        Status = source.Status,
        Error_Message = source.Error_Message,
        Retry_Count = source.Retry_Count,
        Last_Retry_Date = source.Last_Retry_Date
WHEN NOT MATCHED THEN
    INSERT (
        Document_Type, Document_Name, Document_No, OrderId, Document_Date,
        Created_Time, Status, Error_Message, Retry_Count, Last_Retry_Date
    )
    VALUES (
        source.Document_Type, source.Document_Name, source.Document_No, source.OrderId,
        source.Document_Date, source.Created_Time, source.Status, source.Error_Message,
        source.Retry_Count, source.Last_Retry_Date
    );
`;
    // const debugQuery = sqlInsertQuery
    //   .replace("@Document_Type", transactionData.Document_Type ?? "5634")
    //   .replace("@Document_Name", `'Online Sales Orders'`)
    //   .replace("@Document_No", `'${transactionData.Document_No}'`)
    //   .replace("@OrderId", `'${transactionData.OrderId}'`)
    //   .replace(
    //     "@Document_Date",
    //     `'${
    //       transactionData.Document_Date ||
    //       new Date().toISOString().split("T")[0]
    //     }'`
    //   )
    //   .replace(
    //     "@Created_Time",
    //     `'${getSqlTime(transactionData?.Created_Time)}'`
    //   )
    //   .replace("@Status", transactionData.Status)
    //   .replace(
    //     "@Error_Message",
    //     transactionData.Error_Message
    //       ? `'${transactionData.Error_Message}'`
    //       : "NULL"
    //   )
    //   .replace("@Retry_Count", transactionData.Retry_Count ?? 0)
    //   .replace(
    //     "@Last_Retry_Date",
    //     transactionData?.Last_Retry_Date
    //       ? `'${transactionData?.Last_Retry_Date}'`
    //       : "NULL"
    //   );

    // console.log("DEBUG SQL1:\n", debugQuery);
    const request = connection.request();
    // request.input("Document_Type", sql.Int, "5634");
    // request.input("Document_Name", sql.VarChar(200), "Online Sales Orders");
    // request.input("Document_No", sql.VarChar(200), transactionData.Document_No);
    // request.input("OrderId", sql.VarChar(200), transactionData.OrderId);
    // request.input(
    //   "Document_Date",
    //   sql.Date,
    //   transactionData.Document_Date || new Date().toISOString().split("T")[0]
    // );
    // request.input(
    //   "Created_Time",
    //   sql.Time,
    //   `'${getSqlTime(transactionData?.Created_Time)}'`
    // );
    // request.input("Status", sql.Int, transactionData.Status);
    // request.input(
    //   "Error_Message",
    //   sql.VarChar(sql.MAX),
    //   transactionData.Error_Message || null
    // );
    // request.input("Retry_Count", sql.Int, transactionData.Retry_Count ?? 0);
    // request.input(
    //   "Last_Retry_Date",
    //   sql.Date,
    //   transactionData.Last_Retry_Date || null
    // );
    console.log("transactionData", transactionData);

    const result = await request.query(sqlInsertQuery);

    console.log("Transaction data inserted successfully");
  } catch (error) {
    console.log("Error inserting transaction data:", error);
  }
}

// update into transaction table
async function updateTransactionStatus(transactionData) {
  try {
    const focusCompanyCode = process.env.focusCompanyCode;
    dbConfig.database = `Focus8${focusCompanyCode}`;

    const pool = new sql.ConnectionPool(dbConfig);
    const connection = await pool.connect();

    //   update all columns based on OrderId
    const sqlUpdateQuery = `
      UPDATE EX_Integration_Status_Transaction
      SET Document_Type = @Document_Type,
          Document_Name = @Document_Name,
          Document_No = @Document_No,
          OrderId = @OrderId,
          Document_Date = @Document_Date,
          Created_Time = @Created_Time,
          Status = @Status,
          Error_Message = @Error_Message,
          Retry_Count = @Retry_Count,
          Last_Retry_Date = @Last_Retry_Date
      WHERE OrderId = @OrderId
    `;

    const request = connection.request();
    request.input("Document_Type", sql.Int, "5634");
    request.input("Document_Name", sql.VarChar(200), "Online Sales Orders");
    request.input("Document_No", sql.VarChar(200), transactionData.Document_No);
    request.input("OrderId", sql.VarChar(200), transactionData.OrderId);
    request.input("Document_Date", sql.Date, transactionData.Document_Date);
    request.input("Created_Time", sql.Time, transactionData.Created_Time);
    request.input("Status", sql.Int, transactionData.Status);
    request.input(
      "Error_Message",
      sql.VarChar(sql.MAX),
      transactionData.Error_Message
    );
    request.input("Retry_Count", sql.Int, transactionData.Retry_Count);
    request.input("Last_Retry_Date", sql.Date, transactionData.Last_Retry_Date);

    await request.query(sqlUpdateQuery);

    console.log("Transaction status updated successfully");
  } catch (error) {
    console.log("Error updating transaction status:", error);
  }
}

module.exports = {
  createTransactionTableIfNotExists,
  extTableTransaction,
  updateTransactionStatus,
};
