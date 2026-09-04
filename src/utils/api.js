let versions = {};
let pending = 0;
export function cacheValue(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Optional cache. */ }
}
export function clearLegacyCache() {
  for (const key of ['pim_users', 'pim_products', 'pim_quotations', 'pim_activity_log']) {
    try { localStorage.removeItem(key); } catch { /* Storage may be unavailable. */ }
  }
  try { sessionStorage.removeItem('pim_current_user'); } catch { /* No browser credentials. */ }
  versions = {};
}
export function acceptSnapshot(data) {
  if (data._revisions) versions = { ...data._revisions };
  window.dispatchEvent(new CustomEvent('pim:database', { detail: data }));
}
export async function request(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
  let data;
  try { data = await response.json(); } catch { throw new Error(`เซิร์ฟเวอร์ตอบกลับไม่สมบูรณ์ (${response.status})`); }
  if (!response.ok) {
    if (response.status === 401 && !url.includes('/auth/login')) window.dispatchEvent(new Event('pim:session-expired'));
    throw Object.assign(new Error(data.error || 'ดำเนินการไม่สำเร็จ'), { status: response.status });
  }
  return data;
}
export async function loadDatabase() {
  const data = await request('/api/db');
  acceptSnapshot(data);
  return data;
}
export async function saveCollection(key, data) {
  if (pending) throw new Error('กำลังบันทึกข้อมูล กรุณารอให้เสร็จก่อน');
  pending++;
  window.dispatchEvent(new CustomEvent('pim:saving', { detail: true }));
  try {
    const result = await request('/api/db/save', { method: 'POST', body: JSON.stringify({ key, data, expectedRevision: versions[key] }) });
    if (result.success !== true) throw new Error('เซิร์ฟเวอร์ยังไม่ยืนยันการบันทึก');
    acceptSnapshot(result);
    return result;
  } catch (error) {
    window.dispatchEvent(new CustomEvent('pim:error', { detail: error.message }));
    throw error;
  } finally {
    pending--;
    window.dispatchEvent(new CustomEvent('pim:saving', { detail: false }));
  }
}
