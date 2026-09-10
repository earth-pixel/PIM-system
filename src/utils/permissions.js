/**
 * Permission Management Utility for PIM System
 * Supports granular Page/Menu access and Button/Action level permissions.
 */

export const PAGE_DEFINITIONS = [
  {
    id: 'dashboard',
    name: 'Dashboard ',
    icon: 'bi bi-grid-1x2-fill',
  },
  {
    id: 'manage-products',
    name: 'จัดการข้อมูลสินค้า',
    icon: 'bi bi-box-seam-fill',
  },
  {
    id: 'brands',
    name: 'จัดการแบรนด์สินค้า',
    icon: 'bi bi-award-fill',
  },
  {
    id: 'categories',
    name: 'จัดการหมวดหมู่สินค้า',
    icon: 'bi bi-folder-fill',
  },
  {
    id: 'customers',
    name: 'จัดการข้อมูลลูกค้า',
    description: 'ดูรายชื่อลูกค้า ข้อมูลติดต่อ บริษัท และประวัติเอกสารใบเสนอราคา',
    icon: 'bi bi-person-lines-fill',
    category: 'ข้อมูลลูกค้า'
  },
  {
    id: 'quotations',
    name: 'ใบเสนอราคา & เอกสาร',
    description: 'ดูรายการใบเสนอราคา และแคตตาล็อกนำเสนอสินค้า (Product Proposal)',
    icon: 'bi bi-file-earmark-text-fill',
    category: 'เอกสารการขาย'
  },
  {
    id: 'reports',
    name: 'รายงานสินค้า & สถิติ',
    description: 'รายงานวิเคราะห์สินค้า หมวดหมู่ แบรนด์ และรายงานใบเสนอราคา',
    icon: 'bi bi-bar-chart-fill',
    category: 'รายงาน'
  },
  {
    id: 'users',
    name: 'จัดการผู้ใช้งานระบบ',
    description: 'ดูบัญชีผู้ใช้งานระบบ อนุมัติสิทธิ์ และจัดการผู้ใช้',
    icon: 'bi bi-people-fill',
    category: 'การตั้งค่าระบบ'
  },
  {
    id: 'activity-log',
    name: 'ประวัติการดำเนินงาน (Activity Log)',
    description: 'ตรวจสอบประวัติการแก้ไข เพิ่ม ลบ และการทำงานในระบบทั้งหมด',
    icon: 'bi bi-clock-history',
    category: 'การตั้งค่าระบบ'
  }
];

export const ACTION_GROUPS = [
  {
    id: 'products',
    name: 'จัดการข้อมูลสินค้า (Products)',
    icon: 'bi bi-box-seam-fill',
    description: 'สิทธิ์ปุ่มคำสั่งและการดำเนินงานในหน้าจัดการสินค้า',
    actions: [
      { id: 'products.create', name: 'ปุ่มเพิ่มสินค้าใหม่', description: 'สามารถกดปุ่มลงทะเบียนสินค้าใหม่ในระบบได้' },
      { id: 'products.edit', name: 'ปุ่มแก้ไขข้อมูลสินค้า', description: 'สามารถกดปุ่มดินสอเพื่อแก้ไขข้อมูลสินค้าได้' },
      { id: 'products.delete', name: 'ปุ่มลบสินค้า', description: 'สามารถกดปุ่มถังขยะเพื่อลบรายการสินค้าได้' },
      { id: 'products.import', name: 'ปุ่มนำเข้าไฟล์ Excel', description: 'สามารถกดปุ่มนำเข้าสินค้าจากไฟล์ Excel เข้าสู่ระบบได้' },
      { id: 'products.export', name: 'ปุ่มส่งออกข้อมูล (Export)', description: 'สามารถส่งออกเป็น Excel, Shopee, Lazada, TikTok ได้' },
      { id: 'products.print', name: 'ปุ่มพิมพ์บาร์โค้ด / ป้ายราคา', description: 'สามารถกดปุ่มพิมพ์ Barcode หรือป้ายราคาสินค้าได้', hidden: true },
      { id: 'products.clear', name: 'ปุ่มล้างสินค้าทั้งหมด', description: 'สามารถกดปุ่มรีเซ็ตหรือล้างข้อมูลสินค้าทั้งหมดได้' }
    ]
  },
  {
    id: 'quotations',
    name: 'ใบเสนอราคา & เอกสาร (Quotations)',
    icon: 'bi bi-file-earmark-text-fill',
    description: 'สิทธิ์ปุ่มคำสั่งในระบบใบเสนอราคาและใบเสนอสินค้า',
    actions: [
      { id: 'quotations.create', name: 'ปุ่มสร้างใบเสนอราคาใหม่', description: 'สามารถกดสร้างใบเสนอราคาใหม่ได้' },
      { id: 'quotations.createProposal', name: 'ปุ่มสร้างใบเสนอสินค้า (Proposal)', description: 'สามารถสร้างแคตตาล็อกใบเสนอสินค้าได้' },
      { id: 'quotations.edit', name: 'ปุ่มแก้ไขเอกสาร', description: 'สามารถเปิดแก้ไขข้อมูลใบเสนอราคาได้' },
      { id: 'quotations.delete', name: 'ปุ่มลบเอกสาร', description: 'สามารถลบใบเสนอราคาที่สร้างขึ้นได้' },
      { id: 'quotations.approve', name: 'ปุ่มอนุมัติ / ปฏิเสธเอกสาร', description: 'สามารถเปลี่ยนสถานะเป็นอนุมัติหรือไม่อนุมัติได้' },
      { id: 'quotations.print', name: 'ปุ่มพิมพ์ / ดาวน์โหลด PDF', description: 'สามารถพิมพ์หรือดาวน์โหลดเอกสาร PDF ได้' }
    ]
  },
  {
    id: 'catalogs',
    name: 'แบรนด์และหมวดหมู่ (Brands & Categories)',
    icon: 'bi bi-tags-fill',
    description: 'สิทธิ์ปุ่มเพิ่ม แก้ไข ลบ แบรนด์และหมวดหมู่สินค้า',
    actions: [
      { id: 'brands.create', name: 'ปุ่มเพิ่มแบรนด์สินค้า', description: 'สามารถเพิ่มแบรนด์ใหม่ในระบบได้' },
      { id: 'brands.edit', name: 'ปุ่มแก้ไขแบรนด์สินค้า', description: 'สามารถแก้ไขชื่อแบรนด์สินค้าได้' },
      { id: 'brands.delete', name: 'ปุ่มลบแบรนด์สินค้า', description: 'สามารถลบแบรนด์ออกจากระบบได้' },
      { id: 'categories.create', name: 'ปุ่มเพิ่มหมวดหมู่ / หมวดหมู่ย่อย', description: 'สามารถเพิ่มหมวดหมู่สินค้าใหม่ได้' },
      { id: 'categories.edit', name: 'ปุ่มแก้ไขหมวดหมู่', description: 'สามารถแก้ไขชื่อหมวดหมู่ได้' },
      { id: 'categories.delete', name: 'ปุ่มลบหมวดหมู่', description: 'สามารถลบหมวดหมู่ออกจากระบบได้' }
    ]
  },
  {
    id: 'reports',
    name: 'รายงาน & การส่งออก (Reports)',
    icon: 'bi bi-bar-chart-fill',
    description: 'สิทธิ์ปุ่มส่งออกรายงานในหน้ารายงานสินค้า',
    actions: [
      { id: 'reports.export', name: 'ปุ่มส่งออกรายงาน Excel', description: 'สามารถดาวน์โหลดรายงานสรุปสินค้าเป็นไฟล์ Excel ได้' }
    ]
  },
  {
    id: 'users',
    name: 'จัดการผู้ใช้งาน (User Management)',
    icon: 'bi bi-people-fill',
    description: 'สิทธิ์การจัดการบัญชีผู้ใช้ในระบบ',
    actions: [
      { id: 'users.create', name: 'ปุ่มลงทะเบียนผู้ใช้ใหม่', description: 'สามารถกดสร้างบัญชีผู้ใช้งานใหม่ได้' },
      { id: 'users.edit', name: 'ปุ่มแก้ไขผู้ใช้งาน', description: 'สามารถกดแก้ไขข้อมูลผู้ใช้งานได้' },
      { id: 'users.delete', name: 'ปุ่มลบผู้ใช้งาน', description: 'สามารถลบบัญชีผู้ใช้งานออกจากระบบได้' },
      { id: 'users.permissions', name: 'ปุ่มตั้งค่าสิทธิ์การใช้งาน', description: 'สามารถกดปุ่มฟันเฟืองเพื่อตั้งค่าสิทธิ์การใช้งาน (หน้า/ปุ่ม) ของผู้ใช้ได้' }
    ]
  },
  {
    id: 'customers',
    name: 'จัดการข้อมูลลูกค้า (Customers)',
    icon: 'bi bi-person-lines-fill',
    description: 'สิทธิ์การจัดการข้อมูลลูกค้าในระบบ',
    actions: [
      { id: 'customers.create', name: 'ปุ่มเพิ่มลูกค้าใหม่', description: 'สามารถกดเพิ่มข้อมูลลูกค้าใหม่ได้' },
      { id: 'customers.edit', name: 'ปุ่มแก้ไขข้อมูลลูกค้า', description: 'สามารถกดแก้ไขข้อมูลลูกค้าได้' },
      { id: 'customers.delete', name: 'ปุ่มลบข้อมูลลูกค้า', description: 'สามารถลบข้อมูลลูกค้าออกจากระบบได้' },
      { id: 'customers.export', name: 'ปุ่มส่งออก Excel', description: 'สามารถดาวน์โหลดรายชื่อลูกค้าเป็นไฟล์ Excel ได้' }
    ]
  }
];

export const DEFAULT_PERMISSIONS = {
  admin: {
    pages: {
      dashboard: true,
      'manage-products': true,
      brands: true,
      categories: true,
      customers: true,
      quotations: true,
      reports: true,
      users: true,
      'activity-log': true,
    },
    actions: {
      'products.create': true,
      'products.edit': true,
      'products.delete': true,
      'products.import': true,
      'products.export': true,
      'products.print': true,
      'products.clear': true,
      'quotations.create': true,
      'quotations.createProposal': true,
      'quotations.edit': true,
      'quotations.delete': true,
      'quotations.approve': true,
      'quotations.print': true,
      'brands.create': true,
      'brands.edit': true,
      'brands.delete': true,
      'categories.create': true,
      'categories.edit': true,
      'categories.delete': true,
      'customers.create': true,
      'customers.edit': true,
      'customers.delete': true,
      'customers.export': true,
      'reports.export': true,
      'users.create': true,
      'users.edit': true,
      'users.delete': true,
      'users.permissions': true,
    }
  },
  manager: {
    pages: {
      dashboard: true,
      'manage-products': true,
      brands: true,
      categories: true,
      customers: true,
      quotations: true,
      reports: true,
      users: true,
      'activity-log': false,
    },
    actions: {
      'products.create': true,
      'products.edit': true,
      'products.delete': false,
      'products.import': true,
      'products.export': true,
      'products.print': true,
      'products.clear': false,
      'quotations.create': true,
      'quotations.createProposal': true,
      'quotations.edit': true,
      'quotations.delete': true,
      'quotations.approve': true,
      'quotations.print': true,
      'brands.create': true,
      'brands.edit': true,
      'brands.delete': false,
      'categories.create': true,
      'categories.edit': true,
      'categories.delete': false,
      'customers.create': true,
      'customers.edit': true,
      'customers.delete': false,
      'customers.export': true,
      'reports.export': true,
      'users.create': true,
      'users.edit': true,
      'users.delete': false,
      'users.permissions': false,
    }
  },
  user: {
    pages: {
      dashboard: true,
      'manage-products': true,
      brands: true,
      categories: true,
      customers: true,
      quotations: true,
      reports: true,
      users: false,
      'activity-log': false,
    },
    actions: {
      'products.create': true,
      'products.edit': true,
      'products.delete': false,
      'products.import': true,
      'products.export': true,
      'products.print': true,
      'products.clear': false,
      'quotations.create': true,
      'quotations.createProposal': true,
      'quotations.edit': true,
      'quotations.delete': true,
      'quotations.approve': false,
      'quotations.print': true,
      'brands.create': false,
      'brands.edit': false,
      'brands.delete': false,
      'categories.create': false,
      'categories.edit': false,
      'categories.delete': false,
      'customers.create': true,
      'customers.edit': true,
      'customers.delete': false,
      'customers.export': true,
      'reports.export': true,
      'users.create': false,
      'users.edit': false,
      'users.delete': false,
      'users.permissions': false,
    }
  }
};

/**
 * Returns default permission bundle for a given role
 */
export function getDefaultPermissionsForRole(role = 'user') {
  const base = DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.user;
  return {
    pages: { ...base.pages },
    actions: { ...base.actions }
  };
}

/**
 * Returns all permissions fully enabled (Full Access Preset)
 */
export function getFullPermissionsPreset() {
  const pages = {};
  PAGE_DEFINITIONS.forEach(p => { pages[p.id] = true; });
  const actions = {};
  ACTION_GROUPS.forEach(g => {
    g.actions.forEach(a => { actions[a.id] = true; });
  });
  return { pages, actions };
}

/**
 * Returns read-only permissions preset
 */
export function getReadOnlyPermissionsPreset() {
  const pages = {
    dashboard: true,
    'manage-products': true,
    brands: true,
    categories: true,
    customers: true,
    quotations: true,
    reports: true,
    users: false,
    'activity-log': false
  };
  const actions = {};
  ACTION_GROUPS.forEach(g => {
    g.actions.forEach(a => {
      // only allow print or export if appropriate
      actions[a.id] = a.id === 'quotations.print' || a.id === 'products.print';
    });
  });
  return { pages, actions };
}

/**
 * Resolves full permissions object for a user (merging role default with custom overrides)
 */
export function getUserPermissions(user) {
  if (!user) return getDefaultPermissionsForRole('user');
  const roleDefault = getDefaultPermissionsForRole(user.role);
  if (!user.permissions) return roleDefault;

  return {
    pages: {
      ...roleDefault.pages,
      ...(user.permissions.pages || {})
    },
    actions: {
      ...roleDefault.actions,
      ...(user.permissions.actions || {})
    }
  };
}

/**
 * Check if a user can access a given page
 */
export function canAccessPage(user, pageKey) {
  if (!user) return false;

  // 1. Explicit user-level override takes absolute precedence (even for admin)
  if (user.permissions?.pages && user.permissions.pages[pageKey] !== undefined) {
    return Boolean(user.permissions.pages[pageKey]);
  }

  // 2. Role default
  const roleDefault = DEFAULT_PERMISSIONS[user.role]?.pages;
  if (roleDefault && roleDefault[pageKey] !== undefined) {
    return Boolean(roleDefault[pageKey]);
  }

  // 3. Admin fallback for unconfigured pages
  if (user.role === 'admin') return true;

  return false;
}

/**
 * Check if a user can perform a given action / see a button
 */
export function canPerformAction(user, actionKey) {
  if (!user) return false;

  // 1. Explicit user-level override takes absolute precedence (even for admin)
  if (user.permissions?.actions && user.permissions.actions[actionKey] !== undefined) {
    return Boolean(user.permissions.actions[actionKey]);
  }

  // 2. Role default
  const roleDefault = DEFAULT_PERMISSIONS[user.role]?.actions;
  if (roleDefault && roleDefault[actionKey] !== undefined) {
    return Boolean(roleDefault[actionKey]);
  }

  // 3. Admin fallback for unconfigured actions
  if (user.role === 'admin') return true;

  return false;
}
