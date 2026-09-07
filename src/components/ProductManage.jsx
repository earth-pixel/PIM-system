import { findHeaderRow, parseNumericCell, validateProduct, normalizeCode } from '../utils/validation';
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import DropdownFilter from './DropdownFilter';
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
  Eye,
  Copy,
  FileSpreadsheet,
  Download,
  Upload,
  ChevronDown,
  LayoutGrid,
  List,
  Barcode
} from 'lucide-react';
import { exportShopee, exportLazada, exportTikTok, exportToExcel } from '../utils/exportUtils';
import { playScanBeep, findProductByBarcodeOrCode } from '../utils/scannerUtils';
import {
  parseWeightToKg
} from '../utils/marketplaceIO';
import ExcelJS from 'exceljs';

const shopeeCols = [
  { label: 'หมวดหมู่สินค้า', value: (p) => p.category || '' },
  { label: 'ชื่อสินค้า', value: (p) => p.name || '' },
  {
    label: 'รายละเอียดสินค้า', value: (p) => {
      let desc = p.description || '';
      if (p.highlights) desc += `\n\nจุดเด่นสินค้า:\n${p.highlights}`;
      if (p.howToUse) desc += `\n\nวิธีใช้งาน:\n${p.howToUse}`;
      return desc;
    }
  },
  { label: 'ราคา', value: (p) => (Number(p.retailPrice) || 0).toLocaleString() },
  { label: 'คลังสินค้า', value: (p) => p.stock || 0 },
  { label: 'ภาพปก', value: (p) => p.image || '' },
  { label: 'รูปภาพ 1', value: (p) => p.image || '' },
  { label: 'น้ำหนัก (กก)', value: (p) => parseWeightToKg(p.weight) || '' },
  { label: 'ความยาว (ซม)', value: (p) => p.packageLength || '' },
  { label: 'ความกว้าง (ซม)', value: (p) => p.packageWidth || '' },
  { label: 'ความสูง (ซม)', value: (p) => p.packageHeight || '' },
];

const tiktokCols = [
  { label: 'หมวดหมู่', value: (p) => p.category || '' },
  { label: 'ชื่อสินค้า', value: (p) => p.name || '' },
  {
    label: 'คำอธิบายสินค้า', value: (p) => {
      let desc = p.description || '';
      if (p.highlights) desc += `\n\nจุดเด่นสินค้า:\n${p.highlights}`;
      if (p.howToUse) desc += `\n\nวิธีใช้งาน:\n${p.howToUse}`;
      return desc;
    }
  },
  { label: 'ภาพหลัก', value: (p) => p.image || '' },
  { label: 'น้ำหนักพัสดุ(g)', value: (p) => Math.round(parseWeightToKg(p.weight) * 1000) || '' },
  { label: 'ความยาวของพัสดุ(cm)', value: (p) => p.packageLength || '' },
  { label: 'ความกว้างของพัสดุ(cm)', value: (p) => p.packageWidth || '' },
  { label: 'ความสูงของพัสดุ(cm)', value: (p) => p.packageHeight || '' },
  { label: 'ราคาขายปลีก', value: (p) => (Number(p.retailPrice) || 0).toLocaleString() },
  { label: 'ปริมาณ', value: (p) => p.stock || 0 },
];

const lazadaCategorySheets = [
  'ผลิตภัณฑ์จัดแต่งทรงผม',
  'ผลิตภัณฑ์เปลี่ยนสีผม',
  'ครีมบำรุงผม',
  'ทรีทเมนต์สำหรับผม',
  'แชมพู'
];

const LAZADA_PREVIEW_COLS = {
  'ผลิตภัณฑ์จัดแต่งทรงผม': [
    { label: 'ชื่อสินค้า', value: (p) => p.name || '' },
    { label: 'รูปภาพสินค้า1', value: (p) => p.image || '' },
    { label: 'TH_FDA License', value: (p) => p.fdaNumber || '' },
    { label: 'ยี่ห้อ', value: (p) => (p.brand && p.brand !== 'No Brand' && p.brand !== 'ไม่มีแบรนด์' ? p.brand : 'Unbranded') },
    { label: 'ระดับการจัดทรง', value: () => '' },
    { label: 'ประเภทเส้นผม', value: () => '' },
    { label: 'ประโยชน์ดูแลผม', value: () => '' },
    { label: 'น้ำหนัก (กก)', value: (p) => parseWeightToKg(p.weight) || '' },
    { label: 'จำนวน', value: () => 0 },
    { label: 'ราคา', value: (p) => p.retailPrice || 0 },
    { label: 'ความยาว (ซม)', value: (p) => p.packageLength || '' },
    { label: 'ความกว้าง (ซม)', value: (p) => p.packageWidth || '' },
    { label: 'ความสูง (ซม)', value: (p) => p.packageHeight || '' },
    { label: 'SellerSKU', value: (p) => p.code || '' }
  ],
  'ผลิตภัณฑ์เปลี่ยนสีผม': [
    { label: 'ชื่อสินค้า', value: (p) => p.name || '' },
    { label: 'รูปภาพสินค้า1', value: (p) => p.image || '' },
    { label: 'TH_FDA License', value: (p) => p.fdaNumber || '' },
    { label: 'ยี่ห้อ', value: (p) => (p.brand && p.brand !== 'No Brand' && p.brand !== 'ไม่มีแบรนด์' ? p.brand : 'Unbranded') },
    { label: 'ประเภทสีย้อมผม', value: () => '' },
    { label: 'รูปแบบผลิตภัณฑ์', value: () => '' },
    { label: 'น้ำหนัก (กก)', value: (p) => parseWeightToKg(p.weight) || '' },
    { label: 'จำนวน', value: () => 0 },
    { label: 'ราคา', value: (p) => p.retailPrice || 0 },
    { label: 'ความยาว (ซม)', value: (p) => p.packageLength || '' },
    { label: 'ความกว้าง (ซม)', value: (p) => p.packageWidth || '' },
    { label: 'ความสูง (ซม)', value: (p) => p.packageHeight || '' },
    { label: 'SellerSKU', value: (p) => p.code || '' }
  ],
  'ครีมบำรุงผม': [
    { label: 'ชื่อสินค้า', value: (p) => p.name || '' },
    { label: 'รูปภาพสินค้า1', value: (p) => p.image || '' },
    { label: 'TH_FDA License', value: (p) => p.fdaNumber || '' },
    { label: 'ยี่ห้อ', value: (p) => (p.brand && p.brand !== 'No Brand' && p.brand !== 'ไม่มีแบรนด์' ? p.brand : 'Unbranded') },
    { label: 'ประเภทเส้นผม', value: () => '' },
    { label: 'น้ำหนัก (กก)', value: (p) => parseWeightToKg(p.weight) || '' },
    { label: 'จำนวน', value: () => 0 },
    { label: 'ราคา', value: (p) => p.retailPrice || 0 },
    { label: 'ความยาว (ซม)', value: (p) => p.packageLength || '' },
    { label: 'ความกว้าง (ซม)', value: (p) => p.packageWidth || '' },
    { label: 'ความสูง (ซม)', value: (p) => p.packageHeight || '' },
    { label: 'SellerSKU', value: (p) => p.code || '' }
  ],
  'ทรีทเมนต์สำหรับผม': [
    { label: 'ชื่อสินค้า', value: (p) => p.name || '' },
    { label: 'รูปภาพสินค้า1', value: (p) => p.image || '' },
    { label: 'TH_FDA License', value: (p) => p.fdaNumber || '' },
    { label: 'ยี่ห้อ', value: (p) => (p.brand && p.brand !== 'No Brand' && p.brand !== 'ไม่มีแบรนด์' ? p.brand : 'Unbranded') },
    { label: 'ประเภทเส้นผม', value: () => '' },
    { label: 'น้ำหนัก (กก)', value: (p) => parseWeightToKg(p.weight) || '' },
    { label: 'จำนวน', value: () => 0 },
    { label: 'ราคา', value: (p) => p.retailPrice || 0 },
    { label: 'ความยาว (ซม)', value: (p) => p.packageLength || '' },
    { label: 'ความกว้าง (ซม)', value: (p) => p.packageWidth || '' },
    { label: 'ความสูง (ซม)', value: (p) => p.packageHeight || '' },
    { label: 'SellerSKU', value: (p) => p.code || '' }
  ],
  'แชมพู': [
    { label: 'ชื่อสินค้า', value: (p) => p.name || '' },
    { label: 'รูปภาพสินค้า1', value: (p) => p.image || '' },
    { label: 'TH_FDA License', value: (p) => p.fdaNumber || '' },
    { label: 'ยี่ห้อ', value: (p) => (p.brand && p.brand !== 'No Brand' && p.brand !== 'ไม่มีแบรนด์' ? p.brand : 'Unbranded') },
    { label: 'ประเภทเส้นผม', value: () => '' },
    { label: 'น้ำหนัก (กก)', value: (p) => parseWeightToKg(p.weight) || '' },
    { label: 'จำนวน', value: () => 0 },
    { label: 'ราคา', value: (p) => p.retailPrice || 0 },
    { label: 'ความยาว (ซม)', value: (p) => p.packageLength || '' },
    { label: 'ความกว้าง (ซม)', value: (p) => p.packageWidth || '' },
    { label: 'ความสูง (ซม)', value: (p) => p.packageHeight || '' },
    { label: 'SellerSKU', value: (p) => p.code || '' }
  ]
};

function resolveLazadaSheet(product) {
  const cat = (product.category || '').trim();
  if (cat.startsWith('Grooming') || cat.includes('จัดแต่งทรงผม') || cat === 'Styling') return 'ผลิตภัณฑ์จัดแต่งทรงผม';
  if (cat.startsWith('Chemical') || cat.includes('เคมีภัณฑ์') || cat.includes('เปลี่ยนสีผม') || cat === 'Hair Color') return 'ผลิตภัณฑ์เปลี่ยนสีผม';
  if (cat.startsWith('Hair Treatment') || cat.includes('บำรุงเส้นผม') || cat === 'Treatment') return 'ครีมบำรุงผม';
  if (cat.includes('แชมพู') || cat.toLowerCase().includes('shampoo')) return 'แชมพู';
  if (cat.includes('ทรีทเมนต์')) return 'ทรีทเมนต์สำหรับผม';
  return 'ครีมบำรุงผม';
}

export default function ProductManage({
  editProduct,
  onCancelEdit,
  onSaveProduct,
  brands,
  categories,
  subcategories = {},
  currentUser,
  products = [],
  onDeleteProduct,
  onEditProduct,
  onImportProducts,
  onClearAllProducts = () => { },
  addActivityLog,
  onAddSubCategory
}) {
  const [code, setCode] = useState('');
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
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
  const [status, setStatus] = useState('Active');
  const [createdAt, setCreatedAt] = useState('');
  const [packageLength, setPackageLength] = useState('');
  const [packageWidth, setPackageWidth] = useState('');
  const [packageHeight, setPackageHeight] = useState('');
  const [platform, setPlatform] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [formErrors, setFormErrors] = useState({
    code: false,
    name: false,
    editRemark: false,
    packageLength: false,
    packageWidth: false,
    packageHeight: false,
    category: false,
    brand: false,
    weight: false,
    retailPrice: false,
    wholesalePrice: false,
    capFee: false,
    description: false,
    highlights: false,
    howToUse: false,
    image: false,
    barcode: false,
    size: false,
    fdaNumber: false,
    tisiNumber: false
  });

  // Marketplace Import Modals States
  const [parsedProducts, setParsedProducts] = useState([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');
  const [importIssues, setImportIssues] = useState([]);

  // Custom Excel Import States
  const [customWorkbook, setCustomWorkbook] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [selectedSheetName, setSelectedSheetName] = useState('');
  const [sheetHeaders, setSheetHeaders] = useState([]);
  const [columnMapping, setColumnMapping] = useState({
    code: '',
    barcode: '',
    name: '',
    image: '',
    brand: '',
    category: '',
    subCategory: '',
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
    packageHeight: '',
    status: ''
  });

  const getCellValue = (cell) => {
    if (!cell) return '';
    if (cell.value && typeof cell.value === 'object') {
      if (cell.value.hyperlink) return cell.value.hyperlink;
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

    const headerRow = findHeaderRow(worksheet, getCellValue);

    if (!headerRow) {
      setSheetHeaders([]);
      setImportError('ไม่พบข้อมูลหรือหัวตารางในแผ่นงานนี้');
      return;
    }

    const headersList = [];
    headerRow.eachCell((cell, colNumber) => {
      const cellText = getCellValue(cell).trim();
      if (cellText) {
        headersList.push({
          colNumber,
          name: cellText
        });
      }
    });

    setSheetHeaders(headersList);

    // Auto map columns
    const newMapping = {
      code: '',
      barcode: '',
      name: '',
      image: '',
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
      packageHeight: '',
      status: ''
    };

    headersList.forEach(h => {
      const nameLower = h.name.toLowerCase();

      if (!newMapping.code && (nameLower === 'code' || nameLower === 'sku' || nameLower.includes('รหัส') || nameLower.includes('sku')) && !nameLower.includes('บาร์') && !nameLower.includes('barcode')) {
        newMapping.code = h.name;
      }
      if (!newMapping.barcode && (nameLower.includes('barcode') || nameLower.includes('บาร์โค้ด') || nameLower.includes('รหัสบาร์'))) {
        newMapping.barcode = h.name;
      }
      if (!newMapping.name && (nameLower === 'name' || nameLower === 'title' || nameLower.includes('ชื่อ') || nameLower.includes('รายการ') || (nameLower.includes('สินค้า') && !nameLower.includes('รหัส') && !nameLower.includes('sku') && !nameLower.includes('รูป')))) {
        newMapping.name = h.name;
      }
      if (!newMapping.image && (nameLower.includes('image') || nameLower.includes('รูป') || nameLower.includes('ภาพ') || nameLower.includes('รูปภาพ') || nameLower.includes('รูปภาพสินค้า') || nameLower.includes('url'))) {
        newMapping.image = h.name;
      }
      if (!newMapping.brand && (nameLower === 'brand' || nameLower.includes('แบรนด์') || nameLower.includes('ยี่ห้อ'))) {
        newMapping.brand = h.name;
      }
      if (!newMapping.subCategory && (nameLower.includes('subcategory') || nameLower.includes('หมวดหมู่ย่อย') || nameLower.includes('หมวดย่อย') || nameLower.includes('ย่อย'))) {
        newMapping.subCategory = h.name;
      }
      if (!newMapping.category && (nameLower === 'category' || (nameLower.includes('หมวด') && !nameLower.includes('ย่อย')) || nameLower.includes('ประเภท') || nameLower.includes('กลุ่มสินค้า'))) {
        newMapping.category = h.name;
      }
      if (!newMapping.wholesalePrice && (nameLower.includes('wholesale') || nameLower.includes('ราคาส่ง') || nameLower.includes('ส่ง') || nameLower.includes('ราคาขายส่ง'))) {
        newMapping.wholesalePrice = h.name;
      }
      if (!newMapping.retailPrice && (nameLower.includes('retail') || nameLower === 'price' || nameLower.includes('ปลีก') || nameLower.includes('ขายปลีก') || nameLower.includes('ราคาขายปลีก') || nameLower.includes('ราคาปลีก') || (nameLower.includes('ราคาขาย') && !nameLower.includes('ส่ง')))) {
        newMapping.retailPrice = h.name;
      }
      if (!newMapping.capFee && (nameLower.includes('cap') || nameLower.includes('ฝา') || nameLower.includes('ค่าฝา') || nameLower.includes('ค่าบริการฝา'))) {
        newMapping.capFee = h.name;
      }
      if (!newMapping.description && (nameLower.includes('desc') || nameLower.includes('รายละเอียด') || nameLower.includes('ข้อมูล') || nameLower.includes('คำอธิบาย'))) {
        newMapping.description = h.name;
      }
      if (!newMapping.highlights && (nameLower.includes('highlight') || nameLower.includes('จุดเด่น') || nameLower.includes('คำโปรย') || nameLower.includes('ไฮไลท์'))) {
        newMapping.highlights = h.name;
      }
      if (!newMapping.howToUse && (nameLower.includes('use') || nameLower.includes('วิธีใช้') || nameLower.includes('วิธีใช้งาน'))) {
        newMapping.howToUse = h.name;
      }
      if (!newMapping.size && (nameLower.includes('size') || nameLower.includes('ขนาด') || nameLower.includes('ปริมาตร') || nameLower.includes('ความจุ'))) {
        newMapping.size = h.name;
      }
      if (!newMapping.weight && (nameLower.includes('weight') || nameLower.includes('น้ำหนัก') || nameLower.includes('กก') || nameLower.includes('g') || nameLower.includes('kg'))) {
        newMapping.weight = h.name;
      }
      if (!newMapping.fdaNumber && (nameLower.includes('fda') || nameLower.includes('อย') || nameLower.includes('เลข อย') || nameLower.includes('ใบรับจด'))) {
        newMapping.fdaNumber = h.name;
      }
      if (!newMapping.tisiNumber && (nameLower.includes('tisi') || nameLower.includes('มอก') || nameLower.includes('เลข มอก'))) {
        newMapping.tisiNumber = h.name;
      }
      if (!newMapping.packageLength && (nameLower.includes('length') || nameLower.includes('ยาว') || nameLower.includes('ความยาวพัสดุ'))) {
        newMapping.packageLength = h.name;
      }
      if (!newMapping.packageWidth && (nameLower.includes('width') || nameLower.includes('กว้าง') || nameLower.includes('ความกว้างพัสดุ'))) {
        newMapping.packageWidth = h.name;
      }
      if (!newMapping.packageHeight && (nameLower.includes('height') || nameLower.includes('สูง') || nameLower.includes('ความสูงพัสดุ'))) {
        newMapping.packageHeight = h.name;
      }
      if (!newMapping.status && (nameLower === 'status' || nameLower.includes('สถานะ') || nameLower === 'active' || nameLower.includes('การใช้งาน'))) {
        newMapping.status = h.name;
      }
    });

    // No fallback for code and name so they stay empty if not matched

    setColumnMapping(newMapping);
    setParsedProducts([]);
  };

  const handleCustomFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportLoading(true);
    setImportError('');
    setImportIssues([]);
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
      image: '',
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
      packageHeight: '',
      status: ''
    });
  };

  // Run dynamic parser when mapping/selection changes
  useEffect(() => {
    if (!customWorkbook || !selectedSheetName) {
      setParsedProducts([]);
      return;
    }

    const worksheet = customWorkbook.getWorksheet(selectedSheetName);
    if (!worksheet) return;

    const headerRowNumber = findHeaderRow(worksheet, getCellValue)?.number;
    if (!headerRowNumber) { setParsedProducts([]); setImportIssues(['ไม่พบหัวตาราง']); return; }

    const tempProducts = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber <= headerRowNumber) return; // skip header and prior rows

      const getVal = (headerName) => {
        if (!headerName) return '';
        const header = sheetHeaders.find(h => h.name === headerName);
        if (!header) return '';
        const cell = row.getCell(header.colNumber);
        return getCellValue(cell).trim();
      };

      // Check if the row is empty across all mapped columns
      const mappedKeys = Object.keys(columnMapping);
      const hasAnyMappedValue = mappedKeys.some(key => {
        const headerName = columnMapping[key];
        if (!headerName) return false;
        return getVal(headerName) !== '';
      });

      if (!hasAnyMappedValue) return; // skip empty rows

      const codeVal = getVal(columnMapping.code);
      const nameVal = getVal(columnMapping.name);
      const barcodeVal = getVal(columnMapping.barcode);
      const imageVal = getVal(columnMapping.image);
      const brandVal = getVal(columnMapping.brand);
      const categoryVal = getVal(columnMapping.category);
      const wholesaleVal = parseNumericCell(getVal(columnMapping.wholesalePrice));
      const retailVal = parseNumericCell(getVal(columnMapping.retailPrice));
      const capVal = parseNumericCell(getVal(columnMapping.capFee));
      const descriptionVal = getVal(columnMapping.description);
      const highlightsVal = getVal(columnMapping.highlights);
      const howToUseVal = getVal(columnMapping.howToUse);
      const sizeVal = getVal(columnMapping.size);
      const weightVal = getVal(columnMapping.weight);
      const fdaVal = getVal(columnMapping.fdaNumber);
      const tisiVal = getVal(columnMapping.tisiNumber);
      const packageLengthVal = parseNumericCell(getVal(columnMapping.packageLength));
      const packageWidthVal = parseNumericCell(getVal(columnMapping.packageWidth));
      const packageHeightVal = parseNumericCell(getVal(columnMapping.packageHeight));
      const rawStatusVal = getVal(columnMapping.status);

      const finalName = nameVal;
      const finalBrand = brandVal;

      const rawCat = categoryVal || '';
      let resolvedCategory = 'ไม่ระบุ';
      if (rawCat) {
        if (rawCat.includes('จัดแต่งทรงผม') || rawCat === 'Styling' || rawCat.includes('Grooming')) {
          resolvedCategory = 'Grooming - ผลิตภัณพ์จัดแต่งทรงผมและหนวด';
        } else if (rawCat.includes('เปลี่ยนสีผม') || rawCat.includes('ย้อม') || rawCat === 'Hair Color' || rawCat.includes('Chemical')) {
          resolvedCategory = 'Chemical - เคมีภัณฑ์';
        } else if (rawCat.includes('บำรุงผม') || rawCat.includes('ทรีทเมนต์') || rawCat.includes('แชมพู') || rawCat === 'Treatment' || rawCat.includes('Hair Treatment')) {
          resolvedCategory = 'Hair Treatment - ผลิตภัณฑ์บำรุงเส้นผม';
        } else {
          resolvedCategory = rawCat;
        }
      }
      if (resolvedCategory === 'ไม่ระบุ' || resolvedCategory === '') {
        resolvedCategory = ''; 
      }

      // Resolve status: accept 'Active'/'Inactive', Thai equivalents, or default to 'Active'
      let resolvedStatus = 'Active';
      if (rawStatusVal) {
        const sl = rawStatusVal.toLowerCase().trim();
        if (sl === 'inactive' || sl === 'ปิดใช้งาน' || sl === 'ปิด' || sl === 'false' || sl === '0') {
          resolvedStatus = 'Inactive';
        } else {
          resolvedStatus = 'Active';
        }
      }

      tempProducts.push({
        code: codeVal,
        _row: rowNumber,
        name: finalName,
        barcode: barcodeVal || '',
        image: imageVal && imageVal !== '-' ? imageVal : 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&auto=format&fit=crop&q=60',
        brand: finalBrand || 'ทั่วไป',
        category: resolvedCategory || 'ทั่วไป',
        subCategory: getVal(columnMapping.subCategory) || '',
        wholesalePrice: wholesaleVal === '' ? 0 : wholesaleVal,
        retailPrice: retailVal === '' ? 0 : retailVal,
        capFee: capVal === '' ? 0 : capVal,
        description: descriptionVal || '',
        highlights: highlightsVal || '',
        howToUse: howToUseVal || '',
        size: sizeVal || '',
        weight: weightVal || '',
        fdaNumber: fdaVal || '',
        tisiNumber: tisiVal || '',
        packageLength: packageLengthVal,
        packageWidth: packageWidthVal,
        packageHeight: packageHeightVal,
        status: resolvedStatus,
        _platform: 'custom'
      });
    });

    const seen = new Set();
    const issues = [];
    for (const product of tempProducts) {
      const errors = validateProduct(product);
      const code = normalizeCode(product.code);
      if (seen.has(code)) errors.push('SKU ซ้ำในไฟล์');
      seen.add(code);
      if (errors.length) issues.push('แถว ' + product._row + ': ' + errors.join(', '));
    }
    setImportIssues(issues);
    setParsedProducts(tempProducts);
  }, [columnMapping, selectedSheetName, customWorkbook, sheetHeaders]);

  const renderMappingSummaryItem = (label, valueKey) => {
    const selectedHeaderName = columnMapping[valueKey] || '';

    return (
      <div className="flex flex-col gap-1 bg-white p-2.5 rounded-xl border border-[#d2d2d7]/50 shadow-2xs transition-all hover:border-[#d2d2d7]">
        <span className="font-bold text-[#555557] text-[10px] uppercase tracking-wider flex items-center gap-1">
          {label}
        </span>
        <div className="relative mt-1">
          <select
            value={selectedHeaderName}
            onChange={(e) => {
              const val = e.target.value;
              setColumnMapping(prev => ({
                ...prev,
                [valueKey]: val
              }));
            }}
            className={`w-full text-[11.5px] bg-white border rounded-lg px-2.5 py-1.5 outline-none appearance-none cursor-pointer focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3] font-semibold pr-8 transition-colors ${selectedHeaderName
                ? 'border-emerald-200 bg-emerald-50/50 text-emerald-800'
                : 'border-[#d2d2d7] bg-[#f5f5f7] text-zinc-400'
              }`}
          >
            <option value="">-- ไม่ระบุ (เว้นว่าง) --</option>
            {sheetHeaders.map(h => (
              <option key={h.colNumber} value={h.name} className="text-black bg-white">
                {h.name}
              </option>
            ))}
          </select>
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-450">
            <ChevronDown className="w-3.5 h-3.5" />
          </div>
        </div>
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
  const [selectedSubCategory, setSelectedSubCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Product details modal state
  const [drawerProduct, setDrawerProduct] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'

  // Quick add brand/category modal state
  const [quickAddModal, setQuickAddModal] = useState({ isOpen: false, type: 'brand', value: '' });

  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportPreviewModal, setShowExportPreviewModal] = useState(false);
  const [previewPlatform, setPreviewPlatform] = useState('shopee'); // 'shopee' | 'lazada' | 'tiktok'
  const [previewLazadaCategory, setPreviewLazadaCategory] = useState('ผลิตภัณฑ์จัดแต่งทรงผม');
  // Image zoom/preview state
  const [zoomedImage, setZoomedImage] = useState(null);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setZoomedImage(null);
      }
    };
    if (zoomedImage) {
      window.addEventListener('keydown', handleEscape);
    }
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [zoomedImage]);

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
    const text = `📦 ข้อมูลสินค้าสำหรับงานขายและการตลาด\n---------------------------------\nชื่อสินค้า: ${product.name}\nรหัสสินค้า (SKU): ${product.code}\nแบรนด์: ${product.brand}\nหมวดหมู่: ${product.category}\nหมวดหมู่ย่อย: ${product.subCategory || '-'}\nราคาแนะนำ: ${(product.retailPrice || 0).toLocaleString()} บาท\nรายละเอียดสินค้า:\n${product.description || 'ไม่มีรายละเอียดเพิ่มเติม'}\n---------------------------------\n*จัดเก็บโดยระบบ PIM พันธ์วาดี*`;

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
      setSubCategory('');
      if (val) {
        setFormErrors(prev => ({ ...prev, category: false }));
      }
    }
  };

  const handleBrandSelectChange = (e) => {
    const val = e.target.value;
    if (val === 'ADD_NEW') {
      if (currentUser?.role === 'user') return;
      setQuickAddModal({ isOpen: true, type: 'brand', value: '' });
    } else {
      setBrand(val);
      if (val) {
        setFormErrors(prev => ({ ...prev, brand: false }));
      }
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        (product.name && product.name.toLowerCase().includes(q)) ||
        (product.code && product.code.toLowerCase().includes(q)) ||
        (product.barcode && product.barcode.toLowerCase().includes(q)) ||
        (product.description && product.description.toLowerCase().includes(q)) ||
        (product.variants && product.variants.some(v =>
          (v.sku && v.sku.toLowerCase().includes(q)) ||
          (v.barcode && v.barcode.toLowerCase().includes(q)) ||
          (v.options && v.options.some(o => o.value && o.value.toLowerCase().includes(q)))
        ));
      const matchesBrand = selectedBrand === 'All' || product.brand === selectedBrand;
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      const matchesSubCategory = selectedSubCategory === 'All' || product.subCategory === selectedSubCategory;
      const matchesStatus = selectedStatus === 'All' || product.status === selectedStatus;

      return matchesSearch && matchesBrand && matchesCategory && matchesSubCategory && matchesStatus;
    });
  }, [products, searchQuery, selectedBrand, selectedCategory, selectedSubCategory, selectedStatus]);

  const handleProductSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      const term = searchQuery.trim();
      if (!term) return;

      const match = findProductByBarcodeOrCode(products, term);
      if (match && match.product) {
        playScanBeep('success');
        setDrawerProduct(match.product);
      } else if (filteredProducts.length === 1) {
        playScanBeep('success');
        setDrawerProduct(filteredProducts[0]);
      } else if (filteredProducts.length === 0) {
        playScanBeep('error');
      }
    }
  };

  const availableSubCategories = useMemo(() => {
    if (category && subcategories[category]) {
      return subcategories[category];
    }
    return [];
  }, [category, subcategories]);

  const resetForm = () => {
    setCode('');
    setBarcode('');
    setName('');
    if (brands.length > 0) setBrand(brands[0]);
    if (categories.length > 0) setCategory(categories[0]);
    setSubCategory('');
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
    setStatus('Active');
    setCreatedAt('');
    setErrorMsg('');
    setEditRemark('');
    setPackageLength('');
    setPackageWidth('');
    setPackageHeight('');
    setPlatform('');
    setFormErrors({
      code: false,
      name: false,
      editRemark: false,
      packageLength: false,
      packageWidth: false,
      packageHeight: false,
      category: false,
      brand: false,
      weight: false,
      retailPrice: false,
      description: false,
      image: false,
      barcode: false,
      size: false,
      fdaNumber: false,
      tisiNumber: false
    });
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
      setSubCategory(editProduct.subCategory || '');
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
      setStatus(editProduct.status || 'Active');
      setCreatedAt(editProduct.createdAt || '');
      setPackageLength(editProduct.packageLength || '');
      setPackageWidth(editProduct.packageWidth || '');
      setPackageHeight(editProduct.packageHeight || '');
      setPlatform(editProduct.platform || editProduct._platform || '');
      setEditRemark('');
      setErrorMsg('');
      setFormErrors({
        code: false,
        name: false,
        editRemark: false,
        packageLength: false,
        packageWidth: false,
        packageHeight: false,
        category: false,
        brand: false,
        weight: false,
        retailPrice: false,
        description: false,
        image: false,
        barcode: false,
        size: false,
        fdaNumber: false,
        tisiNumber: false
      });
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
      setFormErrors(prev => ({ ...prev, image: false }));
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('ขนาดรูปภาพต้องไม่เกิน 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result);
      setErrorMsg('');
      setFormErrors(prev => ({ ...prev, image: false }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const errors = {
      code: !code.trim(),
      name: !name.trim(),
      category: !category,
      brand: !brand,
      weight: !weight.trim(),
      retailPrice: retailPrice === '' || isNaN(retailPrice) || Number(retailPrice) <= 0,
      wholesalePrice: wholesalePrice === '' || isNaN(wholesalePrice) || Number(wholesalePrice) < 0,
      capFee: capFee === '' || isNaN(capFee) || Number(capFee) < 0,
      description: !description.trim(),
      highlights: !highlights.trim(),
      howToUse: !howToUse.trim(),
      image: !image,
      packageLength: false, // optional
      packageWidth: false,  // optional
      packageHeight: false, // optional
      editRemark: !!editProduct && !editRemark.trim(),
      barcode: !barcode.trim(),
      size: !size.trim(),
      fdaNumber: !fdaNumber.trim(),
      tisiNumber: !tisiNumber.trim()
    };

    setFormErrors(errors);

    if (errors.code) {
      setAlertPopup({ type: 'error', title: 'กรอกข้อมูลไม่ครบถ้วน', message: 'กรุณากรอกรหัสสินค้า' });
      document.getElementById('product-code')?.focus();
      return;
    }
    const isDuplicate = products.some(p => p.code.toLowerCase() === code.trim().toLowerCase() && (!editProduct || p.id !== editProduct.id));
    if (isDuplicate) {
      setAlertPopup({ type: 'error', title: 'รหัสสินค้าซ้ำในระบบ', message: `รหัสสินค้า "${code.trim()}" ถูกใช้ลงทะเบียนสินค้าชิ้นอื่นแล้ว` });
      setFormErrors(prev => ({ ...prev, code: true }));
      document.getElementById('product-code')?.focus();
      return;
    }
    if (errors.barcode) {
      setAlertPopup({ type: 'error', title: 'กรอกข้อมูลไม่ครบถ้วน', message: 'กรุณากรอกรหัสบาร์โค้ด' });
      document.getElementById('product-barcode')?.focus();
      return;
    }
    if (errors.name) {
      setAlertPopup({ type: 'error', title: 'กรอกข้อมูลไม่ครบถ้วน', message: 'กรุณากรอกชื่อสินค้า/ผลิตภัณฑ์' });
      document.getElementById('product-name')?.focus();
      return;
    }
    if (errors.category) {
      setAlertPopup({ type: 'error', title: 'กรอกข้อมูลไม่ครบถ้วน', message: 'กรุณาเลือกหมวดหมู่สินค้า' });
      document.getElementById('product-category')?.focus();
      return;
    }
    if (errors.brand) {
      setAlertPopup({ type: 'error', title: 'กรอกข้อมูลไม่ครบถ้วน', message: 'กรุณาเลือกแบรนด์สินค้า' });
      document.getElementById('product-brand')?.focus();
      return;
    }
    if (errors.size) {
      setAlertPopup({ type: 'error', title: 'กรอกข้อมูลไม่ครบถ้วน', message: 'กรุณากรอกขนาดสินค้า' });
      document.getElementById('product-size')?.focus();
      return;
    }
    if (errors.weight) {
      setAlertPopup({ type: 'error', title: 'กรอกข้อมูลไม่ครบถ้วน', message: 'กรุณากรอกน้ำหนักสินค้า' });
      document.getElementById('product-weight')?.focus();
      return;
    }
    if (errors.fdaNumber) {
      setAlertPopup({ type: 'error', title: 'กรอกข้อมูลไม่ครบถ้วน', message: 'กรุณากรอกหมายเลข อย.' });
      document.getElementById('product-fda-number')?.focus();
      return;
    }
    if (errors.tisiNumber) {
      setAlertPopup({ type: 'error', title: 'กรอกข้อมูลไม่ครบถ้วน', message: 'กรุณากรอกหมายเลข มอก.' });
      document.getElementById('product-tisi-number')?.focus();
      return;
    }
    if (errors.wholesalePrice) {
      setAlertPopup({ type: 'error', title: 'กรอกข้อมูลไม่ครบถ้วน', message: 'กรุณากรอกราคาขายส่งที่ถูกต้อง (ต้องมากกว่าหรือเท่ากับ 0)' });
      document.getElementById('product-wholesale-price')?.focus();
      return;
    }
    if (errors.retailPrice) {
      setAlertPopup({ type: 'error', title: 'กรอกข้อมูลไม่ครบถ้วน', message: 'กรุณากรอกราคาขายปลีกที่ถูกต้อง (ต้องมากกว่า 0)' });
      document.getElementById('product-retail-price')?.focus();
      return;
    }
    if (errors.capFee) {
      setAlertPopup({ type: 'error', title: 'กรอกข้อมูลไม่ครบถ้วน', message: 'กรุณากรอกค่าฝาที่ถูกต้อง (ต้องมากกว่าหรือเท่ากับ 0)' });
      document.getElementById('product-cap-fee')?.focus();
      return;
    }
    if (errors.description) {
      setAlertPopup({ type: 'error', title: 'กรอกข้อมูลไม่ครบถ้วน', message: 'กรุณากรอกรายละเอียดสินค้า' });
      document.getElementById('product-description')?.focus();
      return;
    }
    if (errors.highlights) {
      setAlertPopup({ type: 'error', title: 'กรอกข้อมูลไม่ครบถ้วน', message: 'กรุณากรอกจุดเด่นสินค้า' });
      document.getElementById('product-highlights')?.focus();
      return;
    }
    if (errors.howToUse) {
      setAlertPopup({ type: 'error', title: 'กรอกข้อมูลไม่ครบถ้วน', message: 'กรุณากรอกวิธีใช้' });
      document.getElementById('product-how-to-use')?.focus();
      return;
    }
    if (errors.image) {
      setAlertPopup({ type: 'error', title: 'กรอกข้อมูลไม่ครบถ้วน', message: 'กรุณาใส่ภาพประกอบสินค้า' });
      return;
    }
    if (errors.editRemark) {
      setAlertPopup({ type: 'error', title: 'ข้อมูลไม่ครบถ้วน', message: 'กรุณากรอกหมายเหตุการแก้ไข' });
      document.getElementById('product-edit-remark')?.focus();
      return;
    }

    const now = new Date();
    const currentFormattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newProductData = {
      id: editProduct ? editProduct.id : Date.now().toString(),
      code: code.trim(),
      barcode: barcode.trim(),
      name: name.trim(),
      brand,
      category,
      subCategory: subCategory.trim(),
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

    const validationErrors = validateProduct(newProductData);
    if (validationErrors.length) { setAlertPopup({ type: 'error', title: 'ข้อมูลไม่ถูกต้อง', message: validationErrors.join(', ') }); return; }
    try {
      await onSaveProduct(newProductData);
      resetForm();
      setShowForm(false);
      setAlertPopup({ type: 'success', title: 'บันทึกข้อมูลสำเร็จ', message: 'เซิร์ฟเวอร์บันทึกข้อมูลสินค้าแล้ว' });
    } catch (error) {
      setAlertPopup({ type: 'error', title: 'บันทึกไม่สำเร็จ', message: error.message });
    }
  };

  return (
    <div className="space-y-6 w-full min-w-0">

      {/* Marketplace Import Modal */}
      {showImportModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fade-in no-print">
          <div onClick={closeImportModal} className="absolute inset-0" />
          <div className="relative bg-white rounded-3xl border border-[#d2d2d7]/50 max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-scale-in text-[#1d1d1f] shadow-2xl">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#e8e8ed] flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-sm font-extrabold uppercase tracking-wide">นำเข้าสินค้าจาก Excel</h3>
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
                <div className="p-3.5 bg-zinc-50 border border-zinc-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <span className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider block">💡 วิธีนำเข้าข้อมูลจาก Excel:</span>
                    <ol className="text-[10px] text-zinc-500 list-decimal list-inside space-y-1">
                      <li>เลือกไฟล์ Excel (.xlsx) ที่ต้องการนำเข้าด้านล่างนี้</li>
                      <li>ระบบจะวิเคราะห์หัวตารางและจับคู่คอลัมน์ให้อัตโนมัติตามโครงสร้างแบบฟอร์มสินค้า</li>
                      <li>ตรวจสอบความถูกต้องในตารางตัวอย่างด้านล่างก่อนยืนยันนำเข้า</li>
                    </ol>
                  </div>
                  <div className="flex-shrink-0">
                    <a
                      href="/แพลตฟอร์มนำเข้าสินค้า.xlsx"
                      download
                      className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl transition-all cursor-pointer font-bold text-[#1d1d1f] hover:text-[#0071e3] shadow-xs text-[11px] h-fit"
                    >
                      <Download className="w-3.5 h-3.5 text-[#0071e3]" />
                      <span>ดาวน์โหลดเทมเพลตนำเข้าสินค้า</span>
                    </a>
                  </div>
                </div>


                {/* File Upload Input */}
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
                  {importIssues.length > 0 && <div role="alert" className="text-xs text-red-700 bg-red-50 p-3 rounded-xl space-y-1"><p>กรุณาแก้ไขข้อมูล {importIssues.length} แถวก่อนนำเข้า</p>{importIssues.slice(0, 10).map(issue => <p key={issue}>{issue}</p>)}</div>}
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
                {sheetHeaders.length > 0 && (() => {
                  const isAutoMapped = columnMapping.code && columnMapping.name;
                  const mappedCount = Object.values(columnMapping).filter(Boolean).length;
                  const totalFields = Object.keys(columnMapping).length;
                  return (
                    <div className="space-y-2.5 border-t border-zinc-150 pt-3.5">
                      {/* Auto-map status banner */}
                      {isAutoMapped ? (
                        <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-50 border border-emerald-200/70 rounded-2xl animate-fade-in">
                          <span className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5 text-white" />
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-emerald-800">พร้อมนำเข้า — ไม่ต้องตั้งค่าเพิ่ม</p>
                            <p className="text-[10px] text-emerald-600 mt-0.5">จับคู่คอลัมน์อัตโนมัติสำเร็จ {mappedCount}/{totalFields} ช่อง · กดปุ่ม "ยืนยันการนำเข้าสินค้า" ได้เลย</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200/70 rounded-2xl animate-fade-in">
                          <span className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center shrink-0">
                            <AlertCircle className="w-3.5 h-3.5 text-white" />
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-amber-800">กรุณาตั้งค่าคอลัมน์ก่อนนำเข้า</p>
                            <p className="text-[10px] text-amber-600 mt-0.5">ยังไม่พบคอลัมน์ "รหัสสินค้า" หรือ "ชื่อสินค้า" — เลือก dropdown ด้านล่างให้ครบก่อน</p>
                          </div>
                        </div>
                      )}

                      {/* Show advanced mapping only when not fully auto-mapped */}
                      {!isAutoMapped && (
                        <>
                          <span className="text-[10px] font-bold text-[#555557] uppercase tracking-wider block">
                            2. ผลการจับคู่คอลัมน์ข้อมูลสินค้าอัตโนมัติ (Column Mapping Summary)
                          </span>
                          <p className="text-[9px] text-zinc-500 leading-relaxed">
                            ระบบจะวิเคราะห์หัวตารางใน Excel แถวแรกที่มีข้อมูลเพื่อจับคู่โดยอัตโนมัติให้ตรงกับแบบฟอร์มเพิ่มข้อมูลสินค้าในระบบ PIM
                          </p>
                        </>
                      )}

                      {/* Always allow advanced override */}
                      <details open={!isAutoMapped} className="group">
                        {isAutoMapped && (
                          <summary className="text-[10px] font-bold text-zinc-400 hover:text-[#0071e3] cursor-pointer list-none flex items-center gap-1 select-none">
                            <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
                            ดู/แก้ไขการจับคู่คอลัมน์
                          </summary>
                        )}
                        <div className={`space-y-4 text-xs ${isAutoMapped ? 'mt-2.5' : ''}`}>
                      {/* กลุ่ม 1: ข้อมูลสินค้าหลัก */}
                      <div className="bg-zinc-50/50 p-4 rounded-2xl border border-zinc-200/80 space-y-2.5">
                        <h4 className="font-extrabold text-zinc-800 text-[10px] uppercase tracking-wider border-b border-zinc-200/80 pb-1.5 mb-2">1. ข้อมูลพื้นฐานสินค้า</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5">
                          {renderMappingSummaryItem('รหัสสินค้า (SKU / Code) *', 'code')}
                          {renderMappingSummaryItem('ชื่อสินค้า *', 'name')}
                          {renderMappingSummaryItem('รหัสบาร์โค้ด', 'barcode')}
                          {renderMappingSummaryItem('รูปภาพสินค้า (URL หรือที่อยู่ไฟล์)', 'image')}
                          {renderMappingSummaryItem('แบรนด์สินค้า', 'brand')}
                          {renderMappingSummaryItem('หมวดหมู่สินค้า', 'category')}
                          {renderMappingSummaryItem('ขนาด', 'size')}
                          {renderMappingSummaryItem('น้ำหนัก', 'weight')}
                        </div>
                      </div>

                      {/* กลุ่ม 2: ข้อมูลราคาและคลัง */}
                      <div className="bg-zinc-50/50 p-4 rounded-2xl border border-zinc-200/80 space-y-2.5">
                        <h4 className="font-extrabold text-zinc-800 text-[10px] uppercase tracking-wider border-b border-zinc-200/80 pb-1.5 mb-2">2. ข้อมูลราคาและสถานะ</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          {renderMappingSummaryItem('ราคาขายส่ง', 'wholesalePrice')}
                          {renderMappingSummaryItem('ราคาขายปลีก', 'retailPrice')}
                          {renderMappingSummaryItem('ค่าฝา', 'capFee')}
                          {renderMappingSummaryItem('สถานะ (Active/Inactive)', 'status')}
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
                      </details>
                    </div>
                  );
                })()}


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
                disabled={parsedProducts.length === 0 || importIssues.length > 0 || importLoading}
                onClick={async () => {
                  setImportLoading(true);
                  try { await onImportProducts(parsedProducts, `ไฟล์ Excel (${selectedSheetName})`); }
                  catch (error) { setImportError(error.message); return; }
                  finally { setImportLoading(false); }
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
                ยืนยันการนำเข้าสินค้า
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
            </div>
            <div className="flex gap-2.5 pt-2 text-xs font-semibold">
              <button type="button"
                onClick={() => setShowClearAllConfirm(false)}
                className="flex-1 py-2.5 border border-[#d2d2d7] text-[#1d1d1f] rounded-full hover:bg-[#f5f5f7] transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button type="button"
                onClick={async () => {
                  try { await onClearAllProducts(); } catch (error) { setAlertPopup({ type: 'error', title: 'ลบไม่สำเร็จ', message: error.message }); return; }
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

      {/* Export Preview Modal */}
      {showExportPreviewModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs animate-fade-in no-print">
          <div onClick={() => setShowExportPreviewModal(false)} className="absolute inset-0" />
          <div className="relative bg-white rounded-3xl border border-[#d2d2d7]/50 max-w-5xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-scale-in text-[#1d1d1f] shadow-2xl">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#e8e8ed] flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-sm font-extrabold uppercase tracking-wide flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-[#0071e3]" />
                  ตัวอย่างข้อมูลสำหรับนำออกแผ่นงาน (Export Preview)
                </h3>
                <p className="text-[10px] text-zinc-550 mt-0.5">ตรวจสอบโครงสร้างแถวและคอลัมน์ที่จะถูกเขียนลงไฟล์จริงตามที่ระบบตลาดต้องการ</p>
              </div>
              <button
                type="button"
                onClick={() => setShowExportPreviewModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-black transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Platform selector / Tab Bar */}
            <div className="px-6 pt-3 border-b border-[#e8e8ed] flex flex-col gap-2.5 flex-shrink-0 bg-zinc-50/50">
              <div className="flex gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPreviewPlatform('shopee')}
                  className={`px-4 py-2 rounded-full border transition-all cursor-pointer ${previewPlatform === 'shopee'
                      ? 'bg-[#ff5722] border-[#ff5722] text-white shadow-xs'
                      : 'bg-white border-[#d2d2d7] text-zinc-600 hover:bg-zinc-100'
                    }`}
                >
                  Shopee Format
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewPlatform('lazada')}
                  className={`px-4 py-2 rounded-full border transition-all cursor-pointer ${previewPlatform === 'lazada'
                      ? 'bg-[#000080] border-[#000080] text-white shadow-xs'
                      : 'bg-white border-[#d2d2d7] text-zinc-600 hover:bg-zinc-100'
                    }`}
                >
                  Lazada Format
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewPlatform('tiktok')}
                  className={`px-4 py-2 rounded-full border transition-all cursor-pointer ${previewPlatform === 'tiktok'
                      ? 'bg-zinc-800 border-zinc-800 text-white shadow-xs'
                      : 'bg-white border-[#d2d2d7] text-zinc-600 hover:bg-zinc-100'
                    }`}
                >
                  TikTok Shop Format
                </button>
              </div>

              {/* Sub-selector for Lazada category sheets */}
              {previewPlatform === 'lazada' && (
                <div className="flex flex-wrap gap-1.5 pb-2 text-[10px] font-bold text-zinc-550 border-t border-zinc-200/50 pt-2 animate-fade-in">
                  {lazadaCategorySheets.map(sheetName => {
                    const count = filteredProducts.filter(p => resolveLazadaSheet(p) === sheetName).length;
                    return (
                      <button
                        key={sheetName}
                        type="button"
                        onClick={() => setPreviewLazadaCategory(sheetName)}
                        className={`px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${previewLazadaCategory === sheetName
                            ? 'bg-[#0071e3]/10 border-[#0071e3] text-[#0071e3]'
                            : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                          }`}
                      >
                        {sheetName} ({count})
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-auto p-6 bg-zinc-50/50">
              <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden max-h-[45vh]">
                <table className="w-full border-collapse text-left text-xs table-fixed min-w-[1200px]">
                  <thead>
                    <tr className="bg-[#f5f5f7] text-zinc-700 font-bold border-b border-zinc-200">
                      <th className="p-3 w-12 text-center border-r border-zinc-200/50 bg-[#e8e8ed]">#</th>
                      {(() => {
                        const cols = previewPlatform === 'shopee'
                          ? shopeeCols
                          : previewPlatform === 'tiktok'
                            ? tiktokCols
                            : (LAZADA_PREVIEW_COLS[previewLazadaCategory] || []);
                        return cols.map((col, idx) => (
                          <th key={idx} className="p-3 border-r border-zinc-200/50 truncate font-extrabold text-[11px] uppercase tracking-wider animate-fade-in">
                            {col.label}
                          </th>
                        ));
                      })()}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-150">
                    {(() => {
                      const displayProducts = previewPlatform === 'shopee'
                        ? filteredProducts
                        : previewPlatform === 'tiktok'
                          ? filteredProducts
                          : filteredProducts.filter(p => resolveLazadaSheet(p) === previewLazadaCategory);

                      const cols = previewPlatform === 'shopee'
                        ? shopeeCols
                        : previewPlatform === 'tiktok'
                          ? tiktokCols
                          : (LAZADA_PREVIEW_COLS[previewLazadaCategory] || []);

                      if (displayProducts.length === 0) {
                        return (
                          <tr>
                            <td colSpan={cols.length + 1} className="p-8 text-center text-zinc-400 font-semibold italic">
                              ไม่มีสินค้าที่เข้าเงื่อนไขสำหรับจัดเก็บในหมวดหมู่นี้
                            </td>
                          </tr>
                        );
                      }

                      return displayProducts.map((p, idx) => (
                        <tr key={p.id || idx} className="hover:bg-zinc-50 text-[11px] leading-relaxed text-zinc-650 animate-fade-in">
                          <td className="p-3 text-center font-mono border-r border-zinc-200/50 font-bold text-zinc-400 bg-zinc-50/50">{idx + 1}</td>
                          {cols.map((col, cIdx) => (
                            <td key={cIdx} className="p-3 border-r border-zinc-200/50 truncate max-w-[250px]" title={String(col.value(p) || '')}>
                              {String(col.value(p) || '')}
                            </td>
                          ))}
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 text-[10px] text-zinc-400 font-medium leading-relaxed">
                * ข้อมูลที่แสดงข้างต้นเป็นเพียง <strong>"ตัวอย่างตารางก่อนนำออกจริง"</strong> (Excel Preview) เพื่ออำนวยความสะดวกในการจัดหมวดหมู่และคอลัมน์โดยไม่จำเป็นต้องดาวน์โหลดไฟล์ลงคอมพิวเตอร์ก่อนตรวจสอบทุกครั้ง
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#e8e8ed] flex gap-3 flex-shrink-0 bg-white">
              <button
                type="button"
                onClick={() => setShowExportPreviewModal(false)}
                className="flex-1 py-2.5 border border-[#d2d2d7] text-[#1d1d1f] hover:bg-[#f5f5f7] text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
              <button
                type="button"
                onClick={() => {
                  if (previewPlatform === 'shopee') exportShopee(filteredProducts);
                  else if (previewPlatform === 'lazada') exportLazada(filteredProducts);
                  else exportTikTok(filteredProducts);
                  setShowExportPreviewModal(false);
                }}
                className={`flex-1 py-2.5 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${previewPlatform === 'shopee'
                    ? 'bg-[#ff5722] hover:bg-[#ff6838]'
                    : previewPlatform === 'lazada'
                      ? 'bg-[#000080] hover:bg-[#00009c]'
                      : 'bg-zinc-800 hover:bg-black'
                  }`}
              >
                <Download className="w-4 h-4" />
                ดาวน์โหลดไฟล์ {previewPlatform === 'shopee' ? 'Shopee' : previewPlatform === 'lazada' ? 'Lazada' : 'TikTok Shop'} จริง (.xlsx)
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print relative z-30">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-5 rounded-full bg-gradient-to-b from-[#0071e3] to-[#00c2ff]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0071e3]">PRODUCT MANAGEMENT</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-[#1d1d1f] leading-none">จัดการข้อมูลสินค้า</h1>
        </div>
        <div className="flex flex-wrap gap-2.5 items-center self-start sm:self-auto">
          {/* Import Button */}
          <button
            type="button"
            onClick={() => {
              setParsedProducts([]);
              setImportError('');
              setShowImportModal(true);
            }}
            className="group relative overflow-hidden px-4 py-2.5 bg-white hover:bg-[#f5f5f7] text-[#1d1d1f] border border-[#d2d2d7] text-xs font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
            <Upload className="w-4 h-4" />
            นำเข้าสินค้า
          </button>

          {/* Delete All Products Button */}
          {products.length > 0 && currentUser?.role === 'admin' && (
            <button
              type="button"
              onClick={() => setShowClearAllConfirm(true)}
              className="group relative overflow-hidden px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-1.5 cursor-pointer"
              title="ลบข้อมูลสินค้าทั้งหมดออกจากคลังสินค้า"
            >
              <span className="absolute inset-0 bg-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
              <Trash2 className="w-4 h-4 text-rose-500" />
              ลบสินค้าทั้งหมด
            </button>
          )}

          {/* Export Dropdown */}
          <div
            className={`relative ${showExportDropdown ? 'z-50' : ''}`}
            onMouseEnter={() => setShowExportDropdown(true)}
            onMouseLeave={() => setShowExportDropdown(false)}
          >
            <button
              type="button"
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              className="group relative overflow-hidden px-4 py-2.5 bg-white hover:bg-[#f5f5f7] text-[#1d1d1f] border border-[#d2d2d7] text-xs font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
              <Download className="w-4 h-4" />
              นำออกสินค้า
              <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
            </button>
            {showExportDropdown && (
              <div className="absolute right-0 top-full pt-1.5 w-52 z-50">
                <div className="bg-white border border-[#d2d2d7]/80 rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.18),0_4px_12px_rgba(0,0,0,0.08)] overflow-hidden py-2 animate-scale-in text-[#1d1d1f]">
                  <span className="text-[9px] font-bold text-[#8e8e93] px-4 py-1 block uppercase tracking-wider">ดาวน์โหลดเทมเพลต</span>
                  <button
                    type="button"
                    onClick={() => {
                      exportShopee(filteredProducts);
                      if (addActivityLog) {
                        addActivityLog(`นำออกสินค้า Shopee Excel (จำนวน ${filteredProducts.length} รายการ)`);
                      }
                      setShowExportDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-[#ff5722]/5 hover:text-[#ff5722] transition-colors cursor-pointer flex items-center gap-2"
                  >
                    Shopee Excel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      exportLazada(filteredProducts);
                      if (addActivityLog) {
                        addActivityLog(`นำออกสินค้า Lazada Excel (จำนวน ${filteredProducts.length} รายการ)`);
                      }
                      setShowExportDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-[#000080]/5 hover:text-[#000080] transition-colors cursor-pointer flex items-center gap-2"
                  >
                    Lazada Excel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      exportTikTok(filteredProducts);
                      if (addActivityLog) {
                        addActivityLog(`นำออกสินค้า TikTok Shop Excel (จำนวน ${filteredProducts.length} รายการ)`);
                      }
                      setShowExportDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 hover:text-black transition-colors cursor-pointer flex items-center gap-2"
                  >
                    TikTok Shop Excel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      exportToExcel(filteredProducts);
                      if (addActivityLog) {
                        addActivityLog(`นำออกข้อมูลสินค้าหลักทั้งหมดเป็นไฟล์ Excel (จำนวน ${filteredProducts.length} รายการ)`);
                      }
                      setShowExportDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 hover:text-black transition-colors cursor-pointer flex items-center gap-2"
                  >
                    ส่งออก Excel
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="group relative overflow-hidden px-4 py-2.5 bg-gradient-to-r from-[#0071e3] to-[#0096ff] hover:from-[#0080ff] hover:to-[#00a8ff] text-white text-xs font-bold rounded-xl shadow-lg hover:shadow-blue-500/30 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
            <Plus className="w-4 h-4" />
            เพิ่มสินค้าใหม่
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      <div className="no-print relative z-10 bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-[#d2d2d7]/50 shadow-xs">
        <div className="flex flex-col md:flex-row md:flex-wrap gap-3 items-stretch md:items-center">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-[#0071e3] animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#555557]">ตัวกรอง</span>
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px] md:max-w-sm">
            <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0071e3] pointer-events-none" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ, รหัส SKU, บาร์โค้ด ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleProductSearchKeyDown}
              className="w-full pl-9 pr-8 py-2 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-xs text-[#1d1d1f] focus:outline-hidden focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10 focus:bg-white transition-all placeholder:text-zinc-400 font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <DropdownFilter
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            options={[
              { value: 'All', label: 'ทุกแบรนด์สินค้า' },
              ...brands.map(brand => ({ value: brand, label: brand }))
            ]}
          />

          <DropdownFilter
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setSelectedSubCategory('All'); }}
            options={[
              { value: 'All', label: 'ทุกหมวดหมู่หลัก' },
              ...categories.map(cat => ({ value: cat, label: cat }))
            ]}
          />

          <DropdownFilter
            value={selectedSubCategory}
            onChange={(e) => setSelectedSubCategory(e.target.value)}
            options={[
              { value: 'All', label: 'ทุกหมวดหมู่ย่อย' },
              ...Array.from(new Set(selectedCategory !== 'All' ? (subcategories[selectedCategory] || []) : Object.values(subcategories).flat())).map(sub => ({ value: sub, label: sub }))
            ]}
          />

          <DropdownFilter
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            options={[
              { value: 'All', label: 'สถานะทั้งหมด' },
              { value: 'Active', label: 'เปิดใช้งาน (Active)' },
              { value: 'Inactive', label: 'ปิดใช้งาน (Inactive)' }
            ]}
          />
        </div>
      </div>

      {/* Table/Grid Container */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/50 shadow-xs overflow-hidden max-w-full">
        <div className="px-4.5 py-3.5 border-b border-[#e8e8ed] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h4 className="text-xs font-black text-[#1d1d1f] tracking-widest uppercase">รายชื่อสินค้าทั้งหมด</h4>
            <span className="px-2.5 py-0.5 text-[10px] font-black bg-[#0071e3] text-white rounded-full">
              {filteredProducts.length.toLocaleString()} รายการ
            </span>
          </div>

          {/* View Mode Switcher */}
          <div className="flex bg-[#f5f5f7] p-0.5 rounded-lg border border-[#d2d2d7]/40 text-zinc-550 items-center no-print">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md flex items-center gap-1 text-[11px] font-bold transition-all cursor-pointer ${viewMode === 'table'
                  ? 'bg-white text-black shadow-xs font-extrabold'
                  : 'hover:text-black'
                }`}
              title="แสดงแบบตาราง"
            >
              <List className="w-3.5 h-3.5" />
              <span>ตาราง</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md flex items-center gap-1 text-[11px] font-bold transition-all cursor-pointer ${viewMode === 'grid'
                  ? 'bg-[#ffffff] text-black shadow-xs font-extrabold'
                  : 'hover:text-black'
                }`}
              title="แสดงแบบแคตตาล็อก"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>แคตตาล็อก</span>
            </button>
          </div>
        </div>

        {viewMode === 'table' ? (
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-220px)] text-zinc-950 scrollbar-thin">
            <table className="w-full text-left border-collapse text-xs table-fixed min-w-[960px]">
              <thead>
                <tr className="text-[#86868b] font-black border-b border-[#e8e8ed] text-[10px] uppercase tracking-widest">
                  <th className="sticky top-0 bg-[#f5f5f7] p-2 sm:p-3.5 w-12 text-center z-10">ลำดับ</th>
                  <th className="sticky top-0 bg-[#f5f5f7] p-2 sm:p-3.5 w-12 text-center z-10">รูปภาพ</th>
                  <th className="sticky top-0 bg-[#f5f5f7] p-2 sm:p-3.5 w-20 z-10">รหัสสินค้า</th>
                  <th className="sticky top-0 bg-[#f5f5f7] p-2 sm:p-3.5 w-28 z-10">รหัสบาร์โค้ด</th>
                  <th className="sticky top-0 bg-[#f5f5f7] p-2 sm:p-3.5 w-48 sm:w-56 z-10">ชื่อสินค้า</th>
                  <th className="sticky top-0 bg-[#f5f5f7] p-2 sm:p-3.5 w-28 z-10">แบรนด์</th>
                  <th className="sticky top-0 bg-[#f5f5f7] p-2 sm:p-3.5 w-28 z-10">หมวดหมู่</th>
                  <th className="sticky top-0 bg-[#f5f5f7] p-2 sm:p-3.5 w-28 z-10">หมวดหมู่ย่อย</th>
                  <th className="sticky top-0 bg-[#f5f5f7] p-2 sm:p-3.5 text-right w-20 z-10">ราคาส่ง</th>
                  <th className="sticky top-0 bg-[#f5f5f7] p-2 sm:p-3.5 text-right w-20 z-10">ราคาปลีก</th>
                  <th className="sticky top-0 bg-[#f5f5f7] p-2 sm:p-3.5 text-center w-20 z-10">สถานะ</th>
                  <th className="sticky top-0 bg-[#f5f5f7] p-2 sm:p-3.5 text-center w-24 no-print z-10">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f5]">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan="12" className="p-16 text-center">
                      <div className="space-y-3">
                        <FileSpreadsheet className="w-12 h-12 text-[#555557] mx-auto" />
                        <h3 className="font-semibold text-[#1d1d1f] text-xs uppercase tracking-wider">ไม่พบผลการค้นหา</h3>
                        <p className="text-[#555557] text-[11px] max-w-sm mx-auto mt-1">
                          ไม่พบสินค้าที่ตรงตามเงื่อนไขที่เลือก กรุณาลองปรับเปลี่ยนตัวเลือกตัวกรองใหม่อีกครั้ง
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product, idx) => (
                    <tr key={product.id} className="hover:bg-[#fafafa] transition-colors group text-[#1d1d1f]">
                      <td className="px-2 py-2 w-12 text-center font-mono text-[11px] text-zinc-500">
                        {idx + 1}
                      </td>
                      <td className="px-2 py-2 w-12">
                        <div 
                          className="w-8 h-8 rounded-lg overflow-hidden bg-[#f5f5f7] border border-[#d2d2d7]/30 flex-shrink-0 mx-auto flex items-center justify-center cursor-pointer hover:opacity-85 transition-opacity"
                          title="คลิกเพื่อดูรูปขนาดเต็ม"
                          onClick={() => {
                            const imgSrc = (!product.image || product.image === '-') 
                              ? 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&auto=format&fit=crop&q=60' 
                              : product.image;
                            setZoomedImage(imgSrc);
                          }}
                        >
                          <img 
                            src={(!product.image || product.image === '-') ? 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&auto=format&fit=crop&q=60' : product.image} 
                            alt={product.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                          />
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <span className="font-mono text-[11px] text-zinc-700 whitespace-nowrap">{product.code}</span>
                      </td>
                      <td className="px-2 py-2">
                        <span className="font-mono text-[11px] text-zinc-700 whitespace-nowrap">{product.barcode || '-'}</span>
                      </td>
                      <td className="px-2 py-2 min-w-[140px]">
                        <span className="font-semibold text-black leading-tight block line-clamp-2">{product.name}</span>
                      </td>
                      <td className="px-2 py-2">
                        <span className="text-zinc-700 truncate block max-w-[90px]" title={product.brand}>{product.brand || '-'}</span>
                      </td>
                      <td className="px-2 py-2">
                        <span className="text-zinc-600 truncate block max-w-[90px]" title={product.category}>{product.category}</span>
                      </td>
                      <td className="px-2 py-2">
                        <span className="text-zinc-600 truncate block max-w-[90px]" title={product.subCategory}>{product.subCategory || '-'}</span>
                      </td>
                      <td className="px-2 py-2 text-right whitespace-nowrap font-medium text-zinc-900">{(product.wholesalePrice || 0).toLocaleString()} ฿</td>
                      <td className="px-2 py-2 text-right whitespace-nowrap font-bold text-black">{(product.retailPrice || 0).toLocaleString()} ฿</td>
                      <td className="px-2 py-2 text-center">
                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full border ${product.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                            : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                          }`}>
                          {product.status === 'Active' ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center whitespace-nowrap no-print">
                        <div className="flex justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setDrawerProduct(product)}
                            className="p-1 text-zinc-650 hover:bg-zinc-100 rounded-md transition-colors cursor-pointer"
                            title="ดูรายละเอียดสินค้า"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onEditProduct(product);
                              setShowForm(true);
                            }}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                            title="แก้ไขข้อมูลสินค้า"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          {currentUser?.role === 'admin' && (
                            <button
                              type="button"
                              onClick={() => setProductToDelete(product)}
                              className="p-1 text-red-650 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                              title="ลบสินค้า"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-5 bg-zinc-50/30">
            {filteredProducts.length === 0 ? (
              <div className="p-16 text-center bg-white rounded-xl border border-zinc-200/50">
                <div className="space-y-3">
                  <FileSpreadsheet className="w-12 h-12 text-[#555557] mx-auto" />
                  <h3 className="font-semibold text-[#1d1d1f] text-xs uppercase tracking-wider">ไม่พบผลการค้นหา</h3>
                  <p className="text-[#555557] text-[11px] max-w-sm mx-auto mt-1">
                    ไม่พบสินค้าที่ตรงตามเงื่อนไขที่เลือก กรุณาลองปรับเปลี่ยนตัวเลือกตัวกรองใหม่อีกครั้ง
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 animate-fade-in">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white rounded-2xl border border-zinc-200/65 flex flex-col justify-between p-3 transition-all duration-300 group relative select-none hover:border-zinc-350 hover:shadow-xs"
                  >
                    {/* Inner image container (Padded Apple style) */}
                    <div className="aspect-square w-full bg-[#f5f5f7] rounded-xl relative overflow-hidden flex items-center justify-center group/img">
                      {product.image && product.image !== '-' ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-[82%] h-[82%] object-contain group-hover/img:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <ImageIcon className="w-9 h-9 text-zinc-300" />
                      )}

                      {/* Apple-style hover actions overlay */}
                      <div 
                        onClick={() => {
                          const imgSrc = (!product.image || product.image === '-') 
                            ? 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&auto=format&fit=crop&q=60' 
                            : product.image;
                          setZoomedImage(imgSrc);
                        }}
                        className="absolute inset-0 bg-[#1d1d1f]/5 border border-black/5 opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-2 cursor-pointer"
                        title="คลิกเพื่อดูรูปขนาดเต็ม"
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDrawerProduct(product);
                          }}
                          className="px-4 py-1.5 bg-white text-[10.5px] font-bold text-black rounded-full shadow-xs hover:bg-[#f5f5f7] active:scale-95 transition-all cursor-pointer"
                        >
                          ดูรายละเอียด
                        </button>

                        <div className="flex gap-1.5 mt-0.5 no-print" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => {
                              onEditProduct(product);
                              setShowForm(true);
                            }}
                            className="w-7 h-7 bg-white text-zinc-700 hover:text-[#0071e3] rounded-full flex items-center justify-center shadow-xs active:scale-90 transition-all cursor-pointer"
                            title="แก้ไขสินค้า"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          {currentUser?.role === 'admin' && (
                            <button
                              type="button"
                              onClick={() => setProductToDelete(product)}
                              className="w-7 h-7 bg-white text-zinc-700 hover:text-rose-600 rounded-full flex items-center justify-center shadow-xs active:scale-90 transition-all cursor-pointer"
                              title="ลบสินค้า"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Metadata and Info (No footer layout, pure minimal) */}
                    <div className="pt-3 px-1 flex-1 flex flex-col justify-between">
                      <div className="space-y-1">
                        {/* Tags / Brand / Category */}
                        <div className="flex flex-wrap gap-1 text-[9px] font-extrabold uppercase tracking-wider text-zinc-400">
                          {product.brand && (
                            <span className="text-purple-650">{product.brand}</span>
                          )}
                          {product.brand && <span>·</span>}
                          <span className="text-zinc-550">{product.category?.split(' - ')[0] || product.category}</span>
                        </div>

                        {/* Title */}
                        <h4 className="font-bold text-[12px] text-[#1d1d1f] leading-snug group-hover:text-[#0071e3] transition-colors line-clamp-2 h-8.5">
                          {product.name}
                        </h4>
                      </div>

                      {/* Code, Status and Prices */}
                      <div className="mt-3.5 pt-2 border-t border-zinc-100/70 space-y-2">
                        {/* Code & Status */}
                        <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400">
                          <span>SKU: {product.code}</span>
                          {product.status !== 'Active' && (
                            <span className="text-rose-500 font-sans font-bold">ปิดใช้งาน</span>
                          )}
                        </div>

                        {/* Prices */}
                        <div className="flex items-baseline justify-between select-none">
                          <span className="text-[10px] text-zinc-400 font-medium">
                            ส่ง: <span className="font-bold text-zinc-700 font-mono">{(product.wholesalePrice || 0).toLocaleString()} ฿</span>
                          </span>
                          <span className="text-xs font-bold text-zinc-400">
                            ปลีก: <span className="text-sm font-black text-black font-mono">{(product.retailPrice || 0).toLocaleString()} ฿</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* แถบเครื่องมือจัดการสินค้าบนหน้าจอมือถือ (เนื่องจากบนมือถือไม่มี hover) */}
                    <div className="mt-2.5 pt-2.5 border-t border-zinc-100 flex gap-2 sm:hidden no-print">
                      <button
                        type="button"
                        onClick={() => setDrawerProduct(product)}
                        className="flex-1 py-1.5 bg-[#f5f5f7] text-[10.5px] font-bold text-zinc-700 rounded-lg hover:bg-zinc-200 active:scale-95 transition-all cursor-pointer text-center"
                      >
                        รายละเอียด
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onEditProduct(product);
                          setShowForm(true);
                        }}
                        className="px-2.5 py-1.5 border border-zinc-200 text-zinc-650 hover:text-[#0071e3] rounded-lg flex items-center justify-center active:scale-90 transition-all cursor-pointer"
                        title="แก้ไขสินค้า"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      {currentUser?.role === 'admin' && (
                        <button
                          type="button"
                          onClick={() => setProductToDelete(product)}
                          className="px-2.5 py-1.5 border border-zinc-200 text-zinc-650 hover:text-rose-600 rounded-lg flex items-center justify-center active:scale-90 transition-all cursor-pointer"
                          title="ลบสินค้า"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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
              <button type="button"
                onClick={() => setProductToDelete(null)}
                className="flex-1 py-2.5 border border-[#d2d2d7] text-[#1d1d1f] rounded-full hover:bg-[#f5f5f7] transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button type="button"
                onClick={async () => {
                  const deletedName = productToDelete.name;
                  try { await onDeleteProduct(productToDelete.id); } catch (error) { setAlertPopup({ type: 'error', title: 'ลบไม่สำเร็จ', message: error.message }); return; }
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
                              id="product-code"
                              type="text"
                              value={code}
                              onChange={(e) => {
                                setCode(e.target.value);
                                if (e.target.value.trim()) {
                                  setFormErrors(prev => ({ ...prev, code: false }));
                                }
                              }}
                              className={`form-input min-w-0 bg-[#f5f5f7] font-mono focus:bg-white ${formErrors.code ? 'error' : ''
                                }`}
                            />
                            {formErrors.code && (
                              <span className="text-[11px] text-red-500 font-semibold mt-1 block">กรุณากรอกรหัสสินค้า</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <label className="form-label min-h-[28px] flex items-end pb-1">รหัสบาร์โค้ด<span className="text-red-500">*</span></label>
                            <input
                              id="product-barcode"
                              type="text"
                              value={barcode}
                              onChange={(e) => {
                                setBarcode(e.target.value);
                                if (e.target.value.trim()) {
                                  setFormErrors(prev => ({ ...prev, barcode: false }));
                                }
                              }}
                              className={`form-input min-w-0 bg-[#f5f5f7] focus:bg-white ${formErrors.barcode ? 'error' : ''
                                }`}
                            />
                            {formErrors.barcode && (
                              <span className="text-[11px] text-red-500 font-semibold mt-1 block">กรุณากรอกรหัสบาร์โค้ด</span>
                            )}
                          </div>
                        </div>

                        {/* แถว 2: ชื่อสินค้า */}
                        <div className="min-w-0">
                          <label className="form-label min-h-[28px] flex items-end pb-1">ชื่อสินค้าผลิตภัณฑ์<span className="text-red-500">*</span></label>
                          <input
                            id="product-name"
                            type="text"
                            value={name}
                            onChange={(e) => {
                              setName(e.target.value);
                              if (e.target.value.trim()) {
                                setFormErrors(prev => ({ ...prev, name: false }));
                              }
                            }}
                            className={`form-input min-w-0 bg-[#f5f5f7] focus:bg-white ${formErrors.name ? 'error' : ''
                              }`}
                          />
                          {formErrors.name && (
                            <span className="text-[11px] text-red-500 font-semibold mt-1 block">กรุณากรอกชื่อสินค้าผลิตภัณฑ์</span>
                          )}
                        </div>

                        {/* แถว 3: หมวดหมู่สินค้า, หมวดหมู่ย่อย และ แบรนด์สินค้า */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="min-w-0">
                            <label className="form-label min-h-[28px] flex items-end pb-1">หมวดหมู่สินค้าหลัก<span className="text-red-500">*</span></label>
                            <select
                              id="product-category"
                              value={category}
                              onChange={handleCategorySelectChange}
                              className={`form-input min-w-0 bg-[#f5f5f7] text-zinc-800 focus:bg-white ${formErrors.category ? 'error' : ''
                                }`}
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
                            {formErrors.category && (
                              <span className="text-[11px] text-red-500 font-semibold mt-1 block">กรุณาเลือกหมวดหมู่สินค้า</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <label className="form-label min-h-[28px] flex items-end pb-1">หมวดหมู่ย่อย<span className="text-red-500">*</span></label>
                            <select
                              id="product-subcategory"
                              value={subCategory}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'ADD_NEW_SUB') {
                                  if (!category) { alert('กรุณาเลือกหมวดหมู่หลักก่อนเพิ่มหมวดหมู่ย่อยใหม่'); return; }
                                  setQuickAddModal({ isOpen: true, type: 'subcategory', value: '' });
                                } else {
                                  setSubCategory(val);
                                }
                              }}
                              disabled={!category}
                              className={`form-input min-w-0 bg-[#f5f5f7] text-zinc-800 focus:bg-white ${!category ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                              <option value="">{category ? '-- เลือกหมวดหมู่ย่อย --' : '-- กรุณาเลือกหมวดหมู่หลักก่อน --'}</option>
                              {category && currentUser?.role !== 'user' && (
                                <option value="ADD_NEW_SUB">+ เพิ่มหมวดหมู่ย่อยใหม่ในหมวดหมู่นี้</option>
                              )}
                              {availableSubCategories.map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                              {subCategory && !availableSubCategories.includes(subCategory) && (
                                <option value={subCategory}>{subCategory}</option>
                              )}
                            </select>
                          </div>
                          <div className="min-w-0">
                            <label className="form-label min-h-[28px] flex items-end pb-1">แบรนด์สินค้า<span className="text-red-500">*</span></label>
                            <select
                              id="product-brand"
                              value={brand}
                              onChange={handleBrandSelectChange}
                              className={`form-input min-w-0 bg-[#f5f5f7] text-zinc-800 focus:bg-white ${formErrors.brand ? 'error' : ''
                                }`}
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
                            {formErrors.brand && (
                              <span className="text-[11px] text-red-500 font-semibold mt-1 block">กรุณาเลือกแบรนด์สินค้า</span>
                            )}
                          </div>
                        </div>

                        {/* แถว 4: ขนาด และน้ำหนัก */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="min-w-0">
                            <label className="form-label min-h-[28px] flex items-end pb-1">ขนาด<span className="text-red-500">*</span></label>
                            <input
                              id="product-size"
                              type="text"
                              value={size}
                              onChange={(e) => {
                                setSize(e.target.value);
                                if (e.target.value.trim()) {
                                  setFormErrors(prev => ({ ...prev, size: false }));
                                }
                              }}
                              className={`form-input min-w-0 bg-[#f5f5f7] focus:bg-white ${formErrors.size ? 'error' : ''
                                }`}
                            />
                            {formErrors.size && (
                              <span className="text-[11px] text-red-500 font-semibold mt-1 block">กรุณากรอกขนาดสินค้า</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <label className="form-label min-h-[28px] flex items-end pb-1">น้ำหนัก<span className="text-red-500">*</span></label>
                            <input
                              id="product-weight"
                              type="text"
                              value={weight}
                              onChange={(e) => {
                                setWeight(e.target.value);
                                if (e.target.value.trim()) {
                                  setFormErrors(prev => ({ ...prev, weight: false }));
                                }
                              }}
                              className={`form-input min-w-0 bg-[#f5f5f7] focus:bg-white ${formErrors.weight ? 'error' : ''
                                }`}
                            />
                            {formErrors.weight && (
                              <span className="text-[11px] text-red-500 font-semibold mt-1 block">กรุณากรอกน้ำหนักสินค้า</span>
                            )}
                          </div>
                        </div>

                        {/* แถว 5: หมายเลข อย. และ มอก. */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="min-w-0">
                            <label className="form-label min-h-[28px] flex items-end pb-1">หมายเลข อย.<span className="text-red-500">*</span></label>
                            <input
                              id="product-fda-number"
                              type="text"
                              value={fdaNumber}
                              onChange={(e) => {
                                setFdaNumber(e.target.value);
                                if (e.target.value.trim()) {
                                  setFormErrors(prev => ({ ...prev, fdaNumber: false }));
                                }
                              }}
                              placeholder="เช่น 10-1-6100012345"
                              className={`form-input min-w-0 bg-[#f5f5f7] focus:bg-white ${formErrors.fdaNumber ? 'error' : ''
                                }`}
                            />
                            {formErrors.fdaNumber && (
                              <span className="text-[11px] text-red-500 font-semibold mt-1 block">กรุณากรอกหมายเลข อย.</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <label className="form-label min-h-[28px] flex items-end pb-1">มอก.<span className="text-red-500">*</span></label>
                            <input
                              id="product-tisi-number"
                              type="text"
                              value={tisiNumber}
                              onChange={(e) => {
                                setTisiNumber(e.target.value);
                                if (e.target.value.trim()) {
                                  setFormErrors(prev => ({ ...prev, tisiNumber: false }));
                                }
                              }}
                              placeholder="เช่น มอก. 1985-2549"
                              className={`form-input min-w-0 bg-[#f5f5f7] focus:bg-white ${formErrors.tisiNumber ? 'error' : ''
                                }`}
                            />
                            {formErrors.tisiNumber && (
                              <span className="text-[11px] text-red-500 font-semibold mt-1 block">กรุณากรอกหมายเลข มอก.</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="border-b border-[#f5f5f7] pb-3.5">
                      <h3 className="text-xs font-extrabold text-[#1d1d1f] uppercase tracking-wider mb-2.5">ข้อมูลราคาผลิตภัณฑ์</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                        <div className="min-w-0">
                          <label className="form-label min-h-[44px] flex items-end pb-1">ราคาขายส่ง<span className="text-red-500">*</span></label>
                          <input
                            id="product-wholesale-price"
                            type="number"
                            min="0"
                            value={wholesalePrice}
                            onChange={(e) => {
                              setWholesalePrice(e.target.value);
                              if (e.target.value.trim() && !isNaN(e.target.value) && Number(e.target.value) >= 0) {
                                setFormErrors(prev => ({ ...prev, wholesalePrice: false }));
                              }
                            }}
                            className={`form-input min-w-0 bg-[#f5f5f7] focus:bg-white text-black ${formErrors.wholesalePrice ? 'error' : ''
                              }`}
                          />
                          {formErrors.wholesalePrice && (
                            <span className="text-[11px] text-red-500 font-semibold mt-1 block">กรุณากรอกราคาขายส่ง</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <label className="form-label min-h-[44px] flex items-end pb-1">ราคาขายปลีก<span className="text-red-500">*</span></label>
                          <input
                            id="product-retail-price"
                            type="number"
                            min="0"
                            value={retailPrice}
                            onChange={(e) => {
                              setRetailPrice(e.target.value);
                              if (e.target.value.trim() && Number(e.target.value) > 0) {
                                setFormErrors(prev => ({ ...prev, retailPrice: false }));
                              }
                            }}
                            className={`form-input min-w-0 bg-[#f5f5f7] focus:bg-white text-black ${formErrors.retailPrice ? 'error' : ''
                              }`}
                          />
                          {formErrors.retailPrice && (
                            <span className="text-[11px] text-red-500 font-semibold mt-1 block">กรุณากรอกราคาขายปลีก</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <label className="form-label min-h-[44px] flex items-end pb-1">ค่าฝา<span className="text-red-500">*</span></label>
                          <input
                            id="product-cap-fee"
                            type="number"
                            min="0"
                            value={capFee}
                            onChange={(e) => {
                              setCapFee(e.target.value);
                              if (e.target.value.trim() && !isNaN(e.target.value) && Number(e.target.value) >= 0) {
                                setFormErrors(prev => ({ ...prev, capFee: false }));
                              }
                            }}
                            className={`form-input min-w-0 bg-[#f5f5f7] focus:bg-white text-black ${formErrors.capFee ? 'error' : ''
                              }`}
                          />
                          {formErrors.capFee && (
                            <span className="text-[11px] text-red-500 font-semibold mt-1 block">กรุณากรอกค่าฝา</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <label className="form-label min-h-[44px] flex items-end pb-1">สถานะระบบ</label>
                          <div className="grid grid-cols-2 gap-1 bg-[#f5f5f7] border border-[#d2d2d7] p-0.5 rounded-xl h-[42px] items-center">
                            <button
                              type="button"
                              onClick={() => setStatus('Active')}
                              className={`py-1 text-xs font-bold rounded-lg transition-all cursor-pointer h-full ${status === 'Active'
                                  ? 'bg-[#10b981] text-white shadow-xs'
                                  : 'text-zinc-650 hover:text-[#10b981]'
                                }`}
                            >
                              เปิด
                            </button>
                            <button
                              type="button"
                              onClick={() => setStatus('Inactive')}
                              className={`py-1 text-xs font-bold rounded-lg transition-all cursor-pointer h-full ${status === 'Inactive'
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
                            id="product-description"
                            rows="2"
                            value={description}
                            onChange={(e) => {
                              setDescription(e.target.value);
                              if (e.target.value.trim()) {
                                setFormErrors(prev => ({ ...prev, description: false }));
                              }
                            }}
                            className={`form-input min-w-0 bg-[#f5f5f7] focus:bg-white resize-none ${formErrors.description ? 'error' : ''
                              }`}
                          />
                          {formErrors.description && (
                            <span className="text-[11px] text-red-500 font-semibold mt-1 block">กรุณากรอกรายละเอียดสินค้า</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <label className="form-label min-h-[28px] flex items-end pb-1">จุดเด่นสินค้า<span className="text-red-500">*</span></label>
                          <textarea
                            id="product-highlights"
                            rows="2"
                            value={highlights}
                            onChange={(e) => {
                              setHighlights(e.target.value);
                              if (e.target.value.trim()) {
                                setFormErrors(prev => ({ ...prev, highlights: false }));
                              }
                            }}
                            className={`form-input min-w-0 bg-[#f5f5f7] focus:bg-white resize-none ${formErrors.highlights ? 'error' : ''
                              }`}
                          />
                          {formErrors.highlights && (
                            <span className="text-[11px] text-red-500 font-semibold mt-1 block">กรุณากรอกจุดเด่นสินค้า</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <label className="form-label min-h-[28px] flex items-end pb-1">วิธีใช้<span className="text-red-500">*</span></label>
                          <textarea
                            id="product-how-to-use"
                            rows="2"
                            value={howToUse}
                            onChange={(e) => {
                              setHowToUse(e.target.value);
                              if (e.target.value.trim()) {
                                setFormErrors(prev => ({ ...prev, howToUse: false }));
                              }
                            }}
                            className={`form-input min-w-0 bg-[#f5f5f7] focus:bg-white resize-none ${formErrors.howToUse ? 'error' : ''
                              }`}
                          />
                          {formErrors.howToUse && (
                            <span className="text-[11px] text-red-500 font-semibold mt-1 block">กรุณากรอกวิธีใช้</span>
                          )}
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
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`relative aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden group transition-all ${isDragging
                          ? 'border-[#0071e3] bg-[#0071e3]/5 shadow-inner'
                          : formErrors.image
                            ? 'border-red-500 bg-red-50/10'
                            : 'border-[#d2d2d7] bg-[#f5f5f7]'
                        }`}
                    >
                      {image ? (
                        <>
                          <img 
                            src={image} 
                            alt="Preview" 
                            className="max-w-full max-h-full object-contain cursor-pointer hover:opacity-95 transition-opacity" 
                            title="คลิกเพื่อดูรูปขนาดเต็ม"
                            onClick={() => setZoomedImage(image)}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setImage('');
                              setFormErrors(prev => ({ ...prev, image: true }));
                            }}
                            className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black text-white rounded-full transition-colors cursor-pointer z-10"
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
                    {formErrors.image && (
                      <span className="text-[11px] text-red-500 font-semibold mt-1 block text-center">กรุณาเลือกหรืออัปโหลดรูปภาพสินค้า</span>
                    )}


                  </div>

                  {/* Edit Remark — required when editing */}
                  {editProduct && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2 mt-2">
                      <label className="text-xs font-extrabold text-amber-800 uppercase tracking-wider block">
                        หมายเหตุการแก้ไข <span className="text-red-500">*</span>
                        <span className="normal-case font-normal text-amber-600 ml-1">(บังคับกรอก)</span>
                      </label>
                      <textarea
                        id="product-edit-remark"
                        rows="3"
                        value={editRemark}
                        onChange={(e) => {
                          setEditRemark(e.target.value);
                          if (e.target.value.trim()) {
                            setFormErrors(prev => ({ ...prev, editRemark: false }));
                          }
                        }}
                        placeholder="ระบุเหตุผลที่แก้ไขข้อมูลสินค้านี้..."
                        className={`w-full px-3 py-2.5 bg-white border rounded-xl text-sm text-[#1d1d1f] focus:outline-none focus:ring-2 transition-all resize-none placeholder-amber-400 ${formErrors.editRemark
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-100'
                            : 'border-amber-300 focus:border-amber-500 focus:ring-amber-200'
                          }`}
                      />
                      {formErrors.editRemark && (
                        <span className="text-[11px] text-red-650 font-semibold mt-1 block">กรุณากรอกหมายเหตุการแก้ไข</span>
                      )}
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
                  setAlertPopup(null);
                }}
                className={`w-full py-2.5 rounded-full text-xs font-semibold text-white transition-colors cursor-pointer ${alertPopup.type.startsWith('success')
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
              <button type="button"
                onClick={() => setDrawerProduct(null)}
                className="p-2 text-zinc-400 hover:text-black rounded-lg hover:bg-[#f5f5f7] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable details */}
            <div className="flex-1 overflow-y-auto min-h-0 p-5 space-y-5 text-xs text-[#1d1d1f]">
              {/* Product Photo */}
              <div className="aspect-video w-full rounded-xl overflow-hidden border border-[#d2d2d7]/40 bg-[#f5f5f7] flex-shrink-0 flex items-center justify-center">
                {(!drawerProduct.image || drawerProduct.image === '-') ? (
                  <ImageIcon className="w-12 h-12 text-zinc-300" />
                ) : (
                  <img
                    src={drawerProduct.image}
                    alt={drawerProduct.name}
                    className="max-w-full max-h-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
                    title="คลิกเพื่อดูรูปขนาดเต็ม"
                    onClick={() => setZoomedImage(drawerProduct.image)}
                  />
                )}
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
                  <span className="text-zinc-800 font-bold">หมวดหมู่ย่อย</span>
                  <span className="font-extrabold text-black">{drawerProduct.subCategory || '-'}</span>
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
                  <span className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border ${drawerProduct.status === 'Active'
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
              <button type="button"
                onClick={() => handleCopyMarketingContent(drawerProduct)}
                className={`w-full py-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${copiedId === drawerProduct.id
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
                {quickAddModal.type === 'brand' 
                  ? 'ระบุแบรนด์สินค้าใหม่' 
                  : quickAddModal.type === 'subcategory'
                    ? `ระบุหมวดหมู่ย่อยใหม่ใน "${category}"`
                    : 'ระบุหมวดหมู่สินค้าใหม่'}
              </h3>
              <p className="text-xs text-[#555557] leading-relaxed">
                {quickAddModal.type === 'brand'
                  ? 'กรุณากรอกชื่อแบรนด์สินค้าใหม่เพื่อใช้ในฟอร์มนี้'
                  : quickAddModal.type === 'subcategory'
                    ? `กรุณากรอกชื่อหมวดหมู่ย่อยใหม่สำหรับหมวดหมู่ "${category}"`
                    : 'กรุณากรอกชื่อหมวดหมู่สินค้าใหม่เพื่อใช้ในฟอร์มนี้'}
              </p>
            </div>

            <div>
              <input
                type="text"
                value={quickAddModal.value}
                onChange={(e) => setQuickAddModal(prev => ({ ...prev, value: e.target.value }))}
                placeholder={
                  quickAddModal.type === 'brand' 
                    ? 'ระบุชื่อแบรนด์ (เช่น Phanvadee)' 
                    : quickAddModal.type === 'subcategory'
                      ? 'ระบุชื่อหมวดหมู่ย่อย (เช่น Hair Styling)'
                      : 'ระบุชื่อหมวดหมู่ (เช่น Treatment)'
                }
                className="w-full px-3.5 py-2.5 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-sm text-[#1d1d1f] focus:outline-hidden focus:border-[#0071e3] focus:bg-white transition-all placeholder-[#555557]"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
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
                      setFormErrors(prev => ({ ...prev, brand: false }));
                    } else if (quickAddModal.type === 'subcategory') {
                      if (category) {
                        onAddSubCategory?.(category, trimmed);
                      }
                      setSubCategory(trimmed);
                    } else {
                      if (categories.includes(trimmed)) {
                        alert('หมวดหมู่นี้มีอยู่ในระบบแล้ว');
                      }
                      setCategory(trimmed);
                      setFormErrors(prev => ({ ...prev, category: false }));
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

      {/* Image Preview Modal (Click-to-Zoom) */}
      {zoomedImage && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md transition-opacity duration-300 no-print animate-fade-in"
          onClick={() => setZoomedImage(null)}
        >
          <div className="absolute top-4 right-4 z-[10000]">
            <button
              type="button"
              onClick={() => setZoomedImage(null)}
              className="p-2.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-full transition-all cursor-pointer border border-white/10 shadow-lg"
              title="ปิด"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div 
            className="relative max-w-[90vw] max-h-[85vh] flex items-center justify-center p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={zoomedImage}
              alt="Zoomed Product"
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl border border-white/15 animate-scale-in"
            />
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
