import React, { useEffect } from 'react';
import { Coffee, X, Check } from 'lucide-react';

export default function LofiConfirmModal({ isOpen, onClose, onConfirm, queueCount = 0 }) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-[#141417] border border-white/[0.08] rounded-2xl p-6 shadow-2xl shadow-black/80 flex flex-col items-center text-center relative text-zinc-100"
        style={{
          fontFamily: "'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-100 p-1 rounded-lg hover:bg-white/[0.06] transition"
          aria-label="Đóng"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon */}
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 shadow-inner">
          <Coffee className="w-6 h-6" />
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-zinc-100">
          Xác Nhận Chuyển Nhạc Lofi?
        </h3>

        {/* Description */}
        <p className="text-xs text-zinc-400 leading-relaxed mt-2 mb-6">
          {queueCount > 0
            ? `Bot sẽ tạm dừng bài hát hiện tại và phát nhạc Lofi thư giãn. Toàn bộ ${queueCount} bài trong hàng chờ vẫn được lưu giữ nguyên vẹn để tiếp tục nghe sau!`
            : 'Bot sẽ chuyển sang phát nhạc Lofi 24/7 thư giãn không lời. Bạn có thể thêm bài hát mới hoặc bấm tiếp tục phát bất cứ lúc nào!'}
        </p>

        {/* Action Buttons */}
        <div className="flex gap-2.5 w-full">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl bg-[#18181C] hover:bg-[#222228] border border-white/[0.08] text-zinc-300 text-xs font-semibold transition"
          >
            Hủy Bỏ
          </button>
          <button
            onClick={() => {
              onClose();
              onConfirm();
            }}
            className="flex-1 py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20 transition active:scale-95"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Chuyển Lofi</span>
          </button>
        </div>
      </div>
    </div>
  );
}
