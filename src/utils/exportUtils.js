/**
 * exportUtils.js
 * Bulk Export Logic: แปลง Products[] จาก PIM DB → Excel ตามรูปแบบของแต่ละแพลตฟอร์ม
 * รองรับ: Shopee, Lazada, TikTok Shop
 */
import * as XLSX from 'xlsx';

// ─────────────────────────────────────────────
// Helper: แปลง weight string → ตัวเลข กรัม
// เช่น "120g" → 120, "1.5kg" → 1500
// ─────────────────────────────────────────────
function parseWeightToGrams(weightStr) {
  if (!weightStr) return 500;
  const str = String(weightStr).toLowerCase().trim();
  const numMatch = str.match(/([\d.]+)/);
  if (!numMatch) return 500;
  const num = parseFloat(numMatch[1]);
  if (str.includes('kg')) return Math.round(num * 1000);
  return Math.round(num); // assume grams
}

// ─────────────────────────────────────────────
// Helper: แปลง weight → kg (สำหรับ Lazada/TikTok)
// ─────────────────────────────────────────────
function parseWeightToKg(weightStr) {
  const grams = parseWeightToGrams(weightStr);
  return parseFloat((grams / 1000).toFixed(3));
}

// ─────────────────────────────────────────────
// Helper: สร้าง Seller SKU จาก product code + variant
// ─────────────────────────────────────────────
function buildSellerSKU(productCode, variant = null) {
  if (!variant) return productCode;
  const variantSuffix = variant.options
    .map(o => o.value.replace(/\s+/g, '').substring(0, 6).toUpperCase())
    .join('-');
  return `${productCode}-${variantSuffix}`;
}

// ─────────────────────────────────────────────
// Helper: download Excel file
// ─────────────────────────────────────────────
function downloadWorkbook(workbook, filename) {
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
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
export function exportShopee(products) {
  const rows = [];

  products.forEach((product, productIndex) => {
    const parentSKU = product.code;
    // Integration No. ใช้เพื่อบอกว่าแถวไหนอยู่กลุ่มเดียวกัน
    const integrationNo = `INT-${String(productIndex + 1).padStart(4, '0')}`;
    const weightKg = parseWeightToKg(product.weight);

    const variants = product.variants && product.variants.length > 0
      ? product.variants
      : [{ sellerSku: product.code, price: product.retailPrice, stock: product.stock, options: [] }];

    variants.forEach((variant) => {
      const sellerSku = variant.sellerSku || buildSellerSKU(product.code, variant);
      const tier1Name = product.variantOption1Name || 'ขนาด';
      const tier1Value = variant.options?.[0]?.value || product.size || '-';
      const tier2Name = product.variantOption2Name || '';
      const tier2Value = variant.options?.[1]?.value || '';

      rows.push({
        'Parent SKU':            parentSKU,
        'Variation Integration No.': integrationNo,
        'Product Name':          product.name,
        'Category':              product.category,
        'Brand':                 product.brand,
        'Description':           product.description || '',
        'Product Image URL 1':   product.image || '',
        'Tier Variation 1 Name': tier1Name,
        'Tier Variation 1 Option': tier1Value,
        'Tier Variation 2 Name': tier2Name,
        'Tier Variation 2 Option': tier2Value,
        'Seller SKU':            sellerSku,
        'Original Price':        variant.price ?? product.retailPrice,
        'Stock':                 variant.stock ?? product.stock,
        'Package Weight (kg)':   weightKg,
        'Package Width (cm)':    product.pkgWidth || 10,
        'Package Height (cm)':   product.pkgHeight || 10,
        'Package Length (cm)':   product.pkgLength || 10,
        'Days to Ship':          3,
        'Barcode':               product.barcode || '',
        'FDA / License No.':     product.fdaNumber || '',
      });
    });
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  applyColumnWidths(ws, [18, 22, 40, 15, 15, 50, 40, 20, 20, 20, 20, 25, 12, 8, 18, 16, 16, 16, 12, 18, 18]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

  const timestamp = new Date().toISOString().slice(0, 10);
  downloadWorkbook(wb, `Shopee_mass_upload_${timestamp}.xlsx`);
}

// ─────────────────────────────────────────────
// 2. LAZADA EXPORT
// Logic: Group No. ผูกกลุ่ม SKU → สินค้ากลุ่มเดียวกันมี Group No. เดียวกัน
// แต่ละ variant → 1 แถว, แถวแรกของกลุ่มใส่ข้อมูลสินค้าหลักครบ
// ─────────────────────────────────────────────
export function exportLazada(products) {
  const rows = [];

  products.forEach((product, productIndex) => {
    const groupNo = String(productIndex + 1);
    const weightKg = parseWeightToKg(product.weight);

    const variants = product.variants && product.variants.length > 0
      ? product.variants
      : [{ sellerSku: product.code, price: product.retailPrice, stock: product.stock, options: [] }];

    variants.forEach((variant, variantIndex) => {
      const sellerSku = variant.sellerSku || buildSellerSKU(product.code, variant);
      const saleProp1Name  = product.variantOption1Name || 'ขนาด';
      const saleProp1Value = variant.options?.[0]?.value || product.size || '-';
      const saleProp2Name  = product.variantOption2Name || '';
      const saleProp2Value = variant.options?.[1]?.value || '';

      // แถวแรกของกลุ่มจะใส่ข้อมูลสินค้าหลักครบถ้วน แถวถัดไปของกลุ่มเดียวกันเว้นไว้
      const isFirstInGroup = variantIndex === 0;

      rows.push({
        'Group No':              groupNo,
        'Product Name':          product.name,
        'Brand':                 product.brand,
        'Category':              product.category,
        'Short Description':     isFirstInGroup ? (product.highlights || '') : '',
        'Full Description':      isFirstInGroup ? (product.description || '') : '',
        'Main Image':            isFirstInGroup ? (product.image || '') : '',
        'Sale Property 1 Name':  saleProp1Name,
        'Sale Property 1 Value': saleProp1Value,
        'Sale Property 2 Name':  saleProp2Name,
        'Sale Property 2 Value': saleProp2Value,
        'Seller SKU':            sellerSku,
        'Price':                 variant.price ?? product.retailPrice,
        'Special Price':         '',
        'Stock':                 variant.stock ?? product.stock,
        'Package Weight (kg)':   weightKg,
        'Package Length (cm)':   product.pkgLength || 10,
        'Package Width (cm)':    product.pkgWidth || 10,
        'Package Height (cm)':   product.pkgHeight || 10,
        'Barcode':               product.barcode || '',
        'Warranty Type':         'No Warranty',
        'Warranty Period':       '',
        'FDA No.':               product.fdaNumber || '',
        'TISI No.':              product.tisiNumber || '',
      });
    });
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  applyColumnWidths(ws, [10, 40, 15, 15, 50, 60, 40, 20, 20, 20, 20, 25, 12, 12, 8, 16, 14, 14, 14, 18, 15, 15, 18, 18]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

  const timestamp = new Date().toISOString().slice(0, 10);
  downloadWorkbook(wb, `Lazada_batch_upload_${timestamp}.xlsx`);
}

// ─────────────────────────────────────────────
// 3. TIKTOK SHOP EXPORT
// Logic: Product Name เป็นตัวผูกกลุ่ม
// Option Name/Value แยกคอลัมน์ตาม tier
// แต่ละ variant → 1 แถว
// ─────────────────────────────────────────────
export function exportTikTok(products) {
  const rows = [];

  products.forEach(product => {
    const weightKg = parseWeightToKg(product.weight);

    const variants = product.variants && product.variants.length > 0
      ? product.variants
      : [{ sellerSku: product.code, price: product.retailPrice, stock: product.stock, options: [] }];

    variants.forEach((variant, variantIndex) => {
      const sellerSku = variant.sellerSku || buildSellerSKU(product.code, variant);
      const opt1Name  = product.variantOption1Name || 'ขนาด';
      const opt1Value = variant.options?.[0]?.value || product.size || '-';
      const opt2Name  = product.variantOption2Name || '';
      const opt2Value = variant.options?.[1]?.value || '';

      const isFirstInGroup = variantIndex === 0;

      rows.push({
        'Product Name':        product.name,
        'Category':            product.category,
        'Brand':               product.brand,
        'Product Description': isFirstInGroup ? (product.description || '') : '',
        'Main Image':          isFirstInGroup ? (product.image || '') : '',
        'Option 1 Name':       opt1Name,
        'Option 1 Value':      opt1Value,
        'Option 2 Name':       opt2Name,
        'Option 2 Value':      opt2Value,
        'Seller SKU':          sellerSku,
        'Price (THB)':         variant.price ?? product.retailPrice,
        'Stock':               variant.stock ?? product.stock,
        'Package Weight (kg)': weightKg,
        'Package Length (cm)': product.pkgLength || 10,
        'Package Width (cm)':  product.pkgWidth || 10,
        'Package Height (cm)': product.pkgHeight || 10,
        'Barcode (EAN/UPC)':   product.barcode || '',
        'FDA No.':             product.fdaNumber || '',
      });
    });
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  applyColumnWidths(ws, [40, 15, 15, 60, 40, 16, 20, 16, 20, 25, 12, 8, 16, 14, 14, 14, 18, 18]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

  const timestamp = new Date().toISOString().slice(0, 10);
  downloadWorkbook(wb, `TikTokShop_batch_upload_${timestamp}.xlsx`);
}

// ─────────────────────────────────────────────
// 4. GENERAL EXCEL / GOOGLE SHEETS EXPORT
// ─────────────────────────────────────────────
export function exportToExcel(products) {
  const rows = products.map(product => ({
    'รหัสสินค้า (SKU)': product.code,
    'รหัสบาร์โค้ด': product.barcode || '',
    'ชื่อสินค้า': product.name,
    'แบรนด์': product.brand || '',
    'หมวดหมู่': product.category || '',
    'ราคาส่ง (บาท)': product.wholesalePrice || 0,
    'ราคาปลีก (บาท)': product.retailPrice || 0,
    'จำนวนสต็อก (ชิ้น)': product.stock || 0,
    'สถานะ': product.status === 'Active' ? 'เปิดใช้งาน' : 'ปิดใช้งาน',
    'รายละเอียด': product.description || '',
    'ขนาด': product.size || '',
    'น้ำหนัก': product.weight || '',
    'หมายเลข อย.': product.fdaNumber || '',
    'หมายเลข มอก.': product.tisiNumber || '',
    'วันที่ลงทะเบียน': product.createdAt || ''
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  applyColumnWidths(ws, [15, 15, 35, 15, 15, 15, 15, 15, 12, 50, 12, 12, 18, 18, 18]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'สินค้าในคลัง');

  const timestamp = new Date().toISOString().slice(0, 10);
  downloadWorkbook(wb, `PIM_products_export_${timestamp}.xlsx`);
}
