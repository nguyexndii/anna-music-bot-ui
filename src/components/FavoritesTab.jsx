import React, { useState, useMemo } from 'react';
import { Heart, Play, Plus, Search, Trash2, Music } from 'lucide-react';
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

export default function FavoritesTab({ favorites = [], onOrderSong, onAction }) {
  const [filterQuery, setFilterQuery] = useState('');

  const filteredSongs = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return favorites;
    return favorites.filter(song =>
      (song.title || '').toLowerCase().includes(q) ||
      (song.artist || '').toLowerCase().includes(q)
    );
  }, [favorites, filterQuery]);

  const handlePlayAll = () => {
    if (!favorites.length) return;
    favorites.forEach(song => {
      onOrderSong?.(song);
    });
  };

  const handleRemoveFavorite = (song, e) => {
    e?.stopPropagation();
    onAction?.('toggleFavorite', song);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden select-none bg-surface/40">

      {/* ── 1. HEADER TAB BÀI HÁT YÊU THÍCH ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 shrink-0 border-b border-white/5 mb-3 gap-2 px-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-secondary-container/30 border border-secondary/30 flex items-center justify-center text-secondary shadow-sm">
            <Heart size={16} fill="currentColor" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider">
                Bài Hát Yêu Thích
              </h2>
              <span className="font-mono text-[10px] text-outline font-semibold">
                ({favorites.length} BÀI)
              </span>
            </div>
            <span className="text-[10px] text-outline">
              Bộ sưu tập các giai điệu bạn đã lưu
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Ô lọc tìm nhanh trong danh sách yêu thích */}
          {favorites.length > 5 && (
            <div className="flex items-center gap-1.5 bg-surface-container px-2.5 py-1 rounded-lg border border-white/5 focus-within:border-primary-container/40">
              <Search size={13} className="text-outline" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Lọc bài..."
                className="bg-transparent border-none text-xs text-on-surface placeholder:text-outline w-24 sm:w-32 focus:outline-none"
              />
            </div>
          )}

          {/* Nút phát tất cả */}
          {favorites.length > 0 && (
            <button
              onClick={handlePlayAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-container hover:bg-primary active:scale-95 text-on-primary font-semibold text-xs transition-all shadow"
            >
              <Play size={13} fill="currentColor" />
              <span>Phát Tất Cả</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 2. DANH SÁCH BÀI HÁT YÊU THÍCH ───────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scroll pr-1 flex flex-col gap-1.5">
        {favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3 text-outline">
            <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center border border-white/5 shadow-inner">
              <Heart size={28} className="text-outline opacity-40" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-on-surface">Chưa có bài hát yêu thích</h3>
              <p className="text-xs text-outline mt-1 max-w-xs leading-relaxed">
                Nhấn vào biểu tượng trái tim ở khung phát nhạc bên phải để lưu bài hát bạn yêu thích vào đây nhé!
              </p>
            </div>
          </div>
        ) : filteredSongs.length === 0 ? (
          <div className="py-12 text-center text-xs text-outline">
            Không tìm thấy bài hát nào phù hợp với từ khóa "{filterQuery}".
          </div>
        ) : (
          filteredSongs.map((track, idx) => (
            <div
              key={track.url || idx}
              onClick={() => onOrderSong?.(track)}
              className="group flex items-center justify-between gap-3 p-2 rounded-xl bg-surface-container-low hover:bg-surface-container border border-transparent hover:border-white/5 transition-colors cursor-pointer shadow-sm"
            >
              {/* Thứ tự & Thumbnail */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="font-mono text-[11px] text-outline w-6 text-center shrink-0">
                  #{idx < 9 ? `0${idx + 1}` : idx + 1}
                </span>

                <div className="w-10 h-10 rounded-lg bg-surface-container overflow-hidden shrink-0 border border-white/5 relative shadow-sm">
                  <img
                    src={getTrackThumb(track)}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/default-playlist.jpg'; }}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Play size={14} fill="white" className="text-white ml-0.5" />
                  </div>
                </div>

                {/* Tiêu đề & Nghệ sĩ */}
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs font-semibold text-on-surface truncate group-hover:text-primary-container transition-colors">
                    {track.title}
                  </span>
                  <div className="flex items-center gap-2 text-[10px] text-outline font-mono truncate">
                    <span className="truncate text-on-surface-variant">{track.artist || 'Anna Music'}</span>
                    {track.duration && (
                      <>
                        <span>•</span>
                        <span className="shrink-0">{track.duration}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Nút thao tác: Thêm vào hàng chờ & Bỏ thích */}
              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onOrderSong?.(track)}
                  className="w-8 h-8 rounded-lg bg-primary-container/15 text-primary-container hover:bg-primary-container hover:text-on-primary flex items-center justify-center transition-all"
                  title="Thêm vào hàng chờ"
                >
                  <Plus size={15} />
                </button>

                <button
                  onClick={(e) => handleRemoveFavorite(track, e)}
                  className="w-8 h-8 rounded-lg text-secondary hover:bg-secondary-container/20 flex items-center justify-center transition-all"
                  title="Bỏ khỏi yêu thích"
                >
                  <Heart size={15} fill="currentColor" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
