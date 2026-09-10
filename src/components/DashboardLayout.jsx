import { useState, useEffect, useRef, useMemo } from 'react';
import { canAccessPage } from '../utils/permissions';
import { useToast } from '../contexts/ToastContext';

function getActionStyle(action) {
  if (action.includes('แก้ไข')) {
    return {
      gradient: 'from-amber-400 to-orange-400',
      shadow: 'shadow-[0_4px_12px_rgba(251,191,36,0.4)]',
      badgeBg: 'bg-amber-100/80 text-amber-800',
      icon: 'bi bi-pencil-fill',
      label: 'แก้ไข'
    };
  }
  if (action.includes('เพิ่ม')) {
    return {
      gradient: 'from-emerald-400 to-teal-400',
      shadow: 'shadow-[0_4px_12px_rgba(52,211,153,0.4)]',
      badgeBg: 'bg-emerald-100/80 text-emerald-800',
      icon: 'bi bi-plus-lg',
      label: 'เพิ่ม'
    };
  }
  if (action.includes('ลบ')) {
    return {
      gradient: 'from-rose-400 to-pink-500',
      shadow: 'shadow-[0_4px_12px_rgba(244,63,94,0.4)]',
      badgeBg: 'bg-rose-100/80 text-rose-800',
      icon: 'bi bi-trash3-fill',
      label: 'ลบ'
    };
  }
  if (action.includes('ล้าง')) {
    return {
      gradient: 'from-red-500 to-rose-600',
      shadow: 'shadow-[0_4px_12px_rgba(239,68,68,0.4)]',
      badgeBg: 'bg-red-100/80 text-red-800',
      icon: 'bi bi-exclamation-triangle-fill',
      label: 'รีเซ็ต'
    };
  }
  if (action.includes('เข้าสู่ระบบ') || action.includes('ออกจากระบบ')) {
    return {
      gradient: 'from-violet-400 to-purple-500',
      shadow: 'shadow-[0_4px_12px_rgba(139,92,246,0.4)]',
      badgeBg: 'bg-violet-100/80 text-violet-800',
      icon: action.includes('ออก') ? 'bi bi-box-arrow-right' : 'bi bi-box-arrow-in-right',
      label: action.includes('ออก') ? 'ออกจากระบบ' : 'เข้าสู่ระบบ'
    };
  }
  if (action.includes('เปลี่ยน') || action.includes('รหัสผ่าน') || action.includes('Username')) {
    return {
      gradient: 'from-sky-400 to-blue-500',
      shadow: 'shadow-[0_4px_12px_rgba(56,189,248,0.4)]',
      badgeBg: 'bg-sky-100/80 text-sky-800',
      icon: 'bi bi-person-gear',
      label: 'บัญชี'
    };
  }
  return {
    gradient: 'from-blue-400 to-indigo-500',
    shadow: 'shadow-[0_4px_12px_rgba(99,102,241,0.35)]',
    badgeBg: 'bg-blue-100/80 text-blue-800',
    icon: 'bi bi-info-circle-fill',
    label: 'ทั่วไป'
  };
}

function getRelativeTimeThai(timestamp) {
  if (!timestamp) return 'ไม่ทราบเวลา';
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) {
    return 'เมื่อสักครู่';
  }
  if (diffMins < 60) {
    return `${diffMins} นาทีที่แล้ว`;
  }
  if (diffHours < 24) {
    return `${diffHours} ชั่วโมงที่แล้ว`;
  }
  if (diffDays === 1) {
    return 'เมื่อวานนี้';
  }
  
  const dateObj = new Date(timestamp);
  return dateObj.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function DashboardLayout({
  currentUser,
  users = [],
  onLogout,
  onChangePassword,
  onUpdateProfile,
  activeTab,
  setActiveTab,
  children,
  activityLog = [],
  quotations = [],
  onLogin,
}) {
  const showToast = useToast();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(false);


  const handleSandboxSwitch = async (targetRole) => {
    if (!onLogin || switchingRole) return;
    
    const matchingUser = users.find(u => u.role === targetRole);
    const targetUsername = matchingUser?.username || (targetRole === 'admin' ? 'admin' : targetRole === 'manager' ? 'manager' : 'earth');
    const candidatePasswords = ['password', '1111', '12345678', 'admin', 'user'];
    
    setSwitchingRole(true);
    let success = false;
    let lastError = null;

    for (const pwd of candidatePasswords) {
      try {
        await onLogin(targetUsername, pwd);
        success = true;
        setIsProfileOpen(false);
        setIsMobileMenuOpen(false);
        break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!success) {
      showToast(`ไม่สามารถสลับไปยังสิทธิ์ ${targetRole.toUpperCase()} (${targetUsername}) ได้: ${lastError?.message || 'โปรดตรวจสอบชื่อผู้ใช้หรือรหัสผ่าน'}`, 'error');
    }
    setSwitchingRole(false);
  };
  const [isUsersDropdownOpen, setIsUsersDropdownOpen] = useState(false);
  const [isProductsDropdownOpen, setIsProductsDropdownOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);

  const [editProfileForm, setEditProfileForm] = useState({ name: '', username: '' });
  const [editProfileError, setEditProfileError] = useState('');
  const [editProfileErrorField, setEditProfileErrorField] = useState(false);
  const [editProfileSuccess, setEditProfileSuccess] = useState(false);
  const refEditUsername = useRef(null);

  const [showChangePwd, setShowChangePwd] = useState(false);
  const [changePwdForm, setChangePwdForm] = useState({ oldPwd: '', newPwd: '', confirmPwd: '' });
  const [changePwdError, setChangePwdError] = useState('');
  const [changePwdErrorFields, setChangePwdErrorFields] = useState({});
  const [changePwdSuccess, setChangePwdSuccess] = useState(false);
  const [showOldPwd, setShowOldPwd] = useState(false);  
  const [showNewPwd, setShowNewPwd] = useState(false);
  const refOldPwd = useRef(null);
  const refNewPwd = useRef(null);

  const pendingQuotationsCount = useMemo(() => {
    return quotations.filter(q => q.status === 'sent' && q.documentType === 'quotation').length;
  }, [quotations]);
  
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [lastReadTime, setLastReadTime] = useState(() => {
    try {
      const saved = localStorage.getItem('pim_notifications_last_read');
      return saved ? new Date(saved).getTime() : 0;
    } catch {
      return 0;
    }
  });
  const unreadCount = useMemo(() => {
    return activityLog.filter(log => new Date(log.timestamp).getTime() > lastReadTime).length;
  }, [activityLog, lastReadTime]);
  const [shouldShake, setShouldShake] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState(null);

  const profileRef = useRef(null);
  const usersDropdownRef = useRef(null);
  const productsDropdownRef = useRef(null);
  const notificationRef = useRef(null);
  const prevLogLengthRef = useRef(activityLog.length);
  const dropdownTimeoutRef = useRef(null);
  const productsDropdownTimeoutRef = useRef(null);
  const profileTimeoutRef = useRef(null);

  const handleMouseEnterUsers = () => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
      dropdownTimeoutRef.current = null;
    }
    setIsUsersDropdownOpen(true);
  };

  const handleMouseLeaveUsers = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setIsUsersDropdownOpen(false);
    }, 150); // 150ms close delay
  };

  const handleMouseEnterProducts = () => {
    if (productsDropdownTimeoutRef.current) {
      clearTimeout(productsDropdownTimeoutRef.current);
      productsDropdownTimeoutRef.current = null;
    }
    setIsProductsDropdownOpen(true);
  };

  const handleMouseLeaveProducts = () => {
    productsDropdownTimeoutRef.current = setTimeout(() => {
      setIsProductsDropdownOpen(false);
    }, 150); // 150ms close delay
  };

  const handleMouseEnterProfile = () => {
    if (profileTimeoutRef.current) {
      clearTimeout(profileTimeoutRef.current);
      profileTimeoutRef.current = null;
    }
    setIsProfileOpen(true);
  };

  const handleMouseLeaveProfile = () => {
    profileTimeoutRef.current = setTimeout(() => {
      setIsProfileOpen(false);
    }, 150); // 150ms close delay
  };

  useEffect(() => {
    return () => {
      if (dropdownTimeoutRef.current) {
        clearTimeout(dropdownTimeoutRef.current);
      }
      if (productsDropdownTimeoutRef.current) {
        clearTimeout(productsDropdownTimeoutRef.current);
      }

      if (profileTimeoutRef.current) {
        clearTimeout(profileTimeoutRef.current);
      }
    };
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (usersDropdownRef.current && !usersDropdownRef.current.contains(event.target)) {
        setIsUsersDropdownOpen(false);
      }
      if (productsDropdownRef.current && !productsDropdownRef.current.contains(event.target)) {
        setIsProductsDropdownOpen(false);
      }

      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Shake the bell on new logs
  useEffect(() => {
    if (activityLog.length > prevLogLengthRef.current) {
      if (prevLogLengthRef.current > 0) {
        setShouldShake(true);
        const timer = setTimeout(() => setShouldShake(false), 650);
        return () => clearTimeout(timer);
      }
    }
    prevLogLengthRef.current = activityLog.length;
  }, [activityLog]);

  // Close mobile menu on tab change
  const handleNavClick = (key) => {
    setActiveTab(key);
    setIsMobileMenuOpen(false);
    setIsUsersDropdownOpen(false);
    setIsProductsDropdownOpen(false);
  };

  // Lock body and html scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const menuItems = [
    { key: 'dashboard',   name: 'Dashboard',   icon: "bi bi-grid-1x2-fill", minRole: 'user' },
    { key: 'manage-data', name: 'จัดการข้อมูล', icon: "bi bi-database-fill", minRole: 'user' },
    { key: 'quotations',  name: 'ใบเสนอราคา',   icon: "bi bi-file-earmark-text-fill",  minRole: 'user' },
    { key: 'reports',     name: 'รายงานสินค้า', icon: "bi bi-bar-chart-fill",        minRole: 'user' },
  ];

  const hasAccess = (itemOrKey) => {
    if (!currentUser) return false;
    const pageKey = typeof itemOrKey === 'string' ? itemOrKey : itemOrKey?.key;
    if (pageKey === 'manage-data') {
      return canAccessPage(currentUser, 'manage-products') ||
             canAccessPage(currentUser, 'brands') ||
             canAccessPage(currentUser, 'categories') ||
             canAccessPage(currentUser, 'customers');
    }
    return canAccessPage(currentUser, pageKey);
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <span className="px-2.5 py-0.5 text-xs font-semibold bg-[#6B46C1] text-white rounded-md border border-[#6B46C1]/10 shadow-[0_1px_3px_rgba(107,70,193,0.2)]">Admin</span>;
      case 'manager':
        return <span className="px-2.5 py-0.5 text-xs font-semibold bg-[#1A365D] text-white rounded-md border border-[#1A365D]/10 shadow-[0_1px_3px_rgba(26,54,93,0.2)]">Manager</span>;
      default:
        return <span className="px-2.5 py-0.5 text-xs font-semibold bg-[#2F855A] text-white rounded-md border border-[#2F855A]/10 shadow-[0_1px_3px_rgba(47,133,90,0.2)]">User</span>;
    }
  };

  // Determine if activeTab belongs to users group
  const isUserGroupActive = activeTab === 'users' || activeTab === 'activity-log';

  // Determine if activeTab belongs to data group (products, brands, categories, customers)
  const isDataGroupActive = activeTab === 'manage-products' || activeTab === 'brands' || activeTab === 'categories' || activeTab === 'customers';

  const handleLogoClick = () => {
    if (canAccessPage(currentUser, 'dashboard')) {
      handleNavClick('dashboard');
    } else {
      const allTabs = ['manage-products', 'brands', 'categories', 'customers', 'quotations', 'reports', 'users', 'activity-log'];
      const firstAllowed = allTabs.find(t => canAccessPage(currentUser, t));
      if (firstAllowed) handleNavClick(firstAllowed);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f7] font-sans text-[#1d1d1f]">
      
      {/* ── Navbar header ───────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full h-16 bg-white/85 backdrop-blur-xl border-b border-[#d2d2d7]/40 no-print shadow-[0_1px_0_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.04)]">
        <div className="w-full h-full px-4 sm:px-6 lg:px-12 flex items-center justify-between">
                
          {/* Left: Brand Logo */}
          <div className="flex items-center gap-2.5 cursor-pointer group lg:w-[320px] shrink-0" onClick={handleLogoClick}>
            <div className="w-7 h-8 shrink-0 transition-transform duration-300 group-hover:scale-110">
              <svg viewBox="0 0 80 90" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <path d="M 20 38 L 20 26 L 60 11 L 60 23 Z" fill="#000000" />
                <path d="M 20 60 L 20 48 L 60 33 L 60 45 Z" fill="#000000" />
                <path d="M 20 82 L 20 70 L 60 55 L 60 67 Z" fill="#000000" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm tracking-tight text-black uppercase leading-none">PIM-SYSTEM</span>
              <span className="text-[8.5px] text-black font-semibold mt-0.5 tracking-widest uppercase">PRODUCT INFORMATION MANAGEMENT</span>
            </div>
          </div>

          {/* Center: Desktop Minimalist Menu Links */}
          <nav className="hidden lg:flex items-center justify-center gap-1 flex-1">
            {menuItems.map((item) => {
              if (!hasAccess(item.key)) return null;

              if (item.key === 'manage-data') {
                const canProducts = canAccessPage(currentUser, 'manage-products');
                const canBrands = canAccessPage(currentUser, 'brands');
                const canCategories = canAccessPage(currentUser, 'categories');
                const canCustomers = canAccessPage(currentUser, 'customers');
                if (!canProducts && !canBrands && !canCategories && !canCustomers) return null;

                return (
                  <div 
                    key="data-dropdown"
                    className="relative" 
                    ref={productsDropdownRef}
                    onMouseEnter={handleMouseEnterProducts}
                    onMouseLeave={handleMouseLeaveProducts}
                  >
                    <button type="button"
                      onClick={() => setIsProductsDropdownOpen(!isProductsDropdownOpen)}
                      className={`
                        px-3.5 py-1.5 text-xs font-bold rounded-full transition-all duration-200 cursor-pointer whitespace-nowrap flex items-center gap-1
                        ${isDataGroupActive
                          ? 'bg-gradient-to-r from-[#0071e3]/15 to-[#0077ed]/10 text-[#0071e3] shadow-[0_1px_6px_rgba(0,113,227,0.18)] ring-1 ring-[#0071e3]/20'
                          : 'text-[#555557] hover:text-[#1d1d1f] hover:bg-zinc-100/80'
                        }
                      `}
                    >
                      <span>จัดการข้อมูล</span>
                      <i className={`bi bi-chevron-down text-[10px] transition-transform duration-200 ${isProductsDropdownOpen ? 'rotate-180' : ''}`}></i>
                    </button>

                    {isProductsDropdownOpen && (
                      <div className="absolute top-full left-0 w-60 pt-2 z-30">
                        <div className="bg-white/95 backdrop-blur-xl rounded-2xl border border-[#d2d2d7]/40 shadow-[0_16px_48px_rgba(0,0,0,0.1),0_4px_12px_rgba(0,0,0,0.06)] p-2 space-y-1.5 animate-scale-in">
                          
                          {/* Section 1: ข้อมูลสินค้า */}
                          {(canProducts || canBrands || canCategories) && (
                            <div>
                              <div className="px-3 pt-1 pb-1 text-[10.5px] font-black text-[#86868b] tracking-wider uppercase flex items-center gap-1.5">
                                <i className="bi bi-box-seam text-xs text-[#0071e3]"></i>
                                <span>ข้อมูลสินค้า</span>
                              </div>
                              <div className="space-y-0.5 mt-0.5">
                                {canProducts && (
                                  <button type="button"
                                    onClick={() => handleNavClick('manage-products')}
                                    className={`w-full text-left px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${activeTab === 'manage-products' ? 'bg-[#0071e3]/10 text-[#0071e3]' : 'text-zinc-700 hover:bg-zinc-100/80 hover:text-black'}`}
                                  >
                                    <span>จัดการข้อมูลสินค้า</span>
                                  </button>
                                )}
                                {canBrands && (
                                  <button type="button"
                                    onClick={() => handleNavClick('brands')}
                                    className={`w-full text-left px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${activeTab === 'brands' ? 'bg-[#0071e3]/10 text-[#0071e3]' : 'text-zinc-700 hover:bg-zinc-100/80 hover:text-black'}`}
                                  >
                                    <span>จัดการแบรนด์สินค้า</span>
                                  </button>
                                )}
                                {canCategories && (
                                  <button type="button"
                                    onClick={() => handleNavClick('categories')}
                                    className={`w-full text-left px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${activeTab === 'categories' ? 'bg-[#0071e3]/10 text-[#0071e3]' : 'text-zinc-700 hover:bg-zinc-100/80 hover:text-black'}`}
                                  >
                                    <span>จัดการหมวดหมู่สินค้า</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Section Divider */}
                          {((canProducts || canBrands || canCategories) && canCustomers) && (
                            <div className="border-t border-[#d2d2d7]/50 my-1 mx-1" />
                          )}

                          {/* Section 2: ข้อมูลลูกค้า */}
                          {canCustomers && (
                            <div>
                              <div className="px-3 pt-1 pb-1 text-[10.5px] font-black text-[#86868b] tracking-wider uppercase flex items-center gap-1.5">
                                <i className="bi bi-people text-xs text-[#0071e3]"></i>
                                <span>ข้อมูลลูกค้า</span>
                              </div>
                              <div className="space-y-0.5 mt-0.5">
                                <button type="button"
                                  onClick={() => handleNavClick('customers')}
                                  className={`w-full text-left px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${activeTab === 'customers' ? 'bg-[#0071e3]/10 text-[#0071e3]' : 'text-zinc-700 hover:bg-zinc-100/80 hover:text-black'}`}
                                >
                                  <span>จัดการข้อมูลลูกค้า</span>
                                </button>
                              </div>
                            </div>
                          )}

                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              const isActive = activeTab === item.key;
              return (
                <button type="button"
                  key={item.key}
                  onClick={() => handleNavClick(item.key)}
                  className={`
                    px-3.5 py-1.5 text-xs font-bold rounded-full transition-all duration-200 cursor-pointer whitespace-nowrap flex items-center gap-1.5
                    ${isActive
                      ? 'bg-gradient-to-r from-[#0071e3]/15 to-[#0077ed]/10 text-[#0071e3] shadow-[0_1px_6px_rgba(0,113,227,0.18)] ring-1 ring-[#0071e3]/20'
                      : 'text-[#555557] hover:text-[#1d1d1f] hover:bg-zinc-100/80'
                    }
                  `}
                >
                  <span>{item.name}</span>
                  {item.key === 'quotations' && currentUser?.role === 'admin' && pendingQuotationsCount > 0 && (
                    <span className="flex h-2 w-2 relative shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                  )}
                </button>
              );
            })}

            {/* Dropdown for Manage Users (Respecting page permissions) */}
            {(() => {
              const canUsers = canAccessPage(currentUser, 'users');
              const canActivityLog = canAccessPage(currentUser, 'activity-log');
              if (!canUsers && !canActivityLog) return null;

              if (canUsers && canActivityLog) {
                return (
                  <div 
                    className="relative" 
                    ref={usersDropdownRef}
                    onMouseEnter={handleMouseEnterUsers}
                    onMouseLeave={handleMouseLeaveUsers}
                  >
                    <button type="button"
                      onClick={() => setIsUsersDropdownOpen(!isUsersDropdownOpen)}
                      className={`
                        px-3.5 py-1.5 text-xs font-bold rounded-full transition-all duration-200 cursor-pointer whitespace-nowrap flex items-center gap-1
                        ${isUserGroupActive
                          ? 'bg-gradient-to-r from-[#0071e3]/15 to-[#0077ed]/10 text-[#0071e3] shadow-[0_1px_6px_rgba(0,113,227,0.18)] ring-1 ring-[#0071e3]/20'
                          : 'text-[#555557] hover:text-[#1d1d1f] hover:bg-zinc-100/80'
                        }
                      `}
                    >
                      <span>จัดการผู้ใช้งาน</span>
                      <i className={`bi bi-chevron-down text-[10px] transition-transform duration-200 ${isUsersDropdownOpen ? 'rotate-180' : ''}`}></i>
                    </button>

                    {isUsersDropdownOpen && (
                      <div className="absolute top-full left-0 w-52 pt-2 z-30">
                        <div className="bg-white/95 backdrop-blur-xl rounded-2xl border border-[#d2d2d7]/40 shadow-[0_16px_48px_rgba(0,0,0,0.1),0_4px_12px_rgba(0,0,0,0.06)] p-1.5 space-y-0.5 animate-scale-in">
                          <button type="button"
                            onClick={() => handleNavClick('users')}
                            className={`w-full text-left px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${activeTab === 'users' ? 'bg-[#0071e3]/10 text-[#0071e3]' : 'text-zinc-650 hover:bg-zinc-50 hover:text-black'}`}
                          >
                            <i className="bi bi-people-fill"></i>
                            <span>บัญชีผู้ใช้งาน</span>
                          </button>

                          <button type="button"
                            onClick={() => handleNavClick('activity-log')}
                            className={`w-full text-left px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${activeTab === 'activity-log' ? 'bg-[#0071e3]/10 text-[#0071e3]' : 'text-zinc-650 hover:bg-zinc-50 hover:text-black'}`}
                          >
                            <i className="bi bi-clock-history"></i>
                            <span>ประวัติการดำเนินงาน</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              if (canUsers) {
                return (
                  <button type="button"
                    onClick={() => handleNavClick('users')}
                    className={`
                      px-3.5 py-1.5 text-xs font-bold rounded-full transition-all duration-200 cursor-pointer whitespace-nowrap
                      ${activeTab === 'users'
                        ? 'bg-gradient-to-r from-[#0071e3]/15 to-[#0077ed]/10 text-[#0071e3] shadow-[0_1px_6px_rgba(0,113,227,0.18)] ring-1 ring-[#0071e3]/20'
                        : 'text-[#555557] hover:text-[#1d1d1f] hover:bg-zinc-100/80'
                      }
                    `}
                  >
                    จัดการผู้ใช้งาน
                  </button>
                );
              }

              return (
                <button type="button"
                  onClick={() => handleNavClick('activity-log')}
                  className={`
                    px-3.5 py-1.5 text-xs font-bold rounded-full transition-all duration-200 cursor-pointer whitespace-nowrap
                    ${activeTab === 'activity-log'
                      ? 'bg-gradient-to-r from-[#0071e3]/15 to-[#0077ed]/10 text-[#0071e3] shadow-[0_1px_6px_rgba(0,113,227,0.18)] ring-1 ring-[#0071e3]/20'
                      : 'text-[#555557] hover:text-[#1d1d1f] hover:bg-zinc-100/80'
                    }
                  `}
                >
                  ประวัติการดำเนินงาน
                </button>
              );
            })()}
          </nav>

          {/* Right: User Profile & Mobile Toggle */}
          <div className="flex items-center gap-3 lg:w-[320px] lg:justify-end shrink-0">
            
            {/* Bell Notification Dropdown (Admin only) */}
            {currentUser.role === 'admin' && (
              <div className="relative" ref={notificationRef}>
                <button type="button"
                  onClick={() => {
                    const nextVal = !isNotificationsOpen;
                    setIsNotificationsOpen(nextVal);
                    if (nextVal) {
                      const now = Date.now();
                      setLastReadTime(now);
                      localStorage.setItem('pim_notifications_last_read', new Date(now).toISOString());
                    }
                  }}
                  className={`
                    relative p-2.5 text-zinc-600 hover:text-[#0071e3] rounded-full transition-all duration-300 cursor-pointer flex items-center justify-center bg-white/90 border border-[#d2d2d7]/60 shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:shadow-[0_2px_12px_rgba(0,113,227,0.15)] hover:border-[#0071e3]/30 hover:bg-white
                    ${shouldShake ? 'animate-bell-shake' : ''}
                  `}
                  title="การแจ้งเตือนกิจกรรม"
                >
                  <i className={`bi ${unreadCount > 0 ? 'bi-bell-fill text-[#0071e3]' : 'bi-bell'} text-lg`}></i>
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-gradient-to-tr from-rose-600 to-pink-500 rounded-full animate-notification-glow border border-white shadow-xs">
                    </span>
                  )}
                </button>

                {isNotificationsOpen && (
                  <div className="absolute right-0 top-full w-85 pt-2.5 z-45">
                    <div className="bg-white/97 backdrop-blur-2xl rounded-3xl border border-[#d2d2d7]/35 shadow-[0_24px_64px_rgba(0,0,0,0.12),0_8px_24px_rgba(0,0,0,0.06)] p-4.5 space-y-3.5 animate-scale-in text-[#1d1d1f]">
                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-[#e8e8ed] pb-2.5">
                        <div className="flex flex-col">
                          <span className="text-[12px] font-extrabold uppercase tracking-wider text-zinc-800">การแจ้งเตือนกิจกรรม</span>
                          <span className="text-[9px] text-zinc-400 font-semibold mt-0.5 uppercase tracking-wide">ล่าสุดในระบบ PIM</span>
                        </div>
                        {unreadCount > 0 ? (
                          <button type="button"
                            onClick={() => {
                              const now = Date.now();
                              setLastReadTime(now);
                              localStorage.setItem('pim_notifications_last_read', new Date(now).toISOString());
                            }}
                            className="text-[10px] text-[#0071e3] hover:text-[#0077ed] font-bold cursor-pointer transition-colors px-2 py-0.5 hover:bg-[#0071e3]/5 rounded-md"
                          >
                            อ่านแล้วทั้งหมด
                          </button>
                        ) : (
                          <span className="text-[9px] text-zinc-500 font-bold bg-[#f5f5f7] px-2 py-0.5 rounded-full">อัปเดตแล้ว</span>
                        )}
                      </div>

                      {/* Notification List */}
                      <div className="space-y-2.5 max-h-80 overflow-y-auto -mx-2.5 px-2.5 scrollbar-thin notification-scrollbar">
                        {activityLog.length === 0 ? (
                          <div className="py-10 text-center flex flex-col items-center justify-center text-zinc-400 gap-2">
                            <div className="w-12 h-12 rounded-full bg-zinc-50 flex items-center justify-center border border-zinc-100 text-zinc-300">
                              <i className="bi bi-bell text-xl"></i>
                            </div>
                            <span className="text-xs font-semibold">ไม่มีกิจกรรมล่าสุดในระบบ</span>
                          </div>
                        ) : (
                          activityLog.slice(0, 8).map((log) => {
                            const actStyle = getActionStyle(log.action);
                            const isUnread = new Date(log.timestamp).getTime() > lastReadTime;
                            const isExpanded = expandedLogId === log.id;
                            const hasChanges = log.details?.changes && log.details.changes.length > 0;
                            
                            return (
                              <div
                                key={log.id}
                                onClick={() => hasChanges && setExpandedLogId(isExpanded ? null : log.id)}
                                className={`
                                  group relative p-2.5 rounded-2xl transition-all duration-200 border flex flex-col gap-1.5
                                  ${isUnread 
                                    ? 'bg-[#0071e3]/5 border-[#0071e3]/15 hover:bg-[#0071e3]/10 hover:border-[#0071e3]/25 shadow-2xs' 
                                    : 'bg-white border-zinc-100 hover:bg-zinc-50/70 hover:border-zinc-200/50'
                                  }
                                  ${hasChanges ? 'cursor-pointer' : ''}
                                `}
                              >
                                <div className="flex gap-2.5 items-start">
                                  {/* Action Icon */}
                                  <div className={`w-9 h-9 rounded-2xl bg-gradient-to-br ${actStyle.gradient} ${actStyle.shadow} flex items-center justify-center shrink-0 text-white`} style={{fontSize:'13px'}}>
                                    <i className={actStyle.icon}></i>
                                  </div>

                                  {/* Log details */}
                                  <div className="space-y-0.5 flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className={`px-1.5 py-0.25 text-[8px] font-extrabold uppercase tracking-wide rounded-md ${actStyle.badgeBg} border border-current/10`}>
                                        {actStyle.label}
                                      </span>
                                      {hasChanges && (
                                        <span className="px-1.5 py-0.25 text-[8px] font-extrabold uppercase tracking-wide bg-zinc-100 text-zinc-650 rounded-md border border-zinc-200/60">
                                          แก้ไข {log.details.changes.length} รายการ
                                        </span>
                                      )}
                                    </div>
                                    <p className={`text-[11px] font-bold text-zinc-800 leading-snug group-hover:text-black ${isExpanded ? '' : 'line-clamp-2'}`}>
                                      {log.action}
                                    </p>
                                    
                                    <div className="flex justify-between items-center text-[9px] text-[#555557] font-semibold pt-1">
                                      <span className="flex items-center gap-1">
                                        <i className="bi bi-person-circle text-[10px]"></i>
                                        {log.userName}
                                      </span>
                                      <span className="font-mono text-zinc-400">
                                        {getRelativeTimeThai(log.timestamp)}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Unread indicators */}
                                  {isUnread && (
                                    <span className="w-2 h-2 rounded-full bg-[#0071e3] shrink-0 mt-2 shadow-[0_0_6px_#0071e3]"></span>
                                  )}
                                </div>

                                {/* Expanded changes view */}
                                {isExpanded && hasChanges && (
                                  <div className="mt-1 pl-10 pr-1 pb-1 space-y-1.5 text-[10px] animate-scale-in border-t border-zinc-100/60 pt-2">
                                    <div className="font-bold text-zinc-400 uppercase tracking-wider text-[8px] mb-1">
                                      รายละเอียดการเปลี่ยนแปลง:
                                    </div>
                                    <div className="space-y-1.5">
                                      {log.details.changes.map((ch, idx) => (
                                        <div key={idx} className="flex flex-col gap-0.5 py-1 px-2 bg-zinc-50 rounded-lg border border-zinc-150/50">
                                          <div className="font-bold text-zinc-700">{ch.field}</div>
                                          <div className="flex items-center gap-1 text-[9.5px] truncate text-zinc-500">
                                            <span>ก่อน:</span>
                                            <span className="text-rose-500 bg-rose-50 px-1 py-0.25 rounded border border-rose-100/50 line-through truncate max-w-[100px]">{ch.before}</span>
                                            <i className="bi bi-arrow-right text-zinc-400 text-[8px]"></i>
                                            <span>หลัง:</span>
                                            <span className="text-emerald-600 bg-emerald-50 px-1 py-0.25 rounded border border-emerald-100/50 font-bold truncate max-w-[100px]">{ch.after}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                    {(log.details.remark || log.details.editRemark) && (
                                      <div className="mt-2 p-2 bg-amber-50/60 border border-amber-200/30 rounded-lg text-amber-800 text-[9.5px] font-medium leading-normal break-words">
                                        <span className="font-bold">หมายเหตุ:</span> {log.details.remark || log.details.editRemark}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Footer */}
                      <div className="border-t border-[#e8e8ed] pt-2.5">
                        <button type="button"
                          onClick={() => {
                            setIsNotificationsOpen(false);
                            handleNavClick('activity-log');
                          }}
                          className="w-full py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-98"
                        >
                          <i className="bi bi-clock-history"></i>
                          <span>ดูประวัติทั้งหมด</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Desktop User profile dropdown */}
            <div 
              className="relative hidden lg:block" 
              ref={profileRef}
              onMouseEnter={handleMouseEnterProfile}
              onMouseLeave={handleMouseLeaveProfile}
            >
              <button
                type="button"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#d2d2d7]/60 bg-white/90 hover:bg-white hover:border-[#d2d2d7] hover:shadow-[0_2px_12px_rgba(0,0,0,0.08)] transition-all duration-200 cursor-pointer text-xs group shadow-[0_1px_4px_rgba(0,0,0,0.06)]"
              >
                <span className="font-bold text-[#1d1d1f] group-hover:text-black">{currentUser?.name || currentUser?.username || 'User'}</span>
                <i className={`bi bi-chevron-down text-[10px] text-zinc-400 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`}></i>
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 top-full w-64 pt-2 z-30">
                  <div className="bg-white/95 backdrop-blur-xl rounded-3xl border border-[#d2d2d7]/40 shadow-[0_20px_60px_rgba(0,0,0,0.12),0_4px_16px_rgba(0,0,0,0.06)] p-4 space-y-4 animate-scale-in">
                    <div className="flex items-center">
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-[#1d1d1f] truncate leading-tight">{currentUser?.name || currentUser?.username || 'User'}</span>
                        <span className="text-[10px] text-[#86868b] truncate mt-0.5">@{currentUser?.username || 'user'}</span>
                        <div className="flex mt-1.5">{getRoleBadge(currentUser?.role)}</div>
                      </div>
                    </div>

                    <hr className="border-zinc-100" />

                    {/* Sandbox Role Switcher Section */}
                    <div className="space-y-2 bg-transparent p-2.5 rounded-2xl border border-zinc-200/60">
                      <div className="flex items-center justify-between px-0.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                          <i className="bi bi-[#0071e3] bi-person-gear text-[#0071e3]"></i>
                          Sandbox Switcher
                        </span>
                        <span className="text-[9px] font-bold text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded-full border border-amber-200">
                          สลับ Role
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5">
                        {/* Admin */}
                        <button
                          type="button"
                          onClick={() => handleSandboxSwitch('admin')}
                          disabled={currentUser?.role === 'admin' || switchingRole}
                          title="สลับเป็น Admin"
                          className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-[10px] font-bold transition-all cursor-pointer ${
                            currentUser?.role === 'admin'
                              ? 'bg-[#6B46C1] text-white border-[#6B46C1] shadow-xs cursor-default'
                              : 'bg-white hover:bg-[#6B46C1]/10 text-zinc-700 border-zinc-200 hover:border-[#6B46C1]/40 hover:text-[#6B46C1]'
                          }`}
                        >
                          <i className={`bi bi-shield-lock-fill text-xs mb-0.5 ${currentUser?.role === 'admin' ? 'text-white' : 'text-[#6B46C1]'}`}></i>
                          <span>Admin</span>
                        </button>

                        {/* Manager */}
                        <button
                          type="button"
                          onClick={() => handleSandboxSwitch('manager')}
                          disabled={currentUser?.role === 'manager' || switchingRole}
                          title="สลับเป็น Manager"
                          className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-[10px] font-bold transition-all cursor-pointer ${
                            currentUser?.role === 'manager'
                              ? 'bg-[#1A365D] text-white border-[#1A365D] shadow-xs cursor-default'
                              : 'bg-white hover:bg-[#1A365D]/10 text-zinc-700 border-zinc-200 hover:border-[#1A365D]/40 hover:text-[#1A365D]'
                          }`}
                        >
                          <i className={`bi bi-person-badge-fill text-xs mb-0.5 ${currentUser?.role === 'manager' ? 'text-white' : 'text-[#1A365D]'}`}></i>
                          <span>Manager</span>
                        </button>

                        {/* User */}
                        <button
                          type="button"
                          onClick={() => handleSandboxSwitch('user')}
                          disabled={currentUser?.role === 'user' || switchingRole}
                          title="สลับเป็น User ( Sales )"
                          className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-[10px] font-bold transition-all cursor-pointer ${
                            currentUser?.role === 'user'
                              ? 'bg-[#2F855A] text-white border-[#2F855A] shadow-xs cursor-default'
                              : 'bg-white hover:bg-[#2F855A]/10 text-zinc-700 border-zinc-200 hover:border-[#2F855A]/40 hover:text-[#2F855A]'
                          }`}
                        >
                          <i className={`bi bi-person-fill text-xs mb-0.5 ${currentUser?.role === 'user' ? 'text-white' : 'text-[#2F855A]'}`}></i>
                          <span>User</span>
                        </button>
                      </div>
                    </div>

                    <hr className="border-zinc-100" />

                    <button type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        setEditProfileForm({
                          name: currentUser?.name || '',
                          username: currentUser?.username || ''
                        });
                        setEditProfileError('');
                        setEditProfileErrorField(false);
                        setEditProfileSuccess(false);
                        setShowEditProfile(true);
                      }}
                      className="w-full py-2.5 rounded-xl text-xs font-semibold bg-zinc-50 hover:bg-zinc-100 text-zinc-700 transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <i className="bi bi-person-badge"></i>
                      <span>เปลี่ยนชื่อผู้ใช้ (Username)</span>
                    </button>

                    <button type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        setChangePwdForm({ oldPwd: '', newPwd: '', confirmPwd: '' });
                        setChangePwdError('');
                        setChangePwdErrorFields({});
                        setChangePwdSuccess(false);
                        setShowChangePwd(true);
                      }}
                      className="w-full py-2.5 rounded-xl text-xs font-semibold bg-zinc-50 hover:bg-zinc-100 text-zinc-700 transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <i className="bi bi-key-fill"></i>
                      <span>เปลี่ยนรหัสผ่าน</span>
                    </button>

                    <button type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        setShowLogoutConfirm(true);
                      }}
                      className="w-full py-2.5 rounded-xl text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-650 transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <i className="bi bi-box-arrow-right"></i>
                      <span>ออกจากระบบ</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Hamburger menu */}
            <button type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-zinc-600 hover:text-black focus:outline-none lg:hidden cursor-pointer"
            >
              {isMobileMenuOpen ? <i className="bi bi-x-lg text-lg"></i> : <i className="bi bi-list text-2xl"></i>}
            </button>

          </div>
        </div>
      </header>

      {/* Mobile Drawer Menu Panel */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 no-print">
          {/* Backdrop overlay - dim only, no blur */}
          <div 
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute inset-0 bg-black/30 animate-fade-in"
          />
          {/* Drawer container */}
          <div className="absolute right-0 top-0 bottom-0 w-[300px] max-w-[calc(100vw-56px)] bg-white/97 backdrop-blur-xl border-l border-[#d2d2d7]/50 shadow-[0_0_60px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden animate-slide-in-right mobile-drawer">
            
            {/* Close Button Header */}
            <div className="flex items-center justify-end p-3 pb-0 shrink-0">
              <button type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 text-zinc-500 hover:text-black hover:bg-zinc-100 rounded-full cursor-pointer transition-colors"
                aria-label="Close menu"
              >
                <i className="bi bi-x-lg text-base"></i>
              </button>
            </div>

            <hr className="border-zinc-100 mx-3 shrink-0" />

            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-3 p-3 pt-2 scrollbar-thin">

            {/* User Profile Info */}
            <div className="bg-[#f5f5f7] p-3 rounded-2xl border border-[#d2d2d7]/35 flex items-center user-card shrink-0">
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-[#1d1d1f] truncate leading-tight user-name">{currentUser?.name || currentUser?.username || 'User'}</span>
                <span className="text-[10px] text-[#555557] truncate mt-0.5 user-username">@{currentUser?.username || 'user'}</span>
                <div className="flex mt-1.5 user-badge">{getRoleBadge(currentUser?.role)}</div>
              </div>
            </div>

            {/* Sandbox Role Switcher for Mobile Drawer */}
            <div className="bg-transparent p-2.5 rounded-2xl border border-zinc-200/60 space-y-2 shrink-0">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                  <i className="bi bi-person-gear text-[#0071e3]"></i>
                  Sandbox Switcher
                </span>
                <span className="text-[9px] font-bold text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded-full border border-amber-200">
                  สลับ Role
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSandboxSwitch('admin')}
                  disabled={currentUser?.role === 'admin' || switchingRole}
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-[10px] font-bold transition-all cursor-pointer ${
                    currentUser?.role === 'admin'
                      ? 'bg-[#6B46C1] text-white border-[#6B46C1]'
                      : 'bg-white text-zinc-700 border-zinc-200'
                  }`}
                >
                  <i className="bi bi-shield-lock-fill text-xs mb-0.5"></i>
                  <span>Admin</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSandboxSwitch('manager')}
                  disabled={currentUser?.role === 'manager' || switchingRole}
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-[10px] font-bold transition-all cursor-pointer ${
                    currentUser?.role === 'manager'
                      ? 'bg-[#1A365D] text-white border-[#1A365D]'
                      : 'bg-white text-zinc-700 border-zinc-200'
                  }`}
                >
                  <i className="bi bi-person-badge-fill text-xs mb-0.5"></i>
                  <span>Manager</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSandboxSwitch('user')}
                  disabled={currentUser?.role === 'user' || switchingRole}
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-[10px] font-bold transition-all cursor-pointer ${
                    currentUser?.role === 'user'
                      ? 'bg-[#2F855A] text-white border-[#2F855A]'
                      : 'bg-white text-[#2F855A] border-zinc-200'
                  }`}
                >
                  <i className="bi bi-person-fill text-xs mb-0.5"></i>
                  <span>User</span>
                </button>
              </div>
            </div>

            {/* Navigation Links */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-[#555557] tracking-wider uppercase block px-1.5 menu-title">เมนูการทำงาน</span>
              {menuItems.map((item) => {
                if (!hasAccess(item.key)) return null;

                if (item.key === 'manage-data') {
                  const canProducts = canAccessPage(currentUser, 'manage-products');
                  const canBrands = canAccessPage(currentUser, 'brands');
                  const canCategories = canAccessPage(currentUser, 'categories');
                  const canCustomers = canAccessPage(currentUser, 'customers');
                  if (!canProducts && !canBrands && !canCategories && !canCustomers) return null;

                  return (
                    <div key="data-group" className="space-y-1 bg-transparent p-2 rounded-2xl border border-zinc-200/50">
                      <div className="px-2 py-1 flex items-center gap-2 text-xs font-black text-zinc-800">
                        <i className="bi bi-database-fill text-[#0071e3]"></i>
                        <span>จัดการข้อมูล</span>
                      </div>

                      {/* Section 1: ข้อมูลสินค้า */}
                      {(canProducts || canBrands || canCategories) && (
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold text-zinc-400 block px-2 pt-1">ข้อมูลสินค้า</span>
                          {canProducts && (
                            <button type="button"
                              onClick={() => handleNavClick('manage-products')}
                              className={`w-full flex items-center px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer menu-item ${activeTab === 'manage-products' ? 'bg-[#0071e3]/10 text-[#0071e3]' : 'text-zinc-650 hover:bg-[#f5f5f7] hover:text-black'}`}
                            >
                              <span>จัดการข้อมูลสินค้า</span>
                            </button>
                          )}
                          {canBrands && (
                            <button type="button"
                              onClick={() => handleNavClick('brands')}
                              className={`w-full flex items-center px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer menu-item ${activeTab === 'brands' ? 'bg-[#0071e3]/10 text-[#0071e3]' : 'text-zinc-600 hover:bg-[#f5f5f7] hover:text-black'}`}
                            >
                              <span>จัดการแบรนด์สินค้า</span>
                            </button>
                          )}
                          {canCategories && (
                            <button type="button"
                              onClick={() => handleNavClick('categories')}
                              className={`w-full flex items-center px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer menu-item ${activeTab === 'categories' ? 'bg-[#0071e3]/10 text-[#0071e3]' : 'text-zinc-600 hover:bg-[#f5f5f7] hover:text-black'}`}
                            >
                              <span>จัดการหมวดหมู่สินค้า</span>
                            </button>
                          )}
                        </div>
                      )}

                      {/* Section 2: ข้อมูลลูกค้า */}
                      {canCustomers && (
                        <div className="space-y-0.5 pt-1">
                          <span className="text-[10px] font-bold text-zinc-400 block px-2 pt-1">ข้อมูลลูกค้า</span>
                          <button type="button"
                            onClick={() => handleNavClick('customers')}
                            className={`w-full flex items-center px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer menu-item ${activeTab === 'customers' ? 'bg-[#0071e3]/10 text-[#0071e3]' : 'text-zinc-650 hover:bg-[#f5f5f7] hover:text-black'}`}
                          >
                            <span>จัดการข้อมูลลูกค้า</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                }

                const isActive = activeTab === item.key;
                return (
                  <button type="button"
                    key={item.key}
                    onClick={() => handleNavClick(item.key)}
                    className={`
                      w-full flex items-center justify-between px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer menu-item
                      ${isActive
                        ? 'bg-[#0071e3]/10 text-[#0071e3]'
                        : 'text-zinc-650 hover:bg-[#f5f5f7] hover:text-black'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <i className={`${item.icon} text-sm`}></i>
                      <span>{item.name}</span>
                    </div>
                    {item.key === 'quotations' && currentUser?.role === 'admin' && pendingQuotationsCount > 0 && (
                      <span className="px-2 py-0.5 text-[9px] font-extrabold bg-red-500 text-white rounded-full leading-none shadow-[0_1px_3px_rgba(239,68,68,0.4)] animate-pulse shrink-0">
                        {pendingQuotationsCount}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* User management & Activity Log submenus in Mobile Drawer */}
              {canAccessPage(currentUser, 'users') && (
                <button type="button"
                  onClick={() => handleNavClick('users')}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer menu-item
                    ${activeTab === 'users' ? 'bg-[#0071e3]/10 text-[#0071e3]' : 'text-zinc-650 hover:bg-[#f5f5f7] hover:text-black'}
                  `}
                >
                  <i className="bi bi-people-fill text-sm"></i>
                  <span>จัดการบัญชีผู้ใช้</span>
                </button>
              )}

              {canAccessPage(currentUser, 'activity-log') && (
                <button type="button"
                  onClick={() => handleNavClick('activity-log')}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer menu-item
                    ${activeTab === 'activity-log' ? 'bg-[#0071e3]/10 text-[#0071e3]' : 'text-zinc-650 hover:bg-[#f5f5f7] hover:text-black'}
                  `}
                >
                  <i className="bi bi-clock-history text-sm"></i>
                  <span>ประวัติการดำเนินงาน</span>
                </button>
              )}
            </div>

            

            {/* Logout button */}
            <button type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                setShowLogoutConfirm(true);
              }}
              className="w-full py-2.5 rounded-xl text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-650 transition-colors cursor-pointer flex items-center justify-center gap-2 shrink-0 btn-logout"
            >
              <i className="bi bi-box-arrow-right"></i>
              <span>ออกจากระบบ</span>
            </button>

            </div>{/* end scrollable area */}
          </div>
        </div>
      )}

      {/* ── Main Content Area ────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0">
        <div 
          key={activeTab}
          className={`flex-1 flex flex-col w-full min-w-0 p-4 pt-3 sm:px-6 sm:pb-6 sm:pt-4 lg:px-8 lg:pb-8 lg:pt-4 xl:px-12 xl:pb-12 xl:pt-5 animate-page-transition ${
            activeTab === 'dashboard' ? 'lg:h-[calc(100vh-4rem)] lg:overflow-hidden xl:h-[calc(100vh-4rem)] xl:overflow-hidden' : ''
          }`}
        >
          {children}
        </div>
      </main>

      {/* Premium Footer */}
      {activeTab !== 'dashboard' && (
        <footer className="w-full bg-white/70 backdrop-blur-md border-t border-[#d2d2d7]/30 py-3.5 px-4 sm:px-6 lg:px-8 xl:px-12 no-print shrink-0">
          <div className="w-full flex flex-col md:flex-row items-center justify-between gap-2.5 text-[10px] md:text-[11px] font-medium">
            {/* Left Side: Copyright */}
            <div className="flex items-center gap-1.5 flex-wrap justify-center md:justify-start">
              <span className="font-bold text-[#1d1d1f]">© {new Date().getFullYear()} PHANVADEE CO., LTD.</span>
            </div>

            {/* Middle: Secure Connection Indicator */}
            <div className="flex items-center gap-1.5 bg-emerald-50/80 text-emerald-700 border border-emerald-200/40 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider shadow-[0_1px_4px_rgba(16,185,129,0.08)]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_4px_rgba(16,185,129,0.5)]" />
              <span>PIM Secure Connected</span>
            </div>

            {/* Right Side: Helpdesk */}
            <div className="flex items-center gap-3 flex-wrap justify-center md:justify-end">
              <span className="text-[#0071e3] font-bold">
                หากพบปัญหา ติดต่อ IT Support
              </span>
            </div>
          </div>
        </footer>
      )}

      {/* Change Username Modal */}
      {showEditProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print animate-fade-in">
          <div onClick={() => setShowEditProfile(false)} className="absolute inset-0 bg-black/25 backdrop-blur-xs" />
          <div className="relative bg-white rounded-3xl border border-[#d2d2d7]/50 max-w-sm w-full p-6 shadow-xl space-y-4 z-10 animate-scale-in text-[#1d1d1f]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#0071e3]">
                <i className="bi bi-person-badge text-lg"></i>
              </div>
              <div>
                <h3 className="font-bold text-sm uppercase tracking-wide">เปลี่ยนชื่อผู้ใช้ (Username)</h3>
                <p className="text-[10px] text-[#86868b] mt-0.5">กำหนด Username สำหรับเข้าสู่ระบบ</p>
              </div>
            </div>

            {editProfileSuccess ? (
              <div className="py-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mx-auto">
                  <i className="bi bi-check-circle-fill text-2xl"></i>
                </div>
                <p className="text-sm font-bold text-emerald-700">เปลี่ยนชื่อผู้ใช้สำเร็จ!</p>
                <button type="button" onClick={() => setShowEditProfile(false)}
                  className="w-full py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full text-xs font-semibold transition-colors cursor-pointer">
                  ปิด
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {/* Employee Info (Read-only) */}
                <div className="bg-[#f5f5f7] rounded-2xl p-3.5 border border-[#d2d2d7]/40 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#86868b] font-medium">ชื่อพนักงานบริษัท</span>
                    {getRoleBadge(currentUser?.role)}
                  </div>
                  <div className="text-xs font-bold text-[#1d1d1f] flex items-center gap-2">
                    <i className="bi bi-person-circle text-zinc-500 text-sm"></i>
                    <span>{currentUser?.name || '-'}</span>
                  </div>
                </div>

                {/* Username Input */}
                <div>
                  <label className="text-[10px] text-[#555557] font-semibold block mb-1">
                    ชื่อผู้ใช้ (Username) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    
                    <input
                      ref={refEditUsername}
                      type="text"
                      value={editProfileForm.username}
                      onChange={e => {
                        setEditProfileForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }));
                        setEditProfileErrorField(false);
                        setEditProfileError('');
                      }}
                      placeholder="เช่น somsak_r"
                      className={`w-full text-xs bg-[#f5f5f7] border rounded-xl px-3.5 py-2.5 focus:outline-none focus:bg-white transition-all lowercase font-mono ${editProfileErrorField ? 'border-red-500 ring-1 ring-red-500/30' : 'border-[#d2d2d7]/50 focus:border-[#0071e3]'}`}
                    />
                  </div>
                  <p className="text-[9.5px] text-zinc-400 mt-1">ใช้สำหรับเข้าสู่ระบบ (ภาษาอังกฤษ ตัวเลข และ _ เท่านั้น)</p>
                </div>

                {editProfileError && (
                  <div className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 flex items-center gap-2">
                    <i className="bi bi-exclamation-circle-fill shrink-0"></i>
                    <span>{editProfileError}</span>
                  </div>
                )}

                <div className="flex gap-2.5 pt-1 text-xs font-semibold">
                  <button type="button"
                    onClick={() => setShowEditProfile(false)}
                    className="flex-1 py-2.5 border border-[#d2d2d7] text-[#1d1d1f] rounded-full hover:bg-[#f5f5f7] transition-colors cursor-pointer">
                    ยกเลิก
                  </button>
                  <button type="button"
                    onClick={async () => {
                      const cleanUsername = editProfileForm.username.trim().toLowerCase();
                      if (!cleanUsername) {
                        setEditProfileError('กรุณากรอกชื่อผู้ใช้ (Username)');
                        setEditProfileErrorField(true);
                        refEditUsername.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        refEditUsername.current?.focus();
                        return;
                      }
                      if (cleanUsername.length < 3) {
                        setEditProfileError('ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร');
                        setEditProfileErrorField(true);
                        refEditUsername.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        refEditUsername.current?.focus();
                        return;
                      }
                      if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
                        setEditProfileError('ชื่อผู้ใช้ต้องเป็นภาษาอังกฤษ (a-z), ตัวเลข (0-9) และ _ เท่านั้น');
                        setEditProfileErrorField(true);
                        refEditUsername.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        refEditUsername.current?.focus();
                        return;
                      }
                      // Check if unchanged
                      if (cleanUsername === currentUser?.username?.toLowerCase()) {
                        setEditProfileError('ชื่อผู้ใช้นี้ตรงกับชื่อผู้ใช้ปัจจุบันอยู่แล้ว');
                        setEditProfileErrorField(true);
                        refEditUsername.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        refEditUsername.current?.focus();
                        return;
                      }
                      // Check for duplicate username among other users
                      const duplicate = users.find(u => u.username?.toLowerCase() === cleanUsername);
                      if (duplicate) {
                        setEditProfileError(`ชื่อผู้ใช้ "@${cleanUsername}" มีผู้ใช้งานแล้ว`);
                        setEditProfileErrorField(true);
                        refEditUsername.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        refEditUsername.current?.focus();
                        return;
                      }
                      setEditProfileError('');
                      setEditProfileErrorField(false);
                      if (onUpdateProfile) {
                        try { await onUpdateProfile({ username: cleanUsername }); } catch (error) { setEditProfileError(error.message); return; }
                      }
                      setEditProfileSuccess(true);
                    }}
                    className="flex-1 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full transition-colors cursor-pointer">
                    บันทึก
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePwd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print animate-fade-in">
          <div onClick={() => setShowChangePwd(false)} className="absolute inset-0 bg-black/25 backdrop-blur-xs" />
          <div className="relative bg-white rounded-3xl border border-[#d2d2d7]/50 max-w-sm w-full p-6 shadow-xl space-y-4 z-10 animate-scale-in text-[#1d1d1f]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-700">
                <i className="bi bi-key-fill text-lg"></i>
              </div>
              <div>
                <h3 className="font-bold text-sm uppercase tracking-wide">เปลี่ยนรหัสผ่าน</h3>
                <p className="text-[10px] text-[#555557] mt-0.5">@{currentUser?.username}</p>
              </div>
            </div>

            {changePwdSuccess ? (
              <div className="py-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mx-auto">
                  <i className="bi bi-check-circle-fill text-2xl"></i>
                </div>
                <p className="text-sm font-bold text-emerald-700">เปลี่ยนรหัสผ่านสำเร็จ!</p>
                <button type="button" onClick={() => setShowChangePwd(false)}
                  className="w-full py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full text-xs font-semibold transition-colors cursor-pointer">
                  ปิด
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Old Password */}
                <div>
                  <label className="text-[10px] text-[#555557] font-semibold block mb-1">รหัสผ่านปัจจุบัน <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      ref={refOldPwd}
                      type={showOldPwd ? 'text' : 'password'}
                      value={changePwdForm.oldPwd}
                      onChange={e => {
                        setChangePwdForm(f => ({ ...f, oldPwd: e.target.value }));
                        setChangePwdErrorFields(prev => ({ ...prev, oldPwd: false }));
                        setChangePwdError('');
                      }}
                      placeholder="กรอกรหัสผ่านปัจจุบัน"
                      className={`w-full text-xs bg-[#f5f5f7] border rounded-xl px-3 py-2.5 pr-9 focus:outline-none focus:bg-white transition-all ${changePwdErrorFields.oldPwd ? 'border-red-500 ring-1 ring-red-500/30' : 'border-[#d2d2d7]/50 focus:border-[#0071e3]'}`}
                    />
                    <button type="button" onClick={() => setShowOldPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer">
                      <i className={`bi ${showOldPwd ? 'bi-eye-slash' : 'bi-eye'} text-sm`}></i>
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="text-[10px] text-[#555557] font-semibold block mb-1">รหัสผ่านใหม่ <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      ref={refNewPwd}
                      type={showNewPwd ? 'text' : 'password'}
                      value={changePwdForm.newPwd}
                      onChange={e => {
                        setChangePwdForm(f => ({ ...f, newPwd: e.target.value }));
                        setChangePwdErrorFields(prev => ({ ...prev, newPwd: false }));
                        setChangePwdError('');
                      }}
                      placeholder="กรอกรหัสผ่านใหม่"
                      className={`w-full text-xs bg-[#f5f5f7] border rounded-xl px-3 py-2.5 pr-9 focus:outline-none focus:bg-white transition-all ${changePwdErrorFields.newPwd ? 'border-red-500 ring-1 ring-red-500/30' : 'border-[#d2d2d7]/50 focus:border-[#0071e3]'}`}
                    />
                    <button type="button" onClick={() => setShowNewPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer">
                      <i className={`bi ${showNewPwd ? 'bi-eye-slash' : 'bi-eye'} text-sm`}></i>
                    </button>
                  </div>
                </div>

                {changePwdError && (
                  <div className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 flex items-center gap-2">
                    <i className="bi bi-exclamation-circle-fill"></i>
                    {changePwdError}
                  </div>
                )}

                <div className="flex gap-2.5 pt-1 text-xs font-semibold">
                  <button type="button"
                    onClick={() => setShowChangePwd(false)}
                    className="flex-1 py-2.5 border border-[#d2d2d7] text-[#1d1d1f] rounded-full hover:bg-[#f5f5f7] transition-colors cursor-pointer">
                    ยกเลิก
                  </button>
                  <button type="button"
                    onClick={async () => {
                      const { oldPwd, newPwd } = changePwdForm;
                      if (!oldPwd) {
                        setChangePwdError('กรุณากรอกรหัสผ่านปัจจุบัน');
                        setChangePwdErrorFields({ oldPwd: true });
                        refOldPwd.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        refOldPwd.current?.focus();
                        return;
                      }
                      if (!newPwd || newPwd.length < 4) {
                        setChangePwdError('รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร');
                        setChangePwdErrorFields({ newPwd: true });
                        refNewPwd.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        refNewPwd.current?.focus();
                        return;
                      }
                      if (newPwd === oldPwd) {
                        setChangePwdError('รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม');
                        setChangePwdErrorFields({ newPwd: true });
                        refNewPwd.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        refNewPwd.current?.focus();
                        return;
                      }
                      setChangePwdError('');
                      setChangePwdErrorFields({});
                      try { if (onChangePassword) await onChangePassword(newPwd, oldPwd); } catch (error) { setChangePwdError(error.message); return; }
                      setChangePwdSuccess(true);
                    }}
                    className="flex-1 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full transition-colors cursor-pointer">
                    บันทึก
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print animate-fade-in">
          <div onClick={() => setShowLogoutConfirm(false)} className="absolute inset-0 bg-black/25 backdrop-blur-xs" />
          <div className="relative bg-white rounded-3xl border border-[#d2d2d7]/50 max-w-xs w-full p-6 shadow-xl space-y-4.5 z-10 animate-scale-in text-[#1d1d1f] text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-650 mx-auto">
              <i className="bi bi-box-arrow-right text-xl text-red-500"></i>
            </div>
            <div>
              <h3 className="font-bold text-sm uppercase tracking-wide">ยืนยันออกจากระบบ?</h3>

            </div>
            <div className="flex gap-2.5 pt-2 text-xs font-semibold">
              <button type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 border border-[#d2d2d7] text-[#1d1d1f] rounded-full hover:bg-[#f5f5f7] transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button type="button"
                onClick={onLogout}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors cursor-pointer"
              >
                ออกจากระบบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

