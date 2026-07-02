import ExcelJS from 'exceljs';
import { parseWeightToKg } from './marketplaceIO.js';


const COL = {
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
  stock:   { header: 'จำนวน', width: 12, numFmt: '0', value: () => 0 },
  price:   { header: 'ราคา', width: 14, numFmt: '#,##0.00', value: (p) => Number(p.retailPrice) || 0 },
  length:  { header: 'ความยาว แพคเกจ (ซม)', width: 18, numFmt: '0.##', value: (p) => (p.packageLength ? Number(p.packageLength) : '') },
  width_:  { header: 'ความกว้าง แพคเกจ (ซม)', width: 18, numFmt: '0.##', value: (p) => (p.packageWidth ? Number(p.packageWidth) : '') },
  height:  { header: 'ความสูง แพคเกจ (ซม)', width: 18, numFmt: '0.##', value: (p) => (p.packageHeight ? Number(p.packageHeight) : '') },
};

// Required columns per category, in the order Lazada lists them.
export const LAZADA_MANDATORY_COLUMNS = {
  'ผลิตภัณฑ์จัดแต่งทรงผม': [COL.name, COL.image, COL.fda, COL.brand, COL.stylingLevel, COL.hairType, COL.hairBenefit, COL.weight, COL.stock, COL.price, COL.length, COL.width_, COL.height],
  'ทรีทเมนต์สำหรับผม':     [COL.name, COL.image, COL.fda, COL.brand, COL.hairType, COL.weight, COL.stock, COL.price, COL.length, COL.width_, COL.height],
  'เซ็ทดูแลเส้นผม':        [COL.name, COL.image, COL.fda, COL.brand, COL.hairType, COL.productForm, COL.weight, COL.stock, COL.price, COL.length, COL.width_, COL.height],
  'แชมพู':                 [COL.name, COL.image, COL.fda, COL.brand, COL.hairType, COL.weight, COL.stock, COL.price, COL.length, COL.width_, COL.height],
  'ผลิตภัณฑ์เปลี่ยนสีผม':  [COL.name, COL.image, COL.fda, COL.brand, COL.dyeType, COL.productForm, COL.weight, COL.stock, COL.price, COL.length, COL.width_, COL.height],
  'ครีมบำรุงผม':           [COL.name, COL.image, COL.fda, COL.brand, COL.hairType, COL.weight, COL.stock, COL.price, COL.length, COL.width_, COL.height],
};

const LAZADA_CATEGORIES = Object.keys(LAZADA_MANDATORY_COLUMNS);


/**
 * Maps a PIM product to the Lazada worksheet it belongs in.
 * Falls back to `defaultSheet` when the category can't be resolved.
 */
function resolveSheet(product, defaultSheet) {
  const cat = (product.category || '').trim();

  // Already a Lazada sheet name
  if (LAZADA_MANDATORY_COLUMNS[cat]) return cat;

  // Map from full PIM category names (new format)
  if (cat.startsWith('Grooming') || cat.includes('จัดแต่งทรงผม')) return 'ผลิตภัณฑ์จัดแต่งทรงผม';
  if (cat.startsWith('Chemical') || cat.includes('เคมีภัณฑ์') || cat.includes('เปลี่ยนสีผม')) return 'ผลิตภัณฑ์เปลี่ยนสีผม';
  if (cat.startsWith('Hair Treatment') || cat.includes('บำรุงเส้นผม')) return 'ครีมบำรุงผม';

  // Legacy short names
  if (cat === 'Styling') return 'ผลิตภัณฑ์จัดแต่งทรงผม';
  if (cat === 'Hair Color') return 'ผลิตภัณฑ์เปลี่ยนสีผม';
  if (cat === 'Treatment') return 'ครีมบำรุงผม';

  return defaultSheet;
}

// ---------------------------------------------------------------------------
// Exports products into a Lazada mandatory-columns workbook.
// ---------------------------------------------------------------------------
export async function exportToLazadaMandatory(products = [], options = {}) {
  const {
    headersOnly = false,
    keepEmptySheets = false, // Set to false by default as requested (อันไหนไม่มีเอาออก)
    defaultSheet = 'ครีมบำรุงผม',
  } = options;

  // Fetch the real Lazada template from the public/แพลตฟอร์ม folder
  const response = await fetch('/แพลตฟอร์ม/Lazada_advancedPublish7636export1781678299435_0617-14-38-19.xlsx?t=' + Date.now());
  if (!response.ok) throw new Error('Failed to fetch Lazada template file');
  const buffer = await response.arrayBuffer();

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  // Delete INDEX and สถานะ sheets
  const sheetsToDelete = ['INDEX', 'สถานะ', 'สถานะ_hide'];
  sheetsToDelete.forEach(name => {
    const ws = workbook.getWorksheet(name);
    if (ws) workbook.removeWorksheet(ws.id);
  });

  // Bucket products by target sheet.
  const buckets = Object.fromEntries(LAZADA_CATEGORIES.map((c) => [c, []]));
  if (!headersOnly) {
    products.forEach((p) => {
      const sheetName = resolveSheet(p, defaultSheet);
      (buckets[sheetName] || buckets[defaultSheet]).push(p);
    });
  }

  LAZADA_CATEGORIES.forEach((category) => {
    const rows = buckets[category] || [];
    const sheet = workbook.getWorksheet(category);
    const hideSheet = workbook.getWorksheet(category + '_hide');

    if (!sheet || !hideSheet) return;

    if (!headersOnly && !keepEmptySheets && rows.length === 0) {
      workbook.removeWorksheet(sheet.id);
      workbook.removeWorksheet(hideSheet.id);
      return;
    }

    const colCount = sheet.columnCount;
    const headerRow = sheet.getRow(1);
    const reqRow = sheet.getRow(2);

    // ------------------------------------------------------------------
    // 1. Read mandatory flags FIRST, before any row/col modifications
    //    Also keep system columns (Group No, catId) regardless of status
    // ------------------------------------------------------------------
    const systemCols = new Set(['catId', 'SellerSKU']);
    const colsToDelete = []; // collect col indices to delete (right-to-left later)

    for (let c = 1; c <= colCount; c++) {
      const headerVal = String(headerRow.getCell(c).value || '').trim();
      const reqVal = String(reqRow.getCell(c).value || '').trim();
      const isMandatory = reqVal === 'บังคับการกรอกข้อมูล';
      const isSystem = systemCols.has(headerVal);
      const isGroupNo = headerVal === 'Group No';
      if (isGroupNo || (!isMandatory && !isSystem)) {
        colsToDelete.push(c);
      }
    }

    // ------------------------------------------------------------------
    // 2. Build colMap from the ORIGINAL column positions (before deletion)
    // ------------------------------------------------------------------
    const colMap = {};
    for (let c = 1; c <= colCount; c++) {
      const headerVal = headerRow.getCell(c).value;
      if (headerVal) colMap[String(headerVal).trim()] = c;
    }

    // ------------------------------------------------------------------
    // 3. Clean existing data rows (keep header rows 1-4)
    // ------------------------------------------------------------------
    while (sheet.rowCount >= 5) sheet.spliceRows(sheet.rowCount, 1);
    while (hideSheet.rowCount >= 6) hideSheet.spliceRows(hideSheet.rowCount, 1);

    // ------------------------------------------------------------------
    // 4. Populate product data
    // ------------------------------------------------------------------
    if (!headersOnly) {
      rows.forEach((p, idx) => {
        const displayRowIdx = 5 + idx;
        const hideRowIdx = 6 + idx;

        const displayRow = sheet.getRow(displayRowIdx);
        const hideRow = hideSheet.getRow(hideRowIdx);

        displayRow.height = 20;
        hideRow.height = 20;

        const setVal = (key, val) => {
          const col = colMap[key];
          if (col === undefined) return;
          const cell = displayRow.getCell(col);
          cell.value = val;
          cell.font = { name: 'Segoe UI', size: 10 };
          cell.alignment = { vertical: 'middle' };
          const hideCell = hideRow.getCell(col);
          hideCell.value = val;
          hideCell.font = { name: 'Segoe UI', size: 10 };
          hideCell.alignment = { vertical: 'middle' };
        };

        setVal('ชื่อสินค้า', p.name || '');
        setVal('รูปภาพสินค้า1', p.image || '');
        setVal('TH_FDA License - หมายเลขใบอนุญาต', p.fdaNumber || '');
        setVal('ยี่ห้อ', p.brand && p.brand !== 'No Brand' && p.brand !== 'ไม่มีแบรนด์' ? p.brand : 'Unbranded');
        setVal('ประเภทเส้นผม', p.hairType || '');
        setVal('ระดับการจัดทรง', p.stylingLevel || '');
        setVal('ประโยชน์เพื่อการดูแลเส้นผม', p.hairBenefit || '');
        setVal('รูปแบบของผลิตภัณฑ์', p.productForm || '');
        setVal('ประเภทสีย้อมผม', p.hairColorType || '');
        const weightKg = parseWeightToKg(p.weight);
        if (weightKg > 0) setVal('น้ำหนัก แพคเกจ (กก)', weightKg);
        setVal('จำนวน', 0);
        setVal('ราคา', Number(p.retailPrice) || 0);
        if (p.packageLength) setVal('ความยาว แพคเกจ (ซม)', Number(p.packageLength));
        if (p.packageWidth) setVal('ความกว้าง แพคเกจ (ซม)', Number(p.packageWidth));
        if (p.packageHeight) setVal('ความสูง แพคเกจ (ซม)', Number(p.packageHeight));
        setVal('SellerSKU', p.code || '');

        displayRow.commit();
        hideRow.commit();
      });
    }

    // ------------------------------------------------------------------
    // 5. Delete optional columns right-to-left (so indices stay valid)
    // ------------------------------------------------------------------
    for (let i = colsToDelete.length - 1; i >= 0; i--) {
      const c = colsToDelete[i];
      sheet.spliceColumns(c, 1);
      hideSheet.spliceColumns(c, 1);
    }

    // ------------------------------------------------------------------
    // 6. Clear helper rows 2, 3, 4 content (keep structure for Lazada)
    // ------------------------------------------------------------------
    sheet.getRow(2).hidden = true;
    sheet.getRow(3).hidden = true;
    sheet.getRow(4).hidden = true;
    const finalColCount = sheet.columnCount;
    for (let c = 1; c <= finalColCount; c++) {
      sheet.getRow(2).getCell(c).value = '';
      sheet.getRow(3).getCell(c).value = '';
      sheet.getRow(4).getCell(c).value = '';
      hideSheet.getRow(2).getCell(c).value = '';
      hideSheet.getRow(3).getCell(c).value = '';
      hideSheet.getRow(4).getCell(c).value = '';
    }
  });

  return workbook.xlsx.writeBuffer();
}
