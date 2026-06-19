// Mock data for Phanvadee Co., Ltd. PIM System

export const companyInfo = {
  name: 'บริษัท พันธ์วาดี จำกัด',
  nameEn: 'Phanvadee Co., Ltd.',
  address: '141/63 อาคารชุดสุขุมวิทซิตี้ทาวเวอร์ ถ.สุขุมวิท แขวงสุริยวงศ์ บางรัก กรุงเทพมหานคร 10500',
  taxId: '0105560096348',
  phone: '02-500-0000',
  mobile: '081-000-0000',
  email: 'info@phanvadee.com',
  website: 'www.phanvadee.com',
};

export const initialQuotations = [];


export const initialBrands = [
  'Barber Brain',
  "L'Angel",
  'Valente',
  'Phanvadee'
];

export const initialCategories = [
  'Styling',
  'Hair Color',
  'Treatment',
  'Salon Equipment'
];

export const initialProducts = [
  {
    id: '1',
    code: 'PROD-001',
    barcode: '8851234567890',
    name: 'Barber Brain Pomade Gold',
    brand: 'Barber Brain',
    category: 'Styling',
    wholesalePrice: 200,
    retailPrice: 290,
    capFee: 15,
    description: 'โพเมดสูตรน้ำ พลังจัดทรงสูง ล้างออกง่าย ไม่เหนียวเหนอะหนะ จัดแต่งทรงผมวินเทจได้ยาวนานตลอดวัน',
    highlights: 'สูตรน้ำล้างออกง่าย พลังจัดทรงสูงพิเศษ ไม่ทำลายเส้นผม',
    howToUse: 'ลูบไล้โพเมดลงบนเส้นผมแล้วจัดแต่งทรงตามต้องการ',
    image: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?q=80&w=400&auto=format&fit=crop',
    size: '80ml',
    weight: '120g',
    createdAt: '2026-06-01 10:00',
    updatedAt: '2026-06-10 14:30',
    updatedBy: 'admin',
    stock: 45,
    status: 'Active'
  },
  {
    id: '2',
    code: 'PROD-002',
    barcode: '8852345678901',
    name: "L'Angel Luxury Hair Color Cream 8.1",
    brand: "L'Angel",
    category: 'Hair Color',
    wholesalePrice: 120,
    retailPrice: 180,
    capFee: 10,
    description: 'ครีมเปลี่ยนสีผมสีบลอนด์อ่อนประกายหม่น เม็ดสีแน่น ติดทนนาน บำรุงล้ำลึกด้วยเคราตินเข้มข้น ปลอดภัยต่อหนังศีรษะ',
    highlights: 'เม็ดสีออร์แกนิคนำเข้าจากฝรั่งเศส ปิดผมขาวแนบสนิท',
    howToUse: 'ผสมครีมย้อมผมกับไฮโดรเจนเปอร์ออกไซด์ในอัตราส่วน 1:1 ชโลมลงบนผมทิ้งไว้ 30 นาทีแล้วล้างออก',
    image: 'https://images.unsplash.com/photo-1595853035070-59a39fe84de3?q=80&w=400&auto=format&fit=crop',
    size: '100ml',
    weight: '150g',
    createdAt: '2026-06-02 09:00',
    updatedAt: '2026-06-09 11:15',
    updatedBy: 'manager_pim',
    stock: 120,
    status: 'Active'
  },
  {
    id: '3',
    code: 'PROD-003',
    barcode: '8853456789012',
    name: 'Valente Professional Hair Dryer Ionic-2000',
    brand: 'Valente',
    category: 'Salon Equipment',
    wholesalePrice: 990,
    retailPrice: 1450,
    capFee: 0,
    description: 'ไดร์เป่าผมระดับมืออาชีพ พลังลมแรง 2000W ปล่อยประจุไอออนลบเพื่อช่วยถนอมเส้นผม ลดการชี้ฟูและไฟฟ้าสถิต ปรับความแรงได้ 3 ระดับ',
    highlights: 'มอเตอร์ความทนทานสูง ปล่อยประจุลบ 2 ล้านหน่วย ถนอมเส้นผม',
    howToUse: 'เสียบปลั๊ก ปรับระดับความร้อนและแรงลมตามความต้องการ เป่าแห้งหรือจัดแต่งทรงผม',
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=400&auto=format&fit=crop',
    size: 'Medium Size',
    weight: '650g',
    createdAt: '2026-05-10 08:30',
    updatedAt: '2026-05-20 09:40',
    updatedBy: 'admin',
    stock: 18,
    status: 'Active'
  },
  {
    id: '4',
    code: 'PROD-004',
    barcode: '8854567890123',
    name: 'Barber Brain Matte Clay',
    brand: 'Barber Brain',
    category: 'Styling',
    wholesalePrice: 220,
    retailPrice: 320,
    capFee: 15,
    description: 'แว็กซ์ดินน้ำมันเนื้อแมทท์ ให้ลุคเป็นธรรมชาติ ไม่เงา พลังอยู่ทรงสูง เหมาะสำหรับผมสั้นหรือการเซ็ตทรงที่ต้องการเทกเจอร์เด่นชัด',
    highlights: 'เนื้อดินน้ำมันด้าน ลุคธรรมชาติ อยู่ทรงนาน 24 ชั่วโมง',
    howToUse: 'วอร์มเนื้อดินน้ำมันบนฝ่ามือเล็กน้อย แล้วจัดแต่งทรงผมตามต้องการ',
    image: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?q=80&w=400&auto=format&fit=crop',
    size: '50g',
    weight: '90g',
    createdAt: '2026-06-03 14:00',
    updatedAt: '2026-06-11 10:20',
    updatedBy: 'user_pim',
    stock: 32,
    status: 'Active'
  },
  {
    id: '5',
    code: 'PROD-005',
    barcode: '8855678901234',
    name: "L'Angel Hair Treatment Keratin Mask",
    brand: "L'Angel",
    category: 'Treatment',
    wholesalePrice: 240,
    retailPrice: 350,
    capFee: 20,
    description: 'ทรีทเมนท์มาส์กสูตรเคราตินเข้มข้นพิเศษ ฟื้นบำรุงผมเสียจากการทำเคมี ทำสี และความร้อน ช่วยให้เส้นผมกลับมานุ่มสลวย มีน้ำหนัก',
    highlights: 'เคราตินสกัดเข้มข้น ฟื้นบำรึผมแตกปลายเร่งด่วน',
    howToUse: 'หลังสระผม ชโลมทรีทเมนท์มาส์กทิ้งไว้ 5-10 นาที แล้วล้างออกด้วยน้ำสะอาด',
    image: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?q=80&w=400&auto=format&fit=crop',
    size: '250ml',
    weight: '300g',
    createdAt: '2026-05-01 11:00',
    updatedAt: '2026-05-15 16:05',
    updatedBy: 'admin',
    stock: 0,
    status: 'Inactive'
  }
];

export const initialUsers = [
  {
    username: 'admin',
    password: 'password',
    name: 'สมศักดิ์ รักดี (Admin)',
    role: 'admin',
    createdAt: '2026-05-01'
  },
  {
    username: 'manager',
    password: 'password',
    name: 'วรรณภา ใจดี (Manager)',
    role: 'manager',
    createdAt: '2026-05-10'
  },
  {
    username: 'user',
    password: 'password',
    name: 'สมชาย เรียนดี (User)',
    role: 'user',
    createdAt: '2026-05-15'
  }
];

export const initializeDB = () => {
  // Auto-clean old category formats with parentheses from local storage if present
  try {
    const savedCats = localStorage.getItem('pim_categories');
    if (savedCats) {
      const cats = JSON.parse(savedCats);
      if (Array.isArray(cats)) {
        const cleanedCats = cats.map(c => typeof c === 'string' ? c.split('(')[0].trim() : c);
        if (JSON.stringify(cats) !== JSON.stringify(cleanedCats)) {
          localStorage.setItem('pim_categories', JSON.stringify(cleanedCats));
        }
      }
    }
    const savedProds = localStorage.getItem('pim_products');
    if (savedProds) {
      const prods = JSON.parse(savedProds);
      if (Array.isArray(prods)) {
        const cleanedProds = prods.map(p => {
          if (p && typeof p.category === 'string') {
            const cleanedCat = p.category.split('(')[0].trim();
            if (p.category !== cleanedCat) {
              return { ...p, category: cleanedCat };
            }
          }
          return p;
        });
        if (JSON.stringify(prods) !== JSON.stringify(cleanedProds)) {
          localStorage.setItem('pim_products', JSON.stringify(cleanedProds));
        }
      }
    }
  } catch {
    console.error("Error migrating old category structures");
  }

  let needsReset = false;

  // Validate products
  const savedProducts = localStorage.getItem('pim_products');
  if (savedProducts) {
    try {
      const products = JSON.parse(savedProducts);
      if (!Array.isArray(products) || products.length === 0 || products[0].retailPrice === undefined) {
        needsReset = true;
      }
    } catch {
      needsReset = true;
    }
  } else {
    needsReset = true;
  }

  // Validate other items exist and are valid arrays
  const savedBrands = localStorage.getItem('pim_brands');
  const savedCategories = localStorage.getItem('pim_categories');
  const savedUsers = localStorage.getItem('pim_users');

  if (savedBrands) {
    try {
      if (!Array.isArray(JSON.parse(savedBrands))) needsReset = true;
    } catch {
      needsReset = true;
    }
  } else {
    needsReset = true;
  }

  if (savedCategories) {
    try {
      if (!Array.isArray(JSON.parse(savedCategories))) needsReset = true;
    } catch {
      needsReset = true;
    }
  } else {
    needsReset = true;
  }

  if (savedUsers) {
    try {
      if (!Array.isArray(JSON.parse(savedUsers))) needsReset = true;
    } catch {
      needsReset = true;
    }
  } else {
    needsReset = true;
  }

  if (needsReset) {
    localStorage.setItem('pim_products', JSON.stringify(initialProducts));
    localStorage.setItem('pim_brands', JSON.stringify(initialBrands));
    localStorage.setItem('pim_categories', JSON.stringify(initialCategories));
    localStorage.setItem('pim_users', JSON.stringify(initialUsers));
  }

  // Ensure default admin and manager accounts are restored if modified or deleted
  let finalUsers = initialUsers;
  let activeUsers = localStorage.getItem('pim_users');
  if (activeUsers) {
    try {
      let currentUsers = JSON.parse(activeUsers);
      let modified = false;

      // Restore admin if missing or role/password/name is altered
      const adminIndex = currentUsers.findIndex(u => u.username === 'admin');
      const defaultAdmin = initialUsers.find(u => u.username === 'admin');
      if (adminIndex === -1) {
        currentUsers.push(defaultAdmin);
        modified = true;
      } else if (
        currentUsers[adminIndex].role !== defaultAdmin.role ||
        currentUsers[adminIndex].password !== defaultAdmin.password ||
        currentUsers[adminIndex].name !== defaultAdmin.name
      ) {
        currentUsers[adminIndex] = { ...currentUsers[adminIndex], ...defaultAdmin };
        modified = true;
      }

      // Restore manager if missing or role/password/name is altered
      const managerIndex = currentUsers.findIndex(u => u.username === 'manager');
      const defaultManager = initialUsers.find(u => u.username === 'manager');
      if (managerIndex === -1) {
        currentUsers.push(defaultManager);
        modified = true;
      } else if (
        currentUsers[managerIndex].role !== defaultManager.role ||
        currentUsers[managerIndex].password !== defaultManager.password ||
        currentUsers[managerIndex].name !== defaultManager.name
      ) {
        currentUsers[managerIndex] = { ...currentUsers[managerIndex], ...defaultManager };
        modified = true;
      }

      if (modified) {
        localStorage.setItem('pim_users', JSON.stringify(currentUsers));
      }
      finalUsers = currentUsers;
    } catch {
      console.error("Error restoring default users");
    }
  }

  return finalUsers;
};
