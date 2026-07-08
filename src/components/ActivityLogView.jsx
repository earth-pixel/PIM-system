import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Trash2, Printer, Clock, ArrowRight, Check, AlertCircle, X, Info } from 'lucide-react';
import MobileDownloadModal from './MobileDownloadModal';
import { checkIsInAppBrowser } from '../utils/browserUtils';

export default function ActivityLogView({ activityLog, onClearLogs, currentUser }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('All');
  const [selectedActionType, setSelectedActionType] = useState('All');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [alertPopup, setAlertPopup] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [isDownloadGuideOpen, setIsDownloadGuideOpen] = useState(false);
  const [selectedLogIds, setSelectedLogIds] = useState(new Set());
  const [isPrintingSelected, setIsPrintingSelected] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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
      else if (selectedActionType === 'print') matchesAction = log.action.includes('พิมพ์') || log.action.includes('ดาวน์โหลด') || log.action.includes('นำออก');
    }

    let matchesDate = true;
    if (startDate || endDate) {
      const logDate = new Date(log.timestamp);
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (logDate < start) matchesDate = false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (logDate > end) matchesDate = false;
      }
    }

    return matchesSearch && matchesRole && matchesAction && matchesDate;
  });

  const handleToggleSelectLog = (logId) => {
    setSelectedLogIds(prev => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };



  const handlePrintSelected = () => {
    if (checkIsInAppBrowser()) {
      setIsDownloadGuideOpen(true);
      return;
    }
    setIsPrintingSelected(true);
    setTimeout(() => {
      window.print();
      setIsPrintingSelected(false);
    }, 150);
  };

  useEffect(() => {
    if (showClearConfirm || alertPopup || selectedLog || isDownloadGuideOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showClearConfirm, alertPopup, selectedLog, isDownloadGuideOpen]);

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
    if (action.includes('พิมพ์') || action.includes('ดาวน์โหลด') || action.includes('นำออก')) return '🖨️';
    if (action.includes('เพิ่ม')) return '📦';
    if (action.includes('แก้ไข') || action.includes('เปลี่ยน')) return '✏️';
    if (action.includes('ลบ')) return '🗑️';
    if (action.includes('ล้าง')) return '⚠️';
    if (action.includes('สิทธิ์')) return '🔑';
    return '🔧';
  };


  const handlePrint = () => {
    if (checkIsInAppBrowser()) {
      setIsDownloadGuideOpen(true);
      return;
    }
    window.print();
  };


  return (
    <div className={`space-y-6 animate-fade-in text-[#1d1d1f] ${isPrintingSelected ? 'print-selected-logs-active' : ''}`}>
      <style>{`
        @media print {
          .print-selected-logs-active .log-row:not(.is-selected) {
            display: none !important;
          }
        }
      `}</style>
      
      {/* Printable Sheet Header */}
      <div className="hidden print-only text-center border-b pb-4 mb-4 space-y-1">
        <h2 className="text-lg font-bold text-black uppercase tracking-wider">
          {isPrintingSelected 
            ? 'รายงานประวัติการดำเนินงานในระบบ (PIM) - เฉพาะรายการที่เลือก'
            : 'รายงานประวัติการดำเนินงานในระบบ (PIM)'}
        </h2>
        <p className="text-xs text-zinc-550">
          ข้อมูล ณ วันที่: {new Date().toLocaleString('th-TH')}
        </p>
      </div>

      {/* Page Header */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f]">ประวัติการดำเนินงาน</h1>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {selectedLogIds.size > 0 && (
            <button
              onClick={handlePrintSelected}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs animate-scale-in"
            >
              <Printer className="w-4 h-4" />
              พิมพ์รายการที่เลือก ({selectedLogIds.size})
            </button>
          )}
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4" />
            พิมพ์ประวัติทั้งหมด (Print)
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
      <div className="no-print bg-white p-5 rounded-2xl border border-[#d2d2d7]/50 shadow-xs flex flex-col md:flex-row md:items-center gap-4 flex-wrap animate-fade-in">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4.5 h-4.5 text-[#555557] absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="ค้นหาชื่อผู้ดำเนินการ รายละเอียดกิจกรรม..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-sm focus:outline-hidden focus:border-[#0071e3] focus:bg-white transition-all placeholder-[#555557]"
          />
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <span className="text-xs font-bold text-[#555557] uppercase tracking-wide whitespace-nowrap">วันที่:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2.5 py-2.5 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-xs sm:text-sm focus:outline-hidden focus:border-black focus:bg-white transition-all cursor-pointer"
          />
          <span className="text-xs text-[#555557] font-semibold">-</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2.5 py-2.5 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-xs sm:text-sm focus:outline-hidden focus:border-black focus:bg-white transition-all cursor-pointer"
          />
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="px-2 py-1 text-red-650 hover:bg-red-50 rounded-lg transition-colors cursor-pointer text-xs font-bold whitespace-nowrap"
              title="ล้างตัวกรองวันที่"
            >
              ล้างวันที่
            </button>
          )}
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
            <option value="print">พิมพ์ / ส่งออก</option>
          </select>
        </div>
      </div>

      {/* Main List */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/50 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e8e8ed] flex items-center justify-between flex-wrap gap-2">
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
              const isSelected = selectedLogIds.has(log.id);

              return (
                <div key={log.id} className={`p-4 hover:bg-[#f5f5f7]/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs log-row ${isSelected ? 'is-selected bg-blue-50/15' : ''}`}>
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelectLog(log.id)}
                      className="w-4 h-4 rounded-md border-[#d2d2d7] text-[#0071e3] focus:ring-[#0071e3] cursor-pointer mt-1 shrink-0 no-print"
                    />
                    <span className="text-xl shrink-0 mt-0.5" role="img" aria-label="action icon">
                      {getActionEmoji(log.action)}
                    </span>
                    <div className="space-y-1 min-w-0 flex-1">
                      <p className="font-semibold text-zinc-800 break-words leading-relaxed text-sm">
                        {log.action}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[#1d1d1f]">{log.userName}</span>
                        {getRoleBadge(log.userRole)}
                      </div>

                      {/* Print-only Inline Details */}
                      {log.details && log.details.changes && log.details.changes.length > 0 && (
                        <div className="hidden print-only mt-2 pl-2.5 border-l-2 border-zinc-350 space-y-1.5 text-[10px]">
                          <div className="font-bold text-zinc-500 uppercase tracking-wider text-[8px] mb-0.5">
                            รายละเอียดการเปลี่ยนแปลง:
                          </div>
                          <div className="space-y-1">
                            {log.details.changes.map((ch, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 py-0.5 px-2 bg-zinc-50 rounded border border-zinc-200/50 max-w-full">
                                <span className="font-bold text-zinc-700 shrink-0">{ch.field}:</span>
                                <span className="text-red-650 line-through px-1 rounded bg-red-50/40 text-[9.5px] truncate max-w-[200px]">{ch.before}</span>
                                <ArrowRight className="w-2.5 h-2.5 text-zinc-400 shrink-0" />
                                <span className="text-emerald-700 px-1 rounded bg-emerald-50/40 font-bold text-[9.5px] truncate max-w-[200px]">{ch.after}</span>
                              </div>
                            ))}
                          </div>
                          {(log.details.remark || log.details.editRemark) && (
                            <div className="mt-1.5 p-1 px-2 bg-amber-50/30 border border-amber-250/20 rounded text-amber-900 text-[9px] font-medium leading-normal break-words max-w-full">
                              <span className="font-bold text-amber-800">หมายเหตุ:</span> {log.details.remark || log.details.editRemark}
                            </div>
                          )}
                        </div>
                      )}
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
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer no-print"
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
            
            <div className="max-h-[60vh] overflow-y-auto space-y-4 text-xs text-[#1d1d1f] pt-1 pb-2 pr-1 scrollbar-thin">
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

              {/* Edit Details before/after Section */}
              {selectedLog.details && selectedLog.details.changes && selectedLog.details.changes.length > 0 && (
                <div className="space-y-2.5 pt-1">
                  <span className="text-[10px] text-[#555557] font-bold uppercase block tracking-wider">รายละเอียดการเปลี่ยนแปลง</span>
                  <div className="space-y-2">
                    {selectedLog.details.changes.map((ch, idx) => (
                      <div key={idx} className="p-3 bg-white rounded-2xl border border-[#d2d2d7]/50 space-y-1.5 shadow-2xs">
                        <div className="font-bold text-zinc-800 text-xs">{ch.field}</div>
                        <div className="flex items-center gap-2 flex-wrap text-[10px] text-[#555557] font-semibold">
                          <span>ก่อน:</span>
                          <span className="px-2 py-0.5 bg-red-50 text-red-650 rounded-lg border border-red-100/50 line-through break-all text-[11px] font-medium">
                            {ch.before}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span>หลัง:</span>
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100/50 break-all text-[11px] font-bold">
                            {ch.after}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Remark/Comment Section */}
              {(selectedLog.details?.remark || selectedLog.details?.editRemark) && (
                <div className="p-3 bg-amber-50/70 border border-amber-200/30 rounded-2xl text-amber-900 text-xs space-y-1 mt-1">
                  <span className="font-bold block text-[10px] text-amber-800 uppercase tracking-wider">หมายเหตุ / เหตุผลการแก้ไข:</span>
                  <p className="leading-relaxed font-medium">
                    {selectedLog.details.remark || selectedLog.details.editRemark}
                  </p>
                </div>
              )}
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

      {/* Guide Modal for mobile browsers */}
      <MobileDownloadModal 
        isOpen={isDownloadGuideOpen} 
        onClose={() => setIsDownloadGuideOpen(false)} 
      />

    </div>
  );
}
