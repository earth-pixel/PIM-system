import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Edit, Trash2, Save, AlertTriangle, Check, AlertCircle } from 'lucide-react';

export default function BrandManage({ brands, products, onAddBrand, onEditBrand, onDeleteBrand, currentUser }) {
  const [newBrand, setNewBrand]   = useState('');
  const [errorMsg, setErrorMsg]   = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editBrandName, setEditBrandName] = useState('');
  const [targetEditBrand, setTargetEditBrand] = useState('');
  const [brandToDelete, setBrandToDelete] = useState(null);
  const [alertPopup, setAlertPopup] = useState(null);

  useEffect(() => {
    if (isModalOpen || isEditModalOpen || brandToDelete || alertPopup) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen, isEditModalOpen, brandToDelete, alertPopup]);

  const handleStartEdit = (brandName) => {
    if (currentUser?.role === 'user') return;
    setTargetEditBrand(brandName);
    setEditBrandName(brandName);
    setErrorMsg('');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!editBrandName.trim()) {
      setErrorMsg('กรุณากรอกชื่อแบรนด์');
      return;
    }

    const newName = editBrandName.trim();
    if (newName.toLowerCase() === targetEditBrand.toLowerCase()) {
      setIsEditModalOpen(false);
      return;
    }

    const exists = brands.some(b => b.toLowerCase() === newName.toLowerCase());
    if (exists) {
      setErrorMsg(`แบรนด์ "${newName}" มีอยู่ในระบบแล้ว`);
      return;
    }

    setIsEditModalOpen(false);
    setAlertPopup({
      type: 'success',
      title: 'แก้ไขแบรนด์สำเร็จ!',
      message: `แก้ไขชื่อแบรนด์สินค้าจาก "${targetEditBrand}" เป็น "${newName}" เรียบร้อยแล้ว!`,
      action: () => onEditBrand(targetEditBrand, newName)
    });
  };

  const handleDeleteClick = (brandName, productCount) => {
    if (currentUser.role === 'manager' || currentUser.role === 'user') return;
    if (productCount > 0) {
      alert("ไม่สามารถลบแบรนด์ได้ เนื่องจากยังมีสินค้าที่ใช้แบรนด์นี้อยู่");
      return;
    }
    setBrandToDelete(brandName);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!newBrand.trim()) {
      setErrorMsg('กรุณากรอกชื่อแบรนด์');
      return;
    }

    const brandName = newBrand.trim();
    const exists    = brands.some(b => b.toLowerCase() === brandName.toLowerCase());
    if (exists) {
      setErrorMsg(`แบรนด์ "${brandName}" มีอยู่ในระบบแล้ว`);
      return;
    }

    setIsModalOpen(false);
    setNewBrand('');
    setAlertPopup({
      type: 'success',
      title: 'เพิ่มแบรนด์สำเร็จ!',
      message: `เพิ่มแบรนด์สินค้า "${brandName}" เรียบร้อยแล้ว!`,
      action: () => onAddBrand(brandName)
    });
  };

  return (
    <div className="space-y-6 animate-fade-in text-[#1d1d1f]">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f]">จัดการข้อมูลแบรนด์สินค้า</h1>
        </div>
        {currentUser?.role !== 'user' && (
          <button
            type="button"
            onClick={() => {
              setErrorMsg('');
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            เพิ่มแบรนด์ใหม่
          </button>
        )}
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/50 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e8e8ed]">
          <h4 className="text-sm font-bold text-[#1d1d1f] tracking-wide uppercase">รายชื่อแบรนด์ที่เปิดใช้งาน</h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-[#f5f5f7] text-[#555557] font-bold border-b border-[#d2d2d7]/50 uppercase tracking-wider text-xs">
                <th className="p-4 w-16">ลำดับ</th>
                <th className="p-4">แบรนด์</th>
                <th className="p-4 text-center">จำนวนผลิตภัณฑ์ในระบบ</th>
                <th className="p-4 text-right"></th>
                <th className="p-4 text-center w-28">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8e8ed]">
              {brands.map((brand, index) => {
                const productCount = products.filter(p => p.brand === brand).length;
                return (
                  <tr key={brand} className="hover:bg-[#f5f5f7]/30 transition-colors">
                    <td className="p-4 font-mono font-medium text-[#555557]">{index + 1}</td>
                    <td className="p-4 font-semibold text-[#1d1d1f]">{brand}</td>
                    <td className="p-4 text-center">
                      <span className="summary-number" style={{ fontSize: '14px', fontWeight: 600 }}>
                        {productCount}
                      </span>
                      <span className="text-xs text-[#555557] ml-1">รายการ</span>
                    </td>
                    <td className="p-4 text-right">
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-1.5">
                        {currentUser?.role !== 'user' && (
                          <button
                            type="button"
                            onClick={() => handleStartEdit(brand)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="แก้ไขชื่อแบรนด์"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {currentUser.role === 'admin' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(brand, productCount)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              productCount > 0 
                                ? 'text-zinc-300 cursor-not-allowed' 
                                : 'text-red-650 hover:bg-red-50'
                            }`}
                            title={productCount > 0 ? "ไม่สามารถลบได้เนื่องจากมีสินค้าผูกอยู่" : "ลบแบรนด์สินค้า"}
                            disabled={productCount > 0}
                          >
                            <Trash2 className="w-4 h-4" />
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
      </div>

      {/* Add Brand Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-[#d2d2d7]/50 shadow-xl max-w-md w-full max-h-[calc(100vh_-_3rem)] md:max-h-[calc(100vh_-_4rem)] flex flex-col overflow-hidden animate-scale-in">
            <div className="px-6 py-4 border-b border-[#e8e8ed] flex items-center justify-between flex-shrink-0">
              <h3 className="text-base font-extrabold text-[#1d1d1f] tracking-wide uppercase">เพิ่มแบรนด์สินค้าใหม่</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-[#555557] hover:bg-[#f5f5f7] hover:text-[#1d1d1f] transition-all cursor-pointer"
              >
                <Plus className="w-5 h-5 rotate-45 animate-fade-in" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                {errorMsg && (
                  <div className="p-3.5 text-xs bg-red-50 text-red-600 border border-red-100/50 rounded-xl">
                    {errorMsg}
                  </div>
                )}

                <div>
                  <label className="form-label">
                    ชื่อแบรนด์สินค้า <span className="text-xs font-semibold text-zinc-650 ml-1">(เช่น Barber Brain...)</span> <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newBrand}
                    onChange={(e) => setNewBrand(e.target.value)}
                    className="form-input"
                    autoFocus
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-[#e8e8ed] flex gap-3 flex-shrink-0 bg-white">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 border border-[#d2d2d7] text-[#1d1d1f] hover:bg-[#f5f5f7] text-sm font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  บันทึกแบรนด์
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Brand Modal */}
      {isEditModalOpen && createPortal(
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-[#d2d2d7]/50 shadow-xl max-w-md w-full max-h-[calc(100vh_-_3rem)] md:max-h-[calc(100vh_-_4rem)] flex flex-col overflow-hidden animate-scale-in">
            <div className="px-6 py-4 border-b border-[#e8e8ed] flex items-center justify-between flex-shrink-0">
              <h3 className="text-base font-extrabold text-[#1d1d1f] tracking-wide uppercase">แก้ไขข้อมูลแบรนด์สินค้า</h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-lg text-[#555557] hover:bg-[#f5f5f7] hover:text-[#1d1d1f] transition-all cursor-pointer"
              >
                <Plus className="w-5 h-5 rotate-45 animate-fade-in" />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                {errorMsg && (
                  <div className="p-3.5 text-xs bg-red-50 text-red-600 border border-red-100/50 rounded-xl">
                    {errorMsg}
                  </div>
                )}

                <div>
                  <label className="form-label">
                    ชื่อแบรนด์สินค้า <span className="text-xs font-semibold text-zinc-650 ml-1">(เช่น Barber Brain...)</span> <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editBrandName}
                    onChange={(e) => setEditBrandName(e.target.value)}
                    className="form-input"
                    autoFocus
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-[#e8e8ed] flex gap-3 flex-shrink-0 bg-white">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-2.5 border border-[#d2d2d7] text-[#1d1d1f] hover:bg-[#f5f5f7] text-sm font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {brandToDelete && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print animate-fade-in">
          <div onClick={() => setBrandToDelete(null)} className="absolute inset-0 bg-black/15 backdrop-blur-xs" />
          <div className="relative bg-white rounded-3xl border border-[#d2d2d7]/50 max-sm:w-full max-w-sm w-full p-6 shadow-lg space-y-4.5 z-10 animate-scale-in text-[#1d1d1f]">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-650">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h3 className="font-bold text-sm uppercase tracking-wide">ยืนยันลบแบรนด์สินค้า?</h3>
              <p className="text-[#555557] text-xs mt-1.5 leading-relaxed">
                คุณกำลังจะดำเนินการลบแบรนด์สินค้า <strong>{brandToDelete}</strong> จากระบบถาวร ซึ่งไม่สามารถกู้คืนกลับมาได้
              </p>
            </div>
            <div className="flex gap-2.5 pt-2 text-xs font-semibold">
              <button
                onClick={() => setBrandToDelete(null)}
                className="flex-1 py-2.5 border border-[#d2d2d7] text-[#1d1d1f] rounded-full hover:bg-[#f5f5f7] transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  const deletedName = brandToDelete;
                  setBrandToDelete(null);
                  setAlertPopup({
                    type: 'success',
                    title: 'ลบแบรนด์สินค้าสำเร็จ!',
                    message: `ลบข้อมูลแบรนด์สินค้า "${deletedName}" ออกจากระบบเรียบร้อยแล้ว!`,
                    action: () => onDeleteBrand(deletedName)
                  });
                }}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors cursor-pointer"
              >
                ลบข้อมูล
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
 
      {/* Success / Error Alert Popup Modal */}
      {alertPopup && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs animate-fade-in no-print">
          <div onClick={() => {
            if (alertPopup.action) alertPopup.action();
            setAlertPopup(null);
          }} className="absolute inset-0" />
          <div className="relative bg-white rounded-3xl border border-[#d2d2d7]/50 max-w-xs w-full p-6 shadow-xl space-y-4 z-10 animate-scale-in text-[#1d1d1f] text-center">
            {alertPopup.type === 'success' ? (
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mx-auto animate-scale-in">
                <Check className="w-6 h-6" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-650 mx-auto animate-scale-in">
                <AlertCircle className="w-6 h-6" />
              </div>
            )}
            <div>
              <h3 className="font-bold text-sm uppercase tracking-wide">{alertPopup.title}</h3>
              <p className="text-[#555557] text-xs mt-1.5 leading-relaxed">
                {alertPopup.message}
              </p>
            </div>
            <div className="pt-2 text-xs font-semibold">
              <button
                onClick={() => {
                  if (alertPopup.action) alertPopup.action();
                  setAlertPopup(null);
                }}
                className={`w-full py-2.5 rounded-full text-white transition-colors cursor-pointer shadow-xs ${
                  alertPopup.type === 'success'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-650 hover:bg-red-700'
                }`}
              >
                ตกลง
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
