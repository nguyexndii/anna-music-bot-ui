import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { X, Play, Plus, ListPlus, Loader2, Music, Search, Check } from 'lucide-react';
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
  onOrderSong
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

    // Nếu playlist object đã có sẵn tracks
    if (Array.isArray(playlist.tracks) && playlist.tracks.length > 0) {
      setTracks(playlist.tracks);
      setLoading(false);
      return;
    }

    // Ngược lại fetch từ API
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
      itemCount: tracks.length || playlist.trackCount || playlist.itemCount
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
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-2xl max-h-[88vh] rounded-xl bg-[#13161b] border border-[#22262e] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-4 sm:px-5 sm:py-4 border-b border-[#22262e] flex items-center justify-between shrink-0 bg-white/[0.015] gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 bg-[#181b20] border border-white/5 flex items-center justify-center">
              {thumb ? (
                <img
                  src={thumb}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/default-playlist.jpg'; }}
                />
              ) : (
                <Music size={18} className="text-[#e8c977]" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-[#eceae4] tracking-tight truncate" title={displayTitle}>
                  {displayTitle}
                </h3>
                {totalCount > 0 && (
                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#e8c977]/15 text-[#e8c977] border border-[#e8c977]/25 shrink-0">
                    {totalCount} BÀI
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-[11px] text-[#848992] font-mono">
                  Nhấn bài để thêm lẻ, hoặc phát toàn bộ
                </span>
                {playlist?.addedBy && (
                  <span className="inline-flex items-center gap-1.5 text-[10px] text-[#848992] bg-white/[0.04] px-1.5 py-0.5 rounded border border-[#22262e]">
                    {playlist.addedByAvatar && (
                      <img
                        src={playlist.addedByAvatar}
                        alt=""
                        className="w-3.5 h-3.5 rounded-full object-cover"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    )}
                    <span>Thêm bởi: <strong className="text-[#eceae4]">@{playlist.addedBy}</strong></span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handlePlayAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e8c977]/30 bg-[#e8c977]/15 hover:bg-[#e8c977]/25 text-[#e8c977] text-xs font-semibold transition-colors"
              title="Thêm toàn bộ bài hát trong danh sách vào hàng chờ"
            >
              <ListPlus size={14} />
              <span className="hidden sm:inline">Phát cả bộ</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg border border-[#22262e] bg-[#181b20] hover:bg-[#22262e] text-[#848992] hover:text-[#eceae4] flex items-center justify-center transition-colors"
              aria-label="Đóng"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Search inside playlist */}
        {tracks.length > 5 && (
          <div className="px-5 py-2 border-b border-[#22262e] bg-black/20 flex items-center gap-2">
            <Search size={13} className="text-[#848992] shrink-0" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder={`Lọc trong ${tracks.length} bài hát...`}
              className="flex-1 bg-transparent border-none text-xs text-[#eceae4] placeholder:text-[#848992] focus:outline-none"
            />
            {filterQuery && (
              <button
                onClick={() => setFilterQuery('')}
                className="text-[#848992] hover:text-[#eceae4] p-0.5"
              >
                <X size={13} />
              </button>
            )}
          </div>
        )}

        {/* Body: Tracks List */}
        <div className="p-4 overflow-y-auto custom-scroll flex-1 flex flex-col gap-1.5 max-h-[60vh]">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-[#848992] gap-3">
              <Loader2 size={24} className="animate-spin text-[#e8c977]" />
              <span className="text-xs">Đang tải danh sách bài hát từ playlist...</span>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-center gap-3">
              <p className="text-xs text-[#ef7864]">{error}</p>
              <button
                onClick={handlePlayAll}
                className="px-4 py-2 rounded-lg bg-[#e8c977] hover:bg-[#d6b561] text-[#111316] text-xs font-bold transition-colors"
              >
                Phát toàn bộ bằng liên kết
              </button>
            </div>
          ) : tracks.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-[#848992] text-xs">
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
                      {song.artist || 'YouTube'}
                    </p>
                  </div>

                  {song.duration && (
                    <span className="font-mono text-[10px] text-[#848992] shrink-0">
                      {song.duration}
                    </span>
                  )}

                  <button
                    onClick={(e) => handleAddSingleTrack(song, e)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all shrink-0 ${
                      isAdded
                        ? 'bg-[#4ade80]/15 border border-[#4ade80]/30 text-[#4ade80]'
                        : 'bg-[#e8c977]/10 border border-[#e8c977]/20 text-[#e8c977] group-hover:bg-[#e8c977] group-hover:text-[#111316]'
                    }`}
                    title={isAdded ? 'Đã thêm' : 'Thêm vào hàng chờ'}
                  >
                    {isAdded ? <Check size={13} /> : <Plus size={13} />}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {!loading && tracks.length > 0 && (
          <div className="px-5 py-2.5 border-t border-[#22262e] flex items-center justify-between shrink-0 bg-white/[0.01] font-mono text-[10px] text-[#848992]">
            <span>
              {filterQuery ? `Tìm thấy ${filteredTracks.length} / ${tracks.length} bài hát` : `Danh sách ${tracks.length} bài hát • Cuộn để xem tất cả`}
            </span>

            <button
              onClick={handlePlayAll}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#e8c977]/30 bg-[#e8c977]/10 hover:bg-[#e8c977]/20 text-[#e8c977] text-[10px] font-semibold transition-colors"
            >
              <ListPlus size={12} />
              <span>Phát cả bộ</span>
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
