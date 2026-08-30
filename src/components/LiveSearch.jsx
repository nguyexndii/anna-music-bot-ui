import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Loader2,
  Play,
  Flame,
  Plus,
  Music,
  Heart,
  Clock,
  Disc3,
  ListPlus
} from 'lucide-react';
import { API_BASE } from '../config';

// Helper nhận diện nhanh URL & Playlist
function detectUrlType(text) {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return null;

  if (trimmed.includes('youtube.com/playlist') || (trimmed.includes('youtube.com/watch') && trimmed.includes('list='))) {
    return { type: 'youtube_playlist', label: 'YouTube Playlist', isPlaylist: true };
  }
  if (trimmed.includes('spotify.com/playlist/') || trimmed.includes('spotify.com/album/')) {
    return { type: 'spotify_playlist', label: 'Spotify Playlist / Album', isPlaylist: true };
  }
  if (trimmed.includes('spotify.com/track/')) {
    return { type: 'spotify_track', label: 'Spotify Track', isPlaylist: false };
  }
  if (trimmed.includes('youtube.com/watch') || trimmed.includes('youtu.be/')) {
    return { type: 'youtube_video', label: 'YouTube Video', isPlaylist: false };
  }
  return { type: 'direct_url', label: 'Liên kết âm nhạc', isPlaylist: false };
}

// Helper lấy ảnh bìa YouTube
function getTrackThumb(track) {
  if (track?.thumbnail) return track.thumbnail;
  if (track?.url) {
    const match = track.url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (match && match[1]) {
      return `https://i.ytimg.com/vi/${match[1]}/hqdefault.jpg`;
    }
  }
  return 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=120';
}

export default function LiveSearch({ onOrderSong, player }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  const detected = detectUrlType(query);

  // Live Search Effect
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }

    // Nếu là link Playlist: không cần tìm kiếm live, user có thể bấm nút thêm trực tiếp
    if (detected?.isPlaylist) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(trimmed)}&limit=8`);
        const data = await res.json();
        setLoading(false);
        if (data.success && data.results) {
          setResults(data.results);
        } else {
          setResults([]);
        }
      } catch (err) {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(debounceRef.current);
  }, [query, detected?.isPlaylist]);

  const handleOrderTrack = (track) => {
    onOrderSong(track);
  };

  const handleAddPlaylistUrl = (url) => {
    onOrderSong({ url: url || query.trim(), isPlaylist: true });
    setQuery('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && query.trim()) {
      if (detected?.isPlaylist) {
        handleAddPlaylistUrl(query.trim());
      } else if (results.length > 0) {
        handleOrderTrack(results[0]);
      } else if (query.trim().startsWith('http')) {
        handleOrderTrack({ url: query.trim() });
        setQuery('');
      }
    }
  };

  // Dữ liệu thực tế từ Player State
  const favorites = player?.favorites || [];
  const history = player?.history || [];
  const topTracks = player?.topTracks || [];
  const recentPlaylists = player?.recentPlaylists || [];

  const hasAnyData = favorites.length > 0 || history.length > 0 || topTracks.length > 0 || recentPlaylists.length > 0;

  return (
    <div className="flex flex-col gap-4 animate-in fade-in">
      {/* Search Bar */}
      <div className="relative flex items-center">
        <Search className="w-5 h-5 absolute left-4 text-anna-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tìm tên bài hát, ca sĩ, hoặc dán link YouTube / Spotify / Playlist..."
          className="w-full bg-anna-surface border border-anna-border focus:border-anna-accent rounded-2xl pl-12 pr-12 py-3.5 text-sm text-white placeholder-anna-muted focus:outline-none focus:ring-2 focus:ring-anna-accent/30 transition shadow-inner"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            aria-label="Xóa nội dung tìm kiếm"
            className="absolute right-4 text-anna-muted hover:text-white focus-visible:ring-2 focus-visible:ring-anna-accent focus-visible:outline-none rounded-lg p-1"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Instant Playlist Detection Banner */}
      {detected?.isPlaylist && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-anna-accent/20 to-purple-600/20 border border-anna-accent/40 shadow-xl flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-anna-accent text-white flex items-center justify-center flex-shrink-0 shadow-lg shadow-anna-accent/30">
              <Disc3 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  {detected.label}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-anna-green/20 text-anna-green font-bold">
                  Sẵn sàng thêm
                </span>
              </div>
              <p className="text-xs text-anna-muted truncate mt-0.5 max-w-md">
                {query}
              </p>
            </div>
          </div>

          <button
            onClick={() => handleAddPlaylistUrl(query.trim())}
            className="px-4 py-2.5 rounded-xl bg-anna-accent hover:bg-anna-accentHover text-white text-xs font-bold transition flex items-center gap-2 flex-shrink-0 shadow-lg shadow-anna-accent/30 active:scale-95"
          >
            <ListPlus className="w-4 h-4" />
            <span>Thêm Cả Playlist</span>
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="bg-anna-surface border border-anna-border/80 rounded-2xl p-5 flex-1 min-h-[420px] max-h-[560px] overflow-y-auto flex flex-col gap-6 relative">
        
        {/* Loading Overlay */}
        {loading && (
          <div
            className="absolute inset-0 bg-anna-surface/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-2"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="w-7 h-7 text-anna-accent animate-spin" />
            <span className="text-xs text-anna-muted font-medium">Đang tìm kiếm siêu tốc...</span>
          </div>
        )}

        {/* VIEW 1: Live Search Results */}
        {!loading && query && !detected?.isPlaylist && results.length > 0 && (
          <div className="flex flex-col gap-2.5 animate-in fade-in">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-1 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-anna-accent" />
              <span>Kết quả tìm kiếm cho "{query}"</span>
            </h3>

            {results.map((track, idx) => (
              <div
                key={idx}
                onClick={() => handleOrderTrack(track)}
                className="flex items-center justify-between p-2.5 rounded-xl bg-anna-card border border-anna-border/70 hover:border-anna-accent/50 hover:bg-anna-hover transition cursor-pointer group shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-lg overflow-hidden relative flex-shrink-0 bg-anna-surface border border-anna-border/50">
                    <img
                      src={getTrackThumb(track)}
                      alt={track.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <Play className="w-4 h-4 fill-white text-white" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white group-hover:text-anna-accent transition truncate max-w-sm sm:max-w-md">
                      {track.title}
                    </h4>
                    <p className="text-[11px] text-anna-muted truncate mt-0.5">
                      {track.artist || 'YouTube Music'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0 pl-2">
                  <span className="text-[11px] font-mono text-anna-muted">
                    {track.duration || '3:30'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOrderTrack(track);
                    }}
                    title="Thêm vào hàng chờ"
                    className="w-7 h-7 rounded-lg bg-anna-accent/10 hover:bg-anna-accent text-anna-accent hover:text-white flex items-center justify-center transition"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty Search State */}
        {!loading && query && !detected?.isPlaylist && results.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center py-16 text-center text-anna-muted gap-2">
            <Music className="w-8 h-8 opacity-40 mb-1" />
            <p className="text-xs font-semibold text-white">Không tìm thấy bài hát nào</p>
            <p className="text-[11px] text-anna-muted max-w-xs">
              Thử tìm kiếm với từ khóa khác hoặc dán trực tiếp đường link YouTube / Spotify.
            </p>
          </div>
        )}

        {/* VIEW 2: Default Hub (Khi ô tìm kiếm trống) */}
        {!query && (
          <div className="flex flex-col gap-6 animate-in fade-in">
            
            {/* SECTION 1: ❤️ BÀI HÁT YÊU THÍCH */}
            {favorites.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-rose-400 fill-rose-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                      Bài Hát Yêu Thích Của Bạn
                    </h3>
                  </div>
                  <span className="text-[11px] text-rose-400 font-bold">{favorites.length} bài đã lưu</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {favorites.slice(0, 6).map((item, idx) => {
                    const songData = typeof item === 'object' ? item : { title: String(item) };
                    return (
                      <div
                        key={idx}
                        onClick={() => handleOrderTrack(songData)}
                        className="group relative flex flex-col cursor-pointer transition hover:-translate-y-1"
                      >
                        <div className="aspect-square w-full rounded-2xl overflow-hidden relative bg-anna-card border border-rose-500/30 shadow-md">
                          <img
                            src={getTrackThumb(songData)}
                            alt={songData.title}
                            className="w-full h-full object-cover transition duration-300 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/40 transform scale-75 group-hover:scale-100 transition">
                              <Play className="w-5 h-5 fill-white ml-0.5" />
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 min-w-0">
                          <h4 className="text-xs font-bold text-white group-hover:text-rose-400 transition truncate leading-tight">
                            {songData.title}
                          </h4>
                          <p className="text-[11px] text-anna-muted truncate mt-0.5">
                            {songData.artist || 'Yêu thích'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SECTION 2: 🕒 BÀI ĐÃ NGHE GẦN ĐÂY */}
            {history.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                      Nghe Gần Đây (Recently Played)
                    </h3>
                  </div>
                  <span className="text-[11px] text-anna-muted">Lịch sử phòng nhạc</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {history.slice(0, 6).map((item, idx) => {
                    const songData = typeof item === 'object' ? item : { title: String(item) };
                    return (
                      <div
                        key={idx}
                        onClick={() => handleOrderTrack(songData)}
                        className="group relative flex flex-col cursor-pointer transition hover:-translate-y-1"
                      >
                        <div className="aspect-square w-full rounded-2xl overflow-hidden relative bg-anna-card border border-cyan-500/30 shadow-md">
                          <img
                            src={getTrackThumb(songData)}
                            alt={songData.title}
                            className="w-full h-full object-cover transition duration-300 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-cyan-500 text-white flex items-center justify-center shadow-lg shadow-cyan-500/40 transform scale-75 group-hover:scale-100 transition">
                              <Play className="w-5 h-5 fill-white ml-0.5" />
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 min-w-0">
                          <h4 className="text-xs font-bold text-white group-hover:text-cyan-400 transition truncate leading-tight">
                            {songData.title}
                          </h4>
                          <p className="text-[11px] text-anna-muted truncate mt-0.5">
                            {songData.artist || 'Gần đây'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SECTION 3: 📂 PLAYLIST ĐÃ THÊM GẦN ĐÂY */}
            {recentPlaylists.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Disc3 className="w-4 h-4 text-purple-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                      Playlist Đã Thêm Gần Đây
                    </h3>
                  </div>
                  <span className="text-[11px] text-anna-muted">1 chạm phát lại</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {recentPlaylists.map((pl, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleAddPlaylistUrl(pl.url)}
                      className="flex items-center justify-between p-3 rounded-2xl bg-anna-card border border-purple-500/30 hover:border-purple-400 hover:bg-anna-hover transition cursor-pointer group shadow-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-xl overflow-hidden relative bg-purple-500/10 border border-purple-500/20 flex-shrink-0">
                          {pl.thumbnail ? (
                            <img src={pl.thumbnail} alt={pl.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-purple-400">
                              <Disc3 className="w-5 h-5" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                            <Play className="w-4 h-4 fill-white text-white" />
                          </div>
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white group-hover:text-purple-400 transition truncate">
                            {pl.title}
                          </h4>
                          <p className="text-[11px] text-anna-muted truncate mt-0.5">
                            {pl.trackCount ? `${pl.trackCount} bài hát` : 'Danh sách phát'} • {pl.addedBy || 'Server'}
                          </p>
                        </div>
                      </div>

                      <button
                        title="Phát lại toàn bộ Playlist này"
                        className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 group-hover:bg-purple-500 group-hover:text-white flex items-center justify-center transition flex-shrink-0"
                      >
                        <ListPlus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 4: 🔥 TOP BÀI HÁT MÁY CHỦ */}
            {topTracks.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                      Bảng Xếp Hạng Máy Chủ (Top Hits)
                    </h3>
                  </div>
                  <span className="text-[11px] text-amber-400 font-semibold">Được nghe nhiều nhất</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {topTracks.map((track, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleOrderTrack(track)}
                      className="flex items-center justify-between p-3 rounded-2xl bg-anna-card border border-amber-500/20 hover:border-amber-400/50 hover:bg-anna-hover transition cursor-pointer group shadow-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Rank Badge */}
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                          idx === 0 ? 'bg-amber-500 text-black shadow-md shadow-amber-500/30' :
                          idx === 1 ? 'bg-slate-300 text-black' :
                          idx === 2 ? 'bg-amber-700 text-white' :
                          'bg-anna-surface text-anna-muted border border-anna-border'
                        }`}>
                          #{idx + 1}
                        </div>

                        <div className="w-10 h-10 rounded-lg overflow-hidden relative bg-anna-surface border border-anna-border/60 flex-shrink-0">
                          <img
                            src={getTrackThumb(track)}
                            alt={track.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                            <Play className="w-3.5 h-3.5 fill-white text-white" />
                          </div>
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white group-hover:text-amber-400 transition truncate">
                            {track.title}
                          </h4>
                          <p className="text-[11px] text-anna-muted truncate mt-0.5">
                            {track.artist || 'Top bài hát'} {track.count ? `• ${track.count} lượt nghe` : ''}
                          </p>
                        </div>
                      </div>

                      <button
                        title="Phát bài này"
                        className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-black flex items-center justify-center transition flex-shrink-0"
                      >
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty Server Data Welcome State */}
            {!hasAnyData && (
              <div className="flex-1 flex flex-col items-center justify-center py-16 text-center text-anna-muted gap-3">
                <div className="w-14 h-14 rounded-2xl bg-anna-card border border-anna-border flex items-center justify-center shadow-inner">
                  <Music className="w-7 h-7 text-anna-accent" />
                </div>
                <h4 className="text-sm font-bold text-white">Bắt đầu khám phá âm nhạc</h4>
                <p className="text-xs text-anna-muted max-w-sm leading-relaxed">
                  Nhập tên bài hát hoặc dán link YouTube, Spotify, Playlist vào thanh tìm kiếm ở trên để bắt đầu nghe nhạc cùng mọi người!
                </p>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
