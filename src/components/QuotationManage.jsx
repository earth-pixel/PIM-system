import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Search, X, Plus, Trash2, Edit2, Check, AlertTriangle, AlertCircle,
  FileText, ChevronRight, Clock, CheckCircle, XCircle, Mail
} from 'lucide-react';
import QuotationPrint from './QuotationPrint';
import EmailShareModal from './EmailShareModal';

const fmt = (n) =>
  Number(n || 0).toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const STATUS_CONFIG = {
  draft: { label: 'ร่าง', bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
  sent: { label: 'ส่งแล้ว', bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  approved: { label: 'อนุมัติแล้ว', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  rejected: { label: 'ไม่อนุมัติ', bg: 'bg-red-50', text: 'text-red-500', border: 'border-red-200' },
};

const STATUS_ICONS = {
  draft: <Clock className="w-3 h-3" />,
  sent: <ChevronRight className="w-3 h-3" />,
  approved: <CheckCircle className="w-3 h-3" />,
  rejected: <XCircle className="w-3 h-3" />,
};

const calcLineTotal = (it) => {
  const gross = it.quantity * it.unitPrice;
  return it.discountType === 'percent' ? gross * (1 - it.discount / 100) : gross - it.discount;
};

// ── Badge ──────────────────────────────────────────────────────────────────
const Badge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      {STATUS_ICONS[status]}
      {cfg.label}
    </span>
  );
};

// ── ProductPickerModal ───────────────────────────────────────
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
      <div onClick={onClose} className="absolute inset-0 bg-black/20 backdrop-blur-xs" />
      <div className="relative bg-white rounded-3xl shadow-2xl border border-[#d2d2d7]/40 w-full max-w-xl flex flex-col max-h-[80vh] z-10 animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#e8e8ed] flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-sm font-bold text-[#1d1d1f]">เลือกสินค้าจากระบบ PIM</h3>
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
                  onClick={() => {
                    setSelectedProduct(product);
                    setSelectedVariant(product.variants && product.variants.length > 0 ? product.variants[0] : null);
                  }}
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

const generateNewId = () => `qt-${Date.now()}`;
const generateItemId = () => Date.now() + Math.floor(Math.random() * 1000);

// ── List Tab ───────────────────────────────────────────────────────────────
const ListTab = ({ quotations, onView, onDelete, currentUser }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const filtered = quotations.filter(q => {
    const qNum = q.quotationNumber || q.id;
    const matchSearch = !search ||
      qNum.toLowerCase().includes(search.toLowerCase()) ||
      q.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
      (q.customer?.companyName || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || q.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="bg-white p-5 rounded-2xl border border-[#d2d2d7]/50 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#555557] absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหาเลขที่เอกสาร หรือชื่อลูกค้า..."
              className="w-full pl-9 pr-4 py-2.5 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-sm focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all placeholder-[#555557]"
            />
          </div>
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-sm text-zinc-700 focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all cursor-pointer font-semibold"
            >
              <option value="All">สถานะทั้งหมด</option>
              <option value="draft">ร่าง (Draft)</option>
              <option value="sent">ส่งแล้ว (Sent)</option>
              <option value="approved">อนุมัติแล้ว (Approved)</option>
              <option value="rejected">ไม่อนุมัติ (Rejected)</option>
            </select>
          </div>
        </div>
        <div className="text-xs text-[#555557] font-semibold uppercase tracking-wider border-t border-[#f5f5f7] pt-3">
          พบ <strong className="text-black">{filtered.length}</strong> รายการ
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-sm text-[#555557] font-semibold bg-white rounded-2xl border border-[#d2d2d7]/50">
          ไม่พบใบเสนอราคา
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/50 overflow-hidden divide-y divide-[#f5f5f7] shadow-xs">
          {filtered.map((q) => (
            <div
              key={q.id}
              onClick={() => onView(quotations.findIndex(x => x.id === q.id))}
              className="flex justify-between items-center px-5 py-4 cursor-pointer hover:bg-[#fafafa] transition-colors"
            >
              <div>
                <div className="text-xs font-bold text-[#0071e3] font-mono">{q.quotationNumber || q.id}</div>
                <div className="text-[11px] text-[#555557] mt-1">{q.customer?.name} · {q.customer?.companyName || 'ลูกค้าทั่วไป'}</div>
                <div className="text-[10px] text-[#aaa] mt-1">{q.issuedDate}</div>
              </div>
              <div className="text-right flex flex-col items-end gap-1.5">
                <div className="text-xs font-bold text-[#1d1d1f]">฿{fmt(q.totalAmount)}</div>
                <div className="flex items-center gap-2">
                  <Badge status={q.status} />
                  {q.status !== 'approved' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(q);
                      }}
                      className="p-1 text-red-400 hover:bg-red-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-red-100"
                      title="ลบเอกสาร"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Create Tab ─────────────────────────────────────────────────────────────
const CreateTab = ({ onSave, onCancel, products, editQt, currentUser }) => {
  const [form, setForm] = useState(() => {
    if (editQt) {
      return {
        custName: editQt.customer?.name || '',
        custCompany: editQt.customer?.companyName || '',
        custPhone: editQt.customer?.phone || '',
        custTax: editQt.customer?.taxId || '',
        custAddr: editQt.customer?.address || '',
        salesName: editQt.salespersonName || '',
        salesPhone: editQt.salespersonPhone || '',
        projName: editQt.projectName || '',
        validDate: editQt.validUntilDate || '',
        vatRate: String(editQt.vatRate ?? 7),
        note: editQt.note || '',
      };
    }
    return {
      custName: '', custCompany: '', custPhone: '',
      custTax: '', custAddr: '',
      salesName: currentUser?.name || currentUser?.username || '', salesPhone: '',
      projName: '', validDate: '', vatRate: '7', note: '',
    };
  });

  const [items, setItems] = useState(() => {
    if (editQt && editQt.items) {
      return editQt.items.map((it, idx) => ({ ...it, id: it.id || idx }));
    }
    return [{ id: generateItemId(), productName: '', description: '', quantity: 1, unit: 'ชิ้น', unitPrice: 0, discount: 0, discountType: 'percent', lineTotal: 0 }];
  });

  const [alert, setAlert] = useState(null);
  const [showPicker, setShowPicker] = useState(false);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const updateItem = (id, field, val) => {
    setItems(prev => prev.map(it => {
      if (it.id !== id) return it;
      const updated = { ...it, [field]: val };
      updated.lineTotal = calcLineTotal(updated);
      return updated;
    }));
  };

  const addItem = () => setItems(prev => [...prev, { id: generateItemId(), productName: '', description: '', quantity: 1, unit: 'ชิ้น', unitPrice: 0, discount: 0, discountType: 'percent', lineTotal: 0 }]);
  const removeItem = (id) => { setItems(prev => prev.filter(it => it.id !== id)); };

  const handleSelectProduct = (product, variant) => {
    const price = variant?.price ?? product.retailPrice ?? 0;
    const variantLabel = variant?.options?.map(o => o.value).join(' / ') ?? '';
    const newItem = {
      id: generateItemId(),
      productName: variantLabel ? `${product.name} (${variantLabel})` : product.name,
      description: '',
      unit: 'ชิ้น',
      quantity: 1,
      unitPrice: price,
      discount: 0,
      discountType: 'percent',
      lineTotal: price,
    };

    setItems(prev => {
      if (prev.length === 1 && prev[0].productName === '' && prev[0].unitPrice === 0) {
        return [newItem];
      }
      return [...prev, newItem];
    });
    setShowPicker(false);
  };

  const vatRate = Number(form.vatRate);
  const sub = items.reduce((s, it) => s + it.lineTotal, 0);
  const vat = sub * vatRate / 100;
  const total = sub + vat;

  const handleSave = (status) => {
    if (!form.custName.trim()) { setAlert({ type: 'error', msg: 'กรุณากรอกชื่อลูกค้า' }); return; }
    if (!form.custCompany.trim()) { setAlert({ type: 'error', msg: 'กรุณากรอกบริษัท' }); return; }
    if (!form.custPhone.trim()) { setAlert({ type: 'error', msg: 'กรุณากรอกเบอร์โทร' }); return; }
    if (!form.custTax.trim()) { setAlert({ type: 'error', msg: 'กรุณากรอกเลขผู้เสียภาษี' }); return; }
    if (!form.custAddr.trim()) { setAlert({ type: 'error', msg: 'กรุณากรอกที่อยู่' }); return; }
    if (!form.salesName.trim()) { setAlert({ type: 'error', msg: 'กรุณากรอกชื่อพนักงานขาย' }); return; }
    if (!form.salesPhone.trim()) { setAlert({ type: 'error', msg: 'กรุณากรอกเบอร์ติดต่อพนักงานขาย' }); return; }
    if (!form.projName.trim()) { setAlert({ type: 'error', msg: 'กรุณากรอกชื่อโปรเจกต์' }); return; }
    if (!form.validDate) { setAlert({ type: 'error', msg: 'กรุณาเลือกวันหมดอายุ' }); return; }
    if (!form.note.trim()) { setAlert({ type: 'error', msg: 'กรุณากรอกหมายเหตุ (หากไม่มีให้ใส่ -)' }); return; }
    if (!items.some(it => it.productName.trim())) { setAlert({ type: 'error', msg: 'กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ' }); return; }

    const validItems = items.filter(it => it.productName.trim());
    onSave({
      id: editQt ? editQt.id : generateNewId(),
      quotationNumber: editQt ? editQt.quotationNumber : undefined,
      customer: { name: form.custName, companyName: form.custCompany, phone: form.custPhone, taxId: form.custTax, address: form.custAddr },
      salespersonName: form.salesName, salespersonPhone: form.salesPhone,
      projectName: form.projName, issuedDate: editQt ? editQt.issuedDate : new Date().toISOString().slice(0, 10),
      validUntilDate: form.validDate, vatRate, note: form.note,
      items: validItems, subtotal: sub, vatAmount: vat, totalAmount: total, status,
    });
    setAlert({ type: 'success', msg: status === 'sent' ? 'ส่งใบเสนอราคาเรียบร้อย!' : 'บันทึกร่างเรียบร้อย!' });
    setTimeout(onCancel, 1200);
  };

  const labelClass = 'text-xs text-[#555557] font-semibold mb-1 block';
  const inputClass = 'w-full text-xs text-[#1d1d1f] bg-[#f5f5f7] border border-[#d2d2d7]/50 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all';
  const cardClass = 'bg-white border border-[#d2d2d7]/50 rounded-2xl p-5 shadow-xs';
  const titleClass = 'text-xs font-bold text-[#1d1d1f] border-b border-[#e8e8ed] pb-2 uppercase tracking-wider mb-4 flex items-center gap-2';

  return (
    <div>
      {showPicker && (
        <ProductPickerModal
          products={products}
          onSelect={handleSelectProduct}
          onClose={() => setShowPicker(false)}
        />
      )}

      {alert && (
        <div className={`p-4 rounded-2xl text-xs mb-4 flex items-center gap-2 border ${alert.type === 'error' ? 'bg-red-50 text-red-600 border-red-150' : 'bg-emerald-50 text-emerald-600 border-emerald-150'}`}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {alert.msg}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column: Customer & Details */}
        <div className="xl:col-span-1 space-y-6">
          {/* Customer info */}
          <div className={cardClass}>
            <div className={titleClass}>
              <span className="w-1.5 h-3.5 bg-blue-600 rounded-full"></span>
              ข้อมูลลูกค้า
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div><label className={labelClass}>ชื่อลูกค้า <span className="text-red-500">*</span></label><input className={inputClass} value={form.custName} onChange={e => setField('custName', e.target.value)} /></div>
                <div><label className={labelClass}>บริษัท <span className="text-red-500">*</span></label><input className={inputClass} value={form.custCompany} onChange={e => setField('custCompany', e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div><label className={labelClass}>เบอร์โทร <span className="text-red-500">*</span></label><input className={inputClass} value={form.custPhone} onChange={e => setField('custPhone', e.target.value)} /></div>
                <div><label className={labelClass}>เลขผู้เสียภาษี <span className="text-red-500">*</span></label><input className={inputClass} value={form.custTax} onChange={e => setField('custTax', e.target.value)} /></div>
              </div>
              <div><label className={labelClass}>ที่อยู่ <span className="text-red-500">*</span></label><textarea className={`${inputClass} resize-y min-h-[60px]`} value={form.custAddr} onChange={e => setField('custAddr', e.target.value)} /></div>
            </div>
          </div>

          {/* Doc details */}
          <div className={cardClass}>
            <div className={titleClass}>
              <span className="w-1.5 h-3.5 bg-blue-600 rounded-full"></span>
              รายละเอียดเอกสาร
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div><label className={labelClass}>พนักงานขาย <span className="text-red-500">*</span></label><input className={`${inputClass} !bg-zinc-300 !text-zinc-655 border-[#a1a1a6] cursor-not-allowed font-semibold`} value={form.salesName} readOnly disabled /></div>
                <div><label className={labelClass}>เบอร์ติดต่อ <span className="text-red-500">*</span></label><input className={inputClass} value={form.salesPhone} onChange={e => setField('salesPhone', e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div><label className={labelClass}>ชื่อโปรเจกต์ <span className="text-red-500">*</span></label><input className={inputClass} value={form.projName} onChange={e => setField('projName', e.target.value)} /></div>
                <div><label className={labelClass}>วันหมดอายุ <span className="text-red-500">*</span></label><input className={inputClass} type="date" value={form.validDate} onChange={e => setField('validDate', e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className={labelClass}>VAT (%) <span className="text-red-500">*</span></label>
                  <select className={inputClass} value={form.vatRate} onChange={e => setField('vatRate', e.target.value)}>
                    <option value="0">ไม่มี VAT</option>
                    <option value="7">7%</option>
                  </select>
                </div>
                <div><label className={labelClass}>หมายเหตุ <span className="text-red-500">*</span></label><input className={inputClass} value={form.note} onChange={e => setField('note', e.target.value)} /></div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Items */}
        <div className="xl:col-span-2 space-y-6">
          <div className={cardClass}>
            <div className="flex justify-between items-center border-b border-[#e8e8ed] pb-2 mb-4">
              <div className="text-xs font-bold text-[#1d1d1f] uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-3.5 bg-blue-600 rounded-full"></span>
                รายการสินค้า
              </div>
              <button
                type="button"
                onClick={() => setShowPicker(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-[#d2d2d7]/50 hover:bg-[#f5f5f7] text-[#1d1d1f] text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" /> ดึงข้อมูลสินค้าจากระบบ
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f5f5f7] text-[#555557] font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-3 text-center w-10">#</th>
                    <th className="p-3 text-left">ชื่อสินค้า / รายละเอียด</th>
                    <th className="p-3 text-center w-20">จำนวน</th>
                    <th className="p-3 text-center w-20">หน่วย</th>
                    <th className="p-3 text-right w-24">ราคา/หน่วย</th>
                    <th className="p-3 text-right w-28">ส่วนลด</th>
                    <th className="p-3 text-right w-24">รวม</th>
                    <th className="p-3 w-10 text-center" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f5f5f7]">
                  {items.map((it, idx) => (
                    <tr key={it.id} className="hover:bg-[#fafafa]">
                      <td className="p-3 text-center text-[#555557] font-medium">{idx + 1}</td>
                      <td className="p-3 min-w-[200px]">
                        <input className="w-full text-xs font-semibold text-[#1d1d1f] bg-transparent border-b border-transparent hover:border-[#d2d2d7] focus:border-[#0071e3] focus:bg-white focus:outline-none px-1.5 py-1 rounded transition-all" placeholder="ชื่อสินค้า" value={it.productName} onChange={e => updateItem(it.id, 'productName', e.target.value)} />
                        <input className="mt-1 w-full text-[11px] text-[#555557] bg-transparent border-b border-transparent hover:border-[#d2d2d7] focus:border-[#0071e3] focus:bg-white focus:outline-none px-1.5 py-1 rounded transition-all placeholder-[#bbb]" placeholder="รายละเอียด" value={it.description || ''} onChange={e => updateItem(it.id, 'description', e.target.value)} />
                      </td>
                      <td className="p-3">
                        <input type="number" className="w-full text-center text-xs bg-[#f5f5f7] border border-[#d2d2d7]/50 rounded-xl px-2 py-1.5 focus:outline-none focus:border-[#0071e3] focus:bg-white" value={it.quantity} min={1} onChange={e => updateItem(it.id, 'quantity', +e.target.value)} />
                      </td>
                      <td className="p-3">
                        <input className="w-full text-center text-xs bg-[#f5f5f7] border border-[#d2d2d7]/50 rounded-xl px-2 py-1.5 focus:outline-none focus:border-[#0071e3] focus:bg-white" value={it.unit} onChange={e => updateItem(it.id, 'unit', e.target.value)} />
                      </td>
                      <td className="p-3">
                        <input type="number" className="w-full text-right text-xs bg-[#f5f5f7] border border-[#d2d2d7]/50 rounded-xl px-2 py-1.5 focus:outline-none focus:border-[#0071e3] focus:bg-white" value={it.unitPrice} min={0} onChange={e => updateItem(it.id, 'unitPrice', +e.target.value)} />
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1 items-center">
                          <input type="number" className="w-16 text-right text-xs bg-[#f5f5f7] border border-[#d2d2d7]/50 rounded-xl px-1.5 py-1.5 focus:outline-none focus:border-[#0071e3] focus:bg-white" value={it.discount} min={0} onChange={e => updateItem(it.id, 'discount', +e.target.value)} />
                          <select className="text-[10px] bg-[#f5f5f7] border border-[#d2d2d7]/50 rounded-xl px-1 py-1.5 focus:outline-none cursor-pointer" value={it.discountType} onChange={e => updateItem(it.id, 'discountType', e.target.value)}>
                            <option value="percent">%</option>
                            <option value="amount">฿</option>
                          </select>
                        </div>
                      </td>
                      <td className="p-3 text-right font-bold text-[#1d1d1f] w-20">{fmt(it.lineTotal)}</td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(it.id)}
                          className="p-1.5 text-[#d2d2d7] hover:text-red-650 rounded-lg hover:bg-red-50 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={addItem} className="flex items-center gap-1.5 text-xs font-bold text-[#0071e3] hover:text-[#0077ed] bg-transparent border-none cursor-pointer py-2 mt-2">
              <Plus className="w-3.5 h-3.5" /> เพิ่มรายการ
            </button>
            <div className="bg-[#f5f5f7] rounded-xl p-4 mt-4 space-y-2">
              {[
                ['ยอดรวมก่อนภาษี', fmt(sub)],
                [`VAT (${vatRate}%)`, fmt(vat)]
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between text-xs text-[#555557] font-medium">
                  <span>{l}</span>
                  <span>{v}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-extrabold text-[#1d1d1f] border-t border-[#d2d2d7]/50 pt-2 mt-2">
                <span>ยอดรวมสุทธิ</span>
                <span className="text-[#0071e3]">฿{fmt(total)}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2.5 flex-wrap">
            <button onClick={() => handleSave('sent')} className="px-4 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> บันทึก &amp; ส่ง
            </button>
            <button onClick={() => handleSave('draft')} className="px-4 py-2.5 bg-white hover:bg-[#f5f5f7] text-[#1d1d1f] border border-[#d2d2d7]/50 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer">
              บันทึกร่าง
            </button>
            <button onClick={onCancel} className="px-4 py-2.5 bg-white hover:bg-[#f5f5f7] text-[#1d1d1f] border border-[#d2d2d7]/50 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer">
              ยกเลิก
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Preview Tab (Split Screen Sidebar + Detail Layout) ──────────────────────
const PreviewTab = ({
  quotations,
  selectedIndex,
  onSelectIndex,
  onStatusChange,
  onPrint,
  onEdit,
  onDelete,
  onEmailClick,
  currentUser
}) => {
  const [search, setSearch] = useState('');

  const filtered = quotations.filter(q => {
    const qNum = q.quotationNumber || q.id;
    return !search ||
      qNum.toLowerCase().includes(search.toLowerCase()) ||
      q.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
      (q.customer?.companyName || '').toLowerCase().includes(search.toLowerCase());
  });

  const selectedQt = selectedIndex !== null && quotations[selectedIndex] ? quotations[selectedIndex] : null;

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* LEFT SIDEBAR: Quotation list with Search */}
      <div className="w-full lg:w-80 flex-shrink-0 bg-white border border-[#d2d2d7]/50 rounded-2xl p-4 shadow-xs space-y-4 self-stretch lg:self-auto flex flex-col">
        <div className="text-xs font-bold text-[#1d1d1f] uppercase tracking-wider">
          เลือกเอกสารใบเสนอราคา
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#555557] absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาใบเสนอราคา..."
            className="w-full text-xs text-[#1d1d1f] bg-[#f5f5f7] border border-[#d2d2d7]/50 rounded-xl pl-8 pr-3 py-2.5 focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all font-medium"
          />
        </div>

        {/* Scrollable list container */}
        <div className="max-h-[500px] lg:max-h-[600px] overflow-y-auto space-y-2 pr-1 flex-1">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-xs text-[#555557] font-semibold bg-gray-50 rounded-xl border border-[#d2d2d7]/20">
              ไม่พบใบเสนอราคา
            </div>
          ) : (
            filtered.map(q => {
              const originalIndex = quotations.findIndex(x => x.id === q.id);
              const isActive = originalIndex === selectedIndex;
              return (
                <div
                  key={q.id}
                  onClick={() => onSelectIndex(originalIndex)}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${isActive
                      ? 'bg-blue-50/70 border-[#0071e3] shadow-xs'
                      : 'bg-white border-[#d2d2d7]/40 hover:bg-[#fafafa]'
                    }`}
                >
                  <div className="flex justify-between items-start gap-1">
                    <span className="font-mono text-xs font-bold text-[#0071e3]">
                      {q.quotationNumber || q.id}
                    </span>
                    <Badge status={q.status} />
                  </div>
                  <div className="text-xs font-bold text-[#1d1d1f] mt-1.5 truncate">
                    {q.customer?.name || 'ลูกค้าทั่วไป'}
                  </div>
                  {q.customer?.companyName && (
                    <div className="text-[10px] text-[#555557] truncate mt-0.5 font-medium">
                      {q.customer.companyName}
                    </div>
                  )}
                  <div className="flex justify-between items-center mt-2.5 border-t border-[#f5f5f7] pt-2">
                    <span className="text-[9px] text-[#aaa] font-semibold">{q.issuedDate}</span>
                    <span className="text-xs font-extrabold text-[#1d1d1f]">
                      ฿{fmt(q.totalAmount)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT PANEL: Selected Quotation details */}
      <div className="flex-1 min-w-0 w-full">
        {!selectedQt ? (
          <div className="text-center py-28 text-sm text-[#555557] font-semibold bg-white rounded-2xl border border-[#d2d2d7]/50 shadow-xs flex flex-col items-center justify-center gap-3">
            <FileText className="w-12 h-12 text-zinc-300" />
            <span>กรุณาเลือกใบเสนอราคาจากรายการด้านซ้ายเพื่อดูรายละเอียด</span>
          </div>
        ) : (() => {
          const q = selectedQt;
          const index = selectedIndex;
          const canPrint = q.status !== 'draft' && q.status !== 'rejected';
          const canEdit = q.status !== 'approved' && (
            currentUser?.role === 'admin' ||
            (currentUser?.role === 'manager' && q.status !== 'approved') ||
            (currentUser?.role === 'user' && (q.status === 'draft' || q.status === 'sent'))
          );
          return (
            <div className="space-y-4 animate-fade-in text-[#1d1d1f]">
              {/* Header actions card */}
              <div className="bg-[#f5f5f7] rounded-2xl border border-[#d2d2d7]/50 p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-[#1d1d1f] flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[#0071e3] text-base">{q.quotationNumber || q.id}</span>
                    <Badge status={q.status} />
                  </div>
                  <div className="text-[11px] text-[#555557] mt-1 font-semibold">
                    {q.customer?.name} {q.customer?.companyName ? `· ${q.customer.companyName}` : ''}
                  </div>
                  {q.status === 'approved' && q.approvedBy && (
                    <div className="text-[10px] text-emerald-600 font-extrabold mt-1.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                      ผู้อนุมัติ: {q.approvedBy}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 items-center self-start md:self-auto">
                  {(q.status === 'sent' || (q.status === 'draft' && (currentUser?.role === 'admin' || currentUser?.role === 'manager'))) && (
                    <>
                      <button
                        onClick={() => onStatusChange(index, 'approved')}
                        className="px-3.5 py-2 text-xs font-bold bg-[#eaf3de] hover:bg-[#dcedc7] text-[#3b6d11] border border-[#c0dd97] rounded-xl cursor-pointer transition-colors"
                      >
                        ✓ อนุมัติ
                      </button>
                      <button
                        onClick={() => onStatusChange(index, 'rejected')}
                        className="px-3.5 py-2 text-xs font-bold bg-[#fcebeb] hover:bg-[#fad8d8] text-[#a32d2d] border border-[#f7c1c1] rounded-xl cursor-pointer transition-colors"
                      >
                        ✕ ไม่อนุมัติ
                      </button>
                    </>
                  )}

                  {q.status === 'draft' && currentUser?.role === 'user' && (
                    <button
                      onClick={() => onStatusChange(index, 'sent')}
                      className="px-3.5 py-2 text-xs font-bold bg-[#e0f2fe] hover:bg-[#bae6fd] text-[#0369a1] border border-[#bae6fd] rounded-xl cursor-pointer transition-colors"
                    >
                      ส่งเอกสาร
                    </button>
                  )}

                  {canEdit && (
                    <button
                      onClick={() => onEdit(q)}
                      className="px-3.5 py-2 text-xs font-bold bg-white hover:bg-[#f5f5f7] text-[#1d1d1f] border border-[#d2d2d7]/50 rounded-xl cursor-pointer transition-colors flex items-center gap-1.5"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> แก้ไข
                    </button>
                  )}
                  {q.status !== 'approved' && (
                    <button
                      onClick={() => onDelete(q)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-red-200"
                      title="ลบเอกสาร"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  {q.status !== 'draft' && (
                    <button
                      onClick={() => onEmailClick(q)}
                      className="px-3.5 py-2 text-xs font-bold bg-[#f0fdf4] hover:bg-[#dcfce7] text-[#166534] border border-[#dcfce7] rounded-xl cursor-pointer transition-colors flex items-center gap-1.5"
                    >
                      <Mail className="w-3.5 h-3.5" /> ส่งออนไลน์/อีเมล
                    </button>
                  )}

                  {canPrint ? (
                    <button
                      onClick={() => onPrint(q)}
                      className="px-4 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      พิมพ์เอกสาร
                    </button>
                  ) : (
                    <span className="text-[10px] font-bold text-[#a32d2d] bg-[#fcebeb] px-3 py-2 rounded-full border border-[#f7c1c1]">
                      ไม่สามารถพิมพ์ได้
                    </span>
                  )}
                </div>
              </div>

              {/* Main Document Details Display */}
              <div className="bg-white border border-[#d2d2d7]/50 rounded-2xl p-6 shadow-xs">
                {/* Details layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-[#1d1d1f]">
                  <div className="bg-[#f5f5f7]/40 rounded-xl p-4 border border-[#d2d2d7]/30">
                    <div className="text-xs font-extrabold text-[#1d1d1f] border-b border-[#e8e8ed] pb-2 mb-3 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-1.5 h-3.5 bg-blue-600 rounded-full"></span>
                      ข้อมูลลูกค้า
                    </div>
                    <div className="space-y-2.5">
                      {[
                        ['ชื่อลูกค้า', q.customer?.name],
                        ['บริษัท', q.customer?.companyName || '-'],
                        ['เบอร์โทร', q.customer?.phone || '-'],
                        ['เลขผู้เสียภาษี', q.customer?.taxId || '-'],
                        ['ที่อยู่', q.customer?.address || '-']
                      ].map(([l, v]) => (
                        <div key={l} className="flex gap-2 leading-relaxed">
                          <span className="text-[#555557] font-semibold min-w-[90px]">{l}</span>
                          <span className="text-black font-medium">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#f5f5f7]/40 rounded-xl p-4 border border-[#d2d2d7]/30">
                    <div className="text-xs font-extrabold text-[#1d1d1f] border-b border-[#e8e8ed] pb-2 mb-3 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-1.5 h-3.5 bg-blue-600 rounded-full"></span>
                      รายละเอียดเอกสาร
                    </div>
                    <div className="space-y-2.5">
                      {[
                        ['ผู้ขาย', q.salespersonName],
                        ['เบอร์ติดต่อ', q.salespersonPhone || '-'],
                        ['ชื่อโปรเจกต์', q.projectName || '-'],
                        ['วันที่ออกเอกสาร', q.issuedDate],
                        ['ใช้ได้ถึงวันที่', q.validUntilDate || '-'],
                        ['VAT (%)', (q.vatRate ?? 7) + '%']
                      ].map(([l, v]) => (
                        <div key={l} className="flex gap-2 leading-relaxed">
                          <span className="text-[#555557] font-semibold min-w-[90px]">{l}</span>
                          <span className="text-black font-medium">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Items table layout */}
                <div className="overflow-x-auto mt-6">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-zinc-800 text-white">
                        {['ลำดับ', 'รายการสินค้า', 'จำนวน', 'หน่วย', 'ราคา/หน่วย', 'ส่วนลด', 'รวม'].map((h, i) => (
                          <th
                            key={i}
                            className={`p-3 font-bold text-[10px] tracking-wider uppercase ${i >= 2 ? (i <= 3 ? 'text-center' : 'text-right') : 'text-left'
                              }`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2e8f0]">
                      {q.items?.map((it, idx) => (
                        <tr key={it.id || idx} className="hover:bg-[#fafafa]/50">
                          <td className="p-3 text-center text-[#555557] font-medium">{idx + 1}</td>
                          <td className="p-3">
                            <div className="font-semibold text-black">{it.productName}</div>
                            {it.description && <div className="text-[10px] text-[#555557] mt-1">{it.description}</div>}
                          </td>
                          <td className="p-3 text-center font-semibold text-black">{it.quantity}</td>
                          <td className="p-3 text-center text-[#555557]">{it.unit}</td>
                          <td className="p-3 text-right text-black font-medium">{fmt(it.unitPrice)}</td>
                          <td className="p-3 text-right text-red-500 font-medium font-semibold">
                            {it.discount > 0 ? (it.discountType === 'percent' ? it.discount + '%' : fmt(it.discount)) : '0'}
                          </td>
                          <td className="p-3 text-right font-bold text-black">{fmt(it.lineTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Amount summarizes */}
                <div className="flex justify-end mt-6">
                  <div className="w-72 space-y-2 text-xs">
                    {[
                      ['ยอดรวมก่อนภาษี', fmt(q.subtotal)],
                      [`VAT ${q.vatRate ?? 7}%`, fmt(q.vatAmount)]
                    ].map(([l, v]) => (
                      <div key={l} className="flex justify-between text-[#555557] font-medium">
                        <span>{l}</span>
                        <span className="text-black font-semibold">{v} บาท</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-extrabold text-[#1d1d1f] border-t border-[#e2e8f0] pt-2.5 mt-1 bg-[#f5f5f7]/40 rounded-xl p-3 border border-[#d2d2d7]/30">
                      <span>ยอดรวมสุทธิ</span>
                      <span className="text-zinc-800 font-black">฿{fmt(q.totalAmount)}</span>
                    </div>
                  </div>
                </div>

                {q.note && (
                  <div className="mt-4 text-[10px] text-[#555557] bg-[#f5f5f7] border border-[#e2e8f0] rounded-xl p-3.5 leading-relaxed">
                    <strong>หมายเหตุ:</strong> {q.note}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

// ── Main App Component ──────────────────────────────────────────────────────
export default function QuotationManage({
  quotations = [],
  products = [],
  companyInfo = {},
  currentUser,
  onSaveQuotation,
  onDeleteQuotation,
  addActivityLog,
}) {
  const [tab, setTab] = useState('list'); // 'list' | 'create' | 'preview'
  const [previewIndex, setPreviewIndex] = useState(null);
  const [editQt, setEditQt] = useState(null);
  const [printQt, setPrintQt] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [emailQt, setEmailQt] = useState(null);

  const handleView = (i) => {
    setPreviewIndex(i);
    setTab('preview');
  };

  const handleCreate = () => {
    setEditQt(null);
    setTab('create');
  };

  const handleEdit = (q) => {
    setEditQt(q);
    setTab('create');
  };

  const handleSave = (data) => {
    const savedData = {
      ...data,
      id: editQt ? editQt.id : generateNewId(),
      quotationNumber: editQt ? editQt.quotationNumber : `QT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(quotations.length + 1).padStart(4, '0')}`,
    };
    onSaveQuotation(savedData);
    setEditQt(null);
  };

  const handleDelete = (q) => {
    onDeleteQuotation(q.id);
    setDeleteTarget(null);
    if (previewIndex !== null) {
      setPreviewIndex(null);
    }
  };

  const handleStatusChange = (index, status) => {
    const q = quotations[index];
    if (q) {
      onSaveQuotation({
        ...q,
        status,
        approvedBy: status === 'approved' ? currentUser?.name || currentUser?.username || 'ไม่ระบุ' : q.approvedBy,
        approvedDate: status === 'approved' ? new Date().toISOString() : q.approvedDate
      });
    }
  };

  // Render Print overlay if active
  if (printQt) {
    return (
      <QuotationPrint
        quotation={printQt}
        companyInfo={companyInfo}
        onClose={() => setPrintQt(null)}
      />
    );
  }

  // Early return for Create tab to provide dedicated full page layout
  if (tab === 'create') {
    return (
      <div className="space-y-6 animate-fade-in text-[#1d1d1f]">
        {/* Dedicated Header for Create/Edit */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#e2e8f0] pb-4 mb-4 gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f]">
              {editQt ? 'แก้ไขใบเสนอราคา' : 'สร้างใบเสนอราคาใหม่'}
            </h1>
            <p className="text-xs text-[#555557] mt-0.5">
              {editQt ? `แก้ไขเอกสารเลขที่ ${editQt.quotationNumber || editQt.id}` : 'ระบุรายละเอียดและรายการสินค้าด้านล่าง'}
            </p>
          </div>
          <button
            onClick={() => setTab('list')}
            className="px-4 py-2 bg-white border border-[#d2d2d7]/50 hover:bg-[#f5f5f7] text-[#1d1d1f] text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
          >
            ย้อนกลับ
          </button>
        </div>

        <CreateTab
          onSave={handleSave}
          onCancel={() => setTab('list')}
          products={products}
          editQt={editQt}
          currentUser={currentUser}
        />
      </div>
    );
  }

  // Normal view layout with List and Preview tabs
  return (
    <div className="space-y-6 animate-fade-in text-[#1d1d1f]">
      {/* Email Share Modal */}
      <EmailShareModal
        isOpen={emailQt !== null}
        onClose={() => setEmailQt(null)}
        quotation={emailQt}
        onLogActivity={(actionText) => {
          if (addActivityLog) {
            addActivityLog(actionText);
          }
        }}
      />

      {/* Delete Confirm Modal */}
      {deleteTarget && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div onClick={() => setDeleteTarget(null)} className="absolute inset-0 bg-black/15 backdrop-blur-xs" />
          <div className="relative bg-white rounded-3xl border border-[#d2d2d7]/50 max-w-sm w-full p-6 shadow-lg space-y-4 z-10 animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h2 className="font-bold text-sm uppercase tracking-wide text-[#1d1d1f]">ลบใบเสนอราคา?</h2>
              <p className="text-xs text-[#555557] mt-1">
                {deleteTarget.quotationNumber || deleteTarget.id} — {deleteTarget.customer?.name || 'ลูกค้าทั่วไป'}
              </p>
            </div>
            <div className="flex gap-2.5 text-xs font-semibold">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 border border-[#d2d2d7] rounded-full hover:bg-[#f5f5f7] cursor-pointer transition-colors">ยกเลิก</button>
              <button onClick={() => handleDelete(deleteTarget)} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full cursor-pointer transition-colors">ลบเอกสาร</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f]">ใบเสนอราคา</h1>  
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          สร้างใบเสนอราคา
        </button>
      </div>

      {/* Tabs Menu Header */}
      <div className="flex gap-2 border-b border-[#e2e8f0] pb-0 mb-6">
        {['list', 'preview'].map(t => (
          <button
            key={t}
            onClick={() => {
              if (t === 'preview' && previewIndex === null && quotations.length > 0) {
                setPreviewIndex(0);
              }
              setTab(t);
            }}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 -mb-[2px] transition-all cursor-pointer ${tab === t
                ? 'text-[#0071e3] border-[#0071e3]'
                : 'text-[#555557] border-transparent hover:text-black'
              }`}
          >
            {t === 'list' ? 'รายการ' : 'ตัวอย่างเอกสาร'}
          </button>
        ))}
      </div>

      {tab === 'list' && (
        <ListTab
          quotations={quotations}
          onView={handleView}
          onDelete={setDeleteTarget}
          currentUser={currentUser}
        />
      )}

      {tab === 'preview' && (
        <PreviewTab
          quotations={quotations}
          selectedIndex={previewIndex !== null ? previewIndex : (quotations.length > 0 ? 0 : null)}
          onSelectIndex={setPreviewIndex}
          onStatusChange={handleStatusChange}
          onPrint={setPrintQt}
          onEdit={handleEdit}
          onDelete={setDeleteTarget}
          onEmailClick={setEmailQt}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}
