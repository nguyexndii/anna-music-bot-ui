import React from 'react';
import { Home, Compass } from 'lucide-react';

export default function NotFoundScreen({ onGoHome }) {
  return (
    <div className="min-h-screen h-[100dvh] w-full bg-surface flex items-center justify-center p-4 select-none relative overflow-hidden font-body text-on-surface antialiased">
      {/* Background ambient glow */}
      <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-primary-container/5 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-secondary-container/10 blur-3xl pointer-events-none" />

      {/* 404 Central Card */}
      <div className="w-full max-w-md bg-surface-container-low border border-white/5 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center relative z-10 backdrop-blur-xl">
        
        {/* Anna Avatar with 404 Badge */}
        <div className="relative mb-4 group cursor-pointer" onClick={onGoHome} title="Quay về Trang Chủ">
          <div className="w-20 h-20 rounded-2xl overflow-hidden border border-primary-container/40 shadow-xl bg-surface-container p-0.5 group-hover:scale-105 transition-transform duration-300">
            <img
              src="/logo.gif"
              alt="Anna Logo"
              className="w-full h-full object-cover rounded-xl"
            />
          </div>
          <div className="absolute -bottom-1.5 -right-1.5 bg-secondary text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md border-2 border-surface-container-low">
            404
          </div>
        </div>

        {/* Brand Typography */}
        <div className="flex flex-col items-center mb-4">
          <div className="flex items-baseline tracking-tight">
            <span className="font-brand text-2xl font-bold text-primary-container leading-none">an</span>
            <span className="font-brand text-2xl font-bold text-[#f5a192] leading-none">na</span>
          </div>
          <span className="font-mono text-[9px] tracking-widest text-outline uppercase mt-0.5">
            MUSIC WEB PLAYER
          </span>
        </div>

        {/* Dynamic Sóng nhạc 5 bars */}
        <div className="flex items-end gap-1 h-5 px-3 py-1 bg-surface-container rounded-full border border-white/5 mb-3">
          <span className="w-1 bg-primary-container rounded-full animate-equalizer-1" />
          <span className="w-1 bg-primary-container rounded-full animate-equalizer-2" />
          <span className="w-1 bg-secondary rounded-full animate-equalizer-3" />
          <span className="w-1 bg-primary-container rounded-full animate-equalizer-4" />
          <span className="w-1 bg-primary-container rounded-full animate-equalizer-5" />
        </div>

        {/* Path not found badge */}
        <div className="px-2.5 py-0.5 rounded-full bg-secondary-container/20 border border-secondary/30 text-secondary font-mono text-[10px] font-semibold flex items-center gap-1.5 mb-2">
          <Compass size={12} />
          <span>ERROR 404 • PATH NOT FOUND</span>
        </div>

        <h1 className="text-lg sm:text-xl font-bold text-on-surface tracking-tight">
          Lạc Lối Trong Giai Điệu Rồi!
        </h1>

        <p className="text-xs text-outline leading-relaxed mt-1.5 max-w-xs mb-6">
          Đường dẫn bạn truy cập không tồn tại hoặc đã bị thay đổi. Hãy để Anna đưa bạn quay lại với âm nhạc quen thuộc nhé!
        </p>

        {/* Action Button */}
        <button
          onClick={onGoHome}
          className="w-full h-11 rounded-xl bg-primary-container hover:bg-primary active:scale-[0.99] text-on-primary font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2"
        >
          <Home size={15} />
          <span>Quay Về Trang Chủ</span>
        </button>

        {/* Footnote */}
        <p className="text-[11px] text-outline mt-4">
          Cần kết nối Web Player? Dùng lệnh <code className="text-primary-container font-mono font-bold bg-surface-container px-1 py-0.5 rounded border border-white/5">/web</code> trong Discord để lấy mã PIN mới.
        </p>
      </div>

      <footer className="absolute bottom-4 font-mono text-[10px] text-outline/50 uppercase tracking-widest">
        ANNA MUSIC • VINYL LOUNGE
      </footer>
    </div>
  );
}
