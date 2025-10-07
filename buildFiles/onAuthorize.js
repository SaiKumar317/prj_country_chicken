var ServerIPAddress = `${window.location.origin}`;

var iRequestId = 1;
var requestsProcessed = [];
var sessionId;
var UserName;
var companyCode;
var accountingDate;
var validRows;

var iVoucherType;
var rowIndexValue;
var DocNo;
var DocDate;
var OrderId;

function isRequestProcessed(iRequestId) {
  debugger;
  for (let i = 0; i < requestsProcessed.length; i++) {
    if (requestsProcessed[i] == iRequestId) {
      return true;
    }
  }
  return false;
}

function isRequestCompleted(iRequestId, processedRequestsArray) {
  return processedRequestsArray.indexOf(iRequestId) === -1 ? false : true;
}

async function fetchDataFromApi(url, requestData) {
  try {
    const response = await fetch(url, {
      ...(requestData !== "" ? { method: "POST" } : { method: "GET" }),
      headers: {
        "Content-Type": "application/json",
        fSessionId: sessionId,
      },

      ...(requestData !== "" && { body: JSON.stringify(requestData) }),
    });
    console.log(`${url}, response`, response);
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const data = await response.json();
    if (data.result === 1) {
      console.log("JsonData", data);
      return data;
    } else {
      //   alert(data.message);
      return;
    }
  } catch (error) {
    console.error("There was a problem with the fetch request:", error);
    // alert(error.message);
    return;
  }
}

function continueM() {
  try {
    requestsProcessed = [];
    Focus8WAPI.continueModule(Focus8WAPI.ENUMS.MODULE_TYPE.TRANSACTION, true);
  } catch (error) {
    console.log(error.message);
  }
}

dateToInt = (date) => {
  var postingIntDate =
    new Date([date]).getDate() +
    (new Date([date]).getMonth() + 1) * 256 +
    new Date([date]).getFullYear() * 65536;
  return postingIntDate;
};

//External Function
function onAuthorizeSO(logDetails, rowIndex) {
  try {
    if (isRequestCompleted(iRequestId, requestsProcessed)) {
      return;
    }
    requestsProcessed.push(iRequestId);
    console.log("iRequestId Before", iRequestId);
    iRequestId++;
    console.log("iRequestId After", iRequestId);
    console.log("logDetails", logDetails);
    sessionId = logDetails.SessionId;
    UserName = logDetails.UserName;
    accountingDate = logDetails.AccountingDate;
    companyCode = sessionId.substring(0, 3);
    rowIndexValue = rowIndex;
    Focus8WAPI.getFieldValue(
      "getHeaderFields",
      ["", "DocNo", "Date", "OrderId"],
      Focus8WAPI.ENUMS.MODULE_TYPE.TRANSACTION,
      false,
      iRequestId++
    );
  } catch (error) {
    alert(error.message);
    continueM();
  }
}

// cb function for getting the header details
async function getHeaderFields(response) {
  try {
    // if (isRequestProcessed(response.iRequestId)) {
    //   return;
    // }
    //     requestsProcessed.push(response.iRequestId);

    if (isRequestCompleted(response.iRequestId, requestsProcessed)) {
      return;
    }
    requestsProcessed.push(response.iRequestId);
    DocNo = response.data[1]["FieldValue"];
    DocDate = response.data[2].FieldText.split("/");
    OrderId = response.data[3].FieldValue;

    iVoucherType = response?.data?.[0]?.["iVoucherType"];

    const statusResponse = await fetch(`${ServerIPAddress}/onAuthorizeSo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        fSessionId: sessionId,
      },
      body: JSON.stringify({
        DocNo,
        DocDate,
        OrderId,
        iVoucherType,
        status: "confirmed",
      }),
    });
    const statusData = await statusResponse.json();

    if (statusResponse.ok) {
      console.log("Status Data", statusData);
      if (statusData) {
        console.log("Status updated successfully");
        alert("Status updated successfully");
      } else {
        throw new Error(statusData.message || "Failed to update status");
      }
    }

    continueM();
  } catch (error) {
    alert(error.message);
    continueM();
  }
}
async function settingBodyDetails(response) {}
