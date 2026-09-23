/**
 * Shopee Mandatory-Columns Export (Rebuilt from Scratch)
 * Phanvadee Co., Ltd. PIM System
 *
 * Builds a Shopee "แบบฟอร์มการลงสินค้า" workbook programmatically from scratch.
 * Contains only the 11 mandatory/conditional columns required to import products successfully.
 * Does not read/fetch template files, making it completely offline and self-contained.
 */
import ExcelJS from 'exceljs';
import { parseWeightToKg } from './marketplaceIO.js';

// Configuration of columns required for Shopee bulk upload.
// Treated as specification/rubric from the original template.
const SHOPEE_MANDATORY_COLS_SPEC = [
  {
    code: 'ps_category|0|0',
    row2: '',
    label: 'หมวดหมู่สินค้า',
    req: '',
    desc: '',
    validation: '',
    width: 24,
    value: (p) => p.category || ''
  },
  {
    code: 'ps_product_name|1|0',
    row2: 'cf4c66baf0357981ee81ca083814edbc',
    label: 'ชื่อสินค้า',
    req: '',
    desc: '',
    validation: '',
    width: 36,
    value: (p) => p.name || ''
  },
  {
    code: 'ps_product_description|1|0',
    row2: '0',
    label: 'รายละเอียดสินค้า',
    req: '',
    desc: '',
    validation: '',
    width: 48,
    value: (p) => buildDescription(p)
  },
  {
    code: 'ps_price|1|1',
    row2: '',
    label: 'ราคา',
    req: '',
    desc: '',
    validation: '',
    width: 14,
    numFmt: '#,##0.00',
    value: (p) => Number(p.retailPrice) || 0
  },
  {
    code: 'ps_stock|0|1',
    row2: '',
    label: 'สต๊อกสินค้า',
    req: '',
    desc: '',
    validation: '',
    width: 14,
    numFmt: '0',
    value: (p) => {
      const s = (p.stockShopee !== undefined && p.stockShopee !== null && p.stockShopee !== '')
        ? Number(p.stockShopee)
        : (p.stock !== undefined && p.stock !== null && p.stock !== '' ? Number(p.stock) : 0);
      return s;
    }
  },
  {
    code: 'ps_item_cover_image|0|3',
    row2: '',
    label: 'ภาพปก',
    req: '',
    desc: '',
    validation: '',
    width: 40,
    value: (p) => {
      const raw = (Array.isArray(p.images) && p.images[0]) || p.image || p.imageUrl || p.image_url || p.coverImage || '';
      return typeof raw === 'object' && raw !== null ? (raw.url || raw.preview || raw.src || '') : (raw || '');
    }
  },
  {
    code: 'ps_item_image_1|0|3',
    row2: '',
    label: 'รูปภาพ 1',
    req: '',
    desc: '',
    validation: '',
    width: 40,
    value: (p) => {
      const raw = (Array.isArray(p.images) && p.images[0]) || p.image || p.imageUrl || p.image_url || p.coverImage || '';
      return typeof raw === 'object' && raw !== null ? (raw.url || raw.preview || raw.src || '') : (raw || '');
    }
  },
  {
    code: 'ps_weight|0|1',
    row2: '',
    label: 'น้ำหนัก',
    req: '',
    desc: '',
    validation: '',
    width: 14,
    numFmt: '0.000',
    value: (p) => {
      const kg = parseWeightToKg(p.weight);
      return kg > 0 ? kg : '';
    }
  },
  {
    code: 'ps_length|0|1',
    row2: '',
    label: 'ความยาว',
    req: '',
    desc: '',
    validation: '',
    width: 14,
    numFmt: '0.##',
    value: (p) => (p.packageLength ? Number(p.packageLength) : '')
  },
  {
    code: 'ps_width|0|1',
    row2: '',
    label: 'ความกว้าง',
    req: '',
    desc: '',
    validation: '',
    width: 14,
    numFmt: '0.##',
    value: (p) => (p.packageWidth ? Number(p.packageWidth) : '')
  },
  {
    code: 'ps_height|0|1',
    row2: '',
    label: 'ความสูง',
    req: '',
    desc: '',
    validation: '',
    width: 14,
    numFmt: '0.##',
    value: (p) => (p.packageHeight ? Number(p.packageHeight) : '')
  },
  {
    code: 'channel_id.7000|0|0',
    row2: '',
    label: 'Standard Delivery - ส่งธรรมดาในประเทศ',
    req: '',
    desc: '',
    validation: '',
    width: 24,
    value: () => 'เปิด'
  },
  {
    code: 'channel_id.7002|0|0',
    row2: '',
    label: 'Express Delivery - ส่งด่วน',
    req: '',
    desc: '',
    validation: '',
    width: 24,
    value: () => 'เปิด'
  },
  {
    code: 'channel_id.70036|0|0',
    row2: '',
    label: 'SPX Express - ผู้ซื้อรับที่จุดบริการ SPX',
    req: '',
    desc: '',
    validation: '',
    width: 24,
    value: () => 'เปิด'
  }
];

// Re-export for compatibility with other files if needed
export const SHOPEE_MANDATORY_COLUMNS = SHOPEE_MANDATORY_COLS_SPEC.map(col => ({
  code: col.code,
  label: col.label,
  width: col.width,
  value: col.value
}));

function buildDescription(p) {
  let desc = p.description || '';
  if (p.highlights) desc += `\n\nจุดเด่นสินค้า:\n${p.highlights}`;
  if (p.howToUse) desc += `\n\nวิธีใช้งาน:\n${p.howToUse}`;
  return desc;
}

export async function exportToShopeeMandatory(products = [], options = {}) {
  const { headersOnly = false } = options;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('แบบฟอร์มการลงสินค้า');

  // 1. Setup column widths
  SHOPEE_MANDATORY_COLS_SPEC.forEach((col, idx) => {
    sheet.getColumn(idx + 1).width = col.width || 15;
  });

  // 2. Define headers row objects
  const row1 = sheet.getRow(1);
  const row2 = sheet.getRow(2);
  const row3 = sheet.getRow(3);
  const row4 = sheet.getRow(4);
  const row5 = sheet.getRow(5);
  const row6 = sheet.getRow(6);

  // Set row heights
  row1.height = 20;
  row2.height = 20;
  row3.height = 26;
  row4.height = 20;
  row5.height = 45;
  row6.height = 24;

  // 3. Populate Header cell values and style them
  SHOPEE_MANDATORY_COLS_SPEC.forEach((col, idx) => {
    const colNum = idx + 1;

    // Row 1: System code
    const cell1 = row1.getCell(colNum);
    cell1.value = col.code;
    cell1.font = { name: 'Arial', size: 10, color: { argb: 'FF000000' } };
    cell1.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

    // Row 2: Signatures/Metadata
    const cell2 = row2.getCell(colNum);
    cell2.value = col.row2 || null;
    cell2.font = { name: 'Arial', size: 10, color: { argb: 'FF000000' } };
    cell2.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

    // Row 3: Thai Display Label (Orange Header)
    const cell3 = row3.getCell(colNum);
    cell3.value = col.label;
    cell3.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFED7D31' } }; // Orange
    cell3.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell3.border = { bottom: { style: 'medium', color: { argb: 'FF000000' } } };

    // Row 4: Requirement State (Red text for required/conditional)
    const cell4 = row4.getCell(colNum);
    cell4.value = '';
    const isRequired = col.req.includes('จำเป็น') || col.req.includes('เงื่อนไขบังคับ');
    cell4.font = {
      name: 'Arial',
      size: 10,
      bold: true,
      color: { argb: isRequired ? 'FFFF0000' : 'FF000000' }
    };
    cell4.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } }; // Gray
    cell4.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell4.border = { bottom: { style: 'medium', color: { argb: 'FF000000' } } };

    // Row 5: Detailed Description (Gray background)
    const cell5 = row5.getCell(colNum);
    cell5.value = '';
    cell5.font = { name: 'Arial', size: 10, color: { argb: 'FF000000' } };
    cell5.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } }; // Gray
    cell5.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell5.border = { bottom: { style: 'medium', color: { argb: 'FF000000' } } };

    // Row 6: Validation Rules (Gray background)
    const cell6 = row6.getCell(colNum);
    cell6.value = '';
    cell6.font = { name: 'Arial', size: 10, color: { argb: 'FF000000' } };
    cell6.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } }; // Gray
    cell6.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell6.border = { bottom: { style: 'medium', color: { argb: 'FF000000' } } };
  });

  // 4. Populate product data rows starting at Row 7
  if (!headersOnly) {
    products.forEach((p, idx) => {
      const rowNum = 7 + idx;
      const row = sheet.getRow(rowNum);
      row.height = 20;

      SHOPEE_MANDATORY_COLS_SPEC.forEach((col, colIdx) => {
        const cell = row.getCell(colIdx + 1);
        let val = col.value(p);
        if (col.code === 'ps_stock|0|1') {
          if (options.stockMap) {
            const mVal = options.stockMap[p.id] !== undefined ? options.stockMap[p.id] : (p.code ? options.stockMap[p.code] : undefined);
            if (mVal !== undefined) val = Number(mVal) || 0;
            else if (p.stockShopee !== undefined && p.stockShopee !== null && p.stockShopee !== '') val = Number(p.stockShopee) || 0;
            else if (p.stock !== undefined && p.stock !== null && p.stock !== '') val = Number(p.stock) || 0;
          } else if (options.stock !== undefined) {
            val = Number(options.stock) || 0;
          } else if (p.stockShopee !== undefined && p.stockShopee !== null && p.stockShopee !== '') {
            val = Number(p.stockShopee) || 0;
          } else if (p.stock !== undefined && p.stock !== null && p.stock !== '') {
            val = Number(p.stock) || 0;
          }
        }

        // Only write the value if it's not empty/null — truly blank stays blank
        const isEmpty = val === '' || val === null || val === undefined;
        if (!isEmpty) {
          cell.value = val;
        }

        // Font & Alignment
        cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF000000' } };
        cell.alignment = {
          vertical: 'middle',
          horizontal: colIdx <= 2 || colIdx === 5 || colIdx === 6 ? 'left' : 'center'
        };

        // Number Formatting — only apply when there's an actual numeric value
        if (col.numFmt && !isEmpty && typeof val === 'number') {
          cell.numFmt = col.numFmt;
        }

        // Thin Gray Borders
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
        };
      });

      row.commit();
    });
  }

  // Hide helper rows 1, 2, 4, 5, 6
  sheet.getRow(1).hidden = true;
  sheet.getRow(2).hidden = true;
  sheet.getRow(4).hidden = true;
  sheet.getRow(5).hidden = true;
  sheet.getRow(6).hidden = true;

  // Freeze the first 6 rows and center headers
  sheet.views = [{ state: 'frozen', ySplit: 6 }];

  return workbook.xlsx.writeBuffer();
}
