import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, Trash2, Printer, Clock, ArrowRight, Check, AlertCircle, X, Info } from 'lucide-react';
import MobileDownloadModal from './MobileDownloadModal';
import { checkIsInAppBrowser } from '../utils/browserUtils';
import DropdownFilter from './DropdownFilter';

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
  const [hoveredRow, setHoveredRow] = useState(null);

  const filteredLogs = useMemo(() => {
    return activityLog.filter(log => {
      const matchesSearch = log.action.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            log.userName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = selectedRole === 'All' || log.userRole === selectedRole;
      
      let matchesAction = true;
      if (selectedActionType !== 'All') {
        if (selectedActionType === 'add') matchesAction = log.action.includes('เพิ่ม');
        else if (selectedActionType === 'edit') matchesAction = log.action.includes('แก้ไข') || log.action.includes('เปลี่ยน');
        else if (selectedActionType === 'delete') matchesAction = log.action.includes('ลบ');
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
  }, [activityLog, searchQuery, selectedRole, selectedActionType, startDate, endDate]);

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

  const getDisplayAction = (log) => {
    if (!log) return '';
    const act = log.action || '';
    if (act === 'บันทึกประวัติการดำเนินงาน') {
      if (log.details?.actionType === 'delete' || log.details?.changes?.some(c => c.after === 'ลบแล้ว' || c.after?.includes('ลบ') || c.after?.includes('ล้าง'))) {
        return 'ล้างประวัติการดำเนินงานทั้งหมดในระบบ';
      }
    }
    // If action is "บันทึกสินค้า" but all changes are deletions
    if (act === 'บันทึกสินค้า' && log.details?.changes?.length > 0 && log.details?.changes?.every(c => c.after === 'ลบแล้ว' || c.after?.includes('ลบ'))) {
      if (log.details.changes.length === 1) {
        return `ลบสินค้า: ${String(log.details.changes[0].field).replace('ลบข้อมูล: ', '')}`;
      }
      return `ลบสินค้า (${log.details.changes.length} รายการ)`;
    }
    if (act === 'บันทึกผู้ใช้' && log.details?.changes?.length > 0 && log.details?.changes?.every(c => c.after === 'ลบแล้ว' || c.after?.includes('ลบ'))) {
      return 'ลบบัญชีผู้ใช้';
    }
    if (act === 'บันทึกเอกสาร' && log.details?.changes?.length > 0 && log.details?.changes?.every(c => c.after === 'ลบแล้ว' || c.after?.includes('ลบ'))) {
      return 'ลบเอกสาร';
    }
    return act;
  };

  const getActionEmoji = (action) => {
    if (!action) return '📋';
    if (action.includes('พิมพ์') || action.includes('ดาวน์โหลด') || action.includes('นำออก')) return '🖨️';
    if (action.includes('เพิ่ม') || action.includes('สร้าง')) return '📦';
    if (action.includes('แก้ไข') || action.includes('เปลี่ยน') || action.includes('อัปเดต')) return '✏️';
    if (action.includes('ลบ') || action.includes('ล้าง')) return '🗑️';
    if (action.includes('สิทธิ์') || action.includes('รหัสผ่าน')) return '🔑';
    if (action.includes('อนุมัติ')) return '✅';
    return '📋';
  };

  const formatChangeValue = (val) => {
    if (!val || val === '-') return '-';
    if (val === 'มีข้อมูล') return 'มีข้อมูลอยู่ในระบบ';
    if (val === 'ลบแล้ว') return 'ลบออกจากระบบแล้ว';
    return val;
  };

  const formatChangeField = (rawField, log) => {
    if (!rawField) return 'ข้อมูลรายการ';
    const str = String(rawField);

    if (str === 'บันทึกประวัติการดำเนินงาน' || str === 'บันทึกประวัติการทำงานเดิม' || str === 'ประวัติการดำเนินงาน') {
      return 'ล้างประวัติการดำเนินงานในระบบ';
    }

    // Check if string is a pure UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isPureUUID = uuidRegex.test(str.trim());

    if (isPureUUID) {
      if (log?.details?.type === 'activityLog' || log?.action?.includes('ประวัติ')) {
        return 'ล้างประวัติการดำเนินงานในระบบ';
      }
      if (log?.details?.type === 'quotations' || log?.action?.includes('ใบเสนอราคา') || log?.action?.includes('เอกสาร')) {
        return 'เอกสารใบเสนอราคาเดิม (ถูกลบ)';
      }
      if (log?.details?.type === 'products' || log?.action?.includes('สินค้า')) {
        return 'ข้อมูลสินค้าเดิม (ถูกลบ)';
      }
      return 'ข้อมูลรายการเดิมที่ถูกลบ';
    }

    const FIELD_TRANSLATIONS = {
      name: 'ชื่อสินค้า',
      code: 'รหัสสินค้า (SKU)',
      barcode: 'รหัสบาร์โค้ด',
      brand: 'แบรนด์สินค้า',
      category: 'หมวดหมู่สินค้า',
      subCategory: 'หมวดหมู่ย่อย',
      retailPrice: 'ราคาขายปลีก',
      wholesalePrice: 'ราคาขายส่ง',
      capFee: 'ค่าฝา',
      stock: 'จำนวนสต็อก',
      status: 'สถานะ',
      totalAmount: 'ยอดรวมสุทธิ',
      username: 'ชื่อผู้ใช้งาน',
      role: 'สิทธิ์การใช้งาน',
      passwordHash: 'รหัสผ่าน',
      image: 'รูปภาพ',
      description: 'รายละเอียด',
      fdaNumber: 'หมายเลข อย.',
      tisiNumber: 'หมายเลข มอก.'
    };

    if (str.includes(': ')) {
      const [prefix, key] = str.split(': ');
      const translatedKey = FIELD_TRANSLATIONS[key] || key;
      const cleanPrefix = uuidRegex.test(prefix.trim()) ? 'ข้อมูลรายการ' : prefix;
      return `${cleanPrefix}: ${translatedKey}`;
    }

    return FIELD_TRANSLATIONS[str] || str;
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
      <div className="hidden print-only border-b pb-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="h-10 w-auto object-contain" />
            <div className="text-left">
              <h3 className="text-sm font-black text-black">บริษัท พันธ์วาดี จำกัด</h3>
              <p className="text-[10px] text-zinc-500">Product Information Management System</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-base font-bold text-black uppercase tracking-wide">
              {isPrintingSelected 
                ? 'ประวัติการดำเนินงาน (เฉพาะที่เลือก)'
                : 'ประวัติการดำเนินงานในระบบ'}
            </h2>
            <p className="text-[10px] text-zinc-400">ข้อมูล ณ วันที่: {new Date().toLocaleString('th-TH')}</p>
          </div>
        </div>
      </div>

      {/* Page Header */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-5 rounded-full bg-gradient-to-b from-[#0071e3] to-[#00c2ff]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0071e3]">ACTIVITY LOG</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-[#1d1d1f] leading-none">ประวัติการดำเนินงาน</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {selectedLogIds.size > 0 && (
            <button type="button"
              onClick={handlePrintSelected}
              className="group relative overflow-hidden px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-xs font-bold rounded-xl shadow-lg hover:shadow-emerald-500/30 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-1.5 cursor-pointer animate-scale-in"
            >
              <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
              <Printer className="w-3.5 h-3.5" />
              พิมพ์รายการที่เลือก ({selectedLogIds.size})
            </button>
          )}
          <button type="button"
            onClick={handlePrint}
            className="group relative overflow-hidden px-4 py-2.5 bg-gradient-to-r from-[#0071e3] to-[#0096ff] hover:from-[#0080ff] hover:to-[#00a8ff] text-white text-xs font-bold rounded-xl shadow-lg hover:shadow-blue-500/30 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
            <Printer className="w-3.5 h-3.5" />
            พิมพ์ประวัติทั้งหมด (Print)
          </button>
          {currentUser.role === 'admin' && (
            <button type="button"
              onClick={() => setShowClearConfirm(true)}
              className="group relative overflow-hidden px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="absolute inset-0 bg-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              ล้างประวัติทั้งหมด
            </button>
          )}
        </div>
      </div>

      {/* Filters bar */}
      <div className="no-print bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-[#d2d2d7]/50 shadow-xs flex flex-col md:flex-row md:items-center gap-4 flex-wrap animate-fade-in">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-[#0071e3] animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-[#555557]">ตัวกรอง</span>
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            placeholder="ค้นหาชื่อผู้ดำเนินการ รายละเอียดกิจกรรม..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-8 py-2 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-xs focus:outline-hidden focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10 focus:bg-white transition-all placeholder:text-zinc-400 text-zinc-700"
          />
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <span className="text-[10px] font-black text-[#555557] uppercase tracking-wide whitespace-nowrap">วันที่:</span>
          <div className={`flex items-center gap-1.5 bg-[#f5f5f7] border rounded-xl px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-[#0071e3]/10 focus-within:bg-white transition-all ${
            startDate && endDate && startDate > endDate
              ? 'border-red-400 ring-2 ring-red-200'
              : 'border-[#d2d2d7] focus-within:border-[#0071e3]'
          }`}>
            <span className="text-[9px] font-black text-zinc-500 select-none uppercase">เริ่มต้น</span>
            <input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent border-none text-xs focus:outline-none cursor-pointer font-bold p-0 text-[#1d1d1f] w-28 sm:w-auto"
            />
          </div>
          <span className="text-xs text-[#555557] font-semibold">-</span>
          <div className={`flex items-center gap-1.5 bg-[#f5f5f7] border rounded-xl px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-[#0071e3]/10 focus-within:bg-white transition-all ${
            startDate && endDate && startDate > endDate
              ? 'border-red-400 ring-2 ring-red-200'
              : 'border-[#d2d2d7] focus-within:border-[#0071e3]'
          }`}>
            <span className="text-[9px] font-black text-zinc-500 select-none uppercase">สิ้นสุด</span>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent border-none text-xs focus:outline-none cursor-pointer font-bold p-0 text-[#1d1d1f] w-28 sm:w-auto"
            />
          </div>
          {startDate && endDate && startDate > endDate && (
            <span className="text-[10px] font-bold text-red-500 whitespace-nowrap">⚠️ วันที่ไม่ถูกต้อง</span>
          )}
          {(startDate || endDate) && (
            <button type="button"
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="px-2 py-1 text-red-650 hover:bg-red-50 rounded-lg transition-colors cursor-pointer text-[10px] font-bold whitespace-nowrap"
              title="ล้างตัวกรองวันที่"
            >
              ล้างวันที่
            </button>
          )}
        </div>

        {/* User Role Filter */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-[#555557] uppercase tracking-wide whitespace-nowrap">บทบาท:</span>
          <DropdownFilter
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            options={[
              { value: 'All', label: 'ทั้งหมด' },
              { value: 'admin', label: 'Admin' },
              { value: 'manager', label: 'Manager' },
              { value: 'user', label: 'User' }
            ]}
          />
        </div>

        {/* Action Type Filter */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-[#555557] uppercase tracking-wide whitespace-nowrap">การกระทำ:</span>
          <DropdownFilter
            value={selectedActionType}
            onChange={(e) => setSelectedActionType(e.target.value)}
            options={[
              { value: 'All', label: 'การกระทำทั้งหมด' },
              { value: 'add', label: 'เพิ่มข้อมูลใหม่' },
              { value: 'edit', label: 'แก้ไขข้อมูล' },
              { value: 'delete', label: 'ลบข้อมูล' },
              { value: 'print', label: 'พิมพ์ / ส่งออก' }
            ]}
          />
        </div>
      </div>

      {/* Main List */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/50 shadow-xs overflow-hidden">
        <div className="px-4.5 py-3.5 border-b border-[#e8e8ed] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <h4 className="text-xs font-black text-[#1d1d1f] tracking-widest uppercase flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#555557]" />
              กิจกรรมบันทึกล่าสุดในระบบ
            </h4>
            <span className="px-2.5 py-0.5 text-[10px] font-black bg-[#0071e3] text-white rounded-full">
              {filteredLogs.length.toLocaleString()} รายการ
            </span>
          </div>
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
                <div
                  key={log.id}
                  onMouseEnter={() => setHoveredRow(log.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  className={`p-2 sm:p-3.5 transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs log-row ${
                    isSelected ? 'is-selected' : ''
                  } ${
                    hoveredRow === log.id
                      ? 'bg-gradient-to-r from-[#0071e3]/4 via-[#0071e3]/3 to-transparent'
                      : isSelected
                        ? 'bg-blue-50/15'
                        : 'bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelectLog(log.id)}
                      className="w-4 h-4 rounded-md border-[#d2d2d7] text-[#0071e3] focus:ring-[#0071e3] cursor-pointer mt-1 shrink-0 no-print"
                    />
                    <span className="text-xl shrink-0 mt-0.5" role="img" aria-label="action icon">
                      {getActionEmoji(getDisplayAction(log))}
                    </span>
                    <div className="space-y-1 min-w-0 flex-1">
                      <p className="font-semibold text-[#1d1d1f] break-words leading-relaxed text-sm">
                        {getDisplayAction(log)}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-[#1d1d1f]">{log.userName}</span>
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
                                <span className="font-bold text-zinc-700 shrink-0">{formatChangeField(ch.field, log)}:</span>
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
                      className="p-1.5 text-[#0071e3] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer no-print"
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
              <button type="button"
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2.5 border border-[#d2d2d7] text-[#1d1d1f] rounded-full hover:bg-[#f5f5f7] transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button type="button"
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
              <button type="button"
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
              <button type="button" 
                onClick={() => setSelectedLog(null)}
                className="p-1 text-zinc-400 hover:text-black rounded-lg hover:bg-[#f5f5f7] transition-colors cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto space-y-4 text-xs text-[#1d1d1f] pt-1 pb-2 pr-1 scrollbar-thin">
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0 mt-0.5" role="img" aria-label="action icon">
                  {getActionEmoji(getDisplayAction(selectedLog))}
                </span>
                <div className="space-y-1.5 flex-1 min-w-0">
                  <span className="text-[10px] text-[#555557] font-bold uppercase block tracking-wider">ประวัติการดำเนินการ</span>
                  <p className="font-bold text-zinc-800 break-words leading-relaxed text-sm">
                    {getDisplayAction(selectedLog)}
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
                    {selectedLog.details.changes.map((ch, idx) => {
                      const isDeleted = ch.after === 'ลบแล้ว' || ch.after?.includes('ลบ') || ch.after?.includes('ล้าง');
                      const isAdded = ch.before === '-' || ch.after?.includes('เพิ่ม');
                      return (
                        <div key={idx} className={`p-3 rounded-2xl border space-y-1.5 shadow-2xs ${
                          isDeleted ? 'bg-red-50/30 border-red-200/70' : 'bg-white border-[#d2d2d7]/50'
                        }`}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-zinc-800 text-xs truncate">{formatChangeField(ch.field, selectedLog)}</span>
                            {isDeleted && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 shrink-0">
                                ลบข้อมูลแล้ว
                              </span>
                            )}
                            {isAdded && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 shrink-0">
                                เพิ่มใหม่
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap text-[10px] text-[#555557] font-semibold">
                            <span>ก่อน:</span>
                            <span className="px-2 py-0.5 bg-zinc-100 text-zinc-700 rounded-lg border border-zinc-200 line-through break-all text-[11px] font-medium">
                              {formatChangeValue(ch.before)}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span>หลัง:</span>
                            <span className={`px-2 py-0.5 rounded-lg border break-all text-[11px] font-bold ${
                              isDeleted ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-100/50'
                            }`}>
                              {formatChangeValue(ch.after)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
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