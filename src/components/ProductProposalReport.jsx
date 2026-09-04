import { useMemo, useState } from 'react';
import { Archive, Download, Eye, FileText, Package, Printer, Search, Shield, X } from 'lucide-react';
import * as XLSX from 'xlsx';

const formatMoney = (value) => Number(value || 0).toLocaleString('th-TH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('th-TH');
};

// All roles can view all documents in reports
const isOwnDocument = () => true;


export default function ProductProposalReport({
  quotations = [],
  currentUser,
  addActivityLog,
  activeTab = 'product-proposals',
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

  const proposals = useMemo(() => quotations.filter(proposal =>
    proposal.documentType === 'product_proposal' && isOwnDocument(proposal, currentUser)
  ), [quotations, currentUser]);

  const filteredProposals = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return proposals.filter(proposal => {
      const issuedDate = proposal.issuedDate || '';
      const matchesDate = (!startDate || issuedDate >= startDate) && (!endDate || issuedDate <= endDate);
      const matchesSearch = !query || [
        proposal.quotationNumber,
        proposal.createdBy,
        proposal.salespersonName,
        ...(proposal.items || []).flatMap(item => [item.productName, item.productCode, item.barcode]),
      ].some(value => String(value || '').toLowerCase().includes(query));
      return matchesDate && matchesSearch;
    });
  }, [proposals, searchQuery, startDate, endDate]);

  const summary = useMemo(() => filteredProposals.reduce((result, proposal) => {
    result.productLines += (proposal.items || []).length;
    result.quantity += (proposal.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    result.total += Number(proposal.totalAmount || 0);
    return result;
  }, { productLines: 0, quantity: 0, total: 0 }), [filteredProposals]);

  const filterDescription = () => {
    const dates = startDate || endDate
      ? `ช่วงวันที่ ${startDate || 'เริ่มต้น'} ถึง ${endDate || 'ปัจจุบัน'}`
      : 'ทุกช่วงวันที่';
    return `${dates}${searchQuery.trim() ? `, ค้นหา: "${searchQuery.trim()}"` : ''}`;
  };

  const downloadViaRedirect = async (base64Data, filename) => {
    try {
      const response = await fetch('/api/store-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: base64Data, filename }),
      });
      if (response.ok) {
        const result = await response.json();
        if (result.id) {
          window.location.assign(`/api/download?id=${result.id}`);
          return;
        }
      }
    } catch {
      // Fallback
    }

    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 10000);
  };

  const handleExportExcel = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const rows = filteredProposals.flatMap(proposal => {
        const items = proposal.items || [];
        if (items.length === 0) {
          return [[proposal.quotationNumber || proposal.id, proposal.issuedDate || '', proposal.salespersonName || proposal.createdBy || '', '', '', 0, '', 0, 0]];
        }
        return items.map(item => [
          proposal.quotationNumber || proposal.id,
          proposal.issuedDate || '',
          proposal.salespersonName || proposal.createdBy || '',
          item.productCode || '',
          item.productName || '',
          Number(item.quantity || 0),
          item.unit || 'ชิ้น',
          Number(item.unitPrice || 0),
          Number(item.lineTotal || 0),
        ]);
      });
      const worksheet = XLSX.utils.aoa_to_sheet([
        ['เลขที่เอกสาร', 'วันที่ออกเอกสาร', 'ผู้สร้าง', 'รหัสสินค้า', 'ชื่อสินค้า', 'จำนวน', 'หน่วย', 'ราคาต่อหน่วย (บาท)', 'รวม (บาท)'],
        ...rows,
      ]);
      worksheet['!cols'] = [
        { wch: 24 }, { wch: 16 }, { wch: 24 }, { wch: 18 }, { wch: 45 },
        { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 18 },
      ];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'รายงานใบเสนอสินค้า');
      const base64 = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
      const filename = `PIM_Product_Proposal_Report_${new Date().toLocaleDateString('sv-SE')}.xlsx`;
      await downloadViaRedirect(base64, filename);
      addActivityLog?.(`ดาวน์โหลดรายงานใบเสนอสินค้าเป็นไฟล์ Excel (${filteredProposals.length} เอกสาร, ${filterDescription()})`);
    } catch (error) {
      console.error('Error exporting product proposal report:', error);
      alert('ไม่สามารถดาวน์โหลดรายงานใบเสนอสินค้าได้');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
    addActivityLog?.(`พิมพ์รายงานใบเสนอสินค้า (${filteredProposals.length} เอกสาร, ${filterDescription()})`);
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
            <div className="w-1 h-5 rounded-full bg-gradient-to-b from-violet-500 to-fuchsia-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-600">PRODUCT PROPOSAL REPORT</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-[#1d1d1f] leading-none">รายงานใบเสนอสินค้า</h1>
          <p className="text-xs text-[#86868b] mt-1.5 font-medium">
            ข้อมูล ณ {new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' })}
          </p>
        </div>

        <div className="flex gap-2 items-center w-full sm:w-auto">
          {isAdmin && onArchive && (
            <button
              type="button"
              onClick={onArchive}
              className="group relative overflow-hidden px-4 py-2.5 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg hover:shadow-red-500/30 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
              title="จัดการและลบเอกสารเก่า (เฉพาะ Admin)"
            >
              <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
              <Archive className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">จัดการเอกสารเก่า</span>
              <span className="sm:hidden">เอกสารเก่า</span>
              <span className="flex items-center gap-0.5 bg-white/20 px-1.5 py-0.5 rounded-md text-[10px]">
                <Shield className="w-2.5 h-2.5" />
                Admin
              </span>
            </button>
          )}
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
            className="group flex-1 sm:flex-initial justify-center relative overflow-hidden px-4 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg hover:shadow-violet-500/30 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
          >
            <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
            <Printer className="w-3.5 h-3.5" />
            <span>พิมพ์รายงาน</span>
          </button>
        </div>
      </div>

      <div className="no-print grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-5 shadow-xs">
          <p className="text-[10px] font-black uppercase tracking-widest text-violet-600 mb-1">ใบเสนอสินค้าทั้งหมด</p>
          <div className="flex items-end justify-between">
            <h3 className="text-4xl font-black text-[#1d1d1f] leading-none">{filteredProposals.length.toLocaleString()}</h3>
            <FileText className="w-6 h-6 text-violet-500" />
          </div>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 p-5 shadow-xs">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">จำนวนสินค้ารวม</p>
          <div className="flex items-end justify-between">
            <h3 className="text-4xl font-black text-[#1d1d1f] leading-none">{summary.quantity.toLocaleString()}</h3>
            <Package className="w-6 h-6 text-blue-500" />
          </div>
          <p className="text-[10px] text-[#86868b] mt-1 font-medium">{summary.productLines.toLocaleString()} รายการสินค้า</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-5 shadow-xs">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">มูลค่ารวม</p>
          <h3 className="text-3xl font-black text-[#1d1d1f] leading-none">฿{formatMoney(summary.total)}</h3>
        </div>
      </div>

      <div className="no-print bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-[#d2d2d7]/50 shadow-xs">
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="relative flex-1 min-w-[200px] md:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              placeholder="ค้นหาเลขที่เอกสาร ผู้สร้าง หรือสินค้า..."
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              className="w-full pl-8 pr-8 py-2 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-xs focus:outline-hidden focus:border-violet-500 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={event => setStartDate(event.target.value)}
              className="px-3 py-2 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-xs focus:outline-hidden focus:border-violet-500 font-medium cursor-pointer"
              title="วันที่เริ่มต้น"
            />
            <span className="text-xs text-[#86868b]">ถึง</span>
            <input
              type="date"
              value={endDate}
              onChange={event => setEndDate(event.target.value)}
              className="px-3 py-2 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-xs focus:outline-hidden focus:border-violet-500 font-medium cursor-pointer"
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
              className="text-xs text-violet-600 hover:underline font-bold px-2 py-1 cursor-pointer"
            >
              ล้างตัวกรอง
            </button>
          )}
        </div>
      </div>

      <div className="hidden print-only border-b pb-6 mb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="h-12 w-auto object-contain" />
            <div className="text-left">
              <h3 className="text-sm font-black text-black">บริษัท พันธ์วาดี จำกัด</h3>
              <p className="text-[10px] text-zinc-500">Product Information Management System</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-bold text-black uppercase tracking-wide">รายงานใบเสนอสินค้า</h2>
            <p className="text-[10px] text-zinc-500 mt-0.5">{filterDescription()}</p>
            <p className="text-[10px] text-zinc-400">พิมพ์เมื่อ {new Date().toLocaleString('th-TH')}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#d2d2d7]/50 bg-white overflow-hidden shadow-xs print-card proposal-report-table">
        <div className="px-4.5 py-3.5 border-b border-[#e8e8ed] no-print flex items-center justify-between">
          <h4 className="text-xs font-black text-[#1d1d1f] tracking-widest uppercase">รายการใบเสนอสินค้า</h4>
          <span className="px-2.5 py-0.5 text-[10px] font-black bg-violet-600 text-white rounded-full">
            {filteredProposals.length.toLocaleString()} เอกสาร
          </span>
        </div>

        {filteredProposals.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f5f5f7]/80 text-[#86868b] font-black border-b border-[#e8e8ed] text-[10px] uppercase tracking-widest">
                  <th className="p-3.5 w-12 text-center">#</th>
                  <th className="p-3.5 min-w-[180px]">เลขที่เอกสาร</th>
                  <th className="p-3.5 min-w-[120px]">วันที่</th>
                  <th className="p-3.5 min-w-[160px]">ผู้สร้าง</th>
                  <th className="p-3.5 min-w-[260px]">สินค้า</th>
                  <th className="p-3.5 text-right min-w-[90px]">จำนวน</th>
                  <th className="p-3.5 text-right min-w-[130px]">มูลค่ารวม</th>
                  <th className="p-3.5 text-center min-w-[100px] print-hide-col">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f5] text-xs">
                {filteredProposals.map((proposal, index) => {
                  const items = proposal.items || [];
                  const quantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
                  const productNames = items.map(item => item.productName).filter(Boolean).join(', ');
                  return (
                    <tr
                      key={proposal.id || index}
                      onMouseEnter={() => setHoveredRow(proposal.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                      className={`transition-all duration-150 ${
                        hoveredRow === proposal.id
                          ? 'bg-gradient-to-r from-violet-500/8 via-violet-500/4 to-transparent'
                          : index % 2 === 0 ? 'bg-white' : 'bg-violet-50/20'
                      }`}
                    >
                      <td className="p-3.5 text-center font-mono text-[#86868b]">{index + 1}</td>
                      <td className="p-3.5 font-mono font-bold text-violet-700">
                        <span className="bg-violet-50 px-2 py-0.5 rounded-md border border-violet-100">
                          {proposal.quotationNumber || proposal.id}
                        </span>
                      </td>
                      <td className="p-3.5 text-[#555557] whitespace-nowrap">{formatDate(proposal.issuedDate)}</td>
                      <td className="p-3.5 text-[#555557] font-medium">{proposal.salespersonName || proposal.createdBy || '-'}</td>
                      <td className="p-3.5 text-[#1d1d1f]">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 font-bold text-xs text-violet-900 bg-violet-50 rounded-lg border border-violet-100 whitespace-nowrap print:hidden">
                          <Package className="w-3.5 h-3.5 text-violet-600" />
                          <span>{items.length.toLocaleString()} รายการ</span>
                        </span>
                        <div className="hidden print:block space-y-1.5">
                          {items.length === 0 ? (
                            <span className="text-zinc-400 font-normal text-[10px]">ไม่มีรายการสินค้า</span>
                          ) : (
                            items.map((item, idx) => {
                              const code = item.code || item.productCode || '';
                              const name = item.productName || item.name || '';
                              return (
                                <div key={idx} className="flex items-baseline gap-1.5 text-[11px] leading-snug py-0.5 border-b border-zinc-100 last:border-0">
                                  {code && (
                                    <span className="font-mono text-[9px] font-bold text-zinc-800 bg-zinc-100 px-1 py-0.5 rounded border border-zinc-300 shrink-0">
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
                      <td className="p-3.5 text-right font-bold tabular-nums">{quantity.toLocaleString()}</td>
                      <td className="p-3.5 text-right font-black text-[#1d1d1f] tabular-nums">฿{formatMoney(proposal.totalAmount)}</td>
                      <td className="p-3.5 text-center whitespace-nowrap print-hide-col">
                        <button
                          type="button"
                          onClick={() => setViewDoc(proposal)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200/60 rounded-lg transition-colors cursor-pointer"
                          title="ดูรายละเอียดใบเสนอสินค้า"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>ดูข้อมูล</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="hidden print-only">
                <tr className="border-t-2 border-black">
                  <td colSpan="5" className="p-3 text-right font-black text-xs uppercase tracking-widest">รวมทั้งสิ้น ({filteredProposals.length} เอกสาร)</td>
                  <td className="p-3 text-right font-bold text-xs tabular-nums">
                    {summary.quantity.toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-black text-sm tabular-nums">
                    ฿{formatMoney(summary.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="py-20 text-center">
            <FileText className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-[#1d1d1f]">ไม่พบใบเสนอสินค้า</p>
            <p className="text-xs text-[#86868b] mt-1">ลองปรับช่วงวันที่หรือคำค้นหาใหม่</p>
          </div>
        )}
      </div>

      {/* ── VIEW PROPOSAL DETAILS MODAL ───────────────────── */}
      {viewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in no-print">
          <div onClick={() => setViewDoc(null)} className="absolute inset-0 bg-[#1d1d1f]/15 backdrop-blur-md transition-all duration-300" />
          <div className="relative bg-white/98 backdrop-blur-2xl rounded-3xl border border-[#d2d2d7]/40 max-w-2xl w-full p-6 shadow-[0_24px_64px_rgba(0,0,0,0.12)] space-y-5 z-10 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-[#e8e8ed] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-[#1d1d1f]">รายละเอียดใบเสนอสินค้า</h3>
                  <span className="font-mono text-xs font-bold bg-violet-50 text-violet-700 px-2.5 py-0.5 rounded-full border border-violet-100">
                    {viewDoc.quotationNumber || viewDoc.id}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">วันที่สร้างเอกสาร: {formatDate(viewDoc.issuedDate)}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewDoc(null)}
                className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gradient-to-br from-violet-50/40 via-purple-50/20 to-white p-4.5 rounded-2xl text-xs border border-violet-100/60 shadow-2xs">
              <div>
                <span className="text-zinc-500 block text-[10px] font-bold uppercase tracking-wider">ผู้สร้าง / พนักงาน</span>
                <p className="font-bold text-[#1d1d1f] text-sm mt-0.5">{viewDoc.salespersonName || viewDoc.createdBy || '-'}</p>
                {viewDoc.customerName && <p className="text-zinc-600 mt-1">ลูกค้า: {viewDoc.customerName}</p>}
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] font-bold uppercase tracking-wider">สรุปรายการ</span>
                <p className="font-bold text-violet-900 text-sm mt-0.5">
                  {(viewDoc.items || []).length.toLocaleString()} สินค้า (รวม {(viewDoc.items || []).reduce((s, i) => s + Number(i.quantity || 0), 0).toLocaleString()} ชิ้น)
                </p>
                <p className="text-violet-700 font-bold font-mono mt-1 text-xs">
                  มูลค่ารวม: ฿{formatMoney(viewDoc.totalAmount)}
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-[#1d1d1f] mb-2 uppercase tracking-wider">รายการสินค้าในเสนอสินค้า ({viewDoc.items?.length || 0} รายการ)</h4>
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
                            {item.variantName && <span className="text-[10px] text-violet-600 font-normal">({item.variantName})</span>}
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

            <div className="flex justify-between items-center pt-2 border-t border-[#e8e8ed]">
              <div className="text-xs text-zinc-500">
                มูลค่ารวมเอกสาร: <span className="font-bold text-violet-700 font-mono text-sm ml-1">฿{formatMoney(viewDoc.totalAmount)}</span>
              </div>
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
