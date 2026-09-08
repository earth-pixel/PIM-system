import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary captured error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#f5f5f7] p-4 font-sans text-[#1d1d1f]">
          <div className="w-full max-w-md bg-white rounded-3xl border border-red-200/80 shadow-xl p-6 sm:p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-50 text-red-500 border border-red-100 flex items-center justify-center mx-auto text-2xl font-bold">
              <i className="bi bi-exclamation-triangle-fill"></i>
            </div>
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-bold text-zinc-900">พบข้อผิดพลาดในการแสดงผล</h2>
              <p className="text-xs text-zinc-500 leading-relaxed">
                ระบบพบข้อผิดพลาด กรุณารีเฟรชหน้าเว็บ หรือล้างแคชเพื่อเข้าสู่ระบบใหม่
              </p>
            </div>
            {this.state.error && (
              <div className="text-left bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-[11px] text-red-600 font-mono overflow-auto max-h-36 break-all">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}
            <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
              <button
                type="button"
                onClick={this.handleReload}
                className="px-5 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-xs"
              >
                รีเฟรชหน้าเว็บ
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="px-5 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold rounded-xl cursor-pointer transition-colors"
              >
                ล้างแคชและเข้าใหม่
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
