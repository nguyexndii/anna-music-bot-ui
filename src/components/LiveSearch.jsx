import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, Sparkles, Plus, Play, Disc3, Radio, Flame, Headphones, Moon } from 'lucide-react';
import { API_BASE } from '../config';

const PRESET_PLAYLISTS = [
  {
    id: 'lofi_247',
    title: 'Chill Lofi Beats',
    desc: 'Nhạc nền thư giãn, học tập & làm việc',
    icon: CoffeeIcon,
    gradient: 'from-amber-500/20 to-orange-500/10',
    borderColor: 'border-amber-500/30',
    query: 'lofi hip hop radio beats to relax study to'
  },
  {
    id: 'vpop_hot',
    title: 'V-Pop Thịnh Hành',
    desc: 'Top hit nhạc trẻ Việt Nam mới nhất',
    icon: Flame,
    gradient: 'from-rose-500/20 to-pink-500/10',
    borderColor: 'border-rose-500/30',
    query: 'v-pop hot hits 2026'
  },
  {
    id: 'indie_chill',
    title: 'Indie & Acoustic',
    desc: 'Giai điệu mộc mạc, nhẹ nhàng, êm ái',
    icon: Headphones,
    gradient: 'from-cyan-500/20 to-blue-500/10',
    borderColor: 'border-cyan-500/30',
    query: 'nhạc indie việt nhẹ nhàng chill acoustic'
  },
  {
    id: 'rap_viet',
    title: 'Rap Việt & R&B',
    desc: 'Sôi động, chất ngầu cùng dàn beat đỉnh',
    icon: Radio,
    gradient: 'from-purple-500/20 to-violet-500/10',
    borderColor: 'border-purple-500/30',
    query: 'rap việt r&b hot hits'
  }
];

function CoffeeIcon(props) {
  return <Moon {...props} />;
}

const TRENDING_TRACKS = [
  {
    title: 'Love Is',
    artist: 'Dangrangto',
    duration: '3:15',
    thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=120',
    searchQuery: 'Love Is Dangrangto'
  },
  {
    title: 'Từng Quen',
    artist: 'Wren Evans',
    duration: '2:56',
    thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=120',
    searchQuery: 'Từng Quen Wren Evans'
  },
  {
    title: 'Exit Sign',
    artist: 'HIEUTHUHAI ft. marzuz',
    duration: '3:20',
    thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=120',
    searchQuery: 'Exit Sign HIEUTHUHAI'
  },
  {
    title: 'Bình Yên',
    artist: 'Vũ',
    duration: '4:10',
    thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=120',
    searchQuery: 'Bình Yên Vũ'
  },
  {
    title: 'Cắt Đôi Nỗi Sầu',
    artist: 'Tăng Duy Tân',
    duration: '3:05',
    thumbnail: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=120',
    searchQuery: 'Cắt Đôi Nỗi Sầu Tăng Duy Tân'
  },
  {
    title: 'Đưa Em Về Nhà',
    artist: 'GREY D ft. Chillies',
    duration: '3:40',
    thumbnail: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=120',
    searchQuery: 'Đưa Em Về Nhà GREY D'
  }
];

export default function LiveSearch({ onOrderSong }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  const quickTags = ['Chill Lofi', 'V-Pop Hot', 'Indie Việt', 'Rap Việt', 'Acoustic'];

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}&limit=8`);
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
    }, 300); // 300ms Debounce

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handleSelectPlaylist = (preset) => {
    setQuery(preset.query);
  };

  return (
    <div className="flex-1 flex flex-col gap-4">
      {/* Search Input Bar */}
      <div className="relative flex items-center">
        <Search className="absolute left-4 w-5 h-5 text-anna-muted pointer-events-none" aria-hidden="true" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm bài hát, nghệ sĩ hoặc dán link YouTube/Spotify..."
          aria-label="Tìm bài hát hoặc dán link YouTube, Spotify"
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

      {/* Quick Tags */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-anna-muted text-[11px] font-semibold">Gợi ý:</span>
        {quickTags.map((tag) => (
          <button
            key={tag}
            onClick={() => setQuery(tag)}
            className="px-3 py-1 rounded-full bg-anna-card hover:bg-anna-hover text-anna-text hover:text-white border border-anna-border transition flex-shrink-0 focus-visible:ring-2 focus-visible:ring-anna-accent focus-visible:outline-none"
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Main Results / Discovery Container */}
      <div className="bg-anna-surface border border-anna-border/80 rounded-2xl p-4 flex-1 min-h-[380px] max-h-[520px] overflow-y-auto flex flex-col gap-4 relative">
        
        {/* Loading Overlay */}
        {loading && (
          <div
            className="absolute inset-0 bg-anna-surface/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-2"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="w-7 h-7 text-anna-accent animate-spin" />
            <span className="text-xs text-anna-muted font-medium">Đang tìm kiếm bài hát...</span>
          </div>
        )}

        {/* Discovery View (Khi chưa gõ từ khóa tìm kiếm) */}
        {!loading && results.length === 0 && !query && (
          <div className="flex flex-col gap-6 animate-in fade-in">
            
            {/* Section 1: Phổ biến hôm nay (Popular Today - FlaviBot Style) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    Phổ Biến Hôm Nay (Popular Today)
                  </h3>
                </div>
                <span className="text-[11px] text-anna-muted font-medium">Cập nhật theo xu hướng</span>
              </div>

              {/* Horizontal Scroll Row of Square Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {TRENDING_TRACKS.map((t, idx) => (
                  <div
                    key={idx}
                    onClick={() => onOrderSong(t)}
                    className="group relative flex flex-col cursor-pointer transition hover:-translate-y-1"
                  >
                    {/* Square Cover Card */}
                    <div className="aspect-square w-full rounded-2xl overflow-hidden relative bg-anna-card border border-anna-border/70 shadow-md">
                      <img
                        src={t.thumbnail}
                        alt={t.title}
                        className="w-full h-full object-cover transition duration-300 group-hover:scale-110"
                      />
                      
                      {/* Rank Badge */}
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-black text-white font-mono flex items-center gap-1 border border-white/10">
                        <span className="text-anna-green font-bold">#{idx + 1}</span>
                      </div>

                      {/* Play Overlay on Hover */}
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-anna-accent text-white flex items-center justify-center shadow-lg shadow-anna-accent/40 transform scale-75 group-hover:scale-100 transition">
                          <Play className="w-5 h-5 fill-white ml-0.5" />
                        </div>
                      </div>
                    </div>

                    {/* Title & Artist */}
                    <div className="mt-2 min-w-0">
                      <h4 className="text-xs font-bold text-white group-hover:text-anna-accent transition truncate leading-tight">
                        {t.title}
                      </h4>
                      <p className="text-[11px] text-anna-muted truncate mt-0.5">
                        {t.artist}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 2: Playlist & Radio Có Sẵn (YouTube, Spotify & SoundCloud) */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Disc3 className="w-4 h-4 text-anna-accent" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Playlist & Radio Có Sẵn
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PRESET_PLAYLISTS.map((p) => {
                  const IconComp = p.icon;
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSelectPlaylist(p)}
                      className={`p-3.5 rounded-2xl bg-gradient-to-br ${p.gradient} border ${p.borderColor} hover:scale-[1.01] cursor-pointer transition shadow-sm group flex items-center justify-between gap-3`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-anna-surface/90 border border-white/10 flex items-center justify-center flex-shrink-0 shadow-md">
                          <IconComp className="w-5 h-5 text-white" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white group-hover:text-anna-accent transition truncate">
                            {p.title}
                          </h4>
                          <p className="text-[11px] text-anna-muted truncate mt-0.5">
                            {p.desc}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-xl bg-white/10 group-hover:bg-anna-accent text-white text-xs font-bold transition flex items-center gap-1 flex-shrink-0 shadow-sm"
                        title="Khám phá playlist"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Khám phá</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* Empty State when searched but nothing found */}
        {!loading && results.length === 0 && query && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-anna-muted">
            <div className="w-12 h-12 rounded-2xl bg-anna-card border border-anna-border flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6 text-anna-accent" aria-hidden="true" />
            </div>
            <p className="text-sm font-semibold text-white">Không tìm thấy bài hát</p>
            <p className="text-xs text-anna-muted mt-1 max-w-xs">
              Hãy thử tìm với tên ca sĩ, tên bài hát khác hoặc dán link YouTube trực tiếp!
            </p>
          </div>
        )}

        {/* Live Search Results List */}
        {!loading && results.length > 0 && (
          <div className="flex flex-col gap-2">
            {results.map((track, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-anna-card hover:bg-anna-hover border border-anna-border/70 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={track.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100'}
                    alt={`Ảnh bìa ${track.title}`}
                    className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white line-clamp-1">{track.title}</p>
                    <p className="text-[11px] text-anna-muted flex items-center gap-1.5 mt-0.5">
                      <span>{track.artist}</span>
                      <span>•</span>
                      <span className="font-mono text-anna-text">{track.duration}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => onOrderSong(track)}
                    aria-label={`Thêm bài hát ${track.title} vào hàng chờ`}
                    className="px-3 py-1.5 rounded-xl bg-anna-accent hover:bg-anna-accentHover text-white text-xs font-bold transition flex items-center gap-1 shadow-sm shadow-anna-accent/20 active:scale-95 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Thêm</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
