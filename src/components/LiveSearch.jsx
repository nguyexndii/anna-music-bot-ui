import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  X,
  Loader2,
  Play,
  Plus,
  Heart,
  Disc3,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ListMusic
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

export default function LiveSearch({ onOrderSong, player, guildId, token, externalQuery, onQueryChange }) {
  const [query, setQuery] = useState(externalQuery || '');
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
  const recentScrollRef = useRef(null);

  // Đồng bộ với externalQuery từ Top Header nếu có
  useEffect(() => {
    if (externalQuery !== undefined && externalQuery !== query) {
      setQuery(externalQuery);
    }
  }, [externalQuery]);

  const detected = useMemo(() => detectUrlType(query), [query]);

  // Live search tự động khi người dùng gõ phím
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
    onQueryChange?.('');
    setResults([]);
    setLoading(false);
  };

  const favorites = player?.favorites || [];
  const history = player?.history || [];
  const topTracks = player?.topTracks || [];
  const recentPlaylists = player?.recentPlaylists || [];

  const handleWheelHorizontal = (e) => {
    if (e.deltaY !== 0) {
      e.currentTarget.scrollLeft += e.deltaY;
    }
  };

  const favoritesScrollRef = useRef(null);
  const topTracksScrollRef = useRef(null);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

      {/* ── 1. BANNER PHÁT HIỆN LINK PLAYLIST (Nếu có) ────────────────────── */}
      {detected?.isPlaylist && (
        <div className="bg-surface-container-low rounded-xl border border-primary-container/40 p-3 flex items-center justify-between gap-3 shrink-0 mb-3 shadow-lg">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-lg bg-surface-container-highest overflow-hidden shrink-0 border border-white/5 relative">
              <img
                src={playlistPreviewThumb || '/default-playlist.jpg'}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/default-playlist.jpg'; }}
              />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-bold text-primary-container uppercase tracking-wider">
                  PHÁT HIỆN {detected.label}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
              </div>
              <p className="text-xs text-on-surface font-semibold truncate mt-0.5">
                {detected.cleanUrl}
              </p>
              <span className="text-[10px] text-outline">
                Nhấn Thêm Hàng Chờ để bot nạp toàn bộ danh sách phát.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleAddPlaylistUrl(detected.cleanUrl)}
              className="px-3 py-1.5 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-bold text-xs flex items-center gap-1.5 transition-all shadow"
            >
              <Plus size={15} />
              <span>Thêm Hàng Chờ</span>
            </button>
            <button
              onClick={handleClear}
              className="px-2 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-outline hover:text-on-surface text-xs transition-colors"
            >
              Bỏ qua
            </button>
          </div>
        </div>
      )}

      {/* ── 2. VÙNG HIỂN THỊ CHÍNH (Kết quả tìm kiếm HOẶC Khám Phá Stitch) ─── */}
      <div className="flex-1 overflow-y-auto custom-scroll min-h-0 pr-1 flex flex-col gap-3">

        {/* ── 2A. NẾU ĐANG TÌM KIẾM TỪ TOP HEADER ──────────────────────────── */}
        {query.trim().length >= 2 && !detected?.isPlaylist ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between pb-1 text-xs text-outline font-mono">
              <span>KẾT QUẢ TÌM KIẾM CHO "{query}"</span>
              <span>{results.length} BÀI HÁT</span>
            </div>

            {loading && results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-outline gap-2">
                <Loader2 size={24} className="animate-spin text-primary-container" />
                <span className="text-xs">Đang tìm kiếm bài hát...</span>
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-12 text-outline text-xs">
                Không tìm thấy bài hát nào phù hợp. Hãy thử từ khóa khác!
              </div>
            ) : (
              results.map((track, i) => (
                <div
                  key={track.url || i}
                  className="flex items-center justify-between gap-3 p-2 rounded-xl bg-surface-container-low hover:bg-surface-container border border-white/5 transition-colors group cursor-pointer"
                  onClick={() => handleOrderTrack(track)}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-surface-container overflow-hidden shrink-0 border border-white/5 relative">
                      <img
                        src={getTrackThumb(track)}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/default-playlist.jpg'; }}
                      />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-xs font-semibold text-on-surface truncate group-hover:text-primary transition-colors">
                        {track.title}
                      </span>
                      <div className="flex items-center gap-2 text-[10px] text-outline font-mono truncate">
                        <span className="truncate text-on-surface-variant">{track.artist || 'YouTube Music'}</span>
                        <span>•</span>
                        <span>{track.duration || '0:00'}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOrderTrack(track);
                    }}
                    className="w-7 h-7 rounded-lg bg-primary-container/20 text-primary-container hover:bg-primary-container hover:text-on-primary flex items-center justify-center transition-all shrink-0"
                    title="Thêm vào hàng chờ"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        ) : (
          /* ── 2B. MÀN HÌNH KHÁM PHÁ CHUẨN STITCH (Khi ô search trống) ──────── */
          <div className="flex flex-col gap-3 min-h-0">

            {/* HÀNG 1: NGHE GẦN ĐÂY (Hàng ngang + Scroll chuột ngang) */}
            {history.length > 0 && (
              <div className="bg-surface-container-low rounded-xl border border-white/5 p-3 flex flex-col gap-2 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-on-surface uppercase tracking-wider">
                      NGHE GẦN ĐÂY
                    </span>
                    <span className="font-mono text-[10px] text-outline">
                      / {history.length} BẢN GHI
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => recentScrollRef.current?.scrollBy({ left: -220, behavior: 'smooth' })}
                      className="w-6 h-6 rounded bg-surface-container hover:bg-surface-container-high text-outline hover:text-on-surface flex items-center justify-center transition-colors"
                      title="Cuộn sang trái"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => recentScrollRef.current?.scrollBy({ left: 220, behavior: 'smooth' })}
                      className="w-6 h-6 rounded bg-surface-container hover:bg-surface-container-high text-outline hover:text-on-surface flex items-center justify-center transition-colors"
                      title="Cuộn sang phải"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                <div
                  ref={recentScrollRef}
                  onWheel={handleWheelHorizontal}
                  className="flex gap-2.5 overflow-x-auto scrollbar-none py-1"
                >
                  {history.slice(0, 16).map((track, idx) => (
                    <div
                      key={track.url || idx}
                      onClick={() => handleOrderTrack(track)}
                      className="w-32 shrink-0 group cursor-pointer flex flex-col"
                    >
                      <div className="w-32 h-20 rounded-xl bg-surface-container overflow-hidden relative border border-white/5 shadow-sm shrink-0">
                        <img
                          src={getTrackThumb(track)}
                          alt=""
                          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/default-playlist.jpg'; }}
                        />
                        <div className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-primary-container text-on-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow">
                          <Play size={12} fill="currentColor" className="ml-0.5" />
                        </div>
                        {track.duration && (
                          <span className="absolute bottom-1 left-1 text-[9px] font-mono px-1 rounded bg-black/70 text-outline">
                            {track.duration}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-semibold text-on-surface truncate mt-1.5 group-hover:text-primary transition-colors block w-full leading-tight">
                        {track.title}
                      </div>
                      <div className="text-[10px] text-outline font-mono truncate block w-full leading-tight mt-0.5">
                        {track.artist || 'Anna Music'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* HÀNG 2: PHỔ BIẾN TRONG MÁY CHỦ / TOP TUẦN (Hàng ngang + Scroll chuột ngang) */}
            {topTracks.length > 0 && (
              <div className="bg-surface-container-low rounded-xl border border-white/5 p-3 flex flex-col gap-2 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[15px] text-primary-container">trending_up</span>
                    <span className="text-xs font-bold text-on-surface uppercase tracking-wider">
                      PHỔ BIẾN TRONG MÁY CHỦ
                    </span>
                    <span className="font-mono text-[9px] text-primary-container font-semibold">
                      TOP TUẦN
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => topTracksScrollRef.current?.scrollBy({ left: -220, behavior: 'smooth' })}
                      className="w-6 h-6 rounded bg-surface-container hover:bg-surface-container-high text-outline hover:text-on-surface flex items-center justify-center transition-colors"
                      title="Cuộn sang trái"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => topTracksScrollRef.current?.scrollBy({ left: 220, behavior: 'smooth' })}
                      className="w-6 h-6 rounded bg-surface-container hover:bg-surface-container-high text-outline hover:text-on-surface flex items-center justify-center transition-colors"
                      title="Cuộn sang phải"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                <div
                  ref={topTracksScrollRef}
                  onWheel={handleWheelHorizontal}
                  className="flex gap-2.5 overflow-x-auto scrollbar-none py-1"
                >
                  {topTracks.slice(0, 16).map((track, idx) => (
                    <div
                      key={track.url || idx}
                      onClick={() => handleOrderTrack(track)}
                      className="w-32 shrink-0 group cursor-pointer flex flex-col"
                    >
                      <div className="w-32 h-20 rounded-xl bg-surface-container overflow-hidden relative border border-white/5 shadow-sm shrink-0">
                        <img
                          src={getTrackThumb(track)}
                          alt=""
                          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/default-playlist.jpg'; }}
                        />
                        <span className={`absolute top-1 left-1 font-mono text-[9px] font-bold px-1.5 py-0.2 rounded shadow ${
                          idx < 3 ? 'bg-primary-container text-on-primary' : 'bg-black/70 text-outline'
                        }`}>
                          #{idx + 1}
                        </span>
                        <div className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-primary-container text-on-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow">
                          <Play size={12} fill="currentColor" className="ml-0.5" />
                        </div>
                        {track.duration && (
                          <span className="absolute bottom-1 left-1 text-[9px] font-mono px-1 rounded bg-black/70 text-outline">
                            {track.duration}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-semibold text-on-surface truncate mt-1.5 group-hover:text-primary transition-colors block w-full leading-tight">
                        {track.title}
                      </div>
                      <div className="text-[10px] text-outline font-mono truncate block w-full leading-tight mt-0.5">
                        {track.artist || 'Anna Music'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* HÀNG 4: PLAYLIST ĐÃ THÊM GẦN ĐÂY */}
            {recentPlaylists.length > 0 && (
              <div className="flex flex-col gap-1.5 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-on-surface uppercase tracking-wider">
                      PLAYLIST ĐÃ THÊM GẦN ĐÂY
                    </span>
                    <span className="font-mono text-[9px] text-primary-container font-semibold">
                      SERVER VIBES
                    </span>
                  </div>
                  <button
                    onClick={() => setIsAllPlaylistsModalOpen(true)}
                    className="text-[11px] font-semibold text-primary-container hover:text-primary flex items-center gap-1 transition-colors"
                  >
                    <span>Xem tất cả ({recentPlaylists.length})</span>
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {recentPlaylists.slice(0, 2).map((pl, idx) => (
                    <div
                      key={pl.id || pl.url || idx}
                      onClick={() => {
                        setSelectedPlaylist(pl);
                        setIsPlaylistModalOpen(true);
                      }}
                      className="p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container border border-white/5 transition-colors flex items-center gap-3 cursor-pointer group"
                    >
                      <div className="w-12 h-12 rounded-lg bg-surface-container-highest overflow-hidden shrink-0 border border-white/5">
                        <img
                          src={pl.thumbnail || '/default-playlist.jpg'}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/default-playlist.jpg'; }}
                        />
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-xs font-bold text-on-surface truncate group-hover:text-primary transition-colors">
                          {pl.title || pl.name || 'Danh Sách Phát'}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-outline font-mono mt-0.5">
                          <span>{pl.itemCount || pl.trackCount || 0} bài</span>
                          <span>•</span>
                          <span className="truncate">Thêm bởi {pl.addedBy || 'Thành viên'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

      </div>

      {/* ── MODALS ────────────────────────────────────────────────────────── */}
      <FavoritesModal
        isOpen={isFavoritesModalOpen}
        onClose={() => setIsFavoritesModalOpen(false)}
        favorites={favorites}
        onOrderSong={handleOrderTrack}
      />
      <PlaylistDetailModal
        isOpen={isPlaylistModalOpen}
        onClose={() => setIsPlaylistModalOpen(false)}
        playlist={selectedPlaylist}
        onOrderSong={handleOrderTrack}
      />
      <AllPlaylistsModal
        isOpen={isAllPlaylistsModalOpen}
        onClose={() => setIsAllPlaylistsModalOpen(false)}
        playlists={recentPlaylists}
        onSelectPlaylist={(pl) => {
          setSelectedPlaylist(pl);
          setIsPlaylistModalOpen(true);
        }}
      />

    </div>
  );
}
