import { useState, useEffect, useRef, useMemo } from 'react';
import { Package, Award, FolderKanban, FileText, X } from 'lucide-react';
import { createPortal } from 'react-dom';

export default function Dashboard({ products, brands, categories, quotations = [], setActiveTab }) {
  // Stats calculations (Overall static stats)
  const totalProducts = products.length;
  const activeProducts = useMemo(() => products.filter(p => p.status === 'Active').length, [products]);
  const totalBrands = brands.length;
  const totalCategories = categories.length;
  const totalQuotations = quotations.length;
  const approvedQuotations = useMemo(() => quotations.filter(q => q.status === 'approved').length, [quotations]);

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
  const aggregatedData = useMemo(() => {
    return chartType === 'brand'
      ? brands.map(brand => ({
          name: brand,
          count: filteredProducts.filter(p => p.brand === brand).length,
        }))
      : categories.map(cat => ({
          name: cat.split(' ').slice(0, 2).join(' '),
          fullName: cat,
          count: filteredProducts.filter(p => p.category === cat).length,
        }));
  }, [chartType, brands, categories, filteredProducts]);

  const realMaxCount = useMemo(() => Math.max(...aggregatedData.map(d => d.count), 0), [aggregatedData]);
  
  // Calculate clean, readable round max scale with 4 equal intervals
  const calculateNiceMax = (realMax) => {
    if (realMax <= 0) return 4;
    if (realMax <= 4) return 4;
    const targetSteps = 4;
    const rawStep = realMax / targetSteps;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const normalized = rawStep / magnitude;
    let niceStep;
    if (normalized <= 1) niceStep = 1 * magnitude;
    else if (normalized <= 1.25) niceStep = 1.25 * magnitude;
    else if (normalized <= 1.5) niceStep = 1.5 * magnitude;
    else if (normalized <= 2) niceStep = 2 * magnitude;
    else if (normalized <= 2.5) niceStep = 2.5 * magnitude;
    else if (normalized <= 5) niceStep = 5 * magnitude;
    else niceStep = 10 * magnitude;

    return niceStep * targetSteps;
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

  // Build smooth cubic bezier path through data points
  const buildSmoothPath = (pts) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const cp1x = pts[i].x + (pts[i + 1].x - pts[i].x) * 0.45;
      const cp1y = pts[i].y;
      const cp2x = pts[i + 1].x - (pts[i + 1].x - pts[i].x) * 0.45;
      const cp2y = pts[i + 1].y;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${pts[i + 1].x} ${pts[i + 1].y}`;
    }
    return d;
  };

  const smoothLinePath = useMemo(() => buildSmoothPath(svgPoints), [svgPoints]);
  const smoothAreaPath = useMemo(() => {
    return svgPoints.length > 0
      ? `${smoothLinePath} L ${svgPoints[svgPoints.length - 1].x} ${dimensions.height} L ${svgPoints[0].x} ${dimensions.height} Z`
      : '';
  }, [svgPoints, smoothLinePath, dimensions.height]);

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
          <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-emerald-50/60 group-hover:bg-emerald-100/50 transition-colors duration-300" />
          <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-gradient-to-b from-emerald-400 to-teal-500" />
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shrink-0 shadow-sm shadow-emerald-300/40">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0 relative">
            <p className="text-[9px] font-semibold text-emerald-500 uppercase tracking-widest truncate">ใบเสนอราคา</p>
            <h3 className="text-2xl font-extrabold text-[#1d1d1f] leading-none tracking-tight">{totalQuotations}</h3>
            <p className="text-[9px] text-[#8e8e93] mt-0.5 truncate">อนุมัติแล้ว {approvedQuotations} รายการ</p>
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

            {/* Chart Display Toggle (Bar / Line) */}
            <div className="relative bg-[#f5f5f7] p-0.5 rounded-lg border border-[#d2d2d7]/50 flex items-center w-24 sm:w-28">
              <div 
                className="absolute top-0.5 bottom-0.5 left-0.5 rounded-md bg-white shadow-xs transition-transform duration-250 ease-out pointer-events-none"
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
                  className={`relative z-10 flex-1 py-1 text-[10px] sm:text-xs font-bold transition-colors duration-200 cursor-pointer text-center ${
                    chartDisplay === val ? 'text-black' : 'text-[#555557] hover:text-black'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

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
        <div className="px-4 sm:px-6 pb-6 pt-10 flex-1 flex flex-col min-h-0 overflow-x-auto scrollbar-thin">

          {/* ── Bar/Line chart wrapper ─────────────────────────── */}
          <div className="relative flex-1 flex flex-col min-h-[260px] min-w-[640px] lg:min-w-0">

            {/* Top area: Y-axis scale + Chart Plot Area */}
            <div className="relative flex-1 flex min-h-[200px]">
              
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
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#0071e3]/[0.04] via-[#0071e3]/[0.01] to-transparent pointer-events-none" />

                  <svg
                    className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
                    viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
                  >
                    <defs>
                      <linearGradient id="lineAreaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#0071e3" stopOpacity="0.22" />
                        <stop offset="50%"  stopColor="#0071e3" stopOpacity="0.08" />
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
                          className="group/point absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center cursor-pointer pointer-events-auto z-30 select-none"
                        >
                          {/* Tooltip directly above the real dot */}
                          <div className="
                            absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                            text-[10px] font-bold text-white
                            px-2.5 py-1 rounded-lg shadow-2xl
                            opacity-0 scale-90 translate-y-1
                            group-hover/point:opacity-100 group-hover/point:scale-100 group-hover/point:translate-y-0
                            transition-all duration-150 ease-out pointer-events-none whitespace-nowrap z-50
                            bg-[#1d1d1f] border border-white/10
                          ">
                            <span className="text-zinc-300 mr-1">{p.fullName || p.name}:</span>
                            <span className="text-[#38bdf8] font-extrabold">{p.count.toLocaleString()}</span> รายการ
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-x-4 border-x-transparent border-t-4 border-t-[#1d1d1f]" />
                          </div>

                          {/* The Real Dot on the line */}
                          <div className="w-2.5 h-2.5 group-hover/point:scale-150 rounded-full bg-[#0071e3] border-2 border-white shadow-[0_1px_4px_rgba(0,0,0,0.25)] group-hover/point:shadow-[0_2px_8px_rgba(0,113,227,0.5)] transition-transform duration-150 relative z-10" />
                          <div
                            className="absolute w-5 h-5 rounded-full bg-[#0071e3]/20 group-hover/point:scale-125 animate-pulse-ring transition-transform duration-150"
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
                              {/* Hover Tooltip - Positioned directly above the bar top */}
                              <div className="
                                absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                                text-[10px] font-bold text-white
                                px-2.5 py-1 rounded-lg shadow-2xl
                                opacity-0 scale-90 translate-y-1
                                group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0
                                transition-all duration-150 ease-out pointer-events-none whitespace-nowrap z-50
                                bg-[#1d1d1f] border border-white/10
                              ">
                                <span className="text-zinc-300 mr-1">{fullName || name}:</span>
                                <span className="text-[#38bdf8] font-extrabold">{count.toLocaleString()}</span> รายการ
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-x-4 border-x-transparent border-t-4 border-t-[#1d1d1f]" />
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

            {/* Removed absolute Chart Display Toggle (moved to top bar) */}
          </div>
        </div>
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
    </div>
  );
}
