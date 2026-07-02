/**
 * TikTok Shop Mandatory-Columns Export
 * Phanvadee Co., Ltd. PIM System
 *
 * Builds a TikTok Shop "Template" workbook containing only the columns TikTok
 * requires (per the system's validateForPlatform definition):
 * category, product_name, product_description, main_image, parcel_weight,
 * parcel_length, parcel_width, parcel_height, price, quantity.
 *
 * TikTok's importer keys off the system code row (row 1, e.g. parcel_weight),
 * so that row is preserved exactly. Row 2 carries the Thai labels.
 * Note: TikTok expects parcel_weight in GRAMS.
 *
 * Place this file at: src/utils/tiktokTemplate.js
 */
import ExcelJS from 'exceljs';
import { parseWeightToKg } from './marketplaceIO.js';

// Required columns, in TikTok's column order.
// `code`  – system header TikTok parses (row 1) — do not rename.
// `label` – Thai display label (row 2).
// `value` – maps a PIM product to the cell value.
export const TIKTOK_MANDATORY_COLUMNS = [
  { code: 'category', label: 'หมวดหมู่', width: 24, value: (p) => p.category || '' },
  { code: 'product_name', label: 'ชื่อสินค้า', width: 34, value: (p) => p.name || '' },
  { code: 'product_description', label: 'คำอธิบายสินค้า', width: 46, value: (p) => buildDescription(p) },
  { code: 'main_image', label: 'ภาพหลัก', width: 40, value: (p) => p.image || '' },
  { code: 'parcel_weight', label: 'น้ำหนักพัสดุ(g)', width: 16, numFmt: '0', value: (p) => Math.round(parseWeightToKg(p.weight) * 1000) },
  { code: 'parcel_length', label: 'ความยาวของพัสดุ(cm)', width: 18, numFmt: '0.##', value: (p) => (p.packageLength ? Number(p.packageLength) : '') },
  { code: 'parcel_width', label: 'ความกว้างของพัสดุ(cm)', width: 18, numFmt: '0.##', value: (p) => (p.packageWidth ? Number(p.packageWidth) : '') },
  { code: 'parcel_height', label: 'ความสูงของพัสดุ(cm)', width: 18, numFmt: '0.##', value: (p) => (p.packageHeight ? Number(p.packageHeight) : '') },
  { code: 'price', label: 'ราคาขายปลีก (สกุลเงินท้องถิ่น)', width: 24, numFmt: '#,##0.00', value: (p) => Number(p.retailPrice) || 0 },
  { code: 'quantity', label: 'ปริมาณ', width: 12, numFmt: '0', value: () => 0 },
];

function buildDescription(p) {
  let desc = p.description || '';
  if (p.highlights) desc += `\n\nจุดเด่นสินค้า:\n${p.highlights}`;
  if (p.howToUse) desc += `\n\nวิธีใช้งาน:\n${p.howToUse}`;
  return desc;
}

export async function exportToTiktokMandatory(products = [], options = {}) {
  const { headersOnly = false } = options;

  // Fetch the real TikTok template from the public/แพลตฟอร์ม folder
  const response = await fetch('/แพลตฟอร์ม/Tiktoksellercenter_batchupload_20260617_template.xlsx?t=' + Date.now());
  if (!response.ok) throw new Error('Failed to fetch TikTok template file');
  const buffer = await response.arrayBuffer();

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  // Keep ONLY 'Template' sheet (delete all other sheets)
  workbook.worksheets.forEach(s => {
    if (s.name !== 'Template') {
      workbook.removeWorksheet(s.id);
    }
  });

  const sheet = workbook.getWorksheet('Template');
  if (!sheet) throw new Error('TikTok template sheet not found');

  // Delete helper Row 4 (บังคับ/ไม่บังคับ) and Row 5 (รายละเอียด) from the template
  sheet.spliceRows(4, 2);

  // Keep only the columns we write data to (7 key REQUIRED columns only)
  const colsToKeep = new Set([
    'category',
    'product_name',
    'product_description',
    'main_image',
    'parcel_weight',
    'price',
    'quantity'
  ]);

  const originalColCount = sheet.columnCount;
  const originalHeaderRow = sheet.getRow(1);
  for (let c = originalColCount; c >= 1; c--) {
    const key = String(originalHeaderRow.getCell(c).value || '').trim();
    if (!colsToKeep.has(key)) {
      sheet.spliceColumns(c, 1);
    }
  }

  // Remove any existing data rows and styles from row 4 onwards
  while (sheet.rowCount >= 4) {
    sheet.spliceRows(sheet.rowCount, 1);
  }

  const colCount = sheet.columnCount;
  
  // Create column mapping based on Row 1 (Keys)
  const colMap = {};
  const headerRow = sheet.getRow(1);

  for (let c = 1; c <= colCount; c++) {
    const headerVal = headerRow.getCell(c).value;
    if (headerVal) {
      colMap[String(headerVal).trim()] = c;
    }
  }

  // Populate data
  if (!headersOnly) {
    products.forEach((p, idx) => {
      const targetRowIdx = 4 + idx;
      const row = sheet.getRow(targetRowIdx);
      row.height = 20;

      // Reset and force clean style (solid white background, black font, thin border) for all cells in this row
      for (let c = 1; c <= colCount; c++) {
        const cell = row.getCell(c);
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFFFF' } // Force solid white background
        };
        cell.font = {
          name: 'Segoe UI',
          size: 10,
          color: { argb: 'FF000000' } // Force black text
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'left'
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
        };
      }

      const setVal = (key, val) => {
        const col = colMap[key];
        if (col) {
          const cell = row.getCell(col);
          cell.value = val;
          // Ensure solid white background and normal black font
          cell.font = { 
            name: 'Segoe UI', 
            size: 10,
            color: { argb: 'FF000000' }
          };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFFFF' }
          };
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        }
      };

      setVal('product_name', p.name || '');
      setVal('product_description', buildDescription(p));
      setVal('main_image', p.image || '');
      setVal('parcel_weight', Math.round(parseWeightToKg(p.weight) * 1000) || 100);
      setVal('price', Number(p.retailPrice) || 0);
      setVal('quantity', 0);
      setVal('category', p.category || '');
      
      row.commit();
    });
  }

  // Hide helper rows 1 and 2
  sheet.getRow(1).hidden = true;
  sheet.getRow(2).hidden = true;

  // Restore and style Row 3 (Thai headers) to look clean and premium (solid black background, white bold text)
  const row3 = sheet.getRow(3);
  row3.height = 30;
  row3.hidden = false;
  
  for (let c = 1; c <= colCount; c++) {
    const cell = row3.getCell(c);
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF000000' } // Solid black background
    };
    cell.font = {
      name: 'Segoe UI',
      size: 10,
      bold: true,
      color: { argb: 'FFFFFFFF' } // White text
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF333333' } },
      left: { style: 'thin', color: { argb: 'FF333333' } },
      bottom: { style: 'thin', color: { argb: 'FF333333' } },
      right: { style: 'thin', color: { argb: 'FF333333' } }
    };
  }

  // Remove all conditional formatting rules (such as those adding red borders to empty cells)
  sheet.conditionalFormattings = [];

  // Freeze only the first 3 rows (which includes the headers) so that data rows scroll normally
  sheet.views = [{ state: 'frozen', ySplit: 3 }];

  return workbook.xlsx.writeBuffer();
}
