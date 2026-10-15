import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { X, ListPlus, Loader2, Music, Search, Check, Plus } from 'lucide-react';
import { API_BASE, DEFAULT_TRACK_THUMB, DEFAULT_PLAYLIST_THUMB } from '../config';

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

export default function PlaylistDetailModal({
  isOpen,
  onClose,
  playlist,
  guildId,
  token,
  onOrderSong,
}) {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [addedTracks, setAddedTracks] = useState(new Set());

  // Fetch / load playlist tracks
  useEffect(() => {
    if (!isOpen || !playlist) return;

    setFilterQuery('');
    setError(null);
    setAddedTracks(new Set());

    if (Array.isArray(playlist.tracks) && playlist.tracks.length > 0) {
      setTracks(playlist.tracks);
      setLoading(false);
      return;
    }

    if (playlist.url && guildId) {
      let isMounted = true;
      setLoading(true);

      const targetUrl = `${API_BASE}/api/guilds/${guildId}/playlist-info?url=${encodeURIComponent(playlist.url)}`;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      fetch(targetUrl, { headers })
        .then((res) => res.json())
        .then((data) => {
          if (!isMounted) return;
          if (data.success && data.playlist?.tracks) {
            setTracks(data.playlist.tracks);
          } else {
            setError(data.error || 'Không thể tải chi tiết danh sách phát');
          }
        })
        .catch((err) => {
          if (!isMounted) return;
          console.error('[PlaylistDetailModal Error]:', err);
          setError('Lỗi kết nối máy chủ khi tải danh sách phát');
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [isOpen, playlist, guildId, token]);

  // Handle ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filtered tracks
  const filteredTracks = useMemo(() => {
    if (!filterQuery.trim()) return tracks;
    const q = filterQuery.trim().toLowerCase();
    return tracks.filter(
      (t) =>
        (t.title && t.title.toLowerCase().includes(q)) ||
        (t.artist && t.artist.toLowerCase().includes(q))
    );
  }, [tracks, filterQuery]);

  // Actions
  const handlePlayAll = () => {
    if (!playlist) return;
    onOrderSong?.({
      url: playlist.url,
      title: playlist.title || playlist.name || 'Danh Sách Phát',
      isPlaylist: true,
      itemCount: tracks.length || playlist.trackCount || playlist.itemCount,
    });
    onClose?.();
  };

  const handleAddSingleTrack = (track, e) => {
    e?.stopPropagation();
    if (!track) return;
    const key = track.url || track.title;
    setAddedTracks((prev) => new Set([...prev, key]));
    onOrderSong?.(track);
  };

  if (!isOpen || !playlist) return null;

  const displayTitle = playlist.title || playlist.name || 'Danh Sách Phát';
  const totalCount = tracks.length || playlist.trackCount || playlist.itemCount || 0;
  const thumb = playlist.thumbnail || (tracks[0] && getTrackThumb(tracks[0])) || DEFAULT_PLAYLIST_THUMB;

  return ReactDOM.createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-2xl max-h-[86vh] rounded-2xl bg-[#141417] border border-white/[0.08] shadow-2xl shadow-black/80 flex flex-col overflow-hidden text-zinc-100"
        style={{
          fontFamily: "'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-white/[0.07] flex items-center justify-between flex-shrink-0 bg-[#111113] gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-900 border border-white/[0.08] relative">
              {thumb ? (
                <img src={thumb} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-cyan-400">
                  <Music className="w-5 h-5" />
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3
                  className="text-sm sm:text-base font-bold text-zinc-100 truncate"
                  title={displayTitle}
                >
                  {displayTitle}
                </h3>
                {totalCount > 0 && (
                  <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex-shrink-0">
                    {totalCount} BÀI
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-400 truncate">
                <span className="truncate">Nhấn để thêm lẻ, hoặc phát toàn bộ</span>
                {playlist?.addedBy && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-zinc-400 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">
                    @{playlist.addedBy}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handlePlayAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-semibold shadow-md transition"
              title="Thêm toàn bộ bài hát trong danh sách vào hàng chờ"
            >
              <ListPlus className="w-4 h-4" />
              <span>Phát cả bộ</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg border border-white/[0.07] bg-[#18181C] hover:bg-[#222228] text-zinc-400 hover:text-zinc-100 flex items-center justify-center transition"
              aria-label="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search inside playlist */}
        {tracks.length > 5 && (
          <div className="px-5 py-2.5 border-b border-white/[0.07] bg-[#111113]/60 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder={`Lọc trong ${tracks.length} bài hát...`}
              className="flex-1 bg-transparent border-none outline-none text-xs text-zinc-100 placeholder:text-zinc-500"
            />
            {filterQuery && (
              <button
                onClick={() => setFilterQuery('')}
                className="text-zinc-500 hover:text-zinc-300 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Tracks List */}
        <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-1.5 max-h-[62vh]">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-zinc-400 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
              <span className="text-xs">Đang tải danh sách bài hát từ playlist...</span>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center gap-3">
              <p className="text-xs text-rose-400">{error}</p>
              <button
                onClick={handlePlayAll}
                className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-semibold"
              >
                Phát toàn bộ bằng liên kết
              </button>
            </div>
          ) : tracks.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-12 text-zinc-500 text-xs">
              Không tìm thấy bài hát nào trong playlist.
            </div>
          ) : (
            filteredTracks.map((song, idx) => {
              const globalIndex = idx + 1;
              const isAdded = addedTracks.has(song.url || song.title);

              return (
                <div
                  key={song.url || idx}
                  onClick={(e) => handleAddSingleTrack(song, e)}
                  className="flex items-center gap-3 p-2 rounded-xl bg-[#16161A] hover:bg-[#1C1C22] border border-white/[0.04] hover:border-cyan-500/30 cursor-pointer transition-all duration-150 group"
                  title="Nhấn để thêm bài này vào hàng chờ"
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

                  <button
                    onClick={(e) => handleAddSingleTrack(song, e)}
                    className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 transition ${
                      isAdded
                        ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                        : 'bg-[#1F1F24] border border-white/[0.08] text-zinc-400 hover:text-cyan-400 hover:border-cyan-500/40'
                    }`}
                    title={isAdded ? 'Đã thêm' : 'Thêm vào hàng chờ'}
                  >
                    {isAdded ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {!loading && tracks.length > 0 && (
          <div className="px-5 py-2.5 border-t border-white/[0.07] flex items-center justify-between flex-shrink-0 bg-[#111113]">
            <span className="font-mono text-xs text-zinc-400">
              {filterQuery
                ? `Tìm thấy ${filteredTracks.length} / ${tracks.length} bài hát`
                : `${tracks.length} bài hát · Cuộn để xem tất cả`}
            </span>

            <button
              onClick={handlePlayAll}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/25 text-xs font-medium transition"
            >
              <ListPlus className="w-3.5 h-3.5" />
              <span>Phát cả bộ</span>
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
