import React from 'react';
import { Home, Compass } from 'lucide-react';

export default function NotFoundScreen({ onGoHome }) {
  return (
    <main className="auth-shell">
      {/* Brand Header with prominent big logo */}
      <div className="auth-brand" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
          <img
            src="/logo.gif"
            alt="Anna Music Logo"
            style={{
              width: 130,
              height: 130,
              borderRadius: 28,
              border: '2px solid rgba(232, 201, 119, 0.45)',
              objectFit: 'cover',
              imageRendering: 'pixelated',
              boxShadow: '0 0 35px rgba(232, 201, 119, 0.28), 0 16px 32px rgba(0,0,0,0.6)',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              cursor: 'pointer'
            }}
            onClick={onGoHome}
            title="Quay về trang chủ"
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 0 45px rgba(232, 201, 119, 0.45), 0 20px 40px rgba(0,0,0,0.7)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 0 35px rgba(232, 201, 119, 0.28), 0 16px 32px rgba(0,0,0,0.6)';
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: -6,
              right: -6,
              background: 'var(--coral)',
              color: '#fff',
              fontSize: 10,
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: 999,
              border: '2px solid var(--bg)',
              letterSpacing: '0.08em'
            }}
          >
            404
          </div>
        </div>

        <div className="brand-name">
          <span className="y">an</span><b className="c">na</b>
        </div>
        <div className="brand-subtitle">MUSIC WEB PLAYER</div>
      </div>

      {/* 404 Content Card */}
      <section className="auth-card voice-card" style={{ maxWidth: 440 }}>
        {/* Equalizer Wave Indicator */}
        <div className="quiet-shape" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>

        <div className="card-kicker" style={{ color: 'var(--coral)', letterSpacing: '0.2em', fontWeight: 600 }}>
          KHÔNG TÌM THẤY TRANG
        </div>

        <h1 style={{ fontSize: 21, letterSpacing: '-0.02em', fontWeight: 600, color: 'var(--ink)' }}>
          Lạc Lối Trong Giai Điệu Rồi!
        </h1>

        <p className="card-copy" style={{ marginTop: 10, lineHeight: 1.6, color: 'var(--muted)', fontSize: 13 }}>
          Đường dẫn bạn truy cập không tồn tại hoặc đã bị thay đổi.<br />
          Đừng lo lắng, hãy để Anna đưa bạn quay lại với những bài hát quen thuộc nhé!
        </p>

        {/* Server badge style for 404 info */}
        <div
          className="server-badge"
          style={{
            borderColor: 'rgba(239, 120, 100, 0.4)',
            color: 'var(--coral)',
            margin: '18px 0 22px',
            fontSize: 10,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Compass size={12} /> ERROR 404 • PATH NOT FOUND
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
          <button
            className="primary-button"
            onClick={onGoHome}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <Home size={16} />
            Quay Về Trang Chủ
          </button>
        </div>

        <p className="card-footnote" style={{ marginTop: 20 }}>
          Cần kết nối Web Player? Dùng lệnh <code style={{ color: 'var(--yellow)', fontWeight: 600 }}>/web</code> trong Discord để lấy mã PIN mới.
        </p>
      </section>

      <footer className="auth-footer" style={{ marginTop: 28 }}>
        ANNA MUSIC · 2024 - 2026
      </footer>
    </main>
  );
}
