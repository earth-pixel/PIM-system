/**
 * Marketplace Import/Export Utility
 * Phanvadee Co., Ltd. PIM System
 */
import ExcelJS from 'exceljs';

// Lazada sheets definition
const LAZADA_SHEETS = [
  'ผลิตภัณฑ์จัดแต่งทรงผม',
  'ผลิตภัณฑ์เปลี่ยนสีผม',
  'ครีมบำรุงผม',
  'ทรีทเมนต์สำหรับผม',
  'แชมพู',
  'เซ็ทดูแลเส้นผม'
];

// Status markers Lazada writes on row 2 of the full template.
const LAZADA_META_MARKERS = new Set([
  'บังคับการกรอกข้อมูล',
  'ไม่บังคับการกรอกข้อมูล',
]);

/**
 * Parsers weight string to numeric value in kg
 * @param {string|number} weightStr - e.g. "120g", "1.5 kg", 200
 * @returns {number} weight in kg
 */
export function parseWeightToKg(weightStr) {
  if (weightStr === undefined || weightStr === null || weightStr === '') return 0;
  if (typeof weightStr === 'number') {
    return weightStr; // Assume numbers are already in kg
  }

  const cleaned = String(weightStr).toLowerCase().replace(/\s+/g, '');
  const match = cleaned.match(/^([0-9.]+)(g|kg|กิโลกรัม|กรัม)?$/);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const unit = match[2];
  if (isNaN(value)) return 0;

  if (unit === 'g' || unit === 'กรัม') {
    return value / 1000;
  }
  // Otherwise default to kg (if it's kg or if no unit is specified but it looks like kg, e.g. 1.5)
  // But wait! If value is > 10 and no unit is specified (e.g. "120"), assume grams.
  if (!unit && value >= 10) {
    return value / 1000;
  }

  return value;
}

/**
 * Formats numeric weight to readable PIM weight string
 * @param {number} value - weight numeric
 * @param {string} sourceUnit - 'kg' or 'g'
 * @returns {string} e.g. "120g" or "1.5kg"
 */
export function formatWeightStr(value, sourceUnit = 'kg') {
  if (value === undefined || value === null || isNaN(value)) return '';
  
  let kg = value;
  if (sourceUnit === 'g') {
    kg = value / 1000;
  }

  if (kg < 1) {
    return Math.round(kg * 1000) + 'g';
  }
  return kg + 'kg';
}

/**
 * Returns PIM Category based on Lazada sheet name
 */
function getPimCategoryFromLazada(sheetName) {
  if (sheetName === 'ผลิตภัณฑ์จัดแต่งทรงผม') return 'Styling';
  if (sheetName === 'ผลิตภัณฑ์เปลี่ยนสีผม') return 'Hair Color';
  if (sheetName === 'ครีมบำรุงผม') return 'Treatment';
  return sheetName; // fallback/create new category
}

/**
 * Guess brand from name
 */
function guessBrandFromName(name) {
  if (!name) return '';
  const firstWord = name.trim().split(/\s+/)[0];
  // Ignore purely numeric or too short words
  if (!firstWord || firstWord.length < 2 || /^\d+$/.test(firstWord)) {
    return '';
  }
  return firstWord;
}

/**
 * Dynamically builds Lazada columns mapping
 */
function buildLazadaColumnMap(sheet) {
  const map = {};
  const row = sheet.getRow(1);
  if (!row) return map;
  
  // Use colCount to iterate
  const colCount = sheet.columnCount || 50;
  for (let i = 1; i <= colCount; i++) {
    const val = row.getCell(i).value;
    if (val) {
      map[String(val).trim()] = i;
    }
  }
  return map;
}


// ==========================================
// EXPORTS
// ==========================================


// ==========================================
// IMPORTS
// ==========================================

export async function importFromShopeeWorkbook(workbook) {
  const sheet = workbook.getWorksheet('แบบฟอร์มการลงสินค้า') || workbook.worksheets[0];
  const importedProducts = [];
  
  const totalRows = sheet.rowCount;
  for (let i = 7; i <= totalRows; i++) {
    const name = sheet.getCell(i, 2).value;
    if (!name || !String(name).trim()) continue;

    const desc = sheet.getCell(i, 3).value ? String(sheet.getCell(i, 3).value).trim() : '';
    const code = sheet.getCell(i, 9).value ? String(sheet.getCell(i, 9).value).trim() : '';
    const barcode = sheet.getCell(i, 21).value ? String(sheet.getCell(i, 21).value).trim() : '';
    const priceVal = sheet.getCell(i, 16).value;
    const stockVal = sheet.getCell(i, 17).value;
    const imgVal = sheet.getCell(i, 22).value ? String(sheet.getCell(i, 22).value).trim() : '';
    const weightVal = sheet.getCell(i, 31).value;
    const lengthVal = sheet.getCell(i, 32).value;
    const widthVal = sheet.getCell(i, 33).value;
    const heightVal = sheet.getCell(i, 34).value;

    const retailPrice = priceVal ? Number(priceVal) : 0;
    const stock = stockVal ? Number(stockVal) : 0;
    const weightStr = weightVal ? formatWeightStr(Number(weightVal), 'kg') : '';

    const guessedBrand = guessBrandFromName(String(name));

    importedProducts.push({
      code: code || barcode || `SP-${Date.now()}-${i}`,
      barcode: barcode || '',
      name: String(name).trim(),
      brand: guessedBrand || 'Phanvadee', // Fallback to PIM defaults
      category: 'ไม่ระบุ',
      wholesalePrice: Math.round(retailPrice * 0.7), // Estimate wholesale
      retailPrice,
      capFee: 0,
      description: desc,
      highlights: 'นำเข้าจาก Shopee',
      howToUse: 'นำเข้าจาก Shopee',
      image: imgVal || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&auto=format&fit=crop&q=60',
      size: 'N/A',
      weight: weightStr,
      fdaNumber: '10-1-0000000', // Mock template required fields
      tisiNumber: 'มอก. 1985-2549',
      packageLength: lengthVal ? Number(lengthVal) : null,
      packageWidth: widthVal ? Number(widthVal) : null,
      packageHeight: heightVal ? Number(heightVal) : null,
      stock,
      status: 'Active',
      _platform: 'shopee'
    });
  }

  return importedProducts;
}

export async function importFromShopee(file) {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);
  return importFromShopeeWorkbook(workbook);
}

export async function importFromLazadaWorkbook(workbook) {
  const importedProducts = [];

  for (const sheetName of LAZADA_SHEETS) {
    const sheet = workbook.getWorksheet(sheetName);
    if (!sheet) continue;

    const colMap = buildLazadaColumnMap(sheet);
    const nameCol = colMap['ชื่อสินค้า'];
    if (!nameCol) continue; // No product name column mapped

    // Detect the first data row: full template (row 5) vs clean export (row 2).
    const row2Name = String(sheet.getCell(2, nameCol).value ?? '').trim();
    const dataStartRow = LAZADA_META_MARKERS.has(row2Name) ? 5 : 2;

    const totalRows = sheet.rowCount;
    for (let i = dataStartRow; i <= totalRows; i++) {
      const name = sheet.getCell(i, nameCol).value;
      if (!name || !String(name).trim()) continue;

      // Extra guard: never treat a stray header/marker row as a product.
      const nameStr = String(name).trim();
      if (nameStr === 'ชื่อสินค้า' || LAZADA_META_MARKERS.has(nameStr)) continue;

      const readCell = (header) => {
        const colIdx = colMap[header];
        if (colIdx) {
          const val = sheet.getCell(i, colIdx).value;
          return val !== null && val !== undefined ? String(val).trim() : '';
        }
        return '';
      };

      const code = readCell('SellerSKU');
      const img = readCell('รูปภาพสินค้า1');
      const brand = readCell('ยี่ห้อ');
      const desc = readCell('คำอธิบายหลัก');
      const fda = readCell('TH_FDA License - หมายเลขใบอนุญาต');
      const weightVal = readCell('น้ำหนัก แพคเกจ (กก)');
      const stockVal = readCell('จำนวน');
      const priceVal = readCell('ราคา');
      const lengthVal = readCell('ความยาว แพคเกจ (ซม)');
      const widthVal = readCell('ความกว้าง แพคเกจ (ซม)');
      const heightVal = readCell('ความสูง แพคเกจ (ซม)');

      const retailPrice = priceVal ? Number(priceVal) : 0;
      const stock = stockVal ? Number(stockVal) : 0;
      const weightStr = weightVal ? formatWeightStr(Number(weightVal), 'kg') : '';

      importedProducts.push({
        code: code || `LZ-${Date.now()}-${i}`,
        barcode: '',
        name: nameStr,
        brand: brand && brand !== 'No Brand' ? brand : 'Phanvadee',
        category: getPimCategoryFromLazada(sheetName),
        wholesalePrice: Math.round(retailPrice * 0.7),
        retailPrice,
        capFee: 0,
        description: desc,
        highlights: 'นำเข้าจาก Lazada',
        howToUse: 'นำเข้าจาก Lazada',
        image: img || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&auto=format&fit=crop&q=60',
        size: 'N/A',
        weight: weightStr,
        fdaNumber: fda || '10-1-0000000',
        tisiNumber: 'มอก. 1985-2549',
        packageLength: lengthVal ? Number(lengthVal) : null,
        packageWidth: widthVal ? Number(widthVal) : null,
        packageHeight: heightVal ? Number(heightVal) : null,
        stock,
        status: 'Active',
        _platform: 'lazada',
      });
    }
  }

  return importedProducts;
}

export async function importFromLazada(file) {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);
  return importFromLazadaWorkbook(workbook);
}

export async function importFromTiktokWorkbook(workbook) {
  const sheet = workbook.getWorksheet('Template') || workbook.worksheets[0];
  const importedProducts = [];

  const totalRows = sheet.rowCount;
  for (let i = 5; i <= totalRows; i++) {
    const name = sheet.getCell(i, 3).value; // product_name Col C
    if (!name || !String(name).trim()) continue;

    const catVal = sheet.getCell(i, 1).value ? String(sheet.getCell(i, 1).value).trim() : '';
    const brandVal = sheet.getCell(i, 2).value ? String(sheet.getCell(i, 2).value).trim() : '';
    const desc = sheet.getCell(i, 4).value ? String(sheet.getCell(i, 4).value).trim() : '';
    const img = sheet.getCell(i, 5).value ? String(sheet.getCell(i, 5).value).trim() : '';
    const weightVal = sheet.getCell(i, 19).value; // parcel_weight Col S
    const lengthVal = sheet.getCell(i, 20).value;
    const widthVal = sheet.getCell(i, 21).value;
    const heightVal = sheet.getCell(i, 22).value;
    const priceVal = sheet.getCell(i, 24).value; // price Col X
    const stockVal = sheet.getCell(i, 26).value; // quantity Col Z
    const code = sheet.getCell(i, 27).value ? String(sheet.getCell(i, 27).value).trim() : ''; // seller_sku Col AA

    const retailPrice = priceVal ? Number(priceVal) : 0;
    const stock = stockVal ? Number(stockVal) : 0;
    const weightStr = weightVal ? formatWeightStr(Number(weightVal), 'g') : '';

    const guessedBrand = brandVal && brandVal !== 'ไม่มีแบรนด์' ? brandVal : guessBrandFromName(String(name));

    // Guess a category if Tik Tok category string exists (e.g. "การดูแล/แชมพู (123)" -> "Treatment")
    let category = 'ไม่ระบุ';
    if (catVal) {
      if (catVal.includes('จัดแต่งทรงผม')) category = 'Styling';
      else if (catVal.includes('เปลี่ยนสีผม') || catVal.includes('ย้อม')) category = 'Hair Color';
      else if (catVal.includes('บำรุงผม') || catVal.includes('ทรีทเมนต์') || catVal.includes('แชมพู')) category = 'Treatment';
      else category = catVal; // use raw string which will create category in App.jsx
    }

    importedProducts.push({
      code: code || `TT-${Date.now()}-${i}`,
      barcode: '',
      name: String(name).trim(),
      brand: guessedBrand || 'Phanvadee',
      category: category,
      wholesalePrice: Math.round(retailPrice * 0.7),
      retailPrice,
      capFee: 0,
      description: desc,
      highlights: 'นำเข้าจาก TikTok Shop',
      howToUse: 'นำเข้าจาก TikTok Shop',
      image: img || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&auto=format&fit=crop&q=60',
      size: 'N/A',
      weight: weightStr,
      fdaNumber: '10-1-0000000',
      tisiNumber: 'มอก. 1985-2549',
      packageLength: lengthVal ? Number(lengthVal) : null,
      packageWidth: widthVal ? Number(widthVal) : null,
      packageHeight: heightVal ? Number(heightVal) : null,
      stock,
      status: 'Active',
      _platform: 'tiktok'
    });
  }

  return importedProducts;
}

export async function importFromTiktok(file) {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);
  return importFromTiktokWorkbook(workbook);
}

export async function autoDetectPlatformAndImport(file) {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  // Shopee detection:
  // - A worksheet named "แบบฟอร์มการลงสินค้า"
  // - OR row 1 has "ps_product_name|1|0" or starts with "ps_"
  const hasShopeeSheet = workbook.getWorksheet('แบบฟอร์มการลงสินค้า');
  let isShopee = !!hasShopeeSheet;
  if (!isShopee && workbook.worksheets.length > 0) {
    const ws = workbook.worksheets[0];
    const firstRowValues = [];
    ws.getRow(1).eachCell(c => firstRowValues.push(String(c.value || '').trim()));
    isShopee = firstRowValues.some(v => v.startsWith('ps_') || v.includes('ps_product_name') || v.includes('ps_price') || v.includes('ps_stock'));
  }

  if (isShopee) {
    const products = await importFromShopeeWorkbook(workbook);
    return { platform: 'shopee', products };
  }

  // TikTok detection:
  // - A worksheet named "Template"
  // - OR row 1 has "product_name" or "product_description" or "parcel_weight"
  const hasTiktokSheet = workbook.getWorksheet('Template');
  let isTiktok = !!hasTiktokSheet;
  if (!isTiktok && workbook.worksheets.length > 0) {
    const ws = workbook.worksheets[0];
    const firstRowValues = [];
    ws.getRow(1).eachCell(c => firstRowValues.push(String(c.value || '').trim().toLowerCase()));
    isTiktok = firstRowValues.includes('product_name') && 
               (firstRowValues.includes('product_description') || firstRowValues.includes('parcel_weight'));
  }

  if (isTiktok) {
    const products = await importFromTiktokWorkbook(workbook);
    return { platform: 'tiktok', products };
  }

  // Lazada detection:
  // - Any worksheet name matching Lazada sheets
  // - OR row 1 has "ชื่อสินค้า" or "ยี่ห้อ" or "รูปภาพสินค้า1"
  const hasLazadaSheet = workbook.worksheets.some(ws => LAZADA_SHEETS.includes(ws.name));
  let isLazada = hasLazadaSheet;
  if (!isLazada && workbook.worksheets.length > 0) {
    const ws = workbook.worksheets[0];
    const firstRowValues = [];
    ws.getRow(1).eachCell(c => firstRowValues.push(String(c.value || '').trim()));
    isLazada = firstRowValues.includes('ชื่อสินค้า') || firstRowValues.includes('ยี่ห้อ') || firstRowValues.includes('รูปภาพสินค้า1') || firstRowValues.includes('SellerSKU');
  }

  if (isLazada) {
    const products = await importFromLazadaWorkbook(workbook);
    return { platform: 'lazada', products };
  }

  // Fallback scan - try to parse using all three builders to see if one succeeds with products
  for (const plat of ['shopee', 'tiktok', 'lazada']) {
    try {
      let products = [];
      if (plat === 'shopee') {
        products = await importFromShopeeWorkbook(workbook);
      } else if (plat === 'tiktok') {
        products = await importFromTiktokWorkbook(workbook);
      } else {
        products = await importFromLazadaWorkbook(workbook);
      }
      if (products && products.length > 0) {
        return { platform: plat, products };
      }
    } catch {
      // ignore and try next
    }
  }

  throw new Error('ไม่สามารถตรวจสอบและระบุแพลตฟอร์มจากโครงสร้างไฟล์นี้ได้ กรุณาอัปโหลดไฟล์เทมเพลตที่ถูกต้อง');
}


export function validateForPlatform(products, platform) {
  const errors = [];
  products.forEach(p => {
    const missing = [];
    if (platform === 'lazada') {
      if (!p.name?.trim()) missing.push('ชื่อสินค้า');
      if (!p.image?.trim()) missing.push('รูปภาพสินค้า1');
      if (!p.weight) missing.push('น้ำหนัก แพคเกจ (กก)');
      if (p.stock === undefined || p.stock === null || isNaN(p.stock)) missing.push('จำนวน');
      if (p.retailPrice === undefined || p.retailPrice === null || isNaN(p.retailPrice)) missing.push('ราคา');
      if (!p.packageLength) missing.push('ความยาว แพคเกจ (ซม)');
      if (!p.packageWidth) missing.push('ความกว้าง แพคเกจ (ซม)');
      if (!p.packageHeight) missing.push('ความสูง แพคเกจ (ซม)');
    } else if (platform === 'shopee') {
      if (!p.name?.trim()) missing.push('ชื่อสินค้า');
      if (!p.description?.trim()) missing.push('รายละเอียดสินค้า');
      if (p.retailPrice === undefined || p.retailPrice === null || isNaN(p.retailPrice)) missing.push('ราคา');
      if (p.stock === undefined || p.stock === null || isNaN(p.stock)) missing.push('คลังสินค้า');
      if (!p.weight) missing.push('น้ำหนักพัสดุ');
      if (!p.packageLength) missing.push('ความยาวพัสดุ');
      if (!p.packageWidth) missing.push('ความกว้างพัสดุ');
      if (!p.packageHeight) missing.push('ความสูงพัสดุ');
    } else if (platform === 'tiktok') {
      if (!p.category?.trim() || p.category === 'ไม่ระบุ') missing.push('หมวดหมู่ (category)');
      if (!p.name?.trim()) missing.push('ชื่อสินค้า (product_name)');
      if (!p.description?.trim()) missing.push('คำอธิบาย (product_description)');
      if (!p.image?.trim()) missing.push('รูปภาพหลัก (main_image)');
      if (!p.weight) missing.push('น้ำหนักพัสดุ (parcel_weight)');
      if (p.retailPrice === undefined || p.retailPrice === null || isNaN(p.retailPrice)) missing.push('ราคา (price)');
      if (p.stock === undefined || p.stock === null || isNaN(p.stock)) missing.push('คลังสินค้า (quantity)');
      if (!p.packageLength) missing.push('ความยาวพัสดุ (parcel_length)');
      if (!p.packageWidth) missing.push('ความกว้างพัสดุ (parcel_width)');
      if (!p.packageHeight) missing.push('ความสูงพัสดุ (parcel_height)');
    }

    if (missing.length > 0) {
      errors.push({
        id: p.id,
        code: p.code,
        name: p.name,
        missing
      });
    }
  });

  return errors;
}

export async function exportToLazadaCustom(products) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Lazada Export');

  sheet.columns = [
    { header: 'ชื่อสินค้า', key: 'name', width: 36 },
    { header: 'รูปภาพสินค้า1', key: 'image', width: 40 },
    { header: 'ยี่ห้อ', key: 'brand', width: 18 },
    { header: 'ระดับการจัดทรง / ประเภทเส้นผม / ประโยชน์เพื่อการดูแลเส้นผม', key: 'hairAttr', width: 30 },
    { header: 'น้ำหนัก แพคเกจ (กก)', key: 'weight', width: 18 },
    { header: 'จำนวน', key: 'stock', width: 14 },
    { header: 'ราคา', key: 'price', width: 14 },
    { header: 'ความยาว แพคเกจ (ซม)', key: 'length', width: 18 },
    { header: 'ความกว้าง แพคเกจ (ซม)', key: 'width', width: 18 },
    { header: 'ความสูง แพคเกจ (ซม)', key: 'height', width: 18 },
  ];

  products.forEach(p => {
    let hairAttr = 'ทั่วไป';
    if (p.category === 'Styling') hairAttr = 'จัดแต่งทรงผม';
    else if (p.category === 'Hair Color') hairAttr = 'เปลี่ยนสีผม';
    else if (p.category === 'Treatment') hairAttr = 'บำรุงผม';

    sheet.addRow({
      name: p.name,
      image: p.image || '',
      brand: p.brand?.trim() || 'Unbranded',
      hairAttr,
      weight: parseWeightToKg(p.weight),
      stock: Number(p.stock) || 0,
      price: Number(p.retailPrice) || 0,
      length: p.packageLength ? Number(p.packageLength) : '',
      width: p.packageWidth ? Number(p.packageWidth) : '',
      height: p.packageHeight ? Number(p.packageHeight) : '',
    });
  });

  // Apply some simple styles for readability
  const headerRow = sheet.getRow(1);
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF101566' } }; // Lazada Blue
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    row.height = 20;
    row.eachCell((cell) => {
      cell.font = { name: 'Segoe UI', size: 10 };
      cell.alignment = { vertical: 'middle' };
    });
  });

  return workbook.xlsx.writeBuffer();
}

export async function exportToShopeeCustom(products) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Shopee Export');

  // We write Row 1 as raw codes
  sheet.addRow([
    'ps_product_name|1|0',
    'ps_product_description|1|0',
    'ps_price|1|1',
    'ps_stock|0|1',
    'ps_weight|0|1',
    'ps_length|0|1',
    'ps_width|0|1',
    'ps_height|0|1'
  ]);

  // Row 2 is empty
  sheet.addRow([]);

  // Row 3 is Thai headers
  sheet.addRow([
    'ชื่อสินค้า',
    'รายละเอียดสินค้า',
    'ราคา',
    'คลังสินค้า',
    'น้ำหนักพัสดุ',
    'ความยาวพัสดุ',
    'ความกว้างพัสดุ',
    'ความสูงพัสดุ'
  ]);

  // Rows 4+ is data
  products.forEach(p => {
    let desc = p.description || '';
    if (p.highlights) desc += `\n\nจุดเด่นสินค้า:\n${p.highlights}`;
    if (p.howToUse) desc += `\n\nวิธีใช้งาน:\n${p.howToUse}`;

    sheet.addRow([
      p.name,
      desc,
      Number(p.retailPrice) || 0,
      Number(p.stock) || 0,
      parseWeightToKg(p.weight),
      p.packageLength ? Number(p.packageLength) : '',
      p.packageWidth ? Number(p.packageWidth) : '',
      p.packageHeight ? Number(p.packageHeight) : '',
    ]);
  });

  // Apply some simple styles for readability
  const headerRow1 = sheet.getRow(1);
  headerRow1.height = 22;
  headerRow1.eachCell((cell) => {
    cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF5722' } }; // Shopee Orange
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const headerRow3 = sheet.getRow(3);
  headerRow3.height = 22;
  headerRow3.eachCell((cell) => {
    cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFF5722' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= 3) return;
    row.height = 20;
    row.eachCell((cell) => {
      cell.font = { name: 'Segoe UI', size: 10 };
      cell.alignment = { vertical: 'middle' };
    });
  });

  return workbook.xlsx.writeBuffer();
}

export async function exportToTiktokCustom(products) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('TikTok Export');

  sheet.columns = [
    { header: 'category', key: 'category', width: 24 },
    { header: 'product_name', key: 'name', width: 36 },
    { header: 'product_description', key: 'description', width: 40 },
    { header: 'main_image', key: 'image', width: 40 },
    { header: 'parcel_weight', key: 'weight', width: 16 },
    { header: 'price', key: 'price', width: 14 },
    { header: 'quantity', key: 'stock', width: 14 },
    { header: 'parcel_length', key: 'length', width: 14 },
    { header: 'parcel_width', key: 'width', width: 14 },
    { header: 'parcel_height', key: 'height', width: 14 },
  ];

  products.forEach(p => {
    let desc = p.description || '';
    if (p.highlights) desc += `\n\nจุดเด่นสินค้า:\n${p.highlights}`;
    if (p.howToUse) desc += `\n\nวิธีใช้งาน:\n${p.howToUse}`;

    // Weight conversion: kg to grams (multiply by 1000)
    const weightGrams = Math.round(parseWeightToKg(p.weight) * 1000);

    sheet.addRow({
      category: p.category || '',
      name: p.name,
      description: desc,
      image: p.image || '',
      weight: weightGrams,
      price: Number(p.retailPrice) || 0,
      stock: Number(p.stock) || 0,
      length: p.packageLength ? Number(p.packageLength) : '',
      width: p.packageWidth ? Number(p.packageWidth) : '',
      height: p.packageHeight ? Number(p.packageHeight) : '',
    });
  });

  // Apply some simple styles for readability
  const headerRow = sheet.getRow(1);
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } }; // TikTok Black
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    row.height = 20;
    row.eachCell((cell) => {
      cell.font = { name: 'Segoe UI', size: 10 };
      cell.alignment = { vertical: 'middle' };
    });
  });

  return workbook.xlsx.writeBuffer();
}

