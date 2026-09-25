import { useState, useEffect, useCallback, useMemo } from 'react';
import { companyInfo } from './mockData';
import { request, loadDatabase, saveCollection, acceptSnapshot, clearLegacyCache, cacheValue } from './utils/api';
import { mergeImportedProducts } from './utils/validation';
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
import CustomerManage from './components/CustomerManage';
import CompanyManage from './components/CompanyManage';
import PublicQuotationViewer from './components/PublicQuotationViewer';
import { canAccessPage } from './utils/permissions';

const customerBranchInfo = customer => {
  const rawBranch = String(customer?.branch || '').trim();
  const rawName = String(customer?.branchName || '').trim().replace(/^สาขา\s*/, '');
  const isSub = customer?.branchType === 'sub' || (rawBranch && !rawBranch.includes('สำนักงานใหญ่') && rawBranch !== 'Head Office');
  const fallbackName = rawBranch.replace(/^สาขา\s*/, '').trim();
  const branchName = isSub ? (rawName || (fallbackName !== 'ย่อย' ? fallbackName : '')) : '';
  return {
    branchType: isSub ? 'sub' : 'head',
    branchName,
    branch: isSub ? (branchName ? `สาขา ${branchName}` : 'สาขาย่อย') : 'สำนักงานใหญ่'
  };
};

const sameCustomerBranch = (a, b) => {
  const aName = (a?.name || '').trim().toLowerCase();
  const bName = (b?.name || '').trim().toLowerCase();
  const aCompany = (a?.companyName || '').trim().toLowerCase();
  const bCompany = (b?.companyName || '').trim().toLowerCase();
  const aBranch = customerBranchInfo(a);
  const bBranch = customerBranchInfo(b);
  return aName === bName && aCompany === bCompany &&
    aBranch.branchType === bBranch.branchType && aBranch.branchName.toLowerCase() === bBranch.branchName.toLowerCase();
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(() => !new URLSearchParams(window.location.search).has('share'));
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState({});
  const [users, setUsers] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [currentCompanyInfo, setCurrentCompanyInfo] = useState(() => {
    try {
      const saved = localStorage.getItem('pim_company_info');
      return saved ? JSON.parse(saved) : companyInfo;
    } catch {
      return companyInfo;
    }
  });
  const [activeTab, setActiveTab] = useState(() => {
    try {
      return localStorage.getItem('pim_active_tab') || 'dashboard';
    } catch {
      return 'dashboard';
    }
  });
  const [editProduct, setEditProduct] = useState(null);

  const handleTabChange = useCallback(tab => {
    if (tab === 'manage-products') setEditProduct(null);
    setActiveTab(tab);
    try {
      localStorage.setItem('pim_active_tab', tab);
    } catch {}
  }, []);

  useEffect(() => {
    clearLegacyCache();
    const apply = ({ detail: db }) => {
      if (db.products) {
        setProducts(db.products);
        // Printing uses a small metadata cache; image data never blocks persistence.
        cacheValue('pim_products', db.products.map(p => ({ id: p.id, code: p.code, barcode: p.barcode, size: p.size })));
      }
      if (db.brands) setBrands(db.brands);
      if (db.categories) setCategories(db.categories);
      if (db.subcategories) setSubcategories(db.subcategories);
      if (db.users) setUsers(db.users);
      if (db.quotations) setQuotations(db.quotations);
      if (db.companyInfo) setCurrentCompanyInfo(db.companyInfo);
      if (db.customers && db.customers.length > 0) {
        setCustomers(db.customers);
      } else if (db.quotations && db.quotations.length > 0) {
        const custMap = new Map();
        db.quotations.forEach(q => {
          if (q.customer && (q.customer.name || q.customer.companyName)) {
            const name = (q.customer.name || '').trim();
            const comp = (q.customer.companyName || '').trim();
            if (!name && !comp) return;
            const branch = customerBranchInfo({ ...q.customer, branch: q.customer.branch || q.customerBranch });
            const key = `${name.toLowerCase()}__${comp.toLowerCase()}__${branch.branchType}__${branch.branchName.toLowerCase()}`;
            if (!custMap.has(key)) {
              custMap.set(key, {
                id: crypto.randomUUID(),
                name: name || comp,
                companyName: comp,
                ...branch,
                region: q.customer.region || q.customerRegion || '',
                phone: (q.customer.phone || '').trim(),
                email: (q.customer.email || '').trim(),
                taxId: (q.customer.taxId || '').trim(),
                address: (q.customer.address || '').trim(),
                note: `ดึงข้อมูลจากประวัติใบเสนอราคา ${q.quotationNumber || ''}`.trim(),
                status: 'Active',
                createdAt: q.issuedDate ? new Date(q.issuedDate).toISOString() : new Date().toISOString()
              });
            }
          }
        });
        const extracted = Array.from(custMap.values());
        if (extracted.length > 0) {
          setCustomers(extracted);
          saveCollection('customers', extracted).catch(() => {});
        }
      }
      if (db.activityLog) setActivityLog(db.activityLog);
      if (db.user) setCurrentUser(db.user);
    };
    const expired = () => {
      setCurrentUser(null); setUsers([]); setProducts([]); setCategories([]); setSubcategories({}); setQuotations([]); setCustomers([]); setActivityLog([]);
      clearLegacyCache();
    };
    window.addEventListener('pim:database', apply);
    window.addEventListener('pim:session-expired', expired);
    const safetyTimer = setTimeout(() => {
      setAuthLoading(false);
    }, 1500);

    if (!new URLSearchParams(window.location.search).has('share')) {
      request('/api/auth/session')
        .then(async result => {
          await loadDatabase();
          setCurrentUser(result.user);
        })
        .catch(() => {})
        .finally(() => {
          clearTimeout(safetyTimer);
          setAuthLoading(false);
        });
    } else {
      clearTimeout(safetyTimer);
      setAuthLoading(false);
    }

    return () => {
      clearTimeout(safetyTimer);
      window.removeEventListener('pim:database', apply);
      window.removeEventListener('pim:session-expired', expired);
    };
  }, []);

  const handleLogin = async (username, password) => {
    const result = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
    await loadDatabase();
    setCurrentUser(result.user);
    const targetTab = canAccessPage(result.user, 'dashboard')
      ? 'dashboard'
      : (['manage-products', 'brands', 'categories', 'customers', 'quotations', 'reports', 'users', 'activity-log'].find(t => canAccessPage(result.user, t)) || 'manage-products');
    handleTabChange(targetTab);
  };
  const handleLogout = async () => {
    await request('/api/auth/logout', { method: 'POST' });
    clearLegacyCache(); setCurrentUser(null); setUsers([]); setProducts([]); setCategories([]); setSubcategories({}); setQuotations([]); setCustomers([]); setActivityLog([]);
    handleTabChange('dashboard'); setEditProduct(null);
  };

  // Auto redirect if activeTab is not permitted for current user
  useEffect(() => {
    if (!currentUser) return;
    if (!canAccessPage(currentUser, activeTab)) {
      const allTabs = ['dashboard', 'manage-products', 'brands', 'categories', 'customers', 'quotations', 'reports', 'users', 'activity-log'];
      const firstAllowed = allTabs.find(t => canAccessPage(currentUser, t));
      if (firstAllowed && firstAllowed !== activeTab) {
        handleTabChange(firstAllowed);
      }
    }
  }, [currentUser, activeTab, handleTabChange]);

  useEffect(() => {
    if (!currentUser) return;
    const navigate = event => {
      // Ignore if modifier keys are pressed (Ctrl, Cmd, Alt) or if key is not ArrowLeft / ArrowRight
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;

      const element = document.activeElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(element?.tagName) || element?.isContentEditable) return;

      // Do not navigate if user is currently selecting text to copy
      if (window.getSelection()?.toString()) return;

      const allTabs = ['dashboard', 'manage-products', 'brands', 'categories', 'customers', 'quotations', 'reports', 'users', 'activity-log'];
      const tabs = allTabs.filter(tab => canAccessPage(currentUser, tab));
      const index = tabs.indexOf(activeTab);
      if (index >= 0) {
        const step = event.key === 'ArrowRight' ? 1 : -1;
        handleTabChange(tabs[(index + step + tabs.length) % tabs.length]);
      }
    };
    window.addEventListener('keydown', navigate);
    return () => window.removeEventListener('keydown', navigate);
  }, [activeTab, currentUser, handleTabChange]);
  const addActivityLog = async action => {
    try {
      const result = await request('/api/db/activityLog/append', { method: 'POST', body: JSON.stringify({ entry: { action } }) });
      setActivityLog(result.activityLog);
    } catch (error) { console.error('Failed to add activity log:', error); }
  };
  const handleChangePassword = async (newPassword, oldPassword) => {
    const result = await request('/api/auth/password', { method: 'POST', body: JSON.stringify({ oldPassword, newPassword }) });
    acceptSnapshot(result);
  };
  const handleUpdateProfile = async data => {
    const updated = { ...currentUser, ...data };
    return saveCollection('users', users.map(u => u.id === currentUser.id ? updated : u));
  };
  const handleSaveProduct = async data => {
    const before = products.find(p => p.id === data.id);
    const now = new Date().toISOString();
    const product = { ...data, id: before?.id || crypto.randomUUID(), createdAt: before?.createdAt || now, updatedAt: now, updatedBy: currentUser.username };
    const result = await saveCollection('products', before ? products.map(p => p.id === before.id ? product : p) : [product, ...products]);
    setEditProduct(null);
    return result;
  };
  const handleImportProducts = async incomingProducts => {
    const now = new Date().toISOString();
    const withTimestamps = incomingProducts.map(p => ({
      ...p,
      createdAt: p.createdAt || now,
      updatedAt: p.updatedAt || now,
      updatedBy: p.updatedBy || currentUser?.username || 'system'
    }));
    const merged = mergeImportedProducts(products, withTimestamps);
    return saveCollection('products', merged);
  };
  const handleDeleteProduct = id => saveCollection('products', products.filter(p => p.id !== id));
  const handleBulkUpdateProducts = data => saveCollection('products', data);
  const handleClearAllProducts = () => saveCollection('products', []);
  const handleResetProducts = handleClearAllProducts;
  const handleClearLogs = () => saveCollection('activityLog', []);
  const handleEditProductRequest = product => { setEditProduct(product); setActiveTab('manage-products'); };
  const handleAddBrand = name => saveCollection('brands', [...brands, name]);
  const handleAddCategory = name => saveCollection('categories', [...categories, name]);

  const handleAddSubCategory = (category, subName) => {
    const list = subcategories[category] || [];
    if (list.includes(subName)) return;
    const updated = { ...subcategories, [category]: [...list, subName] };
    return saveCollection('subcategories', updated);
  };
  const handleEditSubCategory = (category, oldName, newName) => {
    const list = subcategories[category] || [];
    const updatedList = list.map(s => s === oldName ? newName : s);
    const updatedSub = { ...subcategories, [category]: updatedList };
    const updatedProducts = products.map(p => p.category === category && p.subCategory === oldName ? { ...p, subCategory: newName } : p);
    saveCollection('products', updatedProducts);
    return saveCollection('subcategories', updatedSub);
  };
  const handleDeleteSubCategory = (category, subName) => {
    const list = subcategories[category] || [];
    const updatedList = list.filter(s => s !== subName);
    const updatedSub = { ...subcategories, [category]: updatedList };
    const updatedProducts = products.map(p => p.category === category && p.subCategory === subName ? { ...p, subCategory: '' } : p);
    saveCollection('products', updatedProducts);
    return saveCollection('subcategories', updatedSub);
  };

  const updateCatalog = async (key, oldName, newName) => {
    const result = await request('/api/catalog/' + key, { method: 'POST', body: JSON.stringify({ oldName, newName }) });
    acceptSnapshot(result);
    return result;
  };
  const handleEditBrand = (oldName, newName) => updateCatalog('brands', oldName, newName);
  const handleDeleteBrand = name => updateCatalog('brands', name, null);
  const handleEditCategory = (oldName, newName) => updateCatalog('categories', oldName, newName);
  const handleDeleteCategory = name => updateCatalog('categories', name, null);
  const handleAddUser = data => saveCollection('users', [...users, data]);
  const handleUpdateUser = (data, oldUsername) => {
    if (currentUser && (currentUser.username === (oldUsername || data.username) || currentUser.id === data.id)) {
      setCurrentUser(prev => ({ ...prev, ...data }));
    }
    return saveCollection('users', users.map(u => u.username === (oldUsername || data.username) ? data : u));
  };
  const handleDeleteUser = username => saveCollection('users', users.filter(u => u.username !== username));
  const handleAddCustomer = async customer => {
    const updated = [customer, ...customers];
    setCustomers(updated);
    return saveCollection('customers', updated);
  };
  const handleUpdateCustomer = async customer => {
    const updated = customers.map(c => c.id === customer.id ? customer : c);
    setCustomers(updated);
    return saveCollection('customers', updated);
  };
  const handleDeleteCustomer = async id => {
    const updated = customers.filter(c => c.id !== id);
    setCustomers(updated);
    return saveCollection('customers', updated);
  };
  const handleImportCustomers = async newCustomers => {
    const updated = [...newCustomers, ...customers];
    setCustomers(updated);
    return saveCollection('customers', updated);
  };
  const handleSaveQuotation = async data => {
    const exists = quotations.some(q => q.id === data.id);
    const result = await saveCollection('quotations', exists ? quotations.map(q => q.id === data.id ? data : q) : [data, ...quotations]);
    // Sync customer information with Master Customer Management ("จัดการข้อมูลลูกค้า")
    if (data.customer && (data.customer.name || data.customer.companyName)) {
      const branch = customerBranchInfo(data.customer);
      const customerWithBranch = { ...data.customer, ...branch };
      const custName = (data.customer.name || '').trim();
      const custCompany = (data.customer.companyName || '').trim();
      const custTax = (data.customer.taxId || '').trim();
      const custId = data.customer.id;

      // Find if customer already exists in master customers list
      const existingIndex = customers.findIndex(c => {
        if (custId && c.id === custId) return true;
        if (sameCustomerBranch(c, customerWithBranch)) return true;
        if (custTax && c.taxId && c.taxId.trim() === custTax) {
          const cBranch = customerBranchInfo(c);
          if (cBranch.branchType === branch.branchType && (cBranch.branchName || '').toLowerCase() === (branch.branchName || '').toLowerCase()) {
            return true;
          }
        }
        return false;
      });

      if (existingIndex >= 0) {
        // Update existing customer in master list so "จัดการข้อมูลลูกค้า" stays aligned
        const target = customers[existingIndex];
        const updatedCustomer = {
          ...target,
          name: custName || target.name,
          companyName: custCompany || target.companyName,
          ...branch,
          region: data.customer.region || data.customerRegion || target.region || '',
          phone: (data.customer.phone || '').trim() || target.phone,
          email: (data.customer.email || '').trim() || target.email,
          taxId: custTax || target.taxId,
          address: (data.customer.address || '').trim() || target.address,
          note: data.customer.note !== undefined ? (data.customer.note || '').trim() : target.note,
          updatedAt: new Date().toISOString()
        };
        const updatedList = [...customers];
        updatedList[existingIndex] = updatedCustomer;
        setCustomers(updatedList);
        saveCollection('customers', updatedList).catch(() => {});
      } else if (custName || custCompany) {
        // Auto-create new customer in master list
        const newCust = {
          id: custId || crypto.randomUUID(),
          name: custName || custCompany,
          companyName: custCompany,
          ...branch,
          region: data.customer.region || data.customerRegion || '',
          phone: (data.customer.phone || '').trim(),
          email: (data.customer.email || '').trim(),
          taxId: custTax,
          address: (data.customer.address || '').trim(),
          note: (data.customer.note || '').trim(),
          status: 'Active',
          createdAt: new Date().toISOString()
        };
        const updatedList = [newCust, ...customers];
        setCustomers(updatedList);
        saveCollection('customers', updatedList).catch(() => {});
      }
    }
    return result.quotations.find(q => q.id === data.id);
  };
  const handleDeleteQuotation = id => saveCollection('quotations', quotations.filter(q => q.id !== id));
  const handleClearAllQuotations = () => saveCollection('quotations', []);
  const handleArchiveDeleteQuotations = async () => { await loadDatabase(); };

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
    if (!canAccessPage(currentUser, activeTab)) {
      const allTabs = ['manage-products', 'brands', 'categories', 'customers', 'quotations', 'reports', 'users', 'activity-log', 'dashboard'];
      const firstAllowed = allTabs.find(t => canAccessPage(currentUser, t)) || 'manage-products';
      return (
        <div className="bg-white rounded-3xl border border-[#d2d2d7]/50 p-12 text-center max-w-md mx-auto space-y-4 my-12 shadow-sm text-[#1d1d1f] animate-fade-in">
          <div className="w-14 h-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto border border-red-100">
            <i className="bi bi-shield-lock-fill text-2xl"></i>
          </div>
          <h2 className="font-bold text-[#1d1d1f] text-base">สิทธิ์การเข้าถึงหน้านี้ถูกจำกัด</h2>
          <p className="text-xs text-[#555557] leading-relaxed">
            บัญชีของคุณไม่ได้รับสิทธิ์ในการเข้าถึงหน้านี้ กรุณาติดต่อผู้ดูแลระบบ (Admin) เพื่อขอสิทธิ์การใช้งาน
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => handleTabChange(firstAllowed)}
              className="px-5 py-2 bg-[#0071e3] text-white text-xs font-bold rounded-xl hover:bg-[#0077ed] transition-colors cursor-pointer shadow-xs"
            >
              ไปยังหน้าที่สามารถเข้าถึงได้
            </button>
          </div>
        </div>
      );
    }

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
            currentUser={currentUser}
            users={users}
            customers={customers}
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
            subcategories={subcategories}
            currentUser={currentUser}
            products={products}
            onDeleteProduct={handleDeleteProduct}
            onEditProduct={handleEditProductRequest}
            onImportProducts={handleImportProducts}
            onResetProducts={handleResetProducts}
            onClearAllProducts={handleClearAllProducts}
            addActivityLog={addActivityLog}
            onAddCategory={handleAddCategory}
            onAddSubCategory={handleAddSubCategory}
            onAddBrand={handleAddBrand}
            onBulkUpdateProducts={handleBulkUpdateProducts} />
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
            subcategories={subcategories}
            products={products}
            onAddCategory={handleAddCategory}
            onEditCategory={handleEditCategory}
            onDeleteCategory={handleDeleteCategory}
            onAddSubCategory={handleAddSubCategory}
            onEditSubCategory={handleEditSubCategory}
            onDeleteSubCategory={handleDeleteSubCategory}
            currentUser={currentUser}
          />
        );

      case 'customers':
        return (
          <CustomerManage
            customers={customers}
            quotations={quotations}
            onAddCustomer={handleAddCustomer}
            onUpdateCustomer={handleUpdateCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            onImportCustomers={handleImportCustomers}
            currentUser={currentUser}
            addActivityLog={addActivityLog}
          />
        );

      case 'reports':
        return (
          <Report
            products={products}
            brands={allBrands}
            categories={allCategories}
            subcategories={subcategories}
            quotations={quotations}
            currentUser={currentUser}
            addActivityLog={addActivityLog}
            onArchiveDeleteQuotations={handleArchiveDeleteQuotations}
          />
        );
      case 'company':
        if (!canAccessPage(currentUser, 'company')) {
          return <div className="p-8 text-center text-red-500 font-semibold bg-white rounded-2xl border border-[#d2d2d7]/50 shadow-xs">ขออภัย คุณไม่ได้รับสิทธิ์ในการเข้าถึงหน้านี้</div>;
        }
        return (
          <CompanyManage
            companyInfo={currentCompanyInfo}
            onUpdateCompanyInfo={handleUpdateCompanyInfo}
            currentUser={currentUser}
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
        if (!canAccessPage(currentUser, 'activity-log')) {
          return <div className="p-8 text-center text-red-500 font-semibold bg-white rounded-2xl border border-[#d2d2d7]/50 shadow-xs">ขออภัย คุณไม่ได้รับสิทธิ์ในการเข้าถึงหน้านี้</div>;
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
            customers={customers}
            companyInfo={currentCompanyInfo}
            currentUser={currentUser}
            users={users}
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
    return <PublicQuotationViewer shareData={shareData} companyInfo={currentCompanyInfo} />;
  }

  // Authenticated Screen vs Guest Login
  if (authLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#f5f5f7] text-[#1d1d1f] select-none">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-white shadow-md flex items-center justify-center border border-zinc-200/80">
            <svg viewBox="0 0 80 90" className="w-8 h-9 fill-zinc-900" xmlns="http://www.w3.org/2000/svg">
              <path d="M 20 38 L 20 26 L 60 11 L 60 23 Z" />
              <path d="M 20 60 L 20 48 L 60 33 L 60 45 Z" />
              <path d="M 20 82 L 20 70 L 60 55 L 60 67 Z" />
            </svg>
          </div>
          <div className="flex items-center gap-2.5 text-xs font-bold text-zinc-500">
            <svg className="animate-spin h-4 w-4 text-[#0071e3]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>กำลังโหลดระบบ...</span>
          </div>
        </div>
      </div>
    );
  }
  if (!currentUser) {
    return <Login onLogin={handleLogin} users={users} />;
  }

  return (
    <DashboardLayout
      currentUser={currentUser}
      users={users}
      onLogout={handleLogout}
      onChangePassword={handleChangePassword}
      onUpdateProfile={handleUpdateProfile}
      activeTab={activeTab}
      setActiveTab={handleTabChange}
      activityLog={activityLog}
      quotations={quotations}
      onLogin={handleLogin}
    >
      {renderScreen()}
    </DashboardLayout>
  );
}
