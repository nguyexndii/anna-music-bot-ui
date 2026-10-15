import React from 'react';
import { Home, Compass } from 'lucide-react';

export default function NotFoundScreen({ onGoHome }) {
  const handleResetSession = () => {
    try {
      localStorage.removeItem('anna_web_token');
      localStorage.removeItem('anna_web_guild');
    } catch {}
    if (onGoHome) onGoHome();
    else window.location.href = '/';
  };

  return (
    <main
      className="min-h-screen w-full bg-[#111316] flex flex-col items-center justify-center p-6 text-[#e2e2e6] select-none relative overflow-hidden font-sans"
    >
      {/* Subtle top vignette */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 25%, rgba(232, 201, 119, 0.08), transparent 70%)',
        }}
      />

      {/* Brand Header */}
      <div className="relative z-10 flex flex-col items-center mb-6">
        <div className="relative mb-4 group cursor-pointer" onClick={handleResetSession} title="Quay về trang chủ">
          <div className="w-24 h-24 rounded-2xl overflow-hidden ring-1 ring-[#e8c977]/30 border border-white/[0.08] shadow-2xl shadow-black/80 bg-[#16181b] group-hover:scale-105 transition-transform duration-200">
            <img
              src="/logo.gif"
              alt="Anna Music Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-[#e8c977] text-[#111316] font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-[#111316] shadow-md">
            404
          </div>
        </div>

        <h1 className="text-xl font-bold tracking-tight text-[#f8fafc]">
          ANNA MUSIC
        </h1>
        <p className="font-mono text-[11px] tracking-widest text-[#aba395] uppercase mt-0.5">
          BOUTIQUE VINYL LOUNGE
        </p>
      </div>

      {/* 404 Content Card */}
      <section className="relative z-10 w-full max-w-md bg-[#16181b] border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/80 text-center flex flex-col items-center space-y-4">
        <span className="font-mono text-xs font-bold text-[#e8c977] uppercase tracking-widest">
          KHÔNG TÌM THẤY TRANG
        </span>

        <h2 className="text-lg font-bold text-[#f8fafc]">
          Lạc Lối Trong Giai Điệu Rồi!
        </h2>

        <p className="text-xs sm:text-sm text-[#aba395] leading-relaxed">
          Đường dẫn bạn truy cập không tồn tại hoặc phiên nghe đã kết thúc. Hãy để Anna đưa bạn quay lại với những giai điệu quen thuộc nhé!
        </p>

        <div className="inline-flex items-center gap-2 font-mono text-[11px] text-[#aba395] bg-white/[0.04] border border-white/[0.08] px-3 py-1 rounded-full my-2">
          <Compass className="w-3.5 h-3.5 text-[#e8c977]" />
          <span>ERROR 404 • PATH NOT FOUND</span>
        </div>

        {/* Actions */}
        <div className="w-full pt-2 flex flex-col gap-2.5">
          <button
            onClick={handleResetSession}
            className="w-full py-3 px-4 rounded-xl bg-[#e8c977] hover:bg-[#d8b967] text-[#111316] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#e8c977]/20 active:scale-[0.98] transition"
          >
            <Home className="w-4 h-4" />
            <span>Quay Về Trang Chủ & Nhập PIN</span>
          </button>
        </div>

        <p className="text-xs text-[#aba395] pt-2">
          Cần kết nối Web Player? Dùng lệnh <code className="text-[#e8c977] font-mono font-bold bg-[#e8c977]/10 border border-[#e8c977]/20 px-1.5 py-0.5 rounded">/web</code> trong Discord để lấy mã PIN mới.
        </p>
      </section>

      <footer className="relative z-10 font-mono text-[11px] text-[#5b5448] mt-8 tracking-wider">
        ANNA MUSIC · 2024 - 2026
      </footer>
    </main>
  );
}
