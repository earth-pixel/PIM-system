BEGIN;

-- เพิ่มคอลัมน์ expiry_status ในตาราง quotations (ค่าเริ่มต้นเป็น 'active')
ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS expiry_status text DEFAULT 'active';

-- อัปเดตข้อมูลแถวเดิมตามวันหมดอายุ valid_until
UPDATE public.quotations
SET expiry_status = CASE
  WHEN document_type = 'product_proposal' THEN 'active'
  WHEN valid_until IS NOT NULL AND valid_until < CURRENT_DATE THEN 'expired'
  ELSE 'active'
END;

COMMENT ON COLUMN public.quotations.expiry_status IS 'สถานะการหมดอายุของใบเสนอราคา: active (ปกติ/ยังไม่หมดอายุ), expired (หมดอายุ)';

COMMIT;
