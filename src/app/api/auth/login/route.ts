import { NextResponse } from "next/server";
import { fetchUsersFromSource, generateSessionToken } from "@/lib/auth";
import { CURRENT_SESSION_VERSION } from "@/lib/auth-constants";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body || {};

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "Usuario y contraseña requeridos" },
        { status: 400 }
      );
    }

    const cleanUsername = String(username).toLowerCase().trim();
    const cleanPassword = String(password);

    const users = await fetchUsersFromSource();
    const user = users.find(
      (u) =>
        u.nombre.toLowerCase().trim() === cleanUsername &&
        u.password === cleanPassword
    );

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Usuario o contraseña incorrectos" },
        { status: 401 }
      );
    }

    const token = generateSessionToken(user);

    return NextResponse.json({
      success: true,
      token,
      sessionVersion: CURRENT_SESSION_VERSION,
      user: {
        id: user.id,
        nombre: user.nombre,
        rol: user.rol,
      },
    });
  } catch (error) {
    console.error("Login route error:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
