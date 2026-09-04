import { request } from './api';
// Links contain unguessable server-issued tokens, never client-authored documents.
export async function encodeQuotation(quotation) {
  const result = await request('/api/quotations/' + encodeURIComponent(quotation.id) + '/share', { method: 'POST' });
  return result.token;
}
export async function decodeQuotation(token) {
  if (!/^[a-f0-9]{64}$/.test(token || '')) throw new Error('ลิงก์เก่าไม่สามารถยืนยันเอกสารได้ กรุณาขอลิงก์ใหม่จากพนักงานขาย');
  const result = await request('/api/public/quotations/' + token);
  return result.quotation;
}
