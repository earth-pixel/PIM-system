BEGIN;

-- ลบคอลัมน์ที่ไม่ได้ใช้งานในหน้าจอเว็บออกจากตาราง company_info
-- เพื่อให้ทุกคอลัมน์ใน Supabase มีข้อมูลใช้งานจริง 100% ไม่มีคอลัมน์ว่าง
ALTER TABLE public.company_info
  DROP COLUMN IF EXISTS name_en,
  DROP COLUMN IF EXISTS mobile,
  DROP COLUMN IF EXISTS stamp_image_url,
  DROP COLUMN IF EXISTS signer_name;

COMMIT;
