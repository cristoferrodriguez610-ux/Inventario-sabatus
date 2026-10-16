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
  X,
  ChevronDown,
  Menu,
  Shirt,
  SportShoe,
  AlertCircle
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
  codigo: string;
  nombre: string;
  marca: string;
  color: string;
  precioCompra: number;
  precioRevendedor: number;
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
  precioCompra: number;
  precioRevendedor: number;
  precio: number;
  imageUrl: string;
  tallas: ShirtSize[];
};

const DEFAULT_SHIRT_SIZES: ShirtSize[] = [
  { talla: "S", stock: 0 },
  { talla: "M", stock: 0 },
  { talla: "L", stock: 0 },
  { talla: "XL", stock: 0 },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"shoes" | "shirts" | "users" | "settings">("shoes");
  const [inventorySubmenuOpen, setInventorySubmenuOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Data states
  const [inventory, setInventory] = useState<Shoe[]>([]);
  const [shirtInventory, setShirtInventory] = useState<Shirt[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  const [isClient, setIsClient] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  // Inline edit states for Shoes
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [editingStockId, setEditingStockId] = useState<{shoeId: string, sizeIdx: number} | null>(null);
  const [tempStockVal, setTempStockVal] = useState<number>(0);
  const [editingPrice, setEditingPrice] = useState<{shoeId: string, type: 'compra' | 'venta'} | null>(null);
  const [tempPriceVal, setTempPriceVal] = useState<number>(0);

  // Inline edit states for Shirts
  const [expandedShirtRows, setExpandedShirtRows] = useState<string[]>([]);
  const [editingShirtStockId, setEditingShirtStockId] = useState<{shirtId: string, sizeIdx: number} | null>(null);
  const [tempShirtStockVal, setTempShirtStockVal] = useState<number>(0);
  const [editingShirtPrice, setEditingShirtPrice] = useState<{shirtId: string, type: 'compra' | 'venta'} | null>(null);
  const [tempShirtPriceVal, setTempShirtPriceVal] = useState<number>(0);

  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Shoe Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  
  const [formData, setFormData] = useState({
    codigo: "",
    nombre: "",
    marca: "",
    color: "",
    precioCompra: 0,
    precioRevendedor: 0,
    precio: 0,
    imageUrl: "",
    tallas: [] as ShoeSize[]
  });

  // Shirt Modal State
  const [isShirtModalOpen, setIsShirtModalOpen] = useState(false);
  const [editingShirtId, setEditingShirtId] = useState<string | null>(null);
  const [isSavingShirt, setIsSavingShirt] = useState(false);
  const [isUploadingShirtImage, setIsUploadingShirtImage] = useState(false);

  const [shirtFormData, setShirtFormData] = useState({
    codigo: "",
    nombre: "",
    marca: "",
    color: "",
    precioCompra: 0,
    precioRevendedor: 0,
    precio: 0,
    imageUrl: "",
    tallas: DEFAULT_SHIRT_SIZES as ShirtSize[]
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

  // Helper to compress image to a lightweight format for instant reliable storage
  const compressImage = (file: File, maxWidth = 380, maxHeight = 380, quality = 0.72): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(event.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
          resolve(compressedDataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const processAndUploadFile = async (file: File): Promise<string> => {
    // 1. Generate lightweight canvas compressed image as safe fallback
    let compressedFallback = "";
    try {
      compressedFallback = await compressImage(file, 380, 380, 0.72);
    } catch (err) {
      console.warn("Could not compress image:", err);
    }

    // 2. Try ImgBB if an API key is provided
    const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
    if (apiKey && apiKey !== "undefined" && apiKey.trim() !== "") {
      try {
        const fData = new FormData();
        fData.append("image", file);
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
          method: "POST",
          body: fData,
        });
        const data = await res.json();
        if (data && data.success && data.data?.url) {
          return data.data.url;
        }
      } catch (err) {
        console.warn("ImgBB upload failed, falling back to compressed image:", err);
      }
    }

    // 3. Return the compressed data URL (guaranteed to work without any API keys or network latency)
    if (compressedFallback) {
      return compressedFallback;
    }

    throw new Error("No se pudo procesar la imagen");
  };


  const fetchData = async () => {
    setIsLoadingData(true);
    try {
      const [invRes, shirtsRes, usersRes] = await Promise.all([
        fetch("/api/inventory"),
        fetch("/api/shirts"),
        fetch("/api/users")
      ]);
      if (invRes.ok) {
        const invData = await invRes.json();
        setInventory(invData);
      }
      if (shirtsRes.ok) {
        const shirtsData = await shirtsRes.json();
        setShirtInventory(shirtsData);
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

  const toggleShirtRow = (id: string) => {
    setExpandedShirtRows(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  // ----------------------------------------------------
  // SHOE METHODS
  // ----------------------------------------------------
  const openModal = (shoe?: Shoe) => {
    if (shoe) {
      setEditingId(shoe.id);
      setFormData({
        codigo: shoe.codigo || shoe.id,
        nombre: shoe.nombre || "",
        marca: shoe.marca || "",
        color: shoe.color || "",
        precioCompra: shoe.precioCompra || 0,
        precioRevendedor: shoe.precioRevendedor || 0,
        precio: shoe.precio || 0,
        imageUrl: shoe.imageUrl || "",
        tallas: [...shoe.tallas]
      });
    } else {
      setEditingId(null);
      setFormData({
        codigo: "",
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
        id: editingId || formData.codigo,
      };

      const res = await fetch("/api/inventory", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchData();
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

  const handleQuickStockChange = async (shoe: Shoe, sizeIdx: number, delta: number) => {
    const newStock = Math.max(0, shoe.tallas[sizeIdx].stock + delta);
    setInventory(inventory.map(item => {
      if (item.id === shoe.id) {
        const newTallas = [...item.tallas];
        newTallas[sizeIdx] = { ...newTallas[sizeIdx], stock: newStock };
        return { ...item, tallas: newTallas };
      }
      return item;
    }));

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
      fetchData();
    }
  };

  const saveInlineStock = async (shoe: Shoe, sizeIdx: number) => {
    const newStock = Math.max(0, tempStockVal);
    setInventory(inventory.map(item => {
      if (item.id === shoe.id) {
        const newTallas = [...item.tallas];
        newTallas[sizeIdx] = { ...newTallas[sizeIdx], stock: newStock };
        return { ...item, tallas: newTallas };
      }
      return item;
    }));
    
    setEditingStockId(null);
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
      fetchData();
    }
  };

  const saveInlinePrice = async (shoe: Shoe, type: 'compra' | 'venta') => {
    const newPrice = Math.max(0, tempPriceVal);
    setInventory(inventory.map(item => {
      if (item.id === shoe.id) {
        return {
          ...item,
          precioCompra: type === 'compra' ? newPrice : item.precioCompra,
          precio: type === 'venta' ? newPrice : item.precio,
        };
      }
      return item;
    }));

    setEditingPrice(null);
    const payload = { ...shoe };
    if (type === 'compra') payload.precioCompra = newPrice;
    if (type === 'venta') payload.precio = newPrice;

    try {
      await fetch("/api/inventory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error("Inline price save error:", error);
      fetchData();
    }
  };

  // ----------------------------------------------------
  // SHIRT METHODS
  // ----------------------------------------------------
  const openShirtModal = (shirt?: Shirt) => {
    if (shirt) {
      setEditingShirtId(shirt.id);
      setShirtFormData({
        codigo: shirt.codigo || shirt.id,
        nombre: shirt.nombre || "",
        marca: shirt.marca || "",
        color: shirt.color || "",
        precioCompra: shirt.precioCompra || 0,
        precioRevendedor: shirt.precioRevendedor || 0,
        precio: shirt.precio || 0,
        imageUrl: shirt.imageUrl || "",
        tallas: shirt.tallas?.length ? [...shirt.tallas] : [...DEFAULT_SHIRT_SIZES],
      });
    } else {
      setEditingShirtId(null);
      setShirtFormData({
        codigo: "",
        nombre: "",
        marca: "",
        color: "",
        precioCompra: 0,
        precioRevendedor: 0,
        precio: 0,
        imageUrl: "",
        tallas: [
          { talla: "S", stock: 0 },
          { talla: "M", stock: 0 },
          { talla: "L", stock: 0 },
          { talla: "XL", stock: 0 },
        ],
      });
    }
    setIsShirtModalOpen(true);
  };

  const closeShirtModal = () => {
    setIsShirtModalOpen(false);
  };

  const handleSaveShirt = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingShirt(true);
    try {
      const payload = {
        ...shirtFormData,
        id: editingShirtId || shirtFormData.codigo,
      };

      const res = await fetch("/api/shirts", {
        method: editingShirtId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchData();
        closeShirtModal();
      } else {
        alert("Error al guardar la camisa.");
      }
    } catch (error) {
      console.error("Save shirt error:", error);
    } finally {
      setIsSavingShirt(false);
    }
  };

  const handleDeleteShirt = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("¿Estás seguro de eliminar esta camisa del inventario?")) {
      try {
        const res = await fetch(`/api/shirts?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        if (res.ok) {
          await fetchData();
        } else {
          alert("Error al eliminar la camisa.");
        }
      } catch (error) {
        console.error("Delete shirt error:", error);
      }
    }
  };

  const handleAddShirtSize = (customSize?: string) => {
    const tallaName = customSize || "XXL";
    // If talla already exists, don't duplicate
    if (shirtFormData.tallas.some(t => t.talla.toUpperCase() === tallaName.toUpperCase())) {
      alert(`La talla ${tallaName} ya está en la lista.`);
      return;
    }
    setShirtFormData({
      ...shirtFormData,
      tallas: [...shirtFormData.tallas, { talla: tallaName, stock: 0 }]
    });
  };

  const handleRemoveShirtSize = (index: number) => {
    const newTallas = [...shirtFormData.tallas];
    newTallas.splice(index, 1);
    setShirtFormData({ ...shirtFormData, tallas: newTallas });
  };

  const handleShirtSizeChange = (index: number, field: keyof ShirtSize, value: any) => {
    const newTallas = [...shirtFormData.tallas];
    newTallas[index] = { ...newTallas[index], [field]: value };
    setShirtFormData({ ...shirtFormData, tallas: newTallas });
  };

  const handleQuickShirtStockChange = async (shirt: Shirt, sizeIdx: number, delta: number) => {
    const newStock = Math.max(0, shirt.tallas[sizeIdx].stock + delta);
    setShirtInventory(shirtInventory.map(item => {
      if (item.id === shirt.id) {
        const newTallas = [...item.tallas];
        newTallas[sizeIdx] = { ...newTallas[sizeIdx], stock: newStock };
        return { ...item, tallas: newTallas };
      }
      return item;
    }));

    const payload = { ...shirt };
    payload.tallas[sizeIdx].stock = newStock;

    try {
      await fetch("/api/shirts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error("Inline save error:", error);
      fetchData();
    }
  };

  const saveInlineShirtStock = async (shirt: Shirt, sizeIdx: number) => {
    const newStock = Math.max(0, tempShirtStockVal);
    setShirtInventory(shirtInventory.map(item => {
      if (item.id === shirt.id) {
        const newTallas = [...item.tallas];
        newTallas[sizeIdx] = { ...newTallas[sizeIdx], stock: newStock };
        return { ...item, tallas: newTallas };
      }
      return item;
    }));
    
    setEditingShirtStockId(null);
    const payload = { ...shirt };
    payload.tallas[sizeIdx].stock = newStock;

    try {
      await fetch("/api/shirts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error("Inline save error:", error);
      fetchData();
    }
  };

  const saveInlineShirtPrice = async (shirt: Shirt, type: 'compra' | 'venta') => {
    const newPrice = Math.max(0, tempShirtPriceVal);
    setShirtInventory(shirtInventory.map(item => {
      if (item.id === shirt.id) {
        return {
          ...item,
          precioCompra: type === 'compra' ? newPrice : item.precioCompra,
          precio: type === 'venta' ? newPrice : item.precio,
        };
      }
      return item;
    }));

    setEditingShirtPrice(null);
    const payload = { ...shirt };
    if (type === 'compra') payload.precioCompra = newPrice;
    if (type === 'venta') payload.precio = newPrice;

    try {
      await fetch("/api/shirts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error("Inline price save error:", error);
      fetchData();
    }
  };

  // ----------------------------------------------------
  // USER METHODS
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

  const closeUserModal = () => {
    setIsUserModalOpen(false);
  };

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
  // HELPERS & FILTERING
  // ----------------------------------------------------
  const filteredShoes = inventory.filter((item) =>
    item.nombre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.marca?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.codigo?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredShirts = shirtInventory.filter((item) =>
    item.nombre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.marca?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.codigo?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTotalShoeStock = (tallas: ShoeSize[]) => (tallas || []).reduce((sum, t) => sum + (t.stock || 0), 0);
  const getTotalShirtStock = (tallas: ShirtSize[]) => (tallas || []).reduce((sum, t) => sum + (t.stock || 0), 0);

  const totalAllShoesUnits = inventory.reduce((acc, s) => acc + getTotalShoeStock(s.tallas), 0);
  const totalAllShirtsUnits = shirtInventory.reduce((acc, s) => acc + getTotalShirtStock(s.tallas), 0);

  const fixUrl = (url: string) => url ? url.replace(/^http:\/\//, 'https://') : url;

  const getStockBadge = (stock: number) => {
    if (stock === 0) return <span className={`${styles.badge} ${styles.badgeDanger}`}>Agotado</span>;
    if (stock < 10) return <span className={`${styles.badge} ${styles.badgeWarning}`}>Stock Bajo</span>;
    return <span className={`${styles.badge} ${styles.badgeSuccess}`}>Disponible</span>;
  };

  if (!isClient) return null;

  return (
    <div className={styles.adminContainer}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className={styles.mobileOverlay} onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logoText}>
            <span className={styles.logoName}>Sabattus</span>
            <span className={styles.logoTagline}>Luce y viste bien</span>
          </div>
          <button className={styles.closeSidebarBtn} onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className={styles.nav}>
          {/* Section: Inventario */}
          <div>
            <button
              className={`${styles.navItem} ${(activeTab === "shoes" || activeTab === "shirts") ? styles.active : ""}`}
              onClick={() => {
                setInventorySubmenuOpen(prev => !prev);
                if (activeTab !== "shoes" && activeTab !== "shirts") {
                  setActiveTab("shoes");
                }
              }}
            >
              <LayoutDashboard size={20} />
              <span>Inventario</span>
              <ChevronDown 
                size={16} 
                className={`${styles.chevron} ${inventorySubmenuOpen ? styles.rotate : ""}`} 
              />
            </button>

            {inventorySubmenuOpen && (
              <div className={styles.navSubMenu}>
                <button
                  className={`${styles.navSubItem} ${activeTab === "shoes" ? styles.activeSub : ""}`}
                  onClick={() => { setActiveTab("shoes"); setSidebarOpen(false); }}
                >
                  <SportShoe size={18} />
                  <span>Tenis</span>
                  <span className={styles.badgeCount}>{inventory.length}</span>
                </button>
                <button
                  className={`${styles.navSubItem} ${activeTab === "shirts" ? styles.activeSub : ""}`}
                  onClick={() => { setActiveTab("shirts"); setSidebarOpen(false); }}
                >
                  <Shirt size={18} />
                  <span>Camisas</span>
                  <span className={styles.badgeCount}>{shirtInventory.length}</span>
                </button>
              </div>
            )}
          </div>

          <button
            className={`${styles.navItem} ${activeTab === "users" ? styles.active : ""}`}
            onClick={() => { setActiveTab("users"); setSidebarOpen(false); }}
          >
            <Users size={20} />
            <span>Usuarios</span>
            <span className={styles.badgeCount}>{users.length}</span>
          </button>

          <button
            className={`${styles.navItem} ${activeTab === "settings" ? styles.active : ""}`}
            onClick={() => { setActiveTab("settings"); setSidebarOpen(false); }}
          >
            <Settings size={20} />
            <span>Configuración</span>
          </button>

          <button className={`${styles.navItem} ${styles.logoutBtn}`} onClick={handleLogout}>
            <LogOut size={20} />
            Cerrar Sesión
          </button>
        </nav>
      </aside>

      <main className={styles.mainContent}>
        {/* Mobile top bar */}
        <div className={styles.mobileTopBar}>
          <button className={styles.hamburgerBtn} onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>
          <span className={styles.mobileBrand}>SABATTUS</span>
          <button 
            className="btn btn-primary" 
            style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem' }} 
            onClick={() => activeTab === "shirts" ? openShirtModal() : openModal()}
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Category Switcher Tabs (Tenis vs Camisas) */}
        {(activeTab === "shoes" || activeTab === "shirts") && (
          <div className={styles.categoryToggle}>
            <button
              className={`${styles.categoryBtn} ${activeTab === "shoes" ? styles.categoryActive : ""}`}
              onClick={() => setActiveTab("shoes")}
            >
              <SportShoe size={18} />
              <span>Inventario Tenis</span>
              <span className={styles.categoryCount}>{inventory.length}</span>
            </button>
            <button
              className={`${styles.categoryBtn} ${activeTab === "shirts" ? styles.categoryActive : ""}`}
              onClick={() => setActiveTab("shirts")}
            >
              <Shirt size={18} />
              <span>Inventario Camisas</span>
              <span className={styles.categoryCount}>{shirtInventory.length}</span>
            </button>
          </div>
        )}

        {isLoadingData ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--text-secondary)' }}>
            <span className="animate-spin" style={{ fontSize: '2rem', marginRight: '1rem' }}>⟳</span> Cargando inventario...
          </div>
        ) : activeTab === "shoes" ? (
          /* ==================================================== */
          /* INVENTARIO TENIS                                     */
          /* ==================================================== */
          <>
            <header className={styles.header}>
              <div>
                <h1 className={styles.title}>Inventario de Tenis</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                  Catálogo y stock de calzado con tallas numéricas (34 - 45)
                </p>
              </div>
              <button className="btn btn-primary" onClick={() => openModal()}>
                <Plus size={20} />
                Añadir Calzado
              </button>
            </header>

            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <SportShoe size={24} />
                </div>
                <div className={styles.statInfo}>
                  <span className={styles.statLabel}>Total Modelos</span>
                  <span className={styles.statValue}>{inventory.length}</span>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <Package size={24} />
                </div>
                <div className={styles.statInfo}>
                  <span className={styles.statLabel}>Total Pares</span>
                  <span className={styles.statValue}>{totalAllShoesUnits}</span>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <AlertCircle size={24} color="var(--warning)" />
                </div>
                <div className={styles.statInfo}>
                  <span className={styles.statLabel}>Stock Bajo / Agotado</span>
                  <span className={styles.statValue}>
                    {inventory.filter(i => getTotalShoeStock(i.tallas) < 10).length}
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
                    placeholder="Buscar calzado (nombre, marca, código)..."
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
                    <th>Pares Totales</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShoes.map((item) => {
                    const isExpanded = expandedRows.includes(item.id);
                    const totalStock = getTotalShoeStock(item.tallas);
                    
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
                              {item.imageUrl ? (
                                <img 
                                  src={fixUrl(item.imageUrl)} 
                                  alt={item.nombre} 
                                  className={styles.shoeImage}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewImage(item.imageUrl);
                                  }}
                                  style={{ cursor: 'pointer' }}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove(styles.hiddenPlaceholder);
                                  }}
                                />
                              ) : null}
                              <div className={`${styles.shoeImagePlaceholder} ${item.imageUrl ? styles.hiddenPlaceholder : ''}`}>
                                👟
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 'bold', fontSize: '1.05rem' }}>{item.marca} {item.nombre}</span>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{item.codigo}</span>
                              </div>
                            </div>
                          </td>
                          <td>{item.color}</td>
                          <td 
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              setTempPriceVal(item.precioCompra);
                              setEditingPrice({ shoeId: item.id, type: 'compra' });
                            }}
                            style={{ cursor: 'text' }}
                            title="Doble clic para editar"
                          >
                            {editingPrice?.shoeId === item.id && editingPrice?.type === 'compra' ? (
                              <input 
                                type="number" 
                                className={styles.stockInput}
                                style={{ width: '60px' }}
                                value={tempPriceVal}
                                autoFocus
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => setTempPriceVal(Number(e.target.value))}
                                onBlur={() => saveInlinePrice(item, 'compra')}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveInlinePrice(item, 'compra');
                                  if (e.key === 'Escape') setEditingPrice(null);
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              `$${item.precioCompra}`
                            )}
                          </td>
                          <td
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              setTempPriceVal(item.precio);
                              setEditingPrice({ shoeId: item.id, type: 'venta' });
                            }}
                            style={{ cursor: 'text' }}
                            title="Doble clic para editar"
                          >
                            {editingPrice?.shoeId === item.id && editingPrice?.type === 'venta' ? (
                              <input 
                                type="number" 
                                className={styles.stockInput}
                                style={{ width: '60px' }}
                                value={tempPriceVal}
                                autoFocus
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => setTempPriceVal(Number(e.target.value))}
                                onBlur={() => saveInlinePrice(item, 'venta')}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveInlinePrice(item, 'venta');
                                  if (e.key === 'Escape') setEditingPrice(null);
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              `$${item.precio}`
                            )}
                          </td>
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
                                <h4>Tallas Disponibles (Pares)</h4>
                                <div className={styles.sizesGrid}>
                                  {item.tallas.length > 0 ? (
                                    item.tallas.map((t, idx) => {
                                      const isEditingThis = editingStockId?.shoeId === item.id && editingStockId?.sizeIdx === idx;
                                      
                                      return (
                                      <div key={idx} className={styles.sizeCard}>
                                        <span className={styles.sizeNumber}>{t.talla}</span>
                                        <div className={styles.sizeDivider} />
                                        {isEditingThis ? (
                                          <input 
                                            type="number" 
                                            className={styles.stockInput}
                                            value={tempStockVal}
                                            autoFocus
                                            onFocus={(e) => e.target.select()}
                                            onChange={(e) => setTempStockVal(Number(e.target.value))}
                                            onBlur={() => saveInlineStock(item, idx)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') saveInlineStock(item, idx);
                                              if (e.key === 'Escape') setEditingStockId(null);
                                            }}
                                          />
                                        ) : (
                                          <span
                                            className={`${styles.sizeStockBadge} ${t.stock === 0 ? styles.noStock : t.stock < 3 ? styles.lowStock : styles.inStock}`}
                                            onDoubleClick={(e) => {
                                              e.stopPropagation();
                                              setTempStockVal(t.stock);
                                              setEditingStockId({ shoeId: item.id, sizeIdx: idx });
                                            }}
                                            title="Doble clic para editar"
                                          >
                                            {t.stock}
                                          </span>
                                        )}
                                        <span className={styles.sizeStockLabel}>{t.stock === 1 ? 'par' : 'pares'}</span>
                                        <div className={styles.sizeStockContainer}>
                                          <button 
                                            className={styles.stockBtn} 
                                            onClick={(e) => { e.stopPropagation(); handleQuickStockChange(item, idx, -1); }}
                                          >-</button>
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
                  {filteredShoes.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", padding: "3rem" }}>
                        No se encontraron resultados en calzado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : activeTab === "shirts" ? (
          /* ==================================================== */
          /* INVENTARIO CAMISAS                                   */
          /* ==================================================== */
          <>
            <header className={styles.header}>
              <div>
                <h1 className={styles.title}>Inventario de Camisas</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                  Catálogo y stock de camisas con tallas (S, M, L, XL y tallas personalizadas)
                </p>
              </div>
              <button className="btn btn-primary" onClick={() => openShirtModal()}>
                <Plus size={20} />
                Añadir Camisa
              </button>
            </header>

            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <Shirt size={24} />
                </div>
                <div className={styles.statInfo}>
                  <span className={styles.statLabel}>Total Modelos</span>
                  <span className={styles.statValue}>{shirtInventory.length}</span>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <Package size={24} />
                </div>
                <div className={styles.statInfo}>
                  <span className={styles.statLabel}>Total Unidades</span>
                  <span className={styles.statValue}>{totalAllShirtsUnits}</span>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <AlertCircle size={24} color="var(--warning)" />
                </div>
                <div className={styles.statInfo}>
                  <span className={styles.statLabel}>Stock Bajo / Agotado</span>
                  <span className={styles.statValue}>
                    {shirtInventory.filter(i => getTotalShirtStock(i.tallas) < 10).length}
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
                    placeholder="Buscar camisas (nombre, marca, código)..."
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
                    <th>Unidades Totales</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShirts.map((item) => {
                    const isExpanded = expandedShirtRows.includes(item.id);
                    const totalStock = getTotalShirtStock(item.tallas);
                    
                    return (
                      <React.Fragment key={item.id}>
                        <tr className={styles.mainRow} onClick={() => toggleShirtRow(item.id)}>
                          <td>
                            <ChevronDown 
                              size={18} 
                              className={`${styles.expandIcon} ${isExpanded ? styles.open : ""}`} 
                            />
                          </td>
                          <td>
                            <div className={styles.productCell}>
                              {item.imageUrl ? (
                                <img 
                                  src={fixUrl(item.imageUrl)} 
                                  alt={item.nombre} 
                                  className={styles.shoeImage}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewImage(item.imageUrl);
                                  }}
                                  style={{ cursor: 'pointer' }}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove(styles.hiddenPlaceholder);
                                  }}
                                />
                              ) : null}
                              <div className={`${styles.shoeImagePlaceholder} ${item.imageUrl ? styles.hiddenPlaceholder : ''}`}>
                                👕
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 'bold', fontSize: '1.05rem' }}>{item.marca} {item.nombre}</span>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{item.codigo}</span>
                              </div>
                            </div>
                          </td>
                          <td>{item.color}</td>
                          <td 
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              setTempShirtPriceVal(item.precioCompra);
                              setEditingShirtPrice({ shirtId: item.id, type: 'compra' });
                            }}
                            style={{ cursor: 'text' }}
                            title="Doble clic para editar"
                          >
                            {editingShirtPrice?.shirtId === item.id && editingShirtPrice?.type === 'compra' ? (
                              <input 
                                type="number" 
                                className={styles.stockInput}
                                style={{ width: '60px' }}
                                value={tempShirtPriceVal}
                                autoFocus
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => setTempShirtPriceVal(Number(e.target.value))}
                                onBlur={() => saveInlineShirtPrice(item, 'compra')}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveInlineShirtPrice(item, 'compra');
                                  if (e.key === 'Escape') setEditingShirtPrice(null);
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              `$${item.precioCompra}`
                            )}
                          </td>
                          <td
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              setTempShirtPriceVal(item.precio);
                              setEditingShirtPrice({ shirtId: item.id, type: 'venta' });
                            }}
                            style={{ cursor: 'text' }}
                            title="Doble clic para editar"
                          >
                            {editingShirtPrice?.shirtId === item.id && editingShirtPrice?.type === 'venta' ? (
                              <input 
                                type="number" 
                                className={styles.stockInput}
                                style={{ width: '60px' }}
                                value={tempShirtPriceVal}
                                autoFocus
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => setTempShirtPriceVal(Number(e.target.value))}
                                onBlur={() => saveInlineShirtPrice(item, 'venta')}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveInlineShirtPrice(item, 'venta');
                                  if (e.key === 'Escape') setEditingShirtPrice(null);
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              `$${item.precio}`
                            )}
                          </td>
                          <td>{totalStock}</td>
                          <td>{getStockBadge(totalStock)}</td>
                          <td>
                            <div className={styles.actionCell}>
                              <button 
                                className={styles.actionBtn} 
                                title="Editar" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openShirtModal(item);
                                }}
                              >
                                <Edit2 size={16} />
                              </button>
                              <button 
                                className={styles.actionBtn} 
                                title="Eliminar" 
                                onClick={(e) => handleDeleteShirt(item.id, e)}
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
                                <h4>Tallas Disponibles (Unidades)</h4>
                                <div className={styles.sizesGrid}>
                                  {item.tallas?.length > 0 ? (
                                    item.tallas.map((t, idx) => {
                                      const isEditingThis = editingShirtStockId?.shirtId === item.id && editingShirtStockId?.sizeIdx === idx;
                                      
                                      return (
                                      <div key={idx} className={styles.sizeCard}>
                                        <span className={styles.sizeNumber}>{t.talla}</span>
                                        <div className={styles.sizeDivider} />
                                        {isEditingThis ? (
                                          <input 
                                            type="number" 
                                            className={styles.stockInput}
                                            value={tempShirtStockVal}
                                            autoFocus
                                            onFocus={(e) => e.target.select()}
                                            onChange={(e) => setTempShirtStockVal(Number(e.target.value))}
                                            onBlur={() => saveInlineShirtStock(item, idx)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') saveInlineShirtStock(item, idx);
                                              if (e.key === 'Escape') setEditingShirtStockId(null);
                                            }}
                                          />
                                        ) : (
                                          <span
                                            className={`${styles.sizeStockBadge} ${t.stock === 0 ? styles.noStock : t.stock < 3 ? styles.lowStock : styles.inStock}`}
                                            onDoubleClick={(e) => {
                                              e.stopPropagation();
                                              setTempShirtStockVal(t.stock);
                                              setEditingShirtStockId({ shirtId: item.id, sizeIdx: idx });
                                            }}
                                            title="Doble clic para editar"
                                          >
                                            {t.stock}
                                          </span>
                                        )}
                                        <span className={styles.sizeStockLabel}>{t.stock === 1 ? 'unidad' : 'unidades'}</span>
                                        <div className={styles.sizeStockContainer}>
                                          <button 
                                            className={styles.stockBtn} 
                                            onClick={(e) => { e.stopPropagation(); handleQuickShirtStockChange(item, idx, -1); }}
                                          >-</button>
                                          <button 
                                            className={styles.stockBtn} 
                                            onClick={(e) => { e.stopPropagation(); handleQuickShirtStockChange(item, idx, 1); }}
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
                  {filteredShirts.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", padding: "3rem" }}>
                        No se encontraron resultados en camisas
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : activeTab === "users" ? (
          /* ==================================================== */
          /* USUARIOS                                             */
          /* ==================================================== */
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
        ) : activeTab === "settings" ? (
          /* ==================================================== */
          /* CONFIGURACIÓN                                        */
          /* ==================================================== */
          <div style={{ maxWidth: '600px' }}>
            <header className={styles.header}>
              <h1 className={styles.title}>Configuración</h1>
            </header>
            <div className={styles.statCard} style={{ marginTop: '2rem', flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Sistema Sabattus</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Conexión sincronizada con Google Sheets. Los cambios realizados se reflejan de inmediato en la hoja de cálculo y en la tienda.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span className={`${styles.badge} ${styles.badgeSuccess}`}>Google Sheets API Activo</span>
                <span className={`${styles.badge} ${styles.badgeSuccess}`}>ImgBB Cloud Activo</span>
                <span className={`${styles.badge} ${styles.badgeSuccess}`}>Vercel Production</span>
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {/* ==================================================== */}
      {/* MODAL CALZADO (TENIS)                                */}
      {/* ==================================================== */}
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
                  <label className={styles.label}>Imagen del Calzado</label>
                  
                  {formData.imageUrl ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem', padding: '0.75rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                      <img 
                        src={fixUrl(formData.imageUrl)} 
                        alt="Preview" 
                        style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--success)' }}>✓ Imagen lista</span>
                        <button 
                          type="button" 
                          onClick={() => setFormData(prev => ({ ...prev, imageUrl: "" }))}
                          style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.75rem', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                        >
                          Quitar foto
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <input 
                      type="file" 
                      accept="image/*"
                      className="input" 
                      disabled={isUploadingImage}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setIsUploadingImage(true);
                          try {
                            const url = await processAndUploadFile(file);
                            setFormData(prev => ({ ...prev, imageUrl: url }));
                          } catch (error) {
                            console.error("Error procesando imagen:", error);
                            alert("Error al procesar la imagen. Intenta de nuevo.");
                          } finally {
                            setIsUploadingImage(false);
                          }
                        }
                      }}
                    />

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>O URL directa:</span>
                      <input 
                        type="url" 
                        className="input"
                        placeholder="https://ejemplo.com/foto.jpg"
                        value={formData.imageUrl.startsWith("data:") ? "" : formData.imageUrl}
                        onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                        style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                      />
                    </div>
                  </div>

                  {isUploadingImage && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--primary)', marginTop: '0.5rem' }}>
                      <span className="animate-spin">⟳</span> Procesando imagen, por favor espera...
                    </p>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Código del Calzado *</label>
                  <input 
                    type="text" 
                    className="input" 
                    required
                    placeholder="Ej. JOR-R4-NG"
                    value={formData.codigo}
                    onChange={(e) => setFormData({...formData, codigo: e.target.value.toUpperCase()})}
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Marca *</label>
                    <input 
                      type="text" 
                      className="input" 
                      required
                      list="marcas-tenis-list"
                      placeholder="Ej. Jordan"
                      value={formData.marca}
                      onChange={(e) => setFormData({...formData, marca: e.target.value})}
                    />
                    <datalist id="marcas-tenis-list">
                      <option value="Nike" />
                      <option value="Adidas" />
                      <option value="New Balance" />
                      <option value="Jordan" />
                      <option value="Timberland" />
                      <option value="On Cloud" />
                      <option value="Hoka" />
                      <option value="Puma" />
                      <option value="Reebok" />
                      <option value="Asics" />
                    </datalist>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Nombre Modelo *</label>
                    <input 
                      type="text" 
                      className="input" 
                      required
                      placeholder="Ej. Retro 4 Negro"
                      value={formData.nombre}
                      onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Color</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="Opcional"
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
                      onFocus={(e) => e.target.select()}
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
                      onFocus={(e) => e.target.select()}
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
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setFormData({...formData, precio: Number(e.target.value)})}
                    />
                  </div>
                </div>

                {/* Tallas y Stock Tenis */}
                <div className={styles.sizesFormContainer}>
                  <div className={styles.sizesHeader}>
                    <h4>Inventario por Tallas Numéricas</h4>
                  </div>
                  
                  {formData.tallas.map((t, idx) => (
                    <div key={idx} className={styles.sizeInputRow}>
                      <div className={styles.formGroup} style={{ flex: 1 }}>
                        <label className={styles.label} style={{ fontSize: '0.75rem' }}>Talla</label>
                        <select 
                          className="input"
                          value={t.talla}
                          onChange={(e) => handleSizeChange(idx, "talla", parseInt(e.target.value))}
                        >
                          {[34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45].map(sz => (
                            <option key={sz} value={sz}>{sz}</option>
                          ))}
                        </select>
                      </div>
                      <div className={styles.formGroup} style={{ flex: 1 }}>
                        <label className={styles.label} style={{ fontSize: '0.75rem' }}>Stock (Pares)</label>
                        <input 
                          type="number" 
                          className="input" 
                          min="0"
                          value={t.stock === 0 ? "" : t.stock}
                          placeholder="0"
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

      {/* ==================================================== */}
      {/* MODAL CAMISAS                                        */}
      {/* ==================================================== */}
      {isShirtModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalContent} animate-fade-in`}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{editingShirtId ? "Editar Camisa" : "Añadir Nueva Camisa"}</h2>
              <button className={styles.closeBtn} onClick={closeShirtModal} disabled={isSavingShirt}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveShirt}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Imagen de la Camisa</label>
                  
                  {shirtFormData.imageUrl ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem', padding: '0.75rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                      <img 
                        src={fixUrl(shirtFormData.imageUrl)} 
                        alt="Preview" 
                        style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--success)' }}>✓ Imagen lista</span>
                        <button 
                          type="button" 
                          onClick={() => setShirtFormData(prev => ({ ...prev, imageUrl: "" }))}
                          style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.75rem', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                        >
                          Quitar foto
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <input 
                      type="file" 
                      accept="image/*"
                      className="input" 
                      disabled={isUploadingShirtImage}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setIsUploadingShirtImage(true);
                          try {
                            const url = await processAndUploadFile(file);
                            setShirtFormData(prev => ({ ...prev, imageUrl: url }));
                          } catch (error) {
                            console.error("Error procesando imagen:", error);
                            alert("Error al procesar la imagen. Intenta de nuevo.");
                          } finally {
                            setIsUploadingShirtImage(false);
                          }
                        }
                      }}
                    />

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>O URL directa:</span>
                      <input 
                        type="url" 
                        className="input"
                        placeholder="https://ejemplo.com/foto.jpg"
                        value={shirtFormData.imageUrl.startsWith("data:") ? "" : shirtFormData.imageUrl}
                        onChange={(e) => setShirtFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                        style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                      />
                    </div>
                  </div>

                  {isUploadingShirtImage && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--primary)', marginTop: '0.5rem' }}>
                      <span className="animate-spin">⟳</span> Procesando imagen, por favor espera...
                    </p>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Código de la Camisa *</label>
                  <input 
                    type="text" 
                    className="input" 
                    required
                    placeholder="Ej. CAM-POLO-01"
                    value={shirtFormData.codigo}
                    onChange={(e) => setShirtFormData({...shirtFormData, codigo: e.target.value.toUpperCase()})}
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Marca *</label>
                    <input 
                      type="text" 
                      className="input" 
                      required
                      list="marcas-camisas-list"
                      placeholder="Ej. Sabattus"
                      value={shirtFormData.marca}
                      onChange={(e) => setShirtFormData({...shirtFormData, marca: e.target.value})}
                    />
                    <datalist id="marcas-camisas-list">
                      <option value="Sabattus" />
                      <option value="Nike" />
                      <option value="Adidas" />
                      <option value="Tommy Hilfiger" />
                      <option value="Ralph Lauren" />
                      <option value="Calvin Klein" />
                      <option value="Lacoste" />
                      <option value="Zara" />
                      <option value="Polo" />
                      <option value="Levi's" />
                    </datalist>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Nombre Modelo *</label>
                    <input 
                      type="text" 
                      className="input" 
                      required
                      placeholder="Ej. Polo Pique Slim Fit"
                      value={shirtFormData.nombre}
                      onChange={(e) => setShirtFormData({...shirtFormData, nombre: e.target.value})}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Color</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="Ej. Negro, Blanco, Azul..."
                    value={shirtFormData.color}
                    onChange={(e) => setShirtFormData({...shirtFormData, color: e.target.value})}
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
                      value={shirtFormData.precioCompra}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setShirtFormData({...shirtFormData, precioCompra: Number(e.target.value)})}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Precio Revendedor ($)</label>
                    <input 
                      type="number" 
                      className="input" 
                      min="0"
                      step="0.01"
                      value={shirtFormData.precioRevendedor}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setShirtFormData({...shirtFormData, precioRevendedor: Number(e.target.value)})}
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
                      value={shirtFormData.precio}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setShirtFormData({...shirtFormData, precio: Number(e.target.value)})}
                    />
                  </div>
                </div>

                {/* Tallas y Stock Camisas (S a XL por defecto + opción de añadir más) */}
                <div className={styles.sizesFormContainer}>
                  <div className={styles.sizesHeader}>
                    <h4>Inventario por Tallas (S - XL por defecto)</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Personaliza o agrega más tallas (XS, XXL, 3XL, etc.) según desees.
                    </p>
                  </div>
                  
                  {shirtFormData.tallas.map((t, idx) => (
                    <div key={idx} className={styles.sizeInputRow}>
                      <div className={styles.formGroup} style={{ flex: 1 }}>
                        <label className={styles.label} style={{ fontSize: '0.75rem' }}>Talla</label>
                        <input
                          type="text"
                          className="input"
                          placeholder="Ej. S, M, L, XL, XXL..."
                          value={t.talla}
                          onChange={(e) => handleShirtSizeChange(idx, "talla", e.target.value.toUpperCase())}
                          list={`shirt-sizes-${idx}`}
                          required
                        />
                        <datalist id={`shirt-sizes-${idx}`}>
                          <option value="XS" />
                          <option value="S" />
                          <option value="M" />
                          <option value="L" />
                          <option value="XL" />
                          <option value="XXL" />
                          <option value="3XL" />
                          <option value="4XL" />
                          <option value="28" />
                          <option value="30" />
                          <option value="32" />
                          <option value="ÚNICA" />
                        </datalist>
                      </div>
                      <div className={styles.formGroup} style={{ flex: 1 }}>
                        <label className={styles.label} style={{ fontSize: '0.75rem' }}>Stock (Unidades)</label>
                        <input 
                          type="number" 
                          className="input" 
                          min="0"
                          value={t.stock === 0 ? "" : t.stock}
                          placeholder="0"
                          onChange={(e) => handleShirtSizeChange(idx, 'stock', Number(e.target.value))}
                        />
                      </div>
                      <button 
                        type="button" 
                        className={styles.removeSizeBtn} 
                        onClick={() => handleRemoveShirtSize(idx)}
                        style={{ marginTop: '1.25rem' }}
                        title="Eliminar talla"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                  
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    <button type="button" className={styles.addSizeBtn} onClick={() => handleAddShirtSize("XXL")}>
                      <Plus size={16} /> Añadir otra talla
                    </button>
                  </div>

                  {/* Acceso rápido a tallas extras comunes */}
                  <div className={styles.quickSizesBar}>
                    <span className={styles.quickSizeLabel}>+ Añadir talla rápida:</span>
                    {["XS", "XXL", "3XL", "4XL", "ÚNICA"].map((extra) => (
                      <button
                        key={extra}
                        type="button"
                        className={styles.quickSizePill}
                        onClick={() => handleAddShirtSize(extra)}
                      >
                        + {extra}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              <div className={styles.modalFooter}>
                <button type="button" className="btn btn-secondary" onClick={closeShirtModal} disabled={isSavingShirt}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSavingShirt}>
                  {isSavingShirt ? "Guardando..." : (editingShirtId ? "Guardar Cambios" : "Añadir Camisa")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL USUARIO                                        */}
      {/* ==================================================== */}
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
                    <option value="Usuario">Usuario (Solo ver catálogo)</option>
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

      {/* Lightbox Modal */}
      {previewImage && (
        <div className={styles.lightboxOverlay} onClick={() => setPreviewImage(null)}>
          <button className={styles.lightboxClose} onClick={() => setPreviewImage(null)}>
            <X size={28} />
          </button>
          <img 
            src={fixUrl(previewImage)} 
            alt="Preview" 
            className={styles.lightboxImg}
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}
    </div>
  );
}
