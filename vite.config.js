import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { Buffer } from 'buffer'
import ExcelJS from 'exceljs'

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
            
            if (parsedUrl.pathname === '/api/store-download' && req.method === 'POST') {
              try {
                let body = '';
                req.on('data', chunk => {
                  body += chunk.toString();
                });
                req.on('end', () => {
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
              // Direct POST → file response (used by hidden iframe form submit)
              // This avoids the UUID filename bug from blob URLs in Chrome/Edge on Windows
              let body = '';
              req.on('data', chunk => { body += chunk.toString(); });
              req.on('end', () => {
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

                  // Use RFC 5987 encoding for filename (works on all modern browsers)
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

                // Mock products source database
                const mockProducts = [
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
                    brand: '',
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

                let productsToExport = mockProducts;
                if (ids) {
                  const idArray = ids.split(',').map(id => id.trim());
                  productsToExport = mockProducts.filter(p => idArray.includes(p.id));
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
                        p.price,
                        p.stock,
                        p.weight_kg,
                        p.packageLength || '',
                        p.packageWidth || '',
                        p.packageHeight || '',
                        categoryMapping[p.category] || 100
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
                        p.price,
                        p.stock,
                        Math.round((p.weight_kg || 0) * 1000), // grams
                        p.packageLength || '',
                        p.packageWidth || '',
                        p.packageHeight || '',
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
                          p.weight_kg,
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
    host: true
  }
})