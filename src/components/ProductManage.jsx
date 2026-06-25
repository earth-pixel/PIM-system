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
  ChevronDown
} from 'lucide-react';
import { exportShopee, exportLazada, exportTikTok } from '../utils/exportUtils';
import { 
  autoDetectPlatformAndImport
} from '../utils/marketplaceIO';
import ExcelJS from 'exceljs';

const PRESET_IMAGES = [
  { url: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?q=80&w=400&auto=format&fit=crop', label: 'Pomade Waxes' },
  { url: 'https://images.unsplash.com/photo-1595853035070-59a39fe84de3?q=80&w=400&auto=format&fit=crop', label: 'Color Cream' },
  { url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=400&auto=format&fit=crop', label: 'Hair Dryer' },
  { url: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?q=80&w=400&auto=format&fit=crop', label: 'Matte Clay' },
  { url: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?q=80&w=400&auto=format&fit=crop', label: 'Hair Mask' },
  { url: 'https://images.unsplash.com/photo-1527799863830-53a84e6ad82b?q=80&w=400&auto=format&fit=crop', label: 'Scissors Set' }
];

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
  onImportProducts,
  onClearAllProducts = () => {},
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
  const [packageLength, setPackageLength] = useState('');
  const [packageWidth, setPackageWidth] = useState('');
  const [packageHeight, setPackageHeight] = useState('');
  const [platform, setPlatform] = useState('');
  
  const [errorMsg, setErrorMsg] = useState('');

  // Marketplace Import Modals States
  const [importPlatform, setImportPlatform] = useState('shopee');
  const [parsedProducts, setParsedProducts] = useState([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');

  // Custom Excel / Google Sheets Import States
  const [customWorkbook, setCustomWorkbook] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [selectedSheetName, setSelectedSheetName] = useState('');
  const [sheetHeaders, setSheetHeaders] = useState([]);
  const [columnMapping, setColumnMapping] = useState({
    code: '',
    barcode: '',
    name: '',
    brand: '',
    category: '',
    wholesalePrice: '',
    retailPrice: '',
    capFee: '',
    description: '',
    highlights: '',
    howToUse: '',
    size: '',
    weight: '',
    fdaNumber: '',
    tisiNumber: '',
    packageLength: '',
    packageWidth: '',
    packageHeight: ''
  });

  const getCellValue = (cell) => {
    if (!cell) return '';
    if (cell.value && typeof cell.value === 'object') {
      if (cell.value.result !== undefined) {
        return String(cell.value.result);
      }
      if (cell.value.richText) {
        return cell.value.richText.map(t => t.text || '').join('');
      }
      return '';
    }
    return String(cell.value !== null && cell.value !== undefined ? cell.value : '');
  };

  const handleSelectSheet = (sheetName, workbookInstance = customWorkbook) => {
    if (!workbookInstance) return;
    setSelectedSheetName(sheetName);
    
    const worksheet = workbookInstance.getWorksheet(sheetName);
    if (!worksheet) {
      setSheetHeaders([]);
      return;
    }
    
    // Find first row containing headers (usually row 1)
    let headerRow = null;
    worksheet.eachRow((row, rowNumber) => {
      if (!headerRow && row.values.some(v => v !== null && v !== '')) {
        headerRow = row;
      }
    });
    
    if (!headerRow) {
      setSheetHeaders([]);
      setImportError('ไม่พบข้อมูลหรือหัวตารางในแผ่นงานนี้');
      return;
    }
    
    const headersList = [];
    headerRow.eachCell((cell, colNumber) => {
      headersList.push({
        colNumber,
        name: String(cell.value || '').trim()
      });
    });
    
    setSheetHeaders(headersList);
    
    // Auto map columns
    const newMapping = {
      code: '',
      barcode: '',
      name: '',
      brand: '',
      category: '',
      wholesalePrice: '',
      retailPrice: '',
      capFee: '',
      description: '',
      highlights: '',
      howToUse: '',
      size: '',
      weight: '',
      fdaNumber: '',
      tisiNumber: '',
      packageLength: '',
      packageWidth: '',
      packageHeight: ''
    };
    
    headersList.forEach(h => {
      const nameLower = h.name.toLowerCase();
      
      if (!newMapping.code && (nameLower === 'code' || nameLower === 'sku' || nameLower.includes('รหัส') || nameLower.includes('sku'))) {
        newMapping.code = String(h.colNumber);
      }
      if (!newMapping.barcode && (nameLower.includes('barcode') || nameLower.includes('บาร์โค้ด') || nameLower.includes('รหัสบาร์'))) {
        newMapping.barcode = String(h.colNumber);
      }
      if (!newMapping.name && (nameLower === 'name' || nameLower === 'title' || nameLower.includes('ชื่อ') || nameLower.includes('รายการ') || nameLower.includes('สินค้า'))) {
        newMapping.name = String(h.colNumber);
      }
      if (!newMapping.brand && (nameLower === 'brand' || nameLower.includes('แบรนด์') || nameLower.includes('ยี่ห้อ'))) {
        newMapping.brand = String(h.colNumber);
      }
      if (!newMapping.category && (nameLower === 'category' || nameLower.includes('หมวดหมู่') || nameLower.includes('ประเภท') || nameLower.includes('กลุ่มสินค้า'))) {
        newMapping.category = String(h.colNumber);
      }
      if (!newMapping.wholesalePrice && (nameLower.includes('wholesale') || nameLower.includes('ราคาส่ง') || nameLower.includes('ส่ง') || nameLower.includes('ราคาขายส่ง'))) {
        newMapping.wholesalePrice = String(h.colNumber);
      }
      if (!newMapping.retailPrice && (nameLower.includes('retail') || nameLower === 'price' || nameLower.includes('ปลีก') || nameLower.includes('ขายปลีก') || nameLower.includes('ราคาขายปลีก') || nameLower.includes('ราคาขาย') || nameLower.includes('ราคาปลีก'))) {
        newMapping.retailPrice = String(h.colNumber);
      }
      if (!newMapping.capFee && (nameLower.includes('cap') || nameLower.includes('ฝา') || nameLower.includes('ค่าฝา') || nameLower.includes('ค่าบริการฝา'))) {
        newMapping.capFee = String(h.colNumber);
      }
      if (!newMapping.description && (nameLower.includes('desc') || nameLower.includes('รายละเอียด') || nameLower.includes('ข้อมูล') || nameLower.includes('คำอธิบาย'))) {
        newMapping.description = String(h.colNumber);
      }
      if (!newMapping.highlights && (nameLower.includes('highlight') || nameLower.includes('จุดเด่น') || nameLower.includes('คำโปรย') || nameLower.includes('ไฮไลท์'))) {
        newMapping.highlights = String(h.colNumber);
      }
      if (!newMapping.howToUse && (nameLower.includes('use') || nameLower.includes('วิธีใช้') || nameLower.includes('วิธีใช้งาน'))) {
        newMapping.howToUse = String(h.colNumber);
      }
      if (!newMapping.size && (nameLower.includes('size') || nameLower.includes('ขนาด') || nameLower.includes('ปริมาตร') || nameLower.includes('ความจุ'))) {
        newMapping.size = String(h.colNumber);
      }
      if (!newMapping.weight && (nameLower.includes('weight') || nameLower.includes('น้ำหนัก') || nameLower.includes('กก') || nameLower.includes('g') || nameLower.includes('kg'))) {
        newMapping.weight = String(h.colNumber);
      }
      if (!newMapping.fdaNumber && (nameLower.includes('fda') || nameLower.includes('อย') || nameLower.includes('เลข อย') || nameLower.includes('ใบรับจด'))) {
        newMapping.fdaNumber = String(h.colNumber);
      }
      if (!newMapping.tisiNumber && (nameLower.includes('tisi') || nameLower.includes('มอก') || nameLower.includes('เลข มอก'))) {
        newMapping.tisiNumber = String(h.colNumber);
      }
      if (!newMapping.packageLength && (nameLower.includes('length') || nameLower.includes('ยาว') || nameLower.includes('ความยาวพัสดุ'))) {
        newMapping.packageLength = String(h.colNumber);
      }
      if (!newMapping.packageWidth && (nameLower.includes('width') || nameLower.includes('กว้าง') || nameLower.includes('ความกว้างพัสดุ'))) {
        newMapping.packageWidth = String(h.colNumber);
      }
      if (!newMapping.packageHeight && (nameLower.includes('height') || nameLower.includes('สูง') || nameLower.includes('ความสูงพัสดุ'))) {
        newMapping.packageHeight = String(h.colNumber);
      }
    });
    
    // Smart fallbacks for SKU (code) and Name if not auto-detected
    if (!newMapping.code && headersList.length > 0) {
      newMapping.code = String(headersList[0].colNumber);
    }
    if (!newMapping.name && headersList.length > 0) {
      const unusedHeader = headersList.find(h => 
        String(h.colNumber) !== newMapping.code && 
        String(h.colNumber) !== newMapping.barcode
      );
      if (unusedHeader) {
        newMapping.name = String(unusedHeader.colNumber);
      } else {
        newMapping.name = headersList.length > 1 ? String(headersList[1].colNumber) : String(headersList[0].colNumber);
      }
    }
    
    setColumnMapping(newMapping);
    setParsedProducts([]);
  };

  const handleCustomFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportLoading(true);
    setImportError('');
    setCustomWorkbook(null);
    setSheetNames([]);
    setSelectedSheetName('');
    setSheetHeaders([]);
    setParsedProducts([]);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      
      const names = workbook.worksheets.map(ws => ws.name);
      setCustomWorkbook(workbook);
      setSheetNames(names);
      if (names.length > 0) {
        handleSelectSheet(names[0], workbook);
      }
    } catch (err) {
      console.error(err);
      setImportError('ไม่สามารถอ่านไฟล์ได้ กรุณาตรวจสอบว่าเป็นไฟล์ Excel (.xlsx) ที่ถูกต้อง');
    } finally {
      setImportLoading(false);
    }
  };

  const closeImportModal = () => {
    setShowImportModal(false);
    setParsedProducts([]);
    setImportError('');
    setCustomWorkbook(null);
    setSheetNames([]);
    setSelectedSheetName('');
    setSheetHeaders([]);
    setColumnMapping({
      code: '',
      barcode: '',
      name: '',
      brand: '',
      category: '',
      wholesalePrice: '',
      retailPrice: '',
      capFee: '',
      description: '',
      highlights: '',
      howToUse: '',
      size: '',
      weight: '',
      fdaNumber: '',
      tisiNumber: '',
      packageLength: '',
      packageWidth: '',
      packageHeight: ''
    });
  };

  // Run dynamic parser when mapping/selection changes
  useEffect(() => {
    if (!customWorkbook || !selectedSheetName || !columnMapping.code || !columnMapping.name) {
      setParsedProducts([]);
      return;
    }
    
    const worksheet = customWorkbook.getWorksheet(selectedSheetName);
    if (!worksheet) return;
    
    // Find header row again to skip it
    let headerRowNumber = 1;
    worksheet.eachRow((row, rowNumber) => {
      if (headerRowNumber === 1 && row.values.some(v => v !== null && v !== '')) {
        headerRowNumber = rowNumber;
      }
    });
    
    const tempProducts = [];
    
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber <= headerRowNumber) return; // skip header and prior rows
      
      const getVal = (colKey) => {
        if (!colKey) return '';
        const cell = row.getCell(Number(colKey));
        return getCellValue(cell).trim();
      };
      
      const codeVal = getVal(columnMapping.code);
      const nameVal = getVal(columnMapping.name);
      
      if (!codeVal && !nameVal) return; // skip empty rows
      
      const barcodeVal = getVal(columnMapping.barcode);
      const brandVal = getVal(columnMapping.brand);
      const categoryVal = getVal(columnMapping.category);
      const wholesaleVal = Number(getVal(columnMapping.wholesalePrice)) || 0;
      const retailVal = Number(getVal(columnMapping.retailPrice)) || 0;
      const capVal = Number(getVal(columnMapping.capFee)) || 0;
      const descriptionVal = getVal(columnMapping.description);
      const highlightsVal = getVal(columnMapping.highlights);
      const howToUseVal = getVal(columnMapping.howToUse);
      const sizeVal = getVal(columnMapping.size);
      const weightVal = getVal(columnMapping.weight);
      const fdaVal = getVal(columnMapping.fdaNumber);
      const tisiVal = getVal(columnMapping.tisiNumber);
      const packageLengthVal = Number(getVal(columnMapping.packageLength)) || null;
      const packageWidthVal = Number(getVal(columnMapping.packageWidth)) || null;
      const packageHeightVal = Number(getVal(columnMapping.packageHeight)) || null;
      
      tempProducts.push({
        code: codeVal || `SKU-${rowNumber}`,
        name: nameVal || `สินค้าไม่มีชื่อแถวที่ ${rowNumber}`,
        barcode: barcodeVal,
        brand: brandVal,
        category: categoryVal,
        wholesalePrice: wholesaleVal,
        retailPrice: retailVal,
        capFee: capVal,
        description: descriptionVal,
        highlights: highlightsVal,
        howToUse: howToUseVal,
        size: sizeVal,
        weight: weightVal,
        fdaNumber: fdaVal,
        tisiNumber: tisiVal,
        packageLength: packageLengthVal,
        packageWidth: packageWidthVal,
        packageHeight: packageHeightVal,
        status: 'Active',
        _platform: 'custom'
      });
    });
    
    setParsedProducts(tempProducts);
  }, [columnMapping, selectedSheetName, customWorkbook]);

  const getMappedHeaderName = (colNum) => {
    if (!colNum) return null;
    const header = sheetHeaders.find(h => String(h.colNumber) === String(colNum));
    return header ? header.name : null;
  };

  const renderMappingSummaryItem = (label, valueKey) => {
    const colNum = columnMapping[valueKey];
    const headerName = getMappedHeaderName(colNum);
    const isRequired = label.endsWith('*');
    
    return (
      <div className="flex flex-col gap-1 bg-white p-2.5 rounded-xl border border-[#d2d2d7]/50 shadow-2xs">
        <span className="font-bold text-[#555557] text-[10px] uppercase tracking-wider flex items-center gap-1">
          {label}
        </span>
        {colNum ? (
          <div className="mt-1 flex items-center justify-between bg-emerald-50 border border-emerald-250 text-emerald-700 rounded-lg px-2.5 py-1.5 text-[10px] font-bold">
            <span className="truncate max-w-[120px]" title={headerName}>
              {headerName}
            </span>
            <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono">
              คอลัมน์ {colNum}
            </span>
          </div>
        ) : (
          <div className="mt-1 flex items-center justify-between bg-[#f5f5f7] border border-[#d2d2d7]/50 text-zinc-400 rounded-lg px-2.5 py-1.5 text-[10px]">
            <span>ไม่ได้ระบุ (เว้นว่าง)</span>
            {isRequired ? (
              <span className="text-[9px] bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded font-semibold animate-pulse">
                ต้องการค่า
              </span>
            ) : null}
          </div>
        )}
      </div>
    );
  };

  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [productToDelete, setProductToDelete] = useState(null);
  const [alertPopup, setAlertPopup] = useState(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
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

  const [showImportModal, setShowImportModal] = useState(false);



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

    return matchesSearch && matchesBrand && matchesCategory && matchesStatus;
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
    setPackageLength('');
    setPackageWidth('');
    setPackageHeight('');
    setPlatform('');
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
      setPackageLength(editProduct.packageLength || '');
      setPackageWidth(editProduct.packageWidth || '');
      setPackageHeight(editProduct.packageHeight || '');
      setPlatform(editProduct.platform || editProduct._platform || '');
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

  /**
   * ดาวน์โหลดไฟล์จาก Base64 โดยตรงบนฝั่งไคลเอนต์
   * หน่วงเวลาการลบลิงก์และยกเลิก URL เพื่อให้บราวเซอร์ตั้งชื่อไฟล์เสร็จสิ้นอย่างถูกต้อง
   */
  const downloadViaRedirect = (base64Data, filename) => {
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.position = 'absolute';
    link.style.top = '-9999px';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(url);
    }, 10000);
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
    if (!name.trim()) {
      setAlertPopup({ type: 'error', title: 'กรอกข้อมูลไม่ครบถ้วน', message: 'กรุณากรอกชื่อสินค้า/ผลิตภัณฑ์' });
      return;
    }
    if (wholesalePrice !== '' && (isNaN(wholesalePrice) || Number(wholesalePrice) < 0)) {
      setAlertPopup({ type: 'error', title: 'ข้อมูลราคาไม่ถูกต้อง', message: 'กรุณาระบุราคาขายส่งที่ถูกต้อง (ต้องมากกว่าหรือเท่ากับ 0)' });
      return;
    }
    if (retailPrice !== '' && (isNaN(retailPrice) || Number(retailPrice) < 0)) {
      setAlertPopup({ type: 'error', title: 'ข้อมูลราคาไม่ถูกต้อง', message: 'กรุณาระบุราคาขายปลีกที่ถูกต้อง (ต้องมากกว่าหรือเท่ากับ 0)' });
      return;
    }
    if (capFee !== '' && (isNaN(capFee) || Number(capFee) < 0)) {
      setAlertPopup({ type: 'error', title: 'ราคาไม่ถูกต้อง', message: 'กรุณากรอกค่าฝาให้ถูกต้อง (ต้องมากกว่าหรือเท่ากับ 0)' });
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
      wholesalePrice: wholesalePrice === '' ? 0 : Number(wholesalePrice),
      retailPrice: retailPrice === '' ? 0 : Number(retailPrice),
      capFee: capFee === '' ? 0 : Number(capFee),
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
      packageLength: packageLength ? Number(packageLength) : null,
      packageWidth: packageWidth ? Number(packageWidth) : null,
      packageHeight: packageHeight ? Number(packageHeight) : null,
      platform: platform || '',
      _platform: platform || '',
      editRemark: editProduct ? editRemark.trim() : ''
    };

    setAlertPopup({ type: 'success', title: 'บันทึกข้อมูลสำเร็จ', message: 'ข้อมูลสินค้าถูกบันทึกเรียบร้อยแล้ว', data: newProductData });
  };

  return (
    <div className="space-y-6">

      {/* Marketplace Import Modal */}
      {showImportModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fade-in no-print">
          <div onClick={closeImportModal} className="absolute inset-0" />
          <div className="relative bg-white rounded-3xl border border-[#d2d2d7]/50 max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-scale-in text-[#1d1d1f] shadow-2xl">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#e8e8ed] flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-sm font-extrabold uppercase tracking-wide">นำเข้าสินค้าจาก Excel / Google Sheets</h3>
                <p className="text-[10px] text-zinc-550 mt-0.5">ระบบจะสแกนและวิเคราะห์คอลัมน์ข้อมูลสินค้าเพื่อนำเข้าให้โดยอัตโนมัติ</p>
              </div>
              <button
                type="button"
                onClick={closeImportModal}
                className="p-1 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-black transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="space-y-4">
                {/* Instructions */}
                <div className="p-3.5 bg-zinc-50 border border-zinc-200/80 rounded-2xl space-y-1.5">
                  <span className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider block">💡 วิธีนำเข้าข้อมูลจาก Google Sheets / Excel:</span>
                  <ol className="text-[10px] text-zinc-500 list-decimal list-inside space-y-1">
                    <li>อัปโหลดไฟล์ Excel (.xlsx) ที่ต้องการนำเข้าด้านล่างนี้</li>
                    <li>ระบบจะวิเคราะห์หัวตารางและจับคู่คอลัมน์ให้อัตโนมัติตามโครงสร้างแบบฟอร์มสินค้า</li>
                    <li>ตรวจสอบความถูกต้องในตารางตัวอย่างด้านล่างก่อนยืนยันนำเข้า</li>
                  </ol>
                </div>

                {/* File Upload */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-[#555557] uppercase tracking-wider block">เลือกไฟล์ Excel (.xlsx)</span>
                  <input
                    type="file"
                    accept=".xlsx"
                    onChange={handleCustomFileChange}
                    className="block w-full text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#0071e3]/10 file:text-[#0071e3] hover:file:bg-[#0071e3]/15 file:cursor-pointer cursor-pointer"
                  />
                  {importLoading && (
                    <p className="text-[10px] text-zinc-500 font-semibold animate-pulse">กำลังสแกนวิเคราะห์โครงสร้างไฟล์และแผ่นงาน...</p>
                  )}
                  {importError && (
                    <p className="text-[10px] text-red-500 font-semibold">{importError}</p>
                  )}
                </div>

                {/* Sheet Selector */}
                {sheetNames.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#555557] uppercase tracking-wider block">1. เลือกแผ่นงานที่ต้องการดึงข้อมูล (Sheet)</label>
                    <div className="relative">
                      <select
                        value={selectedSheetName}
                        onChange={(e) => handleSelectSheet(e.target.value)}
                        className="w-full text-xs bg-white border border-[#d2d2d7] rounded-xl px-3 py-2.5 outline-none appearance-none cursor-pointer focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3]"
                      >
                        {sheetNames.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                    </div>
                  </div>
                )}

                {/* Column Mapping Section (Auto-Matched Read-Only Summary) */}
                {sheetHeaders.length > 0 && (
                  <div className="space-y-2.5 border-t border-zinc-150 pt-3.5">
                    <span className="text-[10px] font-bold text-[#555557] uppercase tracking-wider block">
                      2. ผลการจับคู่คอลัมน์ข้อมูลสินค้าอัตโนมัติ (Column Mapping Summary)
                    </span>
                    <p className="text-[9px] text-zinc-500 leading-relaxed">
                      ระบบจะวิเคราะห์หัวตารางใน Excel แถวแรกที่มีข้อมูลเพื่อจับคู่โดยอัตโนมัติให้ตรงกับแบบฟอร์มเพิ่มข้อมูลสินค้าในระบบ PIM
                    </p>
                    
                    <div className="space-y-4 text-xs">
                      {/* กลุ่ม 1: ข้อมูลสินค้าหลัก */}
                      <div className="bg-zinc-50/50 p-4 rounded-2xl border border-zinc-200/80 space-y-2.5">
                        <h4 className="font-extrabold text-zinc-800 text-[10px] uppercase tracking-wider border-b border-zinc-200/80 pb-1.5 mb-2">1. ข้อมูลพื้นฐานสินค้า</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5">
                          {renderMappingSummaryItem('รหัสสินค้า (SKU / Code) *', 'code')}
                          {renderMappingSummaryItem('ชื่อสินค้า *', 'name')}
                          {renderMappingSummaryItem('รหัสบาร์โค้ด', 'barcode')}
                          {renderMappingSummaryItem('แบรนด์สินค้า', 'brand')}
                          {renderMappingSummaryItem('หมวดหมู่สินค้า', 'category')}
                          {renderMappingSummaryItem('ขนาด', 'size')}
                          {renderMappingSummaryItem('น้ำหนัก', 'weight')}
                        </div>
                      </div>

                      {/* กลุ่ม 2: ข้อมูลราคาและคลัง */}
                      <div className="bg-zinc-50/50 p-4 rounded-2xl border border-zinc-200/80 space-y-2.5">
                        <h4 className="font-extrabold text-zinc-800 text-[10px] uppercase tracking-wider border-b border-zinc-200/80 pb-1.5 mb-2">2. ข้อมูลราคาผลิตภัณฑ์</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {renderMappingSummaryItem('ราคาขายส่ง', 'wholesalePrice')}
                          {renderMappingSummaryItem('ราคาขายปลีก', 'retailPrice')}
                          {renderMappingSummaryItem('ค่าฝา', 'capFee')}
                        </div>
                      </div>

                      {/* กลุ่ม 3: รายละเอียดเพิ่มเติม อย มอก และขนาดพัสดุ */}
                      <div className="bg-zinc-50/50 p-4 rounded-2xl border border-zinc-200/80 space-y-2.5">
                        <h4 className="font-extrabold text-zinc-800 text-[10px] uppercase tracking-wider border-b border-zinc-200/80 pb-1.5 mb-2">3. รายละเอียดและมาตรฐานประกอบสินค้า</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5">
                          {renderMappingSummaryItem('หมายเลข อย.', 'fdaNumber')}
                          {renderMappingSummaryItem('หมายเลข มอก.', 'tisiNumber')}
                          {renderMappingSummaryItem('รายละเอียดสินค้า', 'description')}
                          {renderMappingSummaryItem('จุดเด่นสินค้า', 'highlights')}
                          {renderMappingSummaryItem('วิธีใช้', 'howToUse')}
                          {renderMappingSummaryItem('ความยาวพัสดุ (ซม.)', 'packageLength')}
                          {renderMappingSummaryItem('ความกว้างพัสดุ (ซม.)', 'packageWidth')}
                          {renderMappingSummaryItem('ความสูงพัสดุ (ซม.)', 'packageHeight')}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Preview Grid */}
                {parsedProducts.length > 0 && (
                  <div className="space-y-2 border-t border-zinc-150 pt-3.5">
                    <span className="text-[10px] font-bold text-[#555557] uppercase tracking-wider block">
                      3. ตัวอย่างข้อมูลสินค้าที่อ่านได้ ({parsedProducts.length} รายการ)
                    </span>
                    <div className="border border-[#d2d2d7]/50 rounded-xl overflow-hidden max-h-[250px] overflow-y-auto">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-[#f5f5f7] border-b border-[#d2d2d7]/50 text-[#555557] font-bold">
                            <th className="p-2">รหัสสินค้า (SKU)</th>
                            <th className="p-2">ชื่อสินค้า</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-150">
                          {parsedProducts.slice(0, 50).map((p, idx) => (
                            <tr key={idx} className="hover:bg-zinc-50">
                              <td className="p-2 font-mono text-[10px]">{p.code}</td>
                              <td className="p-2 truncate max-w-[280px] font-semibold">{p.name}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {parsedProducts.length > 50 && (
                        <div className="p-2 text-center text-zinc-400 text-[10px] bg-[#f5f5f7] border-t">
                          ...และรายการอื่นๆ อีก {parsedProducts.length - 50} รายการ
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#e8e8ed] flex gap-3 flex-shrink-0 bg-white">
              <button
                type="button"
                onClick={closeImportModal}
                className="flex-1 py-2.5 border border-[#d2d2d7] text-[#1d1d1f] hover:bg-[#f5f5f7] text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={parsedProducts.length === 0}
                onClick={() => {
                  onImportProducts(parsedProducts, `ไฟล์ Excel (${selectedSheetName})`);
                  closeImportModal();
                  
                  // Alert success
                  setAlertPopup({
                    type: 'success-import',
                    title: 'นำเข้าสำเร็จ!',
                    message: `ดึงสินค้าเข้ามาเรียบร้อยแล้วทั้งหมด ${parsedProducts.length} รายการ`
                  });
                }}
                className="flex-1 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                นำเข้าสินค้าเข้าสู่คลัง
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Clear All Products Confirmation Modal */}
      {showClearAllConfirm && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print animate-fade-in">
          <div onClick={() => setShowClearAllConfirm(false)} className="absolute inset-0 bg-black/15 backdrop-blur-xs" />
          <div className="relative bg-white rounded-3xl border border-[#d2d2d7]/50 max-sm:w-full max-w-sm w-full p-6 shadow-lg space-y-4.5 z-10 animate-scale-in text-[#1d1d1f]">
            <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
              <AlertTriangle className="w-6 h-6 text-rose-500" />
            </div>
            <div>
              <h2 className="font-bold text-sm uppercase tracking-wide">ยืนยันลบข้อมูลสินค้าทั้งหมด?</h2>
              <p className="text-xs text-zinc-550 mt-1">คุณต้องการลบสินค้าทั้งหมดออกจากคลังสินค้าใช่หรือไม่? การกระทำนี้จะลบสินค้าทุกรายการในระบบ และไม่สามารถย้อนคืนได้!</p>
            </div>
            <div className="flex gap-2.5 pt-2 text-xs font-semibold">
              <button
                onClick={() => setShowClearAllConfirm(false)}
                className="flex-1 py-2.5 border border-[#d2d2d7] text-[#1d1d1f] rounded-full hover:bg-[#f5f5f7] transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  onClearAllProducts();
                  setShowClearAllConfirm(false);
                  setAlertPopup({
                    type: 'success-delete',
                    title: 'ลบข้อมูลสำเร็จ!',
                    message: 'ลบข้อมูลสินค้าทั้งหมดออกจากระบบเรียบร้อยแล้ว!'
                  });
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full transition-colors cursor-pointer"
              >
                ยืนยันลบทั้งหมด
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}




      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f]">จัดการข้อมูลสินค้า</h1>
        </div>
        <div className="flex flex-wrap gap-2.5 self-start sm:self-auto">
          {/* Import Button */}
          <button
            type="button"
            onClick={() => {
              setParsedProducts([]);
              setImportError('');
              setShowImportModal(true);
            }}
            className="px-4 py-2.5 bg-white hover:bg-[#f5f5f7] text-[#1d1d1f] border border-[#d2d2d7] text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            นำเข้าสินค้า
          </button>

          {/* Delete All Products Button */}
          {currentUser?.role === 'admin' && products.length > 0 && (
            <button
              type="button"
              onClick={() => setShowClearAllConfirm(true)}
              className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              title="ลบข้อมูลสินค้าทั้งหมดออกจากคลังสินค้า"
            >
              <Trash2 className="w-4 h-4 text-rose-500" />
              ลบสินค้าทั้งหมด
            </button>
          )}

          {/* Export Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              className="px-4 py-2.5 bg-white hover:bg-[#f5f5f7] text-[#1d1d1f] border border-[#d2d2d7] text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              นำออกสินค้า
              <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
            </button>
            {showExportDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowExportDropdown(false)} 
                />
                <div className="absolute right-0 mt-1.5 w-48 bg-white border border-[#d2d2d7]/50 rounded-2xl shadow-xl z-20 overflow-hidden py-1.5 animate-scale-in text-[#1d1d1f]">
                  <button
                    type="button"
                    onClick={() => {
                      exportShopee(filteredProducts);
                      setShowExportDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-bold text-zinc-700 hover:bg-[#ff5722]/5 hover:text-[#ff5722] transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-[#ff5722]" />
                    Shopee
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      exportLazada(filteredProducts);
                      setShowExportDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-bold text-zinc-700 hover:bg-[#000080]/5 hover:text-[#000080] transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-[#000080]" />
                    Lazada
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      exportTikTok(filteredProducts);
                      setShowExportDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-100 hover:text-black transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-zinc-800" />
                    TikTok Shop
                  </button>
                </div>
              </>
            )} 
          </div>

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

          {/* Filters Panel */}
      <div className="bg-white p-5 rounded-2xl border border-[#d2d2d7]/50 shadow-xs space-y-4 no-print">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
          <div className="relative md:col-span-6">
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
        </div>

        <div className="flex items-center justify-between border-t border-[#f5f5f7] pt-4 text-xs text-[#555557] uppercase tracking-wider font-semibold">
          <span>พบสินค้าตรงตามเงื่อนไข <strong className="text-black font-bold">{filteredProducts.length}</strong> รายการ</span>
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
                <th className="p-3 w-16">รูปภาพ</th>
                <th className="p-3">รหัสสินค้า</th>
                <th className="p-3">รหัสบาร์โค้ด</th>
                <th className="p-3">ชื่อสินค้า</th>
                <th className="p-3">แบรนด์</th>
                <th className="p-3">หมวดหมู่</th>
                <th className="p-3 text-right">ราคาส่ง</th>
                <th className="p-3 text-right">ราคาปลีก</th>
                <th className="p-3 text-center">สถานะ</th>
                <th className="p-3 text-center w-36 no-print">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f5f7]">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="10" className="p-16 text-center">
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
                  <tr key={product.id} className="hover:bg-[#fafafa] transition-colors group text-[#1d1d1f]">
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
                            <label className="form-label min-h-[28px] flex items-end pb-1">รหัสบาร์โค้ด</label>
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

                        {/* แถว 3: เลือกหมวดหมู่ แบรนด์ และแพลตฟอร์ม */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="min-w-0">
                            <label className="form-label min-h-[28px] flex items-end pb-1">หมวดหมู่สินค้า</label>
                            <select
                              value={category}
                              onChange={handleCategorySelectChange}
                              className="form-input min-w-0 bg-[#f5f5f7] text-zinc-800 focus:bg-white"
                            >
                              <option value="">-- ไม่ระบุ --</option>
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
                            <label className="form-label min-h-[28px] flex items-end pb-1">แบรนด์สินค้า</label>
                            <select
                              value={brand}
                              onChange={handleBrandSelectChange}
                              className="form-input min-w-0 bg-[#f5f5f7] text-zinc-800 focus:bg-white"
                            >
                              <option value="">-- ไม่ระบุ --</option>
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
                          <div className="min-w-0">
                            <label className="form-label min-h-[28px] flex items-end pb-1">แพลตฟอร์มขายสินค้า</label>
                            <select
                              value={platform}
                              onChange={(e) => setPlatform(e.target.value)}
                              className="form-input min-w-0 bg-[#f5f5f7] text-zinc-800 focus:bg-white font-semibold"
                            >
                              <option value="">ทั่วไป (PIM)</option>
                              <option value="shopee">Shopee</option>
                              <option value="lazada">Lazada</option>
                              <option value="tiktok">TikTok Shop</option>
                            </select>
                          </div>
                        </div>

                        {/* แถว 4: ขนาด และน้ำหนัก */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="min-w-0">
                            <label className="form-label min-h-[28px] flex items-end pb-1">ขนาด</label>
                            <input
                              type="text"
                              value={size}
                              onChange={(e) => setSize(e.target.value)}
                              className="form-input min-w-0 bg-[#f5f5f7] focus:bg-white"
                            />
                          </div>
                          <div className="min-w-0">
                            <label className="form-label min-h-[28px] flex items-end pb-1">น้ำหนัก</label>
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
                            <label className="form-label min-h-[28px] flex items-end pb-1">หมายเลข อย.</label>
                            <input
                              type="text"
                              value={fdaNumber}
                              onChange={(e) => setFdaNumber(e.target.value)}
                              placeholder="เช่น 10-1-6100012345"
                              className="form-input min-w-0 bg-[#f5f5f7] focus:bg-white"
                            />
                          </div>
                          <div className="min-w-0">
                            <label className="form-label min-h-[28px] flex items-end pb-1">มอก.</label>
                            <input
                              type="text"
                              value={tisiNumber}
                              onChange={(e) => setTisiNumber(e.target.value)}
                              placeholder="เช่น มอก. 1985-2549"
                              className="form-input min-w-0 bg-[#f5f5f7] focus:bg-white"
                            />
                          </div>
                        </div>
                        {/* ข้อมูลขนาดพัสดุสำหรับ Export */}
                        <div className="border-t border-[#f5f5f7] pt-3.5 mt-3.5">
                          <h3 className="text-xs font-extrabold text-[#1d1d1f] uppercase tracking-wider mb-2.5">ขนาดพัสดุสำหรับจัดส่ง (ยาว x กว้าง x สูง ซม.)</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="min-w-0">
                              <label className="form-label min-h-[28px] flex items-end pb-1">ความยาวพัสดุ (ซม.)</label>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={packageLength}
                                onChange={(e) => setPackageLength(e.target.value)}
                                className="form-input min-w-0 bg-[#f5f5f7] focus:bg-white"
                              />
                            </div>
                            <div className="min-w-0">
                              <label className="form-label min-h-[28px] flex items-end pb-1">ความกว้างพัสดุ (ซม.)</label>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={packageWidth}
                                onChange={(e) => setPackageWidth(e.target.value)}
                                className="form-input min-w-0 bg-[#f5f5f7] focus:bg-white"
                              />
                            </div>
                            <div className="min-w-0">
                              <label className="form-label min-h-[28px] flex items-end pb-1">ความสูงพัสดุ (ซม.)</label>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={packageHeight}
                                onChange={(e) => setPackageHeight(e.target.value)}
                                className="form-input min-w-0 bg-[#f5f5f7] focus:bg-white"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="border-b border-[#f5f5f7] pb-3.5">
                      <h3 className="text-xs font-extrabold text-[#1d1d1f] uppercase tracking-wider mb-2.5">ข้อมูลราคาและคลังสินค้า</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                        <div className="min-w-0">
                          <label className="form-label min-h-[44px] flex items-end pb-1">ราคาขายส่ง</label>
                          <input
                            type="number"
                            min="0"
                            value={wholesalePrice}
                            onChange={(e) => setWholesalePrice(e.target.value)}
                            className="form-input min-w-0 bg-[#f5f5f7] focus:bg-white"
                          />
                        </div>
                        <div className="min-w-0">
                          <label className="form-label min-h-[44px] flex items-end pb-1">ราคาขายปลีก</label>
                          <input
                            type="number"
                            min="0"
                            value={retailPrice}
                            onChange={(e) => setRetailPrice(e.target.value)}
                            className="form-input min-w-0 bg-[#f5f5f7] focus:bg-white text-black"
                          />
                        </div>
                        <div className="min-w-0">
                          <label className="form-label min-h-[44px] flex items-end pb-1">ค่าฝา</label>
                          <input
                            type="number"
                            min="0"
                            value={capFee}
                            onChange={(e) => setCapFee(e.target.value)}
                            className="form-input min-w-0 bg-[#f5f5f7] focus:bg-white text-black"
                          />
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
                          <label className="form-label min-h-[28px] flex items-end pb-1">รายละเอียดสินค้า</label>
                          <textarea
                            rows="2"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="form-input min-w-0 bg-[#f5f5f7] focus:bg-white resize-none"
                          />
                        </div>
                        <div className="min-w-0">
                          <label className="form-label min-h-[28px] flex items-end pb-1">จุดเด่นสินค้า</label>
                          <textarea
                            rows="2"
                            value={highlights}
                            onChange={(e) => setHighlights(e.target.value)}
                            className="form-input min-w-0 bg-[#f5f5f7] focus:bg-white resize-none"
                          />
                        </div>
                        <div className="min-w-0">
                          <label className="form-label min-h-[28px] flex items-end pb-1">วิธีใช้</label>
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
                      <h3 className="text-xs font-bold text-[#1d1d1f] uppercase tracking-wide">ใส่ภาพประกอบสินค้า</h3>
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
                <div className="flex justify-between border-b border-[#d2d2d7]/20 pb-1.5">
                  <span className="text-zinc-800 font-bold">มอก.</span>
                  <span className="font-extrabold text-black">{drawerProduct.tisiNumber || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-800 font-bold">ขนาดพัสดุ (ย x ก x ส)</span>
                  <span className="font-extrabold text-black">
                    {drawerProduct.packageLength && drawerProduct.packageWidth && drawerProduct.packageHeight
                      ? `${drawerProduct.packageLength} x ${drawerProduct.packageWidth} x ${drawerProduct.packageHeight} ซม.`
                      : '-'}
                  </span>
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

  </div>
  );
}
