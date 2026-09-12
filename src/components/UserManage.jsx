import { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  UserPlus,
  Shield,
  Lock,
  Plus,
  Check,
  AlertCircle,
  Search,
  Eye,
  EyeOff,
  Settings,
  Sliders,
  RotateCcw,
  Sparkles,
  CheckSquare,
  Square,
  HelpCircle,
  X
} from 'lucide-react';
import DropdownFilter from './DropdownFilter';
import {
  PAGE_DEFINITIONS,
  ACTION_GROUPS,
  getUserPermissions,
  getDefaultPermissionsForRole,
  getFullPermissionsPreset,
  getReadOnlyPermissionsPreset,
  canPerformAction
} from '../utils/permissions';

export default function UserManage({ users, onAddUser, onUpdateUser, onDeleteUser, currentUser }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('user');
  const [showPassword, setShowPassword] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [alertPopup, setAlertPopup] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorFields, setErrorFields] = useState({});

  // Refs for scroll-to-error
  const refUsername = useRef(null);
  const refPassword = useRef(null);
  const refName = useRef(null);

  const scrollToError = (ref) => {
    setTimeout(() => ref?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
  };
  const clearFieldError = (field) => setErrorFields(prev => ({ ...prev, [field]: false }));

  const [editingUser, setEditingUser] = useState(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);

  // Permission Modal States
  const [editingPermissionsUser, setEditingPermissionsUser] = useState(null);
  const [permissionsForm, setPermissionsForm] = useState(null);
  const [permissionTab, setPermissionTab] = useState('pages'); // 'pages' | 'actions'
  const [permissionSearch, setPermissionSearch] = useState('');
  const [permissionSaving, setPermissionSaving] = useState(false);
  const [permissionConfirm, setPermissionConfirm] = useState(null);

  // Tab indicator animated slide states
  const pagesTabRef = useRef(null);
  const actionsTabRef = useRef(null);
  const [pillStyle, setPillStyle] = useState({ left: 4, width: 0, opacity: 0 });

  useLayoutEffect(() => {
    if (editingPermissionsUser) {
      const updatePill = () => {
        const activeEl = permissionTab === 'pages' ? pagesTabRef.current : actionsTabRef.current;
        if (activeEl) {
          setPillStyle({
            left: activeEl.offsetLeft,
            width: activeEl.offsetWidth,
            opacity: 1
          });
        }
      };
      updatePill();
      const raf = requestAnimationFrame(updatePill);
      window.addEventListener('resize', updatePill);
      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', updatePill);
      };
    }
  }, [permissionTab, editingPermissionsUser]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('All');
  const [hoveredRow, setHoveredRow] = useState(null);

  const isOnlyAdmin = useMemo(() => {
    return editingUser && editingUser.role === 'admin' && users.filter(u => u.role === 'admin').length === 1;
  }, [editingUser, users]);

  const filteredUsers = useMemo(() => {
    return users
      .filter(u => !(currentUser.role === 'manager' && u.role === 'admin'))
      .filter(u => {
        const matchesSearch =
          u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesRole = selectedRole === 'All' || u.role === selectedRole;
        return matchesSearch && matchesRole;
      });
  }, [users, currentUser.role, searchQuery, selectedRole]);

  useEffect(() => {
    if (isModalOpen || confirmDeleteUser || alertPopup || editingPermissionsUser || permissionConfirm) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen, confirmDeleteUser, alertPopup, editingPermissionsUser, permissionConfirm]);

  if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
    return (
      <div className="bg-white rounded-3xl border border-[#d2d2d7]/50 p-12 text-center max-w-sm mx-auto space-y-4 my-12 shadow-sm text-[#1d1d1f]">
        <div className="w-12 h-12 rounded-full bg-[#f5f5f7] text-black flex items-center justify-center mx-auto border border-[#d2d2d7]/40">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="font-bold text-[#1d1d1f] text-sm uppercase tracking-wide">สิทธิ์เข้าใช้งานถูกจำกัด</h2>
      </div>
    );
  }

  const handleStartCreate = () => {
    setEditingUser(null);
    setUsername('');
    setPassword('');
    setName('');
    setRole('user');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleStartEdit = (u) => {
    setEditingUser(u);
    setUsername(u.username);
    setPassword('');
    setName(u.name);
    setRole(u.role);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleStartEditPermissions = (u) => {
    setEditingPermissionsUser(u);
    setPermissionsForm(getUserPermissions(u));
    setPermissionTab('pages');
    setPermissionSearch('');
    setErrorMsg('');
  };

  const handleTogglePagePermission = (page) => {
    const isCurrent = Boolean(permissionsForm?.pages?.[page.id]);
    const willEnable = !isCurrent;
    setPermissionConfirm({
      title: willEnable ? 'ยืนยันเปิดสิทธิ์การเข้าถึงหน้า' : 'ยืนยันปิดสิทธิ์การเข้าถึงหน้า',
      message: `คุณต้องการ${willEnable ? 'เปิด' : 'ปิด'}สิทธิ์การมองเห็นหน้า "${page.name}" สำหรับ "${editingPermissionsUser?.name || editingPermissionsUser?.username}" ใช่หรือไม่?`,
      type: willEnable ? 'primary' : 'warning',
      confirmText: willEnable ? 'ยืนยันเปิด' : 'ยืนยันปิด',
      onConfirm: () => {
        setPermissionsForm(prev => ({
          ...prev,
          pages: {
            ...prev.pages,
            [page.id]: willEnable
          }
        }));
      }
    });
  };

  const handleToggleActionPermission = (action) => {
    const isCurrent = Boolean(permissionsForm?.actions?.[action.id]);
    const willEnable = !isCurrent;
    setPermissionConfirm({
      title: willEnable ? 'ยืนยันเปิดสิทธิ์ปุ่มคำสั่ง' : 'ยืนยันปิดสิทธิ์ปุ่มคำสั่ง',
      message: `คุณต้องการ${willEnable ? 'เปิด' : 'ปิด'}สิทธิ์ปุ่ม "${action.name}" (${action.description}) ใช่หรือไม่?`,
      type: willEnable ? 'primary' : 'warning',
      confirmText: willEnable ? 'ยืนยันเปิด' : 'ยืนยันปิด',
      onConfirm: () => {
        setPermissionsForm(prev => ({
          ...prev,
          actions: {
            ...prev.actions,
            [action.id]: willEnable
          }
        }));
      }
    });
  };

  const handleApplyPreset = (presetType) => {
    if (!editingPermissionsUser) return;
    setPermissionConfirm({
      title: 'ยืนยันรีเซ็ตการตั้งค่า',
      message: `คุณต้องการรีเซ็ตสิทธิ์ของ "${editingPermissionsUser.name}" กลับเป็นค่าเริ่มต้นตาม Role (${editingPermissionsUser.role}) ใช่หรือไม่? การตั้งค่าสิทธิ์เดิมจะถูกแทนที่`,
      type: 'warning',
      confirmText: 'ยืนยันรีเซ็ต',
      onConfirm: () => {
        if (presetType === 'role') {
          setPermissionsForm(getDefaultPermissionsForRole(editingPermissionsUser.role));
        } else if (presetType === 'full') {
          setPermissionsForm(getFullPermissionsPreset());
        } else if (presetType === 'readonly') {
          setPermissionsForm(getReadOnlyPermissionsPreset());
        }
      }
    });
  };

  const handleToggleGroupActions = (group, enableAll) => {
    setPermissionConfirm({
      title: enableAll ? `ยืนยันเปิดสิทธิ์กลุ่ม ${group.name}` : `ยืนยันปิดสิทธิ์กลุ่ม ${group.name}`,
      message: `คุณต้องการ${enableAll ? 'เปิด' : 'ปิด'}สิทธิ์ปุ่มคำสั่งทั้งหมดในกลุ่ม "${group.name}" (${group.actions.length} ปุ่ม) ใช่หรือไม่?`,
      type: enableAll ? 'primary' : 'warning',
      confirmText: enableAll ? 'เปิดทุกปุ่มในกลุ่ม' : 'ปิดทุกปุ่มในกลุ่ม',
      onConfirm: () => {
        setPermissionsForm(prev => {
          const nextActions = { ...prev.actions };
          group.actions.forEach(a => {
            nextActions[a.id] = enableAll;
          });
          return {
            ...prev,
            actions: nextActions
          };
        });
      }
    });
  };

  const handleToggleAllPages = (enableAll) => {
    setPermissionConfirm({
      title: enableAll ? 'ยืนยันเปิดสิทธิ์ทุกหน้า' : 'ยืนยันปิดสิทธิ์ทุกหน้า',
      message: `คุณต้องการ${enableAll ? 'เปิด' : 'ปิด'}สิทธิ์การมองเห็นหน้าทั้งหมด (${filteredPages.length} หน้า) ใช่หรือไม่?`,
      type: enableAll ? 'primary' : 'warning',
      confirmText: enableAll ? 'เปิดทั้งหมด' : 'ปิดทั้งหมด',
      onConfirm: () => {
        setPermissionsForm(prev => {
          const next = { ...prev.pages };
          filteredPages.forEach(p => { next[p.id] = enableAll; });
          return { ...prev, pages: next };
        });
      }
    });
  };

  const handleClosePermissionModal = () => {
    setEditingPermissionsUser(null);
    setPermissionsForm(null);
  };

  const handleSavePermissions = () => {
    if (!editingPermissionsUser || !permissionsForm) return;
    setPermissionConfirm({
      title: 'ยืนยันการบันทึกสิทธิ์การใช้งาน',
      message: `คุณต้องการบันทึกการตั้งค่าสิทธิ์สำหรับผู้ใช้งาน "${editingPermissionsUser.name || editingPermissionsUser.username}" (@${editingPermissionsUser.username}) ใช่หรือไม่?`,
      type: 'primary',
      confirmText: 'ยืนยันบันทึก',
      cancelText: 'ยกเลิก',
      onConfirm: async () => {
        setPermissionSaving(true);
        try {
          const updatedUser = {
            ...editingPermissionsUser,
            permissions: permissionsForm
          };
          await onUpdateUser(updatedUser, editingPermissionsUser.username);
          const targetName = editingPermissionsUser.name || editingPermissionsUser.username;
          setEditingPermissionsUser(null);
          setPermissionsForm(null);
          setAlertPopup({
            type: 'success',
            title: 'บันทึกสิทธิ์สำเร็จ!',
            message: `กำหนดสิทธิ์การใช้งานสำหรับ "${targetName}" เรียบร้อยแล้ว`,
          });
        } catch (error) {
          setErrorMsg(error.message || 'เกิดข้อผิดพลาดในการบันทึกสิทธิ์');
        } finally {
          setPermissionSaving(false);
        }
      }
    });
  };

  const handleDeleteConfirm = async () => {
    if (confirmDeleteUser) {
      const deletedName = confirmDeleteUser.name || confirmDeleteUser.username;
      const targetUsername = confirmDeleteUser.username;
      try {
        await onDeleteUser(targetUsername);
      } catch (error) {
        setAlertPopup({ type: 'error', title: 'ลบไม่สำเร็จ', message: error.message });
        return;
      }
      setConfirmDeleteUser(null);
      setAlertPopup({
        type: 'success',
        title: 'ลบผู้ใช้งานสำเร็จ!',
        message: `ลบข้อมูลผู้ใช้งาน "${deletedName}" ออกจากระบบเรียบร้อยแล้ว!`,
      });
    }
  };

  const canEdit = (u) => {
    if (u.username === currentUser.username) {
      return true;
    }
    if (currentUser.role === 'admin') {
      return canPerformAction(currentUser, 'users.edit');
    }
    if (currentUser.role === 'manager') {
      return u.role === 'user' && canPerformAction(currentUser, 'users.edit');
    }
    return false;
  };

  const canManagePermissions = (u) => {
    if (currentUser?.role === 'admin') {
      return canPerformAction(currentUser, 'users.permissions');
    }
    if (currentUser?.role === 'manager' && u.role === 'user') {
      return canPerformAction(currentUser, 'users.permissions');
    }
    return false;
  };

  const canDelete = (u) => {
    if (u.username === currentUser.username) return false;
    if (currentUser.role === 'admin') {
      return canPerformAction(currentUser, 'users.delete');
    }
    return false;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setErrorFields({});

    if (!username.trim()) {
      setErrorFields({ username: true });
      scrollToError(refUsername);
      setErrorMsg('กรุณากรอกชื่อไอดีเข้าระบบ (Username)');
      return;
    }
    if (!editingUser && !password.trim()) {
      setErrorFields({ password: true });
      scrollToError(refPassword);
      setErrorMsg('กรุณากรอกรหัสผ่าน');
      return;
    }
    if (!name.trim()) {
      setErrorFields({ name: true });
      scrollToError(refName);
      setErrorMsg('กรุณากรอกชื่อ-นามสกุลพนักงาน');
      return;
    }

    if (password && (password.length < 8 || password.length > 256)) {
      setErrorFields({ password: true });
      scrollToError(refPassword);
      setErrorMsg('รหัสผ่านใหม่ต้องมี 8–256 ตัวอักษร');
      return;
    }
    const cleanUsername = username.trim();

    if (editingUser) {
      // ตรวจ username ซ้ำ (ยกเว้นตัวเอง)
      const duplicateUser = users.find(
        (u) => u.username === cleanUsername && u.username !== editingUser.username
      );
      if (duplicateUser) {
        setErrorFields({ username: true });
        scrollToError(refUsername);
        setErrorMsg(`ชื่อผู้ใช้ (Username) "${cleanUsername}" ถูกใช้งานแล้ว`);
        return;
      }

      if (editingUser.role === 'admin' && role !== 'admin' && users.filter(u => u.role === 'admin').length === 1) {
        setErrorMsg('ไม่สามารถเปลี่ยนสิทธิ์ได้ เนื่องจากต้องมีบัญชี Admin อย่างน้อย 1 บัญชีในระบบ');
        return;
      }

      const updatedUser = {
        ...editingUser,
        username: cleanUsername,
        password: password.trim(),
        name: name.trim(),
        role: currentUser.role === 'admin' ? role : editingUser.role,
      };

      try {
        await onUpdateUser(updatedUser, editingUser.username);
      } catch (error) {
        setErrorMsg(error.message);
        return;
      }
      setIsModalOpen(false);
      setEditingUser(null);
      setAlertPopup({
        type: 'success',
        title: 'แก้ไขผู้ใช้งานสำเร็จ!',
        message: `แก้ไขข้อมูลผู้ใช้งาน "${updatedUser.name}" เรียบร้อยแล้ว!`,
      });
    } else {
      const exists = users.some(u => u.username === cleanUsername);
      if (exists) {
        setErrorFields({ username: true });
        scrollToError(refUsername);
        setErrorMsg(`ชื่อผู้ใช้ (Username) "${cleanUsername}" ถูกใช้งานแล้ว`);
        return;
      }

      const allowedRole = currentUser.role === 'manager' ? 'user' : role;

      const newUser = {
        username: cleanUsername,
        password: password.trim(),
        name: name.trim(),
        role: allowedRole,
        createdAt: new Date().toLocaleDateString('sv-SE'),
      };

      try {
        await onAddUser(newUser);
      } catch (error) {
        setErrorMsg(error.message);
        return;
      }
      setIsModalOpen(false);
      setUsername('');
      setPassword('');
      setName('');
      setRole('user');
      setAlertPopup({
        type: 'success',
        title: 'ลงทะเบียนสำเร็จ!',
        message: `ลงทะเบียนผู้ใช้งาน "${newUser.name}" เรียบร้อยแล้ว!`,
      });
    }
  };

  const getRoleBadge = (r) => {
    switch (r) {
      case 'admin':
        return <span className="px-2.5 py-0.5 text-xs font-bold bg-[#6B46C1] text-white rounded-md border border-[#6B46C1]/10 shadow-[0_1px_3px_rgba(107,70,193,0.2)]">Admin</span>;
      case 'manager':
        return <span className="px-2.5 py-0.5 text-xs font-bold bg-[#1A365D] text-white rounded-md border border-[#1A365D]/10 shadow-[0_1px_3px_rgba(26,54,93,0.2)]">Manager</span>;
      default:
        return <span className="px-2.5 py-0.5 text-xs font-bold bg-[#2F855A] text-white rounded-md border border-[#2F855A]/10 shadow-[0_1px_3px_rgba(47,133,90,0.2)]">User</span>;
    }
  };

  const formatAccountDate = (val) => {
    if (!val) return '-';
    try {
      if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
        const [y, m, d] = val.split('-');
        const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
        return dateObj.toLocaleDateString('th-TH');
      }
      const d = new Date(val);
      if (isNaN(d.getTime())) return val;
      return d.toLocaleDateString('th-TH');
    } catch {
      return val;
    }
  };

  // Filtered definitions for Permission Modal
  const filteredPages = useMemo(() => {
    if (!permissionSearch.trim()) return PAGE_DEFINITIONS;
    const term = permissionSearch.toLowerCase().trim();
    return PAGE_DEFINITIONS.filter(p =>
      p.name.toLowerCase().includes(term) ||
      p.description.toLowerCase().includes(term) ||
      p.category.toLowerCase().includes(term)
    );
  }, [permissionSearch]);

  const filteredActionGroups = useMemo(() => {
    const term = permissionSearch.toLowerCase().trim();
    return ACTION_GROUPS.map(group => {
      const visibleActions = group.actions.filter(a => !a.hidden);
      const matchingActions = visibleActions.filter(a =>
        !term ||
        a.name.toLowerCase().includes(term) ||
        a.description.toLowerCase().includes(term) ||
        group.name.toLowerCase().includes(term)
      );
      if (matchingActions.length > 0) {
        return {
          ...group,
          actions: matchingActions
        };
      }
      return null;
    }).filter(Boolean);
  }, [permissionSearch]);

  // Active counts for Permission Modal badges
  const activePagesCount = useMemo(() => {
    if (!permissionsForm?.pages) return 0;
    return Object.values(permissionsForm.pages).filter(Boolean).length;
  }, [permissionsForm]);

  const totalPagesCount = PAGE_DEFINITIONS.length;

  const activeActionsCount = useMemo(() => {
    if (!permissionsForm?.actions) return 0;
    const hiddenSet = new Set(
      ACTION_GROUPS.flatMap(g => g.actions.filter(a => a.hidden).map(a => a.id))
    );
    return Object.entries(permissionsForm.actions).filter(([k, v]) => Boolean(v) && !hiddenSet.has(k)).length;
  }, [permissionsForm]);

  const totalActionsCount = useMemo(() => {
    return ACTION_GROUPS.reduce((acc, g) => acc + g.actions.filter(a => !a.hidden).length, 0);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in text-[#1d1d1f] w-full min-w-0">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-5 rounded-full bg-gradient-to-b from-[#0071e3] to-[#00c2ff]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0071e3]">USER MANAGEMENT</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-[#1d1d1f] leading-none">จัดการผู้ใช้งานระบบ</h1>
        </div>
        {canPerformAction(currentUser, 'users.create') && (
          <button
            type="button"
            onClick={handleStartCreate}
            className="group relative overflow-hidden px-4 py-2.5 bg-gradient-to-r from-[#0071e3] to-[#0096ff] hover:from-[#0080ff] hover:to-[#00a8ff] text-white text-xs font-bold rounded-xl shadow-lg hover:shadow-blue-500/30 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
            <Plus className="w-4 h-4" />
            ลงทะเบียนผู้ใช้ใหม่
          </button>
        )}
      </div>

      {/* Filters Panel */}
      <div className="no-print bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-[#d2d2d7]/50 shadow-xs">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-[#0071e3] animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#555557]">ตัวกรอง</span>
          </div>
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              placeholder="ค้นหาชื่อผู้ใช้ หรือ ชื่อ-นามสกุล..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-8 py-2 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-xs text-zinc-700 focus:outline-hidden focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10 focus:bg-white transition-all placeholder:text-zinc-400"
            />
          </div>

          {/* Role Filter Dropdown */}
          <div className="w-full sm:w-48">
            <DropdownFilter
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full"
              options={[
                { value: 'All', label: 'สิทธิ์ทั้งหมด (All)' },
                { value: 'admin', label: 'Admin' },
                { value: 'manager', label: 'Manager' },
                { value: 'user', label: 'User' }
              ]}
            />
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/50 shadow-xs overflow-hidden">
        <div className="px-4.5 py-3.5 border-b border-[#e8e8ed] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h4 className="text-xs font-black text-[#1d1d1f] tracking-widest uppercase">บัญชีผู้ใช้งานที่อนุมัติแล้ว</h4>
            <span className="px-2.5 py-0.5 text-[10px] font-black bg-[#0071e3] text-white rounded-full">
              {filteredUsers.length.toLocaleString()} บัญชี
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-[#f5f5f7]/80 text-[#86868b] font-black border-b border-[#e8e8ed] text-[10px] uppercase tracking-widest">
                <th className="p-2 sm:p-3.5">Username</th>
                <th className="p-2 sm:p-3.5">ชื่อ-นามสกุลพนักงาน</th>
                <th className="p-2 sm:p-3.5">สิทธิ์เข้าถึง</th>
                <th className="p-2 sm:p-3.5">วันที่เปิดบัญชี</th>
                <th className="p-2 sm:p-3.5 text-center w-36">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f0f5]">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-16 text-center text-zinc-400 text-xs">
                    ไม่พบผู้ใช้งานตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u, idx) => (
                  <tr
                    key={u.username}
                    onMouseEnter={() => setHoveredRow(u.username)}
                    onMouseLeave={() => setHoveredRow(null)}
                    className={`transition-all duration-150 ${
                      hoveredRow === u.username
                        ? 'bg-gradient-to-r from-[#0071e3]/4 via-[#0071e3]/3 to-transparent'
                        : idx % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]/50'
                    }`}
                  >
                    <td className="p-2 sm:p-3.5 font-mono font-bold text-[#1d1d1f] text-[10px] sm:text-xs">
                      <span className="bg-[#f5f5f7] px-1.5 py-0.5 rounded-md">
                        {u.username}
                      </span>
                    </td>
                    <td className="p-2 sm:p-3.5 font-semibold text-[#1d1d1f] leading-snug">{u.name}</td>
                    <td className="p-2 sm:p-3.5">{getRoleBadge(u.role)}</td>
                    <td className="p-2 sm:p-3.5 text-[#555557] font-mono text-xs" title={u.createdAt || ''}>
                      {formatAccountDate(u.createdAt)}
                    </td>
                    <td className="p-2 sm:p-3.5 text-center">
                      <div className="flex justify-center items-center gap-1.5">
                        {/* 1. ปุ่มแก้ไข (ดินสอ) */}
                        {canEdit(u) && (
                          <button
                            type="button"
                            onClick={() => handleStartEdit(u)}
                            className="p-1.5 text-[#0071e3] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="แก้ไขผู้ใช้งาน"
                          >
                            <i className="bi bi-pencil-square text-base"></i>
                          </button>
                        )}

                        {/* 2. ปุ่มฟันเฟือง (ตั้งค่าสิทธิ์หน้าและปุ่ม) อยู่ระหว่างแก้ไข กับถังขยะ */}
                        {canManagePermissions(u) && (
                          <button
                            type="button"
                            onClick={() => handleStartEditPermissions(u)}
                            className="p-1.5 text-black hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                            title="ตั้งค่าสิทธิ์การใช้งาน (หน้า/ปุ่ม)"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                        )}

                        {/* 3. ปุ่มลบ (ถังขยะ) */}
                        {canDelete(u) && (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteUser(u)}
                            className="p-1.5 text-red-650 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="ลบผู้ใช้งาน"
                          >
                            <i className="bi bi-trash3 text-base"></i>
                          </button>
                        )}

                        {!canEdit(u) && !canManagePermissions(u) && !canDelete(u) && (
                          <span className="text-zinc-300 text-xs">-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permission Settings Modal (ป๊อปอัปตั้งค่าสิทธิ์การใช้งาน) */}
      {editingPermissionsUser && permissionsForm && createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in no-print">
          <div className="bg-white rounded-3xl border border-[#d2d2d7]/60 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scale-in">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#e8e8ed] flex items-center justify-between flex-shrink-0 bg-gradient-to-r from-zinc-50/80 via-white to-zinc-50/30">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-[#1d1d1f] tracking-tight">
                    ตั้งค่าสิทธิ์การใช้งานระบบ
                  </h3>
                  {getRoleBadge(editingPermissionsUser.role)}
                </div>
                <p className="text-xs text-[#555557] mt-0.5">
                  กำหนดสิทธิ์สำหรับ <strong className="text-[#1d1d1f]">{editingPermissionsUser.name}</strong> (@{editingPermissionsUser.username})
                </p>
              </div>
              <button
                type="button"
                onClick={handleClosePermissionModal}
                className="p-2 rounded-xl text-[#555557] hover:bg-zinc-100 hover:text-[#1d1d1f] transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Presets Bar */}
            <div className="px-6 py-3 bg-transparent border-b border-[#e8e8ed] flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-[#555557] text-[11px] uppercase tracking-wider">
                ทางลัดกำหนดสิทธิ์:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleApplyPreset('role')}
                  className="px-2.5 py-1 bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200/80 rounded-lg font-semibold transition-all shadow-2xs hover:shadow-xs cursor-pointer"
                  title="คืนค่าสิทธิ์ตาม Role เริ่มต้น"
                >
                  รีเซ็ตการตั้งค่า
                </button>
              </div>
            </div>

            {/* Search & Navigation Tabs */}
            <div className="px-6 pt-3 pb-2 border-b border-[#e8e8ed] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Tabs */}
              <div className="relative flex flex-nowrap items-center p-1 bg-[#e8e8ed] rounded-full border border-[#d2d2d7]/50 w-fit shrink-0 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] select-none">
                {/* Animated sliding indicator pill */}
                <div
                  className="absolute top-1 bottom-1 rounded-full bg-white shadow-sm border border-black/5 pointer-events-none transition-all duration-350 ease-[cubic-bezier(0.34,1.25,0.64,1)]"
                  style={{
                    left: `${pillStyle.left}px`,
                    width: `${pillStyle.width}px`,
                    opacity: pillStyle.opacity
                  }}
                />

                <button
                  ref={pagesTabRef}
                  type="button"
                  onClick={() => setPermissionTab('pages')}
                  className={`relative z-10 px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-colors duration-200 flex items-center justify-center gap-1.5 cursor-pointer transform active:scale-95 whitespace-nowrap shrink-0 ${
                    permissionTab === 'pages'
                      ? 'text-[#0071e3]'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  <span>สิทธิ์การมองเห็นหน้า</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold transition-all duration-200 ${
                    permissionTab === 'pages' ? 'bg-[#0071e3]/10 text-[#0071e3]' : 'bg-zinc-300/60 text-zinc-600'
                  }`}>
                    {activePagesCount}/{totalPagesCount}
                  </span>
                </button>

                <button
                  ref={actionsTabRef}
                  type="button"
                  onClick={() => setPermissionTab('actions')}
                  className={`relative z-10 px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-colors duration-200 flex items-center justify-center gap-1.5 cursor-pointer transform active:scale-95 whitespace-nowrap shrink-0 ${
                    permissionTab === 'actions'
                      ? 'text-amber-700'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  <span>สิทธิ์ปุ่มคำสั่งและการทำงาน</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold transition-all duration-200 ${
                    permissionTab === 'actions' ? 'bg-amber-100 text-amber-800' : 'bg-zinc-300/60 text-zinc-600'
                  }`}>
                    {activeActionsCount}/{totalActionsCount}
                  </span>
                </button>
              </div>

              {/* Search input in modal */}
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                <input
                  type="text"
                  value={permissionSearch}
                  onChange={(e) => setPermissionSearch(e.target.value)}
                  placeholder="ค้นหาหน้า หรือปุ่ม..."
                  className="w-full pl-8 pr-7 py-1.5 bg-[#f5f5f7] border border-[#d2d2d7] rounded-lg text-xs focus:outline-hidden focus:border-[#0071e3] focus:bg-white transition-all"
                />
                {permissionSearch && (
                  <button
                    type="button"
                    onClick={() => setPermissionSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Modal Body: Scrollable Settings List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0 bg-[#fafafa]">
              {errorMsg && (
                <div className="p-3 text-xs bg-red-50 text-red-600 border border-red-100 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* TAB 1: PAGES & NAVIGATION */}
              {permissionTab === 'pages' && (
                <div key="pages" className="space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
                      รายการหน้าและเมนูที่อนุญาตให้เข้าถึง ({filteredPages.length} หน้า)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleAllPages(true)}
                        className="text-[11px] font-bold text-[#0071e3] hover:underline cursor-pointer"
                      >
                        เปิดทั้งหมด
                      </button>
                      <span className="text-zinc-300">|</span>
                      <button
                        type="button"
                        onClick={() => handleToggleAllPages(false)}
                        className="text-[11px] font-bold text-zinc-500 hover:underline cursor-pointer"
                      >
                        ปิดทั้งหมด
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {filteredPages.map(page => {
                      const isEnabled = Boolean(permissionsForm.pages?.[page.id]);
                      return (
                        <div
                          key={page.id}
                          onClick={() => handleTogglePagePermission(page)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                            isEnabled
                              ? 'bg-white border-[#0071e3]/30 shadow-xs hover:border-[#0071e3]/60 ring-1 ring-[#0071e3]/10'
                              : 'bg-white/60 border-zinc-200/80 opacity-75 hover:opacity-100'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-[#1d1d1f] truncate">
                                {page.name}
                              </span>
                              <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-100 px-1.5 py-0.2 rounded">
                                {page.category}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                              {page.description}
                            </p>
                          </div>

                          {/* iOS Style Switch */}
                          <div className="shrink-0 flex items-center">
                            <div
                              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out ${
                                isEnabled ? 'bg-emerald-500' : 'bg-zinc-300'
                              }`}
                            >
                              <div
                                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                                  isEnabled ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: BUTTONS & ACTIONS */}
              {permissionTab === 'actions' && (
                <div key="actions" className="space-y-4 animate-fade-in">
                  {filteredActionGroups.map(group => {
                    const groupActions = group.actions;
                    const groupEnabledCount = groupActions.filter(a => permissionsForm.actions?.[a.id]).length;
                    const isAllGroupEnabled = groupEnabledCount === groupActions.length;

                    return (
                      <div key={group.id} className="rounded-2xl border border-[#d2d2d7]/40 shadow-xs overflow-hidden">
                        {/* Group Header */}
                        <div className="px-4 py-3 bg-transparent border-b border-[#e8e8ed] flex items-center justify-between gap-3">
                          <div>
                            <span className="font-bold text-xs text-[#1d1d1f] block leading-tight">
                              {group.name}
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              {group.description}
                            </span>
                          </div>
                          
                          {/* Group Quick Toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleGroupActions(group, !isAllGroupEnabled)}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                              isAllGroupEnabled
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                            }`}
                          >
                            <i className={`bi ${isAllGroupEnabled ? 'bi-check-circle-fill text-emerald-600' : 'bi-circle'}`}></i>
                            <span>{groupEnabledCount}/{groupActions.length} ปุ่ม</span>
                          </button>
                        </div>

                        {/* Group Actions List */}
                        <div className="divide-y divide-zinc-100">
                          {groupActions.map(action => {
                            const isEnabled = Boolean(permissionsForm.actions?.[action.id]);
                            return (
                              <div
                                key={action.id}
                                onClick={() => handleToggleActionPermission(action)}
                                className={`px-4 py-3 flex items-center justify-between gap-3 transition-colors cursor-pointer select-none hover:bg-blue-50/10 ${
                                  isEnabled ? 'bg-transparent' : 'bg-transparent opacity-70 hover:opacity-100'
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <span className={`text-xs font-bold block ${isEnabled ? 'text-[#1d1d1f]' : 'text-zinc-600'}`}>
                                    {action.name}
                                  </span>
                                  <span className="text-[10px] text-zinc-500 mt-0.5 block">
                                    {action.description}
                                  </span>
                                </div>

                                {/* iOS Style Switch */}
                                <div className="shrink-0 flex items-center">
                                  <div
                                    className={`w-10 h-5.5 flex items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out ${
                                      isEnabled ? 'bg-emerald-500' : 'bg-zinc-300'
                                    }`}
                                  >
                                    <div
                                      className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                                        isEnabled ? 'translate-x-4.5' : 'translate-x-0'
                                      }`}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-[#e8e8ed] bg-white flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
              <div className="text-xs text-zinc-500 font-medium">
                สรุป: <strong className="text-[#0071e3]">{activePagesCount}</strong>/{totalPagesCount} หน้า, <strong className="text-amber-600">{activeActionsCount}</strong>/{totalActionsCount} ปุ่ม
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleClosePermissionModal}
                  className="flex-1 sm:flex-initial px-4 py-2 border border-[#d2d2d7] hover:bg-zinc-100 text-zinc-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={permissionSaving}
                  onClick={handleSavePermissions}
                  className="flex-1 sm:flex-initial px-5 py-2 bg-gradient-to-r from-[#0071e3] to-[#0096ff] hover:from-[#0080ff] hover:to-[#00a8ff] text-white text-xs font-bold rounded-xl shadow-lg hover:shadow-blue-500/30 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {permissionSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <span>บันทึก</span>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* Register / Edit User Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-[#d2d2d7]/50 shadow-xl max-w-md w-full max-h-[calc(100vh_-_3rem)] md:max-h-[calc(100vh_-_4rem)] flex flex-col overflow-hidden animate-scale-in">
            <div className="px-6 py-4 border-b border-[#e8e8ed] flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5.5 h-5.5 text-[#1d1d1f]" />
                <h3 className="text-base font-extrabold text-[#1d1d1f] tracking-wide uppercase">
                  {editingUser ? 'แก้ไขข้อมูลผู้ใช้งาน' : 'สร้างผู้ใช้งานใหม่'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-[#555557] hover:bg-[#f5f5f7] hover:text-[#1d1d1f] transition-all cursor-pointer"
              >
                <Plus className="w-5 h-5 rotate-45 animate-fade-in" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                {errorMsg && (
                  <div className="p-3.5 text-xs bg-red-50 text-red-600 border border-red-100/50 rounded-xl">
                    {errorMsg}
                  </div>
                )}

                {/* Username */}
                <div>
                  <label className="form-label">
                    ชื่อไอดีเข้าระบบ (Username) <span className="text-xs font-semibold text-zinc-650 ml-1"></span> <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={refUsername}
                    type="text"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); clearFieldError('username'); }}
                    placeholder="เช่น somsak"
                    className={`form-input ${errorFields.username ? 'border-red-500 ring-1 ring-red-500/30' : ''}`}
                    autoFocus={!editingUser}
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="form-label">
                    รหัสผ่านเข้าระบบ (Password) <span className="text-xs font-semibold text-zinc-650 ml-1">{editingUser ? '(เว้นว่างเพื่อใช้รหัสผ่านเดิม)' : '(อย่างน้อย 8 ตัวอักษร)'}</span> <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      ref={refPassword}
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); clearFieldError('password'); }}
                      placeholder={editingUser ? 'เว้นว่างหากไม่ต้องการเปลี่ยน' : '••••••••'}
                      className={`form-input pr-10 font-mono ${errorFields.password ? 'border-red-500 ring-1 ring-red-500/30' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="form-label">
                    ชื่อ-นามสกุลพนักงาน <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={refName}
                    type="text"
                    value={name}
                    onChange={(e) => { setName(e.target.value); clearFieldError('name'); }}
                    placeholder="เช่น สมศักดิ์ รักดี"
                    className={`form-input ${errorFields.name ? 'border-red-500 ring-1 ring-red-500/30' : ''}`}
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="form-label">สิทธิ์การเข้าถึง (Role) <span className="text-red-500">*</span></label>
                  {currentUser.role === 'admin' ? (
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      disabled={isOnlyAdmin}
                      className={`form-input ${isOnlyAdmin ? 'bg-zinc-100 cursor-not-allowed opacity-75' : ''}`}
                    >
                      <option value="admin">Admin</option>
                       <option value="manager">Manager</option>
                      <option value="user">User</option>
                    </select>
                  ) : (
                    <div className="p-3 bg-zinc-50 border border-zinc-200/80 rounded-xl text-xs font-bold text-zinc-700 flex items-center justify-between">
                      <span>User</span>
                    </div>
                  )}
                  {isOnlyAdmin && (
                    <p className="text-[10px] text-amber-600 mt-1">
                      * บัญชีนี้เป็น Admin บัญชีเดียวในระบบ จึงไม่สามารถลดสิทธิ์ได้
                    </p>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-[#e8e8ed] flex items-center justify-end gap-2 flex-shrink-0 bg-transparent">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-zinc-600 hover:text-black hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-[#0071e3] to-[#0096ff] hover:from-[#0080ff] hover:to-[#00a8ff] text-white text-xs font-bold rounded-xl shadow-lg hover:shadow-blue-500/30 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  {editingUser ? 'บันทึกการแก้ไข' : 'ลงทะเบียนผู้ใช้'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteUser && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs animate-fade-in no-print">
          <div onClick={() => setConfirmDeleteUser(null)} className="absolute inset-0" />
          <div className="relative bg-white rounded-3xl border border-[#d2d2d7]/50 max-w-sm w-full p-6 shadow-xl space-y-4 z-10 animate-scale-in text-[#1d1d1f]">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-650">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm uppercase tracking-wide">ยืนยันการลบผู้ใช้งาน</h3>
              <p className="text-[#555557] text-xs mt-1 leading-relaxed">
                คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้งาน <strong className="text-black font-semibold">"{confirmDeleteUser.name || confirmDeleteUser.username}"</strong> (@{confirmDeleteUser.username}) ออกจากระบบ? การกระทำนี้ไม่สามารถเรียกคืนได้
              </p>
            </div>
            <div className="flex gap-2.5 text-xs font-semibold pt-1">
              <button type="button"
                onClick={() => setConfirmDeleteUser(null)}
                className="flex-1 py-2.5 border border-[#d2d2d7] hover:bg-[#f5f5f7] rounded-full transition-colors cursor-pointer text-[#1d1d1f]"
              >
                ยกเลิก
              </button>
              <button type="button"
                onClick={handleDeleteConfirm}
                className="flex-1 py-2.5 bg-red-650 hover:bg-red-700 text-white rounded-full transition-colors cursor-pointer"
              >
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Success / Error Alert Popup Modal */}
      {alertPopup && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs animate-fade-in no-print">
          <div onClick={() => {
            setAlertPopup(null);
          }} className="absolute inset-0" />
          <div className="relative bg-white rounded-3xl border border-[#d2d2d7]/50 max-w-xs w-full p-6 shadow-xl space-y-4 z-10 animate-scale-in text-[#1d1d1f] text-center">
            {alertPopup.type === 'success' ? (
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mx-auto animate-scale-in">
                <Check className="w-6 h-6" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-650 mx-auto animate-scale-in">
                <AlertCircle className="w-6 h-6" />
              </div>
            )}
            <div>
              <h3 className="font-bold text-sm uppercase tracking-wide">{alertPopup.title}</h3>
              <p className="text-[#555557] text-xs mt-1.5 leading-relaxed">
                {alertPopup.message}
              </p>
            </div>
            <div className="pt-2 text-xs font-semibold">
              <button type="button"
                onClick={() => {
                  setAlertPopup(null);
                }}
                className={`w-full py-2.5 rounded-full text-white transition-colors cursor-pointer shadow-xs ${alertPopup.type === 'success'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-650 hover:bg-red-700'
                  }`}
              >
                ตกลง
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Permission Action Confirmation Modal (ป๊อปอัปยืนยันก่อนกดทุกปุ่มในหน้าสิทธิ์) */}
      {permissionConfirm && createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in no-print">
          <div onClick={() => setPermissionConfirm(null)} className="absolute inset-0" />
          <div className="relative bg-white rounded-3xl border border-[#d2d2d7]/60 max-w-sm w-full p-6 shadow-2xl space-y-4 z-10 animate-scale-in text-[#1d1d1f]">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${
              permissionConfirm.type === 'danger'
                ? 'bg-red-50 text-red-600'
                : permissionConfirm.type === 'warning'
                ? 'bg-amber-50 text-amber-600'
                : 'bg-blue-50 text-[#0071e3]'
            }`}>
              {permissionConfirm.type === 'danger' ? (
                <AlertCircle className="w-6 h-6" />
              ) : permissionConfirm.type === 'warning' ? (
                <AlertCircle className="w-6 h-6" />
              ) : (
                <HelpCircle className="w-6 h-6" />
              )}
            </div>
            <div className="text-center">
              <h3 className="font-bold text-sm text-[#1d1d1f] uppercase tracking-wide">
                {permissionConfirm.title}
              </h3>
              <p className="text-[#555557] text-xs mt-1.5 leading-relaxed">
                {permissionConfirm.message}
              </p>
            </div>
            <div className="flex gap-2.5 text-xs font-semibold pt-2">
              <button
                type="button"
                onClick={() => setPermissionConfirm(null)}
                className="flex-1 py-2.5 border border-[#d2d2d7] hover:bg-[#f5f5f7] rounded-full transition-colors cursor-pointer text-[#1d1d1f]"
              >
                {permissionConfirm.cancelText || 'ยกเลิก'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const act = permissionConfirm.onConfirm;
                  setPermissionConfirm(null);
                  if (act) act();
                }}
                className={`flex-1 py-2.5 text-white rounded-full transition-colors cursor-pointer shadow-xs ${
                  permissionConfirm.type === 'danger'
                    ? 'bg-red-600 hover:bg-red-700'
                    : permissionConfirm.type === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-[#0071e3] hover:bg-[#0077ed]'
                }`}
              >
                {permissionConfirm.confirmText || 'ยืนยัน'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
