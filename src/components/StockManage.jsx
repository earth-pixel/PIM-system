import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Package, Search,
  AlertTriangle, CheckCircle, X, Clock, ArrowUp, ArrowDown
} from 'lucide-react';

const REASON_PRESETS = {
  in: [
    { label: 'รับสินค้าจากผู้ผลิต', icon: 'bi bi-truck' },
    { label: 'รับคืนจากลูกค้า', icon: 'bi bi-arrow-return-left' },
    { label: 'ปรับสต็อกเพิ่ม (ตรวจนับ)', icon: 'bi bi-clipboard-check' },
    { label: 'โอนย้ายสต็อกเข้า', icon: 'bi bi-box-arrow-in-down' },
    { label: 'อื่นๆ', icon: 'bi bi-three-dots' },
  ],
  out: [
    { label: 'ขายออก (ออฟไลน์)', icon: 'bi bi-cart-check' },
    { label: 'ขายออก Shopee', icon: 'bi bi-bag-check' },
    { label: 'ขายออก Lazada', icon: 'bi bi-bag-check' },
    { label: 'ขายออก TikTok Shop', icon: 'bi bi-bag-check' },
    { label: 'ตัดจ่ายของเสีย/หมดอายุ', icon: 'bi bi-x-circle' },
    { label: 'ปรับสต็อกลด (ตรวจนับ)', icon: 'bi bi-clipboard-x' },
    { label: 'โอนย้ายสต็อกออก', icon: 'bi bi-box-arrow-up' },
    { label: 'ของแถม/ตัวอย่าง', icon: 'bi bi-gift' },
    { label: 'อื่นๆ', icon: 'bi bi-three-dots' },
  ],
};

function AlertPopup({ popup, onClose }) {
  if (!popup) return null;
  const isSuccess = popup.type === 'success';
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.35)' }}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full flex flex-col items-center gap-3 animate-scale-in">
        {isSuccess
          ? <CheckCircle className="text-emerald-500" size={44} strokeWidth={1.5} />
          : <AlertTriangle className="text-amber-500" size={44} strokeWidth={1.5} />}
        <p className="font-bold text-[#1d1d1f] text-base text-center">{popup.title}</p>
        {popup.message && <p className="text-sm text-zinc-500 text-center">{popup.message}</p>}
        <button onClick={onClose} className="mt-1 w-full py-2.5 rounded-xl bg-[#0071e3] text-white font-bold text-sm hover:bg-[#005bbf] transition-colors cursor-pointer">
          ตกลง
        </button>
      </div>
    </div>,
    document.body
  );
}

export default function StockManage({ products = [], onUpdateStock, currentUser }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adjustMode, setAdjustMode] = useState('in'); // 'in' | 'out'
  const [qty, setQty] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [note, setNote] = useState('');
  const [alertPopup, setAlertPopup] = useState(null);
  const [filterBrand, setFilterBrand] = useState('All');
  const [filterStock, setFilterStock] = useState('All');
  const [stockHistory, setStockHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('pim_stock_history');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [showHistory, setShowHistory] = useState(false);
  const [historyProductId, setHistoryProductId] = useState(null);

  const brands = useMemo(() => {
    const b = [...new Set(products.map(p => p.brand).filter(Boolean))];
    return b;
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
      const matchBrand = filterBrand === 'All' || p.brand === filterBrand;
      const matchStock = filterStock === 'All'
        || (filterStock === 'Low' && p.stock > 0 && p.stock <= 10)
        || (filterStock === 'Out' && p.stock === 0)
        || (filterStock === 'Ok' && p.stock > 10);
      return matchSearch && matchBrand && matchStock;
    });
  }, [products, searchQuery, filterBrand, filterStock]);

  const openAdjust = (product, mode = 'in') => {
    setSelectedProduct(product);
    setAdjustMode(mode);
    setQty('');
    setSelectedReason('');
    setCustomReason('');
    setNote('');
  };

  const closeAdjust = () => {
    setSelectedProduct(null);
    setQty('');
    setSelectedReason('');
    setCustomReason('');
    setNote('');
  };

  const handleConfirm = () => {
    const amount = parseInt(qty, 10);
    if (!amount || amount <= 0) {
      setAlertPopup({ type: 'error', title: 'กรุณาระบุจำนวน', message: 'จำนวนต้องเป็นตัวเลขมากกว่า 0' });
      return;
    }
    const reason = selectedReason === 'อื่นๆ' ? customReason.trim() : selectedReason;
    if (!reason) {
      setAlertPopup({ type: 'error', title: 'กรุณาเลือกเหตุผล', message: 'โปรดระบุเหตุผลในการปรับสต็อก' });
      return;
    }
    if (adjustMode === 'out' && amount > selectedProduct.stock) {
      setAlertPopup({ type: 'error', title: 'สต็อกไม่เพียงพอ', message: `สต็อกปัจจุบัน ${selectedProduct.stock} ชิ้น ไม่สามารถลดได้ ${amount} ชิ้น` });
      return;
    }

    const newStock = adjustMode === 'in'
      ? selectedProduct.stock + amount
      : selectedProduct.stock - amount;

    // Save history
    const entry = {
      id: Date.now(),
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      productCode: selectedProduct.code,
      type: adjustMode,
      qty: amount,
      stockBefore: selectedProduct.stock,
      stockAfter: newStock,
      reason,
      note: note.trim(),
      adjustedBy: currentUser?.name || currentUser?.username || 'ไม่ระบุ',
      timestamp: new Date().toISOString(),
    };
    const updatedHistory = [entry, ...stockHistory].slice(0, 500);
    setStockHistory(updatedHistory);
    localStorage.setItem('pim_stock_history', JSON.stringify(updatedHistory));

    // Update product stock
    onUpdateStock(selectedProduct.id, newStock, entry);

    setAlertPopup({
      type: 'success',
      title: adjustMode === 'in' ? `เพิ่มสต็อก +${amount} ชิ้น` : `ลดสต็อก -${amount} ชิ้น`,
      message: `${selectedProduct.name} | คงเหลือ ${newStock} ชิ้น`,
    });
    closeAdjust();
  };

  const productHistory = historyProductId
    ? stockHistory.filter(h => h.productId === historyProductId)
    : stockHistory;

  const stockStatusBadge = (stock) => {
    if (stock === 0) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600">หมด</span>;
    if (stock <= 10) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-600">ต่ำ</span>;
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">ปกติ</span>;
  };

  return (
    <div className="flex flex-col gap-4">
      <AlertPopup popup={alertPopup} onClose={() => setAlertPopup(null)} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1d1d1f] tracking-tight flex items-center gap-2">
            <i className="bi bi-box-seam-fill text-[#0071e3]"></i>
            จัดการสต็อกสินค้า
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">เพิ่ม/ลดสต็อกพร้อมระบุเหตุผล — ไม่สามารถแก้ไขจากหน้าสินค้าได้</p>
        </div>
        <button
          onClick={() => { setShowHistory(true); setHistoryProductId(null); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#d2d2d7] bg-white text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer"
        >
          <Clock size={14} />
          ประวัติการปรับสต็อก
          {stockHistory.length > 0 && (
            <span className="bg-[#0071e3] text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
              {stockHistory.length}
            </span>
          )}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่อหรือรหัสสินค้า..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-[#d2d2d7] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] text-[#1d1d1f]"
          />
        </div>
        <select
          value={filterBrand}
          onChange={e => setFilterBrand(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl border border-[#d2d2d7] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 text-[#1d1d1f] cursor-pointer"
        >
          <option value="All">ทุกแบรนด์</option>
          {brands.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select
          value={filterStock}
          onChange={e => setFilterStock(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl border border-[#d2d2d7] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 text-[#1d1d1f] cursor-pointer"
        >
          <option value="All">สต็อกทั้งหมด</option>
          <option value="Ok">ปกติ (&gt;10)</option>
          <option value="Low">ต่ำ (1-10)</option>
          <option value="Out">หมดสต็อก</option>
        </select>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'ปกติ', count: products.filter(p => p.stock > 10).length, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
          { label: 'สต็อกต่ำ', count: products.filter(p => p.stock > 0 && p.stock <= 10).length, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
          { label: 'หมดสต็อก', count: products.filter(p => p.stock === 0).length, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl p-3 text-center`}>
            <p className={`text-xl font-extrabold ${s.color}`}>{s.count}</p>
            <p className="text-[11px] text-zinc-500 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Product Table */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/60 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#f5f5f7] border-b border-[#d2d2d7]/50">
                <th className="text-left px-4 py-3 font-bold text-zinc-500">สินค้า</th>
                <th className="text-left px-3 py-3 font-bold text-zinc-500 hidden sm:table-cell">แบรนด์</th>
                <th className="text-center px-3 py-3 font-bold text-zinc-500">สต็อก</th>
                <th className="text-center px-3 py-3 font-bold text-zinc-500">สถานะ</th>
                <th className="text-center px-3 py-3 font-bold text-zinc-500">ปรับสต็อก</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-zinc-400 font-medium">ไม่พบสินค้า</td>
                </tr>
              )}
              {filteredProducts.map(product => (
                <tr key={product.id} className="border-b border-[#f0f0f2] hover:bg-[#f5f5f7]/60 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {product.image && (
                        <img src={product.image} alt="" className="w-9 h-9 rounded-lg object-cover border border-[#d2d2d7]/50 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-[#1d1d1f] truncate max-w-[160px]">{product.name}</p>
                        <p className="text-zinc-400 text-[10px] mt-0.5">{product.code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 hidden sm:table-cell">
                    <span className="text-zinc-600">{product.brand}</span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={`font-extrabold text-base ${product.stock === 0 ? 'text-red-500' : product.stock <= 10 ? 'text-amber-600' : 'text-[#1d1d1f]'}`}>
                      {product.stock.toLocaleString()}
                    </span>
                    <span className="text-zinc-400 text-[10px] ml-0.5">ชิ้น</span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    {stockStatusBadge(product.stock)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => openAdjust(product, 'in')}
                        title="เพิ่มสต็อก"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors text-[11px] font-bold cursor-pointer"
                      >
                        <ArrowUp size={11} strokeWidth={2.5} /> เพิ่ม
                      </button>
                      <button
                        onClick={() => openAdjust(product, 'out')}
                        title="ลดสต็อก"
                        disabled={product.stock === 0}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-colors cursor-pointer ${
                          product.stock === 0
                            ? 'bg-zinc-50 text-zinc-300 border-zinc-200 cursor-not-allowed'
                            : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                        }`}
                      >
                        <ArrowDown size={11} strokeWidth={2.5} /> ลด
                      </button>
                      <button
                        onClick={() => { setHistoryProductId(product.id); setShowHistory(true); }}
                        title="ดูประวัติ"
                        className="p-1.5 rounded-lg bg-zinc-50 text-zinc-400 border border-zinc-200 hover:bg-zinc-100 transition-colors cursor-pointer"
                      >
                        <Clock size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Modal */}
      {selectedProduct && createPortal(
        <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className={`px-5 pt-5 pb-4 border-b border-[#f0f0f2] ${adjustMode === 'in' ? 'bg-emerald-50' : 'bg-red-50'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${adjustMode === 'in' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                    {adjustMode === 'in' ? <ArrowUp size={18} className="text-white" strokeWidth={2.5} /> : <ArrowDown size={18} className="text-white" strokeWidth={2.5} />}
                  </div>
                  <div>
                    <p className="font-bold text-[#1d1d1f] text-sm">{adjustMode === 'in' ? 'เพิ่มสต็อก' : 'ลดสต็อก'}</p>
                    <p className="text-[11px] text-zinc-500 truncate max-w-[220px]">{selectedProduct.name}</p>
                  </div>
                </div>
                <button onClick={closeAdjust} className="p-1.5 rounded-lg hover:bg-black/10 transition-colors cursor-pointer">
                  <X size={16} className="text-zinc-500" />
                </button>
              </div>
              {/* Mode Toggle */}
              <div className="mt-3 grid grid-cols-2 gap-1 bg-white/70 border border-[#d2d2d7] p-0.5 rounded-xl">
                <button
                  onClick={() => { setAdjustMode('in'); setSelectedReason(''); setQty(''); }}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${adjustMode === 'in' ? 'bg-emerald-500 text-white shadow-xs' : 'text-zinc-500 hover:text-emerald-600'}`}
                >
                  <ArrowUp size={11} className="inline mr-1" strokeWidth={2.5} />เพิ่มสต็อก
                </button>
                <button
                  onClick={() => { setAdjustMode('out'); setSelectedReason(''); setQty(''); }}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${adjustMode === 'out' ? 'bg-red-500 text-white shadow-xs' : 'text-zinc-500 hover:text-red-600'}`}
                >
                  <ArrowDown size={11} className="inline mr-1" strokeWidth={2.5} />ลดสต็อก
                </button>
              </div>
            </div>

            <div className="px-5 py-4 flex flex-col gap-4">
              {/* Current stock info */}
              <div className="flex items-center justify-between bg-[#f5f5f7] rounded-xl px-4 py-3">
                <span className="text-xs text-zinc-500 font-medium">สต็อกปัจจุบัน</span>
                <span className={`text-lg font-extrabold ${selectedProduct.stock <= 10 ? 'text-amber-600' : 'text-[#1d1d1f]'}`}>
                  {selectedProduct.stock.toLocaleString()} ชิ้น
                </span>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-bold text-[#1d1d1f] mb-1.5">
                  จำนวนที่ต้องการ{adjustMode === 'in' ? 'เพิ่ม' : 'ลด'} <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQty(q => Math.max(1, (parseInt(q) || 0) - 1).toString())}
                    className="w-9 h-9 rounded-xl bg-[#f5f5f7] border border-[#d2d2d7] flex items-center justify-center text-zinc-600 hover:bg-zinc-200 transition-colors cursor-pointer font-bold text-lg"
                  >−</button>
                  <input
                    type="number"
                    min="1"
                    value={qty}
                    onChange={e => setQty(e.target.value)}
                    placeholder="0"
                    className="flex-1 text-center text-lg font-bold py-2 rounded-xl border border-[#d2d2d7] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] text-[#1d1d1f]"
                  />
                  <button
                    onClick={() => setQty(q => ((parseInt(q) || 0) + 1).toString())}
                    className="w-9 h-9 rounded-xl bg-[#f5f5f7] border border-[#d2d2d7] flex items-center justify-center text-zinc-600 hover:bg-zinc-200 transition-colors cursor-pointer font-bold text-lg"
                  >+</button>
                </div>
                {qty && parseInt(qty) > 0 && (
                  <p className={`text-[11px] mt-1.5 font-semibold text-center ${adjustMode === 'out' && parseInt(qty) > selectedProduct.stock ? 'text-red-500' : 'text-zinc-500'}`}>
                    {adjustMode === 'in'
                      ? `คงเหลือหลังเพิ่ม: ${selectedProduct.stock + (parseInt(qty) || 0)} ชิ้น`
                      : parseInt(qty) > selectedProduct.stock
                        ? `⚠ เกินสต็อกที่มี (${selectedProduct.stock} ชิ้น)`
                        : `คงเหลือหลังลด: ${selectedProduct.stock - (parseInt(qty) || 0)} ชิ้น`}
                  </p>
                )}
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold text-[#1d1d1f] mb-1.5">
                  เหตุผล <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {REASON_PRESETS[adjustMode].map(r => (
                    <button
                      key={r.label}
                      onClick={() => setSelectedReason(r.label)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                        selectedReason === r.label
                          ? adjustMode === 'in'
                            ? 'bg-emerald-500 text-white border-emerald-500'
                            : 'bg-red-500 text-white border-red-500'
                          : 'bg-white text-zinc-600 border-[#d2d2d7] hover:border-zinc-400'
                      }`}
                    >
                      <i className={`${r.icon} text-[10px]`}></i>
                      {r.label}
                    </button>
                  ))}
                </div>
                {selectedReason === 'อื่นๆ' && (
                  <input
                    type="text"
                    placeholder="ระบุเหตุผล..."
                    value={customReason}
                    onChange={e => setCustomReason(e.target.value)}
                    className="mt-2 w-full px-3 py-2 text-xs rounded-xl border border-[#d2d2d7] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] text-[#1d1d1f]"
                  />
                )}
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-bold text-[#1d1d1f] mb-1.5">หมายเหตุ (ถ้ามี)</label>
                <input
                  type="text"
                  placeholder="เช่น เลขที่ใบส่งของ, เลขออเดอร์..."
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#d2d2d7] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] text-[#1d1d1f]"
                />
              </div>

              {/* Confirm Button */}
              <button
                onClick={handleConfirm}
                className={`w-full py-3 rounded-xl font-bold text-sm text-white transition-colors cursor-pointer ${
                  adjustMode === 'in' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {adjustMode === 'in' ? `ยืนยันเพิ่มสต็อก` : `ยืนยันลดสต็อก`}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* History Drawer */}
      {showHistory && createPortal(
        <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-end" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white w-full sm:w-[420px] h-full sm:h-full flex flex-col shadow-2xl">
            {/* History Header */}
            <div className="px-5 pt-5 pb-3 border-b border-[#d2d2d7]/60 flex items-center justify-between">
              <div>
                <p className="font-bold text-[#1d1d1f] text-sm flex items-center gap-2">
                  <Clock size={15} className="text-[#0071e3]" />
                  ประวัติการปรับสต็อก
                </p>
                {historyProductId && (
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {products.find(p => p.id === historyProductId)?.name}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {historyProductId && (
                  <button
                    onClick={() => setHistoryProductId(null)}
                    className="text-[11px] text-[#0071e3] font-semibold hover:underline cursor-pointer"
                  >ดูทั้งหมด</button>
                )}
                <button
                  onClick={() => { setShowHistory(false); setHistoryProductId(null); }}
                  className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
                >
                  <X size={16} className="text-zinc-500" />
                </button>
              </div>
            </div>

            {/* History List */}
            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
              {productHistory.length === 0 && (
                <div className="text-center py-16 text-zinc-400">
                  <Package size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">ยังไม่มีประวัติการปรับสต็อก</p>
                </div>
              )}
              {productHistory.map(h => (
                <div key={h.id} className="flex gap-3 p-3 rounded-xl border border-[#f0f0f2] bg-white hover:bg-[#f5f5f7]/50 transition-colors">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${h.type === 'in' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                    {h.type === 'in'
                      ? <ArrowUp size={13} className="text-emerald-600" strokeWidth={2.5} />
                      : <ArrowDown size={13} className="text-red-500" strokeWidth={2.5} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-[#1d1d1f] text-xs truncate">{h.productName}</p>
                      <span className={`text-xs font-bold flex-shrink-0 ${h.type === 'in' ? 'text-emerald-600' : 'text-red-500'}`}>
                        {h.type === 'in' ? '+' : '-'}{h.qty}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-0.5">{h.reason}</p>
                    {h.note && <p className="text-[10px] text-zinc-400 mt-0.5 italic">"{h.note}"</p>}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-zinc-400">{h.stockBefore} → {h.stockAfter} ชิ้น</span>
                      <span className="text-[10px] text-zinc-300">•</span>
                      <span className="text-[10px] text-zinc-400">{h.adjustedBy}</span>
                      <span className="text-[10px] text-zinc-300">•</span>
                      <span className="text-[10px] text-zinc-400">
                        {new Date(h.timestamp).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
