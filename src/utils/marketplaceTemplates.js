/**
 * Marketplace Mandatory-Columns Exports
 * Phanvadee Co., Ltd. PIM System
 *
 * Consolidates Lazada, Shopee, and TikTok Shop mandatory export templates.
 * One file containing all three platform-specific workbook builders.
 *
 * Place this file at: src/utils/marketplaceTemplates.js
 */
import ExcelJS from 'exceljs';
import { parseWeightToKg } from './marketplaceIO';

const LAZADA_BLUE = 'FF101566';
const SHOPEE_ORANGE = 'FFEE4D2D';
const TIKTOK_BLACK = 'FF000000';

// ===========================================================================
// 1. LAZADA TEMPLATE CONFIG & FUNCTION
// ===========================================================================
const LAZADA_COL = {
  name:    { header: 'ชื่อสินค้า', width: 36, value: (p) => p.name || '' },
  image:   { header: 'รูปภาพสินค้า1', width: 40, value: (p) => p.image || '' },
  fda:     { header: 'TH_FDA License - หมายเลขใบอนุญาต', width: 26, value: (p) => p.fdaNumber || '' },
  brand:   { header: 'ยี่ห้อ', width: 18, value: (p) => (p.brand?.trim() || 'Unbranded') },
  hairType:{ header: 'ประเภทเส้นผม', width: 18, value: (p) => p.hairType || '' },
  stylingLevel: { header: 'ระดับการจัดทรง', width: 18, value: (p) => p.stylingLevel || '' },
  hairBenefit:  { header: 'ประโยชน์เพื่อการดูแลเส้นผม', width: 24, value: (p) => p.hairBenefit || '' },
  productForm:  { header: 'รูปแบบของผลิตภัณฑ์', width: 20, value: (p) => p.productForm || '' },
  dyeType:      { header: 'ประเภทสีย้อมผม', width: 18, value: (p) => p.hairColorType || '' },
  weight:  { header: 'น้ำหนัก แพคเกจ (กก)', width: 18, numFmt: '0.000', value: (p) => parseWeightToKg(p.weight) },
  stock:   { header: 'จำนวน', width: 12, numFmt: '0', value: (p) => Number(p.stock) || 0 },
  price:   { header: 'ราคา', width: 14, numFmt: '#,##0.00', value: (p) => Number(p.retailPrice) || 0 },
  length:  { header: 'ความยาว แพคเกจ (ซม)', width: 18, numFmt: '0.##', value: (p) => (p.packageLength ? Number(p.packageLength) : '') },
  width_:  { header: 'ความกว้าง แพคเกจ (ซม)', width: 18, numFmt: '0.##', value: (p) => (p.packageWidth ? Number(p.packageWidth) : '') },
  height:  { header: 'ความสูง แพคเกจ (ซม)', width: 18, numFmt: '0.##', value: (p) => (p.packageHeight ? Number(p.packageHeight) : '') },
};

// Required columns per category, in the order Lazada lists them.
export const LAZADA_MANDATORY_COLUMNS = {
  'ผลิตภัณฑ์จัดแต่งทรงผม': [LAZADA_COL.name, LAZADA_COL.image, LAZADA_COL.fda, LAZADA_COL.brand, LAZADA_COL.stylingLevel, LAZADA_COL.hairType, LAZADA_COL.hairBenefit, LAZADA_COL.weight, LAZADA_COL.stock, LAZADA_COL.price, LAZADA_COL.length, LAZADA_COL.width_, LAZADA_COL.height],
  'ทรีทเมนต์สำหรับผม':     [LAZADA_COL.name, LAZADA_COL.image, LAZADA_COL.fda, LAZADA_COL.brand, LAZADA_COL.hairType, LAZADA_COL.weight, LAZADA_COL.stock, LAZADA_COL.price, LAZADA_COL.length, LAZADA_COL.width_, LAZADA_COL.height],
  'เซ็ทดูแลเส้นผม':        [LAZADA_COL.name, LAZADA_COL.image, LAZADA_COL.fda, LAZADA_COL.brand, LAZADA_COL.hairType, LAZADA_COL.productForm, LAZADA_COL.weight, LAZADA_COL.stock, LAZADA_COL.price, LAZADA_COL.length, LAZADA_COL.width_, LAZADA_COL.height],
  'แชมพู':                 [LAZADA_COL.name, LAZADA_COL.image, LAZADA_COL.fda, LAZADA_COL.brand, LAZADA_COL.hairType, LAZADA_COL.weight, LAZADA_COL.stock, LAZADA_COL.price, LAZADA_COL.length, LAZADA_COL.width_, LAZADA_COL.height],
  'ผลิตภัณฑ์เปลี่ยนสีผม':  [LAZADA_COL.name, LAZADA_COL.image, LAZADA_COL.fda, LAZADA_COL.brand, LAZADA_COL.dyeType, LAZADA_COL.productForm, LAZADA_COL.weight, LAZADA_COL.stock, LAZADA_COL.price, LAZADA_COL.length, LAZADA_COL.width_, LAZADA_COL.height],
  'ครีมบำรุงผม':           [LAZADA_COL.name, LAZADA_COL.image, LAZADA_COL.fda, LAZADA_COL.brand, LAZADA_COL.hairType, LAZADA_COL.weight, LAZADA_COL.stock, LAZADA_COL.price, LAZADA_COL.length, LAZADA_COL.width_, LAZADA_COL.height],
};

const LAZADA_CATEGORIES = Object.keys(LAZADA_MANDATORY_COLUMNS);

/**
 * Maps a PIM product to the Lazada worksheet it belongs in.
 * Falls back to `defaultSheet` when the category can't be resolved.
 */
function resolveLazadaSheet(product, defaultSheet) {
  const cat = (product.category || '').trim();
  if (LAZADA_MANDATORY_COLUMNS[cat]) return cat;       // already a Lazada sheet name
  if (cat === 'Styling') return 'ผลิตภัณฑ์จัดแต่งทรงผม';
  if (cat === 'Hair Color') return 'ผลิตภัณฑ์เปลี่ยนสีผม';
  if (cat === 'Treatment') return 'ครีมบำรุงผม';
  return defaultSheet;
}

function styleLazadaHeader(sheet) {
  const headerRow = sheet.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LAZADA_BLUE } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}

/**
 * Exports products into a Lazada mandatory-columns workbook.
 *
 * @param {Array}  products                 PIM product objects.
 * @param {Object} [options]
 * @param {boolean} [options.headersOnly=false]  true → blank template (headers only).
 * @param {boolean} [options.keepEmptySheets=true] keep category sheets with no products.
 * @param {string}  [options.defaultSheet='ครีมบำรุงผม'] sheet for unmatched categories.
 * @returns {Promise<ArrayBuffer>} xlsx buffer (same contract as the other export* fns).
 */
export async function exportToLazadaMandatory(products = [], options = {}) {
  const {
    headersOnly = false,
    keepEmptySheets = true,
    defaultSheet = 'ครีมบำรุงผม',
  } = options;

  // Bucket products by target sheet.
  const buckets = Object.fromEntries(LAZADA_CATEGORIES.map((c) => [c, []]));
  if (!headersOnly) {
    products.forEach((p) => {
      const sheetName = resolveLazadaSheet(p, defaultSheet);
      (buckets[sheetName] || buckets[defaultSheet]).push(p);
    });
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Phanvadee PIM System';
  workbook.created = new Date();

  LAZADA_CATEGORIES.forEach((category) => {
    const rows = buckets[category];
    if (!headersOnly && !keepEmptySheets && rows.length === 0) return;

    const cols = LAZADA_MANDATORY_COLUMNS[category];
    const sheet = workbook.addWorksheet(category);
    sheet.columns = cols.map((c) => ({ header: c.header, width: c.width }));

    rows.forEach((p) => {
      const row = sheet.addRow(cols.map((c) => c.value(p)));
      row.height = 20;
      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Segoe UI', size: 10 };
        cell.alignment = { vertical: 'middle' };
        const fmt = cols[colNumber - 1]?.numFmt;
        if (fmt) cell.numFmt = fmt;
      });
    });

    styleLazadaHeader(sheet);
  });

  return workbook.xlsx.writeBuffer();
}


// ===========================================================================
// 2. SHOPEE TEMPLATE CONFIG & FUNCTION
// ===========================================================================
// Required columns, in Shopee's column order.
// `code`  – system header Shopee parses (row 1) — do not rename.
// `label` – Thai display label (row 3).
// `value` – maps a PIM product to the cell value.
export const SHOPEE_MANDATORY_COLUMNS = [
  { code: 'ps_product_name|1|0', label: 'ชื่อสินค้า', width: 36, value: (p) => p.name || '' },
  { code: 'ps_product_description|1|0', label: 'รายละเอียดสินค้า', width: 48, value: (p) => buildShopeeDescription(p) },
  { code: 'ps_price|1|1', label: 'ราคา', width: 14, numFmt: '#,##0.00', value: (p) => Number(p.retailPrice) || 0 },
  { code: 'ps_stock|0|1', label: 'คลังสินค้า', width: 14, numFmt: '0', value: (p) => Number(p.stock) || 0 },
  { code: 'ps_weight|0|1', label: 'น้ำหนัก', width: 14, numFmt: '0.000', value: (p) => parseWeightToKg(p.weight) },
  { code: 'ps_length|0|1', label: 'ความยาว', width: 14, numFmt: '0.##', value: (p) => (p.packageLength ? Number(p.packageLength) : '') },
  { code: 'ps_width|0|1', label: 'ความกว้าง', width: 14, numFmt: '0.##', value: (p) => (p.packageWidth ? Number(p.packageWidth) : '') },
  { code: 'ps_height|0|1', label: 'ความสูง', width: 14, numFmt: '0.##', value: (p) => (p.packageHeight ? Number(p.packageHeight) : '') },
];

function buildShopeeDescription(p) {
  let desc = p.description || '';
  if (p.highlights) desc += `\n\nจุดเด่นสินค้า:\n${p.highlights}`;
  if (p.howToUse) desc += `\n\nวิธีใช้งาน:\n${p.howToUse}`;
  return desc;
}

/**
 * Exports products into a Shopee mandatory-columns workbook.
 *
 * @param {Array}  products                PIM product objects.
 * @param {Object} [options]
 * @param {boolean} [options.headersOnly=false]  true → blank template (header rows only).
 * @returns {Promise<ArrayBuffer>} xlsx buffer (same contract as the other export* fns).
 */
export async function exportToShopeeMandatory(products = [], options = {}) {
  const { headersOnly = false } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Phanvadee PIM System';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('แบบฟอร์มการลงสินค้า');

  // Row 1: system codes  |  Row 2: blank  |  Row 3: Thai labels
  sheet.addRow(SHOPEE_MANDATORY_COLUMNS.map((c) => c.code));
  sheet.addRow([]);
  sheet.addRow(SHOPEE_MANDATORY_COLUMNS.map((c) => c.label));

  SHOPEE_MANDATORY_COLUMNS.forEach((c, i) => {
    sheet.getColumn(i + 1).width = c.width;
  });

  // Data rows (row 4+)
  if (!headersOnly) {
    products.forEach((p) => {
      const row = sheet.addRow(SHOPEE_MANDATORY_COLUMNS.map((c) => c.value(p)));
      row.height = 20;
      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Segoe UI', size: 10 };
        cell.alignment = { vertical: 'middle' };
        const fmt = SHOPEE_MANDATORY_COLUMNS[colNumber - 1]?.numFmt;
        if (fmt) cell.numFmt = fmt;
      });
    });
  }

  // Style header rows
  const codeRow = sheet.getRow(1);
  codeRow.height = 24;
  codeRow.eachCell((cell) => {
    cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SHOPEE_ORANGE } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });

  const labelRow = sheet.getRow(3);
  labelRow.height = 22;
  labelRow.eachCell((cell) => {
    cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: SHOPEE_ORANGE } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });

  sheet.views = [{ state: 'frozen', ySplit: 3 }];

  return workbook.xlsx.writeBuffer();
}


// ===========================================================================
// 3. TIKTOK SHOP TEMPLATE CONFIG & FUNCTION
// ===========================================================================
// Required columns, in TikTok's column order.
// `code`  – system header TikTok parses (row 1) — do not rename.
// `label` – Thai display label (row 2).
// `value` – maps a PIM product to the cell value.
export const TIKTOK_MANDATORY_COLUMNS = [
  { code: 'category', label: 'หมวดหมู่', width: 24, value: (p) => p.category || '' },
  { code: 'product_name', label: 'ชื่อสินค้า', width: 34, value: (p) => p.name || '' },
  { code: 'product_description', label: 'คำอธิบายสินค้า', width: 46, value: (p) => buildTiktokDescription(p) },
  { code: 'main_image', label: 'ภาพหลัก', width: 40, value: (p) => p.image || '' },
  { code: 'parcel_weight', label: 'น้ำหนักพัสดุ(g)', width: 16, numFmt: '0', value: (p) => Math.round(parseWeightToKg(p.weight) * 1000) },
  { code: 'parcel_length', label: 'ความยาวของพัสดุ(cm)', width: 18, numFmt: '0.##', value: (p) => (p.packageLength ? Number(p.packageLength) : '') },
  { code: 'parcel_width', label: 'ความกว้างของพัสดุ(cm)', width: 18, numFmt: '0.##', value: (p) => (p.packageWidth ? Number(p.packageWidth) : '') },
  { code: 'parcel_height', label: 'ความสูงของพัสดุ(cm)', width: 18, numFmt: '0.##', value: (p) => (p.packageHeight ? Number(p.packageHeight) : '') },
  { code: 'price', label: 'ราคาขายปลีก (บาท THB)', width: 24, numFmt: '#,##0.00', value: (p) => Number(p.retailPrice) || 0 },
  { code: 'quantity', label: 'ปริมาณ', width: 12, numFmt: '0', value: (p) => Number(p.stock) || 0 },
];

function buildTiktokDescription(p) {
  let desc = p.description || '';
  if (p.highlights) desc += `\n\nจุดเด่นสินค้า:\n${p.highlights}`;
  if (p.howToUse) desc += `\n\nวิธีใช้งาน:\n${p.howToUse}`;
  return desc;
}

/**
 * Exports products into a TikTok mandatory-columns workbook.
 *
 * @param {Array}  products                PIM product objects.
 * @param {Object} [options]
 * @param {boolean} [options.headersOnly=false]  true → blank template (header rows only).
 * @returns {Promise<ArrayBuffer>} xlsx buffer (same contract as the other export* fns).
 */
export async function exportToTiktokMandatory(products = [], options = {}) {
  const { headersOnly = false } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Phanvadee PIM System';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('Template');

  // Row 1: system codes  |  Row 2: Thai labels
  sheet.addRow(TIKTOK_MANDATORY_COLUMNS.map((c) => c.code));
  sheet.addRow(TIKTOK_MANDATORY_COLUMNS.map((c) => c.label));

  TIKTOK_MANDATORY_COLUMNS.forEach((c, i) => {
    sheet.getColumn(i + 1).width = c.width;
  });

  // Data rows (row 3+)
  if (!headersOnly) {
    products.forEach((p) => {
      const row = sheet.addRow(TIKTOK_MANDATORY_COLUMNS.map((c) => c.value(p)));
      row.height = 20;
      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Segoe UI', size: 10 };
        cell.alignment = { vertical: 'middle' };
        const fmt = TIKTOK_MANDATORY_COLUMNS[colNumber - 1]?.numFmt;
        if (fmt) cell.numFmt = fmt;
      });
    });
  }

  // Style header rows
  const codeRow = sheet.getRow(1);
  codeRow.height = 24;
  codeRow.eachCell((cell) => {
    cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TIKTOK_BLACK } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });

  const labelRow = sheet.getRow(2);
  labelRow.height = 30;
  labelRow.eachCell((cell) => {
    cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: TIKTOK_BLACK } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });

  sheet.views = [{ state: 'frozen', ySplit: 2 }];

  return workbook.xlsx.writeBuffer();
}
