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
        <div className="brand-name"><span className="y">an</span><b className="c">na</b></div>
        <div className="brand-subtitle">MUSIC WEB PLAYER</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 80,
          height: 3,
          background: 'var(--border)',
          borderRadius: 3,
          overflow: 'hidden',
          margin: '0 auto 16px',
        }}>
          <div style={{
            height: '100%',
            width: '45%',
            background: 'var(--yellow)',
            borderRadius: 3,
            animation: 'stepperSlide 1.3s cubic-bezier(0.4, 0, 0.2, 1) infinite',
          }} />
        </div>
        <p style={{
          fontFamily: '"DM Mono", monospace',
          fontSize: 11,
          letterSpacing: '0.18em',
          color: 'var(--muted)',
          margin: 0,
        }}>
          {text}
        </p>
      </div>
      <style>{`@keyframes stepperSlide { 0% { transform: translateX(-100%); } 100% { transform: translateX(260%); } }`}</style>
      <footer className="auth-footer" style={{ marginTop: 28 }}>ANNA MUSIC</footer>
    </main>
  );
}
