import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertCircle, Copy, Check } from 'lucide-react';

export default function MobileDownloadModal({ isOpen, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in print:hidden">
      {/* Backdrop */}
      <div onClick={onClose} className="absolute inset-0 cursor-pointer" />

      {/* Modal Card */}
      <div className="relative bg-white rounded-3xl border border-[#d2d2d7]/50 max-w-sm w-full p-6 shadow-2xl z-10 animate-scale-in text-[#1d1d1f] flex flex-col gap-5">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e8e8ed] pb-3">
          <div className="flex items-center gap-2 text-amber-600 font-bold text-sm tracking-wide">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>คำแนะนำการดาวน์โหลด</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-black rounded-lg hover:bg-[#f5f5f7] transition-colors cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="space-y-4 text-xs leading-relaxed text-zinc-750">
          <p className="font-semibold text-zinc-800 text-[13px]">
            ระบบตรวจพบว่าคุณใช้งานผ่านเบราว์เซอร์ในแอป (เช่น LINE หรือ Facebook) ซึ่งป้องกันการดาวน์โหลดไฟล์โดยตรง
          </p>

          <div className="bg-[#f5f5f7] p-4 rounded-2xl border border-[#d2d2d7]/35 space-y-3">
            <p className="font-bold text-black border-b border-[#d2d2d7]/50 pb-1.5">
              กรุณาเปิดในเบราว์เซอร์ปกติของเครื่องเพื่อดาวน์โหลด:
            </p>

            {isIOS ? (
              <div className="space-y-2">
                <p className="flex items-start gap-2">
                  <span className="bg-[#0071e3] text-white w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                  <span>กดปุ่มแชร์ หรือปุ่มเมนู <strong>...</strong> ที่มุมขวาบน หรือ ขวาล่าง</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="bg-[#0071e3] text-white w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                  <span>เลือก <strong>"เปิดด้วย Safari"</strong> (Open in Safari)</span>
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="flex items-start gap-2">
                  <span className="bg-[#0071e3] text-white w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                  <span>กดปุ่มเมนูจุดสามจุด <strong>⋮</strong> ที่มุมขวาบน</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="bg-[#0071e3] text-white w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                  <span>เลือก <strong>"เปิดในเบราว์เซอร์"</strong> หรือ <strong>"เปิดด้วย Chrome"</strong></span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Copy Link Button & Close */}
        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={handleCopyLink}
            className={`w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs border ${copied
                ? 'bg-emerald-550 border-emerald-600 text-white bg-emerald-600'
                : 'bg-white border-[#d2d2d7] text-[#1d1d1f] hover:bg-[#f5f5f7]'
              }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                คัดลอกลิงก์สำเร็จ!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                คัดลอกลิงก์เพื่อไปเปิดที่อื่น
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 bg-[#1d1d1f] hover:bg-black text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs"
          >
            ตกลง, รับทราบ
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
} 
