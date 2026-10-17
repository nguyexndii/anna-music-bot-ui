import React from 'react';
import { Coffee, X, Check } from 'lucide-react';

export default function LofiConfirmModal({ isOpen, onClose, onConfirm, queueCount = 0 }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-[#13161b] border border-[#22262e] rounded-xl p-5 shadow-2xl flex flex-col items-center text-center relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Nút đóng */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 text-outline hover:text-on-surface p-1 rounded-lg transition-colors"
          aria-label="Đóng"
        >
          <X size={16} />
        </button>

        {/* Biểu tượng */}
        <div className="w-12 h-12 rounded-xl bg-primary-container/15 border border-primary-container/30 flex items-center justify-center text-primary-container mb-3.5">
          <Coffee size={22} />
        </div>

        {/* Tiêu đề */}
        <h3 className="text-base font-bold text-on-surface mb-2">
          Xác Nhận Chuyển Nhạc Lofi?
        </h3>

        {/* Mô tả */}
        <p className="text-xs leading-relaxed text-outline mb-5 max-w-xs">
          {queueCount > 0
            ? `Bot sẽ tạm dừng bài hát hiện tại và phát nhạc Lofi thư giãn. Toàn bộ ${queueCount} bài trong hàng chờ vẫn được lưu giữ nguyên vẹn để tiếp tục nghe sau!`
            : 'Bot sẽ chuyển sang phát nhạc Lofi 24/7 thư giãn không lời. Bạn có thể thêm bài hát mới hoặc bấm tiếp tục phát bất cứ lúc nào!'}
        </p>

        {/* Nút hành động */}
        <div className="flex gap-2.5 w-full">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-3 rounded-lg bg-surface-container hover:bg-surface-container-high border border-white/5 text-on-surface text-xs font-semibold transition-colors"
          >
            Hủy Bỏ
          </button>
          <button
            onClick={() => {
              onClose();
              onConfirm();
            }}
            className="flex-1 py-2 px-3 rounded-lg bg-primary-container hover:bg-primary active:scale-95 text-on-primary text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow"
          >
            <Check size={15} strokeWidth={2.5} />
            <span>Chuyển Lofi</span>
          </button>
        </div>
      </div>
    </div>
  );
}
