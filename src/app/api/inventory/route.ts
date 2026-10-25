import { NextResponse } from "next/server";
import { getGoogleSheets } from "@/lib/google-sheets";

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const RANGE = "Inventario!A3:T"; // Expanded to T to accommodate 12 sizes (34-45) + fields

// Helper to map sizes to array indices (34 to 45 -> 1 to 12)
const SIZES = [34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45];

let localMockShoes: any[] = [
  {
    id: "JOR-R4-NG",
    codigo: "JOR-R4-NG",
    nombre: "Retro 4 Black Cat",
    marca: "Jordan",
    color: "Negro",
    precioCompra: 65,
    precioRevendedor: 90,
    precio: 120,
    imageUrl: "https://images.unsplash.com/photo-1552346154-21d32810aba3?w=500&auto=format&fit=crop&q=60",
    tallas: [
      { talla: 38, stock: 2 },
      { talla: 39, stock: 4 },
      { talla: 40, stock: 6 },
      { talla: 41, stock: 5 },
      { talla: 42, stock: 3 },
      { talla: 43, stock: 1 },
    ],
  },
  {
    id: "NK-DUNKLOW-PD",
    codigo: "NK-DUNKLOW-PD",
    nombre: "Dunk Low Panda",
    marca: "Nike",
    color: "Blanco / Negro",
    precioCompra: 55,
    precioRevendedor: 75,
    precio: 95,
    imageUrl: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500&auto=format&fit=crop&q=60",
    tallas: [
      { talla: 37, stock: 3 },
      { talla: 38, stock: 5 },
      { talla: 39, stock: 7 },
      { talla: 40, stock: 8 },
      { talla: 41, stock: 4 },
    ],
  },
];

export async function GET(request: Request) {
  const role = request.headers.get("x-user-role");

  if (!SHEET_ID) {
    if (role !== "Admin") {
      const sanitized = localMockShoes.map(({ precioCompra, ...rest }) => rest);
      return NextResponse.json(sanitized);
    }
    return NextResponse.json(localMockShoes);
  }

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

    if (role !== "Admin") {
      const sanitized = inventory.map(({ precioCompra, ...rest }) => rest);
      return NextResponse.json(sanitized);
    }

    return NextResponse.json(inventory);
  } catch (error) {
    console.error("GET Error:", error);
    if (role !== "Admin") {
      const sanitized = localMockShoes.map(({ precioCompra, ...rest }) => rest);
      return NextResponse.json(sanitized);
    }
    return NextResponse.json(localMockShoes);
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

    // Find the row index using Column A (Nombre) and Column B (Código) starting from row 3
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "Inventario!A3:B",
    });

    const rows = response.data.values || [];
    // ID is defined in GET as: row[1] || row[0] || ""
    const rowIndex = rows.findIndex(row => (row[1] || row[0] || "") === body.id);

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

    // Find the row index using Column A (Nombre) and Column B (Código) starting from row 3
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "Inventario!A3:B",
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex(row => (row[1] || row[0] || "") === id);

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
