import { NextResponse } from "next/server";
import { getGoogleSheets } from "@/lib/google-sheets";

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const RANGE = "Inventario!A2:T"; // Expanded to T to accommodate 12 sizes (34-45) + fields

// Helper to map sizes to array indices (34 to 45 -> 1 to 12)
const SIZES = [34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45];

export async function GET() {
  try {
    const sheets = await getGoogleSheets();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: RANGE,
    });

    const rows = response.data.values || [];

    const inventory = rows.map((row) => {
      const tallas = SIZES.map((talla, idx) => ({
        talla,
        stock: Number(row[idx + 1]) || 0,
      })).filter(t => t.stock >= 0);

      return {
        id: row[0] || "",
        codigo: row[0] || "",
        nombre: row[18] || row[0] || "", // Col S
        marca: row[19] || "", // Col T
        precioCompra: Number(row[13]) || 0, // Col N
        precioRevendedor: Number(row[14]) || 0, // Col O
        precio: Number(row[15]) || 0, // Col P (Venta)
        color: row[16] || "", // Col Q
        imageUrl: row[17] || "", // Col R
        tallas,
      };
    }).filter(item => item.id !== "" && item.id.toLowerCase() !== "marcas"); // Filter out empty rows and header

    return NextResponse.json(inventory);
  } catch (error) {
    console.error("GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sheets = await getGoogleSheets();

    // Map body.tallas to the 10 columns
    const sizeStocks = SIZES.map(size => {
      const found = body.tallas?.find((t: any) => t.talla === size);
      return found ? found.stock : 0;
    });

    const newRow = [
      body.codigo || body.id, // Col A
      ...sizeStocks, // Col B to M
      body.precioCompra || 0, // Col N
      body.precioRevendedor || 0, // Col O
      body.precio || 0, // Col P
      body.color || "", // Col Q
      body.imageUrl || "", // Col R
      body.nombre || "", // Col S
      body.marca || "", // Col T
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "Inventario!A:T",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [newRow],
      },
    });

    return NextResponse.json({ success: true, message: "Item added" });
  } catch (error) {
    console.error("POST Error:", error);
    return NextResponse.json({ error: "Failed to add item" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const sheets = await getGoogleSheets();

    // Find the row index
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "Inventario!A2:A",
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex(row => row[0] === body.id);

    if (rowIndex === -1) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const actualRowNumber = rowIndex + 2; // +1 for 0-index, +1 for header

    const sizeStocks = SIZES.map(size => {
      const found = body.tallas?.find((t: any) => t.talla === size);
      return found ? found.stock : 0;
    });

    const updatedRow = [
      body.codigo || body.id, // Col A
      ...sizeStocks,
      body.precioCompra || 0,
      body.precioRevendedor || 0,
      body.precio || 0,
      body.color || "",
      body.imageUrl || "",
      body.nombre || "", // Col S
      body.marca || "", // Col T
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `Inventario!A${actualRowNumber}:T${actualRowNumber}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [updatedRow],
      },
    });

    return NextResponse.json({ success: true, message: "Item updated" });
  } catch (error) {
    console.error("PUT Error:", error);
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
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
      range: "Inventario!A2:A",
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex(row => row[0] === id);

    if (rowIndex === -1) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const actualRowNumber = rowIndex + 2;

    // Get the sheet ID for "Inventario"
    const sheetMetadata = await sheets.spreadsheets.get({
      spreadsheetId: SHEET_ID,
    });
    const sheet = sheetMetadata.data.sheets?.find(s => s.properties?.title === "Inventario");
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

    return NextResponse.json({ success: true, message: "Item deleted" });
  } catch (error) {
    console.error("DELETE Error:", error);
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}
