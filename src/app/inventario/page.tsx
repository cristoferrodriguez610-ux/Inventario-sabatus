"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Package, Search, LogOut, ChevronDown } from "lucide-react";
import styles from "./page.module.css";
// We reuse the admin CSS modules to maintain the exact same look, just hiding admin features
import adminStyles from "../admin/page.module.css";

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

export default function InventoryDashboard() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  
  const [inventory, setInventory] = useState<Shoe[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);

  useEffect(() => {
    setIsClient(true);
    const fetchInventory = async () => {
      try {
        const res = await fetch("/api/inventory");
        if (res.ok) {
          const data = await res.json();
          setInventory(data);
        }
      } catch (error) {
        console.error("Error fetching inventory:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInventory();
  }, []);

  const handleLogout = () => {
    router.push("/");
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const filteredInventory = inventory.filter((item) =>
    item.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.marca.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTotalStock = (tallas: ShoeSize[]) => tallas.reduce((sum, t) => sum + t.stock, 0);

  const getStockBadge = (stock: number) => {
    if (stock === 0) return <span className={`${adminStyles.badge} ${adminStyles.badgeDanger}`}>Agotado</span>;
    if (stock < 10) return <span className={`${adminStyles.badge} ${adminStyles.badgeWarning}`}>Stock Bajo</span>;
    return <span className={`${adminStyles.badge} ${adminStyles.badgeSuccess}`}>En Stock</span>;
  };

  if (!isClient) return null;

  return (
    <div className={adminStyles.adminContainer}>
      <aside className={adminStyles.sidebar}>
        <div className={adminStyles.sidebarHeader}>
          <div className={adminStyles.logo}>
            <Package size={28} />
          </div>
          <span>Sabatus</span>
        </div>

        <nav className={adminStyles.nav}>
          <button className={`${adminStyles.navItem} ${adminStyles.active}`}>
            <Package size={20} />
            Inventario
          </button>
          <div style={{ flex: 1 }}></div>
          <button className={`${adminStyles.navItem} ${adminStyles.logoutBtn}`} onClick={handleLogout}>
            <LogOut size={20} />
            Cerrar Sesión
          </button>
        </nav>
      </aside>

      <main className={adminStyles.mainContent}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)' }}>
            <span className="animate-spin" style={{ fontSize: '2rem', marginRight: '1rem' }}>⟳</span> Cargando inventario...
          </div>
        ) : (
          <>
            <header className={adminStyles.header}>
              <h1 className={adminStyles.title}>Catálogo de Inventario</h1>
            </header>

            <div className={adminStyles.tableContainer} style={{ marginTop: '2rem' }}>
              <div className={adminStyles.tableHeader}>
                <div className={adminStyles.searchBox}>
                  <Search className={adminStyles.searchIcon} size={18} />
                  <input
                    type="text"
                    placeholder="Buscar calzado..."
                    className={`input ${adminStyles.searchInput}`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}></th>
                    <th>Producto (Código)</th>
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
                        <tr className={adminStyles.mainRow} onClick={() => toggleRow(item.id)}>
                          <td>
                            <ChevronDown 
                              size={18} 
                              className={`${adminStyles.expandIcon} ${isExpanded ? adminStyles.open : ""}`} 
                            />
                          </td>
                          <td>
                            <div className={adminStyles.productCell}>
                              <img 
                                src={item.imageUrl || "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=150&q=80"} 
                                alt={item.nombre} 
                                className={adminStyles.shoeImage}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=150&q=80";
                                }}
                              />
                              <span>{item.nombre}</span>
                            </div>
                          </td>
                          <td>{item.color}</td>
                          <td>${item.precio}</td>
                          <td>{totalStock}</td>
                          <td>{getStockBadge(totalStock)}</td>
                        </tr>
                        {isExpanded && (
                          <tr className={adminStyles.expandedContent}>
                            <td colSpan={6}>
                              <div className={adminStyles.expandedInner}>
                                <h4>Tallas Disponibles</h4>
                                <div className={adminStyles.sizesGrid}>
                                  {item.tallas.length > 0 ? (
                                    item.tallas.map((t, idx) => (
                                      <div key={idx} className={adminStyles.sizeCard}>
                                        <span className={adminStyles.sizeNumber}>{t.talla}</span>
                                        <div className={adminStyles.sizeStockContainer} style={{ justifyContent: 'center' }}>
                                          <span className={adminStyles.sizeStock}>
                                            {t.stock} {t.stock === 1 ? 'par' : 'pares'}
                                          </span>
                                        </div>
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
                      <td colSpan={6} style={{ textAlign: "center", padding: "3rem" }}>
                        No se encontraron resultados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
