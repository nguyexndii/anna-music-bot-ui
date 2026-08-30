import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Loader2,
  Sparkles,
  Plus,
  Play,
  Disc3,
  Radio,
  Flame,
  Headphones,
  Moon,
  ArrowLeft,
  Music2,
  Check,
  ListPlus,
  Zap,
  HeartHandshake,
  Globe
} from 'lucide-react';
import { API_BASE } from '../config';

const PRESET_PLAYLISTS = [
  {
    id: 'vpop_hot',
    title: 'V-Pop Thịnh Hành 2026',
    desc: 'Top 10 hit nhạc trẻ Việt Nam được nghe nhiều nhất',
    icon: Flame,
    gradient: 'from-rose-500/25 to-pink-600/10',
    borderColor: 'border-rose-500/40',
    tracks: [
      { title: 'Từng Quen', artist: 'Wren Evans', duration: '2:56', searchQuery: 'Từng Quen Wren Evans' },
      { title: 'Cắt Đôi Nỗi Sầu', artist: 'Tăng Duy Tân', duration: '3:05', searchQuery: 'Cắt Đôi Nỗi Sầu Tăng Duy Tân' },
      { title: 'Chìm Sâu', artist: 'RPT MCK ft. Trung Trần', duration: '2:39', searchQuery: 'Chìm Sâu MCK Trung Trần' },
      { title: 'Đưa Em Về Nhà', artist: 'GREY D ft. Chillies', duration: '3:40', searchQuery: 'Đưa Em Về Nhà GREY D' },
      { title: 'Nơi Này Có Anh', artist: 'Sơn Tùng M-TP', duration: '4:20', searchQuery: 'Nơi Này Có Anh Sơn Tùng M-TP' },
      { title: 'Đại Minh Tinh', artist: 'Văn Mai Hương', duration: '4:06', searchQuery: 'Đại Minh Tinh Văn Mai Hương' },
      { title: 'Ngày Mai Người Ta Lấy Chồng', artist: 'Anh Tú', duration: '5:10', searchQuery: 'Ngày Mai Người Ta Lấy Chồng Anh Tú' },
      { title: 'Sau Lời Từ Khước', artist: 'Phan Mạnh Quỳnh', duration: '3:45', searchQuery: 'Sau Lời Từ Khước Phan Mạnh Quỳnh' },
      { title: 'Khóa Ly Biệt', artist: 'Anh Tú', duration: '4:30', searchQuery: 'Khóa Ly Biệt Anh Tú' },
      { title: 'Bật Tình Yêu Lên', artist: 'Tăng Duy Tân ft. Hòa Minzy', duration: '3:24', searchQuery: 'Bật Tình Yêu Lên Tăng Duy Tân Hòa Minzy' }
    ]
  },
  {
    id: 'lofi_chill',
    title: 'Chill Lofi Beats 24/7',
    desc: 'Giai điệu thư giãn, tập trung làm việc & học tập',
    icon: Moon,
    gradient: 'from-amber-500/25 to-orange-600/10',
    borderColor: 'border-amber-500/40',
    tracks: [
      { title: 'Lofi Hip Hop Radio - Beats to Relax/Study to', artist: 'Lofi Girl', duration: 'Live', searchQuery: 'lofi hip hop radio beats to relax study to' },
      { title: 'Midnight Coffee Chillhop', artist: 'Chillhop Music', duration: '3:20', searchQuery: 'midnight coffee chillhop beat' },
      { title: 'Rainy Night In Tokyo', artist: 'Lofi Beats', duration: '3:45', searchQuery: 'rainy night in tokyo lofi' },
      { title: 'Warm Memories', artist: 'Aesthetic Lofi', duration: '2:50', searchQuery: 'warm memories aesthetic lofi' },
      { title: 'Cozy Winter Fireplace Beats', artist: 'Lofi Sleep', duration: '4:15', searchQuery: 'cozy winter fireplace lofi beats' },
      { title: 'Study With Me Instrumental', artist: 'Focus Beats', duration: '3:30', searchQuery: 'study with me lofi instrumental' },
      { title: 'Sleep Well Tonight', artist: 'Sweet Dreams Lofi', duration: '3:10', searchQuery: 'sleep well tonight lofi chill' },
      { title: 'Sunset Boulevard Beats', artist: 'Chill Wave', duration: '3:05', searchQuery: 'sunset boulevard chill beats' }
    ]
  },
  {
    id: 'indie_acoustic',
    title: 'Indie & Acoustic Việt',
    desc: 'Nhạc nhẹ nhàng, mộc mạc và sâu lắng của Vũ, Chillies...',
    icon: Headphones,
    gradient: 'from-cyan-500/25 to-blue-600/10',
    borderColor: 'border-cyan-500/40',
    tracks: [
      { title: 'Bình Yên', artist: 'Vũ', duration: '4:10', searchQuery: 'Bình Yên Vũ' },
      { title: 'Lạ Lùng', artist: 'Vũ', duration: '4:22', searchQuery: 'Lạ Lùng Vũ' },
      { title: 'Bước Qua Mùa Cô Đơn', artist: 'Vũ', duration: '4:40', searchQuery: 'Bước Qua Mùa Cô Đơn Vũ' },
      { title: 'Có Em', artist: 'Madihu ft. Low G', duration: '3:48', searchQuery: 'Có Em Madihu Low G' },
      { title: 'Vì Anh Đâu Biết', artist: 'Madihu ft. Vũ', duration: '4:02', searchQuery: 'Vì Anh Đâu Biết Madihu Vũ' },
      { title: 'Chuyện Rằng', artist: 'Thịnh Suy', duration: '3:55', searchQuery: 'Chuyện Rằng Thịnh Suy' },
      { title: 'Thắc Mắc', artist: 'Thịnh Suy', duration: '3:35', searchQuery: 'Thắc Mắc Thịnh Suy' },
      { title: 'Mascara', artist: 'Chillies', duration: '4:42', searchQuery: 'Mascara Chillies' },
      { title: 'Vùng Ký Ức', artist: 'Chillies', duration: '4:15', searchQuery: 'Vùng Ký Ức Chillies' },
      { title: 'Dù Cho Tận Thế', artist: 'Erik', duration: '3:50', searchQuery: 'Dù Cho Tận Thế Erik' }
    ]
  },
  {
    id: 'rap_viet',
    title: 'Rap Việt & Hip-Hop',
    desc: 'Sôi động, chất ngầu với các bản Rap & R&B đỉnh cao',
    icon: Radio,
    gradient: 'from-purple-500/25 to-violet-600/10',
    borderColor: 'border-purple-500/40',
    tracks: [
      { title: 'Love Is', artist: 'Dangrangto', duration: '3:15', searchQuery: 'Love Is Dangrangto' },
      { title: 'Exit Sign', artist: 'HIEUTHUHAI ft. marzuz', duration: '3:20', searchQuery: 'Exit Sign HIEUTHUHAI' },
      { title: 'Không Thể Say', artist: 'HIEUTHUHAI', duration: '3:35', searchQuery: 'Không Thể Say HIEUTHUHAI' },
      { title: 'Thủ Đô Cypher', artist: 'RPT MCK, Orijinn, RZ Mas', duration: '4:05', searchQuery: 'Thủ Đô Cypher' },
      { title: 'Tại Vì Sao', artist: 'RPT MCK', duration: '3:12', searchQuery: 'Tại Vì Sao MCK' },
      { title: 'Ghé Qua', artist: 'TaynguyenSound ft. Tofu', duration: '4:18', searchQuery: 'Ghé Qua TaynguyenSound' },
      { title: 'Nến Và Hoa', artist: 'Rhymastic', duration: '3:45', searchQuery: 'Nến Và Hoa Rhymastic' },
      { title: '99%', artist: 'MCK', duration: '2:50', searchQuery: '99% MCK' },
      { title: 'Chắt Chiêu', artist: '24k.Right', duration: '3:10', searchQuery: 'Chắt Chiêu 24k.Right' },
      { title: 'Tình Yêu Bận Bịu', artist: 'Tlinh', duration: '3:05', searchQuery: 'Tình Yêu Bận Bịu Tlinh' }
    ]
  },
  {
    id: 'remix_tiktok',
    title: 'Vinahouse & TikTok Viral',
    desc: 'Bản phối sôi động, bass căng đét quẩy tung phòng',
    icon: Zap,
    gradient: 'from-emerald-500/25 to-teal-600/10',
    borderColor: 'border-emerald-500/40',
    tracks: [
      { title: 'Nonstop Vinahouse 2026 Bass Cực Căng', artist: 'DJ Remix', duration: '45:00', searchQuery: 'nonstop vinahouse 2026 bass cuc cang' },
      { title: 'Cắt Đôi Nỗi Sầu (Vinahouse Remix)', artist: 'Tăng Duy Tân DJ Mix', duration: '4:15', searchQuery: 'cắt đôi nỗi sầu remix vinahouse' },
      { title: 'Bật Tình Yêu Lên (TikTok Remix)', artist: 'DJ Cucak', duration: '3:50', searchQuery: 'bật tình yêu lên remix tiktok' },
      { title: 'Pháo Hồng (Speed Up & Remix)', artist: 'Đạt Long Vinh', duration: '3:30', searchQuery: 'pháo hồng remix speed up' },
      { title: 'Yêu Người Có Ước Mơ (Remix)', artist: 'Bùi Trường Linh', duration: '4:00', searchQuery: 'yêu người có ước mơ remix' },
      { title: 'Ngủ Một Mình (Remix)', artist: 'HIEUTHUHAI ft. Negav', duration: '3:40', searchQuery: 'ngủ một mình remix hieuthuhai' }
    ]
  },
  {
    id: 'bolero_romantic',
    title: 'Trữ Tình & Bolero Tuyệt Phẩm',
    desc: 'Giai điệu hoài niệm, ngọt ngào đi cùng năm tháng',
    icon: HeartHandshake,
    gradient: 'from-yellow-500/25 to-amber-600/10',
    borderColor: 'border-yellow-500/40',
    tracks: [
      { title: 'Duyên Phận', artist: 'Như Quỳnh', duration: '5:45', searchQuery: 'Duyên Phận Như Quỳnh' },
      { title: 'Sầu Tím Thiệp Hồng', artist: 'Quang Lê & Lệ Quyên', duration: '5:15', searchQuery: 'Sầu Tím Thiệp Hồng Quang Lê Lệ Quyên' },
      { title: 'Hoa Nở Về Đêm', artist: 'Lệ Quyên', duration: '4:50', searchQuery: 'Hoa Nở Về Đêm Lệ Quyên' },
      { title: 'Về Đâu Mái Tóc Người Thương', artist: 'Quang Lê', duration: '4:40', searchQuery: 'Về Đâu Mái Tóc Người Thương Quang Lê' },
      { title: 'Đoạn Tuyệt', artist: 'Như Quỳnh', duration: '5:20', searchQuery: 'Đoạn Tuyệt Như Quỳnh' },
      { title: 'Ai Khổ Vì Ai', artist: 'Lệ Quyên', duration: '4:55', searchQuery: 'Ai Khổ Vì Ai Lệ Quyên' }
    ]
  },
  {
    id: 'us_uk_hits',
    title: 'US-UK Top Billboard',
    desc: 'Những bản hit đình đám toàn cầu thống trị bảng xếp hạng',
    icon: Globe,
    gradient: 'from-blue-500/25 to-indigo-600/10',
    borderColor: 'border-blue-500/40',
    tracks: [
      { title: 'Blinding Lights', artist: 'The Weeknd', duration: '3:20', searchQuery: 'Blinding Lights The Weeknd' },
      { title: 'Cruel Summer', artist: 'Taylor Swift', duration: '2:58', searchQuery: 'Cruel Summer Taylor Swift' },
      { title: 'As It Was', artist: 'Harry Styles', duration: '2:47', searchQuery: 'As It Was Harry Styles' },
      { title: 'Stay', artist: 'The Kid LAROI & Justin Bieber', duration: '2:21', searchQuery: 'Stay The Kid LAROI Justin Bieber' },
      { title: 'Starboy', artist: 'The Weeknd ft. Daft Punk', duration: '3:50', searchQuery: 'Starboy The Weeknd' },
      { title: 'Shape of You', artist: 'Ed Sheeran', duration: '3:53', searchQuery: 'Shape of You Ed Sheeran' },
      { title: 'Someone You Loved', artist: 'Lewis Capaldi', duration: '3:02', searchQuery: 'Someone You Loved Lewis Capaldi' },
      { title: 'Flowers', artist: 'Miley Cyrus', duration: '3:20', searchQuery: 'Flowers Miley Cyrus' }
    ]
  },
  {
    id: 'sleep_relax',
    title: 'Thư Giãn & Dễ Ngủ (Piano/Rain)',
    desc: 'Âm thanh tiếng mưa, piano êm đềm ru giấc ngủ ngon',
    icon: Moon,
    gradient: 'from-slate-500/25 to-zinc-600/10',
    borderColor: 'border-slate-500/40',
    tracks: [
      { title: 'Relaxing Piano & Gentle Rain for Deep Sleep', artist: 'Healing Music', duration: '30:00', searchQuery: 'relaxing piano gentle rain deep sleep' },
      { title: 'Weightless - Marconi Union', artist: 'Marconi Union', duration: '8:08', searchQuery: 'Marconi Union Weightless' },
      { title: 'River Flows In You', artist: 'Yiruma', duration: '3:05', searchQuery: 'River Flows In You Yiruma' },
      { title: 'Kiss The Rain', artist: 'Yiruma', duration: '4:16', searchQuery: 'Kiss The Rain Yiruma' },
      { title: 'Deep Meditation & Sound Therapy', artist: 'Zen Relax', duration: '20:00', searchQuery: 'deep meditation sound therapy healing' }
    ]
  }
];

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
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [addedSuccessTrack, setAddedSuccessTrack] = useState(null);
  const debounceRef = useRef(null);

  const quickTags = ['Chill Lofi', 'V-Pop Hot', 'Indie Việt', 'Rap Việt', 'Acoustic', 'Remix'];

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setSelectedPlaylist(null);
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
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handleOrderTrack = (track) => {
    onOrderSong(track);
    setAddedSuccessTrack(track.title);
    setTimeout(() => setAddedSuccessTrack(null), 2000);
  };

  const handleAddAllPlaylistTracks = (playlist) => {
    if (!playlist?.tracks) return;
    playlist.tracks.forEach((t, i) => {
      setTimeout(() => {
        onOrderSong(t);
      }, i * 350);
    });
    setAddedSuccessTrack(`Đã thêm toàn bộ ${playlist.tracks.length} bài hát vào hàng chờ!`);
    setTimeout(() => setAddedSuccessTrack(null), 3000);
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
            onClick={() => {
              setSelectedPlaylist(null);
              setQuery(tag);
            }}
            className="px-3 py-1 rounded-full bg-anna-card hover:bg-anna-hover text-anna-text hover:text-white border border-anna-border transition flex-shrink-0 focus-visible:ring-2 focus-visible:ring-anna-accent focus-visible:outline-none"
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Main Container */}
      <div className="bg-anna-surface border border-anna-border/80 rounded-2xl p-4 flex-1 min-h-[380px] max-h-[540px] overflow-y-auto flex flex-col gap-4 relative">
        
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

        {/* Success Toast when adding */}
        {addedSuccessTrack && (
          <div className="sticky top-0 z-30 px-3 py-2 rounded-xl bg-anna-green/20 border border-anna-green/40 text-anna-green text-xs font-semibold flex items-center justify-between shadow-lg animate-in fade-in">
            <span className="truncate">✓ Đã thêm: <b>{addedSuccessTrack}</b></span>
            <Check className="w-4 h-4 flex-shrink-0" />
          </div>
        )}

        {/* VIEW 1: Detail Tracklist Viewer for Selected Playlist */}
        {!loading && !query && selectedPlaylist && (
          <div className="flex flex-col gap-4 animate-in fade-in">
            {/* Header with Back Button */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-anna-border/60">
              <button
                onClick={() => setSelectedPlaylist(null)}
                className="px-3 py-1.5 rounded-xl bg-anna-card hover:bg-anna-hover text-white text-xs font-bold transition flex items-center gap-1.5 border border-anna-border/70 shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Quay lại Khám Phá</span>
              </button>

              <button
                onClick={() => handleAddAllPlaylistTracks(selectedPlaylist)}
                className="px-3 py-1.5 rounded-xl bg-anna-accent hover:bg-anna-accentHover text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-anna-accent/30 active:scale-95"
              >
                <ListPlus className="w-4 h-4" />
                <span>+ Thêm tất cả ({selectedPlaylist.tracks?.length || 0} bài)</span>
              </button>
            </div>

            {/* Playlist Info Banner */}
            <div className={`p-4 rounded-2xl bg-gradient-to-br ${selectedPlaylist.gradient} border ${selectedPlaylist.borderColor} flex items-center gap-4`}>
              <div className="w-14 h-14 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center flex-shrink-0 shadow-lg">
                <selectedPlaylist.icon className="w-7 h-7 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  {selectedPlaylist.title}
                </h3>
                <p className="text-xs text-anna-muted mt-0.5">
                  {selectedPlaylist.desc}
                </p>
                <p className="text-[11px] text-anna-accent font-bold mt-1">
                  {selectedPlaylist.tracks?.length || 0} bài hát có sẵn
                </p>
              </div>
            </div>

            {/* Tracklist List */}
            <div className="flex flex-col gap-2 mt-1">
              {selectedPlaylist.tracks?.map((track, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-anna-card hover:bg-anna-hover border border-anna-border/50 transition group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-5 text-center text-xs font-mono font-bold text-anna-muted">
                      {idx + 1}
                    </span>
                    <div className="w-9 h-9 rounded-lg bg-anna-surface border border-anna-border flex items-center justify-center flex-shrink-0">
                      <Music2 className="w-4 h-4 text-anna-muted group-hover:text-anna-accent transition" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{track.title}</p>
                      <p className="text-[11px] text-anna-muted flex items-center gap-1.5 mt-0.5">
                        <span>{track.artist}</span>
                        <span>•</span>
                        <span className="font-mono">{track.duration}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOrderTrack(track)}
                    aria-label={`Thêm bài ${track.title}`}
                    className="px-3 py-1.5 rounded-xl bg-anna-accent/20 hover:bg-anna-accent text-anna-accent hover:text-white text-xs font-bold transition flex items-center gap-1 flex-shrink-0 active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 2: Discovery Overview (Popular Today + 8 Preset Playlists) */}
        {!loading && !query && !selectedPlaylist && results.length === 0 && (
          <div className="flex flex-col gap-6 animate-in fade-in">
            
            {/* Section 1: Phổ biến hôm nay (Popular Today - FlaviBot Style Cards) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    Phổ Biến Hôm Nay (Popular Today)
                  </h3>
                </div>
                <span className="text-[11px] text-anna-muted font-medium">Bấm để nghe ngay</span>
              </div>

              {/* Responsive Grid of Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {TRENDING_TRACKS.map((t, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleOrderTrack(t)}
                    className="group relative flex flex-col cursor-pointer transition hover:-translate-y-1"
                  >
                    <div className="aspect-square w-full rounded-2xl overflow-hidden relative bg-anna-card border border-anna-border/70 shadow-md">
                      <img
                        src={t.thumbnail}
                        alt={t.title}
                        className="w-full h-full object-cover transition duration-300 group-hover:scale-110"
                      />
                      
                      {/* Rank Badge */}
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-black text-white font-mono flex items-center gap-1 border border-white/10">
                        <span className="text-anna-green font-bold">#{idx + 1}</span>
                      </div>

                      {/* Play Overlay on Hover */}
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-anna-accent text-white flex items-center justify-center shadow-lg shadow-anna-accent/40 transform scale-75 group-hover:scale-100 transition">
                          <Play className="w-5 h-5 fill-white ml-0.5" />
                        </div>
                      </div>
                    </div>

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

            {/* Section 2: 8 Preset Playlists (Click to view tracklist) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Disc3 className="w-4 h-4 text-anna-accent" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    Playlist & Radio Tuyển Chọn ({PRESET_PLAYLISTS.length} danh sách)
                  </h3>
                </div>
                <span className="text-[11px] text-anna-muted">Nhấn vào để xem bài</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PRESET_PLAYLISTS.map((p) => {
                  const IconComp = p.icon;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPlaylist(p)}
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
                          <span className="text-[10px] text-anna-accent font-bold mt-1 inline-block">
                            {p.tracks.length} bài hát
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-xl bg-white/10 group-hover:bg-anna-accent text-white text-xs font-bold transition flex items-center gap-1 flex-shrink-0 shadow-sm"
                        title="Xem danh sách bài"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>Xem list</span>
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
                    onClick={() => handleOrderTrack(track)}
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
