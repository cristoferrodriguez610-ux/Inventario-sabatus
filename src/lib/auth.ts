import crypto from "crypto";
import { getGoogleSheets } from "./google-sheets";

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const RANGE = "Usuarios!A2:D";

export const SESSION_SALT = process.env.AUTH_SECRET || "sabattus_session_salt_key_2026";

export type AuthUser = {
  id: string;
  nombre: string;
  password: string;
  rol: "Admin" | "Usuario";
};

export const localMockUsers: AuthUser[] = [
  { id: "admin_master", nombre: "admin", password: "Sabattus#Admin2026", rol: "Admin" },
];

export async function fetchUsersFromSource(): Promise<AuthUser[]> {
  if (!SHEET_ID) {
    return localMockUsers;
  }

  try {
    const sheets = await getGoogleSheets();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: RANGE,
    });

    const rows = response.data.values || [];

    const users: AuthUser[] = rows
      .map((row) => ({
        id: String(row[0] || "").trim(),
        nombre: String(row[1] || "").trim(),
        password: String(row[2] || "").trim(),
        rol: (String(row[3] || "").trim() === "Admin" ? "Admin" : "Usuario") as "Admin" | "Usuario",
      }))
      .filter((u) => u.id !== "" && u.nombre !== "");

    return users.length > 0 ? users : localMockUsers;
  } catch (error) {
    console.error("fetchUsersFromSource error:", error);
    return localMockUsers;
  }
}

export function generateSessionToken(user: { id: string; nombre: string; password: string }): string {
  const payload = `${user.id}:${user.nombre.toLowerCase().trim()}:${user.password}:${SESSION_SALT}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}

export function isValidSessionToken(
  user: { id: string; nombre: string; password: string },
  token: string
): boolean {
  if (!token || typeof token !== "string") return false;
  const expected = generateSessionToken(user);
  if (token.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(token, "utf-8"), Buffer.from(expected, "utf-8"));
}
