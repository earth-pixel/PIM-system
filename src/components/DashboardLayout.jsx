import { useState, useEffect, useRef, useMemo } from 'react';

function getActionStyle(action) {
  if (action.includes('แก้ไข')) {
    return {
      bg: 'bg-amber-50/70 border border-amber-200/40 text-amber-600',
      badgeBg: 'bg-amber-100/60 text-amber-800',
      icon: 'bi bi-pencil-fill',
      label: 'แก้ไข'
    };
  }
  if (action.includes('เพิ่ม')) {
    return {
      bg: 'bg-emerald-50/70 border border-emerald-200/40 text-emerald-600',
      badgeBg: 'bg-emerald-100/60 text-emerald-800',
      icon: 'bi bi-plus-circle-fill',
      label: 'เพิ่ม'
    };
  }
  if (action.includes('ลบ')) {
    return {
      bg: 'bg-rose-50/70 border border-rose-200/40 text-rose-600',
      badgeBg: 'bg-rose-100/60 text-rose-800',
      icon: 'bi bi-trash3-fill',
      label: 'ลบ'
    };
  }
  if (action.includes('ล้าง')) {
    return {
      bg: 'bg-red-50/70 border border-red-200/40 text-red-650',
      badgeBg: 'bg-red-100/60 text-red-800',
      icon: 'bi bi-exclamation-triangle-fill',
      label: 'รีเซ็ต'
    };
  }
  return {
    bg: 'bg-blue-50/70 border border-blue-200/40 text-blue-600',
    badgeBg: 'bg-blue-100/60 text-blue-800',
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
  onLogout,
  onChangePassword,
  activeTab,
  setActiveTab,
  children,
  onSwitchRole,
  activityLog = [],
  quotations = [],
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSandboxOpen, setIsSandboxOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isUsersDropdownOpen, setIsUsersDropdownOpen] = useState(false);
  const [isProductsDropdownOpen, setIsProductsDropdownOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [changePwdForm, setChangePwdForm] = useState({ oldPwd: '', newPwd: '', confirmPwd: '' });
  const [changePwdError, setChangePwdError] = useState('');
  const [changePwdSuccess, setChangePwdSuccess] = useState(false);
  const [showOldPwd, setShowOldPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

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
  const unreadCount = activityLog.filter(log => new Date(log.timestamp).getTime() > lastReadTime).length;
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
    { key: 'dashboard',       name: 'Dashboard',               icon: "bi bi-grid-1x2-fill", minRole: 'user' },
    { key: 'manage-products', name: 'จัดการข้อมูลสินค้า',        icon: "bi bi-pencil-square",           minRole: 'user' },
    { key: 'quotations',      name: 'ใบเสนอราคา',               icon: "bi bi-file-earmark-text-fill",  minRole: 'user' },
    { key: 'brands',          name: 'จัดการแบรนด์',             icon: "bi bi-award-fill",           minRole: 'user' },
    { key: 'categories',      name: 'จัดการหมวดหมู่สินค้า',    icon: "bi bi-folder-fill",    minRole: 'user' },
    { key: 'reports',         name: 'รายงานสินค้า',             icon: "bi bi-bar-chart-fill",        minRole: 'user' },
  ];

  const hasAccess = (minRole) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin')   return true;
    if (currentUser.role === 'manager') return minRole === 'manager' || minRole === 'user';
    return minRole === 'user';
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

  // Determine if activeTab belongs to products group
  const isProductGroupActive = activeTab === 'manage-products' || activeTab === 'brands' || activeTab === 'categories';

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f7] font-sans text-[#1d1d1f]">
      
      {/* ── Navbar header ───────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full h-16 bg-white/80 backdrop-blur-md border-b border-[#d2d2d7]/50 no-print">
        <div className="w-full h-full px-4 sm:px-6 lg:px-12 flex items-center justify-between">
          
          {/* Left: Brand Logo */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => handleNavClick('dashboard')}>
            <div className="w-6 h-7 text-zinc-900 shrink-0">
              <svg viewBox="0 0 80 90" className="w-full h-full fill-current" xmlns="http://www.w3.org/2000/svg">
                <path d="M 20 38 L 20 26 L 60 11 L 60 23 Z" />
                <path d="M 20 60 L 20 48 L 60 33 L 60 45 Z" />
                <path d="M 20 82 L 20 70 L 60 55 L 60 67 Z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-[#1d1d1f] uppercase leading-none">PIM-SYSTEM</span>
              <span className="text-[9px] text-[#555557] font-semibold mt-0.5 tracking-wider">PRODUCT INFORMATION MANAGEMENT</span>
            </div>
          </div>

          {/* Center: Desktop Minimalist Menu Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {menuItems.map((item) => {
              if (!hasAccess(item.minRole)) return null;

              // Skip brands and categories at the top level
              if (item.key === 'brands' || item.key === 'categories') return null;

              if (item.key === 'manage-products') {
                return (
                  <div 
                    key="products-dropdown"
                    className="relative" 
                    ref={productsDropdownRef}
                    onMouseEnter={handleMouseEnterProducts}
                    onMouseLeave={handleMouseLeaveProducts}
                  >
                    <button type="button"
                      onClick={() => setIsProductsDropdownOpen(!isProductsDropdownOpen)}
                      className={`
                        px-3.5 py-1.5 text-xs font-bold rounded-full transition-all duration-150 cursor-pointer whitespace-nowrap flex items-center gap-1
                        ${isProductGroupActive
                          ? 'bg-[#0071e3]/10 text-[#0071e3]'
                          : 'text-[#555557] hover:text-[#1d1d1f] hover:bg-zinc-100'
                        }
                      `}
                    >
                      <span>จัดการข้อมูลสินค้า</span>
                      <i className={`bi bi-chevron-down text-[10px] transition-transform duration-200 ${isProductsDropdownOpen ? 'rotate-180' : ''}`}></i>
                    </button>

                    {isProductsDropdownOpen && (
                      <div className="absolute top-full left-0 w-52 pt-1.5 z-30">
                        <div className="bg-white rounded-2xl border border-[#d2d2d7]/50 shadow-lg p-1.5 space-y-0.5 animate-scale-in">
                          <button type="button"
                            onClick={() => handleNavClick('manage-products')}
                            className={`w-full text-left px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${activeTab === 'manage-products' ? 'bg-[#0071e3]/10 text-[#0071e3]' : 'text-zinc-650 hover:bg-zinc-50 hover:text-black'}`}
                          >
                            <span>ข้อมูลสินค้า</span>
                          </button>
                          <button type="button"
                            onClick={() => handleNavClick('brands')}
                            className={`w-full text-left px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${activeTab === 'brands' ? 'bg-[#0071e3]/10 text-[#0071e3]' : 'text-zinc-650 hover:bg-zinc-50 hover:text-black'}`}
                          >
                            <span>จัดการแบรนด์สินค้า</span>
                          </button>
                          <button type="button"
                            onClick={() => handleNavClick('categories')}
                            className={`w-full text-left px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${activeTab === 'categories' ? 'bg-[#0071e3]/10 text-[#0071e3]' : 'text-zinc-650 hover:bg-zinc-50 hover:text-black'}`}
                          >
                            <span>จัดการหมวดหมู่สินค้า</span>
                          </button>
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
                    px-3.5 py-1.5 text-xs font-bold rounded-full transition-all duration-150 cursor-pointer whitespace-nowrap flex items-center gap-1.5
                    ${isActive
                      ? 'bg-[#0071e3]/10 text-[#0071e3]'
                      : 'text-[#555557] hover:text-[#1d1d1f] hover:bg-zinc-100'
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

            {/* Dropdown for Manage Users (Admin / Manager only) */}
            {hasAccess('manager') && (
              currentUser.role === 'admin' ? (
                <div 
                  className="relative" 
                  ref={usersDropdownRef}
                  onMouseEnter={handleMouseEnterUsers}
                  onMouseLeave={handleMouseLeaveUsers}
                >
                  <button type="button"
                    onClick={() => setIsUsersDropdownOpen(!isUsersDropdownOpen)}
                    className={`
                      px-3.5 py-1.5 text-xs font-bold rounded-full transition-all duration-150 cursor-pointer whitespace-nowrap flex items-center gap-1
                      ${isUserGroupActive
                        ? 'bg-[#0071e3]/10 text-[#0071e3]'
                        : 'text-[#555557] hover:text-[#1d1d1f] hover:bg-zinc-100'
                      }
                    `}
                  >
                    <span>จัดการผู้ใช้งาน</span>
                    <i className={`bi bi-chevron-down text-[10px] transition-transform duration-200 ${isUsersDropdownOpen ? 'rotate-180' : ''}`}></i>
                  </button>

                  {isUsersDropdownOpen && (
                    <div className="absolute top-full left-0 w-52 pt-1.5 z-30">
                      <div className="bg-white rounded-2xl border border-[#d2d2d7]/50 shadow-lg p-1.5 space-y-0.5 animate-scale-in">
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
              ) : (
                <button type="button"
                  onClick={() => handleNavClick('users')}
                  className={`
                    px-3.5 py-1.5 text-xs font-bold rounded-full transition-all duration-150 cursor-pointer whitespace-nowrap
                    ${activeTab === 'users'
                      ? 'bg-[#0071e3]/10 text-[#0071e3]'
                      : 'text-[#555557] hover:text-[#1d1d1f] hover:bg-zinc-100'
                    }
                  `}
                >
                  จัดการผู้ใช้งาน
                </button>
              )
            )}
          </nav>

          {/* Right: User Profile & Mobile Toggle */}
          <div className="flex items-center gap-3">
            
            
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
                    relative p-2.5 text-zinc-650 hover:text-black hover:bg-zinc-50 rounded-full transition-all duration-300 cursor-pointer flex items-center justify-center bg-white border border-[#d2d2d7]/50 shadow-xs hover:shadow-md
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
                  <div className="absolute right-0 top-full w-85 pt-2 z-45">
                    <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-[#d2d2d7]/40 shadow-2xl p-4.5 space-y-3.5 animate-scale-in text-[#1d1d1f]">
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
                                  {/* Action Circular Icon */}
                                  <div className={`w-8 h-8 rounded-full ${actStyle.bg} flex items-center justify-center shrink-0 text-sm shadow-2xs`}>
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
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#d2d2d7]/50 bg-white hover:bg-zinc-50 transition-all cursor-pointer text-xs"
              >
                <div className="w-6 h-6 rounded-full bg-zinc-950 flex items-center justify-center text-white font-semibold text-xs">
                  {(currentUser?.name || currentUser?.username || 'U').charAt(0)}
                </div>
                <span className="font-bold text-[#1d1d1f]">{currentUser?.name || currentUser?.username || 'User'}</span>
                <i className={`bi bi-chevron-down text-[10px] text-zinc-500 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`}></i>
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 top-full w-64 pt-1.5 z-30">
                  <div className="bg-white rounded-3xl border border-[#d2d2d7]/50 shadow-xl p-4 space-y-4 animate-scale-in">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-950 flex items-center justify-center text-white font-semibold text-sm">
                        {(currentUser?.name || currentUser?.username || 'U').charAt(0)}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-[#1d1d1f] truncate leading-tight">{currentUser?.name || currentUser?.username || 'User'}</span>
                        <span className="text-[10px] text-[#555557] truncate mt-0.5">@{currentUser?.username || 'user'}</span>
                        <div className="flex mt-1.5">{getRoleBadge(currentUser?.role)}</div>
                      </div>
                    </div>

                    <hr className="border-zinc-100" />

                    {/* Sandbox role switcher */}
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setIsSandboxOpen(!isSandboxOpen)}
                        className="w-full flex items-center justify-between text-[10px] text-[#555557] font-bold tracking-wider uppercase cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5">
                          <i className="bi bi-person-check-fill text-zinc-550 text-sm"></i>
                          <span>จำลองสิทธิ์ (Sandbox)</span>
                        </div>
                        <i className={`bi bi-chevron-down text-[10px] transition-transform ${isSandboxOpen ? 'rotate-180' : ''}`}></i>
                      </button>

                      {isSandboxOpen && (
                        <div className="grid grid-cols-3 gap-1 pt-1">
                          {['admin', 'manager', 'user'].map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => {
                                onSwitchRole(r);
                                setIsProfileOpen(false);
                              }}
                              className={`
                                py-1 text-[10px] font-bold rounded-full border transition-all duration-150 cursor-pointer
                                ${currentUser?.role === r
                                  ? r === 'admin'
                                    ? 'bg-[#6B46C1] text-white border-[#6B46C1] shadow-[0_2px_8px_rgba(107,70,193,0.35)]'
                                    : r === 'manager'
                                    ? 'bg-[#1A365D] text-white border-[#1A365D] shadow-[0_2px_8px_rgba(26,54,93,0.35)]'
                                    : 'bg-[#2F855A] text-white border-[#2F855A] shadow-[0_2px_8px_rgba(47,133,90,0.35)]'
                                  : 'bg-white text-zinc-650 border-[#d2d2d7] hover:bg-[#f5f5f7]'
                                }
                              `}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <hr className="border-zinc-100" />

                    <button type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        setChangePwdForm({ oldPwd: '', newPwd: '', confirmPwd: '' });
                        setChangePwdError('');
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
        <div className="lg:hidden fixed inset-0 top-0 z-50 no-print">
          {/* Backdrop overlay */}
          <div 
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute inset-0 bg-black/15 backdrop-blur-xs animate-fade-in"
          />
          {/* Drawer container */}
          <div className="absolute right-0 top-0 bottom-0 w-[300px] bg-white border-l border-[#d2d2d7]/50 shadow-2xl flex flex-col p-4 sm:p-5 space-y-4 overflow-hidden animate-slide-in-right mobile-drawer">
            
            {/* Close Button Header */}
            <div className="flex items-center justify-end">
              <button type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 text-zinc-550 hover:text-black hover:bg-zinc-100 rounded-full cursor-pointer transition-colors"
                aria-label="Close menu"
              >
                <i className="bi bi-x-lg text-lg"></i>
              </button>
            </div>

            <hr className="border-zinc-200/50 -mt-2" />

            {/* User Profile Info */}
            <div className="bg-[#f5f5f7] p-3 sm:p-4 rounded-2xl border border-[#d2d2d7]/35 flex items-center gap-3 user-card">
              <div className="w-10 h-10 rounded-full bg-zinc-950 flex items-center justify-center text-white font-semibold text-sm user-avatar">
                {(currentUser?.name || currentUser?.username || 'U').charAt(0)}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-[#1d1d1f] truncate leading-tight user-name">{currentUser?.name || currentUser?.username || 'User'}</span>
                <span className="text-[10px] text-[#555557] truncate mt-0.5 user-username">@{currentUser?.username || 'user'}</span>
                <div className="flex mt-1.5 user-badge">{getRoleBadge(currentUser?.role)}</div>
              </div>
            </div>

            {/* Navigation Links */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-[#555557] tracking-wider uppercase block px-1.5 menu-title">เมนูการทำงาน</span>
              {menuItems.map((item) => {
                if (!hasAccess(item.minRole)) return null;

                // Skip rendering brands and categories at the top level
                if (item.key === 'brands' || item.key === 'categories') return null;

                if (item.key === 'manage-products') {
                  return (
                    <div key="products-group" className="space-y-1">
                      {/* Manage Products button */}
                      <button type="button"
                        onClick={() => handleNavClick('manage-products')}
                        className={`
                          w-full flex items-center gap-3 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer menu-item
                          ${activeTab === 'manage-products'
                            ? 'bg-[#0071e3]/10 text-[#0071e3]'
                            : 'text-zinc-650 hover:bg-[#f5f5f7] hover:text-black'
                          }
                        `}
                      >
                        <i className="bi bi-pencil-square text-sm"></i>
                        <span>จัดการสินค้า</span>
                      </button>
                      
                      {/* Indented Brands button */}
                      <button type="button"
                        onClick={() => handleNavClick('brands')}
                        className={`
                          w-full flex items-center gap-3 pl-8 pr-4 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer menu-item
                          ${activeTab === 'brands'
                            ? 'bg-[#0071e3]/10 text-[#0071e3]'
                            : 'text-zinc-600 hover:bg-[#f5f5f7] hover:text-black'
                          }
                        `}
                      >
                        <i className="bi bi-award-fill text-[11px]"></i>
                        <span>จัดการแบรนด์</span>
                      </button>
                      
                      {/* Indented Categories button */}
                      <button type="button"
                        onClick={() => handleNavClick('categories')}
                        className={`
                          w-full flex items-center gap-3 pl-8 pr-4 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer menu-item
                          ${activeTab === 'categories'
                            ? 'bg-[#0071e3]/10 text-[#0071e3]'
                            : 'text-zinc-600 hover:bg-[#f5f5f7] hover:text-black'
                          }
                        `}
                      >
                        <i className="bi bi-folder-fill text-[11px]"></i>
                        <span>จัดการหมวดหมู่สินค้า</span>
                      </button>
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

              {/* Admin/Manager specific submenus */}
              {hasAccess('manager') && (
                <>
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

                  {currentUser?.role === 'admin' && (
                    <>
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
                    </>
                  )}
                </>
              )}
            </div>

            <hr className="border-zinc-200/50 my-1" />

            {/* Sandbox simulated role switcher (Mobile) */}
            <div className="space-y-1.5 bg-[#f5f5f7] p-3 rounded-2xl border border-[#d2d2d7]/35 sandbox-card">
              <span className="text-[10px] font-bold text-[#555557] tracking-wider uppercase block sandbox-title">จำลองสิทธิ์ (Sandbox)</span>
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {['admin', 'manager', 'user'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      onSwitchRole(r);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`
                      py-1.5 text-[10px] font-bold rounded-full border transition-all duration-150 cursor-pointer sandbox-btn
                      ${currentUser?.role === r
                        ? r === 'admin'
                          ? 'bg-[#6B46C1] text-white border-[#6B46C1] shadow-xs'
                          : r === 'manager'
                          ? 'bg-[#1A365D] text-white border-[#1A365D] shadow-xs'
                          : 'bg-[#2F855A] text-white border-[#2F855A] shadow-xs'
                        : 'bg-white text-zinc-650 border-[#d2d2d7] hover:bg-[#f5f5f7]'
                      }
                    `}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <hr className="border-zinc-200/50 my-1" />

            {/* Logout button */}
            <button type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                setShowLogoutConfirm(true);
              }}
              className="w-full py-2 rounded-xl text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-650 transition-colors cursor-pointer flex items-center justify-center gap-2 mb-2 btn-logout"
            >
              <i className="bi bi-box-arrow-right"></i>
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Main Content Area ────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0">
        <div 
          key={activeTab}
          className={`flex-1 flex flex-col w-full min-w-0 p-4 pt-3 sm:px-6 sm:pb-6 sm:pt-4 lg:px-12 lg:pb-12 lg:pt-5 animate-page-transition ${
            activeTab === 'dashboard' ? 'lg:h-[calc(100vh-4rem)] lg:overflow-hidden' : ''
          }`}
        >
          {children}
        </div>
      </main>

      {/* Apple-Style Minimalist Footer (Hidden on dashboard tab to maintain fixed layout height) */}
      {activeTab !== 'dashboard' && (
        <footer className="w-full bg-[#f5f5f7]/50 border-t border-[#d2d2d7]/30 py-4 px-6 lg:px-12 no-print shrink-0 text-[#86868b]">
          <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-[10px] md:text-[11px] font-medium">
            {/* Left Side: Copyright */}
            <div className="flex items-center gap-1.5 flex-wrap justify-center md:justify-start">
              <span className="font-bold text-[#1d1d1f]">© {new Date().getFullYear()} PHANVADEE CO., LTD.</span>
              <span className="text-[#d2d2d7]">|</span>
              <span>ALL RIGHTS RESERVED.</span>
            </div>

            {/* Middle: Secure Connection Indicator */}
            <div className="flex items-center gap-1.5 bg-[#e8f5e9]/70 text-[#2e7d32] border border-[#a5d6a7]/20 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4caf50] animate-pulse" />
              <span>PIM Secure API Connected</span>
            </div>

            {/* Right Side: Helpdesk */}
            <div className="flex items-center gap-3 flex-wrap justify-center md:justify-end text-[10px] md:text-[11px]">
              <span className="font-semibold text-[#1d1d1f]">
                IT Support: <a href="tel:0865231495" className="text-[#0071e3] hover:underline font-bold">086-523-1495</a>
              </span>
            </div>
          </div>
        </footer>
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
                      type={showOldPwd ? 'text' : 'password'}
                      value={changePwdForm.oldPwd}
                      onChange={e => setChangePwdForm(f => ({ ...f, oldPwd: e.target.value }))}
                      placeholder="กรอกรหัสผ่านปัจจุบัน"
                      className="w-full text-xs bg-[#f5f5f7] border border-[#d2d2d7]/50 rounded-xl px-3 py-2.5 pr-9 focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all"
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
                      type={showNewPwd ? 'text' : 'password'}
                      value={changePwdForm.newPwd}
                      onChange={e => setChangePwdForm(f => ({ ...f, newPwd: e.target.value }))}
                      placeholder="กรอกรหัสผ่านใหม่"
                      className="w-full text-xs bg-[#f5f5f7] border border-[#d2d2d7]/50 rounded-xl px-3 py-2.5 pr-9 focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all"
                    />
                    <button type="button" onClick={() => setShowNewPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer">
                      <i className={`bi ${showNewPwd ? 'bi-eye-slash' : 'bi-eye'} text-sm`}></i>
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="text-[10px] text-[#555557] font-semibold block mb-1">ยืนยันรหัสผ่านใหม่ <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      type={showConfirmPwd ? 'text' : 'password'}
                      value={changePwdForm.confirmPwd}
                      onChange={e => setChangePwdForm(f => ({ ...f, confirmPwd: e.target.value }))}
                      placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                      className="w-full text-xs bg-[#f5f5f7] border border-[#d2d2d7]/50 rounded-xl px-3 py-2.5 pr-9 focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all"
                    />
                    <button type="button" onClick={() => setShowConfirmPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer">
                      <i className={`bi ${showConfirmPwd ? 'bi-eye-slash' : 'bi-eye'} text-sm`}></i>
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
                    onClick={() => {
                      const { oldPwd, newPwd, confirmPwd } = changePwdForm;
                      if (!oldPwd) { setChangePwdError('กรุณากรอกรหัสผ่านปัจจุบัน'); return; }
                      if (oldPwd !== currentUser?.password) { setChangePwdError('รหัสผ่านปัจจุบันไม่ถูกต้อง'); return; }
                      if (!newPwd || newPwd.length < 4) { setChangePwdError('รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร'); return; }
                      if (newPwd === oldPwd) { setChangePwdError('รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม'); return; }
                      if (newPwd !== confirmPwd) { setChangePwdError('รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน'); return; }
                      setChangePwdError('');
                      if (onChangePassword) onChangePassword(newPwd);
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
