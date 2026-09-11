import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Play, Heart } from 'lucide-react';
import { DEFAULT_TRACK_THUMB } from '../config';

function getTrackThumb(track) {
  if (track?.thumbnail && !track.thumbnail.includes('yt3.ggpht.com') && !track.thumbnail.includes('default_user')) {
    return track.thumbnail;
  }
  if (track?.url) {
    const match = track.url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (match && match[1]) {
      return `https://i.ytimg.com/vi/${match[1]}/hqdefault.jpg`;
    }
  }
  return DEFAULT_TRACK_THUMB;
}

export default function FavoritesModal({ isOpen, onClose, favorites = [], onOrderSong }) {
  // Đóng modal khi nhấn phím ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePlayAll = () => {
    favorites.forEach((song) => {
      onOrderSong?.(song);
    });
    onClose?.();
  };

  return ReactDOM.createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        animation: 'fadeIn 0.18s ease-out'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 620,
          maxHeight: '86vh',
          borderRadius: 20,
          background: 'var(--paper)',
          border: '1px solid var(--border)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.75)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            background: 'rgba(255, 255, 255, 0.015)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h3
              style={{
                margin: 0,
                fontSize: 17,
                fontWeight: 700,
                color: 'var(--ink)',
                letterSpacing: '-0.02em'
              }}
            >
              Bài Hát Yêu Thích
            </h3>
            <span
              style={{
                fontFamily: '"DM Mono", monospace',
                fontSize: 11,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 6,
                background: 'rgba(232, 201, 119, 0.12)',
                color: 'var(--yellow)',
                border: '1px solid rgba(232, 201, 119, 0.25)'
              }}
            >
              {favorites.length} BÀI
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {favorites.length > 0 && (
              <button
                onClick={handlePlayAll}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--soft)',
                  color: 'var(--yellow)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                title="Thêm tất cả bài yêu thích vào hàng chờ"
              >
                <Play size={12} fill="var(--yellow)" />
                <span>Phát tất cả</span>
              </button>
            )}

            <button
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--soft)',
                color: 'var(--muted)',
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
                transition: 'color 0.15s, border-color 0.15s'
              }}
              aria-label="Đóng popup"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body: Danh sách bài hát (Cuộn vô hạn) */}
        <div
          style={{
            padding: '14px 20px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }}
        >
          {favorites.length === 0 ? (
            <div
              style={{
                padding: '48px 16px',
                textAlign: 'center',
                color: 'var(--muted)',
                fontSize: 13
              }}
            >
              <Heart size={32} style={{ color: 'var(--border)', margin: '0 auto 12px', display: 'block' }} />
              Chưa có bài hát nào trong danh sách yêu thích.
            </div>
          ) : (
            favorites.map((song, idx) => {
              const globalIndex = idx + 1;
              return (
                <div
                  key={song.url || idx}
                  onClick={() => onOrderSong?.(song)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '8px 12px',
                    borderRadius: 12,
                    background: 'var(--soft)',
                    border: '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s, background 0.15s, transform 0.12s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(232, 201, 119, 0.4)';
                    e.currentTarget.style.background = 'rgba(232, 201, 119, 0.05)';
                    e.currentTarget.style.transform = 'translateX(2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'transparent';
                    e.currentTarget.style.background = 'var(--soft)';
                    e.currentTarget.style.transform = 'none';
                  }}
                  title="Nhấn để thêm vào hàng chờ"
                >
                  <span
                    style={{
                      fontFamily: '"DM Mono", monospace',
                      fontSize: 11,
                      color: 'var(--muted)',
                      width: 22,
                      textAlign: 'right',
                      flexShrink: 0
                    }}
                  >
                    #{globalIndex}
                  </span>

                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      overflow: 'hidden',
                      flexShrink: 0,
                      background: '#22252a',
                      position: 'relative'
                    }}
                  >
                    <img
                      src={getTrackThumb(song)}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--ink)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      title={song.title}
                    >
                      {song.title}
                    </p>
                    <p
                      style={{
                        margin: '2px 0 0',
                        fontSize: 11.5,
                        color: 'var(--muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {song.artist || 'YouTube'}
                    </p>
                  </div>

                  <span
                    style={{
                      fontFamily: '"DM Mono", monospace',
                      fontSize: 11,
                      color: 'var(--muted)',
                      flexShrink: 0
                    }}
                  >
                    {song.duration || ''}
                  </span>

                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: 'rgba(232, 201, 119, 0.1)',
                      border: '1px solid rgba(232, 201, 119, 0.2)',
                      display: 'grid',
                      placeItems: 'center',
                      color: 'var(--yellow)',
                      flexShrink: 0,
                      marginLeft: 4
                    }}
                  >
                    <Play size={13} fill="var(--yellow)" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer: Thông tin cuộn mượt */}
        {favorites.length > 0 && (
          <div
            style={{
              padding: '10px 20px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
              background: 'rgba(255, 255, 255, 0.01)',
              fontFamily: '"DM Mono", monospace',
              fontSize: 11,
              color: 'var(--muted)'
            }}
          >
            <span>Tổng số {favorites.length} bài hát yêu thích</span>
            <span>Cuộn chuột để xem thêm</span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>,
    document.body
  );
}
