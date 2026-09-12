import { NextResponse } from "next/server";
import { getGoogleSheets } from "@/lib/google-sheets";

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const RANGE = "Inventario!A2:R"; // Expanded to R to include Nombre (Q) and Marca (R)

// Helper to map sizes to array indices (35 to 44 -> 1 to 10)
const SIZES = [35, 36, 37, 38, 39, 40, 41, 42, 43, 44];

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
        nombre: row[16] || row[0] || "", // Fallback to code if nombre is empty
        marca: row[17] || "",
        precioCompra: Number(row[11]) || 0,
        precioRevendedor: Number(row[12]) || 0,
        precio: Number(row[13]) || 0, // Venta
        color: row[14] || "",
        imageUrl: row[15] || "",
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
      ...sizeStocks, // Col B to K
      body.precioCompra || 0, // Col L
      body.precioRevendedor || 0, // Col M
      body.precio || 0, // Col N
      body.color || "", // Col O
      body.imageUrl || "", // Col P
      body.nombre || "", // Col Q
      body.marca || "", // Col R
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "Inventario!A:R",
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
      body.nombre || "", // Col Q
      body.marca || "", // Col R
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `Inventario!A${actualRowNumber}:R${actualRowNumber}`,
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
