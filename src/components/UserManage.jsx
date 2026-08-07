import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { UserPlus, Shield, Lock, Plus, Check, AlertCircle, Search } from 'lucide-react';

export default function UserManage({ users, onAddUser, onUpdateUser, onDeleteUser, currentUser }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('user');

  const [errorMsg, setErrorMsg] = useState('');
  const [alertPopup, setAlertPopup] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [editingUser, setEditingUser] = useState(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('All');
  const [hoveredRow, setHoveredRow] = useState(null);

  const isOnlyAdmin = editingUser && editingUser.role === 'admin' && users.filter(u => u.role === 'admin').length === 1;

  const filteredUsers = users
    .filter(u => !(currentUser.role === 'manager' && u.role === 'admin'))
    .filter(u => {
      const matchesSearch =
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesRole = selectedRole === 'All' || u.role === selectedRole;
      return matchesSearch && matchesRole;
    });

  useEffect(() => {
    if (isModalOpen || confirmDeleteUser || alertPopup) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen, confirmDeleteUser, alertPopup]);

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
    setPassword(u.password);
    setName(u.name);
    setRole(u.role);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (confirmDeleteUser) {
      const deletedName = confirmDeleteUser.name || confirmDeleteUser.username;
      const targetUsername = confirmDeleteUser.username;
      setConfirmDeleteUser(null);
      setAlertPopup({
        type: 'success',
        title: 'ลบผู้ใช้งานสำเร็จ!',
        message: `ลบข้อมูลผู้ใช้งาน "${deletedName}" ออกจากระบบเรียบร้อยแล้ว!`,
        action: () => onDeleteUser(targetUsername)
      });
    }
  };

  const canEdit = (u) => {
    if (u.username === currentUser.username) {
      return true;
    }
    if (currentUser.role === 'admin') {
      return true;
    }
    if (currentUser.role === 'manager') {
      return u.role === 'user';
    }
    return false;
  };

  const canDelete = (u) => {
    if (u.username === currentUser.username) return false;
    if (currentUser.role === 'admin') {
      return true;
    }
    return false;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim() || !password.trim() || !name.trim()) {
      setErrorMsg('กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง');
      return;
    }

    const cleanUsername = username.trim().toLowerCase();

    if (editingUser) {
      if (editingUser.role === 'admin' && role !== 'admin' && users.filter(u => u.role === 'admin').length === 1) {
        setErrorMsg('ไม่สามารถเปลี่ยนสิทธิ์ได้ เนื่องจากต้องมีบัญชี Admin อย่างน้อย 1 บัญชีในระบบ');
        return;
      }

      const updatedUser = {
        ...editingUser,
        password: password.trim(),
        name: name.trim(),
        role: currentUser.role === 'admin' ? role : editingUser.role,
      };

      setIsModalOpen(false);
      setEditingUser(null);
      setAlertPopup({
        type: 'success',
        title: 'แก้ไขผู้ใช้งานสำเร็จ!',
        message: `แก้ไขข้อมูลผู้ใช้งาน "${updatedUser.name}" เรียบร้อยแล้ว!`,
        action: () => onUpdateUser(updatedUser)
      });
    } else {
      const exists = users.some(u => u.username === cleanUsername);
      if (exists) {
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

      setIsModalOpen(false);
      setUsername('');
      setPassword('');
      setName('');
      setRole('user');
      setAlertPopup({
        type: 'success',
        title: 'ลงทะเบียนสำเร็จ!',
        message: `ลงทะเบียนผู้ใช้งาน "${newUser.name}" เรียบร้อยแล้ว!`,
        action: () => onAddUser(newUser)
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
        <button
          type="button"
          onClick={handleStartCreate}
          className="group relative overflow-hidden px-4 py-2.5 bg-gradient-to-r from-[#0071e3] to-[#0096ff] hover:from-[#0080ff] hover:to-[#00a8ff] text-white text-xs font-bold rounded-xl shadow-lg hover:shadow-blue-500/30 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
          <Plus className="w-4 h-4" />
          ลงทะเบียนผู้ใช้ใหม่
        </button>
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
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-3 py-2 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-xs text-zinc-700 focus:outline-hidden focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10 focus:bg-white transition-all cursor-pointer font-medium"
            >
              <option value="All">สิทธิ์ทั้งหมด (All)</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="user">User</option>
            </select>
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
                <th className="p-2 sm:p-3.5 text-center w-28">การจัดการ</th>
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
                    <td className="p-2 sm:p-3.5 text-[#555557] font-mono text-xs">{u.createdAt}</td>
                    <td className="p-2 sm:p-3.5 text-center">
                      <div className="flex justify-center gap-1.5">
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
                        {!canEdit(u) && !canDelete(u) && (
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
                    ชื่อไอดีเข้าระบบ (Username) <span className="text-xs font-semibold text-zinc-650 ml-1">
                      (เช่น somchai_pim)</span> <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={`form-input ${editingUser ? '!bg-zinc-300 text-zinc-650 cursor-not-allowed border-[#a1a1a6] font-semibold' : ''}`}
                    disabled={!!editingUser}
                    autoFocus={!editingUser}
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="form-label">
                    รหัสผ่านเข้าระบบ (Password) <span className="text-xs font-semibold text-zinc-650 ml-1">(ระบุรหัสผ่าน...)</span> <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input"
                  />
                </div>

                {/* Full name */}
                <div>
                  <label className="form-label">
                    ชื่อ-นามสกุลพนักงาน <span className="text-xs font-semibold text-zinc-650 ml-1">(เช่น นายสมบูรณ์ ดีใจ)</span> <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="form-input"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="form-label">สิทธิ์การเข้าใช้งาน (Role)</label>
                  {currentUser.role === 'admin' ? (
                    <div>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className={`form-input text-zinc-950 ${isOnlyAdmin ? '!bg-zinc-300 text-zinc-655 cursor-not-allowed border-[#a1a1a6] font-semibold' : ''}`}
                        disabled={isOnlyAdmin}
                      >
                        <option value="user">User</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                      {isOnlyAdmin && (
                        <p className="text-rose-600 text-[10px] mt-1.5 font-semibold leading-normal">
                          * ไม่สามารถเปลี่ยนสิทธิ์ได้ เนื่องจากต้องมีบัญชี Admin อย่างน้อย 1 บัญชีในระบบ
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="form-input flex items-center gap-1.5 text-zinc-800 pointer-events-none bg-[#f5f5f7] border-[#d2d2d7]">
                      <Shield className="w-4 h-4 text-zinc-600" />
                      <span>{editingUser ? 'สิทธิ์เข้าใช้งาน: User' : 'เพิ่มสิทธิ์ User'}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-[#e8e8ed] flex gap-3 flex-shrink-0 bg-white">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 border border-[#d2d2d7] text-[#1d1d1f] hover:bg-[#f5f5f7] text-sm font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {editingUser ? 'บันทึกการแก้ไข' : 'ลงทะเบียนบัญชี'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteUser && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs animate-fade-in">
          <div onClick={() => setConfirmDeleteUser(null)} className="absolute inset-0" />
          <div className="relative bg-white rounded-3xl border border-[#d2d2d7]/50 max-w-xs w-full p-6 shadow-xl space-y-4 z-10 animate-scale-in text-[#1d1d1f] text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600 mx-auto">
              <i className="bi bi-trash3 text-xl"></i>
            </div>
            <div>
              <h3 className="font-bold text-sm uppercase tracking-wide">ยืนยันการลบผู้ใช้งาน?</h3>
              <p className="text-[#555557] text-xs mt-1.5 leading-relaxed">
                คุณต้องการลบผู้ใช้ <strong className="text-black font-bold">"{confirmDeleteUser.name || confirmDeleteUser.username}"</strong> หรือไม่? 
              </p>
            </div>
            <div className="flex gap-2.5 pt-2 text-xs font-semibold">
              <button type="button"
                onClick={() => setConfirmDeleteUser(null)}
                className="flex-1 py-2.5 border border-[#d2d2d7] text-[#1d1d1f] rounded-full hover:bg-[#f5f5f7] transition-colors cursor-pointer"
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
            if (alertPopup.action) alertPopup.action();
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
                  if (alertPopup.action) alertPopup.action();
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

    </div>
  );
}
