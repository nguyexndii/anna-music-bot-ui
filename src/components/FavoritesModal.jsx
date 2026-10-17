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

export default function FavoritesModal({ isOpen, onClose, favorites = [], onOrderSong, onAction }) {
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
    if (onAction) {
      onAction('playFavorites');
    } else if (onOrderSong) {
      onOrderSong({ isFavorites: true, tracks: favorites });
    }
    onClose?.();
  };

  return ReactDOM.createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] rounded-xl bg-[#13161b] border border-[#22262e] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#22262e] flex items-center justify-between shrink-0 bg-white/[0.015]">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-bold text-[#eceae4] tracking-tight">
              Bài Hát Yêu Thích
            </h3>
            <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#e8c977]/15 text-[#e8c977] border border-[#e8c977]/25">
              {favorites.length} BÀI
            </span>
          </div>

          <div className="flex items-center gap-2">
            {favorites.length > 0 && (
              <button
                onClick={handlePlayAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#22262e] bg-[#181b20] hover:bg-[#22262e] text-[#e8c977] text-xs font-semibold transition-colors"
                title="Thêm tất cả bài yêu thích vào hàng chờ"
              >
                <Play size={12} fill="currentColor" />
                <span>Phát tất cả</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg border border-[#22262e] bg-[#181b20] hover:bg-[#22262e] text-[#848992] hover:text-[#eceae4] flex items-center justify-center transition-colors"
              aria-label="Đóng popup"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Body: Danh sách bài hát */}
        <div className="p-4 overflow-y-auto custom-scroll flex-1 flex flex-col gap-1.5">
          {favorites.length === 0 ? (
            <div className="py-16 text-center text-[#848992] text-xs">
              <Heart size={28} className="text-[#22262e] mx-auto mb-3" />
              Chưa có bài hát nào trong danh sách yêu thích.
            </div>
          ) : (
            favorites.map((song, idx) => {
              const globalIndex = idx + 1;
              return (
                <div
                  key={song.url || idx}
                  onClick={() => onOrderSong?.(song)}
                  className="group flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-[#181b20] border-b border-white/5 transition-colors cursor-pointer"
                  data-tip={`${song.title}${song.artist ? ` • ${song.artist}` : ''}`}
                >
                  <span className="font-mono text-[11px] text-[#848992] w-6 text-center shrink-0">
                    #{globalIndex < 10 ? `0${globalIndex}` : globalIndex}
                  </span>

                  <div className="w-10 h-10 rounded-md overflow-hidden shrink-0 bg-[#181b20] border border-white/5 relative">
                    <img
                      src={getTrackThumb(song)}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/default-playlist.jpg'; }}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-[#eceae4] truncate group-hover:text-[#e8c977] transition-colors cursor-default">
                      {song.title}
                    </p>
                    <p className="text-[10px] text-[#848992] font-mono truncate mt-0.5">
                      {song.artist || 'YouTube Music'}
                    </p>
                  </div>

                  {song.duration && (
                    <span className="font-mono text-[10px] text-[#848992] shrink-0">
                      {song.duration}
                    </span>
                  )}

                  <div className="w-8 h-8 rounded-lg bg-[#e8c977]/10 border border-[#e8c977]/20 flex items-center justify-center text-[#e8c977] group-hover:bg-[#e8c977] group-hover:text-[#111316] transition-all shrink-0">
                    <Play size={12} fill="currentColor" className="ml-0.5" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {favorites.length > 0 && (
          <div className="px-5 py-2.5 border-t border-[#22262e] flex items-center justify-between shrink-0 bg-white/[0.01] font-mono text-[10px] text-[#848992]">
            <span>Tổng số {favorites.length} bài hát yêu thích</span>
            <span>Cuộn chuột để xem thêm</span>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
