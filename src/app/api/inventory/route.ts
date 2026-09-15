import { NextResponse } from "next/server";
import { getGoogleSheets } from "@/lib/google-sheets";

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const RANGE = "Inventario!A3:T"; // Expanded to T to accommodate 12 sizes (34-45) + fields

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
      // row[0]: Nombre (A)
      // row[1]: Código (B)
      // row[2] to row[13]: Tallas 34 to 45 (C to N)
      
      const tallas = SIZES.map((size, idx) => ({
        talla: size,
        stock: parseInt(row[idx + 2]) || 0, // offset by 2 (C)
      })).filter(t => t.stock >= 0);

      const marcaRaw = row[19] || ""; // Col T
      let nombreFull = row[0] || ""; // Col A
      let nombreLimpio = nombreFull;
      if (marcaRaw && nombreFull.toLowerCase().startsWith(marcaRaw.toLowerCase())) {
        nombreLimpio = nombreFull.substring(marcaRaw.length).trim();
      }

      return {
        id: row[1] || row[0] || "", // Using codigo as ID, fallback to nombre if empty
        codigo: row[1] || "", // Col B
        nombre: nombreLimpio, // Col A (sin la marca)
        marca: marcaRaw, // Col T
        precioCompra: Number(row[14]) || 0, // Col O
        precioRevendedor: Number(row[15]) || 0, // Col P
        precio: Number(row[16]) || 0, // Col Q (Venta)
        color: row[17] || "", // Col R
        imageUrl: (row[18] || "").replace(/^http:\/\//, 'https://'), // Col S
        tallas,
      };
    }).filter(item => item.id !== "" && item.nombre.toLowerCase() !== "nombre"); // Filter out empty and header

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

    // Map body.tallas to the 12 columns
    const sizeStocks = SIZES.map(size => {
      const found = body.tallas?.find((t: any) => t.talla === size);
      return found ? found.stock : 0;
    });

    const fullNombre = `${body.marca || ""} ${body.nombre || ""}`.trim();

    const newRow = [
      fullNombre, // Col A
      body.codigo || body.id, // Col B
      ...sizeStocks, // Col C to N
      body.precioCompra || 0, // Col O
      body.precioRevendedor || 0, // Col P
      body.precio || 0, // Col Q
      body.color || "", // Col R
      body.imageUrl || "", // Col S
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

    // Find the row index using the "Código" column (Column B) starting from row 3
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "Inventario!B3:B",
    });

    const rows = response.data.values || [];
    // rows here will just be [[codigo1], [codigo2], ...]
    const rowIndex = rows.findIndex(row => row[0] === (body.codigo || body.id));

    if (rowIndex === -1) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const actualRowNumber = rowIndex + 3; // +1 for 0-index, +2 for headers

    const sizeStocks = SIZES.map(size => {
      const found = body.tallas?.find((t: any) => t.talla === size);
      return found ? found.stock : 0;
    });

    const fullNombre = `${body.marca || ""} ${body.nombre || ""}`.trim();

    const updatedRow = [
      fullNombre, // Col A
      body.codigo || body.id, // Col B
      ...sizeStocks,
      body.precioCompra || 0, // Col O
      body.precioRevendedor || 0, // Col P
      body.precio || 0, // Col Q
      body.color || "", // Col R
      body.imageUrl || "", // Col S
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

    // Find the row index using Column B (Código) starting from row 3
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "Inventario!B3:B",
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex(row => row[0] === id);

    if (rowIndex === -1) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const actualRowNumber = rowIndex + 3;

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
