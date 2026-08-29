import React from 'react';
import { Sliders, Radio, Sparkles, Lock, ShieldCheck, Info } from 'lucide-react';

export default function SettingsTab({ player, onAction, user, onRequireAdmin }) {
  const isAdmin = Boolean(user?.isAdmin);

  const handleToggle = (action) => {
    if (!isAdmin) {
      onRequireAdmin?.();
    } else {
      onAction(action);
    }
  };

  return (
    <div className="bg-anna-surface border border-anna-border/80 rounded-2xl p-6 flex-1 flex flex-col gap-5">
      {/* Header with Admin Status Badge */}
      <div className="flex items-center justify-between pb-2 border-b border-anna-border/50">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Sliders className="w-4 h-4 text-anna-accent" />
          <span>Cài Đặt Phát Nhạc Server</span>
        </h3>

        {isAdmin ? (
          <span className="text-[10px] px-2.5 py-1 rounded-full bg-anna-green/10 border border-anna-green/30 text-anna-green font-bold flex items-center gap-1 shadow-sm">
            <ShieldCheck className="w-3 h-3" />
            <span>Quản Trị Viên</span>
          </span>
        ) : (
          <span className="text-[10px] px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold flex items-center gap-1 shadow-sm">
            <Lock className="w-3 h-3" />
            <span>Chỉ Xem (Cần Admin)</span>
          </span>
        )}
      </div>

      {!isAdmin && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-200/90">
          <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <span>
            Bạn đang đăng nhập với quyền <b>Thành viên</b>. Chỉ Quản trị viên máy chủ mới có thể lưu thay đổi các cài đặt này.
          </span>
        </div>
      )}

      {/* 24/7 Lofi Mode */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-anna-card border border-anna-border/80 hover:border-anna-border transition">
        <div className="pr-4">
          <p className="text-xs font-bold text-white flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-anna-pink" />
            <span>Chế độ Treo Lofi 24/7</span>
            {!isAdmin && <Lock className="w-3 h-3 text-amber-400" title="Chỉ Quản trị viên mới được bật/tắt" />}
          </p>
          <p className="text-[11px] text-anna-muted mt-1 leading-relaxed">
            Tự động phát Lofi thư giãn khi không có người nghe hoặc hết bài hát trong hàng chờ. Bot sẽ không bao giờ rời phòng Voice.
          </p>
        </div>

        <button
          onClick={() => handleToggle('toggle247')}
          title={isAdmin ? (player?.mode247 ? "Tắt chế độ 24/7" : "Bật chế độ 24/7") : "Yêu cầu quyền Quản trị viên (Admin)"}
          className={`w-12 h-6 rounded-full relative p-0.5 transition-all flex-shrink-0 active:scale-95 focus-visible:ring-2 focus-visible:ring-anna-pink focus-visible:outline-none ${
            player?.mode247 ? 'bg-anna-pink shadow-lg shadow-anna-pink/20' : 'bg-anna-border'
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full bg-white transition-transform duration-200 flex items-center justify-center ${
              player?.mode247 ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          >
            {!isAdmin && <Lock className="w-2.5 h-2.5 text-gray-700" />}
          </div>
        </button>
      </div>

      {/* Autoplay DJ AI */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-anna-card border border-anna-border/80 hover:border-anna-border transition">
        <div className="pr-4">
          <p className="text-xs font-bold text-white flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-anna-green" />
            <span>DJ AI Tự Động Gợi Ý (Autoplay)</span>
            {!isAdmin && <Lock className="w-3 h-3 text-amber-400" title="Chỉ Quản trị viên mới được bật/tắt" />}
          </p>
          <p className="text-[11px] text-anna-muted mt-1 leading-relaxed">
            Sử dụng Google Gemini AI và YouTube Mix để tự động chọn bài hát tương tự phù hợp khi còn người trong phòng Voice.
          </p>
        </div>

        <button
          onClick={() => handleToggle('toggleAutoplay')}
          title={isAdmin ? (player?.autoplay ? "Tắt Autoplay" : "Bật Autoplay") : "Yêu cầu quyền Quản trị viên (Admin)"}
          className={`w-12 h-6 rounded-full relative p-0.5 transition-all flex-shrink-0 active:scale-95 focus-visible:ring-2 focus-visible:ring-anna-green focus-visible:outline-none ${
            player?.autoplay !== false ? 'bg-anna-green shadow-lg shadow-anna-green/20' : 'bg-anna-border'
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full bg-white transition-transform duration-200 flex items-center justify-center ${
              player?.autoplay !== false ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          >
            {!isAdmin && <Lock className="w-2.5 h-2.5 text-gray-700" />}
          </div>
        </button>
      </div>
    </div>
  );
}
