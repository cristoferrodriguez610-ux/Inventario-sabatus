"use client";

import React, { useState, useEffect } from "react";
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
  AlertCircle,
  X,
  ChevronDown
} from "lucide-react";
import styles from "./page.module.css";

type ShoeSize = {
  talla: number;
  stock: number;
};

type User = {
  id: string;
  nombre: string;
  password: string;
  rol: "Admin" | "Usuario";
};

type Shoe = {
  id: string;
  nombre: string;
  marca: string;
  color: string;
  precioCompra: number;
  precioRevendedor: number;
  precio: number;
  imageUrl: string;
  tallas: ShoeSize[];
};

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("inventory");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [inventory, setInventory] = useState<Shoe[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  const [isClient, setIsClient] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [editingStockId, setEditingStockId] = useState<{shoeId: string, sizeIdx: number} | null>(null);
  const [tempStockVal, setTempStockVal] = useState<number>(0);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    nombre: "",
    marca: "",
    color: "",
    precioCompra: 0,
    precioRevendedor: 0,
    precio: 0,
    imageUrl: "",
    tallas: [] as ShoeSize[]
  });

  // User Management State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userFormData, setUserFormData] = useState({
    nombre: "",
    password: "",
    rol: "Usuario" as "Admin" | "Usuario"
  });

  const generatePassword = () => {
    return Math.random().toString(36).slice(-6).toUpperCase();
  };

  const fetchData = async () => {
    setIsLoadingData(true);
    try {
      const [invRes, usersRes] = await Promise.all([
        fetch("/api/inventory"),
        fetch("/api/users")
      ]);
      if (invRes.ok) {
        const invData = await invRes.json();
        setInventory(invData);
      }
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    setIsClient(true);
    fetchData();
  }, []);

  const handleLogout = () => {
    router.push("/");
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  // ----------------------------------------------------
  // INVENTORY METHODS
  // ----------------------------------------------------
  const openModal = (shoe?: Shoe) => {
    if (shoe) {
      setEditingId(shoe.id);
      setFormData({
        nombre: shoe.nombre,
        marca: shoe.marca,
        color: shoe.color,
        precioCompra: shoe.precioCompra || 0,
        precioRevendedor: shoe.precioRevendedor || 0,
        precio: shoe.precio,
        imageUrl: shoe.imageUrl || "",
        tallas: [...shoe.tallas]
      });
    } else {
      setEditingId(null);
      setFormData({
        nombre: "",
        marca: "",
        color: "",
        precioCompra: 0,
        precioRevendedor: 0,
        precio: 0,
        imageUrl: "",
        tallas: [{ talla: 40, stock: 0 }]
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        id: editingId || formData.nombre, // use nombre as ID for new items (col A)
      };

      const res = await fetch("/api/inventory", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchData(); // Refresh data from server
        closeModal();
      } else {
        alert("Error al guardar el calzado.");
      }
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("¿Estás seguro de eliminar este calzado?")) {
      try {
        const res = await fetch(`/api/inventory?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        if (res.ok) {
          await fetchData();
        } else {
          alert("Error al eliminar el calzado.");
        }
      } catch (error) {
        console.error("Delete error:", error);
      }
    }
  };

  const handleAddSize = () => {
    setFormData({
      ...formData,
      tallas: [...formData.tallas, { talla: 41, stock: 0 }]
    });
  };

  const handleRemoveSize = (index: number) => {
    const newTallas = [...formData.tallas];
    newTallas.splice(index, 1);
    setFormData({ ...formData, tallas: newTallas });
  };

  const handleSizeChange = (index: number, field: keyof ShoeSize, value: number) => {
    const newTallas = [...formData.tallas];
    newTallas[index] = { ...newTallas[index], [field]: value };
    setFormData({ ...formData, tallas: newTallas });
  };

  // Inline Stock Edit
  const handleQuickStockChange = async (shoe: Shoe, sizeIdx: number, delta: number) => {
    const newStock = Math.max(0, shoe.tallas[sizeIdx].stock + delta);
    
    // Optimistic UI update
    setInventory(inventory.map(item => {
      if (item.id === shoe.id) {
        const newTallas = [...item.tallas];
        newTallas[sizeIdx] = { ...newTallas[sizeIdx], stock: newStock };
        return { ...item, tallas: newTallas };
      }
      return item;
    }));

    // Save to server
    const payload = { ...shoe };
    payload.tallas[sizeIdx].stock = newStock;

    try {
      await fetch("/api/inventory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error("Inline save error:", error);
      fetchData(); // Revert on error
    }
  };

  const saveInlineStock = async (shoe: Shoe, sizeIdx: number) => {
    const newStock = Math.max(0, tempStockVal);
    
    // Optimistic UI update
    setInventory(inventory.map(item => {
      if (item.id === shoe.id) {
        const newTallas = [...item.tallas];
        newTallas[sizeIdx] = { ...newTallas[sizeIdx], stock: newStock };
        return { ...item, tallas: newTallas };
      }
      return item;
    }));
    
    setEditingStockId(null);

    // Save to server
    const payload = { ...shoe };
    payload.tallas[sizeIdx].stock = newStock;

    try {
      await fetch("/api/inventory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error("Inline save error:", error);
      fetchData(); // Revert on error
    }
  };

  // ----------------------------------------------------
  // USERS METHODS
  // ----------------------------------------------------
  const openUserModal = (user?: User) => {
    if (user) {
      setEditingUserId(user.id);
      setUserFormData({
        nombre: user.nombre,
        password: user.password,
        rol: user.rol
      });
    } else {
      setEditingUserId(null);
      setUserFormData({
        nombre: "",
        password: generatePassword(),
        rol: "Usuario"
      });
    }
    setIsUserModalOpen(true);
  };

  const closeUserModal = () => setIsUserModalOpen(false);

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...userFormData,
        id: editingUserId || Date.now().toString(),
      };

      const res = await fetch("/api/users", {
        method: editingUserId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchData();
        closeUserModal();
      } else {
        alert("Error al guardar el usuario.");
      }
    } catch (error) {
      console.error("Save user error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (window.confirm("¿Estás seguro de eliminar este usuario?")) {
      try {
        const res = await fetch(`/api/users?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        if (res.ok) {
          await fetchData();
        } else {
          alert("Error al eliminar el usuario.");
        }
      } catch (error) {
        console.error("Delete user error:", error);
      }
    }
  };

  // ----------------------------------------------------
  // HELPERS & RENDER
  // ----------------------------------------------------
  const filteredInventory = inventory.filter((item) =>
    item.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.marca.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTotalStock = (tallas: ShoeSize[]) => tallas.reduce((sum, t) => sum + t.stock, 0);

  const getStockBadge = (stock: number) => {
    if (stock === 0) return <span className={`${styles.badge} ${styles.badgeDanger}`}>Agotado</span>;
    if (stock < 10) return <span className={`${styles.badge} ${styles.badgeWarning}`}>Stock Bajo</span>;
    return <span className={`${styles.badge} ${styles.badgeSuccess}`}>En Stock</span>;
  };

  if (!isClient) return null;

  return (
    <div className={styles.adminContainer}>
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

      <main className={styles.mainContent}>
        {isLoadingData ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)' }}>
            <span className="animate-spin" style={{ fontSize: '2rem', marginRight: '1rem' }}>⟳</span> Cargando datos desde Google Sheets...
          </div>
        ) : activeTab === "inventory" ? (
          <>
            <header className={styles.header}>
              <h1 className={styles.title}>Gestión de Inventario</h1>
              <button className="btn btn-primary" onClick={() => openModal()}>
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
                    <th style={{ width: '40px' }}></th>
                    <th>Producto (Código)</th>
                    <th>Color</th>
                    <th>P. Compra</th>
                    <th>P. Venta</th>
                    <th>Stock Total</th>
                    <th>Estado</th>
                    <th>Acciones</th>
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
                          <td>{item.color}</td>
                          <td>${item.precioCompra}</td>
                          <td>${item.precio}</td>
                          <td>{totalStock}</td>
                          <td>{getStockBadge(totalStock)}</td>
                          <td>
                            <div className={styles.actionCell}>
                              <button 
                                className={styles.actionBtn} 
                                title="Editar" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openModal(item);
                                }}
                              >
                                <Edit2 size={16} />
                              </button>
                              <button 
                                className={styles.actionBtn} 
                                title="Eliminar" 
                                onClick={(e) => handleDelete(item.id, e)}
                              >
                                <Trash2 size={16} color="var(--danger)" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className={styles.expandedContent}>
                            <td colSpan={8}>
                              <div className={styles.expandedInner}>
                                <h4>Tallas Disponibles</h4>
                                <div className={styles.sizesGrid}>
                                  {item.tallas.length > 0 ? (
                                    item.tallas.map((t, idx) => {
                                      const isEditingThis = editingStockId?.shoeId === item.id && editingStockId?.sizeIdx === idx;
                                      
                                      return (
                                      <div key={idx} className={styles.sizeCard}>
                                        <span className={styles.sizeNumber}>{t.talla}</span>
                                        <div className={styles.sizeStockContainer}>
                                          <button 
                                            className={styles.stockBtn} 
                                            onClick={(e) => { e.stopPropagation(); handleQuickStockChange(item, idx, -1); }}
                                          >-</button>
                                          
                                          {isEditingThis ? (
                                            <input 
                                              type="number"
                                              className={styles.stockInput}
                                              value={tempStockVal}
                                              autoFocus
                                              onChange={(e) => setTempStockVal(Number(e.target.value))}
                                              onBlur={() => saveInlineStock(item, idx)}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') saveInlineStock(item, idx);
                                                if (e.key === 'Escape') setEditingStockId(null);
                                              }}
                                            />
                                          ) : (
                                            <span 
                                              className={styles.sizeStock}
                                              onDoubleClick={(e) => {
                                                e.stopPropagation();
                                                setTempStockVal(t.stock);
                                                setEditingStockId({ shoeId: item.id, sizeIdx: idx });
                                              }}
                                              title="Doble clic para editar"
                                            >
                                              {t.stock} {t.stock === 1 ? 'par' : 'pares'}
                                            </span>
                                          )}

                                          <button 
                                            className={styles.stockBtn}
                                            onClick={(e) => { e.stopPropagation(); handleQuickStockChange(item, idx, 1); }}
                                          >+</button>
                                        </div>
                                      </div>
                                    )})
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
                      <td colSpan={8} style={{ textAlign: "center", padding: "3rem" }}>
                        No se encontraron resultados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : activeTab === "users" ? (
          <>
            <header className={styles.header}>
              <h1 className={styles.title}>Gestión de Usuarios</h1>
              <button className="btn btn-primary" onClick={() => openUserModal()}>
                <Plus size={20} />
                Añadir Usuario
              </button>
            </header>

            <div className={styles.tableContainer} style={{ marginTop: '2rem' }}>
              <table>
                <thead>
                  <tr>
                    <th>Nombre de Usuario</th>
                    <th>Contraseña</th>
                    <th>Rol</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 500 }}>{u.nombre}</td>
                      <td>
                        <code style={{ background: 'var(--bg-tertiary)', padding: '0.2rem 0.4rem', borderRadius: '4px', letterSpacing: '1px' }}>
                          {u.password}
                        </code>
                      </td>
                      <td>
                        <span className={`${styles.badge} ${u.rol === 'Admin' ? styles.badgeSuccess : styles.badgeWarning}`}>
                          {u.rol}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actionCell}>
                          <button className={styles.actionBtn} onClick={() => openUserModal(u)}><Edit2 size={16} /></button>
                          <button className={styles.actionBtn} onClick={() => handleDeleteUser(u.id)}><Trash2 size={16} color="var(--danger)" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center", padding: "3rem" }}>
                        No hay usuarios registrados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </main>

      {/* Shoe Form Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalContent} animate-fade-in`}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{editingId ? "Editar Calzado" : "Añadir Nuevo Calzado"}</h2>
              <button className={styles.closeBtn} onClick={closeModal} disabled={isSaving}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Imagen del Calzado (Se convierte a Base64 temporalmente)</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    className="input" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setFormData({...formData, imageUrl: reader.result as string});
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  {formData.imageUrl && formData.imageUrl.startsWith("data:") && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--warning)' }}>Nota: Para Google Sheets es mejor usar URLs públicas (http...) en lugar de subir archivos.</span>
                  )}
                  {formData.imageUrl && (
                    <img 
                      src={formData.imageUrl} 
                      alt="Preview" 
                      style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', marginTop: '0.5rem' }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Código / Marca / Nombre *</label>
                  <input 
                    type="text" 
                    className="input" 
                    required
                    placeholder="Ej. NB-1906R-NEG"
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Color</label>
                  <input 
                    type="text" 
                    className="input" 
                    value={formData.color}
                    onChange={(e) => setFormData({...formData, color: e.target.value})}
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Precio Compra ($)</label>
                    <input 
                      type="number" 
                      className="input" 
                      min="0"
                      step="0.01"
                      value={formData.precioCompra}
                      onChange={(e) => setFormData({...formData, precioCompra: Number(e.target.value)})}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Precio Revendedor ($)</label>
                    <input 
                      type="number" 
                      className="input" 
                      min="0"
                      step="0.01"
                      value={formData.precioRevendedor}
                      onChange={(e) => setFormData({...formData, precioRevendedor: Number(e.target.value)})}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Precio Público ($) *</label>
                    <input 
                      type="number" 
                      className="input" 
                      required
                      min="0"
                      step="0.01"
                      value={formData.precio}
                      onChange={(e) => setFormData({...formData, precio: Number(e.target.value)})}
                    />
                  </div>
                </div>

                {/* Tallas y Stock Dynamic Form */}
                <div className={styles.sizesFormContainer}>
                  <div className={styles.sizesHeader}>
                    <h4>Inventario por Tallas</h4>
                  </div>
                  
                  {formData.tallas.map((t, idx) => (
                    <div key={idx} className={styles.sizeInputRow}>
                      <div className={styles.formGroup} style={{ flex: 1 }}>
                        <label className={styles.label} style={{ fontSize: '0.75rem' }}>Talla</label>
                        <select 
                          className="input"
                          value={t.talla}
                          onChange={(e) => handleSizeChange(idx, 'talla', Number(e.target.value))}
                        >
                          {[35, 36, 37, 38, 39, 40, 41, 42, 43, 44].map(sz => (
                            <option key={sz} value={sz}>{sz}</option>
                          ))}
                        </select>
                      </div>
                      <div className={styles.formGroup} style={{ flex: 1 }}>
                        <label className={styles.label} style={{ fontSize: '0.75rem' }}>Stock</label>
                        <input 
                          type="number" 
                          className="input" 
                          required
                          min="0"
                          value={t.stock}
                          onChange={(e) => handleSizeChange(idx, 'stock', Number(e.target.value))}
                        />
                      </div>
                      <button 
                        type="button" 
                        className={styles.removeSizeBtn} 
                        onClick={() => handleRemoveSize(idx)}
                        style={{ marginTop: '1.25rem' }}
                        title="Eliminar talla"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                  
                  <button type="button" className={styles.addSizeBtn} onClick={handleAddSize}>
                    <Plus size={16} /> Añadir otra talla
                  </button>
                </div>

              </div>

              <div className={styles.modalFooter}>
                <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={isSaving}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? "Guardando..." : (editingId ? "Guardar Cambios" : "Añadir Calzado")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Form Modal */}
      {isUserModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalContent} animate-fade-in`} style={{ maxWidth: '400px' }}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{editingUserId ? "Editar Usuario" : "Añadir Nuevo Usuario"}</h2>
              <button className={styles.closeBtn} onClick={closeUserModal} disabled={isSaving}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveUser}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Nombre de Usuario *</label>
                  <input 
                    type="text" 
                    className="input" 
                    required
                    value={userFormData.nombre}
                    onChange={(e) => setUserFormData({...userFormData, nombre: e.target.value})}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Contraseña Generada</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      type="text" 
                      className="input" 
                      readOnly
                      value={userFormData.password}
                      style={{ fontFamily: 'monospace', letterSpacing: '1px', flex: 1, backgroundColor: 'var(--bg-secondary)' }}
                    />
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={() => setUserFormData({...userFormData, password: generatePassword()})}
                      title="Generar nueva contraseña"
                    >
                      Regenerar
                    </button>
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Rol en el Sistema *</label>
                  <select 
                    className="input" 
                    value={userFormData.rol}
                    onChange={(e) => setUserFormData({...userFormData, rol: e.target.value as "Admin" | "Usuario"})}
                    style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  >
                    <option value="Usuario">Usuario (Solo ver inventario)</option>
                    <option value="Admin">Administrador (Control total)</option>
                  </select>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button type="button" className="btn btn-secondary" onClick={closeUserModal} disabled={isSaving}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? "Guardando..." : (editingUserId ? "Guardar Cambios" : "Añadir Usuario")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
