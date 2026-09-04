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
import PublicQuotationViewer from './components/PublicQuotationViewer';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(() => !new URLSearchParams(window.location.search).has('share'));
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState({});
  const [users, setUsers] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
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
      if (db.activityLog) setActivityLog(db.activityLog);
      if (db.user) setCurrentUser(db.user);
    };
    const expired = () => {
      setCurrentUser(null); setUsers([]); setProducts([]); setCategories([]); setSubcategories({}); setQuotations([]); setActivityLog([]);
      clearLegacyCache();
    };
    window.addEventListener('pim:database', apply);
    window.addEventListener('pim:session-expired', expired);
    if (!new URLSearchParams(window.location.search).has('share')) request('/api/auth/session').then(async result => {
      await loadDatabase(); setCurrentUser(result.user);
    }).catch(() => {}).finally(() => setAuthLoading(false));
    return () => {
      window.removeEventListener('pim:database', apply);
      window.removeEventListener('pim:session-expired', expired);
    };
  }, []);

  const handleLogin = async (username, password) => {
    const result = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
    await loadDatabase();
    setCurrentUser(result.user);
    handleTabChange('dashboard');
  };
  const handleLogout = async () => {
    await request('/api/auth/logout', { method: 'POST' });
    clearLegacyCache(); setCurrentUser(null); setUsers([]); setProducts([]); setCategories([]); setSubcategories({}); setQuotations([]); setActivityLog([]);
    handleTabChange('dashboard'); setEditProduct(null);
  };
  useEffect(() => {
    if (!currentUser) return;
    const navigate = event => {
      const element = document.activeElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(element?.tagName) || element?.isContentEditable) return;
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      const tabs = ['dashboard', 'manage-products', 'brands', 'categories', 'quotations', 'reports'];
      if (['admin', 'manager'].includes(currentUser.role)) tabs.push('users');
      if (currentUser.role === 'admin') tabs.push('activity-log');
      const index = tabs.indexOf(activeTab);
      if (index >= 0) handleTabChange(tabs[(index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length]);
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
    const merged = mergeImportedProducts(products, incomingProducts);
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
  const handleUpdateUser = (data, oldUsername) => saveCollection('users', users.map(u => u.username === (oldUsername || data.username) ? data : u));
  const handleDeleteUser = username => saveCollection('users', users.filter(u => u.username !== username));
  const handleSaveQuotation = async data => {
    const exists = quotations.some(q => q.id === data.id);
    const result = await saveCollection('quotations', exists ? quotations.map(q => q.id === data.id ? data : q) : [data, ...quotations]);
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
    return <PublicQuotationViewer shareData={shareData} companyInfo={companyInfo} />;
  }

  // Authenticated Screen vs Guest Login
  if (authLoading) return null;
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
