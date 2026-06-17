import React, { useState, useEffect, useRef } from 'react';
import { Package, Award, FolderKanban, AlertTriangle, CalendarDays } from 'lucide-react';

export default function Dashboard({ products, brands, categories, setActiveTab, setStockFilter }) {
  // Stats calculations (Overall static stats)
  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.status === 'Active').length;
  const totalBrands = brands.length;
  const totalCategories = categories.length;

  const lowStockProducts = products.filter(p => p.stock <= 10);
  const outOfStockProducts = products.filter(p => p.stock === 0);

  // Dynamic Chart States
  const [chartType, setChartType] = useState('brand'); // 'brand' | 'category'
  const [timeframe, setTimeframe] = useState('30d');   // '7d' | '30d'
  const [chartDisplay, setChartDisplay] = useState('bar'); // 'bar' | 'line'

  // Custom Date Range Picker States
  const [isCustomRange, setIsCustomRange] = useState(false);
  const [startDateStr, setStartDateStr] = useState('2026-05-13');
  const [endDateStr, setEndDateStr] = useState('2026-06-11');
  const [tempStartDate, setTempStartDate] = useState('2026-05-13');
  const [tempEndDate, setTempEndDate] = useState('2026-06-11');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const datePickerRef = useRef(null);

  // Close date picker dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
        setIsDatePickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Timeframe calculation logic — mock current date June 11, 2026
  const currentDate = new Date('2026-06-11T23:59:59');

  let rangeStart, rangeEnd;
  if (isCustomRange) {
    rangeStart = new Date(startDateStr + 'T00:00:00');
    rangeEnd = new Date(endDateStr + 'T23:59:59');
  } else {
    const days = timeframe === '7d' ? 7 : 30;
    rangeEnd = new Date(currentDate);
    rangeStart = new Date(currentDate);
    rangeStart.setDate(rangeStart.getDate() - days + 1);
    rangeStart.setHours(0, 0, 0, 0);
  }

  const thLocale = 'th-TH';
  const dateOpts = { day: 'numeric', month: 'short' };
  const rangeStartLabel = rangeStart.toLocaleDateString(thLocale, dateOpts);
  const rangeEndLabel   = rangeEnd.toLocaleDateString(thLocale, dateOpts);

  const filteredProducts = products.filter(p => {
    if (!p.updatedAt) return false;
    const pDate = new Date(p.updatedAt.replace(/-/g, '/'));
    return pDate >= rangeStart && pDate <= rangeEnd;
  });

  // Aggregate data depending on selected tab
  const aggregatedData = chartType === 'brand'
    ? brands.map(brand => ({
        name: brand,
        count: filteredProducts.filter(p => p.brand === brand).length,
      }))
    : categories.map(cat => ({
        name: cat.split(' ')[0],
        fullName: cat,
        count: filteredProducts.filter(p => p.category === cat).length,
      }));

  const maxCount = Math.max(...aggregatedData.map(d => d.count), 1);

  // SVG Line Chart coordinates calculations
  const N = aggregatedData.length;
  const svgPoints = aggregatedData.map((d, i) => {
    const x = N > 0 ? (i + 0.5) * (1000 / N) : 0;
    const y = maxCount > 0 ? 28 + (218 - 28) * (1 - d.count / maxCount) : 218;
    return { x, y, name: d.name, fullName: d.fullName, count: d.count };
  });

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

  const smoothLinePath = buildSmoothPath(svgPoints);
  const smoothAreaPath = svgPoints.length > 0
    ? `${smoothLinePath} L ${svgPoints[svgPoints.length - 1].x} 256 L ${svgPoints[0].x} 256 Z`
    : '';

  return (
    <div className="flex-1 flex flex-col gap-6 lg:gap-8 animate-fade-in text-[#1d1d1f]">

      {/* ─── Page Header ─────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-[#1d1d1f]">
          Dashboard
        </h1>
      </div>

      {/* ─── KPI Cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">

        {/* Total Products */}
        <div 
          onClick={() => {
            setStockFilter('All');
            setActiveTab('products');
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setStockFilter('All');
              setActiveTab('products');
            }
          }}
          className="bg-white p-3.5 sm:p-5 rounded-2xl border border-[#d2d2d7]/50 flex items-center gap-2.5 sm:gap-4 shadow-xs hover:shadow-md hover:border-zinc-300 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 cursor-pointer select-none"
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#f5f5f7] flex items-center justify-center text-black shrink-0">
            <Package className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-bold text-[#555557] uppercase tracking-wider truncate">สินค้าทั้งหมด</p>
            <h3 className="text-2xl sm:text-3xl font-bold text-[#1d1d1f] mt-0.5">{totalProducts}</h3>
            <p className="text-[10px] sm:text-xs text-[#555557] mt-0.5 flex items-center gap-1 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0" />
              เปิด {activeProducts} รายการ
            </p>
          </div>
        </div>

        {/* Brands */}
        <div 
          onClick={() => setActiveTab('brands')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setActiveTab('brands');
            }
          }}
          className="bg-white p-3.5 sm:p-5 rounded-2xl border border-[#d2d2d7]/50 flex items-center gap-2.5 sm:gap-4 shadow-xs hover:shadow-md hover:border-zinc-300 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 cursor-pointer select-none"
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#f5f5f7] flex items-center justify-center text-black shrink-0">
            <Award className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-bold text-[#555557] uppercase tracking-wider truncate">แบรนด์สินค้า</p>
            <h3 className="text-2xl sm:text-3xl font-bold text-[#1d1d1f] mt-0.5">{totalBrands}</h3>
            <p className="text-[10px] sm:text-xs text-[#555557] mt-0.5 truncate">จำแนกตามแบรนด์</p>
          </div>
        </div>

        {/* Categories */}
        <div 
          onClick={() => setActiveTab('categories')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setActiveTab('categories');
            }
          }}
          className="bg-white p-3.5 sm:p-5 rounded-2xl border border-[#d2d2d7]/50 flex items-center gap-2.5 sm:gap-4 shadow-xs hover:shadow-md hover:border-zinc-300 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 cursor-pointer select-none"
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#f5f5f7] flex items-center justify-center text-black shrink-0">
            <FolderKanban className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-bold text-[#555557] uppercase tracking-wider truncate">หมวดหมู่สินค้า</p>
            <h3 className="text-2xl sm:text-3xl font-bold text-[#1d1d1f] mt-0.5">{totalCategories}</h3>
            <p className="text-[10px] sm:text-xs text-[#555557] mt-0.5 truncate">จำแนกตามหมวดหมู่</p>
          </div>
        </div>

        {/* Stock Alert */}
        <div 
          onClick={() => {
            setStockFilter('Low');
            setActiveTab('products');
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setStockFilter('Low');
              setActiveTab('products');
            }
          }}
          className={`bg-white p-3.5 sm:p-5 rounded-2xl border flex items-center gap-2.5 sm:gap-4 shadow-xs hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 cursor-pointer select-none ${
            lowStockProducts.length > 0 ? 'border-red-200/60 hover:border-red-400' : 'border-[#d2d2d7]/50 hover:border-zinc-300'
          }`}
        >
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 ${
            lowStockProducts.length > 0 ? 'bg-red-50 text-red-500' : 'bg-[#f5f5f7] text-[#555557]'
          }`}>
            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-bold text-[#555557] uppercase tracking-wider truncate">สต็อกสินค้าต่ำ</p>
            <h3 className={`text-2xl sm:text-3xl font-bold mt-0.5 ${lowStockProducts.length > 0 ? 'text-red-500' : 'text-[#1d1d1f]'}`}>
              {lowStockProducts.length}
            </h3>
            <p className="text-[10px] sm:text-xs text-[#555557] mt-0.5 truncate">
              {outOfStockProducts.length > 0 ? `หมด ${outOfStockProducts.length} ชิ้น` : 'ระดับสต็อกปกติ'}
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
            <p className="text-xs text-[#555557] mt-0.5">
              ข้อมูลสรุปยอดจดทะเบียนสินค้าในระบบ
              ({isCustomRange ? 'ช่วงเวลาที่กำหนดเอง' : timeframe === '7d' ? 'ช่วง 7 วันที่ผ่านมา' : 'ช่วง 30 วันที่ผ่านมา'})
            </p>
          </div>

          {/* Toggle pill group */}
          <div className="flex flex-wrap items-center gap-2">

            {/* Chart Type Toggle */}
            <div className="bg-[#f5f5f7] p-0.5 rounded-lg border border-[#d2d2d7]/50 flex items-center">
              {[['brand', 'แบรนด์'], ['category', 'หมวดหมู่']].map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setChartType(val)}
                  className={`px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-bold rounded-md transition-all cursor-pointer ${
                    chartType === val ? 'bg-white text-black shadow-xs' : 'text-[#555557] hover:text-black'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Date Range Picker */}
            <div className="relative" ref={datePickerRef}>
              <button
                type="button"
                onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                className="flex items-center gap-1.5 text-[10px] text-[#555557] bg-[#f5f5f7] hover:bg-[#e8e8ed] px-2.5 py-1.5 rounded-full border border-[#d2d2d7]/50 font-bold select-none cursor-pointer transition-colors shadow-xs"
              >
                <CalendarDays className="w-3.5 h-3.5 text-[#8e8e93]" />
                <span>{rangeStartLabel} – {rangeEndLabel}</span>
                <i className={`bi bi-chevron-down text-[8px] text-[#8e8e93] transition-transform duration-200 ${isDatePickerOpen ? 'rotate-180' : ''}`}></i>
              </button>

              {isDatePickerOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-72 bg-white rounded-3xl border border-[#d2d2d7]/50 shadow-xl p-4 sm:p-5 z-30 animate-scale-in text-left space-y-4">
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-[#1d1d1f] tracking-wide uppercase">เลือกช่วงเวลา</h5>
                    <p className="text-[10px] text-[#555557]">กรองสถิติการอัปเดตข้อมูลสินค้าในระบบ</p>
                  </div>

                  {/* Presets */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomRange(false);
                        setTimeframe('7d');
                        setIsDatePickerOpen(false);
                      }}
                      className={`py-2 px-3 text-[11px] font-bold rounded-xl border transition-all cursor-pointer ${
                        !isCustomRange && timeframe === '7d'
                          ? 'bg-[#0071e3]/10 text-[#0071e3] border-[#0071e3]/20 shadow-xs'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      7 วันที่ผ่านมา
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomRange(false);
                        setTimeframe('30d');
                        setIsDatePickerOpen(false);
                      }}
                      className={`py-2 px-3 text-[11px] font-bold rounded-xl border transition-all cursor-pointer ${
                        !isCustomRange && timeframe === '30d'
                          ? 'bg-[#0071e3]/10 text-[#0071e3] border-[#0071e3]/20 shadow-xs'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      30 วันที่ผ่านมา
                    </button>
                  </div>

                  <hr className="border-zinc-100" />

                  {/* Custom Range Selection */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-700">กำหนดช่วงเวลาเอง</span>
                      <input
                        type="checkbox"
                        checked={isCustomRange}
                        onChange={(e) => setIsCustomRange(e.target.checked)}
                        className="w-4 h-4 text-[#0071e3] border-[#d2d2d7] rounded focus:ring-[#0071e3] cursor-pointer"
                      />
                    </div>

                    {isCustomRange && (
                      <div className="space-y-3 animate-fade-in">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-[#555557] uppercase tracking-wider block">วันที่เริ่มต้น</label>
                          <input
                            type="date"
                            value={tempStartDate}
                            onChange={(e) => setTempStartDate(e.target.value)}
                            className="w-full text-xs bg-[#f5f5f7]/80 border border-[#d2d2d7] rounded-xl px-3 py-2 text-[#1d1d1f] focus:outline-hidden focus:border-[#0071e3] focus:bg-white transition-all font-semibold"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-[#555557] uppercase tracking-wider block">วันที่สิ้นสุด</label>
                          <input
                            type="date"
                            value={tempEndDate}
                            onChange={(e) => setTempEndDate(e.target.value)}
                            className="w-full text-xs bg-[#f5f5f7]/80 border border-[#d2d2d7] rounded-xl px-3 py-2 text-[#1d1d1f] focus:outline-hidden focus:border-[#0071e3] focus:bg-white transition-all font-semibold"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Apply Button */}
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsDatePickerOpen(false)}
                      className="flex-1 py-2 text-xs font-bold border border-[#d2d2d7] rounded-xl hover:bg-zinc-50 transition-colors cursor-pointer text-center text-zinc-750"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      disabled={isCustomRange && (!tempStartDate || !tempEndDate)}
                      onClick={() => {
                        if (isCustomRange) {
                          setStartDateStr(tempStartDate);
                          setEndDateStr(tempEndDate);
                        }
                        setIsDatePickerOpen(false);
                      }}
                      className="flex-1 py-2 text-xs font-bold bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl transition-colors cursor-pointer text-center disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                    >
                      นำไปใช้
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Chart body */}
        <div className="px-6 pb-8 pt-4 flex-1 flex flex-col min-h-0">

          {/* ── Bar/Line chart wrapper ─────────────────────────── */}
          <div className="relative flex-1 flex flex-col min-h-0">

            {/* Y-axis guide lines (subtle) */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-10">
              {[100, 75, 50, 25, 0].map(pct => (
                <div key={pct} className="flex items-center gap-2">
                  <span className="text-[10px] text-[#c7c7cc] w-4 text-right shrink-0">{pct > 0 ? Math.round((pct / 100) * maxCount) : ''}</span>
                  <div className="flex-1 border-t border-dashed border-[#f0f0f5]" />
                </div>
              ))}
            </div>

            {/* Chart Area */}
            <div className="relative flex-1 min-h-0">
              {/* If line chart, render the SVG line graph */}
              {chartDisplay === 'line' && (
                <>
                  {/* Subtle green tint background when in line mode */}
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-[#34c759]/[0.04] to-transparent pointer-events-none" />
                  <svg
                    className="absolute inset-0 w-full h-full overflow-visible"
                    viewBox="0 0 1000 256"
                    preserveAspectRatio="none"
                    style={{ paddingLeft: '28px' }}
                  >
                    <defs>
                      {/* 3-stop gradient fill under line */}
                      <linearGradient id="lineAreaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34c759" stopOpacity="0.28" />
                        <stop offset="55%" stopColor="#30d158" stopOpacity="0.10" />
                        <stop offset="100%" stopColor="#34c759" stopOpacity="0" />
                      </linearGradient>
                      {/* Glow filter for the main line */}
                      <filter id="lineGlow" x="-10%" y="-60%" width="120%" height="220%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                      {/* Clip path so area fill stays within chart */}
                      <clipPath id="chartClip">
                        <rect x="0" y="0" width="1000" height="256" />
                      </clipPath>
                    </defs>

                    {/* Area fill under the line */}
                    {smoothAreaPath && (
                      <path
                        d={smoothAreaPath}
                        fill="url(#lineAreaGradient)"
                        clipPath="url(#chartClip)"
                        opacity="1"
                      />
                    )}

                    {/* Glow shadow line (wider, blurred) */}
                    {smoothLinePath && (
                      <path
                        d={smoothLinePath}
                        fill="none"
                        stroke="#34c759"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.25"
                        filter="url(#lineGlow)"
                      />
                    )}

                    {/* Main crisp line */}
                    {smoothLinePath && (
                      <path
                        d={smoothLinePath}
                        fill="none"
                        stroke="#2db54e"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {/* Animated outer pulse rings + inner dots */}
                    {svgPoints.map((p, idx) => (
                      <g key={idx}>
                        {/* Outer pulse ring (animated) */}
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="10"
                          fill="none"
                          stroke="#34c759"
                          strokeWidth="1.5"
                          opacity="0.35"
                          style={{
                            transformOrigin: `${p.x}px ${p.y}px`,
                            animation: `pulse-ring 2s ease-out ${idx * 0.15}s infinite`,
                          }}
                        />
                        {/* Mid ring */}
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="7"
                          fill="#34c759"
                          opacity="0.15"
                        />
                        {/* White border ring */}
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="5.5"
                          fill="white"
                          stroke="#34c759"
                          strokeWidth="2"
                        />
                        {/* Inner green fill */}
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="3"
                          fill="#34c759"
                        />
                      </g>
                    ))}
                  </svg>
                </>
              )}

              {/* Flex row overlay for bars or hover tooltips */}
              <div className="absolute inset-0 pl-7 flex items-end gap-1.5 h-full">
                {aggregatedData.map(({ name, fullName, count }, idx) => {
                  const heightPercent = maxCount > 0 ? (count / maxCount) * 100 : 0;
                  return (
                    <div
                      key={name}
                      className="flex-1 flex flex-col items-center justify-end h-full group relative"
                      style={{ animationDelay: `${idx * 60}ms` }}
                    >
                      {/* Hover tooltip badge */}
                      <div className={`
                        absolute -top-2 left-1/2 -translate-x-1/2
                        text-[10px] font-bold text-white
                        px-2.5 py-0.5 rounded-full shadow-lg
                        opacity-0 scale-90 -translate-y-1
                        group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0
                        transition-all duration-200 ease-out pointer-events-none whitespace-nowrap z-20
                        ${chartDisplay === 'bar' ? 'bg-[#ff3b30]' : 'bg-[#34c759]'}
                      `}>
                        {count} รายการ
                      </div>

                      {/* Bar content - only visible if chartDisplay === 'bar' */}
                      {chartDisplay === 'bar' && (
                        <div className="w-full max-w-[36px] h-full flex flex-col justify-end">
                          <div
                            style={{
                              height: `${Math.max(heightPercent, 1.5)}%`,
                              transition: 'height 0.6s cubic-bezier(0.34,1.2,0.64,1)',
                            }}
                            className="
                              w-full rounded-t-lg
                              bg-gradient-to-t from-[#c0392b] via-[#e74c3c] to-[#ff6b6b]
                              group-hover:from-[#a93226] group-hover:via-[#c0392b] group-hover:to-[#ff453a]
                              transition-colors duration-300
                              shadow-[0_-2px_12px_rgba(255,59,48,0.35)]
                              group-hover:shadow-[0_-4px_20px_rgba(255,59,48,0.55)]
                              border-t border-l border-r border-red-400/20
                            "
                            title={`${fullName ?? name}: ${count} รายการ`}
                          />
                        </div>
                      )}

                      {/* Interactive hover hotspot area if chartDisplay === 'line' */}
                      {chartDisplay === 'line' && (
                        <div className="w-full h-full cursor-pointer" title={`${fullName ?? name}: ${count} รายการ`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── X-axis label row (separate, below bars) ─────── */}
            <div className="flex items-start gap-1.5 pl-7 pt-2 border-t border-[#f0f0f5]">
              {aggregatedData.map(({ name, fullName }) => (
                <div
                  key={name}
                  className="flex-1 text-center px-0.5"
                  title={fullName ?? name}
                >
                  <span className="text-xs text-[#555557] font-medium leading-tight block truncate">
                    {name}
                  </span>
                </div>
              ))}
            </div>

            {/* ── Chart Display Toggle (Bar / Line) at bottom left ── */}
            <div className="absolute -bottom-8 left-0 z-20">
              <div className="bg-[#f5f5f7] p-0.5 rounded-lg border border-[#d2d2d7]/50 flex items-center">
                {[['bar', 'แท่ง'], ['line', 'เส้น']].map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setChartDisplay(val)}
                    className={`px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-bold rounded-md transition-all cursor-pointer ${
                      chartDisplay === val ? 'bg-white text-black shadow-xs' : 'text-[#555557] hover:text-black'
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

    </div>
  );
}
