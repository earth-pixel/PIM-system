import { useMemo, useState } from 'react';
import { Archive, Download, Eye, FileCheck, FileSpreadsheet, Library, Package, Printer, Search, Shield, X, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { isExpiredQuotation } from '../utils/validation';
import { downloadWorkbook } from '../utils/exportUtils';

const formatMoney = (value) => Number(value || 0).toLocaleString('th-TH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('th-TH');
};

const getCustName = (q) => q?.customerName || q?.customer?.name || q?.customer?.companyName || q?.customerCompany || q?.custName || '';
const getCustTaxId = (q) => q?.customerTaxId || q?.customer?.taxId || q?.custTax || '';
const getCustAddress = (q) => q?.customerAddress || q?.customer?.address || q?.custAddr || '';

// All roles can view all documents in reports
const isOwnDocument = () => true;


const STATUS_CONFIG = {
  draft: {
    label: 'แบบร่าง',
    bg: 'bg-zinc-100',
    text: 'text-zinc-700',
    border: 'border-zinc-300',
    dot: 'bg-zinc-400',
  },
  sent: {
    label: 'รอการอนุมัติ',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500 animate-pulse',
  },
  approved: {
    label: 'อนุมัติแล้ว',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
  },
  rejected: {
    label: 'ไม่อนุมัติ',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
  },
};

export default function QuotationReport({
  quotations = [],
  currentUser,
  addActivityLog,
  activeTab = 'quotations',
  onTabChange,
  hideSwitcher = false,
  isAdmin = false,
  onArchive,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [viewDoc, setViewDoc] = useState(null);

  // Filter only standard quotations (not product proposals) that are approved
  const baseQuotations = useMemo(() => {
    return quotations.filter(q =>
      q.documentType !== 'product_proposal' && q.status === 'approved' && isOwnDocument(q, currentUser)
    );
  }, [quotations, currentUser]);

  const filteredQuotations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return baseQuotations.filter(q => {
      const issuedDate = q.issuedDate || '';
      const matchesDate = (!startDate || issuedDate >= startDate) && (!endDate || issuedDate <= endDate);
      
      const matchesSearch = !query || [
        q.quotationNumber,
        q.id,
        getCustName(q),
        getCustTaxId(q),
        q.customerBranch,
        q.createdBy,
        q.salespersonName,
        ...(q.items || []).flatMap(item => [item.productName, item.productCode, item.barcode]),
      ].some(value => String(value || '').toLowerCase().includes(query));

      return matchesDate && matchesSearch;
    });
  }, [baseQuotations, searchQuery, startDate, endDate]);

  const summary = useMemo(() => {
    return filteredQuotations.reduce((acc, q) => {
      const total = Number(q.totalAmount || 0);
      acc.totalRevenue += total;
      acc.approvedCount += 1;
      if (isExpiredQuotation(q)) {
        acc.expiredCount += 1;
      }
      return acc;
    }, {
      totalRevenue: 0,
      approvedCount: 0,
      expiredCount: 0,
    });
  }, [filteredQuotations]);

  const filterDescription = () => {
    const dates = startDate || endDate
      ? `ช่วงวันที่ ${startDate || 'เริ่มต้น'} ถึง ${endDate || 'ปัจจุบัน'}`
      : 'ทุกช่วงวันที่';
    return `${dates}, สถานะ: อนุมัติแล้ว${searchQuery.trim() ? `, ค้นหา: "${searchQuery.trim()}"` : ''}`;
  };


  const handleExportExcel = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const rows = filteredQuotations.flatMap(q => {
        const items = q.items || [];
        const statusLabel = STATUS_CONFIG[q.status]?.label || q.status || '-';
        if (items.length === 0) {
          return [[
            q.quotationNumber || q.id,
            q.issuedDate || '',
            q.validUntilDate || q.validUntil || '',
            getCustName(q) || '',
            getCustTaxId(q) || '',
            q.salespersonName || q.createdBy || '',
            statusLabel,
            '',
            '',
            0,
            '',
            0,
            0,
            Number(q.subtotal || 0),
            Number(q.vatAmount || 0),
            Number(q.totalAmount || 0),
          ]];
        }
        return items.map((item, idx) => [
          q.quotationNumber || q.id,
          q.issuedDate || '',
          q.validUntilDate || q.validUntil || '',
          getCustName(q) || '',
          getCustTaxId(q) || '',
          q.salespersonName || q.createdBy || '',
          statusLabel,
          item.productCode || '',
          item.productName || '',
          Number(item.quantity || 0),
          item.unit || 'ชิ้น',
          Number(item.unitPrice || 0),
          Number(item.discount || 0),
          idx === 0 ? Number(q.subtotal || 0) : '',
          idx === 0 ? Number(q.vatAmount || 0) : '',
          idx === 0 ? Number(q.totalAmount || 0) : '',
        ]);
      });

      const worksheet = XLSX.utils.aoa_to_sheet([
        [
          'เลขที่ใบเสนอราคา',
          'วันที่ออกเอกสาร',
          'ใช้ได้ถึงวันที่',
          'ชื่อลูกค้า / บริษัท',
          'เลขประจำตัวผู้เสียภาษี',
          'พนักงานขาย / ผู้สร้าง',
          'สถานะ',
          'รหัสสินค้า',
          'ชื่อสินค้า',
          'จำนวน',
          'หน่วย',
          'ราคาต่อหน่วย (บาท)',
          'ส่วนลดต่อหน่วย (บาท)',
          'มูลค่าก่อนภาษี (บาท)',
          'ภาษีมูลค่าเพิ่ม VAT 7% (บาท)',
          'ยอดรวมสุทธิ (บาท)',
        ],
        ...rows,
      ]);

      worksheet['!cols'] = [
        { wch: 22 }, { wch: 15 }, { wch: 15 }, { wch: 30 }, { wch: 20 },
        { wch: 22 }, { wch: 15 }, { wch: 18 }, { wch: 40 }, { wch: 10 },
        { wch: 10 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 22 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'รายงานใบเสนอราคา');
      const filename = `PIM_Quotation_Report_${new Date().toLocaleDateString('sv-SE')}.xlsx`;
      await downloadWorkbook(workbook, filename);
      addActivityLog?.(`ดาวน์โหลดรายงานใบเสนอราคาเป็นไฟล์ Excel (${filteredQuotations.length} เอกสาร, ${filterDescription()})`);
    } catch (error) {
      console.error('Error exporting quotation report:', error);
      alert('ไม่สามารถดาวน์โหลดรายงานใบเสนอราคาได้');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
    addActivityLog?.(`พิมพ์รายงานใบเสนอราคา (${filteredQuotations.length} เอกสาร, ${filterDescription()})`);
  };

  return (
    <div className="space-y-5 animate-page-transition">
      {/* ── REPORT TAB NAVIGATION SWITCHER ───────────────── */}
      {onTabChange && !hideSwitcher && (
        <div className="no-print flex flex-wrap items-center gap-1 p-1 bg-[#e8e8ed] rounded-full border border-[#d2d2d7]/50 w-full sm:w-fit shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
          <button
            type="button"
            onClick={() => onTabChange('products')}
            className={`flex-1 sm:flex-initial px-5 py-2 text-xs font-bold rounded-full transition-all duration-200 cursor-pointer flex items-center justify-center transform active:scale-95 ${
              activeTab === 'products'
                ? 'bg-white text-[#0071e3] shadow-sm border border-[#d2d2d7]/10'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <span>รายงานสินค้า</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('quotations')}
            className={`flex-1 sm:flex-initial px-5 py-2 text-xs font-bold rounded-full transition-all duration-200 cursor-pointer flex items-center justify-center transform active:scale-95 ${
              activeTab === 'quotations'
                ? 'bg-white text-[#0071e3] shadow-sm border border-[#d2d2d7]/10'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <span>รายงานใบเสนอราคา</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('product-proposals')}
            className={`flex-1 sm:flex-initial px-5 py-2 text-xs font-bold rounded-full transition-all duration-200 cursor-pointer flex items-center justify-center transform active:scale-95 ${
              activeTab === 'product-proposals'
                ? 'bg-white text-[#0071e3] shadow-sm border border-[#d2d2d7]/10'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <span>รายงานใบเสนอสินค้า</span>
          </button>
        </div>
      )}

      {/* ── PAGE HEADER ───────────────────────────────────── */}
      <div className="no-print flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-5 rounded-full bg-gradient-to-b from-[#0071e3] to-[#00c2ff]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0071e3]">QUOTATION INTELLIGENCE</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-[#1d1d1f] leading-none">
            รายงานใบเสนอราคา
          </h1>
          <p className="text-xs text-[#86868b] mt-1.5 font-medium">
            ข้อมูล ณ {new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' })}
          </p>
        </div>

        <div className="flex gap-2 items-center w-full sm:w-auto">
          <button
            type="button"
            disabled={isExporting}
            onClick={handleExportExcel}
            className={`group flex-1 sm:flex-initial justify-center relative overflow-hidden px-4 py-2.5 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg ${
              isExporting
                ? 'bg-emerald-700 opacity-80 cursor-wait'
                : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 hover:shadow-emerald-500/30 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0'
            }`}
          >
            <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
            {isExporting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>กำลังเตรียม...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Export Excel</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="group flex-1 sm:flex-initial justify-center relative overflow-hidden px-4 py-2.5 bg-gradient-to-r from-[#0071e3] to-[#0096ff] hover:from-[#0080ff] hover:to-[#00a8ff] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg hover:shadow-blue-500/30 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
          >
            <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
            <Printer className="w-3.5 h-3.5" />
            <span>พิมพ์รายงาน</span>
          </button>
        </div>
      </div>

      {/* ── KPI CARDS ─────────────────────────────────────── */}
      <div className="no-print grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 print-grid-2">
        {/* Total Approved Documents */}
        <div
          className="relative overflow-hidden rounded-2xl border border-[#0071e3]/20 bg-gradient-to-br from-[#0071e3]/8 to-[#00c2ff]/5 p-5 group transition-all duration-300 print-card print-kpi-card"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#0071e3]/15 to-transparent rounded-bl-[3rem]" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#0071e3]/80 mb-1">ใบเสนอราคาที่อนุมัติ</p>
              <h3 className="text-3xl sm:text-4xl font-black text-[#1d1d1f] leading-none tracking-tight tabular-nums">
                {filteredQuotations.length.toLocaleString()}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#0071e3]/15 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileCheck className="w-5 h-5 text-[#0071e3]" />
            </div>
          </div>
        </div>

        {/* Approved Revenue */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50/80 to-teal-50/40 p-5 group transition-all duration-300 print-card print-kpi-card">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-200/40 to-transparent rounded-bl-[3rem]" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600/80 mb-1">มูลค่าที่อนุมัติ</p>
              <h3 className="text-2xl sm:text-3xl font-black text-[#1d1d1f] leading-none tracking-tight tabular-nums">
                ฿{formatMoney(summary.totalRevenue)}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </div>

        {/* Expired Quotations Count */}
        <div className="relative overflow-hidden rounded-2xl border border-red-200/60 bg-gradient-to-br from-red-50/80 to-rose-50/40 p-5 group transition-all duration-300 print-card print-kpi-card">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-red-200/40 to-transparent rounded-bl-[3rem]" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-red-600/80 mb-1">รายการหมดอายุ</p>
              <h3 className="text-2xl sm:text-3xl font-black text-[#1d1d1f] leading-none tracking-tight tabular-nums">
                {summary.expiredCount.toLocaleString()}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center group-hover:scale-110 transition-transform">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* ── FILTER BAR ────────────────────────────────────── */}
      <div className="no-print bg-white p-4 rounded-2xl border border-[#d2d2d7]/50 shadow-xs">
        <div className="flex flex-col md:flex-row md:flex-wrap gap-3 items-stretch md:items-center">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-[#0071e3] animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#555557]">ตัวกรอง</span>
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px] md:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              placeholder="ค้นหาเลขที่, ลูกค้า, ผู้สร้าง, สินค้า..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-8 py-2 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-xs text-zinc-700 focus:outline-hidden focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10 focus:bg-white transition-all placeholder:text-zinc-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Date range */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="flex-1 md:flex-initial px-3 py-2 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-xs text-zinc-700 focus:outline-hidden focus:border-[#0071e3] font-medium"
              title="วันที่เริ่มต้น"
            />
            <span className="text-xs text-[#86868b]">ถึง</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="flex-1 md:flex-initial px-3 py-2 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-xs text-zinc-700 focus:outline-hidden focus:border-[#0071e3] font-medium"
              title="วันที่สิ้นสุด"
            />
          </div>

          {(searchQuery || startDate || endDate) && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStartDate('');
                setEndDate('');
              }}
              className="text-xs text-[#0071e3] hover:underline font-bold px-2 py-1 cursor-pointer"
            >
              ล้างตัวกรอง
            </button>
          )}
        </div>
      </div>

      {/* ── Printable Sheet Header ─────────────────────────── */}
      <div className="hidden print-only border-b-2 border-black pb-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="h-14 w-auto object-contain" />
            <div className="text-left">
              <h3 className="text-base font-black text-black">บริษัท พันธ์วาดี จำกัด</h3>
              <p className="text-[10px] text-zinc-500">Product Information Management System</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-black text-black tracking-wide">รายงานใบเสนอราคา</h2>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-200">
          <div className="text-[10px] text-zinc-400">
            <span>{filterDescription()}</span>
            <span className="mx-1">·</span>
            <span>พิมพ์: {new Date().toLocaleString('th-TH')}</span>
          </div>
        </div>
      </div>

      {/* ── REPORT TABLE ──────────────────────────────────── */}
      <div className="rounded-2xl border border-[#d2d2d7]/50 bg-white overflow-hidden shadow-xs print-card quotation-report-table">
        <div className="px-4.5 py-3.5 border-b border-[#e8e8ed] no-print flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h4 className="text-xs font-black text-[#1d1d1f] tracking-widest uppercase">รายการใบเสนอราคา</h4>
            <span className="px-2.5 py-0.5 text-[10px] font-black bg-[#0071e3] text-white rounded-full">
              {filteredQuotations.length.toLocaleString()} เอกสาร
            </span>
          </div>
          {filteredQuotations.length > 0 && (
            <p className="text-[10px] text-emerald-600 font-bold hidden sm:block">
              ✓ อนุมัติแล้ว {summary.approvedCount} เอกสาร · มูลค่ารวม ฿{formatMoney(summary.totalRevenue)}
            </p>
          )}
        </div>

        {filteredQuotations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f5f5f7]/80 text-[#86868b] font-black border-b border-[#e8e8ed] text-[10px] uppercase tracking-widest">
                  <th className="p-3.5 w-12 text-center">#</th>
                  <th className="p-3.5 min-w-[160px]">เลขที่เอกสาร</th>
                  <th className="p-3.5 min-w-[110px]">วันที่</th>
                  <th className="p-3.5 min-w-[180px]">ลูกค้า</th>
                  <th className="p-3.5 min-w-[140px]">ผู้สร้าง / พนักงานขาย</th>
                  <th className="p-3.5 text-center min-w-[110px] print-hide-col">สถานะ</th>
                  <th className="p-3.5 min-w-[220px]">รายการสินค้า</th>
                  <th className="p-3.5 text-right min-w-[110px]">ก่อนภาษี</th>
                  <th className="p-3.5 text-right min-w-[130px]">ยอดรวมสุทธิ</th>
                  <th className="p-3.5 text-center min-w-[100px] print-hide-col">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f5] text-xs">
                {filteredQuotations.map((q, index) => {
                  const items = q.items || [];
                  const productNames = items.map(item => item.productName).filter(Boolean).join(', ');
                  const st = STATUS_CONFIG[q.status] || STATUS_CONFIG.draft;

                  return (
                    <tr
                      key={q.id || index}
                      onMouseEnter={() => setHoveredRow(q.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                      className={`transition-all duration-150 ${
                        hoveredRow === q.id
                          ? 'bg-gradient-to-r from-[#0071e3]/4 via-[#0071e3]/3 to-transparent'
                          : index % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]/50'
                      }`}
                    >
                      <td className="p-3.5 text-center font-mono text-[#86868b]">{index + 1}</td>
                      <td className="p-3.5">
                        <span className="font-mono font-bold text-[#0071e3]">
                          {q.quotationNumber || q.id}
                        </span>
                      </td>
                      <td className="p-3.5 text-[#555557] whitespace-nowrap">{formatDate(q.issuedDate)}</td>
                      <td className="p-3.5 font-semibold text-[#1d1d1f]">
                        <div>{getCustName(q) || '-'}</div>
                        {getCustTaxId(q) && (
                          <div className="text-[10px] text-zinc-400 font-mono">Tax: {getCustTaxId(q)}</div>
                        )}
                      </td>
                      <td className="p-3.5 text-[#555557] font-medium">{q.salespersonName || q.createdBy || '-'}</td>
                      <td className="p-3.5 text-center print-hide-col">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${st.bg} ${st.text} ${st.border} whitespace-nowrap`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                            {st.label}
                          </span>
                          {isExpiredQuotation(q) && (
                            <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full font-bold bg-red-50 text-red-600 border border-red-200">
                              หมดอายุ
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 text-[#1d1d1f]">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 font-bold text-xs text-zinc-800 bg-[#f5f5f7] rounded-lg border border-[#d2d2d7]/60 whitespace-nowrap print:hidden">
                          <Package className="w-3.5 h-3.5 text-[#0071e3]" />
                          <span>{items.length.toLocaleString()} รายการ</span>
                        </span>
                        <div className="hidden print:block space-y-1">
                          {items.length === 0 ? (
                            <span className="text-zinc-400 font-normal text-[10px]">ไม่มีรายการสินค้า</span>
                          ) : (
                            items.map((item, idx) => {
                              const code = item.code || item.productCode || '';
                              const name = item.productName || item.name || '';
                              return (
                                <div key={idx} className="flex items-baseline gap-1 text-[11px] leading-tight">
                                  {code && (
                                    <span className="font-mono text-[10px] font-bold text-zinc-700 shrink-0">
                                      [{code}]
                                    </span>
                                  )}
                                  <span className="font-semibold text-black">{name}</span>
                                  {item.quantity > 1 && (
                                    <span className="text-[10px] text-zinc-500 font-mono shrink-0 ml-1">x{item.quantity}</span>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 text-right text-[#555557] tabular-nums font-medium">
                        ฿{formatMoney(q.subtotal || q.totalAmount)}
                      </td>
                      <td className="p-3.5 text-right font-black text-[#1d1d1f] tabular-nums text-sm">
                        ฿{formatMoney(q.totalAmount)}
                      </td>
                      <td className="p-3.5 text-center whitespace-nowrap print-hide-col">
                        <button
                          type="button"
                          onClick={() => setViewDoc(q)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-[#0071e3] bg-blue-50 hover:bg-blue-100 border border-blue-200/60 rounded-lg transition-colors cursor-pointer"
                          title="ดูรายละเอียดเอกสาร"
                        >
                          <Eye className="w-2.5 h-2.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Print-only summary footer */}
              <tfoot className="hidden print-only">
                <tr className="border-t-2 border-black">
                  <td colSpan="6" className="p-3 text-right font-black text-xs uppercase tracking-widest">รวมทั้งสิ้น ({filteredQuotations.length} เอกสาร)</td>
                  <td className="p-3 text-right font-bold text-xs tabular-nums">
                    ฿{formatMoney(filteredQuotations.reduce((sum, q) => sum + Number(q.subtotal || q.totalAmount || 0), 0))}
                  </td>
                  <td className="p-3 text-right font-black text-sm tabular-nums">
                    ฿{formatMoney(summary.totalRevenue)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#f5f5f7] flex items-center justify-center mx-auto mb-4">
              <FileSpreadsheet className="w-6 h-6 text-zinc-400" />
            </div>
            <p className="text-sm font-semibold text-[#1d1d1f]">ไม่พบข้อมูลใบเสนอราคา</p>
            <p className="text-xs text-[#86868b] mt-1">ลองปรับเงื่อนไขตัวกรองหรือคำค้นหาใหม่</p>
          </div>
        )}
      </div>

      {/* ── VIEW DOCUMENT DETAILS MODAL ───────────────────── */}
      {viewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in no-print">
          <div onClick={() => setViewDoc(null)} className="absolute inset-0 bg-[#1d1d1f]/40 transition-all duration-300" />
          <div className="relative bg-white rounded-3xl border border-[#d2d2d7]/50 max-w-2xl w-full p-6 shadow-2xl space-y-5 z-10 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-[#e8e8ed] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-[#1d1d1f]">รายละเอียดใบเสนอราคา</h3>
                  <span className="font-mono text-xs font-bold text-[#0071e3]">
                    {viewDoc.quotationNumber || viewDoc.id}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">วันที่ออกเอกสาร: {formatDate(viewDoc.issuedDate)}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewDoc(null)}
                className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-blue-50 p-4.5 rounded-2xl text-xs border border-blue-100 shadow-2xs">
              <div>
                <span className="text-zinc-500 block text-[10px] font-bold uppercase tracking-wider">ข้อมูลลูกค้า</span>
                <p className="font-bold text-[#1d1d1f] text-sm mt-0.5">{getCustName(viewDoc) || '-'}</p>
                {getCustTaxId(viewDoc) && <p className="text-zinc-500 font-mono text-[11px]">Tax ID: {getCustTaxId(viewDoc)}</p>}
                {getCustAddress(viewDoc) && <p className="text-zinc-600 mt-1">{getCustAddress(viewDoc)}</p>}
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] font-bold uppercase tracking-wider">ผู้สร้าง / พนักงานขาย</span>
                <p className="font-bold text-[#1d1d1f] text-sm mt-0.5">{viewDoc.salespersonName || viewDoc.createdBy || '-'}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">สถานะ:</span>
                  {(() => {
                    const st = STATUS_CONFIG[viewDoc.status] || STATUS_CONFIG.draft;
                    return (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${st.bg} ${st.text} ${st.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                          {st.label}
                        </span>
                        {isExpiredQuotation(viewDoc) && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-red-50 text-red-600 border border-red-200">
                            หมดอายุ
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-[#1d1d1f] mb-2 uppercase tracking-wider">รายการสินค้าในเอกสาร ({viewDoc.items?.length || 0} รายการ)</h4>
              <div className="border border-[#d2d2d7]/50 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#f5f5f7] text-zinc-500 font-bold border-b border-[#e8e8ed]">
                    <tr>
                      <th className="p-2.5 w-10 text-center">#</th>
                      <th className="p-2.5">รายการสินค้า</th>
                      <th className="p-2.5 text-right w-24">ราคา/หน่วย</th>
                      <th className="p-2.5 text-center w-20">จำนวน</th>
                      <th className="p-2.5 text-right w-28">ยอดรวม</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f0f5]">
                    {(viewDoc.items || []).map((item, idx) => (
                      <tr key={idx} className="hover:bg-[#fafafa]">
                        <td className="p-2.5 text-center font-mono text-zinc-400">{idx + 1}</td>
                        <td className="p-2.5 font-medium text-[#1d1d1f]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {(item.code || item.productCode) && (
                              <span className="font-mono text-[10px] font-bold text-zinc-700 bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200/80">
                                {item.code || item.productCode}
                              </span>
                            )}
                            <span className="font-semibold">{item.productName || item.name}</span>
                            {item.variantName && <span className="text-[10px] text-blue-600 font-normal">({item.variantName})</span>}
                          </div>
                        </td>
                        <td className="p-2.5 text-right font-mono text-zinc-700">฿{formatMoney(item.unitPrice || item.price)}</td>
                        <td className="p-2.5 text-center font-bold text-zinc-800">{item.quantity || 1}</td>
                        <td className="p-2.5 text-right font-bold font-mono text-[#1d1d1f]">
                          ฿{formatMoney((item.unitPrice || item.price || 0) * (item.quantity || 1))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#e8e8ed]">
              <div className="w-full sm:w-64 space-y-1.5 text-xs">
                <div className="flex justify-between text-zinc-500">
                  <span>ราคารวมก่อนภาษี:</span>
                  <span className="font-mono font-bold">฿{formatMoney(viewDoc.subtotal || viewDoc.totalAmount)}</span>
                </div>
                {viewDoc.vatAmount > 0 && (
                  <div className="flex justify-between text-zinc-500">
                    <span>ภาษีมูลค่าเพิ่ม (VAT):</span>
                    <span className="font-mono font-bold">฿{formatMoney(viewDoc.vatAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-[#1d1d1f] pt-2 border-t border-[#e8e8ed]">
                  <span>ยอดรวมสุทธิ:</span>
                  <span className="font-mono text-[#0071e3]">฿{formatMoney(viewDoc.totalAmount)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#e8e8ed]">
              <button
                type="button"
                onClick={() => setViewDoc(null)}
                className="px-5 py-2 bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f] font-bold rounded-full text-xs transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
