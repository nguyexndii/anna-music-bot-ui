import React from 'react';
import { Home, Compass } from 'lucide-react';

export default function NotFoundScreen({ onGoHome }) {
  return (
    <main
      className="min-h-screen w-full bg-[#09090B] flex flex-col items-center justify-center p-6 text-zinc-100 select-none relative overflow-hidden"
      style={{
        fontFamily: "'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Subtle top vignette */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 25%, rgba(234, 88, 12, 0.08), transparent 70%)',
        }}
      />

      {/* Brand Header */}
      <div className="relative z-10 flex flex-col items-center mb-6">
        <div className="relative mb-4 group cursor-pointer" onClick={onGoHome} title="Quay về trang chủ">
          <div className="w-24 h-24 rounded-2xl overflow-hidden ring-1 ring-orange-500/30 border border-white/[0.08] shadow-2xl shadow-black/80 bg-zinc-900 group-hover:scale-105 transition-transform duration-200">
            <img
              src="/logo.gif"
              alt="Anna Music Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-orange-500 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-[#09090B] shadow-md">
            404
          </div>
        </div>

        <h1 className="text-xl font-bold tracking-tight text-zinc-100">
          ANNA MUSIC
        </h1>
        <p className="font-mono text-[11px] tracking-widest text-zinc-500 uppercase mt-0.5">
          STUDIO WEB PLAYER
        </p>
      </div>

      {/* 404 Content Card */}
      <section className="relative z-10 w-full max-w-md bg-[#111113] border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/80 text-center flex flex-col items-center space-y-4">
        <span className="font-mono text-xs font-bold text-orange-400 uppercase tracking-widest">
          KHÔNG TÌM THẤY TRANG
        </span>

        <h2 className="text-lg font-bold text-zinc-100">
          Lạc Lối Trong Giai Điệu Rồi!
        </h2>

        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
          Đường dẫn bạn truy cập không tồn tại hoặc phiên nghe đã kết thúc. Hãy để Anna đưa bạn quay lại với những giai điệu quen thuộc nhé!
        </p>

        <div className="inline-flex items-center gap-2 font-mono text-[11px] text-zinc-400 bg-white/[0.04] border border-white/[0.08] px-3 py-1 rounded-full my-2">
          <Compass className="w-3.5 h-3.5 text-orange-400" />
          <span>ERROR 404 • PATH NOT FOUND</span>
        </div>

        {/* Actions */}
        <div className="w-full pt-2">
          <button
            onClick={onGoHome}
            className="w-full py-3 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-[0.98] transition"
          >
            <Home className="w-4 h-4" />
            <span>Quay Về Trang Chủ</span>
          </button>
        </div>

        <p className="text-xs text-zinc-500 pt-2">
          Cần kết nối Web Player? Dùng lệnh <code className="text-orange-400 font-mono font-bold bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded">/web</code> trong Discord để lấy mã PIN mới.
        </p>
      </section>

      <footer className="relative z-10 font-mono text-[11px] text-zinc-600 mt-8 tracking-wider">
        ANNA MUSIC · 2024 - 2026
      </footer>
    </main>
  );
}
