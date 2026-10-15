import React, { useState, useMemo } from 'react';
import { Play, Search, X, History as HistoryIcon } from 'lucide-react';
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
  if (mins < 60)  return `${mins} phút trước`;
  if (hrs < 24)   return `${hrs} giờ trước`;
  if (days === 1) return 'Hôm qua';
  if (days < 7)   return `${days} ngày trước`;
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
    <div className="flex flex-col flex-1 min-h-0">
      {/* Search box */}
      <div className="relative flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#121215] border border-white/[0.08] focus-within:border-primary-container/50 transition-all mb-3.5">
        <Search size={15} className="text-outline flex-shrink-0" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Tìm trong lịch sử phát nhạc..."
          className="flex-1 bg-transparent border-0 outline-none text-xs sm:text-sm text-on-surface placeholder:text-outline min-w-0"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="text-outline hover:text-on-surface p-0 flex items-center"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-16 px-4 text-center text-outline">
          <HistoryIcon size={32} className="mx-auto mb-3 opacity-40 text-on-surface-variant" />
          <p className="font-semibold text-on-surface text-sm mb-1">
            {query ? 'Không tìm thấy bài hát' : 'Chưa có lịch sử phát nhạc'}
          </p>
          <p className="text-xs text-outline m-0 max-w-xs">
            {query ? 'Hãy thử tìm bằng từ khóa khác.' : 'Các bài hát đã phát trên Discord sẽ tự động xuất hiện ở đây để nghe lại.'}
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto min-h-0 pr-1">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-on-surface-variant mb-2 px-1">
            <span>{filtered.length} BÀI ĐÃ PHÁT</span>
            <span className="text-[10px] text-outline">BẤM ĐỂ PHÁT LẠI</span>
          </div>

          <div className="flex flex-col gap-1">
            {filtered.map((track, i) => (
              <div
                key={`${track.title}-${track.playedAt || i}`}
                onClick={() => onOrderSong?.(track)}
                className="group flex items-center gap-3 p-2 rounded-xl bg-surface-container-low hover:bg-surface-container border border-white/[0.05] hover:border-white/[0.09] cursor-pointer transition-all"
              >
                <div className="w-9 h-9 rounded-md overflow-hidden bg-surface-container border border-white/[0.06] flex-shrink-0 flex items-center justify-center">
                  {track.thumbnail ? (
                    <img src={track.thumbnail} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = DEFAULT_TRACK_THUMB; }} />
                  ) : (
                    <span className="font-mono text-[10px] text-outline">{i + 1}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-xs font-medium text-on-surface group-hover:text-white truncate m-0" title={track.title}>
                    {track.title}
                  </p>
                  <p className="text-[11px] text-outline truncate m-0 mt-0.5" title={track.artist}>
                    {track.artist && track.artist !== 'Unknown' ? track.artist : 'YouTube Music'}
                  </p>
                </div>

                <span className="font-mono text-[10px] text-outline tabular-nums px-2 flex-shrink-0">
                  {formatRelativeTime(track.playedAt)}
                </span>

                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onOrderSong?.(track); }}
                  className="w-7 h-7 rounded-lg border border-white/[0.06] bg-surface-container hover:bg-[#222226] text-on-surface hover:text-white flex items-center justify-center flex-shrink-0 transition-colors"
                  title="Phát lại bài này"
                >
                  <Play size={12} fill="currentColor" className="ml-0.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
