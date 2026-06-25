import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer } from 'lucide-react';

// ─── Thai Number to Words ─────────────────────────────────────
const ONES = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];

function groupToWords(n) {
  if (n === 0) return '';
  let r = '';
  const digits = String(n).split('').reverse();
  const POS = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];
  digits.forEach((d, i) => {
    const num = parseInt(d);
    if (num === 0) return;
    if (i === 1 && num === 1) r = 'สิบ' + r;
    else if (i === 1 && num === 2) r = 'ยี่สิบ' + r;
    else if (i === 0 && num === 1 && parseInt(digits[1] || '0') > 0) r = 'เอ็ด' + r;
    else r = ONES[num] + (POS[i] || '') + r;
  });
  return r;
}

function numberToThaiWords(amount) {
  if (!amount && amount !== 0) return '';
  const rounded = Math.round(Number(amount) * 100) / 100;
  const baht = Math.floor(rounded);
  const satang = Math.round((rounded - baht) * 100);
  const millions = Math.floor(baht / 1000000);
  const rest = baht % 1000000;
  let text = '';
  if (millions > 0) text += groupToWords(millions) + 'ล้าน';
  if (rest > 0) text += groupToWords(rest);
  if (!text) text = 'ศูนย์';
  text += 'บาท';
  if (satang > 0) text += groupToWords(satang) + 'สตางค์';
  else text += 'ถ้วน';
  return text;
}

const fmt = (n) =>
  Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d) => {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString('th-TH', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch { return d; }
};

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

const fmtThaiDate = (isoStr) => {
  if (!isoStr) return '.....................................................................';
  try {
    const d = new Date(isoStr);
    const date = d.getDate();
    const month = THAI_MONTHS_SHORT[d.getMonth()];
    const year = d.getFullYear() + 543;
    return `${date} ${month} ${year}`;
  } catch {
    return isoStr;
  }
};

// ─── Print Styles ─────────────────────────────────────────────
const PRINT_CSS = `
  @page { size: A4 portrait; margin: 0; }
  @media print {
    html, body {
      width: 210mm !important;
      height: 297mm !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #fff !important;
      overflow: visible !important;
    }
    body > *:not(.print-portal-wrapper) {
      display: none !important;
    }
    .print-portal-wrapper {
      position: absolute !important;
      left: 0 !important;
      top: 0 !important;
      width: 210mm !important;
      height: 297mm !important;
      background: white !important;
      overflow: visible !important;
      margin: 0 !important;
      padding: 0 !important;
      box-sizing: border-box !important;
    }
    .no-print { display: none !important; }
    .print-page {
      width: 210mm !important;
      height: 297mm !important;
      margin: 0 !important;
      box-shadow: none !important;
      border: none !important;
      box-sizing: border-box !important;
      display: flex !important;
      flex-direction: column !important;
      padding: 24px 30px !important;
    }

    /* Table column alignment overrides - Scoped to items-table to prevent wrapping other tables */
    .print-page .items-table {
      width: 100% !important;
      table-layout: fixed !important;
    }
    .print-page .items-table th,
    .print-page .items-table td {
      padding: 6px 8px !important;
      font-size: 11px !important;
      word-break: break-word !important;
      white-space: normal !important;
    }
    .print-page .items-table th:nth-child(1),
    .print-page .items-table td:nth-child(1) {
      width: 6% !important;
      text-align: center !important;
    }
    .print-page .items-table th:nth-child(2),
    .print-page .items-table td:nth-child(2) {
      width: 44% !important;
      text-align: left !important;
    }
    .print-page .items-table th:nth-child(3),
    .print-page .items-table td:nth-child(3) {
      width: 8% !important;
      text-align: center !important;
    }
    .print-page .items-table th:nth-child(4),
    .print-page .items-table td:nth-child(4) {
      width: 8% !important;
      text-align: center !important;
    }
    .print-page .items-table th:nth-child(5),
    .print-page .items-table td:nth-child(5) {
      width: 12% !important;
      text-align: right !important;
    }
    .print-page .items-table th:nth-child(6),
    .print-page .items-table td:nth-child(6) {
      width: 10% !important;
      text-align: right !important;
    }
    .print-page .items-table th:nth-child(7),
    .print-page .items-table td:nth-child(7) {
      width: 12% !important;
      text-align: right !important;
    }
  }
`;

// ─── Component ────────────────────────────────────────────────
export default function QuotationPrint({ quotation, companyInfo = {}, onClose, printType = 'quotation' }) {
  // Block printing via keyboard shortcuts if the quotation is draft or rejected
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key?.toLowerCase() === 'p') {
        if (quotation && (quotation.status === 'draft' || quotation.status === 'rejected')) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [quotation]);

  if (!quotation) return null;

  if (quotation.status === 'draft' || quotation.status === 'rejected') {
    return createPortal(
      <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
        style={{ fontFamily: "'Sarabun', 'Helvetica Neue', Arial, sans-serif" }}
      >
        <div className="bg-white rounded-3xl border border-[#d2d2d7]/50 max-w-md w-full p-8 shadow-2xl text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 mx-auto border border-rose-100 shadow-xs">
            <X className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="font-bold text-lg text-[#1d1d1f] tracking-tight">ไม่สามารถพิมพ์เอกสารใบเสนอราคาได้</h2>
            <p className="text-xs text-[#555557] leading-relaxed">
              เอกสารนี้อยู่ในสถานะ <strong className="text-rose-600">"{quotation.status === 'draft' ? 'ร่าง' : 'ไม่อนุมัติ'}"</strong><br />
              ระบบไม่อนุญาตให้ออกคำสั่งพิมพ์ หรือดาวน์โหลดเอกสารจนกว่าจะได้รับการส่งหรืออนุมัติ
            </p>
          </div>
          <div className="pt-2">
            <button 
              type="button"
              onClick={onClose} 
              className="w-full py-3 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
            >
              กลับไปหน้ารายการ
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  const items       = quotation.items       ?? [];
  const customer    = quotation.customer    ?? {};
  const subtotal    = Number(quotation.subtotal)    || 0;
  const vatAmount   = Number(quotation.vatAmount)   || 0;
  const totalAmount = Number(quotation.totalAmount) || 0;
  const vatRate     = quotation.vatRate ?? 7;

  const co = {
    name:    companyInfo.name    || 'บริษัท พันธ์วาดี จำกัด',
    address: companyInfo.address || '19/9 ซอย ทวีวัฒนา-กาญจนาภิเษก 16 แขวงทวีวัฒนา เขตทวีวัฒนา กรุงเทพมหานคร 10170',
    taxId:   companyInfo.taxId   || '0105560096348',
    phone:   companyInfo.phone   || '02-500-0000',
    mobile:  companyInfo.mobile  || '',
    email:   companyInfo.email   || '',
    website: companyInfo.website || 'www.phanvadee.com',
  };

  const getDocTitle = () => {
    switch (printType) {
      case 'sales_order':    return 'ใบสั่งขาย';
      case 'delivery_order': return 'ใบส่งของ';
      default:               return 'ใบเสนอราคา';
    }
  };

  // colors matching the reference design
  const ACCENT   = '#111111'; // Black Accent
  const DARK     = '#111111';
  const GRAY     = '#555557';
  const BORDER   = '#e2e8f0';

  return createPortal(
    <div className="print-portal-wrapper" style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#64748b', overflow: 'auto' }}>
      <style>{PRINT_CSS}</style>

      {/* ── Toolbar ── */}
      <div
        className="no-print"
        style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: '#1e293b', color: '#fff',
          padding: '12px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff',
              borderRadius: 8, padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center',
            }}
          >
            <X size={18} />
          </button>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>ตัวอย่าง{getDocTitle()}</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>{quotation.quotationNumber} · {customer.name}</div>
          </div>
        </div>
        <button
          onClick={() => window.print()}
          style={{
            background: ACCENT, border: 'none', color: '#fff',
            fontWeight: 700, fontSize: 13, padding: '9px 20px',
            borderRadius: 10, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          <Printer size={16} />
          พิมพ์ / บันทึก PDF
        </button>
      </div>

      {/* ── A4 Page ── */}
      <div
        className="print-page"
        style={{
          width: '210mm',
          height: '297mm',
          margin: '24px auto',
          background: '#fff',
          boxShadow: '0 4px 40px rgba(0,0,0,0.25)',
          position: 'relative',
          fontFamily: "'Sarabun', 'Helvetica Neue', Arial, sans-serif",
          fontSize: '11px',
          color: DARK,
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          padding: '40px 45px'
        }}
      >
        
        {/* ── SECTION 1: HEADER ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          {/* Left: Company Details */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            {/* Logo placeholder */}
            <div style={{
              width: 44, height: 44, borderRadius: 8,
              background: ACCENT,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 900, fontSize: 20,
              flexShrink: 0,
            }}>P</div>
            <div style={{ fontSize: '10.5px', color: DARK, lineHeight: 1.6 }}>
              <div style={{ fontWeight: 800, fontSize: '13px', marginBottom: 3, color: '#000' }}>{co.name}</div>
              <div style={{ color: GRAY }}>{co.address}</div>
              <div>โทร: {co.phone}{co.mobile ? ` / ${co.mobile}` : ''}</div>
              {co.email   && <div>อีเมล: {co.email}</div>}
              {co.website && <div>เว็บไซต์: {co.website}</div>}
              <div>เลขประจำตัวผู้เสียภาษี: {co.taxId}</div>
            </div>
          </div>

          {/* Right: Title & Doc Number */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: GRAY, fontWeight: 'bold', marginBottom: 2 }}>
              ต้นฉบับ (เอกสารออกเป็นชุด)
            </div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: ACCENT, lineHeight: 1 }}>
              {getDocTitle()}
            </div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: ACCENT, marginTop: 4 }}>
              {quotation.referenceNumber || quotation.quotationNumber}
            </div>
          </div>
        </div>

        {/* ── SECTION 2: CUSTOMER & METADATA GRID (2 Columns) ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20, tableLayout: 'fixed' }}>
          <tbody>
            <tr>
              {/* Left Column: Customer details */}
              <td style={{ width: '50%', padding: '0 15px 0 0', verticalAlign: 'top', border: 'none' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '110px', fontWeight: 'bold', color: GRAY, padding: '3px 0', border: 'none', verticalAlign: 'top' }}>ชื่อลูกค้า / บริษัท</td>
                      <td style={{ padding: '3px 0', border: 'none', fontWeight: 'bold', color: DARK }}>{customer.name || '-'}</td>
                    </tr>
                    {customer.contactPerson && (
                      <tr>
                        <td style={{ fontWeight: 'bold', color: GRAY, padding: '3px 0', border: 'none' }}>ผู้ติดต่อ</td>
                        <td style={{ padding: '3px 0', border: 'none' }}>{customer.contactPerson}</td>
                      </tr>
                    )}
                    <tr>
                      <td style={{ fontWeight: 'bold', color: GRAY, padding: '3px 0', verticalAlign: 'top', border: 'none' }}>ที่อยู่</td>
                      <td style={{ padding: '3px 0', border: 'none', lineHeight: 1.5 }}>{customer.address || '-'}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold', color: GRAY, padding: '3px 0', border: 'none' }}>เลขผู้เสียภาษี</td>
                      <td style={{ padding: '3px 0', border: 'none' }}>{customer.taxId || '-'}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold', color: GRAY, padding: '3px 0', border: 'none' }}>โทรศัพท์</td>
                      <td style={{ padding: '3px 0', border: 'none' }}>{customer.phone || '-'}</td>
                    </tr>
                    {customer.email && (
                      <tr>
                        <td style={{ fontWeight: 'bold', color: GRAY, padding: '3px 0', border: 'none' }}>อีเมล</td>
                        <td style={{ padding: '3px 0', border: 'none' }}>{customer.email}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </td>

              {/* Right Column: Seller/Doc details */}
              <td style={{ width: '50%', padding: '0 0 0 15px', verticalAlign: 'top', border: 'none', borderLeft: `1px solid ${BORDER}` }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '110px', fontWeight: 'bold', color: GRAY, padding: '3px 0', border: 'none' }}>ชื่อผู้ขาย</td>
                      <td style={{ padding: '3px 0', border: 'none' }}>{quotation.salespersonName || '-'}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold', color: GRAY, padding: '3px 0', border: 'none' }}>เบอร์ติดต่อ</td>
                      <td style={{ padding: '3px 0', border: 'none' }}>{quotation.salespersonPhone || '-'}</td>
                    </tr>
                    {quotation.projectName && (
                      <tr>
                        <td style={{ fontWeight: 'bold', color: GRAY, padding: '3px 0', border: 'none' }}>ชื่อโปรเจกต์</td>
                        <td style={{ padding: '3px 0', border: 'none' }}>{quotation.projectName}</td>
                      </tr>
                    )}
                    <tr>
                      <td style={{ fontWeight: 'bold', color: GRAY, padding: '3px 0', border: 'none' }}>เลขที่เอกสาร</td>
                      <td style={{ padding: '3px 0', border: 'none', fontWeight: 'bold', color: DARK }}>{quotation.referenceNumber || quotation.quotationNumber || '-'}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold', color: GRAY, padding: '3px 0', border: 'none' }}>วันที่ออกเอกสาร</td>
                      <td style={{ padding: '3px 0', border: 'none' }}>{fmtDate(quotation.issuedDate)}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold', color: GRAY, padding: '3px 0', border: 'none' }}>ใช้ได้ถึงวันที่</td>
                      <td style={{ padding: '3px 0', border: 'none' }}>{fmtDate(quotation.validUntilDate)}</td>
                    </tr>
                    {quotation.paymentTerms && (
                      <tr>
                        <td style={{ fontWeight: 'bold', color: GRAY, padding: '3px 0', border: 'none' }}>เงื่อนไขชำระเงิน</td>
                        <td style={{ padding: '3px 0', border: 'none' }}>{quotation.paymentTerms}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── SECTION 3: ITEMS TABLE ── */}
        <table className="items-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20, tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ background: ACCENT, color: '#fff' }}>
              <th style={{ padding: '8px 10px', fontWeight: 700, fontSize: '11px', textAlign: 'center', border: 'none' }}>ลำดับ</th>
              <th style={{ padding: '8px 10px', fontWeight: 700, fontSize: '11px', textAlign: 'left', border: 'none' }}>รายการสินค้า</th>
              <th style={{ padding: '8px 10px', fontWeight: 700, fontSize: '11px', textAlign: 'center', border: 'none' }}>จำนวน</th>
              <th style={{ padding: '8px 10px', fontWeight: 700, fontSize: '11px', textAlign: 'center', border: 'none' }}>หน่วย</th>
              <th style={{ padding: '8px 10px', fontWeight: 700, fontSize: '11px', textAlign: 'right', border: 'none' }}>ราคา/หน่วย</th>
              <th style={{ padding: '8px 10px', fontWeight: 700, fontSize: '11px', textAlign: 'right', border: 'none' }}>ส่วนลด</th>
              <th style={{ padding: '8px 10px', fontWeight: 700, fontSize: '11px', textAlign: 'right', border: 'none' }}>ยอดรวม</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: GRAY, borderBottom: `1px solid ${BORDER}` }}>— ไม่มีรายการสินค้า —</td>
              </tr>
            ) : items.map((item, idx) => {
              const discountDisplay = item.discount > 0
                ? (item.discountType === 'percent' ? `${item.discount}%` : fmt(item.discount))
                : '0';
              return (
                <tr key={item.id || idx} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td style={{ padding: '8px 10px', textAlign: 'center', color: GRAY }}>{idx + 1}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'left' }}>
                    <div style={{ fontWeight: 'bold', color: '#000' }}>{item.productName}</div>
                    {item.description && (
                      <div style={{ color: GRAY, fontSize: '10px', marginTop: 2, whiteSpace: 'pre-line', paddingLeft: 4 }}>{item.description}</div>
                    )}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center', color: GRAY }}>{item.unit || 'ชิ้น'}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>{fmt(item.unitPrice)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: item.discount > 0 ? '#ef4444' : GRAY }}>{discountDisplay}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 'bold' }}>{fmt(item.lineTotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* ── SECTION 4: SUMMARY ── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
          <div style={{ width: '280px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '5px 0', color: GRAY, border: 'none' }}>ยอดรวมก่อนภาษี</td>
                  <td style={{ padding: '5px 0', textAlign: 'right', fontWeight: '600', border: 'none' }}>{fmt(subtotal)} บาท</td>
                </tr>
                <tr>
                  <td style={{ padding: '5px 0', color: GRAY, border: 'none' }}>ภาษีมูลค่าเพิ่ม ({vatRate}%)</td>
                  <td style={{ padding: '5px 0', textAlign: 'right', fontWeight: '600', border: 'none' }}>{fmt(vatAmount)} บาท</td>
                </tr>
                <tr>
                  <td colSpan={2} style={{ padding: '2px 0', border: 'none' }}>
                    <div style={{ borderTop: `2px solid ${ACCENT}`, marginTop: 4 }} />
                  </td>
                </tr>
                <tr style={{ background: '#f5f5f7' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 'bold', fontSize: '12px', color: DARK, borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', borderLeft: '1px solid #e2e8f0' }}>ยอดรวมสุทธิ</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '900', color: ACCENT, borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', fontSize: '13px' }}>{fmt(totalAmount)} บาท</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── SECTION 5: NOTE ── */}
        {quotation.note && (
          <div style={{ marginBottom: 16, fontSize: '10px', lineHeight: 1.6, padding: '8px 12px', background: '#f5f5f7', border: `1px solid #e2e8f0`, borderRadius: 6 }}>
            <strong style={{ color: DARK }}>หมายเหตุ: </strong>
            <span style={{ color: GRAY, whiteSpace: 'pre-line' }}>{quotation.note}</span>
          </div>
        )}

        {/* Thai words spelling of the amount */}
        <div style={{ fontSize: '10.5px', color: GRAY, marginBottom: 24 }}>
          จำนวนเงินตัวอักษร: <span style={{ fontWeight: 'bold', color: DARK }}>( {numberToThaiWords(totalAmount)} )</span>
        </div>

        {/* ── SECTION 6: SIGNATURE BLOCKS ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto', paddingTop: 24, fontSize: '10.5px' }}>
          {/* Customer Signature Box */}
          <div style={{ width: '230px', textAlign: 'center' }}>
            <div style={{ borderBottom: '1px dotted #111', width: '100%', marginBottom: 6, height: '24px' }} />
            <div style={{ fontWeight: 'bold', fontSize: '11px', color: DARK }}>ผู้สั่งซื้อสินค้า</div>
            <div style={{ fontSize: '10.5px', color: DARK, marginTop: 2 }}>
              ({customer.name || '...................................................'})
            </div>
            <div style={{ fontSize: '10.5px', color: DARK, marginTop: 12, textAlign: 'left' }}>
              วันที่ .....................................................................
            </div>
          </div>

          {/* Middle: Page Indicator */}
          <div style={{ textAlign: 'center', fontSize: '10px', color: GRAY, paddingBottom: 10 }}>
            หน้า 1 / 1
          </div>

          {/* Authorized Signature Box */}
          <div style={{ width: '230px', textAlign: 'center' }}>
            <div style={{ height: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }}>
              {quotation.status === 'approved' && quotation.approvedBy ? (
                <span style={{ fontFamily: "'Sarabun', sans-serif", fontStyle: 'italic', fontSize: '11px', color: '#111', fontWeight: 'bold', borderBottom: '1px solid transparent', paddingBottom: 2 }}>
                  {quotation.approvedBy}
                </span>
              ) : (
                <div style={{ borderBottom: '1px dotted #111', width: '100%', marginBottom: 6 }} />
              )}
            </div>
            <div style={{ fontWeight: 'bold', fontSize: '11px', color: DARK, marginTop: 4 }}>ผู้อนุมัติ</div>
            <div style={{ fontSize: '10.5px', color: DARK, marginTop: 2 }}>
              ({quotation.status === 'approved' && quotation.approvedBy ? quotation.approvedBy : '...................................................'})
            </div>
            <div style={{ fontSize: '10.5px', color: DARK, marginTop: 12, textAlign: 'left' }}>
              วันที่ {quotation.status === 'approved' && quotation.approvedDate ? fmtThaiDate(quotation.approvedDate) : '.....................................................................'}
            </div>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}