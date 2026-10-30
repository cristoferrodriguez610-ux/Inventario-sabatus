import { NextResponse } from "next/server";
import { getGoogleSheets } from "@/lib/google-sheets";

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = "Camisas";
const RANGE = `${SHEET_NAME}!A3:M`;

type ShirtSize = {
  talla: string;
  stock: number;
};

// In-memory fallback for local development or if Google Sheets is not configured
let localMockShirts: any[] = [
  {
    id: "CAM-SAB-01",
    codigo: "CAM-SAB-01",
    nombre: "Camiseta Oversize Basic",
    marca: "Sabattus",
    color: "Negro",
    precioCompra: 12,
    precioRevendedor: 18,
    precio: 25,
    imageUrl: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=60",
    tallas: [
      { talla: "S", stock: 6 },
      { talla: "M", stock: 12 },
      { talla: "L", stock: 10 },
      { talla: "XL", stock: 4 },
    ],
  },
  {
    id: "CAM-POLO-02",
    codigo: "CAM-POLO-02",
    nombre: "Polo Pique Slim",
    marca: "Tommy Hilfiger",
    color: "Blanco",
    precioCompra: 22,
    precioRevendedor: 32,
    precio: 45,
    imageUrl: "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=500&auto=format&fit=crop&q=60",
    tallas: [
      { talla: "S", stock: 4 },
      { talla: "M", stock: 8 },
      { talla: "L", stock: 5 },
      { talla: "XL", stock: 3 },
      { talla: "XXL", stock: 2 },
    ],
  },
  {
    id: "CAM-LINO-03",
    codigo: "CAM-LINO-03",
    nombre: "Camisa Casual Lino Manga Larga",
    marca: "Zara",
    color: "Beige",
    precioCompra: 18,
    precioRevendedor: 26,
    precio: 38,
    imageUrl: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500&auto=format&fit=crop&q=60",
    tallas: [
      { talla: "S", stock: 3 },
      { talla: "M", stock: 7 },
      { talla: "L", stock: 6 },
      { talla: "XL", stock: 2 },
    ],
  },
];

function findRowIndexById(rows: any[][], id: string): number {
  const rowMatch = id.match(/^(.*)__row(\d+)$/);
  if (rowMatch) {
    const baseId = rowMatch[1].trim();
    const expectedRowIdx = parseInt(rowMatch[2], 10) - 3;
    if (
      expectedRowIdx >= 0 &&
      expectedRowIdx < rows.length &&
      ((rows[expectedRowIdx][1] || rows[expectedRowIdx][0] || "").trim() === baseId)
    ) {
      return expectedRowIdx;
    }
    return rows.findIndex((row) => (row[1] || row[0] || "").trim() === baseId);
  }
  const cleanId = id.trim();
  return rows.findIndex((row) => (row[1] || row[0] || "").trim() === cleanId);
}

function buildFullNombre(marca?: string, nombre?: string): string {
  const m = (marca || "").trim();
  const n = (nombre || "").trim();
  if (m && n.toLowerCase().startsWith(m.toLowerCase())) {
    return n;
  }
  return `${m} ${n}`.trim();
}

async function ensureCamisasSheet(sheets: any) {
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
    const exists = meta.data.sheets?.some(
      (s: any) => s.properties?.title === SHEET_NAME
    );

    if (!exists) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: SHEET_NAME,
                  gridProperties: {
                    rowCount: 200,
                    columnCount: 20,
                  },
                },
              },
            },
          ],
        },
      });

      // Write header rows
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${SHEET_NAME}!A1:M2`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [
            ["INVENTARIO DE CAMISAS - SABATTUS"],
            [
              "Nombre",
              "Código",
              "Talla S",
              "Talla M",
              "Talla L",
              "Talla XL",
              "Tallas Extra",
              "Precio Compra",
              "Precio Revendedor",
              "Precio Venta",
              "Color",
              "Imagen",
              "Marca",
            ],
          ],
        },
      });
    }
  } catch (err) {
    console.error("Error ensuring Camisas sheet:", err);
  }
}

export async function GET(request: Request) {
  const role = request.headers.get("x-user-role");

  if (!SHEET_ID) {
    if (role !== "Admin") {
      const sanitized = localMockShirts.map(({ precioCompra, ...rest }) => rest);
      return NextResponse.json(sanitized);
    }
    return NextResponse.json(localMockShirts);
  }

  try {
    const sheets = await getGoogleSheets();
    await ensureCamisasSheet(sheets);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: RANGE,
    });

    const rows = response.data.values || [];
    const seenIds = new Set<string>();

    const shirts = rows
      .map((row, index) => {
        const standardSizes: ShirtSize[] = [
          { talla: "S", stock: parseInt(row[2]) || 0 },
          { talla: "M", stock: parseInt(row[3]) || 0 },
          { talla: "L", stock: parseInt(row[4]) || 0 },
          { talla: "XL", stock: parseInt(row[5]) || 0 },
        ];

        let extraSizes: ShirtSize[] = [];
        if (row[6]) {
          try {
            const parsed = JSON.parse(row[6]);
            if (Array.isArray(parsed)) {
              extraSizes = parsed
                .filter((item) => item && item.talla)
                .map((item) => ({
                  talla: String(item.talla).toUpperCase(),
                  stock: parseInt(item.stock) || 0,
                }));
            }
          } catch {
            // Handle plain format like "XS:3, XXL:2"
            const pairs = String(row[6]).split(",");
            pairs.forEach((p) => {
              const [sz, stk] = p.split(":").map((s) => s.trim());
              if (sz) {
                extraSizes.push({
                  talla: sz.toUpperCase(),
                  stock: parseInt(stk) || 0,
                });
              }
            });
          }
        }

        const tallas = [...standardSizes, ...extraSizes];

        const marcaRaw = (row[12] || "").trim();
        const nombreFull = (row[0] || "").trim();
        let nombreLimpio = nombreFull;
        while (marcaRaw && nombreLimpio.toLowerCase().startsWith(marcaRaw.toLowerCase())) {
          const rest = nombreLimpio.substring(marcaRaw.length).trim();
          if (!rest) break;
          nombreLimpio = rest;
        }

        const codigoClean = (row[1] || "").trim();
        const baseId = codigoClean || nombreFull || "";
        let uniqueId = baseId;
        if (baseId) {
          if (seenIds.has(baseId)) {
            uniqueId = `${baseId}__row${index + 3}`;
          }
          seenIds.add(baseId);
        }

        return {
          id: uniqueId,
          codigo: codigoClean,
          nombre: nombreLimpio,
          marca: marcaRaw,
          precioCompra: Number(row[7]) || 0,
          precioRevendedor: Number(row[8]) || 0,
          precio: Number(row[9]) || 0,
          color: (row[10] || "").trim(),
          imageUrl: (row[11] || "").trim().replace(/^http:\/\//i, "https://"),
          tallas,
        };
      })
      .filter(
        (item) =>
          item.id !== "" &&
          item.nombre.toLowerCase() !== "nombre" &&
          item.codigo.toLowerCase() !== "codigo"
      );

    if (role !== "Admin") {
      const sanitized = shirts.map(({ precioCompra, ...rest }) => rest);
      return NextResponse.json(sanitized);
    }

    return NextResponse.json(shirts);
  } catch (error) {
    console.error("GET Camisas Error:", error);
    // Return fallback mock data so dev / offline works smoothly
    if (role !== "Admin") {
      const sanitized = localMockShirts.map(({ precioCompra, ...rest }) => rest);
      return NextResponse.json(sanitized);
    }
    return NextResponse.json(localMockShirts);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!SHEET_ID) {
      const newItem = {
        ...body,
        id: body.codigo || Date.now().toString(),
      };
      localMockShirts.push(newItem);
      return NextResponse.json({ success: true, message: "Camisa añadida (local)" });
    }

    const sheets = await getGoogleSheets();
    await ensureCamisasSheet(sheets);

    const sStock =
      body.tallas?.find((t: any) => String(t.talla).toUpperCase() === "S")?.stock || 0;
    const mStock =
      body.tallas?.find((t: any) => String(t.talla).toUpperCase() === "M")?.stock || 0;
    const lStock =
      body.tallas?.find((t: any) => String(t.talla).toUpperCase() === "L")?.stock || 0;
    const xlStock =
      body.tallas?.find((t: any) => String(t.talla).toUpperCase() === "XL")?.stock || 0;

    const extraSizes = (body.tallas || []).filter(
      (t: any) => !["S", "M", "L", "XL"].includes(String(t.talla).toUpperCase())
    );

    const fullNombre = buildFullNombre(body.marca, body.nombre);
    const cleanCode = (body.codigo || body.id || "").replace(/__row\d+$/, "").trim();

    const newRow = [
      fullNombre, // Col A (0)
      cleanCode, // Col B (1)
      sStock, // Col C (2)
      mStock, // Col D (3)
      lStock, // Col E (4)
      xlStock, // Col F (5)
      extraSizes.length > 0 ? JSON.stringify(extraSizes) : "", // Col G (6)
      body.precioCompra || 0, // Col H (7)
      body.precioRevendedor || 0, // Col I (8)
      body.precio || 0, // Col J (9)
      (body.color || "").trim(), // Col K (10)
      (body.imageUrl || "").trim(), // Col L (11)
      (body.marca || "").trim(), // Col M (12)
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A:M`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [newRow],
      },
    });

    return NextResponse.json({ success: true, message: "Camisa añadida" });
  } catch (error) {
    console.error("POST Camisas Error:", error);
    return NextResponse.json({ error: "Failed to add camisa" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    if (!SHEET_ID) {
      localMockShirts = localMockShirts.map((item) =>
        item.id === body.id ? { ...item, ...body } : item
      );
      return NextResponse.json({ success: true, message: "Camisa actualizada (local)" });
    }

    const sheets = await getGoogleSheets();
    await ensureCamisasSheet(sheets);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A3:B`,
    });

    const rows = response.data.values || [];
    const rowIndex = findRowIndexById(rows, String(body.id || ""));

    if (rowIndex === -1) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const actualRowNumber = rowIndex + 3;

    const sStock =
      body.tallas?.find((t: any) => String(t.talla).toUpperCase() === "S")?.stock || 0;
    const mStock =
      body.tallas?.find((t: any) => String(t.talla).toUpperCase() === "M")?.stock || 0;
    const lStock =
      body.tallas?.find((t: any) => String(t.talla).toUpperCase() === "L")?.stock || 0;
    const xlStock =
      body.tallas?.find((t: any) => String(t.talla).toUpperCase() === "XL")?.stock || 0;

    const extraSizes = (body.tallas || []).filter(
      (t: any) => !["S", "M", "L", "XL"].includes(String(t.talla).toUpperCase())
    );

    const fullNombre = buildFullNombre(body.marca, body.nombre);
    const cleanCode = (body.codigo || body.id || "").replace(/__row\d+$/, "").trim();

    const updatedRow = [
      fullNombre,
      cleanCode,
      sStock,
      mStock,
      lStock,
      xlStock,
      extraSizes.length > 0 ? JSON.stringify(extraSizes) : "",
      body.precioCompra || 0,
      body.precioRevendedor || 0,
      body.precio || 0,
      (body.color || "").trim(),
      (body.imageUrl || "").trim(),
      (body.marca || "").trim(),
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A${actualRowNumber}:M${actualRowNumber}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [updatedRow],
      },
    });

    return NextResponse.json({ success: true, message: "Camisa actualizada" });
  } catch (error) {
    console.error("PUT Camisas Error:", error);
    return NextResponse.json({ error: "Failed to update camisa" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    if (!SHEET_ID) {
      localMockShirts = localMockShirts.filter((item) => item.id !== id);
      return NextResponse.json({ success: true, message: "Camisa eliminada (local)" });
    }

    const sheets = await getGoogleSheets();
    await ensureCamisasSheet(sheets);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A3:B`,
    });

    const rows = response.data.values || [];
    const rowIndex = findRowIndexById(rows, id);

    if (rowIndex === -1) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const actualRowNumber = rowIndex + 3;

    const sheetMetadata = await sheets.spreadsheets.get({
      spreadsheetId: SHEET_ID,
    });
    const sheet = sheetMetadata.data.sheets?.find(
      (s: any) => s.properties?.title === SHEET_NAME
    );
    const sheetId = sheet?.properties?.sheetId;

    if (sheetId === undefined) {
      return NextResponse.json({ error: "Sheet not found" }, { status: 500 });
    }

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: "ROWS",
                startIndex: actualRowNumber - 1,
                endIndex: actualRowNumber,
              },
            },
          },
        ],
      },
    });

    return NextResponse.json({ success: true, message: "Camisa eliminada" });
  } catch (error) {
    console.error("DELETE Camisas Error:", error);
    return NextResponse.json({ error: "Failed to delete camisa" }, { status: 500 });
  }
}
