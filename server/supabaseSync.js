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
    fda_no: p.fda || p.fdaNo || p.fda_no || null,
    tis_no: p.tis || p.tisNo || p.tis_no || null,
    wholesale_price: Number(p.wholesalePrice || p.wholesale_price || 0),
    retail_price: Number(p.retailPrice || p.retail_price || 0),
    cap_cost: Number(p.capFee || p.cap_cost || 0),
    stock: Number(p.stock || 0),
    status: p.status || 'Active',
    description: p.description || null,
    highlights: p.highlight || p.highlights || null,
    how_to_use: p.howToUse || p.how_to_use || null,
    created_at: p.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString()
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
    tis: row.tis_no || '',
    wholesalePrice: Number(row.wholesale_price || 0),
    retailPrice: Number(row.retail_price || 0),
    capFee: Number(row.cap_cost || 0),
    stock: Number(row.stock || 0),
    status: row.status || 'Active',
    description: row.description || '',
    highlight: row.highlights || '',
    howToUse: row.how_to_use || '',
    createdAt: row.created_at || new Date().toISOString()
  };
}

export function toSupabaseQuotation(q) {
  const custId = q.customerId && UUID_REGEX.test(String(q.customerId).trim()) ? String(q.customerId).trim() : null;
  const salesName = q.salespersonName || q.salesName || '';
  const salesPhone = q.salespersonPhone || q.salesPhone || '';
  const projName = q.projectName || q.projName || '';
  const region = q.customerRegion || q.customer?.region || '';
  const approvedBy = q.approvedBy || null;
  const approvedAt = q.approvedDate || q.approvedAt || null;

  const customerInfo = {
    ...(q.customer || {}),
    region,
    customerRegion: region,
    salespersonName: salesName,
    salespersonPhone: salesPhone,
    projectName: projName,
    approvedBy: approvedBy || '',
    approvedDate: approvedAt || ''
  };

  return {
    id: ensureUuid(q.id),
    quotation_number: q.quotationNumber || q.quotation_number,
    doc_type: q.documentType || q.doc_type || 'quotation',
    date: q.issuedDate || q.date || new Date().toISOString().slice(0, 10),
    valid_until: q.validUntilDate || q.valid_until || null,
    salesperson_name: salesName || null,
    salesperson_phone: salesPhone || null,
    project_name: projName || null,
    customer_region: region || null,
    approved_by: approvedBy,
    approved_at: approvedAt,
    customer_id: custId,
    customer_info: customerInfo,
    items: q.items || [],
    subtotal: Number(q.subtotal || 0),
    discount: Number(q.discount || 0),
    vat_rate: Number(q.vatRate ?? q.vat_rate ?? 7),
    tax_amount: Number(q.taxAmount ?? q.tax_amount ?? 0),
    total_amount: Number(q.totalAmount ?? q.total_amount ?? 0),
    status: q.status || 'draft',
    notes: q.notes || q.note || null,
    created_by: q.createdBy || q.created_by || null,
    created_at: q.createdAt || new Date().toISOString()
  };
}

export function fromSupabaseQuotation(row) {
  const cust = row.customer_info || {};
  const region = row.customer_region || cust.customerRegion || cust.region || '';
  const salesName = row.salesperson_name || cust.salespersonName || cust.salesName || '';
  const salesPhone = row.salesperson_phone || cust.salespersonPhone || cust.salesPhone || '';
  const projName = row.project_name || cust.projectName || cust.projName || '';
  const approvedBy = row.approved_by || cust.approvedBy || '';
  const approvedDate = row.approved_at || cust.approvedDate || '';

  return {
    id: row.id,
    quotationNumber: row.quotation_number,
    documentType: row.doc_type || 'quotation',
    issuedDate: row.date ? String(row.date) : '',
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
    items: row.items || [],
    subtotal: Number(row.subtotal || 0),
    discount: Number(row.discount || 0),
    vatRate: Number(row.vat_rate ?? 7),
    taxAmount: Number(row.tax_amount ?? 0),
    totalAmount: Number(row.total_amount ?? 0),
    status: row.status || 'draft',
    notes: row.notes || '',
    note: row.notes || '',
    createdBy: row.created_by || '',
    pdfUrl: row.pdf_url || '',
    createdAt: row.created_at || new Date().toISOString()
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
    note: c.note || null,
    created_at: c.createdAt || new Date().toISOString()
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
    note: row.note || '',
    createdAt: row.created_at
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
      { data: activityLog }
    ] = await Promise.all([
      supabase.from('products').select('*').order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('name'),
      supabase.from('subcategories').select('*').order('name'),
      supabase.from('brands').select('*').order('name'),
      supabase.from('customers').select('*').order('created_at', { ascending: false }),
      supabase.from('quotations').select('*').order('created_at', { ascending: false }),
      supabase.from('app_users').select('*').order('created_at', { ascending: true }),
      supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(200)
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
      users: (users || []).map(u => ({
        id: u.id,
        username: u.username,
        name: u.Employee_name || u.name || '',
        role: u.role,
        passwordHash: u.password_hash,
        permissions: u.permissions,
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
      (subs || []).forEach(s => {
        const key = `${(s.category_name || '').trim().toLowerCase()}__${(s.name || '').trim().toLowerCase()}`;
        subMap[key] = s.id;
      });

      const rows = incomingList.map(p => {
        const row = toSupabaseProduct(p);
        const catKey = (p.category || '').trim().toLowerCase();
        const brandKey = (p.brand || '').trim().toLowerCase();
        const subKey = `${catKey}__${(p.subCategory || p.subcategory || '').trim().toLowerCase()}`;
        if (catMap[catKey]) row.category_id = catMap[catKey];
        if (brandMap[brandKey]) row.brand_id = brandMap[brandKey];
        if (subMap[subKey]) row.subcategory_id = subMap[subKey];
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
        const batch = rows.slice(i, i + 50);
        const { error } = await supabase.from('quotations').upsert(batch, { onConflict: 'id' });
        if (error) throw error;
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

      const keepIds = incomingList.map(c => c.id).filter(Boolean);
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
      const catMap = Object.fromEntries((cats || []).map(c => [c.name, c.id]));

      const rows = [];
      for (const [catName, subList] of Object.entries(data || {})) {
        let catId = catMap[catName];
        if (!catId) {
          // If category not exists yet, insert/upsert it
          const { data: newCat } = await supabase.from('categories').upsert({ name: catName }, { onConflict: 'name' }).select('id').single();
          catId = newCat?.id;
          if (catId) catMap[catName] = catId;
        }
        if (catId && Array.isArray(subList)) {
          for (const sub of subList) {
            if (sub && typeof sub === 'string') rows.push({ category_id: catId, category_name: catName, name: sub.trim() });
          }
        }
      }

      await supabase.from('subcategories').delete().neq('name', '___NON_EXISTENT___');
      if (rows.length > 0) {
        await supabase.from('subcategories').insert(rows);
      }
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
        permissions: u.permissions || {}
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
      const rows = incomingList.map(item => ({
        id: item.id || randomUUID(),
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
