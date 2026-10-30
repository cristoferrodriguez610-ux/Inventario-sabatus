import { NextResponse } from "next/server";
import { fetchUsersFromSource, isValidSessionToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, username, role } = body || {};

    if (!token || !username) {
      return NextResponse.json(
        { valid: false, error: "Token o usuario faltante" },
        { status: 401 }
      );
    }

    const cleanUsername = String(username).toLowerCase().trim();
    const users = await fetchUsersFromSource();

    const user = users.find(
      (u) => u.nombre.toLowerCase().trim() === cleanUsername
    );

    if (!user) {
      return NextResponse.json(
        { valid: false, error: "Usuario no existe" },
        { status: 401 }
      );
    }

    if (!isValidSessionToken(user, token)) {
      return NextResponse.json(
        { valid: false, error: "Credenciales cambiadas o sesión inválida" },
        { status: 401 }
      );
    }

    if (role && user.rol !== role) {
      return NextResponse.json(
        { valid: false, error: "El rol del usuario ha cambiado" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      valid: true,
      user: {
        id: user.id,
        nombre: user.nombre,
        rol: user.rol,
      },
    });
  } catch (error) {
    console.error("Verify route error:", error);
    return NextResponse.json(
      { valid: false, error: "Error de verificación" },
      { status: 500 }
    );
  }
}
