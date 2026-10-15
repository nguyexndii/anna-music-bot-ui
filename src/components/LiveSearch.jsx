import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  X,
  Loader2,
  Play,
  Flame,
  Plus,
  Heart,
  Clock,
  Disc3,
  ListPlus,
  ListMusic,
  SlidersHorizontal,
  User
} from 'lucide-react';
import { API_BASE, DEFAULT_TRACK_THUMB } from '../config';
import FavoritesModal from './FavoritesModal';
import PlaylistDetailModal from './PlaylistDetailModal';
import AllPlaylistsModal from './AllPlaylistsModal';

// Helper nhận diện URL & Playlist
function detectUrlType(text) {
  if (!text || typeof text !== 'string') return null;
  let trimmed = text.trim();
  if ((trimmed.includes('spotify.com/') || trimmed.includes('youtube.com/') || trimmed.includes('youtu.be/') || trimmed.includes('soundcloud.com/')) && !trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    trimmed = 'https://' + trimmed;
  }
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return null;

  if (trimmed.includes('youtube.com/playlist') || (trimmed.includes('youtube.com/watch') && trimmed.includes('list='))) {
    return { type: 'youtube_playlist', label: 'YouTube Playlist', isPlaylist: true, cleanUrl: trimmed };
  }
  if (trimmed.includes('spotify.com/playlist/') || trimmed.includes('spotify.com/album/')) {
    return { type: 'spotify_playlist', label: 'Spotify Playlist / Album', isPlaylist: true, cleanUrl: trimmed };
  }
  if (trimmed.includes('spotify.com/track/')) {
    return { type: 'spotify_track', label: 'Spotify Track', isPlaylist: false, cleanUrl: trimmed };
  }
  if (trimmed.includes('soundcloud.com/') && (trimmed.includes('/sets/') || trimmed.includes('/sets'))) {
    return { type: 'soundcloud_playlist', label: 'SoundCloud Playlist', isPlaylist: true, cleanUrl: trimmed };
  }
  if (trimmed.includes('soundcloud.com/')) {
    return { type: 'soundcloud_track', label: 'SoundCloud Track', isPlaylist: false, cleanUrl: trimmed };
  }
  return { type: 'direct_url', label: 'Liên kết âm nhạc', isPlaylist: false, cleanUrl: trimmed };
}

function getPlaylistPreviewImage(url) {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (match && match[1]) {
    return `https://i.ytimg.com/vi/${match[1]}/hqdefault.jpg`;
  }
  return null;
}

function getSourceLabel(track) {
  if (!track) return 'YouTube Music';
  const u = (track.url || '').toLowerCase();
  const s = (track.source || '').toLowerCase();
  if (s === 'soundcloud' || u.includes('soundcloud.com')) return 'SoundCloud';
  if (s === 'spotify' || u.includes('spotify.com')) return 'Spotify';
  if (s === 'youtube' || u.includes('youtube.com') || u.includes('youtu.be')) return 'YouTube Music';
  return track.artist || 'YouTube Music';
}

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

export default function LiveSearch({ onOrderSong, player, guildId, token }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchMode, setSearchMode] = useState(() => localStorage.getItem('anna_search_mode') || 'official');
  const [isFavoritesModalOpen, setIsFavoritesModalOpen] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [isAllPlaylistsModalOpen, setIsAllPlaylistsModalOpen] = useState(false);
  const [playlistPreviewThumb, setPlaylistPreviewThumb] = useState(null);
  const debounceRef = useRef(null);
  const abortControllerRef = useRef(null);

  const detected = useMemo(() => detectUrlType(query), [query]);

  // Live search tự động khi người dùng gõ phím hoặc dán link (debounce 350ms)
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2 || detected?.isPlaylist) {
      if (!trimmed) {
        setResults([]);
        setLoading(false);
      }
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      executeSearch(trimmed, searchMode);
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, searchMode, detected?.isPlaylist]);

  // Lấy trước ảnh bìa cho Playlist Spotify khi người dùng dán link
  useEffect(() => {
    if (detected?.type === 'spotify_playlist' && detected.cleanUrl) {
      let cancelled = false;
      fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(detected.cleanUrl)}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (!cancelled && data?.thumbnail_url) {
            setPlaylistPreviewThumb(data.thumbnail_url);
          }
        })
        .catch(() => {});
      return () => { cancelled = true; };
    } else {
      setPlaylistPreviewThumb(null);
    }
  }, [detected?.type, detected?.cleanUrl]);

  const handleModeChange = (mode) => {
    setSearchMode(mode);
    localStorage.setItem('anna_search_mode', mode);
    if (query.trim().length >= 2) {
      executeSearch(query.trim(), mode);
    }
  };

  const executeSearch = async (searchQuery = query, mode = searchMode) => {
    const trimmed = (searchQuery || '').trim();
    if (!trimmed || trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    if (detected?.isPlaylist) {
      setResults([]);
      setLoading(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/search?q=${encodeURIComponent(trimmed)}&limit=20&mode=${mode}`,
        { signal: controller.signal }
      );
      const data = await res.json();
      setLoading(false);
      if (data.success && data.results) {
        setResults(data.results);
      } else {
        setResults([]);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setLoading(false);
      }
    }
  };

  const handleOrderTrack = (track) => {
    onOrderSong(track);
  };

  const handleAddPlaylistUrl = (pl) => {
    if (typeof pl === 'string') {
      const clean = detected?.cleanUrl || pl;
      onOrderSong({ url: clean, title: 'Danh Sách Phát', isPlaylist: true });
    } else if (pl && typeof pl === 'object') {
      onOrderSong({
        url: pl.url || detected?.cleanUrl || query.trim(),
        title: pl.title || pl.name || 'Danh Sách Phát',
        itemCount: pl.itemCount || pl.trackCount || pl.tracksCount,
        isPlaylist: true
      });
    }
    setQuery('');
    setResults([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && query.trim()) {
      e.preventDefault();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (detected?.isPlaylist) {
        handleAddPlaylistUrl(detected.cleanUrl || query.trim());
      } else if (detected?.cleanUrl || query.trim().startsWith('http')) {
        handleOrderTrack({ url: detected?.cleanUrl || query.trim() });
        setQuery('');
        setResults([]);
      } else {
        executeSearch(query.trim(), searchMode);
      }
    }
  };

  const handleClear = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setQuery('');
    setResults([]);
    setLoading(false);
  };

  const favorites = player?.favorites || [];
  const history = player?.history || [];
  const topTracks = player?.topTracks || [];
  const recentPlaylists = player?.recentPlaylists || [];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* ── Command Bar Search Input ──────────────────────── */}
      <div className="relative flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#121215] border border-white/[0.08] focus-within:border-orange-500/50 focus-within:bg-[#151519] transition-all mb-4">
        <button
          type="button"
          onClick={() => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            executeSearch(query.trim(), searchMode);
          }}
          className="text-zinc-400 hover:text-zinc-200 p-0 flex items-center justify-center transition-colors"
          title="Tìm kiếm bài hát"
        >
          {loading ? <Loader2 size={16} className="animate-spin text-orange-500" /> : <Search size={16} />}
        </button>

        <input
          type="text"
          value={query}
          onChange={(e) => {
            const val = e.target.value;
            setQuery(val);
            if (!val.trim()) {
              setResults([]);
              setLoading(false);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder="Tìm bài hát, ca sĩ, dán link YouTube / Spotify..."
          autoFocus
          className="flex-1 bg-transparent border-0 outline-none text-zinc-100 placeholder:text-zinc-500 text-xs sm:text-sm font-normal min-w-0"
        />

        {/* Nâng Cao Toggle Pill */}
        <button
          type="button"
          onClick={() => handleModeChange(searchMode === 'all' ? 'official' : 'all')}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-mono tracking-wider transition-colors flex-shrink-0 ${
            searchMode === 'all'
              ? 'bg-orange-500/10 text-orange-400 border border-orange-500/25 font-bold'
              : 'bg-[#18181B] text-zinc-400 hover:text-zinc-200 border border-white/[0.06]'
          }`}
          title={searchMode === 'all' ? 'Đang bật tìm kiếm nâng cao (Mở rộng Remix, Cover, Live...)' : 'Bật tìm kiếm nâng cao (Mở rộng Remix, Cover, Live...)'}
        >
          <SlidersHorizontal size={11} />
          <span>NÂNG CAO</span>
        </button>

        {query ? (
          <button
            type="button"
            onClick={handleClear}
            className="text-zinc-400 hover:text-zinc-100 p-1 rounded-md transition-colors"
            aria-label="Xóa tìm kiếm"
          >
            <X size={15} />
          </button>
        ) : (
          <span className="hidden sm:inline-block font-mono text-[9px] text-zinc-500 bg-[#18181B] px-1.5 py-0.5 rounded border border-white/[0.06]">
            ENTER
          </span>
        )}
      </div>

      {/* ── Playlist Detection Banner ─────────────────────── */}
      {detected?.isPlaylist && (
        <div className="flex items-center justify-between gap-3 p-3.5 mb-4 rounded-xl bg-[#141417] border border-orange-500/25 shadow-lg">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#18181B] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
              {playlistPreviewThumb ? (
                <img src={playlistPreviewThumb} alt="Playlist" className="w-full h-full object-cover" onError={() => setPlaylistPreviewThumb(null)} />
              ) : getPlaylistPreviewImage(query) ? (
                <img src={getPlaylistPreviewImage(query)} alt="Playlist" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              ) : (
                <Disc3 size={18} className="text-orange-500" />
              )}
            </div>
            <div className="min-w-0">
              <span className="font-mono text-[10px] font-bold text-orange-400 tracking-wider uppercase">
                {detected.label}
              </span>
              <p className="text-xs text-zinc-400 truncate max-w-sm m-0">
                {query}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleAddPlaylistUrl(detected?.cleanUrl || query.trim())}
            className="h-8 px-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-zinc-950 font-bold text-xs flex items-center gap-1.5 flex-shrink-0 transition-colors shadow-sm"
          >
            <ListPlus size={14} />
            <span>Thêm Playlist</span>
          </button>
        </div>
      )}

      {/* ── Main Scroll Area ──────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-1">
        
        {/* Loading Spinner */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-14 gap-2 text-zinc-400">
            <Loader2 size={22} className="animate-spin text-orange-500" />
            <span className="font-mono text-[10px] tracking-widest text-zinc-500">ĐANG TÌM KIẾM...</span>
          </div>
        )}

        {/* 1. Results List when Query is Typed */}
        {query.trim() && !detected?.isPlaylist && !loading && (
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-2 px-1">
              <span>KẾT QUẢ TÌM KIẾM ({results.length})</span>
              <span className="text-[10px] text-zinc-500">BẤM ĐỂ PHÁT</span>
            </div>

            {results.length === 0 ? (
              <div className="py-14 px-4 text-center text-zinc-400">
                <p className="font-medium text-zinc-200 text-sm mb-1.5">Không tìm thấy bài hát</p>
                <p className="text-xs text-zinc-500">Hãy thử tìm với từ khóa khác hoặc dán link YouTube/Spotify nhé.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {results.map((song, i) => {
                  const isPlaylist = song.isPlaylist || song.type === 'playlist';
                  return (
                    <div
                      key={song.id || song.url || i}
                      onClick={() => handleOrderTrack(song)}
                      className="group flex items-center gap-3 p-2 rounded-lg hover:bg-[#161619] border border-transparent hover:border-white/[0.05] cursor-pointer transition-colors"
                    >
                      <div className="w-10 h-10 rounded-md overflow-hidden bg-[#18181B] flex-shrink-0 relative border border-white/[0.06]">
                        <img src={getTrackThumb(song)} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = DEFAULT_TRACK_THUMB; }} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-zinc-200 group-hover:text-white truncate" title={song.title}>
                            {song.title}
                          </span>
                          {isPlaylist && (
                            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 font-semibold flex-shrink-0">
                              PLAYLIST
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-zinc-400 truncate block mt-0.5" title={song.artist}>
                          {song.artist && song.artist !== 'Unknown' ? song.artist : getSourceLabel(song)}
                          {song.itemCount ? ` • ${song.itemCount} bài` : ''}
                        </span>
                      </div>

                      <span className="font-mono text-[11px] text-zinc-500 tabular-nums px-2">
                        {song.duration || ''}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleOrderTrack(song); }}
                        className="w-8 h-8 rounded-lg border border-white/[0.06] bg-[#18181B] hover:bg-[#222226] text-zinc-300 hover:text-white flex items-center justify-center flex-shrink-0 transition-colors"
                        title="Thêm vào hàng chờ"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 2. Default Discover Landing when Query is Empty */}
        {!query.trim() && (
          <div className="flex flex-col gap-6">
            
            {/* Recently Played */}
            {history.length > 0 && (
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-2 px-1">
                  NGHE GẦN ĐÂY
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 pt-1 no-scrollbar">
                  {history.slice(0, 8).map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleOrderTrack(item)}
                      className="w-32 flex-shrink-0 p-2.5 rounded-xl bg-[#141417] hover:bg-[#18181C] border border-white/[0.06] hover:border-white/[0.12] cursor-pointer transition-all"
                    >
                      <div className="w-full aspect-square rounded-lg overflow-hidden bg-[#18181B] mb-2 border border-white/[0.06]">
                        <img src={getTrackThumb(item)} alt="" onError={(e) => { e.currentTarget.src = DEFAULT_TRACK_THUMB; }} className="w-full h-full object-cover" />
                      </div>
                      <p title={item.title} className="text-xs font-medium text-zinc-200 truncate m-0 mb-0.5">
                        {item.title}
                      </p>
                      <p title={item.artist} className="text-[11px] text-zinc-500 truncate m-0">
                        {item.artist && item.artist !== 'Unknown' ? item.artist : getSourceLabel(item)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Playlists Gần Đây */}
            {recentPlaylists.length > 0 && (
              <div>
                <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-2 px-1">
                  <div className="flex items-center gap-1.5">
                    <span>DANH SÁCH PHÁT GẦN ĐÂY</span>
                    <ListMusic size={12} className="text-orange-500" />
                  </div>
                  {recentPlaylists.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsAllPlaylistsModalOpen(true)}
                      className="text-orange-400 hover:text-orange-300 font-mono text-[10px] tracking-wider transition-colors"
                    >
                      Xem tất cả ({recentPlaylists.length}) →
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {recentPlaylists.slice(0, 6).map((pl, idx) => {
                    const thumb = pl.thumbnail || getPlaylistPreviewImage(pl.url) || pl.firstTrackThumb;
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setSelectedPlaylist(pl);
                          setIsPlaylistModalOpen(true);
                        }}
                        className="flex items-center gap-3 p-2.5 rounded-xl bg-[#141417] hover:bg-[#18181C] border border-white/[0.06] hover:border-white/[0.12] cursor-pointer transition-all"
                      >
                        <div className="w-11 h-11 rounded-lg overflow-hidden bg-[#18181B] flex items-center justify-center flex-shrink-0 border border-white/[0.06]">
                          {thumb ? (
                            <img src={thumb} alt="" onError={(e) => { e.currentTarget.src = DEFAULT_TRACK_THUMB; }} className="w-full h-full object-cover" />
                          ) : (
                            <ListMusic size={18} className="text-orange-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p title={pl.title || pl.name} className="text-xs font-medium text-zinc-200 truncate m-0">
                            {pl.title || pl.name || 'Danh Sách Phát'}
                          </p>
                          <div className="flex items-center justify-between gap-2 mt-1">
                            <span className="font-mono text-[10px] text-zinc-500">
                              {pl.trackCount || pl.itemCount ? `${pl.trackCount || pl.itemCount} BÀI` : 'PLAYLIST'}
                            </span>
                            {pl.addedBy && (
                              <div className="flex items-center gap-1 text-[10px] text-zinc-400 bg-[#18181B] px-1.5 py-0.5 rounded border border-white/[0.04]">
                                {pl.addedByAvatar ? (
                                  <img src={pl.addedByAvatar} alt="" className="w-3 h-3 rounded-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                ) : (
                                  <User size={10} className="text-zinc-500" />
                                )}
                                <span className="truncate max-w-[70px]">@{pl.addedBy}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bài Hát Yêu Thích */}
            {favorites.length > 0 && (
              <div>
                <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-2 px-1">
                  <div className="flex items-center gap-1.5">
                    <span>YÊU THÍCH ({favorites.length})</span>
                    <Heart size={12} className="text-orange-500" fill="currentColor" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsFavoritesModalOpen(true)}
                    className="text-orange-400 hover:text-orange-300 font-mono text-[10px] tracking-wider transition-colors"
                  >
                    Xem tất cả →
                  </button>
                </div>

                <div className="flex flex-col gap-1">
                  {favorites.slice(0, 4).map((fav, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleOrderTrack(fav)}
                      className="group flex items-center gap-3 p-2 rounded-lg hover:bg-[#161619] border border-transparent hover:border-white/[0.05] cursor-pointer transition-colors"
                    >
                      <div className="w-9 h-9 rounded-md overflow-hidden bg-[#18181B] flex-shrink-0 border border-white/[0.06]">
                        <img src={getTrackThumb(fav)} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = DEFAULT_TRACK_THUMB; }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-zinc-200 group-hover:text-white truncate block" title={fav.title}>
                          {fav.title}
                        </span>
                        <span className="text-[11px] text-zinc-500 truncate block mt-0.5" title={fav.artist}>
                          {fav.artist || 'YouTube'}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-zinc-500 tabular-nums px-2">
                        {fav.duration || ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Phổ Biến Trong Máy Chủ (Top Tracks) */}
            {topTracks.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-2 px-1">
                  <span>PHỔ BIẾN TRONG MÁY CHỦ</span>
                  <Flame size={12} className="text-orange-500" />
                </div>

                <div className="flex flex-col gap-1">
                  {topTracks.slice(0, 6).map((top, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleOrderTrack(top)}
                      className="group flex items-center gap-3 p-2 rounded-lg hover:bg-[#161619] border border-transparent hover:border-white/[0.05] cursor-pointer transition-colors"
                    >
                      <span className="font-mono text-xs font-semibold text-zinc-500 w-5 text-center">
                        {idx + 1}
                      </span>
                      <div className="w-9 h-9 rounded-md overflow-hidden bg-[#18181B] flex-shrink-0 border border-white/[0.06]">
                        <img src={getTrackThumb(top)} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = DEFAULT_TRACK_THUMB; }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-zinc-200 group-hover:text-white truncate block" title={top.title}>
                          {top.title}
                        </span>
                        <span className="text-[11px] text-zinc-500 truncate block mt-0.5" title={top.artist}>
                          {top.playCount ? `Đã phát ${top.playCount} lần` : (top.artist || '')}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-zinc-500 tabular-nums px-2">
                        {top.duration || ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

      </div>

      {/* ── Modals ────────────────────────────────────────── */}
      <FavoritesModal
        isOpen={isFavoritesModalOpen}
        onClose={() => setIsFavoritesModalOpen(false)}
        favorites={favorites}
        onOrderSong={handleOrderTrack}
      />

      <PlaylistDetailModal
        isOpen={isPlaylistModalOpen}
        onClose={() => {
          setIsPlaylistModalOpen(false);
          setSelectedPlaylist(null);
        }}
        playlist={selectedPlaylist}
        guildId={guildId || player?.guildId}
        token={token}
        onOrderSong={handleOrderTrack}
      />

      <AllPlaylistsModal
        isOpen={isAllPlaylistsModalOpen}
        onClose={() => setIsAllPlaylistsModalOpen(false)}
        playlists={recentPlaylists}
        onSelectPlaylist={(pl) => {
          setIsAllPlaylistsModalOpen(false);
          setSelectedPlaylist(pl);
          setIsPlaylistModalOpen(true);
        }}
      />
    </div>
  );
}
