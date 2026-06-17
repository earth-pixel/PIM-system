import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  Search, 
  List,
  Info, 
  Copy, 
  Check, 
  Trash2, 
  Edit,
  AlertTriangle,
  X,
  FileSpreadsheet,
  AlertCircle,
  Plus
} from 'lucide-react';

export default function ProductList({ 
  products, 
  brands, 
  categories, 
  currentUser, 
  setActiveTab,
  stockFilter = 'All',
  setStockFilter
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  
  const [drawerProduct, setDrawerProduct] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  React.useEffect(() => {
    if (drawerProduct) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [drawerProduct]);

  const handleCopyMarketingContent = (product) => {
    const text = `📦 ข้อมูลสินค้าสำหรับงานขายและการตลาด\n---------------------------------\nชื่อสินค้า: ${product.name}\nรหัสสินค้า (SKU): ${product.code}\nแบรนด์: ${product.brand}\nหมวดหมู่: ${product.category}\nราคาแนะนำ: ${(product.retailPrice || 0).toLocaleString()} บาท\nจำนวนในสต็อก: ${product.stock > 0 ? `${product.stock} ชิ้น` : 'สินค้าหมด (Out of Stock)'}\nรายละเอียดสินค้า:\n${product.description || 'ไม่มีรายละเอียดเพิ่มเติม'}\n---------------------------------\n*จัดเก็บโดยระบบ PIM พันธ์วาดี*`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(product.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          product.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (product.barcode && product.barcode.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesBrand = selectedBrand === 'All' || product.brand === selectedBrand;
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    const matchesStatus = selectedStatus === 'All' || product.status === selectedStatus;
    
    let matchesStock = true;
    if (stockFilter === 'Low') {
      matchesStock = product.stock <= 10;
    } else if (stockFilter === 'Out') {
      matchesStock = product.stock === 0;
    }

    return matchesSearch && matchesBrand && matchesCategory && matchesStatus && matchesStock;
  });

  return (
    <div className="space-y-6 animate-fade-in text-[#1d1d1f] relative">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f]">รายการสินค้าทั้งหมด</h1>
        </div>
      </div>

      {/* Filters Panel */}
      <div className="bg-white p-5 rounded-2xl border border-[#d2d2d7]/50 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
          
          <div className="relative md:col-span-4">
            <Search className="w-4.5 h-4.5 text-[#555557] absolute left-3 top-3" />
            <input
              type="text"
              placeholder="ค้นหาชื่อสินค้า รหัสสินค้า รายละเอียด..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-sm text-[#1d1d1f] focus:outline-hidden focus:border-[#0071e3] focus:bg-white transition-all placeholder-[#555557]"
            />
          </div>

          <div className="md:col-span-2">
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-sm text-zinc-700 focus:outline-hidden focus:border-black focus:bg-white transition-all"
            >
              <option value="All">ทุกแบรนด์สินค้า</option>
              {brands.map(brand => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-sm text-zinc-700 focus:outline-hidden focus:border-black focus:bg-white transition-all"
            >
              <option value="All">ทุกหมวดหมู่</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-sm text-zinc-700 focus:outline-hidden focus:border-black focus:bg-white transition-all"
            >
              <option value="All">สถานะทั้งหมด</option>
              <option value="Active">เปิดใช้งาน (Active)</option>
              <option value="Inactive">ปิดใช้งาน (Inactive)</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-sm text-zinc-700 focus:outline-hidden focus:border-black focus:bg-white transition-all"
            >
              <option value="All">สต็อกทั้งหมด</option>
              <option value="Low">สต็อกสินค้าต่ำ (≤ 10)</option>
              <option value="Out">สินค้าหมดสต็อก (0)</option>
            </select>
          </div>

        </div>

        <div className="flex items-center justify-between border-t border-[#f5f5f7] pt-4 text-xs text-[#555557] uppercase tracking-wider font-semibold">
          <span>พบสินค้าตรงตามเงื่อนไข <strong className="text-black font-bold">{filteredProducts.length}</strong> รายการ</span>
        </div>
      </div>

      {/* List Header Row (Visible on medium screens and up) */}
      <div className="hidden md:grid grid-cols-[50px_100px_110px_1.8fr_100px_1.2fr_80px_80px_60px_60px_70px_80px] gap-4 px-5 py-3 text-xs font-bold text-[#555557] uppercase tracking-wider border-b border-[#d2d2d7]/30 bg-[#f5f5f7] rounded-xl mb-2 items-center">
        <div>รูปภาพ</div>
        <div>รหัสสินค้า</div>
        <div>บาร์โค้ด</div>
        <div>ชื่อสินค้า</div>
        <div>แบรนด์</div>
        <div>หมวดหมู่</div>
        <div className="text-right">ราคาส่ง</div>
        <div className="text-right">ราคาปลีก</div>
        <div className="text-right">ค่าฝา</div>
        <div className="text-center">คลังคงเหลือ</div>
        <div className="text-center">สถานะ</div>
        <div className="text-right">รายละเอียด</div>
      </div>

      {/* List Layout View */}
      <div className="flex flex-col gap-3">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-2xl border border-[#d2d2d7]/50 flex flex-col md:grid md:grid-cols-[50px_100px_110px_1.8fr_100px_1.2fr_80px_80px_60px_60px_70px_80px] gap-4 p-3 hover:shadow-xs transition-all duration-200 group items-center text-sm text-[#1d1d1f]"
          >
            {/* Column 1: Thumbnail */}
            <div className="relative w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden bg-[#f5f5f7] border border-[#d2d2d7]/30">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>

            {/* Column 2: รหัสสินค้า */}
            <div className="w-full md:w-auto font-mono text-zinc-800 truncate">
              <span className="md:hidden font-bold mr-1">รหัสสินค้า: </span>{product.code}
            </div>

            {/* Column 3: บาร์โค้ด */}
            <div className="w-full md:w-auto font-mono text-zinc-700 truncate">
              <span className="md:hidden font-bold mr-1">บาร์โค้ด: </span>{product.barcode || '-'}
            </div>

            {/* Column 4: ชื่อสินค้า */}
            <div className="w-full md:w-auto font-bold text-black truncate" title={product.name}>
              <span className="md:hidden font-bold mr-1">ชื่อสินค้า: </span>{product.name}
            </div>

            {/* Column 5: แบรนด์ */}
            <div className="w-full md:w-auto font-bold text-zinc-850 truncate">
              <span className="md:hidden font-bold mr-1">แบรนด์: </span>{product.brand}
            </div>

            {/* Column 6: หมวดหมู่ */}
            <div className="w-full md:w-auto text-zinc-700 truncate" title={product.category}>
              <span className="md:hidden font-bold mr-1">หมวดหมู่: </span>{product.category}
            </div>

            {/* Column 7: ราคาขายส่ง */}
            <div className="w-full md:w-auto md:text-right font-bold text-zinc-950">
              <span className="md:hidden font-bold mr-1">ขายส่ง: </span>{(product.wholesalePrice || 0).toLocaleString()} ฿
            </div>

            {/* Column 8: ราคาขายปลีก */}
            <div className="w-full md:w-auto md:text-right font-extrabold text-black">
              <span className="md:hidden font-bold mr-1">ขายปลีก: </span>{(product.retailPrice || 0).toLocaleString()} ฿
            </div>

            {/* Column 9: ค่าฝา */}
            <div className="w-full md:w-auto md:text-right text-zinc-700 font-semibold">
              <span className="md:hidden font-bold mr-1">ค่าฝา: </span>{(product.capFee || 0).toLocaleString()} ฿
            </div>

            {/* Column 10: คลังคงเหลือ */}
            <div className="w-full md:w-auto md:text-center font-bold">
              <span className="md:hidden font-bold mr-1">คลัง: </span>
              <span className={product.stock <= 10 ? 'text-red-650 font-black' : 'text-zinc-800'}>
                {product.stock}
              </span>
            </div>

            {/* Column 11: สถานะ */}
            <div className="w-full md:w-auto md:text-center">
              <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border whitespace-nowrap inline-block ${
                product.status === 'Active'
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                  : 'bg-zinc-100 text-zinc-500 border-zinc-200'
              }`}>
                {product.status === 'Active' ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
              </span>
            </div>

            {/* Column 12: จัดการ */}
            <div className="flex items-center gap-1.5 w-full md:w-auto md:justify-end">
              <button
                onClick={() => setDrawerProduct(product)}
                className="p-1.5 rounded-lg border border-[#d2d2d7] bg-white hover:bg-[#f5f5f7] text-[#555557] hover:text-black transition-all cursor-pointer"
                title="ดูรายละเอียดสินค้า"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/50 p-16 text-center space-y-3">
          <FileSpreadsheet className="w-12 h-12 text-[#555557] mx-auto" />
          <h3 className="font-semibold text-[#1d1d1f] text-sm uppercase tracking-wider">ไม่พบผลการค้นหา</h3>
          <p className="text-[#555557] text-xs max-w-sm mx-auto">
            ไม่พบสินค้าที่ตรงตามเงื่อนไขที่เลือก กรุณาลองปรับเปลี่ยนตัวเลือกตัวกรองใหม่อีกครั้ง
          </p>
        </div>
      )}

      {/* Product Detail Centered Pop-up Modal */}
      {drawerProduct && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 no-print animate-fade-in">
          <div 
            onClick={() => setDrawerProduct(null)}
            className="absolute inset-0 bg-black/20 backdrop-blur-md transition-opacity"
          />

          <div className="relative bg-white rounded-3xl border border-[#d2d2d7]/40 shadow-2xl max-w-lg w-full max-h-[calc(100vh_-_3rem)] md:max-h-[calc(100vh_-_4rem)] flex flex-col z-10 animate-scale-in overflow-hidden text-[#1d1d1f]">
            {/* Header */}
            <div className="p-5 border-b border-[#e8e8ed] flex items-center justify-between flex-shrink-0">
              <div>
                <span className="text-xs font-mono text-[#555557] tracking-wider font-semibold uppercase">{drawerProduct.code}</span>
                <h3 className="font-bold text-[#1d1d1f] text-sm mt-0.5 uppercase tracking-wide">รายละเอียดของสินค้า</h3>
              </div>
              <button 
                onClick={() => setDrawerProduct(null)}
                className="p-2 text-zinc-400 hover:text-black rounded-lg hover:bg-[#f5f5f7] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable details */}
            <div className="flex-1 overflow-y-auto min-h-0 p-5 space-y-5 text-xs text-[#1d1d1f]">
              {/* Product Photo */}
              <div className="aspect-video w-full rounded-xl overflow-hidden border border-[#d2d2d7]/40 bg-[#f5f5f7] flex-shrink-0">
                <img 
                  src={drawerProduct.image} 
                  alt={drawerProduct.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* General Metadata */}
              <div className="bg-[#f5f5f7] p-4 rounded-xl border border-[#d2d2d7]/40 space-y-2.5">
                <div className="flex justify-between border-b border-[#d2d2d7]/20 pb-1.5">
                  <span className="text-zinc-800 font-bold">แบรนด์</span>
                  <span className="font-extrabold uppercase text-black">{drawerProduct.brand}</span>
                </div>
                <div className="flex justify-between border-b border-[#d2d2d7]/20 pb-1.5">
                  <span className="text-zinc-800 font-bold">หมวดหมู่สินค้า</span>
                  <span className="font-extrabold text-black">{drawerProduct.category}</span>
                </div>
                <div className="flex justify-between border-b border-[#d2d2d7]/20 pb-1.5">
                  <span className="text-zinc-800 font-bold">รหัสสินค้า / SKU</span>
                  <span className="font-extrabold text-black">{drawerProduct.code}</span>
                </div>
                <div className="flex justify-between border-b border-[#d2d2d7]/20 pb-1.5">
                  <span className="text-zinc-800 font-bold">รหัสบาร์โค้ด</span>
                  <span className="font-extrabold text-black">{drawerProduct.barcode || '-'}</span>
                </div>
                <div className="flex justify-between border-b border-[#d2d2d7]/20 pb-1.5">
                  <span className="text-zinc-800 font-bold">ขนาด</span>
                  <span className="font-extrabold text-black">{drawerProduct.size || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-800 font-bold">น้ำหนัก</span>
                  <span className="font-extrabold text-black">{drawerProduct.weight || '-'}</span>
                </div>
              </div>

              {/* Pricing & Stock Details */}
              <div className="bg-[#f5f5f7] p-4 rounded-xl border border-[#d2d2d7]/40 space-y-2.5">
                <div className="flex justify-between border-b border-[#d2d2d7]/20 pb-1.5">
                  <span className="text-zinc-800 font-bold">ราคาขายส่ง</span>
                  <span className="font-extrabold text-black">{(drawerProduct.wholesalePrice || 0).toLocaleString()} บาท</span>
                </div>
                <div className="flex justify-between border-b border-[#d2d2d7]/20 pb-1.5">
                  <span className="text-zinc-800 font-bold">ราคาขายปลีก</span>
                  <span className="font-extrabold text-blue-700 text-[13px]">{(drawerProduct.retailPrice || 0).toLocaleString()} บาท</span>
                </div>
                <div className="flex justify-between border-b border-[#d2d2d7]/20 pb-1.5">
                  <span className="text-zinc-800 font-bold">ค่าฝา</span>
                  <span className="font-extrabold text-black">{(drawerProduct.capFee || 0).toLocaleString()} บาท</span>
                </div>
                <div className="flex justify-between border-b border-[#d2d2d7]/20 pb-1.5">
                  <span className="text-zinc-800 font-bold">จำนวนคลังคงเหลือ</span>
                  <span className={`font-extrabold ${drawerProduct.stock <= 10 ? 'text-red-700 text-[13px]' : 'text-black'}`}>{drawerProduct.stock} ชิ้น</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-800 font-bold">สถานะระบบ</span>
                  <span className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border ${
                    drawerProduct.status === 'Active' 
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                      : 'bg-zinc-200 text-zinc-800 border-zinc-400'
                  }`}>{drawerProduct.status === 'Active' ? 'เปิดใช้งาน (Active)' : 'ปิดใช้งาน (Inactive)'}</span>
                </div>
              </div>

              {/* Custom specs */}
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-zinc-800 block uppercase tracking-wide">ชื่อผลิตภัณฑ์สินค้า</label>
                  <div className="text-black font-extrabold text-sm leading-normal mt-1">{drawerProduct.name}</div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-800 block uppercase tracking-wide">จุดเด่นสินค้า</label>
                  <div className="text-xs text-zinc-900 font-semibold leading-relaxed bg-[#f5f5f7] p-3 rounded-xl border border-[#d2d2d7]/40 whitespace-pre-wrap mt-1">
                    {drawerProduct.highlights || '-'}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-800 block uppercase tracking-wide">วิธีใช้</label>
                  <div className="text-xs text-zinc-900 font-semibold leading-relaxed bg-[#f5f5f7] p-3 rounded-xl border border-[#d2d2d7]/40 whitespace-pre-wrap mt-1">
                    {drawerProduct.howToUse || '-'}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-800 block uppercase tracking-wide">รายละเอียดสินค้า</label>
                  <div className="text-xs text-zinc-900 font-semibold leading-relaxed bg-[#f5f5f7] p-3 rounded-xl border border-[#d2d2d7]/40 whitespace-pre-wrap mt-1">
                    {drawerProduct.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
                  </div>
                </div>
              </div>

              {/* Audit Logs */}
              <div className="pt-2 text-[10px] text-zinc-700 font-semibold space-y-1 bg-[#f5f5f7] p-3 rounded-xl border border-[#d2d2d7]/40">
                <div>• วันที่เพิ่มข้อมูล: {drawerProduct.createdAt || '-'}</div>
                <div>• วันที่แก้ไขล่าสุด: {drawerProduct.updatedAt || '-'}</div>
                <div>• ผู้บันทึกข้อมูลล่าสุด: {drawerProduct.updatedBy || 'ไม่ระบุ'}</div>
              </div>
            </div>

            {/* Sticky Actions */}
            <div className="p-4 border-t border-[#e8e8ed] bg-[#f5f5f7] flex gap-2 flex-shrink-0">
              <button
                onClick={() => handleCopyMarketingContent(drawerProduct)}
                className={`w-full py-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  copiedId === drawerProduct.id 
                    ? 'bg-black text-white border-black shadow-xs' 
                    : 'bg-white hover:bg-[#f5f5f7] text-[#1d1d1f] border-[#d2d2d7]'
                }`}
              >
                {copiedId === drawerProduct.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedId === drawerProduct.id ? 'คัดลอกข้อมูลแล้ว!' : 'คัดลอกสำหรับงานขาย'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
