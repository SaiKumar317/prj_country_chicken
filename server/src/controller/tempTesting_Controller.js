const sql = require("mssql");
const path = require("path");
const fs = require("fs");
const { dbConfig } = require("../config/db.config");

async function getTempTesting(req, fileName, res) {
  try {
    console.log("TempRequest: ", req);
    let parsedArray = [req];
    // Create a temporary file path
    const tempFilePath = path.join("C:\\Windows\\Temp", `${fileName}.txt`);
    const date = new Date();
    const dateDate = date?.toLocaleDateString();
    const dateTime = date?.toLocaleTimeString();
    console.log(`[Data Inserted at Date: ${dateDate} and Time: ${dateTime}]`);
    const formattedContent = parsedArray.map((each, i) => {
      let resultxt2 = "";
      const obj = parsedArray[i];
      for (let key in obj) {
        resultxt2 += `[${key + ": " + JSON.stringify(obj[key])}]\n `;
      }
      return resultxt2;
    });
    formattedContent.unshift(`[Date: ${dateDate}, Time: ${dateTime}]\n`);
    formattedContent.unshift(
      "\n==============================================================================================================================\n"
    );
    // Write the data to the temporary file
    // Check if the file exists
    fs.access(tempFilePath, fs.constants.F_OK, (err) => {
      if (err) {
        // File doesn't exist, create the file
        fs.writeFile(tempFilePath, formattedContent.join(""), (err) => {
          if (err) {
            console.error("Error:", err);
            // res.status(500).json("Internal Server Error");
          } else {
            // res.status(200).json("File created and data stored successfully.");
            console.log("File created and data stored successfully.");
          }
        });
      } else {
        // File exists, append data to the file
        fs.appendFile(tempFilePath, "\n" + formattedContent.join(""), (err) => {
          if (err) {
            console.error("Error:", err);
          } else {
            console.log("Data appended to the file successfully.");
          }
        });
      }
    });
  } catch (error) {
    console.error("Error:", error);
  }
}

module.exports = {
  getTempTesting,
};
