import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Filter, AlertCircle, ToggleLeft, ToggleRight, Check } from 'lucide-react';

export default function StatusSettings({ products, onToggleStatus, currentUser }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [alertPopup, setAlertPopup] = useState(null);

  useEffect(() => {
    if (alertPopup) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [alertPopup]);

  // Extract unique brands and categories
  const brands = ['All', ...new Set(products.map(p => p.brand).filter(Boolean))];
  const categories = ['All', ...new Set(products.map(p => p.category).filter(Boolean))];

  const handleSetStatus = (productId, name, nextStatus) => {
    onToggleStatus(productId, nextStatus);
    const thaiStatus = nextStatus === 'Active' ? 'เปิดใช้งาน (Active)' : 'ปิดใช้งาน (Inactive)';
    setAlertPopup({
      type: nextStatus === 'Active' ? 'success-active' : 'success-inactive',
      title: 'เปลี่ยนสถานะสำเร็จ!',
      message: `เปลี่ยนสถานะสินค้า "${name}" เป็น ${thaiStatus} เรียบร้อยแล้ว`
    });
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBrand = selectedBrand === 'All' || p.brand === selectedBrand;
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesBrand && matchesCategory;
  });

  return (
    <div className="space-y-6 animate-fade-in text-[#1d1d1f]">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f]">กำหนดสถานะสินค้า</h1>
        <p className="text-sm text-[#555557] mt-1">เปิดหรือปิดใช้งานผลิตภัณฑ์เพื่อแสดงผลบนหน้าแสดงข้อมูลสินค้าและระบบคลัง</p>
      </div>

      {/* Filters bar */}
      <div className="bg-white p-5 rounded-2xl border border-[#d2d2d7]/50 shadow-xs flex flex-col md:flex-row md:items-center gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4.5 h-4.5 text-[#555557] absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="ค้นหาชื่อสินค้า รหัส SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-sm focus:outline-hidden focus:border-[#0071e3] focus:bg-white transition-all placeholder-[#555557]"
          />
        </div>

        {/* Brand Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#555557] uppercase tracking-wide whitespace-nowrap">แบรนด์:</span>
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="px-3.5 py-2.5 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-sm focus:outline-hidden focus:border-black focus:bg-white transition-all"
          >
            {brands.map(b => (
              <option key={b} value={b}>{b === 'All' ? 'ทั้งหมด' : b}</option>
            ))}
          </select>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#555557] uppercase tracking-wide whitespace-nowrap">หมวดหมู่:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3.5 py-2.5 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-sm focus:outline-hidden focus:border-black focus:bg-white transition-all"
          >
            {categories.map(c => (
              <option key={c} value={c}>{c === 'All' ? 'ทั้งหมด' : c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/50 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-[#f5f5f7] text-[#555557] font-bold border-b border-[#d2d2d7]/50 uppercase tracking-wider text-xs">
                <th className="p-4 w-20">รูปภาพ</th>
                <th className="p-4 w-32">รหัสสินค้า</th>
                <th className="p-4">ชื่อสินค้า</th>
                <th className="p-4 w-36">แบรนด์</th>
                <th className="p-4 w-36">หมวดหมู่</th>
                <th className="p-4 text-center w-40">กำหนดสถานะการจำหน่าย</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8e8ed]">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-400">
                    ไม่พบข้อมูลสินค้าลงทะเบียน
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-[#f5f5f7]/30 transition-colors">
                    <td className="p-4">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#f5f5f7] border border-[#d2d2d7]/30">
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                      </div>
                    </td>
                    <td className="p-4 font-mono font-medium text-[#1d1d1f]">{product.code}</td>
                    <td className="p-4 font-semibold text-[#1d1d1f]">{product.name}</td>
                    <td className="p-4 text-zinc-650">{product.brand || '-'}</td>
                    <td className="p-4 text-zinc-500">{product.category || '-'}</td>
                    <td className="p-4 text-center">
                      <div className="inline-flex rounded-xl border border-[#d2d2d7]/50 p-1 bg-[#f5f5f7]">
                        <button
                          type="button"
                          onClick={() => {
                            if (product.status !== 'Active') {
                              handleSetStatus(product.id, product.name, 'Active');
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer whitespace-nowrap ${
                            product.status === 'Active'
                              ? 'bg-emerald-600 text-white shadow-[0_1px_3px_rgba(5,150,105,0.25)]'
                              : 'text-zinc-650 hover:bg-white hover:text-black'
                          }`}
                        >
                          เปิดใช้งาน
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (product.status !== 'Inactive') {
                              handleSetStatus(product.id, product.name, 'Inactive');
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer whitespace-nowrap ${
                            product.status === 'Inactive'
                              ? 'bg-red-600 text-white shadow-[0_1px_3px_rgba(220,38,38,0.25)]'
                              : 'text-zinc-650 hover:bg-white hover:text-black'
                          }`}
                        >
                          ปิดใช้งาน
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Success Alert Popup Modal */}
      {alertPopup && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print animate-fade-in">
          <div onClick={() => setAlertPopup(null)} className="absolute inset-0 bg-black/15 backdrop-blur-xs" />
          <div className="relative bg-white rounded-3xl border border-[#d2d2d7]/50 max-xs:w-full max-w-xs w-full p-6 shadow-xl space-y-4 z-10 animate-scale-in text-center text-[#1d1d1f]">
            {alertPopup.type === 'success-active' ? (
              <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mx-auto animate-scale-in">
                <Check className="w-7 h-7" />
              </div>
            ) : alertPopup.type === 'success-inactive' ? (
              <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center text-red-600 mx-auto animate-scale-in">
                <Check className="w-7 h-7" />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 mx-auto animate-scale-in">
                <AlertCircle className="w-7 h-7" />
              </div>
            )}

            <div className="space-y-1.5">
              <h3 className="font-bold text-base tracking-tight">{alertPopup.title}</h3>
              <p className="text-xs text-[#555557] leading-relaxed">{alertPopup.message}</p>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => setAlertPopup(null)}
                className={`w-full py-2.5 text-white rounded-full text-xs font-semibold transition-colors cursor-pointer shadow-xs ${
                  alertPopup.type === 'success-active'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : alertPopup.type === 'success-inactive'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                ตกลง
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
