import React, { useState, useEffect } from 'react';
import { initializeDB, initialProducts, initialBrands, initialCategories, initialUsers } from './mockData';
import Login from './components/Login';
import DashboardLayout from './components/DashboardLayout';
import Dashboard from './components/Dashboard';
import ProductList from './components/ProductList';
import ProductManage from './components/ProductManage';
import BrandManage from './components/BrandManage';
import CategoryManage from './components/CategoryManage';
import Report from './components/Report';
import UserManage from './components/UserManage';
import StatusSettings from './components/StatusSettings';
import ActivityLogView from './components/ActivityLogView';

export default function App() {
  // Sessions and Authentication State
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('pim_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Error parsing current user:", e);
      return null;
    }
  });

  // DB States
  const [products, setProducts] = useState(() => {
    try {
      const saved = localStorage.getItem('pim_products');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [brands, setBrands] = useState(() => {
    try {
      const saved = localStorage.getItem('pim_brands');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [categories, setCategories] = useState(() => {
    try {
      const saved = localStorage.getItem('pim_categories');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [users, setUsers] = useState(() => {
    try {
      const saved = localStorage.getItem('pim_users');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Activity Log State
  const [activityLog, setActivityLog] = useState(() => {
    try {
      const saved = localStorage.getItem('pim_activity_log');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Active view tab state
  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem('pim_active_tab');
    return saved || 'dashboard';
  });

  // Active stock level filter state (shared between Dashboard and ProductList)
  const [stockFilter, setStockFilter] = useState('All');
  
  // Product being edited (null for new product)
  const [editProduct, setEditProduct] = useState(null);

  // Initialize mock DB on load
  useEffect(() => {
    const freshUsers = initializeDB();

    try {
      const savedProducts = localStorage.getItem('pim_products');
      if (savedProducts) setProducts(JSON.parse(savedProducts));

      const savedBrands = localStorage.getItem('pim_brands');
      if (savedBrands) setBrands(JSON.parse(savedBrands));

      const savedCategories = localStorage.getItem('pim_categories');
      if (savedCategories) setCategories(JSON.parse(savedCategories));

      if (freshUsers) {
        setUsers(freshUsers);

        // Reload currentUser session in case it needs sync
        const savedCurrentUser = sessionStorage.getItem('pim_current_user');
        if (savedCurrentUser) {
          const parsedCurrentUser = JSON.parse(savedCurrentUser);
          if (parsedCurrentUser.username === 'admin' || parsedCurrentUser.username === 'manager') {
            const restoredUser = freshUsers.find(u => u.username === parsedCurrentUser.username);
            if (restoredUser) {
              setCurrentUser(restoredUser);
              sessionStorage.setItem('pim_current_user', JSON.stringify(restoredUser));
            }
          }
        }
      }
    } catch (e) {
      console.error("Error loading database states inside useEffect:", e);
    }
  }, []);



  // Sync active view tab to local storage
  useEffect(() => {
    localStorage.setItem('pim_active_tab', activeTab);
  }, [activeTab]);

  // Handle tab transition and reset edit state if switching to creation
  const handleTabChange = (tab) => {
    if (tab === 'manage-products') {
      setEditProduct(null);
    }
    if (tab === 'products') {
      setStockFilter('All');
    }
    setActiveTab(tab);
  };

  // Sync states to local storage
  const syncProducts = (newProducts) => {
    setProducts(newProducts);
    localStorage.setItem('pim_products', JSON.stringify(newProducts));
  };

  const syncBrands = (newBrands) => {
    setBrands(newBrands);
    localStorage.setItem('pim_brands', JSON.stringify(newBrands));
  };

  const syncCategories = (newCategories) => {
    setCategories(newCategories);
    localStorage.setItem('pim_categories', JSON.stringify(newCategories));
  };

  const syncUsers = (newUsers) => {
    setUsers(newUsers);
    localStorage.setItem('pim_users', JSON.stringify(newUsers));
  };

  // Activity Log Helper
  const addActivityLog = (action) => {
    if (!currentUser) return;
    const entry = {
      id: Date.now(),
      userName: currentUser.name || currentUser.username || 'ไม่ระบุ',
      userRole: currentUser.role,
      action,
      timestamp: new Date().toISOString(),
    };
    const updated = [entry, ...activityLog].slice(0, 200); // keep latest 200
    setActivityLog(updated);
    localStorage.setItem('pim_activity_log', JSON.stringify(updated));
  };

  // Auth Operations
  const handleLogin = (user) => {
    setCurrentUser(user);
    sessionStorage.setItem('pim_current_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('pim_current_user');
    setActiveTab('dashboard');
    setEditProduct(null);
  };

  // Switch role sandbox helper
  const handleSwitchRole = (role) => {
    const matchedUser = users.find(u => u.role === role);
    if (matchedUser) {
      handleLogin(matchedUser);
    }
  };

  // Product CRUD
  const handleSaveProduct = (productData) => {
    let updated;
    const isEdit = products.some(p => p.id === productData.id);
    
    if (isEdit) {
      updated = products.map(p => p.id === productData.id ? productData : p);
      addActivityLog(`แก้ไขข้อมูลสินค้า: ${productData.name} (${productData.code})`);
    } else {
      updated = [productData, ...products];
      addActivityLog(`เพิ่มสินค้าใหม่: ${productData.name} (${productData.code})`);
    }
    
    syncProducts(updated);
    setEditProduct(null);
    
    // Redirect back to list
    setActiveTab('manage-products');
  };

  const handleDeleteProduct = (id) => {
    const target = products.find(p => p.id === id);
    const updated = products.filter(p => p.id !== id);
    syncProducts(updated);
    if (target) addActivityLog(`ลบสินค้า: ${target.name} (${target.code})`);
  };

  const handleToggleProductStatus = (productId, nextStatus) => {
    const updated = products.map(p => {
      if (p.id === productId) {
        addActivityLog(`เปลี่ยนสถานะสินค้า: ${p.name} (${p.code}) เป็น ${nextStatus}`);
        return { ...p, status: nextStatus };
      }
      return p;
    });
    syncProducts(updated);
  };

  const handleClearLogs = () => {
    if (!currentUser) return;
    const entry = {
      id: Date.now(),
      userName: currentUser.name || currentUser.username || 'ไม่ระบุ',
      userRole: currentUser.role,
      action: 'ล้างประวัติการดำเนินงานทั้งหมดในระบบ',
      timestamp: new Date().toISOString(),
    };
    const updated = [entry];
    setActivityLog(updated);
    localStorage.setItem('pim_activity_log', JSON.stringify(updated));
  };

  const handleEditProductRequest = (product) => {
    setEditProduct(product);
    setActiveTab('manage-products');
  };

  // Brand Operations
  const handleAddBrand = (newBrandName) => {
    const updated = [...brands, newBrandName];
    syncBrands(updated);
    addActivityLog(`เพิ่มแบรนด์ใหม่: ${newBrandName}`);
  };

  const handleEditBrand = (oldName, newName) => {
    const updatedBrands = brands.map(b => b === oldName ? newName : b);
    syncBrands(updatedBrands);
    const updatedProducts = products.map(p => p.brand === oldName ? { ...p, brand: newName } : p);
    syncProducts(updatedProducts);
    addActivityLog(`แก้ไขแบรนด์: ${oldName} -> ${newName}`);
  };

  const handleDeleteBrand = (brandName) => {
    const updatedBrands = brands.filter(b => b !== brandName);
    syncBrands(updatedBrands);
    const updatedProducts = products.map(p => p.brand === brandName ? { ...p, brand: '' } : p);
    syncProducts(updatedProducts);
    addActivityLog(`ลบแบรนด์: ${brandName}`);
  };

  // Category Operations
  const handleAddCategory = (newCatName) => {
    const updated = [...categories, newCatName];
    syncCategories(updated);
    addActivityLog(`เพิ่มหมวดหมู่ใหม่: ${newCatName}`);
  };

  const handleEditCategory = (oldName, newName) => {
    const updatedCategories = categories.map(c => c === oldName ? newName : c);
    syncCategories(updatedCategories);
    const updatedProducts = products.map(p => p.category === oldName ? { ...p, category: newName } : p);
    syncProducts(updatedProducts);
    addActivityLog(`แก้ไขหมวดหมู่: ${oldName} -> ${newName}`);
  };

  const handleDeleteCategory = (catName) => {
    const updatedCategories = categories.filter(c => c !== catName);
    syncCategories(updatedCategories);
    const updatedProducts = products.map(p => p.category === catName ? { ...p, category: '' } : p);
    syncProducts(updatedProducts);
    addActivityLog(`ลบหมวดหมู่: ${catName}`);
  };

  // User Registration
  const handleAddUser = (newUserObj) => {
    const updated = [...users, newUserObj];
    syncUsers(updated);
    addActivityLog(`เพิ่มผู้ใช้งานใหม่: ${newUserObj.name || newUserObj.username} (บทบาท: ${newUserObj.role})`);
  };

  const handleUpdateUser = (updatedUserObj) => {
    const updated = users.map(u => u.username === updatedUserObj.username ? updatedUserObj : u);
    syncUsers(updated);
    addActivityLog(`แก้ไขข้อมูลผู้ใช้งาน: ${updatedUserObj.name || updatedUserObj.username} (บทบาท: ${updatedUserObj.role})`);
    
    // If current logged-in user is updated, update the session
    if (currentUser && currentUser.username === updatedUserObj.username) {
      setCurrentUser(updatedUserObj);
      sessionStorage.setItem('pim_current_user', JSON.stringify(updatedUserObj));
    }
  };

  const handleDeleteUser = (usernameToDelete) => {
    const target = users.find(u => u.username === usernameToDelete);
    const updated = users.filter(u => u.username !== usernameToDelete);
    syncUsers(updated);
    if (target) {
      addActivityLog(`ลบผู้ใช้งาน: ${target.name || target.username} (บทบาท: ${target.role})`);
    }
  };

  // Render view screen based on activeTab
  const renderScreen = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            products={products} 
            brands={brands} 
            categories={categories}
            setActiveTab={handleTabChange}
            setStockFilter={setStockFilter}
            setEditProduct={handleEditProductRequest}
          />
        );
      case 'products':
        return (
          <ProductList 
            products={products}
            brands={brands}
            categories={categories}
            currentUser={currentUser}
            setActiveTab={handleTabChange}
            stockFilter={stockFilter}
            setStockFilter={setStockFilter}
          />
        );
      case 'manage-products':
        return (
          <ProductManage 
            editProduct={editProduct}
            onCancelEdit={() => {
              setEditProduct(null);
              setActiveTab('manage-products');
            }}
            onSaveProduct={handleSaveProduct}
            brands={brands}
            categories={categories}
            currentUser={currentUser}
            products={products}
            onDeleteProduct={handleDeleteProduct}
            onEditProduct={handleEditProductRequest}
          />
        );
      case 'brands':
        return (
          <BrandManage 
            brands={brands}
            products={products}
            onAddBrand={handleAddBrand}
            onEditBrand={handleEditBrand}
            onDeleteBrand={handleDeleteBrand}
            currentUser={currentUser}
          />
        );
      case 'categories':
        return (
          <CategoryManage 
            categories={categories}
            products={products}
            onAddCategory={handleAddCategory}
            onEditCategory={handleEditCategory}
            onDeleteCategory={handleDeleteCategory}
            currentUser={currentUser}
          />
        );
      case 'reports':
        return (
          <Report 
            products={products}
            brands={brands}
            categories={categories}
          />
        );
      case 'users':
        return (
          <UserManage 
            users={users}
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
            currentUser={currentUser}
          />
        );
      case 'status-settings':
        if (currentUser.role !== 'admin') {
          return <div className="p-8 text-center text-red-500 font-semibold bg-white rounded-2xl border border-[#d2d2d7]/50 shadow-xs">ขออภัย เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่เข้าถึงหน้านี้ได้</div>;
        }
        return (
          <StatusSettings 
            products={products}
            onToggleStatus={handleToggleProductStatus}
            currentUser={currentUser}
          />
        );
      case 'activity-log':
        if (currentUser.role !== 'admin') {
          return <div className="p-8 text-center text-red-500 font-semibold bg-white rounded-2xl border border-[#d2d2d7]/50 shadow-xs">ขออภัย เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่เข้าถึงหน้านี้ได้</div>;
        }
        return (
          <ActivityLogView 
            activityLog={activityLog}
            onClearLogs={handleClearLogs}
            currentUser={currentUser}
          />
        );
      default:
        return <div className="p-8 text-center">หน้านี้อยู่ระหว่างการพัฒนา...</div>;
    }
  };

  // Authenticated Screen vs Guest Login
  if (!currentUser) {
    return <Login onLogin={handleLogin} users={users.length > 0 ? users : initialUsers} />;
  }

  return (
    <DashboardLayout 
      currentUser={currentUser}
      onLogout={handleLogout}
      activeTab={activeTab}
      setActiveTab={handleTabChange}
      onSwitchRole={handleSwitchRole}
      activityLog={activityLog}
    >
      {renderScreen()}
    </DashboardLayout>
  );
}
