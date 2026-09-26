import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import ExcelJS from 'exceljs';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { createApi } from '../server/api.js';
import { revision } from '../server/store.js';
import { readArchiveResponse } from '../src/utils/archiveResponse.js';
import { findHeaderRow, parseNumericCell, validateProduct, mergeImportedProducts, ownsDocument, calculateQuotation } from '../src/utils/validation.js';
import { fromSupabaseCustomer, fromSupabaseQuotation, toSupabaseCustomer, toSupabaseQuotation } from '../server/supabaseSync.js';

const today = new Date().toLocaleDateString('sv-SE');
const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString('sv-SE');
const product = (code = 'A') => ({ id: code, code, name: 'Same name', barcode: code, brand: 'Brand', category: 'Category', weight: '1 kg', size: '1 L', description: 'Description', highlights: 'Highlights', howToUse: 'Use', image: '/image.jpg', fdaNumber: '-', tisiNumber: '-', retailPrice: 100, wholesalePrice: 50, capFee: 0, status: 'Active' });
const quotation = (id = 'q1', owner = 'ann') => ({ id, createdBy: owner, documentType: 'quotation', quotationNumber: `QT-${today.replaceAll('-', '')}-0002`, issuedDate: today, validUntilDate: tomorrow, status: 'draft', customer: { name: 'Customer', companyName: 'Company', phone: '000', taxId: '000', address: 'Address' }, salespersonName: owner, salespersonPhone: '000', projectName: 'Project', items: [{ id: 'line', productName: 'Product', quantity: 2, unitPrice: 100, discount: 0, discountType: 'percent', lineTotal: 200 }], subtotal: 200, vatRate: 7, vatAmount: 14, totalAmount: 214 });
function fixture() {
  return { products: [product()], brands: ['Brand'], categories: ['Category'], users: ['admin', 'manager', 'ann', 'joann'].map((username, i) => ({ username, name: username, password: 'fixture-password', role: i === 0 ? 'admin' : i === 1 ? 'manager' : 'user' })), quotations: [quotation()], activityLog: [] };
}

test('Supabase customer and quotation mappings have one clear source per field', () => {
  const customerRow = toSupabaseCustomer({
    id: 'customer-1', name: 'Customer', companyName: 'Company', region: 'Central', updatedAt: '2026-09-18T03:00:00.000Z'
  });
  assert.equal(customerRow.region, 'Central');
  assert.equal(fromSupabaseCustomer(customerRow).region, 'Central');

  const quotationRow = toSupabaseQuotation({
    ...quotation(),
    customerRegion: 'Central',
    approvedBy: 'Admin',
    approvedDate: '2026-09-18T03:00:00.000Z'
  });
  assert.equal(quotationRow.document_type, 'quotation');
  assert.equal(quotationRow.issued_date, today);
  assert.equal(quotationRow.customer_snapshot.region, 'Central');
  assert.equal('customer_region' in quotationRow, false);
  assert.equal('customer_accepted_at' in quotationRow, false);
  assert.equal('pdf_url' in quotationRow, false);
  assert.equal('salespersonName' in quotationRow.customer_snapshot, false);
  assert.equal('projectName' in quotationRow.customer_snapshot, false);
  assert.equal('approvedBy' in quotationRow.customer_snapshot, false);

  const restored = fromSupabaseQuotation(quotationRow);
  assert.equal(restored.customer.region, 'Central');
  assert.equal(restored.salespersonName, 'ann');
  assert.equal(restored.projectName, 'Project');
  assert.equal(restored.approvedBy, 'Admin');
});
async function setup(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pim-system-test-'));
  const dbPath = path.join(dir, 'db.json');
  fs.writeFileSync(dbPath, JSON.stringify(fixture()));
  const app = express();
  app.use('/api', createApi(dbPath));
  app.get('/{*path}', (_req, res) => res.send('frontend'));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    for (const file of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, file));
    fs.rmdirSync(dir);
  });
  const url = `http://127.0.0.1:${server.address().port}`;
  const call = async (endpoint, body, cookie, headers = {}) => {
    const response = await fetch(url + '/api' + endpoint, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0], cookieHeader: response.headers.get('set-cookie') };
  };
  const login = async (username = 'admin') => { const result = await call('/auth/login', { username, password: 'fixture-password' }); assert.equal(result.status, 200); return result.cookie; };
  const save = async (cookie, key, data, expectedRevision) => {
    const version = expectedRevision || (await call('/db', undefined, cookie)).data._revisions[key];
    return call('/db/save', { key, data, expectedRevision: version }, cookie);
  };
  return { call, login, save, dbPath, url };
}

test('authentication: deny anonymous APIs, hash legacy credentials, no secret fields, logout and CSRF', async t => {
  const { call, login, dbPath } = await setup(t);
  assert.equal((await call('/db')).status, 401);
  assert.equal((await call('/db/save', { key: 'users', data: [] })).status, 401);
  assert.equal((await call('/auth/login', { username: 'admin', password: 'wrong' })).status, 401);
  const cookie = await login();
  const result = await call('/db', undefined, cookie);
  assert.equal(result.status, 200);
  assert.ok(result.data.users.every(u => !('password' in u) && !('passwordHash' in u)));
  const stored = JSON.parse(fs.readFileSync(dbPath));
  assert.ok(stored.users.every(u => u.id && u.passwordHash && !u.password));
  assert.equal((await call('/db/save', { key: 'users', data: [] }, cookie, { Origin: 'https://attacker.example' })).status, 403);
  await call('/auth/logout', {}, cookie);
  assert.equal((await call('/db', undefined, cookie)).status, 401);
});

test('roles: user and manager can edit products but cannot delete products, promote oneself, spoof archive admin, or remove last admin', async t => {
  const { call, login, save } = await setup(t);
  const cookie = await login('ann');
  const snapshot = (await call('/db', undefined, cookie)).data;
  assert.equal((await save(cookie, 'users', snapshot.users.map(u => u.username === 'ann' ? { ...u, role: 'admin' } : u))).status, 403);
  assert.equal((await save(cookie, 'products', [{ ...product('A'), retailPrice: 125 }])).status, 200);
  assert.equal((await save(cookie, 'products', [product('X')])).status, 403);
  assert.equal((await call('/quotations/archive-delete', { ids: ['q1'], username: 'admin' }, cookie)).status, 403);
  const admin = await login();
  assert.equal((await save(admin, 'users', [])).status, 400);
  const manager = await login('manager');
  const users = (await call('/db', undefined, manager)).data.users;
  assert.equal((await save(manager, 'users', users.map(u => u.username === 'admin' ? { ...u, name: 'spoof' } : u))).status, 403);
  assert.equal((await save(manager, 'products', [product('X')])).status, 403);
});

test('CAS: saves proceed directly without revision blocking', async t => {
  const { login, call, save, dbPath } = await setup(t);
  const cookie = await login();
  const original = (await call('/db', undefined, cookie)).data;
  const first = await save(cookie, 'products', [{ ...product(), retailPrice: 125 }], original._revisions.products);
  assert.equal(first.status, 200);
  const second = await save(cookie, 'products', [{ ...product(), retailPrice: 150 }], original._revisions.products);
  assert.equal(second.status, 200);
  assert.equal(JSON.parse(fs.readFileSync(dbPath)).products[0].retailPrice, 150);
});

test('product validation and import: unique SKUs, explicit updates, invalid numbers', async t => {
  const { login, save } = await setup(t);
  const cookie = await login('manager');
  assert.equal((await save(cookie, 'products', [{ ...product(), retailPrice: -1 }])).status, 400);
  assert.equal((await save(cookie, 'products', [product(), { ...product(), id: 'other' }])).status, 400);
  assert.equal((await save(cookie, 'products', [{ ...product(), name: '' }])).status, 400);
  assert.equal((await save(cookie, 'products', [{ ...product(), packageWidth: -1 }])).status, 400);
  assert.equal((await save(cookie, 'products', [{ ...product(), code: { bad: 'type' } }])).status, 400);
  assert.equal((await save(cookie, 'products', [{ ...product(), id: { bad: 'type' } }])).status, 400);
  const merged = mergeImportedProducts([product()], [product('B')]);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].code, 'A');
  const updated = mergeImportedProducts([product()], [{ ...product(), retailPrice: 175, capFee: 0 }]);
  assert.equal(updated[0].retailPrice, 175);
  assert.equal(updated[0].id, 'A');
  assert.throws(() => mergeImportedProducts([], [product(), product()]), /SKU/);
  assert.ok(validateProduct({ ...product(), wholesalePrice: NaN }).length);
});

test('Excel header selection preserves first product and numeric parsing distinguishes blank/invalid/zero', () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Products');
  sheet.addRows([['SKU', 'Name', 'Price'], ['A', 'First', 100], ['B', 'Second', 200]]);
  const getValue = cell => String(cell.value ?? '');
  assert.equal(findHeaderRow(sheet, getValue).number, 1);
  const rows = [];
  sheet.eachRow((row, number) => { if (number > findHeaderRow(sheet, getValue).number) rows.push(row.getCell(1).value); });
  assert.deepEqual(rows, ['A', 'B']);
  const titled = workbook.addWorksheet('Title');
  titled.addRows([['Catalog'], ['SKU', 'Name', 'Price'], ['A', 'First', 100]]);
  assert.equal(findHeaderRow(titled, getValue).number, 2);
  assert.equal(parseNumericCell('1,234.50'), 1234.5);
  assert.equal(parseNumericCell('0'), 0);
  assert.equal(parseNumericCell(''), '');
  assert.ok(Number.isNaN(parseNumericCell('abc')));
  assert.ok(Number.isNaN(parseNumericCell('1,23')));
});

test('document ownership, validation and approval are checked by server', async t => {
  const { login, call, save } = await setup(t);
  assert.equal(ownsDocument(quotation('x', 'joann'), { username: 'ann', name: 'Ann' }), false);
  const ann = await login('ann');
  assert.equal((await save(ann, 'quotations', [{ ...quotation(), status: 'approved' }])).status, 403);
  const joann = await login('joann');
  assert.equal((await call('/db', undefined, joann)).data.quotations.length, 0);
  assert.equal((await save(joann, 'quotations', [{ ...quotation(), projectName: 'hijack' }])).status, 403);
  const admin = await login();
  const negative = quotation(); negative.items[0].discount = 150;
  assert.equal((await save(admin, 'quotations', [negative])).status, 400);
  const invalidDate = { ...quotation(), status: 'sent', validUntilDate: '2000-01-01' };
  assert.equal((await save(admin, 'quotations', [invalidDate])).status, 400);
  assert.equal((await save(admin, 'quotations', [{ ...quotation(), status: 'sent', validUntilDate: '2030-02-31' }])).status, 400);
  const falsifiedTotal = { ...quotation(), totalAmount: 1, subtotal: 1, vatAmount: 0 };
  const result = await save(admin, 'quotations', [falsifiedTotal]);
  assert.equal(result.status, 200);
  assert.equal(result.data.quotations[0].totalAmount, 214);
  assert.throws(() => calculateQuotation({ ...quotation(), items: [{ ...quotation().items[0], quantity: 0 }] }), /รายการ/);
});

test('quotation numbers never reuse deleted legacy numbers, including archive deletions', async t => {
  const { login, save, call } = await setup(t);
  const cookie = await login();
  assert.equal((await save(cookie, 'quotations', [])).status, 200);
  const created = await save(cookie, 'quotations', [{ ...quotation('new'), quotationNumber: 'spoofed' }]);
  assert.equal(created.status, 200);
  assert.ok(created.data.quotations[0].quotationNumber.endsWith('-0003'));
  assert.equal(created.data.quotations[0].createdBy, 'admin');
  assert.equal((await call('/quotations/archive-delete', { ids: ['new', 'new'], username: 'nobody' }, cookie)).data.deletedCount, 1);
  const next = await save(cookie, 'quotations', [{ ...quotation('newer'), quotationNumber: undefined }]);
  assert.ok(next.data.quotations[0].quotationNumber.endsWith('-0004'));
  const pending = { ...next.data.quotations[0], status: 'sent' };
  assert.equal((await save(cookie, 'quotations', [pending])).status, 200);
  assert.equal((await call('/quotations/archive-delete', { ids: ['newer'] }, cookie)).status, 400);
  assert.equal((await save(cookie, 'quotations', [])).status, 400);
});

test('public links: token authenticity, persisted/idempotent acceptance, edit invalidation', async t => {
  const { login, save, call, dbPath } = await setup(t);
  const cookie = await login();
  assert.equal((await call('/quotations/q1/share', {}, cookie)).status, 400);
  const approved = await save(cookie, 'quotations', [{ ...quotation(), status: 'approved' }]);
  assert.equal(approved.status, 200);
  const token = (await call('/quotations/q1/share', {}, cookie)).data.token;
  assert.match(token, /^[a-f0-9]{64}$/);
  assert.equal((await call('/public/quotations/' + token)).status, 200);
  assert.equal((await call('/public/quotations/' + '0'.repeat(64))).status, 410);
  assert.equal((await call('/public/quotations/eyJ0b3RhbCI6MX0')).status, 404);
  const accepted = await call('/public/quotations/' + token + '/accept', {});
  assert.equal(accepted.status, 200);
  const again = await call('/public/quotations/' + token + '/accept', {});
  assert.equal(again.data.quotation.customerAcceptedAt, accepted.data.quotation.customerAcceptedAt);
  const stored = JSON.parse(fs.readFileSync(dbPath));
  assert.ok(stored.quotations[0].customerAcceptedAt);
  assert.equal(stored.activityLog.filter(e => e.userRole === 'customer').length, 1);
  await save(cookie, 'quotations', [{ ...stored.quotations[0], projectName: 'Revised' }]);
  assert.equal((await call('/public/quotations/' + token)).status, 410);
});

test('password changes verify old password and revoke other sessions; renames preserve ownership', async t => {
  const { login, save, call } = await setup(t);
  const first = await login('ann'), second = await login('ann');
  assert.equal((await call('/auth/password', { oldPassword: 'wrong', newPassword: 'replacement-password' }, first)).status, 400);
  assert.equal((await call('/auth/password', { oldPassword: 'fixture-password', newPassword: 'replacement-password' }, first)).status, 200);
  assert.equal((await call('/db', undefined, first)).status, 200);
  assert.equal((await call('/db', undefined, second)).status, 401);
  const snapshot = (await call('/db', undefined, first)).data;
  const renamed = await save(first, 'users', snapshot.users.map(u => u.username === 'ann' ? { ...u, username: 'anne' } : u));
  assert.equal(renamed.status, 200);
  assert.equal(renamed.data.quotations[0].createdBy, 'anne');
  assert.equal((await call('/auth/session', undefined, first)).data.user.username, 'anne');
});

test('catalog rename is atomic and cannot delete referenced names', async t => {
  const { login, call, dbPath } = await setup(t);
  const cookie = await login();
  assert.equal((await call('/catalog/brands', { oldName: 'Brand', newName: null }, cookie)).status, 400);
  assert.equal((await call('/catalog/brands', { oldName: 'Brand', newName: 'Renamed' }, cookie)).status, 200);
  const stored = JSON.parse(fs.readFileSync(dbPath));
  assert.equal(stored.products[0].brand, 'Renamed');
  assert.deepEqual(stored.brands, ['Renamed']);
});

test('client cache quota never prevents server save; HTTP failures reject', async () => {
  globalThis.window = new EventTarget();
  globalThis.localStorage = { setItem() { throw new Error('QuotaExceededError'); }, removeItem() {} };
  const { cacheValue, acceptSnapshot, saveCollection } = await import('../src/utils/api.js');
  const originalFetch = globalThis.fetch;
  let requests = 0;
  try {
    cacheValue('pim_products', [product()]);
    acceptSnapshot({ _revisions: { products: revision([]) } });
    globalThis.fetch = async () => { requests++; return new Response(JSON.stringify({ success: true, _revisions: { products: revision([product()]) } }), { status: 200 }); };
    await saveCollection('products', [product()]);
    assert.equal(requests, 1);
    globalThis.fetch = async () => new Response(JSON.stringify({ error: 'disk full' }), { status: 500 });
    await assert.rejects(saveCollection('products', [product()]), /disk full/);
  } finally { globalThis.fetch = originalFetch; delete globalThis.window; delete globalThis.localStorage; }
});

test('production Express catch-all registers successfully', async t => {
  const { url } = await setup(t);
  assert.equal(await (await fetch(url + '/some/deep/link')).text(), 'frontend');
});

test('archive response failures never become a success notification', async () => {
  for (const response of [new Response('', { status: 500 }), new Response('<html>error</html>'), new Response('null'), new Response('{"success":true}')]) {
    await assert.rejects(readArchiveResponse(response));
  }
});

test('Vite serves the same authenticated API and denies raw database downloads', async t => {
  const { dbPath } = await setup(t);
  const original = process.env.PIM_DB_PATH;
  process.env.PIM_DB_PATH = dbPath;
  const { createServer } = await import('vite');
  let vite;
  try {
    vite = await createServer({ server: { host: '127.0.0.1', port: 0, open: false }, optimizeDeps: { noDiscovery: true, include: [] }, logLevel: 'error' });
    await vite.listen();
    const base = `http://127.0.0.1:${vite.httpServer.address().port}`;
    assert.equal((await fetch(base + '/api/db')).status, 401);
    assert.equal((await fetch(base + '/' + encodeURIComponent('ข้อมูล') + '/db.json')).status, 403);
    assert.equal((await fetch(base + '/@fs/' + dbPath.replaceAll('\\', '/'))).status, 403);
    const login = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: 'fixture-password' }) });
    assert.equal(login.status, 200);
    const cookie = login.headers.get('set-cookie').split(';')[0];
    const response = await fetch(base + '/api/db', { headers: { Cookie: cookie } });
    assert.equal(response.status, 200);
    assert.ok((await response.json()).users.every(u => !u.password && !u.passwordHash));
  } finally {
    if (vite) await vite.close();
    if (original === undefined) delete process.env.PIM_DB_PATH; else process.env.PIM_DB_PATH = original;
  }
});

test('actual production server boots and protects API with a temporary database', async t => {
  const { dbPath } = await setup(t);
  const child = spawn(process.execPath, ['server.js'], { cwd: process.cwd(), env: { ...process.env, PIM_DB_PATH: dbPath, HOST: '127.0.0.1', PORT: '0' }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(async () => { if (child.exitCode === null) { const exited = once(child, 'exit'); child.kill(); await exited; } });
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Production startup timeout')), 10000);
    child.stdout.on('data', chunk => { const match = /running on port (\d+)/.exec(String(chunk)); if (match) { clearTimeout(timer); resolve(match[1]); } });
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`Production exited: ${code}`)); });
    child.once('error', reject);
  });
  const base = `http://127.0.0.1:${port}`;
  assert.equal((await fetch(base + '/')).status, 200);
  assert.equal((await fetch(base + '/deep/link')).status, 200);
  assert.equal((await fetch(base + '/api/db')).status, 401);
});

test('HTTPS proxy origin is explicit and sets Secure session cookies', async t => {
  const { call } = await setup(t);
  const original = process.env.PIM_PUBLIC_ORIGIN;
  process.env.PIM_PUBLIC_ORIGIN = 'https://pim.example.test';
  try {
    assert.equal((await call('/auth/login', { username: 'admin', password: 'fixture-password' }, undefined, { Origin: 'https://wrong.example.test' })).status, 403);
    const response = await call('/auth/login', { username: 'admin', password: 'fixture-password' }, undefined, { Origin: 'https://pim.example.test' });
    assert.equal(response.status, 200);
    assert.ok(response.cookie);
    assert.match(response.cookieHeader, /; Secure/);
    assert.match(response.cookieHeader, /; HttpOnly/);
    assert.match(response.cookieHeader, /; SameSite=Strict/i);
  } finally { if (original === undefined) delete process.env.PIM_PUBLIC_ORIGIN; else process.env.PIM_PUBLIC_ORIGIN = original; }
});

test('companyInfo change tracking logs detailed before and after changes in activityLog', async t => {
  const { login, save, call } = await setup(t);
  const cookie = await login();
  const res = await save(cookie, 'companyInfo', {
    name: 'บริษัท ทดสอบใหม่ จำกัด',
    phone: '02-9999999',
    taxId: '0105546026064'
  });
  assert.equal(res.status, 200);
  const db = (await call('/db', undefined, cookie)).data;
  const latestLog = db.activityLog[0];
  assert.ok(latestLog);
  assert.equal(latestLog.action, 'แก้ไขข้อมูลบริษัท');
  assert.ok(latestLog.details?.changes?.length > 0);
  assert.ok(latestLog.details.changes.some(c => c.field === 'ชื่อบริษัท' && c.after === 'บริษัท ทดสอบใหม่ จำกัด'));
});
