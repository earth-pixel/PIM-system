import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Image as ImageIcon, 
  X, 
  Save, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  AlertTriangle, 
  Check, 
  AlertCircle, 
  List, 
  Info, 
  Copy, 
  FileSpreadsheet 
} from 'lucide-react';

const PRESET_IMAGES = [
  { url: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?q=80&w=400&auto=format&fit=crop', label: 'Pomade Waxes' },
  { url: 'https://images.unsplash.com/photo-1595853035070-59a39fe84de3?q=80&w=400&auto=format&fit=crop', label: 'Color Cream' },
  { url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=400&auto=format&fit=crop', label: 'Hair Dryer' },
  { url: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?q=80&w=400&auto=format&fit=crop', label: 'Matte Clay' },
  { url: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?q=80&w=400&auto=format&fit=crop', label: 'Hair Mask' },
  { url: 'https://images.unsplash.com/photo-1527799863830-53a84e6ad82b?q=80&w=400&auto=format&fit=crop', label: 'Scissors Set' }
];

export function ProductList({ 
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

export default function ProductManage({ 
  editProduct, 
  onCancelEdit, 
  onSaveProduct, 
  brands, 
  categories, 
  currentUser,
  products = [],
  onDeleteProduct,
  onEditProduct
}) {
  const [code, setCode] = useState('');
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [wholesalePrice, setWholesalePrice] = useState('');
  const [retailPrice, setRetailPrice] = useState('');
  const [capFee, setCapFee] = useState('');
  const [description, setDescription] = useState('');
  const [highlights, setHighlights] = useState('');
  const [howToUse, setHowToUse] = useState('');
  const [image, setImage] = useState('');
  const [size, setSize] = useState('');
  const [weight, setWeight] = useState('');
  const [stock, setStock] = useState('');
  const [status, setStatus] = useState('Active');
  const [createdAt, setCreatedAt] = useState('');
  
  const [errorMsg, setErrorMsg] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [productToDelete, setProductToDelete] = useState(null);
  const [alertPopup, setAlertPopup] = useState(null);
  const [editRemark, setEditRemark] = useState('');

  useEffect(() => {
    if (alertPopup && alertPopup.type === 'success') {
      const timer = setTimeout(() => {
        onSaveProduct(alertPopup.data);
        resetForm();
        setAlertPopup(null);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [alertPopup]);

  useEffect(() => {
    if (editProduct) {
      setCode(editProduct.code || '');
      setBarcode(editProduct.barcode || '');
      setName(editProduct.name || '');
      setBrand(editProduct.brand || '');
      setCategory(editProduct.category || '');
      setWholesalePrice(editProduct.wholesalePrice || '');
      setRetailPrice(editProduct.retailPrice || '');
      setCapFee(editProduct.capFee || '');
      setDescription(editProduct.description || '');
      setHighlights(editProduct.highlights || '');
      setHowToUse(editProduct.howToUse || '');
      setImage(editProduct.image || '');
      setSize(editProduct.size || '');
      setWeight(editProduct.weight || '');
      setStock(editProduct.stock || '');
      setStatus(editProduct.status || 'Active');
      setCreatedAt(editProduct.createdAt || '');
      setEditRemark('');
      setErrorMsg('');
      setShowForm(true);
    } else {
      resetForm();
      setShowForm(false);
    }
  }, [editProduct]);

  useEffect(() => {
    if (!editProduct) {
      if (brands.length > 0) setBrand(brands[0]);
      if (categories.length > 0) setCategory(categories[0]);
    }
  }, [brands, categories, editProduct]);

  useEffect(() => {
    if (showForm) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showForm]);

  const resetForm = () => {
    setCode('');
    setBarcode('');
    setName('');
    if (brands.length > 0) setBrand(brands[0]);
    if (categories.length > 0) setCategory(categories[0]);
    setWholesalePrice('');
    setRetailPrice('');
    setCapFee('');
    setDescription('');
    setHighlights('');
    setHowToUse('');
    setImage('');
    setSize('');
    setWeight('');
    setStock('');
    setStatus('Active');
    setCreatedAt('');
    setErrorMsg('');
    setEditRemark('');
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('ขนาดรูปภาพต้องไม่เกิน 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result);
      setErrorMsg('');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!code.trim()) {
      setAlertPopup({ type: 'error', title: 'กรอกข้อมูลไม่ครบถ้วน', message: 'กรุณากรอกรหัสสินค้า' });
      return;
    }
    const isDuplicate = products.some(p => p.code.toLowerCase() === code.trim().toLowerCase() && (!editProduct || p.id !== editProduct.id));
    if (isDuplicate) {
      setAlertPopup({ type: 'error', title: 'รหัสสินค้าซ้ำในระบบ', message: `รหัสสินค้า "${code.trim()}" ถูกใช้ลงทะเบียนสินค้าชิ้นอื่นแล้ว` });
      return;
    }
    if (!name.trim()) {
      setAlertPopup({ type: 'error', title: 'กรอกข้อมูลไม่ครบถ้วน', message: 'กรุณากรอกชื่อสินค้า/ผลิตภัณฑ์' });
      return;
    }
    if (wholesalePrice === '' || isNaN(wholesalePrice) || Number(wholesalePrice) < 0) {
      setAlertPopup({ type: 'error', title: 'ข้อมูลราคาไม่ถูกต้อง', message: 'กรุณาระบุราคาขายส่งที่ถูกต้อง' });
      return;
    }
    if (retailPrice === '' || isNaN(retailPrice) || Number(retailPrice) < 0) {
      setAlertPopup({ type: 'error', title: 'ข้อมูลราคาไม่ถูกต้อง', message: 'กรุณาระบุราคาขายปลีกที่ถูกต้อง' });
      return;
    }
    if (capFee === '' || isNaN(capFee) || Number(capFee) < 0) {
      setAlertPopup({ type: 'error', title: 'ราคาไม่ถูกต้อง', message: 'กรุณากรอกค่าฝาให้ถูกต้อง (ระบุ 0 บาทหากไม่มี)' });
      return;
    }
    if (stock === '' || isNaN(stock) || Number(stock) < 0) {
      setAlertPopup({ type: 'error', title: 'จำนวนสินค้าไม่ถูกต้อง', message: 'กรุณากรอกจำนวนสินค้าให้ถูกต้อง' });
      return;
    }
    if (editProduct && !editRemark.trim()) {
      setAlertPopup({ type: 'error', title: 'ข้อมูลไม่ครบถ้วน', message: 'กรุณากรอกหมายเหตุการแก้ไข' });
      return;
    }

    const currentFormattedDate = new Date().toISOString().slice(0, 16).replace('T', ' ');

    const newProductData = {
      id: editProduct ? editProduct.id : Date.now().toString(),
      code: code.trim(),
      barcode: barcode.trim(),
      name: name.trim(),
      brand,
      category,
      wholesalePrice: Number(wholesalePrice),
      retailPrice: Number(retailPrice),
      capFee: Number(capFee),
      description: description.trim(),
      highlights: highlights.trim(),
      howToUse: howToUse.trim(),
      image: image || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&auto=format&fit=crop&q=60',
      size: size.trim(),
      weight: weight.trim(),
      stock: Number(stock),
      status,
      createdAt: editProduct ? (createdAt || currentFormattedDate) : currentFormattedDate,
      updatedAt: currentFormattedDate,
      updatedBy: currentUser.username,
      editRemark: editProduct ? editRemark.trim() : ''
    };

    setAlertPopup({ type: 'success', title: 'บันทึกข้อมูลสำเร็จ', message: 'ข้อมูลสินค้าถูกบันทึกเรียบร้อยแล้ว', data: newProductData });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f]">จัดการข้อมูลสินค้า</h1>
        </div>
        <div className="flex flex-wrap gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="px-4 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            เพิ่มสินค้าใหม่
          </button>
        </div>
      </div>

      {/* Search Panel */}
      <div className="bg-white p-5 rounded-2xl border border-[#d2d2d7]/50 shadow-xs">
        <div className="relative max-w-md">
          <Search className="w-4.5 h-4.5 text-[#555557] absolute left-3 top-3" />
          <input
            type="text"
            placeholder="ค้นหาชื่อสินค้า รหัสสินค้า..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-sm text-[#1d1d1f] focus:outline-hidden focus:border-[#0071e3] focus:bg-white transition-all placeholder-[#555557]"
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/50 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e8e8ed]">
          <h4 className="text-sm font-bold text-[#1d1d1f] tracking-wide uppercase">รายชื่อสินค้าทั้งหมด</h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-[#f5f5f7] text-[#555557] font-bold border-b border-[#d2d2d7]/50 uppercase tracking-wider text-xs">
                <th className="p-3 w-16">รูปภาพ</th>
                <th className="p-3">รหัสสินค้า</th>
                <th className="p-3">ชื่อสินค้า</th>
                <th className="p-3">แบรนด์</th>
                <th className="p-3">หมวดหมู่</th>
                <th className="p-3 text-right">ราคาส่ง</th>
                <th className="p-3 text-right">ราคาปลีก</th>
                <th className="p-3 text-center">คลัง</th>
                <th className="p-3 text-center">สถานะ</th>
                <th className="p-3 text-center w-28">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f5f7]">
              {products
                .filter(p =>
                  p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  p.code.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map(product => (
                  <tr key={product.id} className="hover:bg-[#fafafa] transition-colors group text-[#1d1d1f]">
                    <td className="p-3 w-16">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#f5f5f7] border border-[#d2d2d7]/30 flex-shrink-0">
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="font-mono text-xs text-zinc-700 whitespace-nowrap">{product.code}</span>
                    </td>
                    <td className="p-3 min-w-[160px]">
                      <span className="font-semibold text-black">{product.name}</span>
                    </td>
                    <td className="p-3 whitespace-nowrap text-zinc-700">{product.brand}</td>
                    <td className="p-3 whitespace-nowrap text-zinc-600 text-xs">{product.category}</td>
                    <td className="p-3 text-right whitespace-nowrap font-bold text-zinc-900">{(product.wholesalePrice || 0).toLocaleString()} ฿</td>
                    <td className="p-3 text-right whitespace-nowrap font-extrabold text-black">{(product.retailPrice || 0).toLocaleString()} ฿</td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <span className={`font-bold ${product.stock <= 10 ? 'text-red-600' : 'text-zinc-800'}`}>{product.stock}</span>
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${
                        product.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                          : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                      }`}>
                        {product.status === 'Active' ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                      </span>
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <div className="flex justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            onEditProduct(product);
                            setShowForm(true);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="แก้ไขข้อมูลสินค้า"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {currentUser.role === 'admin' && (
                          <button
                            type="button"
                            onClick={() => setProductToDelete(product)}
                            className="p-1.5 text-red-650 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="ลบสินค้า"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Single Product Confirmation Modal */}
      {productToDelete && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print animate-fade-in">
          <div onClick={() => setProductToDelete(null)} className="absolute inset-0 bg-black/15 backdrop-blur-xs" />
          <div className="relative bg-white rounded-3xl border border-[#d2d2d7]/50 max-sm:w-full max-w-sm w-full p-6 shadow-lg space-y-4.5 z-10 animate-scale-in text-[#1d1d1f]">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-650">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h2 className="font-bold text-sm uppercase tracking-wide">ยืนยันลบรายการสินค้า?</h2>
            </div>
            <div className="flex gap-2.5 pt-2 text-xs font-semibold">
              <button
                onClick={() => setProductToDelete(null)}
                className="flex-1 py-2.5 border border-[#d2d2d7] text-[#1d1d1f] rounded-full hover:bg-[#f5f5f7] transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  const deletedName = productToDelete.name;
                  onDeleteProduct(productToDelete.id);
                  setProductToDelete(null);
                  setAlertPopup({
                    type: 'success-delete',
                    title: 'ลบรายการสินค้าสำเร็จ!',
                    message: `ลบสินค้า "${deletedName}" ออกจากคลังสินค้าเรียบร้อยแล้ว!`
                  });
                }}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors cursor-pointer"
              >
                ลบสินค้า
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Product Form Modal (Beautiful Pop-up Modal) */}
      {showForm && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 no-print animate-fade-in">
          <div 
            onClick={() => {
              if (editProduct) {
                onCancelEdit();
              } else {
                resetForm();
                setShowForm(false);
              }
            }} 
            className="absolute inset-0 bg-black/20 backdrop-blur-md transition-opacity animate-fade-in" 
          />

          <div className="relative bg-white rounded-3xl border border-[#d2d2d7]/40 shadow-2xl max-w-4xl w-full max-h-[90vh] md:max-h-[85vh] flex flex-col z-10 animate-scale-in overflow-hidden">
            <div className="px-6 py-5 border-b border-[#e8e8ed] flex items-center justify-between flex-shrink-0 bg-white">
              <div>
                <h3 className="text-lg font-bold text-[#1d1d1f] tracking-tight">
                  {editProduct ? 'แก้ไขรายละเอียดสินค้า' : 'เพิ่มสินค้าใหม่ลงในระบบ'}
                </h3>
                <p className="text-xs text-[#555557] mt-1">
                  {editProduct ? 'ปรับปรุงข้อมูลการลงทะเบียนสินค้าที่มีอยู่ในระบบ PIM' : 'กรอกข้อมูลรายละเอียดสินค้าด้านล่างเพื่อเพิ่มสินค้าชิ้นใหม่เข้าสู่คลังระบบ'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (editProduct) {
                    onCancelEdit();
                  } else {
                    resetForm();
                    setShowForm(false);
                  }
                }}
                className="p-2 rounded-xl text-[#555557] hover:bg-[#f5f5f7] hover:text-black transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 p-4 bg-[#f5f5f7]/40">
              <form id="product-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 min-w-0 space-y-4">
                  <div className="bg-white p-4.5 rounded-2xl border border-[#d2d2d7]/50 shadow-xs space-y-4">
                    {errorMsg && (
                      <div className="p-3.5 text-sm bg-red-50 text-red-600 border border-red-100/50 rounded-xl animate-fade-in">
                        {errorMsg}
                      </div>
                    )}
                    <div className="border-b border-[#f5f5f7] pb-3.5">
                      <h3 className="text-xs font-extrabold text-[#1d1d1f] uppercase tracking-wider mb-2.5">ข้อมูลทั่วไปของสินค้า</h3>
                      <div className="space-y-3.5">
                        {/* แถว 1: รหัสสินค้า และ รหัสบาร์โค้ด */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="min-w-0">
                            <label className="form-label min-h-[28px] flex items-end pb-1">รหัสสินค้า<span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              value={code}
                              onChange={(e) => setCode(e.target.value)}
                              className="form-input min-w-0 bg-[#f5f5f7] font-mono focus:bg-white"
                            />
                          </div>
                          <div className="min-w-0">
                            <label className="form-label min-h-[28px] flex items-end pb-1">รหัสบาร์โค้ด</label>
                            <input
                              type="text"
                              value={barcode}
                              onChange={(e) => setBarcode(e.target.value)}
                              className="form-input min-w-0 bg-[#f5f5f7] focus:bg-white"
                            />
                          </div>
                        </div>

                        {/* แถว 2: ชื่อสินค้า */}
                        <div className="min-w-0">
                          <label className="form-label min-h-[28px] flex items-end pb-1">ชื่อสินค้าผลิตภัณฑ์<span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="form-input min-w-0 bg-[#f5f5f7] focus:bg-white"
                          />
                        </div>

                        {/* แถว 3: เลือกหมวดหมู่กับแบรนด์ */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="min-w-0">
                            <label className="form-label min-h-[28px] flex items-end pb-1">หมวดหมู่สินค้า</label>
                            <select
                              value={category}
                              onChange={(e) => setCategory(e.target.value)}
                              className="form-input min-w-0 bg-[#f5f5f7] text-zinc-800 focus:bg-white"
                            >
                              {categories.map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>
                          <div className="min-w-0">
                            <label className="form-label min-h-[28px] flex items-end pb-1">แบรนด์สินค้า</label>
                            <select
                              value={brand}
                              onChange={(e) => setBrand(e.target.value)}
                              className="form-input min-w-0 bg-[#f5f5f7] text-zinc-800 focus:bg-white"
                            >
                              {brands.map(b => (
                                <option key={b} value={b}>{b}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* แถว 4: ขนาด และน้ำหนัก */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="min-w-0">
                            <label className="form-label min-h-[28px] flex items-end pb-1">ขนาด</label>
                            <input
                              type="text"
                              value={size}
                              onChange={(e) => setSize(e.target.value)}
                              className="form-input min-w-0 bg-[#f5f5f7] focus:bg-white"
                            />
                          </div>
                          <div className="min-w-0">
                            <label className="form-label min-h-[28px] flex items-end pb-1">น้ำหนัก</label>
                            <input
                              type="text"
                              value={weight}
                              onChange={(e) => setWeight(e.target.value)}
                              className="form-input min-w-0 bg-[#f5f5f7] focus:bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="border-b border-[#f5f5f7] pb-3.5">
                      <h3 className="text-xs font-extrabold text-[#1d1d1f] uppercase tracking-wider mb-2.5">ข้อมูลราคาและคลังสินค้า</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
                        <div className="min-w-0">
                          <label className="form-label min-h-[44px] flex items-end pb-1">ราคาขายส่ง<span className="text-red-500">*</span></label>
                          <input
                            type="number"
                            min="0"
                            value={wholesalePrice}
                            onChange={(e) => setWholesalePrice(e.target.value)}
                            className="form-input min-w-0 bg-[#f5f5f7] focus:bg-white"
                          />
                        </div>
                        <div className="min-w-0">
                          <label className="form-label min-h-[44px] flex items-end pb-1">ราคาขายปลีก<span className="text-red-500">*</span></label>
                          <input
                            type="number"
                            min="0"
                            value={retailPrice}
                            onChange={(e) => setRetailPrice(e.target.value)}
                            className="form-input min-w-0 bg-[#f5f5f7] focus:bg-white text-black"
                          />
                        </div>
                        <div className="min-w-0">
                          <label className="form-label min-h-[44px] flex items-end pb-1">ค่าฝา<span className="text-red-500">*</span></label>
                          <input
                            type="number"
                            min="0"
                            value={capFee}
                            onChange={(e) => setCapFee(e.target.value)}
                            className="form-input min-w-0 bg-[#f5f5f7] focus:bg-white text-black"
                          />
                        </div>
                        <div className="min-w-0">
                          <label className="form-label min-h-[44px] flex items-end pb-1">จำนวนสต็อก<span className="text-red-500">*</span></label>
                          <input
                            type="number"
                            min="0"
                            value={stock}
                            onChange={(e) => setStock(e.target.value)}
                            className="form-input min-w-0 bg-[#f5f5f7] focus:bg-white text-black"
                          />
                        </div>
                        <div className="min-w-0">
                          <label className="form-label min-h-[44px] flex items-end pb-1">สถานะระบบ</label>
                          <div className="grid grid-cols-2 gap-1 bg-[#f5f5f7] border border-[#d2d2d7] p-0.5 rounded-xl h-[42px] items-center">
                            <button
                              type="button"
                              onClick={() => setStatus('Active')}
                              className={`py-1 text-xs font-bold rounded-lg transition-all cursor-pointer h-full ${
                                status === 'Active' 
                                  ? 'bg-[#10b981] text-white shadow-xs' 
                                  : 'text-zinc-650 hover:text-[#10b981]'
                              }`}
                            >
                              เปิด
                            </button>
                            <button
                              type="button"
                              onClick={() => setStatus('Inactive')}
                              className={`py-1 text-xs font-bold rounded-lg transition-all cursor-pointer h-full ${
                                status === 'Inactive' 
                                  ? 'bg-[#71717a] text-white shadow-xs' 
                                  : 'text-zinc-650 hover:text-[#71717a]'
                              }`}
                            >
                              ปิด
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xs font-extrabold text-[#1d1d1f] uppercase tracking-wider mb-2.5">ข้อมูลประกอบการขายและการตลาด</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="min-w-0">
                          <label className="form-label min-h-[28px] flex items-end pb-1">รายละเอียดสินค้า</label>
                          <textarea
                            rows="2"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="form-input min-w-0 bg-[#f5f5f7] focus:bg-white resize-none"
                          />
                        </div>
                        <div className="min-w-0">
                          <label className="form-label min-h-[28px] flex items-end pb-1">จุดเด่นสินค้า</label>
                          <textarea
                            rows="2"
                            value={highlights}
                            onChange={(e) => setHighlights(e.target.value)}
                            className="form-input min-w-0 bg-[#f5f5f7] focus:bg-white resize-none"
                          />
                        </div>
                        <div className="min-w-0">
                          <label className="form-label min-h-[28px] flex items-end pb-1">วิธีใช้</label>
                          <textarea
                            rows="2"
                            value={howToUse}
                            onChange={(e) => setHowToUse(e.target.value)}
                            className="form-input min-w-0 bg-[#f5f5f7] focus:bg-white resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 min-w-0">
                  <div className="bg-white p-4.5 rounded-2xl border border-[#d2d2d7]/50 shadow-xs space-y-3.5">
                    <div>
                      <h3 className="text-xs font-bold text-[#1d1d1f] uppercase tracking-wide">ใส่ภาพประกอบสินค้า</h3>
                    </div>
                    <div className="relative aspect-video rounded-xl bg-[#f5f5f7] border-2 border-dashed border-[#d2d2d7] flex flex-col items-center justify-center overflow-hidden group">
                      {image ? (
                        <>
                          <img src={image} alt="Preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setImage('')}
                            className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black text-white rounded-full transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <div className="p-4 text-center space-y-2.5">
                          <div className="w-10 h-10 rounded-full bg-white border border-[#d2d2d7]/50 flex items-center justify-center text-zinc-400 mx-auto">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                          <div className="text-xs text-zinc-500 font-medium">
                            ลากรูปภาพมาวางที่นี่ หรือ
                            <label className="text-[#0071e3] hover:underline cursor-pointer ml-1">
                              <span>เรียกดูไฟล์</span>
                              <input 
                                type="file" 
                                accept="image/*" 
                                onChange={handleImageUpload} 
                                className="hidden" 
                              />
                            </label>
                          </div>
                          <p className="text-xs text-[#555557]">ขนาดไฟล์แนะนำไม่เกิน 2MB</p>
                        </div>
                      )}
                    </div>

                    {/* Quick Presets Picker */}
                    <div className="space-y-2.5 pt-2 border-t border-[#f5f5f7]">
                      <span className="text-xs font-bold text-[#555557] block uppercase">เลือกรูปตัวอย่างด่วน:</span>
                      <div className="grid grid-cols-3 gap-2">
                        {PRESET_IMAGES.map((preset) => (
                          <button
                            key={preset.url}
                            type="button"
                            onClick={() => setImage(preset.url)}
                            className={`
                              relative aspect-square rounded-lg overflow-hidden border bg-zinc-50 transition-all cursor-pointer
                              ${image === preset.url ? 'border-2 border-[#0071e3] ring-2 ring-[#0071e3]/10' : 'border-[#d2d2d7]'}
                            `}
                            title={preset.label}
                          >
                            <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Edit Remark — required when editing */}
                  {editProduct && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2 mt-2">
                      <label className="text-xs font-extrabold text-amber-800 uppercase tracking-wider block">
                        หมายเหตุการแก้ไข <span className="text-red-500">*</span>
                        <span className="normal-case font-normal text-amber-600 ml-1">(บังคับกรอก)</span>
                      </label>
                      <textarea
                        rows="3"
                        value={editRemark}
                        onChange={(e) => setEditRemark(e.target.value)}
                        placeholder="ระบุเหตุผลที่แก้ไขข้อมูลสินค้านี้..."
                        className="w-full px-3 py-2.5 bg-white border border-amber-300 rounded-xl text-sm text-[#1d1d1f] focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all resize-none placeholder-amber-400"
                      />
                    </div>
                  )}
                </div>
              </form>
            </div>

            {/* Sticky Actions Footer */}
            <div className="px-6 py-4 border-t border-[#e8e8ed] bg-white flex justify-end gap-2.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (editProduct) {
                    onCancelEdit();
                  } else {
                    resetForm();
                    setShowForm(false);
                  }
                }}
                className="px-5 py-2.5 border border-[#d2d2d7] text-[#1d1d1f] bg-white rounded-xl hover:bg-[#f5f5f7] font-semibold text-xs transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                form="product-form"
                className="px-6 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>บันทึกข้อมูลสินค้า</span>
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* Alert Pop-up Modal (Success/Error) */}
      {alertPopup && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 no-print animate-fade-in">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/25 backdrop-blur-xs" 
            onClick={() => {
              if (alertPopup.type === 'error') setAlertPopup(null);
            }} 
          />
          
          {/* Modal Container */}
          <div className="relative bg-white rounded-3xl border border-[#d2d2d7]/50 max-w-sm w-full p-6 shadow-2xl z-10 animate-scale-in text-[#1d1d1f] text-center space-y-4">
            {alertPopup.type === 'success' || alertPopup.type === 'success-delete' ? (
              <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mx-auto animate-scale-in">
                <Check className="w-7 h-7" />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 mx-auto">
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
                onClick={() => {
                  if (alertPopup.type === 'success') {
                    onSaveProduct(alertPopup.data);
                    resetForm();
                  }
                  setAlertPopup(null);
                }}
                className={`w-full py-2.5 rounded-full text-xs font-semibold text-white transition-colors cursor-pointer ${
                  alertPopup.type === 'success' || alertPopup.type === 'success-delete'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-xs'
                    : 'bg-rose-600 hover:bg-rose-700 shadow-xs'
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
