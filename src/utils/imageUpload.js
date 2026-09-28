import { supabase } from './supabaseClient';
export const PRODUCT_IMAGES_BUCKET = 'product-images';

/**
 * Checks if a given string is a base64 data URL
 */
export function isBase64Image(str) {
  return typeof str === 'string' && str.startsWith('data:image/');
}

/**
 * Checks if a given string is a remote URL (e.g. Supabase Storage or external HTTPS)
 */
export function isRemoteUrl(str) {
  return typeof str === 'string' && /^https?:\/\//i.test(str);
}

/**
 * Helper to convert a File object to base64 Data URL (fallback)
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads a product image file to Supabase Storage Bucket 'product-images'.
 * Falls back to Base64 data URL if Supabase Storage is not yet configured with bucket/RLS.
 * 
 * @param {File} file 
 * @returns {Promise<{ success: boolean, url: string, isCloud: boolean, warning?: string, error?: string }>}
 */
export async function uploadProductImage(file) {
  if (!file) {
    return { success: false, error: 'ไม่พบไฟล์รูปภาพ' };
  }

  if (!file.type.startsWith('image/')) {
    return { success: false, error: 'กรุณาเลือกไฟล์รูปภาพเท่านั้น' };
  }

  if (file.size > 2 * 1024 * 1024) {
    return { success: false, error: 'ขนาดรูปภาพต้องไม่เกิน 2MB' };
  }

  // 1. Try uploading to Supabase Storage
  try {
    if (supabase && supabase.storage) {
      // Determine file extension
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanExt = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext) ? ext : 'jpg';
      const fileName = `product_${Date.now()}_${Math.random().toString(36).slice(2, 9)}.${cleanExt}`;
      const filePath = `products/${fileName}`;

      const { data, error } = await supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .upload(filePath, file, {
          cacheControl: '31536000', // 1 year cache
          upsert: true,
          contentType: file.type
        });

      if (!error && data?.path) {
        const { data: urlData } = supabase.storage
          .from(PRODUCT_IMAGES_BUCKET)
          .getPublicUrl(filePath);

        if (urlData?.publicUrl) {
          return {
            success: true,
            url: urlData.publicUrl,
            isCloud: true
          };
        }
      }

      // If there was an error (e.g. Bucket not created yet or RLS policy needed)
      console.warn('Supabase Storage upload warning:', error?.message || error);
    }
  } catch (err) {
    console.warn('Supabase Storage exception, using fallback:', err.message);
  }

  // 2. Fallback to Base64 so the user can continue working even before creating the bucket
  try {
    const base64 = await fileToBase64(file);
    return {
      success: true,
      url: base64,
      isCloud: false,
      warning: 'ยังไม่ได้สร้าง Bucket "product-images" บน Supabase หรือติดสิทธิ์ RLS ระบบจึงบันทึกแบบ Base64 ชั่วคราว'
    };
  } catch (err) {
    return {
      success: false,
      error: 'ไม่สามารถอ่านไฟล์รูปภาพได้: ' + err.message
    };
  }
}

/**
 * Deletes a product image from Supabase Storage given its URL.
 * 
 * @param {string} url 
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function deleteProductImage(url) {
  if (!url || typeof url !== 'string' || !isRemoteUrl(url)) {
    return { success: true };
  }

  try {
    if (supabase && supabase.storage) {
      const bucketMarker = `/${PRODUCT_IMAGES_BUCKET}/`;
      const idx = url.indexOf(bucketMarker);
      if (idx !== -1) {
        const filePath = decodeURIComponent(url.slice(idx + bucketMarker.length).split('?')[0]);
        if (filePath) {
          const { error } = await supabase.storage
            .from(PRODUCT_IMAGES_BUCKET)
            .remove([filePath]);
          if (error) {
            console.warn('Supabase storage file deletion error:', error.message);
            return { success: false, error: error.message };
          }
        }
      }
    }
    return { success: true };
  } catch (err) {
    console.warn('Exception deleting image from Supabase storage:', err);
    return { success: false, error: err.message };
  }
}

export const COMPANY_ASSETS_BUCKET = 'company-assets';

/**
 * Uploads a company asset (logo, signature, stamp) to Supabase Storage with a clean, fixed filename.
 * Overwrites existing file (upsert: true) and returns a cache-busted URL (?t=timestamp) so the browser always renders fresh image.
 * 
 * @param {File} file 
 * @param {'logo'|'signature'|'stamp'} assetType 
 * @returns {Promise<{ success: boolean, url: string, isCloud: boolean, error?: string }>}
 */
export async function uploadCompanyAsset(file, assetType = 'signature') {
  if (!file) {
    return { success: false, error: 'ไม่พบไฟล์รูปภาพ' };
  }

  if (!file.type.startsWith('image/')) {
    return { success: false, error: 'กรุณาเลือกไฟล์รูปภาพเท่านั้น' };
  }

  if (file.size > 2 * 1024 * 1024) {
    return { success: false, error: 'ขนาดรูปภาพต้องไม่เกิน 2MB' };
  }

  try {
    if (supabase && supabase.storage) {
      const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanExt = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext) ? ext : 'png';
      const timestamp = Date.now();
      const filePath = `${assetType}_${timestamp}.${cleanExt}`;

      // Clean up previous files for this assetType to prevent duplicate leftovers
      try {
        const { data: existingFiles } = await supabase.storage.from(COMPANY_ASSETS_BUCKET).list('', {
          search: assetType
        });
        if (existingFiles && existingFiles.length > 0) {
          await supabase.storage.from(COMPANY_ASSETS_BUCKET).remove(existingFiles.map(f => f.name)).catch(() => {});
        }
        await supabase.storage.from(COMPANY_ASSETS_BUCKET).remove([
          `${assetType}.png`, `${assetType}.jpg`, `${assetType}.jpeg`, `${assetType}.webp`,
          `company/${assetType}.png`, `company/${assetType}.jpg`
        ]).catch(() => {});
      } catch (cleanErr) {
        console.warn('Storage cleanup warning:', cleanErr);
      }

      const { data, error } = await supabase.storage
        .from(COMPANY_ASSETS_BUCKET)
        .upload(filePath, file, {
          cacheControl: '0',
          upsert: true,
          contentType: file.type
        });

      if (!error && data?.path) {
        const { data: urlData } = supabase.storage
          .from(COMPANY_ASSETS_BUCKET)
          .getPublicUrl(filePath);

        if (urlData?.publicUrl) {
          return {
            success: true,
            url: urlData.publicUrl,
            isCloud: true
          };
        }
      }

      console.warn('Company asset cloud upload warning:', error?.message || error);
    }
  } catch (err) {
    console.warn('Company asset cloud upload exception:', err.message);
  }

  // 2. Fallback to server-side upload API if client direct upload had network/CORS issues
  try {
    const base64 = await fileToBase64(file);
    const res = await fetch('/api/company/upload-asset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assetType, base64 })
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.url) {
        return {
          success: true,
          url: json.url,
          isCloud: true
        };
      }
    }
  } catch (err) {
    console.warn('Company asset backend upload fallback notice:', err?.message || err);
  }

  // 3. Fallback to Base64 data URL so preview immediately renders; backend will upload to storage upon clicking "บันทึก"
  try {
    const base64 = await fileToBase64(file);
    return {
      success: true,
      url: base64,
      isCloud: false
    };
  } catch (err) {
    return {
      success: false,
      error: 'ไม่สามารถอ่านไฟล์รูปภาพได้: ' + err.message
    };
  }
}

/**
 * Deletes a company asset (logo, signature, stamp) from Supabase Storage.
 * @param {'logo'|'signature'|'stamp'|string} target - either asset name or full URL
 */
export async function deleteCompanyAsset(target) {
  if (!target || typeof target !== 'string') return { success: true };

  try {
    if (supabase && supabase.storage) {
      if (['logo', 'signature', 'stamp'].includes(target)) {
        try {
          const { data: existingFiles } = await supabase.storage.from(COMPANY_ASSETS_BUCKET).list('', {
            search: target
          });
          if (existingFiles && existingFiles.length > 0) {
            await supabase.storage.from(COMPANY_ASSETS_BUCKET).remove(existingFiles.map(f => f.name)).catch(() => {});
          }
        } catch {}
        await supabase.storage.from(COMPANY_ASSETS_BUCKET).remove([
          `${target}.png`,
          `${target}.jpg`,
          `${target}.jpeg`,
          `${target}.webp`,
          `${target}.svg`,
          `company/${target}.png`,
          `company/${target}.jpg`,
          `company/${target}.jpeg`,
          `company/${target}.webp`
        ]).catch(() => {});
        return { success: true };
      }

      const bucketMarker = `/${COMPANY_ASSETS_BUCKET}/`;
      const idx = target.indexOf(bucketMarker);
      if (idx !== -1) {
        const filePath = decodeURIComponent(target.slice(idx + bucketMarker.length).split('?')[0]);
        if (filePath) {
          await supabase.storage.from(COMPANY_ASSETS_BUCKET).remove([filePath]);
        }
      }
    }
    return { success: true };
  } catch (err) {
    console.warn('deleteCompanyAsset exception:', err.message);
    return { success: false, error: err.message };
  }
}

