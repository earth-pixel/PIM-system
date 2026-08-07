import { supabase } from '../src/utils/supabaseClient.js';

async function seedData() {
  console.log('Starting seed operations on Supabase...');

  // 1. Clean existing records in dependency-safe order
  console.log('Cleaning old records...');
  await supabase.from('activity_log').delete().neq('id', 'placeholder');
  await supabase.from('quotations').delete().neq('id', 'placeholder');
  await supabase.from('products').delete().neq('id', 'placeholder');
  await supabase.from('users').delete().neq('id', 'placeholder');
  await supabase.from('brands').delete().neq('id', 'placeholder');
  await supabase.from('categories').delete().neq('id', 'placeholder');

  // 2. Seed Categories
  console.log('Seeding categories...');
  const mockCategories = [
    { id: 'cat-1', name: 'Grooming - ผลิตภัณพ์จัดแต่งทรงผมและหนวด', description: 'เจล แว็กซ์ และสเปรย์จัดแต่งทรงผม', status: 'Active', createdAt: '2026-07-16' },
    { id: 'cat-2', name: 'Chemical - เคมีภัณฑ์', description: 'น้ำยาย้อมผม ครีมยืด ครีมดัด', status: 'Active', createdAt: '2026-07-16' },
    { id: 'cat-3', name: 'Hair Treatment - ผลิตภัณฑ์บำรุงเส้นผม', description: 'แชมพู ทรีทเมนต์ ครีมนวด เซรั่มบำรุง', status: 'Active', createdAt: '2026-07-16' }
  ];
  const { error: catErr } = await supabase.from('categories').insert(mockCategories);
  if (catErr) console.error('Error seeding categories:', catErr);

  // 3. Seed Brands
  console.log('Seeding brands...');
  const mockBrands = [
    { id: 'brand-1', name: 'GOOD ALL DAY', description: 'แบรนด์จัดแต่งทรงผมสไตล์วินเทจ', status: 'Active', createdAt: '2026-07-16' },
    { id: 'brand-2', name: 'Barber Brain', description: 'แบรนด์อุปกรณ์และแว็กซ์คุณภาพสูง', status: 'Active', createdAt: '2026-07-16' },
    { id: 'brand-3', name: 'VALENTE', description: 'แบรนด์อุปกรณ์และเคมีภัณฑ์ร้านซาลอน', status: 'Active', createdAt: '2026-07-16' }
  ];
  const { error: brandErr } = await supabase.from('brands').insert(mockBrands);
  if (brandErr) console.error('Error seeding brands:', brandErr);

  // 4. Seed Users
  console.log('Seeding users...');
  const mockUsers = [
    { id: 'admin', username: 'admin', password: 'password', name: 'สมศักดิ์ รักดี (Admin)', role: 'admin', status: 'Active', createdAt: '2026-05-01' },
    { id: 'manager', username: 'manager', password: 'password', name: 'วรรณภา ใจดี (Manager)', role: 'manager', status: 'Active', createdAt: '2026-05-10' },
    { id: 'earth', username: 'earth', password: '1111', name: 'ธนาวัฒน์', role: 'user', status: 'Active', createdAt: '2026-07-02' }
  ];
  const { error: userErr } = await supabase.from('users').insert(mockUsers);
  if (userErr) console.error('Error seeding users:', userErr);

  // 5. Seed Products
  console.log('Seeding products...');
  const mockProducts = [
    {
      id: 'mock-p-1',
      code: 'GAD-002',
      barcode: '8858890715052',
      name: 'กู๊ด ออล เดย์ ไฟเบอร์ แว็กซ์ (จำลอง)',
      brand: 'GOOD ALL DAY',
      category: 'Grooming - ผลิตภัณพ์จัดแต่งทรงผมและหนวด',
      wholesalePrice: 99,
      retailPrice: 290,
      capFee: 7,
      description: 'แว๊กซ์จัดแต่งทรงผมสูตรไฟเบอร์ ช่วยให้ผมอยู่ทรงยาวนานตลอดทั้งวัน ล้างออกง่าย จัดแต่งทรงผมได้หลากหลายสไตล์ เพิ่มความมั่นใจหมดห่วงเรื่องทรงผม ตลอดทั้งวัน',
      highlights: 'ล้างออกง่าย อยู่ทรงยาวนาน ดูเป็นธรรมชาติ',
      howToUse: 'นำเเว็กซ์มาถูบนฝ่ามือให้อ่อนตัวลงแล้วใช้จัดเเต่งทรงผมตามต้องการ',
      image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&auto=format&fit=crop&q=60',
      size: '80 g.',
      weight: '0.08 kg',
      fdaNumber: '10-1-6500012345',
      tisiNumber: '',
      stock: 100,
      status: 'Active',
      createdAt: '2026-07-16',
      updatedAt: '2026-07-16',
      packageLength: 10,
      packageWidth: 10,
      packageHeight: 5,
      platform: 'custom',
      _platform: 'custom',
      editRemark: 'initial seed'
    },
    {
      id: 'mock-p-2',
      code: 'BB-001',
      barcode: '8858890715053',
      name: 'บาร์เบอร์ เบรน ปอมเมดแต่งผม (จำลอง)',
      brand: 'Barber Brain',
      category: 'Grooming - ผลิตภัณพ์จัดแต่งทรงผมและหนวด',
      wholesalePrice: 150,
      retailPrice: 380,
      capFee: 10,
      description: 'ปอมเมดสูตรน้ำ พลังจัดทรงสูง ให้ความเงางามหรูหรา เหมาะสำหรับทรงวินเทจ ปาดเรียบ เซ็ตง่ายตลอดวัน',
      highlights: 'สูตรน้ำล้างออกง่ายมาก พลังจัดทรงสูงสุด เงางามหรูหรา',
      howToUse: 'ลูบไล้ปอมเมดลงบนผมหมาดหรือผมแห้งแล้วใช้หวีจัดแต่งทรงตามสไตล์',
      image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&auto=format&fit=crop&q=60',
      size: '100 g.',
      weight: '0.1 kg',
      fdaNumber: '10-1-6500012346',
      tisiNumber: '',
      stock: 50,
      status: 'Active',
      createdAt: '2026-07-16',
      updatedAt: '2026-07-16',
      packageLength: 8,
      packageWidth: 8,
      packageHeight: 6,
      platform: 'custom',
      _platform: 'custom',
      editRemark: 'initial seed'
    },
    {
      id: 'mock-p-3',
      code: 'VL-005',
      barcode: '8858890715054',
      name: 'วาเลนเต้ แชมพูสระผมสูตรเย็น (จำลอง)',
      brand: 'VALENTE',
      category: 'Hair Treatment - ผลิตภัณฑ์บำรุงเส้นผม',
      wholesalePrice: 110,
      retailPrice: 220,
      capFee: 5,
      description: 'แชมพูสระผมสูตรเมนทอลเย็นสดชื่น ทำความสะอาดล้ำลึกและลดความมันบนหนังศีรษะได้อย่างมีประสิทธิภาพ',
      highlights: 'สูตรเมนทอลเย็นสดชื่น ขจัดรังแค ลดปัญหาหนังศีรษะมัน',
      howToUse: 'ชโลมแชมพูลงบนผมเปียก นวดจนเกิดฟองให้ทั่วหนังศีรษะแล้วล้างออกด้วยน้ำสะอาด',
      image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&auto=format&fit=crop&q=60',
      size: '400 ml',
      weight: '0.4 kg',
      fdaNumber: '10-1-6500012347',
      tisiNumber: '',
      stock: 80,
      status: 'Active',
      createdAt: '2026-07-16',
      updatedAt: '2026-07-16',
      packageLength: 18,
      packageWidth: 7,
      packageHeight: 7,
      platform: 'custom',
      _platform: 'custom',
      editRemark: 'initial seed'
    }
  ];
  const { error: prodErr } = await supabase.from('products').insert(mockProducts);
  if (prodErr) console.error('Error seeding products:', prodErr);

  // 6. Seed Quotations
  console.log('Seeding quotations...');
  const mockQuotations = [
    {
      id: 'mock-q-1',
      quotationNumber: 'QT-20260716-0001',
      documentType: 'ใบเสนอราคา',
      issuedDate: '2026-07-16',
      validUntilDate: '2026-08-16',
      customer: { name: 'บริษัท ทดสอบจำลอง จำกัด', phone: '02-123-4567', address: '123/45 ถนนลาดพร้าว กรุงเทพฯ' },
      items: [
        { id: 'mock-p-1', code: 'GAD-002', name: 'กู๊ด ออล เดย์ ไฟเบอร์ แว็กซ์ (จำลอง)', price: 290, qty: 10, total: 2900 },
        { id: 'mock-p-2', code: 'BB-001', name: 'บาร์เบอร์ เบรน ปอมเมดแต่งผม (จำลอง)', price: 380, qty: 5, total: 1900 }
      ],
      vatRate: 7,
      status: 'รอดำเนินการ',
      note: 'เอกสารทดสอบจำลองการเชื่อมต่อฐานข้อมูล Supabase',
      subtotal: 4800,
      vatAmount: 336,
      totalAmount: 5136,
      createdBy: 'admin',
      createdAt: '2026-07-16T00:00:00.000Z',
      updatedAt: '2026-07-16T00:00:00.000Z'
    }
  ];
  const { error: quotErr } = await supabase.from('quotations').insert(mockQuotations);
  if (quotErr) console.error('Error seeding quotations:', quotErr);

  // 7. Seed Activity Log
  console.log('Seeding activity log...');
  const mockLogs = [
    {
      id: 'mock-l-1',
      timestamp: new Date().toISOString(),
      userName: 'สมศักดิ์ รักดี (Admin)',
      userRole: 'admin',
      action: 'ทำการ Seed ข้อมูลจำลองเข้าสู่ฐานข้อมูล Supabase สำเร็จสำหรับการเริ่มต้นระบบ',
      details: null
    }
  ];
  const { error: logErr } = await supabase.from('activity_log').insert(mockLogs);
  if (logErr) console.error('Error seeding activity log:', logErr);

  console.log('Seeding completed successfully!');
}

seedData().catch(console.error);
