import { google, sheets_v4 } from "googleapis";

let cachedSheets: sheets_v4.Sheets | null = null;

export const getGoogleSheets = async (): Promise<sheets_v4.Sheets> => {
  if (cachedSheets) {
    return cachedSheets;
  }

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

    cachedSheets = google.sheets({ version: "v4", auth });
    return cachedSheets;
  } catch (error) {
    console.error("Error authenticating with Google Sheets:", error);
    throw new Error("Google Sheets Authentication Failed");
  }
};

