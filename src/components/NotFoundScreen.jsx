import React from 'react';
import { Home, Compass } from 'lucide-react';
import BrandLogo from './BrandLogo';

export default function NotFoundScreen({ onGoHome }) {
  return (
    <div className="min-h-screen h-[100dvh] w-full bg-surface flex items-center justify-center p-4 select-none relative overflow-hidden font-body text-on-surface antialiased">
      {/* 404 Central Card */}
      <div className="w-full max-w-md bg-surface-container-low border border-border/80 rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col items-center text-center relative z-10">
        
        {/* Brand Logo & 404 Indicator */}
        <div className="relative mb-5 group cursor-pointer" onClick={onGoHome} title="Quay về Trang Chủ">
          <BrandLogo size="lg" showSubtext={false} />
        </div>

        {/* Status badge */}
        <div className="px-2.5 py-0.5 rounded-md bg-surface-container border border-border text-outline font-mono text-[10px] font-semibold flex items-center gap-1.5 mb-2">
          <Compass size={12} className="text-secondary" />
          <span>404 • KHÔNG TÌM THẤY TRANG</span>
        </div>

        <h1 className="text-lg sm:text-xl font-bold text-on-surface tracking-tight">
          Không tìm thấy trang này
        </h1>

        <p className="text-xs text-outline leading-relaxed mt-1.5 max-w-xs mb-6">
          Đường dẫn bạn truy cập không tồn tại hoặc phiên Web Player đã kết thúc. Vui lòng quay về trang chủ.
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
        ANNA MUSIC • WEB PLAYER
      </footer>
    </div>
  );
}
