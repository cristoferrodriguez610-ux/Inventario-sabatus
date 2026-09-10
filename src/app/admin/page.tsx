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

const MOCK_USERS: User[] = [
  { id: "1", nombre: "Administrador Principal", password: "admin", rol: "Admin" },
  { id: "2", nombre: "Vendedor 1", password: "vend1", rol: "Usuario" },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("inventory");
  const [searchQuery, setSearchQuery] = useState("");
  const [inventory, setInventory] = useState<Shoe[]>(MOCK_INVENTORY);
  const [isClient, setIsClient] = useState(false);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [editingStockId, setEditingStockId] = useState<{shoeId: string, sizeIdx: number} | null>(null);
  const [tempStockVal, setTempStockVal] = useState<number>(0);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    nombre: "",
    marca: "",
    color: "",
    precio: 0,
    imageUrl: "",
    tallas: [] as ShoeSize[]
  });

  // User Management State
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
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

  const openModal = (shoe?: Shoe) => {
    if (shoe) {
      setEditingId(shoe.id);
      setFormData({
        nombre: shoe.nombre,
        marca: shoe.marca,
        color: shoe.color,
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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setInventory(inventory.map(item => 
        item.id === editingId ? { ...formData, id: editingId } : item
      ));
    } else {
      const newShoe: Shoe = {
        ...formData,
        id: Date.now().toString(),
      };
      setInventory([...inventory, newShoe]);
    }
    closeModal();
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("¿Estás seguro de eliminar este calzado?")) {
      setInventory(inventory.filter(item => item.id !== id));
    }
  };

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

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUserId) {
      setUsers(users.map(u => u.id === editingUserId ? { ...userFormData, id: editingUserId } : u));
    } else {
      setUsers([...users, { ...userFormData, id: Date.now().toString() }]);
    }
    closeUserModal();
  };

  const handleDeleteUser = (id: string) => {
    if (window.confirm("¿Estás seguro de eliminar este usuario?")) {
      setUsers(users.filter(u => u.id !== id));
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

  const handleQuickStockChange = (shoeId: string, sizeIdx: number, delta: number) => {
    setInventory(inventory.map(item => {
      if (item.id === shoeId) {
        const newTallas = [...item.tallas];
        newTallas[sizeIdx] = { ...newTallas[sizeIdx], stock: Math.max(0, newTallas[sizeIdx].stock + delta) };
        return { ...item, tallas: newTallas };
      }
      return item;
    }));
  };

  const saveInlineStock = (shoeId: string, sizeIdx: number) => {
    setInventory(inventory.map(item => {
      if (item.id === shoeId) {
        const newTallas = [...item.tallas];
        newTallas[sizeIdx] = { ...newTallas[sizeIdx], stock: Math.max(0, tempStockVal) };
        return { ...item, tallas: newTallas };
      }
      return item;
    }));
    setEditingStockId(null);
  };

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
        {activeTab === "inventory" && (
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
                    <th>Producto</th>
                    <th>Marca</th>
                    <th>Color</th>
                    <th>Precio</th>
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
                          <td>{item.marca}</td>
                          <td>{item.color}</td>
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
                                            onClick={(e) => { e.stopPropagation(); handleQuickStockChange(item.id, idx, -1); }}
                                          >-</button>
                                          
                                          {isEditingThis ? (
                                            <input 
                                              type="number"
                                              className={styles.stockInput}
                                              value={tempStockVal}
                                              autoFocus
                                              onChange={(e) => setTempStockVal(Number(e.target.value))}
                                              onBlur={() => saveInlineStock(item.id, idx)}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') saveInlineStock(item.id, idx);
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
                                            onClick={(e) => { e.stopPropagation(); handleQuickStockChange(item.id, idx, 1); }}
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
        )}

        {activeTab === "users" && (
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
        )}
      </main>

      {/* Form Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalContent} animate-fade-in`}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{editingId ? "Editar Calzado" : "Añadir Nuevo Calzado"}</h2>
              <button className={styles.closeBtn} onClick={closeModal}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Imagen del Calzado</label>
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
                  {formData.imageUrl && (
                    <img 
                      src={formData.imageUrl} 
                      alt="Preview" 
                      style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', marginTop: '0.5rem' }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Nombre del Modelo *</label>
                    <input 
                      type="text" 
                      className="input" 
                      required
                      value={formData.nombre}
                      onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Marca *</label>
                    <input 
                      type="text" 
                      className="input" 
                      required
                      value={formData.marca}
                      onChange={(e) => setFormData({...formData, marca: e.target.value})}
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Color *</label>
                    <input 
                      type="text" 
                      className="input" 
                      required
                      value={formData.color}
                      onChange={(e) => setFormData({...formData, color: e.target.value})}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Precio ($) *</label>
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
                        <input 
                          type="number" 
                          className="input" 
                          required
                          step="0.5"
                          value={t.talla}
                          onChange={(e) => handleSizeChange(idx, 'talla', Number(e.target.value))}
                        />
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
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? "Guardar Cambios" : "Añadir Calzado"}
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
              <button className={styles.closeBtn} onClick={closeUserModal}>
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
                <button type="button" className="btn btn-secondary" onClick={closeUserModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingUserId ? "Guardar Cambios" : "Añadir Usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
