/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Image as ImageIcon, 
  X, 
  Save, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  AlertTriangle, 
  Check, 
  AlertCircle, 
  Info, 
  Copy, 
  FileSpreadsheet,
  Download,
  Upload,
  Package,
  Clock,
  ArrowUp,
  ArrowDown,
  Printer
} from 'lucide-react';
import ExportModal from './ExportModal';
import ImportModal from './ImportModal';

const PRESET_IMAGES = [
  { url: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?q=80&w=400&auto=format&fit=crop', label: 'Pomade Waxes' },
  { url: 'https://images.unsplash.com/photo-1595853035070-59a39fe84de3?q=80&w=400&auto=format&fit=crop', label: 'Color Cream' },
  { url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=400&auto=format&fit=crop', label: 'Hair Dryer' },
  { url: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?q=80&w=400&auto=format&fit=crop', label: 'Matte Clay' },
  { url: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?q=80&w=400&auto=format&fit=crop', label: 'Hair Mask' },
  { url: 'https://images.unsplash.com/photo-1527799863830-53a84e6ad82b?q=80&w=400&auto=format&fit=crop', label: 'Scissors Set' }
];

const REASON_PRESETS = {
  in: [
    { label: 'รับสินค้าจากผู้ผลิต', icon: 'bi bi-truck' },
    { label: 'รับคืนจากลูกค้า', icon: 'bi bi-arrow-return-left' },
    { label: 'ปรับสต็อกเพิ่ม (ตรวจนับ)', icon: 'bi bi-clipboard-check' },
    { label: 'โอนย้ายสต็อกเข้า', icon: 'bi bi-box-arrow-in-down' },
    { label: 'อื่นๆ', icon: 'bi bi-three-dots' },
  ],
  out: [
    { label: 'ขายออก (ออฟไลน์)', icon: 'bi bi-cart-check' },
    { label: 'ขายออก Shopee', icon: 'bi bi-bag-check' },
    { label: 'ขายออก Lazada', icon: 'bi bi-bag-check' },
    { label: 'ขายออก TikTok Shop', icon: 'bi bi-bag-check' },
    { label: 'ตัดจ่ายของเสีย/หมดอายุ', icon: 'bi bi-x-circle' },
    { label: 'ปรับสต็อกลด (ตรวจนับ)', icon: 'bi bi-clipboard-x' },
    { label: 'โอนย้ายสต็อกออก', icon: 'bi bi-box-arrow-up' },
    { label: 'ของแถม/ตัวอย่าง', icon: 'bi bi-gift' },
    { label: 'อื่นๆ', icon: 'bi bi-three-dots' },
  ],
};

export default function ProductManage({ 
  editProduct, 
  onCancelEdit, 
  onSaveProduct, 
  brands, 
  categories, 
  currentUser,
  products = [],
  onDeleteProduct,
  onEditProduct,
  stockFilter = 'All',
  setStockFilter = () => {},
  onUpdateStock = () => {}
}) {
  const [code, setCode] = useState('');
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [wholesalePrice, setWholesalePrice] = useState('');
  const [retailPrice, setRetailPrice] = useState('');
  const [capFee, setCapFee] = useState('');
  const [description, setDescription] = useState('');
  const [highlights, setHighlights] = useState('');
  const [howToUse, setHowToUse] = useState('');
  const [image, setImage] = useState('');
  const [size, setSize] = useState('');
  const [weight, setWeight] = useState('');
  const [fdaNumber, setFdaNumber] = useState('');
  const [tisiNumber, setTisiNumber] = useState('');
  const [stock, setStock] = useState('');
  const [status, setStatus] = useState('Active');
  const [createdAt, setCreatedAt] = useState('');
  
  const [errorMsg, setErrorMsg] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [productToDelete, setProductToDelete] = useState(null);
  const [alertPopup, setAlertPopup] = useState(null);
  const [editRemark, setEditRemark] = useState('');

  // Filter States
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  
  // Product details modal state
  const [drawerProduct, setDrawerProduct] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Quick add brand/category modal state
  const [quickAddModal, setQuickAddModal] = useState({ isOpen: false, type: 'brand', value: '' });

  // Bulk Select state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Stock sub-tab and adjustment states
  const [activeSubTab, setActiveSubTab] = useState('list'); // 'list' | 'history'
  const [adjustProduct, setAdjustProduct] = useState(null);
  const [adjustMode, setAdjustMode] = useState('in'); // 'in' | 'out'
  const [adjustQty, setAdjustQty] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [stockHistory, setStockHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('pim_stock_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Error loading stock history:", e);
      return [];
    }
  });
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyUserFilter, setHistoryUserFilter] = useState('All');

  const historyUsers = useMemo(() => {
    const users = stockHistory.map(h => h.adjustedBy).filter(Boolean);
    return [...new Set(users)];
  }, [stockHistory]);

  const handleToggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredProducts.length && filteredProducts.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const selectedProductsList = products.filter(p => selectedIds.has(p.id));

  useEffect(() => {
    if (drawerProduct) {
      document.body.style.overflow = 'hidden';
    } else {
      if (!showForm) {
        document.body.style.overflow = 'unset';
      }
    }
    return () => {
      if (!showForm && !drawerProduct) {
        document.body.style.overflow = 'unset';
      }
    };
  }, [drawerProduct, showForm]);

  const handleCopyMarketingContent = (product) => {
    const text = `📦 ข้อมูลสินค้าสำหรับงานขายและการตลาด\n---------------------------------\nชื่อสินค้า: ${product.name}\nรหัสสินค้า (SKU): ${product.code}\nแบรนด์: ${product.brand}\nหมวดหมู่: ${product.category}\nราคาแนะนำ: ${(product.retailPrice || 0).toLocaleString()} บาท\nจำนวนในสต็อก: ${product.stock > 0 ? `${product.stock} ชิ้น` : 'สินค้าหมด (Out of Stock)'}\nรายละเอียดสินค้า:\n${product.description || 'ไม่มีรายละเอียดเพิ่มเติม'}\n---------------------------------\n*จัดเก็บโดยระบบ PIM พันธ์วาดี*`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(product.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleCategorySelectChange = (e) => {
    const val = e.target.value;
    if (val === 'ADD_NEW') {
      if (currentUser?.role === 'user') return;
      setQuickAddModal({ isOpen: true, type: 'category', value: '' });
    } else {
      setCategory(val);
    }
  };

  const handleBrandSelectChange = (e) => {
    const val = e.target.value;
    if (val === 'ADD_NEW') {
      if (currentUser?.role === 'user') return;
      setQuickAddModal({ isOpen: true, type: 'brand', value: '' });
    } else {
      setBrand(val);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          product.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (product.barcode && product.barcode.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesBrand = selectedBrand === 'All' || product.brand === selectedBrand;
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    const matchesStatus = selectedStatus === 'All' || product.status === selectedStatus;
    
    let matchesStock = true;
    if (stockFilter === 'Low') {
      matchesStock = product.stock <= 10;
    } else if (stockFilter === 'Out') {
      matchesStock = product.stock === 0;
    }

    return matchesSearch && matchesBrand && matchesCategory && matchesStatus && matchesStock;
  });

  const resetForm = () => {
    setCode('');
    setBarcode('');
    setName('');
    if (brands.length > 0) setBrand(brands[0]);
    if (categories.length > 0) setCategory(categories[0]);
    setWholesalePrice('');
    setRetailPrice('');
    setCapFee('');
    setDescription('');
    setHighlights('');
    setHowToUse('');
    setImage('');
    setSize('');
    setWeight('');
    setFdaNumber('');
    setTisiNumber('');
    setStock('');
    setStatus('Active');
    setCreatedAt('');
    setErrorMsg('');
    setEditRemark('');
  };

  useEffect(() => {
    if (alertPopup && alertPopup.type === 'success') {
      const timer = setTimeout(() => {
        onSaveProduct(alertPopup.data);
        resetForm();
        setAlertPopup(null);
      }, 1500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertPopup]);

  useEffect(() => {
    if (editProduct) {
      setCode(editProduct.code || '');
      setBarcode(editProduct.barcode || '');
      setName(editProduct.name || '');
      setBrand(editProduct.brand || '');
      setCategory(editProduct.category || '');
      setWholesalePrice(editProduct.wholesalePrice || '');
      setRetailPrice(editProduct.retailPrice || '');
      setCapFee(editProduct.capFee || '');
      setDescription(editProduct.description || '');
      setHighlights(editProduct.highlights || '');
      setHowToUse(editProduct.howToUse || '');
      setImage(editProduct.image || '');
      setSize(editProduct.size || '');
      setWeight(editProduct.weight || '');
      setFdaNumber(editProduct.fdaNumber || '');
      setTisiNumber(editProduct.tisiNumber || '');
      setStock(editProduct.stock || '');
      setStatus(editProduct.status || 'Active');
      setCreatedAt(editProduct.createdAt || '');
      setEditRemark('');
      setErrorMsg('');
      setShowForm(true);
    } else {
      resetForm();
      setShowForm(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editProduct]);

  useEffect(() => {
    if (!editProduct) {
      if (brands.length > 0) setBrand(brands[0]);
      if (categories.length > 0) setCategory(categories[0]);
    }
  }, [brands, categories, editProduct]);

  useEffect(() => {
    if (showForm) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
     }, [showForm]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('ขนาดรูปภาพต้องไม่เกิน 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result);
      setErrorMsg('');
    };
    reader.readAsDataURL(file);
  };

  const filteredHistory = stockHistory.filter(h => {
    const q = historySearchQuery.trim().toLowerCase();
    const matchSearch = !q || 
      (h.productName && h.productName.toLowerCase().includes(q)) || 
      (h.productCode && h.productCode.toLowerCase().includes(q)) ||
      (h.adjustedBy && h.adjustedBy.toLowerCase().includes(q)) ||
      (h.reason && h.reason.toLowerCase().includes(q));
    const matchUser = historyUserFilter === 'All' || h.adjustedBy === historyUserFilter;
    return matchSearch && matchUser;
  });

  const handleExportHistoryCSV = () => {
    const headers = [
      'ประเภท', 'รหัสสินค้า', 'ชื่อสินค้า', 'จำนวนที่ปรับ (ชิ้น)', 
      'สต็อกก่อนหน้า', 'สต็อกหลังปรับ', 'เหตุผล', 'หมายเหตุ', 'ผู้บันทึก', 'วันเวลา'
    ];
    const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = filteredHistory.map(h => [
      h.type === 'in' ? 'เพิ่มสต็อก' : 'ลดสต็อก',
      q(h.productCode),
      q(h.productName),
      h.qty,
      h.stockBefore,
      h.stockAfter,
      q(h.reason),
      q(h.note || ''),
      q(h.adjustedBy),
      q(new Date(h.timestamp).toLocaleString('th-TH'))
    ]);
    
    const csvContent = '\uFEFF' + [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Stock_Adjustment_History_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleConfirmAdjustStock = () => {
    const amount = parseInt(adjustQty, 10);
    if (!amount || amount <= 0) {
      setAlertPopup({ type: 'error', title: 'กรุณาระบุจำนวน', message: 'จำนวนต้องเป็นตัวเลขมากกว่า 0' });
      return;
    }
    const reason = selectedReason === 'อื่นๆ' ? customReason.trim() : selectedReason;
    if (!reason) {
      setAlertPopup({ type: 'error', title: 'กรุณาเลือกเหตุผล', message: 'โปรดระบุเหตุผลในการปรับสต็อก' });
      return;
    }
    if (adjustMode === 'out' && amount > adjustProduct.stock) {
      setAlertPopup({ type: 'error', title: 'สต็อกไม่เพียงพอ', message: `สต็อกปัจจุบัน ${adjustProduct.stock} ชิ้น ไม่สามารถลดได้ ${amount} ชิ้น` });
      return;
    }

    const newStock = adjustMode === 'in'
      ? adjustProduct.stock + amount
      : adjustProduct.stock - amount;

    // Save history
    const entry = {
      id: Date.now(),
      productId: adjustProduct.id,
      productName: adjustProduct.name,
      productCode: adjustProduct.code,
      type: adjustMode,
      qty: amount,
      stockBefore: adjustProduct.stock,
      stockAfter: newStock,
      reason,
      note: adjustNote.trim(),
      adjustedBy: currentUser?.name || currentUser?.username || 'ไม่ระบุ',
      timestamp: new Date().toISOString(),
    };
    
    let currentHistory = [];
    try {
      const saved = localStorage.getItem('pim_stock_history');
      if (saved) currentHistory = JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    const updatedHistory = [entry, ...currentHistory].slice(0, 500);
    setStockHistory(updatedHistory);
    localStorage.setItem('pim_stock_history', JSON.stringify(updatedHistory));

    // Update product stock in parent App state
    onUpdateStock(adjustProduct.id, newStock, entry);

    setAlertPopup({
      type: 'success-adjust',
      title: adjustMode === 'in' ? `เพิ่มสต็อก +${amount} ชิ้น` : `ลดสต็อก -${amount} ชิ้น`,
      message: `${adjustProduct.name} | คงเหลือ ${newStock} ชิ้น`,
    });
    setAdjustProduct(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!code.trim()) {
      setAlertPopup({ type: 'error', title: 'กรอกข้อมูลไม่ครบถ้วน', message: 'กรุณากรอกรหัสสินค้า' });
      return;
    }
    const isDuplicate = products.some(p => p.code.toLowerCase() === code.trim().toLowerCase() && (!editProduct || p.id !== editProduct.id));
    if (isDuplicate) {
      setAlertPopup({ type: 'error', title: 'รหัสสินค้าซ้ำในระบบ', message: `รหัสสินค้า "${code.trim()}" ถูกใช้ลงทะเบียนสินค้าชิ้นอื่นแล้ว` });
      return;
    }
    if (!barcode.trim()) {
      setAlertPopup({ type: 'error', title: 'กรอกข้อมูลไม่ครบถ้วน', message: 'กรุณากรอกรหัสบาร์โค้ด' });
      return;
    }
    if (!name.trim()) {
      setAlertPopup({ type: 'error', title: 'กรอกข้อมูลไม่ครบถ้วน', message: 'กรุณากรอกชื่อสินค้า/ผลิตภัณฑ์' });
      return;
    }
    if (!brand.trim()) {
      setAlertPopup({ type: 'error', title: 'กรอกข้อมูลไม่ครบถ้วน', message: 'กรุณาเลือกแบรนด์สินค้า' });
      return;
    }
    if (!category.trim()) {
      setAlertPopup({ type: 'error', title: 'กรอกข้อมูลไม่ครบถ้วน', message: 'กรุณาเลือกหมวดหมู่สินค้า' });
      return;
    }
    if (!size.trim()) {
      setAlertPopup({ type: 'error', title: 'กรอกข้อมูลไม่ครบถ้วน', message: 'กรุณากรอกขนาดสินค้า' });
      return;
    }
    if (!weight.trim()) {
      setAlertPopup({ type: 'error', title: 'กรอกข้อมูลไม่ครบถ้วน', message: 'กรุณากรอกน้ำหนักสินค้า' });
      return;
    }
    if (!fdaNumber.trim()) {
      setAlertPopup({ type: 'error', title: 'กรอกข้อมูลไม่ครบถ้วน', message: 'กรุณากรอกหมายเลข อย.' });
      return;
    }
    if (!tisiNumber.trim()) {
      setAlertPopup({ type: 'error', title: 'กรอกข้อมูลไม่ครบถ้วน', message: 'กรุณากรอกหมายเลข มอก.' });
      return;
    }
    if (wholesalePrice === '' || isNaN(wholesalePrice) || Number(wholesalePrice) < 0) {
      setAlertPopup({ type: 'error', title: 'ข้อมูลราคาไม่ถูกต้อง', message: 'กรุณาระบุราคาขายส่งที่ถูกต้อง' });
      return;
    }
    if (retailPrice === '' || isNaN(retailPrice) || Number(retailPrice) < 0) {
      setAlertPopup({ type: 'error', title: 'ข้อมูลราคาไม่ถูกต้อง', message: 'กรุณาระบุราคาขายปลีกที่ถูกต้อง' });
      return;
    }
    if (capFee === '' || isNaN(capFee) || Number(capFee) < 0) {
      setAlertPopup({ type: 'error', title: 'ราคาไม่ถูกต้อง', message: 'กรุณากรอกค่าฝาให้ถูกต้อง (ระบุ 0 บาทหากไม่มี)' });
      return;
    }

    if (!description.trim()) {
      setAlertPopup({ type: 'error', title: 'กรอกข้อมูลไม่ครบถ้วน', message: 'กรุณากรอกรายละเอียดสินค้า' });
      return;
    }
    if (!highlights.trim()) {
      setAlertPopup({ type: 'error', title: 'กรอกข้อมูลไม่ครบถ้วน', message: 'กรุณากรอกจุดเด่นสินค้า' });
      return;
    }
    if (!howToUse.trim()) {
      setAlertPopup({ type: 'error', title: 'กรอกข้อมูลไม่ครบถ้วน', message: 'กรุณากรอกวิธีใช้สินค้า' });
      return;
    }
    if (!image.trim()) {
      setAlertPopup({ type: 'error', title: 'กรอกข้อมูลไม่ครบถ้วน', message: 'กรุณาเลือกหรืออัปโหลดรูปภาพสินค้า' });
      return;
    }
    if (editProduct && !editRemark.trim()) {
      setAlertPopup({ type: 'error', title: 'ข้อมูลไม่ครบถ้วน', message: 'กรุณากรอกหมายเหตุการแก้ไข' });
      return;
    }

    const currentFormattedDate = new Date().toISOString().slice(0, 16).replace('T', ' ');

    const newProductData = {
      id: editProduct ? editProduct.id : Date.now().toString(),
      code: code.trim(),
      barcode: barcode.trim(),
      name: name.trim(),
      brand,
      category,
      wholesalePrice: Number(wholesalePrice),
      retailPrice: Number(retailPrice),
      capFee: Number(capFee),
      description: description.trim(),
      highlights: highlights.trim(),
      howToUse: howToUse.trim(),
      image: image || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&auto=format&fit=crop&q=60',
      size: size.trim(),
      weight: weight.trim(),
      fdaNumber: fdaNumber.trim(),
      tisiNumber: tisiNumber.trim(),
      stock: editProduct ? editProduct.stock : 0,
      status,
      createdAt: editProduct ? (createdAt || currentFormattedDate) : currentFormattedDate,
      updatedAt: currentFormattedDate,
      updatedBy: currentUser.username,
      editRemark: editProduct ? editRemark.trim() : ''
    };

    setAlertPopup({ type: 'success', title: 'บันทึกข้อมูลสำเร็จ', message: 'ข้อมูลสินค้าถูกบันทึกเรียบร้อยแล้ว', data: newProductData });
  };

  return (
    <div className="space-y-6">
      {/* Export / Import Modals */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        selectedProducts={selectedProductsList}
        allProducts={products}
      />
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        existingProducts={products}
        onImportComplete={(mergedProducts, platform, newCount, overwriteCount) => {
          // Compare stock before and after to generate history records
          const adjustments = [];
          const nowStr = new Date().toISOString();
          const platformName = platform === 'shopee' ? 'Shopee' : platform === 'lazada' ? 'Lazada' : platform === 'tiktok' ? 'TikTok Shop' : 'Excel';

          mergedProducts.forEach(newP => {
            const oldP = products.find(p => p.code === newP.code || p.id === newP.id);
            const oldStock = oldP ? (Number(oldP.stock) || 0) : 0;
            const newStock = Number(newP.stock) || 0;

            if (newStock !== oldStock) {
              const diff = newStock - oldStock;
              adjustments.push({
                id: Date.now() + Math.random(),
                productId: newP.id,
                productName: newP.name,
                productCode: newP.code,
                type: diff > 0 ? 'in' : 'out',
                qty: Math.abs(diff),
                stockBefore: oldStock,
                stockAfter: newStock,
                reason: `นำเข้าข้อมูล (${platformName})`,
                note: `อัปเดตสต็อกอัตโนมัติจากการนำเข้าไฟล์ Excel`,
                adjustedBy: currentUser?.name || currentUser?.username || 'ระบบนำเข้า',
                timestamp: nowStr,
              });
            }
          });

          // Save adjustments to stockHistory local storage and state
          if (adjustments.length > 0) {
            let currentHistory = [];
            try {
              const saved = localStorage.getItem('pim_stock_history');
              if (saved) currentHistory = JSON.parse(saved);
            } catch (e) {
              console.error("Error parsing history:", e);
            }
            const updatedHistory = [...adjustments, ...currentHistory].slice(0, 500);
            setStockHistory(updatedHistory);
            localStorage.setItem('pim_stock_history', JSON.stringify(updatedHistory));
          }

          // Trigger full product list update and dispatch event
          if (typeof window !== 'undefined') {
            localStorage.setItem('pim_products', JSON.stringify(mergedProducts));
            window.dispatchEvent(new CustomEvent('pim_import_complete', {
              detail: { mergedProducts, platform, newCount, overwriteCount, stockAdjustments: adjustments }
            }));
          }
          setShowImportModal(false);
          setAlertPopup({
            type: 'success-import',
            title: 'นำเข้าข้อมูลสำเร็จ!',
            message: `เพิ่มใหม่ ${newCount} รายการ (ปรับสต็อก ${adjustments.length} รายการ)`,
          });
        }}
      />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f]">จัดการข้อมูลสินค้า</h1>
        </div>
        <div className="flex flex-wrap gap-2.5 self-start sm:self-auto">
          {/* Import Button */}
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2.5 bg-white hover:bg-[#f5f5f7] text-[#1d1d1f] border border-[#d2d2d7] text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
          {/* Export Button */}
          <button
            type="button"
            onClick={() => setShowExportModal(true)}
            className="px-4 py-2.5 bg-white hover:bg-[#f5f5f7] text-[#1d1d1f] border border-[#d2d2d7] text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
          </button>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="px-4 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            เพิ่มสินค้าใหม่
          </button>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex border-b border-[#d2d2d7]/50 gap-6 text-sm no-print">
        <button
          type="button"
          onClick={() => setActiveSubTab('list')}
          className={`pb-2.5 font-bold transition-all relative cursor-pointer ${
            activeSubTab === 'list'
              ? 'text-[#0071e3]'
              : 'text-[#555557] hover:text-[#1d1d1f]'
          }`}
        >
          รายการสินค้าทั้งหมด
          {activeSubTab === 'list' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0071e3] rounded-full animate-fade-in" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('history')}
          className={`pb-2.5 font-bold transition-all relative cursor-pointer ${
            activeSubTab === 'history'
              ? 'text-[#0071e3]'
              : 'text-[#555557] hover:text-[#1d1d1f]'
          }`}
        >
          ประวัติการปรับคลังสินค้า
          {activeSubTab === 'history' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0071e3] rounded-full animate-fade-in" />
          )}
        </button>
      </div>

      {activeSubTab === 'list' ? (
        <>
          {/* Print-only Header */}
          <div className="hidden print:block mb-6 border-b border-[#d2d2d7]/50 pb-4 text-[#1d1d1f]">
            <div className="flex justify-between items-end">
              <div>
                <h1 className="text-xl font-bold">รายงานข้อมูลสินค้าคงคลัง</h1>
                <p className="text-[10px] text-zinc-550 mt-1">บริษัท พันธ์วาดี จำกัด | Product Inventory Report</p>
              </div>
              <div className="text-right text-[10px] text-zinc-550">
                <p>ผู้พิมพ์: {currentUser?.name || currentUser?.username || 'ไม่ระบุ'}</p>
                <p>วันที่ออกรายงาน: {new Date().toLocaleString('th-TH')}</p>
              </div>
            </div>
          </div>

          {/* Filters Panel */}
      <div className="bg-white p-5 rounded-2xl border border-[#d2d2d7]/50 shadow-xs space-y-4 no-print">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
          <div className="relative md:col-span-4">
            <Search className="w-4.5 h-4.5 text-[#555557] absolute left-3 top-3" />
            <input
              type="text"
              placeholder="ค้นหาชื่อสินค้า รหัสสินค้า รายละเอียด..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-sm text-[#1d1d1f] focus:outline-hidden focus:border-[#0071e3] focus:bg-white transition-all placeholder-[#555557]"
            />
          </div>

          <div className="md:col-span-2">
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-sm text-zinc-700 focus:outline-hidden focus:border-black focus:bg-white transition-all"
            >
              <option value="All">ทุกแบรนด์สินค้า</option>
              {brands.map(brand => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-sm text-zinc-700 focus:outline-hidden focus:border-black focus:bg-white transition-all"
            >
              <option value="All">ทุกหมวดหมู่</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-sm text-zinc-700 focus:outline-hidden focus:border-black focus:bg-white transition-all"
            >
              <option value="All">สถานะทั้งหมด</option>
              <option value="Active">เปิดใช้งาน (Active)</option>
              <option value="Inactive">ปิดใช้งาน (Inactive)</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-sm text-zinc-700 focus:outline-hidden focus:border-black focus:bg-white transition-all"
            >
              <option value="All">สต็อกทั้งหมด</option>
              <option value="Low">สต็อกสินค้าต่ำ (≤ 10)</option>
              <option value="Out">สินค้าหมดสต็อก (0)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[#f5f5f7] pt-4 text-xs text-[#555557] uppercase tracking-wider font-semibold">
          <span>พบสินค้าตรงตามเงื่อนไข <strong className="text-black font-bold">{filteredProducts.length}</strong> รายการ</span>
          {selectedIds.size > 0 && (
            <span className="text-[#0071e3] font-bold">เลือกไว้ {selectedIds.size} รายการ</span>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/50 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e8e8ed]">
          <h4 className="text-sm font-bold text-[#1d1d1f] tracking-wide uppercase">รายชื่อสินค้าทั้งหมด</h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-[#f5f5f7] text-[#555557] font-bold border-b border-[#d2d2d7]/50 uppercase tracking-wider text-xs">
                <th className="p-3 w-10 no-print">
                  <input
                    type="checkbox"
                    checked={filteredProducts.length > 0 && selectedIds.size === filteredProducts.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded accent-[#0071e3] cursor-pointer"
                    title="เลือกทั้งหมด"
                  />
                </th>
                <th className="p-3 w-16">รูปภาพ</th>
                <th className="p-3">รหัสสินค้า</th>
                <th className="p-3">รหัสบาร์โค้ด</th>
                <th className="p-3">ชื่อสินค้า</th>
                <th className="p-3">แบรนด์</th>
                <th className="p-3">หมวดหมู่</th>
                <th className="p-3 text-right">ราคาส่ง</th>
                <th className="p-3 text-right">ราคาปลีก</th>
                <th className="p-3 text-center">คลัง</th>
                <th className="p-3 text-center">สถานะ</th>
                <th className="p-3 text-center w-36 no-print">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f5f7]">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="12" className="p-16 text-center">
                    <div className="space-y-3">
                      <FileSpreadsheet className="w-12 h-12 text-[#555557] mx-auto" />
                      <h3 className="font-semibold text-[#1d1d1f] text-sm uppercase tracking-wider">ไม่พบผลการค้นหา</h3>
                      <p className="text-[#555557] text-xs max-w-sm mx-auto mt-1">
                        ไม่พบสินค้าที่ตรงตามเงื่อนไขที่เลือก กรุณาลองปรับเปลี่ยนตัวเลือกตัวกรองใหม่อีกครั้ง
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map(product => (
                  <tr key={product.id} className={`hover:bg-[#fafafa] transition-colors group text-[#1d1d1f] ${selectedIds.has(product.id) ? 'bg-blue-50/60' : ''}`}>
                    <td className="p-3 w-10 no-print">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(product.id)}
                        onChange={() => handleToggleSelect(product.id)}
                        className="w-4 h-4 rounded accent-[#0071e3] cursor-pointer"
                      />
                    </td>
                    <td className="p-3 w-16">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#f5f5f7] border border-[#d2d2d7]/30 flex-shrink-0">
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="font-mono text-xs text-zinc-700 whitespace-nowrap">{product.code}</span>
                    </td>
                    <td className="p-3">
                      <span className="font-mono text-xs text-zinc-700 whitespace-nowrap">{product.barcode || '-'}</span>
                    </td>
                    <td className="p-3 min-w-[160px]">
                      <span className="font-semibold text-black">{product.name}</span>
                    </td>
                    <td className="p-3 whitespace-nowrap text-zinc-700">{product.brand}</td>
                    <td className="p-3 whitespace-nowrap text-zinc-600 text-xs">{product.category}</td>
                    <td className="p-3 text-right whitespace-nowrap font-bold text-zinc-900">{(product.wholesalePrice || 0).toLocaleString()} ฿</td>
                    <td className="p-3 text-right whitespace-nowrap font-extrabold text-black">{(product.retailPrice || 0).toLocaleString()} ฿</td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <span className={`font-extrabold text-sm ${product.stock === 0 ? 'text-red-500' : product.stock <= 10 ? 'text-amber-600' : 'text-zinc-800'}`}>
                        {product.stock.toLocaleString()} <span className="text-[10px] text-zinc-400 font-normal">ชิ้น</span>
                      </span>
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${
                        product.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                          : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                      }`}>
                        {product.status === 'Active' ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                      </span>
                    </td>
                    <td className="p-3 text-center whitespace-nowrap no-print">
                      <div className="flex justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDrawerProduct(product)}
                          className="p-1.5 text-zinc-650 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                          title="ดูรายละเอียดสินค้า"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onEditProduct(product);
                            setShowForm(true);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="แก้ไขข้อมูลสินค้า"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAdjustProduct(product);
                            setAdjustMode('in');
                            setAdjustQty('');
                            setSelectedReason('');
                            setCustomReason('');
                            setAdjustNote('');
                          }}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="ปรับสต็อกสินค้า"
                        >
                          <Package className="w-4 h-4" />
                        </button>
                        {currentUser.role === 'admin' && (
                          <button
                            type="button"
                            onClick={() => setProductToDelete(product)}
                            className="p-1.5 text-red-650 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="ลบสินค้า"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}</tbody>
          </table>
        </div>
      </div>
      </>
      ) : (
        <div className="space-y-4 animate-fade-in">
          {/* Print-only Header */}
          <div className="hidden print:block mb-6 border-b border-[#d2d2d7]/50 pb-4 text-[#1d1d1f]">
            <div className="flex justify-between items-end">
              <div>
                <h1 className="text-xl font-bold">รายงานประวัติการปรับคลังสินค้า</h1>
                <p className="text-[10px] text-zinc-550 mt-1">บริษัท พันธ์วาดี จำกัด | Stock Adjustment History Report</p>
              </div>
              <div className="text-right text-[10px] text-zinc-550">
                <p>ผู้พิมพ์: {currentUser?.name || currentUser?.username || 'ไม่ระบุ'}</p>
                <p>วันที่ออกรายงาน: {new Date().toLocaleString('th-TH')}</p>
              </div>
            </div>
          </div>

          {/* Search/Filter for history */}
          <div className="bg-white p-5 rounded-2xl border border-[#d2d2d7]/50 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 no-print">
            <div className="flex flex-wrap gap-2.5 items-center flex-1 max-w-2xl">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4.5 h-4.5 text-[#555557] absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="ค้นหาประวัติด้วยชื่อสินค้า, รหัสสินค้า, ผู้บันทึก หรือ เหตุผล..."
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-xs text-[#1d1d1f] focus:outline-hidden focus:border-[#0071e3] focus:bg-white transition-all placeholder-[#555557]"
                />
              </div>
              <select
                value={historyUserFilter}
                onChange={(e) => setHistoryUserFilter(e.target.value)}
                className="px-3.5 py-2 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-xs text-zinc-700 focus:outline-hidden focus:border-black focus:bg-white transition-all cursor-pointer min-w-[150px]"
              >
                <option value="All">ผู้บันทึกทั้งหมด</option>
                {historyUsers.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleExportHistoryCSV}
                disabled={filteredHistory.length === 0}
                className={`px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer ${
                  filteredHistory.length === 0 ? 'opacity-50 cursor-not-allowed bg-zinc-300 hover:bg-zinc-300' : ''
                }`}
              >
                <Download className="w-4 h-4" />
                ดาวน์โหลด Excel
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                disabled={filteredHistory.length === 0}
                className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer ${
                  filteredHistory.length === 0 ? 'opacity-50 cursor-not-allowed bg-zinc-300 hover:bg-zinc-300' : ''
                }`}
              >
                <Printer className="w-4 h-4" />
                พิมพ์รายงาน
              </button>
              <div className="text-xs text-[#555557] uppercase tracking-wider font-semibold whitespace-nowrap">
                ประวัติการปรับปรุง <strong className="text-black font-extrabold">{filteredHistory.length}</strong> รายการ
              </div>
            </div>
          </div>

          {/* History List Table */}
          <div className="bg-white rounded-2xl border border-[#d2d2d7]/50 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-[#f5f5f7] text-[#555557] font-bold border-b border-[#d2d2d7]/50 uppercase tracking-wider text-xs">
                    <th className="p-3 w-16 text-center">ประเภท</th>
                    <th className="p-3">สินค้า</th>
                    <th className="p-3 text-center">จำนวนที่ปรับ</th>
                    <th className="p-3 text-center">สต็อกก่อน → หลัง</th>
                    <th className="p-3">เหตุผล</th>
                    <th className="p-3">ผู้บันทึก</th>
                    <th className="p-3">วันเวลา</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f5f5f7]">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-16 text-center">
                        <div className="space-y-3">
                          <Clock className="w-12 h-12 text-[#555557] mx-auto opacity-35" />
                          <h3 className="font-semibold text-[#1d1d1f] text-sm uppercase tracking-wider">ยังไม่มีประวัติการปรับสต็อก</h3>
                          <p className="text-[#555557] text-xs max-w-sm mx-auto mt-1">
                            ข้อมูลการเพิ่มและลดสต็อกของคลังสินค้าจะบันทึกและแสดงประวัติที่นี่โดยอัตโนมัติ
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((h) => (
                      <tr key={h.id} className="hover:bg-[#fafafa] transition-colors text-[#1d1d1f]">
                        <td className="p-3 text-center">
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${
                            h.type === 'in' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-500 border border-red-100'
                          }`}>
                            {h.type === 'in' ? <ArrowUp className="w-3.5 h-3.5" strokeWidth={3} /> : <ArrowDown className="w-3.5 h-3.5" strokeWidth={3} />}
                          </span>
                        </td>
                        <td className="p-3">
                          <div>
                            <span className="font-bold text-black">{h.productName}</span>
                            <span className="block font-mono text-[10px] text-zinc-500 mt-0.5">{h.productCode}</span>
                          </div>
                        </td>
                        <td className="p-3 text-center whitespace-nowrap font-extrabold text-sm">
                          <span className={h.type === 'in' ? 'text-emerald-600' : 'text-red-500'}>
                            {h.type === 'in' ? '+' : '-'}{h.qty} ชิ้น
                          </span>
                        </td>
                        <td className="p-3 text-center whitespace-nowrap font-semibold text-zinc-650 text-xs">
                          {h.stockBefore} ชิ้น → {h.stockAfter} ชิ้น
                        </td>
                        <td className="p-3">
                          <div>
                            <span className="font-bold text-zinc-800 text-xs">{h.reason}</span>
                            {h.note && (
                              <span className="block text-[10px] text-zinc-500 italic mt-0.5">"{h.note}"</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 whitespace-nowrap font-bold text-zinc-700">
                          {h.adjustedBy}
                        </td>
                        <td className="p-3 whitespace-nowrap font-mono text-zinc-500 text-xs">
                          {new Date(h.timestamp).toLocaleString('th-TH', {
                            day: 'numeric',
                            month: 'short',
                            year: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Product Confirmation Modal */}
      {productToDelete && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print animate-fade-in">
          <div onClick={() => setProductToDelete(null)} className="absolute inset-0 bg-black/15 backdrop-blur-xs" />
          <div className="relative bg-white rounded-3xl border border-[#d2d2d7]/50 max-sm:w-full max-w-sm w-full p-6 shadow-lg space-y-4.5 z-10 animate-scale-in text-[#1d1d1f]">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-650">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h2 className="font-bold text-sm uppercase tracking-wide">ยืนยันลบรายการสินค้า?</h2>
            </div>
            <div className="flex gap-2.5 pt-2 text-xs font-semibold">
              <button
                onClick={() => setProductToDelete(null)}
                className="flex-1 py-2.5 border border-[#d2d2d7] text-[#1d1d1f] rounded-full hover:bg-[#f5f5f7] transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  const deletedName = productToDelete.name;
                  onDeleteProduct(productToDelete.id);
                  setProductToDelete(null);
                  setAlertPopup({
                    type: 'success-delete',
                    title: 'ลบรายการสินค้าสำเร็จ!',
                    message: `ลบสินค้า "${deletedName}" ออกจากคลังสินค้าเรียบร้อยแล้ว!`
                  });
                }}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors cursor-pointer"
              >
                ลบสินค้า
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Product Form Modal (Beautiful Pop-up Modal) */}
      {showForm && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 no-print animate-fade-in">
          <div 
            onClick={() => {
              if (editProduct) {
                onCancelEdit();
              } else {
                resetForm();
                setShowForm(false);
              }
            }} 
            className="absolute inset-0 bg-black/20 backdrop-blur-md transition-opacity animate-fade-in" 
          />

          <div className="relative bg-white rounded-3xl border border-[#d2d2d7]/40 shadow-2xl max-w-4xl w-full max-h-[90vh] md:max-h-[85vh] flex flex-col z-10 animate-scale-in overflow-hidden">
            <div className="px-6 py-5 border-b border-[#e8e8ed] flex items-center justify-between flex-shrink-0 bg-white">
              <div>
                <h3 className="text-lg font-bold text-[#1d1d1f] tracking-tight">
                  {editProduct ? 'แก้ไขรายละเอียดสินค้า' : 'เพิ่มสินค้าใหม่ลงในระบบ'}
                </h3>
                <p className="text-xs text-[#555557] mt-1">
                  {editProduct ? 'ปรับปรุงข้อมูลการลงทะเบียนสินค้าที่มีอยู่ในระบบ PIM' : 'กรอกข้อมูลรายละเอียดสินค้าด้านล่างเพื่อเพิ่มสินค้าชิ้นใหม่เข้าสู่คลังระบบ'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (editProduct) {
                    onCancelEdit();
                  } else {
                    resetForm();
                    setShowForm(false);
                  }
                }}
                className="p-2 rounded-xl text-[#555557] hover:bg-[#f5f5f7] hover:text-black transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 p-4 bg-[#f5f5f7]/40">
              <form id="product-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 min-w-0 space-y-4">
                  <div className="bg-white p-4.5 rounded-2xl border border-[#d2d2d7]/50 shadow-xs space-y-4">
                    {errorMsg && (
                      <div className="p-3.5 text-sm bg-red-50 text-red-600 border border-red-100/50 rounded-xl animate-fade-in">
                        {errorMsg}
                      </div>
                    )}
                    <div className="border-b border-[#f5f5f7] pb-3.5">
                      <h3 className="text-xs font-extrabold text-[#1d1d1f] uppercase tracking-wider mb-2.5">ข้อมูลทั่วไปของสินค้า</h3>
                      <div className="space-y-3.5">
                        {/* แถว 1: รหัสสินค้า และ รหัสบาร์โค้ด */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="min-w-0">
                            <label className="form-label min-h-[28px] flex items-end pb-1">รหัสสินค้า<span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              value={code}
                              onChange={(e) => setCode(e.target.value)}
                              className="form-input min-w-0 bg-[#f5f5f7] font-mono focus:bg-white"
                            />
                          </div>
                          <div className="min-w-0">
                            <label className="form-label min-h-[28px] flex items-end pb-1">รหัสบาร์โค้ด<span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              value={barcode}
                              onChange={(e) => setBarcode(e.target.value)}
                              className="form-input min-w-0 bg-[#f5f5f7] focus:bg-white"
                            />
                          </div>
                        </div>

                        {/* แถว 2: ชื่อสินค้า */}
                        <div className="min-w-0">
                          <label className="form-label min-h-[28px] flex items-end pb-1">ชื่อสินค้าผลิตภัณฑ์<span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="form-input min-w-0 bg-[#f5f5f7] focus:bg-white"
                          />
                        </div>

                        {/* แถว 3: เลือกหมวดหมู่กับแบรนด์ */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="min-w-0">
                            <label className="form-label min-h-[28px] flex items-end pb-1">หมวดหมู่สินค้า<span className="text-red-500">*</span></label>
                            <select
                              value={category}
                              onChange={handleCategorySelectChange}
                              className="form-input min-w-0 bg-[#f5f5f7] text-zinc-800 focus:bg-white"
                            >
                              {currentUser?.role !== 'user' && (
                                <option value="ADD_NEW">+ เพิ่มหมวดหมู่สินค้า</option>
                              )}
                              {categories.map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                              {category && !categories.includes(category) && (
                                <option value={category}>{category} (ใหม่)</option>
                              )}
                            </select>
                          </div>
                          <div className="min-w-0">
                            <label className="form-label min-h-[28px] flex items-end pb-1">แบรนด์สินค้า<span className="text-red-500">*</span></label>
                            <select
                              value={brand}
                              onChange={handleBrandSelectChange}
                              className="form-input min-w-0 bg-[#f5f5f7] text-zinc-800 focus:bg-white"
                            >
                              {currentUser?.role !== 'user' && (
                                <option value="ADD_NEW">+ เพิ่มแบรนด์สินค้า</option>
                              )}
                              {brands.map(b => (
                                <option key={b} value={b}>{b}</option>
                              ))}
                              {brand && !brands.includes(brand) && (
                                <option value={brand}>{brand} (ใหม่)</option>
                              )}
                            </select>
                          </div>
                        </div>

                        {/* แถว 4: ขนาด และน้ำหนัก */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="min-w-0">
                            <label className="form-label min-h-[28px] flex items-end pb-1">ขนาด<span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              value={size}
                              onChange={(e) => setSize(e.target.value)}
                              className="form-input min-w-0 bg-[#f5f5f7] focus:bg-white"
                            />
                          </div>
                          <div className="min-w-0">
                            <label className="form-label min-h-[28px] flex items-end pb-1">น้ำหนัก<span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              value={weight}
                              onChange={(e) => setWeight(e.target.value)}
                              className="form-input min-w-0 bg-[#f5f5f7] focus:bg-white"
                            />
                          </div>
                        </div>

                        {/* แถว 5: หมายเลข อย. และ มอก. */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="min-w-0">
                            <label className="form-label min-h-[28px] flex items-end pb-1">หมายเลข อย.<span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              value={fdaNumber}
                              onChange={(e) => setFdaNumber(e.target.value)}
                              placeholder="เช่น 10-1-6100012345"
                              className="form-input min-w-0 bg-[#f5f5f7] focus:bg-white"
                            />
                          </div>
                          <div className="min-w-0">
                            <label className="form-label min-h-[28px] flex items-end pb-1">มอก.<span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              value={tisiNumber}
                              onChange={(e) => setTisiNumber(e.target.value)}
                              placeholder="เช่น มอก. 1985-2549"
                              className="form-input min-w-0 bg-[#f5f5f7] focus:bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="border-b border-[#f5f5f7] pb-3.5">
                      <h3 className="text-xs font-extrabold text-[#1d1d1f] uppercase tracking-wider mb-2.5">ข้อมูลราคาและคลังสินค้า</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
                        <div className="min-w-0">
                          <label className="form-label min-h-[44px] flex items-end pb-1">ราคาขายส่ง<span className="text-red-500">*</span></label>
                          <input
                            type="number"
                            min="0"
                            value={wholesalePrice}
                            onChange={(e) => setWholesalePrice(e.target.value)}
                            className="form-input min-w-0 bg-[#f5f5f7] focus:bg-white"
                          />
                        </div>
                        <div className="min-w-0">
                          <label className="form-label min-h-[44px] flex items-end pb-1">ราคาขายปลีก<span className="text-red-500">*</span></label>
                          <input
                            type="number"
                            min="0"
                            value={retailPrice}
                            onChange={(e) => setRetailPrice(e.target.value)}
                            className="form-input min-w-0 bg-[#f5f5f7] focus:bg-white text-black"
                          />
                        </div>
                        <div className="min-w-0">
                          <label className="form-label min-h-[44px] flex items-end pb-1">ค่าฝา<span className="text-red-500">*</span></label>
                          <input
                            type="number"
                            min="0"
                            value={capFee}
                            onChange={(e) => setCapFee(e.target.value)}
                            className="form-input min-w-0 bg-[#f5f5f7] focus:bg-white text-black"
                          />
                        </div>
                        <div className="min-w-0">
                          <label className="form-label min-h-[44px] flex items-end pb-1">จำนวนสต็อก</label>
                          <input
                            type="number"
                            min="0"
                            value={stock}
                            readOnly
                            disabled
                            className="form-input min-w-0 opacity-50 cursor-not-allowed bg-zinc-100 border-[#d2d2d7] text-zinc-500 select-none"
                          />
                          <span className="text-[10px] text-zinc-500 block mt-1 font-medium leading-tight">
                            {!editProduct
                              ? '* ปรับสต็อกได้ที่หน้า "จัดการสต็อก" หลังบันทึกสินค้าแล้ว'
                              : '* ปรับสต็อกผ่านหน้า "จัดการสต็อก" เท่านั้น'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <label className="form-label min-h-[44px] flex items-end pb-1">สถานะระบบ</label>
                          <div className="grid grid-cols-2 gap-1 bg-[#f5f5f7] border border-[#d2d2d7] p-0.5 rounded-xl h-[42px] items-center">
                            <button
                              type="button"
                              onClick={() => setStatus('Active')}
                              className={`py-1 text-xs font-bold rounded-lg transition-all cursor-pointer h-full ${
                                status === 'Active' 
                                  ? 'bg-[#10b981] text-white shadow-xs' 
                                  : 'text-zinc-650 hover:text-[#10b981]'
                              }`}
                            >
                              เปิด
                            </button>
                            <button
                              type="button"
                              onClick={() => setStatus('Inactive')}
                              className={`py-1 text-xs font-bold rounded-lg transition-all cursor-pointer h-full ${
                                status === 'Inactive' 
                                  ? 'bg-[#71717a] text-white shadow-xs' 
                                  : 'text-zinc-650 hover:text-[#71717a]'
                              }`}
                            >
                              ปิด
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xs font-extrabold text-[#1d1d1f] uppercase tracking-wider mb-2.5">ข้อมูลประกอบการขายและการตลาด</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="min-w-0">
                          <label className="form-label min-h-[28px] flex items-end pb-1">รายละเอียดสินค้า<span className="text-red-500">*</span></label>
                          <textarea
                            rows="2"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="form-input min-w-0 bg-[#f5f5f7] focus:bg-white resize-none"
                          />
                        </div>
                        <div className="min-w-0">
                          <label className="form-label min-h-[28px] flex items-end pb-1">จุดเด่นสินค้า<span className="text-red-500">*</span></label>
                          <textarea
                            rows="2"
                            value={highlights}
                            onChange={(e) => setHighlights(e.target.value)}
                            className="form-input min-w-0 bg-[#f5f5f7] focus:bg-white resize-none"
                          />
                        </div>
                        <div className="min-w-0">
                          <label className="form-label min-h-[28px] flex items-end pb-1">วิธีใช้<span className="text-red-500">*</span></label>
                          <textarea
                            rows="2"
                            value={howToUse}
                            onChange={(e) => setHowToUse(e.target.value)}
                            className="form-input min-w-0 bg-[#f5f5f7] focus:bg-white resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 min-w-0">
                  <div className="bg-white p-4.5 rounded-2xl border border-[#d2d2d7]/50 shadow-xs space-y-3.5">
                    <div>
                      <h3 className="text-xs font-bold text-[#1d1d1f] uppercase tracking-wide">ใส่ภาพประกอบสินค้า<span className="text-red-500">*</span></h3>
                    </div>
                    <div className="relative aspect-video rounded-xl bg-[#f5f5f7] border-2 border-dashed border-[#d2d2d7] flex flex-col items-center justify-center overflow-hidden group">
                      {image ? (
                        <>
                          <img src={image} alt="Preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setImage('')}
                            className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black text-white rounded-full transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <div className="p-4 text-center space-y-2.5">
                          <div className="w-10 h-10 rounded-full bg-white border border-[#d2d2d7]/50 flex items-center justify-center text-zinc-400 mx-auto">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                          <div className="text-xs text-zinc-500 font-medium">
                            ลากรูปภาพมาวางที่นี่ หรือ
                            <label className="text-[#0071e3] hover:underline cursor-pointer ml-1">
                              <span>เรียกดูไฟล์</span>
                              <input 
                                type="file" 
                                accept="image/*" 
                                onChange={handleImageUpload} 
                                className="hidden" 
                              />
                            </label>
                          </div>
                          <p className="text-xs text-[#555557]">ขนาดไฟล์แนะนำไม่เกิน 2MB</p>
                        </div>
                      )}
                    </div>

                    {/* Quick Presets Picker */}
                    <div className="space-y-2.5 pt-2 border-t border-[#f5f5f7]">
                      <span className="text-xs font-bold text-[#555557] block uppercase">เลือกรูปตัวอย่างด่วน:</span>
                      <div className="grid grid-cols-3 gap-2">
                        {PRESET_IMAGES.map((preset) => (
                          <button
                            key={preset.url}
                            type="button"
                            onClick={() => setImage(preset.url)}
                            className={`
                              relative aspect-square rounded-lg overflow-hidden border bg-zinc-50 transition-all cursor-pointer
                              ${image === preset.url ? 'border-2 border-[#0071e3] ring-2 ring-[#0071e3]/10' : 'border-[#d2d2d7]'}
                            `}
                            title={preset.label}
                          >
                            <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Edit Remark — required when editing */}
                  {editProduct && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2 mt-2">
                      <label className="text-xs font-extrabold text-amber-800 uppercase tracking-wider block">
                        หมายเหตุการแก้ไข <span className="text-red-500">*</span>
                        <span className="normal-case font-normal text-amber-600 ml-1">(บังคับกรอก)</span>
                      </label>
                      <textarea
                        rows="3"
                        value={editRemark}
                        onChange={(e) => setEditRemark(e.target.value)}
                        placeholder="ระบุเหตุผลที่แก้ไขข้อมูลสินค้านี้..."
                        className="w-full px-3 py-2.5 bg-white border border-amber-300 rounded-xl text-sm text-[#1d1d1f] focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all resize-none placeholder-amber-400"
                      />
                    </div>
                  )}
                </div>
              </form>
            </div>

            {/* Sticky Actions Footer */}
            <div className="px-6 py-4 border-t border-[#e8e8ed] bg-white flex justify-end gap-2.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (editProduct) {
                    onCancelEdit();
                  } else {
                    resetForm();
                    setShowForm(false);
                  }
                }}
                className="px-5 py-2.5 border border-[#d2d2d7] text-[#1d1d1f] bg-white rounded-xl hover:bg-[#f5f5f7] font-semibold text-xs transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                form="product-form"
                className="px-6 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>บันทึกข้อมูลสินค้า</span>
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* Alert Pop-up Modal (Success/Error) */}
      {alertPopup && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 no-print animate-fade-in">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/25 backdrop-blur-xs" 
            onClick={() => {
              if (alertPopup.type === 'error') setAlertPopup(null);
            }} 
          />
          
          {/* Modal Container */}
          <div className="relative bg-white rounded-3xl border border-[#d2d2d7]/50 max-w-sm w-full p-6 shadow-2xl z-10 animate-scale-in text-[#1d1d1f] text-center space-y-4">
            {alertPopup.type.startsWith('success') ? (
              <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mx-auto animate-scale-in">
                <Check className="w-7 h-7" />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 mx-auto">
                <AlertCircle className="w-7 h-7" />
              </div>
            )}

            <div className="space-y-1.5">
              <h3 className="font-bold text-base tracking-tight">{alertPopup.title}</h3>
              <p className="text-xs text-[#555557] leading-relaxed">{alertPopup.message}</p>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  if (alertPopup.type === 'success') {
                    onSaveProduct(alertPopup.data);
                    resetForm();
                  }
                  setAlertPopup(null);
                }}
                className={`w-full py-2.5 rounded-full text-xs font-semibold text-white transition-colors cursor-pointer ${
                  alertPopup.type.startsWith('success')
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-xs'
                    : 'bg-rose-600 hover:bg-rose-700 shadow-xs'
                }`}
              >
                ตกลง
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    
      {/* Product Detail Centered Pop-up Modal */}
      {drawerProduct && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 no-print animate-fade-in">
          <div 
            onClick={() => setDrawerProduct(null)}
            className="absolute inset-0 bg-black/20 backdrop-blur-md transition-opacity"
          />

          <div className="relative bg-white rounded-3xl border border-[#d2d2d7]/40 shadow-2xl max-w-lg w-full max-h-[calc(100vh_-_3rem)] md:max-h-[calc(100vh_-_4rem)] flex flex-col z-10 animate-scale-in overflow-hidden text-[#1d1d1f]">
            {/* Header */}
            <div className="p-5 border-b border-[#e8e8ed] flex items-center justify-between flex-shrink-0">
              <div>
                <span className="text-xs font-mono text-[#555557] tracking-wider font-semibold uppercase">{drawerProduct.code}</span>
                <h3 className="font-bold text-[#1d1d1f] text-sm mt-0.5 uppercase tracking-wide">รายละเอียดของสินค้า</h3>
              </div>
              <button 
                onClick={() => setDrawerProduct(null)}
                className="p-2 text-zinc-400 hover:text-black rounded-lg hover:bg-[#f5f5f7] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable details */}
            <div className="flex-1 overflow-y-auto min-h-0 p-5 space-y-5 text-xs text-[#1d1d1f]">
              {/* Product Photo */}
              <div className="aspect-video w-full rounded-xl overflow-hidden border border-[#d2d2d7]/40 bg-[#f5f5f7] flex-shrink-0">
                <img 
                  src={drawerProduct.image} 
                  alt={drawerProduct.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* General Metadata */}
              <div className="bg-[#f5f5f7] p-4 rounded-xl border border-[#d2d2d7]/40 space-y-2.5">
                <div className="flex justify-between border-b border-[#d2d2d7]/20 pb-1.5">
                  <span className="text-zinc-800 font-bold">แบรนด์</span>
                  <span className="font-extrabold uppercase text-black">{drawerProduct.brand}</span>
                </div>
                <div className="flex justify-between border-b border-[#d2d2d7]/20 pb-1.5">
                  <span className="text-zinc-800 font-bold">หมวดหมู่สินค้า</span>
                  <span className="font-extrabold text-black">{drawerProduct.category}</span>
                </div>
                <div className="flex justify-between border-b border-[#d2d2d7]/20 pb-1.5">
                  <span className="text-zinc-800 font-bold">รหัสสินค้า / SKU</span>
                  <span className="font-extrabold text-black">{drawerProduct.code}</span>
                </div>
                <div className="flex justify-between border-b border-[#d2d2d7]/20 pb-1.5">
                  <span className="text-zinc-800 font-bold">รหัสบาร์โค้ด</span>
                  <span className="font-extrabold text-black">{drawerProduct.barcode || '-'}</span>
                </div>
                <div className="flex justify-between border-b border-[#d2d2d7]/20 pb-1.5">
                  <span className="text-zinc-800 font-bold">ขนาด</span>
                  <span className="font-extrabold text-black">{drawerProduct.size || '-'}</span>
                </div>
                <div className="flex justify-between border-b border-[#d2d2d7]/20 pb-1.5">
                  <span className="text-zinc-800 font-bold">น้ำหนัก</span>
                  <span className="font-extrabold text-black">{drawerProduct.weight || '-'}</span>
                </div>
                <div className="flex justify-between border-b border-[#d2d2d7]/20 pb-1.5">
                  <span className="text-zinc-800 font-bold">หมายเลข อย.</span>
                  <span className="font-extrabold text-black">{drawerProduct.fdaNumber || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-800 font-bold">มอก.</span>
                  <span className="font-extrabold text-black">{drawerProduct.tisiNumber || '-'}</span>
                </div>
              </div>

              {/* Pricing & Stock Details */}
              <div className="bg-[#f5f5f7] p-4 rounded-xl border border-[#d2d2d7]/40 space-y-2.5">
                <div className="flex justify-between border-b border-[#d2d2d7]/20 pb-1.5">
                  <span className="text-zinc-800 font-bold">ราคาขายส่ง</span>
                  <span className="font-extrabold text-black">{(drawerProduct.wholesalePrice || 0).toLocaleString()} บาท</span>
                </div>
                <div className="flex justify-between border-b border-[#d2d2d7]/20 pb-1.5">
                  <span className="text-zinc-800 font-bold">ราคาขายปลีก</span>
                  <span className="font-extrabold text-blue-700 text-[13px]">{(drawerProduct.retailPrice || 0).toLocaleString()} บาท</span>
                </div>
                <div className="flex justify-between border-b border-[#d2d2d7]/20 pb-1.5">
                  <span className="text-zinc-800 font-bold">ค่าฝา</span>
                  <span className="font-extrabold text-black">{(drawerProduct.capFee || 0).toLocaleString()} บาท</span>
                </div>
                <div className="flex justify-between border-b border-[#d2d2d7]/20 pb-1.5">
                  <span className="text-zinc-800 font-bold">จำนวนคลังคงเหลือ</span>
                  <span className={`font-extrabold ${drawerProduct.stock <= 10 ? 'text-red-700 text-[13px]' : 'text-black'}`}>{drawerProduct.stock} ชิ้น</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-800 font-bold">สถานะระบบ</span>
                  <span className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border ${
                    drawerProduct.status === 'Active' 
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                      : 'bg-zinc-200 text-zinc-800 border-zinc-400'
                  }`}>{drawerProduct.status === 'Active' ? 'เปิดใช้งาน (Active)' : 'ปิดใช้งาน (Inactive)'}</span>
                </div>
              </div>

              {/* Custom specs */}
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-zinc-800 block uppercase tracking-wide">ชื่อผลิตภัณฑ์สินค้า</label>
                  <div className="text-black font-extrabold text-sm leading-normal mt-1">{drawerProduct.name}</div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-800 block uppercase tracking-wide">จุดเด่นสินค้า</label>
                  <div className="text-xs text-zinc-900 font-semibold leading-relaxed bg-[#f5f5f7] p-3 rounded-xl border border-[#d2d2d7]/40 whitespace-pre-wrap mt-1">
                    {drawerProduct.highlights || '-'}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-800 block uppercase tracking-wide">วิธีใช้</label>
                  <div className="text-xs text-zinc-900 font-semibold leading-relaxed bg-[#f5f5f7] p-3 rounded-xl border border-[#d2d2d7]/40 whitespace-pre-wrap mt-1">
                    {drawerProduct.howToUse || '-'}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-800 block uppercase tracking-wide">รายละเอียดสินค้า</label>
                  <div className="text-xs text-zinc-900 font-semibold leading-relaxed bg-[#f5f5f7] p-3 rounded-xl border border-[#d2d2d7]/40 whitespace-pre-wrap mt-1">
                    {drawerProduct.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
                  </div>
                </div>
              </div>

              {/* Audit Logs */}
              <div className="pt-2 text-[10px] text-zinc-700 font-semibold space-y-1 bg-[#f5f5f7] p-3 rounded-xl border border-[#d2d2d7]/40">
                <div>• วันที่เพิ่มข้อมูล: {drawerProduct.createdAt || '-'}</div>
                <div>• วันที่แก้ไขล่าสุด: {drawerProduct.updatedAt || '-'}</div>
                <div>• ผู้บันทึกข้อมูลล่าสุด: {drawerProduct.updatedBy || 'ไม่ระบุ'}</div>
              </div>
            </div>

            {/* Sticky Actions */}
            <div className="p-4 border-t border-[#e8e8ed] bg-[#f5f5f7] flex gap-2 flex-shrink-0">
              <button
                onClick={() => handleCopyMarketingContent(drawerProduct)}
                className={`w-full py-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  copiedId === drawerProduct.id 
                    ? 'bg-black text-white border-black shadow-xs' 
                    : 'bg-white hover:bg-[#f5f5f7] text-[#1d1d1f] border-[#d2d2d7]'
                }`}
              >
                {copiedId === drawerProduct.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedId === drawerProduct.id ? 'คัดลอกข้อมูลแล้ว!' : 'คัดลอกสำหรับงานขาย'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Quick Add Brand/Category Modal */}
      {quickAddModal.isOpen && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 no-print animate-fade-in">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/25 backdrop-blur-xs" 
            onClick={() => setQuickAddModal({ isOpen: false, type: 'brand', value: '' })} 
          />
          
          {/* Modal Container */}
          <div className="relative bg-white rounded-3xl border border-[#d2d2d7]/50 max-w-sm w-full p-6 shadow-2xl z-10 animate-scale-in text-[#1d1d1f] space-y-4">
            <div className="space-y-1.5 text-center">
              <h3 className="font-bold text-base tracking-tight">
                {quickAddModal.type === 'brand' ? 'ระบุแบรนด์สินค้าใหม่' : 'ระบุหมวดหมู่สินค้าใหม่'}
              </h3>
              <p className="text-xs text-[#555557] leading-relaxed">
                {quickAddModal.type === 'brand' 
                  ? 'กรุณากรอกชื่อแบรนด์สินค้าใหม่เพื่อใช้ในฟอร์มนี้' 
                  : 'กรุณากรอกชื่อหมวดหมู่สินค้าใหม่เพื่อใช้ในฟอร์มนี้'}
              </p>
            </div>

            <div>
              <input
                type="text"
                value={quickAddModal.value}
                onChange={(e) => setQuickAddModal(prev => ({ ...prev, value: e.target.value }))}
                placeholder={quickAddModal.type === 'brand' ? 'ระบุชื่อแบรนด์ (เช่น Phanvadee)' : 'ระบุชื่อหมวดหมู่ (เช่น Treatment)'}
                className="w-full px-3.5 py-2.5 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-sm text-[#1d1d1f] focus:outline-hidden focus:border-[#0071e3] focus:bg-white transition-all placeholder-[#555557]"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    // Trigger save (locally, not persistently yet)
                    const trimmed = quickAddModal.value.trim();
                    if (!trimmed) {
                      alert('กรุณากรอกชื่อข้อมูล');
                      return;
                    }

                    if (quickAddModal.type === 'brand') {
                      if (brands.includes(trimmed)) {
                        alert('แบรนด์นี้มีอยู่ในระบบแล้ว');
                      }
                      setBrand(trimmed);
                    } else {
                      if (categories.includes(trimmed)) {
                        alert('หมวดหมู่นี้มีอยู่ในระบบแล้ว');
                      }
                      setCategory(trimmed);
                    }
                    setQuickAddModal({ isOpen: false, type: 'brand', value: '' });
                  } else if (e.key === 'Escape') {
                    setQuickAddModal({ isOpen: false, type: 'brand', value: '' });
                  }
                }}
              />
            </div>
            <div className="text-[10px] text-zinc-400 text-center font-medium">
              กด <kbd className="px-1.5 py-0.5 bg-zinc-100 border rounded-md text-zinc-500 font-mono">Enter</kbd> เพื่อนำไปเลือก หรือ คลิกนอกหน้าต่างเพื่อยกเลิก
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Adjust Stock Modal */}
      {adjustProduct && createPortal(
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 no-print animate-fade-in">
          {/* Backdrop */}
          <div onClick={() => setAdjustProduct(null)} className="absolute inset-0 bg-black/20 backdrop-blur-xs transition-opacity" />
          
          <div className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden z-10 animate-scale-in text-[#1d1d1f]">
            {/* Modal Header */}
            <div className={`px-5 pt-5 pb-4 border-b border-[#f0f0f2] ${adjustMode === 'in' ? 'bg-emerald-50' : 'bg-red-50'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${adjustMode === 'in' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                    {adjustMode === 'in' ? <ArrowUp size={18} className="text-white" strokeWidth={2.5} /> : <ArrowDown size={18} className="text-white" strokeWidth={2.5} />}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{adjustMode === 'in' ? 'เพิ่มสต็อก' : 'ลดสต็อก'}</p>
                    <p className="text-[11px] text-zinc-550 truncate max-w-[220px]">{adjustProduct.name}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setAdjustProduct(null)} className="p-1.5 rounded-lg hover:bg-black/10 transition-colors cursor-pointer">
                  <X size={16} className="text-zinc-500" />
                </button>
              </div>
              {/* Mode Toggle */}
              <div className="mt-3 grid grid-cols-2 gap-1 bg-white/70 border border-[#d2d2d7] p-0.5 rounded-xl">
                <button
                  type="button"
                  onClick={() => { setAdjustMode('in'); setSelectedReason(''); setAdjustQty(''); }}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${adjustMode === 'in' ? 'bg-emerald-500 text-white shadow-xs' : 'text-zinc-500 hover:text-emerald-600'}`}
                >
                  <ArrowUp size={11} className="inline mr-1" strokeWidth={2.5} />เพิ่มสต็อก
                </button>
                <button
                  type="button"
                  onClick={() => { setAdjustMode('out'); setSelectedReason(''); setAdjustQty(''); }}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${adjustMode === 'out' ? 'bg-red-500 text-white shadow-xs' : 'text-zinc-500 hover:text-red-650'}`}
                >
                  <ArrowDown size={11} className="inline mr-1" strokeWidth={2.5} />ลดสต็อก
                </button>
              </div>
            </div>

            <div className="px-5 py-4 flex flex-col gap-4">
              {/* Current stock info */}
              <div className="flex items-center justify-between bg-[#f5f5f7] rounded-xl px-4 py-3">
                <span className="text-xs text-zinc-500 font-medium">สต็อกปัจจุบัน</span>
                <span className={`text-lg font-extrabold ${adjustProduct.stock <= 10 ? 'text-amber-600' : 'text-[#1d1d1f]'}`}>
                  {adjustProduct.stock.toLocaleString()} ชิ้น
                </span>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-bold mb-1.5">
                  จำนวนที่ต้องการ{adjustMode === 'in' ? 'เพิ่ม' : 'ลด'} <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustQty(q => Math.max(1, (parseInt(q) || 0) - 1).toString())}
                    className="w-9 h-9 rounded-xl bg-[#f5f5f7] border border-[#d2d2d7] flex items-center justify-center text-zinc-650 hover:bg-zinc-200 transition-colors cursor-pointer font-bold text-lg"
                  >−</button>
                  <input
                    type="number"
                    min="1"
                    value={adjustQty}
                    onChange={e => setAdjustQty(e.target.value)}
                    placeholder="0"
                    className="flex-1 text-center text-lg font-bold py-2 rounded-xl border border-[#d2d2d7] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] text-[#1d1d1f]"
                  />
                  <button
                    type="button"
                    onClick={() => setAdjustQty(q => ((parseInt(q) || 0) + 1).toString())}
                    className="w-9 h-9 rounded-xl bg-[#f5f5f7] border border-[#d2d2d7] flex items-center justify-center text-zinc-650 hover:bg-zinc-200 transition-colors cursor-pointer font-bold text-lg"
                  >+</button>
                </div>
                {adjustQty && parseInt(adjustQty) > 0 && (
                  <p className={`text-[11px] mt-1.5 font-semibold text-center ${adjustMode === 'out' && parseInt(adjustQty) > adjustProduct.stock ? 'text-red-500' : 'text-zinc-500'}`}>
                    {adjustMode === 'in'
                      ? `คงเหลือหลังเพิ่ม: ${adjustProduct.stock + (parseInt(adjustQty) || 0)} ชิ้น`
                      : parseInt(adjustQty) > adjustProduct.stock
                        ? `⚠ เกินสต็อกที่มี (${adjustProduct.stock} ชิ้น)`
                        : `คงเหลือหลังลด: ${adjustProduct.stock - (parseInt(adjustQty) || 0)} ชิ้น`}
                  </p>
                )}
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold mb-1.5">
                  เหตุผล <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {REASON_PRESETS[adjustMode].map(r => (
                    <button
                      key={r.label}
                      type="button"
                      onClick={() => setSelectedReason(r.label)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                        selectedReason === r.label
                          ? adjustMode === 'in'
                            ? 'bg-emerald-500 text-white border-emerald-500'
                            : 'bg-red-500 text-white border-red-500'
                          : 'bg-white text-zinc-650 border-[#d2d2d7] hover:border-zinc-400'
                      }`}
                    >
                      <i className={`${r.icon} text-[10px]`}></i>
                      {r.label}
                    </button>
                  ))}
                </div>
                {selectedReason === 'อื่นๆ' && (
                  <input
                    type="text"
                    placeholder="ระบุเหตุผล..."
                    value={customReason}
                    onChange={e => setCustomReason(e.target.value)}
                    className="mt-2 w-full px-3 py-2 text-xs rounded-xl border border-[#d2d2d7] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] text-[#1d1d1f]"
                  />
                )}
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-bold mb-1.5">หมายเหตุ (ถ้ามี)</label>
                <input
                  type="text"
                  placeholder="เช่น เลขที่ใบส่งของ, เลขออเดอร์..."
                  value={adjustNote}
                  onChange={e => setAdjustNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#d2d2d7] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] text-[#1d1d1f]"
                />
              </div>

              {/* Confirm Button */}
              <button
                type="button"
                onClick={handleConfirmAdjustStock}
                className={`w-full py-3 rounded-xl font-bold text-sm text-white transition-colors cursor-pointer ${
                  adjustMode === 'in' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-650'
                }`}
              >
                {adjustMode === 'in' ? `ยืนยันเพิ่มสต็อก` : `ยืนยันลดสต็อก`}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
  </div>
  );
}
