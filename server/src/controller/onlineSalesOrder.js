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

async function onlineSalesOrder(req, res) {
  let TestingResponse = {};
  let sessionId = null;

  let dateString = getCurrentDateTimeAsString();
  let fileNameWithDate = `${dateString.substring(0, 4)}onlineSalesOrder`;
  console.log("dateString", dateString.substring(0, 4), fileNameWithDate);
  try {
    const {
      customerMobileNo,
      customerName,
      OrderId,
      deliveryAddress,
      products,
      appliedCoupon,
      branch_id,
      shippingCost,
      instructions,
      subtotal,
      timeSlotDetails,
      deliveryDate,
      deliveryDateTimestamp,
    } = req.body;

    // Get all unique variant SKUs
    let variantSkus = [
      ...new Set(
        products
          ?.map((product) => String(product?.variant?.sku || "").trim())
          ?.filter((sku) => sku !== "")
      ),
    ];

    // check variables
    let missingFields = [];
    if (!customerMobileNo) {
      missingFields.push("customerMobileNo");
    }
    if (!customerName) {
      missingFields.push("customerName");
    }
    if (!OrderId) {
      missingFields.push("OrderId");
    }

    if (!products || variantSkus.length === 0) {
      missingFields.push("products");
    }
    if (!branch_id) {
      missingFields.push("branch_id");
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        ErrMsg: "Missing required fields",
        missingFields,
      });
    }

    console.log("customerMobileNo", customerMobileNo);
    dbConfig.database = `Focus8${process.env.focusCompanyCode}`;
    console.log("config1", dbConfig);

    sessionId = await getSession();

    if (sessionId?.error || !sessionId?.fSessionId) {
      TestingResponse["Error at getSession"] = sessionId?.error;
      getTempTesting(TestingResponse, fileNameWithDate, "res");
      return res.status(500).json({
        ErrMsg: `Error occurred while getting session ID`,
        details: sessionId?.error,
      });
    }

    // get retry count from database
    const retryCountQuery = {
      data: [
        {
          Query: `SELECT * FROM EX_Integration_Status_Master WHERE Master_Type = 'Member' AND Code = '${customerMobileNo}'`,
        },
      ],
    };

    const retryCountResponse = await focusFetchDataFromApi(
      "utility/ExecuteSqlQuery",
      retryCountQuery,
      sessionId?.fSessionId
    );

    if (retryCountResponse.error) {
      TestingResponse["Error at focusFetchDataFromApi"] =
        retryCountResponse?.error;
      getTempTesting(TestingResponse, fileNameWithDate, "res");
      return res.status(500).json({
        ErrMsg: `Error occurred while fetching retry count`,
        details: retryCountResponse?.error,
      });
    }

    const retryCount = retryCountResponse?.data?.[0]?.Retry_Count || 0;

    // get retry count for Transaction from database
    const retryTransactionQuery = {
      data: [
        {
          Query: `SELECT * FROM EX_Integration_Status_Transaction WHERE OrderId = '${OrderId}'`,
        },
      ],
    };
    const retryTransactionResponse = await focusFetchDataFromApi(
      "utility/ExecuteSqlQuery",
      retryTransactionQuery,
      sessionId?.fSessionId
    );

    if (retryTransactionResponse?.error) {
      TestingResponse["Error at focusFetchDataFromApi (retry transaction)"] =
        retryTransactionResponse?.error;
      getTempTesting(TestingResponse, fileNameWithDate, "res");
      return res.status(500).json({
        ErrMsg: `Error occurred while fetching retry count for transaction`,
        details: retryTransactionResponse?.error,
      });
    }

    const retryTransactionCount =
      retryTransactionResponse?.data?.[0]?.Table?.[0]?.Retry_Count || 0;

    if (retryTransactionCount < 3) {
      // Retry logic here
      console.log("Retrying transaction...");
    } else {
      console.log("Max retry attempts reached.");
      return res.status(500).json({
        ErrMsg: `Max retries reached for transaction data`,
        details: `Transaction data for ${OrderId} could not be processed after multiple attempts.`,
      });
    }

    const memberQuery = {
      data: [
        {
          Query: `select iMasterId memberId, sName memberName, sCode memberCode from mPos_Member where sCode = '${customerMobileNo}' and istatus<>5 and bGroup = 0`,
        },
      ],
    };

    const memberResponse = await focusFetchDataFromApi(
      "utility/ExecuteSqlQuery",
      memberQuery,
      sessionId?.fSessionId
    );

    if (memberResponse.error) {
      TestingResponse["Error at focusFetchDataFromApi"] = memberResponse?.error;
      getTempTesting(TestingResponse, fileNameWithDate, "res");
      return res.status(500).json({
        ErrMsg: `Error occurred while fetching member data`,
        details: memberResponse?.error,
      });
    }

    // retry logic
    if (retryCount < 3) {
      console.log("Retrying...");
    } else {
      console.log("Max retries reached");
      return res.status(500).json({
        ErrMsg: `Max retries reached for member data`,
        details: `Member data for ${customerMobileNo} could not be processed after multiple attempts.`,
      });
    }

    // log retry count
    console.log("Retry Count:", retryCount);

    // post member data to focus
    if (
      memberResponse &&
      memberResponse?.data &&
      memberResponse?.result === 1 &&
      memberResponse?.data?.[0]?.Table === null
    ) {
      const memberData = {
        data: [
          {
            sName: customerName,
            sCode: customerMobileNo,
            Address: deliveryAddress?.addressId,
            HouseDetails: deliveryAddress?.houseDetails,
            StreetDetails: deliveryAddress?.streetDetails,
            LandMark: deliveryAddress?.landmark,
            sZipCode: deliveryAddress?.pincode,
            Lat: deliveryAddress?.latLong?.lat,
            Ing: deliveryAddress?.latLong?.lng,
          },
        ],
      };

      const postMemberDataResponse = await focusFetchDataFromApi(
        "Masters/Pos__Member/",
        memberData,
        sessionId?.fSessionId
      );

      if (postMemberDataResponse.error) {
        TestingResponse["Error at focusFetchDataFromApi (post member data)"] =
          postMemberDataResponse?.error;
        getTempTesting(TestingResponse, fileNameWithDate, "res");
        console.log("Error occurred while posting member data");
        extTableMaster({
          Master_Type: "Member",
          Master_Id: "",
          Name: memberData.data[0].sName,
          Code: memberData.data[0].sCode,
          Created_Date: new Date().toISOString().split("T")[0],
          Created_Time: new Date().toTimeString().split(" ")[0],
          Status: retryCount == 0 ? 2 : retryCount + 1,
          Error_Message: JSON.stringify(postMemberDataResponse?.error),
          Retry_Count: (retryCount || 0) + 1,
          Last_Retry_Date:
            retryCountResponse?.data?.[0]?.Created_Date ||
            new Date().toISOString().split("T")[0],
        });
        return res.status(500).json({
          ErrMsg: `Error occurred while posting member data`,
          details: postMemberDataResponse?.error,
        });
      } else {
        console.log("Member data posted successfully");
        extTableMaster({
          Master_Type: "Member",
          Master_Id: postMemberDataResponse?.data?.[0]?.MasterId,
          Name: memberData.data[0]?.sName,
          Code: memberData.data[0]?.sCode,
          Created_Date: new Date(),
          Created_Time: new Date().toTimeString().split(" ")[0],
          Status: 1,
          Error_Message: "",
          Retry_Count: (retryCount || 0) + 1,
          Last_Retry_Date:
            retryCountResponse?.data?.[0]?.Created_Date ||
            new Date().toISOString().split("T")[0],
        });
      }
    }

    const itemQuery = {
      data: [
        {
          Query: `select iMasterId itemId, sName itemName, sCode itemCode from mCore_Product where sCode in (${variantSkus
            .map((sku) => `'${sku}'`)
            .join(",")}) and istatus<>5 and bGroup = 0;`,
        },
      ],
    };

    const itemResponse = await focusFetchDataFromApi(
      "utility/ExecuteSqlQuery",
      itemQuery,
      sessionId?.fSessionId
    );

    if (itemResponse.error) {
      TestingResponse["Error at focusFetchDataFromApi"] = itemResponse?.error;
      getTempTesting(TestingResponse, fileNameWithDate, "res");
      return res.status(500).json({
        ErrMsg: `Error occurred while fetching item data`,
        details: itemResponse?.error,
      });
    }
    if (
      (itemResponse &&
        itemResponse?.data &&
        itemResponse?.result === 1 &&
        itemResponse?.data?.[0]?.Table === null) ||
      itemResponse?.data?.[0]?.Table?.length !== variantSkus?.length
    ) {
      // remove items from variantSkus that are not found in itemResponse
      if (itemResponse?.data[0]?.Table?.length > 0) {
        variantSkus = variantSkus?.filter((sku) =>
          itemResponse?.data[0]?.Table?.some((item) => item?.itemCode !== sku)
        );
      }
      TestingResponse["Items Not Found"] = `${variantSkus.join(", ")}`;
      getTempTesting(TestingResponse, fileNameWithDate, "res");
      extTableTransaction({
        Document_No: "",
        OrderId: OrderId,
        Document_Date: new Date().toISOString().split("T")[0],
        Created_Time: new Date().toTimeString().split(" ")[0],
        Status:
          retryTransactionCount == 0 ? 2 : (retryTransactionCount || 0) + 1,
        Error_Message: `${TestingResponse["Items Not Found"]} not available in ERP`,
        Retry_Count: (retryTransactionCount || 0) + 1,
        Last_Retry_Date:
          retryTransactionResponse?.data?.[0]?.Table?.[0]?.Document_Date ||
          new Date().toISOString().split("T")[0],
      });
      return res.status(500).json({
        ErrMsg: `Items Not Found`,
        details: `${TestingResponse["Items Not Found"]} not available in ERP`,
      });
    }

    const outletQuery = {
      data: [
        {
          Query: `
          select iMasterId outletId, sName outletName, sCode outletCode from mPos_Outlet where sCode = '${branch_id}' and istatus<>5 and bGroup = 0;`,
        },
      ],
    };
    const outletResponse = await focusFetchDataFromApi(
      "utility/ExecuteSqlQuery",
      outletQuery,
      sessionId?.fSessionId
    );
    if (
      outletResponse &&
      outletResponse?.data &&
      outletResponse?.result === 1 &&
      outletResponse?.data?.[0]?.Table === null
    ) {
      TestingResponse["Outlet Not Found"] = `${branch_id}`;
      getTempTesting(TestingResponse, fileNameWithDate, "res");
      extTableTransaction({
        Document_No: "",
        OrderId: OrderId,
        Document_Date: new Date().toISOString().split("T")[0],
        Created_Time: new Date().toTimeString().split(" ")[0],
        Status:
          retryTransactionCount == 0 ? 2 : (retryTransactionCount || 0) + 1,
        Error_Message: `${TestingResponse["Outlet Not Found"]} not available in ERP`,
        Retry_Count: (retryTransactionCount || 0) + 1,
        Last_Retry_Date:
          retryTransactionResponse?.data?.[0]?.Table?.[0]?.Document_Date ||
          new Date().toISOString().split("T")[0],
      });
      return res.status(500).json({
        ErrMsg: `Outlet Not Found`,
        details: `${TestingResponse["Outlet Not Found"]} not available in ERP`,
      });
    }

    const discountQuery = {
      data: [
        {
          Query: `
          select iMasterId discountId, sName discountName, sCode discountCode from mPos_DiscountVoucherDefinition where sCode = '${appliedCoupon}' and istatus<>5 and bGroup = 0;
          `,
        },
      ],
    };

    const discountResponse = await focusFetchDataFromApi(
      "utility/ExecuteSqlQuery",
      discountQuery,
      sessionId?.fSessionId
    );

    const orderQuery = {
      data: [
        {
          Query: `SELECT h.sVoucherNo, h.iHeaderId ,ISNULL(hd.OrderId,'') OrderId
FROM tCore_Header_0 h
JOIN tCore_HeaderData5634_0 hd on hd.iHeaderId = h.iHeaderId
WHERE h.iVoucherType = 5634 AND ISNULL(hd.OrderId,'')  <> '' AND ISNULL(hd.OrderId,'')  = '${OrderId}';`,
        },
      ],
    };

    const orderVoucherResponse = await focusFetchDataFromApi(
      "utility/ExecuteSqlQuery",
      orderQuery,
      sessionId?.fSessionId
    );

    if (orderVoucherResponse?.error) {
      TestingResponse["Error at focusFetchDataFromApi (order voucher)"] =
        orderVoucherResponse?.error;
      getTempTesting(TestingResponse, fileNameWithDate, "res");
      return res.status(500).json({
        ErrMsg: `Error occurred while fetching order voucher`,
        details: orderVoucherResponse?.error,
      });
    } else if (
      orderVoucherResponse &&
      orderVoucherResponse?.data &&
      orderVoucherResponse?.result === 1 &&
      orderVoucherResponse?.data?.[0]?.Table !== null
    ) {
      // send message order id already exists
      TestingResponse["Order ID Already Exists"] = `${OrderId}`;
      getTempTesting(TestingResponse, fileNameWithDate, "res");
      extTableTransaction({
        Document_No: "",
        OrderId: OrderId,
        Document_Date: new Date().toISOString().split("T")[0],
        Created_Time: new Date().toTimeString().split(" ")[0],
        Status:
          retryTransactionCount == 0 ? 2 : (retryTransactionCount || 0) + 1,
        Error_Message: `${TestingResponse["Order ID Already Exists"]} already exists in ERP`,
        Retry_Count: (retryTransactionCount || 0) + 1,
        Last_Retry_Date:
          retryTransactionResponse?.data?.[0]?.Table?.[0]?.Document_Date ||
          new Date().toISOString().split("T")[0],
      });
      return res.status(500).json({
        ErrMsg: `Order ID Already Exists`,
        details: `${TestingResponse["Order ID Already Exists"]} already exists in ERP`,
      });
    } else {
      const bodyData = [];

      const deliveryTimestamp = new Date(
        deliveryDateTimestamp
      )?.toLocaleTimeString("en-GB");

      const deliveryTimeResponse = await focusFetchDataFromApi(
        "utility/ExecuteSqlQuery",
        {
          data: [
            {
              Query: `select dbo.fCore_TimeToInt('${deliveryTimestamp}') as Time;`,
            },
          ],
        },
        sessionId?.fSessionId
      );

      for (const product of products) {
        bodyData.push({
          "Discount Voucher Definition__Code":
            discountResponse?.data?.[0]?.Table?.[0]?.discountCode || "",
          Item__Code: product?.variant?.sku || "",
          Quantity: product?.quantity || 0,
          Rate: product?.price || 0,
          Gross: (product?.price || 0) * (product?.quantity || 0),
          Instructions: instructions || "",
          DeliveryDate: dateToInt(deliveryDate) || 0,
          iDeliveryTime: deliveryTimeResponse?.data?.[0]?.Table?.[0]?.Time || 0,
        });
      }

      //   timeslot conversion
      const timeSlotStartQuery = {
        data: [
          {
            Query: `select dbo.fCore_TimeToInt('${timeSlotDetails?.startTime}') as Time;`,
          },
        ],
      };
      const timeSlotEndQuery = {
        data: [
          {
            Query: `select dbo.fCore_TimeToInt('${timeSlotDetails?.endTime}') as Time;`,
          },
        ],
      };
      const timeSlotStartResponse = await focusFetchDataFromApi(
        "utility/ExecuteSqlQuery",
        timeSlotStartQuery,
        sessionId?.fSessionId
      );
      const timeSlotEndResponse = await focusFetchDataFromApi(
        "utility/ExecuteSqlQuery",
        timeSlotEndQuery,
        sessionId?.fSessionId
      );

      // here posting into focus
      const orderData = {
        data: [
          {
            Body: bodyData,
            Header: {
              CustomerAC__Code: "Online Customer",
              Outlet__Code: branch_id,
              Member__Code: customerMobileNo,
              OrderId: OrderId,
              TimeSlotStartTime:
                timeSlotStartResponse?.data?.[0]?.Table?.[0]?.Time || 0,
              TimeSlotEndTime:
                timeSlotEndResponse?.data?.[0]?.Table?.[0]?.Time || 0,
              ...(subtotal && { Net: subtotal }),
            },
            Footer: [
              {
                FieldName: "Delivery Charges",
                Input: shippingCost || 0,
                Value: shippingCost || 0,
              },
            ],
          },
        ],
      };

      const orderResponse = await focusFetchDataFromApi(
        "Transactions/Online%20Sales%20Orders/",
        orderData,
        sessionId?.fSessionId
      );

      if (orderResponse?.error) {
        TestingResponse["Online Sales Orders Posting Failed"] =
          orderResponse?.error;
        getTempTesting(TestingResponse, fileNameWithDate, "res");
        return res.status(500).json({
          ErrMsg: `Online Sales Orders Posting Failed`,
          details: orderResponse?.error,
        });
      }

      try {
        getTempTesting(TestingResponse, fileNameWithDate, "res");
        if (
          orderResponse &&
          orderResponse?.data &&
          orderResponse?.result === 1
        ) {
          TestingResponse[
            "Order Created"
          ] = `Online Sales Orders Posted successfully`;
          getTempTesting(TestingResponse, fileNameWithDate, "res");
          // Insert into transaction table

          extTableTransaction({
            Document_No: orderResponse?.data?.[0]?.VoucherNo,
            OrderId: OrderId,
            Document_Date: new Date().toISOString().split("T")[0],
            Created_Time: new Date().toTimeString().split(" ")[0],
            Status: 1,
            Error_Message: "",
            Retry_Count: (retryTransactionCount || 0) + 1,
            Last_Retry_Date:
              retryTransactionResponse?.data?.[0]?.Table?.[0]?.Document_Date ||
              new Date().toISOString().split("T")[0],
          });

          return res.status(200).json({
            message: `Online Sales Orders Posted successfully`,
            VoucherNo: orderResponse?.data?.[0]?.VoucherNo,
          });
        } else {
          TestingResponse[
            "Online Sales Orders Posting Failed"
          ] = `Online Sales Orders Posting Failed`;
          getTempTesting(TestingResponse, fileNameWithDate, "res");
          extTableTransaction({
            Document_No: "",
            OrderId: OrderId,
            Document_Date: new Date().toISOString().split("T")[0],
            Created_Time: new Date().toTimeString().split(" ")[0],
            Status:
              retryTransactionCount == 0 ? 2 : (retryTransactionCount || 0) + 1,
            Error_Message: JSON.stringify(orderResponse?.error),
            Retry_Count: (retryTransactionCount || 0) + 1,
            Last_Retry_Date:
              retryTransactionResponse?.data?.[0]?.Table?.[0]?.Document_Date ||
              new Date().toISOString().split("T")[0],
          });
          return res.status(500).json({
            ErrMsg: `Online Sales Orders Posting Failed`,
          });
        }
      } catch (error) {
        console.log(error);
        TestingResponse["Online Sales Orders Posting Failed"] = error;
        getTempTesting(TestingResponse, fileNameWithDate, "res");
        res.status(500).json({
          ErrMsg: `Online Sales Orders Posting Failed`,
          details: error?.message,
        });
      } finally {
      }
    }
  } catch (err) {
    TestingResponse["Error at onlineSalesOrder"] = err;
    getTempTesting(TestingResponse, fileNameWithDate, "res");
    console.log(`Error at End Point.=> ${err}`);
    res.status(500).json({
      ErrMsg: `Error occurred while processing the request`,
      details: err?.message,
    });
  } finally {
    // Always called — success or error
    if (sessionId?.fSessionId) {
      await logout(sessionId.fSessionId);
    }
  }
}

module.exports = {
  onlineSalesOrder,
};
