import ExcelJS from 'exceljs';
import { parseWeightToKg } from './marketplaceIO.js';

// Required columns, in TikTok's column order.
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
  { code: 'quantity', label: 'สต็อกสินค้า', width: 12, numFmt: '0', value: (p) => Number(p.stock) || 0 },
  { code: 'seller_sku', label: 'Seller SKU', width: 20, value: (p) => p.code || '' }
];

function buildDescription(p) {
  let desc = p.description || '';
  if (p.highlights) desc += `\n\nจุดเด่นสินค้า:\n${p.highlights}`;
  if (p.howToUse) desc += `\n\nวิธีใช้งาน:\n${p.howToUse}`;
  return desc;
}

export async function exportToTiktokMandatory(products = [], options = {}) {
  const { headersOnly = false } = options;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Template');

  // Row 1: System Codes (TikTok's importer parses these system keys)
  const systemRow = sheet.addRow(TIKTOK_MANDATORY_COLUMNS.map(c => c.code));
  systemRow.height = 20;
  systemRow.eachCell((cell) => {
    cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF666666' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // Row 2: Thai Display Labels
  const labelRow = sheet.addRow(TIKTOK_MANDATORY_COLUMNS.map(c => c.label));
  labelRow.height = 24;
  labelRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF000000' }
    };
    cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF333333' } },
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF333333' } },
      right: { style: 'thin', color: { argb: 'FF333333' } }
    };
  });

  // Data Rows
  if (!headersOnly) {
    products.forEach((p) => {
      const rowValues = TIKTOK_MANDATORY_COLUMNS.map(c => {
        if (c.code === 'quantity') {
          if (options.stockMap && options.stockMap[p.id] !== undefined) {
            return Number(options.stockMap[p.id]) || 0;
          }
          if (options.stock !== undefined) {
            return Number(options.stock) || 0;
          }
          return Number(p.stock) || 0;
        }
        return c.value(p);
      });

      const dataRow = sheet.addRow(rowValues);
      dataRow.height = 20;
      dataRow.eachCell((cell, colNumber) => {
        const colDef = TIKTOK_MANDATORY_COLUMNS[colNumber - 1];
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
  TIKTOK_MANDATORY_COLUMNS.forEach((c, idx) => {
    sheet.getColumn(idx + 1).width = c.width || 20;
  });

  sheet.views = [{ state: 'frozen', ySplit: 2 }];

  return workbook.xlsx.writeBuffer();
}
