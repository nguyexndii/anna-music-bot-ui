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
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-3xl max-h-[88vh] rounded-xl bg-[#13161b] border border-[#22262e] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-4 sm:px-5 sm:py-4 border-b border-[#22262e] flex items-center justify-between shrink-0 bg-white/[0.015] gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#e8c977]/15 border border-[#e8c977]/30 flex items-center justify-center text-[#e8c977] shrink-0">
              <ListMusic size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#eceae4] tracking-tight">
                  Tất Cả Danh Sách Phát
                </h3>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#e8c977]/15 text-[#e8c977] border border-[#e8c977]/25">
                  {playlists.length} PLAYLIST
                </span>
              </div>
              <p className="text-[11px] text-[#848992] font-mono mt-0.5">
                Nhấn vào playlist để xem danh sách bài hát và phát nhạc
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-[#22262e] bg-[#181b20] hover:bg-[#22262e] text-[#848992] hover:text-[#eceae4] flex items-center justify-center transition-colors shrink-0"
            aria-label="Đóng"
          >
            <X size={15} />
          </button>
        </div>

        {/* Search Filter */}
        <div className="px-5 py-2.5 border-b border-[#22262e] bg-black/20">
          <div className="flex items-center gap-2 bg-[#181b20] border border-[#22262e] px-3 py-1.5 rounded-lg focus-within:border-[#e8c977]/40">
            <Search size={14} className="text-[#848992] shrink-0" />
            <input
              type="text"
              placeholder="Tìm theo tên playlist hoặc người thêm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-[#eceae4] placeholder:text-[#848992] w-full"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-[#848992] hover:text-[#eceae4] p-0.5"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Playlist Grid */}
        <div className="p-5 overflow-y-auto custom-scroll flex-1">
          {filteredPlaylists.length === 0 ? (
            <div className="text-center py-16 text-[#848992]">
              <ListMusic size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-xs">
                {searchQuery ? 'Không tìm thấy playlist nào phù hợp!' : 'Chưa có playlist nào được thêm vào máy chủ.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredPlaylists.map((pl, idx) => {
                const thumb = pl.thumbnail || getPlaylistPreviewImage(pl.url) || pl.firstTrackThumb;
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      onSelectPlaylist?.(pl);
                    }}
                    className="p-3 rounded-lg bg-[#181b20] hover:bg-[#20232a] border border-[#22262e] hover:border-[#e8c977]/35 transition-all flex items-center gap-3 cursor-pointer group"
                    title="Nhấn để xem các bài hát trong playlist này"
                  >
                    <div className="w-12 h-12 rounded-md overflow-hidden bg-[#13161b] border border-white/5 flex items-center justify-center shrink-0 relative">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt=""
                          onError={(e) => {
                            e.currentTarget.src = DEFAULT_TRACK_THUMB;
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <ListMusic size={20} className="text-[#e8c977]" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p
                        title={pl.title || pl.name}
                        className="text-xs font-semibold text-[#eceae4] truncate group-hover:text-[#e8c977] transition-colors"
                      >
                        {pl.title || pl.name || 'Danh Sách Phát'}
                      </p>

                      <div className="flex items-center justify-between gap-2 mt-1.5">
                        <span className="font-mono text-[9px] font-bold text-[#e8c977] bg-[#e8c977]/10 px-1.5 py-0.5 rounded border border-[#e8c977]/20 shrink-0">
                          {pl.trackCount || pl.itemCount ? `${pl.trackCount || pl.itemCount} BÀI` : 'PLAYLIST'}
                        </span>

                        {pl.addedBy && (
                          <div
                            className="flex items-center gap-1 min-w-0 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/5"
                            title={`Thêm bởi: ${pl.addedBy}`}
                          >
                            {pl.addedByAvatar ? (
                              <img
                                src={pl.addedByAvatar}
                                alt=""
                                className="w-3.5 h-3.5 rounded-full object-cover shrink-0"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <User size={10} className="text-[#848992] shrink-0" />
                            )}
                            <span className="text-[10px] text-[#848992] truncate max-w-[100px]">
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
