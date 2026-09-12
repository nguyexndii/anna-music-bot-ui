import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { X, ListMusic, Search, User } from 'lucide-react';
import { DEFAULT_TRACK_THUMB } from '../config';

function getPlaylistPreviewImage(url) {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (match && match[1]) {
    return `https://i.ytimg.com/vi/${match[1]}/hqdefault.jpg`;
  }
  return null;
}

export default function AllPlaylistsModal({ isOpen, onClose, playlists = [], onSelectPlaylist }) {
  const [searchQuery, setSearchQuery] = useState('');

  // Đóng modal khi nhấn phím ESC
  useEffect(() => {
    if (!isOpen) return;
    setSearchQuery('');
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredPlaylists = useMemo(() => {
    if (!searchQuery.trim()) return playlists;
    const q = searchQuery.trim().toLowerCase();
    return playlists.filter(
      (pl) =>
        (pl.title && pl.title.toLowerCase().includes(q)) ||
        (pl.name && pl.name.toLowerCase().includes(q)) ||
        (pl.addedBy && pl.addedBy.toLowerCase().includes(q))
    );
  }, [playlists, searchQuery]);

  if (!isOpen) return null;

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
          maxWidth: 720,
          maxHeight: '88vh',
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
            background: 'rgba(255, 255, 255, 0.015)',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(232, 201, 119, 0.12)',
                border: '1px solid rgba(232, 201, 119, 0.25)',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--yellow)',
                flexShrink: 0
              }}
            >
              <ListMusic size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 700,
                    color: 'var(--ink)',
                    letterSpacing: '-0.02em'
                  }}
                >
                  Tất Cả Danh Sách Phát
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
                  {playlists.length} PLAYLIST
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--muted)', fontFamily: '"DM Mono", monospace' }}>
                Nhấn vào playlist để xem danh sách bài hát và phát nhạc
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--muted)',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s',
              flexShrink: 0
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--ink)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--muted)';
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Search Filter */}
        <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.15)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              borderRadius: 10,
              background: 'var(--bg)',
              border: '1px solid var(--border)'
            }}
          >
            <Search size={15} style={{ color: 'var(--muted)', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Tìm theo tên playlist hoặc người thêm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--ink)',
                fontSize: 13,
                width: '100%',
                fontFamily: 'inherit'
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  padding: 2,
                  display: 'grid',
                  placeItems: 'center'
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Playlist Grid */}
        <div
          style={{
            padding: '20px 24px',
            overflowY: 'auto',
            flex: 1
          }}
        >
          {filteredPlaylists.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
              <ListMusic size={32} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
              <p style={{ margin: 0, fontSize: 13 }}>
                {searchQuery ? 'Không tìm thấy playlist nào phù hợp!' : 'Chưa có playlist nào được thêm vào máy chủ.'}
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 12
              }}
            >
              {filteredPlaylists.map((pl, idx) => {
                const thumb = pl.thumbnail || getPlaylistPreviewImage(pl.url) || pl.firstTrackThumb;
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      onSelectPlaylist?.(pl);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 12,
                      borderRadius: 14,
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      transition: 'all 0.18s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(232, 201, 119, 0.5)';
                      e.currentTarget.style.background = 'rgba(232, 201, 119, 0.06)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                      e.currentTarget.style.transform = 'none';
                    }}
                    title="Nhấn để xem các bài hát trong playlist này"
                  >
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 10,
                        overflow: 'hidden',
                        background: '#202328',
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                        border: '1px solid var(--border)',
                        position: 'relative'
                      }}
                    >
                      {thumb ? (
                        <img
                          src={thumb}
                          alt=""
                          onError={(e) => {
                            e.currentTarget.src = DEFAULT_TRACK_THUMB;
                          }}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <ListMusic size={22} style={{ color: 'var(--yellow)' }} />
                      )}
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p
                        title={pl.title || pl.name}
                        style={{
                          margin: 0,
                          fontSize: 13,
                          fontWeight: 600,
                          color: 'var(--ink)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {pl.title || pl.name || 'Danh Sách Phát'}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: 4 }}>
                        <span
                          style={{
                            fontFamily: '"DM Mono", monospace',
                            fontSize: 10,
                            color: 'var(--yellow)',
                            fontWeight: 600,
                            flexShrink: 0,
                            background: 'rgba(232, 201, 119, 0.1)',
                            padding: '1px 6px',
                            borderRadius: 4,
                            border: '1px solid rgba(232, 201, 119, 0.2)'
                          }}
                        >
                          {pl.trackCount || pl.itemCount ? `${pl.trackCount || pl.itemCount} BÀI` : 'PLAYLIST'}
                        </span>

                        {pl.addedBy && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              minWidth: 0,
                              overflow: 'hidden',
                              background: 'rgba(255, 255, 255, 0.04)',
                              padding: '1px 6px',
                              borderRadius: 4,
                              border: '1px solid rgba(255, 255, 255, 0.06)'
                            }}
                            title={`Thêm bởi: ${pl.addedBy}`}
                          >
                            {pl.addedByAvatar ? (
                              <img
                                src={pl.addedByAvatar}
                                alt=""
                                style={{ width: 13, height: 13, borderRadius: '50%', flexShrink: 0, objectFit: 'cover' }}
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <User size={10} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                            )}
                            <span
                              style={{
                                fontSize: 10,
                                color: 'var(--muted)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: 100
                              }}
                            >
                              @{pl.addedBy}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
