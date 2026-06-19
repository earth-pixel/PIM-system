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
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch { return d; }
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
    }

    /* Override global table print styles from index.css */
    .print-page table {
      width: 100% !important;
      table-layout: auto !important;
    }
    .print-page th,
    .print-page td {
      padding: 10px 10px !important;
      font-size: 12px !important;
      word-break: normal !important;
      white-space: normal !important;
      width: auto !important;
      text-align: left !important;
    }
    /* Re-apply correct column alignments for quotation print table */
    .print-page th:nth-child(1),
    .print-page td:nth-child(1) {
      width: 5% !important;
      text-align: center !important;
    }
    .print-page th:nth-child(2),
    .print-page td:nth-child(2) {
      width: 45% !important;
      text-align: left !important;
    }
    .print-page th:nth-child(3),
    .print-page td:nth-child(3) {
      width: 10% !important;
      text-align: right !important;
    }
    .print-page th:nth-child(4),
    .print-page td:nth-child(4) {
      width: 8% !important;
      text-align: right !important;
    }
    .print-page th:nth-child(5),
    .print-page td:nth-child(5) {
      width: 12% !important;
      text-align: right !important;
    }
    .print-page th:nth-child(6),
    .print-page td:nth-child(6) {
      width: 10% !important;
      text-align: right !important;
    }
    .print-page th:nth-child(7),
    .print-page td:nth-child(7) {
      width: 10% !important;
      text-align: right !important;
    }

    /* Header block table override (top-right card) */
    .print-page .header-info-table {
      table-layout: auto !important;
    }
    .print-page .header-info-table td {
      padding: 2px 0 !important;
      font-size: 11px !important;
      white-space: nowrap !important;
      width: auto !important;
    }
    .print-page .header-info-table td:nth-child(1) {
      width: 40% !important;
      text-align: left !important;
    }
    .print-page .header-info-table td:nth-child(2) {
      width: 60% !important;
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
    address: companyInfo.address || '141/63 อาคารสุขุมวิทซิตี้ทาวเวอร์ ถ.สุขุมวิท กรุงเทพ 10500',
    taxId:   companyInfo.taxId   || '0105560096348',
    phone:   companyInfo.phone   || '02-500-0000',
    mobile:  companyInfo.mobile  || '',
    email:   companyInfo.email   || '',
  };

  const getDocTitle = () => {
    switch (printType) {
      case 'sales_order':    return 'ใบสั่งขาย';
      case 'delivery_order': return 'ใบส่งของ';
      default:               return 'ใบเสนอราคา';
    }
  };

  // colours
  const ACCENT   = '#0071e3';
  const ORANGE   = '#f97316';
  const DARK     = '#1a1a1a';
  const GRAY     = '#6b7280';
  const LIGHT_BG = '#f8fafc';
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
            background: ORANGE, border: 'none', color: '#fff',
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
          minHeight: '297mm',
          margin: '24px auto',
          background: '#fff',
          boxShadow: '0 4px 40px rgba(0,0,0,0.25)',
          position: 'relative',
          fontFamily: "'Sarabun', 'Helvetica Neue', Arial, sans-serif",
          fontSize: '13px',
          color: DARK,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ── TOP ACCENT BAR ── */}
        <div style={{ height: 6, background: `linear-gradient(90deg, ${ACCENT}, ${ORANGE})` }} />

        <div style={{ padding: '32px 40px', flex: 1, display: 'flex', flexDirection: 'column', gap: 0 }}>

          {/* ── SECTION 1: HEADER ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>

            {/* Left: Company */}
            <div style={{ flex: 1, paddingRight: 24 }}>
              {/* Logo placeholder */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 10,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: `linear-gradient(135deg, ${ACCENT}, #0ea5e9)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 900, fontSize: 16,
                }}>P</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: DARK, lineHeight: 1.2 }}>{co.name}</div>
                  <div style={{ fontSize: 10, color: GRAY, fontWeight: 500, letterSpacing: '0.3px' }}>Product Information Management</div>
                </div>
              </div>
              <div style={{ fontSize: 11.5, color: '#374151', lineHeight: 1.9 }}>
                <div>{co.address}</div>
                <div>เลขประจำตัวผู้เสียภาษี: <span style={{ fontWeight: 600 }}>{co.taxId}</span></div>
                {co.phone && <div>โทร: {co.phone}{co.mobile ? ` | มือถือ: ${co.mobile}` : ''}</div>}
                {co.email && <div>อีเมล: {co.email}</div>}
              </div>
            </div>

            {/* Right: Title + doc number */}
            <div style={{ textAlign: 'right', flexShrink: 0, width: '240px' }}>
              <div style={{
                fontSize: 30, fontWeight: 900, color: ORANGE,
                letterSpacing: '-0.5px', lineHeight: 1, marginBottom: 16,
              }}>{getDocTitle()}</div>
              <div style={{
                background: LIGHT_BG, border: `1px solid ${BORDER}`,
                borderRadius: 10, padding: '12px 16px',
                minWidth: 200,
              }}>
                <table className="header-info-table" style={{ borderCollapse: 'collapse', width: '100%' }}>
                  <tbody>
                    {[
                      ['เลขที่',      quotation.quotationNumber],
                      ['วันที่ออก',   fmtDate(quotation.issuedDate)],
                      ['ใช้ได้ถึง',   fmtDate(quotation.validUntilDate)],
                    ].map(([label, val]) => (
                      <tr key={label}>
                        <td style={{ color: GRAY, fontSize: 11, paddingRight: 10, paddingBottom: 5, whiteSpace: 'nowrap', fontWeight: 500 }}>{label}</td>
                        <td style={{ fontWeight: 700, fontSize: 12, paddingBottom: 5, textAlign: 'right' }}>{val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── SECTION 2: CUSTOMER ── */}
          <div style={{
            background: LIGHT_BG, border: `1px solid ${BORDER}`,
            borderRadius: 10, padding: '14px 18px', marginBottom: 24,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>ข้อมูลผู้รับใบเสนอราคา</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px', fontSize: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 13, gridColumn: '1 / -1', marginBottom: 2 }}>{customer.name || '-'}</div>
              {customer.address && (
                <div style={{ color: '#374151', gridColumn: '1 / -1', marginBottom: 2 }}>{customer.address}</div>
              )}
              {customer.taxId && (
                <div style={{ color: GRAY }}>เลขประจำตัวผู้เสียภาษี: <span style={{ color: DARK, fontWeight: 600 }}>{customer.taxId}</span></div>
              )}
              {customer.phone && (
                <div style={{ color: GRAY }}>โทร: <span style={{ color: DARK, fontWeight: 600 }}>{customer.phone}</span></div>
              )}
              {customer.email && (
                <div style={{ color: GRAY }}>อีเมล: <span style={{ color: DARK, fontWeight: 600 }}>{customer.email}</span></div>
              )}
              {customer.contactPerson && (
                <div style={{ color: GRAY }}>ผู้ติดต่อ: <span style={{ color: DARK, fontWeight: 600 }}>{customer.contactPerson}</span></div>
              )}
            </div>
          </div>

          {/* ── SECTION 3: ITEMS TABLE ── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20, fontSize: 12 }}>
            <thead>
              <tr style={{ background: DARK }}>
                {['#', 'รายการสินค้า / บริการ', 'จำนวน', 'หน่วย', 'ราคา/หน่วย', 'ส่วนลด', 'จำนวนเงิน'].map((h, i) => (
                  <th key={h} style={{
                    padding: '10px 10px',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 11,
                    letterSpacing: '0.3px',
                    textAlign: [2, 3, 4, 5, 6].includes(i) ? 'right' : i === 0 ? 'center' : 'left',
                    whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: GRAY }}>— ไม่มีรายการสินค้า —</td>
                </tr>
              ) : items.map((item, idx) => {
                const discountDisplay = item.discount > 0
                  ? (item.discountType === 'percent' ? `${item.discount}%` : fmt(item.discount))
                  : '-';
                return (
                  <tr key={item.id || idx} style={{
                    borderBottom: `1px solid ${BORDER}`,
                    background: idx % 2 === 0 ? '#fff' : LIGHT_BG,
                  }}>
                    <td style={{ padding: '10px', textAlign: 'center', color: GRAY, fontWeight: 500 }}>{idx + 1}</td>
                    <td style={{ padding: '10px' }}>
                      <div style={{ fontWeight: 600, color: DARK }}>{item.productName}</div>
                      {item.description && (
                        <div style={{ color: GRAY, fontSize: 11, marginTop: 2 }}>{item.description}</div>
                      )}
                      {item.productCode && (
                        <div style={{ color: '#9ca3af', fontSize: 10, marginTop: 1, fontFamily: 'monospace' }}>SKU: {item.productCode}</div>
                      )}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 600 }}>{item.quantity}</td>
                    <td style={{ padding: '10px', textAlign: 'right', color: GRAY }}>{item.unit || 'ชิ้น'}</td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>{fmt(item.unitPrice)}</td>
                    <td style={{ padding: '10px', textAlign: 'right', color: item.discount > 0 ? '#ef4444' : GRAY }}>{discountDisplay}</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: DARK }}>{fmt(item.lineTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* ── SECTION 4: SUMMARY + NOTE ── */}
          <div style={{ display: 'flex', gap: 24, marginBottom: 28, alignItems: 'flex-start' }}>
            {/* Left: Note + Payment Terms */}
            <div style={{ flex: 1 }}>
              {quotation.paymentTerms && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>เงื่อนไขการชำระเงิน</div>
                  <div style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>{quotation.paymentTerms}</div>
                </div>
              )}
              {quotation.note && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>หมายเหตุ</div>
                  <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>{quotation.note}</div>
                </div>
              )}
              {/* Thai Words */}
              <div style={{
                marginTop: 16,
                padding: '10px 14px',
                background: '#fff7ed',
                border: `1px solid #fed7aa`,
                borderRadius: 8,
                fontSize: 11.5,
              }}>
                <span style={{ color: GRAY, marginRight: 6 }}>จำนวนเงินเป็นตัวอักษร:</span>
                <span style={{ fontWeight: 700, color: '#c2410c' }}>({numberToThaiWords(totalAmount)})</span>
              </div>
            </div>

            {/* Right: Summary box */}
            <div style={{
              minWidth: 260,
              border: `1px solid ${BORDER}`,
              borderRadius: 10,
              overflow: 'hidden',
              flexShrink: 0,
            }}>
              {[
                { label: 'รวมเป็นเงิน', value: `${fmt(subtotal)} บาท`, bold: false },
                { label: `ภาษีมูลค่าเพิ่ม ${vatRate}%`, value: `${fmt(vatAmount)} บาท`, bold: false },
              ].map(({ label, value, bold }) => (
                <div key={label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 16px',
                  borderBottom: `1px solid ${BORDER}`,
                  background: '#fff',
                  fontSize: 12,
                }}>
                  <span style={{ color: GRAY, fontWeight: bold ? 700 : 400 }}>{label}</span>
                  <span style={{ fontWeight: bold ? 800 : 600, color: DARK }}>{value}</span>
                </div>
              ))}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 16px',
                background: DARK,
              }}>
                <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 12 }}>จำนวนเงินรวมทั้งสิ้น</span>
                <span style={{ color: ORANGE, fontWeight: 900, fontSize: 16 }}>{fmt(totalAmount)} บาท</span>
              </div>
            </div>
          </div>

          {/* ── SECTION 5: SIGNATURES ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 20,
            marginTop: 'auto',
            paddingTop: 16,
          }}>
            {[
              { title: 'ผู้เสนอราคา', name: co.name },
              { title: 'ผู้ตรวจสอบ', name: '' },
              { title: 'ผู้รับใบเสนอราคา', name: customer.name || '' },
            ].map((sig) => (
              <div key={sig.title} style={{ textAlign: 'center' }}>
                <div style={{
                  borderBottom: `1.5px dashed ${BORDER}`,
                  height: 52,
                  marginBottom: 8,
                }} />
                <div style={{ fontSize: 12, fontWeight: 700, color: DARK }}>{sig.title}</div>
                {sig.name && <div style={{ fontSize: 11, color: GRAY, marginTop: 2 }}>{sig.name}</div>}
                <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 4 }}>วันที่ .....................</div>
              </div>
            ))}
          </div>

        </div>

        {/* ── FOOTER ACCENT BAR ── */}
        <div style={{
          height: 4,
          background: `linear-gradient(90deg, ${ACCENT}, ${ORANGE})`,
          marginTop: 16,
        }} />
      </div>
    </div>,
    document.body
  );
}
