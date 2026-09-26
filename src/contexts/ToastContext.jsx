import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, Info, X, Check } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertCircle,
  info: Info,
};

const THEMES = {
  success: {
    bgIcon: 'bg-emerald-50 text-emerald-600 border border-emerald-150',
    title: 'text-emerald-700',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    button: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25',
    label: 'สำเร็จ',
  },
  error: {
    bgIcon: 'bg-red-50 text-red-600 border border-red-150',
    title: 'text-red-700',
    badge: 'bg-red-50 text-red-700 border-red-200',
    button: 'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/25',
    label: 'ข้อผิดพลาด',
  },
  warning: {
    bgIcon: 'bg-amber-50 text-amber-600 border border-amber-150',
    title: 'text-amber-700',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    button: 'bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/25',
    label: 'คำเตือน',
  },
  info: {
    bgIcon: 'bg-blue-50 text-blue-600 border border-blue-150',
    title: 'text-blue-700',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    button: 'bg-[#0071e3] hover:bg-[#0077ed] text-white shadow-md shadow-blue-600/25',
    label: 'แจ้งเตือน',
  },
};

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 220);
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const showToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = ++idCounter;
    setToasts(prev => [...prev, { id, message, type, exiting: false }]);
    timers.current[id] = setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  // Current active popup (latest toast)
  const activeToast = toasts[toasts.length - 1];

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && activeToast) {
        dismiss(activeToast.id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeToast, dismiss]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {activeToast && createPortal(
        <div
          className={`fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/35 backdrop-blur-xs transition-opacity duration-200 no-print ${
            activeToast.exiting ? 'opacity-0 pointer-events-none' : 'opacity-100 animate-fade-in'
          }`}
          onClick={(e) => {
            if (e.target === e.currentTarget) dismiss(activeToast.id);
          }}
        >
          <div
            className={`relative bg-white rounded-3xl border border-[#d2d2d7]/60 max-w-xs sm:max-w-sm w-full p-6 shadow-2xl space-y-4 text-center text-[#1d1d1f] transition-all duration-200 ${
              activeToast.exiting ? 'scale-95 opacity-0' : 'scale-100 opacity-100 animate-scale-in'
            }`}
          >
            {/* Close Button top-right */}
            <button
              type="button"
              onClick={() => dismiss(activeToast.id)}
              className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
              aria-label="ปิด"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Content */}
            {(() => {
              const theme = THEMES[activeToast.type] || THEMES.info;
              const Icon = ICONS[activeToast.type] || Info;
              return (
                <>
                  {/* Icon Badge */}
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-xs ${theme.bgIcon}`}>
                    <Icon className="w-7 h-7 stroke-[2.2]" />
                  </div>

                  {/* Header & Message */}
                  <div className="space-y-1.5">
                    <h3 className={`text-base font-bold tracking-wide ${theme.title}`}>
                      {theme.label}
                    </h3>
                    {(() => {
                      const lines = typeof activeToast.message === 'string'
                        ? activeToast.message.split('\n')
                        : [activeToast.message];
                      if (lines.length > 1) {
                        return (
                          <div className="space-y-2 mt-1">
                            <p className="text-sm text-[#1d1d1f] font-semibold leading-relaxed">
                              {lines[0]}
                            </p>
                            <div>
                              <span className="inline-block text-xs text-amber-800 bg-amber-50 border border-amber-200/80 rounded-xl py-1 px-3 font-semibold shadow-2xs">
                                {lines[1]}
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <p className="text-xs sm:text-sm text-[#555557] font-semibold leading-relaxed px-2 whitespace-pre-line">
                          {activeToast.message}
                        </p>
                      );
                    })()}
                  </div>

                  {/* Action Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => dismiss(activeToast.id)}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer active:scale-95 ${theme.button}`}
                    >
                      ตกลง
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx.showToast;
}
