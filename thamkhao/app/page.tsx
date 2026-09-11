'use client'

import { useMemo, useState } from 'react'
import {
  BarChart3,
  ChevronDown,
  Clock3,
  Heart,
  Home,
  ListMusic,
  Menu,
  MoreHorizontal,
  Pause,
  Play,
  Repeat2,
  Search,
  Settings2,
  Shuffle,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Volume2,
  X,
} from 'lucide-react'

const songs = [
  { title: 'Bước Qua Mùa Cô Đơn', artist: 'Vũ.', album: 'Một Vạn Năm', time: '04:18', color: 'from-[#e8a66b] to-[#8e4747]' },
  { title: 'Lạ Lùng', artist: 'Vũ.', album: 'Vũ Trụ Song Song', time: '04:13', color: 'from-[#c8b89e] to-[#4a575b]' },
  { title: 'Chuyện Rằng', artist: 'Thịnh Suy', album: 'The First', time: '03:52', color: 'from-[#7e9b91] to-[#253b48]' },
  { title: 'Nàng Thơ', artist: 'Hoàng Dũng', album: 'Yên', time: '04:24', color: 'from-[#d98d78] to-[#4a3344]' },
  { title: 'Có Em Đời Bỗng Vui', artist: 'Chillies', album: 'Qua Khung Cửa Sổ', time: '03:45', color: 'from-[#ddb55f] to-[#493d35]' },
]

const tabs = [
  { id: 'discover', label: 'Khám Phá', icon: Home },
  { id: 'queue', label: 'Hàng Chờ', icon: ListMusic },
  { id: 'lyrics', label: 'Lời Bài Hát', icon: BarChart3 },
  { id: 'settings', label: 'Cài Đặt', icon: Settings2 },
]

function Artwork({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`album-art ${compact ? 'album-art-compact' : ''}`} aria-label="Bìa album Một Vạn Năm">
      <div className="album-sun" />
      <div className="album-cloud cloud-one" />
      <div className="album-cloud cloud-two" />
      <div className="album-mountain" />
      <div className="album-copy"><span>MỘT VẠN</span><strong>NĂM</strong><small>VŨ.</small></div>
    </div>
  )
}

export default function Page() {
  const [activeTab, setActiveTab] = useState('discover')
  const [isPlaying, setIsPlaying] = useState(true)
  const [isFavorite, setIsFavorite] = useState(false)
  const [shuffle, setShuffle] = useState(false)
  const [repeat, setRepeat] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const filtered = useMemo(() => songs.filter((song) => `${song.title} ${song.artist}`.toLowerCase().includes(query.toLowerCase())), [query])

  return (
    <main className="music-app">
      <aside className="rail">
        <div className="brand-mark">a<span>n</span></div>
        <nav className="rail-nav" aria-label="Điều hướng chính">
          {tabs.map(({ id, icon: Icon, label }) => (
            <button key={id} className={`rail-button ${activeTab === id ? 'active' : ''}`} onClick={() => setActiveTab(id)} aria-label={label} aria-pressed={activeTab === id}><Icon size={20} strokeWidth={1.7} /><span>{label}</span></button>
          ))}
        </nav>
        <button className="rail-button rail-help" aria-label="Thêm menu"><MoreHorizontal size={21} /></button>
      </aside>

      <section className="now-playing" data-compact={activeTab !== 'discover'}>
        <header className="topbar"><div className="mobile-brand">anna<span>music</span></div><p>ĐANG PHÁT</p><button className="icon-button" aria-label="Mở thêm tùy chọn"><MoreHorizontal size={20} /></button></header>
        <div className="hero-record">
          <div className={`vinyl ${isPlaying ? 'spinning' : ''}`}><div className="vinyl-grooves" /><Artwork compact /></div>
          <div className="track-meta"><div><p className="eyebrow">MỘT VẠN NĂM · 2022</p><h1>{songs[selected].title}</h1><p className="artist">{songs[selected].artist}</p></div><button className={`favorite ${isFavorite ? 'liked' : ''}`} onClick={() => setIsFavorite(!isFavorite)} aria-label={isFavorite ? 'Bỏ thích' : 'Thích bài hát'}><Heart size={21} fill={isFavorite ? 'currentColor' : 'none'} /></button></div>
          <div className="progress-wrap"><div className="progress-line"><span /></div><div className="time-row"><span>02:14</span><span>{songs[selected].time}</span></div></div>
          <div className="player-controls"><button className={shuffle ? 'control-active' : ''} onClick={() => setShuffle(!shuffle)} aria-label="Trộn bài"><Shuffle size={18} /></button><button aria-label="Bài trước"><SkipBack size={22} fill="currentColor" /></button><button className="play-button" onClick={() => setIsPlaying(!isPlaying)} aria-label={isPlaying ? 'Tạm dừng' : 'Phát'}>{isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}</button><button aria-label="Bài tiếp theo"><SkipForward size={22} fill="currentColor" /></button><button className={repeat ? 'control-active' : ''} onClick={() => setRepeat(!repeat)} aria-label="Lặp lại"><Repeat2 size={18} /></button></div>
        </div>
        <footer className="now-footer"><span>NGHE TRÊN THIẾT BỊ CỦA BẠN</span><div className="volume"><Volume2 size={16} /><div className="volume-line"><span /></div></div></footer>
      </section>

      <section className="content-panel">
        <header className="content-header"><div className="tab-heading"><h2>{tabs.find((tab) => tab.id === activeTab)?.label}</h2><span className="live-dot" /></div><button className="icon-button mobile-menu" aria-label="Mở menu"><Menu size={21} /></button></header>
        {activeTab === 'discover' && <><div className="search-box"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm kiếm bài hát, nghệ sĩ..." aria-label="Tìm kiếm" />{query && <button onClick={() => setQuery('')} aria-label="Xóa tìm kiếm"><X size={16} /></button>}<kbd>⌘ K</kbd></div><div className="section-label"><span>GỢI Ý CHO BẠN</span><button>Tất cả <ChevronDown size={14} /></button></div><div className="queue-list">{filtered.map((song, index) => <button className={`song-row ${selected === index ? 'selected' : ''}`} key={song.title} onClick={() => setSelected(index)}><div className={`thumb ${song.color}`}><span>{index + 1}</span></div><div className="song-info"><strong>{song.title}</strong><span>{song.artist} · {song.album}</span></div><span className="song-time">{song.time}</span><MoreHorizontal size={18} className="row-more" /></button>)}</div></>}
        {activeTab === 'queue' && <div className="empty-state"><ListMusic size={32} /><h3>Hàng chờ của bạn</h3><p>Thêm những bài hát yêu thích để nghe liên tục.</p></div>}
        {activeTab === 'lyrics' && <div className="lyrics"><p className="eyebrow">LỜI BÀI HÁT</p><h3>Bước qua mùa cô đơn</h3><p>Và rồi ta sẽ bước qua mùa cô đơn<br />Để thấy bình minh đang ở phía cuối con đường<br /><br />Một ngày mới lại đến, nhẹ nhàng như chưa từng.</p></div>}
        {activeTab === 'settings' && <div className="settings-list"><div><span>Chất lượng âm thanh</span><strong>Lossless <ChevronDown size={15} /></strong></div><div><span>Phát tự động</span><span className="toggle on" /></div><div><span>Hiển thị lời bài hát</span><span className="toggle" /></div></div>}
        <div className="panel-footer"><span>ANNA MUSIC 2024</span><span>PHIÊN BẢN 1.4.0</span></div>
      </section>
    </main>
  )
}
