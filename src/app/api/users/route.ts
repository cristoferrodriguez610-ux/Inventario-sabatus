import { NextResponse } from "next/server";
import { getGoogleSheets } from "@/lib/google-sheets";

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const RANGE = "Usuarios!A2:D";

export async function GET() {
  try {
    const sheets = await getGoogleSheets();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: RANGE,
    });

    const rows = response.data.values || [];

    const users = rows.map((row) => ({
      id: row[0] || "",
      nombre: row[1] || "",
      password: row[2] || "",
      rol: row[3] || "Usuario",
    })).filter(u => u.id !== ""); // Filter out empty rows

    return NextResponse.json(users);
  } catch (error) {
    console.error("GET Users Error:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sheets = await getGoogleSheets();

    const newRow = [
      body.id || Date.now().toString(), // Col A
      body.nombre, // Col B
      body.password, // Col C
      body.rol, // Col D
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "Usuarios!A:D",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [newRow],
      },
    });

    return NextResponse.json({ success: true, message: "User added" });
  } catch (error) {
    console.error("POST Users Error:", error);
    return NextResponse.json({ error: "Failed to add user" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const sheets = await getGoogleSheets();

    // Find the row index
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "Usuarios!A2:A",
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex(row => row[0] === body.id);

    if (rowIndex === -1) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const actualRowNumber = rowIndex + 2;

    const updatedRow = [
      body.id,
      body.nombre,
      body.password,
      body.rol,
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `Usuarios!A${actualRowNumber}:D${actualRowNumber}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [updatedRow],
      },
    });

    return NextResponse.json({ success: true, message: "User updated" });
  } catch (error) {
    console.error("PUT Users Error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const sheets = await getGoogleSheets();

    // Find the row index
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "Usuarios!A2:A",
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex(row => row[0] === id);

    if (rowIndex === -1) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const actualRowNumber = rowIndex + 2;

    // Get the sheet ID for "Usuarios"
    const sheetMetadata = await sheets.spreadsheets.get({
      spreadsheetId: SHEET_ID,
    });
    const sheet = sheetMetadata.data.sheets?.find(s => s.properties?.title === "Usuarios");
    const sheetId = sheet?.properties?.sheetId;

    if (sheetId === undefined) {
      return NextResponse.json({ error: "Sheet not found" }, { status: 500 });
    }

    // Delete the row
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: "ROWS",
                startIndex: actualRowNumber - 1, // 0-based
                endIndex: actualRowNumber, // exclusive
              },
            },
          },
        ],
      },
    });

    return NextResponse.json({ success: true, message: "User deleted" });
  } catch (error) {
    console.error("DELETE Users Error:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
