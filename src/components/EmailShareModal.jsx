import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Mail, Copy, Check, AlertCircle, ArrowUpRight } from 'lucide-react';
import { encodeQuotation } from '../utils/share';

export default function EmailShareModal({ isOpen, onClose, quotation, onLogActivity }) {
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Generate the public sharing link
  const shareCode = quotation ? encodeQuotation(quotation) : '';
  const shareLink = `${window.location.origin}${window.location.pathname}?share=${shareCode}`;

  useEffect(() => {
    if (quotation) {
      setEmail(quotation.customer?.email || '');
      setSubject(`ใบเสนอราคาเลขที่ ${quotation.quotationNumber} สำหรับโครงการ ${quotation.projectName || '-'}`);
      
      const defaultMsg = `เรียนคุณ ${quotation.customer?.name || 'ลูกค้า'},\n\nทางเราได้จัดทำใบเสนอราคาสำหรับโครงการ "${quotation.projectName || '-'}" เรียบร้อยแล้ว\n\nท่านสามารถคลิกลิงก์ด้านล่างเพื่อตรวจสอบรายละเอียดสินค้า ยอดรวม และอนุมัติใบเสนอราคาออนไลน์ได้ทันทีครับ:\n\n🔗 ${shareLink}\n\nหากมีข้อสงสัยเพิ่มเติม สามารถติดต่อผมได้ที่เบอร์ ${quotation.salespersonPhone || '-'} ครับ\n\nขอแสดงความนับถือ,\n${quotation.salespersonName || 'พนักงานขาย'}`;
      setMessage(defaultMsg);
    }
    setErrorMessage('');
  }, [quotation, isOpen, shareLink]);

  if (!isOpen || !quotation) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      if (onLogActivity) {
        onLogActivity(`คัดลอกลิงก์ใบเสนอราคาออนไลน์: ${quotation.quotationNumber}`);
      }
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleMailto = () => {
    if (!email) {
      setErrorMessage('กรุณากรอกอีเมลผู้รับ');
      return;
    }
    setErrorMessage('');
    
    // Construct mailto link
    const mailtoUrl = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    window.open(mailtoUrl, '_blank');
    
    if (onLogActivity) {
      onLogActivity(`ส่งอีเมลใบเสนอราคาออนไลน์ (แอปภายนอก) ไปยัง ${email} (เลขที่: ${quotation.quotationNumber})`);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in print:hidden">
      {/* Backdrop */}
      <div onClick={onClose} className="absolute inset-0 cursor-pointer" />

      {/* Modal Card */}
      <div className="relative bg-white rounded-3xl border border-[#d2d2d7]/50 w-full max-w-lg p-6 shadow-2xl z-10 animate-scale-in text-[#1d1d1f] flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e8e8ed] pb-3 shrink-0">
          <div className="flex items-center gap-2 text-[#0071e3] font-bold text-sm tracking-wide">
            <Mail className="w-5 h-5 shrink-0" />
            <span>ส่งใบเสนอราคาออนไลน์ทางอีเมล</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-black rounded-lg hover:bg-[#f5f5f7] transition-colors cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Error banner */}
        {errorMessage && (
          <div className="mt-3 p-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 text-xs">
          
          {/* Email input */}
          <div className="space-y-1">
            <label className="text-[11px] text-[#555557] font-semibold block">อีเมลของลูกค้า (Email To) <span className="text-red-500">*</span></label>
            <input 
              type="email" 
              placeholder="customer@company.com" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full text-xs text-[#1d1d1f] bg-[#f5f5f7] border border-[#d2d2d7]/50 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all"
            />
          </div>

          {/* Subject input */}
          <div className="space-y-1">
            <label className="text-[11px] text-[#555557] font-semibold block">หัวข้ออีเมล (Subject)</label>
            <input 
              type="text" 
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full text-xs text-[#1d1d1f] bg-[#f5f5f7] border border-[#d2d2d7]/50 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all font-semibold"
            />
          </div>

          {/* Message textarea */}
          <div className="space-y-1">
            <label className="text-[11px] text-[#555557] font-semibold block">ข้อความร่างอีเมล (Email Message Preview)</label>
            <textarea 
              rows={8}
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="w-full text-xs text-[#1d1d1f] bg-[#f5f5f7] border border-[#d2d2d7]/50 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all resize-none font-medium leading-relaxed"
            />
          </div>

          {/* Shareable Link Box */}
          <div className="bg-[#f5f5f7] rounded-2xl p-4 border border-[#d2d2d7]/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-black text-[11px]">ลิงก์ใบเสนอราคาออนไลน์สาธารณะ:</span>
              <a 
                href={shareLink} 
                target="_blank" 
                rel="noreferrer" 
                className="text-[#0071e3] hover:underline font-bold text-[10px] flex items-center gap-0.5"
              >
                เปิดทดสอบลิงก์ <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>
            <div className="flex gap-2">
              <input 
                type="text" 
                readOnly 
                value={shareLink}
                className="flex-1 bg-white border border-[#d2d2d7] rounded-xl px-3 py-2 text-[10px] font-mono text-zinc-500 focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className={`px-3 py-2 rounded-xl border font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0 ${
                  copied 
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-600'
                    : 'bg-white border-[#d2d2d7] text-[#1d1d1f] hover:bg-[#f5f5f7]'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Action buttons Footer */}
        <div className="flex gap-3 border-t border-[#e8e8ed] pt-4 shrink-0 bg-white">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-[#d2d2d7] text-[#1d1d1f] rounded-xl text-xs font-bold hover:bg-[#f5f5f7] transition-colors cursor-pointer"
          >
            ยกเลิก
          </button>
          
          <button
            onClick={handleMailto}
            className="flex-1 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
          >
            ส่งอีเมล
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
