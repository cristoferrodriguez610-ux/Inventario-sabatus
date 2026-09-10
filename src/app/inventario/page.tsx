"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import React from "react";
import {
  Package,
  LogOut,
  Search,
  ChevronDown
} from "lucide-react";
import styles from "../admin/page.module.css";

type ShoeSize = {
  talla: number;
  stock: number;
};

type Shoe = {
  id: string;
  nombre: string;
  marca: string;
  color: string;
  precio: number;
  imageUrl: string;
  tallas: ShoeSize[];
};

// Mock Data
const MOCK_INVENTORY: Shoe[] = [
  { 
    id: "1", nombre: "Nike Air Max", marca: "Nike", color: "Negro", precio: 120, 
    imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=150&q=80",
    tallas: [{talla: 40, stock: 5}, {talla: 41, stock: 5}, {talla: 42, stock: 5}]
  },
  { 
    id: "2", nombre: "Adidas Ultraboost", marca: "Adidas", color: "Blanco", precio: 180, 
    imageUrl: "https://images.unsplash.com/photo-1518002171953-a080ee817801?w=150&q=80",
    tallas: [{talla: 39, stock: 2}, {talla: 40, stock: 3}]
  },
  { 
    id: "3", nombre: "Puma RS-X", marca: "Puma", color: "Rojo/Azul", precio: 110, 
    imageUrl: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=150&q=80",
    tallas: [{talla: 40, stock: 0}, {talla: 41, stock: 0}]
  },
  { 
    id: "4", nombre: "New Balance 574", marca: "New Balance", color: "Gris", precio: 95, 
    imageUrl: "https://images.unsplash.com/photo-1539185441755-769473a23570?w=150&q=80",
    tallas: [{talla: 42, stock: 10}, {talla: 43, stock: 14}]
  },
];

export default function UserInventory() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [inventory, setInventory] = useState<Shoe[]>(MOCK_INVENTORY);
  const [isClient, setIsClient] = useState(false);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleLogout = () => {
    router.push("/");
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const getTotalStock = (tallas: ShoeSize[]) => tallas.reduce((sum, t) => sum + t.stock, 0);

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
                  <th style={{ width: '40px' }}></th>
                  <th>Producto</th>
                  <th>Marca</th>
                  <th>Color</th>
                  <th>Precio</th>
                  <th>Stock Total</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map((item) => {
                  const isExpanded = expandedRows.includes(item.id);
                  const totalStock = getTotalStock(item.tallas);
                  
                  return (
                    <React.Fragment key={item.id}>
                      <tr className={styles.mainRow} onClick={() => toggleRow(item.id)}>
                        <td>
                          <ChevronDown 
                            size={18} 
                            className={`${styles.expandIcon} ${isExpanded ? styles.open : ""}`} 
                          />
                        </td>
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
                        <td>{item.color}</td>
                        <td>${item.precio}</td>
                        <td>{totalStock}</td>
                        <td>{getStockBadge(totalStock)}</td>
                      </tr>
                      {isExpanded && (
                        <tr className={styles.expandedContent}>
                          <td colSpan={7}>
                            <div className={styles.expandedInner}>
                              <h4>Tallas Disponibles</h4>
                              <div className={styles.sizesGrid}>
                                {item.tallas.length > 0 ? (
                                  item.tallas.map((t, idx) => (
                                    <div key={idx} className={styles.sizeCard}>
                                      <span className={styles.sizeNumber}>{t.talla}</span>
                                      <span className={styles.sizeStock}>
                                        {t.stock} {t.stock === 1 ? 'par' : 'pares'}
                                      </span>
                                    </div>
                                  ))
                                ) : (
                                  <span style={{ color: 'var(--text-secondary)' }}>No hay tallas registradas.</span>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
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
