import { useState, useEffect, useRef } from 'react';
import { Lock, User, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const passwordInputRef = useRef(null);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    const { currentTarget, clientX, clientY } = e;
    const { left, top, width, height } = currentTarget.getBoundingClientRect();
    const x = (clientX - left) / width - 0.5;
    const y = (clientY - top) / height - 0.5;
    setMousePos({ x, y });
  };

  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0 });
  };

  const checkCapsLock = (e) => {
    if (e.getModifierState) {
      setCapsLockActive(e.getModifierState('CapsLock'));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsShaking(false);

    if (!username.trim() || !password.trim()) {
      setErrorMsg('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      setIsShaking(true);
      return;
    }

    setIsLoading(true);

    try {
      await onLogin(username.trim(), password);
    } catch (error) {
      setErrorMsg(error.message);
      setIsShaking(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset shaking after animation finished
  useEffect(() => {
    if (isShaking) {
      const timer = setTimeout(() => setIsShaking(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isShaking]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f5f5f7] font-sans p-3 sm:p-5 md:p-6 overflow-x-hidden overflow-y-auto select-none relative">

      {/* Subtle outer decorative background elements */}
      <div className="absolute top-[5%] left-[5%] w-[320px] sm:w-[420px] h-[320px] sm:h-[420px] rounded-full bg-zinc-200/60 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[5%] right-[5%] w-[340px] sm:w-[480px] h-[340px] sm:h-[480px] rounded-full bg-zinc-300/40 blur-[120px] pointer-events-none" />

      {/* Main Contained Card (Split Layout) */}
      <div className="w-full max-w-[960px] lg:max-w-[1040px] xl:max-w-[1100px] min-h-[540px] md:min-h-[580px] lg:h-[620px] max-h-[calc(100vh-2rem)] bg-white rounded-2xl sm:rounded-3xl border border-[#d2d2d7]/50 shadow-[0_30px_70px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden grid grid-cols-1 md:grid-cols-12 relative z-10 my-auto">

        {/* ─────────────────────────────────────────────────────────────
            LEFT PANEL: Clean Minimalist Login Form (White)
            ───────────────────────────────────────────────────────────── */}
        <div className="col-span-12 md:col-span-6 lg:col-span-5 min-w-0 flex flex-col justify-between p-5 sm:p-7 md:p-8 lg:p-9 bg-white relative z-10 overflow-y-auto">

          {/* Form Container */}
          <div className={`w-full max-w-[330px] sm:max-w-[360px] mx-auto my-auto space-y-4 sm:space-y-5 transition-all duration-300 ${isShaking ? 'animate-shake' : ''}`}>

            {/* Titles */}
            <div className="space-y-1 text-center">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-zinc-900 tracking-tight">
                ลงชื่อเข้าใช้งาน
              </h1>
              <p className="text-[11px] sm:text-xs text-zinc-500 font-medium leading-relaxed max-w-[300px] sm:max-w-[320px] mx-auto">
                ระบบจัดการข้อมูลสินค้า บริษัท พันธ์วาดี จำกัด
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
              {errorMsg && (
                <div className="p-2.5 sm:p-3 text-xs bg-red-50/80 text-red-650 border border-red-500/20 rounded-xl flex items-center gap-2 animate-fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span className="font-semibold">{errorMsg}</span>
                </div>
              )}

              {/* Inputs */}
              <div className="space-y-2.5 sm:space-y-3">
                {/* Username Input */}
                <div className="relative group">
                  <User className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5 group-focus-within:text-zinc-900 transition-colors" />
                  <input
                    type="text"
                    placeholder="ชื่อผู้ใช้งาน (Username)"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={(e) => {
                      checkCapsLock(e);
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        passwordInputRef.current?.focus();
                      }
                    }}
                    onKeyUp={checkCapsLock}
                    onFocus={checkCapsLock}
                    disabled={isLoading}
                    autoComplete="off"
                    className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs sm:text-sm text-[#1d1d1f] focus:outline-hidden focus:border-zinc-900 focus:bg-white transition-all placeholder-zinc-400 focus:shadow-[0_0_0_4px_rgba(0,0,0,0.05)] disabled:opacity-50"
                  />
                </div>

                {/* Password Input */}
                <div className="space-y-1">
                  <div className="relative group">
                    <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5 group-focus-within:text-zinc-900 transition-colors" />
                    <input
                      ref={passwordInputRef}
                      type={showPassword ? "text" : "password"}
                      placeholder="รหัสผ่าน (Password)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={checkCapsLock}
                      onKeyUp={checkCapsLock}
                      onFocus={checkCapsLock}
                      disabled={isLoading}
                      autoComplete="new-password"
                      className="w-full pl-10 pr-11 py-2.5 sm:py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs sm:text-sm text-[#1d1d1f] focus:outline-hidden focus:border-zinc-900 focus:bg-white transition-all placeholder-zinc-400 focus:shadow-[0_0_0_4px_rgba(0,0,0,0.05)] disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(prev => !prev)}
                      disabled={isLoading}
                      className="absolute right-3.5 top-3 text-zinc-400 hover:text-zinc-900 transition-colors focus:outline-hidden p-0.5 rounded-lg cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Caps Lock Indicator */}
                  {capsLockActive && (
                    <div className="text-amber-600 text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 pl-1 pt-0.5 animate-fade-in">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>ปุ่ม Caps Lock กำลังเปิดทำงานอยู่</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 sm:py-3.5 bg-gradient-to-r from-blue-600 to-[#0071e3] hover:from-blue-700 hover:to-[#0077ed] text-white rounded-xl text-xs sm:text-sm font-semibold tracking-wide transition-all duration-200 cursor-pointer hover:shadow-[0_8px_20px_rgba(0, 113, 227,0.25)] active:scale-[0.98] disabled:opacity-75 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-sm"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>กำลังตรวจสอบข้อมูล...</span>
                  </>
                ) : (
                  <span>เข้าสู่ระบบ</span>
                )}
              </button>
            </form>

          </div>

          {/* Footer */}
          <div className="text-[9.5px] sm:text-[10px] text-zinc-400 font-semibold tracking-wide text-center sm:text-left pt-2">
            © {new Date().getFullYear()} PHANVADEE CO., LTD.
          </div>

        </div>

        {/* ─────────────────────────────────────────────────────────────
            RIGHT PANEL: Minimalist Dark Floating Circles Concept (Black/Gray)
            ───────────────────────────────────────────────────────────── */}
        <div
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="hidden md:flex md:col-span-6 lg:col-span-7 min-w-0 bg-[#09090b] relative items-center justify-center p-6 lg:p-8 overflow-hidden cursor-default"
        >

          {/* Subtle background grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

          {/* Floating Architectural Shapes */}
          {/* 1. Large metallic gradient circle (Top Right) */}
          <div
            className="w-[300px] lg:w-[380px] h-[300px] lg:h-[380px] rounded-full bg-gradient-to-br from-zinc-800/10 via-zinc-900/30 to-black absolute top-[-10%] right-[-10%] border border-zinc-800/20 animate-pulse duration-[8000ms] pointer-events-none"
            style={{
              transform: `translate3d(${mousePos.x * 25}px, ${mousePos.y * 25}px, 0)`,
              transition: 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)'
            }}
          />

          {/* 2. Sleek thin wireframe ring (Center Right) */}
          <div
            className="w-[200px] lg:w-[240px] h-[200px] lg:h-[240px] rounded-full border border-white/5 absolute right-[5%] top-[35%] animate-pulse duration-[10000ms] pointer-events-none"
            style={{
              transform: `translate3d(${mousePos.x * -40}px, ${mousePos.y * -40}px, 0)`,
              transition: 'transform 0.55s cubic-bezier(0.25, 1, 0.5, 1)'
            }}
          />

          {/* 3. Soft blur white/gray background circle (Center Left) */}
          <div
            className="w-36 lg:w-48 h-36 lg:h-48 rounded-full bg-gradient-to-tr from-white/3 to-transparent border border-white/5 backdrop-blur-3xs absolute top-[20%] left-[5%] animate-bounce duration-[14000ms] pointer-events-none"
            style={{
              transform: `translate3d(${mousePos.x * 18}px, ${mousePos.y * 18}px, 0)`,
              transition: 'transform 0.45s cubic-bezier(0.25, 1, 0.5, 1)'
            }}
          />

          {/* 4. Medium solid dark slate circle (Bottom Center) */}
          <div
            className="w-28 lg:w-36 h-28 lg:h-36 rounded-full bg-zinc-900/50 border border-zinc-800/30 absolute bottom-[-5%] right-[25%] animate-pulse duration-[7000ms] pointer-events-none"
            style={{
              transform: `translate3d(${mousePos.x * -28}px, ${mousePos.y * -28}px, 0)`,
              transition: 'transform 0.52s cubic-bezier(0.25, 1, 0.5, 1)'
            }}
          />

          {/* 5. Minimalist tiny gray dots */}
          <div
            className="w-5 h-5 rounded-full bg-zinc-850 absolute bottom-[25%] left-[20%] animate-ping duration-[3000ms] opacity-30 pointer-events-none"
            style={{
              transform: `translate3d(${mousePos.x * 35}px, ${mousePos.y * 35}px, 0)`,
              transition: 'transform 0.48s cubic-bezier(0.25, 1, 0.5, 1)'
            }}
          />
          <div
            className="w-8 h-8 rounded-full border border-white/10 absolute top-[10%] left-[35%] animate-bounce duration-[9000ms] pointer-events-none"
            style={{
              transform: `translate3d(${mousePos.x * -15}px, ${mousePos.y * -15}px, 0)`,
              transition: 'transform 0.46s cubic-bezier(0.25, 1, 0.5, 1)'
            }}
          />

          {/* Banner Texts: Company Logo & Tagline */}
          <div className="relative z-10 text-center animate-fade-in flex flex-col items-center select-none max-w-full px-4">

            {/* SVG Logo Mark (Large) */}
            <svg viewBox="0 0 80 90" className="w-14 h-16 sm:w-16 sm:h-18 lg:w-20 lg:h-22 fill-current text-white/95 drop-shadow-[0_4px_16px_rgba(255,255,255,0.1)] transition-transform duration-550 hover:scale-105" xmlns="http://www.w3.org/2000/svg">
              <path d="M 20 38 L 20 26 L 60 11 L 60 23 Z" />
              <path d="M 20 60 L 20 48 L 60 33 L 60 45 Z" />
              <path d="M 20 82 L 20 70 L 60 55 L 60 67 Z" />
            </svg>

            <h2 className="text-2xl sm:text-3xl md:text-3xl lg:text-4xl xl:text-[44px] font-black text-white tracking-[0.14em] sm:tracking-[0.18em] uppercase leading-none mt-5 sm:mt-6 lg:mt-7 drop-shadow-[0_2px_12px_rgba(0,0,0,0.4)]">
              PHANVADEE
            </h2>

            <p className="text-xs sm:text-sm lg:text-base font-light text-zinc-300/80 tracking-widest mt-2 sm:mt-2.5 drop-shadow-[0_1px_8px_rgba(0,0,0,0.5)]">
              think global, act local
            </p>

            {/* Soft System Indicator */}
            <div className="inline-flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.1] backdrop-blur-md mt-6 sm:mt-8 lg:mt-10 shadow-[0_4px_24px_rgba(0,0,0,0.2)] max-w-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.7)]" />
              <span className="text-[7.5px] sm:text-[8.5px] lg:text-[9.5px] text-zinc-300 font-bold uppercase tracking-[0.12em] sm:tracking-[0.18em] truncate">
                PRODUCT INFORMATION MANAGEMENT SYSTEM
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
