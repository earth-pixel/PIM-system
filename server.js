const express = require('express');
const ExcelJS = require('exceljs');
const app = express();
const PORT = process.env.PORT || 3000;

// Body parsing middleware to handle large file base64 transfers (limit 50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Cache to temporarily hold base64 download buffers
const downloadCache = new Map();

// 2. Mock Product Data
const MOCK_PRODUCTS = [
  {
    id: '1',
    name: 'Barber Brain Pomade Gold',
    brand: 'Barber Brain',
    category: 'Styling',
    price: 290,
    stock: 45,
    weight_kg: 0.12,
    image: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?q=80&w=400&auto=format&fit=crop',
    description: 'โพเมดสูตรน้ำ พลังจัดทรงสูง ล้างออกง่าย ไม่เหนียวเหนอะหนะ จัดแต่งทรงผมวินเทจได้ยาวนานตลอดวัน',
    packageLength: 10,
    packageWidth: 10,
    packageHeight: 5
  },
  {
    id: '2',
    name: "L'Angel Luxury Hair Color Cream 8.1",
    brand: "L'Angel",
    category: 'Hair Color',
    price: 180,
    stock: 120,
    weight_kg: 0.15,
    image: 'https://images.unsplash.com/photo-1595853035070-59a39fe84de3?q=80&w=400&auto=format&fit=crop',
    description: 'ครีมเปลี่ยนสีผมสีบลอนด์อ่อนประกายหม่น เม็ดสีแน่น ติดทนนาน บำรุงล้ำลึกด้วยเคราตินเข้มข้น ปลอดภัยต่อหนังศีรษะ',
    packageLength: 15,
    packageWidth: 5,
    packageHeight: 5
  },
  {
    id: '3',
    name: 'Valente Professional Hair Dryer Ionic-2000',
    brand: 'Valente',
    category: 'Salon Equipment',
    price: 1450,
    stock: 18,
    weight_kg: 0.65,
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=400&auto=format&fit=crop',
    description: 'ไดร์เป่าผมระดับมืออาชีพ พลังลมแรง 2000W ปล่อยประจุไอออนลบเพื่อช่วยถนอมเส้นผม ลดการชี้ฟูและไฟฟ้าสถิต ปรับความแรงได้ 3 ระดับ',
    packageLength: 25,
    packageWidth: 20,
    packageHeight: 10
  },
  {
    id: '4',
    name: 'Barber Brain Matte Clay',
    brand: '', // Empty brand to trigger 'No Brand' default mapping
    category: 'Styling',
    price: 320,
    stock: 32,
    weight_kg: 0.09,
    image: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?q=80&w=400&auto=format&fit=crop',
    description: 'แว็กซ์ดินน้ำมันเนื้อแมทท์ ให้ลุคเป็นธรรมชาติ ไม่เงา พลังอยู่ทรงสูง เหมาะสำหรับผมสั้นหรือการเซ็ตทรงที่ต้องการเทกเจอร์เด่นชัด',
    packageLength: 8,
    packageWidth: 8,
    packageHeight: 4
  },
  {
    id: '5',
    name: "L'Angel Hair Treatment Keratin Mask",
    brand: "L'Angel",
    category: 'Treatment',
    price: 350,
    stock: 0,
    weight_kg: 0.3,
    image: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?q=80&w=400&auto=format&fit=crop',
    description: 'ทรีทเมนท์มาส์กสูตรเคราตินเข้มข้นพิเศษ ฟื้นบำรุงผมเสียจากการทำเคมี ทำสี และความร้อน ช่วยให้เส้นผมกลับมานุ่มสลวย มีน้ำหนัก',
    packageLength: 12,
    packageWidth: 12,
    packageHeight: 12
  }
];

// Helper to map category names to Shopee Category IDs
const getShopeeCategoryId = (category) => {
  const mapping = {
    'Styling': 101,
    'Hair Color': 102,
    'Treatment': 103,
    'Salon Equipment': 104
  };
  return mapping[category] || 100;
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
app.post('/api/store-download', (req, res) => {
  try {
    const { data, filename } = req.body;
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
app.get('/api/download', (req, res) => {
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
app.post('/api/download-direct', (req, res) => {
  try {
    const { data, filename } = req.body;
    const exportFilename = filename || 'export.xlsx';

    if (!data) {
      return res.status(400).send('Missing data');
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

    // Filter products if ids are provided
    let productsToExport = MOCK_PRODUCTS;
    if (ids) {
      const idArray = ids.split(',').map(id => id.trim());
      productsToExport = MOCK_PRODUCTS.filter(p => idArray.includes(p.id));
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
            p.price,
            p.stock,
            p.weight_kg, // Shopee uses KG
            p.packageLength || '',
            p.packageWidth || '',
            p.packageHeight || '',
            getShopeeCategoryId(p.category) // Translate category name to ID
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
            p.price,
            p.stock,
            weightGrams, // Forced Grams conversion
            p.packageLength || '',
            p.packageWidth || '',
            p.packageHeight || '',
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
              p.weight_kg, // Lazada uses KG
              p.stock,
              p.price,
              p.packageLength || '',
              p.packageWidth || '',
              p.packageHeight || ''
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

app.listen(PORT, () => {
  console.log(`PIM Export Server running on port ${PORT}`);
});
