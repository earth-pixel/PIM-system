import 'dotenv/config';
import { createApi } from './server/api.js';
import express from 'express';
import ExcelJS from 'exceljs';
import { URL } from 'url';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Body parsing middleware to handle large file base64 transfers (limit 50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/api', createApi(process.env.PIM_DB_PATH || path.join(__dirname, 'ข้อมูล', 'db.json')));

// 1. Safety Helpers
function isSafeGoogleUrl(targetUrl) {
  try {
    const parsed = new URL(targetUrl);
    const hostname = parsed.hostname.toLowerCase();
    // Allow only google.com and googleusercontent.com subdomains
    return hostname === 'google.com' || hostname.endsWith('.google.com') || hostname === 'googleusercontent.com' || hostname.endsWith('.googleusercontent.com');
  } catch (e) {
    return false;
  }
}

// 2. Custom lightweight rate limiter middleware (no external dependencies)
const rateLimiter = (limitWindowMs, maxRequests) => {
  const requestTracker = new Map();

  // Auto cleanup old IP logs every 5 minutes to prevent memory leak
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

  return (req, res, next) => {
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    if (!requestTracker.has(clientIp)) {
      requestTracker.set(clientIp, []);
    }

    const timestamps = requestTracker.get(clientIp).filter(time => now - time < limitWindowMs);
    timestamps.push(now);
    requestTracker.set(clientIp, timestamps);

    if (timestamps.length > maxRequests) {
      return res.status(429).json({
        error: 'Rate Limit Exceeded',
        message: 'คุณส่งคำขอรวดเร็วเกินไป กรุณารอสักครู่แล้วลองใหม่ (Too many requests, please slow down.)'
      });
    }

    next();
  };
};

const uploadLimiter = rateLimiter(60000, 10);  // max 10 requests per minute
const generalLimiter = rateLimiter(60000, 30); // max 30 requests per minute

// Cache to temporarily hold base64 download buffers
const downloadCache = new Map();

// 2. Mock Product Data Removed (Replaced by Server JSON Database)

// Helper to map category names to Shopee Category IDs
const getShopeeCategoryId = (category) => {
  const mapping = {
    'Styling': 101,
    'Hair Color': 102,
    'Treatment': 103,
    'Salon Equipment': 104
  };
  return mapping[category] || 0;
};

// Helper to map category names to Lazada sheet names
const getLazadaSheetName = (category) => {
  const mapping = {
    'Styling': 'ผลิตภัณฑ์จัดแต่งทรงผม',
    'Hair Color': 'ผลิตภัณฑ์เปลี่ยนสีผม',
    'Treatment': 'ครีมบำรุงผม'
  };
  return mapping[category] || 'ทั่วไป';
};

// ─────────────────────────────────────────────────────────────
// DOWNLOAD PROXY API ENDPOINTS (Identical to Vite's dev middleware)
// ─────────────────────────────────────────────────────────────

// 1. POST /api/store-download
app.post('/api/store-download', uploadLimiter, (req, res) => {
  try {
    const { data, filename } = req.body;

    // DoS Protection: Limit payload size inside the code (Max 20MB characters)
    if (data && data.length > 20 * 1024 * 1024) {
      return res.status(400).send('Payload too large (Max 20MB characters)');
    }

    // DoS Protection: Limit maximum cache size
    if (downloadCache.size >= 50) {
      return res.status(503).send('Server cache full, please try again later');
    }

    if (data) {
      const id = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      downloadCache.set(id, { data, filename });

      // Auto-cleanup cache after 2 minutes
      setTimeout(() => {
        downloadCache.delete(id);
      }, 120000);

      res.json({ id });
    } else {
      res.status(400).send('Missing data');
    }
  } catch (err) {
    res.status(500).send('Error: ' + err.message);
  }
});

// 2. GET /api/download
app.get('/api/download', generalLimiter, (req, res) => {
  try {
    const { id } = req.query;
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
      res.send(buffer);

      downloadCache.delete(id);
    } else {
      res.status(404).send('Download not found or expired');
    }
  } catch (err) {
    res.status(500).send('Error: ' + err.message);
  }
});

// 3. POST /api/download-direct
app.post('/api/download-direct', uploadLimiter, (req, res) => {
  try {
    const { data, filename } = req.body;
    const exportFilename = filename || 'export.xlsx';

    if (!data) {
      return res.status(400).send('Missing data');
    }

    // DoS Protection: Limit payload size inside the code (Max 20MB characters)
    if (data.length > 20 * 1024 * 1024) {
      return res.status(400).send('Payload too large (Max 20MB characters)');
    }

    const buffer = Buffer.from(data, 'base64');
    let contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    if (exportFilename.endsWith('.csv')) contentType = 'text/csv;charset=utf-8';

    const encodedFilename = encodeURIComponent(exportFilename).replace(/'/g, '%27');
    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${exportFilename}"; filename*=UTF-8''${encodedFilename}`
    );
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err) {
    res.status(500).send('Error: ' + err.message);
  }
});



// helper function to fetch a URL that handles redirects (with SSRF protection)
function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const request = (targetUrl) => {
      // Validate initial URL & redirect targets
      if (!isSafeGoogleUrl(targetUrl)) {
        reject(new Error(`Security Blocked: SSRF attempt to non-Google domain: ${targetUrl}`));
        return;
      }

      https.get(targetUrl, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          const redirectUrl = response.headers.location;
          // Validate redirect domain before following
          if (!isSafeGoogleUrl(redirectUrl)) {
            reject(new Error(`Security Blocked: Redirect SSRF attempt to non-Google domain: ${redirectUrl}`));
            return;
          }
          request(redirectUrl);
        } else if (response.statusCode === 200) {
          const chunks = [];
          response.on('data', (chunk) => chunks.push(chunk));
          response.on('end', () => resolve(Buffer.concat(chunks)));
        } else {
          reject(new Error(`Failed to download sheet: HTTP ${response.statusCode}`));
        }
      }).on('error', (err) => reject(err));
    };
    request(url);
  });
}

// GET /api/fetch-google-sheet
app.get('/api/fetch-google-sheet', generalLimiter, async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: 'Missing url parameter' });
    }

    // SSRF Whitelist Check for query URL
    if (!isSafeGoogleUrl(url)) {
      return res.status(400).json({ error: 'การดึงข้อมูลจำกัดเฉพาะลิงก์ Google Sheets เท่านั้นเพื่อความปลอดภัย' });
    }

    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      return res.status(400).json({ error: 'ลิงก์ Google Sheets ไม่ถูกต้อง (ไม่พบ Spreadsheet ID)' });
    }
    const spreadsheetId = match[1];
    const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;

    const buffer = await downloadFile(exportUrl);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err) {
    console.error('Fetch Google Sheet Error:', err);
    res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลจาก Google Sheets ได้', message: err.message });
  }
});

// 1. GET /api/products/export
app.get('/api/products/export', async (req, res) => {
  try {
    const { platform, ids } = req.query;

    // 4. Parameter Validation
    if (!platform) {
      return res.status(400).json({ error: 'Missing parameter: platform is required' });
    }

    const platformKey = platform.toLowerCase();
    if (!['shopee', 'lazada', 'tiktok'].includes(platformKey)) {
      return res.status(400).json({ error: 'Invalid platform. Supported platforms are: shopee, lazada, tiktok' });
    }

    // Load products from local db.json
    const dbPath = (process.env.PIM_DB_PATH || path.join(__dirname, 'ข้อมูล', 'db.json'));
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

    // Filter products if ids are provided
    let productsToExport = mappedProducts;
    if (ids) {
      const idArray = ids.split(',').map(id => id.trim());
      productsToExport = mappedProducts.filter(p => idArray.includes(p.id));
    }

    const workbook = new ExcelJS.Workbook();
    let filename = `PIM_Export_${platformKey}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    // 3. Switch Case for Platform specific mapping
    switch (platformKey) {
      case 'shopee': {
        const sheet = workbook.addWorksheet('แบบฟอร์มการลงสินค้า');

        // Row 1: Raw codes
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

        // Row 2: Empty row
        sheet.addRow([]);

        // Row 3: Thai headers
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

        // Rows 4+: Data translation (Shopee uses KG)
        productsToExport.forEach(p => {
          sheet.addRow([
            p.name,
            p.description || '',
            p.price || 0,
            p.stock || 0,
            p.weight_kg || 0, // Shopee uses KG
            p.packageLength || 0,
            p.packageWidth || 0,
            p.packageHeight || 0,
            getShopeeCategoryId(p.category) || 0 // Translate category name to ID
          ]);
        });
        break;
      }

      case 'tiktok': {
        const sheet = workbook.addWorksheet('Template');

        // TikTok Shop starts data at row 4
        // Row 1: English headers
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

        // Row 2 & 3: Empty headers/subtitles for design requirements
        sheet.addRow([]);
        sheet.addRow([]);

        // Rows 4+: Data translation (TikTok uses Grams, i.e., kg * 1000)
        productsToExport.forEach(p => {
          const weightGrams = Math.round((p.weight_kg || 0) * 1000);
          sheet.addRow([
            p.name,
            p.description || '',
            p.price || 0,
            p.stock || 0,
            weightGrams || 0, // Forced Grams conversion
            p.packageLength || 0,
            p.packageWidth || 0,
            p.packageHeight || 0,
            p.image || ''
          ]);
        });
        break;
      }

      case 'lazada': {
        // Advanced Publish layout - split by category sheet tabs
        const categorized = {};
        productsToExport.forEach(p => {
          const tab = getLazadaSheetName(p.category);
          if (!categorized[tab]) categorized[tab] = [];
          categorized[tab].push(p);
        });

        const tabs = Object.keys(categorized);
        if (tabs.length === 0) {
          tabs.push('ทั่วไป');
          categorized['ทั่วไป'] = [];
        }

        tabs.forEach(tabName => {
          const sheet = workbook.addWorksheet(tabName);
          // Thai headers
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

          const list = categorized[tabName];
          list.forEach(p => {
            // Default brand mapping check
            const brandName = p.brand && p.brand.trim() ? p.brand : 'No Brand';

            sheet.addRow([
              p.name,
              p.image || '',
              brandName, // Default to 'No Brand' if empty
              p.description || '',
              p.weight_kg || 0, // Lazada uses KG
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

    // Set Response Headers for download file
    const fileBuffer = await workbook.xlsx.writeBuffer();
    const encodedFilename = encodeURIComponent(filename).replace(/'/g, '%27');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodedFilename}`);
    res.setHeader('Content-Length', fileBuffer.length);
    res.send(fileBuffer);

  } catch (err) {
    console.error('Export Error:', err);
    res.status(500).json({ error: 'Server Internal Error', message: err.message });
  }
});

// Serve static files from the React frontend build (Vite copies public folder contents to dist automatically)
app.use(express.static(path.join(__dirname, 'dist')));

// Catch-all route to serve the React index.html for any frontend routing
app.get('/{*path}', (req, res) => {
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Frontend build not found. Please run "npm run build" first.');
  }
});

const httpServer = app.listen(PORT, process.env.HOST || '0.0.0.0', () => {
  console.log(`PIM Export Server running on port ${httpServer.address().port}`);
});
