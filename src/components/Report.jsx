import { useState } from 'react';
import { Printer, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function Report({ products, brands, categories, addActivityLog }) {
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const filteredProducts = products.filter(product => {
    const matchesBrand = selectedBrand === 'All' || product.brand === selectedBrand;
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    const matchesStatus = selectedStatus === 'All' || product.status === selectedStatus;
    return matchesBrand && matchesCategory && matchesStatus;
  });

  const activeCount = filteredProducts.filter(p => p.status === 'Active').length;
  const inactiveCount = filteredProducts.filter(p => p.status !== 'Active').length;
  const handlePrint = () => {
    window.print();
    if (addActivityLog) {
      const filterText = `แบรนด์: ${selectedBrand === 'All' ? 'ทั้งหมด' : selectedBrand}, หมวดหมู่: ${selectedCategory === 'All' ? 'ทั้งหมด' : selectedCategory}, สถานะ: ${selectedStatus === 'All' ? 'ทั้งหมด' : selectedStatus === 'Active' ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}`;
      addActivityLog(`พิมพ์รายงานข้อมูลสินค้า (จำนวน ${filteredProducts.length} รายการ, ตัวกรอง - ${filterText})`);
    }
  };

  const downloadViaRedirect = async (base64Data, filename) => {
    try {
      const response = await fetch('/api/store-download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: base64Data,
          filename: filename
        })
      });
      if (!response.ok) throw new Error('Failed to store download on server');
      const res = await response.json();
      if (res.id) {
        window.location.assign(`/api/download?id=${res.id}`);
        return;
      }
    } catch (err) {
      console.error('Server download failed, falling back to local download:', err);
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
    link.style.position = 'absolute';
    link.style.top = '-9999px';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(url);
    }, 10000);
  };

  // ─────────────────────────────────────────────────────────────
// ฟังก์ชันดาวน์โหลด Excel
// ─────────────────────────────────────────────────────────────
const downloadXLSX = async (headers, rows, filename) => {
  try {
    // รวม Header และข้อมูลทั้งหมด
    const data = [headers, ...rows];

    // สร้าง Worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // กำหนดความกว้างคอลัมน์
    worksheet['!cols'] = [
      { wch: 20 }, // SKU
      { wch: 20 }, // Barcode
      { wch: 40 }, // Product Name
      { wch: 20 }, // Brand
      { wch: 20 }, // Category
      { wch: 18 }, // Wholesale Price
      { wch: 18 }, // Retail Price
      { wch: 15 }, // Cap Fee
      { wch: 15 }, // Size
      { wch: 15 }, // Weight
      { wch: 20 }, // FDA
      { wch: 20 }, // TISI
      { wch: 15 }, // Status
      { wch: 25 }, // Created At
      { wch: 25 }  // Updated At
    ];

    // สร้าง Workbook
    const workbook = XLSX.utils.book_new();

    // เพิ่ม Worksheet ลง Workbook
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      'รายงานสินค้า'
    );

    // Generate base64 and export using the server download endpoint
    const base64 = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
    await downloadViaRedirect(base64, filename);

  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการ Export Excel:', error);
    alert('ไม่สามารถดาวน์โหลดรายงานได้');
  }
};


// ─────────────────────────────────────────────────────────────
// Export รายงานสินค้า
// ─────────────────────────────────────────────────────────────
const handleExportExcel = async () => {

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
    'หมายเลข อย.',
    'หมายเลข มอก.',
    'สถานะ',
    'วันที่เพิ่มข้อมูล',
    'วันที่แก้ไขข้อมูลล่าสุด'
  ];

  const rows = filteredProducts.map(p => [
    p.code || '',
    p.barcode || '',
    p.name || '',
    p.brand || '',
    p.category || '',
    Number(p.wholesalePrice || 0),
    Number(p.retailPrice || 0),
    Number(p.capFee || 0),
    p.size || '',
    p.weight || '',
    p.fdaNumber || '',
    p.tisiNumber || '',
    p.status === 'Active'
      ? 'เปิดใช้งาน'
      : 'ปิดใช้งาน',
    p.createdAt
      ? new Date(p.createdAt.replace(' ', 'T')).toLocaleString('th-TH')
      : '',
    p.updatedAt
      ? new Date(p.updatedAt.replace(' ', 'T')).toLocaleString('th-TH')
      : ''
  ]);

  // ชื่อไฟล์
  const filename = `PIM_Report_Phanvadee_${new Date().toLocaleDateString('sv-SE')}.xlsx`;
  // ดาวน์โหลดไฟล์
  await downloadXLSX(
    headers,
    rows,
    filename
  );
  if (addActivityLog) {
    const filterText = `แบรนด์: ${selectedBrand === 'All' ? 'ทั้งหมด' : selectedBrand}, หมวดหมู่: ${selectedCategory === 'All' ? 'ทั้งหมด' : selectedCategory}, สถานะ: ${selectedStatus === 'All' ? 'ทั้งหมด' : selectedStatus === 'Active' ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}`;
    addActivityLog(`ดาวน์โหลดรายงานสินค้าเป็นไฟล์ Excel (จำนวน ${filteredProducts.length} รายการ, ตัวกรอง - ${filterText})`);
  }
};

  return (
    <div className="space-y-6 animate-fade-in text-[#1d1d1f]">
      {/* Page Header (Hidden on Print) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f]">รายงานและสรุปข้อมูลสินค้า</h1>
        </div>

        <div className="flex gap-2 items-center">
          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            ดาวน์โหลดรายงาน
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 print-grid-2">
        <div className="bg-white p-5 rounded-2xl border border-[#d2d2d7]/50 shadow-xs print-card print-kpi-card">
          <p className="text-xs text-[#555557] font-bold uppercase tracking-wider">จำนวนรายการสินค้าทั้งหมด</p>
          <h3 className="text-2xl font-bold text-[#1d1d1f] mt-1">{filteredProducts.length.toLocaleString()} รายการ</h3>

        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#d2d2d7]/50 shadow-xs print-card print-kpi-card">
          <p className="text-xs text-[#555557] font-bold uppercase tracking-wider">จำนวนสถานะการเปิดและปิดใช้งาน</p>
          <h3 className="text-2xl font-bold text-[#1d1d1f] mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>เปิดใช้งาน: {activeCount.toLocaleString()}</span>
            <span className="text-[#d2d2d7] font-light hidden sm:inline">|</span>
            <span>ปิดใช้งาน: {inactiveCount.toLocaleString()}</span>
          </h3>
        </div>
      </div>

      {/* Printable Sheet Header */}
      <div className="hidden print-only text-center border-b pb-6 space-y-2">
        <h2 className="text-xl font-bold text-black uppercase tracking-wider">รายงานสรุปข้อมูลผลิตภัณฑ์</h2>
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