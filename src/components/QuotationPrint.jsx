import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Download, ExternalLink, Mail, CheckCircle2 } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { isExpiredQuotation } from '../utils/validation';
import BarcodeDisplay from './BarcodeDisplay';

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

// ─── Pagination constants ──────────────────────────────────────
// Instead of guessing row/section heights (which breaks the moment a product
// name wraps to 2-3 lines, or an image/barcode is present), we render every
// item once inside an off-screen container with the SAME markup used on the
// real page, measure the actual rendered heights, and only THEN decide how
// many items fit on a physical A4 sheet. This guarantees we never create a
// wasted 2nd page unless the content truly does not fit.
const MM_TO_PX = 3.7795275591;
// ".print-page" is 296.5mm tall. Use the more conservative (larger) of the
// screen padding (40px+40px) and print padding (35px+15px) as safety margin,
// plus a small buffer for rounding/anti-aliasing, so this is safe both for
// window.print() and for the html2pdf export path.
const PAGE_CONTENT_HEIGHT = Math.floor(296.5 * MM_TO_PX) - 80 - 6;

// ─── Print Styles ─────────────────────────────────────────────
const PRINT_CSS = `
  @page { size: A4 portrait; margin: 0; }

  @media print {
    /* ── Force color/background preservation ── */
    *, *::before, *::after {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }

    html {
      width: 210mm !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    body {
      width: 210mm !important;
      height: auto !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #fff !important;
      overflow: visible !important;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    /* Hide everything on the page except our print wrapper */
    body > *:not(.print-portal-wrapper) {
      display: none !important;
    }

    /* ── Outer wrapper: switch from fixed to static for print ── */
    .print-portal-wrapper {
      position: static !important;
      inset: auto !important;
      width: 210mm !important;
      height: auto !important;
      background: #fff !important;
      overflow: visible !important;
      margin: 0 !important;
      padding: 0 !important;
      box-sizing: border-box !important;
      z-index: auto !important;
    }

    .no-print { display: none !important; }

    /* ── Pages container: remove transform scaling ── */
    .print-pages-container {
      transform: none !important;
      width: 210mm !important;
      margin: 0 !important;
    }

    .print-preview-wrapper {
      display: block !important;
      width: 210mm !important;
      padding: 0 !important;
      margin: 0 !important;
    }

    /* ── Individual A4 page ── */
    .print-page {
      width: 210mm !important;
      height: 275mm !important;
      margin: 0 !important;
      box-shadow: none !important;
      border: none !important;
      box-sizing: border-box !important;
      display: flex !important;
      flex-direction: column !important;
      padding: 35px 45px 15px 45px !important;
      page-break-after: always !important;
      break-after: page !important;
    }

    .print-page:last-child {
      page-break-after: avoid !important;
      break-after: avoid !important;
    }

    .print-footer-section {
      margin-top: auto !important;
    }

    /* ── Items Table (9 Columns) ── */
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
    .print-page .items-table td:nth-child(1) { width: 5% !important; text-align: center !important; }
    .print-page .items-table th:nth-child(2),
    .print-page .items-table td:nth-child(2) { width: 8% !important; text-align: center !important; }
    .print-page .items-table th:nth-child(3),
    .print-page .items-table td:nth-child(3) { width: 15% !important; text-align: left !important; }
    .print-page .items-table th:nth-child(4),
    .print-page .items-table td:nth-child(4) { width: 35% !important; text-align: left !important; }
    .print-page .items-table th:nth-child(5),
    .print-page .items-table td:nth-child(5) { width: 7% !important; text-align: center !important; }
    .print-page .items-table th:nth-child(6),
    .print-page .items-table td:nth-child(6) { width: 7% !important; text-align: center !important; }
    .print-page .items-table th:nth-child(7),
    .print-page .items-table td:nth-child(7) { width: 10% !important; text-align: right !important; }
    .print-page .items-table th:nth-child(8),
    .print-page .items-table td:nth-child(8) { width: 6% !important; text-align: right !important; }
    .print-page .items-table th:nth-child(9),
    .print-page .items-table td:nth-child(9) { width: 7% !important; text-align: right !important; }

    /* ── Proposal Table (8 Columns) ── */
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
    .print-page .proposal-table td:nth-child(1) { width: 5% !important; text-align: center !important; }
    .print-page .proposal-table th:nth-child(2),
    .print-page .proposal-table td:nth-child(2) { width: 10% !important; text-align: center !important; }
    .print-page .proposal-table th:nth-child(3),
    .print-page .proposal-table td:nth-child(3) { width: 18% !important; text-align: center !important; }
    .print-page .proposal-table th:nth-child(4),
    .print-page .proposal-table td:nth-child(4) { width: 10% !important; text-align: center !important; }
    .print-page .proposal-table th:nth-child(5),
    .print-page .proposal-table td:nth-child(5) { width: 23% !important; text-align: left !important; }
    .print-page .proposal-table th:nth-child(6),
    .print-page .proposal-table td:nth-child(6) { width: 13% !important; text-align: center !important; }
    .print-page .proposal-table th:nth-child(7),
    .print-page .proposal-table td:nth-child(7) { width: 13% !important; text-align: center !important; }
    .print-page .proposal-table th:nth-child(8),
    .print-page .proposal-table td:nth-child(8) { width: 8% !important; text-align: right !important; }
  }
`;

const getDocTitle = (printType) => {
  switch (printType) {
    case 'sales_order': return 'ใบสั่งขาย';
    case 'delivery_order': return 'ใบส่งของ';
    default: return 'ใบเสนอราคา';
  }
};

// ─── Component ────────────────────────────────────────────────
export default function QuotationPrint({
  quotation,
  companyInfo = {},
  products = [],
  onClose,
  printType = 'quotation',
  autoPrint = false,
  autoDownloadAndEmail = false,
  autoOpenInNewTab = false,
  openedWindow = null,
  addActivityLog
}) {
  const docFormat = quotation?.documentType || 'quotation'; // 'quotation' | 'product_proposal'
  const rawItems = quotation?.items ?? [];

  const [isDownloading, setIsDownloading] = useState(false);
  const [mobileScale, setMobileScale] = useState(1);
  const autoDownloadFiredRef = useRef(false);
  const autoOpenInNewTabFiredRef = useRef(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [emailRedirectUrl, setEmailRedirectUrl] = useState('');
  const [downloadedPdfName, setDownloadedPdfName] = useState('');

  // ── Measurement refs (used to compute REAL pagination, see below) ──
  const measureHeaderRef = useRef(null);
  const measureInfoRef = useRef(null);
  const measureTableHeaderRef = useRef(null);
  const measureMiniHeaderRef = useRef(null);
  const measureFooterRef = useRef(null);
  const measureRowRefs = useRef([]);
  const [measuredPages, setMeasuredPages] = useState(null);

  useEffect(() => {
    const handleResize = () => {
      const vw = window.innerWidth;
      // width of A4 in pixels is 793.7 (approx 794)
      if (vw < 840) {
        setMobileScale((vw - 32) / 794);
      } else {
        setMobileScale(1);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── Measure real DOM heights and compute the actual page breaks ──
  // This replaces the old "guess a fixed row height" approach, which is
  // what caused a near-empty 2nd page to be printed: whenever a product
  // name wrapped onto extra lines the real row was taller than the guess,
  // so content silently overflowed page 1 even though the estimate said
  // everything "fit".
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!quotation) { setMeasuredPages(null); return; }
    if (rawItems.length === 0) { setMeasuredPages([[]]); return; }

    const headerH = measureHeaderRef.current?.offsetHeight || 0;
    const infoH = measureInfoRef.current?.offsetHeight || 0;
    const tableHeaderH = measureTableHeaderRef.current?.offsetHeight || 0;
    const miniHeaderH = measureMiniHeaderRef.current?.offsetHeight || 0;
    const footerH = measureFooterRef.current?.offsetHeight || 0;
    const rowHeights = measureRowRefs.current.map((el) => el?.offsetHeight || 0);

    const pages = [];
    let idx = 0;
    let pageNum = 1;

    while (idx < rawItems.length) {
      const isFirst = pageNum === 1;
      const staticTop = (isFirst ? headerH + infoH : miniHeaderH) + tableHeaderH;

      // 1) Would ALL remaining items fit on this page together with the footer?
      let sum = staticTop + footerH;
      let fitsAsLastPage = true;
      for (let j = idx; j < rawItems.length; j++) {
        sum += rowHeights[j] || 0;
        if (sum > PAGE_CONTENT_HEIGHT) { fitsAsLastPage = false; break; }
      }

      if (fitsAsLastPage) {
        pages.push(rawItems.slice(idx));
        break;
      }

      // 2) Otherwise, fill this page (without the footer) up to the limit.
      let sum2 = staticTop;
      let k = idx;
      while (k < rawItems.length && sum2 + (rowHeights[k] || 0) <= PAGE_CONTENT_HEIGHT) {
        sum2 += rowHeights[k] || 0;
        k++;
      }
      if (k === idx) k = idx + 1; // always make progress, even if one row alone overflows

      pages.push(rawItems.slice(idx, k));
      idx = k;
      pageNum++;
    }

    if (pages.length === 0) pages.push([]);
    setMeasuredPages(pages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotation, docFormat, rawItems.length]);

  // Trigger Google Gmail web compose redirection directly when requested
  const handleOpenEmailApp = () => {
    if (emailRedirectUrl) {
      const win = window.open(emailRedirectUrl, '_blank', 'noopener,noreferrer');
      if (!win) {
        // Fallback in case browser blocks window.open
        const a = document.createElement('a');
        a.href = emailRedirectUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { if (document.body.contains(a)) document.body.removeChild(a); }, 200);
      }
    }

    // Close the print preview overlay
    setShowSuccessModal(false);
    if (onClose) onClose();
  };

  // Lookup database products from props or fallback to localStorage
  const productsList = useMemo(() => {
    if (products && products.length > 0) return products;
    try {
      const saved = localStorage.getItem('pim_products');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }, [products]);

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

  const handleDownloadPDF = async () => {
    if (/Line/i.test(navigator.userAgent)) {
      const currentUrl = window.location.href;
      const separator = currentUrl.includes('?') ? '&' : '?';
      window.location.href = currentUrl + separator + 'openExternalBrowser=1';
      return;
    }

    const el = printAreaRef.current;
    if (!el || isDownloading) return;
    setIsDownloading(true);

    // บังคับเปลี่ยนสไตล์ของ DOM จริงแบบ Synchronous เพื่อให้ขนาดเต็มแผ่น A4 100%
    const originalTransform = el.style.transform;
    el.style.transform = 'scale(1)';

    const pages = el.querySelectorAll('.print-page');
    const originalMargins = [];
    const originalShadows = [];
    const originalHeights = [];
    pages.forEach((page) => {
      originalMargins.push(page.style.margin);
      originalShadows.push(page.style.boxShadow);
      originalHeights.push(page.style.height);
      page.style.margin = '0 auto';
      page.style.boxShadow = 'none';
      page.style.height = '296mm';
    });

    // หน่วงเวลาสั้นๆ (150ms) เพื่อให้บราวเซอร์วาด Spinner คลุมหน้าจอก่อนเริ่มดึงข้อมูล
    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      const docLabel = docFormat === 'product_proposal' ? 'ใบเสนอสินค้า' : 'ใบเสนอราคา';
      const quotationCode = quotation.referenceNumber || quotation.quotationNumber || 'document';
      const filename = `${quotationCode}.pdf`;
      setDownloadedPdfName(filename);
      await html2pdf()
        .set({
          margin: 0,
          filename,
          image: { type: 'png' },
          html2canvas: { scale: 2.5, useCORS: true, logging: false, windowWidth: 794 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: 'css' },
        })
        .from(el)
        .toPdf()
        .get('pdf')
        .then((pdf) => {
          pdf.setProperties({
            title: quotationCode
          });
        })
        .save();
      if (addActivityLog) {
        addActivityLog(`ดาวน์โหลด PDF ${docLabel} ${quotation.quotationNumber} สำเร็จ`);
      }

      if (autoDownloadAndEmail) {
        // ดาวน์โหลด PDF เสร็จเรียบร้อยแล้ว -> คำนวณลิงก์ส่งอีเมลไปยัง Google Gmail แล้วแสดงโมดอลแจ้งผลดาวน์โหลด
        const email = quotation.customer?.email || '';
        const cleanSalesName = cleanSalespersonName(quotation.salespersonName);
        const companyLines = [
          companyInfo.name || 'บริษัท พันธ์วาดี จำกัด (สำนักงานใหญ่)',
          companyInfo.address || '19/9 ซ.ทวีวัฒนา-กาญจนาภิเษก 16 แขวง/เขต ทวีวัฒนา กทม. 10170',
          `โทร: ${companyInfo.phone && companyInfo.mobile ? `${companyInfo.phone} / ${companyInfo.mobile}` : (companyInfo.phone || companyInfo.mobile || '02-4315111 / 02-0055666')}`,
          `อีเมล: ${companyInfo.email || 'info@phanvadee.co.th'}`,
          `เว็บไซต์: ${companyInfo.website ? (companyInfo.website.startsWith('http') ? companyInfo.website : `https://${companyInfo.website}`) : 'https://www.phanvadee.co.th'}`,
          `เลขประจำตัวผู้เสียภาษี: ${companyInfo.taxId || '0105546026064'}`
        ].join('\n');

        const subject = encodeURIComponent(`[${docLabel}] เลขที่ ${quotation.quotationNumber || quotation.id} - โครงการ ${quotation.projectName || '-'}`);
        const body = encodeURIComponent(`เรียนคุณ ${quotation.customer?.name || 'ลูกค้า'}${quotation.customer?.companyName ? ` (${quotation.customer.companyName})` : ''},\n\nเรื่อง: นำเสนอ${docLabel} เลขที่ ${quotation.quotationNumber || quotation.id}\n\nทางเรามีความยินดีเป็นอย่างยิ่งที่ได้รับโอกาสในการนำเสนอราคาสำหรับโครงการ "${quotation.projectName || '-'}"\n\nรายละเอียดรายการสินค้า ยอดรวม และเงื่อนไขการค้าต่างๆ ปรากฏตามเอกสาร${docLabel}แนบ PDF ในอีเมลฉบับนี้\n\nหากท่านมีข้อสงสัยประการใด โปรดติดต่อกลับที่เบอร์โทร ${quotation.salespersonPhone || '-'}\n\nขอแสดงความนับถืออย่างสูง\n${cleanSalesName || 'ผู้ประสานงานขาย'}\n\n${companyLines}`);

        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${subject}&body=${body}`;
        setEmailRedirectUrl(gmailUrl);
        setShowSuccessModal(true); // แสดงโมดอลให้ผู้ใช้งานทราบว่าดาวน์โหลดเรียบร้อยแล้ว
      }
    } catch (err) {
      console.error('PDF download failed:', err);
    } finally {
      // คืนค่าสไตล์เดิมของหน้าจอ (Synchronous)
      el.style.transform = originalTransform;
      pages.forEach((page, idx) => {
        page.style.margin = originalMargins[idx];
        page.style.boxShadow = originalShadows[idx];
        page.style.height = originalHeights[idx];
      });
      setIsDownloading(false);
    }
  };

  // ── เปิดเอกสารในแท็บใหม่ ──────────────────────────────────────
  const handleOpenPDFInNewTab = async () => {
    if (/Line/i.test(navigator.userAgent)) {
      const currentUrl = window.location.href;
      const separator = currentUrl.includes('?') ? '&' : '?';
      window.location.href = currentUrl + separator + 'openExternalBrowser=1';
      return;
    }

    const el = printAreaRef.current;
    if (!el) return;

    const quotationCode = quotation.referenceNumber || quotation.quotationNumber || 'document';
    // ใช้รหัสใบเสนอราคาล้วนๆ เป็นชื่อไฟล์ (ไม่มีคำนำหน้า) ส่วน docTitle ใช้แสดงหัวข้อแท็บ/ไฟล์ที่ดาวน์โหลด
    const docTitle = quotationCode;

    // Target window pointer
    let targetWindow = openedWindow;

    // If not opened from listing or was closed, open it now synchronously to avoid popup blocker
    if (!targetWindow || targetWindow.closed) {
      targetWindow = window.open('/pdf-viewer.html', '_blank');
    }

    // ถ้าเบราว์เซอร์บล็อกป็อปอัพ ให้แจ้งเตือนแล้วหยุดการทำงานทันที
    if (!targetWindow) {
      console.error('Popup blocked: unable to open pdf-viewer.html');
      alert('เบราว์เซอร์บล็อกการเปิดแท็บใหม่ กรุณาอนุญาตป็อปอัพสำหรับเว็บไซต์นี้แล้วลองอีกครั้ง');
      return;
    }

    // Temporarily adjust scale and margins of printable element for html2pdf
    const originalTransform = el.style.transform;
    el.style.transform = 'scale(1)';

    const pages = el.querySelectorAll('.print-page');
    const originalMargins = [];
    const originalShadows = [];
    const originalHeights = [];
    pages.forEach((page) => {
      originalMargins.push(page.style.margin);
      originalShadows.push(page.style.boxShadow);
      originalHeights.push(page.style.height);
      page.style.margin = '0 auto';
      page.style.boxShadow = 'none';
      page.style.height = '296mm';
    });


    try {
      // Generate PDF Blob
      const blob = await html2pdf()
        .set({
          margin: 0,
          filename: `${docTitle}.pdf`,
          image: { type: 'png' },
          html2canvas: { scale: 2.5, useCORS: true, logging: false, windowWidth: 794 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: 'css' },
        })
        .from(el)
        .toPdf()
        .get('pdf')
        .then((pdf) => {
          pdf.setProperties({
            title: docTitle
          });
        })
        .outputPdf('blob');

      const blobUrl = URL.createObjectURL(blob);

      // ── ฟังก์ชันที่ขาดหายไปในโค้ดเดิม: ส่ง PDF blob URL ไปให้แท็บที่เปิดไว้ ──
      const sendPdfToWindow = () => {
        if (targetWindow && !targetWindow.closed) {
          targetWindow.postMessage(
            { type: 'load-pdf', url: blobUrl, title: docTitle },
            window.location.origin
          );
        }
      };

      // Set up a listener for 'viewer-ready' message in case the window isn't ready yet
      const messageListener = (event) => {
        if (event.origin !== window.location.origin) return;
        if (event.data && event.data.type === 'viewer-ready') {
          sendPdfToWindow();
          window.removeEventListener('message', messageListener);
        }
      };
      window.addEventListener('message', messageListener);

      // Also try sending immediately in case it's already loaded (e.g. from listing tab delay)
      sendPdfToWindow();

      if (autoOpenInNewTab && onClose) {
        onClose();
      }
    } catch (err) {
      console.error('Failed to open PDF in new tab:', err);
      if (targetWindow && !targetWindow.closed) {
        targetWindow.close();
      }
    } finally {
      // Restore styles
      el.style.transform = originalTransform;
      pages.forEach((page, idx) => {
        page.style.margin = originalMargins[idx];
        page.style.boxShadow = originalShadows[idx];
        page.style.height = originalHeights[idx];
      });
    }
  };

  // Auto download and email if requested — ใช้ ref ป้องกัน fire ซ้ำจาก re-render
  useEffect(() => {
    if (autoDownloadAndEmail && quotation && measuredPages && !autoDownloadFiredRef.current) {
      autoDownloadFiredRef.current = true;
      const timer = setTimeout(() => {
        handleDownloadPDF();
      }, 800);
      return () => clearTimeout(timer);
    }
  });

  // Auto open PDF in new tab — fire on mount, no overlay interaction needed
  useEffect(() => {
    if (autoOpenInNewTab && quotation && measuredPages && !autoOpenInNewTabFiredRef.current) {
      const timer = setTimeout(() => {
        if (printAreaRef.current) {
          autoOpenInNewTabFiredRef.current = true;
          handleOpenPDFInNewTab();
        }
      }, 200); // รอให้ portal render ครบก่อนดึง innerHTML
      return () => clearTimeout(timer);
    }
  });

  // Auto print if requested (e.g. for email attachment flow)
  useEffect(() => {
    if (autoPrint && quotation && quotation.status === 'approved' && measuredPages) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoPrint, quotation, measuredPages]);

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

  const items = quotation?.items ?? [];
  const customer = quotation?.customer ?? {};
  const subtotal = Number(quotation?.subtotal) || 0;
  const vatAmount = Number(quotation?.vatAmount) || 0;
  const totalAmount = Number(quotation?.totalAmount) || 0;
  const vatRate = quotation?.vatRate ?? 7;

  // ── Real pagination, computed from measured DOM heights above ──
  // Fallback (before the measurement effect has run at least once) is a
  // single page — this avoids ever flashing/printing an extra blank page
  // just because measurement hasn't completed yet.
  const paginatedPages = measuredPages || (items.length ? [items] : [[]]);

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
    name: companyInfo.name || 'บริษัท พันธ์วาดี จำกัด (สำนักงานใหญ่)',
    address: companyInfo.address || '19/9 ซ.ทวีวัฒนา-กาญจนาภิเษก 16 แขวง/เขต ทวีวัฒนา กทม. 10170',
    taxId: companyInfo.taxId || '0105546026064',
    phone: companyInfo.phone || '02-4315111',
    mobile: companyInfo.mobile || '02-0055666',
    email: companyInfo.email || '',
    website: companyInfo.website || 'www.phanvadee.com',
  };

  // colors matching the reference design
  const ACCENT = '#111111ff'; // Black Accent
  const DARK = '#111111';
  const GRAY = '#555557';
  const BORDER = '#e2e8f0';

  const isAutoOpen = autoOpenInNewTab;

  // ── Shared render helpers ──────────────────────────────────
  // Used BOTH by the hidden measurement layer and the real printable pages,
  // so what we measure is guaranteed to be identical to what gets printed.

  const renderHeaderBlock = () => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
      {/* Left: Company Details */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {/* Logo (Custom uploaded image or Vector SVG) */}
        <div style={{ flexShrink: 0, marginTop: '-4px' }}>
          {companyInfo.logo ? (
            <img src={companyInfo.logo} alt="Logo" style={{ width: 62, height: 62, objectFit: 'contain' }} />
          ) : (
            <svg viewBox="0 0 160 160" style={{ width: 62, height: 62, fill: '#1d1d1f' }} xmlns="http://www.w3.org/2000/svg">
              <path d="M 60 48 L 60 36 L 100 21 L 100 33 Z" />
              <path d="M 60 70 L 60 58 L 100 43 L 100 55 Z" />
              <path d="M 60 92 L 60 80 L 100 65 L 100 77 Z" />
              <text x="80" y="115" fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif" fontWeight="900" fontSize="19.5" textAnchor="middle" letterSpacing="0.4">PHANVADEE</text>
              <text x="80" y="132" fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif" fontWeight="500" fontSize="9.5" textAnchor="middle" letterSpacing="0.1">think global, act local</text>
            </svg>
          )}
        </div>
        <div style={{ fontSize: '10.5px', color: DARK, lineHeight: 1.5 }}>
          <div style={{ fontWeight: 800, fontSize: '13px', color: '#000', lineHeight: 1.25 }}>{co.name || co.nameEn}</div>
          {co.name && co.nameEn && <div style={{ fontSize: '10.5px', fontWeight: 600, color: '#333', marginBottom: 2 }}>{co.nameEn}</div>}
          <div style={{ color: GRAY }}>{co.address}</div>
          <div>โทร: {co.phone}{co.mobile ? ` / ${co.mobile}` : ''}</div>
          {co.email && <div>อีเมล: {co.email}</div>}
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
        {isExpiredQuotation(quotation) && (
          <div style={{
            display: 'inline-block',
            marginTop: '6px',
            padding: '2px 8px',
            borderRadius: '4px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.02em',
          }}>
            เอกสารนี้หมดอายุแล้ว (EXPIRED)
          </div>
        )}
      </div>
    </div>
  );

  const renderMiniHeaderBlock = () => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1.5px solid ${DARK}`, paddingBottom: 6, marginBottom: 16 }}>
      <span style={{ fontWeight: 800, fontSize: '10px', color: DARK }}>{co.name}</span>
      <span style={{ fontSize: '10px', color: GRAY, display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>{docFormat === 'product_proposal' ? 'ใบเสนอสินค้า' : getDocTitle(printType)} เลขที่: {quotation.referenceNumber || quotation.quotationNumber}</span>
        {isExpiredQuotation(quotation) && (
          <span style={{ color: '#dc2626', fontWeight: 700, fontSize: '9px', backgroundColor: '#fef2f2', padding: '1px 5px', borderRadius: '3px', border: '1px solid #fecaca' }}>
            หมดอายุแล้ว
          </span>
        )}
      </span>
    </div>
  );

  const renderInfoBlock = () => (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20, tableLayout: 'fixed' }}>
      <tbody>
        <tr>
          {/* Left Column: Customer details */}
          <td style={{ width: '50%', padding: '0 15px 0 0', verticalAlign: 'top', border: 'none' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <tbody>
                <tr>
                  <td style={{ width: '110px', fontWeight: 700, color: '#000000', padding: '3px 0', border: 'none', verticalAlign: 'top' }}>ชื่อลูกค้า</td>
                  <td style={{ padding: '3px 0', border: 'none', color: DARK }}>{customer.name || '-'}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 700, color: '#000000', padding: '3px 0', border: 'none', verticalAlign: 'top' }}>บริษัท</td>
                  <td style={{ padding: '3px 0', border: 'none', color: DARK }}>{customer.companyName || '-'}</td>
                </tr>
                {(customer.branch || quotation.customerBranch) && (
                  <tr>
                    <td style={{ fontWeight: 700, color: '#000000', padding: '3px 0', border: 'none', verticalAlign: 'top' }}>
                      {(customer.branch || quotation.customerBranch) === 'สำนักงานใหญ่' ? 'สำนักงานใหญ่' : 'สาขา'}
                    </td>
                    <td style={{ padding: '3px 0', border: 'none', color: DARK }}>{customer.branch || quotation.customerBranch}</td>
                  </tr>
                )}
                {customer.contactPerson && (
                  <tr>
                    <td style={{ fontWeight: 700, color: '#000000', padding: '3px 0', border: 'none' }}>ผู้ติดต่อ</td>
                    <td style={{ padding: '3px 0', border: 'none' }}>{customer.contactPerson}</td>
                  </tr>
                )}
                <tr>
                  <td style={{ fontWeight: 700, color: '#000000', padding: '3px 0', verticalAlign: 'top', border: 'none' }}>ที่อยู่</td>
                  <td style={{ padding: '3px 0', border: 'none', lineHeight: 1.5 }}>{customer.address || '-'}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 700, color: '#000000', padding: '3px 0', border: 'none' }}>เลขผู้เสียภาษี</td>
                  <td style={{ padding: '3px 0', border: 'none' }}>{customer.taxId || '-'}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 700, color: '#000000', padding: '3px 0', border: 'none' }}>โทรศัพท์</td>
                  <td style={{ padding: '3px 0', border: 'none' }}>{customer.phone || '-'}</td>
                </tr>
                {customer.email && (
                  <tr>
                    <td style={{ fontWeight: 700, color: '#000000', padding: '3px 0', border: 'none' }}>อีเมล</td>
                    <td style={{ padding: '3px 0', border: 'none' }}>{customer.email}</td>
                  </tr>
                )}
                {(customer.note || quotation.customerNote) && (
                  <tr>
                    <td style={{ fontWeight: 700, color: '#000000', padding: '3px 0', border: 'none', verticalAlign: 'top' }}>หมายเหตุ</td>
                    <td style={{ padding: '3px 0', border: 'none', color: DARK, lineHeight: 1.4 }}>{customer.note || quotation.customerNote}</td>
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
                  <td style={{ width: '110px', fontWeight: 700, color: '#000000', padding: '3px 0', border: 'none' }}>ชื่อผู้ขาย</td>
                  <td style={{ padding: '3px 0', border: 'none' }}>{quotation.salespersonName || '-'}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 700, color: '#000000', padding: '3px 0', border: 'none' }}>เบอร์ติดต่อ</td>
                  <td style={{ padding: '3px 0', border: 'none' }}>{quotation.salespersonPhone || '-'}</td>
                </tr>
                {quotation.projectName && (
                  <tr>
                    <td style={{ fontWeight: 700, color: '#000000', padding: '3px 0', border: 'none' }}>ชื่อโปรเจกต์</td>
                    <td style={{ padding: '3px 0', border: 'none' }}>{quotation.projectName}</td>
                  </tr>
                )}
                <tr>
                  <td style={{ fontWeight: 700, color: '#000000', padding: '3px 0', border: 'none' }}>เลขที่เอกสาร</td>
                  <td style={{ padding: '3px 0', border: 'none', color: DARK }}>{quotation.referenceNumber || quotation.quotationNumber || '-'}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 700, color: '#000000', padding: '3px 0', border: 'none' }}>วันที่ออกเอกสาร</td>
                  <td style={{ padding: '3px 0', border: 'none' }}>{fmtDate(quotation.issuedDate)}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 700, color: '#000000', padding: '3px 0', border: 'none' }}>ใช้ได้ถึงวันที่</td>
                  <td style={{ padding: '3px 0', border: 'none' }}>
                    {fmtDate(quotation.validUntilDate)}
                    {isExpiredQuotation(quotation) && (
                      <span style={{
                        marginLeft: '8px',
                        display: 'inline-block',
                        padding: '1px 6px',
                        borderRadius: '3px',
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fecaca',
                        color: '#dc2626',
                        fontSize: '9px',
                        fontWeight: 700,
                      }}>
                        หมดอายุแล้ว
                      </span>
                    )}
                  </td>
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
  );

  const renderProposalTableHeaderRow = () => (
    <tr style={{ background: ACCENT, color: '#fff' }}>
      <th style={{ width: '5%', padding: '8px 10px', fontWeight: 700, fontSize: '11px', textAlign: 'center', border: 'none' }}>ลำดับ</th>
      <th style={{ width: '10%', padding: '8px 10px', fontWeight: 700, fontSize: '11px', textAlign: 'center', border: 'none' }}>รหัสสินค้า</th>
      <th style={{ width: '20%', padding: '8px 10px', fontWeight: 700, fontSize: '11px', textAlign: 'center', border: 'none' }}>บาร์โค้ด</th>
      <th style={{ width: '10%', padding: '8px 10px', fontWeight: 700, fontSize: '11px', textAlign: 'center', border: 'none' }}>ภาพสินค้า</th>
      <th style={{ width: '23%', padding: '8px 10px', fontWeight: 700, fontSize: '11px', textAlign: 'left', border: 'none' }}>ชื่อสินค้า</th>
      <th style={{ width: '11%', padding: '8px 10px', fontWeight: 700, fontSize: '11px', textAlign: 'center', border: 'none' }}>ขนาด</th>
      <th style={{ width: '11%', padding: '8px 10px', fontWeight: 700, fontSize: '11px', textAlign: 'center', border: 'none' }}>น้ำหนัก</th>
      <th style={{ width: '10%', padding: '8px 10px', fontWeight: 700, fontSize: '11px', textAlign: 'right', border: 'none' }}>ราคา</th>
    </tr>
  );

  const renderQuotationTableHeaderRow = () => (
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
  );

  const renderProposalRow = (item, globalIdx, rowRef) => {
    const details = getProductDetails(item.productCode);
    const itemBarcode = item.barcode || details.barcode || item.productCode || '';
    const itemSize = item.size || details.size;
    const itemWeight = item.weight || '';
    const qtyPart = item.quantity > 1 ? ` x${item.quantity}` : '';

    return (
      <tr key={item.id || globalIdx} ref={rowRef} style={{ borderBottom: `1px solid ${BORDER}` }}>
        <td style={{ padding: '8px 10px', textAlign: 'center', color: GRAY }}>{globalIdx + 1}</td>
        <td style={{ padding: '8px 10px', textAlign: 'center', color: DARK, fontSize: '10.5px' }}>
          {item.productCode || '—'}
        </td>
        <td style={{ padding: '6px 4px', textAlign: 'center', verticalAlign: 'middle' }}>
          <BarcodeDisplay value={itemBarcode} height={48} maxWidth={170} fontSize={12} />
        </td>
        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
          {item.productImage ? (
            <div style={{ width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', background: '#fafafa', borderRadius: '8px', border: `1px solid ${BORDER}`, padding: '2px', overflow: 'hidden' }}>
              <img
                src={item.productImage}
                alt=""
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
                  display: 'block'
                }}
              />
            </div>
          ) : (
            <span style={{ color: '#ccc', fontSize: '10px' }}>—</span>
          )}
        </td>
        <td style={{ padding: '8px 10px', textAlign: 'left' }}>

          <div style={{ fontWeight: 'bold', color: '#000' }}>{item.productName}{qtyPart}</div>
          {item.description && (
            <div style={{ color: GRAY, fontSize: '10px', marginTop: 2, whiteSpace: 'pre-line' }}>{item.description}</div>
          )}
        </td>
        <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '500', color: DARK }}>{itemSize || '—'}</td>
        <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '500', color: DARK }}>{itemWeight || '—'}</td>
        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 'bold', color: DARK }}>฿{fmt(item.unitPrice)}</td>
      </tr>
    );
  };

  const renderQuotationRow = (item, globalIdx, rowRef) => {
    const discountDisplay = item.discount > 0
      ? (item.discountType === 'percent' ? `${item.discount}%` : fmt(item.discount))
      : '0';

    return (
      <tr key={item.id || globalIdx} ref={rowRef} style={{ borderBottom: `1px solid ${BORDER}` }}>
        <td style={{ padding: '8px 10px', textAlign: 'center', color: GRAY }}>{globalIdx + 1}</td>
        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
          {item.productImage ? (
            <div style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', background: '#fafafa', borderRadius: '4px', border: `1px solid ${BORDER}`, padding: '2px', overflow: 'hidden' }}>
              <img
                src={item.productImage}
                alt=""
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
                  display: 'block'
                }}
              />
            </div>
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
  };

  const renderFooterBlock = () => (
    <div className="print-footer-section" style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', pageBreakInside: 'avoid', breakInside: 'avoid' }}>

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 12, fontSize: '10px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
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
          <div style={{ width: '230px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {(companyInfo.signatureImage || companyInfo.stampImage) ? (
              <div style={{ height: '42px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', width: '100%', marginBottom: 2 }}>
                <img src={companyInfo.signatureImage || companyInfo.stampImage} alt="Signature" style={{ maxHeight: '42px', maxWidth: '150px', objectFit: 'contain' }} />
              </div>
            ) : null}
            <div style={{ borderBottom: '1px dotted #111', width: '100%', marginBottom: 6, height: (companyInfo.signatureImage || companyInfo.stampImage) ? '0px' : '36px' }} />
            <div style={{ fontWeight: 'bold', fontSize: '10.5px', color: DARK, marginTop: 4 }}>
              {companyInfo.signerTitle || 'ผู้อนุมัติ'}
            </div>
            <div style={{ fontSize: '10px', color: DARK, marginTop: 12, textAlign: 'center', width: '100%' }}>
              วันที่ {quotation.issuedDate ? fmtDate(quotation.issuedDate) : '.....................................................................'}
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION 6 FOR PRODUCT PROPOSAL: AUTHORIZED SIGNATURE ── */}
      {docFormat === 'product_proposal' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 12, fontSize: '10px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: '230px', textAlign: 'center' }}>
            {(companyInfo.signatureImage || companyInfo.stampImage) ? (
              <div style={{ height: '42px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', width: '100%', marginBottom: 2 }}>
                <img src={companyInfo.signatureImage || companyInfo.stampImage} alt="Signature" style={{ maxHeight: '42px', maxWidth: '150px', objectFit: 'contain' }} />
              </div>
            ) : null}
            <div style={{ borderBottom: '1px dotted #111', width: '100%', marginBottom: 6, height: (companyInfo.signatureImage || companyInfo.stampImage) ? '0px' : '36px' }} />
            <div style={{ fontWeight: 'bold', fontSize: '10.5px', color: DARK }}>
              {companyInfo.signerTitle || 'ผู้อนุมัติ'}
            </div>

            {/* Date Box */}
            <div style={{ fontSize: '10px', color: DARK, width: '100%', textAlign: 'center', marginTop: 12 }}>
              วันที่ {quotation.issuedDate ? fmtDate(quotation.issuedDate) : '.....................................................................'}
            </div>
          </div>
        </div>
      )}

    </div>
  );

  return createPortal(
    <div
      className="print-portal-wrapper"
      style={isAutoOpen ? {
        position: 'fixed',
        left: '-9999px',
        top: '-9999px',
        width: '210mm',
        height: '296.5mm',
        overflow: 'hidden',
        zIndex: -1,
        opacity: 0,
        pointerEvents: 'none'
      } : {
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#64748b',
        overflow: 'auto'
      }}
    >
      <style>{PRINT_CSS}</style>

      {/* ── HIDDEN MEASUREMENT LAYER ──────────────────────────
          Renders every item once with the exact same markup used on the
          real pages, off-screen. We read the real offsetHeight of each
          piece in a useLayoutEffect above and use THAT (not a guess) to
          decide how many items actually fit per A4 sheet. */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: '-99999px',
          width: '210mm',
          boxSizing: 'border-box',
          padding: '35px 45px 15px 45px',
          fontFamily: "'Sarabun', 'Helvetica Neue', Arial, sans-serif",
          fontSize: '11px',
          color: DARK,
          visibility: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <div ref={measureHeaderRef}>{renderHeaderBlock()}</div>
        {docFormat === 'quotation' && <div ref={measureInfoRef}>{renderInfoBlock()}</div>}
        <div ref={measureMiniHeaderRef}>{renderMiniHeaderBlock()}</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead ref={measureTableHeaderRef}>
            {docFormat === 'product_proposal' ? renderProposalTableHeaderRow() : renderQuotationTableHeaderRow()}
          </thead>
          <tbody>
            {/* eslint-disable-next-line react-hooks/refs */}
            {rawItems.map((item, i) =>
              docFormat === 'product_proposal'
                ? renderProposalRow(item, i, (el) => (measureRowRefs.current[i] = el))
                : renderQuotationRow(item, i, (el) => (measureRowRefs.current[i] = el))
            )}
          </tbody>
        </table>
        <div ref={measureFooterRef}>{renderFooterBlock()}</div>
      </div>

      {/* Loading Overlay — แสดงเฉพาะเมื่อกำลังดาวน์โหลดในโหมดแมนนวลเท่านั้น (ซ่อนในโหมดเปิดแท็บใหม่ปกติ) */}
      {(!isAutoOpen && isDownloading) && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgb(15, 23, 42)',  /* ทึบ 100% — ไม่เห็นเอกสารด้านหลังเลย */
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontFamily: "'Sarabun', sans-serif",
            gap: 16
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              border: '4px solid rgba(255, 255, 255, 0.1)',
              borderTop: '4px solid #0071e3',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}
          />
          <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          <div style={{ fontWeight: 700, fontSize: 16 }}>กำลังเตรียมไฟล์ PDF...</div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>กรุณารอสักครู่ ระบบกำลังจัดทำหน้าเอกสาร A4</div>
        </div>
      )}

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
            <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: '0.01em' }}>ตัวอย่าง{docFormat === 'product_proposal' ? 'ใบเสนอสินค้า' : getDocTitle(printType)}</div>
            <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 2 }}>{quotation.quotationNumber} · {customer.name}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={() => {
              window.print();
              if (addActivityLog) {
                const docLabel = docFormat === 'product_proposal' ? 'ใบเสนอสินค้า' : 'ใบเสนอราคา';
                addActivityLog(`พิมพ์เอกสาร (${docLabel}) เลขที่: ${quotation.referenceNumber || quotation.quotationNumber} ของลูกค้า ${customer.name || '-'}`);
              }
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff',
              fontWeight: 700, fontSize: 12.5, padding: '9px 18px',
              borderRadius: 10, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'background 0.2s, transform 0.1s',
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Printer size={15} />
            พิมพ์เอกสาร
          </button>

          {/* ── ปุ่มเปิด PDF ในแท็บใหม่ ── */}
          <button
            type="button"
            onClick={handleOpenPDFInNewTab}
            style={{
              background: '#0e9f6e', border: 'none', color: '#fff',
              fontWeight: 700, fontSize: 12.5, padding: '9px 18px',
              borderRadius: 10, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: '0 4px 12px rgba(14, 159, 110, 0.3)',
              transition: 'background 0.2s, transform 0.1s, box-shadow 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#057a55';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(14, 159, 110, 0.45)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#0e9f6e';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(14, 159, 110, 0.3)';
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <ExternalLink size={15} />
            เปิด PDF
          </button>

          <button
            type="button"
            onClick={handleDownloadPDF}
            style={{
              background: '#0071e3', border: 'none', color: '#fff',
              fontWeight: 700, fontSize: 12.5, padding: '9px 18px',
              borderRadius: 10, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: '0 4px 12px rgba(0, 113, 227, 0.3)',
              transition: 'background 0.2s, transform 0.1s, box-shadow 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#0077ed';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 113, 227, 0.45)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#0071e3';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 113, 227, 0.3)';
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Download size={15} />
            ดาวน์โหลด PDF
          </button>
        </div>
      </div>

      {/* ── Printable Pages Container ── */}
      <div
        className="print-preview-wrapper"
        style={{
          width: `${794 * mobileScale}px`,
          margin: '24px auto',
          overflow: 'visible'
        }}
      >
        <div
          ref={printAreaRef}
          className="print-pages-container"
          style={{
            margin: '0',
            width: '210mm',
            transformOrigin: 'top left',
            transform: `scale(${mobileScale})`
          }}
        >
          {paginatedPages.map((pageItems, pageIdx) => {
            const isFirstPage = pageIdx === 0;
            const isLastPage = pageIdx === paginatedPages.length - 1;

            return (
              <div
                key={pageIdx}
                className="print-page"
                style={{
                  width: '210mm',
                  height: '296.5mm',
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
                {isFirstPage ? renderHeaderBlock() : renderMiniHeaderBlock()}

                {/* ── SECTION 2: CUSTOMER & METADATA GRID (2 Columns, Only on Page 1) ── */}
                {isFirstPage && docFormat === 'quotation' && renderInfoBlock()}

                {docFormat === 'product_proposal' ? (
                  <table className="proposal-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20, tableLayout: 'fixed' }}>
                    <thead>{renderProposalTableHeaderRow()}</thead>
                    <tbody>
                      {pageItems.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: GRAY, borderBottom: `1px solid ${BORDER}` }}>— ไม่มีรายการสินค้า —</td>
                        </tr>
                      ) : pageItems.map((item) => {
                        const globalIdx = items.findIndex(x => x.id === item.id);
                        return renderProposalRow(item, globalIdx);
                      })}
                    </tbody>
                  </table>
                ) : (
                  <table className="items-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20, tableLayout: 'fixed' }}>
                    <thead>{renderQuotationTableHeaderRow()}</thead>
                    <tbody>
                      {pageItems.length === 0 ? (
                        <tr>
                          <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: GRAY, borderBottom: `1px solid ${BORDER}` }}>— ไม่มีรายการสินค้า —</td>
                        </tr>
                      ) : pageItems.map((item) => {
                        const globalIdx = items.findIndex(x => x.id === item.id);
                        return renderQuotationRow(item, globalIdx);
                      })}
                    </tbody>
                  </table>
                )}

                {/* ── SECTION 4, 5, 6: SUMMARY, NOTE, SIGNATURES (Only on Last Page) ── */}
                {isLastPage && renderFooterBlock()}

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
      </div>

      {/* Download Success & Email Redirect Confirmation Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-fade-in" style={{ fontFamily: "'Sarabun', sans-serif" }}>
          <div className="bg-white rounded-3xl border border-[#d2d2d7]/50 max-w-sm w-full p-6 shadow-2xl animate-scale-in text-center flex flex-col items-center gap-4 text-[#1d1d1f]">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center animate-bounce">
              <Download className="w-7 h-7" />
            </div>
            <div className="w-full">
              <h2 className="font-extrabold text-sm uppercase tracking-wide text-emerald-600 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> ดาวน์โหลด PDF สำเร็จแล้ว!
              </h2>
              {downloadedPdfName && (
                <div className="my-2.5 py-1.5 px-3 bg-slate-100 rounded-xl text-[11px] font-mono font-bold text-slate-700 truncate border border-slate-200">
                  📄 {downloadedPdfName}
                </div>
              )}
              <div className="text-xs text-[#555557] mt-2 leading-relaxed text-left bg-blue-50/70 p-3 rounded-xl border border-blue-100/70 space-y-1">
                <p className="font-bold text-blue-900">💡 ขั้นตอนการส่ง:</p>
                <p>1. กดปุ่มสีแดง <span className="font-semibold text-red-600">"เปิด Google Gmail"</span> ด้านล่าง</p>
                <p>2. ในหน้าต่าง Gmail ให้คลิกไอคอนคลิปหนีบกระดาษ <b>📎 แนบไฟล์</b> แล้วเลือกไฟล์ PDF เพื่อส่งได้ทันที</p>
              </div>
            </div>
            <div className="flex gap-2.5 w-full text-xs font-bold mt-2">
              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  if (onClose) onClose();
                }}
                className="flex-1 py-2.5 border border-[#d2d2d7] rounded-xl hover:bg-[#f5f5f7] cursor-pointer text-zinc-600 transition-colors"
              >
                ปิดหน้านี้
              </button>
              <button
                type="button"
                onClick={handleOpenEmailApp}
                className="flex-1 py-2.5 bg-[#ea4335] hover:bg-[#d93025] text-white rounded-xl cursor-pointer transition-colors shadow-xs flex items-center justify-center gap-1.5 font-bold"
              >
                <Mail className="w-4 h-4" />
                เปิด Google Gmail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}