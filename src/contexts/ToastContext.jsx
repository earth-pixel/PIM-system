import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const STYLES = {
  success: {
    container: 'bg-white border border-emerald-200 shadow-[0_8px_32px_rgba(16,185,129,0.18)]',
    icon: 'bg-emerald-100 text-emerald-600',
    title: 'text-emerald-700',
    msg: 'text-emerald-900/80',
    bar: 'bg-emerald-500',
    label: 'สำเร็จ',
  },
  error: {
    container: 'bg-white border border-red-200 shadow-[0_8px_32px_rgba(239,68,68,0.18)]',
    icon: 'bg-red-100 text-red-600',
    title: 'text-red-700',
    msg: 'text-red-900/80',
    bar: 'bg-red-500',
    label: 'ข้อผิดพลาด',
  },
  warning: {
    container: 'bg-white border border-amber-200 shadow-[0_8px_32px_rgba(245,158,11,0.18)]',
    icon: 'bg-amber-100 text-amber-600',
    title: 'text-amber-700',
    msg: 'text-amber-900/80',
    bar: 'bg-amber-500',
    label: 'คำเตือน',
  },
  info: {
    container: 'bg-white border border-blue-200 shadow-[0_8px_32px_rgba(59,130,246,0.18)]',
    icon: 'bg-blue-100 text-blue-600',
    title: 'text-blue-700',
    msg: 'text-blue-900/80',
    bar: 'bg-blue-500',
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
    }, 350);
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const showToast = useCallback((message, type = 'info', duration = 4500) => {
    const id = ++idCounter;
    setToasts(prev => [...prev, { id, message, type, exiting: false }]);
    timers.current[id] = setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {createPortal(
        <div
          className="fixed top-0 left-0 right-0 z-[99999] flex flex-col items-center gap-2 pt-4 px-4 pointer-events-none"
        >
          {toasts.map(toast => {
            const style = STYLES[toast.type] || STYLES.info;
            const Icon = ICONS[toast.type] || Info;
            return (
              <div
                key={toast.id}
                className={`
                  pointer-events-auto w-full max-w-md overflow-hidden rounded-2xl
                  ${style.container}
                  ${toast.exiting
                    ? 'animate-[slideUpOut_0.35s_cubic-bezier(0.4,0,1,1)_forwards]'
                    : 'animate-[slideDownIn_0.4s_cubic-bezier(0.34,1.56,0.64,1)_forwards]'
                  }
                `}
              >
                {/* Color bar top */}
                <div className={`h-1 w-full ${style.bar}`} />

                <div className="flex items-start gap-3 px-4 py-3">
                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${style.icon}`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold uppercase tracking-wide ${style.title}`}>
                      {style.label}
                    </p>
                    <p className={`text-sm font-medium mt-0.5 leading-snug ${style.msg}`}>
                      {toast.message}
                    </p>
                  </div>

                  {/* Close */}
                  <button
                    type="button"
                    onClick={() => dismiss(toast.id)}
                    className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-all cursor-pointer mt-0.5"
                    aria-label="ปิด"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
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
