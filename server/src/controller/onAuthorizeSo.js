require("dotenv").config();
const express = require("express");
const sql = require("mssql");
const { getTempTesting } = require("./tempTesting_Controller");
const { dbConfig } = require("../config/db.config");
const getSession = require("./getSession");
const { focusFetchDataFromApi } = require("./focusFetchAPI");
const logout = require("./logoutSession");
const { extTableMaster } = require("./extTableMaster");
const {
  extTableTransaction,
  updateTransactionStatus,
} = require("./extTableTransaction");

const app = express();
app.use(express.json());

function getCurrentDateTimeAsString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  return `${month}${day}${hours}${minutes}${seconds}`;
}

function dateToInt(dateString) {
  const date = new Date(dateString); // Convert the ISO string to a Date object

  return (
    date.getDate() + (date.getMonth() + 1) * 256 + date.getFullYear() * 65536
  );
}

async function onAuthorizeSo(req, res) {
  let TestingResponse = {};
  //   let sessionId = null;

  let dateString = getCurrentDateTimeAsString();
  let fileNameWithDate = `${dateString.substring(0, 4)}onAuthorizeSo`;
  console.log("dateString", dateString.substring(0, 4), fileNameWithDate);
  try {
    const { DocNo, orderId, status, sessionId } = req.body;

    //  https://pilot.countrychickenco.in/tpa/order/v1/updateOrderStatus
    if (!orderId || !status) {
      return res.status(400).json({
        ErrMsg: "Order ID and status are required",
      });
    }
    const statusUpdate = await fetch(process.env.countryChickenApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderId: orderId,
        status,
      }),
    });
    const orderResponse = await statusUpdate.text();

    console.log(
      "Order Response:",
      JSON.stringify({
        orderId,
        status,
      }),
      orderResponse
    );
    // get retry count for Transaction from database
    const retryTransactionQuery = {
      data: [
        {
          Query: `SELECT * FROM EX_Integration_Status_Transaction WHERE OrderId = '${orderId}'`,
        },
      ],
    };
    // const retryTransactionResponse = await focusFetchDataFromApi(
    //   "utility/ExecuteSqlQuery",
    //   retryTransactionQuery,
    //   sessionId
    // );

    // if (retryTransactionResponse?.error) {
    //   TestingResponse["Error at focusFetchDataFromApi (retry transaction)"] =
    //     retryTransactionResponse?.error;
    //   getTempTesting(TestingResponse, fileNameWithDate, "res");
    //   return res.status(500).json({
    //     ErrMsg: `Error occurred while fetching retry count for transaction`,
    //     details: retryTransactionResponse?.error,
    //   });
    // }

    // const retryTransactionCount =
    //   retryTransactionResponse?.data?.[0]?.Table?.[0]?.Retry_Count || 0;

    try {
      getTempTesting(TestingResponse, fileNameWithDate, "res");
      if (statusUpdate.ok) {
        TestingResponse[
          "Order updated"
        ] = `Online Sales Orders Status updated successfully`;
        getTempTesting(TestingResponse, fileNameWithDate, "res");
        // Insert into transaction table

        // extTableTransaction({
        //   Document_No: DocNo,
        //   OrderId: orderId,
        //   Document_Date:
        //     retryTransactionResponse?.data?.[0]?.Table?.[0]?.Document_Date ||
        //     new Date().toISOString().split("T")[0],
        //   Created_Time: new Date().toTimeString().split(" ")[0],
        //   Status: 1,
        //   Error_Message: "",
        //   Retry_Count: retryTransactionCount,
        //   Last_Retry_Date:
        //     retryTransactionResponse?.data?.[0]?.Table?.[0]?.Document_Date ||
        //     new Date().toISOString().split("T")[0],
        // });

        return res.status(200).json({
          message: `Online Sales Orders Status updated successfully`,
          VoucherNo: DocNo,
          orderResponse: JSON.parse(orderResponse),
        });
      } else {
        TestingResponse["Online Sales Orders Status update Failed"] =
          JSON.parse(orderResponse);
        getTempTesting(TestingResponse, fileNameWithDate, "res");
        // extTableTransaction({
        //   Document_No: "",
        //   OrderId: orderId,
        //   Document_Date:
        //     retryTransactionResponse?.data?.[0]?.Table?.[0]?.Document_Date ||
        //     new Date().toISOString().split("T")[0],
        //   Created_Time: new Date().toTimeString().split(" ")[0],
        //   Status:
        //     retryTransactionCount == 0 ? 2 : (retryTransactionCount || 0) + 1,
        //   Error_Message: JSON.stringify(orderResponse?.error),
        //   Retry_Count: retryTransactionCount,
        //   Last_Retry_Date:
        //     retryTransactionResponse?.data?.[0]?.Table?.[0]?.Document_Date ||
        //     new Date().toISOString().split("T")[0],
        // });
        return res.status(500).json({
          ErrMsg: `Online Sales Orders Status Update Failed`,
          details: JSON.parse(orderResponse),
        });
      }
    } catch (error) {
      console.log(error);
      TestingResponse["Online Sales Orders Status Update Failed"] = error;
      getTempTesting(TestingResponse, fileNameWithDate, "res");
      res.status(500).json({
        ErrMsg: `Online Sales Orders Status Update Failed`,
        details: error?.message,
      });
    } finally {
    }
  } catch (err) {
    TestingResponse["Error at onAuthorizeSo"] = err;
    getTempTesting(TestingResponse, fileNameWithDate, "res");
    console.log(`Error at End Point.=> ${err}`);
    res.status(500).json({
      ErrMsg: `Error occurred while processing the request`,
      details: err?.message,
    });
  } finally {
    // // Always called — success or error
    // if (sessionId?.fSessionId) {
    //   await logout(sessionId.fSessionId);
    // }
  }
}

module.exports = {
  onAuthorizeSo,
};
