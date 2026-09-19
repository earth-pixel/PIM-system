import React, { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Plus, Search, Building2, User, Phone, Mail, MapPin, 
  FileText, Download, Upload, Trash2, Edit3, X, Check, 
  ArrowUpDown, Users, AlertCircle, ExternalLink, Copy, CheckCircle2,
  FileSpreadsheet, Save, RefreshCw, Compass, Store, MessageSquare
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { canPerformAction } from '../utils/permissions';
import { useToast } from '../contexts/ToastContext';

export const THAI_REGIONS = [
  'ภาคกลาง',
  'ภาคเหนือ',
  'ภาคตะวันออกเฉียงเหนือ',
  'ภาคตะวันออก',
  'ภาคตะวันตก',
  'ภาคใต้'
];

export default function CustomerManage({
  customers = [],
  quotations = [],
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onImportCustomers,
  currentUser,
  addActivityLog
}) {
  const showToast = useToast();
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, corporate, individual, with_quotes
  const [sortBy, setSortBy] = useState('newest'); // newest, name_asc, name_desc, quotes_desc

  // Modals & Drawers
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null); // customer object for viewing quotation history

  // Form State
  const [form, setForm] = useState({
    name: '',
    companyName: '',
    taxId: '',
    branchType: 'head', // 'head' (สำนักงานใหญ่) | 'sub' (สาขาย่อย)
    branchName: '',
    region: '',
    phone: '',
    email: '',
    address: '',
    note: ''
  });
  const [formError, setFormError] = useState('');
  const [errorFields, setErrorFields] = useState({});
  const [copiedId, setCopiedId] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const fileInputRef = useRef(null);

  // Refs for scroll-to-error (customer form)
  const refCustName = useRef(null);
  const refCustCompany = useRef(null);
  const refCustTaxId = useRef(null);
  const refCustRegion = useRef(null);
  const refCustBranchName = useRef(null);
  const refCustPhone = useRef(null);
  const refCustEmail = useRef(null);
  const refCustAddress = useRef(null);
  const refCustNote = useRef(null);

  const scrollToError = (ref) => {
    setTimeout(() => ref?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
  };
  const clearCustFieldError = (field) => setErrorFields(prev => ({ ...prev, [field]: false }));

  // Map each customer to quotation history
  const customerQuotesMap = useMemo(() => {
    const map = new Map();
    quotations.forEach(q => {
      const qCustName = (q.customer?.name || '').trim().toLowerCase();
      const qCompName = (q.customer?.companyName || '').trim().toLowerCase();
      if (!qCustName && !qCompName) return;

      customers.forEach(c => {
        const cName = (c.name || '').trim().toLowerCase();
        const cComp = (c.companyName || '').trim().toLowerCase();
        const matchName = cName && qCustName && cName === qCustName;
        const matchComp = cComp && qCompName && cComp === qCompName;

        if (matchName || matchComp) {
          const list = map.get(c.id) || [];
          if (!list.some(item => item.id === q.id)) {
            list.push(q);
            map.set(c.id, list);
          }
        }
      });
    });
    return map;
  }, [customers, quotations]);

  // Statistics
  const stats = useMemo(() => {
    const total = customers.length;
    const corporate = customers.filter(c => c.companyName && c.companyName.trim()).length;
    const individual = total - corporate;
    const withQuotes = customers.filter(c => (customerQuotesMap.get(c.id) || []).length > 0).length;
    return { total, corporate, individual, withQuotes };
  }, [customers, customerQuotesMap]);

  // Filtered and Sorted Customers
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const q = searchTerm.toLowerCase().trim();
      const nameMatch = (c.name || '').toLowerCase().includes(q);
      const companyMatch = (c.companyName || '').toLowerCase().includes(q);
      const phoneMatch = (c.phone || '').includes(q);
      const emailMatch = (c.email || '').toLowerCase().includes(q);
      const taxMatch = (c.taxId || '').includes(q);
      const branchMatch = (c.branch || c.branchName || '').toLowerCase().includes(q);
      const regionMatch = (c.region || '').toLowerCase().includes(q);
      const addrMatch = (c.address || '').toLowerCase().includes(q);
      const matchesSearch = !q || nameMatch || companyMatch || phoneMatch || emailMatch || taxMatch || branchMatch || regionMatch || addrMatch;

      if (!matchesSearch) return false;

      if (filterType === 'corporate') return Boolean(c.companyName && c.companyName.trim());
      if (filterType === 'individual') return !c.companyName || !c.companyName.trim();
      if (filterType === 'with_quotes') return (customerQuotesMap.get(c.id) || []).length > 0;
      return true;
    }).sort((a, b) => {
      if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '', 'th');
      if (sortBy === 'name_desc') return (b.name || '').localeCompare(a.name || '', 'th');
      if (sortBy === 'quotes_desc') {
        const countA = (customerQuotesMap.get(a.id) || []).length;
        const countB = (customerQuotesMap.get(b.id) || []).length;
        return countB - countA;
      }
      // default: newest
      return new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0);
    });
  }, [customers, searchTerm, filterType, sortBy, customerQuotesMap]);

  // Copy helper
  const handleCopy = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Open Modal
  const handleOpenAdd = () => {
    setModalMode('add');
    setSelectedCustomer(null);
    setForm({
      name: '',
      companyName: '',
      taxId: '',
      branchType: 'head',
      branchName: '',
      region: '',
      phone: '',
      email: '',
      address: '',
      note: ''
    });
    setFormError('');
    setErrorFields({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (customer) => {
    setModalMode('edit');
    setSelectedCustomer(customer);
    const isSub = customer.branchType === 'sub' || (customer.branch && !customer.branch.includes('สำนักงานใหญ่') && customer.branch !== 'Head Office');
    setForm({
      name: customer.name || '',
      companyName: customer.companyName || '',
      taxId: customer.taxId || '',
      branchType: isSub ? 'sub' : 'head',
      branchName: customer.branchName || (isSub ? (customer.branch || '').replace(/^สาขา\s*/, '') : ''),
      region: customer.region || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      note: customer.note || ''
    });
    setFormError('');
    setErrorFields({});
    setIsModalOpen(true);
  };

  // Save Customer (Add / Edit)
  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    setErrorFields({});
    const nameTrimmed = form.name.trim();
    if (!nameTrimmed) {
      setErrorFields({ name: true });
      scrollToError(refCustName);
      setFormError('กรุณากรอกชื่อลูกค้า');
      return;
    }
    if (!form.companyName.trim()) {
      setErrorFields({ companyName: true });
      scrollToError(refCustCompany);
      setFormError('กรุณากรอกชื่อบริษัท');
      return;
    }
    if (!form.taxId.trim()) {
      setErrorFields({ taxId: true });
      scrollToError(refCustTaxId);
      setFormError('กรุณากรอกเลขประจำตัวผู้เสียภาษี');
      return;
    }
    if (!form.region) {
      setErrorFields({ region: true });
      scrollToError(refCustRegion);
      setFormError('กรุณาเลือกภาค (6 ภูมิภาค)');
      return;
    }
    if (form.branchType === 'sub' && !form.branchName.trim()) {
      setErrorFields({ branchName: true });
      scrollToError(refCustBranchName);
      setFormError('กรุณาระบุชื่อหรือรหัสสาขาย่อย');
      return;
    }
    if (!form.phone.trim()) {
      setErrorFields({ phone: true });
      scrollToError(refCustPhone);
      setFormError('กรุณากรอกเบอร์โทร');
      return;
    }
    if (!form.email.trim()) {
      setErrorFields({ email: true });
      scrollToError(refCustEmail);
      setFormError('กรุณากรอก email');
      return;
    }
    if (!form.address.trim()) {
      setErrorFields({ address: true });
      scrollToError(refCustAddress);
      setFormError('กรุณากรอกที่อยู่');
      return;
    }
    if (!form.note.trim()) {
      setErrorFields({ note: true });
      scrollToError(refCustNote);
      setFormError('กรุณากรอกหมายเหตุ');
      return;
    }

    const branchLabel = form.branchType === 'sub'
      ? (form.branchName.trim().startsWith('สาขา') ? form.branchName.trim() : `สาขา ${form.branchName.trim()}`)
      : 'สำนักงานใหญ่';

    try {
      if (modalMode === 'add') {
        const newCust = {
          id: crypto.randomUUID(),
          name: nameTrimmed,
          companyName: form.companyName.trim(),
          taxId: form.taxId.trim(),
          branchType: form.branchType,
          branchName: form.branchType === 'sub' ? form.branchName.trim() : '',
          branch: branchLabel,
          region: form.region || '',
          phone: form.phone.trim(),
          email: form.email.trim(),
          address: form.address.trim(),
          note: form.note.trim(),
          status: 'Active',
          createdAt: new Date().toISOString()
        };
        await onAddCustomer(newCust);
        if (addActivityLog) {
          addActivityLog(`เพิ่มข้อมูลลูกค้าใหม่: ${newCust.name}${newCust.companyName ? ` (${newCust.companyName})` : ''} - ${branchLabel}`);
        }
      } else {
        const updatedCust = {
          ...selectedCustomer,
          name: nameTrimmed,
          companyName: form.companyName.trim(),
          taxId: form.taxId.trim(),
          branchType: form.branchType,
          branchName: form.branchType === 'sub' ? form.branchName.trim() : '',
          branch: branchLabel,
          region: form.region || '',
          phone: form.phone.trim(),
          email: form.email.trim(),
          address: form.address.trim(),
          note: form.note.trim(),
          updatedAt: new Date().toISOString()
        };
        await onUpdateCustomer(updatedCust);
        if (addActivityLog) {
          addActivityLog(`แก้ไขข้อมูลลูกค้า: ${updatedCust.name} (${branchLabel})`);
        }
      }
      setIsModalOpen(false);
    } catch (err) {
      setFormError(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteConfirmTarget) return;
    try {
      await onDeleteCustomer(deleteConfirmTarget.id);
      if (addActivityLog) {
        addActivityLog(`ลบข้อมูลลูกค้า: ${deleteConfirmTarget.name}${deleteConfirmTarget.companyName ? ` (${deleteConfirmTarget.companyName})` : ''}`);
      }
      setDeleteConfirmTarget(null);
    } catch (err) {
      alert(`ลบลูกค้าไม่สำเร็จ: ${err.message}`);
    }
  };

  // Export Customers to Excel
  const handleExportExcel = () => {
    if (customers.length === 0) {
      showToast('ไม่มีข้อมูลลูกค้าให้ส่งออก', 'warning');
      return;
    }

    const rows = customers.map((c, index) => {
      const qCount = (customerQuotesMap.get(c.id) || []).length;
      return {
        'ลำดับ': index + 1,
        'ชื่อลูกค้า / ผู้ติดต่อ': c.name || '-',
        'ชื่อบริษัท / ร้านค้า': c.companyName || '-',
        'สาขา': c.branch || (c.branchType === 'sub' ? (c.branchName ? `สาขา ${c.branchName}` : 'สาขาย่อย') : 'สำนักงานใหญ่'),
        'ภาค': c.region || '-',
        'เลขประจำตัวผู้เสียภาษี': c.taxId || '-',
        'เบอร์โทรศัพท์': c.phone || '-',
        'อีเมล': c.email || '-',
        'ที่อยู่': c.address || '-',
        'จำนวนใบเสนอราคา': qCount,
        'วันที่เพิ่ม': c.createdAt ? new Date(c.createdAt).toLocaleDateString('th-TH') : '-'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'รายชื่อลูกค้า');

    // Set column widths
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 25 },
      { wch: 25 },
      { wch: 18 },
      { wch: 18 },
      { wch: 16 },
      { wch: 24 },
      { wch: 35 },
      { wch: 15 },
      { wch: 14 }
    ];

    const fileName = `Customer_List_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    if (addActivityLog) {
      addActivityLog(`ส่งออกรายชื่อลูกค้า ${customers.length} รายการเป็นไฟล์ Excel`);
    }
  };

  // Import Customers from Excel
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json(firstSheet);

      if (!rawRows || rawRows.length === 0) {
        showToast('ไฟล์ Excel ไม่มีข้อมูล', 'warning');
        return;
      }

      const importedCustomers = [];
      const existingNameMap = new Map(customers.map(c => [c.name.trim().toLowerCase(), c]));

      rawRows.forEach(row => {
        // Match possible column headers in Thai and English
        const name = (row['ชื่อลูกค้า / ผู้ติดต่อ'] || row['ชื่อลูกค้า'] || row['ผู้ติดต่อ'] || row['Name'] || row['Customer Name'] || '').toString().trim();
        if (!name) return;

        const companyName = (row['ชื่อบริษัท / ร้านค้า'] || row['ชื่อบริษัท'] || row['บริษัท'] || row['Company'] || row['Company Name'] || '').toString().trim();
        const branchRaw = (row['สาขา'] || row['Branch'] || '').toString().trim();
        const region = (row['ภาค'] || row['Region'] || '').toString().trim();
        const taxId = (row['เลขประจำตัวผู้เสียภาษี'] || row['เลขผู้เสียภาษี'] || row['Tax ID'] || row['TaxId'] || '').toString().trim();
        const phone = (row['เบอร์โทรศัพท์'] || row['เบอร์โทร'] || row['โทร'] || row['Phone'] || row['Tel'] || '').toString().trim();
        const email = (row['อีเมล'] || row['Email'] || '').toString().trim();
        const address = (row['ที่อยู่'] || row['Address'] || '').toString().trim();

        const isSub = branchRaw && !branchRaw.includes('สำนักงานใหญ่') && branchRaw !== 'Head Office';
        const branchType = isSub ? 'sub' : 'head';
        const branchName = isSub ? branchRaw.replace(/^สาขา\s*/, '') : '';
        const branch = isSub ? (branchRaw.startsWith('สาขา') ? branchRaw : `สาขา ${branchRaw}`) : 'สำนักงานใหญ่';

        // Check duplicate
        if (!existingNameMap.has(name.toLowerCase())) {
          const newCust = {
            id: crypto.randomUUID(),
            name,
            companyName,
            taxId,
            branchType,
            branchName,
            branch,
            region,
            phone,
            email,
            address,
            createdAt: new Date().toISOString()
          };
          importedCustomers.push(newCust);
          existingNameMap.set(name.toLowerCase(), newCust);
        }
      });

      if (importedCustomers.length === 0) {
        showToast('ไม่พบข้อมูลลูกค้าใหม่ หรือรายชื่อลูกค้าในไฟล์มีอยู่ในระบบแล้วทั้งหมด', 'info');
        return;
      }

      await onImportCustomers(importedCustomers);
      if (addActivityLog) {
        addActivityLog(`นำเข้าข้อมูลลูกค้าใหม่ ${importedCustomers.length} รายการจากไฟล์ Excel`);
      }
      showToast(`นำเข้าข้อมูลลูกค้าสำเร็จ ${importedCustomers.length} รายการ!`, 'success');
    } catch (err) {
      showToast(`เกิดข้อผิดพลาดในการอ่านไฟล์ Excel: ${err.message}`, 'error');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Customers in quotations that are not yet in the customers database
  const unimportedQuotationsCustomers = useMemo(() => {
    const map = new Map();
    quotations.forEach(q => {
      const name = (q.customer?.name || '').trim();
      const comp = (q.customer?.companyName || '').trim();
      if (!name && !comp) return;
      const key = `${name.toLowerCase()}__${comp.toLowerCase()}`;
      const exists = customers.some(c => {
        const cName = (c.name || '').trim().toLowerCase();
        const cComp = (c.companyName || '').trim().toLowerCase();
        return (cName && name && cName === name.toLowerCase()) || (cComp && comp && cComp === comp.toLowerCase());
      });
      if (!exists && !map.has(key)) {
        map.set(key, {
          id: crypto.randomUUID(),
          name: name || comp,
          companyName: comp,
          phone: (q.customer?.phone || '').trim(),
          email: (q.customer?.email || '').trim(),
          taxId: (q.customer?.taxId || '').trim(),
          address: (q.customer?.address || '').trim(),
          note: `ดึงข้อมูลจากประวัติใบเสนอราคา ${q.quotationNumber || ''}`.trim(),
          status: 'Active',
          createdAt: q.issuedDate ? new Date(q.issuedDate).toISOString() : new Date().toISOString()
        });
      }
    });
    return Array.from(map.values());
  }, [customers, quotations]);

  // Sync customers from quotations
  const handleSyncFromQuotations = async () => {
    if (unimportedQuotationsCustomers.length === 0) {
      showToast('ข้อมูลลูกค้าจากใบเสนอราคาทั้งหมดมีอยู่ในระบบแล้ว', 'info');
      return;
    }
    try {
      setIsSyncing(true);
      await onImportCustomers(unimportedQuotationsCustomers);
      if (addActivityLog) {
        addActivityLog(`ดึงข้อมูลลูกค้าจากประวัติใบเสนอราคา ${unimportedQuotationsCustomers.length} รายการ`);
      }
      showToast(`ดึงข้อมูลลูกค้าจากใบเสนอราคาสำเร็จ ${unimportedQuotationsCustomers.length} รายการ`, 'success');
    } catch (err) {
      showToast(`เกิดข้อผิดพลาดในการดึงข้อมูล: ${err.message}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Color generator for avatar
  const getAvatarColor = (name = '') => {
    const colors = [
      'bg-blue-500 text-white',
      'bg-indigo-500 text-white',
      'bg-purple-500 text-white',
      'bg-emerald-500 text-white',
      'bg-rose-500 text-white',
      'bg-amber-500 text-white',
      'bg-cyan-500 text-white'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="space-y-6 animate-fade-in text-[#1d1d1f] w-full min-w-0">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-[#0071e3] to-[#00c2ff]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0071e3]">
              CUSTOMER RELATIONSHIP MANAGEMENT
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#1d1d1f] leading-none">
            จัดการข้อมูลลูกค้า
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Hidden Excel Input */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".xlsx,.xls" 
            className="hidden" 
          />

          {/* Sync from quotations button */}
          {canPerformAction(currentUser, 'customers.create') && unimportedQuotationsCustomers.length > 0 && (
            <button
              type="button"
              onClick={handleSyncFromQuotations}
              disabled={isSyncing}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="ดึงข้อมูลลูกค้าที่พบในประวัติใบเสนอราคาแต่ยังไม่มีในระบบ"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>ดึงจากใบเสนอราคา ({unimportedQuotationsCustomers.length})</span>
            </button>
          )}


          {canPerformAction(currentUser, 'customers.create') && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="group relative overflow-hidden px-4 py-2 bg-gradient-to-r from-[#0071e3] to-[#0096ff] hover:from-[#0080ff] hover:to-[#00a8ff] text-white text-xs font-bold rounded-xl shadow-md hover:shadow-blue-500/25 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มลูกค้าใหม่</span>
            </button>
          )}
        </div>
      </div>


      {/* Search and Filters Bar */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-[#d2d2d7]/40 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาชื่อ, บริษัท, โทร, อีเมล..."
            className="w-full pl-9 pr-8 py-2 bg-[#f5f5f7] border-0 rounded-xl text-xs font-semibold placeholder:text-zinc-400 focus:bg-white focus:ring-2 focus:ring-[#0071e3]/30 transition-all outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills & Sort */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
          <div className="flex bg-[#f5f5f7] p-1 rounded-xl gap-0.5 text-xs font-bold">
          </div>

          <div className="flex items-center gap-1.5 pl-2 sm:border-l border-zinc-200">
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-xs font-bold text-zinc-700 outline-none cursor-pointer"
            >
              <option value="newest">เพิ่มล่าสุด</option>
              <option value="name_asc">ชื่อ (ก-ฮ)</option>
              <option value="name_desc">ชื่อ (ฮ-ก)</option>
              <option value="quotes_desc">ใบเสนอราคามากสุด</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customer List / Table */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/40 shadow-xs overflow-hidden">
        {filteredCustomers.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-zinc-800">ไม่พบข้อมูลลูกค้า</h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              {searchTerm ? 'ลองค้นหาด้วยคำอื่น หรือกดล้างการค้นหา' : 'ยังไม่มีข้อมูลลูกค้าในระบบ กดปุ่ม "เพิ่มลูกค้าใหม่" หรือดึงจากประวัติใบเสนอราคาเพื่อเริ่มต้น'}
            </p>
            {canPerformAction(currentUser, 'customers.create') && !searchTerm && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={handleOpenAdd}
                  className="px-4 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>เพิ่มลูกค้าใหม่</span>
                </button>
                {unimportedQuotationsCustomers.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSyncFromQuotations}
                    disabled={isSyncing}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>ดึงข้อมูลจากใบเสนอราคา ({unimportedQuotationsCustomers.length} รายการ)</span>
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f5f5f7]/80 text-[#86868b] uppercase tracking-wider font-extrabold text-[10.5px] border-b border-[#d2d2d7]/40 select-none">
                <tr>
                  <th className="py-3.5 pl-6 pr-4">ข้อมูลลูกค้า / บริษัท</th>
                  <th className="py-3.5 px-4">สำนักงานใหญ่ / สาขา / ภาค</th>
                  <th className="py-3.5 px-4">ข้อมูลติดต่อ</th>
                  <th className="py-3.5 px-4">ที่อยู่</th>
                  <th className="py-3.5 px-4 text-center">ใบเสนอราคา</th>
                  <th className="py-3.5 px-4 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d2d2d7]/30">
                {filteredCustomers.map((customer) => {
                  const quotes = customerQuotesMap.get(customer.id) || [];
                  const initials = (customer.name || 'C').slice(0, 2);
                  const isSubBranch = customer.branchType === 'sub' || (customer.branch && !customer.branch.includes('สำนักงานใหญ่'));

                  return (
                    <tr 
                      key={customer.id} 
                      className="hover:bg-zinc-50/80 transition-colors group"
                    >
                      {/* Name & Company */}
                      <td className="py-3.5 pl-6 pr-4">
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-zinc-900 flex items-center gap-2 truncate">
                            <span>{customer.name || '-'}</span>
                          </div>
                          {customer.companyName ? (
                            <div className="text-xs text-zinc-600 font-medium truncate mt-0.5">
                              <span>{customer.companyName}</span>
                            </div>
                          ) : (
                            <div className="text-[11px] text-zinc-400 font-normal">
                              บุคคลธรรมดา
                            </div>
                          )}
                          {customer.taxId && (
                            <div className="text-[10px] font-mono text-zinc-500 mt-0.5 flex items-center gap-1">
                              <span className="text-zinc-400 font-sans font-bold">TAX:</span>
                              <span className="font-semibold text-zinc-600">{customer.taxId}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Branch & Region */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div>
                            {isSubBranch ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-amber-50 text-amber-800 border border-amber-200/70">
                                <span className="truncate max-w-[140px]">{customer.branchName ? `สาขา ${customer.branchName}` : (customer.branch || 'สาขาย่อย')}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-blue-50 text-[#0071e3] border border-blue-200/70">
                                <span>สำนักงานใหญ่</span>
                              </span>
                            )}
                          </div>
                          {customer.region ? (
                            <div className="text-[11px] font-semibold text-zinc-600">
                              <span>{customer.region}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-zinc-400">- ไม่ระบุภาค -</span>
                          )}
                        </div>
                      </td>

                      {/* Contact: Phone & Email */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          {customer.phone ? (
                            <div className="flex items-center gap-1.5 text-xs text-zinc-700 font-semibold">
                              <span>{customer.phone}</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(customer.phone, `p-${customer.id}`)}
                                className="text-zinc-400 hover:text-[#0071e3] transition-colors p-0.5 cursor-pointer"
                                title="คัดลอกเบอร์โทร"
                              >
                                {copiedId === `p-${customer.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-zinc-400">- ไม่ระบุเบอร์โทร -</span>
                          )}

                          {customer.email && (
                            <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
                              <span className="truncate max-w-[170px]" title={customer.email}>
                                {customer.email}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(customer.email, `e-${customer.id}`)}
                                className="text-zinc-400 hover:text-[#0071e3] transition-colors p-0.5 cursor-pointer shrink-0"
                                title="คัดลอกอีเมล"
                              >
                                {copiedId === `e-${customer.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Address */}
                      <td className="py-3.5 px-4">
                        <div className="max-w-xs space-y-1">
                          {customer.address ? (
                            <div className="text-xs text-zinc-600 line-clamp-2" title={customer.address}>
                              <span className="leading-relaxed">{customer.address}</span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-zinc-400">- ไม่ระบุที่อยู่ -</span>
                          )}
                          {customer.note && (
                            <div className="text-[11px] text-zinc-500 bg-transparent rounded px-1.5 py-0.5 truncate border border-zinc-200/40" title={customer.note}>
                              <span className="font-semibold text-zinc-500">หมายเหตุ:</span> {customer.note}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Linked Quotations Badge */}
                      <td className="py-3.5 px-4 text-center">
                        {quotes.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setHistoryTarget({ ...customer, quotes })}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-[#0071e3]/10 text-[#0071e3] hover:bg-[#0071e3]/20 transition-all cursor-pointer"
                          >
                            <FileText className="w-3 h-3" />
                            <span>{quotes.length} รายการ</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-zinc-400 font-medium">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {canPerformAction(currentUser, 'customers.edit') && (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(customer)}
                              className="p-1.5 text-[#0071e3] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="แก้ไขข้อมูลลูกค้า"
                            >
                              <i className="bi bi-pencil-square text-base"></i>
                            </button>
                          )}
                          {canPerformAction(currentUser, 'customers.delete') && (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmTarget(customer)}
                              className="p-1.5 text-red-650 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="ลบข้อมูลลูกค้า"
                            >
                              <i className="bi bi-trash3 text-base"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add / Edit Customer */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 no-print animate-fade-in">
          {/* Frosted Glass Backdrop */}
          <div
            onClick={() => setIsModalOpen(false)}
            className="absolute inset-0 bg-black/30 backdrop-blur-md transition-opacity animate-fade-in"
          />

          <div className="relative bg-white rounded-3xl border border-[#d2d2d7]/40 shadow-2xl max-w-2xl w-full max-h-[90vh] md:max-h-[85vh] flex flex-col z-10 animate-scale-in overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#e8e8ed] flex items-center justify-between bg-white flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold text-[#1d1d1f] tracking-tight">
                  {modalMode === 'add' ? 'เพิ่มลูกค้าใหม่ลงในระบบ' : 'แก้ไขข้อมูลลูกค้าในระบบ'}
                </h3>
                <p className="text-xs text-[#555557] mt-1">
                  {modalMode === 'add' ? 'กรอกข้อมูลรายละเอียดลูกค้าด้านล่างเพื่อเพิ่มข้อมูลลูกค้าเข้าสู่ระบบ' : 'ปรับปรุงข้อมูลลูกค้าและช่องทางการติดต่อในระบบ'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-[#555557] hover:bg-[#f5f5f7] hover:text-black transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-5 bg-[#f5f5f7]/40">
              <form id="customer-form" onSubmit={handleSave} className="space-y-4">
                <div className="bg-white p-5 rounded-2xl border border-[#d2d2d7]/50 shadow-xs space-y-4">
                  {formError && (
                    <div className="p-3.5 text-xs bg-red-50 text-red-600 border border-red-100/50 rounded-xl animate-fade-in flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* Form fields: เฉพาะที่ผู้ใช้กำหนด */}
                  <div className="space-y-4">
                    {/* Row 1: ชื่อลูกค้า และ ชื่อบริษัท */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="min-w-0">
                        <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                          ชื่อลูกค้า <span className="text-red-500">*</span>
                        </label>
                        <input
                          ref={refCustName}
                          type="text"
                          required
                          value={form.name}
                          onChange={(e) => { setForm(f => ({ ...f, name: e.target.value })); clearCustFieldError('name'); }}
                         
                          className={`w-full px-3.5 py-2.5 bg-[#f5f5f7] rounded-xl text-xs font-semibold border focus:bg-white focus:ring-2 focus:ring-[#0071e3]/20 transition-all outline-none ${errorFields.name ? 'border-red-500 ring-1 ring-red-500/30' : 'border-transparent focus:border-[#0071e3]'}`}
                        />
                      </div>

                      <div className="min-w-0">
                        <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                          ชื่อบริษัท <span className="text-red-500">*</span>
                        </label>
                        <input
                          ref={refCustCompany}
                          type="text"
                          required
                          value={form.companyName}
                          onChange={(e) => { setForm(f => ({ ...f, companyName: e.target.value })); clearCustFieldError('companyName'); }}
                         
                          className={`w-full px-3.5 py-2.5 bg-[#f5f5f7] rounded-xl text-xs font-semibold border focus:bg-white focus:ring-2 focus:ring-[#0071e3]/20 transition-all outline-none ${errorFields.companyName ? 'border-red-500 ring-1 ring-red-500/30' : 'border-transparent focus:border-[#0071e3]'}`}
                        />
                      </div>
                    </div>

                    {/* Row 2: เลขผู้เสียภาษี และ ภาค (6 ภาค) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="min-w-0">
                        <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                          เลขประจำตัวผู้เสียภาษี <span className="text-red-500">*</span>
                        </label>
                        <input
                          ref={refCustTaxId}
                          type="text"
                          required
                          maxLength={13}
                          value={form.taxId}
                          onChange={(e) => { setForm(f => ({ ...f, taxId: e.target.value.replace(/\D/g, '').slice(0, 13) })); clearCustFieldError('taxId'); }}
                         
                          className={`w-full px-3.5 py-2.5 bg-[#f5f5f7] rounded-xl text-xs font-mono font-semibold border focus:bg-white focus:ring-2 focus:ring-[#0071e3]/20 transition-all outline-none ${errorFields.taxId ? 'border-red-500 ring-1 ring-red-500/30' : 'border-transparent focus:border-[#0071e3]'}`}
                        />
                      </div>

                      {/* ภาค 6 ภาค */}
                      <div className="min-w-0">
                        <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                          ภาค (6 ภูมิภาค) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <select
                            ref={refCustRegion}
                            required
                            value={form.region}
                            onChange={(e) => { setForm(f => ({ ...f, region: e.target.value })); clearCustFieldError('region'); }}
                            className={`w-full px-3.5 pr-8 py-2.5 bg-[#f5f5f7] rounded-xl text-xs font-semibold border focus:bg-white focus:ring-2 focus:ring-[#0071e3]/20 transition-all outline-none cursor-pointer appearance-none ${errorFields.region ? 'border-red-500 ring-1 ring-red-500/30' : 'border-transparent focus:border-[#0071e3]'}`}
                          >
                            <option value="">-- เลือกภาค --</option>
                            {THAI_REGIONS.map(r => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 text-[10px]">
                            ▼
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Row 3: สำนักงานใหญ่ / สาขา แบบ Dropdown แตกกิ่ง */}
                    <div className="min-w-0 space-y-1.5">
                      <label className="block text-xs font-bold text-zinc-700">
                        สำนักงานใหญ่ / สาขา <span className="text-red-500">*</span>
                      </label>
                      <div className="relative max-w-sm">
                        <select
                          value={form.branchType}
                          onChange={(e) => {
                            const val = e.target.value;
                            setForm(f => ({
                              ...f,
                              branchType: val,
                              branchName: val === 'head' ? '' : f.branchName
                            }));
                          }}
                          className="w-full px-3.5 pr-8 py-2.5 bg-[#f5f5f7] text-[#1d1d1f] rounded-xl text-xs font-semibold border border-transparent focus:bg-white focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20 transition-all outline-none cursor-pointer appearance-none"
                        >
                          <option value="head">สำนักงานใหญ่</option>
                          <option value="sub">สาขาย่อย (แตกออกเพื่อระบุสาขา)</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 text-[10px]">
                          ▼
                        </div>
                      </div>

                      {/* แตกกิ่งออกสำหรับระบุชื่อหรือรหัสสาขาย่อย */}
                      {form.branchType === 'sub' && (
                        <div className="pt-1.5 animate-fade-in pl-3 border-l-2 border-amber-300 ml-2 space-y-1 max-w-md">
                          <div className="flex items-center gap-1 text-[11px] font-bold text-amber-700">
                            <span>↳ ระบุชื่อหรือรหัสสาขาย่อย: <span className="text-red-500">*</span></span>
                          </div>
                          <input
                            ref={refCustBranchName}
                            type="text"
                            required={form.branchType === 'sub'}
                            
                            value={form.branchName}
                            autoFocus
                            onChange={(e) => { setForm(f => ({ ...f, branchName: e.target.value })); clearCustFieldError('branchName'); }}
                            className={`w-full px-3.5 py-2 bg-white rounded-xl text-xs font-semibold border transition-all outline-none shadow-2xs ${errorFields.branchName ? 'border-red-500 ring-1 ring-red-500/30' : 'border-amber-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'}`}
                          />
                        </div>
                      )}
                    </div>

                    {/* Row 4: เบอร์โทร และ อีเมล */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="min-w-0">
                        <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                          เบอร์โทร <span className="text-red-500">*</span>
                        </label>
                        <input
                          ref={refCustPhone}
                          type="tel"
                          required
                          value={form.phone}
                          onChange={(e) => { setForm(f => ({ ...f, phone: e.target.value })); clearCustFieldError('phone'); }}
                       
                          className={`w-full px-3.5 py-2.5 bg-[#f5f5f7] rounded-xl text-xs font-semibold border focus:bg-white focus:ring-2 focus:ring-[#0071e3]/20 transition-all outline-none ${errorFields.phone ? 'border-red-500 ring-1 ring-red-500/30' : 'border-transparent focus:border-[#0071e3]'}`}
                        />
                      </div>

                      <div className="min-w-0">
                        <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                          email <span className="text-red-500">*</span>
                        </label>
                        <input
                          ref={refCustEmail}
                          type="email"
                          required
                          value={form.email}
                          onChange={(e) => { setForm(f => ({ ...f, email: e.target.value })); clearCustFieldError('email'); }}
                      
                          className={`w-full px-3.5 py-2.5 bg-[#f5f5f7] rounded-xl text-xs font-semibold border focus:bg-white focus:ring-2 focus:ring-[#0071e3]/20 transition-all outline-none ${errorFields.email ? 'border-red-500 ring-1 ring-red-500/30' : 'border-transparent focus:border-[#0071e3]'}`}
                        />
                      </div>
                    </div>

                    {/* Row 5: ที่อยู่ */}
                    <div className="min-w-0">
                      <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                        ที่อยู่ <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        ref={refCustAddress}
                        rows={3}
                        required
                        value={form.address}
                        onChange={(e) => { setForm(f => ({ ...f, address: e.target.value })); clearCustFieldError('address'); }}
            
                        className={`w-full px-3.5 py-2.5 bg-[#f5f5f7] rounded-xl text-xs font-semibold border focus:bg-white focus:ring-2 focus:ring-[#0071e3]/20 transition-all outline-none resize-none leading-relaxed ${errorFields.address ? 'border-red-500 ring-1 ring-red-500/30' : 'border-transparent focus:border-[#0071e3]'}`}
                      />
                    </div>

                    {/* Row 6: หมายเหตุ */}
                    <div className="min-w-0">
                      <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                        หมายเหตุ <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        ref={refCustNote}
                        rows={2}
                        required
                        value={form.note}
                        onChange={(e) => { setForm(f => ({ ...f, note: e.target.value })); clearCustFieldError('note'); }}
             
                        className={`w-full px-3.5 py-2.5 bg-[#f5f5f7] rounded-xl text-xs font-semibold border focus:bg-white focus:ring-2 focus:ring-[#0071e3]/20 transition-all outline-none resize-none leading-relaxed ${errorFields.note ? 'border-red-500 ring-1 ring-red-500/30' : 'border-transparent focus:border-[#0071e3]'}`}
                      />
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-[#e8e8ed] bg-white flex justify-end gap-2.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 border border-[#d2d2d7] text-[#1d1d1f] bg-white rounded-xl hover:bg-[#f5f5f7] font-semibold text-xs transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                form="customer-form"
                className="px-6 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{modalMode === 'add' ? 'บันทึกข้อมูลลูกค้า' : 'อัปเดตข้อมูลลูกค้า'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Delete Confirmation */}
      {deleteConfirmTarget && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print animate-fade-in">
          <div
            onClick={() => setDeleteConfirmTarget(null)}
            className="absolute inset-0 bg-black/30 backdrop-blur-md transition-opacity animate-fade-in"
          />
          <div className="relative bg-white rounded-3xl border border-[#d2d2d7]/50 shadow-2xl w-full max-w-sm p-6 space-y-4 z-10 animate-scale-in text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900">ยืนยันการลบลูกค้า</h3>
              <p className="text-xs text-zinc-500 mt-1">
                ต้องการลบข้อมูล <strong className="text-zinc-800 font-bold">{deleteConfirmTarget.name}</strong> หรือไม่?
              </p>
              {(customerQuotesMap.get(deleteConfirmTarget.id) || []).length > 0 && (
                <div className="mt-2.5 p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] font-semibold text-left flex items-start gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <span>
                    ลูกค้ารายนี้มีประวัติใบเสนอราคาในระบบ {(customerQuotesMap.get(deleteConfirmTarget.id) || []).length} ฉบับ ข้อมูลเอกสารเดิมจะไม่สูญหาย
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmTarget(null)}
                className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl transition-all cursor-pointer flex-1"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex-1"
              >
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal / Drawer: Customer Quotation History */}
      {historyTarget && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print animate-fade-in">
          <div
            onClick={() => setHistoryTarget(null)}
            className="absolute inset-0 bg-black/30 backdrop-blur-md transition-opacity animate-fade-in"
          />
          <div className="relative bg-white rounded-3xl border border-[#d2d2d7]/50 shadow-2xl w-full max-w-lg z-10 overflow-hidden animate-scale-in">
            <div className="px-6 py-4 border-b border-[#d2d2d7]/30 flex items-center justify-between bg-[#f5f5f7]/50">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">
                  ประวัติใบเสนอราคา: {historyTarget.name}
                </h3>
                <span className="text-[11px] text-zinc-500">
                  {historyTarget.companyName || 'ลูกค้าทั่วไป'} · {historyTarget.quotes?.length || 0} รายการ
                </span>
              </div>
              <button
                type="button"
                onClick={() => setHistoryTarget(null)}
                className="w-7 h-7 rounded-full bg-zinc-200/60 hover:bg-zinc-200 text-zinc-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 max-h-80 overflow-y-auto divide-y divide-zinc-100">
              {historyTarget.quotes?.map((q) => (
                <div key={q.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-bold text-zinc-900">
                      {q.quotationNumber || q.id}
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">
                      วันที่: {q.issuedDate || '-'} · โดย {q.salespersonName || q.createdBy || '-'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-zinc-900">
                      ฿{Number(q.totalAmount || 0).toLocaleString()}
                    </div>
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${
                      q.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                      q.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                      'bg-zinc-100 text-zinc-600'
                    }`}>
                      {q.status === 'approved' ? 'อนุมัติแล้ว' : q.status === 'sent' ? 'ส่งแล้ว' : 'ฉบับร่าง'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex justify-end">
              <button
                type="button"
                onClick={() => setHistoryTarget(null)}
                className="px-4 py-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
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
