import React, { useState, useMemo } from 'react';
import { Play, Search, X, Clock } from 'lucide-react';
import { DEFAULT_TRACK_THUMB } from '../config';

function formatRelativeTime(dateString) {
  if (!dateString) return 'Gần đây';
  const date = new Date(dateString);
  if (isNaN(date)) return 'Gần đây';
  const diff = Date.now() - date;
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (mins < 1)   return 'Vừa xong';
  if (mins < 60)  return `${mins}m trước`;
  if (hrs < 24)   return `${hrs}h trước`;
  if (days === 1) return 'Hôm qua';
  if (days < 7)   return `${days}d trước`;
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

export default function HistoryTab({ player, onOrderSong }) {
  const [query, setQuery] = useState('');
  const history = player?.history || [];

  const filtered = useMemo(() => {
    if (!query.trim()) return history;
    const q = query.toLowerCase();
    return history.filter(t => `${t.title} ${t.artist}`.toLowerCase().includes(q));
  }, [history, query]);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden select-none bg-surface/40">
      {/* ── 1. HEADER & SEARCH BOX ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 shrink-0 border-b border-white/5 mb-3 gap-2 px-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-surface-container border border-white/5 flex items-center justify-center text-primary-container shadow-sm">
            <Clock size={16} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider">
                Lịch Sử Phát Nhạc
              </h2>
              <span className="font-mono text-[10px] text-outline font-semibold">
                ({history.length} BÀI)
              </span>
            </div>
            <span className="text-[10px] text-outline">
              Các bài hát đã được phát gần đây
            </span>
          </div>
        </div>

        {/* Ô tìm kiếm trong lịch sử */}
        <div className="flex items-center gap-1.5 bg-surface-container px-2.5 py-1.5 rounded-lg border border-white/5 focus-within:border-primary-container/40">
          <Search size={13} className="text-outline shrink-0" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Tìm trong lịch sử..."
            className="bg-transparent border-none text-xs text-on-surface placeholder:text-outline w-36 sm:w-48 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-outline hover:text-on-surface p-0.5 transition-colors"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── 2. DANH SÁCH BÀI ĐÃ PHÁT ────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-center gap-3 text-outline">
          <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center border border-white/5 shadow-inner">
            <Clock size={28} className="text-outline opacity-40" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-on-surface">
              {query ? 'Không tìm thấy bài hát' : 'Chưa có lịch sử phát nhạc'}
            </h3>
            <p className="text-xs text-outline mt-1 max-w-xs leading-relaxed">
              {query ? 'Hãy thử tìm bằng từ khóa khác.' : 'Các bài hát đã phát trên Discord sẽ tự động xuất hiện ở đây.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto custom-scroll pr-1 flex flex-col gap-1.5">
          <div className="flex items-center justify-between pb-1 px-1 text-[11px] text-outline font-mono">
            <span>{filtered.length} BÀI ĐÃ PHÁT</span>
            <span className="text-[10px]">NHẤP ĐỂ PHÁT LẠI</span>
          </div>

          {filtered.map((track, i) => (
            <div
              key={`${track.title}-${track.playedAt || i}`}
              className="group flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-[#181b20] border-b border-white/5 transition-colors cursor-pointer"
              onClick={() => onOrderSong?.(track)}
              data-tip={`${track.title}${track.artist && track.artist !== 'Unknown' ? ` • ${track.artist}` : ''}`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="font-mono text-[11px] text-outline w-6 text-center shrink-0">
                  #{i < 9 ? `0${i + 1}` : i + 1}
                </span>

                <div className="w-10 h-10 rounded-md bg-surface-container overflow-hidden shrink-0 border border-white/5 relative">
                  <img
                    src={track.thumbnail || DEFAULT_TRACK_THUMB}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/default-playlist.jpg'; }}
                  />
                </div>

                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs font-semibold text-on-surface truncate group-hover:text-primary transition-colors cursor-default">
                    {track.title}
                  </span>
                  <div className="flex items-center gap-2 text-[10px] text-outline font-mono truncate">
                    <span className="truncate text-on-surface-variant">
                      {track.artist && track.artist !== 'Unknown' ? track.artist : 'YouTube Music'}
                    </span>
                    <span>•</span>
                    <span className="shrink-0">{formatRelativeTime(track.playedAt)}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); onOrderSong?.(track); }}
                className="w-8 h-8 rounded-lg bg-primary-container/15 text-primary-container hover:bg-primary-container hover:text-on-primary flex items-center justify-center transition-all shrink-0 shadow-sm"
                data-tip="Phát lại bài này"
              >
                <Play size={13} fill="currentColor" className="ml-0.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
