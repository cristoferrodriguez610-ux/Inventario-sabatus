"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  LogOut,
  Search,
} from "lucide-react";
import styles from "../admin/page.module.css";

type Shoe = {
  id: string;
  nombre: string;
  marca: string;
  talla: number;
  color: string;
  stock: number;
  precio: number;
  imageUrl: string;
};

// Mock Data
const MOCK_INVENTORY: Shoe[] = [
  { id: "1", nombre: "Nike Air Max", marca: "Nike", talla: 42, color: "Negro", stock: 15, precio: 120, imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=150&q=80" },
  { id: "2", nombre: "Adidas Ultraboost", marca: "Adidas", talla: 40, color: "Blanco", stock: 5, precio: 180, imageUrl: "https://images.unsplash.com/photo-1518002171953-a080ee817801?w=150&q=80" },
  { id: "3", nombre: "Puma RS-X", marca: "Puma", talla: 39, color: "Rojo/Azul", stock: 0, precio: 110, imageUrl: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=150&q=80" },
  { id: "4", nombre: "New Balance 574", marca: "New Balance", talla: 41, color: "Gris", stock: 24, precio: 95, imageUrl: "https://images.unsplash.com/photo-1539185441755-769473a23570?w=150&q=80" },
];

export default function UserInventory() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [inventory, setInventory] = useState<Shoe[]>(MOCK_INVENTORY);
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

  if (!isClient) return null;

  return (
    <div className={styles.adminContainer}>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
        <header style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '1rem 2rem',
          backgroundColor: 'var(--bg-primary)',
          borderBottom: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600, fontSize: '1.25rem', color: 'var(--text-primary)' }}>
            <div className={styles.logo}>
              <Package size={28} />
            </div>
            <span>Sabatus Inventario</span>
          </div>
          
          <button className="btn btn-secondary" onClick={handleLogout} style={{ color: 'var(--text-secondary)' }}>
            <LogOut size={18} />
            Salir
          </button>
        </header>

        <main className={styles.mainContent} style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          <header className={styles.header}>
            <h1 className={styles.title}>Consulta de Inventario</h1>
          </header>

          <div className={styles.tableContainer}>
            <div className={styles.tableHeader}>
              <div className={styles.searchBox} style={{ width: '100%', maxWidth: '400px' }}>
                <Search className={styles.searchIcon} size={18} />
                <input
                  type="text"
                  placeholder="Buscar calzado por nombre o marca..."
                  className={`input ${styles.searchInput}`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Marca</th>
                  <th>Talla</th>
                  <th>Color</th>
                  <th>Precio</th>
                  <th>Stock</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className={styles.productCell}>
                        <img 
                          src={item.imageUrl || "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=150&q=80"} 
                          alt={item.nombre} 
                          className={styles.shoeImage}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=150&q=80";
                          }}
                        />
                        <span>{item.nombre}</span>
                      </div>
                    </td>
                    <td>{item.marca}</td>
                    <td>{item.talla}</td>
                    <td>{item.color}</td>
                    <td>${item.precio}</td>
                    <td>{item.stock}</td>
                    <td>{getStockBadge(item.stock)}</td>
                  </tr>
                ))}
                {filteredInventory.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "3rem" }}>
                      No se encontraron resultados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}
