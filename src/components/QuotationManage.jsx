import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, Search, Edit2, Trash2, FileText, Printer,
  AlertTriangle, ChevronRight, TrendingUp, Clock, CheckCircle, XCircle
} from 'lucide-react';
import QuotationForm from './QuotationForm';
import QuotationPrint from './QuotationPrint';

const STATUS_CONFIG = {
  draft:    { label: 'ร่าง',          bg: 'bg-gray-100',     text: 'text-gray-600',    border: 'border-gray-200' },
  sent:     { label: 'ส่งแล้ว',       bg: 'bg-blue-50',      text: 'text-blue-600',    border: 'border-blue-200' },
  approved: { label: 'อนุมัติแล้ว',   bg: 'bg-emerald-50',   text: 'text-emerald-600', border: 'border-emerald-200' },
  rejected: { label: 'ไม่อนุมัติ',    bg: 'bg-red-50',       text: 'text-red-500',     border: 'border-red-200' },
};

const STATUS_ICONS = {
  draft:    <Clock className="w-3 h-3" />,
  sent:     <ChevronRight className="w-3 h-3" />,
  approved: <CheckCircle className="w-3 h-3" />,
  rejected: <XCircle className="w-3 h-3" />,
};

const fmt = (n) => Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 });

export default function QuotationManage({
  quotations = [],
  products = [],
  companyInfo = {},
  currentUser,
  onSaveQuotation,
  onDeleteQuotation,
}) {
  const [view, setView]       = useState('list'); // 'list' | 'form' | 'print'
  const [editQt, setEditQt]   = useState(null);
  const [printQt, setPrintQt] = useState(null);
  const [printType, setPrintType] = useState('quotation');

  const [searchQuery, setSearchQuery]   = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [selectedQtId, setSelectedQtId] = useState(null);

  // ── Filters ──────────────────────────────────────────────
  const filtered = quotations.filter(q => {
    const matchSearch = !searchQuery ||
      q.quotationNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'All' || q.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // ── Stats ────────────────────────────────────────────────
  const stats = {
    total:    quotations.length,
    draft:    quotations.filter(q => q.status === 'draft').length,
    sent:     quotations.filter(q => q.status === 'sent').length,
    approved: quotations.filter(q => q.status === 'approved').length,
    totalValue: quotations.filter(q => q.status === 'approved').reduce((s, q) => s + (q.totalAmount || 0), 0),
  };

  // ── Handlers ─────────────────────────────────────────────
  const handleSave = (data) => {
    onSaveQuotation(data);
    setView('list');
    setEditQt(null);
  };

  const handleDelete = (q) => {
    onDeleteQuotation(q.id);
    setDeleteTarget(null);
  };

  const handlePrint = (q, type = 'quotation') => {
    setPrintQt(q);
    setPrintType(type);
    setView('print');
  };

  // ── Views ─────────────────────────────────────────────────
  if (view === 'form') {
    return (
      <QuotationForm
        quotation={editQt}
        products={products}
        existingQuotations={quotations}
        currentUser={currentUser}
        onSave={handleSave}
        onCancel={() => { setView('list'); setEditQt(null); }}
      />
    );
  }

  if (view === 'print' && printQt) {
    return (
      <QuotationPrint
        quotation={printQt}
        companyInfo={companyInfo}
        printType={printType}
        onClose={() => { setView('list'); setPrintQt(null); }}
      />
    );
  }

  // ── List View ─────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Delete Confirm Modal */}
      {deleteTarget && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div onClick={() => setDeleteTarget(null)} className="absolute inset-0 bg-black/15 backdrop-blur-xs" />
          <div className="relative bg-white rounded-3xl border border-[#d2d2d7]/50 max-w-sm w-full p-6 shadow-lg space-y-4 z-10 animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h2 className="font-bold text-sm uppercase tracking-wide text-[#1d1d1f]">ลบใบเสนอราคา?</h2>
              <p className="text-xs text-[#555557] mt-1">{deleteTarget.quotationNumber} — {deleteTarget.customer?.name}</p>
            </div>
            <div className="flex gap-2.5 text-xs font-semibold">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 border border-[#d2d2d7] rounded-full hover:bg-[#f5f5f7] cursor-pointer transition-colors">ยกเลิก</button>
              <button onClick={() => handleDelete(deleteTarget)} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full cursor-pointer transition-colors">ลบเอกสาร</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f]">ใบเสนอราคา</h1>
          <p className="text-sm text-[#555557] mt-0.5">จัดการเอกสารใบเสนอราคาทั้งหมด</p>
        </div>
        <div className="flex flex-wrap gap-2.5 self-start sm:self-auto">
          {selectedQtId && (() => {
            const selectedQt = quotations.find(q => q.id === selectedQtId);
            const canPrint = selectedQt && selectedQt.status !== 'draft' && selectedQt.status !== 'rejected';
            return (
              <button
                type="button"
                onClick={() => {
                  if (selectedQt) {
                    if (!canPrint) {
                      alert('ไม่สามารถพิมพ์เอกสารใบเสนอราคาในสถานะ "ร่าง" หรือ "ไม่อนุมัติ" ได้');
                      return;
                    }
                    handlePrint(selectedQt, 'quotation');
                  }
                }}
                className={`px-4 py-2.5 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 ${
                  canPrint
                    ? 'bg-orange-500 hover:bg-orange-600 cursor-pointer'
                    : 'bg-zinc-300 text-zinc-500 cursor-not-allowed opacity-60'
                }`}
                title={!canPrint ? 'ห้ามพิมพ์เอกสารในสถานะ ร่าง หรือ ไม่อนุมัติ' : 'พิมพ์ใบเสนอราคา'}
              >
                <Printer className="w-4 h-4" /> พิมพ์
              </button>
            );
          })()}

          <button
            onClick={() => { setEditQt(null); setView('form'); }}
            className="px-4 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            สร้างใบเสนอราคา
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'ทั้งหมด',      value: stats.total,    icon: <FileText className="w-5 h-5" />, color: 'text-[#0071e3]', bg: 'bg-blue-50' },
          { label: 'ร่าง',          value: stats.draft,    icon: <Clock className="w-5 h-5" />,     color: 'text-gray-600',   bg: 'bg-gray-50' },
          { label: 'อนุมัติแล้ว',  value: stats.approved, icon: <CheckCircle className="w-5 h-5" />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'มูลค่ารวม (อนุมัติ)', value: `฿${fmt(stats.totalValue)}`, icon: <TrendingUp className="w-5 h-5" />, color: 'text-orange-600', bg: 'bg-orange-50', isValue: true },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-[#d2d2d7]/50 shadow-xs p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center ${s.color} flex-shrink-0`}>
              {s.icon}
            </div>
            <div>
              <p className={`${s.isValue ? 'text-base' : 'text-2xl'} font-extrabold text-[#1d1d1f] leading-tight`}>{s.value}</p>
              <p className="text-xs text-[#555557] font-medium mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white p-5 rounded-2xl border border-[#d2d2d7]/50 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#555557] absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ค้นหาเลขที่เอกสาร หรือชื่อลูกค้า..."
              className="w-full pl-9 pr-4 py-2.5 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-sm focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all placeholder-[#555557]"
            />
          </div>
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-sm text-zinc-700 focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all cursor-pointer font-semibold"
            >
              <option value="All">สถานะทั้งหมด</option>
              <option value="draft">ร่าง (Draft)</option>
              <option value="sent">ส่งแล้ว (Sent)</option>
              <option value="approved">อนุมัติแล้ว (Approved)</option>
              <option value="rejected">ไม่อนุมัติ (Rejected)</option>
            </select>
          </div>
        </div>
        <div className="text-xs text-[#555557] font-semibold uppercase tracking-wider border-t border-[#f5f5f7] pt-3">
          พบ <strong className="text-black">{filtered.length}</strong> รายการ
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/50 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e8e8ed]">
          <h4 className="text-sm font-bold text-[#1d1d1f] uppercase tracking-wide">รายการใบเสนอราคา</h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-[#f5f5f7] text-[#555557] font-bold border-b border-[#d2d2d7]/50 uppercase tracking-wider text-xs">
                <th className="p-3 w-12 text-center">เลือก</th>
                <th className="p-3">เลขที่เอกสาร</th>
                <th className="p-3">ลูกค้า</th>
                <th className="p-3 text-center">วันที่ออก</th>
                <th className="p-3 text-center">ใช้ได้ถึง</th>
                <th className="p-3 text-right">มูลค่ารวม</th>
                <th className="p-3 text-center">สถานะ</th>
                <th className="p-3 text-center w-32">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f5f7]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-16 text-center">
                    <FileText className="w-12 h-12 text-[#555557] mx-auto mb-3" />
                    <p className="text-sm font-semibold text-[#1d1d1f]">ไม่พบใบเสนอราคา</p>
                    <p className="text-xs text-[#555557] mt-1">
                      {quotations.length === 0 ? 'กดปุ่ม "สร้างใบเสนอราคา" เพื่อเริ่มต้น' : 'ลองปรับตัวกรองใหม่อีกครั้ง'}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map(q => {
                  const cfg = STATUS_CONFIG[q.status] ?? STATUS_CONFIG.draft;
                  const isExpired = q.validUntilDate && new Date(q.validUntilDate) < new Date() && q.status !== 'approved';
                  const isSelected = selectedQtId === q.id;
                  return (
                    <tr key={q.id} className={`hover:bg-[#fafafa] transition-colors text-[#1d1d1f] ${isSelected ? 'bg-blue-50/60' : ''}`}>
                      <td className="p-3 text-center">
                        <input
                          type="radio"
                          name="selectedQuotation"
                          checked={isSelected}
                          onChange={() => setSelectedQtId(q.id)}
                          className="w-4 h-4 rounded accent-[#0071e3] cursor-pointer"
                        />
                      </td>
                      <td className="p-3">
                        <span className="font-mono text-xs font-bold text-[#0071e3]">{q.quotationNumber}</span>
                      </td>
                      <td className="p-3">
                        <p className="font-semibold">{q.customer?.name || '-'}</p>
                        {q.customer?.contactPerson && <p className="text-xs text-[#555557]">{q.customer.contactPerson}</p>}
                      </td>
                      <td className="p-3 text-center text-xs text-[#555557] whitespace-nowrap">{q.issuedDate || '-'}</td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <span className={`text-xs ${isExpired ? 'text-red-500 font-bold' : 'text-[#555557]'}`}>
                          {q.validUntilDate || '-'}
                          {isExpired && ' (หมดอายุ)'}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold whitespace-nowrap">
                        {fmt(q.totalAmount)} ฿
                        <div className="text-[10px] text-[#555557] font-normal">{q.items?.length || 0} รายการ</div>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                          {STATUS_ICONS[q.status]}
                          {cfg.label}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => { setEditQt(q); setView('form'); }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="แก้ไขเอกสาร"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {currentUser?.role === 'admin' && (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(q)}
                              className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="ลบเอกสาร"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
