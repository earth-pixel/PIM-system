import { createClient } from '@supabase/supabase-js';
import { randomUUID, createHash } from 'node:crypto';
import dotenv from 'dotenv';
dotenv.config();

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function ensureUuid(val) {
  if (!val) return randomUUID();
  const str = String(val).trim();
  if (UUID_REGEX.test(str)) return str.toLowerCase();
  const h = createHash('md5').update(str).digest('hex');
  return h.slice(0, 8) + '-' + h.slice(8, 12) + '-4' + h.slice(13, 16) + '-a' + h.slice(17, 20) + '-' + h.slice(20, 32);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('วาง_'));

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

let quotationHasCustomerAcceptedAt = null;

// Helper to remove an image file from Supabase Storage given its public URL
export async function deleteStorageImage(url) {
  if (!url || typeof url !== 'string' || !isSupabaseConfigured || !supabase) return;
  try {
    const bucket = 'product-images';
    const marker = `/${bucket}/`;
    const idx = url.indexOf(marker);
    if (idx !== -1) {
      const filePath = decodeURIComponent(url.slice(idx + marker.length).split('?')[0]);
      if (filePath) {
        const { error } = await supabase.storage.from(bucket).remove([filePath]);
        if (error) console.warn('Supabase storage delete error:', error.message);
      }
    }
  } catch (err) {
    console.warn('Failed to remove image from storage:', err.message);
  }
}

// Helper to upload a base64 image string to Supabase Storage and return its public URL
export async function uploadBase64ToStorage(base64Str, bucket, fileName) {
  if (!base64Str || typeof base64Str !== 'string' || !base64Str.startsWith('data:image/')) return base64Str;
  if (!isSupabaseConfigured || !supabase) return base64Str;

  try {
    const matches = base64Str.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (!matches) return base64Str;
    const ext = matches[1].replace('jpeg', 'jpg');
    const buffer = Buffer.from(matches[2], 'base64');
    const finalName = fileName.includes('.') ? fileName : `${fileName}.${ext}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(finalName, buffer, {
        upsert: true,
        contentType: `image/${matches[1]}`
      });

    if (!error && data?.path) {
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(finalName);
      if (urlData?.publicUrl) {
        return `${urlData.publicUrl}?t=${Date.now()}`;
      }
    }
  } catch (err) {
    console.warn(`Error uploading base64 to ${bucket}/${fileName}:`, err?.message || err);
  }
  return base64Str;
}

// Helper to convert product from App format to Supabase row
export function toSupabaseProduct(p) {
  let imageUrl = null;
  if (p.image !== undefined) {
    imageUrl = p.image && String(p.image).trim() ? String(p.image).trim() : null;
  } else if (p.imageUrl !== undefined) {
    imageUrl = p.imageUrl && String(p.imageUrl).trim() ? String(p.imageUrl).trim() : null;
  } else if (p.image_url !== undefined) {
    imageUrl = p.image_url && String(p.image_url).trim() ? String(p.image_url).trim() : null;
  }

  const parseNumOrNull = (v) => {
    if (v === undefined || v === null || v === '') return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  };

  return {
    id: ensureUuid(p.id),
    SKU: p.code || p.SKU || null,
    barcode: p.barcode || null,
    name: p.name || 'ไม่มีชื่อสินค้า',
    image_url: imageUrl,
    category: p.category || null,
    subcategory: p.subCategory || p.subcategory || null,
    brand: p.brand || null,
    size: p.size || null,
    weight: p.weight || null,
    fda_no: p.fdaNumber || p.fda || p.fdaNo || p.fda_no || null,
    tis_no: p.tisiNumber || p.tis || p.tisNo || p.tis_no || null,
    wholesale_price: Number(p.wholesalePrice || p.wholesale_price || 0),
    retail_price: Number(p.retailPrice || p.retail_price || 0),
    cap_cost: Number(p.capFee || p.cap_cost || 0),
    status: p.status || 'Active',
    description: p.description || null,
    highlights: p.highlight || p.highlights || null,
    how_to_use: p.howToUse || p.how_to_use || null,
    package_width: parseNumOrNull(p.packageWidth ?? p.package_width),
    package_length: parseNumOrNull(p.packageLength ?? p.package_length),
    package_height: parseNumOrNull(p.packageHeight ?? p.package_height),
    updated_by: p.updatedBy || p.updated_by || null,
    edit_remark: p.editRemark || p.edit_remark || null,
    hair_type: p.hairType || p.hair_type || null,
    styling_level: p.stylingLevel || p.styling_level || null,
    hair_benefit: p.hairBenefit || p.hair_benefit || null,
    product_form: p.productForm || p.product_form || null,
    hair_color_type: p.hairColorType || p.hair_color_type || null,
    created_at: p.createdAt || new Date().toISOString(),
    updated_at: p.updatedAt || new Date().toISOString()
  };
}

export function fromSupabaseProduct(row) {
  return {
    id: row.id,
    code: row.SKU || row.code || '',
    barcode: row.barcode || '',
    name: row.name || '',
    image: row.image_url || '',
    imageUrl: row.image_url || '',
    category: row.category || '',
    subCategory: row.subcategory || '',
    brand: row.brand || '',
    size: row.size || '',
    weight: row.weight || '',
    fda: row.fda_no || '',
    fdaNumber: row.fda_no || '',
    tis: row.tis_no || '',
    tisiNumber: row.tis_no || '',
    wholesalePrice: Number(row.wholesale_price || 0),
    retailPrice: Number(row.retail_price || 0),
    capFee: Number(row.cap_cost || 0),
    status: row.status || 'Active',
    description: row.description || '',
    highlight: row.highlights || '',
    highlights: row.highlights || '',
    howToUse: row.how_to_use || '',
    packageWidth: row.package_width != null ? row.package_width : '',
    packageLength: row.package_length != null ? row.package_length : '',
    packageHeight: row.package_height != null ? row.package_height : '',
    updatedBy: row.updated_by || '',
    editRemark: row.edit_remark || '',
    hairType: row.hair_type || '',
    stylingLevel: row.styling_level || '',
    hairBenefit: row.hair_benefit || '',
    productForm: row.product_form || '',
    hairColorType: row.hair_color_type || '',
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || row.created_at || new Date().toISOString()
  };
}

export function toSupabaseQuotation(q) {
  let custId = q.customerId && UUID_REGEX.test(String(q.customerId).trim()) ? String(q.customerId).trim() : null;
  if (!custId && q.customer?.id && UUID_REGEX.test(String(q.customer.id).trim())) {
    custId = String(q.customer.id).trim();
  }

  const salesName = q.salespersonName || q.salesName || '';
  const salesPhone = q.salespersonPhone || q.salesPhone || '';
  const projName = q.projectName || q.projName || '';
  const region = q.customerRegion || q.customer?.region || '';
  const approvedBy = q.approvedBy || null;
  const approvedAt = q.approvedDate || q.approvedAt || null;

  // Keep only customer fields in the document snapshot. Sales, project and
  // approval data have dedicated quotation columns and must not be duplicated
  // inside the JSON snapshot.
  const sourceCustomer = q.customer || {};
  const customerSnapshot = {
    name: sourceCustomer.name || '',
    companyName: sourceCustomer.companyName || '',
    branchType: sourceCustomer.branchType || 'head',
    branchName: sourceCustomer.branchName || '',
    branch: sourceCustomer.branch || q.customerBranch || '',
    region,
    taxId: sourceCustomer.taxId || '',
    phone: sourceCustomer.phone || '',
    email: sourceCustomer.email || '',
    address: sourceCustomer.address || '',
    note: sourceCustomer.note || ''
  };

  const vatRate = Number(q.vatRate ?? q.vat_rate ?? 7);
  const subtotal = Number(q.subtotal || 0);
  const discount = Number(q.discount || 0);
  const calculatedTax = vatRate > 0 ? Number(((subtotal - discount) * (vatRate / 100)).toFixed(2)) : 0;
  const taxAmount = Number(q.vatAmount ?? q.taxAmount ?? q.tax_amount ?? calculatedTax);
  const totalAmount = Number(q.totalAmount ?? q.total_amount ?? (subtotal - discount + taxAmount));

  return {
    id: ensureUuid(q.id),
    quotation_number: q.quotationNumber || q.quotation_number,
    document_type: q.documentType || q.document_type || q.doc_type || 'quotation',
    issued_date: q.issuedDate || q.issued_date || q.date || new Date().toISOString().slice(0, 10),
    valid_until: q.validUntilDate || q.valid_until || null,
    salesperson_name: salesName || null,
    salesperson_phone: salesPhone || null,
    project_name: projName || null,
    approved_by: approvedBy,
    approved_at: approvedAt,
    customer_accepted_at: q.customerAcceptedAt || q.customer_accepted_at || null,
    customer_id: custId,
    customer_snapshot: customerSnapshot,
    items: q.items || [],
    subtotal,
    discount,
    vat_rate: vatRate,
    tax_amount: taxAmount,
    total_amount: totalAmount,
    status: q.status || 'draft',
    notes: q.notes || q.note || null,
    created_by: salesName || q.createdBy || q.created_by || null,
    created_at: q.createdAt || q.created_at || new Date().toISOString(),
    updated_at: q.updatedAt || q.updated_at || new Date().toISOString()
  };
}

export function fromSupabaseQuotation(row) {
  // Legacy fallbacks allow existing rows to be read before the migration is run.
  const cust = row.customer_snapshot || row.customer_info || {};
  const region = cust.region || row.customer_region || cust.customerRegion || '';
  const salesName = row.salesperson_name || cust.salespersonName || cust.salesName || '';
  const salesPhone = row.salesperson_phone || cust.salespersonPhone || cust.salesPhone || '';
  const projName = row.project_name || cust.projectName || cust.projName || '';
  const approvedBy = row.approved_by || cust.approvedBy || '';
  const approvedDate = row.approved_at || cust.approvedDate || '';

  const subtotal = Number(row.subtotal || 0);
  const discount = Number(row.discount || 0);
  const vatRate = Number(row.vat_rate ?? 7);
  const taxAmount = Number(row.tax_amount || (vatRate > 0 ? ((subtotal - discount) * (vatRate / 100)).toFixed(2) : 0));
  const totalAmount = Number(row.total_amount || (subtotal - discount + taxAmount));

  return {
    id: row.id,
    quotationNumber: row.quotation_number,
    documentType: row.document_type || row.doc_type || 'quotation',
    issuedDate: row.issued_date || row.date ? String(row.issued_date || row.date) : '',
    validUntilDate: row.valid_until ? String(row.valid_until) : '',
    customerId: row.customer_id,
    customer: {
      ...cust,
      region,
      customerRegion: region,
      salespersonName: salesName,
      salespersonPhone: salesPhone,
      projectName: projName,
    },
    customerRegion: region,
    customerBranch: cust.branch || '',
    salespersonName: salesName,
    salespersonPhone: salesPhone,
    projectName: projName,
    approvedBy,
    approvedDate,
    customerAcceptedAt: row.customer_accepted_at || row.customerAcceptedAt || '',
    items: (row.items || []).map(item => ({ ...item, discountType: item.discountType || 'percent' })),
    subtotal,
    discount,
    vatRate,
    taxAmount,
    vatAmount: taxAmount,
    totalAmount,
    status: row.status || 'draft',
    notes: row.notes || '',
    note: row.notes || '',
    createdBy: row.created_by || '',
    pdfUrl: row.pdf_url || '',
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || row.created_at || new Date().toISOString()
  };
}

export function toSupabaseCustomer(c) {
  return {
    id: ensureUuid(c.id),
    name: c.name || 'ไม่มีชื่อ',
    company_name: c.companyName || c.company_name || null,
    branch_type: c.branchType || c.branch_type || 'head',
    branch_name: c.branchName || c.branch_name || null,
    tax_id: c.taxId || c.tax_id || null,
    phone: c.phone || null,
    email: c.email || null,
    address: c.address || null,
    region: c.region || null,
    note: c.note || null,
    created_at: c.createdAt || c.created_at || new Date().toISOString(),
    updated_at: c.updatedAt || c.updated_at || new Date().toISOString()
  };
}

export function fromSupabaseCustomer(row) {
  return {
    id: row.id,
    name: row.name,
    companyName: row.company_name || '',
    branchType: row.branch_type || 'head',
    branchName: row.branch_name || '',
    taxId: row.tax_id || '',
    phone: row.phone || '',
    email: row.email || '',
    address: row.address || '',
    region: row.region || '',
    note: row.note || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at
  };
}

export const COMPANY_SINGLETON_ID = '00000000-0000-0000-0000-000000000001';

export function toSupabaseCompanyInfo(c) {
  return {
    id: COMPANY_SINGLETON_ID,
    name: c.name || '',
    address: c.address || '',
    tax_id: c.taxId || c.tax_id || '',
    phone: c.phone || '',
    email: c.email || '',
    website: c.website || '',
    logo_url: c.logo || c.logo_url || '',
    signature_image_url: c.signatureImage || c.signature_image_url || c.stampImage || c.stamp_image_url || '',
    signer_title: c.signerTitle || c.signer_title || 'ผู้อนุมัติ',
    updated_at: new Date().toISOString()
  };
}

export function fromSupabaseCompanyInfo(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name || '',
    nameEn: row.name_en || '',
    address: row.address || '',
    taxId: row.tax_id || '',
    phone: row.phone || '',
    mobile: row.mobile || '',
    email: row.email || '',
    website: row.website || '',
    logo: row.logo_url || '',
    stampImage: row.stamp_image_url || '',
    signatureImage: row.signature_image_url || '',
    signerTitle: row.signer_title || 'ผู้อนุมัติ',
    signerName: row.signer_name || '',
    updatedAt: row.updated_at || row.created_at
  };
}

// Load entire database snapshot from Supabase
export async function loadDatabaseFromSupabase() {
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    const [
      { data: products },
      { data: categories },
      { data: subcategories },
      { data: brands },
      { data: customers },
      { data: quotations },
      { data: users },
      { data: activityLog },
      { data: companyInfoRows }
    ] = await Promise.all([
      supabase.from('products').select('*').order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('name'),
      supabase.from('subcategories').select('*').order('name'),
      supabase.from('brands').select('*').order('name'),
      supabase.from('customers').select('*').order('created_at', { ascending: false }),
      supabase.from('quotations').select('*').order('created_at', { ascending: false }),
      supabase.from('app_users').select('*').order('created_at', { ascending: true }),
      supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('company_info').select('*').order('updated_at', { ascending: false }).limit(1)
    ]);

    // Format subcategories as dictionary { [categoryName]: [sub1, sub2] }
    const subcategoryMap = {};
    (subcategories || []).forEach(sub => {
      const cat = sub.category_name;
      if (!subcategoryMap[cat]) subcategoryMap[cat] = [];
      if (!subcategoryMap[cat].includes(sub.name)) {
        subcategoryMap[cat].push(sub.name);
      }
    });

    return {
      products: (products || []).map(fromSupabaseProduct),
      brands: (brands || []).map(b => b.name),
      categories: (categories || []).map(c => c.name),
      subcategories: subcategoryMap,
      customers: (customers || []).map(fromSupabaseCustomer),
      quotations: (quotations || []).map(fromSupabaseQuotation),
      companyInfo: (companyInfoRows && companyInfoRows[0]) ? fromSupabaseCompanyInfo(companyInfoRows[0]) : null,
      users: (users || []).map(u => ({
        id: u.id,
        username: u.username,
        name: u.Employee_name || u.name || '',
        role: u.role,
        passwordHash: u.password_hash,
        permissions: u.permissions,
        createdBy: u.created_by || '',
        createdAt: u.created_at
      })),
      activityLog: (activityLog || []).map(log => ({
        id: log.id,
        userName: log.user_name,
        userRole: log.user_role,
        action: log.action,
        details: log.details,
        timestamp: log.created_at
      }))
    };
  } catch (error) {
    console.error('Failed to load snapshot from Supabase:', error);
    return null;
  }
}

// Save a collection directly to Supabase
export async function saveCollectionToSupabase(key, data) {
  if (!isSupabaseConfigured || !supabase) return false;

  try {
    if (key === 'products') {
      // Full sync: upsert current items and remove deleted items
      const incomingList = Array.isArray(data) ? data : [];

      // Query existing products to detect deleted products or replaced images
      const { data: existingRows } = await supabase.from('products').select('id, image_url');
      const existingMap = new Map((existingRows || []).map(r => [r.id, r.image_url]));

      // 1. If an existing product's image was replaced or removed, delete the old file from Storage!
      for (const p of incomingList) {
        if (p.id && existingMap.has(p.id)) {
          const oldUrl = existingMap.get(p.id);
          const newUrl = p.image || p.imageUrl || p.image_url || '';
          if (oldUrl && oldUrl !== newUrl) {
            await deleteStorageImage(oldUrl);
          }
        }
      }

      // 2. If products are being deleted, delete their images from Storage too!
      const keepIds = incomingList.map(p => p.id).filter(Boolean);
      const toDeleteRows = (existingRows || []).filter(e => !keepIds.includes(e.id));
      if (toDeleteRows.length > 0) {
        for (const row of toDeleteRows) {
          if (row.image_url) await deleteStorageImage(row.image_url);
        }
      }

      if (incomingList.length === 0) {
        await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        return true;
      }

      // Fetch categories, subcategories, brands to map foreign key IDs directly!
      const [{ data: cats }, { data: subs }, { data: brs }] = await Promise.all([
        supabase.from('categories').select('id, name'),
        supabase.from('subcategories').select('id, name, category_name'),
        supabase.from('brands').select('id, name')
      ]);
      const catMap = Object.fromEntries((cats || []).map(c => [(c.name || '').trim().toLowerCase(), c.id]));
      const brandMap = Object.fromEntries((brs || []).map(b => [(b.name || '').trim().toLowerCase(), b.id]));
      const subMap = {};
      const fallbackSubMap = {};
      (subs || []).forEach(s => {
        const key = `${(s.category_name || '').trim().toLowerCase()}__${(s.name || '').trim().toLowerCase()}`;
        subMap[key] = s.id;
        if (s.name) fallbackSubMap[(s.name || '').trim().toLowerCase()] = s.id;
      });

      const rows = incomingList.map(p => {
        const row = toSupabaseProduct(p);
        const catKey = (p.category || '').trim().toLowerCase();
        const brandKey = (p.brand || '').trim().toLowerCase();
        const subRaw = (p.subCategory || p.subcategory || '').trim().toLowerCase();
        const subKey = `${catKey}__${subRaw}`;
        if (catMap[catKey]) row.category_id = catMap[catKey];
        if (brandMap[brandKey]) row.brand_id = brandMap[brandKey];
        if (subMap[subKey]) {
          row.subcategory_id = subMap[subKey];
        } else if (fallbackSubMap[subRaw]) {
          row.subcategory_id = fallbackSubMap[subRaw];
        }
        return row;
      });
      // Upsert in batches of 50
      for (let i = 0; i < rows.length; i += 50) {
        const batch = rows.slice(i, i + 50);
        const { error } = await supabase.from('products').upsert(batch, { onConflict: 'id' });
        if (error) throw error;
      }

      // Delete items not in incomingList
      if (toDeleteRows.length > 0) {
        await supabase.from('products').delete().in('id', toDeleteRows.map(e => e.id));
      }
      return true;
    }

    if (key === 'quotations') {
      const incomingList = Array.isArray(data) ? data : [];
      if (incomingList.length === 0) {
        await supabase.from('quotations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        return true;
      }

      const rows = incomingList.map(toSupabaseQuotation);
      for (let i = 0; i < rows.length; i += 50) {
        let batch = rows.slice(i, i + 50);
        if (quotationHasCustomerAcceptedAt === false) {
          batch = batch.map(({ customer_accepted_at, ...rest }) => rest);
        }
        let { error } = await supabase.from('quotations').upsert(batch, { onConflict: 'id' });
        if (error && error.message && error.message.includes('customer_accepted_at')) {
          quotationHasCustomerAcceptedAt = false;
          const sanitizedBatch = batch.map(({ customer_accepted_at, ...rest }) => rest);
          const retry = await supabase.from('quotations').upsert(sanitizedBatch, { onConflict: 'id' });
          error = retry.error;
        } else if (!error && quotationHasCustomerAcceptedAt === null) {
          quotationHasCustomerAcceptedAt = true;
        }
        if (error) {
          console.error('Supabase quotation upsert error:', error);
          throw error;
        }
      }

      const keepIds = rows.map(r => r.id).filter(Boolean);
      if (keepIds.length > 0) {
        const { data: existing } = await supabase.from('quotations').select('id');
        const toDelete = (existing || []).filter(e => !keepIds.includes(e.id)).map(e => e.id);
        if (toDelete.length > 0) {
          await supabase.from('quotations').delete().in('id', toDelete);
        }
      }
      return true;
    }

    if (key === 'customers') {
      const incomingList = Array.isArray(data) ? data : [];
      if (incomingList.length === 0) {
        await supabase.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        return true;
      }
      const rows = incomingList.map(toSupabaseCustomer);
      const { error } = await supabase.from('customers').upsert(rows, { onConflict: 'id' });
      if (error) throw error;

      const keepIds = rows.map(c => c.id).filter(Boolean);
      if (keepIds.length > 0) {
        const { data: existing } = await supabase.from('customers').select('id');
        const toDelete = (existing || []).filter(e => !keepIds.includes(e.id)).map(e => e.id);
        if (toDelete.length > 0) {
          await supabase.from('customers').delete().in('id', toDelete);
        }
      }
      return true;
    }

    if (key === 'brands') {
      const names = Array.isArray(data) ? data.map(String).filter(Boolean) : [];
      if (names.length > 0) {
        await supabase.from('brands').upsert(names.map(name => ({ name })), { onConflict: 'name' });
        const { data: currentBrands } = await supabase.from('brands').select('id, name');
        const toDelete = (currentBrands || []).filter(b => !names.includes(b.name)).map(b => b.id);
        if (toDelete.length > 0) {
          await supabase.from('brands').delete().in('id', toDelete);
        }
      } else {
        await supabase.from('brands').delete().neq('name', '___NON_EXISTENT___');
      }
      return true;
    }

    if (key === 'categories') {
      const names = Array.isArray(data) ? data.map(String).filter(Boolean) : [];
      if (names.length > 0) {
        await supabase.from('categories').upsert(names.map(name => ({ name })), { onConflict: 'name' });
        const { data: currentCats } = await supabase.from('categories').select('id, name');
        const toDelete = (currentCats || []).filter(c => !names.includes(c.name)).map(c => c.id);
        if (toDelete.length > 0) {
          await supabase.from('categories').delete().in('id', toDelete);
        }
      } else {
        await supabase.from('categories').delete().neq('name', '___NON_EXISTENT___');
      }
      return true;
    }

    if (key === 'subcategories') {
      // data is { [catName]: [sub1, sub2] }
      const { data: cats } = await supabase.from('categories').select('id, name');
      const catMap = Object.fromEntries((cats || []).map(c => [(c.name || '').trim().toLowerCase(), c.id]));

      const rows = [];
      for (const [catName, subList] of Object.entries(data || {})) {
        const cleanCat = (catName || '').trim();
        const catKey = cleanCat.toLowerCase();
        let catId = catMap[catKey];
        if (!catId && cleanCat) {
          // If category not exists yet, insert/upsert it
          const { data: newCat } = await supabase.from('categories').upsert({ name: cleanCat }, { onConflict: 'name' }).select('id').single();
          catId = newCat?.id;
          if (catId) catMap[catKey] = catId;
        }
        if (catId && Array.isArray(subList)) {
          for (const sub of subList) {
            if (sub && typeof sub === 'string' && sub.trim()) {
              rows.push({ category_id: catId, category_name: cleanCat, name: sub.trim() });
            }
          }
        }
      }

      // Fetch existing subcategories to keep their IDs intact
      const { data: currentSubs } = await supabase.from('subcategories').select('id, category_name, name');
      const existingKeyMap = new Map();
      (currentSubs || []).forEach(s => {
        const k = `${(s.category_name || '').trim().toLowerCase()}__${(s.name || '').trim().toLowerCase()}`;
        existingKeyMap.set(k, s.id);
      });

      const incomingKeySet = new Set();
      const toInsert = [];
      for (const r of rows) {
        const k = `${(r.category_name || '').trim().toLowerCase()}__${(r.name || '').trim().toLowerCase()}`;
        incomingKeySet.add(k);
        if (!existingKeyMap.has(k)) {
          toInsert.push(r);
        }
      }

      const toDeleteIds = (currentSubs || [])
        .filter(s => !incomingKeySet.has(`${(s.category_name || '').trim().toLowerCase()}__${(s.name || '').trim().toLowerCase()}`))
        .map(s => s.id);

      if (toDeleteIds.length > 0) {
        await supabase.from('subcategories').delete().in('id', toDeleteIds);
      }
      if (toInsert.length > 0) {
        await supabase.from('subcategories').insert(toInsert);
      }

      // Automatically re-link products whose subcategory_id might be missing
      await syncProductSubcategoryIds().catch(() => {});
      return true;
    }

    if (key === 'users') {
      const incomingList = Array.isArray(data) ? data : [];
      const rows = incomingList.map(u => ({
        id: u.id || undefined,
        username: u.username,
        Employee_name: u.name || u.Employee_name || '',
        role: u.role || 'user',
        password_hash: u.passwordHash,
        permissions: u.permissions || {},
        created_by: u.createdBy || u.created_by || null
      }));
      if (rows.length > 0) {
        const { error: upsertErr } = await supabase.from('app_users').upsert(rows, { onConflict: 'username' });
        if (upsertErr) throw upsertErr;
      }

      // Delete users in Supabase that are NOT in incomingList
      const keepUsernames = incomingList.map(u => u.username).filter(Boolean);
      if (keepUsernames.length > 0) {
        const { data: existing } = await supabase.from('app_users').select('username');
        const toDelete = (existing || []).filter(e => !keepUsernames.includes(e.username)).map(e => e.username);
        if (toDelete.length > 0) {
          const { error: delErr } = await supabase.from('app_users').delete().in('username', toDelete);
          if (delErr) console.error('Supabase user delete error:', delErr);
        }
      }
      return true;
    }

    if (key === 'activityLog') {
      const incomingList = Array.isArray(data) ? data : [];
      if (incomingList.length === 0) {
        await supabase.from('activity_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        return true;
      }
      // If this is a clear action (only 1 audit log about clearing logs), wipe previous logs from Supabase first
      if (incomingList.length === 1 && (incomingList[0].action || '').includes('ล้างประวัติการดำเนินงานทั้งหมด')) {
        await supabase.from('activity_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      }
      const rows = incomingList.map(item => ({
        id: ensureUuid(item.id),
        user_name: item.userName || item.user_name || 'System',
        user_role: item.userRole || item.user_role || 'system',
        action: item.action || '',
        details: item.details || null,
        created_at: item.timestamp || item.created_at || new Date().toISOString()
      }));
      for (let i = 0; i < rows.length; i += 50) {
        const batch = rows.slice(i, i + 50);
        const { error } = await supabase.from('activity_logs').upsert(batch, { onConflict: 'id' });
        if (error) console.error('Supabase activityLog upsert error:', error);
      }
      return true;
    }

    if (key === 'companyInfo') {
      const companyData = { ...(data || {}) };
      if (companyData.logo && String(companyData.logo).startsWith('data:image/')) {
        companyData.logo = await uploadBase64ToStorage(companyData.logo, 'company-assets', 'logo.png');
      }
      if (companyData.signatureImage && String(companyData.signatureImage).startsWith('data:image/')) {
        const sigUrl = await uploadBase64ToStorage(companyData.signatureImage, 'company-assets', 'signature.png');
        companyData.signatureImage = sigUrl;
      }

      const row = toSupabaseCompanyInfo(companyData);
      const { error } = await supabase.from('company_info').upsert(row, { onConflict: 'id' });
      if (error) {
        console.error('Supabase company_info upsert error:', error);
        throw error;
      }
      return true;
    }

    return true;
  } catch (error) {
    console.error(`Error saving ${key} to Supabase:`, error);
    return false;
  }
}

// Initial migration from local db.json to Supabase if Supabase is empty
export async function migrateInitialData(localDb) {
  if (!isSupabaseConfigured || !supabase || !localDb) return;

  try {
    const { count } = await supabase.from('app_users').select('*', { count: 'exact', head: true });
    if (count === 0 && Array.isArray(localDb.users) && localDb.users.length > 0) {
      console.log('🔄 Migrating initial users to Supabase...');
      await saveCollectionToSupabase('users', localDb.users);
    }

    const { count: catCount } = await supabase.from('categories').select('*', { count: 'exact', head: true });
    if (catCount === 0 && Array.isArray(localDb.categories) && localDb.categories.length > 0) {
      console.log('🔄 Migrating initial categories & brands to Supabase...');
      await saveCollectionToSupabase('categories', localDb.categories);
      if (localDb.subcategories) await saveCollectionToSupabase('subcategories', localDb.subcategories);
      if (localDb.brands) await saveCollectionToSupabase('brands', localDb.brands);
    }
  } catch (error) {
    console.warn('Initial migration notice:', error.message);
  }
}

// Repair or link subcategory_id on products table from subcategories table
export async function syncProductSubcategoryIds() {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    const [{ data: subs }, { data: prods }] = await Promise.all([
      supabase.from('subcategories').select('id, name, category_name'),
      supabase.from('products').select('id, category, subcategory, subcategory_id')
    ]);

    const subMap = {};
    const fallbackSubMap = {};
    (subs || []).forEach(s => {
      const key = `${(s.category_name || '').trim().toLowerCase()}__${(s.name || '').trim().toLowerCase()}`;
      subMap[key] = s.id;
      if (s.name) fallbackSubMap[(s.name || '').trim().toLowerCase()] = s.id;
    });

    for (const p of (prods || [])) {
      const catKey = (p.category || '').trim().toLowerCase();
      const subRaw = (p.subcategory || '').trim().toLowerCase();
      const subKey = `${catKey}__${subRaw}`;
      const targetId = subMap[subKey] || fallbackSubMap[subRaw];
      if (targetId && p.subcategory_id !== targetId) {
        await supabase.from('products').update({ subcategory_id: targetId }).eq('id', p.id);
      }
    }
  } catch (err) {
    console.error('syncProductSubcategoryIds error:', err);
  }
}
