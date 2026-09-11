import React from 'react';
import { Coffee, X, Check } from 'lucide-react';

export default function LofiConfirmModal({ isOpen, onClose, onConfirm, queueCount = 0 }) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        animation: 'fadeIn 0.18s ease-out'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          background: '#16181d',
          border: '1px solid rgba(232, 201, 119, 0.3)',
          borderRadius: 20,
          padding: '24px 22px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 30px rgba(232, 201, 119, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          position: 'relative'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            background: 'transparent',
            border: 'none',
            color: 'var(--muted)',
            cursor: 'pointer',
            padding: 4,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          aria-label="Đóng"
        >
          <X size={18} />
        </button>

        {/* Icon */}
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            background: 'rgba(232, 201, 119, 0.12)',
            border: '1px solid rgba(232, 201, 119, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--yellow)',
            marginBottom: 16,
            boxShadow: '0 0 20px rgba(232, 201, 119, 0.2)'
          }}
        >
          <Coffee size={24} />
        </div>

        {/* Title */}
        <h3
          style={{
            margin: '0 0 8px',
            fontSize: 17,
            fontWeight: 700,
            color: '#ffffff',
            fontFamily: '"DM Sans", sans-serif'
          }}
        >
          Xác Nhận Chuyển Nhạc Lofi?
        </h3>

        {/* Description */}
        <p
          style={{
            margin: '0 0 20px',
            fontSize: 13,
            lineHeight: 1.6,
            color: 'var(--muted)',
            fontFamily: '"DM Sans", sans-serif'
          }}
        >
          {queueCount > 0
            ? `Bot sẽ tạm dừng bài hát hiện tại và phát nhạc Lofi thư giãn. Toàn bộ ${queueCount} bài trong hàng chờ vẫn được lưu giữ nguyên vẹn để tiếp tục nghe sau!`
            : 'Bot sẽ chuyển sang phát nhạc Lofi 24/7 thư giãn không lời. Bạn có thể thêm bài hát mới hoặc bấm tiếp tục phát bất cứ lúc nào!'}
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 10,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border)',
              color: 'var(--ink)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.15s ease'
            }}
          >
            Hủy Bỏ
          </button>
          <button
            onClick={() => {
              onClose();
              onConfirm();
            }}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 10,
              background: 'var(--yellow)',
              border: 'none',
              color: '#111316',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              boxShadow: '0 4px 14px rgba(232, 201, 119, 0.35)',
              transition: 'transform 0.15s ease'
            }}
          >
            <Check size={16} strokeWidth={2.5} />
            <span>Chuyển Lofi</span>
          </button>
        </div>
      </div>
    </div>
  );
}
