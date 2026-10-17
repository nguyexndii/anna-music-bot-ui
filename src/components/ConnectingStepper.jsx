import React from 'react';

export default function ConnectingStepper({ text = 'ĐANG KHỞI TẠO...' }) {
  return (
    <main className="auth-shell">
      <div className="auth-brand" style={{ marginBottom: 24 }}>
        <div style={{
          position: 'relative',
          width: 92,
          height: 92,
          margin: '0 auto 20px',
        }}>
          <img
            src="/logo.gif"
            alt="Anna Music Logo"
            style={{
              width: 92,
              height: 92,
              borderRadius: 24,
              objectFit: 'cover',
              border: '2px solid rgba(232, 201, 119, 0.45)',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6), 0 0 28px rgba(232, 201, 119, 0.2)',
              imageRendering: 'pixelated',
              display: 'block',
            }}
          />
        </div>
        <div className="text-2xl font-sans font-extrabold tracking-tight mb-1">
          <span className="text-primary-container">an</span><span className="text-[#ef7864]">na</span>
        </div>
        <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-outline font-semibold">
          PHIÊN ĐIỀU KHIỂN ÂM THANH
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 72,
          height: 2,
          background: '#22262e',
          borderRadius: 2,
          overflow: 'hidden',
          margin: '0 auto 14px',
        }}>
          <div style={{
            height: '100%',
            width: '45%',
            background: '#e8c977',
            borderRadius: 2,
            animation: 'stepperSlide 1.3s cubic-bezier(0.4, 0, 0.2, 1) infinite',
          }} />
        </div>
        <p className="font-mono text-[11px] tracking-wider text-outline m-0">
          {text}
        </p>
      </div>
      <style>{`@keyframes stepperSlide { 0% { transform: translateX(-100%); } 100% { transform: translateX(260%); } }`}</style>
      <footer className="auth-footer" style={{ marginTop: 28 }}>ANNA MUSIC</footer>
    </main>
  );
}
