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
  // Close modal on ESC key
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
    if (!favorites || favorites.length === 0) return;
    onOrderSong?.({
      tracks: favorites,
      title: 'Danh sách Bài Hát Yêu Thích',
      isPlaylist: true,
      itemCount: favorites.length
    });
    onClose?.();
  };

  return ReactDOM.createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-xl max-h-[85vh] rounded-2xl bg-[#141417] border border-white/[0.08] shadow-2xl shadow-black/80 flex flex-col overflow-hidden text-zinc-100"
        style={{
          fontFamily: "'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-white/[0.07] flex items-center justify-between flex-shrink-0 bg-[#111113] gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 flex-shrink-0">
              <Heart className="w-4 h-4 fill-rose-500/20" />
            </div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-sm sm:text-base font-bold text-zinc-100 tracking-tight">
                Bài Hát Yêu Thích
              </h3>
              <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                {favorites.length} BÀI
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {favorites.length > 0 && (
              <button
                onClick={handlePlayAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-semibold shadow-md transition"
                title="Thêm tất cả bài yêu thích vào hàng chờ"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Phát tất cả</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg border border-white/[0.07] bg-[#18181C] hover:bg-[#222228] text-zinc-400 hover:text-zinc-100 flex items-center justify-center transition"
              aria-label="Đóng popup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tracks List */}
        <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-1.5 max-h-[62vh]">
          {favorites.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-500">
              <Heart className="w-8 h-8 mb-3 opacity-30 text-rose-400" />
              <p className="text-xs">Chưa có bài hát nào trong danh sách yêu thích.</p>
            </div>
          ) : (
            favorites.map((song, idx) => {
              const globalIndex = idx + 1;
              return (
                <div
                  key={song.url || idx}
                  onClick={() => onOrderSong?.(song)}
                  className="flex items-center gap-3 p-2 rounded-xl bg-[#16161A] hover:bg-[#1C1C22] border border-white/[0.04] hover:border-cyan-500/30 cursor-pointer transition-all duration-150 group"
                  title="Nhấn để thêm vào hàng chờ"
                >
                  <span className="font-mono text-xs text-zinc-500 w-6 text-right tabular-nums flex-shrink-0">
                    {globalIndex < 10 ? `0${globalIndex}` : globalIndex}
                  </span>

                  <div className="w-9 h-9 rounded-md overflow-hidden flex-shrink-0 bg-zinc-900 border border-white/[0.08] relative">
                    <img
                      src={getTrackThumb(song)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className="text-xs font-semibold text-zinc-200 truncate group-hover:text-cyan-400 transition-colors"
                      title={song.title}
                    >
                      {song.title}
                    </p>
                    <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                      {song.artist || 'YouTube'}
                    </p>
                  </div>

                  {song.duration && (
                    <span className="font-mono text-xs text-zinc-500 flex-shrink-0 tabular-nums">
                      {song.duration}
                    </span>
                  )}

                  <div className="w-7 h-7 rounded-md bg-[#1F1F24] border border-white/[0.08] text-zinc-400 group-hover:text-cyan-400 group-hover:border-cyan-500/30 flex items-center justify-center flex-shrink-0 transition">
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {favorites.length > 0 && (
          <div className="px-5 py-2.5 border-t border-white/[0.07] flex items-center justify-between flex-shrink-0 bg-[#111113] text-zinc-400 font-mono text-xs">
            <span>Tổng số {favorites.length} bài hát</span>
            <span>Cuộn để xem thêm</span>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
