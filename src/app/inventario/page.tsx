"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, LogOut, ChevronDown, X, Shirt, SportShoe, LayoutDashboard } from "lucide-react";
import adminStyles from "../admin/page.module.css";

type ShoeSize = {
  talla: number;
  stock: number;
};

type Shoe = {
  id: string;
  codigo: string;
  nombre: string;
  marca: string;
  color: string;
  precio: number;
  imageUrl: string;
  tallas: ShoeSize[];
};

type ShirtSize = {
  talla: string;
  stock: number;
};

type Shirt = {
  id: string;
  codigo: string;
  nombre: string;
  marca: string;
  color: string;
  precio: number;
  imageUrl: string;
  tallas: ShirtSize[];
};

export default function InventoryDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"shoes" | "shirts">("shoes");
  const [inventorySubmenuOpen, setInventorySubmenuOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [inventory, setInventory] = useState<Shoe[]>([]);
  const [shirtInventory, setShirtInventory] = useState<Shirt[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [expandedShirtRows, setExpandedShirtRows] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
    const fetchAllInventory = async () => {
      try {
        const [invRes, shirtsRes] = await Promise.all([
          fetch("/api/inventory"),
          fetch("/api/shirts"),
        ]);
        if (invRes.ok) {
          const data = await invRes.json();
          setInventory(data);
        }
        if (shirtsRes.ok) {
          const shirtsData = await shirtsRes.json();
          setShirtInventory(shirtsData);
        }
      } catch (error) {
        console.error("Error fetching inventory:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllInventory();
  }, []);

  const handleLogout = () => {
    router.push("/");
  };

  const toggleRow = (id: string) => {
    setExpandedRows((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const toggleShirtRow = (id: string) => {
    setExpandedShirtRows((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const filteredShoes = inventory.filter(
    (item) =>
      item.nombre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.marca?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.codigo?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredShirts = shirtInventory.filter(
    (item) =>
      item.nombre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.marca?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.codigo?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTotalShoeStock = (tallas: ShoeSize[]) =>
    (tallas || []).reduce((sum, t) => sum + (t.stock || 0), 0);
  const getTotalShirtStock = (tallas: ShirtSize[]) =>
    (tallas || []).reduce((sum, t) => sum + (t.stock || 0), 0);

  const fixUrl = (url: string) => (url ? url.replace(/^http:\/\//, "https://") : url);

  const getStockBadge = (stock: number) => {
    if (stock === 0)
      return (
        <span className={`${adminStyles.badge} ${adminStyles.badgeDanger}`}>
          Agotado
        </span>
      );
    if (stock < 10)
      return (
        <span className={`${adminStyles.badge} ${adminStyles.badgeWarning}`}>
          Stock Bajo
        </span>
      );
    return (
      <span className={`${adminStyles.badge} ${adminStyles.badgeSuccess}`}>
        Disponible
      </span>
    );
  };

  if (!isClient) return null;

  return (
    <div className={adminStyles.adminContainer}>
      <aside className={adminStyles.sidebar}>
        <div className={adminStyles.sidebarHeader}>
          <div className={adminStyles.logoText}>
            <span className={adminStyles.logoName}>Sabattus</span>
            <span className={adminStyles.logoTagline}>Luce y viste bien</span>
          </div>
        </div>

        <nav className={adminStyles.nav}>
          <div>
            <button
              className={`${adminStyles.navItem} ${adminStyles.active}`}
              onClick={() => setInventorySubmenuOpen((prev) => !prev)}
            >
              <LayoutDashboard size={20} />
              <span>Inventario</span>
              <ChevronDown
                size={16}
                className={`${adminStyles.chevron} ${
                  inventorySubmenuOpen ? adminStyles.rotate : ""
                }`}
              />
            </button>

            {inventorySubmenuOpen && (
              <div className={adminStyles.navSubMenu}>
                <button
                  className={`${adminStyles.navSubItem} ${
                    activeTab === "shoes" ? adminStyles.activeSub : ""
                  }`}
                  onClick={() => setActiveTab("shoes")}
                >
                  <SportShoe size={18} />
                  <span>Tenis</span>
                  <span className={adminStyles.badgeCount}>{inventory.length}</span>
                </button>
                <button
                  className={`${adminStyles.navSubItem} ${
                    activeTab === "shirts" ? adminStyles.activeSub : ""
                  }`}
                  onClick={() => setActiveTab("shirts")}
                >
                  <Shirt size={18} />
                  <span>Camisas</span>
                  <span className={adminStyles.badgeCount}>
                    {shirtInventory.length}
                  </span>
                </button>
              </div>
            )}
          </div>

          <div style={{ flex: 1 }}></div>
          <button
            className={`${adminStyles.navItem} ${adminStyles.logoutBtn}`}
            onClick={handleLogout}
          >
            <LogOut size={20} />
            Cerrar Sesión
          </button>
        </nav>
      </aside>

      <main className={adminStyles.mainContent}>
        {/* Category Switcher Tabs */}
        <div className={adminStyles.categoryToggle}>
          <button
            className={`${adminStyles.categoryBtn} ${
              activeTab === "shoes" ? adminStyles.categoryActive : ""
            }`}
            onClick={() => setActiveTab("shoes")}
          >
            <SportShoe size={18} />
            <span>Inventario Tenis</span>
            <span className={adminStyles.categoryCount}>{inventory.length}</span>
          </button>
          <button
            className={`${adminStyles.categoryBtn} ${
              activeTab === "shirts" ? adminStyles.categoryActive : ""
            }`}
            onClick={() => setActiveTab("shirts")}
          >
            <Shirt size={18} />
            <span>Inventario Camisas</span>
            <span className={adminStyles.categoryCount}>
              {shirtInventory.length}
            </span>
          </button>
        </div>

        {isLoading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "60vh",
              color: "var(--text-secondary)",
            }}
          >
            <span
              className="animate-spin"
              style={{ fontSize: "2rem", marginRight: "1rem" }}
            >
              ⟳
            </span>{" "}
            Cargando catálogo...
          </div>
        ) : activeTab === "shoes" ? (
          <>
            <header className={adminStyles.header}>
              <div>
                <h1 className={adminStyles.title}>Catálogo de Tenis</h1>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "0.9rem",
                    marginTop: "0.25rem",
                  }}
                >
                  Consulta existencias por tallas de calzado (34 - 45)
                </p>
              </div>
            </header>

            <div className={adminStyles.tableContainer} style={{ marginTop: "1rem" }}>
              <div className={adminStyles.tableHeader}>
                <div className={adminStyles.searchBox}>
                  <Search className={adminStyles.searchIcon} size={18} />
                  <input
                    type="text"
                    placeholder="Buscar calzado (nombre, marca, código)..."
                    className={`input ${adminStyles.searchInput}`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "40px" }}></th>
                    <th>Producto (Código)</th>
                    <th>Color</th>
                    <th>Precio</th>
                    <th>Pares Totales</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShoes.map((item) => {
                    const isExpanded = expandedRows.includes(item.id);
                    const totalStock = getTotalShoeStock(item.tallas);

                    return (
                      <React.Fragment key={item.id}>
                        <tr
                          className={adminStyles.mainRow}
                          onClick={() => toggleRow(item.id)}
                        >
                          <td>
                            <ChevronDown
                              size={18}
                              className={`${adminStyles.expandIcon} ${
                                isExpanded ? adminStyles.open : ""
                              }`}
                            />
                          </td>
                          <td>
                            <div className={adminStyles.productCell}>
                              {item.imageUrl ? (
                                <img
                                  src={fixUrl(item.imageUrl)}
                                  alt={item.nombre}
                                  className={adminStyles.shoeImage}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewImage(item.imageUrl);
                                  }}
                                  style={{ cursor: "pointer" }}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display =
                                      "none";
                                    (
                                      e.target as HTMLImageElement
                                    ).nextElementSibling?.classList.remove(
                                      adminStyles.hiddenPlaceholder
                                    );
                                  }}
                                />
                              ) : null}
                              <div
                                className={`${adminStyles.shoeImagePlaceholder} ${
                                  item.imageUrl ? adminStyles.hiddenPlaceholder : ""
                                }`}
                              >
                                👟
                              </div>
                              <div style={{ display: "flex", flexDirection: "column" }}>
                                <span
                                  style={{
                                    fontWeight: "bold",
                                    fontSize: "1.05rem",
                                  }}
                                >
                                  {item.marca} {item.nombre}
                                </span>
                                <span
                                  style={{
                                    fontSize: "0.85rem",
                                    color: "var(--text-secondary)",
                                  }}
                                >
                                  {item.codigo}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td>{item.color}</td>
                          <td style={{ fontWeight: 600 }}>${item.precio}</td>
                          <td>{totalStock}</td>
                          <td>{getStockBadge(totalStock)}</td>
                        </tr>
                        {isExpanded && (
                          <tr className={adminStyles.expandedContent}>
                            <td colSpan={6}>
                              <div className={adminStyles.expandedInner}>
                                <h4>Tallas Disponibles (Pares)</h4>
                                <div className={adminStyles.sizesGrid}>
                                  {item.tallas?.length > 0 ? (
                                    item.tallas.map((t, idx) => (
                                      <div key={idx} className={adminStyles.sizeCard}>
                                        <span className={adminStyles.sizeNumber}>
                                          {t.talla}
                                        </span>
                                        <div className={adminStyles.sizeDivider} />
                                        <span
                                          className={`${adminStyles.sizeStockBadge} ${
                                            t.stock === 0
                                              ? adminStyles.noStock
                                              : t.stock < 3
                                              ? adminStyles.lowStock
                                              : adminStyles.inStock
                                          }`}
                                        >
                                          {t.stock}
                                        </span>
                                        <span className={adminStyles.sizeStockLabel}>
                                          {t.stock === 1 ? "par" : "pares"}
                                        </span>
                                      </div>
                                    ))
                                  ) : (
                                    <span style={{ color: "var(--text-secondary)" }}>
                                      No hay tallas registradas.
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {filteredShoes.length === 0 && (
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
        ) : (
          /* ==================================================== */
          /* CATÁLOGO CAMISAS                                     */
          /* ==================================================== */
          <>
            <header className={adminStyles.header}>
              <div>
                <h1 className={adminStyles.title}>Catálogo de Camisas</h1>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "0.9rem",
                    marginTop: "0.25rem",
                  }}
                >
                  Consulta existencias por tallas de camisas (S, M, L, XL y especiales)
                </p>
              </div>
            </header>

            <div className={adminStyles.tableContainer} style={{ marginTop: "1rem" }}>
              <div className={adminStyles.tableHeader}>
                <div className={adminStyles.searchBox}>
                  <Search className={adminStyles.searchIcon} size={18} />
                  <input
                    type="text"
                    placeholder="Buscar camisas (nombre, marca, código)..."
                    className={`input ${adminStyles.searchInput}`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "40px" }}></th>
                    <th>Producto (Código)</th>
                    <th>Color</th>
                    <th>Precio</th>
                    <th>Unidades Totales</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShirts.map((item) => {
                    const isExpanded = expandedShirtRows.includes(item.id);
                    const totalStock = getTotalShirtStock(item.tallas);

                    return (
                      <React.Fragment key={item.id}>
                        <tr
                          className={adminStyles.mainRow}
                          onClick={() => toggleShirtRow(item.id)}
                        >
                          <td>
                            <ChevronDown
                              size={18}
                              className={`${adminStyles.expandIcon} ${
                                isExpanded ? adminStyles.open : ""
                              }`}
                            />
                          </td>
                          <td>
                            <div className={adminStyles.productCell}>
                              {item.imageUrl ? (
                                <img
                                  src={fixUrl(item.imageUrl)}
                                  alt={item.nombre}
                                  className={adminStyles.shoeImage}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewImage(item.imageUrl);
                                  }}
                                  style={{ cursor: "pointer" }}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display =
                                      "none";
                                    (
                                      e.target as HTMLImageElement
                                    ).nextElementSibling?.classList.remove(
                                      adminStyles.hiddenPlaceholder
                                    );
                                  }}
                                />
                              ) : null}
                              <div
                                className={`${adminStyles.shoeImagePlaceholder} ${
                                  item.imageUrl ? adminStyles.hiddenPlaceholder : ""
                                }`}
                              >
                                👕
                              </div>
                              <div style={{ display: "flex", flexDirection: "column" }}>
                                <span
                                  style={{
                                    fontWeight: "bold",
                                    fontSize: "1.05rem",
                                  }}
                                >
                                  {item.marca} {item.nombre}
                                </span>
                                <span
                                  style={{
                                    fontSize: "0.85rem",
                                    color: "var(--text-secondary)",
                                  }}
                                >
                                  {item.codigo}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td>{item.color}</td>
                          <td style={{ fontWeight: 600 }}>${item.precio}</td>
                          <td>{totalStock}</td>
                          <td>{getStockBadge(totalStock)}</td>
                        </tr>
                        {isExpanded && (
                          <tr className={adminStyles.expandedContent}>
                            <td colSpan={6}>
                              <div className={adminStyles.expandedInner}>
                                <h4>Tallas Disponibles (Unidades)</h4>
                                <div className={adminStyles.sizesGrid}>
                                  {item.tallas?.length > 0 ? (
                                    item.tallas.map((t, idx) => (
                                      <div key={idx} className={adminStyles.sizeCard}>
                                        <span className={adminStyles.sizeNumber}>
                                          {t.talla}
                                        </span>
                                        <div className={adminStyles.sizeDivider} />
                                        <span
                                          className={`${adminStyles.sizeStockBadge} ${
                                            t.stock === 0
                                              ? adminStyles.noStock
                                              : t.stock < 3
                                              ? adminStyles.lowStock
                                              : adminStyles.inStock
                                          }`}
                                        >
                                          {t.stock}
                                        </span>
                                        <span className={adminStyles.sizeStockLabel}>
                                          {t.stock === 1 ? "unidad" : "unidades"}
                                        </span>
                                      </div>
                                    ))
                                  ) : (
                                    <span style={{ color: "var(--text-secondary)" }}>
                                      No hay tallas registradas.
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {filteredShirts.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "3rem" }}>
                        No se encontraron resultados en camisas
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>

      {/* Lightbox Modal */}
      {previewImage && (
        <div
          className={adminStyles.lightboxOverlay}
          onClick={() => setPreviewImage(null)}
        >
          <button
            className={adminStyles.lightboxClose}
            onClick={() => setPreviewImage(null)}
          >
            <X size={28} />
          </button>
          <img
            src={fixUrl(previewImage)}
            alt="Preview"
            className={adminStyles.lightboxImg}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
