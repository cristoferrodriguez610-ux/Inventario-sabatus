"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertCircle
} from "lucide-react";
import styles from "./page.module.css";

// Mock Data
const MOCK_INVENTORY = [
  { id: "1", nombre: "Nike Air Max", marca: "Nike", talla: 42, color: "Negro", stock: 15, precio: 120 },
  { id: "2", nombre: "Adidas Ultraboost", marca: "Adidas", talla: 40, color: "Blanco", stock: 5, precio: 180 },
  { id: "3", nombre: "Puma RS-X", marca: "Puma", talla: 39, color: "Rojo/Azul", stock: 0, precio: 110 },
  { id: "4", nombre: "New Balance 574", marca: "New Balance", talla: 41, color: "Gris", stock: 24, precio: 95 },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("inventory");
  const [searchQuery, setSearchQuery] = useState("");
  const [inventory, setInventory] = useState(MOCK_INVENTORY);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleLogout = () => {
    router.push("/");
  };

  const filteredInventory = inventory.filter((item) =>
    item.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.marca.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStockBadge = (stock: number) => {
    if (stock === 0) return <span className={`${styles.badge} ${styles.badgeDanger}`}>Agotado</span>;
    if (stock < 10) return <span className={`${styles.badge} ${styles.badgeWarning}`}>Stock Bajo</span>;
    return <span className={`${styles.badge} ${styles.badgeSuccess}`}>En Stock</span>;
  };

  if (!isClient) return null; // Avoid hydration mismatch on icons

  return (
    <div className={styles.adminContainer}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logo}>
            <Package size={28} />
          </div>
          <span>Sabatus Admin</span>
        </div>

        <nav className={styles.nav}>
          <button
            className={`${styles.navItem} ${activeTab === "inventory" ? styles.active : ""}`}
            onClick={() => setActiveTab("inventory")}
          >
            <LayoutDashboard size={20} />
            Inventario
          </button>
          <button
            className={`${styles.navItem} ${activeTab === "users" ? styles.active : ""}`}
            onClick={() => setActiveTab("users")}
          >
            <Users size={20} />
            Usuarios
          </button>
          <button
            className={`${styles.navItem} ${activeTab === "settings" ? styles.active : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            <Settings size={20} />
            Configuración
          </button>

          <button className={`${styles.navItem} ${styles.logoutBtn}`} onClick={handleLogout}>
            <LogOut size={20} />
            Cerrar Sesión
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className={styles.mainContent}>
        {activeTab === "inventory" && (
          <>
            <header className={styles.header}>
              <h1 className={styles.title}>Gestión de Inventario</h1>
              <button className="btn btn-primary">
                <Plus size={20} />
                Añadir Calzado
              </button>
            </header>

            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <Package size={24} />
                </div>
                <div className={styles.statInfo}>
                  <span className={styles.statLabel}>Total Modelos</span>
                  <span className={styles.statValue}>{inventory.length}</span>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.badgeWarning}`}>
                  <AlertCircle size={24} />
                </div>
                <div className={styles.statInfo}>
                  <span className={styles.statLabel}>Stock Bajo</span>
                  <span className={styles.statValue}>
                    {inventory.filter(i => i.stock > 0 && i.stock < 10).length}
                  </span>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.badgeDanger}`}>
                  <AlertCircle size={24} />
                </div>
                <div className={styles.statInfo}>
                  <span className={styles.statLabel}>Agotados</span>
                  <span className={styles.statValue}>
                    {inventory.filter(i => i.stock === 0).length}
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.tableContainer}>
              <div className={styles.tableHeader}>
                <div className={styles.searchBox}>
                  <Search className={styles.searchIcon} size={18} />
                  <input
                    type="text"
                    placeholder="Buscar calzado..."
                    className={`input ${styles.searchInput}`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Marca</th>
                    <th>Talla</th>
                    <th>Color</th>
                    <th>Precio</th>
                    <th>Stock</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 500 }}>{item.nombre}</td>
                      <td>{item.marca}</td>
                      <td>{item.talla}</td>
                      <td>{item.color}</td>
                      <td>${item.precio}</td>
                      <td>{item.stock}</td>
                      <td>{getStockBadge(item.stock)}</td>
                      <td>
                        <div className={styles.actionCell}>
                          <button className={styles.actionBtn} title="Editar">
                            <Edit2 size={16} />
                          </button>
                          <button className={styles.actionBtn} title="Eliminar">
                            <Trash2 size={16} color="var(--danger)" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredInventory.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", padding: "3rem" }}>
                        No se encontraron resultados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === "users" && (
          <header className={styles.header}>
            <h1 className={styles.title}>Gestión de Usuarios</h1>
            <button className="btn btn-primary">
              <Plus size={20} />
              Añadir Usuario
            </button>
          </header>
        )}
      </main>
    </div>
  );
}
