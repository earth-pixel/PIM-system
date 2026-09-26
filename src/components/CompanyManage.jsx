import { useState, useEffect, useRef } from 'react';
import {
  Building2, Phone, Mail, Globe, MapPin, Check,
  Save, RotateCcw, Eye, ShieldCheck, Hash, Smartphone,
  Stamp, PenTool, Upload, Trash2, Image as ImageIcon
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

export default function CompanyManage({
  companyInfo = {},
  onUpdateCompanyInfo,
  currentUser,
  addActivityLog
}) {
  const showToast = useToast();
  const stampInputRef = useRef(null);
  const signatureInputRef = useRef(null);
  const logoInputRef = useRef(null);

  // Form state focusing strictly on Header (Image 1) & Stamp/Signature (Image 2)
  const [form, setForm] = useState({
    name: companyInfo.name || 'บริษัท พันธ์วาดี จำกัด (สำนักงานใหญ่)',
    nameEn: companyInfo.nameEn || 'Phanvadee Co., Ltd.',
    address: companyInfo.address || '19/9 ซ.ทวีวัฒนา-กาญจนาภิเษก 16 แขวง/เขต ทวีวัฒนา กทม. 10170',
    taxId: companyInfo.taxId || '0105546026064',
    phone: companyInfo.phone || '02-4315111',
    mobile: companyInfo.mobile || '02-0055666',
    email: companyInfo.email || 'info@phanvadee.co.th',
    website: companyInfo.website || 'https://www.phanvadee.com',
    logo: companyInfo.logo || '',
    stampImage: companyInfo.stampImage || '',
    signatureImage: companyInfo.signatureImage || '',
    signerTitle: companyInfo.signerTitle || 'ผู้อนุมัติ',
    signerName: companyInfo.signerName || '',
  });

  const [initialData, setInitialData] = useState(form);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const updated = {
      name: companyInfo.name || 'บริษัท พันธ์วาดี จำกัด (สำนักงานใหญ่)',
      nameEn: companyInfo.nameEn || 'Phanvadee Co., Ltd.',
      address: companyInfo.address || '19/9 ซ.ทวีวัฒนา-กาญจนาภิเษก 16 แขวง/เขต ทวีวัฒนา กทม. 10170',
      taxId: companyInfo.taxId || '0105546026064',
      phone: companyInfo.phone || '02-4315111',
      mobile: companyInfo.mobile || '02-0055666',
      email: companyInfo.email || 'info@phanvadee.co.th',
      website: companyInfo.website || 'https://www.phanvadee.com',
      logo: companyInfo.logo || '',
      stampImage: companyInfo.stampImage || '',
      signatureImage: companyInfo.signatureImage || '',
      signerTitle: companyInfo.signerTitle || 'ผู้อนุมัติ',
      signerName: companyInfo.signerName || '',
    };
    setForm(updated);
    setInitialData(updated);
  }, [companyInfo]);

  useEffect(() => {
    const changed = Object.keys(form).some(key => form[key] !== initialData[key]);
    setHasChanges(changed);
  }, [form, initialData]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (field, file) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast('ไฟล์รูปภาพต้องมีขนาดไม่เกิน 2MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      if (field === 'signatureImage' || field === 'stampImage') {
        setForm(prev => ({ ...prev, signatureImage: dataUrl, stampImage: dataUrl }));
      } else {
        handleChange(field, dataUrl);
      }
      showToast('อัปโหลดรูปภาพเรียบร้อย', 'info');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!form.name.trim()) {
      showToast('กรุณากรอกชื่อบริษัท (ภาษาไทย)', 'error');
      return;
    }
    if (!form.taxId.trim()) {
      showToast('กรุณากรอกเลขประจำตัวผู้เสียภาษี', 'error');
      return;
    }
    if (!form.address.trim()) {
      showToast('กรุณากรอกที่อยู่บริษัท', 'error');
      return;
    }

    setIsSaving(true);
    try {
      if (onUpdateCompanyInfo) {
        await onUpdateCompanyInfo(form);
      }
      setInitialData(form);
      setHasChanges(false);
      setSavedSuccess(true);
      showToast('บันทึกข้อมูลบริษัทเรียบร้อย ข้อมูลจะแสดงในใบเสนอราคาทันที', 'success');

      if (addActivityLog) {
        addActivityLog({
          action: 'แก้ไขข้อมูลบริษัท',
          details: `อัปเดตข้อมูลหัวเอกสารและลายเซ็นบริษัท ${form.name.trim()}`,
          target: form.name.trim(),
          category: 'company',
        });
      }

      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      showToast(err?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const activeSignature = form.signatureImage || form.stampImage || '';

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-fade-in text-[#1d1d1f]">
      {/* ── Top Header Banner ────────────────────────────────── */}
      <div className="bg-white/80 backdrop-blur-md p-5 sm:p-6 rounded-3xl border border-[#d2d2d7]/50 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0071e3] to-[#409cff] flex items-center justify-center text-white shadow-[0_4px_16px_rgba(0,113,227,0.3)] shrink-0">
            <Building2 className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-[#1d1d1f] tracking-tight leading-none">
                จัดการข้อมูลบริษัท
              </h1>
            </div>
            
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">

          <button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className={`px-5 py-2.5 text-xs font-bold rounded-full text-white transition-all flex items-center gap-2 shadow-md cursor-pointer ${
              hasChanges && !isSaving
                ? 'bg-gradient-to-r from-[#0071e3] to-[#0077ed] hover:from-[#0077ed] hover:to-[#0085ff] shadow-[0_4px_16px_rgba(0,113,227,0.3)]'
                : savedSuccess
                ? 'bg-emerald-600 shadow-[0_4px_16px_rgba(16,185,129,0.3)]'
                : 'bg-zinc-300 text-zinc-500 cursor-not-allowed shadow-none'
            }`}
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>บันทึกแล้ว!</span>
              </>
            ) : isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>กำลังบันทึก...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 stroke-[2.2]" />
                <span>บันทึกข้อมูล</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Main Layout: Edit Form & Live Preview ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Fields (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: ข้อมูลหัวเอกสารบริษัท (ตรงตามรูปที่ 1) */}
          <div className="bg-white rounded-3xl border border-[#d2d2d7]/50 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#e8e8ed] pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#0071e3]" />
                <h2 className="text-xs font-bold text-[#1d1d1f] uppercase tracking-wider">
                  1. ข้อมูลหัวเอกสารบริษัท (Header)
                </h2>
              </div>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                แสดงด้านบนของเอกสาร
              </span>
            </div>

            <div className="space-y-4">
              {/* Logo Upload */}
              <div>
                <label className="text-xs text-[#555557] font-semibold mb-1.5 block">
                  โลโก้บริษัท (Logo)
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-[#f5f5f7] border border-zinc-200 p-1.5 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                    {form.logo ? (
                      <img src={form.logo} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <svg viewBox="0 0 160 160" className="w-full h-full fill-[#1d1d1f]" xmlns="http://www.w3.org/2000/svg">
                        <path d="M 60 48 L 60 36 L 100 21 L 100 33 Z" />
                        <path d="M 60 70 L 60 58 L 100 43 L 100 55 Z" />
                        <path d="M 60 92 L 60 80 L 100 65 L 100 77 Z" />
                        <text x="80" y="115" fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif" fontWeight="900" fontSize="19.5" textAnchor="middle" letterSpacing="0.4">PHANVADEE</text>
                        <text x="80" y="132" fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif" fontWeight="500" fontSize="9.5" textAnchor="middle" letterSpacing="0.1">think global, act local</text>
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={logoInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={e => handleFileUpload('logo', e.target.files?.[0])}
                      />
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="px-3 py-1.5 bg-white border border-[#d2d2d7] hover:bg-zinc-50 rounded-xl text-xs font-bold text-zinc-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>เปลี่ยนโลโก้</span>
                      </button>
                      {form.logo && (
                        <button
                          type="button"
                          onClick={() => handleChange('logo', '')}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="ใช้โลโก้เริ่มต้น"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-400">รองรับไฟล์ PNG, JPG ขนาดไม่เกิน 2MB (หากไม่ใส่จะใช้โลโก้เริ่มต้น)</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#555557] font-semibold mb-1 block">
                    ชื่อบริษัท (ภาษาไทย) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => handleChange('name', e.target.value)}
                    placeholder="เช่น บริษัท พันธ์วาดี จำกัด (สำนักงานใหญ่)"
                    className="w-full text-xs text-[#1d1d1f] bg-[#f5f5f7] border border-[#d2d2d7]/60 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#555557] font-semibold mb-1 block">
                    ชื่อบริษัท (ภาษาอังกฤษ)
                  </label>
                  <input
                    type="text"
                    value={form.nameEn}
                    onChange={e => handleChange('nameEn', e.target.value)}
                    placeholder="เช่น Phanvadee Co., Ltd."
                    className="w-full text-xs text-[#1d1d1f] bg-[#f5f5f7] border border-[#d2d2d7]/60 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-[#555557] font-semibold mb-1 block">
                  ที่อยู่สำนักงาน <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={form.address}
                  onChange={e => handleChange('address', e.target.value)}
                  placeholder="เช่น 19/9 ซ.ทวีวัฒนา-กาญจนาภิเษก 16 แขวง/เขต ทวีวัฒนา กทม. 10170"
                  className="w-full text-xs text-[#1d1d1f] bg-[#f5f5f7] border border-[#d2d2d7]/60 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all font-medium resize-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#555557] font-semibold mb-1 block">
                    เบอร์โทรศัพท์ (โทร)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={form.phone}
                      onChange={e => handleChange('phone', e.target.value)}
                      placeholder="เช่น 02-4315111"
                      className="w-full text-xs text-[#1d1d1f] bg-[#f5f5f7] border border-[#d2d2d7]/60 rounded-xl pl-9 pr-3.5 py-2.5 focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-[#555557] font-semibold mb-1 block">
                    เบอร์โทรศัพท์มือถือ (ถ้ามี)
                  </label>
                  <div className="relative">
                    <Smartphone className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={form.mobile}
                      onChange={e => handleChange('mobile', e.target.value)}
                      placeholder="เช่น 02-0055666"
                      className="w-full text-xs text-[#1d1d1f] bg-[#f5f5f7] border border-[#d2d2d7]/60 rounded-xl pl-9 pr-3.5 py-2.5 focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#555557] font-semibold mb-1 block">
                    อีเมล (Email)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => handleChange('email', e.target.value)}
                      placeholder="info@phanvadee.co.th"
                      className="w-full text-xs text-[#1d1d1f] bg-[#f5f5f7] border border-[#d2d2d7]/60 rounded-xl pl-9 pr-3.5 py-2.5 focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-[#555557] font-semibold mb-1 block">
                    เว็บไซต์ (Website)
                  </label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={form.website}
                      onChange={e => handleChange('website', e.target.value)}
                      placeholder="https://www.phanvadee.com"
                      className="w-full text-xs text-[#1d1d1f] bg-[#f5f5f7] border border-[#d2d2d7]/60 rounded-xl pl-9 pr-3.5 py-2.5 focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all font-medium"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-[#555557] font-semibold mb-1 block">
                  เลขประจำตัวผู้เสียภาษี <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={form.taxId}
                    onChange={e => handleChange('taxId', e.target.value)}
                    placeholder="เช่น 0105546026064"
                    maxLength={20}
                    className="w-full text-xs text-[#1d1d1f] bg-[#f5f5f7] border border-[#d2d2d7]/60 rounded-xl pl-9 pr-3.5 py-2.5 focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all font-mono font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: ข้อมูลผู้ลงนามและลายเซ็น */}
          <div className="bg-white rounded-3xl border border-[#d2d2d7]/50 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#e8e8ed] pb-3">
              <div className="flex items-center gap-2">
                <PenTool className="w-4 h-4 text-[#0071e3]" />
                <h2 className="text-xs font-bold text-[#1d1d1f] uppercase tracking-wider">
                  2. ข้อมูลผู้มีอำนาจลงนามและลายเซ็น (Signer & Signature)
                </h2>
              </div>
              <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-200">
                แสดงท้ายเอกสาร
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
              {/* รูปลายเซ็น */}
              <div className="space-y-3">
                <label className="text-xs text-[#555557] font-semibold block">
                  รูปลายเซ็นผู้ลงนาม / ผู้อนุมัติ (Signature Image)
                </label>

                <div className="flex flex-col items-center justify-center p-4 bg-[#f9f9fb] border border-zinc-200 rounded-2xl gap-3 text-center">
                  {/* Signature Preview Frame (Rectangular - No Circle) */}
                  <div className="w-full max-w-[240px] h-24 rounded-2xl bg-white border border-zinc-200 flex items-center justify-center p-2 text-center overflow-hidden shadow-2xs">
                    {activeSignature ? (
                      <img src={activeSignature} alt="Signature" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-zinc-400 select-none">
                        <PenTool className="w-5 h-5 text-zinc-300 stroke-[1.5]" />
                        <span className="text-[10px] font-medium text-zinc-400">ยังไม่มีรูปลายเซ็น (ใช้เซ็นสดด้วยมือ)</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={signatureInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={e => handleFileUpload('signatureImage', e.target.files?.[0])}
                    />
                    <button
                      type="button"
                      onClick={() => signatureInputRef.current?.click()}
                      className="px-3.5 py-1.5 bg-white border border-[#d2d2d7] hover:bg-zinc-50 rounded-xl text-xs font-bold text-zinc-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{activeSignature ? 'เปลี่ยนรูปลายเซ็น' : 'อัปโหลดรูปลายเซ็น'}</span>
                    </button>
                    {activeSignature && (
                      <button
                        type="button"
                        onClick={() => {
                          handleChange('signatureImage', '');
                          handleChange('stampImage', '');
                        }}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer border border-red-200"
                        title="ลบรูปลายเซ็น (ใช้เส้นประจุด)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-400">แนะนำรูปภาพ PNG โปร่งแสง (Transparent) หรือ JPG แนวนอน</p>
                </div>
              </div>

              {/* ข้อมูลผู้มีอำนาจลงนาม */}
              <div className="space-y-3">
                <label className="text-xs text-[#555557] font-semibold block">
                  ตำแหน่งผู้ลงนาม
                </label>

                <div>
                  <input
                    type="text"
                    value={form.signerTitle}
                    onChange={e => handleChange('signerTitle', e.target.value)}
                    placeholder="เช่น ผู้อนุมัติ"
                    className="w-full text-xs text-[#1d1d1f] bg-[#f5f5f7] border border-[#d2d2d7]/60 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all font-medium"
                  />
                  <p className="text-[10px] text-zinc-400 mt-1.5">ข้อความจะแสดงใต้ลายเซ็น เช่น ผู้อนุมัติ หรือ กรรมการผู้จัดการ</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Document Preview (ตรงตามรูปภาพเป๊ะๆ) (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl border border-[#d2d2d7]/50 p-6 shadow-xs space-y-4 sticky top-24">
            <div className="flex items-center justify-between border-b border-[#e8e8ed] pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#0071e3]" />
                <h2 className="text-xs font-bold text-[#1d1d1f] uppercase tracking-wider">
                  ตัวอย่างเอกสารจริง (Live Preview)
                </h2>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                ตรงตามเอกสาร PDF
              </span>
            </div>

            <p className="text-[11px] text-[#86868b]">
              ตัวอย่างจำลองตำแหน่งหัวกระดาษและท้ายกระดาษตามข้อมูลที่คุณกำลังแก้ไข:
            </p>

            {/* Document Mockup Box */}
            <div className="bg-white rounded-2xl border border-zinc-300 p-5 space-y-6 shadow-md font-sans">
              {/* Preview 1: Header Block (Exact match with Image 1) */}
              <div className="flex items-start gap-3.5 pb-4 border-b border-zinc-200">
                <div className="w-14 h-14 shrink-0 flex items-center justify-center">
                  {form.logo ? (
                    <img src={form.logo} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <svg viewBox="0 0 160 160" className="w-full h-full fill-[#1d1d1f]" xmlns="http://www.w3.org/2000/svg">
                      <path d="M 60 48 L 60 36 L 100 21 L 100 33 Z" />
                      <path d="M 60 70 L 60 58 L 100 43 L 100 55 Z" />
                      <path d="M 60 92 L 60 80 L 100 65 L 100 77 Z" />
                      <text x="80" y="115" fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif" fontWeight="900" fontSize="19.5" textAnchor="middle" letterSpacing="0.4">PHANVADEE</text>
                      <text x="80" y="132" fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif" fontWeight="500" fontSize="9.5" textAnchor="middle" letterSpacing="0.1">think global, act local</text>
                    </svg>
                  )}
                </div>

                <div className="min-w-0 flex-1 text-[10.5px] leading-relaxed text-[#1d1d1f]">
                  <div className="font-extrabold text-[12.5px] text-black leading-tight mb-0.5">
                    {form.name || form.nameEn || 'บริษัท พันธ์วาดี จำกัด (สำนักงานใหญ่)'}
                  </div>
                  {form.nameEn && form.name && (
                    <div className="text-[10px] font-semibold text-zinc-600 mb-1 leading-tight">
                      {form.nameEn}
                    </div>
                  )}
                  <div className="text-zinc-600 leading-normal">
                    {form.address || '19/9 ซ.ทวีวัฒนา-กาญจนาภิเษก 16 แขวง/เขต ทวีวัฒนา กทม. 10170'}
                  </div>
                  <div>
                    โทร: {form.phone || '-'}{form.mobile ? ` / ${form.mobile}` : ''}
                  </div>
                  {form.email && <div>อีเมล: {form.email}</div>}
                  {form.website && <div>เว็บไซต์: {form.website}</div>}
                  <div>
                    เลขประจำตัวผู้เสียภาษี: <span className="font-mono font-medium">{form.taxId || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Middle placeholder to simulate document body */}
              <div className="py-6 border-b border-dashed border-zinc-200 text-center text-[10px] text-zinc-300">
                - รายการสินค้าในใบเสนอราคา -
              </div>

              {/* Preview 2: Signer Block (NO CIRCLE) */}
              <div className="flex justify-end pt-1">
                <div className="flex flex-col items-center gap-1.5 w-48 text-center">
                  {/* Signature Image or line */}
                  {activeSignature ? (
                    <div className="h-10 flex items-end justify-center w-full mb-1">
                      <img src={activeSignature} alt="Signature" className="max-h-10 max-w-full object-contain" />
                    </div>
                  ) : null}

                  <div className="border-b border-dotted border-zinc-700 w-full mb-1" style={{ height: activeSignature ? '0px' : '24px' }} />

                  <div className="font-bold text-[10.5px] text-zinc-800">
                    {form.signerTitle || 'ผู้อนุมัติ'}
                  </div>

                  <div className="text-[9.5px] text-zinc-400 mt-2">
                    วันที่ {new Date().toLocaleDateString('th-TH')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
