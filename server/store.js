import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import process from 'node:process';
import { isSupabaseConfigured } from './supabaseSync.js';

export const keys = ['products', 'brands', 'categories', 'subcategories', 'users', 'quotations', 'activityLog', 'customers'];
export const revision = value => createHash('sha256').update(JSON.stringify(value ?? [])).digest('hex');
export const publicUser = user => Object.fromEntries(Object.entries(user).filter(([key]) => !['password', 'passwordHash'].includes(key)));
export const revisions = db => Object.fromEntries(keys.map(key => [key, revision(db[key])]));
export function publicDB(db) {
  return { ...Object.fromEntries(keys.map(key => [key, key === 'users' ? (db.users || []).map(publicUser) : key === 'subcategories' ? (db.subcategories || {}) : db[key] || []])), _revisions: revisions(db) };
}

export function createStore(dbPath) {
  const isTest = process.env.NODE_ENV === 'test' || (typeof dbPath === 'string' && (dbPath.includes('pim-system-test-') || dbPath.includes('Temp') || dbPath.includes('temp')));
  const usePureCloud = isSupabaseConfigured && !isTest;
  let memoryDb = null;

  const read = () => {
    if (usePureCloud && memoryDb) return memoryDb;
    if (!memoryDb) {
      if (typeof dbPath === 'string' && fs.existsSync(dbPath)) {
        try { memoryDb = JSON.parse(fs.readFileSync(dbPath, 'utf8')); } catch { memoryDb = {}; }
      } else {
        memoryDb = {};
      }
    }
    return memoryDb || {};
  };

  const transact = callback => {
    // When using Supabase in production/dev, operate purely in memory and Supabase cloud (no local disk writes)
    if (usePureCloud) {
      if (!memoryDb) memoryDb = read();
      const result = callback(memoryDb);
      return result;
    }

    // Disk write fallback only for local unit tests
    const lockPath = `${dbPath}.lock`;
    let lock;
    try { lock = fs.openSync(lockPath, 'wx'); }
    catch (error) {
      if (error.code !== 'EEXIST') throw error;
      let stale = false;
      try {
        const owner = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
        try { process.kill(owner.pid, 0); } catch (probe) { stale = probe.code === 'ESRCH'; }
      } catch { stale = Date.now() - fs.statSync(lockPath).mtimeMs > 30000; }
      if (!stale) throw Object.assign(new Error('ฐานข้อมูลกำลังถูกบันทึก กรุณาลองใหม่'), { status: 409 });
      fs.unlinkSync(lockPath);
      lock = fs.openSync(lockPath, 'wx');
    }
    let temp;
    try {
      fs.writeFileSync(lock, JSON.stringify({ pid: process.pid }), 'utf8');
      const db = read();
      const result = callback(db);
      temp = path.join(path.dirname(dbPath), `.pim-${randomUUID()}.tmp`);
      const fd = fs.openSync(temp, 'wx', 0o600);
      try { fs.writeFileSync(fd, JSON.stringify(db, null, 2), 'utf8'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
      fs.renameSync(temp, dbPath);
      return result;
    } finally {
      if (temp && fs.existsSync(temp)) fs.unlinkSync(temp);
      if (lock) fs.closeSync(lock);
      if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath);
    }
  };

  return { read, transact };
}
