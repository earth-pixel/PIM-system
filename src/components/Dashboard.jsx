import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Package, 
  Award, 
  FolderKanban, 
  FileText, 
  X, 
  BarChart3, 
  Table as TableIcon, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  RotateCcw,
  Eye
} from 'lucide-react';
import { createPortal } from 'react-dom';

const THAI_REGIONS = [
  'ภาคกลาง',
  'ภาคเหนือ',
  'ภาคตะวันออกเฉียงเหนือ',
  'ภาคตะวันออก',
  'ภาคตะวันตก',
  'ภาคใต้'
];

const getDocCustName = (q) => {
  return q.customer?.name || q.customerName || q.custName || '-';
};

const getDocOfficeName = (q, customersList = []) => {
  const c = q.customer;
  const comp = c?.companyName || q.customerCompany;
  if (comp && comp.trim()) return comp.trim();
  if (customersList && customersList.length > 0 && (c?.name || q.customerId)) {
    const matched = customersList.find(cust => cust.name === c?.name || cust.id === q.customerId);
    if (matched?.companyName && matched.companyName.trim()) return matched.companyName.trim();
  }
  return '-';
};

const getDocBranch = (q, customersList = []) => {
  const c = q.customer;
  const branch = c?.branch || q.customerBranch;
  const branchName = c?.branchName;
  const branchType = c?.branchType;

  // 1. Direct from quotation customer branch
  if (branch && branch.trim()) {
    const isSub = branchType === 'sub' || (!branch.includes('สำนักงานใหญ่') && branch !== 'Head Office');
    if (isSub) {
      return branchName ? `สาขา ${branchName}` : (branch.startsWith('สาขา') ? branch : `สาขา ${branch}`);
    }
    return 'สำนักงานใหญ่';
  }

  // 2. If branchType is sub
  if (branchType === 'sub') {
    return branchName ? `สาขา ${branchName}` : 'สาขาย่อย';
  }

  // 3. Fallback from customer master list
  if (customersList && customersList.length > 0 && (c?.name || q.customerId)) {
    const matched = customersList.find(cust => cust.name === c?.name || cust.id === q.customerId);
    if (matched) {
      const mSub = matched.branchType === 'sub' || (matched.branch && !matched.branch.includes('สำนักงานใหญ่'));
      if (mSub) {
        return matched.branchName ? `สาขา ${matched.branchName}` : (matched.branch || 'สาขาย่อย');
      }
      return matched.branch || 'สำนักงานใหญ่';
    }
  }

  // Default to Head Office if customer/company is present
  if (c?.companyName || q.customerCompany || c?.name) {
    return 'สำนักงานใหญ่';
  }

  return '-';
};

const getDocRegion = (q, customersList = []) => {
  const r = q.customer?.region || q.customerRegion || q.custRegion;
  if (r && r.trim() && r !== '-') return r.trim();
  const cName = q.customer?.name || q.custName;
  const cId = q.customerId;
  if (customersList && customersList.length > 0 && (cName || cId)) {
    const matched = customersList.find(cust => (cName && cust.name === cName) || (cId && cust.id === cId));
    if (matched?.region && matched.region.trim() && matched.region.trim() !== '-') return matched.region.trim();
  }

  // Address inference for Thai regions
  const addr = (q.customer?.address || q.customerAddress || q.custAddr || '').trim();
  if (addr) {
    if (/(กรุงเทพ|นนทบุรี|ปทุมธานี|สมุทรปราการ|สมุทรสาคร|สมุทรสงคราม|นครปฐม|อยุธยา|สระบุรี|ลพบุรี|ชัยนาท|สิงห์บุรี|อ่างทอง|นครนายก|สุพรรณบุรี)/.test(addr)) {
      return 'ภาคกลาง';
    }
    if (/(เชียงใหม่|เชียงราย|ลำปาง|ลำพูน|แม่ฮ่องสอน|พะเยา|น่าน|แพร่|อุตรดิตถ์|ตาก|สุโขทัย|พิษณุโลก|พิจิตร|กำแพงเพชร|เพชรบูรณ์|นครสวรรค์|อุทัยธานี)/.test(addr)) {
      return 'ภาคเหนือ';
    }
    if (/(ขอนแก่น|นครราชสีมา|โคราช|อุดรธานี|อุบลราชธานี|บุรีรัมย์|สุรินทร์|ร้อยเอ็ด|ศรีสะเกษ|ชัยภูมิ|มหาสารคาม|สกลนคร|นครพนม|กาฬสินธุ์|มุกดาหาร|หนองคาย|เลย|อำนาจเจริญ|หนองบัวลำภู|บึงกาฬ|ยโสธร)/.test(addr)) {
      return 'ภาคตะวันออกเฉียงเหนือ';
    }
    if (/(ชลบุรี|ระยอง|จันทบุรี|ตราด|ฉะเชิงเทรา|ปราจีนบุรี|สระแก้ว)/.test(addr)) {
      return 'ภาคตะวันออก';
    }
    if (/(กาญจนบุรี|ราชบุรี|เพชรบุรี|ประจวบคีรีขันธ์|ประจวบ)/.test(addr)) {
      return 'ภาคตะวันตก';
    }
    if (/(สงขลา|ภูเก็ต|สุราษฎร์ธานี|นครศรีธรรมราช|กระบี่|พังงา|ตรัง|พัทลุง|สตูล|ชุมพร|ระนอง|ปัตตานี|ยะลา|นราธิวาส)/.test(addr)) {
      return 'ภาคใต้';
    }
  }

  return '-';
};

const getRegionBadgeClass = (region) => {
  switch (region) {
    case 'ภาคกลาง':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'ภาคเหนือ':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'ภาคตะวันออกเฉียงเหนือ':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'ภาคตะวันออก':
      return 'bg-teal-50 text-teal-700 border-teal-200';
    case 'ภาคตะวันตก':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'ภาคใต้':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    default:
      return 'bg-zinc-100 text-zinc-600 border-zinc-200';
  }
};

const formatMoney = (value) => Number(value || 0).toLocaleString('th-TH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('th-TH');
};

const getCustAddress = (q) => q?.customerAddress || q?.customer?.address || q?.custAddr || '';
const getCustTaxId = (q) => q?.customerTaxId || q?.customer?.taxId || q?.custTax || '';

const STATUS_CONFIG = {
  approved: {
    label: 'อนุมัติแล้ว',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
  },
  sent: {
    label: 'รอการอนุมัติ',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500 animate-pulse',
  },
  draft: {
    label: 'แบบร่าง',
    bg: 'bg-zinc-100',
    text: 'text-zinc-700',
    border: 'border-zinc-300',
    dot: 'bg-zinc-400',
  },
  rejected: {
    label: 'ไม่อนุมัติ',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
  }
};

export default function Dashboard({ products, brands, categories, quotations = [], setActiveTab, currentUser, users = [], customers = [] }) {
  // Check if a quotation belongs to a specific user
  const isDocOfUser = (q, targetUser) => {
    if (!targetUser) return false;
    const username = typeof targetUser === 'string' ? targetUser : targetUser.username;
    const name = typeof targetUser === 'string' ? '' : (targetUser.name || '');
    const creator = (q.createdBy || '').toLowerCase();
    const salesName = (q.salespersonName || '').toLowerCase();
    const uLower = (username || '').toLowerCase();
    const nLower = (name || '').toLowerCase();

    return (uLower && (creator === uLower || salesName.includes(uLower))) ||
           (nLower && salesName.includes(nLower));
  };

  // Check if a quotation belongs to an Admin user
  const isDocOfAdmin = (q) => {
    const creator = (q.createdBy || '').toLowerCase();
    const salesName = (q.salespersonName || '').toLowerCase();

    // Check if creator or salesperson matches any user with role 'admin'
    const hasAdmin = users.some(u => u.role === 'admin' && (
      (u.username && (creator === u.username.toLowerCase() || salesName.includes(u.username.toLowerCase()))) ||
      (u.name && salesName.includes(u.name.toLowerCase()))
    ));
    if (hasAdmin) return true;

    // Check if creator or salesperson matches any user with other roles (manager, user, etc.)
    const hasNonAdmin = users.some(u => u.role !== 'admin' && (
      (u.username && (creator === u.username.toLowerCase() || salesName.includes(u.username.toLowerCase()))) ||
      (u.name && salesName.includes(u.name.toLowerCase()))
    ));
    if (hasNonAdmin) return false;

    // Fallback: if creator is 'admin' or system/empty, treat as admin
    return creator === 'admin' || creator === 'administrator' || !creator || creator === 'system';
  };

  const isAdmin = currentUser?.role === 'admin';
  const isExecutive = currentUser?.role === 'admin' || currentUser?.role === 'manager';

  // Quotations for Dashboard Overview (Charts & Pivot Table):
  // - Admin / ผู้บริหาร (Admin & Manager): เห็นของทุกคน (All Staff) ทั้งระบบ แค่หน้า dashboard
  // - Role อื่น (User ทั่วไป): เห็นเฉพาะของตัวเอง
  const displayQuotations = useMemo(() => {
    if (!currentUser) return quotations;
    if (isExecutive) {
      return quotations;
    }
    return quotations.filter(q => isDocOfUser(q, currentUser));
  }, [quotations, currentUser, isExecutive]);

  // Personal quotations for KPI card at the top ("ยกเว้นอันนี้ดูของตัวเอง")
  const myQuotations = useMemo(() => {
    if (!currentUser) return quotations;
    if (!isAdmin) {
      return quotations.filter(q => isDocOfUser(q, currentUser));
    }
    return quotations.filter(q => isDocOfAdmin(q));
  }, [quotations, currentUser, isAdmin, users]);

  // Stats calculations (Overall static stats)
  const totalProducts = products.length;
  const activeProducts = useMemo(() => products.filter(p => p.status === 'Active').length, [products]);
  const totalBrands = brands.length;
  const totalCategories = categories.length;
  const totalMyQuotations = myQuotations.length;
  const approvedMyQuotations = useMemo(() => myQuotations.filter(q => q.status === 'approved').length, [myQuotations]);

  // Dynamic Chart States
  const [chartType, setChartType] = useState('brand'); // 'brand' | 'category'
  const [timeframe, setTimeframe] = useState('30d');   // '7d' | '30d'
  const [chartDisplay, setChartDisplay] = useState('bar'); // 'bar' | 'line'
  
  // Helper to get formatted date string relative to today
  const getTodayStr = () => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  const get30DaysAgoStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };

  // Custom Date Range Picker States  
  const [isCustomRange, setIsCustomRange] = useState(false);
  const [startDateStr, setStartDateStr] = useState(get30DaysAgoStr);
  const [endDateStr, setEndDateStr] = useState(getTodayStr);
  const [selectedDetailGroup, setSelectedDetailGroup] = useState(null);

  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 256 });

  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width: width || 600, height: height || 256 });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Timeframe calculation logic
  const dateRange = useMemo(() => {
    const currentDate = new Date();
    let start, end;
    if (isCustomRange) {
      start = new Date(startDateStr + 'T00:00:00');
      end = new Date(endDateStr + 'T23:59:59');
    } else {
      const days = timeframe === '7d' ? 7 : 30;
      end = new Date(currentDate);
      start = new Date(currentDate);
      start.setDate(start.getDate() - days + 1);
      start.setHours(0, 0, 0, 0);
    }
    return { start, end };
  }, [isCustomRange, startDateStr, endDateStr, timeframe]);

  const rangeStart = dateRange.start;
  const rangeEnd = dateRange.end;

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const rawDate = p.updatedAt || p.createdAt;
      if (!rawDate) return true;
      const pDate = new Date(rawDate);
      if (isNaN(pDate.getTime())) return true;
      return pDate >= rangeStart && pDate <= rangeEnd;
    });
  }, [products, rangeStart, rangeEnd]);

  // Aggregate data depending on selected tab
  // Aggregate data depending on selected tab
  const aggregatedData = useMemo(() => {
    return chartType === 'brand'
      ? brands.map(brand => ({
          name: brand,
          fullName: brand,
          count: filteredProducts.filter(p => p.brand === brand).length,
        }))
      : categories.map(cat => {
          let displayName = cat;
          if (cat.includes(' - ')) {
            const rawPart = cat.split(' - ')[0].trim();
            displayName = rawPart.replace(/\band\b/gi, '&');
          } else if (cat.includes('-')) {
            const rawPart = cat.split('-')[0].trim();
            displayName = rawPart.replace(/\band\b/gi, '&');
          }
          return {
            name: displayName,
            fullName: cat,
            count: filteredProducts.filter(p => p.category === cat).length,
          };
        });
  }, [chartType, brands, categories, filteredProducts]);

  const realMaxCount = useMemo(() => Math.max(...aggregatedData.map(d => d.count), 0), [aggregatedData]);
  
  // Calculate clean, readable round max scale with headroom so peak data and tooltips never touch the ceiling
  const calculateNiceMax = (realMax) => {
    if (realMax <= 0) return 4;
    if (realMax <= 3) return 4;
    const targetWithHeadroom = realMax * 1.25;
    const targetSteps = 4;
    const rawStep = targetWithHeadroom / targetSteps;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const normalized = rawStep / magnitude;
    let niceStep;
    if (normalized <= 1) niceStep = 1 * magnitude;
    else if (normalized <= 1.25) niceStep = 1.25 * magnitude;
    else if (normalized <= 1.5) niceStep = 1.5 * magnitude;
    else if (normalized <= 2) niceStep = 2 * magnitude;
    else if (normalized <= 2.5) niceStep = 2.5 * magnitude;
    else if (normalized <= 3) niceStep = 3 * magnitude;
    else if (normalized <= 4) niceStep = 4 * magnitude;
    else if (normalized <= 5) niceStep = 5 * magnitude;
    else niceStep = 10 * magnitude;

    let niceMax = Math.ceil(niceStep * targetSteps);
    while (niceMax <= realMax) {
      niceMax += niceStep;
    }
    return niceMax;
  };

  const maxCount = useMemo(() => calculateNiceMax(realMaxCount), [realMaxCount]);
  const N = aggregatedData.length;

  const svgPoints = useMemo(() => {
    return aggregatedData.map((d, i) => {
      const x = N > 0 ? (i + 0.5) * (dimensions.width / N) : 0;
      const y = maxCount > 0 ? dimensions.height * (1 - d.count / maxCount) : dimensions.height;
      return { x, y, name: d.name, fullName: d.fullName, count: d.count };
    });
  }, [aggregatedData, N, dimensions, maxCount]);

  // Build ultra-smooth Fritsch-Carlson monotone cubic spline with edge lead-in from baseline 0
  const buildSmoothPath = (pts, width, height) => {
    if (!pts || pts.length === 0) return '';
    const baselineY = height !== undefined ? height : (pts[0] ? pts[0].y : 0);

    if (pts.length === 1) {
      const p = pts[0];
      const cp1x = p.x / 2;
      const cp1y = baselineY;
      const cp2x = p.x / 2;
      const cp2y = p.y;
      return `M 0 ${baselineY.toFixed(1)} C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p.x.toFixed(1)} ${p.y.toFixed(1)} L ${width} ${p.y.toFixed(1)}`;
    }

    const extendedPts = [
      { x: 0, y: baselineY },
      ...pts,
      { x: width, y: pts[pts.length - 1].y }
    ];

    const n = extendedPts.length;
    const dx = [];
    const dy = [];
    const m = [];
    for (let i = 0; i < n - 1; i++) {
      const curDx = extendedPts[i + 1].x - extendedPts[i].x;
      const curDy = extendedPts[i + 1].y - extendedPts[i].y;
      dx.push(curDx);
      dy.push(curDy);
      m.push(curDy / (curDx || 1));
    }

    // Start with slope 0 at baseline (0, baselineY) so the curve departs flat and smoothly ascends
    const slopes = [0];
    for (let i = 0; i < n - 2; i++) {
      if (m[i] * m[i + 1] <= 0) {
        slopes.push(0);
      } else {
        const p = dx[i] + dx[i + 1];
        slopes.push(3 * p / ((p + dx[i + 1]) / m[i] + (p + dx[i]) / m[i + 1]));
      }
    }
    slopes.push(m[n - 2]);

    let path = `M ${extendedPts[0].x.toFixed(1)} ${extendedPts[0].y.toFixed(1)}`;
    for (let i = 0; i < n - 1; i++) {
      const p0 = extendedPts[i];
      const p1 = extendedPts[i + 1];
      const cp1x = p0.x + dx[i] / 3;
      const cp1y = p0.y + slopes[i] * dx[i] / 3;
      const cp2x = p1.x - dx[i] / 3;
      const cp2y = p1.y - slopes[i + 1] * dx[i] / 3;
      path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
    }
    return path;
  };

  const smoothLinePath = useMemo(() => buildSmoothPath(svgPoints, dimensions.width, dimensions.height), [svgPoints, dimensions.width, dimensions.height]);
  const smoothAreaPath = useMemo(() => {
    return smoothLinePath
      ? `${smoothLinePath} L ${dimensions.width} ${dimensions.height} L 0 ${dimensions.height} Z`
      : '';
  }, [smoothLinePath, dimensions.width, dimensions.height]);

  const modalProducts = useMemo(() => {
    if (!selectedDetailGroup) return [];
    const { type, name } = selectedDetailGroup;
    return filteredProducts.filter(p => type === 'brand' ? p.brand === name : p.category === name);
  }, [filteredProducts, selectedDetailGroup]);

  const formatDateForInput = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };

  // ── Quotation Statistics & Pivot Table Logic ──
  // กรองเฉพาะใบเสนอราคาอย่างเดียว (ไม่รวมใบเสนอสินค้า product_proposal)
  const quotationDocsOnly = useMemo(() => {
    return displayQuotations.filter(q => q.documentType !== 'product_proposal');
  }, [displayQuotations]);

  // Quotation Bar Chart States
  // Quotation Bar Chart States
  const [qtChartType, setQtChartType] = useState('region'); // 'region' | 'status' | 'month'
  const [qtTimeframe, setQtTimeframe] = useState('30d');     // '7d' | '30d'
  const [isQtCustomRange, setIsQtCustomRange] = useState(false);
  const [qtStartDateStr, setQtStartDateStr] = useState(get30DaysAgoStr);
  const [qtEndDateStr, setQtEndDateStr] = useState(getTodayStr);

  const qtDateRange = useMemo(() => {
    const currentDate = new Date();
    let start, end;
    if (isQtCustomRange) {
      start = new Date(qtStartDateStr + 'T00:00:00');
      end = new Date(qtEndDateStr + 'T23:59:59');
    } else {
      const days = qtTimeframe === '7d' ? 7 : 30;
      end = new Date(currentDate);
      start = new Date(currentDate);
      start.setDate(start.getDate() - days + 1);
      start.setHours(0, 0, 0, 0);
    }
    return { start, end };
  }, [isQtCustomRange, qtStartDateStr, qtEndDateStr, qtTimeframe]);

  const qtRangeStart = qtDateRange.start;
  const qtRangeEnd = qtDateRange.end;

  // Timeframe filtered quotations for chart and table
  const timeframeQuotations = useMemo(() => {
    return quotationDocsOnly.filter(q => {
      const rawDate = q.issuedDate || q.createdAt || q.date;
      if (!rawDate) return true;
      const qDate = new Date(rawDate);
      if (isNaN(qDate.getTime())) return true;
      return qDate >= qtRangeStart && qDate <= qtRangeEnd;
    });
  }, [quotationDocsOnly, qtRangeStart, qtRangeEnd]);

  // Aggregated data for quotation bar chart
  const quotationBarData = useMemo(() => {
    if (qtChartType === 'region') {
      const allRegions = THAI_REGIONS;
      const baseData = allRegions.map(reg => {
        const count = timeframeQuotations.filter(q => getDocRegion(q, customers) === reg).length;
        return {
          name: reg,
          fullName: reg,
          count,
          gradient: reg === 'ภาคกลาง' ? 'from-[#0284c7] to-[#38bdf8]' :
                    reg === 'ภาคเหนือ' ? 'from-[#7c3aed] to-[#a855f7]' :
                    reg === 'ภาคตะวันออกเฉียงเหนือ' ? 'from-[#d97706] to-[#f59e0b]' :
                    reg === 'ภาคตะวันออก' ? 'from-[#0d9488] to-[#14b8a6]' :
                    reg === 'ภาคตะวันตก' ? 'from-[#4f46e5] to-[#6366f1]' :
                    reg === 'ภาคใต้' ? 'from-[#059669] to-[#10b981]' :
                    'from-[#71717a] to-[#a1a1aa]'
        };
      });

      const unassignedCount = timeframeQuotations.filter(q => {
        const r = getDocRegion(q, customers);
        return !r || r === '-' || !THAI_REGIONS.includes(r);
      }).length;

      if (unassignedCount > 0) {
        baseData.push({
          name: 'ไม่ระบุภาค',
          fullName: 'ไม่ระบุภาค',
          count: unassignedCount,
          gradient: 'from-[#64748b] to-[#94a3b8]'
        });
      }

      return baseData;
    } else if (qtChartType === 'branch') {
      const branchMap = new Map();
      timeframeQuotations.forEach(q => {
        const b = getDocBranch(q, customers);
        const name = b && b !== '-' ? b : 'สำนักงานใหญ่';
        branchMap.set(name, (branchMap.get(name) || 0) + 1);
      });
      const sorted = Array.from(branchMap.entries()).sort((a, b) => {
        if (a[0] === 'สำนักงานใหญ่') return -1;
        if (b[0] === 'สำนักงานใหญ่') return 1;
        return b[1] - a[1];
      });
      return sorted.map(([name, count]) => ({
        name,
        fullName: name,
        count,
        gradient: name === 'สำนักงานใหญ่'
          ? 'from-[#0284c7] to-[#38bdf8]'
          : 'from-[#d97706] to-[#f59e0b]'
      }));
    } else if (qtChartType === 'status') {
      const statuses = [
        { key: 'approved', name: 'อนุมัติแล้ว', gradient: 'from-[#059669] to-[#10b981]' },
        { key: 'sent', name: 'รอการอนุมัติ', gradient: 'from-[#d97706] to-[#f59e0b]' },
        { key: 'draft', name: 'แบบร่าง', gradient: 'from-[#71717a] to-[#a1a1aa]' },
        { key: 'rejected', name: 'ไม่อนุมัติ', gradient: 'from-[#e11d48] to-[#f43f5e]' }
      ];
      return statuses.map(s => ({
        name: s.name,
        fullName: s.name,
        key: s.key,
        count: timeframeQuotations.filter(q => (q.status || 'draft') === s.key).length,
        gradient: s.gradient
      }));
    } else {
      // Month (recent 6 months)
      const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
      const now = new Date();
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = d.getMonth();
        const label = `${monthNames[m]} ${String(y + 543).slice(-2)}`;
        months.push({ y, m, name: label, fullName: `${monthNames[m]} ${y + 543}` });
      }
      return months.map(m => ({
        name: m.name,
        fullName: m.fullName,
        count: timeframeQuotations.filter(q => {
          const rawDate = q.issuedDate || q.createdAt;
          if (!rawDate) return false;
          const d = new Date(rawDate);
          return d.getFullYear() === m.y && d.getMonth() === m.m;
        }).length,
        gradient: 'from-[#0071e3] to-[#38bdf8]'
      }));
    }
  }, [qtChartType, timeframeQuotations, customers]);

  const qtRealMax = useMemo(() => Math.max(...quotationBarData.map(d => d.count), 0), [quotationBarData]);
  const qtMaxCount = useMemo(() => calculateNiceMax(qtRealMax), [qtRealMax]);

  const [qtChartDisplay, setQtChartDisplay] = useState('bar'); // 'bar' | 'line'
  const qtContainerRef = useRef(null);
  const [qtDimensions, setQtDimensions] = useState({ width: 600, height: 200 });

  useEffect(() => {
    if (!qtContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setQtDimensions({ width: width || 600, height: height || 200 });
      }
    });
    observer.observe(qtContainerRef.current);
    return () => observer.disconnect();
  }, []);

  const qtSvgPoints = useMemo(() => {
    const n = quotationBarData.length;
    return quotationBarData.map((d, i) => {
      const x = n > 0 ? (i + 0.5) * (qtDimensions.width / n) : 0;
      const y = qtMaxCount > 0 ? qtDimensions.height * (1 - d.count / qtMaxCount) : qtDimensions.height;
      return { x, y, name: d.name, fullName: d.fullName, count: d.count };
    });
  }, [quotationBarData, qtDimensions, qtMaxCount]);

  const qtSmoothLinePath = useMemo(() => buildSmoothPath(qtSvgPoints, qtDimensions.width, qtDimensions.height), [qtSvgPoints, qtDimensions.width, qtDimensions.height]);
  const qtSmoothAreaPath = useMemo(() => {
    return qtSmoothLinePath
      ? `${qtSmoothLinePath} L ${qtDimensions.width} ${qtDimensions.height} L 0 ${qtDimensions.height} Z`
      : '';
  }, [qtSmoothLinePath, qtDimensions.width, qtDimensions.height]);

  // Pivot Table States
  const [selectedPivotRegion, setSelectedPivotRegion] = useState(null);
  const [pivotSearch, setPivotSearch] = useState('');
  const [pivotPage, setPivotPage] = useState(1);
  const pivotPageSize = 10;
  const pivotTableRef = useRef(null);
  const [viewingInsightQuotation, setViewingInsightQuotation] = useState(null);

  // Region counts for Pivot filter chips
  const regionCounts = useMemo(() => {
    const counts = { 'ทั้งหมด': timeframeQuotations.length };
    THAI_REGIONS.forEach(r => {
      counts[r] = timeframeQuotations.filter(q => getDocRegion(q, customers) === r).length;
    });
    const unassignedCount = timeframeQuotations.filter(q => {
      const r = getDocRegion(q, customers);
      return !r || r === '-' || !THAI_REGIONS.includes(r);
    }).length;
    if (unassignedCount > 0) {
      counts['ไม่ระบุภาค'] = unassignedCount;
    }
    return counts;
  }, [timeframeQuotations, customers]);

  // Filtered documents for Pivot Table
  const filteredPivotDocs = useMemo(() => {
    return timeframeQuotations.filter(q => {
      // Region filter
      if (selectedPivotRegion && selectedPivotRegion !== 'ทั้งหมด') {
        const r = getDocRegion(q, customers);
        if (selectedPivotRegion === 'ไม่ระบุภาค') {
          if (r && r !== '-' && THAI_REGIONS.includes(r)) return false;
        } else {
          if (r !== selectedPivotRegion) return false;
        }
      }
      // Search keyword filter
      if (pivotSearch.trim()) {
        const query = pivotSearch.trim().toLowerCase();
        const qNum = (q.quotationNumber || q.id || '').toLowerCase();
        const cName = getDocCustName(q).toLowerCase();
        const oName = getDocOfficeName(q, customers).toLowerCase();
        const bName = getDocBranch(q, customers).toLowerCase();
        const reg = getDocRegion(q, customers).toLowerCase();
        if (!qNum.includes(query) && !cName.includes(query) && !oName.includes(query) && !bName.includes(query) && !reg.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [timeframeQuotations, selectedPivotRegion, pivotSearch, customers]);

  const totalPivotPages = Math.ceil(filteredPivotDocs.length / pivotPageSize) || 1;
  const paginatedPivotDocs = useMemo(() => {
    const start = (pivotPage - 1) * pivotPageSize;
    return filteredPivotDocs.slice(start, start + pivotPageSize);
  }, [filteredPivotDocs, pivotPage, pivotPageSize]);

  const handleBarClick = (item) => {
    if (qtChartType === 'region') {
      if (selectedPivotRegion === item.name) {
        setSelectedPivotRegion(null);
      } else {
        setSelectedPivotRegion(item.name);
        setPivotPage(1);
        if (pivotTableRef.current) {
          pivotTableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    } else if (qtChartType === 'branch') {
      if (pivotSearch === item.name) {
        setPivotSearch('');
      } else {
        setPivotSearch(item.name);
        setPivotPage(1);
        if (pivotTableRef.current) {
          pivotTableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-4 sm:gap-6 lg:gap-8 animate-fade-in text-[#1d1d1f] pb-8 lg:pb-0">

      {/* ─── KPI Cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">

        {/* Total Products — Blue accent */}
        <div
          onClick={() => { setActiveTab('manage-products'); }}
          role="button" tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTab('manage-products'); } }}
          className="relative overflow-hidden bg-white px-3 py-3 sm:px-4 sm:py-3.5 rounded-2xl border border-blue-100 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 shadow-sm hover:shadow-[0_12px_30px_rgba(0, 113, 227,0.15)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer select-none group premium-card-shine"
        >
          {/* Decorative bg circle */}
          <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-blue-50/60 group-hover:bg-blue-100/50 transition-colors duration-300" />
          {/* Left accent bar */}
          <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-gradient-to-b from-blue-400 to-blue-600" />
          {/* Icon */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white shrink-0 shadow-sm shadow-blue-300/40">
            <Package className="w-4 h-4" />
          </div>
          <div className="min-w-0 relative">
            <p className="text-[9px] font-semibold text-blue-400 uppercase tracking-widest truncate">สินค้าทั้งหมด</p>
            <h3 className="text-2xl font-extrabold text-[#1d1d1f] leading-none tracking-tight">{totalProducts}</h3>
            <p className="text-[9px] text-[#8e8e93] flex items-center gap-1 mt-0.5 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block shrink-0" />
              เปิดใช้งาน {activeProducts} รายการ
            </p>
          </div>
        </div>

        {/* Brands — Purple accent */}
        <div
          onClick={() => setActiveTab('brands')}
          role="button" tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTab('brands'); } }}
          className="relative overflow-hidden bg-white px-3 py-3 sm:px-4 sm:py-3.5 rounded-2xl border border-purple-100 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 shadow-sm hover:shadow-[0_12px_30px_rgba(147,51,234,0.15)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer select-none group premium-card-shine"
        >
          <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-purple-50/60 group-hover:bg-purple-100/50 transition-colors duration-300" />
          <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-gradient-to-b from-purple-400 to-purple-600" />
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white shrink-0 shadow-sm shadow-purple-300/40">
            <Award className="w-4 h-4" />
          </div>
          <div className="min-w-0 relative">
            <p className="text-[9px] font-semibold text-purple-400 uppercase tracking-widest truncate">แบรนด์สินค้า</p>
            <h3 className="text-2xl font-extrabold text-[#1d1d1f] leading-none tracking-tight">{totalBrands}</h3>
            <p className="text-[9px] text-[#8e8e93] mt-0.5 truncate">จำแนกตามแบรนด์</p>
          </div>
        </div>

        {/* Categories — Amber accent */}
        <div
          onClick={() => setActiveTab('categories')}
          role="button" tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTab('categories'); } }}
          className="relative overflow-hidden bg-white px-3 py-3 sm:px-4 sm:py-3.5 rounded-2xl border border-amber-100 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 shadow-sm hover:shadow-[0_12px_30px_rgba(245,158,11,0.15)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer select-none group premium-card-shine"
        >
          <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-amber-50/60 group-hover:bg-amber-100/50 transition-colors duration-300" />
          <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-gradient-to-b from-amber-400 to-orange-500" />
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shrink-0 shadow-sm shadow-amber-300/40">
            <FolderKanban className="w-4 h-4" />
          </div>
          <div className="min-w-0 relative">
            <p className="text-[9px] font-semibold text-amber-500 uppercase tracking-widest truncate">หมวดหมู่สินค้า</p>
            <h3 className="text-2xl font-extrabold text-[#1d1d1f] leading-none tracking-tight">{totalCategories}</h3>
            <p className="text-[9px] text-[#8e8e93] mt-0.5 truncate">จำแนกตามหมวดหมู่</p>
          </div>
        </div>

        {/* Quotations — Emerald/Teal accent */}
        <div
          onClick={() => setActiveTab('quotations')}
          role="button" tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTab('quotations'); } }}
          className="relative overflow-hidden bg-white px-3 py-3 sm:px-4 sm:py-3.5 rounded-2xl border border-emerald-100 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 shadow-sm hover:shadow-[0_12px_30px_rgba(16,185,129,0.15)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer select-none group premium-card-shine"
        >
          <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-emerald-50/60 group-hover:bg-emerald-100/50 transition-colors duration-300 pointer-events-none" />
          <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-gradient-to-b from-emerald-400 to-teal-500" />
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shrink-0 shadow-sm shadow-emerald-300/40">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0 relative flex-1 w-full">
            <div className="flex items-center justify-between gap-1">
              <p className="text-[9px] font-semibold text-emerald-500 uppercase tracking-widest truncate">
                ใบเสนอราคา
              </p>
            </div>
            <h3 className="text-2xl font-extrabold text-[#1d1d1f] leading-none tracking-tight mt-0.5">{totalMyQuotations}</h3>
            <p className="text-[9px] text-[#8e8e93] mt-0.5 truncate">
              อนุมัติแล้ว {approvedMyQuotations} รายการ
            </p>
          </div>
        </div>

      </div>

      {/* ─── Chart Card ──────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/50 shadow-xs flex-1 flex flex-col">

        {/* Chart card top bar */}
        <div className="px-6 pt-6 pb-4 border-b border-[#f0f0f5] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-[#1d1d1f] tracking-wide uppercase">
              สถิติสินค้าแยกตาม{chartType === 'brand' ? 'แบรนด์' : 'หมวดหมู่สินค้า'}
            </h4>
           
          </div>

          {/* Toggle pill group */}
          <div className="flex flex-wrap items-center gap-2">

            {/* Chart Type Toggle */}
            <div className="relative bg-[#f5f5f7] p-0.5 rounded-lg border border-[#d2d2d7]/50 flex items-center w-32 sm:w-36">
              <div 
                className="absolute top-0.5 bottom-0.5 left-0.5 rounded-md bg-white shadow-xs transition-transform duration-250 ease-out pointer-events-none"
                style={{
                  width: 'calc(50% - 2px)',
                  transform: chartType === 'category' ? 'translateX(100%)' : 'translateX(0)'
                }}
              />
              {[['brand', 'แบรนด์'], ['category', 'หมวดหมู่']].map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setChartType(val)}
                  className={`relative z-10 flex-1 py-1 text-[10px] sm:text-xs font-bold transition-colors duration-200 cursor-pointer text-center ${
                    chartType === val ? 'text-black' : 'text-[#555557] hover:text-black'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Timeframe preset toggle (7 วัน / 30 วัน) */}
            <div className="relative bg-[#f5f5f7] p-0.5 rounded-lg border border-[#d2d2d7]/50 flex items-center w-28 sm:w-32">
              <div 
                className="absolute top-0.5 bottom-0.5 left-0.5 rounded-md bg-white shadow-xs transition-all duration-250 ease-out pointer-events-none"
                style={{
                  width: 'calc(50% - 2px)',
                  transform: timeframe === '30d' ? 'translateX(100%)' : 'translateX(0)',
                  opacity: isCustomRange ? 0 : 1,
                  scale: isCustomRange ? 0.95 : 1
                }}
              />
              {[['7d', '7 วัน'], ['30d', '30 วัน']].map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    setIsCustomRange(false);
                    setTimeframe(val);
                  }}
                  className={`relative z-10 flex-1 py-1 text-[10px] sm:text-xs font-bold transition-colors duration-200 cursor-pointer text-center ${
                    !isCustomRange && timeframe === val
                      ? 'text-black'
                      : 'text-[#555557] hover:text-black'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Custom Date Range Picker - Standard HTML5 inputs */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <input
                type="date"
                value={isCustomRange ? startDateStr : formatDateForInput(rangeStart)}
                onChange={(e) => {
                  if (e.target.value) {
                    setStartDateStr(e.target.value);
                    setIsCustomRange(true);
                  }
                }}
                className="text-[11px] sm:text-xs font-bold bg-[#f5f5f7] border border-[#d2d2d7]/50 rounded-xl px-2.5 py-1 text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all cursor-pointer shadow-xs dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
              />
              <span className="text-[10px] font-bold text-zinc-400">ถึง</span>
              <input
                type="date"
                value={isCustomRange ? endDateStr : formatDateForInput(rangeEnd)}
                onChange={(e) => {
                  if (e.target.value) {
                    setEndDateStr(e.target.value);
                    setIsCustomRange(true);
                  }
                }}
                className="text-[11px] sm:text-xs font-bold bg-[#f5f5f7] border border-[#d2d2d7]/50 rounded-xl px-2.5 py-1 text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all cursor-pointer shadow-xs dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
              />
            </div>

          </div>
        </div>

        {/* Chart body */}
        <div className="px-4 sm:px-6 pb-5 pt-6 flex-1 flex flex-col min-h-0 overflow-x-auto scrollbar-thin">

          {/* ── Bar/Line chart wrapper ─────────────────────────── */}
          <div className="relative flex-1 flex flex-col min-h-[290px] min-w-[640px] lg:min-w-0">

            {/* Top area: Y-axis scale + Chart Plot Area */}
            <div className="relative flex-1 flex min-h-[230px]">
              
              {/* Y-axis Labels Column */}
              <div className="w-9 sm:w-11 shrink-0 relative select-none pointer-events-none">
                {[100, 75, 50, 25, 0].map((pct) => (
                  <div 
                    key={pct} 
                    className="absolute right-2 -translate-y-1/2 text-[10px] sm:text-[11px] font-semibold text-[#8e8e93] font-mono leading-none text-right"
                    style={{ top: `${(100 - pct)}%` }}
                  >
                    {Math.round((pct / 100) * maxCount).toLocaleString()}
                  </div>
                ))}
              </div>

              {/* Chart Plot Area (Grid lines, SVG line, Bars) */}
              <div className="relative flex-1 min-h-0" ref={containerRef}>
                
                {/* Horizontal Guide Lines */}
                <div className="absolute inset-0 pointer-events-none">
                  {[100, 75, 50, 25, 0].map(pct => (
                    <div 
                      key={pct} 
                      className={`absolute left-0 right-0 ${pct === 0 ? 'border-b border-[#d2d2d7]' : 'border-b border-dashed border-[#f0f0f5]'}`}
                      style={{ top: `${(100 - pct)}%` }}
                    />
                  ))}
                </div>

                {/* Line Chart Graphic */}
                <div 
                  className={`absolute inset-0 transition-all duration-500 ease-in-out ${
                    chartDisplay === 'line' ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
                  }`}
                >
                  <svg
                    className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
                    viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
                  >
                    <defs>
                      <linearGradient id="lineAreaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#0071e3" stopOpacity="0.12" />
                        <stop offset="50%"  stopColor="#0071e3" stopOpacity="0.04" />
                        <stop offset="100%" stopColor="#0071e3" stopOpacity="0" />
                      </linearGradient>

                      <linearGradient id="lineStrokeGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%"   stopColor="#00c6ff" />
                        <stop offset="50%"  stopColor="#0071e3" />
                        <stop offset="100%" stopColor="#7000ff" />
                      </linearGradient>

                      <filter id="lineGlow" x="-10%" y="-60%" width="120%" height="220%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>

                      <clipPath id="chartClip">
                        <rect x="0" y="0" width={dimensions.width} height={dimensions.height} />
                      </clipPath>
                    </defs>

                    {/* Area fill */}
                    {smoothAreaPath && (
                      <path
                        d={smoothAreaPath}
                        fill="url(#lineAreaGradient)"
                        clipPath="url(#chartClip)"
                      />
                    )}

                    {/* Glow layer */}
                    {smoothLinePath && (
                      <path
                        d={smoothLinePath}
                        fill="none"
                        stroke="#0071e3"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.25"
                        filter="url(#lineGlow)"
                      />
                    )}

                    {/* Main stroke */}
                    {smoothLinePath && (
                      <path
                        d={smoothLinePath}
                        fill="none"
                        stroke="url(#lineStrokeGradient)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                  </svg>

                  {/* Data Points along the line (Interactive Tooltip on the real points) */}
                  <div className={`absolute inset-0 ${chartDisplay === 'line' ? 'pointer-events-auto z-30' : 'pointer-events-none z-10'}`}>
                    {svgPoints.map((p, idx) => {
                      if (p.count === 0 && N > 5) return null;
                      const leftPercent = dimensions.width > 0 ? (p.x / dimensions.width) * 100 : 0;
                      const topPercent = dimensions.height > 0 ? (p.y / dimensions.height) * 100 : 0;
                      return (
                        <div
                          key={idx}
                          onClick={() => setSelectedDetailGroup({ type: chartType, name: p.fullName || p.name })}
                          style={{
                            left: `${leftPercent}%`,
                            top: `${topPercent}%`,
                          }}
                          className="group/point absolute -translate-x-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center cursor-pointer pointer-events-auto z-30 select-none"
                        >
                          {/* Sleek Apple-style Tooltip with smart ceiling flipping */}
                          <div className={`
                            absolute ${topPercent < 22 ? 'top-full mt-2.5' : 'bottom-full mb-2.5'} left-1/2 -translate-x-1/2
                            text-[11px] font-medium text-white
                            px-3 py-1.5 rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.25)]
                            opacity-0 scale-90 translate-y-1
                            group-hover/point:opacity-100 group-hover/point:scale-100 group-hover/point:translate-y-0
                            transition-all duration-150 ease-out pointer-events-none whitespace-nowrap z-50
                            bg-[#1d1d1f]/95 backdrop-blur-md border border-white/15
                          `}>
                            <span className="text-zinc-300 mr-1.5">{p.fullName || p.name}:</span>
                            <span className="text-[#38bdf8] font-bold">{p.count.toLocaleString()}</span>
                            <span className="text-zinc-400 text-[10px] ml-1">รายการ</span>
                            <div className={`absolute ${topPercent < 22 ? 'bottom-full border-b-4 border-b-[#1d1d1f]' : 'top-full border-t-4 border-t-[#1d1d1f]'} left-1/2 -translate-x-1/2 border-x-4 border-x-transparent`} />
                          </div>

                          {/* The Real Dot on the line with Apple-like hover ring */}
                          <div className="w-2.5 h-2.5 rounded-full bg-[#0071e3] border-2 border-white shadow-[0_1px_4px_rgba(0,0,0,0.25)] group-hover/point:scale-125 group-hover/point:ring-4 group-hover/point:ring-[#0071e3]/25 group-hover/point:shadow-[0_2px_10px_rgba(0,113,227,0.5)] transition-all duration-150 relative z-10" />
                          <div
                            className="absolute w-5 h-5 rounded-full bg-[#0071e3]/20 animate-pulse-ring transition-transform duration-150"
                            style={{ animationDelay: `${idx * 0.12}s` }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bars & Hover tooltips */}
                <div className={`absolute inset-0 flex items-end ${chartDisplay === 'bar' ? 'pointer-events-auto z-20' : 'pointer-events-none z-10'}`}>
                  {aggregatedData.map(({ name, fullName, count }, idx) => {
                    const heightPercent = maxCount > 0 ? (count / maxCount) * 100 : 0;
                    return (
                      <div
                        key={name}
                        className="flex-1 flex flex-col items-center justify-end h-full group relative min-w-0"
                        style={{ animationDelay: `${idx * 60}ms` }}
                      >
                        {/* Bar content */}
                        {chartDisplay === 'bar' && (
                          <div 
                            onClick={() => setSelectedDetailGroup({ type: chartType, name: fullName || name })}
                            className="w-[60%] sm:w-[45%] max-w-[38px] h-full flex flex-col justify-end cursor-pointer pointer-events-auto relative z-10"
                          >
                            {/* Bar wrapper sized precisely to heightPercent */}
                            <div
                              style={{
                                height: `${Math.max(heightPercent, count > 0 ? 1.5 : 0)}%`,
                                transition: 'height 0.6s cubic-bezier(0.34,1.2,0.64,1)',
                              }}
                              className="w-full relative group/bar"
                            >
                              {/* Hover Tooltip - Positioned directly above the bar top or inside if near ceiling */}
                              <div className={`
                                absolute ${heightPercent > 82 ? 'top-2' : 'bottom-full mb-2'} left-1/2 -translate-x-1/2
                                text-[10px] font-bold text-white
                                px-2.5 py-1 rounded-lg shadow-2xl
                                opacity-0 scale-90 translate-y-1
                                group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0
                                transition-all duration-150 ease-out pointer-events-none whitespace-nowrap z-50
                                bg-[#1d1d1f] border border-white/10
                              `}>
                                <span className="text-zinc-300 mr-1">{fullName || name}:</span>
                                <span className="text-[#38bdf8] font-extrabold">{count.toLocaleString()}</span> รายการ
                                <div className={`absolute ${heightPercent > 82 ? 'bottom-full border-b-4 border-b-[#1d1d1f]' : 'top-full border-t-4 border-t-[#1d1d1f]'} left-1/2 -translate-x-1/2 border-x-4 border-x-transparent`} />
                              </div>

                              {count > 0 && (
                                <div
                                  className="
                                    w-full h-full rounded-t-md
                                    bg-gradient-to-t from-[#0052d4] via-[#0071e3] to-[#00c6ff]
                                    group-hover:from-[#0041a8] group-hover:via-[#0071e3] group-hover:to-[#38bdf8]
                                    transition-all duration-200
                                    shadow-[0_-2px_10px_rgba(0,113,227,0.25)]
                                    group-hover:shadow-[0_-4px_16px_rgba(0,113,227,0.45)]
                                  "
                                />
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

              </div>
            </div>

            {/* ── X-axis label row ────────────────────────── */}
            <div className="flex items-start pl-9 sm:pl-11 pt-2.5">
              {aggregatedData.map(({ name, fullName }) => (
                <div
                  key={name}
                  onClick={() => setSelectedDetailGroup({ type: chartType, name: fullName || name })}
                  className="flex-1 text-center px-0.5 min-w-0 group relative cursor-pointer"
                >
                  <span className="text-[11px] sm:text-xs text-[#555557] hover:text-black font-semibold leading-tight block truncate transition-colors">
                    {name}
                  </span>

                  {/* Custom Popover Tooltip for long name on label hover */}
                  <div className="
                    absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                    text-[10px] sm:text-xs font-semibold text-white bg-[#1d1d1f]
                    px-2.5 sm:px-3 py-1.5 rounded-xl shadow-xl
                    opacity-0 scale-90 translate-y-1
                    group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0
                    transition-all duration-200 ease-out pointer-events-none z-30
                    w-max max-w-[160px] sm:max-w-[220px] text-center border border-white/10
                    flex flex-col items-center gap-0.5
                  ">
                    <span className="leading-tight break-words">{fullName ?? name}</span>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-x-4 border-x-transparent border-t-4 border-t-[#1d1d1f]" />
                  </div>
                </div>
              ))}
            </div>

            {/* ── Bottom Control Bar: Compact Chart Display Toggle on Bottom-Left ── */}
            <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-[#f0f0f5]/80">
              <div className="relative bg-[#f5f5f7] p-0.5 rounded-lg border border-[#d2d2d7]/40 flex items-center w-20 sm:w-22 shadow-2xs">
                <div 
                  className="absolute top-0.5 bottom-0.5 left-0.5 rounded-md bg-white shadow-xs transition-transform duration-200 ease-out pointer-events-none"
                  style={{
                    width: 'calc(50% - 2px)',
                    transform: chartDisplay === 'line' ? 'translateX(100%)' : 'translateX(0)'
                  }}
                />
                {[['bar', 'แท่ง'], ['line', 'เส้น']].map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setChartDisplay(val)}
                    className={`relative z-10 flex-1 py-0.5 text-[10px] font-bold transition-colors duration-150 cursor-pointer text-center ${
                      chartDisplay === val ? 'text-black' : 'text-[#8e8e93] hover:text-black'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Quotation Overview Bar Chart Card ─────────────────── */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/50 shadow-xs flex flex-col">
        {/* Top bar */}
        <div className="px-6 pt-6 pb-4 border-b border-[#f0f0f5] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-[#1d1d1f] tracking-wide uppercase">
                สถิติภาพรวมใบเสนอราคา
              </h4>
            </div>
          </div>

          {/* Toggle pill group */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle (แยกตามภาค / แยกตามเดือน) with animated sliding pill */}
            <div className="relative bg-[#f5f5f7] p-0.5 rounded-xl border border-[#d2d2d7]/50 flex items-center shadow-2xs">
              <div 
                className="absolute top-0.5 bottom-0.5 left-0.5 rounded-lg bg-white shadow-sm border border-black/5 pointer-events-none"
                style={{
                  width: 'calc(50% - 2px)',
                  transform: qtChartType === 'month' ? 'translateX(100%)' : 'translateX(0)',
                  transition: 'transform 0.35s cubic-bezier(0.34, 1.25, 0.64, 1)'
                }}
              />
              {[
                ['region', 'แยกตามภาค'],
                ['month', 'แยกตามเดือน']
              ].map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setQtChartType(val)}
                  className={`relative z-10 px-3 sm:px-3.5 py-1.5 text-[11px] sm:text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer text-center flex items-center justify-center active:scale-95 select-none ${
                    qtChartType === val ? 'text-[#1d1d1f]' : 'text-[#86868b] hover:text-[#1d1d1f]'
                  }`}
                >
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* Timeframe preset toggle (7 วัน / 30 วัน) */}
            <div className="relative bg-[#f5f5f7] p-0.5 rounded-lg border border-[#d2d2d7]/50 flex items-center w-28 sm:w-32">
              <div 
                className="absolute top-0.5 bottom-0.5 left-0.5 rounded-md bg-white shadow-xs transition-all duration-250 ease-out pointer-events-none"
                style={{
                  width: 'calc(50% - 2px)',
                  transform: qtTimeframe === '30d' ? 'translateX(100%)' : 'translateX(0)',
                  opacity: isQtCustomRange ? 0 : 1,
                  scale: isQtCustomRange ? 0.95 : 1
                }}
              />
              {[['7d', '7 วัน'], ['30d', '30 วัน']].map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    setIsQtCustomRange(false);
                    setQtTimeframe(val);
                  }}
                  className={`relative z-10 flex-1 py-1 text-[10px] sm:text-xs font-bold transition-colors duration-200 cursor-pointer text-center ${
                    !isQtCustomRange && qtTimeframe === val
                      ? 'text-black'
                      : 'text-[#555557] hover:text-black'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Custom Date Range Picker - Standard HTML5 inputs */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <input
                type="date"
                value={isQtCustomRange ? qtStartDateStr : formatDateForInput(qtRangeStart)}
                onChange={(e) => {
                  if (e.target.value) {
                    setQtStartDateStr(e.target.value);
                    setIsQtCustomRange(true);
                  }
                }}
                className="text-[11px] sm:text-xs font-bold bg-[#f5f5f7] border border-[#d2d2d7]/50 rounded-xl px-2.5 py-1 text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all cursor-pointer shadow-xs dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
              />
              <span className="text-[10px] font-bold text-zinc-400">ถึง</span>
              <input
                type="date"
                value={isQtCustomRange ? qtEndDateStr : formatDateForInput(qtRangeEnd)}
                onChange={(e) => {
                  if (e.target.value) {
                    setQtEndDateStr(e.target.value);
                    setIsQtCustomRange(true);
                  }
                }}
                className="text-[11px] sm:text-xs font-bold bg-[#f5f5f7] border border-[#d2d2d7]/50 rounded-xl px-2.5 py-1 text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all cursor-pointer shadow-xs dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Chart body */}
        <div className="px-4 sm:px-6 pb-6 pt-10 flex flex-col min-h-0 overflow-x-auto scrollbar-thin">
          <div className="relative flex flex-col min-h-[260px] min-w-[640px] lg:min-w-0">
            {/* Top area: Y-axis scale + Chart Plot Area */}
            <div className="relative flex min-h-[200px]">
              {/* Y-axis Labels Column - Left Side with Numbers */}
              <div className="w-9 sm:w-11 shrink-0 relative select-none pointer-events-none">
                {[100, 75, 50, 25, 0].map((pct) => (
                  <div
                    key={pct}
                    className="absolute right-2 -translate-y-1/2 text-[10px] sm:text-[11px] font-semibold text-[#8e8e93] font-mono leading-none text-right"
                    style={{ top: `${100 - pct}%` }}
                  >
                    {Math.round((pct / 100) * qtMaxCount).toLocaleString()}
                  </div>
                ))}
              </div>

              {/* Chart Plot Area */}
              <div className="relative flex-1 min-h-0" ref={qtContainerRef}>
                {/* Horizontal Guide Lines */}
                <div className="absolute inset-0 pointer-events-none">
                  {[100, 75, 50, 25, 0].map((pct) => (
                    <div
                      key={pct}
                      className={`absolute left-0 right-0 ${
                        pct === 0 ? 'border-b border-[#d2d2d7]' : 'border-b border-dashed border-[#f0f0f5]'
                      }`}
                      style={{ top: `${100 - pct}%` }}
                    />
                  ))}
                </div>

                {/* Line Chart Graphic for Quotation */}
                <div 
                  className={`absolute inset-0 transition-all duration-500 ease-in-out ${
                    qtChartDisplay === 'line' ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
                  }`}
                >
                  <svg
                    className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
                    viewBox={`0 0 ${qtDimensions.width} ${qtDimensions.height}`}
                  >
                    <defs>
                      <linearGradient id="qtLineAreaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#0071e3" stopOpacity="0.12" />
                        <stop offset="50%"  stopColor="#0071e3" stopOpacity="0.04" />
                        <stop offset="100%" stopColor="#0071e3" stopOpacity="0" />
                      </linearGradient>

                      <linearGradient id="qtLineStrokeGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%"   stopColor="#00c6ff" />
                        <stop offset="50%"  stopColor="#0071e3" />
                        <stop offset="100%" stopColor="#7000ff" />
                      </linearGradient>

                      <filter id="qtLineGlow" x="-10%" y="-60%" width="120%" height="220%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>

                      <clipPath id="qtChartClip">
                        <rect x="0" y="0" width={qtDimensions.width} height={qtDimensions.height} />
                      </clipPath>
                    </defs>

                    {/* Area fill */}
                    {qtSmoothAreaPath && (
                      <path
                        d={qtSmoothAreaPath}
                        fill="url(#qtLineAreaGradient)"
                        clipPath="url(#qtChartClip)"
                      />
                    )}

                    {/* Glow layer */}
                    {qtSmoothLinePath && (
                      <path
                        d={qtSmoothLinePath}
                        fill="none"
                        stroke="#0071e3"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.25"
                        filter="url(#qtLineGlow)"
                      />
                    )}

                    {/* Main stroke */}
                    {qtSmoothLinePath && (
                      <path
                        d={qtSmoothLinePath}
                        fill="none"
                        stroke="url(#qtLineStrokeGradient)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                  </svg>

                  {/* Data Points along the line */}
                  <div className={`absolute inset-0 ${qtChartDisplay === 'line' ? 'pointer-events-auto z-30' : 'pointer-events-none z-10'}`}>
                    {qtSvgPoints.map((p, idx) => {
                      const leftPercent = qtDimensions.width > 0 ? (p.x / qtDimensions.width) * 100 : 0;
                      const topPercent = qtDimensions.height > 0 ? (p.y / qtDimensions.height) * 100 : 0;
                      return (
                        <div
                          key={idx}
                          onClick={() => handleBarClick({ name: p.name })}
                          style={{
                            left: `${leftPercent}%`,
                            top: `${topPercent}%`,
                          }}
                          className="group/point absolute -translate-x-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center cursor-pointer pointer-events-auto z-30 select-none"
                        >
                          {/* Tooltip */}
                          <div className={`
                            absolute ${topPercent < 22 ? 'top-full mt-2.5' : 'bottom-full mb-2.5'} left-1/2 -translate-x-1/2
                            text-[11px] font-medium text-white
                            px-3 py-1.5 rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.25)]
                            opacity-0 scale-90 translate-y-1
                            group-hover/point:opacity-100 group-hover/point:scale-100 group-hover/point:translate-y-0
                            transition-all duration-150 ease-out pointer-events-none whitespace-nowrap z-50
                            bg-[#1d1d1f]/95 backdrop-blur-md border border-white/15 flex flex-col items-center gap-0.5
                          `}>
                            <span className="text-zinc-300 font-normal">{p.fullName || p.name}:</span>
                            <div className="flex items-center gap-1">
                              <span className="text-[#38bdf8] font-bold">{p.count.toLocaleString()}</span>
                              <span className="text-zinc-400 text-[10px]">ฉบับ</span>
                            </div>
                            <div className={`absolute ${topPercent < 22 ? 'bottom-full border-b-4 border-b-[#1d1d1f]' : 'top-full border-t-4 border-t-[#1d1d1f]'} left-1/2 -translate-x-1/2 border-x-4 border-x-transparent`} />
                          </div>

                          {/* Dot */}
                          <div className="w-2.5 h-2.5 rounded-full bg-[#0071e3] border-2 border-white shadow-[0_1px_4px_rgba(0,0,0,0.25)] group-hover/point:scale-125 group-hover/point:ring-4 group-hover/point:ring-[#0071e3]/25 transition-all duration-150 relative z-10" />
                          <div
                            className="absolute w-5 h-5 rounded-full bg-[#0071e3]/20 animate-pulse-ring transition-transform duration-150"
                            style={{ animationDelay: `${idx * 0.12}s` }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bars & Hover tooltips */}
                <div key={`bars-${qtChartType}`} className={`absolute inset-0 flex items-end ${qtChartDisplay === 'bar' ? 'pointer-events-auto opacity-100 scale-100 z-20' : 'pointer-events-none opacity-0 scale-95 z-10'} transition-all duration-500 ease-in-out`}>
                  {quotationBarData.map(({ name, fullName, count, gradient }, idx) => {
                    const heightPercent = qtMaxCount > 0 ? (count / qtMaxCount) * 100 : 0;
                    const isSelected = (qtChartType === 'region' && selectedPivotRegion === name) ||
                                       (qtChartType === 'branch' && pivotSearch === name);
                    const isClickable = qtChartType === 'region' || qtChartType === 'branch';
                    return (
                      <div
                        key={`${qtChartType}-${name}`}
                        className="flex-1 flex flex-col items-center justify-end h-full group relative min-w-0"
                        style={{
                          transformOrigin: 'bottom',
                          animation: 'barRise 0.55s cubic-bezier(0.34, 1.25, 0.64, 1) both',
                          animationDelay: `${idx * 45}ms`
                        }}
                      >
                        <div
                          onClick={() => handleBarClick({ name })}
                          className={`w-[60%] sm:w-[45%] max-w-[42px] h-full flex flex-col justify-end ${
                            isClickable ? 'cursor-pointer' : 'cursor-default'
                          } pointer-events-auto relative z-10`}
                        >
                          {/* Bar wrapper sized precisely to heightPercent */}
                          <div
                            style={{
                              height: `${Math.max(heightPercent, count > 0 ? 3 : 0)}%`,
                              transition: 'height 0.6s cubic-bezier(0.34,1.2,0.64,1)',
                            }}
                            className="w-full relative group/bar"
                          >
                            {/* Hover Tooltip - Positioned directly above the bar top or inside if near ceiling */}
                            <div className={`
                              absolute ${heightPercent > 82 ? 'top-2' : 'bottom-full mb-2'} left-1/2 -translate-x-1/2
                              text-[10px] font-bold text-white
                              px-2.5 py-1.5 rounded-lg shadow-2xl
                              opacity-0 scale-90 translate-y-1
                              group-hover/bar:opacity-100 group-hover/bar:scale-100 group-hover/bar:translate-y-0
                              transition-all duration-150 ease-out pointer-events-none whitespace-nowrap z-50
                              bg-[#1d1d1f] border border-white/10 flex flex-col items-center gap-0.5
                            `}>
                              <span className="text-zinc-300 font-normal">{fullName}:</span>
                              <div className="flex items-center gap-1">
                                <span className="text-[#34d399] font-extrabold text-xs">{count.toLocaleString()}</span>
                                <span className="text-zinc-400 text-[9px]">ฉบับ</span>
                              </div>
                              {isClickable && (
                                <span className="text-[8px] text-zinc-400 border-t border-white/10 pt-0.5 mt-0.5">
                                  คลิกเพื่อกรองใน Pivot Table
                                </span>
                              )}
                              <div className={`absolute ${heightPercent > 82 ? 'bottom-full border-b-4 border-b-[#1d1d1f]' : 'top-full border-t-4 border-t-[#1d1d1f]'} left-1/2 -translate-x-1/2 border-x-4 border-x-transparent`} />
                            </div>

                            {count > 0 && (
                              <div
                                className={`
                                  w-full h-full rounded-t-lg
                                  bg-gradient-to-t ${gradient}
                                  ${isSelected ? 'ring-2 ring-black ring-offset-2 scale-105' : ''}
                                  group-hover/bar:brightness-110 group-hover/bar:scale-y-[1.03]
                                  transition-all duration-200
                                  shadow-[0_-2px_12px_rgba(0,113,227,0.2)]
                                  relative overflow-hidden
                                `}
                              >
                                <div className="absolute top-0 inset-x-0 h-1 bg-white/40 rounded-t-lg pointer-events-none" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* X-axis label row */}
            <div key={`labels-${qtChartType}`} className="flex items-start pl-9 sm:pl-11 pt-2.5">
              {quotationBarData.map(({ name, fullName, count }, idx) => {
                const isSelected = (qtChartType === 'region' && selectedPivotRegion === name) ||
                                   (qtChartType === 'branch' && pivotSearch === name);
                const isClickable = qtChartType === 'region' || qtChartType === 'branch';
                return (
                  <div
                    key={`${qtChartType}-${name}`}
                    onClick={() => handleBarClick({ name })}
                    className={`flex-1 text-center px-0.5 min-w-0 group relative ${
                      isClickable ? 'cursor-pointer' : 'cursor-default'
                    }`}
                    style={{
                      animation: 'labelSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
                      animationDelay: `${idx * 35}ms`
                    }}
                  >
                    <span
                      className={`text-[11px] sm:text-xs font-semibold leading-tight block truncate transition-all duration-200 ${
                        isSelected
                          ? 'text-[#0071e3] font-bold scale-105'
                          : 'text-[#555557] hover:text-black group-hover:scale-105'
                      }`}
                    >
                      {name}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono block mt-0.5 font-medium">
                      {count}
                    </span>

                    {/* Popover Tooltip for long name */}
                    <div className="
                      absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                      text-[10px] sm:text-xs font-semibold text-white bg-[#1d1d1f]
                      px-2.5 sm:px-3 py-1.5 rounded-xl shadow-xl
                      opacity-0 scale-90 translate-y-1
                      group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0
                      transition-all duration-200 ease-out pointer-events-none z-30
                      w-max max-w-[160px] sm:max-w-[220px] text-center border border-white/10
                    ">
                      <span className="leading-tight break-words">{fullName}</span>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-x-4 border-x-transparent border-t-4 border-t-[#1d1d1f]" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Bottom Control Bar: Compact Chart Display Toggle on Bottom-Left ── */}
            <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-[#f0f0f5]/80">
              <div className="relative bg-[#f5f5f7] p-0.5 rounded-lg border border-[#d2d2d7]/40 flex items-center w-20 sm:w-22 shadow-2xs">
                <div 
                  className="absolute top-0.5 bottom-0.5 left-0.5 rounded-md bg-white shadow-xs transition-transform duration-200 ease-out pointer-events-none"
                  style={{
                    width: 'calc(50% - 2px)',
                    transform: qtChartDisplay === 'line' ? 'translateX(100%)' : 'translateX(0)'
                  }}
                />
                {[['bar', 'แท่ง'], ['line', 'เส้น']].map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setQtChartDisplay(val)}
                    className={`relative z-10 flex-1 py-0.5 text-[10px] font-bold transition-colors duration-150 cursor-pointer text-center ${
                      qtChartDisplay === val ? 'text-black' : 'text-[#8e8e93] hover:text-black'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Quotation Pivot Table Card ────────────────────────── */}
      <div ref={pivotTableRef} className="bg-white rounded-2xl border border-[#d2d2d7]/50 shadow-xs p-5 sm:p-6 flex flex-col gap-4">
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-[#1d1d1f] tracking-wide uppercase">
                สรุปข้อมูลใบเสนอราคา
              </h4>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={pivotSearch}
              onChange={(e) => {
                setPivotSearch(e.target.value);
                setPivotPage(1);
              }}
              placeholder="ค้นหาเลขที่, ลูกค้า, สำนักงาน, สาขา, ภาค..."
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-[#f5f5f7] border border-[#d2d2d7]/50 rounded-xl focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all shadow-xs"
            />
            {pivotSearch && (
              <button
                type="button"
                onClick={() => setPivotSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Region Filter Chips */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <span className="text-[11px] font-bold text-zinc-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> กรองตามภาค:
          </span>
          {['ทั้งหมด', ...THAI_REGIONS, ...(regionCounts['ไม่ระบุภาค'] > 0 ? ['ไม่ระบุภาค'] : [])].map((reg) => {
            const isSelected = selectedPivotRegion === reg || (!selectedPivotRegion && reg === 'ทั้งหมด');
            const count = regionCounts[reg] || 0;
            return (
              <button
                key={reg}
                type="button"
                onClick={() => {
                  setSelectedPivotRegion(reg === 'ทั้งหมด' ? null : reg);
                  setPivotPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-[#1d1d1f] text-white border-[#1d1d1f] shadow-xs'
                    : 'bg-transparent text-[#555557] border-[#d2d2d7]/60 hover:bg-zinc-200/40 hover:text-black'
                }`}
              >
                <span>{reg}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-semibold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-zinc-400/20 text-zinc-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}

          {(selectedPivotRegion || pivotSearch) && (
            <button
              type="button"
              onClick={() => {
                setSelectedPivotRegion(null);
                setPivotSearch('');
                setPivotPage(1);
              }}
              className="ml-auto text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> ล้างตัวกรอง
            </button>
          )}
        </div>

        {/* Pivot Table */}
        <div className="overflow-x-auto rounded-xl border border-[#e8e8ed]">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-[#f5f5f7] border-b border-[#e8e8ed] text-[11px] font-bold text-[#555557] uppercase tracking-wider">
                <th className="py-3 px-4 text-center w-16">ลำดับ</th>
                <th className="py-3 px-4">เลขที่ใบเสนอราคา</th>
                <th className="py-3 px-4">ชื่อลูกค้า</th>
                <th className="py-3 px-4">ชื่อสำนักงาน</th>
                <th className="py-3 px-4">สาขา</th>
                <th className="py-3 px-4">ภาค</th>
                <th className="py-3 px-4 text-right">ราคารวมสุทธิ</th>
                <th className="py-3 px-4 text-center w-28">Insight</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f0f5]">
              {paginatedPivotDocs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-zinc-400 text-xs">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <TableIcon className="w-6 h-6 text-zinc-300" />
                      <span>ไม่พบข้อมูลใบเสนอราคาที่ตรงกับเงื่อนไข</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedPivotDocs.map((q, idx) => {
                  const itemIndex = (pivotPage - 1) * pivotPageSize + idx + 1;
                  const custName = getDocCustName(q);
                  const officeName = getDocOfficeName(q, customers);
                  const branch = getDocBranch(q, customers);
                  const region = getDocRegion(q, customers);
                  const qNum = q.quotationNumber || q.id;

                  const isSubBranch = branch !== 'สำนักงานใหญ่' && branch !== '-';
                  const totalNet = Number(q.totalAmount ?? (q.items || []).reduce((sum, it) => sum + ((Number(it.quantity) || 1) * (Number(it.unitPrice || it.price) || 0)), 0));

                  return (
                    <tr key={q.id || idx} className="hover:bg-zinc-50/80 transition-colors group">
                      {/* ลำดับ */}
                      <td className="py-3 px-4 text-xs font-semibold text-[#8e8e93] font-mono text-center">
                        {itemIndex}
                      </td>

                      {/* เลขที่ใบเสนอราคา */}
                      <td className="py-3 px-4 text-xs">
                        <span className="font-mono font-bold text-[#1d1d1f] tracking-tight select-all">
                          {qNum}
                        </span>
                      </td>

                      {/* ชื่อลูกค้า */}
                      <td className="py-3 px-4 text-xs font-bold text-[#1d1d1f]">
                        <span className="truncate block max-w-[180px] sm:max-w-[220px]" title={custName}>
                          {custName}
                        </span>
                      </td>

                      {/* ชื่อสำนักงาน */}
                      <td className="py-3 px-4 text-xs text-[#555557]">
                        <span className="truncate block max-w-[180px] sm:max-w-[220px] font-medium" title={officeName}>
                          {officeName}
                        </span>
                      </td>

                      {/* สาขา */}
                      <td className="py-3 px-4 text-xs">
                        {isSubBranch ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-amber-50 text-amber-800 border border-amber-200/70">
                            <span className="truncate max-w-[130px]">{branch}</span>
                          </span>
                        ) : branch === 'สำนักงานใหญ่' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-blue-50 text-[#0071e3] border border-blue-200/70">
                            สำนักงานใหญ่
                          </span>
                        ) : (
                          <span className="text-zinc-400 font-mono">-</span>
                        )}
                      </td>

                      {/* ภาค */}
                      <td className="py-3 px-4 text-xs">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getRegionBadgeClass(region)}`}>
                          {region}
                        </span>
                      </td>

                      {/* ราคารวมสุทธิ */}
                      <td className="py-3 px-4 text-xs text-right font-mono font-bold text-[#1d1d1f] whitespace-nowrap">
                        ฿{formatMoney(totalNet)}
                      </td>

                      {/* Insight (คลิกดูสินค้าที่ขายและจำนวน) */}
                      <td className="py-3 px-4 text-xs text-center">
                        {(() => {
                          const items = q.items || [];
                          const totalQty = items.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0);
                          const firstItem = items[0];
                          const preview = firstItem ? `${firstItem.productName || firstItem.name || 'สินค้า'} (${totalQty} ชิ้น)` : 'ดูรายการสินค้า';

                          return (
                            <button
                              type="button"
                              onClick={() => setViewingInsightQuotation(q)}
                              className="w-8 h-8 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0071e3] hover:text-[#005bb5] border border-blue-200/70 inline-flex items-center justify-center transition-all duration-150 shadow-2xs hover:shadow-xs hover:scale-105 active:scale-95 cursor-pointer group"
                              title={`ดูรายการสินค้า: ${preview}`}
                            >
                              <Eye className="w-4 h-4 text-[#0071e3] group-hover:scale-110 transition-transform shrink-0" />
                            </button>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer & Pagination */}
        {totalPivotPages > 1 && (
          <div className="flex items-center justify-end gap-1 pt-2 text-xs text-zinc-500">
            <button
              type="button"
              disabled={pivotPage === 1}
              onClick={() => setPivotPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-[#d2d2d7]/50 hover:bg-[#f5f5f7] disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-bold text-xs">
              หน้า {pivotPage} / {totalPivotPages}
            </span>
            <button
              type="button"
              disabled={pivotPage === totalPivotPages}
              onClick={() => setPivotPage((p) => Math.min(totalPivotPages, p + 1))}
              className="p-1.5 rounded-lg border border-[#d2d2d7]/50 hover:bg-[#f5f5f7] disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Product Detail List Modal */}
      {selectedDetailGroup && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div onClick={() => setSelectedDetailGroup(null)} className="absolute inset-0 bg-black/40 backdrop-blur-xs animate-fade-in" />
          <div className="relative bg-white rounded-3xl border border-[#d2d2d7]/50 max-w-lg w-full p-6 shadow-2xl z-10 flex flex-col max-h-[85vh] animate-scale-in text-[#1d1d1f]">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#e8e8ed] pb-3 shrink-0">
              <div>
                <h3 className="font-bold text-sm text-[#1d1d1f] tracking-tight">
                  รายการสินค้าใน{selectedDetailGroup.type === 'brand' ? 'แบรนด์' : 'หมวดหมู่'}: {selectedDetailGroup.name}
                </h3>
                <p className="text-[10px] text-zinc-500 mt-0.5 font-semibold">พบทั้งหมด {modalProducts.length} รายการ</p>
              </div>
              <button type="button" 
                onClick={() => setSelectedDetailGroup(null)} 
                className="text-zinc-400 hover:text-zinc-600 p-1.5 rounded-full hover:bg-[#f5f5f7] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#f5f5f7] pr-1 py-2">
              {modalProducts.map(product => (
                  <div key={product.id} className="py-2.5 flex items-center gap-3">
                    <div className="w-11 h-11 rounded-lg overflow-hidden bg-[#f5f5f7] border border-[#d2d2d7]/30 shrink-0">
                      <img src={product.image} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#1d1d1f] truncate">{product.name}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">SKU: {product.code} · สต็อก: {product.stock || 0} ชิ้น</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-extrabold text-[#0071e3]">฿{(product.retailPrice || 0).toLocaleString()}</p>
                      <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded font-bold mt-1 ${product.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-150 text-zinc-500'}`}>
                        {product.status === 'Active' ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                      </span>
                    </div>
                  </div>
                ))}
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-[#e8e8ed] shrink-0">
              <button type="button"
                onClick={() => setSelectedDetailGroup(null)}
                className="w-full py-2.5 bg-[#1d1d1f] hover:bg-black text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ─── Insight Quotation Detail Modal (ภาพรวมสินค้าที่ขายและจำนวน) ─── */}
      {viewingInsightQuotation && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 animate-fade-in no-print">
          <div onClick={() => setViewingInsightQuotation(null)} className="absolute inset-0 bg-[#1d1d1f]/40 transition-all duration-300 backdrop-blur-xs" />
          <div className="relative bg-white rounded-3xl border border-[#d2d2d7]/50 max-w-2xl w-full p-6 shadow-2xl space-y-5 z-10 animate-scale-in max-h-[90vh] overflow-y-auto text-[#1d1d1f]">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-[#e8e8ed] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-[#1d1d1f]">รายละเอียดใบเสนอราคา</h3>
                  <span className="font-mono text-xs font-bold text-[#0071e3]">
                    {viewingInsightQuotation.quotationNumber || viewingInsightQuotation.id}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">วันที่ออกเอกสาร: {formatDate(viewingInsightQuotation.issuedDate)}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewingInsightQuotation(null)}
                className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer & Sales info cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-blue-50/70 p-4.5 rounded-2xl text-xs border border-blue-100 shadow-2xs">
              <div>
                <span className="text-zinc-500 block text-[10px] font-bold uppercase tracking-wider">ข้อมูลลูกค้า</span>
                <p className="font-bold text-[#1d1d1f] text-sm mt-0.5">{getDocCustName(viewingInsightQuotation) || '-'}</p>
                {getCustTaxId(viewingInsightQuotation) && <p className="text-zinc-500 font-mono text-[11px] mt-0.5">Tax ID: {getCustTaxId(viewingInsightQuotation)}</p>}
                {getCustAddress(viewingInsightQuotation) && <p className="text-zinc-600 mt-1">{getCustAddress(viewingInsightQuotation)}</p>}
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] font-bold uppercase tracking-wider">ผู้สร้าง / พนักงานขาย</span>
                <p className="font-bold text-[#1d1d1f] text-sm mt-0.5">{viewingInsightQuotation.salespersonName || viewingInsightQuotation.createdBy || '-'}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">สถานะ:</span>
                  {(() => {
                    const st = STATUS_CONFIG[viewingInsightQuotation.status] || STATUS_CONFIG.draft;
                    return (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${st.bg} ${st.text} ${st.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                          {st.label}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Products table */}
            <div>
              <h4 className="text-xs font-bold text-[#1d1d1f] mb-2 uppercase tracking-wider">
                รายการสินค้าในเอกสาร ({viewingInsightQuotation.items?.length || 0} รายการ)
              </h4>
              <div className="border border-[#d2d2d7]/50 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#f5f5f7] text-zinc-500 font-bold border-b border-[#e8e8ed]">
                    <tr>
                      <th className="p-2.5 w-10 text-center">#</th>
                      <th className="p-2.5">รายการสินค้า</th>
                      <th className="p-2.5 text-right w-24">ราคา/หน่วย</th>
                      <th className="p-2.5 text-center w-20">จำนวน</th>
                      <th className="p-2.5 text-right w-28">ยอดรวม</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f0f5]">
                    {(viewingInsightQuotation.items || []).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-zinc-400">ไม่มีรายการสินค้าในเอกสารนี้</td>
                      </tr>
                    ) : (
                      (viewingInsightQuotation.items || []).map((item, idx) => (
                        <tr key={idx} className="hover:bg-[#fafafa]">
                          <td className="p-2.5 text-center font-mono text-zinc-400">{idx + 1}</td>
                          <td className="p-2.5 font-medium text-[#1d1d1f]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {(item.code || item.productCode) && (
                                <span className="font-mono text-[10px] font-bold text-zinc-700 bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200/80">
                                  {item.code || item.productCode}
                                </span>
                              )}
                              <span className="font-semibold">{item.productName || item.name}</span>
                              {item.variantName && <span className="text-[10px] text-blue-600 font-normal">({item.variantName})</span>}
                            </div>
                          </td>
                          <td className="p-2.5 text-right font-mono text-zinc-700">฿{formatMoney(item.unitPrice || item.price)}</td>
                          <td className="p-2.5 text-center font-bold text-zinc-800">{item.quantity || 1}</td>
                          <td className="p-2.5 text-right font-bold font-mono text-[#1d1d1f]">
                            ฿{formatMoney((item.unitPrice || item.price || 0) * (item.quantity || 1))}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Subtotal / VAT / Total */}
            <div className="flex justify-end pt-2 border-t border-[#e8e8ed]">
              <div className="w-full sm:w-64 space-y-1.5 text-xs">
                <div className="flex justify-between text-zinc-500">
                  <span>ราคารวมก่อนภาษี:</span>
                  <span className="font-mono font-bold">฿{formatMoney(viewingInsightQuotation.subtotal || viewingInsightQuotation.totalAmount)}</span>
                </div>
                {(viewingInsightQuotation.vatAmount > 0) && (
                  <div className="flex justify-between text-zinc-500">
                    <span>ภาษีมูลค่าเพิ่ม (VAT):</span>
                    <span className="font-mono font-bold">฿{formatMoney(viewingInsightQuotation.vatAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-[#1d1d1f] pt-2 border-t border-[#e8e8ed]">
                  <span>ยอดรวมสุทธิ:</span>
                  <span className="font-mono text-[#0071e3]">฿{formatMoney(viewingInsightQuotation.totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 pt-3 border-t border-[#e8e8ed]">
              <button
                type="button"
                onClick={() => setViewingInsightQuotation(null)}
                className="px-5 py-2 bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f] font-bold rounded-full text-xs transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
