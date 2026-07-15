/* global process */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { Buffer } from 'buffer'
import ExcelJS from 'exceljs'
import https from 'https'
import fs from 'fs'
import path from 'path'

// 1. Safety Helpers
function isSafeGoogleUrl(targetUrl) {
  try {
    const parsed = new URL(targetUrl);
    const hostname = parsed.hostname.toLowerCase();
    // Allow only google.com and googleusercontent.com subdomains
    return hostname === 'google.com' || hostname.endsWith('.google.com') || hostname === 'googleusercontent.com' || hostname.endsWith('.googleusercontent.com');
  } catch {
    return false;
  }
}

// 2. Custom lightweight rate limiter middleware for Vite Dev Server (no external dependencies)
const rateLimiter = (limitWindowMs, maxRequests) => {
  const requestTracker = new Map();
  
  // Auto cleanup IP logs every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of requestTracker.entries()) {
      const fresh = timestamps.filter(time => now - time < limitWindowMs);
      if (fresh.length === 0) {
        requestTracker.delete(ip);
      } else {
        requestTracker.set(ip, fresh);
      }
    }
  }, 300000);

  return (req, res, onLimitExceeded) => {
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    
    if (!requestTracker.has(clientIp)) {
      requestTracker.set(clientIp, []);
    }
    
    const timestamps = requestTracker.get(clientIp).filter(time => now - time < limitWindowMs);
    timestamps.push(now);
    requestTracker.set(clientIp, timestamps);
    
    if (timestamps.length > maxRequests) {
      onLimitExceeded();
      return false;
    }
    return true;
  };
};

const uploadLimiter = rateLimiter(60000, 10);
const generalLimiter = rateLimiter(60000, 30);

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    (() => {
      const downloadCache = new Map();
      return {
        name: 'download-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
            
            // 1. GET /api/db (Read JSON Database from server)
            if (parsedUrl.pathname === '/api/db' && req.method === 'GET') {
              try {
                const dbPath = path.join(process.cwd(), 'ข้อมูล', 'db.json');
                if (!fs.existsSync(dbPath)) {
                  res.statusCode = 404;
                  res.setHeader('Content-Type', 'application/json;charset=utf-8');
                  res.end(JSON.stringify({ error: 'Database not initialized' }));
                  return;
                }
                const data = fs.readFileSync(dbPath, 'utf8');
                res.setHeader('Content-Type', 'application/json;charset=utf-8');
                res.end(data);
              } catch (err) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json;charset=utf-8');
                res.end(JSON.stringify({ error: err.message }));
              }
              return;
            }

            // 2. POST /api/db/save (Update/Save array to JSON Database key)
            if (parsedUrl.pathname === '/api/db/save' && req.method === 'POST') {
              try {
                const ipAllowed = uploadLimiter(req, res, () => {
                  res.statusCode = 429;
                  res.setHeader('Content-Type', 'application/json;charset=utf-8');
                  res.end(JSON.stringify({ error: 'Too many requests, please slow down.' }));
                });
                if (!ipAllowed) return;

                let body = '';
                req.on('data', chunk => {
                  body += chunk.toString();
                });
                req.on('end', () => {
                  try {
                    const dbPath = path.join(process.cwd(), 'ข้อมูล', 'db.json');
                    const { key, data } = JSON.parse(body);
                    const allowedKeys = ['products', 'brands', 'categories', 'users', 'quotations', 'activityLog'];
                    
                    if (!allowedKeys.includes(key)) {
                      res.statusCode = 400;
                      res.end('Invalid database key');
                      return;
                    }
                    if (!Array.isArray(data)) {
                      res.statusCode = 400;
                      res.end('Data must be an array');
                      return;
                    }

                    let db = { products: [], brands: [], categories: [], users: [], quotations: [], activityLog: [] };
                    if (fs.existsSync(dbPath)) {
                      db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
                    }
                    db[key] = data;

                    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
                    res.setHeader('Content-Type', 'application/json;charset=utf-8');
                    res.end(JSON.stringify({ success: true }));
                  } catch (e) {
                    res.statusCode = 500;
                    res.end('Error parsing/writing DB: ' + e.message);
                  }
                });
              } catch (err) {
                res.statusCode = 500;
                res.end('Error: ' + err.message);
              }
              return;
            }

            // 2.5 POST /api/db/activityLog/append (Append a single log entry to JSON Database)
            if (parsedUrl.pathname === '/api/db/activityLog/append' && req.method === 'POST') {
              try {
                let body = '';
                req.on('data', chunk => {
                  body += chunk.toString();
                });
                req.on('end', () => {
                  try {
                    const dbPath = path.join(process.cwd(), 'ข้อมูล', 'db.json');
                    const { entry } = JSON.parse(body);
                    
                    if (!entry || !entry.action) {
                      res.statusCode = 400;
                      res.end('Invalid log entry');
                      return;
                    }

                    let db = { products: [], brands: [], categories: [], users: [], quotations: [], activityLog: [] };
                    if (fs.existsSync(dbPath)) {
                      db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
                    }
                    if (!Array.isArray(db.activityLog)) {
                      db.activityLog = [];
                    }
                    
                    // Prepend new entry
                    db.activityLog = [entry, ...db.activityLog].slice(0, 200);

                    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
                    res.setHeader('Content-Type', 'application/json;charset=utf-8');
                    res.end(JSON.stringify({ success: true, activityLog: db.activityLog }));
                  } catch (e) {
                    res.statusCode = 500;
                    res.end('Error parsing/writing DB: ' + e.message);
                  }
                });
              } catch (err) {
                res.statusCode = 500;
                res.end('Error: ' + err.message);
              }
              return;
            }

            if (parsedUrl.pathname === '/api/store-download' && req.method === 'POST') {
              try {
                // Rate Limiting
                const ipAllowed = uploadLimiter(req, res, () => {
                  res.statusCode = 429;
                  res.setHeader('Content-Type', 'application/json;charset=utf-8');
                  res.end(JSON.stringify({ error: 'Too many requests, please slow down.' }));
                });
                if (!ipAllowed) return;

                // Cache Limit
                if (downloadCache.size >= 50) {
                  res.statusCode = 503;
                  res.end('Server cache full, please try again later');
                  return;
                }

                let body = '';
                let oversized = false;
                req.on('data', chunk => {
                  body += chunk.toString();
                  if (body.length > 20 * 1024 * 1024) {
                    oversized = true;
                    res.statusCode = 400;
                    res.end('Payload too large (Max 20MB characters)');
                    req.destroy();
                  }
                });
                req.on('end', () => {
                  if (oversized) return;
                  let data;
                  let filename;
                  try {
                    if (req.headers['content-type']?.includes('application/json')) {
                      const parsed = JSON.parse(body);
                      data = parsed.data;
                      filename = parsed.filename;
                    } else {
                      const params = new URLSearchParams(body);
                      data = params.get('data');
                      filename = params.get('filename');
                    }
                  } catch {
                    res.statusCode = 400;
                    res.end('Invalid request format');
                    return;
                  }
                  
                  if (data) {
                    const id = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
                    downloadCache.set(id, { data, filename });
                    
                    // Auto-cleanup cache after 2 minutes
                    setTimeout(() => {
                      downloadCache.delete(id);
                    }, 120000);
                    
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ id }));
                  } else {
                    res.statusCode = 400;
                    res.end('Missing data');
                  }
                });
              } catch (err) {
                res.statusCode = 500;
                res.end('Error: ' + err.message);
              }
            } else if (parsedUrl.pathname === '/api/download-direct' && req.method === 'POST') {
              // Rate Limiting
              const ipAllowed = uploadLimiter(req, res, () => {
                res.statusCode = 429;
                res.setHeader('Content-Type', 'application/json;charset=utf-8');
                res.end(JSON.stringify({ error: 'Too many requests, please slow down.' }));
              });
              if (!ipAllowed) return;

              let body = '';
              let oversized = false;
              req.on('data', chunk => { 
                body += chunk.toString(); 
                if (body.length > 20 * 1024 * 1024) {
                  oversized = true;
                  res.statusCode = 400;
                  res.end('Payload too large (Max 20MB characters)');
                  req.destroy();
                }
              });
              req.on('end', () => {
                if (oversized) return;
                try {
                  const params = new URLSearchParams(body);
                  const data = params.get('data');
                  const filename = params.get('filename') || 'export.xlsx';

                  if (!data) {
                    res.statusCode = 400;
                    res.end('Missing data');
                    return;
                  }

                  const buffer = Buffer.from(data, 'base64');
                  let contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                  if (filename.endsWith('.csv')) contentType = 'text/csv;charset=utf-8';

                  const encodedFilename = encodeURIComponent(filename).replace(/'/g, '%27');
                  res.setHeader('Content-Type', contentType);
                  res.setHeader(
                    'Content-Disposition',
                    `attachment; filename="${filename}"; filename*=UTF-8''${encodedFilename}`
                  );
                  res.setHeader('Content-Length', buffer.length);
                  res.end(buffer);
                } catch (err) {
                  res.statusCode = 500;
                  res.end('Error: ' + err.message);
                }
              });

            } else if (parsedUrl.pathname.startsWith('/api/download') && req.method === 'GET') {
              // Rate Limiting
              const ipAllowed = generalLimiter(req, res, () => {
                res.statusCode = 429;
                res.end('Too many requests');
              });
              if (!ipAllowed) return;

              try {
                const id = parsedUrl.searchParams.get('id');
                const cached = downloadCache.get(id);
                if (cached) {
                  const buffer = Buffer.from(cached.data, 'base64');
                  const filename = cached.filename || 'export.xlsx';
                  let contentType = 'application/octet-stream';
                  if (filename.endsWith('.xlsx')) {
                    contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                  } else if (filename.endsWith('.csv')) {
                    contentType = 'text/csv;charset=utf-8';
                  }
                  
                  const encodedFilename = encodeURIComponent(filename).replace(/'/g, '%27');
                  res.setHeader('Content-Type', contentType);
                  res.setHeader(
                    'Content-Disposition',
                    `attachment; filename="${filename}"; filename*=UTF-8''${encodedFilename}`
                  );
                  res.write(buffer);
                  res.end();
                  
                  downloadCache.delete(id);
                } else {
                  res.statusCode = 404;
                  res.end('Download not found or expired');
                }
              } catch (err) {
                res.statusCode = 500;
                res.end('Error: ' + err.message);
              }
            } else if (parsedUrl.pathname === '/api/fetch-google-sheet' && req.method === 'GET') {
              // Rate Limiting
              const ipAllowed = generalLimiter(req, res, () => {
                res.statusCode = 429;
                res.setHeader('Content-Type', 'application/json;charset=utf-8');
                res.end(JSON.stringify({ error: 'Too many requests, please slow down.' }));
              });
              if (!ipAllowed) return;

              try {
                const sheetUrl = parsedUrl.searchParams.get('url');
                if (!sheetUrl) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Missing url parameter' }));
                  return;
                }

                // SSRF Protection: validate query URL
                if (!isSafeGoogleUrl(sheetUrl)) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json;charset=utf-8');
                  res.end(JSON.stringify({ error: 'การดึงข้อมูลจำกัดเฉพาะลิงก์ Google Sheets เท่านั้นเพื่อความปลอดภัย' }));
                  return;
                }

                const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
                if (!match) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json;charset=utf-8');
                  res.end(JSON.stringify({ error: 'ลิงก์ Google Sheets ไม่ถูกต้อง (ไม่พบ Spreadsheet ID)' }));
                  return;
                }
                const spreadsheetId = match[1];
                const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;

                const buffer = await new Promise((resolve, reject) => {
                  const request = (targetUrl) => {
                    // SSRF Protection: validate redirect targets
                    if (!isSafeGoogleUrl(targetUrl)) {
                      reject(new Error(`SSRF Blocked redirect to unsafe domain: ${targetUrl}`));
                      return;
                    }

                    https.get(targetUrl, (response) => {
                      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                        const redirectUrl = response.headers.location;
                        if (!isSafeGoogleUrl(redirectUrl)) {
                          reject(new Error(`SSRF Blocked redirect to unsafe domain: ${redirectUrl}`));
                          return;
                        }
                        request(redirectUrl);
                      } else if (response.statusCode === 200) {
                        const chunks = [];
                        response.on('data', (chunk) => chunks.push(chunk));
                        response.on('end', () => resolve(Buffer.concat(chunks)));
                      } else {
                        reject(new Error(`HTTP ${response.statusCode}`));
                      }
                    }).on('error', reject);
                  };
                  request(exportUrl);
                });

                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Length', buffer.length);
                res.end(buffer);
              } catch (err) {
                console.error('Fetch Google Sheet Error:', err);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json;charset=utf-8');
                res.end(JSON.stringify({ error: 'ไม่สามารถดึงข้อมูลจาก Google Sheets ได้', message: err.message }));
              }
            } else if (parsedUrl.pathname === '/api/products/export' && req.method === 'GET') {
              try {
                const platform = parsedUrl.searchParams.get('platform');
                const ids = parsedUrl.searchParams.get('ids');
                
                if (!platform) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Missing parameter: platform is required' }));
                  return;
                }
                
                const platformKey = platform.toLowerCase();
                if (!['shopee', 'lazada', 'tiktok'].includes(platformKey)) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Invalid platform. Supported platforms are: shopee, lazada, tiktok' }));
                  return;
                }

                // Load products from JSON Database
                const dbPath = path.join(process.cwd(), 'ข้อมูล', 'db.json');
                let db = { products: [] };
                if (fs.existsSync(dbPath)) {
                  db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
                }
                const dbProducts = db.products || [];

                const parseWeightToKg = (weightStr) => {
                  if (weightStr === undefined || weightStr === null || weightStr === '') return 0;
                  if (typeof weightStr === 'number') return weightStr;
                  const cleaned = String(weightStr).toLowerCase().replace(/\s+/g, '');
                  const match = cleaned.match(/^([0-9.]+)(g|kg|กิโลกรัม|กรัม)?$/);
                  if (!match) return 0;
                  const value = parseFloat(match[1]);
                  const unit = match[2];
                  if (isNaN(value)) return 0;
                  if (unit === 'g' || unit === 'กรัม') return value / 1000;
                  if (!unit && value >= 10) return value / 1000;
                  return value;
                };

                const mappedProducts = dbProducts.map(p => ({
                  ...p,
                  price: p.retailPrice || 0,
                  weight_kg: parseWeightToKg(p.weight) || 0
                }));

                let productsToExport = mappedProducts;
                if (ids) {
                  const idArray = ids.split(',').map(id => id.trim());
                  productsToExport = mappedProducts.filter(p => idArray.includes(p.id));
                }

                const workbook = new ExcelJS.Workbook();
                const filename = `PIM_Export_${platformKey}_${new Date().toISOString().slice(0, 10)}.xlsx`;

                switch (platformKey) {
                  case 'shopee': {
                    const sheet = workbook.addWorksheet('แบบฟอร์มการลงสินค้า');
                    sheet.addRow([
                      'ps_product_name|1|0',
                      'ps_product_description|1|0',
                      'ps_price|1|1',
                      'ps_stock|0|1',
                      'ps_weight|0|1',
                      'ps_length|0|1',
                      'ps_width|0|1',
                      'ps_height|0|1',
                      'ps_category_id|0|1'
                    ]);
                    sheet.addRow([]);
                    sheet.addRow([
                      'ชื่อสินค้า',
                      'รายละเอียดสินค้า',
                      'ราคา',
                      'คลังสินค้า',
                      'น้ำหนักพัสดุ',
                      'ความยาวพัสดุ',
                      'ความกว้างพัสดุ',
                      'ความสูงพัสดุ',
                      'รหัสหมวดหมู่'
                    ]);
                    productsToExport.forEach(p => {
                      const categoryMapping = { 'Styling': 101, 'Hair Color': 102, 'Treatment': 103, 'Salon Equipment': 104 };
                      sheet.addRow([
                        p.name,
                        p.description || '',
                        p.price || 0,
                        p.stock || 0,
                        p.weight_kg || 0,
                        p.packageLength || 0,
                        p.packageWidth || 0,
                        p.packageHeight || 0,
                        categoryMapping[p.category] || 0
                      ]);
                    });
                    break;
                  }
                  case 'tiktok': {
                    const sheet = workbook.addWorksheet('Template');
                    sheet.addRow([
                      'product_name',
                      'product_description',
                      'price',
                      'quantity',
                      'parcel_weight',
                      'parcel_length',
                      'parcel_width',
                      'parcel_height',
                      'main_image'
                    ]);
                    sheet.addRow([]);
                    sheet.addRow([]);
                    productsToExport.forEach(p => {
                      sheet.addRow([
                        p.name,
                        p.description || '',
                        p.price || 0,
                        p.stock || 0,
                        Math.round((p.weight_kg || 0) * 1000) || 0, // grams
                        p.packageLength || 0,
                        p.packageWidth || 0,
                        p.packageHeight || 0,
                        p.image || ''
                      ]);
                    });
                    break;
                  }
                  case 'lazada': {
                    const categorized = {};
                    productsToExport.forEach(p => {
                      const mapping = { 'Styling': 'ผลิตภัณฑ์จัดแต่งทรงผม', 'Hair Color': 'ผลิตภัณฑ์เปลี่ยนสีผม', 'Treatment': 'ครีมบำรุงผม' };
                      const tab = mapping[p.category] || 'ทั่วไป';
                      if (!categorized[tab]) categorized[tab] = [];
                      categorized[tab].push(p);
                    });
                    const tabs = Object.keys(categorized);
                    if (tabs.length === 0) tabs.push('ทั่วไป');
                    tabs.forEach(tabName => {
                      const sheet = workbook.addWorksheet(tabName);
                      sheet.addRow([
                        'ชื่อสินค้า',
                        'รูปภาพสินค้า1',
                        'ยี่ห้อ',
                        'คำอธิบายหลัก',
                        'น้ำหนัก แพคเกจ (กก)',
                        'จำนวน',
                        'ราคา',
                        'ความยาว แพคเกจ (ซม)',
                        'ความกว้าง แพคเกจ (ซม)',
                        'ความสูง แพคเกจ (ซม)'
                      ]);
                      const list = categorized[tabName] || [];
                      list.forEach(p => {
                        sheet.addRow([
                          p.name,
                          p.image || '',
                          p.brand && p.brand.trim() ? p.brand : 'No Brand',
                          p.description || '',
                          p.weight_kg || 0,
                          p.stock || 0,
                          p.price || 0,
                          p.packageLength || 0,
                          p.packageWidth || 0,
                          p.packageHeight || 0
                        ]);
                      });
                    });
                    break;
                  }
                }

                const fileBuffer = await workbook.xlsx.writeBuffer();
                const encodedFilename = encodeURIComponent(filename).replace(/'/g, '%27');
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodedFilename}`);
                res.setHeader('Content-Length', fileBuffer.length);
                res.write(fileBuffer);
                res.end();
              } catch (err) {
                res.statusCode = 500;
                res.end('Error: ' + err.message);
              }
            } else {
              next();
            }
          });
        }
      };
    })()
  ],
  server: {
    host: true,
    watch: {
      ignored: ['**/ข้อมูล/**']
    }
  }
})