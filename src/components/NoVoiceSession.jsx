import React from 'react';
import { MicOff, RefreshCw, HelpCircle } from 'lucide-react';

export default function NoVoiceSession({ guildName, onRefresh, isRefreshing }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[70vh] px-4 py-8 animate-in fade-in duration-300">
      {/* Breadcrumb style path */}
      <div className="text-xs font-mono text-anna-muted mb-6 flex items-center gap-2">
        <span className="text-white font-semibold">🎵 Music Player</span>
        <span>›</span>
        <span className="text-anna-accent font-semibold">📋 Queue</span>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-lg bg-[#12131c] border border-anna-border/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header with Yellow MicOff Icon */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/10">
            <MicOff className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">
              Không Có Phiên Voice
            </h2>
            <p className="text-xs text-anna-muted mt-0.5">
              Máy chủ: <span className="text-white font-semibold">{guildName || 'Discord'}</span>
            </p>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs sm:text-sm text-anna-muted leading-relaxed">
          Để sử dụng Web Player và order nhạc, bạn cần tham gia vào một kênh Voice trong máy chủ mà Anna Music Bot đang có mặt.
        </p>

        {/* Steps List */}
        <div className="bg-[#181926] border border-anna-border/60 rounded-2xl p-4 space-y-2.5">
          <p className="text-xs font-bold text-white uppercase tracking-wider">
            Các bước bắt đầu:
          </p>
          <ol className="text-xs text-anna-muted space-y-2 list-decimal list-inside leading-relaxed">
            <li>Mở Discord và tham gia vào một kênh Voice bất kỳ.</li>
            <li>Đảm bảo Anna Music Bot có mặt trong máy chủ của bạn.</li>
            <li>Quay lại đây và nhấn nút <span className="text-anna-accent font-semibold">"Làm Mới Phiên Voice"</span> bên dưới.</li>
          </ol>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex flex-col items-center gap-3">
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="w-full py-3 px-4 rounded-xl bg-anna-accent hover:bg-anna-accentHover text-white text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-anna-accent/25 active:scale-[0.98] disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Đang kiểm tra kết nối...' : 'Làm Mới Phiên Voice'}</span>
          </button>

          <div className="flex items-center gap-1.5 text-[11px] text-anna-muted">
            <HelpCircle className="w-3.5 h-3.5 opacity-70" />
            <span>Hoặc gõ lệnh <code className="text-anna-accent font-mono font-bold">.web</code> trong Discord để mở lại</span>
          </div>
        </div>
      </div>
    </div>
  );
}
