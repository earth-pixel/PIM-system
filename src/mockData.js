// Mock data for Phanvadee Co., Ltd. PIM System

export const companyInfo = {
  name: 'บริษัท พันธ์วาดี จำกัด',
  nameEn: 'Phanvadee Co., Ltd.',
  address: '19/9 ซอย ทวีวัฒนา-กาญจนาภิเษก 16 แขวงทวีวัฒนา เขตทวีวัฒนา กรุงเทพมหานคร 10170',
  taxId: '0105560096348',
  phone: '086-523-1495',
  mobile: '086-523-1495',
  email: 'info@phanvadee.co.th',
  website: 'https://www.phanvadee.co.th',
};

export const initialQuotations = [];

export const initialBrands = [
  "GOOD ALL DAY",
  "Barber Brain",
  "VALENTE",
  "LANGEL แอลแองเจล",
  "Cosmix Supply",
  "KATANA",
  "NOVEX",
  "MAYA",
  "KOBO Professional"
];

export const initialCategories = [
  "Grooming - ผลิตภัณพ์จัดแต่งทรงผมและหนวด",
  "Electrical Equipment - อุปกรณ์ไฟฟ้า",
  "Other Equipment - อุปกรณ์อื่นๆ",
  "Hair Scissors - กรรไกรตัดซอย",
  "Manicure and Pedicure - สปามือและเท้า",
  "Comb and Brush - หวีและแปรง",
  "Chemical - เคมีภัณฑ์",
  "Hair Treatment - ผลิตภัณฑ์บำรุงเส้นผม",
  "Apron - ผ้าคลุมและผ้ากันเปื้อน",
  "อื่นๆ",
  "Replacement Parts - ชิ้นส่วนอะไหล่",
  "อุปกรณ์แพ็คสินค้า",
  "Health and Beauty - สุขภาพและความงาม",
  "Promotion - สินค้าราคาพิเศษ",
  "เสื้อ"
];

// Products are now fetched from /api/db (stored on server in ข้อมูล/db.json)
export const initialProducts = [];

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
  // Ensure default structure exists locally as a fallback
  try {
    const savedCats = localStorage.getItem('pim_categories');
    if (!savedCats) {
      localStorage.setItem('pim_categories', JSON.stringify(initialCategories));
    }
    const savedBrands = localStorage.getItem('pim_brands');
    if (!savedBrands) {
      localStorage.setItem('pim_brands', JSON.stringify(initialBrands));
    }
    const savedUsers = localStorage.getItem('pim_users');
    if (!savedUsers) {
      localStorage.setItem('pim_users', JSON.stringify(initialUsers));
    }
  } catch (err) {
    console.error("Local Storage Initialization Error:", err);
  }

  // Restore default credentials if missing/modified in local storage
  let finalUsers = initialUsers;
  let activeUsers = localStorage.getItem('pim_users');
  if (activeUsers) {
    try {
      let currentUsers = JSON.parse(activeUsers);
      let modified = false;

      // Restore admin
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

      // Restore manager
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
