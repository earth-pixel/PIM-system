export async function readArchiveResponse(response) {
  const text = await response.text();
  let result;
  try {
    result = JSON.parse(text);
  } catch {
    throw new Error(`เซิร์ฟเวอร์ตอบกลับไม่สมบูรณ์ (HTTP ${response.status}) กรุณารีเฟรชเพื่อตรวจสอบรายการก่อนลองใหม่`);
  }
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new Error('รูปแบบผลตอบกลับไม่ถูกต้อง กรุณารีเฟรชเพื่อตรวจสอบรายการก่อนลองใหม่');
  }
  if (response.ok && (result.success !== true || !Array.isArray(result.quotations) || !Array.isArray(result.activityLog) || !Number.isInteger(result.deletedCount) || result.deletedCount < 1)) {
    throw new Error('ยังยืนยันผลการลบไม่ได้ กรุณารีเฟรชเพื่อตรวจสอบรายการก่อนลองใหม่');
  }
  return result;
}
