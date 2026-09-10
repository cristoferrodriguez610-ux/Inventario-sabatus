import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sabatus - Inventario",
  description: "Sistema de gestión de inventario para calzado",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <main className="min-h-screen flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
