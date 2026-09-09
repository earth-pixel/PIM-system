import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Edit, Trash2, Save, AlertTriangle, Check, AlertCircle } from 'lucide-react';
import { canPerformAction } from '../utils/permissions';
import { useToast } from '../contexts/ToastContext';

export default function CategoryManage({ categories, subcategories = {}, products, onAddCategory, onEditCategory, onDeleteCategory, onAddSubCategory, onEditSubCategory, onDeleteSubCategory, currentUser }) {
  const showToast = useToast();
  const [newCategory, setNewCategory] = useState('');
  const [errorMsg, setErrorMsg]   = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [targetEditCategory, setTargetEditCategory] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [deleteProductCount, setDeleteProductCount] = useState(0);
  const [alertPopup, setAlertPopup] = useState(null);

  // Subcategory management state
  const [activeSubModalCat, setActiveSubModalCat] = useState(null);
  const [newSubName, setNewSubName] = useState('');
  const [subErrorMsg, setSubErrorMsg] = useState('');
  const [editingSub, setEditingSub] = useState({ category: null, oldName: '', name: '' });

  const categoryProductCounts = useMemo(() => {
    const counts = {};
    categories.forEach(c => {
      counts[c] = 0;
    });
    products.forEach(p => {
      if (counts[p.category] !== undefined) {
        counts[p.category]++;
      } else {
        counts[p.category] = 1;
      }
    });
    return counts;
  }, [categories, products]);

  useEffect(() => {
    if (isModalOpen || isEditModalOpen || categoryToDelete || alertPopup || activeSubModalCat || editingSub.category) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen, isEditModalOpen, categoryToDelete, alertPopup, activeSubModalCat, editingSub]);

  const handleStartEdit = (catName) => {
    if (currentUser?.role !== 'admin') return;
    setTargetEditCategory(catName);
    setEditCategoryName(catName);
    setErrorMsg('');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!editCategoryName.trim()) {
      setErrorMsg('กรุณากรอกชื่อหมวดหมู่');
      return;
    }

    const newName = editCategoryName.trim();
    if (newName.toLowerCase() === targetEditCategory.toLowerCase()) {
      setIsEditModalOpen(false);
      return;
    }

    const exists = categories.some(c => c.toLowerCase() === newName.toLowerCase());
    if (exists) {
      setErrorMsg(`หมวดหมู่ "${newName}" มีอยู่ในระบบแล้ว`);
      return;
    }

    try { await onEditCategory(targetEditCategory, newName); } catch (error) { setErrorMsg(error.message); return; }
    setIsEditModalOpen(false);
    setAlertPopup({
      type: 'success',
      title: 'แก้ไขหมวดหมู่สำเร็จ!',
      message: `แก้ไขหมวดหมู่สินค้าจาก "${targetEditCategory}" เป็น "${newName}" เรียบร้อยแล้ว!`,
    });
  };
  
  const handleDeleteClick = (catName, productCount) => {
    if (currentUser.role !== 'admin') return;
    if (productCount > 0 && currentUser.role !== 'admin') {
      showToast('ไม่สามารถลบหมวดหมู่ได้ เนื่องจากยังมีสินค้าที่อยู่ในหมวดหมู่นี้อยู่', 'error');
      return;
    }
    setDeleteProductCount(productCount);
    setCategoryToDelete(catName);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!newCategory.trim()) {
      setErrorMsg('กรุณากรอกชื่อหมวดหมู่');
      return;
    }

    const catName = newCategory.trim();
    const exists  = categories.some(c => c.toLowerCase() === catName.toLowerCase());
    if (exists) {
      setErrorMsg(`หมวดหมู่ "${catName}" มีอยู่ในระบบแล้ว`);
      return;
    }

    try { await onAddCategory(catName); } catch (error) { setErrorMsg(error.message); return; }
    setIsModalOpen(false);
    setNewCategory('');
    setAlertPopup({
      type: 'success',
      title: 'เพิ่มหมวดหมู่สำเร็จ!',
      message: `เพิ่มหมวดหมู่สินค้า "${catName}" เรียบร้อยแล้ว!`,
    });
  };

  const handleAddSubSubmit = async (e) => {
    e.preventDefault();
    setSubErrorMsg('');
    const name = newSubName.trim();
    if (!name) { setSubErrorMsg('กรุณากรอกชื่อหมวดหมู่ย่อย'); return; }
    const currentList = subcategories[activeSubModalCat] || [];
    if (currentList.some(s => s.toLowerCase() === name.toLowerCase())) {
      setSubErrorMsg(`หมวดหมู่ย่อย "${name}" มีแล้วใน ${activeSubModalCat}`);
      return;
    }
    try {
      if (onAddSubCategory) await onAddSubCategory(activeSubModalCat, name);
      setActiveSubModalCat(null);
      setNewSubName('');
    } catch (err) { setSubErrorMsg(err.message); }
  };

  const handleEditSubSubmit = async (e) => {
    e.preventDefault();
    setSubErrorMsg('');
    const name = editingSub.name.trim();
    if (!name) { setSubErrorMsg('กรุณากรอกชื่อหมวดหมู่ย่อย'); return; }
    try {
      if (onEditSubCategory) await onEditSubCategory(editingSub.category, editingSub.oldName, name);
      setEditingSub({ category: null, oldName: '', name: '' });
    } catch (err) { setSubErrorMsg(err.message); }
  };

  return (
    <div className="space-y-6 animate-fade-in text-[#1d1d1f] w-full min-w-0">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-5 rounded-full bg-gradient-to-b from-[#0071e3] to-[#00c2ff]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0071e3]">CATEGORY MANAGEMENT</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-[#1d1d1f] leading-none">จัดการข้อมูลหมวดหมู่สินค้า</h1>
        </div>
        {canPerformAction(currentUser, 'categories.create') && (
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
            เพิ่มหมวดหมู่ใหม่
          </button>
        )}
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/50 shadow-xs overflow-hidden">
        <div className="px-4.5 py-3.5 border-b border-[#e8e8ed] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h4 className="text-xs font-black text-[#1d1d1f] tracking-widest uppercase">รายชื่อหมวดหมู่และหมวดหมู่ย่อย</h4>
            <span className="px-2.5 py-0.5 text-[10px] font-black bg-[#0071e3] text-white rounded-full">
              {categories.length.toLocaleString()} หมวดหมู่
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-[#f5f5f7]/80 text-[#86868b] font-black border-b border-[#e8e8ed] text-[10px] uppercase tracking-widest">
                <th className="p-2 sm:p-3.5 text-center w-16">ลำดับ</th>
                <th className="p-2 sm:p-3.5 w-1/4">หมวดหมู่หลัก</th>
                <th className="p-2 sm:p-3.5">หมวดหมู่ย่อย (Sub-categories)</th>
                <th className="p-2 sm:p-3.5 text-center w-36">สินค้าที่เปิดใช้งาน</th>
                {(canPerformAction(currentUser, 'categories.edit') || canPerformAction(currentUser, 'categories.delete')) && <th className="p-2 sm:p-3.5 text-center w-28">การจัดการ</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f0f5]">
              {categories.map((cat, index) => {
                const productCount = categoryProductCounts[cat] || 0;
                const subs = subcategories[cat] || [];
                return (
                  <tr
                    key={cat}
                    onMouseEnter={() => setHoveredRow(cat)}
                    onMouseLeave={() => setHoveredRow(null)}
                    className={`transition-all duration-150 ${
                      hoveredRow === cat
                        ? 'bg-gradient-to-r from-[#0071e3]/4 via-[#0071e3]/3 to-transparent'
                        : index % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]/50'
                    }`}
                  >
                    <td className="p-2 sm:p-3.5 text-center font-mono text-[#86868b] text-[10px]">{index + 1}</td>
                    <td className="p-2 sm:p-3.5 font-bold text-[#1d1d1f] leading-snug">{cat}</td>
                    <td className="p-2 sm:p-3.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {subs.length === 0 ? (
                          <span className="text-xs text-zinc-400 font-normal italic">ไม่มีหมวดหมู่ย่อย</span>
                        ) : (
                          subs.map(sub => (
                            <span key={sub} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-[#0071e3] border border-blue-200/60 rounded-lg text-xs font-semibold group/chip">
                              <span>{sub}</span>
                              {(canPerformAction(currentUser, 'categories.edit') || canPerformAction(currentUser, 'categories.delete')) && (
                                <div className="flex items-center gap-0.5 opacity-60 group-hover/chip:opacity-100 transition-opacity">
                                  {canPerformAction(currentUser, 'categories.edit') && (
                                    <button type="button" onClick={() => setEditingSub({ category: cat, oldName: sub, name: sub })} className="p-0.5 hover:text-blue-900 cursor-pointer" title="แก้ไข">
                                      <Edit className="w-3 h-3" />
                                    </button>
                                  )}
                                  {canPerformAction(currentUser, 'categories.delete') && (
                                    <button type="button" onClick={() => { if (confirm(`ยืนยันการลบหมวดหมู่ย่อย "${sub}" ในหมวดหมู่ "${cat}"?`)) onDeleteSubCategory?.(cat, sub); }} className="p-0.5 hover:text-red-650 cursor-pointer" title="ลบ">
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </span>
                          ))
                        )}
                        {canPerformAction(currentUser, 'categories.create') && (
                          <button
                            type="button"
                            onClick={() => { setActiveSubModalCat(cat); setNewSubName(''); setSubErrorMsg(''); }}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-100 hover:bg-blue-50 hover:text-[#0071e3] text-zinc-600 rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-dashed border-zinc-300 hover:border-blue-300"
                            title="เพิ่มหมวดหมู่ย่อย"
                          >
                            <Plus className="w-3 h-3" />
                            <span className="text-[11px]">เพิ่มย่อย</span>
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="p-2 sm:p-3.5 text-center text-[#555557] font-medium">
                      <span className="font-semibold text-black">
                        {productCount}
                      </span>
                      <span className="ml-1 text-xs">รายการ</span>
                    </td>
                    {(canPerformAction(currentUser, 'categories.edit') || canPerformAction(currentUser, 'categories.delete')) && (
                      <td className="p-2 sm:p-3.5 text-center">
                        <div className="flex justify-center gap-1.5">
                          {canPerformAction(currentUser, 'categories.edit') && (
                            <button
                              type="button"
                              onClick={() => handleStartEdit(cat)}
                              className="p-1.5 text-[#0071e3] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="แก้ไขชื่อหมวดหมู่หลัก"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          {canPerformAction(currentUser, 'categories.delete') && (
                            <button
                              type="button"
                              onClick={() => handleDeleteClick(cat, productCount)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                productCount > 0 && currentUser.role !== 'admin'
                                  ? 'text-zinc-300 cursor-not-allowed' 
                                  : 'text-red-650 hover:bg-red-50'
                              }`}
                              title={productCount > 0 && currentUser.role !== 'admin' ? "ไม่สามารถลบได้เนื่องจากมีสินค้าผูกอยู่" : "ลบหมวดหมู่สินค้า"}
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

      {/* Add Category Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-[#d2d2d7]/50 shadow-xl max-w-md w-full max-h-[calc(100vh_-_3rem)] md:max-h-[calc(100vh_-_4rem)] flex flex-col overflow-hidden animate-scale-in">
            <div className="px-6 py-4 border-b border-[#e8e8ed] flex items-center justify-between flex-shrink-0">
              <h3 className="text-base font-extrabold text-[#1d1d1f] tracking-wide uppercase">เพิ่มหมวดหมู่สินค้าใหม่</h3>
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
                    ชื่อหมวดหมู่สินค้า <span className="text-xs font-semibold text-zinc-650 ml-1">(เช่น แชมพู, สีกัดผม...)</span> <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
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
                  บันทึกหมวดหมู่
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Category Modal */}
      {isEditModalOpen && createPortal(
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-[#d2d2d7]/50 shadow-xl max-w-md w-full max-h-[calc(100vh_-_3rem)] md:max-h-[calc(100vh_-_4rem)] flex flex-col overflow-hidden animate-scale-in">
            <div className="px-6 py-4 border-b border-[#e8e8ed] flex items-center justify-between flex-shrink-0">
              <h3 className="text-base font-extrabold text-[#1d1d1f] tracking-wide uppercase">แก้ไขข้อมูลหมวดหมู่สินค้า</h3>
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
                    ชื่อหมวดหมู่สินค้า <span className="text-xs font-semibold text-zinc-650 ml-1">(เช่น Styling...)</span> <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editCategoryName}
                    onChange={(e) => setEditCategoryName(e.target.value)}
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
      {categoryToDelete && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print animate-fade-in">
          <div onClick={() => setCategoryToDelete(null)} className="absolute inset-0 bg-black/15 backdrop-blur-xs" />
          <div className="relative bg-white rounded-3xl border border-[#d2d2d7]/50 max-w-sm w-full p-6 shadow-lg space-y-4.5 z-10 animate-scale-in text-[#1d1d1f]">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-650">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h2 className="font-bold text-sm uppercase tracking-wide text-red-650">ยืนยันลบหมวดหมู่สินค้า?</h2>
              {deleteProductCount > 0 ? (
                <p className="text-[#555557] text-xs mt-1.5 leading-relaxed bg-red-50/50 p-3 rounded-xl border border-red-100 text-red-700 font-semibold">
                  ⚠️ หมวดหมู่ <strong>{categoryToDelete}</strong> นี้มีสินค้าในคลังผูกอยู่อย่างน้อย <strong>{deleteProductCount} รายการ</strong><br/>
                  การยืนยันลบจะย้ายสินค้าเหล่านี้ไปเป็นไม่มีหมวดหมู่ทันที
                </p>
              ) : (
                <p className="text-[#555557] text-xs mt-1.5 leading-relaxed">
                  คุณกำลังจะดำเนินการลบหมวดหมู่สินค้า <strong>{categoryToDelete}</strong> จากระบบถาวร ซึ่งไม่สามารถกู้คืนกลับมาได้
                </p>
              )}
            </div>
            <div className="flex gap-2.5 pt-2 text-xs font-semibold">
              <button type="button"
                onClick={() => setCategoryToDelete(null)}
                className="flex-1 py-2.5 border border-[#d2d2d7] text-[#1d1d1f] rounded-full hover:bg-[#f5f5f7] transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button type="button"
                onClick={async () => {
                  const deletedName = categoryToDelete;
                  try { await onDeleteCategory(deletedName); } catch (error) { setAlertPopup({ type: 'error', title: 'ลบไม่สำเร็จ', message: error.message }); return; }
                  setCategoryToDelete(null);
                  setAlertPopup({
                    type: 'success',
                    title: 'ลบหมวดหมู่สำเร็จ!',
                    message: `ลบหมวดหมู่สินค้า "${deletedName}" ออกจากระบบเรียบร้อยแล้ว!`,
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
      {/* Add Subcategory Modal */}
      {activeSubModalCat && createPortal(
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-[#d2d2d7]/50 shadow-xl max-w-md w-full flex flex-col overflow-hidden animate-scale-in">
            <div className="px-6 py-4 border-b border-[#e8e8ed] flex items-center justify-between">
              <h3 className="text-base font-extrabold text-[#1d1d1f] tracking-wide uppercase">เพิ่มหมวดหมู่ย่อยใน "{activeSubModalCat}"</h3>
              <button type="button" onClick={() => setActiveSubModalCat(null)} className="p-1 rounded-lg text-[#555557] hover:bg-[#f5f5f7] cursor-pointer">
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleAddSubSubmit} className="p-6 space-y-4">
              {subErrorMsg && <div className="p-3 text-xs bg-red-50 text-red-600 rounded-xl">{subErrorMsg}</div>}
              <div>
                <label className="form-label">ชื่อหมวดหมู่ย่อย <span className="text-red-500">*</span></label>
                <input type="text" value={newSubName} onChange={e => setNewSubName(e.target.value)} placeholder="เช่น แว็กซ์, เจล, สีถาวร..." className="form-input" autoFocus />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setActiveSubModalCat(null)} className="flex-1 py-2.5 border border-[#d2d2d7] rounded-xl text-sm font-semibold hover:bg-[#f5f5f7]">ยกเลิก</button>
                <button type="submit" className="flex-1 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-1.5"><Save className="w-4 h-4" />บันทึก</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Subcategory Modal */}
      {editingSub.category && createPortal(
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-[#d2d2d7]/50 shadow-xl max-w-md w-full flex flex-col overflow-hidden animate-scale-in">
            <div className="px-6 py-4 border-b border-[#e8e8ed] flex items-center justify-between">
              <h3 className="text-base font-extrabold text-[#1d1d1f] tracking-wide uppercase">แก้ไขหมวดหมู่ย่อยใน "{editingSub.category}"</h3>
              <button type="button" onClick={() => setEditingSub({ category: null, oldName: '', name: '' })} className="p-1 rounded-lg text-[#555557] hover:bg-[#f5f5f7] cursor-pointer">
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleEditSubSubmit} className="p-6 space-y-4">
              {subErrorMsg && <div className="p-3 text-xs bg-red-50 text-red-600 rounded-xl">{subErrorMsg}</div>}
              <div>
                <label className="form-label">ชื่อหมวดหมู่ย่อย <span className="text-red-500">*</span></label>
                <input type="text" value={editingSub.name} onChange={e => setEditingSub({ ...editingSub, name: e.target.value })} className="form-input" autoFocus />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditingSub({ category: null, oldName: '', name: '' })} className="flex-1 py-2.5 border border-[#d2d2d7] rounded-xl text-sm font-semibold hover:bg-[#f5f5f7]">ยกเลิก</button>
                <button type="submit" className="flex-1 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-1.5"><Save className="w-4 h-4" />บันทึก</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
