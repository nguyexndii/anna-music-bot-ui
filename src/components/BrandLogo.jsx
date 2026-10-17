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
      {/* ── 1. BIỂU TƯỢNG LOGO MÂM ĐĨA THAN KIM LOẠI & SÓNG ÂM ────────────────── */}
      <div
        className="relative shrink-0 rounded-2xl flex items-center justify-center p-0.5 transition-transform duration-300 group-hover:scale-105"
        style={{ width: iconSize, height: iconSize }}
      >
        {/* Glow nền mờ nhẹ */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#e8c977]/30 to-[#ef7864]/20 blur-sm opacity-60 group-hover:opacity-100 transition-opacity" />

        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full relative z-10 drop-shadow-md"
        >
          <defs>
            {/* Vành đĩa than vàng champagne */}
            <linearGradient id="annaGoldGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fff2cb" />
              <stop offset="35%" stopColor="#e5c178" />
              <stop offset="70%" stopColor="#af8130" />
              <stop offset="100%" stopColor="#ef7864" />
            </linearGradient>

            {/* Thân đĩa than kim loại tối màu */}
            <radialGradient id="annaVinylBase" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#2c3038" />
              <stop offset="60%" stopColor="#181a1f" />
              <stop offset="100%" stopColor="#0d0e12" />
            </radialGradient>

            {/* Tâm đĩa ánh kim */}
            <radialGradient id="annaSpindleGlow" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#fff8e7" />
              <stop offset="45%" stopColor="#e5c178" />
              <stop offset="100%" stopColor="#8c641e" />
            </radialGradient>
          </defs>

          {/* Viền ngoài khung vuông bo góc mềm bo đĩa */}
          <rect x="2" y="2" width="44" height="44" rx="13" fill="#15171c" stroke="url(#annaGoldGrad)" strokeWidth="1.2" />

          {/* Vành đĩa than chính */}
          <circle cx="24" cy="24" r="16.5" fill="url(#annaVinylBase)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" />

          {/* Các rãnh âm thanh đĩa than đồng tâm siêu mảnh */}
          <circle cx="24" cy="24" r="14" stroke="rgba(229,193,120,0.18)" strokeWidth="0.6" strokeDasharray="3 1.5" />
          <circle cx="24" cy="24" r="11.5" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
          <circle cx="24" cy="24" r="9" stroke="rgba(229,193,120,0.22)" strokeWidth="0.6" strokeDasharray="4 2" />

          {/* Tâm đĩa vàng mạ kim loại */}
          <circle cx="24" cy="24" r="6.2" fill="url(#annaSpindleGlow)" stroke="#1a1c22" strokeWidth="0.7" />

          {/* Biểu tượng Sóng Nhạc & Chữ 'a' cách điệu ở trung tâm */}
          <path
            d="M21 27.5 C21 24.5 27 24.5 27 22 C27 20 25.2 19.5 23.8 20.2 C22.8 20.7 22.3 21.6 22.2 22.5"
            stroke="#16181d"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <circle cx="24" cy="24" r="1.3" fill="#16181d" />

          {/* Sóng âm thanh 3 vạch mini phía trên góc đĩa */}
          <rect x="34" y="9" width="1.6" height="5" rx="0.8" fill="#e5c178" opacity="0.85" />
          <rect x="37" y="7" width="1.6" height="8.5" rx="0.8" fill="#f5a192" opacity="0.95" />
          <rect x="40" y="10" width="1.6" height="4" rx="0.8" fill="#e5c178" opacity="0.75" />
        </svg>
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
