import ExcelJS from 'exceljs';
import { parseWeightToKg } from './marketplaceIO.js';

const COL = {
  name:    { header: 'ชื่อสินค้า', req: 'บังคับการกรอกข้อมูล', desc: 'ระบุชื่อสินค้าภาษาไทยหรืออังกฤษ', width: 36, value: (p) => p.name || '' },
  image:   { header: 'รูปภาพสินค้า1', req: 'บังคับการกรอกข้อมูล', desc: 'URL หรือชื่อไฟล์รูปภาพสินค้าหลัก', width: 40, value: (p) => {
    const img = (Array.isArray(p.images) && p.images[0]) || p.image || '';
    if (img.includes('unsplash.com')) return '';
    return img;
  } },
  image2:  { header: 'รูปภาพสินค้า2', req: 'ไม่บังคับ', desc: 'URL หรือชื่อไฟล์รูปภาพสินค้า 2', width: 25, value: (p) => {
    const img = (Array.isArray(p.images) && p.images[1]) || p.image2 || '';
    if (img.includes('unsplash.com')) return '';
    return img;
  } },
  image3:  { header: 'รูปภาพสินค้า3', req: 'ไม่บังคับ', desc: 'URL หรือชื่อไฟล์รูปภาพสินค้า 3', width: 25, value: (p) => {
    const img = (Array.isArray(p.images) && p.images[2]) || p.image3 || '';
    if (img.includes('unsplash.com')) return '';
    return img;
  } },
  image4:  { header: 'รูปภาพสินค้า4', req: 'ไม่บังคับ', desc: 'URL หรือชื่อไฟล์รูปภาพสินค้า 4', width: 25, value: (p) => {
    const img = (Array.isArray(p.images) && p.images[3]) || p.image4 || '';
    if (img.includes('unsplash.com')) return '';
    return img;
  } },
  image5:  { header: 'รูปภาพสินค้า5', req: 'ไม่บังคับ', desc: 'URL หรือชื่อไฟล์รูปภาพสินค้า 5', width: 25, value: (p) => {
    const img = (Array.isArray(p.images) && p.images[4]) || p.image5 || '';
    if (img.includes('unsplash.com')) return '';
    return img;
  } },
  image6:  { header: 'รูปภาพสินค้า6', req: 'ไม่บังคับ', desc: 'URL หรือชื่อไฟล์รูปภาพสินค้า 6', width: 25, value: (p) => {
    const img = (Array.isArray(p.images) && p.images[5]) || p.image6 || '';
    if (img.includes('unsplash.com')) return '';
    return img;
  } },
  image7:  { header: 'รูปภาพสินค้า7', req: 'ไม่บังคับ', desc: 'URL หรือชื่อไฟล์รูปภาพสินค้า 7', width: 25, value: (p) => {
    const img = (Array.isArray(p.images) && p.images[6]) || p.image7 || '';
    if (img.includes('unsplash.com')) return '';
    return img;
  } },
  image8:  { header: 'รูปภาพสินค้า8', req: 'ไม่บังคับ', desc: 'URL หรือชื่อไฟล์รูปภาพสินค้า 8', width: 25, value: (p) => {
    const img = (Array.isArray(p.images) && p.images[7]) || p.image8 || '';
    if (img.includes('unsplash.com')) return '';
    return img;
  } },
  fda:     { header: 'หมายเลขใบอนุญาต', req: 'บังคับการกรอกข้อมูล', desc: 'เลขที่ใบรับแจ้ง อย.', width: 26, value: (p) => p.fdaNumber || '' },
  brand:   { header: 'ยี่ห้อ', req: 'บังคับการกรอกข้อมูล', desc: 'ยี่ห้อสินค้าตามระบบ Lazada', width: 18, value: (p) => (p.brand?.trim() || 'Unbranded') },
  hairType:{ header: 'ประเภทเส้นผม', req: 'บังคับการกรอกข้อมูล', desc: 'คุณลักษณะประเภทเส้นผม', width: 18, value: (p) => p.hairType || '' },
  stylingLevel: { header: 'ระดับการจัดทรง', req: 'บังคับการกรอกข้อมูล', desc: 'ระดับความแข็ง/จัดทรง', width: 18, value: (p) => p.stylingLevel || '' },
  hairBenefit:  { header: 'ประโยชน์เพื่อการดูแลเส้นผม', req: 'บังคับการกรอกข้อมูล', desc: 'สรรพคุณการดูแล', width: 24, value: (p) => p.hairBenefit || '' },
  productForm:  { header: 'รูปแบบของผลิตภัณฑ์', req: 'บังคับการกรอกข้อมูล', desc: 'เจล/ครีม/สเปรย์/เซรั่ม', width: 20, value: (p) => p.productForm || '' },
  dyeType:      { header: 'ประเภทสีย้อมผม', req: 'บังคับการกรอกข้อมูล', desc: 'ประเภทของสีย้อม', width: 18, value: (p) => p.hairColorType || '' },
  weight:  { header: 'น้ำหนัก แพคเกจ (กก)', req: 'บังคับการกรอกข้อมูล', desc: 'น้ำหนักรวมกล่อง (กก.)', width: 18, numFmt: '0.000', value: (p) => parseWeightToKg(p.weight) },
  stock:   { header: 'สต๊อกสินค้า', req: 'บังคับการกรอกข้อมูล', desc: 'จำนวนสต็อกที่มีจำหน่าย', width: 12, numFmt: '0', value: (p) => {
    const s = (p.stockLazada !== undefined && p.stockLazada !== null && p.stockLazada !== '')
      ? Number(p.stockLazada)
      : (p.stock !== undefined && p.stock !== null && p.stock !== '' ? Number(p.stock) : 0);
    return s;
  } },
  price:   { header: 'ราคา', req: 'บังคับการกรอกข้อมูล', desc: 'ราคาขายปลีก (บาท)', width: 14, numFmt: '#,##0.00', value: (p) => Number(p.retailPrice) || 0 },
  length:  { header: 'ความยาว แพคเกจ (ซม)', req: 'บังคับการกรอกข้อมูล', desc: 'ขนาดความยาวกล่อง (ซม.)', width: 18, numFmt: '0.##', value: (p) => (p.packageLength ? Number(p.packageLength) : '') },
  width_:  { header: 'ความกว้าง แพคเกจ (ซม)', req: 'บังคับการกรอกข้อมูล', desc: 'ขนาดความกว้างกล่อง (ซม.)', width: 18, numFmt: '0.##', value: (p) => (p.packageWidth ? Number(p.packageWidth) : '') },
  height:  { header: 'ความสูง แพคเกจ (ซม)', req: 'บังคับการกรอกข้อมูล', desc: 'ขนาดความสูงกล่อง (ซม.)', width: 18, numFmt: '0.##', value: (p) => (p.packageHeight ? Number(p.packageHeight) : '') },
};

// Columns per category — includes mandatory and requested non-mandatory columns (excluding image2-8)
export const LAZADA_MANDATORY_COLUMNS = {
  'ผลิตภัณฑ์จัดแต่งทรงผม': [COL.name, COL.image, COL.fda, COL.brand, COL.stylingLevel, COL.hairType, COL.hairBenefit, COL.weight, COL.stock, COL.price, COL.length, COL.width_, COL.height],
  'ทรีทเมนต์สำหรับผม':     [COL.name, COL.image, COL.fda, COL.brand, COL.hairType, COL.weight, COL.stock, COL.price, COL.length, COL.width_, COL.height],
  'เซ็ทดูแลเส้นผม':        [COL.name, COL.image, COL.fda, COL.brand, COL.hairType, COL.productForm, COL.weight, COL.stock, COL.price, COL.length, COL.width_, COL.height],
  'แชมพู':                 [COL.name, COL.image, COL.fda, COL.brand, COL.hairType, COL.weight, COL.stock, COL.price, COL.length, COL.width_, COL.height],
  'ผลิตภัณฑ์เปลี่ยนสีผม':  [COL.name, COL.image, COL.fda, COL.brand, COL.dyeType, COL.productForm, COL.weight, COL.stock, COL.price, COL.length, COL.width_, COL.height],
  'ครีมบำรุงผม':           [COL.name, COL.image, COL.fda, COL.brand, COL.hairType, COL.weight, COL.stock, COL.price, COL.length, COL.width_, COL.height],
  'อุปกรณ์และเครื่องมือ':   [COL.name, COL.image, COL.brand, COL.weight, COL.stock, COL.price, COL.length, COL.width_, COL.height],
};

const LAZADA_CATEGORIES = Object.keys(LAZADA_MANDATORY_COLUMNS);

export function resolveSheet(product, defaultSheet = 'ครีมบำรุงผม') {
  const cat = (product.category || '').trim();

  if (LAZADA_MANDATORY_COLUMNS[cat]) return cat;

  if (cat.includes('กรรไกร') || cat.includes('Scissors') || cat.includes('ปัตตาเลี่ยน') || cat.includes('อุปกรณ์ไฟฟ้า') || cat.includes('Electrical') || cat.includes('หวี') || cat.includes('แปรง') || cat.includes('Comb') || cat.includes('ผ้าคลุม') || cat.includes('Apron') || cat.includes('อุปกรณ์') || cat.includes('เครื่องมือ')) {
    return 'อุปกรณ์และเครื่องมือ';
  }

  if (cat.startsWith('Grooming') || cat.includes('จัดแต่งทรงผม')) return 'ผลิตภัณฑ์จัดแต่งทรงผม';
  if (cat.startsWith('Chemical') || cat.includes('เคมีภัณฑ์') || cat.includes('เปลี่ยนสีผม')) return 'ผลิตภัณฑ์เปลี่ยนสีผม';
  if (cat.startsWith('Hair Treatment') || cat.includes('บำรุงเส้นผม')) return 'ครีมบำรุงผม';

  if (cat === 'Styling') return 'ผลิตภัณฑ์จัดแต่งทรงผม';
  if (cat === 'Hair Color') return 'ผลิตภัณฑ์เปลี่ยนสีผม';
  if (cat === 'Treatment') return 'ครีมบำรุงผม';

  return defaultSheet;
}

export function getLazadaFieldsForCategory(category) {
  const cat = (category || '').trim();
  if (!cat) return { sheetName: '', fields: [] };

  let sheetName = '';
  if (cat.startsWith('Grooming') || cat.includes('จัดแต่งทรงผม') || cat === 'Styling' || cat === 'ผลิตภัณฑ์จัดแต่งทรงผม') {
    sheetName = 'ผลิตภัณฑ์จัดแต่งทรงผม';
  } else if (cat.startsWith('Chemical') || cat.includes('เคมีภัณฑ์') || cat.includes('เปลี่ยนสีผม') || cat === 'Hair Color' || cat === 'ผลิตภัณฑ์เปลี่ยนสีผม') {
    sheetName = 'ผลิตภัณฑ์เปลี่ยนสีผม';
  } else if (cat.includes('เซ็ทดูแลเส้นผม') || cat === 'เซ็ทดูแลเส้นผม') {
    sheetName = 'เซ็ทดูแลเส้นผม';
  } else if (cat.includes('แชมพู') || cat === 'แชมพู') {
    sheetName = 'แชมพู';
  } else if (cat.includes('ทรีทเมนต์') || cat === 'ทรีทเมนต์สำหรับผม') {
    sheetName = 'ทรีทเมนต์สำหรับผม';
  } else if (cat.startsWith('Hair Treatment') || cat.includes('บำรุงเส้นผม') || cat === 'ครีมบำรุงผม' || cat === 'Treatment') {
    sheetName = 'ครีมบำรุงผม';
  }

  if (!sheetName) return { sheetName: '', fields: [] };

  if (sheetName === 'ผลิตภัณฑ์จัดแต่งทรงผม') {
    return {
      sheetName,
      fields: [
        {
          key: 'stylingLevel',
          label: 'ระดับการจัดทรง',
          desc: 'ระดับความแข็ง/จัดทรง',
          placeholder: 'เช่น อยู่ทรงปานกลาง, แข็งพิเศษ',
          options: ['อยู่ทรงเบาบาง (Light Hold)', 'อยู่ทรงปานกลาง (Medium Hold)', 'อยู่ทรงแข็ง (Strong Hold)', 'อยู่ทรงพิเศษ (Extra Strong Hold)', 'เป็นธรรมชาติ (Natural Hold)']
        },
        {
          key: 'hairType',
          label: 'ประเภทเส้นผม',
          desc: 'คุณลักษณะประเภทเส้นผม',
          placeholder: 'เช่น ทุกสภาพผม, ผมแห้งเสีย, ผมดัด',
          options: ['ทุกสภาพผม', 'ผมธรรมดา', 'ผมแห้งเสีย', 'ผมมัน', 'ผมดัด/ลอน', 'ผมเส้นเล็ก', 'ผมหนา/ชี้ฟู', 'ผมทำสี']
        },
        {
          key: 'hairBenefit',
          label: 'ประโยชน์เพื่อการดูแลเส้นผม',
          desc: 'สรรพคุณการดูแล',
          placeholder: 'เช่น จัดแต่งทรงผม, เพิ่มวอลลุ่ม, ล็อคทรง',
          options: ['จัดแต่งทรงผม', 'เพิ่มวอลลุ่ม', 'ล็อคทรงยาวนาน', 'ป้องกันความชื้น', 'ควบคุมความมัน', 'บำรุงเส้นผม']
        },
      ]
    };
  }

  if (sheetName === 'ผลิตภัณฑ์เปลี่ยนสีผม') {
    return {
      sheetName,
      fields: [
        {
          key: 'hairColorType',
          label: 'ประเภทสีย้อมผม',
          desc: 'ประเภทของสีย้อม',
          placeholder: 'เช่น สีย้อมผมถาวร, กึ่งถาวร, ผงฟอก',
          options: ['สีย้อมผมถาวร (Permanent)', 'สีย้อมผมกึ่งถาวร (Semi-Permanent)', 'สีย้อมผมชั่วคราว (Temporary)', 'ผงฟอกสีผม (Bleach Powder)', 'ไฮโดรเจน / ดีเวลลอปเปอร์']
        },
        {
          key: 'productForm',
          label: 'รูปแบบของผลิตภัณฑ์',
          desc: 'เจล/ครีม/สเปรย์/เซรั่ม/ผง',
          placeholder: 'เช่น ครีม, โฟม, ผง, เจล',
          options: ['ครีม (Cream)', 'โฟม (Foam)', 'ผง (Powder)', 'ของเหลว (Liquid)', 'เจล (Gel)']
        },
      ]
    };
  }

  if (sheetName === 'เซ็ทดูแลเส้นผม') {
    return {
      sheetName,
      fields: [
        {
          key: 'hairType',
          label: 'ประเภทเส้นผม',
          desc: 'คุณลักษณะประเภทเส้นผม',
          placeholder: 'เช่น ทุกสภาพผม, ผมแห้งเสีย',
          options: ['ทุกสภาพผม', 'ผมธรรมดา', 'ผมแห้งเสีย', 'ผมทำสี', 'ผมดัด/ลอน', 'ผมร่วง/บาง']
        },
        {
          key: 'productForm',
          label: 'รูปแบบของผลิตภัณฑ์',
          desc: 'เจล/ครีม/สเปรย์/เซรั่ม/เซ็ต',
          placeholder: 'เช่น เซ็ต, ครีม, เซรั่ม',
          options: ['เซ็ต (Set / Kit)', 'ครีม (Cream)', 'เซรั่ม (Serum)', 'โลชั่น (Lotion)']
        },
      ]
    };
  }

  if (sheetName === 'ครีมบำรุงผม' || sheetName === 'ทรีทเมนต์สำหรับผม' || sheetName === 'แชมพู') {
    return {
      sheetName,
      fields: [
        {
          key: 'hairType',
          label: 'ประเภทเส้นผม',
          desc: 'คุณลักษณะประเภทเส้นผม',
          placeholder: 'เช่น ทุกสภาพผม, ผมแห้งเสีย, ผมทำสี',
          options: ['ทุกสภาพผม', 'ผมธรรมดา', 'ผมแห้งเสีย', 'ผมทำสี', 'ผมดัด/ลอน', 'ผมมัน', 'ผมร่วง/บาง']
        },
      ]
    };
  }

  return { sheetName: '', fields: [] };
}


export async function exportToLazadaMandatory(products = [], options = {}) {
  const {
    headersOnly = false,
    keepEmptySheets = false,
    defaultSheet = 'ครีมบำรุงผม',
  } = options;

  const workbook = new ExcelJS.Workbook();

  const buckets = Object.fromEntries(LAZADA_CATEGORIES.map((c) => [c, []]));
  if (!headersOnly) {
    products.forEach((p) => {
      const sheetName = resolveSheet(p, defaultSheet);
      (buckets[sheetName] || buckets[defaultSheet]).push(p);
    });
  }

  LAZADA_CATEGORIES.forEach((category) => {
    const rows = buckets[category] || [];
    if (!headersOnly && !keepEmptySheets && rows.length === 0) {
      return;
    }

    const sheet = workbook.addWorksheet(category);
    const cols = LAZADA_MANDATORY_COLUMNS[category] || [];

    // Construct headers list (all columns + SellerSKU)
    const colDefs = [...cols];
    if (!colDefs.some(c => c.header === 'SellerSKU')) {
      colDefs.push({ header: 'SellerSKU', req: 'บังคับการกรอกข้อมูล', desc: 'รหัสสินค้า SKU ของผู้ขาย', width: 20, value: (p) => p.code || '' });
    }

    // Row 1: Official Lazada Field Headers
    const row1 = sheet.addRow(colDefs.map(c => c.header));
    row1.height = 26;
    row1.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF004B87' } };
      cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF003366' } },
        bottom: { style: 'medium', color: { argb: 'FF003366' } },
        left: { style: 'thin', color: { argb: 'FF003366' } },
        right: { style: 'thin', color: { argb: 'FF003366' } }
      };
    });

    // Row 2: Mandatory Flags (บังคับการกรอกข้อมูล / ไม่บังคับ)
    const row2 = sheet.addRow(colDefs.map(c => c.req));
    row2.height = 20;
    row2.eachCell((cell, colIndex) => {
      const reqVal = colDefs[colIndex - 1]?.req;
      const isMandatory = reqVal === 'บังคับการกรอกข้อมูล';
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isMandatory ? 'FFFFF0F0' : 'FFE6F0FA' } };
      cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: isMandatory ? 'FFCC0000' : 'FF004B87' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
      };
    });

    // Row 3: Description / Field Guidance
    const row3 = sheet.addRow(colDefs.map(c => c.desc || ''));
    row3.height = 20;
    row3.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9F9F9' } };
      cell.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF666666' } };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    });

    // Row 4: Example / Formatting row
    const row4 = sheet.addRow(colDefs.map(c => `ตัวอย่าง: ${c.header}`));
    row4.height = 18;
    row4.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      cell.font = { name: 'Segoe UI', size: 8, color: { argb: 'FF999999' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Row 5+: Product Data Rows
    if (!headersOnly) {
      rows.forEach((p) => {
        const rowValues = colDefs.map(c => {
          if (c.header === 'สต๊อกสินค้า' || c.header === 'จำนวน') {
            if (options.stockMap) {
              const mVal = options.stockMap[p.id] !== undefined ? options.stockMap[p.id] : (p.code ? options.stockMap[p.code] : undefined);
              if (mVal !== undefined) return Number(mVal) || 0;
            }
            if (options.stock !== undefined) {
              return Number(options.stock) || 0;
            }
            const s = (p.stockLazada !== undefined && p.stockLazada !== null && p.stockLazada !== '')
              ? Number(p.stockLazada)
              : ((p.stock !== undefined && p.stock !== null && p.stock !== '') ? Number(p.stock) : 0);
            return s;
          }
          return c.value(p);
        });

        const dataRow = sheet.addRow(rowValues);
        dataRow.height = 20;
        dataRow.eachCell((cell, colNumber) => {
          const colDef = colDefs[colNumber - 1];
          if (colDef && colDef.numFmt) {
            cell.numFmt = colDef.numFmt;
          }
          cell.font = { name: 'Segoe UI', size: 10 };
          cell.alignment = { vertical: 'middle' };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE5E5E5' } },
            bottom: { style: 'thin', color: { argb: 'FFE5E5E5' } },
            left: { style: 'thin', color: { argb: 'FFE5E5E5' } },
            right: { style: 'thin', color: { argb: 'FFE5E5E5' } }
          };
        });
      });
    }

    // Set Column Widths
    colDefs.forEach((c, idx) => {
      sheet.getColumn(idx + 1).width = c.width || 20;
    });

    sheet.views = [{ state: 'frozen', ySplit: 4 }];
  });

  if (workbook.worksheets.length === 0) {
    const defaultWs = workbook.addWorksheet(defaultSheet);
    const cols = LAZADA_MANDATORY_COLUMNS[defaultSheet] || [];
    defaultWs.addRow(cols.map(c => c.header));
  }

  return workbook.xlsx.writeBuffer();
}
