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
  AlertCircle,
  X
} from "lucide-react";
import styles from "./page.module.css";

// Definir tipo para el inventario
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

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("inventory");
  const [searchQuery, setSearchQuery] = useState("");
  const [inventory, setInventory] = useState<Shoe[]>(MOCK_INVENTORY);
  const [isClient, setIsClient] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    nombre: "",
    marca: "",
    talla: 40,
    color: "",
    stock: 0,
    precio: 0,
    imageUrl: ""
  });

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleLogout = () => {
    router.push("/");
  };

  const openModal = (shoe?: Shoe) => {
    if (shoe) {
      setEditingId(shoe.id);
      setFormData({
        nombre: shoe.nombre,
        marca: shoe.marca,
        talla: shoe.talla,
        color: shoe.color,
        stock: shoe.stock,
        precio: shoe.precio,
        imageUrl: shoe.imageUrl || ""
      });
    } else {
      setEditingId(null);
      setFormData({
        nombre: "",
        marca: "",
        talla: 40,
        color: "",
        stock: 0,
        precio: 0,
        imageUrl: ""
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
      // Actualizar existente
      setInventory(inventory.map(item => 
        item.id === editingId ? { ...formData, id: editingId } : item
      ));
    } else {
      // Añadir nuevo
      const newShoe: Shoe = {
        ...formData,
        id: Date.now().toString(),
      };
      setInventory([...inventory, newShoe]);
    }
    closeModal();
  };

  const handleDelete = (id: string) => {
    if (window.confirm("¿Estás seguro de eliminar este calzado?")) {
      setInventory(inventory.filter(item => item.id !== id));
    }
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
                    <th>Producto</th>
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
                      <td>
                        <div className={styles.productCell}>
                          <img 
                            src={item.imageUrl || "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=150&q=80"} 
                            alt={item.nombre} 
                            className={styles.shoeImage}
                            onError={(e) => {
                              // Fallback image if URL fails
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
                      <td>
                        <div className={styles.actionCell}>
                          <button className={styles.actionBtn} title="Editar" onClick={() => openModal(item)}>
                            <Edit2 size={16} />
                          </button>
                          <button className={styles.actionBtn} title="Eliminar" onClick={() => handleDelete(item.id)}>
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
                  <label className={styles.label}>URL de la Imagen</label>
                  <input 
                    type="url" 
                    className="input" 
                    placeholder="https://ejemplo.com/imagen.jpg"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
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

                <div className={styles.formRow}>
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
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Talla *</label>
                    <input 
                      type="number" 
                      className="input" 
                      required
                      min="1"
                      step="0.5"
                      value={formData.talla}
                      onChange={(e) => setFormData({...formData, talla: Number(e.target.value)})}
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

                <div className={styles.formGroup}>
                  <label className={styles.label}>Cantidad en Stock *</label>
                  <input 
                    type="number" 
                    className="input" 
                    required
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({...formData, stock: Number(e.target.value)})}
                  />
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
    </div>
  );
}
