import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Search, X, Plus, Trash2, Edit2, Check, AlertTriangle, AlertCircle,
  FileText, ChevronRight, ChevronDown, Clock, CheckCircle, XCircle, Mail, Printer, Download,
  Users, UserCheck, Package, Barcode, Compass
} from 'lucide-react';
import QuotationPrint from './QuotationPrint';
import BarcodeDisplay from './BarcodeDisplay';
import * as XLSX from 'xlsx';
import MobileDownloadModal from './MobileDownloadModal';
import { checkIsInAppBrowser } from '../utils/browserUtils';
import { playScanBeep, findProductByBarcodeOrCode } from '../utils/scannerUtils';
import { isExpiredQuotation, getExpiryStatus } from '../utils/validation';
import DropdownFilter from './DropdownFilter';
import { useToast } from '../contexts/ToastContext';
import { canPerformAction } from '../utils/permissions';

export const THAI_REGIONS = [
  'ภาคกลาง',
  'ภาคเหนือ',
  'ภาคตะวันออกเฉียงเหนือ',
  'ภาคตะวันออก',
  'ภาคตะวันตก',
  'ภาคใต้'
];

const getBranchInfo = (customer = {}) => {
  const rawBranch = String(customer.branch || '').trim();
  const rawName = String(customer.branchName || '').trim().replace(/^สาขา\s*/, '');
  const isSub = customer.branchType === 'sub' || (rawBranch && !rawBranch.includes('สำนักงานใหญ่') && rawBranch !== 'Head Office');
  const fallbackName = rawBranch.replace(/^สาขา\s*/, '').trim();
  const branchName = isSub ? (rawName || (fallbackName !== 'ย่อย' ? fallbackName : '')) : '';
  return {
    branchType: isSub ? 'sub' : 'head',
    branchName,
    branch: isSub ? (branchName ? `สาขา ${branchName}` : 'สาขาย่อย') : 'สำนักงานใหญ่'
  };
};

const fmt = (n) =>
  Number(n || 0).toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const STATUS_CONFIG = {
  draft: { label: 'แบบร่าง', bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
  sent: { label: 'รออนุมัติ', bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
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

const isOwnDocument = (q, currentUser) => {
  if (!currentUser) return false;
  const creator = q.createdBy || '';
  const salesName = q.salespersonName || '';
  return creator === currentUser.username ||
    salesName.toLowerCase().includes(currentUser.username.toLowerCase()) ||
    (currentUser.name && salesName.toLowerCase().includes(currentUser.name.toLowerCase()));
};

const formatDate = (d) => {
  if (!d) return '-';
  try {
    if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const [year, month, day] = d.split('-').map(Number);
      return `${day}/${month}/${year + 543}`;
    }
    if (typeof d === 'string' && d.includes('T')) {
      const dateObj = new Date(d);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toLocaleDateString('th-TH');
      }
    }
    const dateObj = new Date(d);
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toLocaleDateString('th-TH');
    }
    return d;
  } catch {
    return d;
  }
};

const canDeleteDocument = (q, currentUser) => {
  if (!currentUser) return false;
  if (!canPerformAction(currentUser, 'quotations.delete')) return false;
  // เอกสารรออนุมัติ (sent) ไม่สามารถลบได้ ต้องดำเนินการอนุมัติหรือปฏิเสธก่อน
  if (q?.status === 'sent') return false;
  if (currentUser.role === 'admin') return true;
  if (currentUser.role === 'manager' || currentUser.role === 'user') {
    if (q.documentType === 'product_proposal') {
      return isOwnDocument(q, currentUser);
    }
    // ใบเสนอราคา: ลบได้ถ้าเป็นของตัวเอง และยังไม่อนุมัติ (status !== 'approved')
    return isOwnDocument(q, currentUser) && q.status !== 'approved';
  }
  return isOwnDocument(q, currentUser);
};

// ── Badge ──────────────────────────────────────────────────────────────────
const Badge = ({ status, expired }) => {
  if (expired) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full font-bold border bg-red-50 text-red-600 border-red-200">
        <AlertCircle className="w-3 h-3" />
        หมดอายุ
      </span>
    );
  }
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      {STATUS_ICONS[status]}
      {cfg.label}
    </span>
  );
};

function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'ยืนยัน', cancelText = 'ยกเลิก', type = 'danger' }) {
  if (!isOpen) return null;
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in">
      <div onClick={onClose} className="absolute inset-0 bg-black/15 backdrop-blur-xs" />
      <div className="relative bg-white rounded-3xl border border-[#d2d2d7]/50 max-w-sm w-full p-6 shadow-lg space-y-4 z-10 animate-scale-in">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${type === 'danger' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-550'}`}>
          {type === 'danger' ? <AlertTriangle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
        </div>
        <div>
          <h2 className="font-bold text-sm uppercase tracking-wide text-[#1d1d1f]">{title}</h2>
          <p className="text-xs text-[#555557] mt-1 leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-2.5 text-xs font-semibold pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 border border-[#d2d2d7] rounded-full hover:bg-[#f5f5f7] cursor-pointer transition-colors">{cancelText}</button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 py-2.5 text-white rounded-full cursor-pointer transition-colors ${type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#0071e3] hover:bg-[#0077ed]'}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── ProductPickerModal ───────────────────────────────────────
function ProductPickerModal({ products, onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const [selectedMap, setSelectedMap] = useState({}); // key -> { product, variant }
  const [expandedProductIds, setExpandedProductIds] = useState(new Set());
  const [scanFeedback, setScanFeedback] = useState(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (!scanFeedback) return;
    const timer = setTimeout(() => setScanFeedback(null), 3200);
    return () => clearTimeout(timer);
  }, [scanFeedback]);

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const term = search.toLowerCase().trim();
    return products.filter(p =>
      (p.name && p.name.toLowerCase().includes(term)) ||
      (p.code && p.code.toLowerCase().includes(term)) ||
      (p.barcode && p.barcode.toLowerCase().includes(term)) ||
      (p.brand && p.brand.toLowerCase().includes(term)) ||
      (p.category && p.category.toLowerCase().includes(term)) ||
      (p.variants && p.variants.some(v =>
        (v.sku && v.sku.toLowerCase().includes(term)) ||
        (v.barcode && v.barcode.toLowerCase().includes(term)) ||
        (v.options && v.options.some(o => o.value && o.value.toLowerCase().includes(term)))
      ))
    );
  }, [products, search]);

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const term = search.trim();

      // If user presses Enter on empty search and has items selected, confirm immediately
      if (!term) {
        if (Object.keys(selectedMap).length > 0) {
          handleConfirm();
        }
        return;
      }

      // Check barcode / SKU match
      let match = findProductByBarcodeOrCode(products, term);

      // Fallback: if exactly 1 product matched in current filtered list
      if (!match && filtered.length === 1) {
        const p = filtered[0];
        if (p.variants && p.variants.length === 1) {
          match = { product: p, variant: p.variants[0], variantIdx: 0 };
        } else {
          match = { product: p, variant: null, variantIdx: -1 };
        }
      }

      if (match && match.product) {
        const { product, variant, variantIdx } = match;

        if (variant && variantIdx >= 0) {
          const key = `${product.id}__var__${variantIdx}`;
          setSelectedMap(prev => ({
            ...prev,
            [key]: { product, variant }
          }));
        } else if (product.variants && product.variants.length > 0) {
          setSelectedMap(prev => {
            const next = { ...prev };
            product.variants.forEach((v, idx) => {
              next[`${product.id}__var__${idx}`] = { product, variant: v };
            });
            return next;
          });
        } else {
          const key = `prod_${product.id}`;
          setSelectedMap(prev => ({
            ...prev,
            [key]: { product, variant: null }
          }));
        }

        playScanBeep('success');
        const varLabel = variant?.options?.map(o => o.value).join('/') || variant?.sku;
        const displayName = varLabel ? `${product.name} (${varLabel})` : product.name;
        setScanFeedback({
          type: 'success',
          message: `ยิงบาร์โค้ดสำเร็จ: ${displayName}`
        });
        setSearch('');
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 30);
      } else {
        playScanBeep('error');
        setScanFeedback({
          type: 'error',
          message: `ไม่พบสินค้าสำหรับบาร์โค้ด "${term}"`
        });
        searchInputRef.current?.select();
      }
    }
  };

  const toggleProduct = (product) => {
    const hasVariants = product.variants && product.variants.length > 0;
    if (hasVariants) {
      const allSelected = product.variants.every((_, idx) => !!selectedMap[`${product.id}__var__${idx}`]);
      setSelectedMap(prev => {
        const next = { ...prev };
        if (allSelected) {
          product.variants.forEach((_, idx) => {
            delete next[`${product.id}__var__${idx}`];
          });
        } else {
          product.variants.forEach((v, idx) => {
            next[`${product.id}__var__${idx}`] = { product, variant: v };
          });
        }
        return next;
      });
    } else {
      const key = `prod_${product.id}`;
      setSelectedMap(prev => {
        const next = { ...prev };
        if (next[key]) {
          delete next[key];
        } else {
          next[key] = { product, variant: null };
        }
        return next;
      });
    }
  };

  const toggleVariant = (product, variant, idx, e) => {
    if (e) e.stopPropagation();
    const key = `${product.id}__var__${idx}`;
    setSelectedMap(prev => {
      const next = { ...prev };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = { product, variant };
      }
      return next;
    });
  };

  const toggleExpand = (productId, e) => {
    e.stopPropagation();
    setExpandedProductIds(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const isProductSelected = (product) => {
    if (product.variants && product.variants.length > 0) {
      return product.variants.some((_, idx) => !!selectedMap[`${product.id}__var__${idx}`]);
    }
    return !!selectedMap[`prod_${product.id}`];
  };

  const isProductFullySelected = (product) => {
    if (product.variants && product.variants.length > 0) {
      return product.variants.every((_, idx) => !!selectedMap[`${product.id}__var__${idx}`]);
    }
    return !!selectedMap[`prod_${product.id}`];
  };

  const selectedCount = Object.keys(selectedMap).length;

  const handleSelectAll = () => {
    const allFilteredKeys = [];
    filtered.forEach(p => {
      if (p.variants && p.variants.length > 0) {
        p.variants.forEach((v, idx) => {
          allFilteredKeys.push({ key: `${p.id}__var__${idx}`, product: p, variant: v });
        });
      } else {
        allFilteredKeys.push({ key: `prod_${p.id}`, product: p, variant: null });
      }
    });

    const isAllCurrentSelected = allFilteredKeys.length > 0 && allFilteredKeys.every(item => !!selectedMap[item.key]);

    setSelectedMap(prev => {
      const next = { ...prev };
      if (isAllCurrentSelected) {
        allFilteredKeys.forEach(item => {
          delete next[item.key];
        });
      } else {
        allFilteredKeys.forEach(item => {
          next[item.key] = { product: item.product, variant: item.variant };
        });
      }
      return next;
    });
  };

  const handleClearAll = () => {
    setSelectedMap({});
  };

  const handleConfirm = () => {
    const items = Object.values(selectedMap);
    if (items.length === 0) return;
    onSelect(items);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 animate-fade-in">
      <div onClick={onClose} className="absolute inset-0 bg-black/25 backdrop-blur-xs" />
      <div className="relative bg-white rounded-3xl shadow-2xl border border-[#d2d2d7]/50 w-full max-w-2xl flex flex-col max-h-[85vh] z-10 animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#e8e8ed] flex items-center justify-between flex-shrink-0 bg-white">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#1d1d1f]">เลือกสินค้าจากระบบ PIM</h3>
              <span className="text-[11px] font-bold bg-blue-50 text-[#0071e3] px-2.5 py-0.5 rounded-full border border-blue-100/80">
                เลือกได้หลายรายการ
              </span>
            </div>
            <p className="text-xs text-[#555557] mt-0.5">เลือกสินค้าที่ต้องการแล้วกดยืนยันเพื่อเพิ่มลงในเอกสารพร้อมกัน</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#f5f5f7] cursor-pointer text-[#86868b] hover:text-[#1d1d1f] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Bulk Bar */}
        <div className="px-6 py-3 border-b border-[#f5f5f7] flex-shrink-0 bg-[#fafafa] space-y-2.5">
          <div className="relative">
            <Barcode className="w-4 h-4 text-[#0071e3] absolute left-3 top-2.5" />
            <input
              ref={searchInputRef}
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="ค้นหาชื่อสินค้า, รหัส SKU, หรือยิง Barcode Scanner..."
              className="w-full pl-9 pr-28 py-2 bg-white border border-[#d2d2d7] rounded-xl text-xs focus:outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3] transition-all shadow-xs"
            />
            <div className="absolute right-2.5 top-2 flex items-center gap-1.5">
              {search ? (
                <button
                  type="button"
                  onClick={() => { setSearch(''); searchInputRef.current?.focus(); }}
                  className="text-[#86868b] hover:text-[#1d1d1f] p-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <span className="text-[10px] font-bold text-[#0071e3] bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  รองรับ Barcode
                </span>
              )}
            </div>
          </div>

          {/* Scanner Feedback Banner */}
          {scanFeedback && (
            <div className={`flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold animate-fade-in ${
              scanFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs' : 'bg-red-50 text-red-700 border border-red-200 shadow-xs'
            }`}>
              <div className="flex items-center gap-2 truncate">
                {scanFeedback.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />}
                <span className="truncate">{scanFeedback.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setScanFeedback(null)}
                className="text-zinc-400 hover:text-zinc-600 p-0.5 ml-2 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between text-xs pt-0.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-3 py-1.5 bg-white border border-[#d2d2d7] hover:border-[#0071e3] hover:text-[#0071e3] rounded-lg font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1.5 text-xs"
              >
                <Check className="w-3.5 h-3.5" />
                เลือกทั้งหมด ({filtered.length})
              </button>
              {selectedCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg font-bold transition-colors cursor-pointer text-xs"
                >
                  ล้างที่เลือก
                </button>
              )}
            </div>

            <div className="text-[#555557] font-medium text-xs">
              พบ <span className="font-bold text-[#1d1d1f]">{filtered.length}</span> รายการ
              {selectedCount > 0 && (
                <span className="ml-2 px-2.5 py-0.5 bg-[#0071e3] text-white font-bold rounded-full text-xs">
                  เลือกแล้ว {selectedCount}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Product List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#f5f5f7] bg-white">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-[#555557] text-xs">
              <p className="font-bold text-sm text-[#1d1d1f] mb-1">ไม่พบสินค้าที่ค้นหา</p>
              <p>ลองเปลี่ยนคำค้นหา หรือตรวจสอบชื่อสินค้า / รหัส SKU</p>
            </div>
          ) : (
            filtered.map(product => {
              const hasVars = product.variants && product.variants.length > 0;
              const isExpanded = expandedProductIds.has(product.id);
              const isSelected = isProductSelected(product);
              const isFullySelected = isProductFullySelected(product);

              return (
                <div key={product.id} className={`transition-colors ${isSelected ? 'bg-blue-50/40' : 'hover:bg-[#fafafa]'}`}>
                  <div
                    onClick={() => toggleProduct(product)}
                    className="w-full flex items-center gap-3 px-6 py-3 text-left cursor-pointer select-none"
                  >
                    {/* Checkbox */}
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all flex-shrink-0 ${isFullySelected
                          ? 'bg-[#0071e3] border-[#0071e3] text-white shadow-xs'
                          : isSelected
                            ? 'bg-blue-100 border-[#0071e3] text-[#0071e3]'
                            : 'border-[#d2d2d7] bg-white hover:border-[#86868b]'
                        }`}
                    >
                      {isFullySelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      {isSelected && !isFullySelected && <div className="w-2 h-2 bg-[#0071e3] rounded-xs" />}
                    </div>

                    {/* Image */}
                    <div className="w-11 h-11 rounded-xl overflow-hidden bg-[#f5f5f7] border border-[#e8e8ed] flex-shrink-0 flex items-center justify-center">
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] text-[#86868b]">ไม่มีรูป</span>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-[#1d1d1f] truncate">{product.name}</p>
                        {product.brand && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded font-medium truncate max-w-[120px]">
                            {product.brand}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#555557] mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="font-mono">{product.code}</span>
                        {product.barcode && <span>· บาร์โค้ด: {product.barcode}</span>}
                        <span className="font-bold text-[#1d1d1f]">· {(product.retailPrice || 0).toLocaleString()} บาท</span>
                      </p>
                    </div>

                    {/* Variant toggle button if variants exist */}
                    {hasVars && (
                      <button
                        type="button"
                        onClick={(e) => toggleExpand(product.id, e)}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border flex items-center gap-1 transition-all cursor-pointer flex-shrink-0 ${isExpanded
                            ? 'bg-blue-100 text-[#0071e3] border-blue-200'
                            : 'bg-white text-[#555557] border-[#d2d2d7] hover:border-[#0071e3] hover:text-[#0071e3]'
                          }`}
                      >
                        <span>{product.variants.length} รูปแบบ</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                  </div>

                  {/* Expanded Variants List */}
                  {hasVars && isExpanded && (
                    <div className="px-6 py-2 bg-blue-50/20 border-t border-b border-blue-100/50 divide-y divide-blue-100/40 pl-14">
                      {product.variants.map((v, vIdx) => {
                        const varKey = `${product.id}__var__${vIdx}`;
                        const isVarSelected = !!selectedMap[varKey];
                        const varPrice = v.price ?? product.retailPrice ?? 0;
                        const varLabel = v.options?.map(o => o.value).join(' / ') || v.sellerSku || `รูปแบบที่ ${vIdx + 1}`;

                        return (
                          <div
                            key={vIdx}
                            onClick={(e) => toggleVariant(product, v, vIdx, e)}
                            className={`py-2 px-3 flex items-center justify-between rounded-lg cursor-pointer transition-colors ${isVarSelected ? 'bg-blue-100/70 font-semibold' : 'hover:bg-blue-50/50'
                              }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isVarSelected ? 'bg-[#0071e3] border-[#0071e3] text-white' : 'border-[#d2d2d7] bg-white'
                                  }`}
                              >
                                {isVarSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <span className="text-xs text-[#1d1d1f] truncate">{varLabel}</span>
                              {v.sku && <span className="text-[10px] text-[#86868b] font-mono">({v.sku})</span>}
                              {v.barcode && <span className="text-[10px] text-[#0071e3] font-mono">· บาร์โค้ด: {v.barcode}</span>}
                            </div>
                            <span className="text-xs font-bold text-[#1d1d1f] flex-shrink-0 ml-2">
                              {Number(varPrice).toLocaleString()} ฿
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#e8e8ed] flex items-center justify-between flex-shrink-0 bg-white gap-3 shadow-xs">
          <div className="text-xs text-[#555557]">
            {selectedCount > 0 ? (
              <span>เลือกสินค้าแล้ว <strong className="text-[#0071e3] font-bold text-sm">{selectedCount}</strong> รายการ</span>
            ) : (
              <span className="text-[#86868b]">ยังไม่ได้เลือกสินค้า</span>
            )}
          </div>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-[#d2d2d7] text-[#1d1d1f] rounded-full text-xs font-semibold hover:bg-[#f5f5f7] transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selectedCount === 0}
              className="px-6 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              {selectedCount > 0 ? `เพิ่ม ${selectedCount} รายการ` : 'เพิ่มรายการ'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── CustomerPickerModal ───────────────────────────────────────
function CustomerPickerModal({ customers, onSelect, onClose }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const term = search.toLowerCase().trim();
    return customers.filter(c =>
      (c.name && c.name.toLowerCase().includes(term)) ||
      (c.companyName && c.companyName.toLowerCase().includes(term)) ||
      (c.phone && c.phone.toLowerCase().includes(term)) ||
      (c.taxId && c.taxId.toLowerCase().includes(term)) ||
      (c.address && c.address.toLowerCase().includes(term))
    );
  }, [customers, search]);

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 animate-fade-in">
      <div onClick={onClose} className="absolute inset-0 bg-black/15 backdrop-blur-xs" />
      <div className="relative bg-white rounded-2xl shadow-xl border border-[#d2d2d7]/50 w-full max-w-md flex flex-col max-h-[70vh] z-10 animate-scale-in overflow-hidden">

        {/* Header + Search (รวมกัน) */}
        <div className="px-4 pt-4 pb-3 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-[#1d1d1f]">เลือกลูกค้า</h3>
              <p className="text-[10px] text-[#86868b] mt-0.5">{customers.length} รายการในระบบ</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f5f5f7] cursor-pointer text-[#86868b] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#86868b] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อ, บริษัท, เบอร์โทร..."
              className="w-full pl-9 pr-9 py-2.5 bg-[#f5f5f7] border border-transparent rounded-xl text-xs text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#86868b] hover:text-[#1d1d1f] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Customer List */}
        <div className="flex-1 overflow-y-auto border-t border-[#f0f0f5]">
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="w-8 h-8 text-[#d2d2d7] mx-auto mb-2 stroke-[1.2]" />
              <p className="text-xs font-semibold text-[#1d1d1f]">ไม่พบลูกค้า</p>
              <p className="text-[10px] text-[#86868b] mt-1">ลองค้นหาด้วยคำอื่น</p>
            </div>
          ) : (
            filtered.map((c, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => { onSelect(c); onClose(); }}
                className="w-full px-4 py-3 hover:bg-[#f5f5f7] text-left transition-colors flex items-center gap-3 cursor-pointer group border-b border-[#f5f5f7] last:border-0"
              >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-[#0071e3]/10 text-[#0071e3] text-xs font-black flex items-center justify-center shrink-0">
                  {(c.name || '?').charAt(0).toUpperCase()}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-[#1d1d1f] group-hover:text-[#0071e3] transition-colors truncate">{c.name}</div>
                  <div className="text-[10px] text-[#86868b] mt-0.5 truncate">
                    {[c.companyName, c.branch || (c.branchType === 'sub' && c.branchName ? `สาขา ${c.branchName}` : 'สำนักงานใหญ่'), c.phone].filter(Boolean).join(' · ') || c.address || '-'}
                  </div>
                </div>
                {/* Arrow */}
                <svg className="w-4 h-4 text-[#d2d2d7] group-hover:text-[#0071e3] transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>

            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

const generateNewId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
  const r = Math.random() * 16 | 0;
  return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
}));
const generateItemId = () => Date.now() + Math.floor(Math.random() * 1000);

// ── AdminApprovedReport ──────────────────────────────────────────────────
const AdminApprovedReport = ({ quotations, addActivityLog }) => {
  const showToast = useToast();
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');

  const approvedQuotations = useMemo(() => quotations.filter(q => q.documentType !== 'product_proposal' && q.status === 'approved'), [quotations]);
  const allProposals = useMemo(() => quotations.filter(q => q.documentType === 'product_proposal'), [quotations]);

  const combinedRows = useMemo(() => {
    const rows = [
      ...approvedQuotations.map(q => ({ ...q, _type: 'quotation' })),
      ...allProposals.map(q => ({ ...q, _type: 'proposal' })),
    ];
    return rows.sort((a, b) => {
      const dateA = a.approvedDate || a.issuedDate || '';
      const dateB = b.approvedDate || b.issuedDate || '';
      return dateB.localeCompare(dateA);
    });
  }, [approvedQuotations, allProposals]);

  const filteredRows = useMemo(() => {
    const parseToDate = (dateStr) => {
      if (!dateStr) return null;
      try {
        if (dateStr.includes('-')) {
          const [y, m, d] = dateStr.split('-').map(Number);
          return new Date(y, m - 1, d);
        }
        if (dateStr.includes('/')) {
          const parts = dateStr.split('/').map(Number);
          if (parts.length === 3) {
            const d = parts[0], m = parts[1];
            let y = parts[2];
            if (y > 2400) y -= 543;
            return new Date(y, m - 1, d);
          }
        }
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) return parsed;
      } catch {
        // ignore
      }
      return null;
    };

    const matchDateRange = (issuedDateStr) => {
      if (!startDate && !endDate) return true;
      const itemDate = parseToDate(issuedDateStr);
      if (!itemDate) return false;
      itemDate.setHours(0, 0, 0, 0);
      if (startDate) {
        const startDateObj = parseToDate(startDate);
        if (startDateObj) {
          startDateObj.setHours(0, 0, 0, 0);
          if (itemDate < startDateObj) return false;
        }
      }
      if (endDate) {
        const endDateObj = parseToDate(endDate);
        if (endDateObj) {
          endDateObj.setHours(0, 0, 0, 0);
          if (itemDate > endDateObj) return false;
        }
      }
      return true;
    };

    return combinedRows.filter(q => {
      if (typeFilter === 'quotation' && q._type !== 'quotation') return false;
      if (typeFilter === 'product_proposal' && q._type !== 'proposal') return false;
      const qNum = q.quotationNumber || q.id;
      const ms = !search ||
        qNum.toLowerCase().includes(search.toLowerCase()) ||
        q.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
        (q.customer?.companyName || '').toLowerCase().includes(search.toLowerCase()) ||
        (q.salespersonName || '').toLowerCase().includes(search.toLowerCase());
      const md = matchDateRange(q.issuedDate);
      return ms && md;
    });
  }, [combinedRows, search, startDate, endDate, typeFilter]);

  const handleExportExcel = async () => {
    try {
      const headers = ['ประเภท', 'เลขที่เอกสาร', 'ลูกค้า / ผู้สร้าง', 'บริษัท', 'พนักงาน', 'วันที่เอกสาร', 'วันที่อนุมัติ', 'ยอดรวม (บาท)', 'ผู้อนุมัติ / สถานะ'];
      const rows = filteredRows.map(q => [
        q._type === 'quotation' ? 'ใบเสนอราคา' : 'ใบเสนอสินค้า',
        q.referenceNumber || q.quotationNumber || q.id,
        q._type === 'quotation' ? (q.customer?.name || '-') : (q.salespersonName || '-'),
        q._type === 'quotation' ? (q.customer?.companyName || '-') : '-',
        q.salespersonName || '-',
        q.issuedDate || '-',
        q._type === 'quotation' ? (q.approvedDate ? new Date(q.approvedDate).toLocaleDateString('th-TH') : '-') : '-',
        Number(q.totalAmount || 0),
        q._type === 'quotation' ? `อนุมัติแล้ว${q.approvedBy ? ` (${q.approvedBy})` : ''}` : 'พร้อมใช้งาน',
      ]);
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws['!cols'] = [{ wch: 15 }, { wch: 20 }, { wch: 25 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 20 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'รายงานเอกสารอนุมัติ');
      const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const filename = `Approved_Report_${new Date().toLocaleDateString('sv-SE')}.xlsx`;
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
      const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = filename; link.style.display = 'none';
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      URL.revokeObjectURL(url);
      if (addActivityLog) addActivityLog(`ดาวน์โหลดรายงานเอกสารอนุมัติ (${filteredRows.length} รายการ)`);
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถส่งออกไฟล์ Excel ได้', 'error');
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-[#d2d2d7]/50 shadow-xs">
        <div className="flex flex-col md:flex-row md:flex-wrap gap-3 items-stretch md:items-center">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#555557]">ตัวกรอง</span>
          </div>

          <div className="relative flex-1 min-w-[180px] md:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหาเลขที่เอกสาร, ลูกค้า หรือพนักงาน..."
              className="w-full pl-8 pr-8 py-2 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-xs focus:outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10 focus:bg-white transition-all placeholder:text-zinc-400 text-zinc-700"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <DropdownFilter
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              options={[
                { value: 'All', label: 'เอกสารทุกประเภท' },
                { value: 'quotation', label: '📄 ใบเสนอราคา (อนุมัติแล้ว)' },
                { value: 'product_proposal', label: '📦 ใบเสนอสินค้า' }
              ]}
            />

            {/* Start Date */}
            <div className="relative flex items-center">
              <input
                type={startDate ? 'date' : 'text'}
                placeholder="จากวันที่..."
                value={startDate}
                onFocus={(e) => (e.target.type = 'date')}
                onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }}
                onChange={e => setStartDate(e.target.value)}
                className="pl-3 pr-8 py-2 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-xs text-zinc-700 focus:outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10 focus:bg-white transition-all cursor-pointer font-medium w-full sm:w-[130px]"
              />
              {startDate && (
                <button type="button" onClick={() => setStartDate('')} className="absolute right-3 text-zinc-400 hover:text-zinc-600 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <span className="text-zinc-400 text-xs font-semibold select-none shrink-0 mx-0.5 self-center">ถึง</span>

            {/* End Date */}
            <div className="relative flex items-center">
              <input
                type={endDate ? 'date' : 'text'}
                placeholder="ถึงวันที่..."
                value={endDate}
                onFocus={(e) => (e.target.type = 'date')}
                onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }}
                onChange={e => setEndDate(e.target.value)}
                className="pl-3 pr-8 py-2 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-xs text-zinc-700 focus:outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10 focus:bg-white transition-all cursor-pointer font-medium w-full sm:w-[130px]"
              />
              {endDate && (
                <button type="button" onClick={() => setEndDate('')} className="absolute right-3 text-zinc-400 hover:text-zinc-600 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={handleExportExcel}
              className="group relative overflow-hidden px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-lg hover:shadow-emerald-500/30 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              title="ส่งออกรายงาน Excel"
            >
              <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
              <Download className="w-4 h-4" /> ส่งออก Excel
            </button>
          </div>
        </div>
      </div>

      {/* Unified Table */}
      <div className="bg-white border border-[#d2d2d7]/50 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-4 py-3.5 border-b border-[#e8e8ed] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-base">📋</span>
            <div>
              <h4 className="text-xs font-black text-[#1d1d1f] tracking-wide">รายการเอกสารที่อนุมัติ / พร้อมใช้งาน</h4>
              <p className="text-[10px] text-[#555557] mt-0.5">
                <span className="inline-flex items-center gap-1 mr-2"><span className="w-2 h-2 rounded-sm bg-blue-400 inline-block" />ใบเสนอราคาอนุมัติแล้ว</span>
                <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-violet-400 inline-block" />ใบเสนอสินค้า</span>
              </p>
            </div>
          </div>
          <span className="px-2.5 py-0.5 text-[10px] font-black bg-[#0071e3] text-white rounded-full">
            {filteredRows.length.toLocaleString()} รายการ
          </span>
        </div>

        {filteredRows.length === 0 ? (
          <div className="py-14 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-xs text-zinc-400 font-semibold">ไม่พบรายการเอกสาร</p>
            <p className="text-[10px] text-zinc-300 mt-1">ลองปรับตัวกรองหรือค้นหาด้วยคำอื่น</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#f5f5f7] border-b border-[#e8e8ed]">
                  <th className="text-left px-4 py-2.5 font-black text-[10px] text-[#555557] uppercase tracking-widest">ประเภท</th>
                  <th className="text-left px-4 py-2.5 font-black text-[10px] text-[#555557] uppercase tracking-widest">เลขที่เอกสาร</th>
                  <th className="text-left px-4 py-2.5 font-black text-[10px] text-[#555557] uppercase tracking-widest">ลูกค้า / ผู้สร้าง</th>
                  <th className="text-left px-4 py-2.5 font-black text-[10px] text-[#555557] uppercase tracking-widest hidden md:table-cell">พนักงาน</th>
                  <th className="text-left px-4 py-2.5 font-black text-[10px] text-[#555557] uppercase tracking-widest hidden lg:table-cell">วันที่</th>
                  <th className="text-left px-4 py-2.5 font-black text-[10px] text-[#555557] uppercase tracking-widest hidden xl:table-cell">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f5]">
                {filteredRows.map(q => {
                  const isQ = q._type === 'quotation';
                  return (
                    <tr
                      key={q.id}
                      className={`transition-colors ${isQ ? 'hover:bg-blue-50/25' : 'hover:bg-violet-50/25'}`}
                      style={{ borderLeft: `3px solid ${isQ ? '#60a5fa' : '#a78bfa'}` }}
                    >
                      <td className="px-4 py-3">
                        {isQ ? (
                          <span className="inline-flex items-center text-[9px] px-2 py-0.5 rounded-md font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wide whitespace-nowrap">
                            ใบเสนอราคา
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[9px] px-2 py-0.5 rounded-md font-bold bg-violet-50 text-violet-700 border border-violet-100 uppercase tracking-wide whitespace-nowrap">
                            ใบเสนอสินค้า
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-bold font-mono ${isQ ? 'text-[#0071e3]' : 'text-violet-600'}`}>
                          {q.quotationNumber || q.id}
                        </span>
                        {q.referenceNumber && q.referenceNumber !== q.quotationNumber && (
                          <div className="text-[10px] text-zinc-400 mt-0.5">{q.referenceNumber}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isQ ? (
                          <>
                            <div className="font-semibold text-[#1d1d1f] truncate max-w-[160px]">{q.customer?.name || '-'}</div>
                            <div className="text-[10px] text-zinc-400 truncate max-w-[160px]">{q.customer?.companyName || ''}</div>
                          </>
                        ) : (
                          <>
                            <div className="font-semibold text-zinc-400">ไม่ระบุลูกค้า</div>
                            <div className="text-[10px] text-zinc-400">ผู้สร้าง: {q.createdBy || '-'}</div>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-[#555557]">{q.salespersonName || '-'}</td>
                      <td className="px-4 py-3 hidden lg:table-cell text-[#555557]">
                        {formatDate(isQ ? (q.approvedDate || q.issuedDate) : q.issuedDate)}
                      </td>

                      <td className="px-4 py-3 hidden xl:table-cell">
                        {isQ ? (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100">
                            <CheckCircle className="w-2.5 h-2.5" /> อนุมัติแล้ว{q.approvedBy ? ` (${q.approvedBy})` : ''}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full font-bold border bg-violet-50 text-violet-600 border-violet-200">
                            ✓ พร้อมใช้งาน
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Removed tfoot grand total */}
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
// ── List Tab ───────────────────────────────────────────────────────────────
const ListTab = ({ quotations, onView, onDelete, addActivityLog, currentUser, onCopyAsNew }) => {
  const showToast = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [docTypeFilter, setDocTypeFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [hoveredRow, setHoveredRow] = useState(null);
  const [expiringSoonOnly, setExpiringSoonOnly] = useState(false);

  const [sortBy, setSortBy] = useState(() => {
    return localStorage.getItem('pim_quotation_list_sort_by') || 'newest';
  });
  const [isSortOpen, setIsSortOpen] = useState(false);

  const [adminListMode, setAdminListMode] = useState(() => {
    const savedMode = localStorage.getItem('pim_quotation_admin_list_mode');
    if (currentUser?.role === 'admin') {
      return (savedMode && ['pending', 'expired', 'mine'].includes(savedMode)) ? savedMode : 'pending';
    }
    return (savedMode && ['all', 'expired'].includes(savedMode)) ? savedMode : 'all';
  });

  useEffect(() => {
    localStorage.setItem('pim_quotation_list_sort_by', sortBy);
  }, [sortBy]);

  useEffect(() => {
    localStorage.setItem('pim_quotation_admin_list_mode', adminListMode);
    setExpiringSoonOnly(false);
  }, [adminListMode]);

  const visibleListMode = useMemo(() => {
    if (currentUser?.role === 'admin') {
      return ['pending', 'expired', 'mine'].includes(adminListMode) ? adminListMode : 'pending';
    }
    return ['all', 'expired'].includes(adminListMode) ? adminListMode : 'all';
  }, [currentUser, adminListMode]);

  const pendingCount = useMemo(() => {
    return quotations.filter(q => q.status === 'sent' && q.documentType === 'quotation' && !isExpiredQuotation(q)).length;
  }, [quotations]);

  const expiredCount = useMemo(() => {
    return quotations.filter(isExpiredQuotation).length;
  }, [quotations]);

  const expiringSoonCount = useMemo(() => {
    return quotations.filter(q => {
      if (isExpiredQuotation(q)) return false;
      if (currentUser?.role === 'admin' && visibleListMode === 'mine') {
        const creator = q.createdBy || '';
        const salesName = q.salespersonName || '';
        const isMine = creator === currentUser.username ||
          salesName.toLowerCase().includes(currentUser.username.toLowerCase()) ||
          (currentUser.name && salesName.toLowerCase().includes(currentUser.name.toLowerCase()));
        if (!isMine) return false;
      }
      const exp = getExpiryStatus(q);
      return Boolean(exp && exp.isExpiringSoon);
    }).length;
  }, [quotations, currentUser, visibleListMode]);

  const matchDate = (issuedDateStr, filterDateStr) => {
    if (!filterDateStr) return true;
    if (!issuedDateStr) return false;
    try {
      const [fYear, fMonth, fDay] = filterDateStr.split('-').map(Number);
      if (issuedDateStr.includes('-')) {
        const [y, m, d] = issuedDateStr.split('-').map(Number);
        return y === fYear && m === fMonth && d === fDay;
      }
      if (issuedDateStr.includes('/')) {
        const parts = issuedDateStr.split('/').map(Number);
        if (parts.length === 3) {
          const d = parts[0];
          const m = parts[1];
          let y = parts[2];
          if (y > 2400) y -= 543;
          return d === fDay && m === fMonth && y === fYear;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  };

  const filtered = useMemo(() => {
    const res = quotations.filter(q => {
      const qNum = q.quotationNumber || q.id;
      const matchSearch = !search ||
        qNum.toLowerCase().includes(search.toLowerCase()) ||
        q.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
        (q.customer?.companyName || '').toLowerCase().includes(search.toLowerCase());

      const matchD = !dateFilter || matchDate(q.issuedDate, dateFilter);

      if (visibleListMode === 'expired') {
        return matchSearch && isExpiredQuotation(q) && matchD;
      }

      // If document is expired, move it out of active quotation tabs into "เอกสารหมดอายุ"
      if (isExpiredQuotation(q)) {
        return false;
      }

      if (expiringSoonOnly) {
        const exp = getExpiryStatus(q);
        if (!exp || !exp.isExpiringSoon) return false;
      }

      if (currentUser?.role === 'admin' && visibleListMode === 'pending') {
        return matchSearch && q.status === 'sent' && q.documentType === 'quotation' && matchD;
      }

      if (currentUser?.role === 'admin' && visibleListMode === 'mine') {
        const creator = q.createdBy || '';
        const salesName = q.salespersonName || '';
        const isMine = creator === currentUser.username ||
          salesName.toLowerCase().includes(currentUser.username.toLowerCase()) ||
          (currentUser.name && salesName.toLowerCase().includes(currentUser.name.toLowerCase()));

        const matchStatus = statusFilter === 'All' || q.status === statusFilter;
        const matchDocType = docTypeFilter === 'All' || q.documentType === docTypeFilter;
        return matchSearch && isMine && matchStatus && matchDocType && matchD;
      }

      const matchStatus = statusFilter === 'All' || q.status === statusFilter;
      const matchDocType = docTypeFilter === 'All' || q.documentType === docTypeFilter;

      return matchSearch && matchStatus && matchDocType && matchD;
    });

    return res.sort((a, b) => {
      const dateA = (visibleListMode === 'expired' ? a.validUntilDate : a.issuedDate) || '';
      const dateB = (visibleListMode === 'expired' ? b.validUntilDate : b.issuedDate) || '';
      let cmp = dateA.localeCompare(dateB);
      if (cmp === 0) {
        const idA = a.id || '';
        const idB = b.id || '';
        cmp = idA.localeCompare(idB);
      }
      return sortBy === 'newest' ? -cmp : cmp;
    });
  }, [quotations, search, dateFilter, currentUser, visibleListMode, statusFilter, docTypeFilter, sortBy, expiringSoonOnly]);

  const handleExportExcel = async () => {
    try {
      // ── 1. สำหรับชีตใบเสนอราคา (Quotations) ──
      const quotationHeaders = [
        'เลขที่เอกสาร',
        'ประเภท',
        'ชื่อลูกค้า',
        'บริษัท',
        'โครงการ',
        'ผู้ขาย',
        'วันที่ออกเอกสาร',
        'วันหมดอายุ',
        'ยอดรวมก่อนภาษี (บาท)',
        'ภาษีมูลค่าเพิ่ม (บาท)',
        'ยอดรวมสุทธิ (บาท)',
        'สถานะ',
        'ผู้อนุมัติ',
        'วันที่อนุมัติ'
      ];

      const quotationsOnly = filtered.filter(q => q.documentType !== 'product_proposal');
      const quotationRows = quotationsOnly.map(q => [
        q.referenceNumber || q.quotationNumber || q.id,
        'ใบเสนอราคา',
        q.customer?.name || '-',
        q.customer?.companyName || '-',
        q.projectName || '-',
        q.salespersonName || '-',
        q.issuedDate || '-',
        q.validUntilDate || '-',
        Number(q.subtotal || 0),
        Number(q.vatAmount || 0),
        Number(q.totalAmount || 0),
        q.status === 'draft' ? 'ร่าง' : q.status === 'sent' ? 'รออนุมัติ' : q.status === 'approved' ? 'อนุมัติแล้ว' : 'ไม่อนุมัติ',
        q.approvedBy || '-',
        q.approvedDate ? new Date(q.approvedDate).toLocaleDateString('th-TH') : '-'
      ]);

      const wsQuotations = XLSX.utils.aoa_to_sheet([quotationHeaders, ...quotationRows]);
      wsQuotations['!cols'] = [
        { wch: 20 }, // เลขที่เอกสาร
        { wch: 15 }, // ประเภท
        { wch: 25 }, // ชื่อลูกค้า
        { wch: 25 }, // บริษัท
        { wch: 25 }, // โครงการ
        { wch: 20 }, // ผู้ขาย
        { wch: 15 }, // วันที่ออกเอกสาร
        { wch: 15 }, // วันหมดอายุ
        { wch: 20 }, // ยอดรวมก่อนภาษี
        { wch: 18 }, // ภาษีมูลค่าเพิ่ม
        { wch: 20 }, // ยอดรวมสุทธิ
        { wch: 12 }, // สถานะ
        { wch: 20 }, // ผู้อนุมัติ
        { wch: 15 }  // วันที่อนุมัติ
      ];

      // ── 2. สำหรับชีตใบเสนอสินค้า (Proposals) ──
      // เอาคอลัมน์ที่ไม่เกี่ยวข้องออก (ชื่อลูกค้า, บริษัท, โครงการ, วันหมดอายุ, ภาษีต่างๆ, ผู้อนุมัติ)
      const proposalHeaders = [
        'เลขที่เอกสาร',
        'ประเภท',
        'ผู้ขาย',
        'วันที่ออกเอกสาร',
        'ยอดรวมสุทธิ (บาท)',
        'สถานะ'
      ];

      const proposalsOnly = filtered.filter(q => q.documentType === 'product_proposal');
      const proposalRows = proposalsOnly.map(q => [
        q.referenceNumber || q.quotationNumber || q.id,
        'ใบเสนอสินค้า',
        q.salespersonName || '-',
        q.issuedDate || '-',
        Number(q.totalAmount || 0),
        'พร้อมใช้งาน'
      ]);

      const wsProposals = XLSX.utils.aoa_to_sheet([proposalHeaders, ...proposalRows]);
      wsProposals['!cols'] = [
        { wch: 20 }, // เลขที่เอกสาร
        { wch: 15 }, // ประเภท
        { wch: 20 }, // ผู้ขาย
        { wch: 15 }, // วันที่ออกเอกสาร
        { wch: 20 }, // ยอดรวมสุทธิ
        { wch: 15 }  // สถานะ
      ];

      // ── 3. สร้าง Workbook และส่งออกไฟล์ ──
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, wsQuotations, 'ใบเสนอราคา');
      XLSX.utils.book_append_sheet(workbook, wsProposals, 'ใบเสนอสินค้า');

      const base64 = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
      const filename = `Quotation_Report_${new Date().toLocaleDateString('sv-SE')}.xlsx`;

      const byteCharacters = atob(base64);
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
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      if (addActivityLog) {
        addActivityLog(`ดาวน์โหลดรายงาน Excel ของเอกสาร (ใบเสนอราคา: ${quotationsOnly.length} รายการ, ใบเสนอสินค้า: ${proposalsOnly.length} รายการ)`);
      }
    } catch (error) {
      console.error('Export Excel Error:', error);
      showToast('ไม่สามารถส่งออกไฟล์ Excel ได้', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex bg-[#f5f5f7] p-1 rounded-full border border-[#d2d2d7]/50 w-fit flex-wrap gap-1 shadow-inner">
        {currentUser?.role !== 'admin' && (
          <button
            type="button"
            onClick={() => setAdminListMode('all')}
            className={`px-5 py-2 text-xs font-bold rounded-full transition-all duration-200 cursor-pointer transform active:scale-95 ${visibleListMode === 'all'
              ? 'bg-white text-[#0071e3] shadow-md border border-[#d2d2d7]/10'
              : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200/50'
              }`}
          >
            เอกสารของคุณ
          </button>
        )}
        {currentUser?.role === 'admin' && (
          <button
            type="button"
            onClick={() => setAdminListMode('pending')}
            className={`px-5 py-2 text-xs font-bold rounded-full transition-all duration-200 cursor-pointer flex items-center gap-2 transform active:scale-95 ${visibleListMode === 'pending'
              ? 'bg-white text-[#0071e3] shadow-md border border-[#d2d2d7]/10'
              : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200/50'
              }`}
          >
            รายการรออนุมัติ
            {pendingCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                {pendingCount}
              </span>
            )}
          </button>
        )}
        {currentUser?.role === 'admin' && (
          <button
            type="button"
            onClick={() => setAdminListMode('mine')}
            className={`px-5 py-2 text-xs font-bold rounded-full transition-all duration-200 cursor-pointer transform active:scale-95 ${visibleListMode === 'mine'
              ? 'bg-white text-[#0071e3] shadow-md border border-[#d2d2d7]/10'
              : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200/50'
              }`}
          >
            เอกสารของคุณ
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setAdminListMode('expired');
            setExpiringSoonOnly(false);
          }}
          className={`px-5 py-2 text-xs font-bold rounded-full transition-all duration-200 cursor-pointer flex items-center gap-2 transform active:scale-95 ${visibleListMode === 'expired'
            ? 'bg-white text-red-600 shadow-md border border-red-100'
            : 'text-zinc-500 hover:text-red-600 hover:bg-red-50'
            }`}
        >
          เอกสารหมดอายุ
        </button>
      </div>

      {/* ถ้าอยู่ใน admin 'all' mode ให้ render AdminApprovedReport แทน */}
      {currentUser?.role === 'admin' && visibleListMode === 'all' && (
        <AdminApprovedReport quotations={quotations} addActivityLog={addActivityLog} />
      )}

      {/* Search and Filters — ซ่อนเมื่ออยู่ใน admin 'all' mode */}
      {!(currentUser?.role === 'admin' && visibleListMode === 'all') && (
        <>{/* Search and Filters */}
          <div className="no-print bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-[#d2d2d7]/50 shadow-xs">
            <div className="flex flex-col md:flex-row md:flex-wrap gap-3 items-stretch md:items-center">
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-1.5 h-1.5 rounded-full bg-[#0071e3] animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[#555557]">ตัวกรอง</span>
              </div>

              <div className="relative flex-1 min-w-[180px] md:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="ค้นหาเลขที่เอกสาร หรือชื่อลูกค้า..."
                  className="w-full pl-8 pr-8 py-2 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-xs focus:outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10 focus:bg-white transition-all placeholder:text-zinc-400 text-zinc-700"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="w-full sm:w-auto">
                  {visibleListMode === 'pending' || visibleListMode === 'expired' ? (
                    <div className="px-3 py-2 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-xs text-[#1d1d1f]/75 font-medium select-none flex items-center">
                      📄 ใบเสนอราคา
                    </div>
                  ) : (
                    <DropdownFilter
                      value={docTypeFilter}
                      onChange={e => setDocTypeFilter(e.target.value)}
                      options={[
                        { value: 'All', label: 'ประเภทเอกสารทั้งหมด' },
                        { value: 'quotation', label: '📄 ใบเสนอราคา' },
                        { value: 'product_proposal', label: '📦 ใบเสนอสินค้า' }
                      ]}
                    />
                  )}
                </div>
                {/* Status selector or pending status label */}
                {visibleListMode === 'pending' || visibleListMode === 'expired' ? (
                  <div className="w-full sm:w-auto">
                    <div className="px-3 py-2 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-xs text-zinc-700 font-medium select-none flex items-center">
                      {visibleListMode === 'expired' ? '⚠️ หมดอายุ' : '⏳ รออนุมัติ'}
                    </div>
                  </div>
                ) : (
                  <div className="w-full sm:w-auto">
                    <DropdownFilter
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value)}
                      disabled={docTypeFilter === 'product_proposal'}
                      options={currentUser?.role === 'admin' && visibleListMode === 'all' ? [
                        { value: 'All', label: 'สถานะทั้งหมด' },
                        { value: 'approved', label: 'อนุมัติแล้ว' }
                      ] : [
                        { value: 'All', label: 'สถานะทั้งหมด' },
                        { value: 'draft', label: 'แบบร่าง' },
                        { value: 'sent', label: 'รออนุมัติ' },
                        { value: 'approved', label: 'อนุมัติแล้ว' },
                        { value: 'rejected', label: 'ไม่อนุมัติ' }
                      ]}
                    />
                  </div>
                )}

                {/* Date filter input (always visible!) */}
                <div className="w-full sm:w-auto relative flex items-center">
                  <input
                    type={dateFilter ? 'date' : 'text'}
                    placeholder="เลือกวันที่..."
                    value={dateFilter}
                    onFocus={(e) => (e.target.type = 'date')}
                    onBlur={(e) => {
                      if (!e.target.value) e.target.type = 'text';
                    }}
                    onChange={e => setDateFilter(e.target.value)}
                    className="pl-3 pr-8 py-2 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-xs text-zinc-700 focus:outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10 focus:bg-white transition-all cursor-pointer font-medium w-full md:w-auto"
                    title="กรองตามวันที่ออกเอกสาร"
                  />
                  {dateFilter && (
                    <button
                      type="button"
                      onClick={() => setDateFilter('')}
                      className="absolute right-3 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                      title="ล้างตัวกรองวันที่"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {currentUser?.role === 'admin' && visibleListMode === 'all' && (
                  <button
                    onClick={handleExportExcel}
                    className="group relative overflow-hidden px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-lg hover:shadow-emerald-500/30 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                    title="ส่งออกรายงาน Excel ตามตัวกรองปัจจุบัน"
                  >
                    <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
                    <Download className="w-4 h-4" /> ส่งออก Excel
                  </button>
                )}
              </div>
            </div>
          </div>
        </> /* end of hidden-in-all-mode block */
      )}

      {/* List — ซ่อนเมื่ออยู่ใน admin 'all' mode */}
      {!(currentUser?.role === 'admin' && visibleListMode === 'all') && (
        <div className="space-y-3">
          {/* แจ้งเตือน 3 วันก่อนหมดอายุ (Expiring Soon Alert Banner) - ไม่แสดงในแท็บรายการรออนุมัติของ Admin */}
          {expiringSoonCount > 0 && visibleListMode !== 'expired' && !(currentUser?.role === 'admin' && visibleListMode === 'pending') && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-amber-50/90 to-orange-50/80 border border-amber-200/90 rounded-2xl text-xs text-amber-950 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100/90 flex items-center justify-center text-amber-700 shrink-0 shadow-2xs">
                  <Clock className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <div className="font-bold flex items-center gap-1.5 flex-wrap">
                    <span>แจ้งเตือน: มีใบเสนอราคาใกล้หมดอายุภายใน 3 วัน</span>
                    <span className="bg-amber-500 text-white text-[10px] px-2 py-0.2 rounded-full font-black shadow-2xs">
                      {expiringSoonCount} รายการ
                    </span>
                  </div>
                  <p className="text-amber-800/85 text-[11px] mt-0.5">
                    กรุณาติดต่อติดตามลูกค้าเพื่อยืนยันคำสั่งซื้อก่อนที่เอกสารจะหมดอายุ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExpiringSoonOnly(!expiringSoonOnly)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 shadow-xs ${
                  expiringSoonOnly
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-white hover:bg-amber-100/80 text-amber-900 border border-amber-300'
                }`}
              >
                {expiringSoonOnly ? (
                  <>
                    <X className="w-3.5 h-3.5" /> แสดงเอกสารทั้งหมด
                  </>
                ) : (
                  <>
                    <Clock className="w-3.5 h-3.5" /> ดูเฉพาะใกล้หมดอายุ ({expiringSoonCount})
                  </>
                )}
              </button>
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="text-center py-12 text-xs text-zinc-400 font-semibold bg-white rounded-2xl border border-[#d2d2d7]/50 shadow-xs">
              {expiringSoonOnly
                ? 'ไม่พบใบเสนอราคาที่ใกล้หมดอายุตามเงื่อนไขที่เลือก'
                : (visibleListMode === 'expired' ? 'ไม่พบใบเสนอราคาที่หมดอายุ' : 'ไม่พบรายการเอกสารเสนอราคา/สินค้า')}
            </div>
          ) : (
            <div className="bg-white border border-[#d2d2d7]/50 rounded-2xl shadow-xs overflow-hidden">
              <div className="px-4.5 py-3.5 border-b border-[#e8e8ed] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-3">
                  <h4 className="text-xs font-black text-[#1d1d1f] tracking-widest uppercase">
                    {visibleListMode === 'expired' ? 'รายการใบเสนอราคาที่หมดอายุ' : 'รายการเอกสารเสนอราคา'}
                  </h4>
                  <span className={`px-2.5 py-0.5 text-[10px] font-black text-white rounded-full ${visibleListMode === 'expired' ? 'bg-red-500' : 'bg-[#0071e3]'}`}>
                    {filtered.length.toLocaleString()} รายการ
                  </span>
                </div>

                {/* Sorting Dropdown */}
                <div className="relative self-start sm:self-auto select-none">
                  <button
                    type="button"
                    onClick={() => setIsSortOpen(!isSortOpen)}
                    className="px-3.5 py-1.5 bg-[#f5f5f7] hover:bg-[#e8e8ed] border border-[#d2d2d7] rounded-xl text-xs font-bold text-[#1d1d1f] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 z-10"
                  >
                    <span>{sortBy === 'newest' ? 'ใหม่ที่สุด' : 'เก่าที่สุด'}</span>
                    <svg
                      className={`w-3.5 h-3.5 text-[#555557] transition-transform duration-200 ${isSortOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>

                  {isSortOpen && (
                    <>
                      {/* Invisible overlay backdrop to close dropdown */}
                      <div
                        className="fixed inset-0 z-30 cursor-default"
                        onClick={() => setIsSortOpen(false)}
                      />
                      {/* Dropdown Menu */}
                      <div className="absolute right-0 mt-1.5 w-32 bg-white border border-[#d2d2d7]/85 rounded-xl shadow-lg py-1 z-40 animate-scale-in origin-top-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSortBy('newest');
                            setIsSortOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-xs font-semibold transition-colors hover:bg-[#f5f5f7] cursor-pointer ${sortBy === 'newest'
                              ? 'text-[#0071e3] bg-[#0071e3]/5'
                              : 'text-[#1d1d1f]'
                            }`}
                        >
                          ใหม่ที่สุด
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSortBy('oldest');
                            setIsSortOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-xs font-semibold transition-colors hover:bg-[#f5f5f7] cursor-pointer ${sortBy === 'oldest'
                              ? 'text-[#0071e3] bg-[#0071e3]/5'
                              : 'text-[#1d1d1f]'
                            }`}
                        >
                          เก่าที่สุด
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="divide-y divide-[#e8e8ed]">
                {filtered.map((q) => {
                  const indexInRaw = quotations.findIndex(x => x.id === q.id);
                  const isHovered = hoveredRow === q.id;
                  const borderStyle = q.documentType === 'product_proposal' ? 'border-violet-500' : 'border-[#0071e3]';
                  const bgClass = isHovered
                    ? (q.documentType === 'product_proposal' ? 'bg-gradient-to-r from-violet-500/5 via-violet-500/3 to-transparent' : 'bg-gradient-to-r from-[#0071e3]/4 via-[#0071e3]/3 to-transparent')
                    : (q.documentType === 'product_proposal' ? 'bg-violet-50/5' : 'bg-white');

                  return (
                    <div
                      key={q.id}
                      onClick={() => onView(indexInRaw)}
                      onMouseEnter={() => setHoveredRow(q.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                      className={`flex justify-between items-center px-5 py-3.5 cursor-pointer transition-all duration-150 border-l-4 ${borderStyle} ${bgClass}`}
                    >
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-[#0071e3] font-mono">{q.quotationNumber || q.id}</span>
                          {q.documentType === 'product_proposal' ? (
                            <span className="inline-flex items-center text-[9px] px-2 py-0.5 rounded-md font-bold bg-violet-50 text-violet-700 border border-violet-100 uppercase tracking-wide">
                              📦 ใบเสนอสินค้า
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[9px] px-2 py-0.5 rounded-md font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wide">
                              📄 ใบเสนอราคา
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#555557] mt-1.5">
                          {q.documentType === 'product_proposal'
                            ? 'เอกสารเสนอสินค้า (ไม่ระบุลูกค้า / บันทึกสำเร็จ)'
                            : `${q.customer?.name} · ${q.customer?.companyName || 'ลูกค้าทั่วไป'}`}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`text-[10px] ${visibleListMode === 'expired' ? 'font-bold text-red-600' : 'text-[#aaa]'}`}>
                            {visibleListMode === 'expired' ? `หมดอายุ ${formatDate(q.validUntilDate)}` : formatDate(q.issuedDate)}
                          </span>
                          {currentUser?.role === 'admin' && visibleListMode === 'pending' && q.salespersonName && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Users className="w-2.5 h-2.5" />
                              {q.salespersonName}
                            </span>
                          )}
                          {/* แจ้งเตือน 3 วันก่อนหมดอายุในแถวรายการ */}
                          {(() => {
                            const expStatus = getExpiryStatus(q);
                            if (expStatus?.isExpiringSoon && visibleListMode !== 'expired') {
                              return (
                                <span
                                  className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                                    expStatus.daysLeft === 0
                                      ? 'bg-red-50 text-red-600 border-red-200 animate-pulse'
                                      : 'bg-amber-50 text-amber-800 border-amber-300'
                                  }`}
                                  title={`จะหมดอายุวันที่ ${formatDate(q.validUntilDate)}`}
                                >
                                  <Clock className="w-2.5 h-2.5" />
                                  {expStatus.label}
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1.5">
                        <div className="text-xs font-bold text-[#1d1d1f]">฿{fmt(q.totalAmount)}</div>
                        <div className="flex items-center gap-2">
                          {q.documentType === 'product_proposal' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full font-bold border bg-violet-50 text-violet-600 border-violet-200">
                              ✓ พร้อมใช้งาน
                            </span>
                          ) : (
                            <Badge status={q.status} expired={isExpiredQuotation(q)} />
                          )}

                          {isExpiredQuotation(q) && onCopyAsNew && canPerformAction(currentUser, 'quotations.create') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onCopyAsNew(q);
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                              title="สร้างใบเสนอราคาใหม่จากใบเดิมที่หมดอายุแล้ว"
                            >
                              <Plus className="w-3 h-3" />
                              <span className="hidden sm:inline">สร้างใหม่</span>
                            </button>
                          )}

                          {canDeleteDocument(q, currentUser) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(q);
                              }}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-red-200"
                              title="ลบเอกสาร"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div> /* end list block */
      )}
    </div>
  );
};

const CreateTab = ({
  onSave,
  onCancel,
  products,
  editQt,
  currentUser,
  sourceProposal,
  quotations = [],
  users = [],
  customers = [],
  docFormat: controlledDocFormat,
  setDocFormat: controlledSetDocFormat
}) => {
  // Memoize unique customers list from central customers + past quotations
  const existingCustomers = useMemo(() => {
    const custMap = new Map();
    // 1. Central customers
    (customers || []).forEach(c => {
      if (c && c.name && c.name.trim()) {
        const branch = getBranchInfo(c);
        const key = `${c.name.trim()}_${(c.companyName || '').trim()}_${branch.branchType}_${branch.branchName}`;
        custMap.set(key, {
          id: c.id,
          name: c.name.trim(),
          companyName: (c.companyName || '').trim(),
          ...branch,
          region: c.region || '',
          phone: (c.phone || '').trim(),
          email: c.email || '',
          taxId: (c.taxId || '').trim(),
          address: (c.address || '').trim(),
          note: c.note || '',
        });
      }
    });

    // 2. Past quotations
    quotations.forEach(q => {
      if (q.customer && q.customer.name && q.customer.name.trim()) {
        const branch = getBranchInfo(q.customer);
        const key = `${q.customer.name.trim()}_${(q.customer.companyName || '').trim()}_${branch.branchType}_${branch.branchName}`;
        if (!custMap.has(key)) {
          custMap.set(key, {
            id: q.customer.id,
            name: q.customer.name.trim(),
            companyName: (q.customer.companyName || '').trim(),
            ...branch,
            region: q.customer.region || q.customerRegion || '',
            phone: (q.customer.phone || '').trim(),
            email: q.customer.email || '',
            taxId: (q.customer.taxId || '').trim(),
            address: (q.customer.address || '').trim(),
            note: q.customer.note || q.customerNote || '',
          });
        }
      }
    });
    return Array.from(custMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'th'));
  }, [customers, quotations]);

  const [showCustModal, setShowCustModal] = useState(false);
  const [selectedCustName, setSelectedCustName] = useState('');

  // If converting from a product proposal, lock to quotation mode
  const [localDocFormat, setLocalDocFormat] = useState(
    sourceProposal ? 'quotation' : (editQt?.documentType || 'quotation')
  );
  const docFormat = controlledDocFormat ?? localDocFormat;
  const setDocFormat = controlledSetDocFormat ?? setLocalDocFormat;
  const [form, setForm] = useState(() => {
    const systemSalesName = currentUser?.name || currentUser?.username || '';
    const systemSalesPhone = currentUser?.phone || '';

    if (editQt) {
      const branch = getBranchInfo(editQt.customer);
      return {
        customerId: editQt.customer?.id || '',
        custName: editQt.customer?.name || '',
        custCompany: editQt.customer?.companyName || '',
        custBranchType: branch.branchType,
        custBranchName: branch.branchName,
        custBranch: branch.branch,
        custRegion: (editQt.customer?.region && THAI_REGIONS.includes(editQt.customer.region))
          ? editQt.customer.region
          : (editQt.customerRegion && THAI_REGIONS.includes(editQt.customerRegion) ? editQt.customerRegion : ''),
        custPhone: editQt.customer?.phone || '',
        custEmail: editQt.customer?.email || '',
        custTax: editQt.customer?.taxId || '',
        custAddr: editQt.customer?.address || '',
        custNote: editQt.customer?.note || editQt.customerNote || '',
        salesName: editQt.salespersonName || systemSalesName,
        salesPhone: editQt.salespersonPhone || systemSalesPhone,
        projName: editQt.projectName || '',
        validDate: editQt.validUntilDate || '',
        vatRate: String(editQt.vatRate ?? 7),
        note: editQt.note || '',
      };
    }
    return {
      customerId: '',
      custName: '', custCompany: '',
      custBranchType: 'head', custBranchName: '', custBranch: 'สำนักงานใหญ่',
      custRegion: '', custPhone: '', custEmail: '',
      custTax: '', custAddr: '', custNote: '',
      salesName: systemSalesName,
      salesPhone: systemSalesPhone,
      projName: '',
      validDate: '',
      vatRate: '7',
      note: '',
    };
  });

  // Ensure salesperson name matches the logged-in system employee
  useEffect(() => {
    const systemSalesName = currentUser?.name || currentUser?.username || '';
    const systemSalesPhone = currentUser?.phone || '';

    setForm(prev => {
      let changed = false;
      const next = { ...prev };
      if (!next.salesName && systemSalesName) {
        next.salesName = systemSalesName;
        changed = true;
      }
      if (!next.salesPhone && systemSalesPhone) {
        next.salesPhone = systemSalesPhone;
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [currentUser]);

  const [items, setItems] = useState(() => {
    if (editQt && editQt.items) {
      return editQt.items.map((it, idx) => ({ ...it, id: it.id || idx }));
    }
    // Pre-fill items from a product proposal conversion
    if (sourceProposal && sourceProposal.items && sourceProposal.items.length > 0) {
      return sourceProposal.items.map(it => ({ ...it, id: it.id || generateItemId() }));
    }
    return [];
  });

  const [alert, setAlert] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState(null);
  const [quickBarcode, setQuickBarcode] = useState('');
  const [quickScanBanner, setQuickScanBanner] = useState(null);
  const quickScanInputRef = useRef(null);

  const [errorFields, setErrorFields] = useState({});
  const fieldRefs = {
    custName: useRef(null),
    custCompany: useRef(null),
    custBranchName: useRef(null),
    custRegion: useRef(null),
    custPhone: useRef(null),
    custTax: useRef(null),
    custEmail: useRef(null),
    custAddr: useRef(null),
    custNote: useRef(null),
    salesName: useRef(null),
    salesPhone: useRef(null),
    projName: useRef(null),
    validDate: useRef(null),
    items: useRef(null),
  };

  const scrollToField = (ref) => {
    if (ref && ref.current) {
      setTimeout(() => {
        ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (typeof ref.current.focus === 'function') {
          ref.current.focus();
        }
      }, 50);
    }
  };

  useEffect(() => {
    if (!quickScanBanner) return;
    const t = setTimeout(() => setQuickScanBanner(null), 3500);
    return () => clearTimeout(t);
  }, [quickScanBanner]);

  const setField = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrorFields(prev => ({ ...prev, [k]: false }));
    if (['custName', 'custCompany', 'custPhone', 'custEmail', 'custTax', 'custAddr', 'custRegion', 'custNote'].includes(k)) {
      setSelectedCustName('');
    }
  };

  const handleSelectCustomer = (cust) => {
    setErrorFields({});
    if (!cust) {
      setSelectedCustName('');
      setForm(f => ({
        ...f,
        customerId: '',
        custName: '',
        custCompany: '',
        custBranchType: 'head',
        custBranchName: '',
        custBranch: 'สำนักงานใหญ่',
        custRegion: '',
        custPhone: '',
        custEmail: '',
        custTax: '',
        custAddr: '',
        custNote: '',
      }));
    } else {
      setSelectedCustName(cust.name);
      const branch = getBranchInfo(cust);
      setForm(f => ({
        ...f,
        customerId: cust.id || '',
        custName: cust.name || '',
        custCompany: cust.companyName || '',
        custBranchType: branch.branchType,
        custBranchName: branch.branchName,
        custBranch: branch.branch,
        custRegion: (cust.region && THAI_REGIONS.includes(cust.region)) ? cust.region : '',
        custPhone: cust.phone || '',
        custEmail: cust.email || '',
        custTax: cust.taxId || '',
        custAddr: cust.address || '',
        custNote: cust.note || '',
        projName: f.projName || '',
      }));
    }
  };

  const updateItem = (id, field, val) => {
    setItems(prev => prev.map(it => {
      if (it.id !== id) return it;
      const updated = { ...it, [field]: val };
      updated.lineTotal = calcLineTotal(updated);
      return updated;
    }));
  };

  const addItem = () => {
    setErrorFields(prev => ({ ...prev, items: false }));
    setItems(prev => [...prev, { id: generateItemId(), productName: '', productCode: '', barcode: '', productImage: '', description: '', size: '', weight: '', quantity: 1, unit: 'ชิ้น', unitPrice: 0, discount: 0, discountType: 'percent', lineTotal: 0 }]);
  };
  const removeItem = (id) => { setItems(prev => prev.filter(it => it.id !== id)); };

  const handleSelectProduct = (selectedInput, variantData) => {
    let itemsToAdd = [];
    if (Array.isArray(selectedInput)) {
      itemsToAdd = selectedInput;
    } else if (selectedInput && typeof selectedInput === 'object' && selectedInput.product) {
      itemsToAdd = [selectedInput];
    } else if (selectedInput) {
      itemsToAdd = [{ product: selectedInput, variant: variantData }];
    }

    if (itemsToAdd.length === 0) return;

    setErrorFields(prev => ({ ...prev, items: false }));

    const newItems = itemsToAdd.map(({ product, variant }) => {
      const price = variant?.price ?? product.retailPrice ?? 0;
      const variantLabel = variant?.options?.map(o => o.value).join(' / ') ?? '';
      return {
        id: generateItemId(),
        productName: variantLabel ? `${product.name} (${variantLabel})` : product.name,
        productCode: variant?.sku ?? variant?.code ?? product.code ?? '',
        productImage: variant?.image ?? product.image ?? '',
        description: '',
        unit: 'ชิ้น',
        quantity: 1,
        unitPrice: price,
        discount: 0,
        discountType: 'percent',
        lineTotal: price,
        barcode: variant?.barcode ?? product.barcode ?? '',
        size: variant?.size ?? product.size ?? '',
        weight: variant?.weight ?? product.weight ?? '',
      };
    });

    setItems(prev => {
      // Filter out empty rows (where productName is not entered)
      const existingFilled = prev.filter(it => it.productName && it.productName.trim() !== '');
      return [...existingFilled, ...newItems];
    });
    setShowPicker(false);
  };

  const handleQuickBarcodeScan = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const term = quickBarcode.trim();
      if (!term) return;

      const match = findProductByBarcodeOrCode(products, term);

      if (match && match.product) {
        const { product, variant } = match;
        const price = variant?.price ?? product.retailPrice ?? 0;
        const variantLabel = variant?.options?.map(o => o.value).join(' / ') ?? '';
        const itemBarcode = variant?.barcode ?? product.barcode ?? '';
        const itemCode = variant?.sku ?? variant?.code ?? product.code ?? '';
        const displayName = variantLabel ? `${product.name} (${variantLabel})` : product.name;

        // Check if item is already in quotation items list
        const existingIdx = items.findIndex(it =>
          (itemBarcode && it.barcode && it.barcode.trim().toLowerCase() === itemBarcode.trim().toLowerCase()) ||
          (itemCode && it.productCode && it.productCode.trim().toLowerCase() === itemCode.trim().toLowerCase())
        );

        if (existingIdx !== -1) {
          const updated = [...items];
          const curr = updated[existingIdx];
          const nextQty = (Number(curr.quantity) || 0) + 1;
          const gross = nextQty * curr.unitPrice;
          const lineTotal = curr.discountType === 'percent' ? gross * (1 - curr.discount / 100) : gross - curr.discount;
          updated[existingIdx] = {
            ...curr,
            quantity: nextQty,
            lineTotal,
          };
          setItems(updated);
          setQuickScanBanner({
            type: 'success',
            message: `เพิ่มจำนวน: ${displayName} เป็น ${nextQty} ชิ้น เรียบร้อย`
          });
        } else {
          const newItem = {
            id: generateItemId(),
            productName: displayName,
            productCode: itemCode,
            productImage: variant?.image ?? product.image ?? '',
            description: '',
            unit: 'ชิ้น',
            quantity: 1,
            unitPrice: price,
            discount: 0,
            discountType: 'percent',
            lineTotal: price,
            barcode: itemBarcode,
            size: variant?.size ?? product.size ?? '',
            weight: variant?.weight ?? product.weight ?? '',
          };
          setItems(prev => {
            const existingFilled = prev.filter(it => it.productName && it.productName.trim() !== '');
            return [...existingFilled, newItem];
          });
          setQuickScanBanner({
            type: 'success',
            message: `เพิ่มสินค้า: ${displayName} (1 ชิ้น) เรียบร้อย`
          });
        }

        setErrorFields(prev => ({ ...prev, items: false }));
        playScanBeep('success');
        setQuickBarcode('');
        setTimeout(() => quickScanInputRef.current?.focus(), 30);
      } else {
        playScanBeep('error');
        setQuickScanBanner({
          type: 'error',
          message: `ไม่พบสินค้าสำหรับบาร์โค้ด "${term}" ในระบบ PIM`
        });
        quickScanInputRef.current?.select();
      }
    }
  };

  const vatRate = Number(form.vatRate);
  const sub = items.reduce((s, it) => s + it.lineTotal, 0);
  const vat = sub * vatRate / 100;
  const total = sub + vat;

  const handleSave = (status) => {
    if (docFormat === 'quotation') {
      if (!form.custName.trim()) {
        setAlert({ type: 'error', msg: 'กรุณากรอกชื่อลูกค้า' });
        setErrorFields({ custName: true });
        scrollToField(fieldRefs.custName);
        return;
      }
      if (!form.custCompany.trim()) {
        setAlert({ type: 'error', msg: 'กรุณากรอกบริษัท' });
        setErrorFields({ custCompany: true });
        scrollToField(fieldRefs.custCompany);
        return;
      }
      if (form.custBranchType === 'sub' && !form.custBranchName.trim()) {
        setAlert({ type: 'error', msg: 'กรุณาระบุชื่อหรือรหัสสาขาย่อย' });
        setErrorFields({ custBranchName: true });
        scrollToField(fieldRefs.custBranchName);
        return;
      }
      if (!form.custRegion.trim() || !THAI_REGIONS.includes(form.custRegion.trim())) {
        setAlert({ type: 'error', msg: 'กรุณาเลือกภาค (จำเป็นต้องเลือก 1 ใน 6 ภาค)' });
        setErrorFields(prev => ({ ...prev, custRegion: true }));
        scrollToField(fieldRefs.custRegion);
        return;
      }
      if (!form.custPhone.trim()) {
        setAlert({ type: 'error', msg: 'กรุณากรอกเบอร์โทร' });
        setErrorFields({ custPhone: true });
        scrollToField(fieldRefs.custPhone);
        return;
      }
      if (!form.custTax.trim()) {
        setAlert({ type: 'error', msg: 'กรุณากรอกเลขผู้เสียภาษี' });
        setErrorFields({ custTax: true });
        scrollToField(fieldRefs.custTax);
        return;
      }
      if (!form.custEmail.trim()) {
        setAlert({ type: 'error', msg: 'กรุณากรอก Email' });
        setErrorFields({ custEmail: true });
        scrollToField(fieldRefs.custEmail);
        return;
      }
      if (!form.custAddr.trim()) {
        setAlert({ type: 'error', msg: 'กรุณากรอกที่อยู่' });
        setErrorFields({ custAddr: true });
        scrollToField(fieldRefs.custAddr);
        return;
      }
      if (!form.custNote.trim()) {
        setAlert({ type: 'error', msg: 'กรุณากรอกหมายเหตุ' });
        setErrorFields({ custNote: true });
        scrollToField(fieldRefs.custNote);
        return;
      }
      if (!form.salesName.trim()) {
        setAlert({ type: 'error', msg: 'กรุณากรอกชื่อพนักงานขาย' });
        setErrorFields({ salesName: true });
        scrollToField(fieldRefs.salesName);
        return;
      }
      if (!form.salesPhone.trim()) {
        setAlert({ type: 'error', msg: 'กรุณากรอกเบอร์ติดต่อพนักงานขาย' });
        setErrorFields({ salesPhone: true });
        scrollToField(fieldRefs.salesPhone);
        return;
      }
      if (!form.projName.trim()) {
        setAlert({ type: 'error', msg: 'กรุณากรอกชื่อโปรเจกต์' });
        setErrorFields({ projName: true });
        scrollToField(fieldRefs.projName);
        return;
      }
      if (!form.validDate) {
        setAlert({ type: 'error', msg: 'กรุณาเลือกวันหมดอายุ' });
        setErrorFields({ validDate: true });
        scrollToField(fieldRefs.validDate);
        return;
      }

      const minDate = (editQt && editQt.issuedDate) ? editQt.issuedDate : new Date().toLocaleDateString('sv-SE');
      if (form.validDate < minDate) {
        setAlert({ type: 'error', msg: 'วันหมดอายุต้องไม่น้อยกว่าวันที่ออกเอกสาร' });
        setErrorFields({ validDate: true });
        scrollToField(fieldRefs.validDate);
        return;
      }
    }
    const isProductProposalDraft = docFormat === 'product_proposal' && status === 'draft';
    if (!isProductProposalDraft) {
      if (!items.some(it => it.productName.trim())) {
        setAlert({ type: 'error', msg: 'กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ' });
        setErrorFields({ items: true });
        scrollToField(fieldRefs.items);
        return;
      }
    }
    setErrorFields({});

    const validItems = items.filter(it => it.productName && it.productName.trim());

    // Admin auto-approves; others submit as 'sent' (pending approval)
    const isEditingExisting = Boolean(editQt && editQt.id);
    const effectiveStatus = (status === 'sent' && currentUser?.role === 'admin') ? 'approved' : status;
    const branch = getBranchInfo({
      branchType: form.custBranchType,
      branchName: form.custBranchName,
      branch: form.custBranch
    });
    onSave({
      id: isEditingExisting ? editQt.id : generateNewId(),
      quotationNumber: isEditingExisting ? editQt.quotationNumber : undefined,
      documentType: docFormat,
      createdBy: isEditingExisting ? (editQt?.createdBy || currentUser?.username || 'system') : (currentUser?.username || 'system'),
      // Track conversion origin
      sourceProposalId: sourceProposal ? (sourceProposal.quotationNumber || sourceProposal.id) : (editQt?.sourceProposalId || undefined),
      customer: docFormat === 'product_proposal'
        ? { name: '', companyName: '', email: '', phone: '', taxId: '', address: '' }
        : {
            id: form.customerId || editQt?.customer?.id,
            name: form.custName.trim(),
            companyName: form.custCompany.trim(),
            ...branch,
            region: form.custRegion || '',
            email: form.custEmail.trim(),
            phone: form.custPhone.trim(),
            taxId: form.custTax.trim(),
            address: form.custAddr.trim(),
            note: form.custNote.trim()
          },
      customerBranch: branch.branch,
      customerRegion: form.custRegion || '',
      salespersonName: form.salesName || currentUser?.name || currentUser?.username || '',
      salespersonPhone: docFormat === 'product_proposal' ? '' : form.salesPhone,
      projectName: docFormat === 'product_proposal' ? '' : form.projName,
      issuedDate: isEditingExisting ? editQt.issuedDate : new Date().toLocaleDateString('sv-SE'),
      validUntilDate: docFormat === 'product_proposal' ? '' : form.validDate,
      vatRate: docFormat === 'product_proposal' ? 0 : vatRate,
      note: docFormat === 'product_proposal' ? '' : form.note,
      items: validItems,
      subtotal: sub,
      vatAmount: docFormat === 'product_proposal' ? 0 : vat,
      taxAmount: docFormat === 'product_proposal' ? 0 : vat,
      totalAmount: docFormat === 'product_proposal' ? sub : total,
      status: effectiveStatus,
      approvedBy: effectiveStatus === 'approved' ? (currentUser?.name || currentUser?.username || 'ไม่ระบุ') : undefined,
      approvedDate: effectiveStatus === 'approved' ? new Date().toISOString() : undefined,
      customerRevised: docFormat === 'product_proposal' ? false : (isEditingExisting ? (editQt?.customerRevised || false) : false),
    });
    const successMsg = docFormat === 'product_proposal'
      ? 'บันทึกใบเสนอสินค้าเรียบร้อย!'
      : (effectiveStatus === 'approved' ? 'อนุมัติและบันทึกใบเสนอราคาเรียบร้อย!' : effectiveStatus === 'sent' ? 'ส่งใบเสนอราคาเรียบร้อย!' : 'บันทึกร่างเรียบร้อย!');
    setAlert({ type: 'success', msg: successMsg });
  };

  const handleCloseAlert = () => {
    const isSuccess = alert?.type === 'success';
    setAlert(null);
    if (isSuccess) {
      onCancel();
    }
  };

  useEffect(() => {
    if (!alert) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        handleCloseAlert();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    let timer;
    if (alert.type === 'success') {
      timer = setTimeout(() => {
        handleCloseAlert();
      }, 2000);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timer) clearTimeout(timer);
    };
  }, [alert]);

  const labelClass = 'text-xs text-[#555557] font-semibold mb-1 block';
  const inputClass = 'w-full text-xs text-[#1d1d1f] bg-[#f5f5f7] border border-[#d2d2d7]/50 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all';
  const getInputClass = (fieldName, extra = '') => {
    const isErr = errorFields[fieldName];
    return `w-full text-xs text-[#1d1d1f] bg-[#f5f5f7] border rounded-xl px-3 py-2.5 focus:outline-none focus:bg-white transition-all ${isErr ? 'border-red-500 ring-1 ring-red-500/30' : 'border-[#d2d2d7]/50 focus:border-[#0071e3]'} ${extra}`;
  };
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

      {alert && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in">
          <div onClick={handleCloseAlert} className="absolute inset-0 bg-white/85 backdrop-blur-md" />
          <div className="relative bg-white rounded-3xl border border-[#d2d2d7]/60 max-w-sm w-full p-6 shadow-[0_20px_60px_rgba(0,0,0,0.12),0_4px_16px_rgba(0,0,0,0.06)] z-10 animate-scale-in text-center flex flex-col items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${alert.type === 'error' ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'}`}>
              {alert.type === 'error' ? (
                <AlertCircle className="w-6 h-6" />
              ) : (
                <Check className="w-6 h-6 stroke-[2.5]" />
              )}
            </div>
            <div>
              <h2 className="font-bold text-sm uppercase tracking-wide text-[#1d1d1f]">
                {alert.type === 'error' ? 'ไม่สามารถบันทึกเอกสารได้' : 'ข้อมูลระบบ'}
              </h2>
              <p className="text-xs text-[#555557] mt-1.5 leading-relaxed">{alert.msg}</p>
            </div>
            <button
              onClick={handleCloseAlert}
              className="w-full py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full text-xs font-bold transition-colors cursor-pointer"
            >
              ตกลง
            </button>
          </div>
        </div>,
        document.body
      )}


      {/* Source Proposal Badge — shown when converting from product proposal */}
      {sourceProposal && (
        <div className="mb-4 flex items-center gap-1.5 px-1 opacity-50">
          <span className="text-[10px]">🔗</span>
          <p className="text-[11px]">แปลงจากใบเสนอสินค้า · <span className="font-mono">{sourceProposal.quotationNumber || sourceProposal.id}</span></p>
        </div>
      )}

      {/* Document Format Toggle — hidden when converting from proposal or when lacking permission */}
      {!sourceProposal && canPerformAction(currentUser, 'quotations.createProposal') && (
        <label
          className={`mb-5 flex items-center justify-between gap-3.5 rounded-2xl p-3.5 sm:p-4 border cursor-pointer transition-all duration-200 select-none ${docFormat === 'product_proposal'
            ? 'bg-violet-50/80 border-violet-400 shadow-xs'
            : 'bg-white border-[#d2d2d7]/80 hover:border-violet-300 hover:bg-zinc-50/40'
            }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* Custom Checkbox */}
            <div className="relative flex-shrink-0">
              <input
                type="checkbox"
                className="sr-only"
                checked={docFormat === 'product_proposal'}
                onChange={e => setDocFormat(e.target.checked ? 'product_proposal' : 'quotation')}
              />
              <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all duration-200 ${docFormat === 'product_proposal'
                ? 'bg-violet-600 border-violet-600 shadow-xs'
                : 'bg-white border-[#d2d2d7] hover:border-violet-400'
                }`}>
                {docFormat === 'product_proposal' && (
                  <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>

            {/* Label text */}
            <div className="min-w-0">
              <p className={`text-sm font-bold transition-colors ${docFormat === 'product_proposal' ? 'text-violet-900' : 'text-[#1d1d1f]'}`}>
                ใบเสนอสินค้า
              </p>
              <p className={`text-xs mt-0.5 transition-colors ${docFormat === 'product_proposal' ? 'text-violet-600' : 'text-[#555557]'}`}>
                {docFormat === 'product_proposal'
                  ? 'ไม่แสดงข้อมูลลูกค้า, พนักงานขาย และราคารวม VAT'
                  : 'ติ๊กเพื่อสร้างใบเสนอสินค้าแบบไม่ระบุข้อมูลลูกค้า'
                }
              </p>
            </div>
          </div>

          {/* Right badge */}
          <span className={`text-xs font-bold px-3 py-1 rounded-full border flex-shrink-0 transition-all duration-200 ${docFormat === 'product_proposal'
            ? 'bg-violet-600 text-white border-violet-600 shadow-xs'
            : 'bg-[#f5f5f7] text-[#555557] border-[#d2d2d7]/60'
            }`}>
            {docFormat === 'product_proposal' ? '✓ ใบเสนอสินค้า' : 'ใบเสนอราคา'}
          </span>
        </label>
      )}


      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column: Customer & Details */}
        {docFormat === 'quotation' && (
          <div className="xl:col-span-1 space-y-6">
            {/* Customer info */}
            <div className={cardClass}>
              <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-[#f5f5f7]">
                <div className="flex items-center gap-2 text-sm font-bold text-[#1d1d1f]">
                  <span className="w-1.5 h-3.5 bg-blue-600 rounded-full"></span>
                  ข้อมูลลูกค้า
                </div>
                {existingCustomers.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowCustModal(true)}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#0071e3] border border-blue-200/80 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 shrink-0"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>เลือกจากลูกค้าเก่า ({existingCustomers.length})</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-[#888] font-medium bg-[#f5f5f7] px-2.5 py-1 rounded-lg border border-[#e8e8ed]">
                    💡 ออกใบเสนอราคาเพื่อเริ่มสะสมประวัติ
                  </span>
                )}
              </div>

              {selectedCustName && (
                <div className="mb-4 px-3.5 py-2.5 bg-blue-50/80 border border-blue-200/80 rounded-xl flex items-center justify-between text-xs animate-fade-in">
                  <div className="flex items-center gap-2 truncate">
                    <UserCheck className="w-4 h-4 text-[#0071e3] shrink-0" />
                    <span className="font-semibold text-[#1d1d1f] truncate">
                      ดึงข้อมูลจาก: <span className="text-[#0071e3] font-bold">{selectedCustName}</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectCustomer(null)}
                    className="text-[11px] text-red-500 hover:text-red-700 font-bold hover:underline cursor-pointer ml-2 shrink-0"
                  >
                    ล้างข้อมูล
                  </button>
                </div>
              )}

              <div className="space-y-4">
                {/* Row 1: ชื่อลูกค้า และ บริษัท */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className={labelClass}>
                      ชื่อลูกค้า <span className="text-red-500">*</span>
                    </label>
                    <input
                      ref={fieldRefs.custName}
                      className={getInputClass('custName')}
                      value={form.custName}
                      onChange={e => setField('custName', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>
                      บริษัท <span className="text-red-500">*</span>
                    </label>
                    <input
                      ref={fieldRefs.custCompany}
                      className={getInputClass('custCompany')}
                      value={form.custCompany}
                      onChange={e => setField('custCompany', e.target.value)}
                    />
                  </div>
                </div>

                {/* Row 2: สาขา (สาขาใหญ่ / สาขาย่อย) และ ภาค (6 ภาค) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-start">
                  {/* สำนักงานใหญ่ / สาขา (สำนักงานใหญ่ / สาขาย่อย) แบบ Dropdown แตกกิ่ง */}
                  <div className="space-y-1.5">
                    <label className={labelClass}>
                      สำนักงานใหญ่ / สาขา <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={form.custBranchType}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === 'head') {
                            setForm(f => ({ ...f, custBranchType: 'head', custBranchName: '', custBranch: 'สำนักงานใหญ่' }));
                          } else {
                            setForm(f => ({ ...f, custBranchType: 'sub', custBranch: f.custBranchName ? `สาขา ${f.custBranchName}` : 'สาขาย่อย' }));
                          }
                          setSelectedCustName('');
                        }}
                        className={`${inputClass} px-3.5 pr-8 cursor-pointer appearance-none font-semibold text-[#1d1d1f]`}
                      >
                        <option value="head">สำนักงานใหญ่</option>
                        <option value="sub">สาขาย่อย (แตกออกเพื่อระบุสาขา)</option>
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 text-[10px]">
                        ▼
                      </div>
                    </div>

                    {/* แตกกิ่งออกสำหรับระบุชื่อหรือรหัสสาขาย่อย */}
                    {form.custBranchType === 'sub' && (
                      <div className="pt-1.5 animate-fade-in pl-3 border-l-2 border-amber-300 ml-2 space-y-1">
                        <div className="flex items-center gap-1 text-[11px] font-bold text-amber-700">
                          <span>↳ ระบุชื่อหรือรหัสสาขาย่อย: <span className="text-red-500">*</span></span>
                        </div>
                        <input
                          ref={fieldRefs.custBranchName}
                          className={getInputClass('custBranchName', 'border-amber-300 focus:border-amber-500 focus:ring-amber-500/20')}
                          value={form.custBranchName}
                          autoFocus
                          onChange={e => {
                            const val = e.target.value;
                            setForm(f => ({ ...f, custBranchName: val, custBranch: val ? `สาขา ${val}` : 'สาขาย่อย' }));
                            setErrorFields(prev => ({ ...prev, custBranchName: false }));
                            setSelectedCustName('');
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* ภาค 6 ภาค */}
                  <div>
                    <label className={labelClass}>
                      ภาค  <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        ref={fieldRefs.custRegion}
                        value={form.custRegion}
                        onChange={e => setField('custRegion', e.target.value)}
                        className={getInputClass('custRegion', 'px-3.5 pr-8 cursor-pointer appearance-none')}
                      >
                        <option value="">-- เลือกภาค (จำเป็น) --</option>
                        {THAI_REGIONS.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 text-[10px]">
                        ▼
                      </div>
                    </div>
                  </div>
                </div>

                {/* Row 3: เบอร์โทร และ เลขผู้เสียภาษี */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className={labelClass}>
                      เบอร์โทร <span className="text-red-500">*</span>
                    </label>
                    <input
                      ref={fieldRefs.custPhone}
                      className={getInputClass('custPhone')}
                      value={form.custPhone}
                      onChange={e => setField('custPhone', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>
                      เลขผู้เสียภาษี <span className="text-red-500">*</span>
                    </label>
                    <input
                      ref={fieldRefs.custTax}
                      className={getInputClass('custTax', 'font-mono')}
                      maxLength={13}
                      value={form.custTax}
                      onChange={e => setField('custTax', e.target.value.replace(/\D/g, '').slice(0, 13))}
                    />
                  </div>
                </div>

                {/* Row 4: Email */}
                <div>
                  <label className={labelClass}>
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={fieldRefs.custEmail}
                    type="email"
                    className={getInputClass('custEmail')}
                    value={form.custEmail}
                    onChange={e => setField('custEmail', e.target.value)}
                  />
                </div>

                {/* Row 5: ที่อยู่ */}
                <div>
                  <label className={labelClass}>
                    ที่อยู่ <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    ref={fieldRefs.custAddr}
                    className={getInputClass('custAddr', 'resize-y min-h-[64px] leading-relaxed')}
                    rows={3}
                    value={form.custAddr}
                    onChange={e => setField('custAddr', e.target.value)}
                  />
                </div>

                {/* Row 6: หมายเหตุ */}
                <div>
                  <label className={labelClass}>
                    หมายเหตุ <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    ref={fieldRefs.custNote}
                    className={getInputClass('custNote', 'resize-y min-h-[56px] leading-relaxed')}
                    rows={2}
                    value={form.custNote}
                    onChange={e => setField('custNote', e.target.value)}
                  />
                </div>
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
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-[#555557] font-semibold">
                        พนักงานขาย <span className="text-red-500">*</span>
                      </label>
                    </div>
                    <input
                      ref={fieldRefs.salesName}
                      className="w-full text-xs text-[#1d1d1f] font-bold bg-[#f0f0f4] border border-[#d2d2d7] rounded-xl px-3 py-2.5 cursor-not-allowed select-none focus:outline-none shadow-2xs"
                      readOnly
                      value={form.salesName || currentUser?.name || currentUser?.username || ''}
                      placeholder="ชื่อพนักงานตามระบบ"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>เบอร์ติดต่อ <span className="text-red-500">*</span></label>
                    <input
                      ref={fieldRefs.salesPhone}
                      className={getInputClass('salesPhone')}
                      value={form.salesPhone}
                      onChange={e => setField('salesPhone', e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className={labelClass}>ชื่อโปรเจกต์ <span className="text-red-500">*</span></label>
                    <input
                      ref={fieldRefs.projName}
                      className={getInputClass('projName')}
                      value={form.projName}
                      onChange={e => setField('projName', e.target.value)}

                    />
                  </div>
                  <div><label className={labelClass}>วันหมดอายุ <span className="text-red-500">*</span></label><input ref={fieldRefs.validDate} className={getInputClass('validDate')} type="date" value={form.validDate} min={(editQt && editQt.issuedDate) ? editQt.issuedDate : new Date().toLocaleDateString('sv-SE')} onChange={e => setField('validDate', e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className={labelClass}>VAT (%) <span className="text-red-500">*</span></label>
                    <select className={inputClass} value={form.vatRate} onChange={e => setField('vatRate', e.target.value)}>
                      <option value="0">ไม่มี VAT</option>
                      <option value="7">7%</option>
                    </select>
                  </div>
                  <div><label className={labelClass}>หมายเหตุ (ถ้ามี)</label><input className={inputClass} value={form.note} onChange={e => setField('note', e.target.value)} /></div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* Right Column: Items */}
        <div className={docFormat === 'product_proposal' ? 'xl:col-span-3 space-y-6' : 'xl:col-span-2 space-y-6'}>
          <div className={cardClass}>
            <div className="flex justify-between items-center border-b border-[#e8e8ed] pb-2 mb-4">
              <div className="text-xs font-bold text-[#1d1d1f] uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-3.5 bg-blue-600 rounded-full"></span>
                รายการสินค้า
                {items.length > 0 && (
                  <span className="text-[10px] bg-blue-50 text-[#0071e3] px-2 py-0.5 rounded-full font-bold">
                    {items.length} รายการ
                  </span>
                )}
              </div>
            </div>

            {/* Barcode Scanner Quick
            
            Bar */}
            <div
              ref={fieldRefs.items}
              className={`mb-4 p-3 bg-gradient-to-r from-blue-50/50 via-[#fbfbfb] to-white border rounded-2xl shadow-xs transition-all ${errorFields.items ? 'border-red-500 ring-2 ring-red-500/30' : 'border-[#d2d2d7]/70'}`}
            >
              <div className="relative w-full">
                <Barcode className="w-4 h-4 text-[#0071e3] absolute left-3 top-2.5" />
                <input
                  ref={quickScanInputRef}
                  type="text"
                  value={quickBarcode}
                  onChange={e => setQuickBarcode(e.target.value)}
                  onKeyDown={handleQuickBarcodeScan}
                  placeholder="ยิง Barcode Scanner เพื่อเพิ่มสินค้าลงเอกสารทันที..."
                  className="w-full pl-9 pr-8 py-2 bg-white border border-[#d2d2d7] rounded-xl text-xs text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20 transition-all font-mono shadow-xs"
                />
                {quickBarcode && (
                  <button
                    type="button"
                    onClick={() => { setQuickBarcode(''); quickScanInputRef.current?.focus(); }}
                    className="absolute right-2.5 top-2 text-[#86868b] hover:text-[#1d1d1f] p-0.5 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Quick scan feedback banner */}
            {quickScanBanner && (
              <div className={`mb-3 flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold animate-fade-in ${
                quickScanBanner.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs' : 'bg-red-50 text-red-700 border border-red-200 shadow-xs'
              }`}>
                <div className="flex items-center gap-2 truncate">
                  {quickScanBanner.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />}
                  <span className="truncate">{quickScanBanner.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setQuickScanBanner(null)}
                  className="text-zinc-400 hover:text-zinc-600 p-0.5 ml-2 shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  {docFormat === 'product_proposal' ? (
                    <tr className="bg-[#f5f5f7] text-[#555557] font-bold uppercase tracking-wider text-[10px]">
                      <th className="p-3 text-center w-10">#</th>
                      <th className="p-3 text-left w-28">รหัสสินค้า</th>
                      <th className="p-3 text-left w-32">บาร์โค้ด</th>
                      <th className="p-3 text-center w-16">รูปภาพ</th>
                      <th className="p-3 text-left min-w-[200px]">ชื่อสินค้า / รายละเอียด</th>
                      <th className="p-3 text-left w-24">ขนาด</th>
                      <th className="p-3 text-left w-24">น้ำหนัก</th>
                      <th className="p-3 text-right w-24">ราคา</th>
                      <th className="p-3 w-10 text-center" />
                    </tr>
                  ) : (
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
                  )}
                </thead>
                <tbody className="divide-y divide-[#f5f5f7]">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={docFormat === 'product_proposal' ? 9 : 8} className="py-12 text-center text-[#86868b]">
                        <div className="flex flex-col items-center justify-center gap-2.5">
                          <div className="w-12 h-12 rounded-2xl bg-[#f5f5f7] flex items-center justify-center text-[#86868b]">
                            <Package className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-[#1d1d1f]">ยังไม่มีรายการสินค้าในเอกสาร</p>
                            <p className="text-[11px] text-[#86868b] mt-0.5">กดปุ่ม <strong className="text-[#0071e3]">"+ เพิ่มข้อมูลสินค้าจากระบบ"</strong> ด้านบนขวาเพื่อเลือกสินค้า</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowPicker(true)}
                            className="mt-1 flex items-center gap-1.5 px-4 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
                          >
                            <Plus className="w-3.5 h-3.5" /> เลือกสินค้าจากระบบ PIM
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    items.map((it, idx) => (
                      docFormat === 'product_proposal' ? (
                        <tr key={it.id} className="hover:bg-[#fafafa]">
                          <td className="p-3 text-center text-[#555557] font-medium">{idx + 1}</td>
                          <td className="p-3">
                            <input
                              className="w-full text-xs bg-[#f5f5f7] border border-[#d2d2d7]/50 rounded-xl px-2 py-1.5 focus:outline-none focus:border-[#0071e3] focus:bg-white font-mono"
                              placeholder="รหัสสินค้า"
                              value={it.productCode || ''}
                              onChange={e => updateItem(it.id, 'productCode', e.target.value)}
                            />
                          </td>
                          <td className="p-3">
                            <input
                              className="w-full text-xs bg-[#f5f5f7] border border-[#d2d2d7]/50 rounded-xl px-2 py-1.5 focus:outline-none focus:border-[#0071e3] focus:bg-white font-mono"
                              placeholder="บาร์โค้ด"
                              value={it.barcode || ''}
                              onChange={e => updateItem(it.id, 'barcode', e.target.value)}
                            />
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                              {it.productImage ? (
                                <img src={it.productImage} className="w-8 h-8 rounded-lg object-cover border border-[#d2d2d7]/50 mx-auto" alt="" />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-[#f5f5f7] border border-[#d2d2d7]/30 flex items-center justify-center text-[9px] text-[#aaa] mx-auto">ไม่มีรูป</div>
                              )}
                              <input
                                className="w-16 text-[9px] text-[#555557] bg-transparent border-b border-transparent hover:border-[#d2d2d7] focus:border-[#0071e3] focus:outline-none text-center truncate"
                                placeholder="URL รูปภาพ"
                                title={it.productImage || 'URL รูปภาพ'}
                                value={it.productImage || ''}
                                onChange={e => updateItem(it.id, 'productImage', e.target.value)}
                              />
                            </div>
                          </td>
                          <td className="p-3">
                            <input
                              className="w-full text-xs font-semibold text-[#1d1d1f] bg-transparent border-b border-transparent hover:border-[#d2d2d7] focus:border-[#0071e3] focus:bg-white focus:outline-none px-1.5 py-0.5 rounded transition-all"
                              placeholder="ชื่อสินค้า"
                              value={it.productName || ''}
                              onChange={e => updateItem(it.id, 'productName', e.target.value)}
                            />
                            <input
                              className="mt-1 w-full text-[11px] text-[#555557] bg-transparent border-b border-transparent hover:border-[#d2d2d7] focus:border-[#0071e3] focus:bg-white focus:outline-none px-1.5 py-1 rounded transition-all placeholder-[#bbb]"
                              placeholder="รายละเอียด"
                              value={it.description || ''}
                              onChange={e => updateItem(it.id, 'description', e.target.value)}
                            />
                          </td>
                          <td className="p-3">
                            <input
                              className="w-full text-xs bg-[#f5f5f7] border border-[#d2d2d7]/50 rounded-xl px-2 py-1.5 focus:outline-none focus:border-[#0071e3] focus:bg-white"
                              placeholder="ขนาด"
                              value={it.size || ''}
                              onChange={e => updateItem(it.id, 'size', e.target.value)}
                            />
                          </td>
                          <td className="p-3">
                            <input
                              className="w-full text-xs bg-[#f5f5f7] border border-[#d2d2d7]/50 rounded-xl px-2 py-1.5 focus:outline-none focus:border-[#0071e3] focus:bg-white"
                              placeholder="น้ำหนัก"
                              value={it.weight || ''}
                              onChange={e => updateItem(it.id, 'weight', e.target.value)}
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              className="w-full text-right text-xs bg-[#f5f5f7] border border-[#d2d2d7]/50 rounded-xl px-2 py-1.5 focus:outline-none focus:border-[#0071e3] focus:bg-white"
                              placeholder="ราคา"
                              value={it.unitPrice}
                              min={0}
                              onChange={e => updateItem(it.id, 'unitPrice', +e.target.value)}
                            />
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(it.id)}
                              className="p-1.5 text-[#d2d2d7] hover:text-red-655 rounded-lg hover:bg-red-50 transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ) : (
                        <tr key={it.id} className="hover:bg-[#fafafa]">
                          <td className="p-3 text-center text-[#555557] font-medium">{idx + 1}</td>
                          <td className="p-3 min-w-[200px]">
                            <div className="flex items-center gap-2 mb-1">
                              {it.productImage && (
                                <img src={it.productImage} className="w-8 h-8 rounded-lg object-cover border border-[#d2d2d7]/50" alt="" />
                              )}
                              <div className="flex-1">
                                {it.productCode && (
                                  <div className="text-[9px] text-[#555557] uppercase font-bold tracking-wider mb-0.5">SKU: {it.productCode}</div>
                                )}
                                <input className="w-full text-xs font-semibold text-[#1d1d1f] bg-transparent border-b border-transparent hover:border-[#d2d2d7] focus:border-[#0071e3] focus:bg-white focus:outline-none px-1.5 py-0.5 rounded transition-all" placeholder="ชื่อสินค้า" value={it.productName} onChange={e => updateItem(it.id, 'productName', e.target.value)} />
                              </div>
                            </div>
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
                      )
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {items.length > 0 && (
              <button
                type="button"
                onClick={() => setShowPicker(true)}
                className="flex items-center gap-1.5 text-xs font-bold text-[#0071e3] hover:text-[#0077ed] bg-transparent border-none cursor-pointer py-2 mt-2"
              >
                <Plus className="w-3.5 h-3.5" /> เพิ่มสินค้าจากระบบ PIM
              </button>
            )}
            {docFormat !== 'product_proposal' && (
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
            )}
          </div>

          <div className="flex gap-2.5 flex-wrap">
            {docFormat === 'product_proposal' ? (
              // Product proposal — save + draft buttons
              <>
                <button
                  onClick={() => handleSave('approved')}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" /> บันทึกใบเสนอสินค้า
                </button>
                <button
                  type="button"
                  onClick={() => handleSave('draft')}
                  className="px-4 py-2.5 bg-white hover:bg-[#f5f5f7] text-[#1d1d1f] border border-[#d2d2d7]/50 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  บันทึกร่าง
                </button>
              </>
            ) : (
              // Quotation — keep draft + send workflow
              <>
                <button
                  onClick={() => handleSave('sent')}
                  className="px-4 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  {currentUser?.role === 'admin' ? 'บันทึก & อนุมัติ' : 'บันทึก & ส่ง'}
                </button>
                <button
                  onClick={() => handleSave('draft')}
                  className="px-4 py-2.5 bg-white hover:bg-[#f5f5f7] text-[#1d1d1f] border border-[#d2d2d7]/50 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  บันทึกร่าง
                </button>
              </>
            )}
            <button onClick={onCancel} className="px-4 py-2.5 bg-white hover:bg-[#f5f5f7] text-[#1d1d1f] border border-[#d2d2d7]/50 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer">
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmConfig({
                  title: 'ล้างข้อมูลแบบฟอร์ม',
                  type: 'danger',
                  confirmText: 'ล้างข้อมูล',
                  cancelText: 'ยกเลิก',
                  onConfirm: () => {
                    setForm({
                      custName: '', custCompany: '', custPhone: '', custEmail: '',
                      custTax: '', custAddr: '',
                      salesName: currentUser?.name || currentUser?.username || '', salesPhone: '',
                      projName: '', validDate: '', vatRate: '7', note: '',
                    });
                    setItems([]);
                  }
                });
              }}
              className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              ล้างค่าฟอร์ม
            </button>
          </div>

        </div>
      </div>
      <ConfirmModal
        isOpen={!!confirmConfig}
        onClose={() => setConfirmConfig(null)}
        onConfirm={confirmConfig?.onConfirm}
        title={confirmConfig?.title}
        message={confirmConfig?.message}
        confirmText={confirmConfig?.confirmText}
        cancelText={confirmConfig?.cancelText}
        type={confirmConfig?.type}
      />
      {showCustModal && (
        <CustomerPickerModal
          customers={existingCustomers}
          onSelect={handleSelectCustomer}
          onClose={() => setShowCustModal(false)}
        />
      )}
    </div>
  );
};

// ── Preview Tab (Full Width Detail Layout) ──────────────────────
const PreviewTab = ({
  quotations,
  selectedIndex,
  onStatusChange,
  onPrint,
  onEdit,
  onDelete,
  onConvert,
  currentUser,
  onSendMailDirect,
  onCopyAsNew
}) => {
  const q = selectedIndex !== null && quotations[selectedIndex] ? quotations[selectedIndex] : null;

  if (!q) {
    if (!quotations || quotations.length === 0) {
      return (
        <div className="text-center py-28 text-sm text-[#555557] font-semibold bg-white rounded-2xl border border-[#d2d2d7]/50 shadow-xs flex flex-col items-center justify-center gap-3">
          <div className="w-6 h-6 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
          <span>กำลังโหลดข้อมูลเอกสาร...</span>
        </div>
      );
    }
    return (
      <div className="text-center py-28 text-sm text-[#555557] font-semibold bg-white rounded-2xl border border-[#d2d2d7]/50 shadow-xs flex flex-col items-center justify-center gap-3">
        <FileText className="w-12 h-12 text-zinc-300" />
        <span>ไม่พบรายละเอียดเอกสาร</span>
      </div>
    );
  }


  const isApprovedQuotation = q.status === 'approved' && q.documentType !== 'product_proposal';
  const canPrint = canPerformAction(currentUser, 'quotations.print') && (q.status === 'approved' || q.documentType === 'product_proposal');
  const canEdit = canPerformAction(currentUser, 'quotations.edit') &&
    !isExpiredQuotation(q) &&
    !isApprovedQuotation &&
    (currentUser?.role === 'admin' || (
      (currentUser?.role === 'manager' || currentUser?.role === 'user') &&
      isOwnDocument(q, currentUser)
    ));
  const expiryStatus = useMemo(() => getExpiryStatus(q), [q]);

  return (
    <div className="space-y-4 animate-fade-in text-[#1d1d1f] w-full font-sans">
      {/* Header actions card */}
      <div className="bg-[#f5f5f7] rounded-2xl border border-[#d2d2d7]/50 p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 w-full">
        <div>
          <div className="text-sm font-bold text-[#1d1d1f] flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[#0071e3] text-base">{q.quotationNumber || q.id}</span>
            {q.documentType === 'product_proposal' ? (
              <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full font-bold border bg-violet-50 text-violet-600 border-violet-200">
                ✓ พร้อมใช้งาน
              </span>
            ) : (
              <Badge status={q.status} expired={isExpiredQuotation(q)} />
            )}
            {!isExpiredQuotation(q) && expiryStatus?.isExpiringSoon && (
              <span
                className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                  expiryStatus.daysLeft === 0
                    ? 'bg-red-50 text-red-600 border-red-200 animate-pulse'
                    : 'bg-amber-50 text-amber-800 border-amber-300'
                }`}
              >
                <Clock className="w-3 h-3" />
                {expiryStatus.label}
              </span>
            )}
          </div>
          <div className="text-[11px] text-[#555557] mt-1 font-semibold">
            {q.customer?.name} {q.customer?.companyName ? `· ${q.customer.companyName}` : ''}
          </div>
          {q.status === 'approved' && q.approvedBy && (
            <div className="text-[10px] text-emerald-600 font-extrabold mt-1.5 flex items-center gap-1">
              <span className="w-1.5 h-3.5 bg-emerald-500 rounded-full"></span>
              ผู้อนุมัติ: {q.approvedBy}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 items-center self-start md:self-auto">
          {!isExpiredQuotation(q) && canPerformAction(currentUser, 'quotations.approve') && q.documentType !== 'product_proposal' && (q.status === 'sent' || q.status === 'draft') && (
            <>
              <button
                onClick={() => onStatusChange(q, 'approved')}
                className="px-3.5 py-2 text-xs font-bold bg-[#eaf3de] hover:bg-[#dcedc7] text-[#3b6d11] border border-[#c0dd97] rounded-xl cursor-pointer transition-colors"
              >
                ✓ อนุมัติ
              </button>
              <button
                onClick={() => onStatusChange(q, 'rejected')}
                className="px-3.5 py-2 text-xs font-bold bg-[#fcebeb] hover:bg-[#fad8d8] text-[#a32d2d] border border-[#f7c1c1] rounded-xl cursor-pointer transition-colors"
              >
                ✕ ไม่อนุมัติ
              </button>
            </>
          )}

          {!isExpiredQuotation(q) && q.status === 'draft' && (currentUser?.role === 'user' || currentUser?.role === 'manager') && (
            <button
              onClick={() => onStatusChange(q, 'sent')}
              className="px-3.5 py-2 text-xs font-bold bg-[#e0f2fe] hover:bg-[#bae6fd] text-[#0369a1] border border-[#bae6fd] rounded-xl cursor-pointer transition-colors"
            >
              ส่งเอกสาร
            </button>
          )}

          {isExpiredQuotation(q) && onCopyAsNew && (
            <button
              onClick={() => onCopyAsNew(q)}
              className="px-3.5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs"
              title="คัดลอกข้อมูลเพื่อสร้างใบเสนอราคาฉบับใหม่สำหรับขายต่อ"
            >
              <Plus className="w-3.5 h-3.5" /> สร้างใบเสนอราคาใหม่
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
          {canDeleteDocument(q, currentUser) && (
            <button
              onClick={() => onDelete(q)}
              className="p-2 text-red-500 hover:bg-red-50 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-red-200"
              title="ลบเอกสาร"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {!isExpiredQuotation(q) && (q.status === 'approved' || q.documentType === 'product_proposal') && onSendMailDirect && (
            <button
              onClick={() => onSendMailDirect(q)}
              className="px-3.5 py-2 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl cursor-pointer transition-colors flex items-center gap-1.5"
              title="ดาวน์โหลดเอกสาร PDF และเปิด Google Gmail เพื่อส่งอีเมล"
            >
              <Mail className="w-3.5 h-3.5 text-[#ea4335]" /> ส่งอีเมล (Gmail)
            </button>
          )}

          {/* Convert to Quotation — only for product proposals */}
          {q.documentType === 'product_proposal' && onConvert && canPerformAction(currentUser, 'quotations.create') && (
            <button
              onClick={() => onConvert(q)}
              className="px-3.5 py-2 text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl cursor-pointer transition-colors flex items-center gap-1.5"
              title="สร้างใบเสนอราคาจากใบเสนอสินค้านี้"
            >
              🔁 แปลงเป็นใบเสนอราคา
            </button>
          )}

          {!isExpiredQuotation(q) && (canPrint ? (
            <button
              onClick={() => onPrint(q)}
              className="px-4 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" /> พิมพ์ / ดาวน์โหลด PDF
            </button>
          ) : (
            <span className="text-[10px] font-bold text-[#a32d2d] bg-[#fcebeb] px-3 py-2 rounded-full border border-[#f7c1c1]">
              ไม่สามารถพิมพ์ได้
            </span>
          ))}
        </div>
      </div>

      {/* Expired quotation alert banner */}
      {isExpiredQuotation(q) && (
        <div className="rounded-2xl p-4 flex items-center gap-3 border bg-amber-50/80 border-amber-200 text-amber-900">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-amber-100 text-amber-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold">
              เอกสารนี้หมดอายุแล้ว (เก็บไว้เป็นประวัติ)
            </p>
            <p className="text-[11px] mt-0.5 text-amber-700">
              ครบกำหนดอายุเมื่อ {formatDate(q.validUntilDate)} หากต้องการขายต่อ สามารถกดปุ่ม <strong>"สร้างใบเสนอราคาใหม่"</strong> ด้านบนเพื่อคัดลอกข้อมูลไปออกใบใหม่ได้ทันที
            </p>
          </div>
        </div>
      )}

      {/* Expiring soon alert banner (within 3 days) */}
      {!isExpiredQuotation(q) && expiryStatus?.isExpiringSoon && (
        <div className="rounded-2xl p-4 flex items-center gap-3 border bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300 text-amber-950 shadow-2xs">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-amber-100 text-amber-700 shadow-2xs">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <p className="text-xs font-bold flex items-center gap-2 text-amber-900">
              <span>⚠️ ใบเสนอราคานี้{expiryStatus.label} (วันที่ {formatDate(q.validUntilDate)})</span>
              {expiryStatus.daysLeft === 0 && (
                <span className="bg-red-500 text-white text-[9px] px-2 py-0.5 rounded-full font-black animate-pulse">
                  วันสุดท้าย
                </span>
              )}
            </p>
            <p className="text-[11px] mt-0.5 text-amber-800">
              {expiryStatus.daysLeft === 0
                ? 'วันนี้เป็นวันสุดท้ายที่เอกสารนี้มีผลใช้งาน กรุณาติดต่อติดตามลูกค้าเพื่อสรุปคำสั่งซื้อก่อนหมดอายุ'
                : `เหลือเวลาอีก ${expiryStatus.daysLeft} วันก่อนที่เอกสารจะหมดอายุ กรุณาติดต่อติดตามลูกค้าเพื่อยืนยันหรือปิดการขาย`}
            </p>
          </div>
        </div>
      )}

      {/* Source Proposal Traceability Badge */}
      {q.sourceProposalId && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2.5 text-xs text-amber-700">
          <span>🔗</span>
          <span className="font-semibold">แปลงจากใบเสนอสินค้า</span>
          <span className="font-mono font-bold text-amber-800">{q.sourceProposalId}</span>
        </div>
      )}

      {/* Main Document Details Display */}
      <div className="bg-white border border-[#d2d2d7]/50 rounded-2xl p-6 shadow-xs">
        {/* Details layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-[#1d1d1f]">
          {q.documentType !== 'product_proposal' && (
            <div className="bg-[#f5f5f7] rounded-xl p-4 border border-[#d2d2d7]/50">
              <div className="text-xs font-extrabold text-[#1d1d1f] border-b border-[#e8e8ed] pb-2 mb-3 uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-3.5 bg-blue-600 rounded-full"></span>
                ข้อมูลลูกค้า
              </div>
              <div className="space-y-2.5">
                {[
                  ['ชื่อลูกค้า', q.customer?.name],
                  ['บริษัท', q.customer?.companyName || '-'],
                  ['สาขา', q.customer?.branch || q.customerBranch || '-'],
                  ['ภาค', q.customer?.region || q.customerRegion || '-'],
                  ['เบอร์โทร', q.customer?.phone || '-'],
                  ['เลขผู้เสียภาษี', q.customer?.taxId || '-'],
                  ['อีเมล', q.customer?.email || '-'],
                  ['ที่อยู่', q.customer?.address || '-'],
                  ['หมายเหตุ', q.customer?.note || q.customerNote || '-']
                ].map(([l, v]) => (
                  <div key={l} className="flex gap-2 leading-relaxed">
                    <span className="text-[#555557] font-semibold min-w-[90px]">{l}</span>
                    <span className="text-black font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {q.documentType === 'product_proposal' ? (
            <div className="bg-violet-50 rounded-2xl p-6 border border-violet-200 md:col-span-2 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-violet-200 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-5 bg-gradient-to-b from-violet-600 to-purple-600 rounded-full shadow-xs"></div>
                  <h3 className="text-sm font-extrabold text-violet-950 uppercase tracking-wider">
                    รายละเอียดใบเสนอสินค้า (Product Proposal)
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
                {/* 1. Salesperson */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-violet-100 shadow-2xs hover:border-violet-300 transition-all duration-200">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                    ผู้นำเสนอ / ผู้จัดทำ
                  </span>
                  <span className="text-sm sm:text-base font-bold text-zinc-900 truncate block">
                    {q.salespersonName || '-'}
                  </span>
                </div>

                {/* 2. Issue Date */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-violet-100 shadow-2xs hover:border-violet-300 transition-all duration-200">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                    วันที่จัดทำเอกสาร
                  </span>
                  <span className="text-sm sm:text-base font-bold text-zinc-900 block">
                    {formatDate(q.issuedDate)}
                  </span>
                </div>

                {/* 3. Items Count */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-violet-100 shadow-2xs hover:border-violet-300 transition-all duration-200">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                    จำนวนรายการสินค้า
                  </span>
                  <span className="text-sm sm:text-base font-black text-violet-700 block">
                    {q.items?.length || 0} <span className="text-xs font-bold text-zinc-500">รายการ</span>
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#f5f5f7] rounded-xl p-4 border border-[#d2d2d7]/50">
              <div className="text-xs font-extrabold text-[#1d1d1f] border-b border-[#e8e8ed] pb-2 mb-3 uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-3.5 bg-blue-600 rounded-full"></span>
                รายละเอียดเอกสาร
              </div>
              <div className="space-y-2.5">
                {[
                  ['ผู้ขาย', q.salespersonName],
                  ['เบอร์ติดต่อ', q.salespersonPhone || '-'],
                  ['ชื่อโปรเจกต์', q.projectName || '-'],
                  ['วันที่ออกเอกสาร', formatDate(q.issuedDate)],
                  ['ใช้ได้ถึงวันที่', (
                    <span className="flex items-center gap-1.5 flex-wrap">
                      <span>{formatDate(q.validUntilDate)}</span>
                      {expiryStatus?.isExpiringSoon && !isExpiredQuotation(q) && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${expiryStatus.daysLeft === 0 ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-amber-50 text-amber-800 border-amber-300'}`}>
                          {expiryStatus.label}
                        </span>
                      )}
                    </span>
                  )],
                  ['VAT (%)', (q.vatRate ?? 7) + '%']
                ].map(([l, v]) => (
                  <div key={l} className="flex gap-2 leading-relaxed">
                    <span className="text-[#555557] font-semibold min-w-[90px]">{l}</span>
                    <span className="text-black font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Items table layout */}
        <div className="overflow-x-auto mt-6 rounded-2xl border border-[#d2d2d7]/50 bg-white">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-[#f5f5f7]/80 text-[#86868b] font-black border-b border-[#e8e8ed] text-[10px] uppercase tracking-widest">
                {q.documentType === 'product_proposal'
                  ? ['ลำดับ', 'ภาพสินค้า', 'รหัสสินค้า', 'บาร์โค้ด', 'ชื่อสินค้า / รายการ', 'ขนาด', 'น้ำหนัก', 'ราคาจำหน่าย'].map((h, i) => (
                    <th
                      key={i}
                      className={`p-2.5 sm:p-3.5 font-black text-[10px] tracking-widest uppercase ${i === 0 || i === 1 || i === 2 || i === 3 || i === 5 || i === 6
                          ? 'text-center'
                          : i === 4
                            ? 'text-left'
                            : 'text-right'
                        }`}
                    >
                      {h}
                    </th>
                  ))
                  : ['ลำดับ', 'รูปภาพ', 'รหัสสินค้า', 'รายการสินค้า', 'จำนวน', 'หน่วย', 'ราคา/หน่วย', 'ส่วนลด', 'รวม'].map((h, i) => (
                    <th
                      key={i}
                      className={`p-2.5 sm:p-3.5 font-black text-[10px] tracking-widest uppercase ${i === 0 || i === 1 || i === 4 || i === 5
                          ? 'text-center'
                          : i === 2 || i === 3
                            ? 'text-left'
                            : 'text-right'
                        }`}
                    >
                      {h}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f0f5]">
              {q.documentType === 'product_proposal' ? (
                q.items?.map((it, idx) => (
                  <tr key={it.id || idx} className="hover:bg-violet-50/30 transition-colors">
                    <td className="p-2 sm:p-3.5 text-center text-[#86868b] font-mono text-[10px]">{idx + 1}</td>
                    <td className="p-2 sm:p-3.5 text-center">
                      {it.productImage ? (
                        <div className="w-14 h-14 rounded-xl bg-[#fafafa] border border-violet-100 flex items-center justify-center p-1 mx-auto shadow-2xs overflow-hidden">
                          <img
                            src={it.productImage}
                            className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg block"
                            alt=""
                          />
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-zinc-100 border border-zinc-200/60 flex items-center justify-center text-zinc-400 text-xs mx-auto">
                          —
                        </div>
                      )}
                    </td>
                    <td className="p-2 sm:p-3.5 text-center font-mono font-bold text-zinc-700 text-[10px] sm:text-xs">
                      {it.productCode ? (
                        <span className="bg-zinc-100 text-zinc-800 px-2 py-0.5 rounded-md font-mono border border-zinc-200/50">
                          {it.productCode}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="p-2 sm:p-3 text-center">
                      <BarcodeDisplay value={it.barcode || it.productCode} height={44} maxWidth={165} fontSize={12} />
                    </td>
                    <td className="p-2 sm:p-3.5 text-left">
                      <div className="font-bold text-zinc-900 leading-snug text-xs sm:text-sm">{it.productName}</div>
                      {it.description && <div className="text-[10.5px] text-[#86868b] mt-1 leading-relaxed">{it.description}</div>}
                    </td>
                    <td className="p-2 sm:p-3.5 text-center text-[#555557] font-medium text-xs">
                      {it.size || '—'}
                    </td>
                    <td className="p-2 sm:p-3.5 text-center text-[#555557] font-medium text-xs">
                      {it.weight || '—'}
                    </td>
                    <td className="p-2 sm:p-3.5 text-right font-black text-violet-900 text-xs sm:text-sm">
                      ฿{fmt(it.unitPrice)}
                    </td>
                  </tr>
                ))
              ) : (
                q.items?.map((it, idx) => (
                  <tr key={it.id || idx} className="hover:bg-[#fafafa]/80 transition-colors">
                    <td className="p-2 sm:p-3.5 text-center text-[#86868b] font-mono text-[10px]">{idx + 1}</td>
                    <td className="p-2 sm:p-3.5 text-center">
                      {it.productImage ? (
                        <div className="w-9 h-9 rounded-lg bg-[#fafafa] border border-[#d2d2d7]/50 flex items-center justify-center p-0.5 mx-auto overflow-hidden">
                          <img
                            src={it.productImage}
                            className="max-w-full max-h-full w-auto h-auto object-contain rounded-md block"
                            alt=""
                          />
                        </div>
                      ) : (
                        <span className="text-[#ccc]">—</span>
                      )}
                    </td>
                    <td className="p-2 sm:p-3.5 text-left font-mono font-bold text-zinc-700 text-[10px] sm:text-xs">
                      {it.productCode ? (
                        <span className="bg-[#f5f5f7] px-1.5 py-0.5 rounded-md">
                          {it.productCode}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="p-2 sm:p-3.5 text-left">
                      <div className="font-semibold text-black leading-snug">{it.productName}</div>
                      {it.description && <div className="text-[10px] text-[#86868b] mt-1 leading-relaxed">{it.description}</div>}
                    </td>
                    <td className="p-2 sm:p-3.5 text-center font-semibold text-black">{it.quantity}</td>
                    <td className="p-2 sm:p-3.5 text-center text-[#555557] font-medium">{it.unit}</td>
                    <td className="p-2 sm:p-3.5 text-right text-zinc-700 font-semibold">{fmt(it.unitPrice)}</td>
                    <td className="p-2 sm:p-3.5 text-right text-red-500 font-semibold">
                      {it.discount > 0 ? (it.discountType === 'percent' ? it.discount + '%' : fmt(it.discount)) : '0'}
                    </td>
                    <td className="p-2 sm:p-3.5 text-right font-black text-black">{fmt(it.lineTotal)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Amount summarizes */}
        {q.documentType !== 'product_proposal' && (
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
        )}

        {q.note && (
          <div className="mt-4 text-[10px] text-[#555557] bg-[#f5f5f7] border border-[#e2e8f0] rounded-xl p-3.5 leading-relaxed">
            <strong>หมายเหตุ:</strong> {q.note}
          </div>
        )}
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
  users = [],
  customers = [],
  onSaveQuotation,
  onDeleteQuotation,
  addActivityLog,
}) {
  const showToast = useToast();
  const [tab, setTabState] = useState(() => {
    try {
      return localStorage.getItem('pim_quotation_tab') || 'list';
    } catch {
      return 'list';
    }
  });

  const setTab = (newTab) => {
    const nextTab = typeof newTab === 'function' ? newTab(tab) : newTab;
    setTabState(nextTab);
    try {
      localStorage.setItem('pim_quotation_tab', nextTab);
      if (nextTab === 'list') {
        localStorage.removeItem('pim_quotation_preview_id');
        localStorage.removeItem('pim_quotation_edit_id');
      }
    } catch { }
  };
  const [previewIndex, setPreviewIndex] = useState(null);
  const [editQt, setEditQt] = useState(null);
  const [convertProposal, setConvertProposal] = useState(null); // proposal being converted to quotation
  const [printQt, setPrintQt] = useState(null);
  const [autoPrint, setAutoPrint] = useState(false);
  const [autoOpenPDF, setAutoOpenPDF] = useState(false);
  const [openedWindow, setOpenedWindow] = useState(null);
  const [toast, setToast] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState(null);
  const [isDownloadGuideOpen, setIsDownloadGuideOpen] = useState(false);
  const [autoDownloadAndEmail, setAutoDownloadAndEmail] = useState(false);
  const [createDocFormat, setCreateDocFormat] = useState('quotation');

  useEffect(() => {
    if (editQt) {
      setCreateDocFormat(editQt.documentType || 'quotation');
    } else if (convertProposal) {
      setCreateDocFormat('quotation');
    } else {
      setCreateDocFormat('quotation');
    }
  }, [editQt, convertProposal]);


  /*
  const handleClearAll = () => {
    setConfirmConfig({
      title: 'ลบเอกสารทั้งหมด?',
      type: 'danger',
      confirmText: 'ล้างข้อมูลทั้งหมด',
      cancelText: 'ยกเลิก',
      onConfirm: () => {
        onClearAllQuotations();
        if (previewIndex !== null) {
          setPreviewIndex(null);
        }
      }
    });
  };
  */

  // Filter quotations based on user role to prevent mixing documents
  const userFilteredQuotations = useMemo(() => {
    if (!currentUser || currentUser.role === 'admin') return quotations;
    return quotations.filter(q => {
      const creator = q.createdBy || '';
      const salesName = q.salespersonName || '';
      return creator === currentUser.username ||
        salesName.toLowerCase().includes(currentUser.username.toLowerCase()) ||
        (currentUser.name && salesName.toLowerCase().includes(currentUser.name.toLowerCase()));
    });
  }, [quotations, currentUser]);

  // Enrich quotations with missing productCode/productImage for backward compatibility
  const enrichedQuotations = useMemo(() => {
    return userFilteredQuotations.map(q => ({
      ...q,
      items: q.items?.map(it => {
        if (it.productCode && it.productImage) return it;

        // Find matching product in products database
        const match = products.find(p => {
          const pName = p.name ? p.name.trim().toLowerCase() : '';
          const itName = it.productName ? it.productName.trim().toLowerCase() : '';
          return pName === itName || itName.startsWith(pName) || pName.startsWith(itName);
        });

        return {
          ...it,
          productCode: it.productCode || match?.code || '',
          productImage: it.productImage || match?.image || '',
        };
      })
    }));
  }, [userFilteredQuotations, products]);


  // Automatically restore previewIndex or editQt after quotations are loaded
  useEffect(() => {
    if (!enrichedQuotations || enrichedQuotations.length === 0) return;

    if (tab === 'preview') {
      try {
        const savedId = localStorage.getItem('pim_quotation_preview_id');
        if (savedId) {
          const idx = enrichedQuotations.findIndex(
            q => String(q.id) === String(savedId) || String(q.quotationNumber) === String(savedId)
          );
          if (idx !== -1) {
            setPreviewIndex(idx);
            return;
          }
        }
      } catch {}
      if (previewIndex === null && enrichedQuotations.length > 0) {
        setPreviewIndex(0);
      }
    } else if (tab === 'create') {
      try {
        const editId = localStorage.getItem('pim_quotation_edit_id');
        if (editId && !editQt) {
          const found = enrichedQuotations.find(
            q => String(q.id) === String(editId) || String(q.quotationNumber) === String(editId)
          );
          if (found) {
            setEditQt(found);
          }
        }
      } catch {}
    }
  }, [enrichedQuotations, tab]);

  const handleSelectPreviewIndex = (idx) => {
    setPreviewIndex(idx);
    const q = enrichedQuotations[idx];
    const qId = q?.id || q?.quotationNumber;
    if (qId) {
      try {
        localStorage.setItem('pim_quotation_preview_id', qId);
      } catch {}
    }
  };

  const handleView = (i) => {
    setPreviewIndex(i);
    setTab('preview');
    const q = userFilteredQuotations[i] || enrichedQuotations[i];
    const qId = q?.id || q?.quotationNumber;
    if (qId) {
      try {
        localStorage.setItem('pim_quotation_preview_id', qId);
      } catch {}
    }
  };

  const handleCreate = () => {
    setEditQt(null);
    setConvertProposal(null);
    try {
      localStorage.removeItem('pim_quotation_edit_id');
    } catch {}
    setTab('create');
  };

  const handleEdit = (q) => {
    if (q && q.status === 'approved' && q.documentType !== 'product_proposal') {
      showToast('ใบเสนอราคาที่อนุมัติแล้วไม่สามารถแก้ไขได้', 'error');
      return;
    }
    setEditQt(q);
    setConvertProposal(null);
    const qId = q?.id || q?.quotationNumber;
    if (qId) {
      try {
        localStorage.setItem('pim_quotation_edit_id', qId);
      } catch {}
    }
    setTab('create');
  };

  const handleConvertToQuotation = (proposal) => {
    setEditQt(null);
    setConvertProposal(proposal);
    try {
      localStorage.removeItem('pim_quotation_edit_id');
    } catch {}
    setTab('create');
  };

  const handleSave = (data) => {
    try {
      localStorage.removeItem('pim_quotation_edit_id');
    } catch {}
    const isEditingExisting = Boolean(editQt && editQt.id);
    const savedData = {
      ...data,
      id: isEditingExisting ? editQt.id : generateNewId(),
      quotationNumber: isEditingExisting ? editQt.quotationNumber : `QT-${new Date().toLocaleDateString('sv-SE').replace(/-/g, '')}-${String(quotations.length + 1).padStart(4, '0')}`,
    };
    onSaveQuotation(savedData);
    setEditQt(null);
  };

  const handleCopyAsNew = (q) => {
    if (!q) return;
    const cloned = {
      customer: q.customer ? { ...q.customer } : undefined,
      salespersonName: q.salespersonName || currentUser?.name || currentUser?.username || '',
      salespersonPhone: q.salespersonPhone || '',
      projectName: q.projectName || '',
      items: (q.items || []).map((it, idx) => ({ ...it, id: it.id || idx })),
      vatRate: q.vatRate ?? 7,
      note: q.note || '',
      documentType: q.documentType || 'quotation',
      id: undefined,
      quotationNumber: undefined,
      issuedDate: new Date().toLocaleDateString('sv-SE'),
      validUntilDate: '',
      status: 'draft',
      approvedBy: undefined,
      approvedDate: undefined,
      customerRevised: false,
    };
    setEditQt(cloned);
    setConvertProposal(null);
    setTab('create');
  };

  const handleDelete = (q) => {
    onDeleteQuotation(q.id);
    setDeleteTarget(null);
    if (previewIndex !== null) {
      setPreviewIndex(null);
    }
  };

  const handleStatusChange = async (q, status) => {
    if (q && q.id) {
      if (status === 'approved' && isExpiredQuotation(q)) {
        showToast('ไม่สามารถอนุมัติเอกสารที่หมดอายุแล้วได้', 'error');
        return;
      }
      try {
        // Find the exact quotation in the master quotations array by ID
        const masterQ = quotations.find(x => x.id === q.id) || q;
        await onSaveQuotation({
          ...masterQ,
          status,
          salespersonPhone: masterQ.salespersonPhone || q.salespersonPhone || currentUser?.phone || '-',
          projectName: masterQ.projectName || q.projectName || 'ทั่วไป',
          approvedBy: status === 'approved' ? currentUser?.name || currentUser?.username || 'ไม่ระบุ' : undefined,
          approvedDate: status === 'approved' ? new Date().toISOString() : undefined
        });
        showToast(status === 'approved' ? 'อนุมัติเอกสารเรียบร้อยแล้ว' : 'เปลี่ยนสถานะเป็นไม่อนุมัติเรียบร้อยแล้ว', 'success');
      } catch (err) {
        showToast(err?.message || 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', 'error');
      }
    }
  };

  // QuotationPrint is rendered hidden so it can generate PDF without blanking the page

  const selectedQt = previewIndex !== null && enrichedQuotations[previewIndex] ? enrichedQuotations[previewIndex] : null;
  const headerTitle = (tab === 'preview' && selectedQt?.documentType === 'product_proposal') ? 'ใบเสนอสินค้า' : 'ใบเสนอราคา';

  // Early return for Create tab to provide dedicated full page layout
  if (tab === 'create') {
    return (
      <div className="space-y-6 animate-fade-in text-[#1d1d1f] w-full min-w-0">
        {/* Dedicated Header for Create/Edit */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#e2e8f0] pb-4 mb-4 gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-1 h-5 rounded-full ${
                createDocFormat === 'product_proposal'
                  ? 'bg-gradient-to-b from-violet-600 to-purple-400'
                  : 'bg-gradient-to-b from-[#0071e3] to-[#00c2ff]'
              }`} />
              <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                createDocFormat === 'product_proposal' ? 'text-violet-600' : 'text-[#0071e3]'
              }`}>
                {createDocFormat === 'product_proposal' ? 'PRODUCT PROPOSAL EDITOR' : 'QUOTATION EDITOR'}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f]">
              {convertProposal
                ? '🔁 สร้างใบเสนอราคาจากใบเสนอสินค้า'
                : editQt
                  ? (editQt.id
                    ? (createDocFormat === 'product_proposal' ? 'แก้ไขใบเสนอสินค้า' : 'แก้ไขใบเสนอราคา')
                    : 'สร้างใบเสนอราคาใหม่ (คัดลอกข้อมูล)')
                  : (createDocFormat === 'product_proposal' ? 'สร้างเอกสารใหม่ (ใบเสนอสินค้า)' : 'สร้างเอกสารใหม่ (ใบเสนอราคา)')
              }
            </h1>
          </div>
          <button
            onClick={() => { setConvertProposal(null); setTab('list'); }}
            className="px-4 py-2 bg-white border border-[#d2d2d7]/50 hover:bg-[#f5f5f7] text-[#1d1d1f] text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
          >
            ย้อนกลับ
          </button>
        </div>

        <CreateTab
          onSave={handleSave}
          onCancel={() => { setConvertProposal(null); setTab('list'); }}
          products={products}
          editQt={editQt}
          currentUser={currentUser}
          sourceProposal={convertProposal}
          quotations={quotations}
          users={users}
          customers={customers}
          docFormat={createDocFormat}
          setDocFormat={setCreateDocFormat}
        />
      </div>
    );
  }

  // Normal view layout with List and Preview tabs
  return (
    <div className="space-y-6 animate-fade-in text-[#1d1d1f] w-full min-w-0">
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
        <div className="flex items-center gap-3">
          {tab === 'preview' && (
            <button
              onClick={() => {
                setTab('list');
                setPreviewIndex(null);
                try {
                  localStorage.removeItem('pim_quotation_preview_id');
                } catch {}
              }}
              className="mr-1.5 group relative overflow-hidden px-3 py-1.5 bg-white border border-[#d2d2d7]/50 hover:bg-[#f5f5f7] text-[#1d1d1f] text-xs font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-1 cursor-pointer"
            >
              <span className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
              ← กลับหน้ารายการ
            </button>
          )}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-1 h-5 rounded-full ${(tab === 'preview' && selectedQt?.documentType === 'product_proposal')
                  ? 'bg-gradient-to-b from-violet-600 to-purple-400'
                  : 'bg-gradient-to-b from-[#0071e3] to-[#00c2ff]'
                }`} />
              <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${(tab === 'preview' && selectedQt?.documentType === 'product_proposal')
                  ? 'text-violet-600'
                  : 'text-[#0071e3]'
                }`}>
                {(tab === 'preview' && selectedQt?.documentType === 'product_proposal')
                  ? 'PRODUCT PROPOSAL'
                  : 'QUOTATION MANAGEMENT'}
              </span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-[#1d1d1f] leading-none">{headerTitle}</h1>
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5 items-center self-start sm:self-auto">
          {canPerformAction(currentUser, 'quotations.create') && (
            <button
              onClick={handleCreate}
              className="group relative overflow-hidden px-4 py-2.5 bg-gradient-to-r from-[#0071e3] to-[#0096ff] hover:from-[#0080ff] hover:to-[#00a8ff] text-white text-xs font-bold rounded-xl shadow-lg hover:shadow-blue-500/30 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
              <Plus className="w-4 h-4" />
              สร้างใบเสนอราคา
            </button>
          )}
          {canPerformAction(currentUser, 'quotations.createProposal') && (
            <button
              onClick={() => {
                setEditQt(null);
                setConvertProposal(null);
                setCreateDocFormat('product_proposal');
                setTab('create');
              }}
              className="group relative overflow-hidden px-4 py-2.5 bg-gradient-to-r from-violet-600 to-purple-500 hover:from-violet-500 hover:to-purple-400 text-white text-xs font-bold rounded-xl shadow-lg hover:shadow-purple-500/30 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
              <Plus className="w-4 h-4" />
              สร้างใบเสนอสินค้า
            </button>
          )}
        </div>
      </div>


      {tab === 'list' && (
        <ListTab
          quotations={userFilteredQuotations}
          onView={handleView}
          onDelete={setDeleteTarget}
          addActivityLog={addActivityLog}
          currentUser={currentUser}
          onCopyAsNew={handleCopyAsNew}
        />
      )}

      {tab === 'preview' && (
        <PreviewTab
          quotations={enrichedQuotations}
          selectedIndex={previewIndex !== null ? previewIndex : (userFilteredQuotations.length > 0 ? 0 : null)}
          onSelectIndex={handleSelectPreviewIndex}
          onStatusChange={handleStatusChange}
          onPrint={(q) => {
            if (checkIsInAppBrowser()) {
              setIsDownloadGuideOpen(true);
              return;
            }
            // เปิดแท็บใหม่ทันทีโดยใช้ไฟล์ตัวแสดง PDF เพื่อหลีกเลี่ยงป๊อปอัปบล็อก
            const newWindow = window.open('/pdf-viewer.html', '_blank');
            setOpenedWindow(newWindow);
            setAutoOpenPDF(true);
            setPrintQt(q);
          }}
          onEdit={handleEdit}
          onDelete={setDeleteTarget}
          onConvert={handleConvertToQuotation}
          currentUser={currentUser}
          onCopyAsNew={handleCopyAsNew}
          onSendMailDirect={(q) => {
            if (checkIsInAppBrowser()) {
              setIsDownloadGuideOpen(true);
              return;
            }
            setAutoDownloadAndEmail(true);
            setPrintQt(q);
          }}
          addActivityLog={addActivityLog}
          onSaveQuotation={onSaveQuotation}
        />
      )}


      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-[9999] bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-800 text-xs max-w-sm" style={{ animation: 'fade-in 0.2s ease-out' }}>
          <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <Mail className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-white">{toast.title}</p>
            <p className="text-zinc-400 mt-0.5 leading-relaxed">{toast.msg}</p>
          </div>
          <button onClick={() => setToast(null)} className="text-zinc-500 hover:text-white cursor-pointer p-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}


      <ConfirmModal
        isOpen={!!confirmConfig}
        onClose={() => setConfirmConfig(null)}
        onConfirm={confirmConfig?.onConfirm}
        title={confirmConfig?.title}
        message={confirmConfig?.message}
        confirmText={confirmConfig?.confirmText}
        cancelText={confirmConfig?.cancelText}
        type={confirmConfig?.type}
      />
      <MobileDownloadModal
        isOpen={isDownloadGuideOpen}
        onClose={() => setIsDownloadGuideOpen(false)}
      />

      {/* QuotationPrint rendered hidden — generates PDF in background without blanking the page */}
      {printQt && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: 0, height: 0, overflow: 'hidden', visibility: 'hidden', pointerEvents: 'none', zIndex: -1 }}>
          <QuotationPrint
            quotation={printQt}
            companyInfo={companyInfo}
            products={products}
            onClose={() => {
              setPrintQt(null);
              setAutoPrint(false);
              setAutoDownloadAndEmail(false);
              setAutoOpenPDF(false);
              setOpenedWindow(null);
            }}
            autoPrint={autoPrint}
            autoDownloadAndEmail={autoDownloadAndEmail}
            autoOpenInNewTab={autoOpenPDF}
            openedWindow={openedWindow}
            addActivityLog={addActivityLog}
          />
        </div>
      )}
    </div>
  );
}
