import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Upload, X, AlertTriangle, CheckCircle, AlertCircle,
  FileSpreadsheet, Loader2
} from 'lucide-react';
import { importFromExcel, mergeImportedProducts } from '../utils/importUtils';

const PLATFORM_LABELS = {
  shopee: { label: 'Shopee', color: 'bg-orange-500', textColor: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
  lazada: { label: 'Lazada', color: 'bg-blue-500', textColor: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  tiktok: { label: 'TikTok Shop', color: 'bg-black', textColor: 'text-gray-800', bg: 'bg-gray-50 border-gray-200' },
};

export default function ImportModal({ isOpen, onClose, existingProducts, onImportComplete }) {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null); // { platform, products, errors, warnings, newCount, overwriteCount }
  const [mergeMode, setMergeMode] = useState('skip');
  const [step, setStep] = useState('upload'); // 'upload' | 'preview' | 'done'
  const [selectedPlatform, setSelectedPlatform] = useState('auto');
  const fileInputRef = useRef();

  const handleFileSelect = async (selectedFile) => {
    if (!selectedFile) return;
    const ext = selectedFile.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls'].includes(ext)) {
      setPreview({ errors: ['กรุณาเลือกไฟล์ Excel (.xlsx หรือ .xls) เท่านั้น'], warnings: [], platform: null, products: [] });
      return;
    }
    setFile(selectedFile);
    setLoading(true);
    setPreview(null);
    try {
      const result = await importFromExcel(selectedFile, existingProducts, selectedPlatform !== 'auto' ? selectedPlatform : null);
      setPreview(result);
      setStep('preview');
    } catch (err) {
      setPreview({ errors: [err.message], warnings: [], platform: null, products: [] });
      setStep('preview');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  };

  const handleConfirmImport = () => {
    if (!preview || !preview.products || preview.products.length === 0) return;
    const merged = mergeImportedProducts(existingProducts, preview.products, mergeMode);
    onImportComplete(merged, preview.platform, preview.newCount, preview.overwriteCount);
    setStep('done');
    setTimeout(() => {
      handleClose();
    }, 2000);
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setStep('upload');
    setLoading(false);
    setMergeMode('overwrite');
    setSelectedPlatform('auto');
    onClose();
  };

  if (!isOpen) return null;

  const platformInfo = preview?.platform ? PLATFORM_LABELS[preview.platform] : null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div onClick={handleClose} className="absolute inset-0 bg-black/20 backdrop-blur-md" />

      <div className="relative bg-white rounded-3xl border border-[#d2d2d7]/40 shadow-2xl max-w-2xl w-full max-h-[88vh] flex flex-col z-10 animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#e8e8ed] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#f5f5f7] flex items-center justify-center">
              <Upload className="w-4.5 h-4.5 text-[#1d1d1f]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1d1d1f] tracking-tight">นำเข้าข้อมูลสินค้า (Import)</h3>
              <p className="text-xs text-[#555557] mt-0.5">รองรับไฟล์เทมเพลต Shopee, Lazada และ TikTok Shop</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 rounded-xl text-[#555557] hover:bg-[#f5f5f7] hover:text-black transition-all cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Step: Upload */}
          {step === 'upload' && !loading && (
            <div className="space-y-4">
              {/* Platform Selector */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-[#1d1d1f] uppercase tracking-wider">เลือกแพลตฟอร์ม</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <label className={`flex items-center justify-center py-2 px-3 rounded-xl border cursor-pointer transition-all ${selectedPlatform === 'auto' ? 'border-[#0071e3] bg-blue-50/50' : 'border-[#d2d2d7]/70 hover:bg-[#f5f5f7]'}`}>
                    <input type="radio" name="platform" value="auto" checked={selectedPlatform === 'auto'} onChange={() => setSelectedPlatform('auto')} className="hidden" />
                    <span className={`text-xs font-bold ${selectedPlatform === 'auto' ? 'text-[#0071e3]' : 'text-[#555557]'}`}>อัตโนมัติ</span>
                  </label>
                  <label className={`flex items-center justify-center py-2 px-3 rounded-xl border cursor-pointer transition-all ${selectedPlatform === 'shopee' ? 'border-orange-500 bg-orange-50/50' : 'border-[#d2d2d7]/70 hover:bg-[#f5f5f7]'}`}>
                    <input type="radio" name="platform" value="shopee" checked={selectedPlatform === 'shopee'} onChange={() => setSelectedPlatform('shopee')} className="hidden" />
                    <span className={`text-xs font-bold ${selectedPlatform === 'shopee' ? 'text-orange-600' : 'text-[#555557]'}`}>Shopee</span>
                  </label>
                  <label className={`flex items-center justify-center py-2 px-3 rounded-xl border cursor-pointer transition-all ${selectedPlatform === 'lazada' ? 'border-blue-500 bg-blue-50/50' : 'border-[#d2d2d7]/70 hover:bg-[#f5f5f7]'}`}>
                    <input type="radio" name="platform" value="lazada" checked={selectedPlatform === 'lazada'} onChange={() => setSelectedPlatform('lazada')} className="hidden" />
                    <span className={`text-xs font-bold ${selectedPlatform === 'lazada' ? 'text-blue-600' : 'text-[#555557]'}`}>Lazada</span>
                  </label>
                  <label className={`flex items-center justify-center py-2 px-3 rounded-xl border cursor-pointer transition-all ${selectedPlatform === 'tiktok' ? 'border-black bg-gray-50/50' : 'border-[#d2d2d7]/70 hover:bg-[#f5f5f7]'}`}>
                    <input type="radio" name="platform" value="tiktok" checked={selectedPlatform === 'tiktok'} onChange={() => setSelectedPlatform('tiktok')} className="hidden" />
                    <span className={`text-xs font-bold ${selectedPlatform === 'tiktok' ? 'text-gray-800' : 'text-[#555557]'}`}>TikTok Shop</span>
                  </label>
                </div>
              </div>

              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                  dragOver
                    ? 'border-[#0071e3] bg-blue-50/60'
                    : 'border-[#d2d2d7] hover:border-[#0071e3] hover:bg-[#f5f5f7]/80'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-[#f5f5f7] flex items-center justify-center">
                  <FileSpreadsheet className={`w-7 h-7 ${dragOver ? 'text-[#0071e3]' : 'text-[#555557]'}`} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-[#1d1d1f]">ลากไฟล์มาวาง หรือคลิกเพื่อเลือกไฟล์</p>
                  <p className="text-xs text-[#555557] mt-1">รองรับ .xlsx / .xls — เทมเพลต Shopee, Lazada, TikTok Shop</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files?.[0])}
                />
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="w-10 h-10 text-[#0071e3] animate-spin" />
              <p className="text-sm text-[#555557] font-medium">กำลังวิเคราะห์ไฟล์...</p>
            </div>
          )}

          {/* Step: Preview */}
          {step === 'preview' && preview && !loading && (
            <div className="space-y-4">
              {/* File info */}
              {file && (
                <div className="flex items-center gap-3 p-3.5 bg-[#f5f5f7] rounded-xl border border-[#d2d2d7]/50">
                  <FileSpreadsheet className="w-5 h-5 text-[#555557] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1d1d1f] truncate">{file.name}</p>
                    <p className="text-xs text-[#555557]">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button onClick={() => { setFile(null); setPreview(null); setStep('upload'); }} className="p-1.5 rounded-lg hover:bg-[#e8e8ed] text-[#555557] cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Errors */}
              {preview.errors && preview.errors.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <p className="text-sm font-bold text-red-700">พบข้อผิดพลาด — ไม่สามารถนำเข้าข้อมูลได้</p>
                  </div>
                  <ul className="space-y-1 pl-6">
                    {preview.errors.slice(0, 8).map((e, i) => (
                      <li key={i} className="text-xs text-red-600 list-disc">{e}</li>
                    ))}
                    {preview.errors.length > 8 && <li className="text-xs text-red-500">...และอีก {preview.errors.length - 8} รายการ</li>}
                  </ul>
                </div>
              )}

              {/* Warnings */}
              {preview.warnings && preview.warnings.length > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <p className="text-sm font-bold text-amber-700">คำเตือน ({preview.warnings.length} รายการ)</p>
                  </div>
                  <ul className="space-y-1 pl-6">
                    {preview.warnings.slice(0, 5).map((w, i) => (
                      <li key={i} className="text-xs text-amber-600 list-disc">{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Success Preview */}
              {preview.products && preview.products.length > 0 && preview.errors?.length === 0 && (
                <>
                  {/* Platform Badge + Stats */}
                  <div className={`p-4 rounded-2xl border ${platformInfo?.bg || 'bg-gray-50 border-gray-200'} flex items-start justify-between gap-4`}>
                    <div>
                      <span className={`text-xs font-bold uppercase tracking-wider ${platformInfo?.textColor || 'text-gray-700'}`}>
                        ตรวจพบแพลตฟอร์ม: {platformInfo?.label || preview.platform}
                      </span>
                      <p className="text-sm font-bold text-[#1d1d1f] mt-1">
                        พบสินค้าใหม่พร้อมนำเข้า {preview.newCount} รายการ
                      </p>
                    </div>
                  </div>

                  {/* Product Preview List */}
                  <div className="border border-[#d2d2d7]/50 rounded-2xl overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-[#f5f5f7] border-b border-[#d2d2d7]/50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-bold text-[#555557] uppercase tracking-wide">ชื่อสินค้า</th>
                          <th className="px-3 py-2 text-left font-bold text-[#555557] uppercase tracking-wide">SKU หลัก</th>
                          <th className="px-3 py-2 text-center font-bold text-[#555557] uppercase tracking-wide">สต็อกเดิม</th>
                          <th className="px-3 py-2 text-center font-bold text-[#555557] uppercase tracking-wide">สต็อกใหม่</th>
                          <th className="px-3 py-2 text-center font-bold text-[#555557] uppercase tracking-wide">การปรับสต็อก</th>
                          <th className="px-3 py-2 text-center font-bold text-[#555557] uppercase tracking-wide">สถานะ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f5f5f7]">
                        {preview.products.filter(p => !p._isOverwrite).map((p, i) => {
                          const diff = p._stockDiff ?? 0;
                          let diffText = '-';
                          let diffClass = 'text-zinc-550 font-semibold';
                          if (diff > 0) {
                            diffText = `+${diff.toLocaleString()}`;
                            diffClass = 'text-emerald-600 font-extrabold';
                          } else if (diff < 0) {
                            diffText = `${diff.toLocaleString()}`;
                            diffClass = 'text-red-500 font-extrabold';
                          }

                          return (
                            <tr key={i} className="hover:bg-[#fafafa]">
                              <td className="px-3 py-2 font-semibold text-[#1d1d1f] max-w-[150px] truncate" title={p.name}>{p.name || '-'}</td>
                              <td className="px-3 py-2 font-mono text-zinc-650">{p.code || '-'}</td>
                              <td className="px-3 py-2 text-center text-zinc-600 font-semibold">{(p._existingStock ?? 0).toLocaleString()} ชิ้น</td>
                              <td className="px-3 py-2 text-center text-zinc-800 font-bold">{(p.stock ?? 0).toLocaleString()} ชิ้น</td>
                              <td className={`px-3 py-2 text-center ${diffClass}`}>{diffText}</td>
                              <td className="px-3 py-2 text-center">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600">
                                  ใหม่
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                        {preview.newCount === 0 && (
                          <tr>
                            <td colSpan="6" className="px-4 py-8 text-center text-[#555557]">
                              ไม่มีข้อมูลสินค้าใหม่ในไฟล์นี้ (ข้ามสินค้าที่มีอยู่แล้วทั้งหมด)
                            </td>
                          </tr>
                        )}
                      </tbody>
                      {preview.newCount > 0 && (
                        <tfoot className="bg-[#f5f5f7] font-bold text-[#1d1d1f] border-t border-[#d2d2d7]/60 sticky bottom-0 shadow-[0_-2px_6px_rgba(0,0,0,0.02)]">
                          <tr>
                            <td className="px-3 py-2.5 text-left text-zinc-850 font-extrabold">ยอดรวมสุทธิ ({preview.newCount} รายการ)</td>
                            <td className="px-3 py-2.5"></td>
                            <td className="px-3 py-2.5 text-center text-zinc-600">
                              {(preview.products.filter(p => !p._isOverwrite).reduce((sum, p) => sum + (p._existingStock ?? 0), 0)).toLocaleString()} ชิ้น
                            </td>
                            <td className="px-3 py-2.5 text-center text-black font-black">
                              {(preview.products.filter(p => !p._isOverwrite).reduce((sum, p) => sum + (p.stock ?? 0), 0)).toLocaleString()} ชิ้น
                            </td>
                            <td className="px-3 py-2.5 text-center text-emerald-600 font-black">
                              +{(preview.products.filter(p => !p._isOverwrite).reduce((sum, p) => sum + (p._stockDiff ?? 0), 0)).toLocaleString()} ชิ้น
                            </td>
                            <td className="px-3 py-2.5"></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step: Done */}
          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
                <CheckCircle className="w-9 h-9 text-emerald-500" />
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-[#1d1d1f]">นำเข้าข้อมูลสำเร็จ!</p>
                <p className="text-sm text-[#555557] mt-1">ข้อมูลสินค้าถูกบันทึกเข้าระบบ PIM เรียบร้อยแล้ว</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {step === 'preview' && preview?.products?.length > 0 && preview?.errors?.length === 0 && (
          <div className="px-6 py-4 border-t border-[#e8e8ed] flex gap-3 flex-shrink-0 bg-white">
            <button
              onClick={() => { setFile(null); setPreview(null); setStep('upload'); }}
              className="flex-1 py-2.5 border border-[#d2d2d7] text-[#1d1d1f] rounded-full text-xs font-semibold hover:bg-[#f5f5f7] transition-colors cursor-pointer"
            >
              เลือกไฟล์ใหม่
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={preview.newCount === 0}
              className={`flex-1 py-2.5 text-white rounded-full text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                preview.newCount > 0
                  ? 'bg-[#0071e3] hover:bg-[#0077ed] cursor-pointer'
                  : 'bg-zinc-300 text-zinc-500 cursor-not-allowed'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              ยืนยันนำเข้าข้อมูล ({preview.newCount} สินค้า)
            </button>
          </div>
        )}

        {step === 'preview' && preview?.errors?.length > 0 && (
          <div className="px-6 py-4 border-t border-[#e8e8ed] flex-shrink-0 bg-white">
            <button
              onClick={() => { setFile(null); setPreview(null); setStep('upload'); }}
              className="w-full py-2.5 border border-[#d2d2d7] text-[#1d1d1f] rounded-full text-xs font-semibold hover:bg-[#f5f5f7] transition-colors cursor-pointer"
            >
              เลือกไฟล์ใหม่
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
