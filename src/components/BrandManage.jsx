import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Edit, Trash2, Save, AlertTriangle, Check, AlertCircle } from 'lucide-react';
import { canPerformAction } from '../utils/permissions';
import { useToast } from '../contexts/ToastContext';
export default function BrandManage({ brands, products, onAddBrand, onEditBrand, onDeleteBrand, currentUser }) {
  const showToast = useToast();
  const [newBrand, setNewBrand]   = useState('');
  const [errorMsg, setErrorMsg]   = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hoveredRow, setHoveredRow] = useState(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editBrandName, setEditBrandName] = useState('');
  const [targetEditBrand, setTargetEditBrand] = useState('');
  const [brandToDelete, setBrandToDelete] = useState(null);
  const [deleteProductCount, setDeleteProductCount] = useState(0);
  const [alertPopup, setAlertPopup] = useState(null);

  const brandProductCounts = useMemo(() => {
    const counts = {};
    brands.forEach(b => {
      counts[b] = 0;
    });
    products.forEach(p => {
      if (counts[p.brand] !== undefined) {
        counts[p.brand]++;
      } else {
        counts[p.brand] = 1;
      }
    });
    return counts;
  }, [brands, products]);

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
    if (currentUser?.role !== 'admin') return;
    setTargetEditBrand(brandName);
    setEditBrandName(brandName);
    setErrorMsg('');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
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

    try { await onEditBrand(targetEditBrand, newName); } catch (error) { setErrorMsg(error.message); return; }
    setIsEditModalOpen(false);
    setAlertPopup({
      type: 'success',
      title: 'แก้ไขแบรนด์สำเร็จ!',
      message: `แก้ไขชื่อแบรนด์สินค้าจาก "${targetEditBrand}" เป็น "${newName}" เรียบร้อยแล้ว!`,
    });
  };

  const handleDeleteClick = (brandName, productCount) => {
    if (currentUser.role !== 'admin') return;
    if (productCount > 0 && currentUser.role !== 'admin') {
      showToast('ไม่สามารถลบแบรนด์ได้ เนื่องจากยังมีสินค้าที่ใช้แบรนด์นี้อยู่', 'error');
      return;
    }
    setDeleteProductCount(productCount);
    setBrandToDelete(brandName);
  };

  const handleSubmit = async (e) => {
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

    try { await onAddBrand(brandName); } catch (error) { setErrorMsg(error.message); return; }
    setIsModalOpen(false);
    setNewBrand('');
    setAlertPopup({
      type: 'success',
      title: 'เพิ่มแบรนด์สำเร็จ!',
      message: `เพิ่มแบรนด์สินค้า "${brandName}" เรียบร้อยแล้ว!`,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in text-[#1d1d1f] w-full min-w-0">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-5 rounded-full bg-gradient-to-b from-[#0071e3] to-[#00c2ff]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0071e3]">BRAND MANAGEMENT</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-[#1d1d1f] leading-none">จัดการข้อมูลแบรนด์สินค้า</h1>
        </div>
        {canPerformAction(currentUser, 'brands.create') && (
          <button
            type="button"
            onClick={() => {
              setErrorMsg('');
              setIsModalOpen(true);
            }}
            className="group relative overflow-hidden px-4 py-2.5 bg-gradient-to-r from-[#0071e3] to-[#0096ff] hover:from-[#0080ff] hover:to-[#00a8ff] text-white text-xs font-bold rounded-xl shadow-lg hover:shadow-blue-500/30 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
            <Plus className="w-4 h-4" />
            เพิ่มแบรนด์ใหม่
          </button>
        )}
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/50 shadow-xs overflow-hidden">
        <div className="px-4.5 py-3.5 border-b border-[#e8e8ed] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h4 className="text-xs font-black text-[#1d1d1f] tracking-widest uppercase">รายชื่อแบรนด์ที่เปิดใช้งาน</h4>
            <span className="px-2.5 py-0.5 text-[10px] font-black bg-[#0071e3] text-white rounded-full">
              {brands.length.toLocaleString()} แบรนด์
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-[#f5f5f7]/80 text-[#86868b] font-black border-b border-[#e8e8ed] text-[10px] uppercase tracking-widest">
                <th className="p-2 sm:p-3.5 w-16 text-center">ลำดับ</th>
                <th className="p-2 sm:p-3.5">แบรนด์</th>
                <th className="p-2 sm:p-3.5 text-center">จำนวนผลิตภัณฑ์ในระบบ</th>
                <th className="p-2 sm:p-3.5 text-right"></th>
                {(canPerformAction(currentUser, 'brands.edit') || canPerformAction(currentUser, 'brands.delete')) && <th className="p-2 sm:p-3.5 text-center w-28">การจัดการ</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f0f5]">
              {brands.map((brand, index) => {
                const productCount = brandProductCounts[brand] || 0;
                return (
                  <tr
                    key={brand}
                    onMouseEnter={() => setHoveredRow(brand)}
                    onMouseLeave={() => setHoveredRow(null)}
                    className={`transition-all duration-150 ${
                      hoveredRow === brand
                        ? 'bg-gradient-to-r from-[#0071e3]/4 via-[#0071e3]/3 to-transparent'
                        : index % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]/50'
                    }`}
                  >
                    <td className="p-2 sm:p-3.5 text-center font-mono text-[#86868b] text-[10px]">{index + 1}</td>
                    <td className="p-2 sm:p-3.5 font-semibold text-[#1d1d1f] leading-snug">{brand}</td>
                    <td className="p-2 sm:p-3.5 text-center text-[#555557] font-medium">
                      <span className="font-semibold text-black">
                        {productCount}
                      </span>
                      <span className="ml-1 text-xs">รายการ</span>
                    </td>
                    <td className="p-2 sm:p-3.5 text-right">
                    </td>
                    {(canPerformAction(currentUser, 'brands.edit') || canPerformAction(currentUser, 'brands.delete')) && (
                      <td className="p-2 sm:p-3.5 text-center">
                        <div className="flex justify-center gap-1.5">
                          {canPerformAction(currentUser, 'brands.edit') && (
                            <button
                              type="button"
                              onClick={() => handleStartEdit(brand)}
                              className="p-1.5 text-[#0071e3] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="แก้ไขชื่อแบรนด์"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          {canPerformAction(currentUser, 'brands.delete') && (
                            <button
                              type="button"
                              onClick={() => handleDeleteClick(brand, productCount)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                productCount > 0 && currentUser.role !== 'admin'
                                  ? 'text-zinc-300 cursor-not-allowed' 
                                  : 'text-red-650 hover:bg-red-50'
                              }`}
                              title={productCount > 0 && currentUser.role !== 'admin' ? "ไม่สามารถลบได้เนื่องจากมีสินค้าผูกอยู่" : "ลบแบรนด์สินค้า"}
                              disabled={productCount > 0 && currentUser.role !== 'admin'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
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
              <h3 className="font-bold text-sm uppercase tracking-wide text-red-650">ยืนยันลบแบรนด์สินค้า?</h3>
              {deleteProductCount > 0 ? (
                <p className="text-[#555557] text-xs mt-1.5 leading-relaxed bg-red-50/50 p-3 rounded-xl border border-red-100 text-red-700 font-semibold">
                  ⚠️ แบรนด์ <strong>{brandToDelete}</strong> นี้มีสินค้าในคลังผูกอยู่อย่างน้อย <strong>{deleteProductCount} รายการ</strong><br/>
                  การยืนยันลบจะย้ายสินค้าเหล่านี้ไปเป็นแบรนด์ว่าง (ไม่มีแบรนด์) ทันที
                </p>
              ) : (
                <p className="text-[#555557] text-xs mt-1.5 leading-relaxed">
                  คุณกำลังจะดำเนินการลบแบรนด์สินค้า <strong>{brandToDelete}</strong> จากระบบถาวร ซึ่งไม่สามารถกู้คืนกลับมาได้
                </p>
              )}
            </div>
            <div className="flex gap-2.5 pt-2 text-xs font-semibold">
              <button type="button"
                onClick={() => setBrandToDelete(null)}
                className="flex-1 py-2.5 border border-[#d2d2d7] text-[#1d1d1f] rounded-full hover:bg-[#f5f5f7] transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button type="button"
                onClick={async () => {
                  const deletedName = brandToDelete;
                  try { await onDeleteBrand(deletedName); } catch (error) { setAlertPopup({ type: 'error', title: 'ลบไม่สำเร็จ', message: error.message }); return; }
                  setBrandToDelete(null);
                  setAlertPopup({
                    type: 'success',
                    title: 'ลบแบรนด์สินค้าสำเร็จ!',
                    message: `ลบข้อมูลแบรนด์สินค้า "${deletedName}" ออกจากระบบเรียบร้อยแล้ว!`,
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
              <button type="button"
                onClick={() => {
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
