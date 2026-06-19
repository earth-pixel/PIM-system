/**
 * importUtils.js
 * Bulk Import & Reverse Mapping Logic:
 * อ่านไฟล์ Excel จาก Shopee / Lazada / TikTok Shop
 * แล้วแปลงกลับเป็น Products[] โครงสร้าง PIM
 */
import * as XLSX from 'xlsx';

// ─────────────────────────────────────────────
// Validation Rules
// ─────────────────────────────────────────────
const VALIDATION_RULES = {
  shopee: {
    requiredColumns: ['Parent SKU', 'Variation Integration No.', 'Product Name', 'Seller SKU', 'Original Price', 'Stock'],
    groupKey: 'Variation Integration No.',
    skuKey: 'Seller SKU',
    parentSkuKey: 'Parent SKU',
    nameKey: 'Product Name',
  },
  lazada: {
    requiredColumns: ['Group No', 'Product Name', 'Seller SKU', 'Price', 'Stock'],
    groupKey: 'Group No',
    skuKey: 'Seller SKU',
    parentSkuKey: 'Group No',
    nameKey: 'Product Name',
  },
  tiktok: {
    requiredColumns: ['Product Name', 'Seller SKU', 'Price (THB)', 'Stock'],
    groupKey: 'Product Name',
    skuKey: 'Seller SKU',
    parentSkuKey: 'Product Name',
    nameKey: 'Product Name',
  },
};

// ─────────────────────────────────────────────
// Helper: ตรวจจับแพลตฟอร์มจาก column headers
// ─────────────────────────────────────────────
function detectPlatform(headers) {
  if (headers.includes('Variation Integration No.') || headers.includes('Parent SKU')) {
    return 'shopee';
  }
  if (headers.includes('Group No') || headers.includes('Sale Property 1 Name')) {
    return 'lazada';
  }
  if (headers.includes('Option 1 Name') || headers.includes('Price (THB)')) {
    return 'tiktok';
  }
  return null;
}

// ─────────────────────────────────────────────
// Helper: แปลง weight string → PIM format
// ─────────────────────────────────────────────
function formatWeight(rawWeight) {
  if (!rawWeight && rawWeight !== 0) return '';
  const num = parseFloat(rawWeight);
  if (isNaN(num)) return String(rawWeight);
  // ถ้าน้อยกว่า 10 ถือว่าเป็น kg → แปลงเป็น g
  if (num < 10) return `${Math.round(num * 1000)}g`;
  return `${Math.round(num)}g`;
}

// ─────────────────────────────────────────────
// Helper: Validate ข้อมูล rows
// คืน { errors: [], warnings: [] }
// ─────────────────────────────────────────────
function validateRows(rows, platform) {
  const rules = VALIDATION_RULES[platform];
  const errors = [];
  const warnings = [];
  const seenSKUs = new Set();

  rows.forEach((row, index) => {
    const rowNum = index + 2; // Excel row number (1-indexed + 1 header)

    // Check required columns
    rules.requiredColumns.forEach(col => {
      const val = row[col];
      if (val === undefined || val === null || String(val).trim() === '') {
        errors.push(`แถวที่ ${rowNum}: ขาดข้อมูลจำเป็น "${col}"`);
      }
    });

    // Check duplicate Seller SKU
    const sku = row[rules.skuKey];
    if (sku) {
      const skuStr = String(sku).trim();
      if (seenSKUs.has(skuStr)) {
        errors.push(`แถวที่ ${rowNum}: Seller SKU "${skuStr}" ซ้ำกันในไฟล์`);
      } else {
        seenSKUs.add(skuStr);
      }
    }

    // Check price
    const priceKey = platform === 'tiktok' ? 'Price (THB)' : platform === 'lazada' ? 'Price' : 'Original Price';
    const price = parseFloat(row[priceKey]);
    if (isNaN(price) || price < 0) {
      errors.push(`แถวที่ ${rowNum}: ราคาไม่ถูกต้อง (${row[priceKey]})`);
    }

    // Check stock
    const stock = parseInt(row['Stock'], 10);
    if (isNaN(stock) || stock < 0) {
      warnings.push(`แถวที่ ${rowNum}: จำนวนสต็อกไม่ถูกต้อง จะถูกตั้งเป็น 0`);
    }
  });

  return { errors, warnings };
}

// ─────────────────────────────────────────────
// Shopee Reverse Mapping
// กลุ่มแถวที่มี Variation Integration No. เดียวกัน → 1 Product
// ─────────────────────────────────────────────
function mapShopeeToProducts(rows, existingProducts) {
  const groups = {};

  rows.forEach(row => {
    const key = String(row['Variation Integration No.'] || row['Parent SKU'] || row['Product Name']).trim();
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  });

  return Object.values(groups).map(groupRows => {
    const first = groupRows[0];
    const parentSku = String(first['Parent SKU'] || '').trim();
    
    // ค้นหาสินค้าที่มีอยู่แล้วเพื่อทำ Overwrite
    const existing = existingProducts.find(p => p.code === parentSku);

    // Product-level data (ดึงจากแถวแรกของกลุ่ม)
    const product = {
      id: existing?.id || Date.now().toString() + Math.random().toString(36).substr(2, 5),
      code: parentSku || existing?.code || String(first['Product Name'] || '').slice(0, 20).toUpperCase().replace(/\s+/g, '-'),
      barcode: String(first['Barcode'] || existing?.barcode || '').trim(),
      name: String(first['Product Name'] || '').trim(),
      brand: String(first['Brand'] || existing?.brand || '').trim(),
      category: String(first['Category'] || existing?.category || '').trim(),
      description: String(first['Description'] || existing?.description || '').trim(),
      highlights: existing?.highlights || '',
      howToUse: existing?.howToUse || '',
      image: String(first['Product Image URL 1'] || existing?.image || '').trim(),
      size: String(first['Tier Variation 1 Option'] || existing?.size || '').trim(),
      weight: formatWeight(first['Package Weight (kg)']) || existing?.weight || '',
      pkgWidth: parseFloat(first['Package Width (cm)']) || existing?.pkgWidth || 10,
      pkgHeight: parseFloat(first['Package Height (cm)']) || existing?.pkgHeight || 10,
      pkgLength: parseFloat(first['Package Length (cm)']) || existing?.pkgLength || 10,
      fdaNumber: String(first['FDA / License No.'] || existing?.fdaNumber || '').trim(),
      tisiNumber: existing?.tisiNumber || '',
      wholesalePrice: existing?.wholesalePrice || 0,
      retailPrice: parseFloat(first['Original Price']) || existing?.retailPrice || 0,
      capFee: existing?.capFee || 0,
      status: 'Active',
      createdAt: existing?.createdAt || new Date().toISOString().slice(0, 16).replace('T', ' '),
      updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      updatedBy: 'import',
      stock: 0, // stock รวม คำนวณจาก variants
      variantOption1Name: String(first['Tier Variation 1 Name'] || 'ขนาด').trim(),
      variantOption2Name: String(first['Tier Variation 2 Name'] || '').trim(),
      _isOverwrite: !!existing,
      _platform: 'shopee',
    };

    // SKU-level data (variants)
    const variants = groupRows.map(row => ({
      sellerSku: String(row['Seller SKU'] || '').trim(),
      price: parseFloat(row['Original Price']) || 0,
      stock: parseInt(row['Stock'], 10) || 0,
      options: [
        ...(row['Tier Variation 1 Option'] ? [{ name: String(first['Tier Variation 1 Name'] || 'ขนาด'), value: String(row['Tier Variation 1 Option']) }] : []),
        ...(row['Tier Variation 2 Option'] ? [{ name: String(first['Tier Variation 2 Name'] || ''), value: String(row['Tier Variation 2 Option']) }] : []),
      ].filter(o => o.value),
    }));

    product.variants = variants;
    product.stock = variants.reduce((sum, v) => sum + (v.stock || 0), 0);

    return product;
  });
}

// ─────────────────────────────────────────────
// Lazada Reverse Mapping
// กลุ่มแถวที่มี Group No เดียวกัน → 1 Product
// ─────────────────────────────────────────────
function mapLazadaToProducts(rows, existingProducts) {
  const groups = {};

  rows.forEach(row => {
    const key = String(row['Group No'] || row['Product Name']).trim();
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  });

  return Object.values(groups).map(groupRows => {
    // แถวแรก = แถวที่มีข้อมูลสินค้าหลักครบ
    const first = groupRows.find(r => r['Product Name'] && String(r['Product Name']).trim()) || groupRows[0];
    const productCode = String(groupRows[0]['Seller SKU'] || '').split('-')[0] || '';
    const existing = existingProducts.find(p => p.code === productCode);

    const product = {
      id: existing?.id || Date.now().toString() + Math.random().toString(36).substr(2, 5),
      code: productCode || existing?.code || `IMP-${String(first['Group No'] || Date.now()).padStart(4,'0')}`,
      barcode: String(first['Barcode'] || existing?.barcode || '').trim(),
      name: String(first['Product Name'] || '').trim(),
      brand: String(first['Brand'] || existing?.brand || '').trim(),
      category: String(first['Category'] || existing?.category || '').trim(),
      description: String(first['Full Description'] || existing?.description || '').trim(),
      highlights: String(first['Short Description'] || existing?.highlights || '').trim(),
      howToUse: existing?.howToUse || '',
      image: String(first['Main Image'] || existing?.image || '').trim(),
      size: String(first['Sale Property 1 Value'] || existing?.size || '').trim(),
      weight: formatWeight(first['Package Weight (kg)']) || existing?.weight || '',
      pkgWidth: parseFloat(first['Package Width (cm)']) || existing?.pkgWidth || 10,
      pkgHeight: parseFloat(first['Package Height (cm)']) || existing?.pkgHeight || 10,
      pkgLength: parseFloat(first['Package Length (cm)']) || existing?.pkgLength || 10,
      fdaNumber: String(first['FDA No.'] || existing?.fdaNumber || '').trim(),
      tisiNumber: String(first['TISI No.'] || existing?.tisiNumber || '').trim(),
      wholesalePrice: existing?.wholesalePrice || 0,
      retailPrice: parseFloat(first['Price']) || existing?.retailPrice || 0,
      capFee: existing?.capFee || 0,
      status: 'Active',
      createdAt: existing?.createdAt || new Date().toISOString().slice(0, 16).replace('T', ' '),
      updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      updatedBy: 'import',
      stock: 0,
      variantOption1Name: String(first['Sale Property 1 Name'] || 'ขนาด').trim(),
      variantOption2Name: String(first['Sale Property 2 Name'] || '').trim(),
      _isOverwrite: !!existing,
      _platform: 'lazada',
    };

    const variants = groupRows.map(row => ({
      sellerSku: String(row['Seller SKU'] || '').trim(),
      price: parseFloat(row['Price']) || 0,
      stock: parseInt(row['Stock'], 10) || 0,
      options: [
        ...(row['Sale Property 1 Value'] ? [{ name: String(first['Sale Property 1 Name'] || 'ขนาด'), value: String(row['Sale Property 1 Value']) }] : []),
        ...(row['Sale Property 2 Value'] ? [{ name: String(first['Sale Property 2 Name'] || ''), value: String(row['Sale Property 2 Value']) }] : []),
      ].filter(o => o.value),
    }));

    product.variants = variants;
    product.stock = variants.reduce((sum, v) => sum + (v.stock || 0), 0);

    return product;
  });
}

// ─────────────────────────────────────────────
// TikTok Reverse Mapping
// กลุ่มแถวที่มี Product Name เดียวกัน (ต่อเนื่องกัน) → 1 Product
// ─────────────────────────────────────────────
function mapTikTokToProducts(rows, existingProducts) {
  const groups = {};
  const groupOrder = [];

  rows.forEach(row => {
    const key = String(row['Product Name'] || '').trim();
    if (!key) return;
    if (!groups[key]) {
      groups[key] = [];
      groupOrder.push(key);
    }
    groups[key].push(row);
  });

  return groupOrder.map(key => {
    const groupRows = groups[key];
    const first = groupRows[0];
    const productCode = String(first['Seller SKU'] || '').split('-')[0] || '';
    const existing = existingProducts.find(p => p.code === productCode || p.name === key);

    const product = {
      id: existing?.id || Date.now().toString() + Math.random().toString(36).substr(2, 5),
      code: productCode || existing?.code || `TKT-${Date.now()}`,
      barcode: String(first['Barcode (EAN/UPC)'] || existing?.barcode || '').trim(),
      name: String(first['Product Name'] || '').trim(),
      brand: String(first['Brand'] || existing?.brand || '').trim(),
      category: String(first['Category'] || existing?.category || '').trim(),
      description: String(first['Product Description'] || existing?.description || '').trim(),
      highlights: existing?.highlights || '',
      howToUse: existing?.howToUse || '',
      image: String(first['Main Image'] || existing?.image || '').trim(),
      size: String(first['Option 1 Value'] || existing?.size || '').trim(),
      weight: formatWeight(first['Package Weight (kg)']) || existing?.weight || '',
      pkgWidth: parseFloat(first['Package Width (cm)']) || existing?.pkgWidth || 10,
      pkgHeight: parseFloat(first['Package Height (cm)']) || existing?.pkgHeight || 10,
      pkgLength: parseFloat(first['Package Length (cm)']) || existing?.pkgLength || 10,
      fdaNumber: String(first['FDA No.'] || existing?.fdaNumber || '').trim(),
      tisiNumber: existing?.tisiNumber || '',
      wholesalePrice: existing?.wholesalePrice || 0,
      retailPrice: parseFloat(first['Price (THB)']) || existing?.retailPrice || 0,
      capFee: existing?.capFee || 0,
      status: 'Active',
      createdAt: existing?.createdAt || new Date().toISOString().slice(0, 16).replace('T', ' '),
      updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      updatedBy: 'import',
      stock: 0,
      variantOption1Name: String(first['Option 1 Name'] || 'ขนาด').trim(),
      variantOption2Name: String(first['Option 2 Name'] || '').trim(),
      _isOverwrite: !!existing,
      _platform: 'tiktok',
    };

    const variants = groupRows.map(row => ({
      sellerSku: String(row['Seller SKU'] || '').trim(),
      price: parseFloat(row['Price (THB)']) || 0,
      stock: parseInt(row['Stock'], 10) || 0,
      options: [
        ...(row['Option 1 Value'] ? [{ name: String(first['Option 1 Name'] || 'ขนาด'), value: String(row['Option 1 Value']) }] : []),
        ...(row['Option 2 Value'] ? [{ name: String(first['Option 2 Name'] || ''), value: String(row['Option 2 Value']) }] : []),
      ].filter(o => o.value),
    }));

    product.variants = variants;
    product.stock = variants.reduce((sum, v) => sum + (v.stock || 0), 0);

    return product;
  });
}

// ─────────────────────────────────────────────
// Main Import Function
// อ่านไฟล์ Excel → ตรวจสอบ → แปลงเป็น Products[]
// Return: { platform, products, errors, warnings, newCount, overwriteCount }
// ─────────────────────────────────────────────
export function importFromExcel(file, existingProducts = [], forcedPlatform = null) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        // อ่าน Sheet แรก
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // แปลงเป็น JSON (header row = แถวแรก)
        const rows = XLSX.utils.sheet_to_json(worksheet, {
          defval: '',
          raw: false,
        });

        if (!rows || rows.length === 0) {
          return resolve({ platform: null, products: [], errors: ['ไฟล์ Excel ไม่มีข้อมูล'], warnings: [], newCount: 0, overwriteCount: 0 });
        }

        // ตรวจสอบ platform
        const headers = Object.keys(rows[0]);
        const platform = forcedPlatform || detectPlatform(headers);

        if (!platform) {
          return resolve({
            platform: null,
            products: [],
            errors: ['ไม่สามารถระบุแพลตฟอร์มได้ — ตรวจสอบว่าไฟล์เป็นเทมเพลต Shopee, Lazada หรือ TikTok Shop'],
            warnings: [],
            newCount: 0,
            overwriteCount: 0,
          });
        }

        // Validate rows
        const { errors, warnings } = validateRows(rows, platform);

        // ถ้ามี error ร้ายแรง ไม่ดำเนินการต่อ
        if (errors.length > 0) {
          return resolve({ platform, products: [], errors, warnings, newCount: 0, overwriteCount: 0 });
        }

        // Reverse mapping ตาม platform
        let mappedProducts = [];
        if (platform === 'shopee') {
          mappedProducts = mapShopeeToProducts(rows, existingProducts);
        } else if (platform === 'lazada') {
          mappedProducts = mapLazadaToProducts(rows, existingProducts);
        } else if (platform === 'tiktok') {
          mappedProducts = mapTikTokToProducts(rows, existingProducts);
        }

        mappedProducts = mappedProducts.map(p => {
          const existing = existingProducts.find(ex => ex.code === p.code || ex.name === p.name);
          p._existingStock = existing ? (Number(existing.stock) || 0) : 0;
          p._stockDiff = p.stock - p._existingStock;
          return p;
        });

        const newCount = mappedProducts.filter(p => !p._isOverwrite).length;
        const overwriteCount = mappedProducts.filter(p => p._isOverwrite).length;

        resolve({ platform, products: mappedProducts, errors, warnings, newCount, overwriteCount });
      } catch (err) {
        reject(new Error(`อ่านไฟล์ไม่สำเร็จ: ${err.message}`));
      }
    };

    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์ได้'));
    reader.readAsArrayBuffer(file);
  });
}

// ─────────────────────────────────────────────
// Merge imported products into existing DB
// โหมด: 'overwrite' | 'skip' | 'merge'
// ─────────────────────────────────────────────
export function mergeImportedProducts(existingProducts, importedProducts, mode = 'overwrite') {
  const result = [...existingProducts];

  importedProducts.forEach(imported => {
    const existingIndex = result.findIndex(p => p.code === imported.code || p.name === imported.name);

    if (existingIndex >= 0) {
      if (mode === 'overwrite') {
        // Overwrite ข้อมูลเดิม แต่เก็บ fields ที่ Import ไม่มี
        result[existingIndex] = {
          ...result[existingIndex],
          ...imported,
          id: result[existingIndex].id, // คง id เดิมไว้
        };
      } else if (mode === 'skip') {
        // ข้ามสินค้าที่มีอยู่แล้ว
      } else if (mode === 'merge') {
        // เติมเฉพาะ fields ที่ว่างอยู่
        const merged = { ...result[existingIndex] };
        Object.keys(imported).forEach(key => {
          if (!merged[key] && imported[key]) {
            merged[key] = imported[key];
          }
        });
        result[existingIndex] = merged;
      }
    } else {
      // สินค้าใหม่ → เพิ่มเข้า DB
      result.unshift(imported);
    }
  });

  return result;
}
