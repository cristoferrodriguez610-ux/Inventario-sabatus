"use client";

import { useState } from "react";
import { LogIn, Package } from "lucide-react";
import styles from "./page.module.css";
import { useRouter } from "next/navigation";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Fetch users from API (Google Sheets)
      const res = await fetch("/api/users");
      if (!res.ok) {
        throw new Error("Failed to fetch users");
      }
      
      const users: any[] = await res.json();

      // Check if user exists
      const user = users.find(u => u.nombre.toLowerCase() === username.toLowerCase() && u.password === password);

      if (user) {
        if (user.rol === "Admin") {
          router.push("/admin");
        } else {
          router.push("/inventario");
        }
      } else {
        // Fallback for first setup or if Sheets is empty/broken
        if (username === "admin" && password === "admin123") {
          router.push("/admin");
        } else {
          setError("Usuario o contraseña incorrectos");
        }
      }
    } catch (err) {
      console.error(err);
      // Fallback
      if (username === "admin" && password === "admin123") {
        router.push("/admin");
      } else {
        setError("Error de conexión. Intente nuevamente.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={`${styles.loginCard} animate-fade-in`}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <Package size={24} />
          </div>
          <h1 className={styles.title}>Sabatus</h1>
          <p className={styles.subtitle}>Gestión de Inventario</p>
        </div>

        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="username" className={styles.label}>
              Usuario
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input"
              placeholder="Ingresa tu usuario"
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password" className={styles.label}>
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
              required
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button
            type="submit"
            className={`btn btn-primary ${styles.submitBtn}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⟳</span> Ingresando...
              </span>
            ) : (
              <>
                <LogIn size={18} /> Iniciar Sesión
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
