export const normalizeCode = value => String(value ?? '').trim().toLowerCase();
export const ownsDocument = (document, user) => Boolean(user && document.createdBy && document.createdBy === user.username);

export function parseNumericCell(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  if (!/^-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(text)) return NaN;
  return Number(text.replaceAll(',', ''));
}

export function validateProduct(product) {
  const required = { code: 'SKU', name: 'ชื่อสินค้า', barcode: 'บาร์โค้ด', brand: 'แบรนด์', category: 'หมวดหมู่', weight: 'น้ำหนัก', size: 'ขนาด', description: 'รายละเอียด', highlights: 'จุดเด่น', howToUse: 'วิธีใช้', image: 'รูปภาพ', fdaNumber: 'เลข อย.', tisiNumber: 'เลข มอก.' };
  const errors = Object.entries(required).filter(([key]) => typeof product[key] !== 'string' || !product[key].trim()).map(([, label]) => `กรุณาระบุ${label}เป็นข้อความ`);
  for (const key of ['retailPrice', 'wholesalePrice', 'capFee']) {
    const value = product[key];
    if (value === '' || value == null || !Number.isFinite(Number(value)) || Number(value) < 0 || (key === 'retailPrice' && Number(value) === 0)) errors.push(`${key}: ราคาไม่ถูกต้อง`);
  }
  for (const key of ['packageLength', 'packageWidth', 'packageHeight', 'stock']) {
    const value = product[key];
    if (value != null && value !== '' && (!Number.isFinite(Number(value)) || Number(value) < 0)) errors.push(`${key}: ต้องเป็นตัวเลขไม่ติดลบ`);
  }
  if (product.status && !['Active', 'Inactive'].includes(product.status)) errors.push('สถานะสินค้าไม่ถูกต้อง');
  const image = String(product.image ?? '');
  if (image && !/^(https?:\/\/|data:image\/(?:png|jpeg|webp|gif);base64,|\/?[^:\\]+\.(?:png|jpe?g|webp|gif)(?:\?.*)?$)/i.test(image)) errors.push('รูปภาพต้องเป็น URL หรือพาธรูปที่เว็บเข้าถึงได้');
  if (image.startsWith('data:') && image.length > 2 * 1024 * 1024 * 4 / 3 + 100) errors.push('รูปภาพต้องไม่เกิน 2 MB');
  return errors;
}

export function findHeaderRow(worksheet, getValue) {
  let found = null;
  worksheet.eachRow(row => {
    if (found) return;
    const values = new Set();
    row.eachCell(cell => { const text = getValue(cell).trim(); if (text) values.add(text); });
    if (values.size >= 3) found = row;
  });
  return found;
}

export function mergeImportedProducts(existing, incoming) {
  const codes = new Set();
  return incoming.reduce((result, product) => {
    const code = normalizeCode(product.code);
    if (!code || codes.has(code)) throw new Error(`SKU ซ้ำหรือว่างในไฟล์: ${product.code || '-'}`);
    codes.add(code);
    const index = result.findIndex(p => normalizeCode(p.code) === code);
    const clean = Object.fromEntries(Object.entries(product).filter(([key]) => !key.startsWith('_')));
    if (index < 0) result.push({ ...clean, id: crypto.randomUUID() });
    else result[index] = { ...result[index], ...clean, id: result[index].id, code: result[index].code, createdAt: result[index].createdAt };
    return result;
  }, [...existing]);
}

const roundMoney = value => Math.round((value + Number.EPSILON) * 100) / 100;
export function calculateQuotation(quotation) {
  const proposal = quotation.documentType === 'product_proposal';
  if (!Array.isArray(quotation.items) || (!quotation.items.length && quotation.status !== 'draft')) throw new Error('กรุณาเพิ่มรายการสินค้า');
  const items = quotation.items.map((item, index) => {
    const quantity = Number(item.quantity), unitPrice = Number(item.unitPrice), discount = Number(item.discount ?? 0);
    if (typeof item.productName !== 'string' || !item.productName.trim() || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0 || !Number.isFinite(discount) || discount < 0) throw new Error(`รายการที่ ${index + 1}: ชื่อ จำนวน ราคา หรือส่วนลดไม่ถูกต้อง`);
    if (!['percent', 'amount', 'fixed'].includes(item.discountType)) throw new Error('รูปแบบส่วนลดไม่ถูกต้อง');
    const gross = quantity * unitPrice;
    if (!Number.isFinite(gross) || discount > (item.discountType === 'percent' ? 100 : gross)) throw new Error(`รายการที่ ${index + 1}: ส่วนลดต้องไม่เกินยอดสินค้า`);
    const lineTotal = roundMoney(item.discountType === 'percent' ? gross * (1 - discount / 100) : gross - discount);
    return { ...item, quantity, unitPrice, discount, lineTotal };
  });
  const vatRate = proposal ? 0 : Number(quotation.vatRate ?? 7);
  if (!Number.isFinite(vatRate) || vatRate < 0 || vatRate > 100) throw new Error('อัตราภาษีไม่ถูกต้อง');
  const subtotal = roundMoney(items.reduce((sum, item) => sum + item.lineTotal, 0));
  const vatAmount = roundMoney(subtotal * vatRate / 100);
  if (!Number.isSafeInteger(Math.round((subtotal + vatAmount) * 100))) throw new Error('ยอดเอกสารเกินขอบเขตที่รองรับ');
  return { ...quotation, items, vatRate, subtotal, vatAmount, totalAmount: roundMoney(subtotal + vatAmount) };
}

export function isExpiredQuotation(q) {
  if (!q || q.documentType === 'product_proposal') return false;
  const rawDate = q.validUntilDate || q.validUntil;
  if (!rawDate) return false;
  try {
    let expDate = null;
    if (typeof rawDate === 'string' && rawDate.includes('-')) {
      const [y, m, d] = rawDate.split('-').map(Number);
      expDate = new Date(y, m - 1, d);
    } else if (typeof rawDate === 'string' && rawDate.includes('/')) {
      const parts = rawDate.split('/').map(Number);
      if (parts.length === 3) {
        let y = parts[2];
        if (y > 2400) y -= 543;
        expDate = new Date(y, parts[1] - 1, parts[0]);
      }
    } else {
      expDate = new Date(rawDate);
    }
    if (!expDate || isNaN(expDate.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expDate.setHours(0, 0, 0, 0);
    return expDate < today;
  } catch {
    return false;
  }
}

export function getExpiryStatus(q) {
  if (!q || q.documentType === 'product_proposal') return null;
  const rawDate = q.validUntilDate || q.validUntil;
  if (!rawDate) return null;
  try {
    let expDate = null;
    if (typeof rawDate === 'string' && rawDate.includes('-')) {
      const [y, m, d] = rawDate.split('-').map(Number);
      expDate = new Date(y, m - 1, d);
    } else if (typeof rawDate === 'string' && rawDate.includes('/')) {
      const parts = rawDate.split('/').map(Number);
      if (parts.length === 3) {
        let y = parts[2];
        if (y > 2400) y -= 543;
        expDate = new Date(y, parts[1] - 1, parts[0]);
      }
    } else {
      expDate = new Date(rawDate);
    }
    if (!expDate || isNaN(expDate.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expDate.setHours(0, 0, 0, 0);
    const diffTime = expDate.getTime() - today.getTime();
    const daysLeft = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
      return { isExpired: true, isExpiringSoon: false, daysLeft, label: 'หมดอายุแล้ว', badgeColor: 'red' };
    }
    if (daysLeft === 0) {
      return { isExpired: false, isExpiringSoon: true, daysLeft: 0, label: 'หมดอายุวันนี้', urgent: true };
    }
    if (daysLeft === 1) {
      return { isExpired: false, isExpiringSoon: true, daysLeft: 1, label: 'หมดอายุพรุ่งนี้', urgent: true };
    }
    if (daysLeft <= 3) {
      return { isExpired: false, isExpiringSoon: true, daysLeft, label: `ใกล้หมดอายุ (อีก ${daysLeft} วัน)`, urgent: false };
    }
    return { isExpired: false, isExpiringSoon: false, daysLeft, label: `เหลืออีก ${daysLeft} วัน` };
  } catch {
    return null;
  }
}

