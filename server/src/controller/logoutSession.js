// logout.js
require("dotenv").config();
// For Node 16 or older:
// const fetch = require("node-fetch");

const logout = async (storedFocusSession) => {
  try {
    if (!storedFocusSession) {
      //   throw new Error("No session ID provided for logout.");
      return { error: "No session ID provided for logout." };
    }

    const storedHostname = process.env.ipAddress;
    if (!storedHostname) {
      return { error: "ipAddress is not set in environment variables." };
    }

    const url = `${storedHostname}/focus8API/Logout`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        fSessionId: storedFocusSession,
      },
    });

    if (!response.ok) {
      return {
        error: `Logout failed: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();
    console.log("Logout response:", data);
    return data;
  } catch (error) {
    console.error("Error in logout:", error.message);
    return { error: error.message };
  }
};

module.exports = logout;
