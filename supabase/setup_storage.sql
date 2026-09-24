
-- 1. สร้าง Storage Bucket ชื่อ "product-images" และเปิด Public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880, -- 5 MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE 
SET public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];

-- 2. ตั้งสิทธิ์ Policy: อนุญาตให้ทุกคนอ่าน/ดูรูปภาพได้ (Public Read)
DROP POLICY IF EXISTS "Public Read Product Images" ON storage.objects;
CREATE POLICY "Public Read Product Images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- 3. ตั้งสิทธิ์ Policy: อนุญาตให้อัปโหลดรูปภาพสินค้าได้ (Public Upload)
DROP POLICY IF EXISTS "Public Upload Product Images" ON storage.objects;
CREATE POLICY "Public Upload Product Images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images');

-- 4. ตั้งสิทธิ์ Policy: อนุญาตให้อัปเดต/เขียนทับรูปภาพสินค้าได้
DROP POLICY IF EXISTS "Public Update Product Images" ON storage.objects;
CREATE POLICY "Public Update Product Images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images');

-- 5. ตั้งสิทธิ์ Policy: อนุญาตให้ลบรูปภาพสินค้าได้
DROP POLICY IF EXISTS "Public Delete Product Images" ON storage.objects;
CREATE POLICY "Public Delete Product Images"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images');
