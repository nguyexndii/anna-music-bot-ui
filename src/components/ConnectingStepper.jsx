import React from 'react';
import BrandLogo from './BrandLogo';

export default function ConnectingStepper({ text = 'ĐANG KHỞI TẠO...' }) {
  return (
    <main className="auth-shell">
      <div className="auth-brand" style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <BrandLogo size="lg" showSubtext={true} />
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
