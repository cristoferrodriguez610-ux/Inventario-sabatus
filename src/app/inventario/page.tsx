"use client";

import React, { useState, useEffect, useMemo, useDeferredValue, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LogOut,
  ChevronDown,
  X,
  Shirt,
  SportShoe,
  LayoutDashboard,
  Menu,
} from "lucide-react";
import adminStyles from "../admin/page.module.css";
import { filterAndRankProducts } from "@/lib/search";
import { ProductImage, ImageLightbox, CopyableCode } from "@/components/ProductImage";
import {
  AUTH_TOKEN_KEY,
  AUTH_VERSION_KEY,
  CURRENT_SESSION_VERSION,
  USER_NAME_KEY,
  USER_ROLE_KEY,
} from "@/lib/auth-constants";

const SHOES_CACHE_KEY = "sabattus_cache_shoes_v1";
const SHIRTS_CACHE_KEY = "sabattus_cache_shirts_v1";
const PAGE_SIZE = 30;

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
  precioRevendedor?: number;
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
  precioRevendedor?: number;
  precio: number;
  imageUrl: string;
  tallas: ShirtSize[];
};

function formatProductTitle(marca?: string, nombre?: string): string {
  const m = (marca || "").trim();
  const n = (nombre || "").trim();
  if (!m) return n;
  if (!n) return m;
  if (n.toLowerCase().startsWith(m.toLowerCase())) return n;
  return `${m} ${n}`;
}

export default function InventoryDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"shoes" | "shirts">("shoes");
  const [inventorySubmenuOpen, setInventorySubmenuOpen] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const [inventory, setInventory] = useState<Shoe[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(SHOES_CACHE_KEY);
        return cached ? JSON.parse(cached) : [];
      } catch {
        return [];
      }
    }
    return [];
  });
  const [shirtInventory, setShirtInventory] = useState<Shirt[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(SHIRTS_CACHE_KEY);
        return cached ? JSON.parse(cached) : [];
      } catch {
        return [];
      }
    }
    return [];
  });
  const [isClient, setIsClient] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [expandedShirtRows, setExpandedShirtRows] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const shoesObserverRef = useRef<HTMLTableRowElement | null>(null);
  const shirtsObserverRef = useRef<HTMLTableRowElement | null>(null);

  useEffect(() => {
    setIsClient(true);

    const token = typeof window !== "undefined" ? localStorage.getItem(AUTH_TOKEN_KEY) : null;
    const version = typeof window !== "undefined" ? localStorage.getItem(AUTH_VERSION_KEY) : null;
    const role = typeof window !== "undefined" ? localStorage.getItem(USER_ROLE_KEY) : null;
    const username = typeof window !== "undefined" ? localStorage.getItem(USER_NAME_KEY) : null;

    if (!token || version !== CURRENT_SESSION_VERSION || !role || !username) {
      if (typeof window !== "undefined") {
        localStorage.clear();
      }
      router.replace("/");
      return;
    }

    setIsAuthenticated(true);

    // If cache already exists, show it immediately without blocking with loading spinner
    try {
      const cachedShoes = localStorage.getItem(SHOES_CACHE_KEY);
      const cachedShirts = localStorage.getItem(SHIRTS_CACHE_KEY);
      if (cachedShoes) setInventory(JSON.parse(cachedShoes));
      if (cachedShirts) setShirtInventory(JSON.parse(cachedShirts));
      if (cachedShoes || cachedShirts) {
        setIsLoading(false);
      }
    } catch {
      // ignore
    }

    const fetchAllInventory = async (currentRole: string) => {
      try {
        const [invRes, shirtsRes] = await Promise.all([
          fetch("/api/inventory", {
            headers: { "x-user-role": currentRole },
          }),
          fetch("/api/shirts", {
            headers: { "x-user-role": currentRole },
          }),
        ]);
        if (invRes.ok) {
          const data = await invRes.json();
          setInventory(data);
          try {
            localStorage.setItem(SHOES_CACHE_KEY, JSON.stringify(data));
          } catch {}
        }
        if (shirtsRes.ok) {
          const shirtsData = await shirtsRes.json();
          setShirtInventory(shirtsData);
          try {
            localStorage.setItem(SHIRTS_CACHE_KEY, JSON.stringify(shirtsData));
          } catch {}
        }
      } catch (error) {
        console.error("Error fetching inventory:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllInventory(role);

    fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, username, role }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Invalid session");
        const data = await res.json();
        if (!data.valid) throw new Error("Unauthorized");
      })
      .catch((err) => {
        console.warn("Session expired or credentials changed:", err);
        if (typeof window !== "undefined") {
          localStorage.clear();
        }
        router.replace("/");
      });
  }, []);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.clear();
    }
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

  const filteredShoes = useMemo(
    () => filterAndRankProducts(inventory, deferredSearchQuery),
    [inventory, deferredSearchQuery]
  );

  const filteredShirts = useMemo(
    () => filterAndRankProducts(shirtInventory, deferredSearchQuery),
    [shirtInventory, deferredSearchQuery]
  );

  // Reset display count when search or active tab changes
  useEffect(() => {
    setDisplayCount(PAGE_SIZE);
  }, [deferredSearchQuery, activeTab]);

  // Infinite scroll observer for Shoes
  useEffect(() => {
    if (activeTab !== "shoes") return;
    const el = shoesObserverRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setDisplayCount((prev) => prev + PAGE_SIZE);
        }
      },
      { rootMargin: "350px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [activeTab, displayCount, filteredShoes.length]);

  // Infinite scroll observer for Shirts
  useEffect(() => {
    if (activeTab !== "shirts") return;
    const el = shirtsObserverRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setDisplayCount((prev) => prev + PAGE_SIZE);
        }
      },
      { rootMargin: "350px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [activeTab, displayCount, filteredShirts.length]);

  const visibleShoes = useMemo(
    () => filteredShoes.slice(0, displayCount),
    [filteredShoes, displayCount]
  );

  const visibleShirts = useMemo(
    () => filteredShirts.slice(0, displayCount),
    [filteredShirts, displayCount]
  );

  const getTotalShoeStock = (tallas: ShoeSize[]) =>
    (tallas || []).reduce((sum, t) => sum + (t.stock || 0), 0);
  const getTotalShirtStock = (tallas: ShirtSize[]) =>
    (tallas || []).reduce((sum, t) => sum + (t.stock || 0), 0);

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

  if (!isClient || !isAuthenticated) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-main)', gap: '1rem' }}>
        <span className="animate-spin" style={{ fontSize: '2rem' }}>⟳</span>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Verificando sesión...</p>
      </div>
    );
  }

  return (
    <div className={adminStyles.adminContainer}>
      {sidebarOpen && (
        <div
          className={adminStyles.mobileOverlay}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`${adminStyles.sidebar} ${
          sidebarOpen ? adminStyles.sidebarOpen : ""
        }`}
      >
        <div className={adminStyles.sidebarHeader}>
          <div className={adminStyles.logoText}>
            <span className={adminStyles.logoName}>Sabattus</span>
            <span className={adminStyles.logoTagline}>Luce y viste bien</span>
          </div>
          <button
            className={adminStyles.closeSidebarBtn}
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
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
                  onClick={() => {
                    setActiveTab("shoes");
                    setSidebarOpen(false);
                  }}
                >
                  <SportShoe size={18} />
                  <span>Tenis</span>
                  <span className={adminStyles.badgeCount}>{inventory.length}</span>
                </button>
                <button
                  className={`${adminStyles.navSubItem} ${
                    activeTab === "shirts" ? adminStyles.activeSub : ""
                  }`}
                  onClick={() => {
                    setActiveTab("shirts");
                    setSidebarOpen(false);
                  }}
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
        {/* Mobile top bar */}
        <div className={adminStyles.mobileTopBar}>
          <button
            className={adminStyles.hamburgerBtn}
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={22} />
          </button>
          <span className={adminStyles.mobileBrand}>SABATTUS</span>
        </div>

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
                <div className={adminStyles.searchBox} style={{ width: "min(100%, 380px)" }}>
                  <Search className={adminStyles.searchIcon} size={18} />
                  <input
                    type="text"
                    placeholder="Buscar tenis (nombre, marca, color, código)..."
                    className={`input ${adminStyles.searchInput}`}
                    style={{ paddingRight: searchQuery ? "2.25rem" : undefined }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      aria-label="Limpiar búsqueda"
                      style={{
                        position: "absolute",
                        right: "0.6rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: "var(--text-muted)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0.2rem",
                        cursor: "pointer",
                      }}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                {searchQuery.trim() && (
                  <span
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--text-secondary)",
                      fontWeight: 600,
                    }}
                  >
                    {filteredShoes.length}{" "}
                    {filteredShoes.length === 1 ? "resultado" : "resultados"}
                  </span>
                )}
              </div>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "40px" }}></th>
                    <th>Producto (Código)</th>
                    <th>Color</th>
                    <th>P. Revendedor</th>
                    <th>P. Cliente</th>
                    <th>Pares Totales</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleShoes.map((item) => {
                    const isExpanded = expandedRows.includes(item.id);
                    const totalStock = getTotalShoeStock(item.tallas);
                    const titleText = formatProductTitle(item.marca, item.nombre);

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
                              <ProductImage
                                src={item.imageUrl}
                                alt={titleText}
                                fallbackEmoji="👟"
                                imageClassName={adminStyles.shoeImage}
                                placeholderClassName={adminStyles.shoeImagePlaceholder}
                                onPreview={(url) => setPreviewImage(url)}
                              />
                              <div style={{ display: "flex", flexDirection: "column" }}>
                                <span
                                  style={{
                                    fontWeight: "bold",
                                    fontSize: "1.05rem",
                                  }}
                                >
                                  {titleText}
                                </span>
                                <CopyableCode code={item.codigo} />
                              </div>
                            </div>
                          </td>
                          <td>{item.color}</td>
                          <td style={{ fontWeight: 600 }}>${item.precioRevendedor || 0}</td>
                          <td style={{ fontWeight: 600 }}>${item.precio}</td>
                          <td>{totalStock}</td>
                          <td>{getStockBadge(totalStock)}</td>
                        </tr>
                        {isExpanded && (
                          <tr className={adminStyles.expandedContent}>
                            <td colSpan={7}>
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
                  {displayCount < filteredShoes.length && (
                    <tr ref={shoesObserverRef}>
                      <td colSpan={7} style={{ textAlign: "center", padding: "1.25rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        Cargando más productos ({visibleShoes.length} de {filteredShoes.length})...
                      </td>
                    </tr>
                  )}
                  {filteredShoes.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "3rem" }}>
                        No se encontraron resultados para &ldquo;{searchQuery}&rdquo;
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
                <div className={adminStyles.searchBox} style={{ width: "min(100%, 380px)" }}>
                  <Search className={adminStyles.searchIcon} size={18} />
                  <input
                    type="text"
                    placeholder="Buscar camisas (nombre, marca, color, código)..."
                    className={`input ${adminStyles.searchInput}`}
                    style={{ paddingRight: searchQuery ? "2.25rem" : undefined }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      aria-label="Limpiar búsqueda"
                      style={{
                        position: "absolute",
                        right: "0.6rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: "var(--text-muted)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0.2rem",
                        cursor: "pointer",
                      }}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                {searchQuery.trim() && (
                  <span
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--text-secondary)",
                      fontWeight: 600,
                    }}
                  >
                    {filteredShirts.length}{" "}
                    {filteredShirts.length === 1 ? "resultado" : "resultados"}
                  </span>
                )}
              </div>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "40px" }}></th>
                    <th>Producto (Código)</th>
                    <th>Color</th>
                    <th>P. Revendedor</th>
                    <th>P. Cliente</th>
                    <th>Unidades Totales</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleShirts.map((item) => {
                    const isExpanded = expandedShirtRows.includes(item.id);
                    const totalStock = getTotalShirtStock(item.tallas);
                    const titleText = formatProductTitle(item.marca, item.nombre);

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
                              <ProductImage
                                src={item.imageUrl}
                                alt={titleText}
                                fallbackEmoji="👕"
                                imageClassName={adminStyles.shoeImage}
                                placeholderClassName={adminStyles.shoeImagePlaceholder}
                                onPreview={(url) => setPreviewImage(url)}
                              />
                              <div style={{ display: "flex", flexDirection: "column" }}>
                                <span
                                  style={{
                                    fontWeight: "bold",
                                    fontSize: "1.05rem",
                                  }}
                                >
                                  {titleText}
                                </span>
                                <CopyableCode code={item.codigo} />
                              </div>
                            </div>
                          </td>
                          <td>{item.color}</td>
                          <td style={{ fontWeight: 600 }}>${item.precioRevendedor || 0}</td>
                          <td style={{ fontWeight: 600 }}>${item.precio}</td>
                          <td>{totalStock}</td>
                          <td>{getStockBadge(totalStock)}</td>
                        </tr>
                        {isExpanded && (
                          <tr className={adminStyles.expandedContent}>
                            <td colSpan={7}>
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
                  {displayCount < filteredShirts.length && (
                    <tr ref={shirtsObserverRef}>
                      <td colSpan={7} style={{ textAlign: "center", padding: "1.25rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        Cargando más productos ({visibleShirts.length} de {filteredShirts.length})...
                      </td>
                    </tr>
                  )}
                  {filteredShirts.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "3rem" }}>
                        No se encontraron resultados en camisas para &ldquo;{searchQuery}&rdquo;
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
      <ImageLightbox
        src={previewImage}
        onClose={() => setPreviewImage(null)}
        overlayClassName={adminStyles.lightboxOverlay}
        closeBtnClassName={adminStyles.lightboxClose}
        imgClassName={adminStyles.lightboxImg}
      />
    </div>
  );
}
