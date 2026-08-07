import { useState, useMemo } from 'react';
import { decodeQuotation } from '../utils/share';
import { Printer, CheckCircle, AlertCircle, Globe, Building } from 'lucide-react';

const fmt = (n) =>
  Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d) => {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString('th-TH', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch { return d; }
};

// Deterministic pseudo-random configuration for confetti rendering (avoids Math.random inside render)
const getConfettiConfig = (i) => {
  const sin1 = Math.sin(i * 12.9898) * 43758.5453;
  const left = Math.floor((sin1 - Math.floor(sin1)) * 100);
  const sin2 = Math.sin(i * 78.233) * 43758.5453;
  const delay = (sin2 - Math.floor(sin2)) * 2;
  const sin3 = Math.sin(i * 45.123) * 43758.5453;
  const size = Math.floor((sin3 - Math.floor(sin3)) * 8) + 6;
  const colors = ['bg-red-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-pink-500'];
  const colorIndex = Math.floor((sin1 - Math.floor(sin1)) * colors.length);
  return { left, delay, size, randomColor: colors[colorIndex] };
};

export default function PublicQuotationViewer({ shareData, companyInfo = {} }) {
  const [isAccepted, setIsAccepted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const quotation = useMemo(() => {
    if (!shareData) return null;
    try {
      return decodeQuotation(shareData);
    } catch {
      return null;
    }
  }, [shareData]);

  if (!quotation) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border border-[#d2d2d7]/50 max-w-md w-full p-8 shadow-2xl text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-red-500 mx-auto border border-red-100 shadow-sm">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-[#1d1d1f] tracking-tight">ไม่พบเอกสารใบเสนอราคา</h2>
            <p className="text-xs text-[#555557] mt-2 leading-relaxed">
              ลิงก์อาจไม่ถูกต้อง หรือเอกสารอาจถูกยกเลิกแล้ว กรุณาติดต่อพนักงานขายของท่าน
            </p>
          </div>
        </div>
      </div>
    );
  }

  const items = quotation.items || [];
  const customer = quotation.customer || {};
  const subtotal = Number(quotation.subtotal) || 0;
  const vatAmount = Number(quotation.vatAmount) || 0;
  const totalAmount = Number(quotation.totalAmount) || 0;
  const vatRate = quotation.vatRate ?? 7;

  const co = {
    name: companyInfo.name || 'บริษัท พันธ์วาดี จำกัด (สำนักงานใหญ่)',
    address: companyInfo.address || '19/9 ซ.ทวีวัฒนา-กาญจนาภิเษก 16 แขวง/เขต ทวีวัฒนา กทม. 10170',
    taxId: companyInfo.taxId || '0105546026064',
    phone: companyInfo.phone || '02-4315111',
    mobile: companyInfo.mobile || '02-0055666',
    email: companyInfo.email || '',
    website: companyInfo.website || 'https://www.phanvadee.com',
  };

  const handleAccept = () => {
    setIsAccepted(true);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 5000);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] pb-16 print:bg-white print:pb-0" style={{ fontFamily: "'Sarabun', 'Helvetica Neue', Arial, sans-serif" }}>
      {/* Confetti Animation Effect (Pure CSS) */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
          {[...Array(50)].map((_, i) => {
            const { left, delay, size, randomColor } = getConfettiConfig(i);
            return (
              <div
                key={i}
                className={`absolute rounded-full animate-bounce ${randomColor}`}
                style={{
                  left: `${left}%`,
                  top: `-10px`,
                  width: `${size}px`,
                  height: `${size}px`,
                  animation: `fall 3s linear infinite`,
                  animationDelay: `${delay}s`,
                }}
              />
            );
          })}
          <style>{`
            @keyframes fall {
              0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
              100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
            }
          `}</style>
        </div>
      )}

      {/* Top Navbar / Action Panel */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#d2d2d7]/30 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 160 160" className="w-10 h-10 fill-current text-zinc-900 shrink-0" xmlns="http://www.w3.org/2000/svg">
            <path d="M 60 48 L 60 36 L 100 21 L 100 33 Z" />
            <path d="M 60 70 L 60 58 L 100 43 L 100 55 Z" />
            <path d="M 60 92 L 60 80 L 100 65 L 100 77 Z" />
            <text x="80" y="115" fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif" fontWeight="900" fontSize="19.5" textAnchor="middle" letterSpacing="0.4">PHANVADEE</text>
            <text x="80" y="132" fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif" fontWeight="500" fontSize="9.5" textAnchor="middle" letterSpacing="0.1">think global, act local</text>
          </svg>
          <div>
            <h1 className="text-sm font-extrabold text-[#1d1d1f]">เอกสารใบเสนอราคาออนไลน์</h1>
            <p className="text-[11px] text-[#555557] font-medium font-mono">{quotation.quotationNumber}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button type="button"
            onClick={() => window.print()}
            className="px-4 py-2.5 border border-[#d2d2d7] hover:bg-[#f5f5f7] text-[#1d1d1f] text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <Printer className="w-4 h-4" />
            พิมพ์ / บันทึก PDF
          </button>

          {!isAccepted ? (
            <button type="button"
              onClick={handleAccept}
              className="px-5 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95"
            >
              ยอมรับใบเสนอราคานี้
            </button>
          ) : (
            <span className="px-4 py-2.5 bg-emerald-50 border border-emerald-250 text-emerald-600 text-xs font-extrabold rounded-xl flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" />
              ยอมรับข้อเสนอแล้ว
            </span>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-[850px] mx-auto px-4 sm:px-6 pt-8 print:p-0 print:pt-0">

        {/* Banner Alert for Status */}
        {isAccepted && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-150 rounded-2xl flex items-center gap-3 animate-fade-in print:hidden shadow-xs">
            <CheckCircle className="w-6 h-6 text-emerald-500 shrink-0" />
            <div>
              <h4 className="text-xs font-extrabold text-emerald-800">ขอบคุณที่เลือกใช้บริการของเรา!</h4>
              <p className="text-[11px] text-emerald-600 mt-0.5 font-medium">คุณได้ยอมรับข้อเสนอในใบเสนอราคานี้แล้ว ทางพนักงานขายที่ดูแลจะได้รับการแจ้งเตือนและติดต่อกลับโดยเร็วที่สุด</p>
            </div>
          </div>
        )}

        {/* Paper Document Representation */}
        <div className="bg-white rounded-3xl border border-[#d2d2d7]/40 shadow-xl p-8 sm:p-12 print:shadow-none print:border-none print:p-0">

          {/* SECTION 1: HEADER */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-[#f5f5f7] pb-6 mb-8">
            <div className="flex gap-4 items-start">
              <svg viewBox="0 0 160 160" className="w-14 h-14 fill-current text-zinc-900 shrink-0" xmlns="http://www.w3.org/2000/svg">
                <path d="M 60 48 L 60 36 L 100 21 L 100 33 Z" />
                <path d="M 60 70 L 60 58 L 100 43 L 100 55 Z" />
                <path d="M 60 92 L 60 80 L 100 65 L 100 77 Z" />
                <text x="80" y="115" fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif" fontWeight="900" fontSize="19.5" textAnchor="middle" letterSpacing="0.4">PHANVADEE</text>
                <text x="80" y="132" fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif" fontWeight="500" fontSize="9.5" textAnchor="middle" letterSpacing="0.1">think global, act local</text>
              </svg>
              <div className="text-xs text-[#1d1d1f] leading-relaxed">
                <div className="font-extrabold text-sm mb-1 text-black">{co.name}</div>
                <div className="text-[#555557] max-w-sm">{co.address}</div>
                <div className="mt-1 font-medium">
                  {co.phone && <span>โทร: {co.phone} </span>}
                  {co.email && <span className="ml-2">อีเมล: {co.email}</span>}
                </div>
                <div className="text-[10px] text-[#555557] mt-0.5">เลขประจำตัวผู้เสียภาษี: {co.taxId}</div>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[10px] text-[#86868b] font-bold tracking-wider uppercase">ใบเสนอราคา / QUOTATION</span>
              <h2 className="text-xl font-black text-[#1d1d1f] mt-1 font-mono tracking-tight">{quotation.quotationNumber}</h2>
              <div className="mt-1.5 flex flex-wrap gap-1.5 sm:justify-end">
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${isAccepted ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
                  }`}>
                  {isAccepted ? 'อนุมัติโดยลูกค้า' : 'รอการพิจารณา'}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 2: CLIENT & METADATA GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs mb-8 border-b border-[#f5f5f7] pb-6">
            <div className="bg-[#f5f5f7]/40 rounded-2xl p-5 border border-[#d2d2d7]/15">
              <h3 className="font-extrabold text-[#1d1d1f] mb-3 uppercase tracking-wide flex items-center gap-1.5 text-[11px]">
                <Building className="w-4 h-4 text-blue-600 shrink-0" />
                ข้อมูลลูกค้า
              </h3>
              <div className="space-y-2">
                <div className="flex"><span className="text-[#555557] font-semibold w-24 shrink-0">ชื่อลูกค้า:</span><span className="text-black font-semibold">{customer.name || '-'}</span></div>
                {customer.companyName && <div className="flex"><span className="text-[#555557] font-semibold w-24 shrink-0">บริษัท:</span><span className="text-black font-medium">{customer.companyName}</span></div>}
                <div className="flex"><span className="text-[#555557] font-semibold w-24 shrink-0">ที่อยู่:</span><span className="text-[#333] font-medium leading-relaxed">{customer.address || '-'}</span></div>
                <div className="flex"><span className="text-[#555557] font-semibold w-24 shrink-0">เลขผู้เสียภาษี:</span><span className="text-black font-mono">{customer.taxId || '-'}</span></div>
                <div className="flex"><span className="text-[#555557] font-semibold w-24 shrink-0">โทรศัพท์:</span><span className="text-black font-medium">{customer.phone || '-'}</span></div>
              </div>
            </div>

            <div className="bg-[#f5f5f7]/40 rounded-2xl p-5 border border-[#d2d2d7]/15">
              <h3 className="font-extrabold text-[#1d1d1f] mb-3 uppercase tracking-wide flex items-center gap-1.5 text-[11px]">
                <Globe className="w-4 h-4 text-blue-600 shrink-0" />
                รายละเอียดเอกสาร
              </h3>
              <div className="space-y-2">
                <div className="flex"><span className="text-[#555557] font-semibold w-28 shrink-0">ผู้ดูแลงานขาย:</span><span className="text-black font-medium">{quotation.salespersonName || '-'}</span></div>
                <div className="flex"><span className="text-[#555557] font-semibold w-28 shrink-0">ติดต่อผู้ขาย:</span><span className="text-black font-medium">{quotation.salespersonPhone || '-'}</span></div>
                {quotation.projectName && <div className="flex"><span className="text-[#555557] font-semibold w-28 shrink-0">โครงการ:</span><span className="text-black font-semibold text-blue-700">{quotation.projectName}</span></div>}
                <div className="flex"><span className="text-[#555557] font-semibold w-28 shrink-0">วันที่ออกเอกสาร:</span><span className="text-black font-medium">{fmtDate(quotation.issuedDate)}</span></div>
                <div className="flex"><span className="text-[#555557] font-semibold w-28 shrink-0">วันหมดอายุราคา:</span><span className="text-black font-semibold text-red-600">{fmtDate(quotation.validUntilDate)}</span></div>
              </div>
            </div>
          </div>

          {/* SECTION 3: ITEMS TABLE */}
          <div className="overflow-x-auto -mx-8 sm:mx-0 mb-8">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-black text-white text-[10px] font-bold uppercase tracking-wider">
                  <th className="p-3 text-center rounded-l-xl w-12">ลำดับ</th>
                  <th className="p-3 text-center w-16">รูปภาพ</th>
                  <th className="p-3 w-28">รหัสสินค้า</th>
                  <th className="p-3">รายการสินค้า / คำอธิบาย</th>
                  <th className="p-3 text-center w-16">จำนวน</th>
                  <th className="p-3 text-center w-16">หน่วย</th>
                  <th className="p-3 text-right w-24">ราคา/หน่วย</th>
                  <th className="p-3 text-right w-20">ส่วนลด</th>
                  <th className="p-3 text-right rounded-r-xl w-24">ยอดรวม</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5f5f7]">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-[#86868b]">— ไม่มีรายการสินค้า —</td>
                  </tr>
                ) : (
                  items.map((item, idx) => {
                    const discountDisplay = item.discount > 0
                      ? (item.discountType === 'percent' ? `${item.discount}%` : fmt(item.discount))
                      : '0';
                    return (
                      <tr key={item.id || idx} className="hover:bg-[#fafafa]/50">
                        <td className="p-4 text-center text-[#86868b] font-medium">{idx + 1}</td>
                        <td className="p-4 text-center">
                          {item.productImage ? (
                            <img src={item.productImage} className="w-8 h-8 rounded-lg object-cover border border-[#e2e8f0] mx-auto" alt="" />
                          ) : (
                            <span className="text-[#ccc]">—</span>
                          )}
                        </td>
                        <td className="p-4 text-left font-semibold text-zinc-600 text-[11px] uppercase tracking-wider">{item.productCode || '—'}</td>
                        <td className="p-4 text-left">
                          <div className="font-bold text-[#1d1d1f]">{item.productName}</div>
                          {item.description && <div className="text-[10px] text-[#555557] mt-1 leading-relaxed">{item.description}</div>}
                        </td>
                        <td className="p-4 text-center font-bold text-[#1d1d1f]">{item.quantity}</td>
                        <td className="p-4 text-center text-[#555557] font-medium">{item.unit || 'ชิ้น'}</td>
                        <td className="p-4 text-right font-medium text-[#1d1d1f]">{fmt(item.unitPrice)}</td>
                        <td className={`p-4 text-right font-medium ${item.discount > 0 ? 'text-red-500 font-bold' : 'text-[#555557]'}`}>{discountDisplay}</td>
                        <td className="p-4 text-right font-bold text-[#1d1d1f]">{fmt(item.lineTotal)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* SECTION 4: SUMMARY & NOTES */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-6 pt-4 border-t border-[#f5f5f7]">
            <div className="w-full md:flex-1 text-xs">
              {quotation.note && (
                <div className="bg-[#f5f5f7] rounded-2xl p-4 border border-[#d2d2d7]/15">
                  <h4 className="font-bold text-[#1d1d1f] mb-1.5">หมายเหตุ / เงื่อนไขเพิ่มเติม</h4>
                  <p className="text-[#555557] leading-relaxed whitespace-pre-wrap">{quotation.note}</p>
                </div>
              )}
            </div>

            <div className="w-full md:w-72 shrink-0 space-y-2.5 text-xs">
              <div className="flex justify-between text-[#555557] font-medium">
                <span>ยอดรวมก่อนภาษี (Subtotal)</span>
                <span className="text-black font-semibold">{fmt(subtotal)} บาท</span>
              </div>
              <div className="flex justify-between text-[#555557] font-medium">
                <span>ภาษีมูลค่าเพิ่ม (VAT {vatRate}%)</span>
                <span className="text-black font-semibold">{fmt(vatAmount)} บาท</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-[#1d1d1f] border-t border-[#e2e8f0] pt-3 mt-1.5 bg-[#f5f5f7]/40 rounded-2xl p-4 border border-[#d2d2d7]/20">
                <span>ยอดสุทธิรวมทั้งสิ้น</span>
                <span className="text-[#0071e3] text-base font-black">฿{fmt(totalAmount)}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Action Panel Footer */}
        <div className="mt-8 text-center text-xs text-[#86868b] print:hidden">
          <p>© {new Date().getFullYear()} {co.name}. สงวนลิขสิทธิ์.</p>
          <p className="mt-1 font-medium">นี่คือระบบเสนอราคาออนไลน์อัตโนมัติ สำหรับคำถามเพิ่มเติม กรุณาติดต่อเบอร์ผู้เสนอราคาด้านบน</p>
        </div>

      </div>
    </div>
  );
}
