import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Search, X, Plus, Trash2, Package, AlertCircle, Save
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────
function generateQuotationNumber(existingQuotations = []) {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const todayQTs = existingQuotations.filter(q =>
    q.quotationNumber && q.quotationNumber.includes(`QT-${today}`)
  );
  const seq = String(todayQTs.length + 1).padStart(4, '0');
  return `QT-${today}-${seq}`;
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const today = new Date().toISOString().slice(0, 10);

const PAYMENT_TERMS = [
  'ชำระทันที (Cash)',
  'ชำระภายใน 7 วัน',
  'ชำระภายใน 15 วัน',
  'ชำระภายใน 30 วัน',
  'ชำระภายใน 45 วัน',
  'ชำระภายใน 60 วัน',
];

// ─── ProductPickerModal ───────────────────────────────────────
function ProductPickerModal({ products, onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);

  const filtered = products.filter(p =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleConfirm = () => {
    if (!selectedProduct) return;
    onSelect(selectedProduct, selectedVariant);
  };

  const hasVariants = selectedProduct?.variants?.length > 0;

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 animate-fade-in">
      <div onClick={onClose} className="absolute inset-0 bg-black/20 backdrop-blur-md" />
      <div className="relative bg-white rounded-3xl shadow-2xl border border-[#d2d2d7]/40 w-full max-w-xl flex flex-col max-h-[80vh] z-10 animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#e8e8ed] flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-sm font-bold text-[#1d1d1f]">เลือกสินค้า</h3>
            <p className="text-xs text-[#555557] mt-0.5">ค้นหาแล้วกดยืนยันเพื่อเพิ่มรายการ</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#f5f5f7] cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-[#f5f5f7] flex-shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-[#555557] absolute left-3 top-2.5" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อสินค้า หรือรหัส SKU..."
              className="w-full pl-9 pr-4 py-2 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-sm focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Product List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-[#555557] text-sm">ไม่พบสินค้าที่ค้นหา</div>
          ) : (
            <div className="divide-y divide-[#f5f5f7]">
              {filtered.map(product => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => { setSelectedProduct(product); setSelectedVariant(null); }}
                  className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-colors cursor-pointer hover:bg-[#f5f5f7] ${selectedProduct?.id === product.id ? 'bg-blue-50' : ''}`}
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#f5f5f7] flex-shrink-0">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1d1d1f] truncate">{product.name}</p>
                    <p className="text-xs text-[#555557]">{product.code} · ราคา {(product.retailPrice || 0).toLocaleString()} บาท</p>
                  </div>
                  {selectedProduct?.id === product.id && (
                    <div className="w-4 h-4 rounded-full bg-[#0071e3] flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Variant Selection */}
        {selectedProduct && hasVariants && (
          <div className="px-6 py-3 border-t border-[#f5f5f7] bg-blue-50/50 flex-shrink-0">
            <p className="text-xs font-bold text-[#1d1d1f] mb-2 uppercase tracking-wider">เลือกรูปแบบ (Variant)</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedVariant(null)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${!selectedVariant ? 'bg-[#0071e3] text-white border-[#0071e3]' : 'bg-white text-[#1d1d1f] border-[#d2d2d7] hover:border-[#0071e3]'}`}
              >
                ไม่ระบุ (ใช้ราคาหลัก)
              </button>
              {selectedProduct.variants.map((v, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedVariant(v)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${selectedVariant === v ? 'bg-[#0071e3] text-white border-[#0071e3]' : 'bg-white text-[#1d1d1f] border-[#d2d2d7] hover:border-[#0071e3]'}`}
                >
                  {v.options?.map(o => o.value).join(' / ') || v.sellerSku}
                  {v.price && ` · ${Number(v.price).toLocaleString()} ฿`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#e8e8ed] flex gap-3 flex-shrink-0 bg-white">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-[#d2d2d7] text-[#1d1d1f] rounded-full text-xs font-semibold hover:bg-[#f5f5f7] transition-colors cursor-pointer">ยกเลิก</button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedProduct}
            className="flex-1 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full text-xs font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            เพิ่มรายการ
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Main Form Component ──────────────────────────────────────
export default function QuotationForm({ quotation, products, existingQuotations, currentUser, onSave, onCancel }) {
  const isEdit = !!quotation;

  const [quotationNumber] = useState(() =>
    isEdit ? quotation.quotationNumber : generateQuotationNumber(existingQuotations)
  );
  const [status, setStatus]         = useState(quotation?.status ?? 'draft');
  const [issuedDate, setIssuedDate] = useState(quotation?.issuedDate ?? today);
  const [validUntilDate, setValidUntilDate] = useState(quotation?.validUntilDate ?? addDays(today, 30));
  const [paymentTerms, setPaymentTerms]     = useState(quotation?.paymentTerms ?? 'ชำระภายใน 30 วัน');
  const [note, setNote] = useState(quotation?.note ?? '');

  const [salespersonName, setSalespersonName] = useState(quotation?.salespersonName ?? currentUser?.name ?? '');
  const [salespersonPhone, setSalespersonPhone] = useState(quotation?.salespersonPhone ?? '0123456789');
  const [projectName, setProjectName] = useState(quotation?.projectName ?? '');
  const [referenceNumber, setReferenceNumber] = useState(quotation?.referenceNumber ?? '');

  const [customer, setCustomer] = useState(quotation?.customer ?? {
    name: '', address: '', taxId: '', phone: '', email: '', contactPerson: ''
  });

  const [items, setItems] = useState(quotation?.items ?? []);
  const [showPicker, setShowPicker] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // ── Calculations ─────────────────────────────────────────
  const calcLine = (item) => {
    const base = Number(item.quantity) * Number(item.unitPrice);
    if (item.discountType === 'percent') return base * (1 - Number(item.discount) / 100);
    return base - Number(item.discount);
  };

  const subtotal    = items.reduce((s, i) => s + calcLine(i), 0);
  const vatAmount   = subtotal * 0.07;
  const totalAmount = subtotal + vatAmount;

  const fmt = (n) => Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ── Product Picker ───────────────────────────────────────
  const handleSelectProduct = (product, variant) => {
    const price = variant?.price ?? product.retailPrice ?? 0;
    const variantLabel = variant?.options?.map(o => o.value).join(' / ') ?? '';
    const newItem = {
      id: `item-${Date.now()}`,
      productId: product.id,
      productCode: product.code,
      variantSellerSku: variant?.sellerSku ?? '',
      productName: variantLabel ? `${product.name} (${variantLabel})` : product.name,
      description: '',
      unit: 'ชิ้น',
      quantity: 1,
      unitPrice: price,
      discount: 0,
      discountType: 'baht',
      lineTotal: price,
    };
    setItems(prev => [...prev, newItem]);
    setShowPicker(false);
  };

  const updateItem = (id, field, value) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      updated.lineTotal = calcLine(updated);
      return updated;
    }));
  };

  const removeItem = (id) => setItems(prev => prev.filter(i => i.id !== id));

  // ── Save ─────────────────────────────────────────────────
  const handleSave = () => {
    setErrorMsg('');
    if (!customer.name.trim()) { setErrorMsg('กรุณากรอกชื่อลูกค้า'); return; }
    if (items.length === 0)    { setErrorMsg('กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ'); return; }

    const savedItems = items.map(item => ({ ...item, lineTotal: calcLine(item) }));
    const data = {
      id: isEdit ? quotation.id : `qt-${Date.now()}`,
      quotationNumber,
      status,
      issuedDate,
      validUntilDate,
      paymentTerms,
      note,
      customer,
      items: savedItems,
      subtotal,
      vatRate: 7,
      vatAmount,
      totalAmount,
      salespersonName,
      salespersonPhone,
      projectName,
      referenceNumber,
      createdAt: isEdit ? quotation.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: currentUser?.username ?? 'admin',
    };
    onSave(data);
  };

  const updateCustomer = (field, value) => setCustomer(prev => ({ ...prev, [field]: value }));

  // ── Render ────────────────────────────────────────────────
  return (
    <>
      {showPicker && (
        <ProductPickerModal
          products={products}
          onSelect={handleSelectProduct}
          onClose={() => setShowPicker(false)}
        />
      )}

      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f]">
              {isEdit ? `แก้ไขใบเสนอราคา` : 'สร้างใบเสนอราคาใหม่'}
            </h1>
            <p className="text-sm text-[#555557] mt-1 font-mono">{quotationNumber}</p>
          </div>
          <div className="flex gap-2.5">
            <button type="button" onClick={onCancel} className="px-4 py-2.5 bg-white hover:bg-[#f5f5f7] text-[#1d1d1f] border border-[#d2d2d7] text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer">ยกเลิก</button>
            <button type="button" onClick={handleSave} className="px-4 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5">
              <Save className="w-4 h-4" /> บันทึกใบเสนอราคา
            </button>
          </div>
        </div>

        {/* Error */}
        {errorMsg && (
          <div className="flex items-center gap-2.5 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-600">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left: Customer + Meta */}
          <div className="xl:col-span-1 space-y-4">
            {/* Document Meta */}
            <div className="bg-white p-5 rounded-2xl border border-[#d2d2d7]/50 shadow-xs space-y-3">
              <h3 className="text-xs font-extrabold text-[#1d1d1f] uppercase tracking-wider">ข้อมูลเอกสาร</h3>
              <div className="space-y-3">
                <div>
                  <label className="form-label mb-1 block">สถานะ</label>
                  <select value={status} onChange={e => setStatus(e.target.value)} className="form-input bg-[#f5f5f7] text-zinc-800">
                    <option value="draft">ร่าง</option>
                    <option value="sent">ส่งแล้ว</option>
                    <option value="approved">อนุมัติแล้ว</option>
                    <option value="rejected">ไม่อนุมัติ</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label mb-1 block">วันที่ออก<span className="text-red-500">*</span></label>
                    <input type="date" value={issuedDate} onChange={e => setIssuedDate(e.target.value)} className="form-input bg-[#f5f5f7]" />
                  </div>
                  <div>
                    <label className="form-label mb-1 block">ใช้ได้ถึง</label>
                    <input type="date" value={validUntilDate} onChange={e => setValidUntilDate(e.target.value)} className="form-input bg-[#f5f5f7]" />
                  </div>
                </div>
                <div>
                  <label className="form-label mb-1 block">เงื่อนไขชำระเงิน</label>
                  <select value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} className="form-input bg-[#f5f5f7] text-zinc-800">
                    {PAYMENT_TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label mb-1 block">ชื่อผู้ขาย</label>
                    <input type="text" value={salespersonName} onChange={e => setSalespersonName(e.target.value)} className="form-input bg-[#f5f5f7]" />
                  </div>
                  <div>
                    <label className="form-label mb-1 block">เบอร์ติดต่อผู้ขาย</label>
                    <input type="text" value={salespersonPhone} onChange={e => setSalespersonPhone(e.target.value)} className="form-input bg-[#f5f5f7]" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label mb-1 block">ชื่อโปรเจกต์</label>
                    <input type="text" value={projectName} onChange={e => setProjectName(e.target.value)} className="form-input bg-[#f5f5f7]" />
                  </div>
                  <div>
                    <label className="form-label mb-1 block">เลขที่อ้างอิง</label>
                    <input type="text" value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)} className="form-input bg-[#f5f5f7]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div className="bg-white p-5 rounded-2xl border border-[#d2d2d7]/50 shadow-xs space-y-3">
              <h3 className="text-xs font-extrabold text-[#1d1d1f] uppercase tracking-wider">ข้อมูลลูกค้า</h3>
              <div className="space-y-3">
                {[
                  { label: 'ชื่อ / บริษัท', field: 'name', required: true },
                  { label: 'ที่อยู่', field: 'address' },
                  { label: 'เลขประจำตัวผู้เสียภาษี', field: 'taxId' },
                  { label: 'โทรศัพท์', field: 'phone' },
                  { label: 'อีเมล', field: 'email' },
                  { label: 'ชื่อผู้ติดต่อ', field: 'contactPerson' },
                ].map(({ label, field, required }) => (
                  <div key={field}>
                    <label className="form-label mb-1 block">{label}{required && <span className="text-red-500">*</span>}</label>
                    {field === 'address' ? (
                      <textarea
                        value={customer[field]}
                        onChange={e => updateCustomer(field, e.target.value)}
                        rows={2}
                        className="form-input bg-[#f5f5f7] resize-none"
                      />
                    ) : (
                      <input
                        type="text"
                        value={customer[field]}
                        onChange={e => updateCustomer(field, e.target.value)}
                        className="form-input bg-[#f5f5f7]"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Note */}
            <div className="bg-white p-5 rounded-2xl border border-[#d2d2d7]/50 shadow-xs space-y-3">
              <h3 className="text-xs font-extrabold text-[#1d1d1f] uppercase tracking-wider">หมายเหตุ</h3>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={3}
                placeholder="หมายเหตุเพิ่มเติม..."
                className="form-input bg-[#f5f5f7] resize-none w-full"
              />
            </div>
          </div>

          {/* Right: Items + Summary */}
          <div className="xl:col-span-2 space-y-4">
            {/* Items Table */}
            <div className="bg-white rounded-2xl border border-[#d2d2d7]/50 shadow-xs overflow-hidden">
              <div className="px-5 py-4 border-b border-[#e8e8ed] flex items-center justify-between">
                <h4 className="text-sm font-bold text-[#1d1d1f] uppercase tracking-wide">รายการสินค้า</h4>
                <button
                  type="button"
                  onClick={() => setShowPicker(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  เพิ่มสินค้า
                </button>
              </div>

              {items.length === 0 ? (
                <div className="py-16 text-center">
                  <Package className="w-10 h-10 text-[#555557] mx-auto mb-3" />
                  <p className="text-sm text-[#555557] font-semibold">ยังไม่มีรายการสินค้า</p>
                  <p className="text-xs text-[#aaa] mt-1">กดปุ่ม "เพิ่มสินค้า" เพื่อเลือกสินค้าจากระบบ</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#f5f5f7] text-[#555557] font-bold uppercase tracking-wider text-[10px]">
                        <th className="p-3 text-left">รายการ</th>
                        <th className="p-3 text-center w-16">หน่วย</th>
                        <th className="p-3 text-center w-20">จำนวน</th>
                        <th className="p-3 text-right w-28">ราคา/หน่วย</th>
                        <th className="p-3 text-right w-24">ส่วนลด</th>
                        <th className="p-3 text-right w-28">รวม</th>
                        <th className="p-3 w-10" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f5f5f7]">
                      {items.map((item) => (
                        <tr key={item.id} className="hover:bg-[#fafafa]">
                          <td className="p-3">
                            <div className="font-semibold text-[#1d1d1f]">{item.productName}</div>
                            <input
                              type="text"
                              value={item.description}
                              onChange={e => updateItem(item.id, 'description', e.target.value)}
                              placeholder="คำอธิบายเพิ่มเติม..."
                              className="mt-1 w-full text-xs text-[#555557] bg-transparent border-b border-dashed border-[#d2d2d7] focus:outline-none focus:border-[#0071e3] py-0.5 placeholder-[#bbb]"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="text"
                              value={item.unit}
                              onChange={e => updateItem(item.id, 'unit', e.target.value)}
                              className="w-full text-center text-xs bg-[#f5f5f7] border border-[#d2d2d7] rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#0071e3]"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={e => updateItem(item.id, 'quantity', Number(e.target.value) || 1)}
                              className="w-full text-center text-xs bg-[#f5f5f7] border border-[#d2d2d7] rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#0071e3]"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              min="0"
                              value={item.unitPrice}
                              onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value) || 0)}
                              className="w-full text-right text-xs bg-[#f5f5f7] border border-[#d2d2d7] rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#0071e3]"
                            />
                          </td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              <input
                                type="number"
                                min="0"
                                value={item.discount}
                                onChange={e => updateItem(item.id, 'discount', Number(e.target.value) || 0)}
                                className="w-14 text-right text-xs bg-[#f5f5f7] border border-[#d2d2d7] rounded-lg px-1.5 py-1.5 focus:outline-none focus:border-[#0071e3]"
                              />
                              <select
                                value={item.discountType}
                                onChange={e => updateItem(item.id, 'discountType', e.target.value)}
                                className="text-[10px] bg-[#f5f5f7] border border-[#d2d2d7] rounded-lg px-1 py-1.5 focus:outline-none"
                              >
                                <option value="baht">฿</option>
                                <option value="percent">%</option>
                              </select>
                            </div>
                          </td>
                          <td className="p-3 text-right font-bold text-[#1d1d1f]">
                            {fmt(calcLine(item))}
                          </td>
                          <td className="p-3">
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Summary Box */}
            {items.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#d2d2d7]/50 shadow-xs p-5">
                <div className="flex justify-end">
                  <div className="w-72 space-y-2">
                    <div className="flex justify-between text-sm text-[#555557]">
                      <span>รวมเป็นเงิน</span>
                      <span className="font-semibold text-[#1d1d1f]">{fmt(subtotal)} บาท</span>
                    </div>
                    <div className="flex justify-between text-sm text-[#555557]">
                      <span>ภาษีมูลค่าเพิ่ม 7%</span>
                      <span className="font-semibold text-[#1d1d1f]">{fmt(vatAmount)} บาท</span>
                    </div>
                    <div className="border-t border-[#e8e8ed] pt-2 flex justify-between text-sm font-extrabold text-[#1d1d1f]">
                      <span>จำนวนเงินรวมทั้งสิ้น</span>
                      <span className="text-orange-500 text-base">{fmt(totalAmount)} บาท</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
