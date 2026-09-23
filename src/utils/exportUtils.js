
import * as XLSX from 'xlsx';
import { exportToLazadaMandatory, LAZADA_MANDATORY_COLUMNS, resolveSheet } from './lazadaTemplate.js';
import { exportToShopeeMandatory } from './shopeeTemplate.js';
import { exportToTiktokMandatory } from './tiktokTemplate.js';
import { checkIsInAppBrowser } from './browserUtils.js';
import { parseWeightToKg } from './marketplaceIO.js';

// ─────────────────────────────────────────────
// Helper: download Excel file (Instant direct blob download with in-app fallback)
// ─────────────────────────────────────────────
export async function downloadWorkbook(workbook, filename) {
  // If in-app browser (LINE, Facebook Messenger, etc.) where blob download is blocked
  if (checkIsInAppBrowser()) {
    try {
      const base64 = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const response = await fetch('/api/store-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: base64, filename }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        const result = await response.json();
        if (result.id) {
          window.location.assign(`/api/download?id=${result.id}`);
          return;
        }
      }
    } catch {
      // Fallback to direct blob download
    }
  }

  // Fast direct instant download (< 50ms)
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (document.body.contains(a)) document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}

// ─────────────────────────────────────────────
// Helper: Apply column widths to worksheet
// ─────────────────────────────────────────────
function applyColumnWidths(ws, widths) {
  ws['!cols'] = widths.map(w => ({ wch: w }));
}

// ─────────────────────────────────────────────
// 1. SHOPEE EXPORT
// Logic: Parent SKU เป็นตัวผูกกลุ่ม + Variation Integration No. เหมือนกันทุก variant
// แต่ละ variant → 1 แถว
// ─────────────────────────────────────────────
export async function exportShopee(products, options = {}) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('sv-SE');
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');
  const timestamp = `${dateStr}_${timeStr}`;
  try {
    const buffer = await exportToShopeeMandatory(products, options);
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Shopee_mass_upload_${timestamp}.xlsx`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    console.error('Shopee export failed:', error);
  }
}

// ─────────────────────────────────────────────
// 2. LAZADA EXPORT
// Logic: Group No. ผูกกลุ่ม SKU → สินค้ากลุ่มเดียวกันมี Group No. เดียวกัน
// แต่ละ variant → 1 แถว, แถวแรกของกลุ่มใส่ข้อมูลสินค้าหลักครบ
// ─────────────────────────────────────────────
export async function exportLazada(products, options = {}) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('sv-SE');
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');
  const timestamp = `${dateStr}_${timeStr}`;
  try {
    const buffer = await exportToLazadaMandatory(products, { ...options, keepEmptySheets: true });
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Lazada_batch_upload_${timestamp}.xlsx`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    console.error('Lazada export failed:', error);
    alert(`❌ Export Lazada ล้มเหลว:\n${error?.message || error}`);
  }
}

// ─────────────────────────────────────────────
// 3. TIKTOK SHOP EXPORT
// Logic: Product Name เป็นตัวผูกกลุ่ม
// Option Name/Value แยกคอลัมน์ตาม tier
// แต่ละ variant → 1 แถว
// ─────────────────────────────────────────────
export async function exportTikTok(products, options = {}) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('sv-SE');
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');
  const timestamp = `${dateStr}_${timeStr}`;
  try {
    const buffer = await exportToTiktokMandatory(products, options);
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TikTokShop_batch_upload_${timestamp}.xlsx`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    console.error('TikTok Shop export failed:', error);
  }
}


// ─────────────────────────────────────────────
// 4. GENERAL EXCEL / GOOGLE SHEETS EXPORT
// ─────────────────────────────────────────────
export function exportToExcel(products, options = {}) {
  const headers = [
    'รหัสสินค้า (SKU)',
    'รหัสบาร์โค้ด',
    'ชื่อสินค้า',
    'แบรนด์',
    'หมวดหมู่',
    'หมวดหมู่ย่อย',
    'ราคาขายส่ง (บาท)',
    'ราคาขายปลีก (บาท)',
    'ค่าฝา (บาท)',
    'สต็อกสินค้า',
    'สถานะใช้งาน',
    'ขนาด',
    'น้ำหนัก',
    'หมายเลข อย.',
    'หมายเลข มอก.',
    'รายละเอียดสินค้า',
    'จุดเด่นสินค้า',
    'วิธีใช้',
    'วันที่ลงทะเบียน'
  ];

  const rows = products.map(product => {
    let stockVal = 0;
    if (options?.stockMap) {
      const mVal = options.stockMap[product.id] !== undefined ? options.stockMap[product.id] : (product.code ? options.stockMap[product.code] : undefined);
      if (mVal !== undefined) stockVal = Number(mVal) || 0;
      else if (product.stock !== undefined && product.stock !== null && product.stock !== '') stockVal = Number(product.stock) || 0;
    } else if (product.stock !== undefined && product.stock !== null && product.stock !== '') {
      stockVal = Number(product.stock) || 0;
    }

    return {
      'รหัสสินค้า (SKU)': product.code,
      'รหัสบาร์โค้ด': product.barcode || '',
      'ชื่อสินค้า': product.name,
      'แบรนด์': product.brand || '',
      'หมวดหมู่': product.category || '',
      'หมวดหมู่ย่อย': product.subCategory || '',
      'ราคาขายส่ง (บาท)': product.wholesalePrice || 0,
      'ราคาขายปลีก (บาท)': product.retailPrice || 0,
      'ค่าฝา (บาท)': product.capFee || 0,
      'สต็อกสินค้า': stockVal,
      'สถานะใช้งาน': product.status === 'Active' ? 'เปิดใช้งาน' : 'ปิดใช้งาน',
      'ขนาด': product.size || '',
      'น้ำหนัก': product.weight || '',
      'หมายเลข อย.': product.fdaNumber || '',
      'หมายเลข มอก.': product.tisiNumber || '',
      'รายละเอียดสินค้า': product.description || '',
      'จุดเด่นสินค้า': product.highlights || '',
      'วิธีใช้': product.howToUse || '',
      'วันที่ลงทะเบียน': product.createdAt || ''
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
  applyColumnWidths(ws, [18, 18, 35, 18, 35, 16, 16, 12, 14, 14, 12, 12, 18, 18, 50, 35, 35, 18]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'สินค้าในคลัง');

  const timestamp = new Date().toLocaleDateString('sv-SE');
  downloadWorkbook(wb, `PIM_products_export_${timestamp}.xlsx`);
}

// ─────────────────────────────────────────────
// 5. MISSING COLUMNS & INCOMPLETE PRODUCTS VALIDATION FOR EXPORTS
// ─────────────────────────────────────────────

export function hasValidImage(p) {
  if (!p) return false;
  const rawImg = (Array.isArray(p.images) && p.images[0]) || p.image || p.imageUrl || p.image_url || p.coverImage || p.cover_image || '';
  const img = typeof rawImg === 'object' && rawImg !== null ? (rawImg.url || rawImg.preview || rawImg.src || '') : rawImg;
  if (!img) return false;
  const str = String(img).trim();
  return str.length > 0 && str !== '-' && str !== 'null' && str !== 'undefined';
}

const isInvalidStock = (val) => {
  return val === '' || val === null || val === undefined || isNaN(val) || Number(val) < 0;
};

const isInvalidDimension = (val) => {
  return val === '' || val === null || val === undefined || isNaN(Number(val)) || Number(val) <= 0;
};

const isInvalidWeight = (val) => {
  const kg = parseWeightToKg(val);
  return !kg || kg <= 0;
};

const isInvalidPrice = (val) => {
  return val === '' || val === null || val === undefined || isNaN(Number(val)) || Number(val) <= 0;
};

export function getIncompleteLazadaDetails(products) {
  const allOrderedHeaders = [
    'ชื่อสินค้า',
    'รูปภาพสินค้า1',
    'หมายเลขใบอนุญาต',
    'ยี่ห้อ',
    'ระดับการจัดทรง',
    'ประเภทเส้นผม',
    'ประโยชน์เพื่อการดูแลเส้นผม',
    'รูปแบบของผลิตภัณฑ์',
    'ประเภทสีย้อมผม',
    'น้ำหนัก แพคเกจ (กก)',
    'สต๊อกสินค้า',
    'ราคา',
    'ความยาว แพคเกจ (ซม)',
    'ความกว้าง แพคเกจ (ซม)',
    'ความสูง แพคเกจ (ซม)',
    'SellerSKU'
  ];

  const missingSet = new Set();
  const incompleteProducts = [];

  for (const p of products || []) {
    const sheet = resolveSheet(p, 'ครีมบำรุงผม');
    const cols = LAZADA_MANDATORY_COLUMNS[sheet] || [];
    const missingFields = [];

    for (const c of cols) {
      const h = c.header;
      if (h === 'ชื่อสินค้า' && (!p.name || !String(p.name).trim())) missingFields.push(h);
      else if (h === 'รูปภาพสินค้า1' && !hasValidImage(p)) missingFields.push(h);
      else if (h === 'หมายเลขใบอนุญาต' && !(p.fdaNumber || p.fda || p.fda_no || '').trim()) missingFields.push(h);
      else if (h === 'ยี่ห้อ' && (!p.brand || !p.brand.trim() || ['unbranded', 'no brand', 'ไม่มีแบรนด์'].includes(p.brand.trim().toLowerCase()))) missingFields.push(h);
      else if (h === 'ระดับการจัดทรง' && !(p.stylingLevel || '').trim()) missingFields.push(h);
      else if (h === 'ประเภทเส้นผม' && !(p.hairType || '').trim()) missingFields.push(h);
      else if (h === 'ประโยชน์เพื่อการดูแลเส้นผม' && !(p.hairBenefit || '').trim()) missingFields.push(h);
      else if (h === 'รูปแบบของผลิตภัณฑ์' && !(p.productForm || '').trim()) missingFields.push(h);
      else if (h === 'ประเภทสีย้อมผม' && !(p.hairColorType || p.dyeType || '').trim()) missingFields.push(h);
      else if (h === 'น้ำหนัก แพคเกจ (กก)' && isInvalidWeight(p.weight)) missingFields.push(h);
      else if (h === 'สต๊อกสินค้า' || h === 'จำนวน') {
        const lazadaStock = p.stockLazada !== undefined && p.stockLazada !== null && p.stockLazada !== '' ? p.stockLazada : p.stock;
        if (isInvalidStock(lazadaStock)) missingFields.push('สต๊อกสินค้า');
      }
      else if (h === 'ราคา' && isInvalidPrice(p.retailPrice)) missingFields.push(h);
      else if (h === 'ความยาว แพคเกจ (ซม)' && isInvalidDimension(p.packageLength)) missingFields.push(h);
      else if (h === 'ความกว้าง แพคเกจ (ซม)' && isInvalidDimension(p.packageWidth)) missingFields.push(h);
      else if (h === 'ความสูง แพคเกจ (ซม)' && isInvalidDimension(p.packageHeight)) missingFields.push(h);
    }
    if (!p.code || !String(p.code).trim()) {
      missingFields.push('SellerSKU');
    }

    if (missingFields.length > 0) {
      missingFields.forEach(f => missingSet.add(f));
      incompleteProducts.push({
        id: p.id || p.code || p.name,
        code: p.code || 'ไม่มี SKU',
        name: p.name || 'ไม่ระบุชื่อสินค้า',
        image: (Array.isArray(p.images) && p.images[0]) || p.image || p.imageUrl || p.image_url || '',
        missingFields
      });
    }
  }

  return {
    missingHeaders: allOrderedHeaders.filter(h => missingSet.has(h)),
    incompleteProducts
  };
}

export function getIncompleteShopeeDetails(products) {
  const allOrderedHeaders = [
    'หมวดหมู่สินค้า',
    'ชื่อสินค้า',
    'รายละเอียดสินค้า',
    'ราคา',
    'สต๊อกสินค้า',
    'รูปภาพสินค้า (ภาพปก / รูปภาพ 1)',
    'น้ำหนัก',
    'ความยาว',
    'ความกว้าง',
    'ความสูง'
  ];

  const missingSet = new Set();
  const incompleteProducts = [];

  for (const p of products || []) {
    const missingFields = [];

    if (!p.category || !String(p.category).trim()) missingFields.push('หมวดหมู่สินค้า');
    if (!p.name || !String(p.name).trim()) missingFields.push('ชื่อสินค้า');
    if (!p.description || !String(p.description).trim()) missingFields.push('รายละเอียดสินค้า');
    if (isInvalidPrice(p.retailPrice)) missingFields.push('ราคา');

    const shopeeStock = p.stockShopee !== undefined && p.stockShopee !== null && p.stockShopee !== '' ? p.stockShopee : p.stock;
    if (isInvalidStock(shopeeStock)) missingFields.push('สต๊อกสินค้า');
    
    if (!hasValidImage(p)) {
      missingFields.push('รูปภาพสินค้า (ภาพปก / รูปภาพ 1)');
    }

    if (isInvalidWeight(p.weight)) missingFields.push('น้ำหนัก');
    if (isInvalidDimension(p.packageLength)) missingFields.push('ความยาว');
    if (isInvalidDimension(p.packageWidth)) missingFields.push('ความกว้าง');
    if (isInvalidDimension(p.packageHeight)) missingFields.push('ความสูง');

    if (missingFields.length > 0) {
      missingFields.forEach(f => missingSet.add(f));
      incompleteProducts.push({
        id: p.id || p.code || p.name,
        code: p.code || 'ไม่มี SKU',
        name: p.name || 'ไม่ระบุชื่อสินค้า',
        image: (Array.isArray(p.images) && p.images[0]) || p.image || p.imageUrl || p.image_url || '',
        missingFields
      });
    }
  }

  return {
    missingHeaders: allOrderedHeaders.filter(h => missingSet.has(h)),
    incompleteProducts
  };
}

export function getIncompleteTiktokDetails(products) {
  const allOrderedHeaders = [
    'หมวดหมู่',
    'ชื่อสินค้า',
    'คำอธิบายสินค้า',
    'ภาพหลัก',
    'น้ำหนักพัสดุ(g)',
    'ความยาวของพัสดุ(cm)',
    'ความกว้างของพัสดุ(cm)',
    'ความสูงของพัสดุ(cm)',
    'ราคาขายปลีก (สกุลเงินท้องถิ่น)',
    'สต็อกสินค้า',
    'Seller SKU'
  ];

  const missingSet = new Set();
  const incompleteProducts = [];

  for (const p of products || []) {
    const missingFields = [];

    if (!p.category || !String(p.category).trim()) missingFields.push('หมวดหมู่');
    if (!p.name || !String(p.name).trim()) missingFields.push('ชื่อสินค้า');
    if (!p.description || !String(p.description).trim()) missingFields.push('คำอธิบายสินค้า');
    if (!hasValidImage(p)) missingFields.push('ภาพหลัก');
    if (isInvalidWeight(p.weight)) missingFields.push('น้ำหนักพัสดุ(g)');
    if (isInvalidDimension(p.packageLength)) missingFields.push('ความยาวของพัสดุ(cm)');
    if (isInvalidDimension(p.packageWidth)) missingFields.push('ความกว้างของพัสดุ(cm)');
    if (isInvalidDimension(p.packageHeight)) missingFields.push('ความสูงของพัสดุ(cm)');
    if (isInvalidPrice(p.retailPrice)) missingFields.push('ราคาขายปลีก (สกุลเงินท้องถิ่น)');

    const tiktokStock = p.stockTiktok !== undefined && p.stockTiktok !== null && p.stockTiktok !== '' ? p.stockTiktok : p.stock;
    if (isInvalidStock(tiktokStock)) missingFields.push('สต็อกสินค้า');

    if (!p.code || !String(p.code).trim()) missingFields.push('Seller SKU');

    if (missingFields.length > 0) {
      missingFields.forEach(f => missingSet.add(f));
      incompleteProducts.push({
        id: p.id || p.code || p.name,
        code: p.code || 'ไม่มี SKU',
        name: p.name || 'ไม่ระบุชื่อสินค้า',
        image: (Array.isArray(p.images) && p.images[0]) || p.image || p.imageUrl || p.image_url || '',
        missingFields
      });
    }
  }

  return {
    missingHeaders: allOrderedHeaders.filter(h => missingSet.has(h)),
    incompleteProducts
  };
}

export function getIncompleteGeneralExcelDetails(products) {
  const allOrderedHeaders = [
    'รหัสสินค้า (SKU)',
    'ชื่อสินค้า',
    'แบรนด์',
    'หมวดหมู่',
    'ราคาขายปลีก (บาท)',
    'สต็อกสินค้า',
    'น้ำหนัก',
    'หมายเลข อย.',
    'รายละเอียดสินค้า'
  ];

  const missingSet = new Set();
  const incompleteProducts = [];

  for (const p of products || []) {
    const missingFields = [];

    if (!p.code || !String(p.code).trim()) missingFields.push('รหัสสินค้า (SKU)');
    if (!p.name || !String(p.name).trim()) missingFields.push('ชื่อสินค้า');
    if (!p.brand || !String(p.brand).trim()) missingFields.push('แบรนด์');
    if (!p.category || !String(p.category).trim()) missingFields.push('หมวดหมู่');
    if (isInvalidPrice(p.retailPrice)) missingFields.push('ราคาขายปลีก (บาท)');
    if (isInvalidStock(p.stock)) missingFields.push('สต็อกสินค้า');
    if (!p.weight || !String(p.weight).trim()) missingFields.push('น้ำหนัก');
    if (!(p.fdaNumber || p.fda || p.fda_no || '').trim()) missingFields.push('หมายเลข อย.');
    if (!p.description || !String(p.description).trim()) missingFields.push('รายละเอียดสินค้า');

    if (missingFields.length > 0) {
      missingFields.forEach(f => missingSet.add(f));
      incompleteProducts.push({
        id: p.id || p.code || p.name,
        code: p.code || 'ไม่มี SKU',
        name: p.name || 'ไม่ระบุชื่อสินค้า',
        image: (Array.isArray(p.images) && p.images[0]) || p.image || p.imageUrl || p.image_url || '',
        missingFields
      });
    }
  }

  return {
    missingHeaders: allOrderedHeaders.filter(h => missingSet.has(h)),
    incompleteProducts
  };
}

export function getIncompleteExportDetails(type, products) {
  if (!products || !products.length) return { missingHeaders: [], incompleteProducts: [] };
  switch (type) {
    case 'shopee': return getIncompleteShopeeDetails(products);
    case 'lazada': return getIncompleteLazadaDetails(products);
    case 'tiktok': return getIncompleteTiktokDetails(products);
    case 'excel':  return getIncompleteGeneralExcelDetails(products);
    default: return { missingHeaders: [], incompleteProducts: [] };
  }
}

export function getMissingLazadaColumns(products) {
  return getIncompleteLazadaDetails(products).missingHeaders;
}

export function getMissingShopeeColumns(products) {
  return getIncompleteShopeeDetails(products).missingHeaders;
}

export function getMissingTiktokColumns(products) {
  return getIncompleteTiktokDetails(products).missingHeaders;
}

export function getMissingGeneralExcelColumns(products) {
  return getIncompleteGeneralExcelDetails(products).missingHeaders;
}

export function getMissingExportColumns(type, products) {
  return getIncompleteExportDetails(type, products).missingHeaders;
}


