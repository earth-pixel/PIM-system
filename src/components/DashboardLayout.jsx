import React, { useState, useEffect, useRef } from 'react';

const LOG_ACTION_ICONS = {
  'แก้ไข': '✏️',
  'เพิ่มสินค้า': '📦',
  'ลบสินค้า': '🗑️',
  'ล้างข้อมูล': '⚠️',
  'เพิ่มแบรนด์': '🏷️',
  'เพิ่มหมวดหมู่': '📂',
  'เพิ่มผู้ใช้': '👤',
};

function getActionEmoji(action) {
  for (const [key, emoji] of Object.entries(LOG_ACTION_ICONS)) {
    if (action.startsWith(key)) return emoji;
  }
  return '🔧';
}

const LOG_ROLE_BADGES = {
  admin:   'text-[#6B46C1] bg-[#6B46C1]/10 border-[#6B46C1]/20',
  manager: 'text-[#1A365D] bg-[#1A365D]/10 border-[#1A365D]/20',
  user:    'text-[#2F855A] bg-[#2F855A]/10 border-[#2F855A]/20',
};

export default function DashboardLayout({
  currentUser,
  onLogout,
  activeTab,
  setActiveTab,
  children,
  onSwitchRole,
  activityLog = [],
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSandboxOpen, setIsSandboxOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isUsersDropdownOpen, setIsUsersDropdownOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const profileRef = useRef(null);
  const usersDropdownRef = useRef(null);
  const dropdownTimeoutRef = useRef(null);
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
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Close mobile menu on tab change
  const handleNavClick = (key) => {
    setActiveTab(key);
    setIsMobileMenuOpen(false);
    setIsUsersDropdownOpen(false);
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
    { key: 'products',        name: 'รายการสินค้า',             icon: "bi bi-box-seam-fill",         minRole: 'user' },
    { key: 'manage-products', name: 'จัดการข้อมูลสินค้า',        icon: "bi bi-pencil-square",           minRole: 'user' },
    { key: 'brands',          name: 'จัดการแบรนด์',             icon: "bi bi-award-fill",           minRole: 'user' },
    { key: 'categories',      name: 'จัดการหมวดหมู่สินค้า',    icon: "bi bi-folder-fill",    minRole: 'user' },
    { key: 'reports',         name: 'รายงานสินค้า',             icon: "bi bi-file-earmark-text-fill",        minRole: 'user' },
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
  const isUserGroupActive = activeTab === 'users' || activeTab === 'status-settings' || activeTab === 'activity-log';

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f7] font-sans text-[#1d1d1f]">
      
      {/* ── Navbar header ───────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full h-16 bg-white/80 backdrop-blur-md border-b border-[#d2d2d7]/50 no-print">
        <div className="w-full h-full px-4 sm:px-6 lg:px-12 flex items-center justify-between">
          
          {/* Left: Brand Logo */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => handleNavClick('dashboard')}>
            <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white font-bold text-sm shrink-0">
              P
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
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => handleNavClick(item.key)}
                  className={`
                    px-3.5 py-1.5 text-xs font-bold rounded-full transition-all duration-150 cursor-pointer whitespace-nowrap
                    ${isActive
                      ? 'bg-[#0071e3]/10 text-[#0071e3]'
                      : 'text-[#555557] hover:text-[#1d1d1f] hover:bg-zinc-100'
                    }
                  `}
                >
                  {item.name}
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
                  <button
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
                        <button
                          onClick={() => handleNavClick('users')}
                          className={`w-full text-left px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${activeTab === 'users' ? 'bg-[#0071e3]/10 text-[#0071e3]' : 'text-zinc-650 hover:bg-zinc-50 hover:text-black'}`}
                        >
                          <i className="bi bi-people-fill"></i>
                          <span>บัญชีผู้ใช้งาน</span>
                        </button>
                        <button
                          onClick={() => handleNavClick('status-settings')}
                          className={`w-full text-left px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${activeTab === 'status-settings' ? 'bg-[#0071e3]/10 text-[#0071e3]' : 'text-zinc-650 hover:bg-zinc-50 hover:text-black'}`}
                        >
                          <i className="bi bi-box-seam-fill"></i>
                          <span>กำหนดสถานะสินค้า</span>
                        </button>
                        <button
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
                <button
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

                    <button
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
            <button
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
              <button
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
                const isActive = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => handleNavClick(item.key)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer menu-item
                      ${isActive
                        ? 'bg-[#0071e3]/10 text-[#0071e3]'
                        : 'text-zinc-650 hover:bg-[#f5f5f7] hover:text-black'
                      }
                    `}
                  >
                    <i className={`${item.icon} text-sm`}></i>
                    <span>{item.name}</span>
                  </button>
                );
              })}

              {/* Admin/Manager specific submenus */}
              {hasAccess('manager') && (
                <>
                  <button
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
                      <button
                        onClick={() => handleNavClick('status-settings')}
                        className={`
                          w-full flex items-center gap-3 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer menu-item
                          ${activeTab === 'status-settings' ? 'bg-[#0071e3]/10 text-[#0071e3]' : 'text-zinc-650 hover:bg-[#f5f5f7] hover:text-black'}
                        `}
                      >
                        <i className="bi bi-box-seam-fill text-sm"></i>
                        <span>กำหนดสถานะสินค้า</span>
                      </button>
                      <button
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
            <button
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
          className={`flex-1 flex flex-col w-full p-4 pt-3 sm:px-6 sm:pb-6 sm:pt-4 lg:px-12 lg:pb-12 lg:pt-5 animate-page-transition ${
            activeTab === 'dashboard' ? 'h-[calc(100vh-4rem)] overflow-hidden' : ''
          }`}
        >
          {children}
        </div>
      </main>

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
              <p className="text-[#555557] text-xs mt-1.5 leading-relaxed">
                คุณต้องการออกจากระบบ PIM-SYSTEM หรือไม่?
              </p>
            </div>
            <div className="flex gap-2.5 pt-2 text-xs font-semibold">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 border border-[#d2d2d7] text-[#1d1d1f] rounded-full hover:bg-[#f5f5f7] transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
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
