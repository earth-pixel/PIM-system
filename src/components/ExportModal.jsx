import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, X, CheckCircle } from 'lucide-react';
import { exportShopee, exportLazada, exportTikTok } from '../utils/exportUtils';

const PLATFORMS = [
  {
    id: 'shopee',
    label: 'Shopee',
    gradient: 'from-orange-500 to-orange-400',
    border: 'border-orange-200',
    bg: 'bg-orange-50',
    textColor: 'text-orange-700',
    fn: exportShopee,
  },
  {
    id: 'lazada',
    label: 'Lazada',
    gradient: 'from-blue-500 to-blue-400',
    border: 'border-blue-200',
    bg: 'bg-blue-50',
    textColor: 'text-blue-700',
    fn: exportLazada,
  },
  {
    id: 'tiktok',
    label: 'TikTok Shop',
    gradient: 'from-gray-800 to-gray-700',
    border: 'border-gray-200',
    bg: 'bg-gray-50',
    textColor: 'text-gray-700',
    fn: exportTikTok,
  },
];

export default function ExportModal({ isOpen, onClose, selectedProducts, allProducts }) {
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [done, setDone] = useState([]);

  const products = selectedProducts && selectedProducts.length > 0 ? selectedProducts : allProducts;

  const togglePlatform = (id) => {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleExport = async () => {
    if (selectedPlatforms.length === 0) return;
    setExporting(true);
    setDone([]);

    for (const platformId of selectedPlatforms) {
      const platform = PLATFORMS.find(p => p.id === platformId);
      if (platform) {
        await new Promise(r => setTimeout(r, 300)); // small delay between downloads
        platform.fn(products);
        setDone(prev => [...prev, platformId]);
      }
    }

    setExporting(false);
    setTimeout(() => {
      handleClose();
    }, 1500);
  };

  const handleClose = () => {
    setSelectedPlatforms([]);
    setDone([]);
    setExporting(false);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div onClick={handleClose} className="absolute inset-0 bg-black/20 backdrop-blur-md" />

      <div className="relative bg-white rounded-3xl border border-[#d2d2d7]/40 shadow-2xl max-w-lg w-full z-10 animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#e8e8ed] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#f5f5f7] flex items-center justify-center">
              <Download className="w-4.5 h-4.5 text-[#1d1d1f]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1d1d1f] tracking-tight">ส่งออกข้อมูลสินค้า (Export)</h3>
              <p className="text-xs text-[#555557] mt-0.5">
                {products.length} สินค้า{selectedProducts?.length > 0 ? ' (เลือกไว้)' : ' (ทั้งหมด)'}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 rounded-xl text-[#555557] hover:bg-[#f5f5f7] hover:text-black transition-all cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-[#555557] font-medium uppercase tracking-wider">เลือกแพลตฟอร์มที่ต้องการส่งออก (เลือกได้มากกว่า 1)</p>

          <div className="space-y-3">
            {PLATFORMS.map(platform => {
              const isSelected = selectedPlatforms.includes(platform.id);
              const isDone = done.includes(platform.id);

              return (
                <button
                  key={platform.id}
                  onClick={() => !exporting && togglePlatform(platform.id)}
                  disabled={exporting}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                    isSelected
                      ? `${platform.border} ${platform.bg}`
                      : 'border-[#d2d2d7]/60 hover:border-[#d2d2d7] hover:bg-[#f5f5f7]/50'
                  } ${exporting ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold ${isSelected ? platform.textColor : 'text-[#1d1d1f]'}`}>{platform.label}</p>
                    <p className="text-xs text-[#555557] mt-0.5 leading-relaxed">{platform.desc}</p>
                  </div>
                  {isDone ? (
                    <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                      isSelected ? `${platform.border} ${platform.bg}` : 'border-[#d2d2d7]'
                    }`}>
                      {isSelected && <div className={`w-2.5 h-2.5 rounded-full bg-gradient-to-br ${platform.gradient}`} />}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Select All */}
          <button
            onClick={() => {
              if (selectedPlatforms.length === PLATFORMS.length) {
                setSelectedPlatforms([]);
              } else {
                setSelectedPlatforms(PLATFORMS.map(p => p.id));
              }
            }}
            disabled={exporting}
            className="text-xs font-semibold text-[#0071e3] hover:underline cursor-pointer disabled:opacity-50"
          >
            {selectedPlatforms.length === PLATFORMS.length ? 'ยกเลิกทั้งหมด' : 'เลือกทุกแพลตฟอร์ม'}
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#e8e8ed] flex gap-3 bg-white">
          <button
            onClick={handleClose}
            disabled={exporting}
            className="flex-1 py-2.5 border border-[#d2d2d7] text-[#1d1d1f] rounded-full text-xs font-semibold hover:bg-[#f5f5f7] transition-colors cursor-pointer disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleExport}
            disabled={selectedPlatforms.length === 0 || exporting}
            className="flex-1 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            {exporting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                กำลังสร้างไฟล์...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                ดาวน์โหลด {selectedPlatforms.length > 0 ? `(${selectedPlatforms.length} ไฟล์)` : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
