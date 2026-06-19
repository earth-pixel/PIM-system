import React, { useState } from 'react';
import { Printer, Download } from 'lucide-react';

export default function Report({ products, brands, categories }) {
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  const filteredProducts = products.filter(product => {
    const matchesBrand = selectedBrand === 'All' || product.brand === selectedBrand;
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    const matchesStatus = selectedStatus === 'All' || product.status === selectedStatus;
    return matchesBrand && matchesCategory && matchesStatus;
  });

  const totalValue = filteredProducts.reduce((acc, p) => acc + ((p.retailPrice || 0) * p.stock), 0);
  const totalStock = filteredProducts.reduce((acc, p) => acc + p.stock, 0);
  const averagePrice = filteredProducts.length > 0 
    ? Math.round(filteredProducts.reduce((acc, p) => acc + (p.retailPrice || 0), 0) / filteredProducts.length) 
    : 0;

  const handlePrint = () => window.print();

  // ── Helper: download CSV ──────────────────────────────────────────
  const downloadCSV = (rows, filename) => {
    const csvContent = '\uFEFF' + rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

  // ── Export: ข้อมูลคลัง (เดิม) ────────────────────────────────────
  const handleExportExcel = () => {
    const headers = [
      'รหัสสินค้า (SKU)', 'รหัสบาร์โค้ด', 'ชื่อสินค้า', 'แบรนด์', 'หมวดหมู่สินค้า',
      'ราคาขายส่ง (บาท)', 'ราคาขายปลีก (บาท)', 'ค่าฝา (บาท)', 'ขนาด', 'น้ำหนัก',
      'หมายเลข อย.', 'หมายเลข มอก.', 'จำนวนสต็อก (ชิ้น)', 'มูลค่ารวมราคาขายปลีก (บาท)',
      'สถานะ', 'วันที่เพิ่มข้อมูล', 'วันที่แก้ไขข้อมูลล่าสุด'
    ];
    const rows = filteredProducts.map(p => [
      q(p.code), q(p.barcode || ''), q(p.name), q(p.brand), q(p.category),
      p.wholesalePrice || 0, p.retailPrice || 0, p.capFee || 0,
      q(p.size || ''), q(p.weight || ''), q(p.fdaNumber || ''), q(p.tisiNumber || ''),
      p.stock, (p.retailPrice || 0) * p.stock,
      q(p.status === 'Active' ? 'เปิดใช้งาน' : 'ปิดใช้งาน'),
      q(p.createdAt || ''), q(p.updatedAt || '')
    ]);
    downloadCSV([headers, ...rows], `PIM_Report_Phanvadee_${new Date().toISOString().slice(0,10)}.csv`);
  };

  // ── Export: Shopee ────────────────────────────────────────────────
  const handleExportShopee = () => {
    const headers = [
      'ps_category', 'ps_product_name', 'ps_product_description',
      'ps_price', 'ps_stock', 'ps_sku_short', 'ps_weight', 'ps_item_cover_image'
    ];
    const rows = filteredProducts.map(p => [
      601469,
      q(p.name),
      q(p.description || p.desc || ''),
      p.retailPrice || 0,
      p.stock,
      q(p.code),
      p.weight || 0,
      q(p.image || '')
    ]);
    downloadCSV([headers, ...rows], `Shopee_Upload_${new Date().toISOString().slice(0,10)}.csv`);
  };

  // ── Export: TikTok Shop ───────────────────────────────────────────
  const handleExportTikTok = () => {
    const headers = [
      'category', 'product_name', 'product_description',
      'price', 'quantity', 'seller_sku', 'parcel_weight', 'main_image'
    ];
    const rows = filteredProducts.map(p => [
      q('การดูแลและการจัดแต่งทรงผม/แชมพูและครีมนวด'),
      q(p.name),
      q(p.description || p.desc || ''),
      p.retailPrice || 0,
      p.stock,
      q(p.code),
      (p.weight || 0) * 1000,   // kg → g
      q(p.image || '')
    ]);
    downloadCSV([headers, ...rows], `TikTok_Upload_${new Date().toISOString().slice(0,10)}.csv`);
  };

  // ── Export: Lazada ────────────────────────────────────────────────
  const handleExportLazada = () => {
    const headers = [
      'ชื่อสินค้า', 'คำอธิบายหลัก', 'ราคา',
      'จำนวน', 'SellerSKU', 'น้ำหนัก แพคเกจ (กก)', 'รูปภาพสินค้า1'
    ];
    const rows = filteredProducts.map(p => [
      q(p.name),
      q(p.description || p.desc || ''),
      p.retailPrice || 0,
      p.stock,
      q(p.code),
      p.weight || 0,
      q(p.image || '')
    ]);
    downloadCSV([headers, ...rows], `Lazada_Upload_${new Date().toISOString().slice(0,10)}.csv`);
  };

  // ── Dropdown state ────────────────────────────────────────────────
  const [showPlatformDrop, setShowPlatformDrop] = useState(false);
  const dropRef = React.useRef(null);
  React.useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setShowPlatformDrop(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const platformOptions = [
    { label: 'Shopee', icon: 'bi bi-bag-fill', color: 'text-orange-500', fn: handleExportShopee },
    { label: 'TikTok Shop', icon: 'bi bi-tiktok', color: 'text-black', fn: handleExportTikTok },
    { label: 'Lazada', icon: 'bi bi-bag-check-fill', color: 'text-blue-600', fn: handleExportLazada },
  ];

  return (
    <div className="space-y-6 animate-fade-in text-[#1d1d1f]">
      {/* Page Header (Hidden on Print) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f]">รายงานและสรุปข้อมูลสินค้า</h1>
        </div>

        <div className="flex gap-2 items-center">
          {/* ── Platform Export Dropdown ── */}
          <div className="relative" ref={dropRef}>
            <button
              onClick={() => setShowPlatformDrop(v => !v)}
              className="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <i className="bi bi-shop text-sm" />
              ดาวน์โหลด Excel แพลตฟอร์มอื่นๆ
              <i className={`bi bi-chevron-down text-[10px] transition-transform duration-200 ${showPlatformDrop ? 'rotate-180' : ''}`} />
            </button>

            {showPlatformDrop && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-2xl border border-[#d2d2d7]/50 shadow-xl p-1.5 z-30 animate-scale-in">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-3 pt-1 pb-1.5">เลือกแพลตฟอร์ม</p>
                {platformOptions.map(opt => (
                  <button
                    key={opt.label}
                    onClick={() => { opt.fn(); setShowPlatformDrop(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-700 hover:bg-zinc-50 hover:text-black transition-colors cursor-pointer"
                  >
                    <i className={`${opt.icon} text-sm ${opt.color}`} />
                    {opt.label}
                    <Download className="w-3 h-3 ml-auto text-zinc-300" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Download className="w-4.5 h-4.5" />
            ดาวน์โหลด Excel
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Printer className="w-4.5 h-4.5" />
            พิมพ์ (Print)
          </button>
        </div>
      </div>

      {/* Selector Filters (Hidden on Print) */}
      <div className="no-print bg-white p-4.5 rounded-2xl border border-[#d2d2d7]/50 shadow-xs flex flex-wrap gap-4 items-center">
        <span className="text-sm font-bold text-zinc-650">ตัวกรองรายงาน:</span>
        
        <select
          value={selectedBrand}
          onChange={(e) => setSelectedBrand(e.target.value)}
          className="px-3.5 py-2 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-sm text-zinc-700 focus:outline-hidden focus:border-black focus:bg-white transition-all"
        >
          <option value="All">ทุกแบรนด์สินค้า</option>
          {brands.map(b => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3.5 py-2 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-sm text-zinc-700 focus:outline-hidden focus:border-black focus:bg-white transition-all"
        >
          <option value="All">ทุกหมวดหมู่</option>
          {categories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3.5 py-2 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-sm text-zinc-700 focus:outline-hidden focus:border-black focus:bg-white transition-all"
        >
          <option value="All">สถานะทั้งหมด</option>
          <option value="Active">เปิดใช้งาน (Active)</option>
          <option value="Inactive">ปิดใช้งาน (Inactive)</option>
        </select>

        <span className="text-xs text-[#555557] font-medium ml-auto">
          ข้อมูล ณ วันที่: {new Date().toLocaleString('th-TH')}
        </span>
      </div>

      {/* KPI Display Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 print-grid-3">
        <div className="bg-white p-5 rounded-2xl border border-[#d2d2d7]/50 shadow-xs print-card print-kpi-card">
          <p className="text-xs text-[#555557] font-bold uppercase tracking-wider">มูลค่าคงคลังรวม (ประเมิน)</p>
          <h3 className="text-2xl font-bold text-[#1d1d1f] mt-1">{totalValue.toLocaleString()} บาท</h3>
          <span className="text-xs text-[#555557] mt-0.5 block">อิงจากราคาขายปลีกคูณด้วยสต็อก</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#d2d2d7]/50 shadow-xs print-card print-kpi-card">
          <p className="text-xs text-[#555557] font-bold uppercase tracking-wider">จำนวนสินค้าคงคลังรวม</p>
          <h3 className="text-2xl font-bold text-[#1d1d1f] mt-1">{totalStock.toLocaleString()} ชิ้น</h3>
          <span className="text-xs text-[#555557] mt-0.5 block">จำนวนหน่วยผลิตภัณฑ์พร้อมขาย</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#d2d2d7]/50 shadow-xs print-card print-kpi-card">
          <p className="text-xs text-[#555557] font-bold uppercase tracking-wider">ราคาเฉลี่ยต่อผลิตภัณฑ์</p>
          <h3 className="text-2xl font-bold text-[#1d1d1f] mt-1">{averagePrice.toLocaleString()} บาท</h3>
          <span className="text-xs text-[#555557] mt-0.5 block">ราคาปลีกเฉลี่ยต่อรายการสินค้าทั้งหมด</span>
        </div>
      </div>

      {/* Printable Sheet Header */}
      <div className="hidden print-only text-center border-b pb-6 space-y-2">
        <h2 className="text-xl font-bold text-black uppercase tracking-wider">รายงานสรุปข้อมูลผลิตภัณฑ์และสถานะสต็อกสินค้า</h2>
        <h3 className="text-md font-semibold text-zinc-700">บริษัท พันธ์วาดี จำกัด</h3>
        <p className="text-xs text-zinc-500">
          เงื่อนไขรายงาน: แบรนด์ [{selectedBrand}] / หมวดหมู่ [{selectedCategory}] / สถานะ [{selectedStatus === 'All' ? 'ทั้งหมด' : selectedStatus === 'Active' ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}] • วันที่: {new Date().toLocaleString('th-TH')}
        </p>
      </div>

      {/* Report Tables */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/50 shadow-xs overflow-hidden print-card">
        <div className="p-4.5 border-b border-[#e8e8ed] no-print">
          <h4 className="text-sm font-bold text-[#1d1d1f] tracking-wide uppercase">รายละเอียดรายการออกรายงาน ({filteredProducts.length} รายการ)</h4>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-[#f5f5f7] text-[#555557] font-bold border-b border-[#d2d2d7] uppercase tracking-wider text-xs">
                <th className="p-4 w-14 text-center">ลำดับ</th>
                <th className="p-4">รหัสสินค้า</th>
                <th className="p-4">ชื่อสินค้า</th>
                <th className="p-4">แบรนด์</th>
                <th className="p-4">หมวดหมู่</th>
                <th className="p-4 text-right">ราคาขายส่ง</th>
                <th className="p-4 text-right">ราคาขายปลีก</th>
                <th className="p-4 text-right">ค่าฝา</th>
                <th className="p-4 text-center">คลัง (ชิ้น)</th>
                <th className="p-4 text-right">มูลค่ารวม (ปลีก)</th>
                <th className="p-4 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8e8ed] text-zinc-750">
              {filteredProducts.map((p, index) => (
                <tr key={p.id} className="hover:bg-[#f5f5f7]/20 transition-colors">
                  <td className="p-4 text-center font-mono text-zinc-400">{index + 1}</td>
                  <td className="p-4 font-mono font-semibold">{p.code}</td>
                  <td className="p-4 font-bold text-[#1d1d1f]">{p.name}</td>
                  <td className="p-4 font-medium">{p.brand}</td>
                  <td className="p-4 text-[#555557]">{p.category}</td>
                  <td className="p-4 text-right font-semibold">{(p.wholesalePrice || 0).toLocaleString()}</td>
                  <td className="p-4 text-right font-bold">{(p.retailPrice || 0).toLocaleString()}</td>
                  <td className="p-4 text-right text-zinc-500">{(p.capFee || 0).toLocaleString()}</td>
                  <td className="p-4 text-center">
                    <span className={p.stock === 0 ? 'text-red-600 font-bold' : ''}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="p-4 text-right font-bold text-black">
                    {((p.retailPrice || 0) * p.stock).toLocaleString()}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border whitespace-nowrap inline-block ${
                      p.status === 'Active' 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                        : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                    }`}>
                      {p.status === 'Active' ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredProducts.length > 0 && (
                <tr className="bg-[#f5f5f7]/50 font-bold border-t border-[#d2d2d7]">
                  <td colSpan="8" className="p-4 text-right text-black font-bold uppercase tracking-wider text-xs">สรุปมูลค่าคลังสินค้ารวมสุทธิ:</td>
                  <td className="p-4 text-center text-black font-bold">{totalStock.toLocaleString()} ชิ้น</td>
                  <td className="p-4 text-right text-[#0071e3] text-sm font-bold">{(totalValue).toLocaleString()} บาท</td>
                  <td className="p-4"></td>
                </tr>
              )}

            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="p-16 text-center text-[#555557] text-xs">
            ไม่มีรายการผลิตภัณฑ์ที่ตรงกับเงื่อนไขการออกเอกสาร
          </div>
        )}
      </div>

    </div>
  );
}
