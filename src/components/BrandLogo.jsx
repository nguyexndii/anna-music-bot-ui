import React from 'react';

export default function BrandLogo({ size = 'md', onClick, showSubtext = true, className = '' }) {
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  const iconSize = isLg ? 54 : isSm ? 32 : 38;
  const brandFontSize = isLg ? 'text-2xl sm:text-3xl' : isSm ? 'text-base sm:text-lg' : 'text-lg sm:text-xl';
  const badgeSize = isLg ? 'text-[10px] px-2 py-0.5' : isSm ? 'text-[8px] px-1 py-0.2' : 'text-[9px] px-1.5 py-0.5';

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 select-none transition-all ${
        onClick ? 'cursor-pointer group active:scale-[0.98]' : ''
      } ${className}`}
      title="Anna Music Bot - Tổ Dân Phố"
    >
      {/* ── 1. BIỂU TƯỢNG LOGO GIF ANNA VỚI KHUNG ANALOG SANG TRỌNG ── */}
      <div
        className="relative shrink-0 transition-transform duration-200 group-hover:scale-105"
        style={{ width: iconSize, height: iconSize }}
      >
        <div className="w-full h-full rounded-xl overflow-hidden p-0.5 border border-[#e8c977]/35 shadow-md bg-[#13161b] flex items-center justify-center">
          <img
            src="/logo.gif"
            alt="Anna Music Logo"
            className="w-full h-full object-cover rounded-lg"
            style={{ imageRendering: 'pixelated' }}
            loading="eager"
          />
        </div>
        {/* Chấm chỉ báo trạng thái online nhỏ tinh tế ở góc */}
        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#4ade80] border-2 border-[#0d0f12] shadow-sm" />
      </div>

      {/* ── 2. TYPOGRAPHY ĐÀNG HOÀNG & HÀI HÒA VỚI ANIME GIF ── */}
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-1.5 leading-none tracking-tight">
          <span className={`font-sans ${brandFontSize} font-extrabold text-[#eceae4] tracking-tight`}>
            Anna
          </span>
          <span className={`font-sans ${brandFontSize} font-extrabold text-[#e8c977] tracking-tight`}>
            Music
          </span>
          <span className={`font-mono ${badgeSize} font-bold text-[#ef7864] bg-[#ef7864]/10 border border-[#ef7864]/25 rounded tracking-wider uppercase ml-0.5`}>
            BOT
          </span>
        </div>

        {showSubtext && (
          <div className="flex items-center gap-1.5 mt-1 font-mono text-[9px] uppercase tracking-[0.16em]">
            <span className="text-[#848992] font-semibold">TỔ DÂN PHỐ</span>
            <span className="text-white/20">•</span>
            <span className="text-[#e8c977] font-bold">HI-FI CONSOLE</span>
          </div>
        )}
      </div>
    </div>
  );
}
