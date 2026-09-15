"use client";

import { useState } from "react";
import { LogIn, Eye, EyeOff } from "lucide-react";
import styles from "./page.module.css";
import { useRouter } from "next/navigation";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
            {/* SABATTUS brand icon — minimalist shoe silhouette */}
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="36" height="36" rx="4" fill="#f5f5f0"/>
              <path d="M6 24 C6 24 10 16 18 16 C22 16 28 20 30 20 L30 26 C30 26 24 28 18 28 C12 28 6 26 6 26 Z" fill="#0a0a0a"/>
              <path d="M14 16 L16 10 L20 10 L22 16" fill="#0a0a0a" opacity="0.3"/>
            </svg>
          </div>
          <h1 className={styles.title}>SABATTUS</h1>
          <p className={styles.subtitle}>Luce y Viste Bien</p>
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
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                required
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
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
