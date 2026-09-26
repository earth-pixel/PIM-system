import 'dotenv/config';
import { Buffer } from 'node:buffer';
import process from 'node:process';
import express from 'express';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { createStore, keys, publicDB, publicUser, revision } from './store.js';
import { validateProduct, normalizeCode, ownsDocument, calculateQuotation } from '../src/utils/validation.js';
import {
  isSupabaseConfigured,
  loadDatabaseFromSupabase,
  saveCollectionToSupabase,
  migrateInitialData,
  uploadBase64ToStorage
} from './supabaseSync.js';

const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const digest = value => createHash('sha256').update(value).digest('hex');
const validId = id => (typeof id === 'string' && id.length > 0 && id.length <= 200) || (typeof id === 'number' && Number.isSafeInteger(id));
const quotationBranchInfo = customer => {
  const value = customer && typeof customer === 'object' ? customer : {};
  const rawBranch = String(value.branch || '').trim();
  const rawName = String(value.branchName || '').trim().replace(/^สาขา\s*/, '');
  const isSub = value.branchType === 'sub' || (rawBranch && !rawBranch.includes('สำนักงานใหญ่') && rawBranch !== 'Head Office');
  const fallbackName = rawBranch.replace(/^สาขา\s*/, '').trim();
  const branchName = isSub ? (rawName || (fallbackName !== 'ย่อย' ? fallbackName : '')) : '';
  return {
    branchType: isSub ? 'sub' : 'head',
    branchName,
    branch: isSub ? (branchName ? `สาขา ${branchName}` : 'สาขาย่อย') : 'สำนักงานใหญ่'
  };
};
const hashPassword = password => {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
};
function passwordMatches(user, password) {
  if (typeof password !== 'string' || password.length > 256) return false;
  if (!user.passwordHash) return typeof user.password === 'string' && timingSafeEqual(Buffer.from(digest(user.password)), Buffer.from(digest(password)));
  const [salt, encoded] = user.passwordHash.split(':');
  const expected = Buffer.from(encoded, 'hex');
  return expected.length === 64 && timingSafeEqual(expected, scryptSync(password, salt, 64));
}
const canApprove = (user) => Boolean(
  user && (
    user.role === 'admin' ||
    user.role === 'manager' ||
    user.permissions?.actions?.['quotations.approve']
  )
);
const canRead = (q, user) => user.role === 'admin' || user.role === 'manager' || ownsDocument(q, user) || q.status === 'approved' || (canApprove(user) && q.status === 'sent');
function visibleDB(db, user) {
  const result = publicDB(db);
  result.quotations = result.quotations.filter(q => canRead(q, user));
  if (user.role !== 'admin') result.activityLog = [];
  return result;
}
function appendLog(db, user, action, details = null) {
  db.activityLog = [{ id: randomUUID(), userName: user.name || user.username, userRole: user.role, action, details, timestamp: new Date().toISOString() }, ...(db.activityLog || [])].slice(0, 200);
}
function logCollectionChange(db, user, key, before) {
  const labels = {
    products: 'สินค้า',
    users: 'ผู้ใช้',
    quotations: 'เอกสารใบเสนอราคา',
    brands: 'แบรนด์',
    categories: 'หมวดหมู่',
    subcategories: 'หมวดหมู่ย่อย',
    activityLog: 'ประวัติการดำเนินงาน',
    customers: 'ข้อมูลลูกค้า',
    companyInfo: 'ข้อมูลบริษัท'
  };

  const after = db[key] || (['subcategories', 'companyInfo'].includes(key) ? {} : []);

  // Special case: clearing activityLog
  if (key === 'activityLog') {
    if (Array.isArray(before) && before.length > 0 && Array.isArray(after) && after.length === 0) {
      appendLog(db, user, `ล้างประวัติการดำเนินงานทั้งหมดในระบบ`, {
        type: 'activityLog',
        actionType: 'delete',
        changes: [
          {
            field: 'ประวัติกิจกรรมในระบบ',
            before: `มีข้อมูลประวัติเดิม ${before.length} รายการ`,
            after: 'ล้างข้อมูลออกจากระบบแล้ว'
          }
        ],
        remark: 'ผู้ดูแลระบบ (Admin) ทำการล้างประวัติการดำเนินงานทั้งหมดในระบบ'
      });
    }
    return;
  }

  if (!Array.isArray(after)) {
    appendLog(db, user, `บันทึก${labels[key] || key}`, { type: key });
    return;
  }

  const identity = value => typeof value === 'object' ? value.id : value;
  const changes = [];
  const addedItems = [];
  const modifiedItems = [];
  const deletedItems = [];

  for (const value of after) {
    const previous = Array.isArray(before) ? before.find(old => identity(old) === identity(value)) : undefined;
    if (!previous) {
      addedItems.push(value);
      const name = typeof value === 'object' ? (value.name ? `${value.name}${value.code ? ` (${value.code})` : ''}` : value.quotationNumber || value.username || value.code || 'รายการใหม่') : value;
      changes.push({ field: String(name), before: '-', after: 'เพิ่มใหม่ในระบบ' });
    } else if (!same(previous, value)) {
      modifiedItems.push({ previous, value });
      const name = typeof value === 'object' ? (value.name ? `${value.name}${value.code ? ` (${value.code})` : ''}` : value.quotationNumber || value.username || value.code || 'รายการ') : value;
      if (typeof value === 'object') {
        const FIELD_MAP = {
          name: 'ชื่อ', code: 'รหัส SKU', username: 'ชื่อผู้ใช้', role: 'สิทธิ์', brand: 'แบรนด์', category: 'หมวดหมู่',
          retailPrice: 'ราคาขายปลีก', wholesalePrice: 'ราคาขายส่ง', capFee: 'ค่าฝา', status: 'สถานะ', totalAmount: 'ยอดรวม',
          permissions: 'สิทธิ์การเข้าถึงหน้า/ปุ่ม',
          phone: 'เบอร์โทร', email: 'อีเมล', companyName: 'ชื่อบริษัท', taxId: 'เลขผู้เสียภาษี', address: 'ที่อยู่', note: 'หมายเหตุ',
          packageWidth: 'ความกว้างพัสดุ (ซม.)', packageLength: 'ความยาวพัสดุ (ซม.)', packageHeight: 'ความสูงพัสดุ (ซม.)',
          fdaNumber: 'หมายเลข อย.', tisiNumber: 'มอก.',
          hairType: 'ประเภทเส้นผม', stylingLevel: 'ระดับการจัดทรง', hairBenefit: 'ประโยชน์ดูแลผม',
          productForm: 'รูปแบบผลิตภัณฑ์', hairColorType: 'ประเภทสีผม', editRemark: 'หมายเหตุการแก้ไข'
        };
        for (const [fKey, fLabel] of Object.entries(FIELD_MAP)) {
          if (!same(previous[fKey], value[fKey])) {
            if (fKey === 'permissions') {
              changes.push({ field: `${name}: ${fLabel}`, before: 'สิทธิ์เดิม', after: 'กำหนดสิทธิ์การใช้งานใหม่' });
            } else {
              changes.push({ field: `${name}: ${fLabel}`, before: String(previous[fKey] ?? '-'), after: String(value[fKey] ?? '-') });
            }
          }
        }
        if (previous.image !== value.image) changes.push({ field: `${name}: รูปภาพ`, before: '(รูปเดิม)', after: '(รูปใหม่)' });
        if (previous.passwordHash !== value.passwordHash) changes.push({ field: `${name}: รหัสผ่าน`, before: '********', after: 'เปลี่ยนรหัสผ่าน' });
      }
    }
  }

  if (Array.isArray(before)) {
    for (const value of before) {
      if (!after.some(newValue => identity(newValue) === identity(value))) {
        deletedItems.push(value);
        let itemLabel = '';
        let beforeDesc = 'มีข้อมูลอยู่ในระบบ';
        if (typeof value === 'object') {
          if (key === 'products') {
            itemLabel = `${value.name || 'สินค้า'}${value.code ? ` [SKU: ${value.code}]` : ''}`;
            beforeDesc = value.brand ? `แบรนด์ ${value.brand} (ราคา ${Number(value.retailPrice || 0).toLocaleString()} บาท)` : 'มีข้อมูลสินค้าในระบบ';
          } else if (key === 'quotations') {
            itemLabel = `เอกสาร ${value.quotationNumber || value.id}${value.customer?.name ? ` (ลูกค้า: ${value.customer.name})` : ''}`;
            beforeDesc = `สถานะเดิม: ${value.status || '-'}`;
          } else if (key === 'users') {
            itemLabel = `ผู้ใช้ ${value.name || value.username} (สิทธิ์: ${value.role || 'user'})`;
            beforeDesc = `บัญชีผู้ใช้: ${value.username}`;
          } else if (key === 'customers') {
            itemLabel = `ลูกค้า ${value.name || 'ลูกค้า'}${value.companyName ? ` (${value.companyName})` : ''}`;
            beforeDesc = `เบอร์โทร: ${value.phone || '-'}`;
          } else {
            itemLabel = value.name || value.id || 'รายการเดิม';
          }
        } else {
          itemLabel = String(value);
        }

        changes.push({
          field: `ลบข้อมูล: ${itemLabel}`,
          before: beforeDesc,
          after: 'ลบออกจากระบบแล้ว'
        });
      }
    }
  }

  // Generate action title clearly indicating add/edit/delete
  let actionTitle = '';
  if (deletedItems.length > 0 && addedItems.length === 0 && modifiedItems.length === 0) {
    if (after.length === 0 && before.length > 1) {
      actionTitle = `ลบข้อมูล${labels[key] || key}ทั้งหมด (${before.length} รายการ)`;
    } else if (deletedItems.length === 1) {
      const d = deletedItems[0];
      const dName = typeof d === 'object' ? (d.name ? `${d.name}${d.code ? ` (${d.code})` : ''}` : d.quotationNumber || d.username || d.code || '1 รายการ') : d;
      actionTitle = `ลบ${labels[key] || key}: ${dName}`;
    } else {
      actionTitle = `ลบ${labels[key] || key} (${deletedItems.length} รายการ)`;
    }
  } else if (addedItems.length > 0 && deletedItems.length === 0 && modifiedItems.length === 0) {
    if (addedItems.length === 1) {
      const a = addedItems[0];
      const aName = typeof a === 'object' ? (a.name ? `${a.name}${a.code ? ` (${a.code})` : ''}` : a.quotationNumber || a.username || a.code || '1 รายการ') : a;
      actionTitle = `เพิ่ม${labels[key] || key}ใหม่: ${aName}`;
    } else {
      actionTitle = `เพิ่ม${labels[key] || key}ใหม่ (${addedItems.length} รายการ)`;
    }
  } else if (modifiedItems.length > 0 && addedItems.length === 0 && deletedItems.length === 0) {
    if (modifiedItems.length === 1) {
      const m = modifiedItems[0].value;
      const mName = typeof m === 'object' ? (m.name ? `${m.name}${m.code ? ` (${m.code})` : ''}` : m.quotationNumber || m.username || m.code || '1 รายการ') : m;
      actionTitle = `แก้ไขข้อมูล${labels[key] || key}: ${mName}`;
    } else {
      actionTitle = `แก้ไขข้อมูล${labels[key] || key} (${modifiedItems.length} รายการ)`;
    }
  } else {
    actionTitle = `อัปเดตข้อมูล${labels[key] || key}`;
  }

  appendLog(db, user, actionTitle, {
    type: key,
    actionType: deletedItems.length > 0 ? 'delete' : addedItems.length > 0 ? 'add' : 'edit',
    changes: changes.slice(0, 200)
  });
}
function rememberQuotationNumbers(db) {
  db._quotationSequences ||= {};
  for (const q of db.quotations || []) {
    const match = /^QT-(\d{8})-(\d+)$/.exec(q.quotationNumber || '');
    if (match) db._quotationSequences[match[1]] = Math.max(db._quotationSequences[match[1]] || 0, Number(match[2]));
  }
}
function checkVersion(db, key, expected) {
  // Disabled version conflict check per user request
}
function normalizeUsers(incoming, db, caller) {
  const old = db.users || [];
  const names = new Set(), ids = new Set();
  const result = incoming.map(raw => {
    if (!raw || typeof raw !== 'object') fail(400, 'ข้อมูลผู้ใช้ไม่ถูกต้อง');
    const before = old.find(u => raw.id ? u.id === raw.id : u.username === raw.username);
    const username = normalizeCode(raw.username);
    if (typeof raw.username !== 'string' || !username || typeof raw.name !== 'string' || !raw.name.trim() || !['admin', 'manager', 'user'].includes(raw.role) || names.has(username)) fail(400, 'ชื่อผู้ใช้ซ้ำหรือข้อมูลไม่ครบถ้วน');
    const candidate = {
      ...before,
      id: before?.id || randomUUID(),
      username,
      name: raw.name.trim(),
      role: raw.role,
      ...(before && before.createdBy !== undefined ? { createdBy: before.createdBy } : (!before ? { createdBy: raw.createdBy || caller?.name || caller?.username || null } : {})),
      ...(before && before.createdAt !== undefined ? { createdAt: before.createdAt } : (!before ? { createdAt: new Date().toISOString() } : {}))
    };
    if (raw.permissions !== undefined) candidate.permissions = raw.permissions;
    if (ids.has(candidate.id)) fail(400, 'รหัสผู้ใช้ซ้ำ');
    ids.add(candidate.id);
    const changed = !before || !same(publicUser(before), publicUser(candidate)) || Boolean(raw.password);
    if (changed && caller.role !== 'admin') {
      const self = before?.id === caller.id;
      if (self ? candidate.role !== before.role : !(caller.role === 'manager' && (!before || before.role === 'user') && candidate.role === 'user')) fail(403, 'ไม่มีสิทธิ์แก้ไขผู้ใช้นี้');
      if (self && raw.password) fail(400, 'กรุณาเปลี่ยนรหัสผ่านจากเมนูบัญชี โดยยืนยันรหัสผ่านปัจจุบัน');
    }
    if (raw.password) {
      if (typeof raw.password !== 'string' || raw.password.length < 8 || raw.password.length > 256) fail(400, 'รหัสผ่านใหม่ต้องมี 8–256 ตัวอักษร');
      candidate.passwordHash = hashPassword(raw.password);
    } else if (!before) fail(400, 'กรุณาระบุรหัสผ่านผู้ใช้ใหม่');
    delete candidate.password;
    return candidate;
  });
  const removed = old.filter(u => !result.some(v => v.id === u.id));
  if (removed.length && caller.role !== 'admin') fail(403, 'เฉพาะ Admin เท่านั้นที่ลบผู้ใช้ได้');
  if (removed.some(u => u.id === caller.id)) fail(400, 'ไม่สามารถลบบัญชีที่กำลังใช้งาน');
  if (!result.some(u => u.role === 'admin')) fail(400, 'ระบบต้องมี Admin อย่างน้อยหนึ่งบัญชี');
  for (const user of result) {
    const before = old.find(u => u.id === user.id);
    if (before && before.username !== user.username) db.quotations = (db.quotations || []).map(q => q.createdBy === before.username ? { ...q, createdBy: user.username } : q);
  }
  return result;
}
function normalizeQuotations(incoming, db, user) {
  rememberQuotationNumbers(db);
  const old = db.quotations || [];
  const ids = new Set();
  const visible = old.filter(q => canRead(q, user));
  for (const removed of visible.filter(q => !incoming.some(n => n.id === q.id))) {
    if (removed.status === 'sent') fail(400, 'ไม่สามารถลบเอกสารที่รออนุมัติ');
    if (user.role !== 'admin' && (!ownsDocument(removed, user) || (removed.documentType !== 'product_proposal' && removed.status === 'approved'))) fail(403, 'ไม่มีสิทธิ์ลบเอกสารนี้');
  }
  const hidden = old.filter(q => !canRead(q, user));
  const numbers = new Set(old.map(q => q.quotationNumber));
  const result = incoming.map(raw => {
    if (!raw || !validId(raw.id) || ids.has(raw.id)) fail(400, 'รหัสเอกสารซ้ำหรือไม่ถูกต้อง');
    ids.add(raw.id);
    const before = old.find(q => q.id === raw.id);
    if (before && !canRead(before, user)) fail(403, 'ไม่มีสิทธิ์เข้าถึงเอกสาร');
    if (before && same(before, raw)) return before;
    const isApprovalAction = before && ['approved', 'rejected'].includes(raw.status) && (before.status === 'sent' || before.status === 'draft') && canApprove(user);
    if (before && user.role !== 'admin' && !isApprovalAction && (!ownsDocument(before, user) || (before.documentType !== 'product_proposal' && before.status === 'approved'))) fail(403, 'ไม่มีสิทธิ์แก้ไขเอกสารนี้');
    const type = raw.documentType || 'quotation';
    if (!['quotation', 'product_proposal'].includes(type) || !['draft', 'sent', 'approved', 'rejected'].includes(raw.status)) fail(400, 'ประเภทหรือสถานะเอกสารไม่ถูกต้อง');
    if (before && before.documentType !== type) fail(400, 'ไม่สามารถเปลี่ยนประเภทเอกสารเดิม');
    if (type === 'quotation' && ['approved', 'rejected'].includes(raw.status) && !canApprove(user)) fail(403, 'เฉพาะ Admin หรือผู้มีสิทธิ์เท่านั้นที่อนุมัติหรือปฏิเสธใบเสนอราคาได้');
    if (type === 'quotation' && raw.status === 'rejected' && before?.status !== 'sent' && before?.status !== 'draft') fail(400, 'ปฏิเสธได้เฉพาะเอกสารที่รออนุมัติ');
    const branch = quotationBranchInfo(raw.customer);
    if (type === 'quotation' && branch.branchType === 'sub' && !branch.branchName) fail(400, 'กรุณาระบุชื่อหรือรหัสสาขาย่อย');
    const normalizedRaw = type === 'quotation'
      ? {
          ...raw,
          salespersonName: raw.salespersonName || before?.salespersonName || '',
          salespersonPhone: raw.salespersonPhone || before?.salespersonPhone || '',
          projectName: raw.projectName || before?.projectName || '',
          customer: { ...(raw.customer || {}), ...branch },
          customerBranch: branch.branch,
          customerRegion: raw.customerRegion || raw.customer?.region || ''
        }
      : raw;
    const issuedDate = before?.issuedDate || new Date().toLocaleDateString('sv-SE');
    if (type === 'quotation' && raw.status !== 'draft' && raw.status !== 'rejected') {
      for (const key of ['name', 'companyName', 'phone', 'taxId', 'address']) if (!String(normalizedRaw.customer?.[key] || '').trim()) fail(400, 'กรุณากรอกข้อมูลลูกค้าให้ครบถ้วน');
      for (const key of ['salespersonName', 'projectName']) if (!String(normalizedRaw[key] || '').trim()) fail(400, 'กรุณากรอกข้อมูลพนักงานขายและโครงการ');
      if (raw.status === 'sent' && (!before || before.status === 'draft')) {
        const phoneVal = String(normalizedRaw.salespersonPhone || '').trim();
        if (!phoneVal) fail(400, 'กรุณากรอกข้อมูลพนักงานขายและโครงการ');
      }
      const validUntil = raw.validUntilDate || before?.validUntilDate || '';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(validUntil) || !Number.isFinite(Date.parse(validUntil)) || new Date(validUntil).toISOString().slice(0, 10) !== validUntil || validUntil < issuedDate) fail(400, 'วันหมดอายุต้องเป็นวันที่จริงและไม่ก่อนวันออกเอกสาร');
    }
    let quotationNumber = before?.quotationNumber;
    if (!quotationNumber) {
      const day = issuedDate.replaceAll('-', '');
      db._quotationSequences ||= {};
      let sequence = Math.max(db._quotationSequences[day] || 0, ...old.filter(q => q.quotationNumber?.startsWith(`QT-${day}-`)).map(q => Number(q.quotationNumber.split('-').at(-1)) || 0));
      do { quotationNumber = `QT-${day}-${String(++sequence).padStart(4, '0')}`; } while (numbers.has(quotationNumber));
      db._quotationSequences[day] = sequence;
      numbers.add(quotationNumber);
    }
    let calculated;
    try { calculated = calculateQuotation({ ...normalizedRaw, documentType: type }); }
    catch (error) { fail(400, error.message); }
    return { ...calculated, quotationNumber, issuedDate, createdAt: before?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(), createdBy: before?.createdBy || user.username, approvedBy: raw.status === 'approved' ? (raw.approvedBy || user.name || user.username) : undefined, approvedDate: raw.status === 'approved' ? (raw.approvedDate || new Date().toISOString()) : undefined, customerAcceptedAt: before?.customerAcceptedAt };
  });
  return [...result, ...hidden];
}

export function createApi(dbPath) {
  // An Express sub-app also supplies req/res helpers when mounted in Vite Connect.
  const api = express();
  const store = createStore(dbPath);
  const sessions = new Map();
  const cookieName = 'pim_session';

  const isTest = process.env.NODE_ENV === 'test' || (typeof dbPath === 'string' && (dbPath.includes('pim-system-test-') || dbPath.includes('Temp') || dbPath.includes('temp')));
  const useSupabase = isSupabaseConfigured && !isTest;

  // Background startup sync with Supabase
  if (useSupabase) {
    loadDatabaseFromSupabase().then(supaData => {
      if (supaData && supaData.users && supaData.users.length > 0) {
        store.transact(current => {
          current = current || {};
          // Preserve any local users (e.g. ea) not yet present in Supabase
          const supaUsernames = new Set((supaData.users || []).map(u => u.username));
          const missingInSupa = ((current.users) || []).filter(u => !supaUsernames.has(u.username));
          if (missingInSupa.length > 0) {
            supaData.users = [...supaData.users, ...missingInSupa];
            saveCollectionToSupabase('users', supaData.users).catch(() => { });
          }

          // Auto-link subcategories from products to ensure master category table has them
          supaData.subcategories ||= {};
          for (const p of (supaData.products || [])) {
            const cat = p.category;
            const sub = p.subCategory || p.subcategory;
            if (cat && typeof sub === 'string' && sub.trim()) {
              supaData.subcategories[cat] ||= [];
              if (!supaData.subcategories[cat].includes(sub.trim())) {
                supaData.subcategories[cat].push(sub.trim());
              }
            }
          }
          Object.assign(current, supaData);
          return current;
        });
        console.log('✅ Synchronized state from Supabase on startup.');
      } else {
        migrateInitialData(store.read());
      }
    }).catch(err => console.warn('Supabase initial sync error:', err.message));
  }

  api.use(express.json({ limit: '50mb' }));
  api.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    const origin = process.env.PIM_PUBLIC_ORIGIN || `${req.protocol}://${req.get('host')}`;
    if (!['GET', 'HEAD'].includes(req.method) && req.headers.origin && req.headers.origin !== origin) return res.status(403).json({ error: 'ไม่อนุญาตคำขอจากเว็บไซต์อื่น' });
    next();
  });
  const tokenFrom = req => (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  const auth = (req, res, next) => {
    const token = tokenFrom(req), session = sessions.get(token);
    const user = session && store.read().users?.find(u => u.id === session.userId);
    if (!user || session.expires < Date.now() || session.credentials !== user.passwordHash) { sessions.delete(token); return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบอีกครั้ง' }); }
    req.user = user;
    req.session = session;
    next();
  };
  const cookieOptions = req => ({ httpOnly: true, sameSite: 'strict', secure: req.secure || Boolean(process.env.PIM_PUBLIC_ORIGIN?.startsWith('https://')), path: '/', maxAge: 8 * 60 * 60 * 1000 });
  api.post('/auth/login', (req, res) => {
    const now = Date.now();
    const username = normalizeCode(req.body?.username);
    const db = store.read(), candidate = db.users?.find(u => normalizeCode(u.username) === username);
    if (!candidate || !passwordMatches(candidate, req.body?.password)) fail(401, 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    const user = store.transact(current => {
      const matching = current.users.find(u => normalizeCode(u.username) === username);
      if (!matching || !passwordMatches(matching, req.body.password)) fail(401, 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      for (const entry of current.users) {
        entry.id ||= randomUUID();
        if (!entry.passwordHash && typeof entry.password === 'string') entry.passwordHash = hashPassword(entry.password);
        delete entry.password;
      }
      return matching;
    });
    for (const [token, session] of sessions) if (session.expires < now) sessions.delete(token);
    const token = randomBytes(32).toString('hex');
    sessions.set(token, { userId: user.id, credentials: user.passwordHash, expires: now + 8 * 60 * 60 * 1000 });
    res.cookie(cookieName, token, cookieOptions(req)).json({ user: publicUser(user) });
  });
  api.post('/auth/logout', (req, res) => { sessions.delete(tokenFrom(req)); res.clearCookie(cookieName, { path: '/' }).json({ success: true }); });
  api.get('/auth/session', auth, (req, res) => res.json({ user: publicUser(req.user) }));
  api.post('/auth/password', auth, (req, res) => {
    const { oldPassword, newPassword } = req.body || {};
    if (!passwordMatches(req.user, oldPassword)) fail(400, 'รหัสผ่านปัจจุบันไม่ถูกต้อง');
    if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 256) fail(400, 'รหัสผ่านใหม่ต้องมี 8–256 ตัวอักษร');
    const hash = hashPassword(newPassword);
    const db = store.transact(db => { const user = db.users.find(u => u.id === req.user.id); user.passwordHash = hash; delete user.password; appendLog(db, user, 'เปลี่ยนรหัสผ่าน'); return db; });
    if (useSupabase) {
      saveCollectionToSupabase('users', db.users).catch(() => { });
      saveCollectionToSupabase('activityLog', db.activityLog).catch(() => { });
    }
    req.session.credentials = hash;
    res.json({ success: true, ...visibleDB(db, db.users.find(u => u.id === req.user.id)) });
  });
  const shareFingerprint = q => revision({ ...q, customerAcceptedAt: undefined });
  function resolveShare(db, token) {
    if (!/^[a-f0-9]{64}$/.test(token || '')) fail(404, 'ลิงก์ไม่ถูกต้อง');
    const share = db._shares?.[digest(token)];
    const q = share && db.quotations?.find(q => q.id === share.id);
    if (!q || share.expires < Date.now() || q.status !== 'approved' || share.version !== shareFingerprint(q) || (q.validUntilDate && q.validUntilDate < new Date().toLocaleDateString('sv-SE'))) fail(410, 'ลิงก์หมดอายุ เอกสารถูกแก้ไข หรือยกเลิกแล้ว');
    return q;
  }
  api.get('/public/quotations/:token', (req, res) => res.json({ quotation: resolveShare(store.read(), req.params.token) }));
  api.get('/public/company', (req, res) => res.json({ companyInfo: store.read().companyInfo || null }));
  api.post('/company/upload-asset', async (req, res) => {
    try {
      const { assetType, base64 } = req.body || {};
      const validTypes = ['logo', 'signature', 'stamp'];
      const targetType = validTypes.includes(assetType) ? assetType : 'signature';

      if (!base64 || typeof base64 !== 'string' || !base64.startsWith('data:image/')) {
        return res.status(400).json({ error: 'ไม่พบข้อมูลรูปภาพที่ถูกต้อง' });
      }

      const url = await uploadBase64ToStorage(base64, 'company-assets', `${targetType}.png`);
      if (url && url.startsWith('http')) {
        return res.json({ success: true, url });
      }
      return res.status(500).json({ error: 'ไม่สามารถอัปโหลดไปยัง Storage ได้' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });
  api.post('/public/quotations/:token/accept', (req, res) => {
    const quotation = store.transact(db => {
      const q = resolveShare(db, req.params.token);
      if (!q.customerAcceptedAt) { q.customerAcceptedAt = new Date().toISOString(); appendLog(db, { name: q.customer?.name || 'ลูกค้าจากลิงก์', role: 'customer' }, `ลูกค้ายอมรับเอกสาร ${q.quotationNumber}`); }
      return q;
    });
    if (useSupabase) {
      saveCollectionToSupabase('quotations', store.read().quotations).catch(() => { });
      saveCollectionToSupabase('activityLog', store.read().activityLog).catch(() => { });
    }
    res.json({ success: true, quotation });
  });
  api.use(auth);
  api.get('/db', async (req, res) => {
    try {
      if (useSupabase) {
        const supaData = await loadDatabaseFromSupabase();
        if (supaData) {
          store.transact(current => {
            current = current || {};
            Object.assign(current, supaData);
            return current;
          });
        }
      }
    } catch (e) {
      console.warn('Supabase fetch error, fallback to store:', e.message);
    }
    res.json(visibleDB(store.read(), req.user));
  });
  api.post('/catalog/:key', (req, res) => {
    if (req.user.role !== 'admin') fail(403, 'เฉพาะ Admin เท่านั้น');
    const key = req.params.key;
    if (!['brands', 'categories'].includes(key)) fail(404, 'ไม่พบรายการ');
    const { oldName, newName } = req.body || {};
    const result = store.transact(db => {
      if (!db[key].includes(oldName)) fail(409, 'ชื่อเดิมถูกเปลี่ยนแล้ว กรุณาโหลดข้อมูลล่าสุด');
      const field = key === 'brands' ? 'brand' : 'category';
      if (newName === null) {
        if (db.products.some(p => p[field] === oldName)) fail(400, 'ยังมีสินค้าใช้ชื่อนี้อยู่ กรุณาเปลี่ยนสินค้าไปใช้ชื่ออื่นก่อนลบ');
        db[key] = db[key].filter(name => name !== oldName);
        if (key === 'categories' && db.subcategories) delete db.subcategories[oldName];
      } else {
        if (typeof newName !== 'string' || !newName.trim() || db[key].some(name => name !== oldName && normalizeCode(name) === normalizeCode(newName))) fail(400, 'ชื่อใหม่ซ้ำหรือไม่ถูกต้อง');
        db[key] = db[key].map(name => name === oldName ? newName.trim() : name);
        db.products = db.products.map(p => p[field] === oldName ? { ...p, [field]: newName.trim() } : p);
        if (key === 'categories' && db.subcategories && db.subcategories[oldName]) {
          db.subcategories[newName.trim()] = db.subcategories[oldName];
          delete db.subcategories[oldName];
        }
      }
      appendLog(db, req.user, `แก้ไข ${key}: ${oldName}`);
      return db;
    });
    if (useSupabase) {
      saveCollectionToSupabase('brands', result.brands).catch(() => { });
      saveCollectionToSupabase('categories', result.categories).catch(() => { });
      saveCollectionToSupabase('products', result.products).catch(() => { });
      if (result.subcategories) saveCollectionToSupabase('subcategories', result.subcategories).catch(() => { });
    }
    res.json({ success: true, ...visibleDB(result, req.user) });
  });
  api.post('/db/save', (req, res) => {
    const { key, data, expectedRevision } = req.body || {};
    if (!keys.includes(key) || (key !== 'subcategories' && key !== 'companyInfo' && !Array.isArray(data))) fail(400, 'รูปแบบข้อมูลไม่ถูกต้อง');
    const result = store.transact(db => {
      checkVersion(db, key, expectedRevision);
      const before = db[key] || (['subcategories', 'companyInfo'].includes(key) ? {} : []);
      if (['brands', 'categories', 'subcategories', 'activityLog'].includes(key) && req.user.role !== 'admin') fail(403, 'เฉพาะ Admin เท่านั้น');
      if (key === 'companyInfo' && req.user.role !== 'admin' && !req.user.permissions?.pages?.company) fail(403, 'ไม่มีสิทธิ์แก้ไขข้อมูลบริษัท');
      if (key === 'products') {
        if (!['admin', 'manager', 'user'].includes(req.user.role)) fail(403, 'ไม่มีสิทธิ์แก้ไขสินค้า');
        if (data.some(product => !product || !validId(product.id))) fail(400, 'รหัสรายการสินค้าไม่ถูกต้อง');
        if (req.user.role !== 'admin' && db.products.some(p => !data.some(n => n.id === p.id))) fail(403, 'เฉพาะ Admin ที่ลบสินค้าได้');
        const codes = new Set(), ids = new Set(), now = new Date().toISOString();
        for (const product of data) {
          if (!product || !validId(product.id) || ids.has(product.id)) fail(400, 'รหัสรายการสินค้าซ้ำหรือว่าง');
          ids.add(product.id);
          const code = normalizeCode(product.code);
          if (!code || codes.has(code)) fail(400, `SKU ซ้ำหรือว่าง: ${product.code || '-'}`);
          codes.add(code);
          if (typeof product === 'object' && product !== null) {
            product.createdAt ||= now;
            product.updatedAt ||= product.createdAt || now;
          }
          const before = db.products.find(p => p.id === product.id);
          if (!same(before, product)) { const errors = validateProduct(product); if (errors.length) fail(400, `${product.code}: ${errors.join(', ')}`); }
        }
        db.products = data;
        db.brands = [...new Set([...(db.brands || []), ...data.map(p => p.brand).filter(Boolean)])];
        db.categories = [...new Set([...(db.categories || []), ...data.map(p => p.category).filter(Boolean)])];
        db.subcategories ||= {};
        for (const product of data) {
          const cat = product.category;
          const sub = product.subCategory || product.subcategory;
          if (cat && typeof sub === 'string' && sub.trim()) {
            db.subcategories[cat] ||= [];
            if (!db.subcategories[cat].includes(sub.trim())) {
              db.subcategories[cat].push(sub.trim());
            }
          }
        }
      } else if (key === 'subcategories') {
        if (!data || typeof data !== 'object' || Array.isArray(data)) fail(400, 'ข้อมูลหมวดหมู่ย่อยไม่ถูกต้อง');
        db.subcategories = data;
      } else if (key === 'users') db.users = normalizeUsers(data, db, req.user);
      else if (key === 'quotations') db.quotations = normalizeQuotations(data, db, req.user);
      else if (key === 'activityLog') {
        if (data.length > 1) fail(400, 'ประวัติแก้ไขย้อนหลังไม่ได้');
        db.activityLog = [];
      } else if (key === 'companyInfo') {
        if (!data || typeof data !== 'object') fail(400, 'ข้อมูลบริษัทไม่ถูกต้อง');
        db.companyInfo = {
          ...(db.companyInfo || {}),
          ...data,
          updatedAt: new Date().toISOString(),
          updatedBy: req.user.username
        };
      } else if (key === 'customers') {
        if (!Array.isArray(data)) fail(400, 'ข้อมูลลูกค้าไม่ถูกต้อง');
        const now = new Date().toISOString();
        db.customers = data.map(c => ({
          ...c,
          id: c.id || randomUUID(),
          name: typeof c.name === 'string' ? c.name.trim() : '',
          companyName: typeof c.companyName === 'string' ? c.companyName.trim() : '',
          phone: typeof c.phone === 'string' ? c.phone.trim() : '',
          email: typeof c.email === 'string' ? c.email.trim() : '',
          taxId: typeof c.taxId === 'string' ? c.taxId.trim() : '',
          address: typeof c.address === 'string' ? c.address.trim() : '',
          note: typeof c.note === 'string' ? c.note.trim() : '',
          createdAt: c.createdAt || now,
          updatedAt: now,
          updatedBy: req.user.username
        }));
      } else {
        if (data.some(v => typeof v !== 'string' || !v.trim()) || new Set(data.map(normalizeCode)).size !== data.length) fail(400, 'ชื่อซ้ำหรือไม่ถูกต้อง');
        db[key] = data.map(v => v.trim());
      }
      logCollectionChange(db, req.user, key, before);
      return db;
    });
    if (useSupabase) {
      if (key === 'products') {
        (async () => {
          try {
            await Promise.all([
              saveCollectionToSupabase('brands', result.brands).catch(() => { }),
              saveCollectionToSupabase('categories', result.categories).catch(() => { })
            ]);
            if (result.subcategories) {
              await saveCollectionToSupabase('subcategories', result.subcategories).catch(() => { });
            }
            await saveCollectionToSupabase('products', result.products);
          } catch (err) {
            console.error('Supabase products sync error:', err);
          }
        })();
      } else {
        saveCollectionToSupabase(key, result[key]).catch(err => console.error('Supabase sync error:', err));
      }
      if (result.activityLog) {
        saveCollectionToSupabase('activityLog', result.activityLog).catch(err => console.error('Supabase activityLog sync error:', err));
      }
      if (key === 'categories' && result.subcategories) {
        saveCollectionToSupabase('subcategories', result.subcategories).catch(() => { });
      }
    }
    const updatedUser = result.users.find(u => u.id === req.user.id);
    // Explicit password changes revoke every existing session, including this one.
    res.json({ success: true, ...visibleDB(result, updatedUser || req.user), user: updatedUser ? publicUser(updatedUser) : undefined });
  });
  api.post('/db/activityLog/append', (req, res) => {
    const action = req.body?.entry?.action;
    if (typeof action !== 'string' || !action.trim() || action.length > 4000) fail(400, 'ข้อความประวัติไม่ถูกต้อง');
    const db = store.transact(db => { appendLog(db, req.user, action); return db; });
    if (useSupabase) saveCollectionToSupabase('activityLog', db.activityLog).catch(() => { });
    res.json({ success: true, ...visibleDB(db, req.user) });
  });
  api.post('/quotations/archive-delete', (req, res) => {
    if (req.user.role !== 'admin') fail(403, 'เฉพาะ Admin เท่านั้นที่ลบเอกสารเก่าได้');
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || !ids.length || ids.length > 10000) fail(400, 'กรุณาเลือกเอกสาร');
    const skipped = [];
    const result = store.transact(db => {
      rememberQuotationNumbers(db);
      const deleted = new Set();
      for (const id of new Set(ids)) {
        const q = db.quotations.find(q => String(q.id) === String(id));
        if (!q || q.status === 'sent') skipped.push({ id, reason: q ? 'เอกสารกำลังรออนุมัติ' : 'ไม่พบเอกสาร' });
        else deleted.add(q.id);
      }
      if (!deleted.size) fail(400, 'ไม่มีเอกสารที่ลบได้');
      db.quotations = db.quotations.filter(q => !deleted.has(q.id));
      appendLog(db, req.user, `ลบเอกสารเก่า ${deleted.size} รายการ`);
      return { db, count: deleted.size };
    });
    if (useSupabase) saveCollectionToSupabase('quotations', result.db.quotations).catch(() => { });
    res.json({ success: true, ...visibleDB(result.db, req.user), deletedCount: result.count, skippedCount: skipped.length, skipped });
  });
  api.post('/quotations/:id/share', (req, res) => {
    const token = randomBytes(32).toString('hex');
    store.transact(db => {
      const q = db.quotations.find(q => String(q.id) === req.params.id);
      if (!q || !canRead(q, req.user)) fail(404, 'ไม่พบเอกสาร');
      if (q.status !== 'approved' || (q.validUntilDate && q.validUntilDate < new Date().toLocaleDateString('sv-SE'))) fail(400, 'แชร์ได้เฉพาะเอกสารอนุมัติที่ยังไม่หมดอายุ');
      db._shares ||= {};
      for (const [key, value] of Object.entries(db._shares)) if (value.expires < Date.now()) delete db._shares[key];
      db._shares[digest(token)] = { id: q.id, version: shareFingerprint(q), expires: Date.now() + 7 * 86400000 };
    });
    res.json({ token });
  });
  // Unknown API routes continue to the authenticated export/download handlers.
  api.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    res.status(error.status || 500).json({ error: error.status ? error.message : 'บันทึกหรืออ่านข้อมูลไม่สำเร็จ กรุณาลองใหม่' });
  });
  return api;
}
