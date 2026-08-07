import { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeDB, companyInfo, initialProducts, initialBrands, initialCategories } from './mockData';
import Login from './components/Login';
import DashboardLayout from './components/DashboardLayout';
import Dashboard from './components/Dashboard';
import ProductManage from './components/ProductManage';
import BrandManage from './components/BrandManage';
import CategoryManage from './components/CategoryManage';
import Report from './components/Report';
import UserManage from './components/UserManage';
import ActivityLogView from './components/ActivityLogView';
import QuotationManage from './components/QuotationManage';
import PublicQuotationViewer from './components/PublicQuotationViewer';
// import UserManual from './components/UserManual';

// Initialize database at module load time to guarantee localStorage is populated
const freshUsers = initializeDB();

// Helper to migrate product brands and ensure updatedAt date is populated
const migrateProducts = (parsedProducts) => {
  const baseDate = new Date();
  let patched = false;
  const migrated = parsedProducts.map((p, i) => {
    let updatedProd = { ...p };
    
    // Brand migration
    if (p.brand === "Barber Brain (บาร์เบอร์ เบรน)") {
      updatedProd.brand = "Barber Brain";
      patched = true;
    } else if (p.brand === "L'Angel (แอลแองเจล)") {
      updatedProd.brand = "LANGEL แอลแองเจล";
      patched = true;
    } else if (p.brand === "VALENTE (วาเลนเต้)") {
      updatedProd.brand = "VALENTE";
      patched = true;
    }

    // Date migration
    if (!p.updatedAt) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() - (i % 30));
      const yyyy = d.getFullYear();
      const mm   = String(d.getMonth() + 1).padStart(2, '0');
      const dd   = String(d.getDate()).padStart(2, '0');
      updatedProd.updatedAt = `${yyyy}-${mm}-${dd}`;
      patched = true;
    }
    
    return updatedProd;
  });
  return { migrated, patched };
};

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
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      const { migrated, patched } = migrateProducts(parsed);
      if (patched) localStorage.setItem('pim_products', JSON.stringify(migrated));
      return migrated;
    } catch {
      return [];
    }
  });

  const [brands, setBrands] = useState(() => {
    try {
      const saved = localStorage.getItem('pim_brands');
      if (saved) {
        const parsed = JSON.parse(saved);
        const cleaned = parsed.filter(b => b !== "Barber Brain (บาร์เบอร์ เบรน)" && b !== "L'Angel (แอลแองเจล)" && b !== "VALENTE (วาเลนเต้)");
        if (cleaned.length !== parsed.length) {
          localStorage.setItem('pim_brands', JSON.stringify(cleaned));
        }
        return cleaned;
      }
      return [];
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
    return saved === 'settings' ? 'dashboard' : (saved || 'dashboard');
  });
  
  // Product being edited (null for new product)
  const [editProduct, setEditProduct] = useState(null);
  // const [showManual, setShowManual] = useState(false);

  // Quotation state
  const [quotations, setQuotations] = useState(() => {
    try {
      const saved = localStorage.getItem('pim_quotations');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveToServer = async (key, data) => {
    try {
      await fetch('/api/db/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, data })
      });
    } catch (err) {
      console.error(`Failed to save ${key} to server:`, err);
    }
  };

  // Load database from server on mount
  useEffect(() => {
    const loadDB = async () => {
      try {
        const res = await fetch('/api/db');
        if (res.ok) {
          const db = await res.json();
          if (db.products && Array.isArray(db.products)) {
            const { migrated, patched } = migrateProducts(db.products);
            setProducts(migrated);
            localStorage.setItem('pim_products', JSON.stringify(migrated));
            if (patched) {
              saveToServer('products', migrated);
            }
          }
          if (db.brands && Array.isArray(db.brands)) {
            setBrands(db.brands);
            localStorage.setItem('pim_brands', JSON.stringify(db.brands));
          }
          if (db.categories && Array.isArray(db.categories)) {
            setCategories(db.categories);
            localStorage.setItem('pim_categories', JSON.stringify(db.categories));
          }
          if (db.users && Array.isArray(db.users)) {
            setUsers(db.users);
            localStorage.setItem('pim_users', JSON.stringify(db.users));
          }
          if (db.quotations && Array.isArray(db.quotations)) {
            setQuotations(db.quotations);
            localStorage.setItem('pim_quotations', JSON.stringify(db.quotations));
          }
          if (db.activityLog && Array.isArray(db.activityLog)) {
            setActivityLog(db.activityLog);
            localStorage.setItem('pim_activity_log', JSON.stringify(db.activityLog));
          }
        }
      } catch (err) {
        console.error("Failed to load database from server:", err);
      }
    };
    loadDB();
  }, []);

  // Sync activityLog across browser tabs in real-time
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'pim_activity_log' && e.newValue) {
        try {
          setActivityLog(JSON.parse(e.newValue));
        } catch (err) {
          console.error("Failed to sync activity log from storage event:", err);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const syncQuotations = (newQuotations) => {
    setQuotations(newQuotations);
    localStorage.setItem('pim_quotations', JSON.stringify(newQuotations));
    saveToServer('quotations', newQuotations);
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

  const handleClearAllQuotations = () => {
    syncQuotations([]);
    addActivityLog('ลบเอกสารใบเสนอราคาและใบเสนอสินค้าทั้งหมดออกจากระบบ (Clear all quotations from PIM)');
  };

  // Listen for import complete events from ImportModal
  useEffect(() => {
    const handleImportComplete = (e) => {
      const { mergedProducts, platform, newCount, stockAdjustments } = e.detail || {};
      if (mergedProducts && Array.isArray(mergedProducts)) {
        setProducts(mergedProducts);
        localStorage.setItem('pim_products', JSON.stringify(mergedProducts));
        saveToServer('products', mergedProducts);

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
            saveToServer('activityLog', updatedLogs);
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
  const handleTabChange = useCallback((tab) => {
    if (tab === 'manage-products') {
      setEditProduct(null);
    }
    setActiveTab(tab);
  }, []);

  // Handle global arrow key navigation for switching tabs (left/right)
  useEffect(() => {
    if (!currentUser) return;

    const handleKeyDown = (e) => {
      // Ignore key events if the user is typing in form controls (inputs, textarea)
      const activeEl = document.activeElement;
      if (activeEl) {
        const tagName = activeEl.tagName.toLowerCase();
        if (tagName === 'input' || tagName === 'textarea' || activeEl.isContentEditable) {
          return;
        }
      }

      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const tabs = ['dashboard', 'manage-products', 'brands', 'categories', 'quotations', 'reports'];
        if (currentUser.role === 'admin') {
          tabs.push('users');
          tabs.push('activity-log');
        } else if (currentUser.role === 'manager') {
          tabs.push('users');
        }

        const currentIndex = tabs.indexOf(activeTab);
        if (currentIndex === -1) return;

        let nextIndex = currentIndex;
        if (e.key === 'ArrowRight') {
          nextIndex = (currentIndex + 1) % tabs.length;
        } else if (e.key === 'ArrowLeft') {
          nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        }

        handleTabChange(tabs[nextIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentUser, activeTab, handleTabChange]);

  // Sync states to local storage
  const syncProducts = (newProducts) => {
    setProducts(newProducts);
    localStorage.setItem('pim_products', JSON.stringify(newProducts));
    saveToServer('products', newProducts);
  };

  const syncBrands = (newBrands) => {
    setBrands(newBrands);
    localStorage.setItem('pim_brands', JSON.stringify(newBrands));
    saveToServer('brands', newBrands);
  };

  const syncCategories = (newCategories) => {
    setCategories(newCategories);
    localStorage.setItem('pim_categories', JSON.stringify(newCategories));
    saveToServer('categories', newCategories);
  };

  const syncUsers = (newUsers) => {
    setUsers(newUsers);
    localStorage.setItem('pim_users', JSON.stringify(newUsers));
    saveToServer('users', newUsers);
  };

  const handleImportProducts = (productsArray, platformName) => {
    let newCount = 0;
    let overwriteCount = 0;
    const adjustments = [];
    const nowStr = new Date().toISOString();
    let updatedBrands = [...brands];
    let updatedCategories = [...categories];
    let updatedProducts = [...products];

    productsArray.forEach((newP, idx) => {
      if (newP.brand && !updatedBrands.includes(newP.brand)) {
        updatedBrands.push(newP.brand);
      }
      if (newP.category && !updatedCategories.includes(newP.category)) {
        updatedCategories.push(newP.category);
      }

      const existingIdx = updatedProducts.findIndex(p => {
        const pCode = p.code ? p.code.trim().toLowerCase() : '';
        const newCode = newP.code ? newP.code.trim().toLowerCase() : '';
        const pName = p.name ? p.name.trim().toLowerCase() : '';
        const newName = newP.name ? newP.name.trim().toLowerCase() : '';

        const hasSameCode = pCode !== '' && newCode !== '' && pCode === newCode;
        const hasSameName = pName !== '' && newName !== '' && pName === newName;
        return hasSameCode || hasSameName;
      });
      const now = new Date();
      const currentFormattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      if (existingIdx !== -1) {
        const existing = updatedProducts[existingIdx];
        const oldStock = Number(existing.stock) || 0;
        const incomingStock = Number(newP.stock) || 0;
        const finalStock = oldStock + incomingStock;

        if (incomingStock > 0) {
          adjustments.push({
            id: Date.now() + Math.random(),
            productId: existing.id,
            productName: existing.name,
            productCode: existing.code,
            type: 'in',
            qty: incomingStock,
            stockBefore: oldStock,
            stockAfter: finalStock,
            reason: `นำเข้าข้อมูล (${platformName})`,
            note: `อัปเดตสต็อกเพิ่มเติมจากการนำเข้าไฟล์ Excel`,
            adjustedBy: currentUser?.name || currentUser?.username || 'ระบบนำเข้า',
            timestamp: nowStr,
          });
        }

        const mergedProduct = { ...existing };

        // 1. Stock is accumulated
        mergedProduct.stock = finalStock;

        // 2. Code update logic: if name matched but code is new, update the code!
        const incomingCode = newP.code ? newP.code.trim() : '';
        if (incomingCode && incomingCode !== existing.code) {
          mergedProduct.code = incomingCode;
        } else {
          mergedProduct.code = existing.code;
        }
        mergedProduct.id = existing.id;
        
        // 3. Metadata
        mergedProduct.createdAt = existing.createdAt || currentFormattedDate;
        mergedProduct.updatedAt = currentFormattedDate;
        mergedProduct.updatedBy = currentUser?.username || 'system';

        // Helper to check if a field is empty or placeholder
        const isFieldEmptyOrPlaceholder = (fieldName, value) => {
          if (value === undefined || value === null) return true;
          if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed === '') return true;
            if (fieldName === 'image' && trimmed.includes('images.unsplash.com/photo-1540555700478-4be289fbecef')) {
              return true;
            }
            if (fieldName === 'size' && (trimmed === 'N/A' || trimmed.toLowerCase() === 'na')) {
              return true;
            }
            if (fieldName === 'category' && trimmed === 'ไม่ระบุ') {
              return true;
            }
            if (fieldName === 'brand' && (
              trimmed === 'Phanvadee' || 
              trimmed === 'Unbranded' || 
              trimmed === 'No Brand' || 
              trimmed === 'ไม่มีแบรนด์'
            )) {
              return true;
            }
          }
          if (typeof value === 'number') {
            return value === 0 || isNaN(value);
          }
          return false;
        };

        // 4. Selective merge for other fields to prevent overwriting with blanks or default placeholders
        const fieldsToMerge = [
          'name',
          'barcode',
          'brand',
          'category',
          'wholesalePrice',
          'retailPrice',
          'capFee',
          'description',
          'highlights',
          'howToUse',
          'image',
          'size',
          'weight',
          'fdaNumber',
          'tisiNumber',
          'packageLength',
          'packageWidth',
          'packageHeight'
        ];

        fieldsToMerge.forEach(field => {
          const incomingVal = newP[field];
          const existingVal = existing[field];

          // Check if incoming value is present (not undefined, null, or empty string)
          let hasIncoming = incomingVal !== undefined && incomingVal !== null;
          if (hasIncoming && typeof incomingVal === 'string') {
            hasIncoming = incomingVal.trim() !== '';
          }
          if (hasIncoming && typeof incomingVal === 'number') {
            hasIncoming = incomingVal > 0;
          }

          if (hasIncoming) {
            // Determine if incoming value is a default placeholder
            let isIncomingPlaceholder = false;
            if (typeof incomingVal === 'string') {
              const trimmedIn = incomingVal.trim();
              if (field === 'image' && trimmedIn.includes('images.unsplash.com/photo-1540555700478-4be289fbecef')) {
                isIncomingPlaceholder = true;
              }
              if (field === 'size' && (trimmedIn === 'N/A' || trimmedIn.toLowerCase() === 'na')) {
                isIncomingPlaceholder = true;
              }
              if (field === 'category' && trimmedIn === 'ไม่ระบุ') {
                isIncomingPlaceholder = true;
              }
              if (field === 'brand' && (
                trimmedIn === 'Phanvadee' || 
                trimmedIn === 'Unbranded' || 
                trimmedIn === 'No Brand' || 
                trimmedIn === 'ไม่มีแบรนด์'
              )) {
                isIncomingPlaceholder = true;
              }
            }

            const existingIsEmpty = isFieldEmptyOrPlaceholder(field, existingVal);
            const existingIsCompletelyEmpty = existingVal === undefined || existingVal === null || (typeof existingVal === 'string' && existingVal.trim() === '') || (typeof existingVal === 'number' && (existingVal === 0 || isNaN(existingVal)));

            // Only overwrite if existing field is empty or is a placeholder, and incoming is either not a placeholder or existing is completely empty
            if (existingIsEmpty) {
              if (!isIncomingPlaceholder || existingIsCompletelyEmpty) {
                mergedProduct[field] = typeof incomingVal === 'string' ? incomingVal.trim() : incomingVal;
              }
            }
          }
        });

        updatedProducts[existingIdx] = mergedProduct;
        overwriteCount++;
      } else {
        const newProduct = {
          ...newP,
          id: (Date.now() + idx).toString(),
          createdAt: currentFormattedDate,
          updatedAt: currentFormattedDate,
          updatedBy: currentUser?.username || 'system'
        };
        updatedProducts.push(newProduct);
        newCount++;

        const newStock = Number(newProduct.stock) || 0;
        if (newStock > 0) {
          adjustments.push({
            id: Date.now() + Math.random(),
            productId: newProduct.id,
            productName: newProduct.name,
            productCode: newProduct.code,
            type: 'in',
            qty: newStock,
            stockBefore: 0,
            stockAfter: newStock,
            reason: `นำเข้าข้อมูล (${platformName})`,
            note: `บันทึกสต็อกแรกเข้าจากการนำเข้าไฟล์ Excel`,
            adjustedBy: currentUser?.name || currentUser?.username || 'ระบบนำเข้า',
            timestamp: nowStr,
          });
        }
      }
    });

    syncProducts(updatedProducts);
    if (updatedBrands.length !== brands.length) {
      syncBrands(updatedBrands);
    }
    if (updatedCategories.length !== categories.length) {
      syncCategories(updatedCategories);
    }

    if (adjustments.length > 0) {
      let currentHistory = [];
      try {
        const saved = localStorage.getItem('pim_stock_history');
        if (saved) currentHistory = JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing history:", e);
      }
      const updatedHistory = [...adjustments, ...currentHistory].slice(0, 500);
      localStorage.setItem('pim_stock_history', JSON.stringify(updatedHistory));
      
      // Dispatch custom event to notify ProductManage to reload stockHistory if it's active
      window.dispatchEvent(new CustomEvent('pim_stock_history_reload'));
    }

    addActivityLog(`นำเข้าสินค้าจาก ${platformName}: เพิ่มใหม่ ${newCount} รายการ, อัปเดตข้อมูล ${overwriteCount} รายการ`);
  };

  // Activity Log Helper
  const addActivityLog = useCallback(async (action, details = null) => {
    if (!currentUser) return;
    const entry = {
      id: Date.now(),
      userName: currentUser.name || currentUser.username || 'ไม่ระบุ',
      userRole: currentUser.role,
      action,
      details,
      timestamp: new Date().toISOString(),
    };
    
    // Optimistically update local state & storage first
    setActivityLog(prev => {
      const updated = [entry, ...prev].slice(0, 200);
      localStorage.setItem('pim_activity_log', JSON.stringify(updated));
      return updated;
    });

    try {
      const res = await fetch('/api/db/activityLog/append', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry })
      });
      if (res.ok) {
        const result = await res.json();
        if (result.success && Array.isArray(result.activityLog)) {
          // Sync state and storage with server response
          setActivityLog(result.activityLog);
          localStorage.setItem('pim_activity_log', JSON.stringify(result.activityLog));
        }
      }
    } catch (err) {
      console.error("Failed to append activity log to server:", err);
    }
  }, [currentUser]);


  // Auth Operations
  const handleLogin = useCallback((user) => {
    setCurrentUser(user);
    sessionStorage.setItem('pim_current_user', JSON.stringify(user));
    setActiveTab('dashboard');
  }, []);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    sessionStorage.removeItem('pim_current_user');
    setActiveTab('dashboard');
    setEditProduct(null);
  }, []);

  // Switch role sandbox helper
  const handleSwitchRole = (role) => {
    const matchedUser = users.find(u => u.role === role);
    if (matchedUser) {
      handleLogin(matchedUser);
    }
  };

  // Change password for the current logged-in user
  const handleChangePassword = (newPassword) => {
    if (!currentUser) return;
    const updatedUsers = users.map(u =>
      u.username === currentUser.username ? { ...u, password: newPassword } : u
    );
    syncUsers(updatedUsers);
    // Update the session so currentUser reflects new password
    const updatedCurrentUser = { ...currentUser, password: newPassword };
    setCurrentUser(updatedCurrentUser);
    sessionStorage.setItem('pim_current_user', JSON.stringify(updatedCurrentUser));
  };

  // Product CRUD
  const handleSaveProduct = (productData) => {
    let updated;
    const isEdit = products.some(p => p.id === productData.id);
    const currentFormattedDate = new Date().toLocaleDateString('sv-SE'); // "YYYY-MM-DD"
    const originalProduct = products.find(p => p.id === productData.id);

    const productWithMeta = {
      ...productData,
      createdAt: originalProduct?.createdAt || currentFormattedDate,
      updatedAt: currentFormattedDate,
      updatedBy: currentUser?.username || 'system'
    };

    if (isEdit) {
      updated = products.map(p => p.id === productData.id ? productWithMeta : p);

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
      updated = [productWithMeta, ...products];
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

  const handleBulkUpdateProducts = (updatedList, activityMsg = 'แก้ไขข้อมูลสินค้าทีละหลายรายการ (Bulk Edit)') => {
    syncProducts(updatedList);
    addActivityLog(activityMsg);
  };

  const handleResetProducts = () => {
    syncProducts(initialProducts);
    syncBrands(initialBrands);
    syncCategories(initialCategories);
    localStorage.removeItem('pim_stock_history');
    addActivityLog('คืนค่าข้อมูลสินค้าทั้งหมดเป็นค่าเริ่มต้น (Reset database to default demo data)');
  };

  const handleClearAllProducts = () => {
    syncProducts([]);
    localStorage.removeItem('pim_stock_history');
    addActivityLog('ลบข้อมูลสินค้าทั้งหมดออกจากระบบ (Clear all products from PIM)');
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
    saveToServer('activityLog', updated);
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

  // Derived unique lists of brands & categories from products database to ensure sync
  const allBrands = useMemo(() => {
    const productBrands = products.map(p => p.brand).filter(Boolean);
    return [...new Set([...brands, ...productBrands])];
  }, [brands, products]);

  const allCategories = useMemo(() => {
    const productCategories = products.map(p => p.category).filter(Boolean);
    return [...new Set([...categories, ...productCategories])];
  }, [categories, products]);

  // Render view screen based on activeTab
  const renderScreen = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            products={products}
            brands={allBrands}
            categories={allCategories}
            quotations={quotations}
            setActiveTab={handleTabChange}
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
            brands={allBrands}
            categories={allCategories}
            currentUser={currentUser}
            products={products}
            onDeleteProduct={handleDeleteProduct}
            onEditProduct={handleEditProductRequest}
            onImportProducts={handleImportProducts}
            onResetProducts={handleResetProducts}
            onClearAllProducts={handleClearAllProducts}
            addActivityLog={addActivityLog}
            onAddCategory={handleAddCategory}
            onAddBrand={handleAddBrand}
            onBulkUpdateProducts={handleBulkUpdateProducts}          />
        );
      case 'brands':
        return (
          <BrandManage
            brands={allBrands}
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
            categories={allCategories}
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
            brands={allBrands}
            categories={allCategories}
            addActivityLog={addActivityLog}
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
            addActivityLog={addActivityLog}
            onClearAllQuotations={handleClearAllQuotations}
          />
        );



      default:
        return <div className="p-8 text-center">หน้านี้อยู่ระหว่างการพัฒนา...</div>;
    }
  };

  // Check if we are in public sharing mode for quotation viewer or catalog
  const urlParams = new URLSearchParams(window.location.search);
  const shareData = urlParams.get('share');
  if (shareData) {
    return <PublicQuotationViewer shareData={shareData} companyInfo={companyInfo} />;
  }

  // Authenticated Screen vs Guest Login
  if (!currentUser) {
    return <Login onLogin={handleLogin} users={users} />;
  }

  return (
    <>
      <DashboardLayout
        currentUser={currentUser}
        onLogout={handleLogout}
        onChangePassword={handleChangePassword}
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onSwitchRole={handleSwitchRole}
        activityLog={activityLog}
        quotations={quotations}
      >
        {renderScreen()}
      </DashboardLayout>

      {/* Floating Help Button - Commented out for now
      <button
        type="button"
        onClick={() => setShowManual(true)}
        title="คู่มือการใช้งานระบบ"
        className="fixed bottom-6 right-6 z-[999] w-12 h-12 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer border-none no-print group"
      >
        <span className="text-lg font-extrabold">?</span>
      </button>
      */}

      {/* User Manual Modal - Commented out for now
      {showManual && (
        <UserManual currentUser={currentUser} onClose={() => setShowManual(false)} />
      )}
      */}
    </>
  );
}