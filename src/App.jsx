import { useState, useEffect, useCallback } from 'react';
import { initializeDB, companyInfo } from './mockData';
import Login from './components/Login';
import DashboardLayout from './components/DashboardLayout';
import Dashboard from './components/Dashboard';
import ProductManage from './components/ProductManage';
import BrandManage from './components/BrandManage';
import CategoryManage from './components/CategoryManage';
import Report from './components/Report';
import UserManage from './components/UserManage';
import ActivityLogView from './components/ActivityLogView';
import StockManage from './components/StockManage';
import QuotationManage from './components/QuotationManage';

// Initialize database at module load time to guarantee localStorage is populated
const freshUsers = initializeDB();

export default function App() {
  // Sessions and Authentication State
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('pim_current_user');
      if (!saved) return null;
      const parsedCurrentUser = JSON.parse(saved);
      if (parsedCurrentUser.username === 'admin' || parsedCurrentUser.username === 'manager') {
        const restoredUser = freshUsers.find(u => u.username === parsedCurrentUser.username);
        if (restoredUser) {
          sessionStorage.setItem('pim_current_user', JSON.stringify(restoredUser));
          return restoredUser;
        }
      }
      return parsedCurrentUser;
    } catch {
      return null;
    }
  });

  // DB States
  const [products, setProducts] = useState(() => {
    try {
      const saved = localStorage.getItem('pim_products');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [brands, setBrands] = useState(() => {
    try {
      const saved = localStorage.getItem('pim_brands');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [categories, setCategories] = useState(() => {
    try {
      const saved = localStorage.getItem('pim_categories');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [users, setUsers] = useState(freshUsers);

  // Activity Log State
  const [activityLog, setActivityLog] = useState(() => {
    try {
      const saved = localStorage.getItem('pim_activity_log');
      return saved ? JSON.parse(saved) : [];
    } catch {
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

  // Quotation state
  const [quotations, setQuotations] = useState(() => {
    try {
      const saved = localStorage.getItem('pim_quotations');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const syncQuotations = (newQuotations) => {
    setQuotations(newQuotations);
    localStorage.setItem('pim_quotations', JSON.stringify(newQuotations));
  };

  const handleSaveQuotation = (data) => {
    const exists = quotations.find(q => q.id === data.id);
    const updated = exists
      ? quotations.map(q => q.id === data.id ? data : q)
      : [data, ...quotations];
    syncQuotations(updated);
    addActivityLog(
      `${exists ? 'แก้ไข' : 'สร้าง'}ใบเสนอราคา: ${data.quotationNumber} ลูกค้า ${data.customer?.name || '-'}`,
      { type: 'ใบเสนอราคา', changes: [{ field: 'มูลค่า', before: '-', after: `${data.totalAmount?.toLocaleString() || 0} บาท` }] }
    );
  };

  const handleDeleteQuotation = (id) => {
    const target = quotations.find(q => q.id === id);
    const updated = quotations.filter(q => q.id !== id);
    syncQuotations(updated);
    if (target) addActivityLog(`ลบใบเสนอราคา: ${target.quotationNumber}`, { type: 'ลบ', changes: [] });
  };

  // Listen for import complete events from ImportModal
  useEffect(() => {
    const handleImportComplete = (e) => {
      const { mergedProducts, platform, newCount, stockAdjustments } = e.detail || {};
      if (mergedProducts && Array.isArray(mergedProducts)) {
        setProducts(mergedProducts);
        localStorage.setItem('pim_products', JSON.stringify(mergedProducts));

        // Log to activity log
        try {
          const savedUser = sessionStorage.getItem('pim_current_user');
          const user = savedUser ? JSON.parse(savedUser) : null;
          if (user) {
            const platformName = platform === 'shopee' ? 'Shopee' : platform === 'lazada' ? 'Lazada' : platform === 'tiktok' ? 'TikTok Shop' : 'Excel';
            const adjustCount = stockAdjustments?.length || 0;
            const logEntry = {
              id: Date.now(),
              userName: user.name || user.username || 'ไม่ระบุ',
              userRole: user.role,
              action: `นำเข้าข้อมูลจาก ${platformName}: เพิ่มใหม่ ${newCount} รายการ (ปรับปรุงสต็อก ${adjustCount} รายการ)`,
              timestamp: new Date().toISOString(),
            };
            const savedLogs = localStorage.getItem('pim_activity_log');
            const currentLogs = savedLogs ? JSON.parse(savedLogs) : [];
            const updatedLogs = [logEntry, ...currentLogs].slice(0, 200);
            localStorage.setItem('pim_activity_log', JSON.stringify(updatedLogs));
            setActivityLog(updatedLogs);
          }
        } catch {
          console.error("Error writing activity log for import");
        }
      }
    };
    window.addEventListener('pim_import_complete', handleImportComplete);
    return () => window.removeEventListener('pim_import_complete', handleImportComplete);
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
  const addActivityLog = useCallback((action, details = null) => {
    if (!currentUser) return;
    const entry = {
      id: Date.now(),
      userName: currentUser.name || currentUser.username || 'ไม่ระบุ',
      userRole: currentUser.role,
      action,
      details,
      timestamp: new Date().toISOString(),
    };
    setActivityLog(prev => {
      const updated = [entry, ...prev].slice(0, 200); // keep latest 200
      localStorage.setItem('pim_activity_log', JSON.stringify(updated));
      return updated;
    });
  }, [currentUser]);

  // Auth Operations
  const handleLogin = (user) => {
    setCurrentUser(user);
    sessionStorage.setItem('pim_current_user', JSON.stringify(user));
    setActiveTab('dashboard');
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
      const originalProduct = products.find(p => p.id === productData.id);
      updated = products.map(p => p.id === productData.id ? productData : p);

      const changes = [];
      if (originalProduct) {
        const fieldsToCompare = {
          code: 'รหัสสินค้า',
          barcode: 'รหัสบาร์โค้ด',
          name: 'ชื่อสินค้า',
          brand: 'แบรนด์',
          category: 'หมวดหมู่',
          wholesalePrice: 'ราคาขายส่ง',
          retailPrice: 'ราคาขายปลีก',
          capFee: 'ค่าฝา',
          size: 'ขนาด',
          weight: 'น้ำหนัก',
          fdaNumber: 'หมายเลข อย.',
          tisiNumber: 'หมายเลข มอก.',
          stock: 'จำนวนสต็อก',
          status: 'สถานะ',
          description: 'รายละเอียดสินค้า',
          highlights: 'จุดเด่นสินค้า',
          howToUse: 'วิธีใช้',
          image: 'รูปภาพสินค้า'
        };

        Object.entries(fieldsToCompare).forEach(([field, label]) => {
          const valBefore = originalProduct[field];
          const valAfter = productData[field];
          if (valBefore !== valAfter) {
            const formatVal = (v, f) => {
              if (v === undefined || v === null || v === '') return '-';
              if (f === 'wholesalePrice' || f === 'retailPrice' || f === 'capFee') return `${Number(v).toLocaleString()} บาท`;
              if (f === 'stock') return `${Number(v).toLocaleString()} ชิ้น`;
              if (f === 'status') return v === 'Active' ? 'เปิดใช้งาน' : 'ปิดใช้งาน';
              if (f === 'image') return '(รูปภาพ)';
              return String(v);
            };
            changes.push({
              field: label,
              before: formatVal(valBefore, field),
              after: formatVal(valAfter, field)
            });
          }
        });
      }
      addActivityLog(
        `แก้ไขข้อมูลสินค้า: ${productData.name} (${productData.code})`,
        changes.length > 0 ? { type: 'edit_product', changes, remark: productData.editRemark } : null
      );
    } else {
      updated = [productData, ...products];
      addActivityLog(`เพิ่มสินค้าใหม่: ${productData.name} (${productData.code})`);
    }

    // Check if productData has new brand/category and save them!
    if (productData.brand && !brands.includes(productData.brand)) {
      handleAddBrand(productData.brand);
    }
    if (productData.category && !categories.includes(productData.category)) {
      handleAddCategory(productData.category);
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
    addActivityLog(`แก้ไขแบรนด์: ${oldName} -> ${newName}`, {
      type: 'edit_brand',
      changes: [{ field: 'ชื่อแบรนด์', before: oldName, after: newName }]
    });
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
    addActivityLog(`แก้ไขหมวดหมู่: ${oldName} -> ${newName}`, {
      type: 'edit_category',
      changes: [{ field: 'ชื่อหมวดหมู่', before: oldName, after: newName }]
    });
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
    const originalUser = users.find(u => u.username === updatedUserObj.username);
    const updated = users.map(u => u.username === updatedUserObj.username ? updatedUserObj : u);

    const changes = [];
    if (originalUser) {
      if (originalUser.name !== updatedUserObj.name) {
        changes.push({ field: 'ชื่อ-นามสกุล', before: originalUser.name, after: updatedUserObj.name });
      }
      if (originalUser.role !== updatedUserObj.role) {
        const roleLabel = (r) => r === 'admin' ? 'Admin' : r === 'manager' ? 'Manager' : 'User';
        changes.push({ field: 'สิทธิ์การใช้งาน', before: roleLabel(originalUser.role), after: roleLabel(updatedUserObj.role) });
      }
      if (originalUser.password !== updatedUserObj.password) {
        changes.push({ field: 'รหัสผ่าน', before: '********', after: '******** (มีการเปลี่ยนแปลง)' });
      }
    }

    syncUsers(updated);
    addActivityLog(
      `แก้ไขข้อมูลผู้ใช้งาน: ${updatedUserObj.name || updatedUserObj.username} (บทบาท: ${updatedUserObj.role})`,
      changes.length > 0 ? { type: 'edit_user', changes } : null
    );

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
            stockFilter={stockFilter}
            setStockFilter={setStockFilter}
            onAddCategory={handleAddCategory}
            onAddBrand={handleAddBrand}
            onUpdateStock={(productId, newStock, entry) => {
              const updated = products.map(p =>
                p.id === productId ? { ...p, stock: newStock } : p
              );
              syncProducts(updated);
              addActivityLog(
                `ปรับสต็อกสินค้า: ${entry.productName} (${entry.productCode}) ${entry.type === 'in' ? '+' : '-'}${entry.qty} ชิ้น (${entry.reason})`,
                { type: 'stock_adjust', changes: [{ field: 'สต็อก', before: `${entry.stockBefore} ชิ้น`, after: `${entry.stockAfter} ชิ้น` }] }
              );
            }}
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
      case 'stock-manage':
        return (
          <StockManage
            products={products}
            onUpdateStock={(productId, newStock, entry) => {
              const updated = products.map(p =>
                p.id === productId ? { ...p, stock: newStock } : p
              );
              syncProducts(updated);
              addActivityLog(
                `ปรับสต็อกสินค้า: ${entry.productName} (${entry.productCode}) ${entry.type === 'in' ? '+' : '-'}${entry.qty} ชิ้น (${entry.reason})`,
                { type: 'stock_adjust', changes: [{ field: 'สต็อก', before: `${entry.stockBefore} ชิ้น`, after: `${entry.stockAfter} ชิ้น` }] }
              );
            }}
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
      case 'quotations':
        return (
          <QuotationManage
            quotations={quotations}
            products={products}
            companyInfo={companyInfo}
            currentUser={currentUser}
            onSaveQuotation={handleSaveQuotation}
            onDeleteQuotation={handleDeleteQuotation}
          />
        );

      default:
        return <div className="p-8 text-center">หน้านี้อยู่ระหว่างการพัฒนา...</div>;
    }
  };

  // Authenticated Screen vs Guest Login
  if (!currentUser) {
    return <Login onLogin={handleLogin} users={users} />;
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
