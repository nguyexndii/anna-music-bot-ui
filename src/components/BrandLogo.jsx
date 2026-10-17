import React from 'react';

export default function BrandLogo({ size = 'md', onClick, showSubtext = true, className = '' }) {
  // Kích thước linh hoạt
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  const iconSize = isLg ? 56 : isSm ? 32 : 36;
  const brandFontSize = isLg ? 'text-3xl sm:text-4xl' : isSm ? 'text-xl' : 'text-2xl';

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 select-none transition-all ${
        onClick ? 'cursor-pointer group active:scale-[0.98]' : ''
      } ${className}`}
      title="Anna Music Web Player"
    >
      {/* ── 1. BIỂU TƯỢNG LOGO GIF ANNA ────────────────── */}
      <div
        className="relative shrink-0 rounded-2xl overflow-hidden flex items-center justify-center p-0.5 border border-primary-container/40 shadow-sm transition-transform duration-300 group-hover:scale-105 bg-surface-container"
        style={{ width: iconSize, height: iconSize }}
      >
        <img
          src="/logo.gif"
          alt="Anna Logo"
          className="w-full h-full object-cover rounded-xl"
          loading="eager"
        />
      </div>

      {/* ── 2. BRAND TYPOGRAPHY ──────────────────────────────────────────────── */}
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-1 leading-none tracking-tight">
          <span className={`font-brand ${brandFontSize} font-bold text-primary-container`}>an</span>
          <span className={`font-brand ${brandFontSize} font-bold text-[#f5a192]`}>na</span>
          <span className="w-1.5 h-1.5 rounded-full bg-secondary ml-0.5 animate-pulse" />
        </div>

        {showSubtext && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="font-mono text-[9px] tracking-[0.16em] uppercase text-outline font-semibold">
              SOUNDBOT
            </span>
            <span className="text-[8px] text-outline/40">•</span>
            <span className="font-mono text-[8px] tracking-wider uppercase text-primary-container/80 font-medium">
              WEB PLAYER
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
