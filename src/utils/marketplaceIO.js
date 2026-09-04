
import ExcelJS from 'exceljs';
import { exportToLazadaMandatory } from './lazadaTemplate.js';

const LAZADA_SHEETS = [
  'ผลิตภัณฑ์จัดแต่งทรงผม',
  'ผลิตภัณฑ์เปลี่ยนสีผม',
  'ครีมบำรุงผม',
  'ทรีทเมนต์สำหรับผม',
  'แชมพู',
  'เซ็ทดูแลเส้นผม',
];

// ---------- helpers (เหมือนเดิม) ----------
export function parseWeightToKg(weightStr) {
  if (weightStr === undefined || weightStr === null || weightStr === '') return 0;
  if (typeof weightStr === 'number') return weightStr;
  const cleaned = String(weightStr).toLowerCase().replace(/\s+/g, '');
  const match = cleaned.match(/^([0-9.]+)(g|kg|กิโลกรัม|กรัม)?$/);
  if (!match) return 0;
  const value = parseFloat(match[1]);
  const unit = match[2];
  if (isNaN(value)) return 0;
  if (unit === 'g' || unit === 'กรัม') return value / 1000;
  if (!unit && value >= 10) return value / 1000;
  return value;
}
export function formatWeightStr(value, sourceUnit = 'kg') {
  if (value === undefined || value === null || isNaN(value)) return '';
  let kg = value;
  if (sourceUnit === 'g') kg = value / 1000;
  if (kg < 1) return Math.round(kg * 1000) + 'g';
  return kg + 'kg';
}
export function getPimCategoryFromLazada(sheetName) {
  if (sheetName === 'ผลิตภัณฑ์จัดแต่งทรงผม') return 'Grooming - ผลิตภัณพ์จัดแต่งทรงผมและหนวด';
  if (sheetName === 'ผลิตภัณฑ์เปลี่ยนสีผม') return 'Chemical - เคมีภัณฑ์';
  if (sheetName === 'ครีมบำรุงผม') return 'Hair Treatment - ผลิตภัณฑ์บำรุงเส้นผม';
  return sheetName;
}

export function guessBrandFromName(name) {
  if (!name) return '';
  const firstWord = name.trim().split(/\s+/)[0];
  if (!firstWord || firstWord.length < 2 || /^\d+$/.test(firstWord)) return '';
  return firstWord;
}

export function guessCategoryFromName(name) {
  if (!name) return 'ไม่ระบุ';
  const n = name.toLowerCase();
  
  // Grooming / Styling
  if (n.includes('จัดแต่งทรงผม') || n.includes('styling') || n.includes('เจลจับลอน') || n.includes('แว็กซ์') || n.includes('สเปรย์ฝุ่น') || n.includes('wax') || n.includes('pomade') || n.includes('โพเมด') || n.includes('สเปรย์จัดแต่ง') || n.includes('จัดแต่งทรง') || n.includes('กรูมมิ่ง') || n.includes('grooming') || n.includes('จับลอน')) {
    return 'Grooming - ผลิตภัณพ์จัดแต่งทรงผมและหนวด';
  }
  
  // Chemical / Hair Color
  if (n.includes('เปลี่ยนสีผม') || n.includes('ย้อม') || n.includes('hair color') || n.includes('color cream') || n.includes('ครีมเปลี่ยนสีผม') || n.includes('ผงฟอก') || n.includes('ไฮโดรเจน') || n.includes('ย้อมสีผม') || n.includes('ฟอกสีผม') || n.includes('ฟอกผม') || n.includes('เคมีภัณฑ์') || n.includes('chemical') || n.includes('สีกัด') || n.includes('กัดสี')) {
    return 'Chemical - เคมีภัณฑ์';
  }
  
  // Hair Treatment
  if (n.includes('บำรุงผม') || n.includes('ทรีทเมนต์') || n.includes('แชมพู') || n.includes('treatment') || n.includes('shampoo') || n.includes('ครีมนวด') || n.includes('เซรั่ม') || n.includes('hair mask') || n.includes('ทรีทเม้นท์') || n.includes('บำรุงเส้นผม') || n.includes('ดูแลเส้นผม') || n.includes('ออยล์') || n.includes('hair oil') || n.includes('ครีมบำรุงผม')) {
    return 'Hair Treatment - ผลิตภัณฑ์บำรุงเส้นผม';
  }
  
  // Scissors
  if (n.includes('scissors') || n.includes('กรรไกร') || n.includes('ซอย') || n.includes('กรรไกรตัดซอย')) {
    return 'Hair Scissors - กรรไกรตัดซอย';
  }

  // Comb and Brush
  if (n.includes('comb') || n.includes('brush') || n.includes('หวี') || n.includes('แปรง')) {
    return 'Comb and Brush - หวีและแปรง';
  }

  // Apron
  if (n.includes('apron') || n.includes('ผ้าคลุม') || n.includes('ผ้ากันเปื้อน')) {
    return 'Apron - ผ้าคลุมและผ้ากันเปื้อน';
  }

  // Electrical Equipment
  if (n.includes('clipper') || n.includes('ไดร์') || n.includes('เป่าผม') || n.includes('หนีบผม') || n.includes('เครื่องหนีบ') || n.includes('แบตเตอเลี่ยน') || n.includes('ปัตตาเลี่ยน') || n.includes('dryer') || n.includes('อุปกรณ์ไฟฟ้า')) {
    return 'Electrical Equipment - อุปกรณ์ไฟฟ้า';
  }

  return 'ไม่ระบุ';
}

// ---------- หัวใจของการแก้: ตัวอ่านหัวตารางแบบยืดหยุ่น ----------
/**
 * หา layout ของชีต: หาแถวหัวตารางจาก "ชื่อสินค้า/product_name"
 * แล้วสร้าง map { ชื่อหัว(ตัวเล็ก) -> เลขคอลัมน์ } จากทุกแถวหัวที่อยู่ก่อนหน้าข้อมูล
 * รองรับเทมเพลตที่มีแถวหัว 1, 2 หรือ 3 แถว
 */
// เซ็ตคำหัวตารางที่รู้จักทั้งหมด (ใช้ตรวจว่าแถวไหนคือ "แถวหัว")
const ALL_HEADER_WORDS = new Set();
function isHeaderValue(v) {
  return ALL_HEADER_WORDS.has(String(v).trim().toLowerCase());
}
function locateLayout(sheet, nameAliases, maxScan = 8) {
  const colCount = sheet.columnCount || 60;
  const lname = nameAliases.map((a) => a.toLowerCase());
  // แถวจะถือเป็น "แถวหัว" ถ้ามีชื่อหัว name หรือมีหัวที่รู้จัก >= 2 คำ
  // ใช้ "แถวหัวสุดท้าย" เป็นเส้นแบ่ง -> รองรับเทมเพลตหัว 1/2/3 แถว
  let lastHeaderRow = 0;
  for (let r = 1; r <= maxScan; r++) {
    const row = sheet.getRow(r);
    let hasName = false, knownHits = 0;
    for (let c = 1; c <= colCount; c++) {
      const v = row.getCell(c).value;
      if (v === null || v === undefined || v === '') continue;
      const k = String(v).trim().toLowerCase();
      if (lname.includes(k)) hasName = true;
      if (ALL_HEADER_WORDS.has(k)) knownHits++;
    }
    if (hasName || knownHits >= 2) lastHeaderRow = r;
  }
  if (!lastHeaderRow) lastHeaderRow = 1;
  const map = {};
  for (let r = 1; r <= lastHeaderRow; r++) {
    const row = sheet.getRow(r);
    for (let c = 1; c <= colCount; c++) {
      const v = row.getCell(c).value;
      if (v === null || v === undefined || v === '') continue;
      const k = String(v).trim().toLowerCase();
      if (!(k in map)) map[k] = c;
    }
  }
  return { map, dataStart: lastHeaderRow + 1 };
}
function colOf(map, aliases) {
  for (const a of aliases) {
    const k = a.toLowerCase();
    if (k in map) return map[k];
  }
  return 0;
}

// alias ของแต่ละฟิลด์ (รวมทั้งหัวภาษาไทย, key อังกฤษ, และ code-row ของ Shopee)
const ALIAS = {
  code:  ['รหัสสินค้า (sku)', 'รหัสสินค้า', 'sku', 'seller_sku', 'sellersku', 'ps_sku|0|0', 'ps_sku'],
  name:  ['ชื่อสินค้า', 'product_name', 'ps_product_name|1|0'],
  desc:  ['รายละเอียดสินค้า', 'คำอธิบายสินค้า', 'product_description', 'คำอธิบายหลัก', 'ps_product_description|1|0'],
  price: ['ราคา', 'ราคาขายปลีก (สกุลเงินท้องถิ่น)', 'price', 'ps_price|1|1'],
  stock: ['คลังสินค้า', 'จำนวน', 'ปริมาณ', 'quantity', 'ps_stock|0|1'],
  weight:['น้ำหนัก', 'น้ำหนักพัสดุ', 'น้ำหนักพัสดุ(g)', 'น้ำหนัก แพคเกจ (กก)', 'parcel_weight', 'ps_weight|0|1'],
  image: ['รูปภาพสินค้า1', 'ภาพหลัก', 'main_image'],
  brand: ['ยี่ห้อ', 'แบรนด์', 'brand'],
  category: ['หมวดหมู่', 'category'],
  barcode:  ['บาร์โค้ด', 'บาร์โคด', 'barcode'],
  capFee:   ['ค่าฝา', 'หักค่าฝา', 'cap_fee', 'capfee'],
};

// เติมคำหัวที่รู้จักทั้งหมดลงเซ็ต (ใช้ใน locateLayout / กันอ่านแถวหัวเป็นข้อมูล)
Object.values(ALIAS).forEach((arr) => arr.forEach((a) => ALL_HEADER_WORDS.add(a.toLowerCase())));

function readRow(sheet, rowIdx, map) {
  const get = (aliases) => {
    const c = colOf(map, aliases);
    if (!c) return '';
    const v = sheet.getCell(rowIdx, c).value;
    return v !== null && v !== undefined ? String(v).trim() : '';
  };
  return {
    code: get(ALIAS.code),
    name: get(ALIAS.name),
    desc: get(ALIAS.desc),
    price: get(ALIAS.price),
    stock: get(ALIAS.stock),
    weight: get(ALIAS.weight),
    image: get(ALIAS.image),
    brand: get(ALIAS.brand),
    category: get(ALIAS.category),
    barcode: get(ALIAS.barcode),
    capFee: get(ALIAS.capFee),
  };
}

// ==========================================
// IMPORTS (header-driven, อ่าน code ได้จริง)
// ==========================================
function buildProduct(r, platform, weightUnit, category) {
  const retailPrice = r.price ? Number(r.price) || 0 : 0;
  const stock = r.stock ? Number(r.stock) || 0 : 0;
  const weightStr = r.weight ? formatWeightStr(Number(r.weight), weightUnit) : '';

  const rawCat = category || r.category || '';
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
    resolvedCategory = guessCategoryFromName(r.name);
  }

  return {
    code: r.code || r.barcode || '',  // ถ้าไฟล์มี SKU -> ใช้ของจริง (ไม่สร้างรหัสปลอม)
    barcode: r.barcode || '',
    name: r.name,
    brand: r.brand && r.brand !== 'No Brand' && r.brand !== 'ไม่มีแบรนด์'
      ? r.brand : (guessBrandFromName(r.name) || 'Phanvadee'),
    category: resolvedCategory,
    wholesalePrice: Math.round(retailPrice * 0.7),
    retailPrice,
    capFee: r.capFee ? Number(r.capFee) || 0 : 0,
    description: r.desc,
    highlights: '',
    howToUse: '',
    image: r.image || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&auto=format&fit=crop&q=60',
    size: 'N/A',
    weight: weightStr,
    stock,
    status: 'Active',
    _platform: platform,
    _codeMissing: !(r.code || r.barcode),  // ธงไว้ให้ UI เตือนถ้าไฟล์ไม่มี SKU จริง ๆ
  };
}

export async function importFromShopee(file) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const sheet = wb.getWorksheet('แบบฟอร์มการลงสินค้า') || wb.worksheets[0];
  const { map, dataStart } = locateLayout(sheet, ALIAS.name);
  const out = [];
  for (let i = dataStart; i <= sheet.rowCount; i++) {
    const r = readRow(sheet, i, map);
    if (!r.name || isHeaderValue(r.name)) continue;
    out.push(buildProduct(r, 'shopee', 'kg'));
  }
  return out;
}

export async function importFromLazada(file) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const out = [];
  const sheets = wb.worksheets.filter(
    (s) => LAZADA_SHEETS.includes(s.name) || /Lazada/i.test(s.name)
  );
  const targets = sheets.length ? sheets : wb.worksheets;
  for (const sheet of targets) {
    const { map, dataStart } = locateLayout(sheet, ALIAS.name);
    if (!colOf(map, ALIAS.name)) continue;
    const category = getPimCategoryFromLazada(sheet.name);
    for (let i = dataStart; i <= sheet.rowCount; i++) {
      const r = readRow(sheet, i, map);
      if (!r.name || isHeaderValue(r.name)) continue;
      out.push(buildProduct(r, 'lazada', 'kg', category));
    }
  }
  return out;
}

export async function importFromTiktok(file) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const sheet = wb.getWorksheet('Template') || wb.getWorksheet('TikTok Export') || wb.worksheets[0];
  const { map, dataStart } = locateLayout(sheet, ALIAS.name);
  const out = [];
  for (let i = dataStart; i <= sheet.rowCount; i++) {
    const r = readRow(sheet, i, map);
    if (!r.name || isHeaderValue(r.name)) continue;
    // TikTok น้ำหนักเป็นกรัม
    let category = 'ไม่ระบุ';
    const cat = r.category;
    if (cat) {
      if (cat.includes('จัดแต่งทรงผม') || cat === 'Styling') category = 'Styling';
      else if (cat.includes('เปลี่ยนสีผม') || cat.includes('ย้อม') || cat === 'Hair Color') category = 'Hair Color';
      else if (cat.includes('บำรุงผม') || cat.includes('ทรีทเมนต์') || cat.includes('แชมพู') || cat === 'Treatment') category = 'Treatment';
      else category = cat;
    }
    out.push(buildProduct(r, 'tiktok', 'g', category));
  }
  return out;
}

// ==========================================
// EXPORTS (เพิ่มคอลัมน์ "รหัสสินค้า (SKU)")
// ==========================================
function buildDesc(p) {
  let desc = p.description || '';
  if (p.highlights) desc += `\n\nจุดเด่นสินค้า:\n${p.highlights}`;
  if (p.howToUse) desc += `\n\nวิธีใช้งาน:\n${p.howToUse}`;
  return desc;
}

export async function exportToShopeeCustom(products) {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('แบบฟอร์มการลงสินค้า');
  // แถว 1: รหัสฟิลด์ (เพิ่ม ps_sku นำหน้า)
  sheet.addRow(['ps_sku|0|0', 'ps_product_name|1|0', 'ps_product_description|1|0',
    'ps_price|1|1', 'ps_stock|0|1', 'ps_weight|0|1', 'ps_length|0|1', 'ps_width|0|1', 'ps_height|0|1']);
  sheet.addRow([]); // แถว 2 ว่าง
  // แถว 3: หัวภาษาไทย (เพิ่ม "รหัสสินค้า (SKU)" นำหน้า)
  sheet.addRow(['รหัสสินค้า (SKU)', 'ชื่อสินค้า', 'รายละเอียดสินค้า', 'ราคา', 'คลังสินค้า',
    'น้ำหนักพัสดุ', 'ความยาวพัสดุ', 'ความกว้างพัสดุ', 'ความสูงพัสดุ']);
  products.forEach((p) => {
    sheet.addRow([
      p.code || '',
      p.name,
      buildDesc(p),
      Number(p.retailPrice) || 0,
      Number(p.stock) || 0,
      parseWeightToKg(p.weight),
      p.packageLength ? Number(p.packageLength) : '',
      p.packageWidth ? Number(p.packageWidth) : '',
      p.packageHeight ? Number(p.packageHeight) : '',
    ]);
  });
  return wb.xlsx.writeBuffer();
}

// exportToLazadaCustom → ใช้ lazadaTemplate.js ซึ่งมี multi-sheet + style + คอลัมน์ตามหมวดหมู่ครบแล้ว
export async function exportToLazadaCustom(products, options = {}) {
  return exportToLazadaMandatory(products, options);
}

export async function exportToTiktokCustom(products) {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('Template');
  sheet.columns = [
    { header: 'seller_sku', key: 'code', width: 18 },
    { header: 'category', key: 'category', width: 24 },
    { header: 'product_name', key: 'name', width: 36 },
    { header: 'product_description', key: 'desc', width: 40 },
    { header: 'main_image', key: 'image', width: 40 },
    { header: 'parcel_weight', key: 'weight', width: 16 },
    { header: 'price', key: 'price', width: 14 },
    { header: 'quantity', key: 'stock', width: 14 },
    { header: 'parcel_length', key: 'length', width: 14 },
    { header: 'parcel_width', key: 'width', width: 14 },
    { header: 'parcel_height', key: 'height', width: 14 },
  ];
  // แถวหัวภาษาไทย (แถว 2) ให้ตรงเทมเพลตจริงของ TikTok
  sheet.addRow({ code: 'รหัสสินค้า (SKU)', category: 'หมวดหมู่', name: 'ชื่อสินค้า',
    desc: 'คำอธิบายสินค้า', image: 'ภาพหลัก', weight: 'น้ำหนักพัสดุ(g)', price: 'ราคาขายปลีก (สกุลเงินท้องถิ่น)',
    stock: 'ปริมาณ', length: 'ความยาวของพัสดุ(cm)', width: 'ความกว้างของพัสดุ(cm)', height: 'ความสูงของพัสดุ(cm)' });
  products.forEach((p) => {
    sheet.addRow({
      code: p.code || '',
      category: p.category || '',
      name: p.name,
      desc: buildDesc(p),
      image: p.image || '',
      weight: Math.round(parseWeightToKg(p.weight) * 1000), // กรัม
      price: Number(p.retailPrice) || 0,
      stock: Number(p.stock) || 0,
      length: p.packageLength ? Number(p.packageLength) : '',
      width: p.packageWidth ? Number(p.packageWidth) : '',
      height: p.packageHeight ? Number(p.packageHeight) : '',
    });
  });
  return wb.xlsx.writeBuffer();
}

// ---------- auto-detect platform helper (สำหรับความเข้ากันได้กับ ProductManage) ----------
export async function autoDetectPlatformAndImport(file) {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  // Shopee detection
  const hasShopeeSheet = workbook.getWorksheet('แบบฟอร์มการลงสินค้า');
  let isShopee = !!hasShopeeSheet;
  if (!isShopee && workbook.worksheets.length > 0) {
    const ws = workbook.worksheets[0];
    const firstRowValues = [];
    ws.getRow(1).eachCell(c => firstRowValues.push(String(c.value || '').trim()));
    isShopee = firstRowValues.some(v => v.startsWith('ps_') || v.includes('ps_product_name') || v.includes('ps_price') || v.includes('ps_stock'));
  }

  if (isShopee) {
    const products = await importFromShopee(file);
    return { platform: 'shopee', products };
  }

  // TikTok detection
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
    const products = await importFromTiktok(file);
    return { platform: 'tiktok', products };
  }

  // Lazada detection
  const hasLazadaSheet = workbook.worksheets.some(ws => LAZADA_SHEETS.includes(ws.name));
  let isLazada = hasLazadaSheet;
  if (!isLazada && workbook.worksheets.length > 0) {
    const ws = workbook.worksheets[0];
    const firstRowValues = [];
    ws.getRow(1).eachCell(c => firstRowValues.push(String(c.value || '').trim()));
    isLazada = firstRowValues.includes('ชื่อสินค้า') || firstRowValues.includes('ยี่ห้อ') || firstRowValues.includes('รูปภาพสินค้า1') || firstRowValues.includes('SellerSKU');
  }

  if (isLazada) {
    const products = await importFromLazada(file);
    return { platform: 'lazada', products };
  }

  throw new Error('ไม่สามารถตรวจสอบและระบุแพลตฟอร์มจากโครงสร้างไฟล์นี้ได้ กรุณาอัปโหลดไฟล์เทมเพลตที่ถูกต้อง');
}
