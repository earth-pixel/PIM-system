
import * as XLSX from 'xlsx';
import { exportToLazadaMandatory } from './lazadaTemplate';
import { exportToShopeeMandatory } from './shopeeTemplate';
import { exportToTiktokMandatory } from './tiktokTemplate';

import { checkIsInAppBrowser } from './browserUtils';

// ─────────────────────────────────────────────
// Helper: download Excel file (Instant direct blob download with in-app fallback)
// ─────────────────────────────────────────────
export async function downloadWorkbook(workbook, filename) {
  // If in-app browser (LINE, Facebook Messenger, etc.) where blob download is blocked
  if (checkIsInAppBrowser()) {
    try {
      const base64 = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const response = await fetch('/api/store-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: base64, filename }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        const result = await response.json();
        if (result.id) {
          window.location.assign(`/api/download?id=${result.id}`);
          return;
        }
      }
    } catch {
      // Fallback to direct blob download
    }
  }

  // Fast direct instant download (< 50ms)
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (document.body.contains(a)) document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
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
    const buffer = await exportToLazadaMandatory(products, { ...options, keepEmptySheets: true });
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
  const headers = [
    'รหัสสินค้า (SKU)',
    'รหัสบาร์โค้ด',
    'ชื่อสินค้า',
    'แบรนด์',
    'หมวดหมู่',
    'หมวดหมู่ย่อย',
    'ราคาขายส่ง (บาท)',
    'ราคาขายปลีก (บาท)',
    'ค่าฝา (บาท)',
    'สถานะใช้งาน',
    'ขนาด',
    'น้ำหนัก',
    'หมายเลข อย.',
    'หมายเลข มอก.',
    'รายละเอียดสินค้า',
    'จุดเด่นสินค้า',
    'วิธีใช้',
    'วันที่ลงทะเบียน'
  ];

  const rows = products.map(product => ({
    'รหัสสินค้า (SKU)': product.code,
    'รหัสบาร์โค้ด': product.barcode || '',
    'ชื่อสินค้า': product.name,
    'แบรนด์': product.brand || '',
    'หมวดหมู่': product.category || '',
    'หมวดหมู่ย่อย': product.subCategory || '',
    'ราคาขายส่ง (บาท)': product.wholesalePrice || 0,
    'ราคาขายปลีก (บาท)': product.retailPrice || 0,
    'ค่าฝา (บาท)': product.capFee || 0,
    'สถานะใช้งาน': product.status === 'Active' ? 'เปิดใช้งาน' : 'ปิดใช้งาน',
    'ขนาด': product.size || '',
    'น้ำหนัก': product.weight || '',
    'หมายเลข อย.': product.fdaNumber || '',
    'หมายเลข มอก.': product.tisiNumber || '',
    'รายละเอียดสินค้า': product.description || '',
    'จุดเด่นสินค้า': product.highlights || '',
    'วิธีใช้': product.howToUse || '',
    'วันที่ลงทะเบียน': product.createdAt || ''
  }));

  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
  applyColumnWidths(ws, [18, 18, 35, 18, 35, 16, 16, 12, 14, 12, 12, 18, 18, 50, 35, 35, 18]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'สินค้าในคลัง');

  const timestamp = new Date().toLocaleDateString('sv-SE');
  downloadWorkbook(wb, `PIM_products_export_${timestamp}.xlsx`);
}

