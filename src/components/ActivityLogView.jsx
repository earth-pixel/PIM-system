import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Trash2, Download, Filter, Clock, ArrowRight, UserCheck, Check, AlertCircle, X, Info } from 'lucide-react';

export default function ActivityLogView({ activityLog, onClearLogs, currentUser }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('All');
  const [selectedActionType, setSelectedActionType] = useState('All');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [alertPopup, setAlertPopup] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    if (showClearConfirm || alertPopup || selectedLog) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showClearConfirm, alertPopup, selectedLog]);

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <span className="px-2.5 py-0.5 text-[10px] font-bold bg-[#6B46C1] text-white rounded-md">Admin</span>;
      case 'manager':
        return <span className="px-2.5 py-0.5 text-[10px] font-bold bg-[#1A365D] text-white rounded-md">Manager</span>;
      default:
        return <span className="px-2.5 py-0.5 text-[10px] font-bold bg-[#2F855A] text-white rounded-md">User</span>;
    }
  };

  const getActionEmoji = (action) => {
    if (action.includes('เพิ่ม')) return '📦';
    if (action.includes('แก้ไข') || action.includes('เปลี่ยน')) return '✏️';
    if (action.includes('ลบ')) return '🗑️';
    if (action.includes('ล้าง')) return '⚠️';
    if (action.includes('สิทธิ์')) return '🔑';
    return '🔧';
  };

  const filteredLogs = activityLog.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          log.userName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === 'All' || log.userRole === selectedRole;
    
    let matchesAction = true;
    if (selectedActionType !== 'All') {
      if (selectedActionType === 'add') matchesAction = log.action.includes('เพิ่ม');
      else if (selectedActionType === 'edit') matchesAction = log.action.includes('แก้ไข') || log.action.includes('เปลี่ยน');
      else if (selectedActionType === 'delete') matchesAction = log.action.includes('ลบ');
      else if (selectedActionType === 'clear') matchesAction = log.action.includes('ล้าง');
    }

    return matchesSearch && matchesRole && matchesAction;
  });

  const handleExportMock = () => {
    // Generate mock CSV download
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Timestamp,User,Role,Action"].join(",") + "\n"
      + filteredLogs.map(e => `"${e.timestamp}","${e.userName}","${e.userRole}","${e.action}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pim_activity_log_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in text-[#1d1d1f]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f]">ประวัติการดำเนินงาน</h1>
          <p className="text-sm text-[#555557] mt-1">บันทึกประวัติการกระทำและเปลี่ยนแปลงข้อมูลต่างๆ ของพนักงานในหน่วยงาน PIM</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportMock}
            className="px-4 py-2.5 border border-[#d2d2d7] text-[#1d1d1f] hover:bg-[#f5f5f7] text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer bg-white"
          >
            <Download className="w-4 h-4 text-zinc-550" />
            ส่งออกไฟล์ CSV
          </button>
          {currentUser.role === 'admin' && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-650 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
              ล้างประวัติทั้งหมด
            </button>
          )}
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-white p-5 rounded-2xl border border-[#d2d2d7]/50 shadow-xs flex flex-col md:flex-row md:items-center gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4.5 h-4.5 text-[#555557] absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="ค้นหาชื่อผู้ดำเนินการ รายละเอียดกิจกรรม..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-sm focus:outline-hidden focus:border-[#0071e3] focus:bg-white transition-all placeholder-[#555557]"
          />
        </div>

        {/* User Role Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#555557] uppercase tracking-wide whitespace-nowrap">บทบาท:</span>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3.5 py-2.5 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-sm focus:outline-hidden focus:border-black focus:bg-white transition-all"
          >
            <option value="All">ทั้งหมด</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="user">User</option>
          </select>
        </div>

        {/* Action Type Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#555557] uppercase tracking-wide whitespace-nowrap">การกระทำ:</span>
          <select
            value={selectedActionType}
            onChange={(e) => setSelectedActionType(e.target.value)}
            className="px-3.5 py-2.5 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-sm focus:outline-hidden focus:border-black focus:bg-white transition-all"
          >
            <option value="All">การกระทำทั้งหมด</option>
            <option value="add">เพิ่มข้อมูลใหม่</option>
            <option value="edit">แก้ไขข้อมูล</option>
            <option value="delete">ลบข้อมูล</option>
          </select>
        </div>
      </div>

      {/* Main List */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/50 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e8e8ed]">
          <h4 className="text-sm font-bold text-[#1d1d1f] tracking-wide uppercase flex items-center gap-2">
            <Clock className="w-4.5 h-4.5 text-[#555557]" />
            กิจกรรมบันทึกล่าสุดในระบบ ({filteredLogs.length} รายการ)
          </h4>
        </div>

        <div className="divide-y divide-[#e8e8ed] max-h-[60vh] overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-zinc-400">
              ไม่มีข้อมูลประวัติกิจกรรมตามตัวกรองที่เลือก
            </div>
          ) : (
            filteredLogs.map((log) => {
              const dateObj = new Date(log.timestamp);
              const formattedDate = dateObj.toLocaleDateString('th-TH', {
                day: 'numeric', month: 'short', year: '2-digit'
              });
              const formattedTime = dateObj.toLocaleTimeString('th-TH', {
                hour: '2-digit', minute: '2-digit'
              });

              return (
                <div key={log.id} className="p-4 hover:bg-[#f5f5f7]/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="text-xl shrink-0 mt-0.5" role="img" aria-label="action icon">
                      {getActionEmoji(log.action)}
                    </span>
                    <div className="space-y-1 min-w-0">
                      <p className="font-semibold text-zinc-800 break-words leading-relaxed text-sm">
                        {log.action}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[#1d1d1f]">{log.userName}</span>
                        {getRoleBadge(log.userRole)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <div className="flex items-center gap-2 text-[#555557] font-mono text-[11px] bg-[#f5f5f7] px-2.5 py-1 rounded-lg border border-[#d2d2d7]/35">
                      <span>{formattedDate}</span>
                      <span className="text-zinc-300">|</span>
                      <span>{formattedTime}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedLog(log)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      title="ดูรายละเอียดการดำเนินงาน"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Clear Logs Confirmation Modal */}
      {showClearConfirm && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs animate-fade-in">
          <div onClick={() => setShowClearConfirm(false)} className="absolute inset-0" />
          <div className="relative bg-white rounded-3xl border border-[#d2d2d7]/50 max-w-xs w-full p-6 shadow-xl space-y-4.5 z-10 animate-scale-in text-[#1d1d1f] text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-650 mx-auto">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h1 className="font-bold text-sm uppercase tracking-wide">ล้างประวัติการทำงานทั้งหมด?</h1>
            </div>
            <div className="flex gap-4 pt-4 text-xs font-semibold">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2.5 border border-[#d2d2d7] text-[#1d1d1f] rounded-full hover:bg-[#f5f5f7] transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  onClearLogs();
                  setShowClearConfirm(false);
                  setAlertPopup({
                    type: 'success',
                    title: 'ล้างประวัติสำเร็จ!',
                    message: 'ล้างประวัติการดำเนินงานทั้งหมดในระบบเรียบร้อยแล้ว!'
                  });
                }}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors cursor-pointer"
              >
                ล้างประวัติ
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Success / Error Alert Popup Modal */}
      {alertPopup && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs animate-fade-in no-print">
          <div onClick={() => setAlertPopup(null)} className="absolute inset-0" />
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
              <button
                onClick={() => setAlertPopup(null)}
                className={`w-full py-2.5 rounded-full text-white transition-colors cursor-pointer shadow-xs ${
                  alertPopup.type === 'success'
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

      {/* Detail Pop-up Modal */}
      {selectedLog && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs animate-fade-in no-print">
          <div onClick={() => setSelectedLog(null)} className="absolute inset-0" />
          <div className="relative bg-white rounded-3xl border border-[#d2d2d7]/50 max-w-sm w-full p-6 shadow-2xl z-10 animate-scale-in text-[#1d1d1f]">
            <div className="flex items-center justify-between border-b border-[#e8e8ed] pb-3">
              <h3 className="font-bold text-sm uppercase tracking-wide flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-zinc-550" />
                รายละเอียดการดำเนินงาน
              </h3>
              <button 
                onClick={() => setSelectedLog(null)}
                className="p-1 text-zinc-400 hover:text-black rounded-lg hover:bg-[#f5f5f7] transition-colors cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
            
            <div className="space-y-4 text-xs text-[#1d1d1f] pt-1">
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0 mt-0.5" role="img" aria-label="action icon">
                  {getActionEmoji(selectedLog.action)}
                </span>
                <div className="space-y-1.5 flex-1 min-w-0">
                  <span className="text-[10px] text-[#555557] font-bold uppercase block tracking-wider">ประวัติการดำเนินการ</span>
                  <p className="font-bold text-zinc-800 break-words leading-relaxed text-sm">
                    {selectedLog.action}
                  </p>
                </div>
              </div>

              <div className="bg-[#f5f5f7] p-3.5 rounded-2xl border border-[#d2d2d7]/35 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-600 font-semibold">ผู้ดำเนินการ:</span>
                  <span className="font-bold text-black">{selectedLog.userName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-600 font-semibold">สิทธิ์เข้าถึง:</span>
                  <span>{getRoleBadge(selectedLog.userRole)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-600 font-semibold">วันเวลาดำเนินงาน:</span>
                  <span className="font-mono text-zinc-700">
                    {new Date(selectedLog.timestamp).toLocaleString('th-TH', {
                      year: 'numeric', month: 'long', day: 'numeric',
                      hour: '2-digit', minute: '2-digit', second: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="w-full py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold rounded-full transition-colors cursor-pointer shadow-xs"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
