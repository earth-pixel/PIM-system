import { useEffect, useMemo, useRef } from 'react';
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
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch { return d; }
};





// ─── Print Styles ─────────────────────────────────────────────
const PRINT_CSS = `
  @page { size: A4 portrait; margin: 0; }
  @media print {
    html, body {
      width: 210mm !important;
      height: auto !important;
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
      height: auto !important;
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
      padding: 40px 45px !important;
      page-break-after: always !important;
    }
    .print-page:last-child {
      page-break-after: avoid !important;
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
      width: 5% !important;
      text-align: center !important;
    }
    .print-page .items-table th:nth-child(2),
    .print-page .items-table td:nth-child(2) {
      width: 8% !important;
      text-align: center !important;
    }
    .print-page .items-table th:nth-child(3),
    .print-page .items-table td:nth-child(3) {
      width: 15% !important;
      text-align: left !important;
    }
    .print-page .items-table th:nth-child(4),
    .print-page .items-table td:nth-child(4) {
      width: 35% !important;
      text-align: left !important;
    }
    .print-page .items-table th:nth-child(5),
    .print-page .items-table td:nth-child(5) {
      width: 7% !important;
      text-align: center !important;
    }
    .print-page .items-table th:nth-child(6),
    .print-page .items-table td:nth-child(6) {
      width: 7% !important;
      text-align: center !important;
    }
    .print-page .items-table th:nth-child(7),
    .print-page .items-table td:nth-child(7) {
      width: 10% !important;
      text-align: right !important;
    }
    .print-page .items-table th:nth-child(8),
    .print-page .items-table td:nth-child(8) {
      width: 6% !important;
      text-align: right !important;
    }
    .print-page .items-table th:nth-child(9),
    .print-page .items-table td:nth-child(9) {
      width: 7% !important;
      text-align: right !important;
    }

    /* Proposal Table (7 Columns) overrides */
    .print-page .proposal-table {
      width: 100% !important;
      table-layout: fixed !important;
    }
    .print-page .proposal-table th,
    .print-page .proposal-table td {
      padding: 6px 8px !important;
      font-size: 11px !important;
      word-break: break-word !important;
      white-space: normal !important;
    }
    .print-page .proposal-table th:nth-child(1),
    .print-page .proposal-table td:nth-child(1) {
      width: 5% !important;
      text-align: center !important;
    }
    .print-page .proposal-table th:nth-child(2),
    .print-page .proposal-table td:nth-child(2) {
      width: 12% !important;
      text-align: center !important;
    }
    .print-page .proposal-table th:nth-child(3),
    .print-page .proposal-table td:nth-child(3) {
      width: 15% !important;
      text-align: center !important;
    }
    .print-page .proposal-table th:nth-child(4),
    .print-page .proposal-table td:nth-child(4) {
      width: 15% !important;
      text-align: center !important;
    }
    .print-page .proposal-table th:nth-child(5),
    .print-page .proposal-table td:nth-child(5) {
      width: 35% !important;
      text-align: left !important;
    }
    .print-page .proposal-table th:nth-child(6),
    .print-page .proposal-table td:nth-child(6) {
      width: 10% !important;
      text-align: center !important;
    }
    .print-page .proposal-table th:nth-child(7),
    .print-page .proposal-table td:nth-child(7) {
      width: 8% !important;
      text-align: right !important;
    }
  }
`;

const getDocTitle = (printType) => {
  switch (printType) {
    case 'sales_order':    return 'ใบสั่งขาย';
    case 'delivery_order': return 'ใบส่งของ';
    default:               return 'ใบเสนอราคา';
  }
};

// ─── Component ────────────────────────────────────────────────
export default function QuotationPrint({ quotation, companyInfo = {}, onClose, printType = 'quotation', autoPrint = false, addActivityLog }) {
  const docFormat = quotation?.documentType || 'quotation'; // 'quotation' | 'product_proposal'

  // Lookup database products from localStorage to fetch barcode and size details
  const productsList = useMemo(() => {
    try {
      const saved = localStorage.getItem('pim_products');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }, []);

  const getProductDetails = (productCode) => {
    const p = productsList.find(item => item.code === productCode);
    return {
      barcode: p?.barcode || '',
      size: p?.size || ''
    };
  };

  const cleanSalespersonName = (name) => {
    if (!name) return '';
    return name.replace(/\s*\((admin|manager|user)\)/i, '').trim();
  };

  const printAreaRef = useRef(null);

  const handlePrintClick = () => {
    window.print();
    if (addActivityLog) {
      const docLabel = docFormat === 'product_proposal' ? 'ใบเสนอสินค้า' : 'ใบเสนอราคา';
      addActivityLog(`พิมพ์ / บันทึก PDF (${docLabel}) เลขที่: ${quotation.referenceNumber || quotation.quotationNumber} ของลูกค้า ${customer.name || '-'}`);
    }
  };



  // Auto print if requested (e.g. for email attachment flow)
  useEffect(() => {
    if (autoPrint && quotation && quotation.status === 'approved') {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoPrint, quotation]);

  // Block printing via keyboard shortcuts if the quotation is draft or rejected
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key?.toLowerCase() === 'p') {
          if (quotation && quotation.status !== 'approved' && quotation.documentType !== 'product_proposal') {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [quotation]);

  // Set document title dynamically to customize printed/saved PDF filename
  useEffect(() => {
    const originalTitle = document.title;
    if (quotation) {
      const docType = docFormat === 'product_proposal' ? 'ใบเสนอสินค้า' : getDocTitle(printType);
      const coName = companyInfo.name || 'บริษัท พันธ์วาดี จำกัด';
      const docNum = quotation.quotationNumber || quotation.id || '';
      document.title = `${docType} ${docNum} - ${coName}`;
    }
    return () => {
      document.title = originalTitle;
    };
  }, [quotation, companyInfo, printType, docFormat]);
  const items       = quotation?.items       ?? [];
  const customer    = quotation?.customer    ?? {};
  const subtotal    = Number(quotation?.subtotal)    || 0;
  const vatAmount   = Number(quotation?.vatAmount)   || 0;
  const totalAmount = Number(quotation?.totalAmount) || 0;
  const vatRate     = quotation?.vatRate ?? 7;

  const paginatedPages = useMemo(() => {
    if (!quotation) return [];
    const pages = [];
    const isProposal = docFormat === 'product_proposal';
    const rowHeight = isProposal ? 105 : 55;
    const maxPageContentHeight = 880;

    const headerHeight = 150;
    const infoHeight = isProposal ? 0 : 160;
    const tableHeaderHeight = 40;
    const summaryHeight = isProposal ? 0 : 120;
    const noteHeight = isProposal ? 0 : (quotation?.note ? 60 : 0);
    const signatureHeight = isProposal ? 110 : 130;

    // Total trailing elements height (only appears on the last page)
    const trailingHeight = summaryHeight + noteHeight + signatureHeight;

    const getPageStaticHeight = (isFirst, isLast) => {
      let h = tableHeaderHeight;
      if (isFirst) h += headerHeight + infoHeight;
      else h += 60; // Mini-header height
      if (isLast) h += trailingHeight;
      return h;
    };

    let itemsLeft = [...(quotation.items || [])];
    let pageNum = 1;

    while (itemsLeft.length > 0) {
      const isFirst = pageNum === 1;
      
      // Check if ALL remaining items fit on this page with the footer elements
      let allRemainingFit = true;
      let lastPageHeight = getPageStaticHeight(isFirst, true);
      
      for (let j = 0; j < itemsLeft.length; j++) {
        lastPageHeight += rowHeight;
        if (lastPageHeight > maxPageContentHeight) {
          allRemainingFit = false;
          break;
        }
      }

      if (allRemainingFit) {
        pages.push(itemsLeft);
        break;
      }

      // If they don't fit, fill this page up to maxPageContentHeight (without trailing elements)
      const pageItems = [];
      let tempHeight = getPageStaticHeight(isFirst, false);
      
      while (itemsLeft.length > 0 && tempHeight + rowHeight <= maxPageContentHeight) {
        const item = itemsLeft.shift();
        pageItems.push(item);
        tempHeight += rowHeight;
      }

      // Safeguard: if for some reason pageItems is empty, force push at least one item
      if (pageItems.length === 0 && itemsLeft.length > 0) {
        pageItems.push(itemsLeft.shift());
      }

      pages.push(pageItems);
      pageNum++;
    }

    if (pages.length === 0) {
      pages.push([]);
    }

    return pages;
  }, [docFormat, quotation]);

  if (!quotation) return null;

  if (quotation.status !== 'approved' && quotation.documentType !== 'product_proposal') {
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
              เอกสารนี้อยู่ในสถานะ <strong className="text-rose-600">"{quotation.status === 'draft' ? 'ร่าง' : quotation.status === 'sent' ? 'รออนุมัติ' : 'ไม่อนุมัติ'}"</strong><br />
              ระบบไม่อนุญาตให้ออกคำสั่งพิมพ์ หรือดาวน์โหลดเอกสารจนกว่าจะได้รับการอนุมัติ
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

  const co = {
    name:    companyInfo.name    || 'บริษัท พันธ์วาดี จำกัด (สำนักงานใหญ่)',
    address: companyInfo.address || '19/9 ซ.ทวีวัฒนา-กาญจนาภิเษก 16 แขวง/เขต ทวีวัฒนา กทม. 10170',
    taxId:   companyInfo.taxId   || '0105546026064',
    phone:   companyInfo.phone   || '02-4315111',
    mobile:  companyInfo.mobile  || '02-0055666',
    email:   companyInfo.email   || '',
    website: companyInfo.website || 'www.phanvadee.com',
  };

  // colors matching the reference design
  const ACCENT   = '#111111ff'; // Black Accent
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
          height: '60px',
          background: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(12px)',
          color: '#fff',
          padding: '0 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff',
              borderRadius: 8, padding: '8px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center',
              transition: 'background 0.2s, transform 0.1s',
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.96)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <X size={18} />
          </button>
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: '0.01em' }}>ตัวอย่าง{getDocTitle(printType)}</div>
            <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 2 }}>{quotation.quotationNumber} · {customer.name}</div>
          </div>
        </div>
        


        <button
          onClick={handlePrintClick}
          style={{
            background: '#0071e3', border: 'none', color: '#fff',
            fontWeight: 700, fontSize: 12.5, padding: '9px 20px',
            borderRadius: 10, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 7,
            boxShadow: '0 4px 12px rgba(0, 113, 227, 0.3)',
            transition: 'background 0.2s, transform 0.2s, box-shadow 0.2s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = '#0077ed';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 113, 227, 0.45)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = '#0071e3';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 113, 227, 0.3)';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'translateY(1px) scale(0.98)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px) scale(1)';
          }}
        >
          <Printer size={15} />
          พิมพ์ / บันทึก PDF
        </button>
      </div>

      {/* ── Printable Pages Container ── */}
      <div ref={printAreaRef} className="print-pages-container" style={{ margin: '0 auto', width: '210mm' }}>
        {paginatedPages.map((pageItems, pageIdx) => {
          const isFirstPage = pageIdx === 0;
          const isLastPage = pageIdx === paginatedPages.length - 1;

          return (
            <div
              key={pageIdx}
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
                padding: '40px 45px',
                pageBreakAfter: isLastPage ? 'auto' : 'always'
              }}
            >
              {/* ── SECTION 1: HEADER ── */}
              {isFirstPage ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                  {/* Left: Company Details */}
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    {/* Logo */}
                    <div style={{
                      width: 44, height: 44,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <svg viewBox="0 0 80 90" style={{ width: 44, height: 44, fill: ACCENT }} xmlns="http://www.w3.org/2000/svg">
                        <path d="M 20 38 L 20 26 L 60 11 L 60 23 Z" />
                        <path d="M 20 60 L 20 48 L 60 33 L 60 45 Z" />
                        <path d="M 20 82 L 20 70 L 60 55 L 60 67 Z" />
                      </svg>
                    </div>
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
                    <div style={{ fontSize: '28px', fontWeight: 900, color: ACCENT, lineHeight: 1 }}>
                      {docFormat === 'product_proposal' ? 'ใบเสนอสินค้า' : getDocTitle(printType)}
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: ACCENT, marginTop: 4 }}>
                      {quotation.referenceNumber || quotation.quotationNumber}
                    </div>
                  </div>
                </div>
              ) : (
                /* Mini Header for Page 2+ */
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1.5px solid ${DARK}`, paddingBottom: 6, marginBottom: 16 }}>
                  <span style={{ fontWeight: 800, fontSize: '10px', color: DARK }}>{co.name}</span>
                  <span style={{ fontSize: '10px', color: GRAY }}>
                    {docFormat === 'product_proposal' ? 'ใบเสนอสินค้า' : getDocTitle(printType)} เลขที่: {quotation.referenceNumber || quotation.quotationNumber}
                  </span>
                </div>
              )}

              {/* ── SECTION 2: CUSTOMER & METADATA GRID (2 Columns, Only on Page 1) ── */}
              {isFirstPage && docFormat === 'quotation' && (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20, tableLayout: 'fixed' }}>
                  <tbody>
                    <tr>
                      {/* Left Column: Customer details */}
                      <td style={{ width: '50%', padding: '0 15px 0 0', verticalAlign: 'top', border: 'none' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                          <tbody>
                            <tr>
                              <td style={{ width: '110px', fontWeight: 'bold', color: GRAY, padding: '3px 0', border: 'none', verticalAlign: 'top' }}>ชื่อลูกค้า</td>
                              <td style={{ padding: '3px 0', border: 'none', fontWeight: 'bold', color: DARK }}>{customer.name || '-'}</td>
                            </tr>
                            <tr>
                              <td style={{ fontWeight: 'bold', color: GRAY, padding: '3px 0', border: 'none', verticalAlign: 'top' }}>บริษัท</td>
                              <td style={{ padding: '3px 0', border: 'none', fontWeight: 'bold', color: DARK }}>{customer.companyName || '-'}</td>
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
              )}

              {/* ── SECTION 3: ITEMS TABLE ── */}
              {docFormat === 'product_proposal' ? (
                <table className="proposal-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20, tableLayout: 'fixed' }}>
                  <thead>
                    <tr style={{ background: ACCENT, color: '#fff' }}>
                      <th style={{ width: '5%', padding: '8px 10px', fontWeight: 700, fontSize: '11px', textAlign: 'center', border: 'none' }}>ลำดับ</th>
                      <th style={{ width: '12%', padding: '8px 10px', fontWeight: 700, fontSize: '11px', textAlign: 'center', border: 'none' }}>รหัสสินค้า (SKU)</th>
                      <th style={{ width: '15%', padding: '8px 10px', fontWeight: 700, fontSize: '11px', textAlign: 'center', border: 'none' }}>บาร์โค้ด</th>
                      <th style={{ width: '15%', padding: '8px 10px', fontWeight: 700, fontSize: '11px', textAlign: 'center', border: 'none' }}>ภาพสินค้า</th>
                      <th style={{ width: '35%', padding: '8px 10px', fontWeight: 700, fontSize: '11px', textAlign: 'left', border: 'none' }}>ชื่อสินค้า</th>
                      <th style={{ width: '10%', padding: '8px 10px', fontWeight: 700, fontSize: '11px', textAlign: 'center', border: 'none' }}>ขนาด / น้ำหนัก</th>
                      <th style={{ width: '8%', padding: '8px 10px', fontWeight: 700, fontSize: '11px', textAlign: 'right', border: 'none' }}>ราคา</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: GRAY, borderBottom: `1px solid ${BORDER}` }}>— ไม่มีรายการสินค้า —</td>
                      </tr>
                    ) : pageItems.map((item, idx) => {
                      const globalIdx = items.findIndex(x => x.id === item.id);
                      const details = getProductDetails(item.productCode);
                      const itemBarcode = item.barcode || details.barcode;
                      const itemSize = item.size || details.size;
                      const itemWeight = item.weight || '';

                      const sizeAndWeight = [itemSize, itemWeight].filter(Boolean).join(' / ');
                      const qtyPart = item.quantity > 1 ? ` x${item.quantity}` : '';
                      const sizeDisplay = sizeAndWeight 
                        ? `${sizeAndWeight}${qtyPart}`
                        : (item.quantity > 1 ? `x${item.quantity}` : '—');
                      
                      return (
                        <tr key={item.id || idx} style={{ borderBottom: `1px solid ${BORDER}` }}>
                          <td style={{ padding: '8px 10px', textAlign: 'center', color: GRAY }}>{globalIdx + 1}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', color: DARK, fontSize: '10.5px' }}>
                            {item.productCode || '—'}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            {itemBarcode ? (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                <img 
                                  src={`https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(itemBarcode)}&height=10&includetext=false`} 
                                  style={{ height: '35px', maxWidth: '120px', objectFit: 'contain' }} 
                                  alt="" 
                                />
                                <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#555557' }}>{itemBarcode}</span>
                              </div>
                            ) : '—'}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            {item.productImage ? (
                              <img src={item.productImage} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: `1px solid ${BORDER}` }} alt="" />
                            ) : (
                              <span style={{ color: '#ccc', fontSize: '10px' }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'left' }}>
                            <div style={{ fontWeight: 'bold', color: '#000' }}>{item.productName}</div>
                            {item.description && (
                              <div style={{ color: GRAY, fontSize: '10px', marginTop: 2, whiteSpace: 'pre-line' }}>{item.description}</div>
                            )}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '500', color: DARK }}>{sizeDisplay}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 'bold', color: DARK }}>฿{fmt(item.unitPrice)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <table className="items-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20, tableLayout: 'fixed' }}>
                  <thead>
                    <tr style={{ background: ACCENT, color: '#fff' }}>
                      <th style={{ width: '5%', padding: '8px 10px', fontWeight: 700, fontSize: '11px', textAlign: 'center', border: 'none' }}>ลำดับ</th>
                      <th style={{ width: '8%', padding: '8px 10px', fontWeight: 700, fontSize: '11px', textAlign: 'center', border: 'none' }}>รูปภาพ</th>
                      <th style={{ width: '15%', padding: '8px 10px', fontWeight: 700, fontSize: '11px', textAlign: 'left', border: 'none' }}>รหัสสินค้า</th>
                      <th style={{ width: '35%', padding: '8px 10px', fontWeight: 700, fontSize: '11px', textAlign: 'left', border: 'none' }}>รายการสินค้า</th>
                      <th style={{ width: '7%', padding: '8px 10px', fontWeight: 700, fontSize: '11px', textAlign: 'center', border: 'none' }}>จำนวน</th>
                      <th style={{ width: '7%', padding: '8px 10px', fontWeight: 700, fontSize: '11px', textAlign: 'center', border: 'none' }}>หน่วย</th>
                      <th style={{ width: '10%', padding: '8px 10px', fontWeight: 700, fontSize: '11px', textAlign: 'right', border: 'none' }}>ราคา/หน่วย</th>
                      <th style={{ width: '6%', padding: '8px 10px', fontWeight: 700, fontSize: '11px', textAlign: 'right', border: 'none' }}>ส่วนลด</th>
                      <th style={{ width: '7%', padding: '8px 10px', fontWeight: 700, fontSize: '11px', textAlign: 'right', border: 'none' }}>ยอดรวม</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: GRAY, borderBottom: `1px solid ${BORDER}` }}>— ไม่มีรายการสินค้า —</td>
                      </tr>
                    ) : pageItems.map((item, idx) => {
                      const globalIdx = items.findIndex(x => x.id === item.id);
                      const discountDisplay = item.discount > 0
                        ? (item.discountType === 'percent' ? `${item.discount}%` : fmt(item.discount))
                        : '0';
                      return (
                        <tr key={item.id || idx} style={{ borderBottom: `1px solid ${BORDER}` }}>
                          <td style={{ padding: '8px 10px', textAlign: 'center', color: GRAY }}>{globalIdx + 1}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            {item.productImage ? (
                              <img src={item.productImage} style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '4px', border: `1px solid ${BORDER}` }} alt="" />
                            ) : (
                              <span style={{ color: '#ccc', fontSize: '10px' }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'left', color: DARK, fontSize: '10.5px', wordBreak: 'break-all' }}>
                            {item.productCode || '—'}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'left' }}>
                            <div style={{ fontWeight: 'bold', color: '#000' }}>{item.productName}</div>
                            {item.description && (
                              <div style={{ color: GRAY, fontSize: '10px', marginTop: 2, whiteSpace: 'pre-line' }}>{item.description}</div>
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
              )}

              {/* ── SECTION 4, 5, 6: SUMMARY, NOTE, SIGNATURES (Only on Last Page) ── */}
              {isLastPage && (
                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column' }}>
                  
                  {/* ── SECTION 4: SUMMARY ── */}
                  {docFormat === 'quotation' && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                      <div style={{ width: '280px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <tbody>
                            <tr>
                              <td style={{ padding: '4px 0', color: GRAY, border: 'none' }}>ยอดรวมก่อนภาษี</td>
                              <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: '600', border: 'none' }}>{fmt(subtotal)} บาท</td>
                            </tr>
                            <tr>
                              <td style={{ padding: '4px 0', color: GRAY, border: 'none' }}>ภาษีมูลค่าเพิ่ม ({vatRate}%)</td>
                              <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: '600', border: 'none' }}>{fmt(vatAmount)} บาท</td>
                            </tr>
                            <tr>
                              <td colSpan={2} style={{ padding: '2px 0', border: 'none' }}>
                                <div style={{ borderTop: `2px solid ${ACCENT}`, marginTop: 4 }} />
                              </td>
                            </tr>
                            <tr style={{ background: '#f5f5f7' }}>
                              <td style={{ padding: '6px 10px', fontWeight: 'bold', fontSize: '11px', color: DARK, borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', borderLeft: '1px solid #e2e8f0' }}>ยอดรวมสุทธิ</td>
                              <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '900', color: ACCENT, borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', fontSize: '12px' }}>{fmt(totalAmount)} บาท</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* ── SECTION 5: NOTE ── */}
                  {docFormat === 'quotation' && quotation.note && (
                    <div style={{ marginBottom: 12, fontSize: '9.5px', lineHeight: 1.5, padding: '6px 10px', background: '#f5f5f7', border: `1px solid #e2e8f0`, borderRadius: 6 }}>
                      <strong style={{ color: DARK }}>หมายเหตุ: </strong>
                      <span style={{ color: GRAY, whiteSpace: 'pre-line' }}>{quotation.note}</span>
                    </div>
                  )}

                  {/* Thai words spelling of the amount */}
                  {docFormat === 'quotation' && (
                    <div style={{ fontSize: '10px', color: GRAY, marginBottom: 16 }}>
                      จำนวนเงินตัวอักษร: <span style={{ fontWeight: 'bold', color: DARK }}>( {numberToThaiWords(totalAmount)} )</span>
                    </div>
                  )}

                  {/* ── SECTION 6: SIGNATURE BLOCKS ── */}
                  {docFormat === 'quotation' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 12, fontSize: '10px' }}>
                      {/* Customer Signature Box */}
                      <div style={{ width: '230px', textAlign: 'center' }}>
                        <div style={{ borderBottom: '1px dotted #111', width: '100%', marginBottom: 6, height: '24px' }} />
                        <div style={{ fontWeight: 'bold', fontSize: '10.5px', color: DARK }}>ผู้สั่งซื้อสินค้า</div>
                        <div style={{ fontSize: '10px', color: DARK, marginTop: 2 }}>
                          ({customer.name || '...................................................'})
                        </div>
                        <div style={{ fontSize: '10px', color: DARK, marginTop: 12, textAlign: 'center' }}>
                          วันที่ .....................................................................
                        </div>
                      </div>

                      {/* Authorized Signature Box */}
                      <div style={{ width: '230px', textAlign: 'center' }}>
                        <div style={{ borderBottom: '1px dotted #111', width: '100%', marginBottom: 6, height: '24px' }} />
                        <div style={{ fontWeight: 'bold', fontSize: '10.5px', color: DARK, marginTop: 4 }}>ผู้อนุมัติ</div>
                        <div style={{ fontSize: '10px', color: DARK, marginTop: 2 }}>
                          ({cleanSalespersonName(quotation.salespersonName) || '...................................................'})
                        </div>
                        <div style={{ fontSize: '10px', color: DARK, marginTop: 12, textAlign: 'center' }}>
                          วันที่ {quotation.issuedDate ? fmtDate(quotation.issuedDate) : '.....................................................................'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── SECTION 6 FOR PRODUCT PROPOSAL: AUTHORIZED SIGNATURE & STAMP ── */}
                  {docFormat === 'product_proposal' && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 12, fontSize: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        {/* Company Seal/Stamp Placeholder */}
                        <div style={{
                          width: '65px',
                          height: '65px',
                          borderRadius: '50%',
                          border: '1.5px dashed #cbd5e1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textAlign: 'center',
                          fontSize: '9px',
                          color: '#94a3b8',
                          fontWeight: 'bold',
                          lineHeight: 1.2,
                          userSelect: 'none'
                        }}>
                          ตราประทับ<br/>บริษัท
                        </div>

                        {/* Date Box */}
                        <div style={{ display: 'flex', alignItems: 'center', height: '65px' }}>
                          <div style={{ fontSize: '10.5px', color: DARK, fontWeight: 'bold' }}>
                            วันที่ .....................................................................
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* Dynamic Page Number positioned absolute bottom of each page container */}
              <div 
                style={{ 
                  position: 'absolute', 
                  bottom: '15px', 
                  left: '45px', 
                  right: '45px', 
                  display: 'flex', 
                  justifyContent: 'center', 
                  fontSize: '9.5px', 
                  color: GRAY,
                  fontWeight: 'bold'
                }}
              >
                หน้า {pageIdx + 1} / {paginatedPages.length}
              </div>

            </div>
          );
        })}
      </div>
    </div>,
    document.body
  );
}