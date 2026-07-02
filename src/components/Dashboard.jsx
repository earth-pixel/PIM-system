import { useState, useEffect, useRef } from 'react';
import { Package, Award, FolderKanban, CalendarDays, FileText } from 'lucide-react';

export default function Dashboard({ products, brands, categories, quotations = [], setActiveTab }) {
  // Stats calculations (Overall static stats)
  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.status === 'Active').length;
  const totalBrands = brands.length;
  const totalCategories = categories.length;
  const totalQuotations = quotations.length;
  const approvedQuotations = quotations.filter(q => q.status === 'approved').length;

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
        name: cat.split(' ').slice(0, 2).join(' '),
        fullName: cat,
        count: filteredProducts.filter(p => p.category === cat).length,
      }));

  const realMaxCount = Math.max(...aggregatedData.map(d => d.count), 0);
  const maxCount = realMaxCount === 0 ? 4 : (realMaxCount < 4 ? 4 : Math.ceil(realMaxCount / 4) * 4);

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
    <div className="flex-1 flex flex-col gap-3 lg:gap-4 animate-fade-in text-[#1d1d1f]">

      {/* ─── KPI Cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">

        {/* Total Products — Blue accent */}
        <div
          onClick={() => { setActiveTab('manage-products'); }}
          role="button" tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTab('manage-products'); } }}
          className="relative overflow-hidden bg-white px-3 py-3 sm:px-4 sm:py-3.5 rounded-2xl border border-blue-100 flex items-center gap-3 shadow-sm hover:shadow-blue-100/60 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer select-none group"
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
          className="relative overflow-hidden bg-white px-3 py-3 sm:px-4 sm:py-3.5 rounded-2xl border border-purple-100 flex items-center gap-3 shadow-sm hover:shadow-purple-100/60 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer select-none group"
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
          className="relative overflow-hidden bg-white px-3 py-3 sm:px-4 sm:py-3.5 rounded-2xl border border-amber-100 flex items-center gap-3 shadow-sm hover:shadow-amber-100/60 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer select-none group"
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
          className="relative overflow-hidden bg-white px-3 py-3 sm:px-4 sm:py-3.5 rounded-2xl border border-emerald-100 flex items-center gap-3 shadow-sm hover:shadow-emerald-100/60 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer select-none group"
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

            {/* Timeframe preset toggle (7 วัน / 30 วัน) */}
            <div className="bg-[#f5f5f7] p-0.5 rounded-lg border border-[#d2d2d7]/50 flex items-center">
              {[['7d', '7 วัน'], ['30d', '30 วัน']].map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    setIsCustomRange(false);
                    setTimeframe(val);
                  }}
                  className={`px-2.5 sm:px-3 py-1 text-[10px] sm:text-xs font-bold rounded-md transition-all cursor-pointer ${
                    !isCustomRange && timeframe === val
                      ? 'bg-white text-black shadow-xs'
                      : 'text-[#555557] hover:text-black'
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
                className={`flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-full border font-bold select-none cursor-pointer transition-colors shadow-xs ${
                  isCustomRange
                    ? 'text-[#0071e3] bg-[#0071e3]/10 border-[#0071e3]/20 hover:bg-[#0071e3]/15'
                    : 'text-[#555557] bg-[#f5f5f7] hover:bg-[#e8e8ed] border-[#d2d2d7]/50'
                }`}
              >
                <CalendarDays className={`w-3.5 h-3.5 ${isCustomRange ? 'text-[#0071e3]' : 'text-[#8e8e93]'}`} />
                <span>{rangeStartLabel} – {rangeEndLabel}</span>
                <i className={`bi bi-chevron-down text-[8px] transition-transform duration-200 ${isDatePickerOpen ? 'rotate-180' : ''} ${isCustomRange ? 'text-[#0071e3]' : 'text-[#8e8e93]'}`}></i>
              </button>

              {isDatePickerOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-72 bg-white rounded-3xl border border-[#d2d2d7]/50 shadow-xl p-4 sm:p-5 z-30 animate-scale-in text-left space-y-4">
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-[#1d1d1f] tracking-wide uppercase">กำหนดช่วงเวลาเอง</h5>
                    <p className="text-[10px] text-[#555557]">กรองสถิติการอัปเดตข้อมูลสินค้าในระบบ</p>
                  </div>

                  {/* Custom Range Selection */}
                  <div className="space-y-3">
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
                      disabled={!tempStartDate || !tempEndDate}
                      onClick={() => {
                        setStartDateStr(tempStartDate);
                        setEndDateStr(tempEndDate);
                        setIsCustomRange(true);
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
                  {/* Premium green glassy background tint */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-400/[0.07] via-green-300/[0.03] to-transparent pointer-events-none" />

                  <svg
                    className="absolute inset-0 w-full h-full overflow-visible"
                    viewBox="0 0 1000 256"
                    preserveAspectRatio="none"
                    style={{ paddingLeft: '28px' }}
                  >
                    <defs>
                      {/* 4-stop area gradient */}
                      <linearGradient id="lineAreaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#22c55e" stopOpacity="0.40" />
                        <stop offset="40%"  stopColor="#16a34a" stopOpacity="0.18" />
                        <stop offset="100%" stopColor="#14532d" stopOpacity="0" />
                      </linearGradient>

                      {/* Horizontal gradient stroke */}
                      <linearGradient id="lineStrokeGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%"   stopColor="#4ade80" />
                        <stop offset="50%"  stopColor="#22c55e" />
                        <stop offset="100%" stopColor="#16a34a" />
                      </linearGradient>

                      {/* Single-pass glow — lighter than before for perf */}
                      <filter id="lineGlow" x="-10%" y="-60%" width="120%" height="220%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>

                      {/* Clip path */}
                      <clipPath id="chartClip">
                        <rect x="0" y="0" width="1000" height="256" />
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
                        stroke="#4ade80"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.30"
                        filter="url(#lineGlow)"
                      />
                    )}

                    {/* Main crisp gradient stroke */}
                    {smoothLinePath && (
                      <path
                        d={smoothLinePath}
                        fill="none"
                        stroke="url(#lineStrokeGradient)"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {/* Data point dots — single pulse ring only for performance */}
                    {svgPoints.map((p, idx) => (
                      <g key={idx}>
                        {/* Pulse ring */}
                        <circle
                          cx={p.x} cy={p.y} r="12"
                          fill="none"
                          stroke="#22c55e"
                          strokeWidth="1.5"
                          opacity="0.28"
                          style={{
                            transformOrigin: `${p.x}px ${p.y}px`,
                            animation: `pulse-ring 2.2s ease-out ${idx * 0.12}s infinite`,
                          }}
                        />
                        {/* White ring */}
                        <circle
                          cx={p.x} cy={p.y} r="6"
                          fill="white"
                          stroke="#16a34a"
                          strokeWidth="2.5"
                        />
                        {/* Green core */}
                        <circle
                          cx={p.x} cy={p.y} r="3"
                          fill="#4ade80"
                        />
                      </g>
                    ))}
                  </svg>
                </>
              )}

              {/* Flex row overlay for bars or hover tooltips */}
              <div className="absolute inset-0 pl-7 flex items-end h-full">
                {aggregatedData.map(({ name, count }, idx) => {
                  const heightPercent = maxCount > 0 ? (count / maxCount) * 100 : 0;
                  return (
                    <div
                      key={name}
                      className="flex-1 flex flex-col items-center justify-end h-full group relative min-w-0"
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

                      {/* Bar content - only visible if chartDisplay === 'bar' and count > 0 */}
                      {chartDisplay === 'bar' && count > 0 && (
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
                          />
                        </div>
                      )}

                      {/* Interactive hover hotspot area if chartDisplay === 'line' */}
                      {chartDisplay === 'line' && (
                        <div className="w-full h-full cursor-pointer" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── X-axis label row (separate, below bars) ─────── */}
            <div className="flex items-start pl-7 pt-2 border-t border-[#f0f0f5]">
              {aggregatedData.map(({ name, fullName }) => (
                <div
                  key={name}
                  className="flex-1 text-center px-0.5 min-w-0 group relative cursor-help"
                >
                  <span className="text-xs text-[#555557] font-medium leading-tight block truncate">
                    {name}
                  </span>

                  {/* Custom Popover Tooltip for long name on label hover */}
                  <div className="
                    absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                    text-[10px] sm:text-xs font-semibold text-white bg-[#1d1d1f]/95
                    px-2.5 sm:px-3 py-1.5 rounded-xl shadow-xl backdrop-blur-md
                    opacity-0 scale-90 translate-y-1
                    group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0
                    transition-all duration-200 ease-out pointer-events-none z-30
                    w-max max-w-[150px] sm:max-w-[200px] text-center border border-white/10
                    flex flex-col items-center gap-0.5
                  ">
                    <span className="leading-tight break-words">{fullName ?? name}</span>
                    {/* Tooltip arrow */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[4px] border-x-4 border-x-transparent border-t-4 border-t-[#1d1d1f]/95" />
                  </div>
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
