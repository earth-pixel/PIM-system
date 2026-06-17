import React, { useState } from 'react';
import { Lock, User, Building2, AlertCircle } from 'lucide-react';

export default function Login({ onLogin, users }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim() || !password.trim()) {
      setErrorMsg('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      return;
    }

    const matchedUser = users.find(
      u => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password
    );

    if (matchedUser) {
      onLogin(matchedUser);
    } else {
      setErrorMsg('ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง');
    }
  };

  const handleQuickLogin = (presetUsername) => {
    const matchedUser = users.find(u => u.username === presetUsername);
    if (matchedUser) {
      onLogin(matchedUser);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7] font-sans p-6">
      <div className="w-full max-w-[440px] bg-white p-6 sm:p-10 rounded-3xl border border-[#d2d2d7]/50 shadow-[0_8px_40px_rgba(0,0,0,0.04)] space-y-8 animate-fade-in">
        
        {/* Apple ID Style Brand Header */}
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center text-white mx-auto shadow-xs">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold text-[#1d1d1f] tracking-tight">ลงชื่อเข้าใช้งาน</h1>
            <p className="text-sm text-[#555557]">ระบบบันทึกข้อมูลสินค้า บริษัท พันธ์วาดี จำกัด</p>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {errorMsg && (
            <div className="p-3.5 text-sm bg-red-50 text-red-600 border border-red-100/50 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}

          {/* Inputs */}
          <div className="space-y-3.5">
            <div className="relative">
              <User className="w-5 h-5 text-[#555557] absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="ชื่อผู้ใช้งาน (Username)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-[#f5f5f7]/80 border border-[#d2d2d7] rounded-xl text-sm text-[#1d1d1f] focus:outline-hidden focus:border-[#0071e3] focus:bg-white transition-all placeholder-[#555557]"
              />
            </div>

            <div className="relative">
              <Lock className="w-5 h-5 text-[#555557] absolute left-3.5 top-3.5" />
              <input
                type="password"
                placeholder="รหัสผ่าน (Password)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-[#f5f5f7]/80 border border-[#d2d2d7] rounded-xl text-sm text-[#1d1d1f] focus:outline-hidden focus:border-[#0071e3] focus:bg-white transition-all placeholder-[#555557]"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl text-sm font-semibold tracking-wide transition-colors cursor-pointer shadow-xs"
          >
            เข้าสู่ระบบ
          </button>
        </form>

        {/* Quick Sandbox Login Section */}
        <div className="pt-6 border-t border-[#e8e8ed] space-y-4">
          <div className="text-center">
            <span className="text-xs font-bold text-[#555557] tracking-wider uppercase">สิทธิ์ทดสอบเข้างานระบบแบบด่วน (Sandbox)</span>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <button
              onClick={() => handleQuickLogin('admin')}
              className="py-2.5 bg-white hover:bg-[#f5f5f7] text-[#1d1d1f] border border-[#d2d2d7] rounded-full text-xs font-semibold transition-all cursor-pointer"
            >
              Admin
            </button>
            <button
              onClick={() => handleQuickLogin('manager')}
              className="py-2.5 bg-white hover:bg-[#f5f5f7] text-[#1d1d1f] border border-[#d2d2d7] rounded-full text-xs font-semibold transition-all cursor-pointer"
            >
              Manager
            </button>
            <button
              onClick={() => handleQuickLogin('user')}
              className="py-2.5 bg-white hover:bg-[#f5f5f7] text-[#1d1d1f] border border-[#d2d2d7] rounded-full text-xs font-semibold transition-all cursor-pointer"
            >
              User
            </button>
          </div>
          <p className="text-xs text-[#555557] text-center">
            รหัสผ่านสำหรับทุกสิทธิ์คือ <code className="bg-[#f5f5f7] px-1.5 py-0.5 rounded text-[#1d1d1f] font-mono text-xs">password</code>
          </p>
        </div>

      </div>
    </div>
  );
}
