
import * as XLSX from 'xlsx';
import { exportToLazadaMandatory } from './lazadaTemplate';
import { exportToShopeeMandatory } from './shopeeTemplate';
import { exportToTiktokMandatory } from './tiktokTemplate';




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
export async function exportShopee(products, options = {}) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('sv-SE');
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');
  const timestamp = `${dateStr}_${timeStr}`;
  try {
    const buffer = await exportToShopeeMandatory(products, options);
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Shopee_mass_upload_${timestamp}.xlsx`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    console.error('Shopee export failed:', error);
  }
}

// ─────────────────────────────────────────────
// 2. LAZADA EXPORT
// Logic: Group No. ผูกกลุ่ม SKU → สินค้ากลุ่มเดียวกันมี Group No. เดียวกัน
// แต่ละ variant → 1 แถว, แถวแรกของกลุ่มใส่ข้อมูลสินค้าหลักครบ
// ─────────────────────────────────────────────
export async function exportLazada(products, options = {}) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('sv-SE');
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');
  const timestamp = `${dateStr}_${timeStr}`;
  try {
    const buffer = await exportToLazadaMandatory(products, options);
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Lazada_batch_upload_${timestamp}.xlsx`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    console.error('Lazada export failed:', error);
    alert(`❌ Export Lazada ล้มเหลว:\n${error?.message || error}`);
  }
}

// ─────────────────────────────────────────────
// 3. TIKTOK SHOP EXPORT
// Logic: Product Name เป็นตัวผูกกลุ่ม
// Option Name/Value แยกคอลัมน์ตาม tier
// แต่ละ variant → 1 แถว
// ─────────────────────────────────────────────
export async function exportTikTok(products, options = {}) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('sv-SE');
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');
  const timestamp = `${dateStr}_${timeStr}`;
  try {
    const buffer = await exportToTiktokMandatory(products, options);
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TikTokShop_batch_upload_${timestamp}.xlsx`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    console.error('TikTok Shop export failed:', error);
  }
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
    'สถานะ': product.status === 'Active' ? 'เปิดใช้งาน' : 'ปิดใช้งาน',
    'รายละเอียด': product.description || '',
    'ขนาด': product.size || '',
    'น้ำหนัก': product.weight || '',
    'หมายเลข อย.': product.fdaNumber || '',
    'หมายเลข มอก.': product.tisiNumber || '',
    'วันที่ลงทะเบียน': product.createdAt || ''
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  applyColumnWidths(ws, [15, 15, 35, 15, 15, 15, 15, 12, 50, 12, 12, 18, 18, 18]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'สินค้าในคลัง');

  const timestamp = new Date().toLocaleDateString('sv-SE');
  downloadWorkbook(wb, `PIM_products_export_${timestamp}.xlsx`);
}
