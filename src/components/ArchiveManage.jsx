import { acceptSnapshot } from '../utils/api';
import { useState, useMemo, useEffect, useRef } from "react";
import { readArchiveResponse } from '../utils/archiveResponse';
import {
  X, Trash2, Search, AlertTriangle, Shield, ChevronLeft,
  ChevronRight, FileText, FileSpreadsheet, CheckSquare, Square,
  ToggleLeft, ToggleRight, Info, Loader, CheckCircle, XCircle,
  Archive, AlertCircle
} from "lucide-react";

const PAGE_SIZE = 15;

const STATUS_CONFIG = {
  draft: { label: "แบบร่าง", bg: "bg-zinc-100", text: "text-zinc-700", border: "border-zinc-300", dot: "bg-zinc-400" },
  sent: { label: "รอการอนุมัติ", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500 animate-pulse" },
  approved: { label: "อนุมัติแล้ว", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
  rejected: { label: "ไม่อนุมัติ", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", dot: "bg-rose-500" },
};

const fmtDate = (v) => { if (!v) return "-"; const d = new Date(v + "T00:00:00"); return isNaN(d) ? v : d.toLocaleDateString("th-TH"); };
const fmtMoney = (v) => Number(v || 0).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function ConfirmDeleteDialog({ selectedDocs, onConfirm, onCancel, isDeleting }) {
  const [typed, setTyped] = useState("");
  const inputRef = useRef(null);
  const multi = selectedDocs.length > 1;
  const WORD = "ยืนยันลบ";
  const ready = !multi || typed === WORD;
  const dates = selectedDocs.map(d => d.issuedDate).filter(Boolean).sort();
  const dateRange = !dates.length ? "ไม่ระบุ" : dates.length === 1 ? fmtDate(dates[0]) : fmtDate(dates[0]) + " — " + fmtDate(dates[dates.length - 1]);
  const proposals = selectedDocs.filter(d => d.documentType === "product_proposal").length;
  const quotes = selectedDocs.length - proposals;
  const summary = [quotes > 0 && "ใบเสนอราคา " + quotes + " รายการ", proposals > 0 && "ใบเสนอสินค้า " + proposals + " รายการ"].filter(Boolean).join(", ");
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100); }, []);
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-red-100 overflow-hidden">
        <div className="bg-gradient-to-r from-red-500 to-rose-600 px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0"><AlertTriangle className="w-5 h-5 text-white" /></div>
          <div><h3 className="font-black text-white text-sm">ยืนยันการลบเอกสาร</h3><p className="text-white/80 text-xs mt-0.5">การดำเนินการนี้ไม่สามารถย้อนกลับได้</p></div>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-red-700 font-black text-xs"><Trash2 className="w-3.5 h-3.5" /><span>รายการที่จะถูกลบ</span></div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-zinc-500">ประเภทเอกสาร</span><span className="font-bold">{summary}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">ช่วงวันที่</span><span className="font-bold">{dateRange}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">จำนวนทั้งหมด</span><span className="font-black text-red-600">{selectedDocs.length} รายการ</span></div>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 font-medium leading-relaxed"><strong>การลบนี้จะลบเอกสารต้นฉบับด้วย</strong> และยอดในรายงานย้อนหลังจะเปลี่ยนตาม โปรดยืนยันว่าต้องการลบถาวร</p>
          </div>
          {multi && (
            <div className="space-y-2">
              <p className="text-xs text-zinc-600 font-medium">พิมพ์ <span className="font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded">{WORD}</span> เพื่อยืนยัน</p>
              <input ref={inputRef} type="text" value={typed} onChange={e => setTyped(e.target.value)} placeholder={`พิมพ์ "${WORD}" เพื่อยืนยัน`}
                className="w-full px-3 py-2.5 border-2 rounded-xl text-sm font-bold focus:outline-none transition-all placeholder:text-zinc-300 placeholder:font-normal border-zinc-200 focus:border-red-400 focus:ring-2 focus:ring-red-100" />
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onCancel} disabled={isDeleting} className="flex-1 px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-60">ยกเลิก</button>
            <button type="button" onClick={onConfirm} disabled={!ready || isDeleting}
              className={"flex-1 px-4 py-2.5 text-white text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 " + (ready && !isDeleting ? "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 cursor-pointer shadow-lg shadow-red-500/25 hover:-translate-y-0.5" : "bg-zinc-300 cursor-not-allowed")}>
              {isDeleting ? <><Loader className="w-3.5 h-3.5 animate-spin" /><span>กำลังลบ...</span></> : <><Trash2 className="w-3.5 h-3.5" /><span>ลบ {selectedDocs.length} รายการ</span></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ArchiveManage({ quotations = [], onClose, onDeleted }) {
  const [docType, setDocType] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [includeApproved, setIncludeApproved] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [page, setPage] = useState(1);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [resultMsg, setResultMsg] = useState(null);

  const filteredDocs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return quotations.filter(doc => {
      if (doc.status === "sent") return false;
      if (docType === "quotation" && doc.documentType === "product_proposal") return false;
      if (docType === "product_proposal" && doc.documentType !== "product_proposal") return false;
      if (doc.status === "approved" && !includeApproved) return false;
      if (statusFilter !== "All" && doc.status !== statusFilter) return false;
      const issued = doc.issuedDate || "";
      if (startDate && issued < startDate) return false;
      if (endDate && issued > endDate) return false;
      if (q) {
        const hay = [doc.quotationNumber, doc.id, doc.customerName, doc.createdBy, doc.salespersonName].map(v => String(v || "").toLowerCase()).join(" ");
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [quotations, docType, startDate, endDate, statusFilter, searchQuery, includeApproved]);

  const [prevFilterKey, setPrevFilterKey] = useState('');
  const filterKey = `${docType}|${startDate}|${endDate}|${statusFilter}|${searchQuery}|${includeApproved}`;
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
    setSelectedIds(new Set());
  }

  const totalPages = Math.max(1, Math.ceil(filteredDocs.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedDocs = filteredDocs.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const pageIds = pagedDocs.map(d => d.id);
  const allPageSel = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));
  const somePageSel = pageIds.some(id => selectedIds.has(id));

  const toggleOne = (id) => {
    setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };
  const togglePage = () => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      const isAllSelected = pageIds.length > 0 && pageIds.every(id => n.has(id));
      if (isAllSelected) {
        pageIds.forEach(id => n.delete(id));
      } else {
        pageIds.forEach(id => n.add(id));
      }
      return n;
    });
  };
  const selectAll = () => setSelectedIds(new Set(filteredDocs.map(d => d.id)));
  const clearSel = () => setSelectedIds(new Set());

  const selectedDocs = useMemo(() => quotations.filter(d => selectedIds.has(d.id)), [quotations, selectedIds]);
  const totalExcSent = quotations.filter(d => d.status !== "sent").length;

  const handleDeleteClick = () => {
    if (!selectedIds.size) return;
    setResultMsg(null);
    setShowConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (isDeleting || !selectedIds.size) return;
    setIsDeleting(true);
    try {
      const res = await fetch("/api/quotations/archive-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      const result = await readArchiveResponse(res);
      if (!res.ok) { setShowConfirm(false); setResultMsg({ type: "error", text: result.error || "เกิดข้อผิดพลาดในการลบ", details: result.skipped?.map(s => s.reason) }); return; }
      setShowConfirm(false);
      acceptSnapshot(result);
      if (onDeleted) await onDeleted(result.quotations, result.activityLog);
      clearSel();
      setResultMsg({ type: "success", text: "ลบสำเร็จ " + (result.deletedCount || 0) + " รายการ" + (result.skippedCount > 0 ? " (ข้าม " + result.skippedCount + " รายการ)" : ""), details: result.skipped?.map(s => s.reason) });
    } catch (err) {
      setShowConfirm(false);
      setResultMsg({ type: "error", text: err.message });
    } finally { setIsDeleting(false); }
  };

  const docTypeBtns = [
    { val: "all", label: "ทั้งหมด", Icon: Archive },
    { val: "quotation", label: "ใบเสนอราคา", Icon: FileSpreadsheet },
    { val: "product_proposal", label: "ใบเสนอสินค้า", Icon: FileText },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
        <div className="bg-white w-full sm:max-w-4xl max-h-screen sm:max-h-[92vh] rounded-t-2xl sm:rounded-2xl shadow-2xl border border-[#d2d2d7]/60 flex flex-col pointer-events-auto overflow-hidden" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="bg-gradient-to-r from-rose-600 via-red-500 to-orange-500 px-5 py-4 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"><Archive className="w-5 h-5 text-white" /></div>
                <div>
                  <h2 className="font-black text-white text-sm">จัดการเอกสารเก่า</h2>
                  <div className="flex items-center gap-1.5 mt-0.5"><Shield className="w-3 h-3 text-white/80" /><span className="text-white/80 text-[10px] font-semibold">เฉพาะผู้ดูแลระบบ (Admin)</span></div>
                </div>
              </div>
              <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors cursor-pointer"><X className="w-4 h-4 text-white" /></button>
            </div>
          </div>

          {/* Info */}
          <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 flex items-start gap-2 shrink-0">
            <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
              เอกสาร <strong>&quot;รออนุมัติ&quot;</strong> จะไม่แสดงในรายการ &middot; เอกสาร <strong>&quot;อนุมัติแล้ว&quot;</strong> ต้องเปิดสวิตช์ก่อนเลือกได้
            </p>
          </div>

          {/* Result msg */}
          {resultMsg && (
            <div className={"mx-5 mt-4 shrink-0 rounded-xl border px-4 py-3 flex items-start gap-3 text-xs font-medium " + (resultMsg.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800")}>
              {resultMsg.type === "success" ? <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />}
              <div><p className="font-bold">{resultMsg.text}</p>{resultMsg.details?.length > 0 && <ul className="mt-1 space-y-0.5 opacity-80">{resultMsg.details.map((d, i) => <li key={i}>&bull; {d}</li>)}</ul>}</div>
              <button type="button" onClick={() => setResultMsg(null)} className="ml-auto text-current opacity-50 hover:opacity-100 cursor-pointer shrink-0"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}

          {/* Filters */}
          <div className="px-5 py-4 border-b border-[#e8e8ed] bg-[#fafafa] shrink-0">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 shrink-0">ประเภท</span>
                {docTypeBtns.map(({ val, label, Icon }) => (
                  <button key={val} type="button" onClick={() => setDocType(val)}
                    className={"flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer " + (docType === val ? "bg-red-500 text-white border-red-500 shadow-sm" : "bg-white text-zinc-600 border-zinc-200 hover:border-red-300 hover:text-red-600")}>
                    <Icon className="w-3 h-3" />{label}
                  </button>
                ))}
                <div className="w-px h-4 bg-zinc-200 mx-1 hidden sm:block" />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 shrink-0">สถานะ</span>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-700 focus:outline-none focus:border-red-400 cursor-pointer font-medium">
                  <option value="All">ทุกสถานะ</option>
                  <option value="draft">แบบร่าง</option>
                  <option value="rejected">ไม่อนุมัติ</option>
                  {includeApproved && <option value="approved">อนุมัติแล้ว</option>}
                </select>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 shrink-0">วันที่</span>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-red-400 font-medium" title="วันที่เริ่มต้น" />
                <span className="text-xs text-zinc-400">ถึง</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-red-400 font-medium" title="วันที่สิ้นสุด" />
                <div className="relative flex-1 min-w-[180px] md:max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                  <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="ค้นหาเลขเอกสาร, ลูกค้า..."
                    className="w-full pl-8 pr-8 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-red-400 placeholder:text-zinc-300" />
                  {searchQuery && <button type="button" onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer"><X className="w-3.5 h-3.5" /></button>}
                </div>
                <button type="button" onClick={() => { const next = !includeApproved; setIncludeApproved(next); if (!next) { setSelectedIds(prev => { const n = new Set(prev); quotations.filter(d => d.status === "approved").forEach(d => n.delete(d.id)); return n; }); } }}
                  className={"flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer shrink-0 " + (includeApproved ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300")}>
                  {includeApproved ? <ToggleRight className="w-4 h-4 text-emerald-600" /> : <ToggleLeft className="w-4 h-4" />}
                  <span>รวมอนุมัติแล้ว</span>
                </button>
                {(startDate || endDate || searchQuery || statusFilter !== "All") && (
                  <button type="button" onClick={() => { setStartDate(""); setEndDate(""); setSearchQuery(""); setStatusFilter("All"); }} className="text-xs text-red-500 hover:underline font-bold px-1 cursor-pointer">ล้างตัวกรอง</button>
                )}
              </div>
            </div>
          </div>

          {/* Selection bar */}
          <div className="px-5 py-2.5 border-b border-[#e8e8ed] bg-white shrink-0 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <button type="button" onClick={togglePage} className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-900 cursor-pointer font-medium">
                {allPageSel ? <CheckSquare className="w-4 h-4 text-red-500" /> : somePageSel ? <div className="w-4 h-4 border-2 border-red-400 rounded-sm bg-red-100 flex items-center justify-center"><div className="w-1.5 h-0.5 bg-red-500" /></div> : <Square className="w-4 h-4" />}
                <span>เลือกหน้านี้ ({pagedDocs.length})</span>
              </button>
              {filteredDocs.length > PAGE_SIZE && <button type="button" onClick={selectAll} className="text-xs text-[#0071e3] hover:underline font-bold cursor-pointer">เลือกทั้งหมด {filteredDocs.length} รายการ</button>}
              {selectedIds.size > 0 && <button type="button" onClick={clearSel} className="text-xs text-zinc-400 hover:text-zinc-700 cursor-pointer">ล้างการเลือก</button>}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              {selectedIds.size > 0 && <span className="text-xs font-black text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">เลือกแล้ว {selectedIds.size} รายการ</span>}
              <span className="text-xs text-zinc-400 font-medium">แสดง {filteredDocs.length} / {totalExcSent} รายการ</span>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {filteredDocs.length === 0 ? (
              <div className="py-20 text-center">
                <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-4"><Archive className="w-6 h-6 text-zinc-400" /></div>
                <p className="text-sm font-semibold text-zinc-600">ไม่พบเอกสาร</p>
                <p className="text-xs text-zinc-400 mt-1">ลองปรับตัวกรองหรือเปิดสวิตช์ &quot;รวมอนุมัติแล้ว&quot;</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#f5f5f7]/80 text-[#86868b] text-[10px] uppercase tracking-widest border-b border-[#e8e8ed] sticky top-0 z-10">
                      <th className="p-3 w-10 text-center"><button type="button" onClick={togglePage} className="cursor-pointer">{allPageSel ? <CheckSquare className="w-4 h-4 text-red-500 mx-auto" /> : <Square className="w-4 h-4 mx-auto" />}</button></th>
                      <th className="p-3 min-w-[160px] font-black">เลขที่เอกสาร</th>
                      <th className="p-3 min-w-[100px] font-black">ประเภท</th>
                      <th className="p-3 min-w-[100px] font-black">วันที่</th>
                      <th className="p-3 min-w-[160px] font-black">ลูกค้า / ผู้สร้าง</th>
                      <th className="p-3 text-center min-w-[105px] font-black">สถานะ</th>
                      <th className="p-3 text-right min-w-[100px] font-black">มูลค่า</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f0f5] text-xs">
                    {pagedDocs.map((doc, index) => {
                      const isApproved = doc.status === "approved";
                      const checked = selectedIds.has(doc.id);
                      const disabled = isApproved && !includeApproved;
                      const st = STATUS_CONFIG[doc.status] || STATUS_CONFIG.draft;
                      const isProp = doc.documentType === "product_proposal";
                      return (
                        <tr key={doc.id} className={"transition-all duration-100 " + (disabled ? "opacity-40 " : "") + (checked ? "bg-red-50/60 " : index % 2 === 0 ? "bg-white " : "bg-[#fafafa]/50 ") + "hover:bg-red-50/30"}>
                          <td className="p-3 text-center">
                            {disabled ? <div title="เปิดสวิตช์ 'รวมอนุมัติแล้ว' เพื่อเลือก"><Square className="w-4 h-4 text-zinc-200 mx-auto" /></div>
                              : <button type="button" onClick={() => toggleOne(doc.id)} className="cursor-pointer">{checked ? <CheckSquare className="w-4 h-4 text-red-500 mx-auto" /> : <Square className="w-4 h-4 text-zinc-400 hover:text-zinc-700 mx-auto" />}</button>}
                          </td>
                          <td className="p-3"><span className={"font-mono font-bold text-xs px-2 py-0.5 rounded-md border " + (isProp ? "text-violet-700 bg-violet-50 border-violet-100" : "text-[#0071e3] bg-blue-50 border-blue-100")}>{doc.quotationNumber || doc.id}</span></td>
                          <td className="p-3"><span className={"text-[10px] font-bold px-2 py-0.5 rounded-full border " + (isProp ? "bg-violet-50 text-violet-700 border-violet-200" : "bg-blue-50 text-blue-700 border-blue-200")}>{isProp ? "ใบเสนอสินค้า" : "ใบเสนอราคา"}</span></td>
                          <td className="p-3 text-zinc-500 whitespace-nowrap">{fmtDate(doc.issuedDate)}</td>
                          <td className="p-3">
                            <div className="font-semibold text-[#1d1d1f] truncate max-w-[180px]">{doc.customerName || doc.salespersonName || doc.createdBy || "-"}</div>
                            {doc.customerName && (doc.salespersonName || doc.createdBy) && <div className="text-[10px] text-zinc-400 truncate max-w-[180px]">{doc.salespersonName || doc.createdBy}</div>}
                          </td>
                          <td className="p-3 text-center">
                            <span className={"inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full border " + st.bg + " " + st.text + " " + st.border + " whitespace-nowrap"}><span className={"w-1.5 h-1.5 rounded-full " + st.dot} />{st.label}</span>
                            {disabled && <div className="text-[9px] text-amber-600 mt-0.5">เปิดสวิตช์เพื่อเลือก</div>}
                          </td>
                          <td className="p-3 text-right font-bold tabular-nums text-zinc-700">฿{fmtMoney(doc.totalAmount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-[#e8e8ed] bg-[#fafafa] shrink-0 flex items-center justify-between">
              <span className="text-xs text-zinc-400 font-medium">หน้า {safePage} / {totalPages} ({filteredDocs.length} รายการ)</span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1} className="w-8 h-8 rounded-lg border border-zinc-200 flex items-center justify-center hover:bg-zinc-50 disabled:opacity-40 cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => { const p = safePage <= 3 ? i + 1 : safePage + i - 2; if (p < 1 || p > totalPages) return null; return <button key={p} type="button" onClick={() => setPage(p)} className={"w-8 h-8 rounded-lg border text-xs font-bold cursor-pointer " + (p === safePage ? "bg-red-500 text-white border-red-500" : "border-zinc-200 text-zinc-600 hover:bg-zinc-50")}>{p}</button>; })}
                <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className="w-8 h-8 rounded-lg border border-zinc-200 flex items-center justify-center hover:bg-zinc-50 disabled:opacity-40 cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-5 py-4 border-t border-[#e8e8ed] bg-white shrink-0">
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
              <div className="text-xs text-zinc-400 font-medium">
                {selectedIds.size > 0 ? <span className="text-red-600 font-bold">เลือกแล้ว {selectedIds.size} รายการ — กดปุ่มเพื่อลบ</span> : <span>เลือกเอกสารที่ต้องการลบจากรายการด้านบน</span>}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={onClose} className="flex-1 sm:flex-initial px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold rounded-xl transition-all cursor-pointer">ปิด</button>
                <button type="button" onClick={handleDeleteClick} disabled={selectedIds.size === 0}
                  className={"flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 text-white text-xs font-black rounded-xl transition-all " + (selectedIds.size > 0 ? "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 cursor-pointer shadow-lg shadow-red-500/25 hover:-translate-y-0.5 active:translate-y-0" : "bg-zinc-200 text-zinc-400 cursor-not-allowed")}>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ลบที่เลือก ({selectedIds.size})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showConfirm && <ConfirmDeleteDialog selectedDocs={selectedDocs} onConfirm={handleConfirmDelete} onCancel={() => setShowConfirm(false)} isDeleting={isDeleting} />}
    </>
  );
}

