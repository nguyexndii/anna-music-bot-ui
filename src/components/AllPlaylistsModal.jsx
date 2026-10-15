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

  // Close modal on ESC key
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
      className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-3xl max-h-[85vh] rounded-2xl bg-[#141417] border border-white/[0.08] shadow-2xl shadow-black/80 flex flex-col overflow-hidden text-zinc-100"
        style={{
          fontFamily: "'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.07] flex items-center justify-between flex-shrink-0 bg-[#111113] gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 flex-shrink-0">
              <ListMusic className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-sm sm:text-base font-bold text-zinc-100 tracking-tight">
                  Tất Cả Danh Sách Phát
                </h3>
                <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  {playlists.length} PLAYLIST
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5 font-sans">
                Nhấn vào playlist để xem bài hát và phát nhạc
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-white/[0.07] bg-[#18181C] hover:bg-[#222228] text-zinc-400 hover:text-zinc-100 flex items-center justify-center transition flex-shrink-0"
            title="Đóng (ESC)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Filter */}
        <div className="px-6 py-3 border-b border-white/[0.07] bg-[#111113]/60">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#0E0E11] border border-white/[0.08] focus-within:border-orange-500/50 transition">
            <Search className="w-4 h-4 text-zinc-500 flex-shrink-0" />
            <input
              type="text"
              placeholder="Tìm theo tên playlist hoặc người thêm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-500 w-full"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-zinc-500 hover:text-zinc-300 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Playlist Grid */}
        <div className="p-6 overflow-y-auto flex-1">
          {filteredPlaylists.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <ListMusic className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs">
                {searchQuery
                  ? 'Không tìm thấy playlist nào phù hợp!'
                  : 'Chưa có playlist nào được thêm vào máy chủ.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredPlaylists.map((pl, idx) => {
                const thumb = pl.thumbnail || getPlaylistPreviewImage(pl.url) || pl.firstTrackThumb;
                return (
                  <div
                    key={idx}
                    onClick={() => onSelectPlaylist?.(pl)}
                    className="flex items-center gap-3 p-3 rounded-xl bg-[#16161A] hover:bg-[#1C1C22] border border-white/[0.06] hover:border-orange-500/30 cursor-pointer transition-all duration-150 group"
                    title="Nhấn để xem các bài hát trong playlist này"
                  >
                    <div className="w-13 h-13 rounded-lg overflow-hidden bg-zinc-900 flex-shrink-0 border border-white/[0.08] relative aspect-square">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt=""
                          onError={(e) => {
                            e.currentTarget.src = DEFAULT_TRACK_THUMB;
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-orange-400">
                          <ListMusic className="w-5 h-5" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p
                        title={pl.title || pl.name}
                        className="text-xs sm:text-sm font-semibold text-zinc-100 truncate group-hover:text-orange-400 transition-colors"
                      >
                        {pl.title || pl.name || 'Danh Sách Phát'}
                      </p>

                      <div className="flex items-center justify-between gap-2 mt-1.5">
                        <span className="font-mono text-[10px] font-semibold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded">
                          {pl.trackCount || pl.itemCount
                            ? `${pl.trackCount || pl.itemCount} BÀI`
                            : 'PLAYLIST'}
                        </span>

                        {pl.addedBy && (
                          <div
                            className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-zinc-400 text-[10px] truncate max-w-[120px]"
                            title={`Thêm bởi: ${pl.addedBy}`}
                          >
                            {pl.addedByAvatar ? (
                              <img
                                src={pl.addedByAvatar}
                                alt=""
                                className="w-3 h-3 rounded-full object-cover flex-shrink-0"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <User className="w-2.5 h-2.5 opacity-60 flex-shrink-0" />
                            )}
                            <span className="truncate">@{pl.addedBy}</span>
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
