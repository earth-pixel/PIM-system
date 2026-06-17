import React, { useState } from 'react';
import { Printer, Download, FileText } from 'lucide-react';

export default function Report({ products, brands, categories }) {
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredProducts = products.filter(product => {
    const matchesBrand = selectedBrand === 'All' || product.brand === selectedBrand;
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    return matchesBrand && matchesCategory;
  });

  const totalValue = filteredProducts.reduce((acc, p) => acc + ((p.retailPrice || 0) * p.stock), 0);
  const totalStock = filteredProducts.reduce((acc, p) => acc + p.stock, 0);
  const averagePrice = filteredProducts.length > 0 
    ? Math.round(filteredProducts.reduce((acc, p) => acc + (p.retailPrice || 0), 0) / filteredProducts.length) 
    : 0;

  const handlePrint = () => window.print();

  const handleExportExcel = () => {
    const headers = [
      'รหัสสินค้า (SKU)', 
      'รหัสบาร์โค้ด', 
      'ชื่อสินค้า', 
      'แบรนด์', 
      'หมวดหมู่สินค้า', 
      'ราคาขายส่ง (บาท)', 
      'ราคาขายปลีก (บาท)', 
      'ค่าฝา (บาท)', 
      'ขนาด',
      'น้ำหนัก',
      'จำนวนสต็อก (ชิ้น)', 
      'มูลค่ารวมราคาขายปลีก (บาท)', 
      'รายละเอียดสินค้า',
      'จุดเด่นสินค้า',
      'วิธีใช้',
      'สถานะ',
      'วันที่เพิ่มข้อมูล',
      'วันที่แก้ไขข้อมูลล่าสุด'
    ];
    const rows = filteredProducts.map(p => [
      `"${p.code}"`,
      `"${p.barcode || ''}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.brand}"`,
      `"${p.category}"`,
      p.wholesalePrice || 0,
      p.retailPrice || 0,
      p.capFee || 0,
      `"${p.size || ''}"`,
      `"${p.weight || ''}"`,
      p.stock,
      (p.retailPrice || 0) * p.stock,
      `"${(p.description || '').replace(/"/g, '""')}"`,
      `"${(p.highlights || '').replace(/"/g, '""')}"`,
      `"${(p.howToUse || '').replace(/"/g, '""')}"`,
      `"${p.status === 'Active' ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}"`,
      `"${p.createdAt || ''}"`,
      `"${p.updatedAt || ''}"`
    ]);
    const csvContent = '\uFEFF'
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `PIM_Report_Phanvadee_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };



  return (
    <div className="space-y-6 animate-fade-in text-[#1d1d1f]">
      {/* Page Header (Hidden on Print) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f]">รายงานและสรุปข้อมูลสินค้า</h1>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Download className="w-4.5 h-4.5" />
            ดาวน์โหลด Excel
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <FileText className="w-4.5 h-4.5" />
            ดาวน์โหลด PDF
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

        <span className="text-xs text-[#555557] font-medium ml-auto">
          ข้อมูล ณ วันที่: {new Date().toLocaleDateString('th-TH')}
        </span>
      </div>

      {/* KPI Display Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-[#d2d2d7]/50 shadow-xs print-card">
          <p className="text-xs text-[#555557] font-bold uppercase tracking-wider">มูลค่าคงคลังรวม (ประเมิน)</p>
          <h3 className="text-2xl font-bold text-[#1d1d1f] mt-1">{totalValue.toLocaleString()} บาท</h3>
          <span className="text-xs text-[#555557] mt-0.5 block">อิงจากราคาขายปลีกคูณด้วยสต็อก</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#d2d2d7]/50 shadow-xs print-card">
          <p className="text-xs text-[#555557] font-bold uppercase tracking-wider">จำนวนสินค้าคงคลังรวม</p>
          <h3 className="text-2xl font-bold text-[#1d1d1f] mt-1">{totalStock.toLocaleString()} ชิ้น</h3>
          <span className="text-xs text-[#555557] mt-0.5 block">จำนวนหน่วยผลิตภัณฑ์พร้อมขาย</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#d2d2d7]/50 shadow-xs print-card">
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
          เงื่อนไขรายงาน: แบรนด์ [{selectedBrand}] / หมวดหมู่ [{selectedCategory}] • วันที่: {new Date().toLocaleString('th-TH')}
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
