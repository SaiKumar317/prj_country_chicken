// config/session.js
require("dotenv").config(); // if using .env file
// For Node 16 or lower, uncomment:
// const fetch = require("node-fetch");

const fetchDataFromApi = async (endpoint, requestData) => {
  try {
    const response = await fetch(
      `${process.env.ipAddress}/focus8api/${endpoint}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      }
    );

    console.log("response", response.status, response.statusText);

    if (!response.ok) {
      return { error: "Network response was not ok" };
    }

    const data = await response.json();
    console.log("JsonData", data);

    return data;
  } catch (error) {
    console.error("There was a problem with the fetch request:", error);
    return { error };
  }
};

const getSession = async () => {
  try {
    const storedHostname = process.env.ipAddress;
    const storedUsername = process.env.focusUsername;
    const storedPassword = process.env.focusPassword;
    const storedCompanyCode = process.env.focusCompanyCode;

    if (
      storedUsername &&
      storedPassword &&
      storedHostname &&
      storedCompanyCode
    ) {
      console.log(
        storedHostname,
        storedUsername,
        storedPassword,
        storedCompanyCode
      );

      const url = `${storedHostname}/focus8API/Login`;
      const raw = {
        data: [
          {
            Password: storedPassword,
            UserName: storedUsername,
            CompanyCode: storedCompanyCode,
          },
        ],
      };

      const fSessionId = await fetchDataFromApi("Login", raw);

      if (fSessionId && fSessionId.data?.[0]?.fSessionId) {
        console.log("sessionID from function", fSessionId.data[0].fSessionId);
        return { fSessionId: fSessionId.data[0].fSessionId };
      } else {
        return { error: fSessionId };
      }
    } else {
      return { error: "Missing required environment variables." };
    }
  } catch (error) {
    console.error("Error retrieving data:", error);
    return { error };
  }
};

module.exports = getSession;
