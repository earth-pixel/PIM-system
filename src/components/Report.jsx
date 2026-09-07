import { useState, useMemo } from 'react';
import { Printer, Download, Search, X, ToggleRight, Package, ToggleLeft, Barcode } from 'lucide-react';
import * as XLSX from 'xlsx';
import { downloadWorkbook } from '../utils/exportUtils';
import ProductProposalReport from './ProductProposalReport';
import QuotationReport from './QuotationReport';
import ArchiveManage from './ArchiveManage';
import DropdownFilter from './DropdownFilter';

// All roles can view all documents in reports
const isOwnDocument = () => true;


export default function Report({ products, brands, categories, subcategories = {}, quotations = [], currentUser, addActivityLog, onArchiveDeleteQuotations }) {
  const [reportType, setReportTypeState] = useState(() => {
    try {
      return localStorage.getItem('pim_report_type') || 'products';
    } catch {
      return 'products';
    }
  });

  const setReportType = (val) => {
    setReportTypeState(val);
    try {
      localStorage.setItem('pim_report_type', typeof val === 'function' ? val(reportType) : val);
    } catch {}
  };
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSubCategory, setSelectedSubCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [showArchive, setShowArchive] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  // Counts for tabs
  const productsCount = products.length;
  const quotationsCount = useMemo(() => {
    return quotations.filter(q => q.documentType !== 'product_proposal' && isOwnDocument(q, currentUser)).length;
  }, [quotations, currentUser]);
  const proposalsCount = useMemo(() => {
    return quotations.filter(q => q.documentType === 'product_proposal' && isOwnDocument(q, currentUser)).length;
  }, [quotations, currentUser]);

  const baseFilteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesBrand = selectedBrand === 'All' || product.brand === selectedBrand;
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      const matchesSubCategory = selectedSubCategory === 'All' || product.subCategory === selectedSubCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = !q ||
        (product.name || '').toLowerCase().includes(q) ||
        (product.code || '').toLowerCase().includes(q) ||
        (product.barcode || '').toLowerCase().includes(q) ||
        (product.variants || []).some(v => (v.barcode || '').toLowerCase().includes(q) || (v.sku || '').toLowerCase().includes(q));
      return matchesBrand && matchesCategory && matchesSubCategory && matchesSearch;
    });
  }, [products, selectedBrand, selectedCategory, selectedSubCategory, searchQuery]);

  const filteredProducts = useMemo(() => {
    return baseFilteredProducts.filter(product => {
      return selectedStatus === 'All' || product.status === selectedStatus;
    });
  }, [baseFilteredProducts, selectedStatus]);

  const activeCount = useMemo(() => {
    return baseFilteredProducts.filter(p => p.status === 'Active').length;
  }, [baseFilteredProducts]);

  const inactiveCount = useMemo(() => {
    return baseFilteredProducts.filter(p => p.status !== 'Active').length;
  }, [baseFilteredProducts]);

  const handlePrint = () => {
    window.print();
    if (addActivityLog) {
      const filterText = `แบรนด์: ${selectedBrand === 'All' ? 'ทั้งหมด' : selectedBrand}, หมวดหมู่: ${selectedCategory === 'All' ? 'ทั้งหมด' : selectedCategory}, สถานะ: ${selectedStatus === 'All' ? 'ทั้งหมด' : selectedStatus === 'Active' ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}`;
      addActivityLog(`พิมพ์รายงานข้อมูลสินค้า (จำนวน ${filteredProducts.length} รายการ, ตัวกรอง - ${filterText})`);
    }
  };

  const formatDateSafely = (dateStr) => {
    if (!dateStr) return '';
    try {
      const cleanStr = dateStr.includes(' ') ? dateStr.replace(' ', 'T') : dateStr;
      const date = new Date(cleanStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleString('th-TH');
    } catch {
      return dateStr;
    }
  };
  

  const downloadXLSX = async (headers, rows, filename) => {
    try {
      const data = [headers, ...rows];
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      worksheet['!cols'] = [
        { wch: 20 }, { wch: 20 }, { wch: 40 }, { wch: 20 }, { wch: 20 },
        { wch: 18 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
        { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 25 }
      ];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'รายงานสินค้า');
      await downloadWorkbook(workbook, filename);
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการ Export Excel:', error);
      alert('ไม่สามารถดาวน์โหลดรายงานได้');
    }
  };

  const handleExportExcel = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const headers = [
        'รหัสสินค้า (SKU)', 'รหัสบาร์โค้ด', 'ชื่อสินค้า', 'แบรนด์', 'หมวดหมู่สินค้า', 'หมวดหมู่ย่อย',
        'ราคาขายส่ง (บาท)', 'ราคาขายปลีก (บาท)', 'ค่าฝา (บาท)', 'ขนาด', 'น้ำหนัก',
        'หมายเลข อย.', 'หมายเลข มอก.', 'สถานะ', 'วันที่เพิ่มข้อมูล', 'วันที่แก้ไขข้อมูลล่าสุด'
      ];
      const rows = filteredProducts.map(p => [
        p.code || '', p.barcode || '', p.name || '', p.brand || '', p.category || '', p.subCategory || '',
        Number(p.wholesalePrice || 0), Number(p.retailPrice || 0), Number(p.capFee || 0),
        p.size || '', p.weight || '', p.fdaNumber || '', p.tisiNumber || '',
        p.status === 'Active' ? 'เปิดใช้งาน' : 'ปิดใช้งาน',
        formatDateSafely(p.createdAt), formatDateSafely(p.updatedAt)
      ]);
      const filename = `PIM_Report_Phanvadee_${new Date().toLocaleDateString('sv-SE')}.xlsx`;
      await downloadXLSX(headers, rows, filename);
      if (addActivityLog) {
        const filterText = `แบรนด์: ${selectedBrand === 'All' ? 'ทั้งหมด' : selectedBrand}, หมวดหมู่: ${selectedCategory === 'All' ? 'ทั้งหมด' : selectedCategory}, สถานะ: ${selectedStatus === 'All' ? 'ทั้งหมด' : selectedStatus === 'Active' ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}`;
        addActivityLog(`ดาวน์โหลดรายงานสินค้าเป็นไฟล์ Excel (จำนวน ${filteredProducts.length} รายการ, ตัวกรอง - ${filterText})`);
      }
    } catch (error) {
      console.error('Error during excel export:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const reportCounts = {
    products: productsCount,
    quotations: quotationsCount,
    proposals: proposalsCount,
  };

  const renderProductsContent = () => {
    return (
      <div className="space-y-5">

      {/* ── PAGE HEADER ───────────────────────────────────── */}
      <div className="no-print flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-5 rounded-full bg-gradient-to-b from-[#0071e3] to-[#00c2ff]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0071e3]">PRODUCT INTELLIGENCE</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-[#1d1d1f] leading-none">
            รายงานสินค้า
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
      <div className="no-print grid grid-cols-1 sm:grid-cols-3 gap-4 print-grid-2">
        {/* Total Card */}
        <div
          onClick={() => setSelectedStatus('All')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedStatus('All'); } }}
          className={`relative overflow-hidden rounded-2xl border p-5 group transition-all duration-300 select-none cursor-pointer hover:scale-[1.02] active:scale-[0.98] print-card print-kpi-card ${
            selectedStatus === 'All'
              ? 'border-[#0071e3] bg-gradient-to-br from-[#0071e3]/12 to-[#00c2ff]/8 shadow-lg shadow-[#0071e3]/15'
              : 'border-[#0071e3]/20 bg-gradient-to-br from-[#0071e3]/8 to-[#00c2ff]/5 hover:border-[#0071e3]/40 hover:shadow-lg hover:shadow-[#0071e3]/10'
          }`}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#0071e3]/15 to-transparent rounded-bl-[3rem]" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#0071e3]/80 mb-1">สินค้าทั้งหมด</p>
              <h3 className="text-4xl font-black text-[#1d1d1f] leading-none tracking-tight tabular-nums">
                {baseFilteredProducts.length.toLocaleString()}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#0071e3]/15 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Package className="w-5 h-5 text-[#0071e3]" />
            </div>
          </div>
        </div>

        {/* Active Card */}
        <div
          onClick={() => setSelectedStatus('Active')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedStatus('Active'); } }}
          className={`relative overflow-hidden rounded-2xl border p-5 group transition-all duration-300 select-none cursor-pointer hover:scale-[1.02] active:scale-[0.98] print-card print-kpi-card ${
            selectedStatus === 'Active'
              ? 'border-emerald-500 bg-gradient-to-br from-emerald-100/90 to-teal-50/60 shadow-lg shadow-emerald-500/15'
              : 'border-emerald-200/60 bg-gradient-to-br from-emerald-50/80 to-teal-50/40 hover:border-emerald-300/80 hover:shadow-lg hover:shadow-emerald-500/10'
          }`}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-200/40 to-transparent rounded-bl-[3rem]" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600/80 mb-1">เปิดใช้งาน</p>
              <h3 className="text-4xl font-black text-[#1d1d1f] leading-none tracking-tight tabular-nums">
                {activeCount.toLocaleString()}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ToggleRight className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </div>

        {/* Inactive Card */}
        <div
          onClick={() => setSelectedStatus('Inactive')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedStatus('Inactive'); } }}
          className={`relative overflow-hidden rounded-2xl border p-5 group transition-all duration-300 select-none cursor-pointer hover:scale-[1.02] active:scale-[0.98] print-card print-kpi-card ${
            selectedStatus === 'Inactive'
              ? 'border-zinc-500 bg-gradient-to-br from-zinc-200/90 to-slate-50/60 shadow-lg shadow-zinc-500/15'
              : 'border-zinc-200/60 bg-gradient-to-br from-zinc-50/80 to-slate-50/40 hover:border-zinc-300/80 hover:shadow-lg hover:shadow-zinc-400/10'
          }`}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-zinc-200/50 to-transparent rounded-bl-[3rem]" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">ปิดใช้งาน</p>
              <h3 className="text-4xl font-black text-[#1d1d1f] leading-none tracking-tight tabular-nums">
                {inactiveCount.toLocaleString()}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ToggleLeft className="w-5 h-5 text-zinc-500" />
            </div>
          </div>
        </div>
      </div>

      {/* ── FILTER BAR ────────────────────────────────────── */}
      <div className="no-print bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-[#d2d2d7]/50 shadow-xs">
        <div className="flex flex-col md:flex-row md:flex-wrap gap-3 items-stretch md:items-center">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-[#0071e3] animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#555557]">ตัวกรอง</span>
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[180px] md:max-w-xs">
            <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0071e3] pointer-events-none" />
            <input
              type="text"
              placeholder="ค้นหาชื่อสินค้า / SKU / บาร์โค้ด..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-xs text-zinc-700 focus:outline-hidden focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10 focus:bg-white transition-all placeholder:text-zinc-400"
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

          <DropdownFilter
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            options={[
              { value: 'All', label: 'ทุกแบรนด์' },
              ...brands.map(b => ({ value: b, label: b }))
            ]}
          />

          <DropdownFilter
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setSelectedSubCategory('All'); }}
            options={[
              { value: 'All', label: 'ทุกหมวดหมู่หลัก' },
              ...categories.map(c => ({ value: c, label: c }))
            ]}
          />

          <DropdownFilter
            value={selectedSubCategory}
            onChange={(e) => setSelectedSubCategory(e.target.value)}
            options={[
              { value: 'All', label: 'ทุกหมวดหมู่ย่อย' },
              ...Array.from(new Set(selectedCategory !== 'All' ? (subcategories[selectedCategory] || []) : Object.values(subcategories).flat())).map(s => ({ value: s, label: s }))
            ]}
          />

          <DropdownFilter
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            options={[
              { value: 'All', label: 'ทุกสถานะ' },
              { value: 'Active', label: 'เปิดใช้งาน' },
              { value: 'Inactive', label: 'ปิดใช้งาน' }
            ]}
          />
        </div>
      </div>

      {/* ── Printable Sheet Header ─────────────────────────── */}
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
            <h2 className="text-lg font-bold text-black uppercase tracking-wide">รายงานสรุปข้อมูลผลิตภัณฑ์</h2>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              เงื่อนไข: แบรนด์ [{selectedBrand}] / หมวดหมู่ [{selectedCategory}] / หมวดหมู่ย่อย [{selectedSubCategory}] / สถานะ [{selectedStatus === 'All' ? 'ทั้งหมด' : selectedStatus === 'Active' ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}]
            </p>
            <p className="text-[10px] text-zinc-400">วันที่พิมพ์: {new Date().toLocaleString('th-TH')}</p>
          </div>
        </div>
      </div>

      {/* ── REPORT TABLE ──────────────────────────────────── */}
      <div className="rounded-2xl border border-[#d2d2d7]/50 bg-white overflow-hidden shadow-xs print-card product-report-table">

        {/* Table Header Bar */}
        <div className="px-4.5 py-3.5 border-b border-[#e8e8ed] no-print flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h4 className="text-xs font-black text-[#1d1d1f] tracking-widest uppercase">รายการสินค้า</h4>
            <span className="px-2.5 py-0.5 text-[10px] font-black bg-[#0071e3] text-white rounded-full">
              {filteredProducts.length.toLocaleString()} รายการ
            </span>
          </div>
          {filteredProducts.length > 0 && (
            <p className="text-[10px] text-zinc-400 font-medium hidden sm:block">
              เปิดใช้งาน {activeCount} · ปิดใช้งาน {inactiveCount}
            </p>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f5f5f7]/80 text-[#86868b] font-black border-b border-[#e8e8ed] text-[10px] uppercase tracking-widest">
                <th className="p-2 sm:p-3.5 w-10 sm:w-12 text-center">#</th>
                <th className="p-2 sm:p-3.5 min-w-[90px] sm:min-w-[110px]">รหัสสินค้า</th>
                <th className="p-2 sm:p-3.5 min-w-[150px] sm:min-w-[200px]">ชื่อสินค้า</th>
                <th className="p-2 sm:p-3.5 min-w-[100px] sm:min-w-[120px]">แบรนด์</th>
                <th className="p-2 sm:p-3.5 min-w-[100px] sm:min-w-[130px]">หมวดหมู่</th>
                <th className="p-2 sm:p-3.5 min-w-[100px] sm:min-w-[130px]">หมวดหมู่ย่อย</th>
                <th className="p-2 sm:p-3.5 text-right min-w-[80px] sm:min-w-[95px]">ราคาส่ง</th>
                <th className="p-2 sm:p-3.5 text-right min-w-[80px] sm:min-w-[95px]">ราคาปลีก</th>
                <th className="p-2 sm:p-3.5 text-right min-w-[65px] sm:min-w-[75px]">ค่าฝา</th>
                <th className="p-2 sm:p-3.5 text-center min-w-[85px] sm:min-w-[95px]">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f0f5] text-xs sm:text-sm">
              {filteredProducts.map((p, index) => (
                <tr
                  key={p.id}
                  onMouseEnter={() => setHoveredRow(p.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  className={`transition-all duration-150 ${
                    hoveredRow === p.id
                      ? 'bg-gradient-to-r from-[#0071e3]/4 via-[#0071e3]/3 to-transparent'
                      : index % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]/50'
                  }`}
                >
                  <td className="p-2 sm:p-3.5 text-center font-mono text-[#86868b] text-[10px]">
                    {index + 1}
                  </td>
                  <td className="p-2 sm:p-3.5">
                    <span className="font-mono text-[10px] font-bold text-zinc-700 bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200/80">
                      {p.code}
                    </span>
                  </td>
                  <td className="p-2 sm:p-3.5 font-semibold text-[#1d1d1f] leading-snug">{p.name}</td>
                  <td className="p-2 sm:p-3.5 text-[#555557] font-medium">{p.brand}</td>
                  <td className="p-2 sm:p-3.5">
                    <span className="text-[10px] font-semibold text-[#555557] bg-[#f5f5f7] px-2 py-0.5 rounded-lg leading-none inline-block">
                      {p.category}
                    </span>
                  </td>
                  <td className="p-2 sm:p-3.5">
                    <span className="text-[10px] font-semibold text-[#555557] bg-[#f5f5f7] px-2 py-0.5 rounded-lg leading-none inline-block">
                      {p.subCategory || '-'}
                    </span>
                  </td>
                  <td className="p-2 sm:p-3.5 text-right font-semibold text-[#555557] tabular-nums">
                    {(p.wholesalePrice || 0).toLocaleString()}
                  </td>
                  <td className="p-2 sm:p-3.5 text-right font-black text-[#1d1d1f] tabular-nums">
                    {(p.retailPrice || 0).toLocaleString()}
                  </td>
                  <td className="p-2 sm:p-3.5 text-right font-medium text-[#86868b] tabular-nums">
                    {(p.capFee || 0).toLocaleString()}
                  </td>
                  <td className="p-2 sm:p-3.5 text-center">
                    {p.status === 'Active' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                        เปิดใช้งาน
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-zinc-100 text-zinc-500 border border-zinc-200/60 whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" />
                        ปิดใช้งาน
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#f5f5f7] flex items-center justify-center mx-auto mb-4">
              <Search className="w-6 h-6 text-zinc-400" />
            </div>
            <p className="text-sm font-semibold text-[#1d1d1f]">ไม่พบรายการสินค้า</p>
            <p className="text-xs text-[#86868b] mt-1">ลองปรับเงื่อนไขการค้นหาใหม่</p>
          </div>
        )}


      </div>
    </div>
  );
};

  return (
    <>
    <div className="space-y-5">
      {/* ── REPORT TAB NAVIGATION SWITCHER ───────────────── */}
      <div className="no-print flex flex-wrap items-center gap-1 p-1 bg-[#e8e8ed] rounded-full border border-[#d2d2d7]/50 w-full sm:w-fit shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
        <button
          type="button"
          onClick={() => setReportType('products')}
          className={`flex-1 sm:flex-initial px-5 py-2 text-xs font-bold rounded-full transition-all duration-200 cursor-pointer flex items-center justify-center transform active:scale-95 ${
            reportType === 'products'
              ? 'bg-white text-[#0071e3] shadow-sm border border-[#d2d2d7]/10'
              : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <span>รายงานสินค้า</span>
        </button>

        <button
          type="button"
          onClick={() => setReportType('quotations')}
          className={`flex-1 sm:flex-initial px-5 py-2 text-xs font-bold rounded-full transition-all duration-200 cursor-pointer flex items-center justify-center transform active:scale-95 ${
            reportType === 'quotations'
              ? 'bg-white text-[#0071e3] shadow-sm border border-[#d2d2d7]/10'
              : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <span>รายงานใบเสนอราคา</span>
        </button>

        <button
          type="button"
          onClick={() => setReportType('product-proposals')}
          className={`flex-1 sm:flex-initial px-5 py-2 text-xs font-bold rounded-full transition-all duration-200 cursor-pointer flex items-center justify-center transform active:scale-95 ${
            reportType === 'product-proposals'
              ? 'bg-white text-[#0071e3] shadow-sm border border-[#d2d2d7]/10'
              : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <span>รายงานใบเสนอสินค้า</span>
        </button>
      </div>

      <div key={reportType} className="animate-page-transition">
        {reportType === 'products' && renderProductsContent()}
        {reportType === 'quotations' && (
          <QuotationReport
            quotations={quotations}
            currentUser={currentUser}
            addActivityLog={addActivityLog}
            activeTab={reportType}
            onTabChange={setReportType}
            counts={reportCounts}
            hideSwitcher={true}
            isAdmin={isAdmin}
            onArchive={() => setShowArchive(true)}
          />
        )}
        {reportType === 'product-proposals' && (
          <ProductProposalReport
            quotations={quotations}
            currentUser={currentUser}
            addActivityLog={addActivityLog}
            activeTab={reportType}
            onTabChange={setReportType}
            counts={reportCounts}
            hideSwitcher={true}
            isAdmin={isAdmin}
            onArchive={() => setShowArchive(true)}
          />
        )}
      </div>
    </div>

    {/* Archive Manage Modal — Admin only */}
    {isAdmin && showArchive && (
      <ArchiveManage
        quotations={quotations}
        currentUser={currentUser}
        addActivityLog={addActivityLog}
        onClose={() => setShowArchive(false)}
        onDeleted={(updatedQuotations, updatedLog) => {
          if (onArchiveDeleteQuotations) onArchiveDeleteQuotations(updatedQuotations, updatedLog);
        }}
      />
    )}
  </>
  );
}
