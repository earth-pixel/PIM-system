BEGIN;

-- ลบคอลัมน์ที่ไม่ได้ใช้งานออกจากตาราง quotations
-- 1. customer_accepted_at (วันเวลาที่ลูกค้ายืนยันออนไลน์)
-- 2. pdf_url (ลิงก์เก็บไฟล์ PDF บน Cloud)
ALTER TABLE public.quotations
  DROP COLUMN IF EXISTS customer_accepted_at,
  DROP COLUMN IF EXISTS pdf_url;

COMMIT;
