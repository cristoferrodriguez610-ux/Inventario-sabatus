import { getGoogleSheets } from "./src/lib/google-sheets";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function check() {
  const SHEET_ID = process.env.GOOGLE_SHEET_ID;
  const sheets = await getGoogleSheets();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "Inventario!S3:S10",
  });
  console.log(response.data.values);
}
check();
