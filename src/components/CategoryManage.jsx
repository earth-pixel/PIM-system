import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Edit, Trash2, Save, AlertTriangle, Check, AlertCircle } from 'lucide-react';

export default function CategoryManage({ categories, products, onAddCategory, onEditCategory, onDeleteCategory, currentUser }) {
  const [newCategory, setNewCategory] = useState('');
  const [errorMsg, setErrorMsg]   = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [targetEditCategory, setTargetEditCategory] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [deleteProductCount, setDeleteProductCount] = useState(0);
  const [alertPopup, setAlertPopup] = useState(null);

  useEffect(() => {
    if (isModalOpen || isEditModalOpen || categoryToDelete || alertPopup) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen, isEditModalOpen, categoryToDelete, alertPopup]);

  const handleStartEdit = (catName) => {
    if (currentUser?.role !== 'admin') return;
    setTargetEditCategory(catName);
    setEditCategoryName(catName);
    setErrorMsg('');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = (e) => {
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

    setIsEditModalOpen(false);
    setAlertPopup({
      type: 'success',
      title: 'แก้ไขหมวดหมู่สำเร็จ!',
      message: `แก้ไขหมวดหมู่สินค้าจาก "${targetEditCategory}" เป็น "${newName}" เรียบร้อยแล้ว!`,
      action: () => onEditCategory(targetEditCategory, newName)
    });
  };

  const handleDeleteClick = (catName, productCount) => {
    if (currentUser.role !== 'admin') return;
    if (productCount > 0 && currentUser.role !== 'admin') {
      alert("ไม่สามารถลบหมวดหมู่ได้ เนื่องจากยังมีสินค้าที่อยู่ในหมวดหมู่นี้อยู่");
      return;
    }
    setDeleteProductCount(productCount);
    setCategoryToDelete(catName);
  };

  const handleSubmit = (e) => {
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

    setIsModalOpen(false);
    setNewCategory('');
    setAlertPopup({
      type: 'success',
      title: 'เพิ่มหมวดหมู่สำเร็จ!',
      message: `เพิ่มหมวดหมู่สินค้า "${catName}" เรียบร้อยแล้ว!`,
      action: () => onAddCategory(catName)
    });
  };

  return (
    <div className="space-y-6 animate-fade-in text-[#1d1d1f] w-full min-w-0">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f]">จัดการข้อมูลหมวดหมู่สินค้า</h1>
        </div>
        {currentUser?.role === 'admin' && (
          <button
            type="button"
            onClick={() => {
              setErrorMsg('');
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            เพิ่มหมวดหมู่ใหม่
          </button>
        )}
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/50 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e8e8ed]">
          <h4 className="text-sm font-bold text-[#1d1d1f] tracking-wide uppercase">รายชื่อหมวดหมู่</h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-[#f5f5f7] text-[#555557] font-bold border-b border-[#d2d2d7]/50 uppercase tracking-wider text-xs">
                <th className="p-4 text-center w-16">ลำดับ</th>
                <th className="p-4">หมวดหมู่สินค้า</th>
                <th className="p-4 text-center">สินค้าที่เปิดใช้งาน</th>
                {currentUser?.role === 'admin' && <th className="p-4 text-center w-28">การจัดการ</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8e8ed]">
              {categories.map((cat, index) => {
                const productCount = products.filter(p => p.category === cat).length;
                return (
                  <tr key={cat} className="hover:bg-[#f5f5f7]/30 transition-colors">
                    <td className="p-4 font-mono font-medium text-[#555557]">{index + 1}</td>
                    <td className="p-4 font-semibold text-[#1d1d1f]">{cat}</td>
                    <td className="p-4 text-center">
                      <span className="summary-number" style={{ fontSize: '14px', fontWeight: 600 }}>
                        {productCount}
                      </span>
                      <span className="text-xs text-[#555557] ml-1">รายการ</span>
                    </td>
                    {currentUser?.role === 'admin' && (
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(cat)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="แก้ไขชื่อหมวดหมู่"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {currentUser.role === 'admin' && (
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
                onClick={() => {
                  const deletedName = categoryToDelete;
                  setCategoryToDelete(null);
                  setAlertPopup({
                    type: 'success',
                    title: 'ลบหมวดหมู่สำเร็จ!',
                    message: `ลบหมวดหมู่สินค้า "${deletedName}" ออกจากระบบเรียบร้อยแล้ว!`,
                    action: () => onDeleteCategory(deletedName)
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
              <button type="button"
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
