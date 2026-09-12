import { google } from "googleapis";

export const getGoogleSheets = async () => {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets"
      ],
    });

    const sheets = google.sheets({ version: "v4", auth });
    return sheets;
  } catch (error) {
    console.error("Error authenticating with Google Sheets:", error);
    throw new Error("Google Sheets Authentication Failed");
  }
};
