async function focusFetchDataFromApi(endpoint, requestData, sessionId) {
  try {
    const response = await fetch(
      `${process.env.ipAddress}/focus8api/${endpoint}`,
      {
        ...(requestData !== "" ? { method: "POST" } : { method: "GET" }),
        headers: {
          "Content-Type": "application/json",
          fSessionId: sessionId,
        },
        ...(requestData !== "" && { body: JSON.stringify(requestData) }),
      }
    );
    // console.log(
    //   `${process.env.ipAddress}/focus8api/${endpoint}, response`,
    //   response
    // );
    if (!response.ok) {
      //   throw new Error("Network response was not ok");
      return { error: "Network response was not ok" };
    }
    const data = await response.json();
    if (data.result === 1) {
      console.log("JsonData", data);
      return data;
    } else {
      return { error: data };
    }
  } catch (error) {
    console.error("There was a problem with the fetch request:", error);
    return { error };
  }
}

module.exports = {
  focusFetchDataFromApi,
};
