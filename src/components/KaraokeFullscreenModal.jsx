import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  Minimize2,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  SlidersHorizontal,
  Mic2,
  Heart,
  Shuffle,
  Repeat,
  Radio
} from 'lucide-react';
import { DEFAULT_TRACK_THUMB } from '../config';
import BrandLogo from './BrandLogo';

function formatTime(ms) {
  if (!ms || isNaN(ms) || ms < 0) return '0:00';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}

function parseDurationToMs(str) {
  if (!str || str.toLowerCase().includes('live')) return 0;
  const parts = str.split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
  if (parts.length === 2) return (parts[0] * 60 + parts[1]) * 1000;
  return parts[0] * 1000;
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

export default function KaraokeFullscreenModal({
  isOpen,
  onClose,
  player,
  lyricsData,
  activeLineIdx = -1,
  onLineClick,
  onAction,
  manualOffsetMs = 0,
  onUpdateOffset,
  lyricsSourceInfo,
}) {
  const current = player?.current;
  const isPlaying = player?.isPlaying && !player?.isPaused;
  const totalMs = parseDurationToMs(current?.duration);

  const [fontSize, setFontSize] = useState('md'); // 'md' | 'lg'
  const [autoScroll, setAutoScroll] = useState(() => localStorage.getItem('anna_karaoke_autoscroll') !== 'false');
  const [showOffsetBar, setShowOffsetBar] = useState(false);

  useEffect(() => {
    const handleAutoScrollChange = (e) => {
      if (typeof e.detail === 'boolean') {
        setAutoScroll(e.detail);
      }
    };
    window.addEventListener('anna_autoscroll_change', handleAutoScrollChange);
    return () => window.removeEventListener('anna_autoscroll_change', handleAutoScrollChange);
  }, []);

  // Tiến trình phát realtime
  const [localProgressMs, setLocalProgressMs] = useState(0);
  const [isDraggingSeek, setIsDraggingSeek] = useState(false);
  const [dragSeekMs, setDragSeekMs] = useState(0);
  const [localVolume, setLocalVolume] = useState(player?.volume ?? 80);
  const [prevVolume, setPrevVolume] = useState(80);
  const [heartPopping, setHeartPopping] = useState(false);

  // Hiệu ứng vung cần kim khi đổi bài hoặc play/pause
  const [wasPlaying, setWasPlaying] = useState(isPlaying);
  const [lastTrackId, setLastTrackId] = useState(current?.title);
  const [isSwinging, setIsSwinging] = useState(false);

  const scrollRef = useRef(null);
  const activeLineRef = useRef(null);
  const progressBarRef = useRef(null);
  const animFrameRef = useRef(null);
  const lastSpaceRef = useRef(0);
  const lastSeekTimeRef = useRef(0);
  const progressBaseRef = useRef({ baseMs: 0, snapshotAt: 0, playing: false });

  // Khóa cuộn trang khi modal mở
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Đồng bộ âm lượng
  useEffect(() => {
    if (player?.volume !== undefined) setLocalVolume(player.volume);
  }, [player?.volume]);

  // Vung cần kim cơ học khi đổi bài / đổi trạng thái phát
  useEffect(() => {
    const playChanged = wasPlaying !== isPlaying;
    const trackChanged = lastTrackId !== current?.title;
    if (trackChanged) {
      setLocalProgressMs(0);
      progressBaseRef.current = { baseMs: 0, snapshotAt: Date.now(), playing: isPlaying };
      scrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    }
    if (playChanged || trackChanged) {
      setWasPlaying(isPlaying);
      setLastTrackId(current?.title);
      setIsSwinging(true);
      const timer = setTimeout(() => setIsSwinging(false), 950);
      return () => clearTimeout(timer);
    }
  }, [isPlaying, wasPlaying, current?.title, lastTrackId]);

  // Đồng bộ mốc thời gian từ server poll
  useEffect(() => {
    if (Date.now() - lastSeekTimeRef.current < 1800) return;

    let baseMs = 0;
    if (typeof current?.playbackDurationMs === 'number' && typeof current?.serverTime === 'number') {
      const networkDelay = Math.max(0, Date.now() - current.serverTime);
      baseMs = current.playbackDurationMs + (isPlaying ? networkDelay : 0);
    } else if (current?.startTime) {
      baseMs = isPlaying ? Math.max(0, Date.now() - current.startTime) : 0;
    }
    progressBaseRef.current = { baseMs, snapshotAt: Date.now(), playing: isPlaying };
    if (!isDraggingSeek) setLocalProgressMs(Math.min(baseMs, totalMs || Infinity));
  }, [current?.title, current?.playbackDurationMs, current?.serverTime, current?.startTime, isPlaying]);

  // Vòng lặp cập nhật tiến trình liên tục bằng requestAnimationFrame
  useEffect(() => {
    if (!isOpen) return;

    let lastTick = 0;
    const tick = (now) => {
      if (now - lastTick >= 250) {
        lastTick = now;
        if (!isDraggingSeek) {
          const { baseMs, snapshotAt, playing } = progressBaseRef.current;
          const elapsed = playing ? Math.max(0, Date.now() - snapshotAt) : 0;
          const computed = Math.min(baseMs + elapsed, totalMs || Infinity);
          setLocalProgressMs(computed);
        }
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isOpen, totalMs, isDraggingSeek]);

  // Tính toán câu hát đang phát khớp với timeline
  const currentDisplayMs = isDraggingSeek ? dragSeekMs : localProgressMs;
  const effectiveTimeMs = currentDisplayMs + manualOffsetMs;

  let computedActiveIdx = -1;
  const syncedList = lyricsData?.lines?.length ? lyricsData.lines : (lyricsData?.syncedLyrics || []);
  if (syncedList.length > 0) {
    for (let i = 0; i < syncedList.length; i++) {
      const lt = syncedList[i].timeMs ?? syncedList[i].time ?? 0;
      if (effectiveTimeMs >= lt) computedActiveIdx = i;
      else break;
    }
  }
  const currentActiveIdx = computedActiveIdx !== -1 ? computedActiveIdx : activeLineIdx;

  // Tự động cuộn căn giữa câu đang hát
  useEffect(() => {
    if (!autoScroll || !scrollRef.current) return;
    if (currentActiveIdx <= 0) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (activeLineRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const target = activeLineRef.current;
      const desiredScrollTop = target.offsetTop - (container.clientHeight / 2) + (target.offsetHeight / 2);
      container.scrollTo({
        top: Math.max(0, desiredScrollTop),
        behavior: 'smooth',
      });
    }
  }, [currentActiveIdx, autoScroll]);

  // Phím tắt bàn phím
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      } else if (e.code === 'Space') {
        e.preventDefault();
        const now = Date.now();
        if (now - lastSpaceRef.current < 350) return;
        lastSpaceRef.current = now;
        onAction?.(isPlaying ? 'pause' : 'resume');
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (totalMs > 0) {
          const newPos = Math.max(0, localProgressMs - 5000);
          progressBaseRef.current = { baseMs: newPos, snapshotAt: Date.now(), playing: isPlaying };
          setLocalProgressMs(newPos);
          onAction?.('seek', Math.floor(newPos / 1000));
        }
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (totalMs > 0) {
          const newPos = Math.min(totalMs, localProgressMs + 5000);
          progressBaseRef.current = { baseMs: newPos, snapshotAt: Date.now(), playing: isPlaying };
          setLocalProgressMs(newPos);
          onAction?.('seek', Math.floor(newPos / 1000));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onAction, isPlaying, totalMs, localProgressMs]);

  if (!isOpen) return null;

  const percent = totalMs > 0 ? Math.min(100, Math.max(0, (currentDisplayMs / totalMs) * 100)) : 0;
  const hasSynced = syncedList.length > 0;
  const isYtCc = lyricsData?.source === 'youtube_cc';
  const isFav = Boolean(player?.favorites?.some(f =>
    (f.url && current?.url && f.url === current?.url) ||
    (f.title && current?.title && f.title.toLowerCase().trim() === current?.title.toLowerCase().trim())
  ));
  const loopMode = player?.loop || player?.loopMode || 'off';
  const isLofiCurrent = Boolean(player?.current && (player?.current?.is247 || player?.current?.requestedBy === 'Auto (24/7)')) || Boolean(player?.mode247 && !player?.current);
  const isShuffle = Boolean(player?.shuffle);

  // Góc cần kim đĩa than realtime chuẩn
  const tonearmAngle = (isPlaying || isDraggingSeek) ? (16.5 + (percent / 100) * 17) : -24;
  const tonearmTransition = isSwinging
    ? 'transform 0.9s cubic-bezier(0.34, 1.25, 0.64, 1)'
    : isDraggingSeek
    ? 'transform 0.08s ease-out'
    : 'transform 1s linear';

  const coverUrl = getTrackThumb(current);

  const handleSeekMouseDown = (e) => {
    if (!progressBarRef.current || totalMs <= 0) return;
    setIsDraggingSeek(true);
    const rect = progressBarRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setDragSeekMs(Math.floor(ratio * totalMs));

    const onMove = (me) => {
      const r = progressBarRef.current?.getBoundingClientRect();
      if (!r) return;
      const p = Math.max(0, Math.min(1, (me.clientX - r.left) / r.width));
      setDragSeekMs(Math.floor(p * totalMs));
    };
    const onUp = (me) => {
      const r = progressBarRef.current?.getBoundingClientRect();
      const p = r ? Math.max(0, Math.min(1, (me.clientX - r.left) / r.width)) : ratio;
      const targetMs = Math.floor(p * totalMs);
      lastSeekTimeRef.current = Date.now();
      progressBaseRef.current = { baseMs: targetMs, snapshotAt: Date.now(), playing: isPlaying };
      setLocalProgressMs(targetMs);
      onAction?.('seek', Math.floor(targetMs / 1000));
      setIsDraggingSeek(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleToggleMute = () => {
    if (localVolume > 0) {
      setPrevVolume(localVolume);
      setLocalVolume(0);
      onAction?.('volume', 0);
    } else {
      const restored = prevVolume || 80;
      setLocalVolume(restored);
      onAction?.('volume', restored);
    }
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[999999] bg-[#0c0e12] text-on-surface font-body flex flex-col overflow-hidden select-none">
      
      {/* ── 1. AMBIENT BLURRED COVER BACKGROUND ───────────────────────────────── */}
      {coverUrl && (
        <div
          className="absolute -inset-10 bg-cover bg-center filter blur-3xl opacity-20 pointer-events-none scale-125 transition-all duration-1000"
          style={{ backgroundImage: `url(${coverUrl})` }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0c0e12]/80 via-[#0c0e12]/95 to-[#0c0e12] pointer-events-none" />

      {/* ── 2. TOP HEADER ─────────────────────────────────────────────────────── */}
      <header className="relative z-20 h-14 sm:h-16 px-4 sm:px-6 flex items-center justify-between border-b border-white/5 backdrop-blur-xl bg-surface-container-low/80 shrink-0">
        {/* Left: Brand & Source Badge */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <BrandLogo size="sm" showSubtext={false} />
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-primary-container/15 text-primary-container tracking-wider uppercase border border-primary-container/20">
              KARAOKE
            </span>
          </div>

          {lyricsSourceInfo && (
            <span
              className="hidden md:inline-flex items-center font-mono text-[9px] px-2 py-0.5 rounded border font-semibold"
              style={{
                color: lyricsSourceInfo.color || '#e8c977',
                background: lyricsSourceInfo.bg || 'rgba(232,201,119,0.1)',
                borderColor: lyricsSourceInfo.border || 'rgba(232,201,119,0.25)',
              }}
            >
              {(lyricsSourceInfo.text || '').replace(/^NGUỒN:\s*/i, 'LỜI: ')}
            </span>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Cỡ chữ A / A+ */}
          <div className="flex items-center bg-surface-container rounded-lg border border-white/5 p-0.5">
            <button
              onClick={() => setFontSize('md')}
              className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-colors ${
                fontSize === 'md' ? 'bg-primary-container text-on-primary' : 'text-outline hover:text-on-surface'
              }`}
              title="Cỡ chữ vừa"
            >
              A
            </button>
            <button
              onClick={() => setFontSize('lg')}
              className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-colors ${
                fontSize === 'lg' ? 'bg-primary-container text-on-primary' : 'text-outline hover:text-on-surface'
              }`}
              title="Cỡ chữ lớn"
            >
              A+
            </button>
          </div>

          {/* Bù trễ */}
          {hasSynced && (
            <button
              onClick={() => setShowOffsetBar(p => !p)}
              className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-mono font-semibold flex items-center gap-1.5 transition-all ${
                showOffsetBar
                  ? 'bg-primary-container/20 border-primary-container/40 text-primary-container'
                  : 'bg-surface-container border-white/5 text-outline hover:text-on-surface'
              }`}
              title="Cân chỉnh bù trễ lời bài hát"
            >
              <SlidersHorizontal size={12} />
              <span>{manualOffsetMs !== 0 ? `${manualOffsetMs > 0 ? '+' : ''}${(manualOffsetMs / 1000).toFixed(1)}s` : 'BÙ TRỄ'}</span>
            </button>
          )}

          {/* Tự cuộn */}
          {hasSynced && (
            <button
              onClick={() => {
                const next = !autoScroll;
                setAutoScroll(next);
                localStorage.setItem('anna_karaoke_autoscroll', String(next));
                window.dispatchEvent(new CustomEvent('anna_autoscroll_change', { detail: next }));
              }}
              className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-mono font-semibold transition-all hidden sm:inline-flex ${
                autoScroll
                  ? 'bg-surface-container border-white/5 text-tertiary'
                  : 'bg-surface-container border-white/5 text-outline hover:text-on-surface'
              }`}
            >
              {autoScroll ? 'TỰ CUỘN: BẬT' : 'TỰ CUỘN: TẮT'}
            </button>
          )}

          {/* Nút thoát ESC */}
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-secondary/15 hover:bg-secondary/25 text-secondary border border-secondary/30 text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all active:scale-95"
            data-tip="Thoát toàn màn hình (ESC)"
          >
            <Minimize2 size={12} />
            <span>THOÁT (ESC)</span>
          </button>
        </div>
      </header>

      {/* ── 3. SUB-BAR: BÙ TRỄ LỜI BÀI HÁT ────────────────────────────────────── */}
      {showOffsetBar && hasSynced && (
        <div className="relative z-20 bg-surface-container px-4 py-2 flex items-center justify-center gap-1.5 flex-wrap border-b border-white/5 text-[10px] font-mono">
          <span className="text-outline mr-1">BÙ TRỄ:</span>
          {[-5000, -2000, -1000, -250].map((ms) => (
            <button
              key={ms}
              onClick={() => onUpdateOffset?.(manualOffsetMs + ms)}
              className="px-2 py-1 rounded bg-surface-container-high hover:bg-surface-container-highest border border-white/5 text-on-surface"
            >
              {ms / 1000}s
            </button>
          ))}
          <button
            onClick={() => onUpdateOffset?.(0)}
            className="px-2.5 py-1 rounded bg-primary-container/20 border border-primary-container/40 text-primary-container font-bold"
          >
            RESET
          </button>
          {[250, 1000, 2000, 5000].map((ms) => (
            <button
              key={ms}
              onClick={() => onUpdateOffset?.(manualOffsetMs + ms)}
              className="px-2 py-1 rounded bg-surface-container-high hover:bg-surface-container-highest border border-white/5 text-on-surface"
            >
              +{ms / 1000}s
            </button>
          ))}
        </div>
      )}

      {/* ── 4. MAIN BODY (LAYOUT 2 CỘT ZERO-SCROLL) ───────────────────────────── */}
      <main className="relative z-10 flex-1 min-h-0 flex flex-col md:flex-row items-stretch overflow-hidden">
        
        {/* CỘT TRÁI: MÂM ĐĨA THAN VINTAGE & CÂY KIM REALTIME (Đồng bộ HeroPlayer) */}
        <div className="w-full md:w-[360px] lg:w-[420px] shrink-0 border-b md:border-b-0 md:border-r border-white/5 bg-surface-container-lowest/70 backdrop-blur-md p-4 sm:p-6 flex flex-col items-center justify-center gap-4 select-none">
          
          {/* Deck đĩa than & Cần kim cơ học SVG */}
          <div className="vinyl-deck relative my-auto select-none scale-90 sm:scale-100 lg:scale-110">
            {/* Cây kim đĩa than realtime */}
            <div
              className={`tonearm-assembly ${isPlaying ? 'on-record' : ''}`}
              style={{
                transform: `rotate(${tonearmAngle}deg)`,
                transition: tonearmTransition,
              }}
              title={isPlaying ? `Kim đĩa than: ${Math.round(percent)}% bài hát` : 'Kim đĩa than ở vị trí nghỉ'}
              aria-hidden="true"
            >
              <svg
                className="tonearm-svg"
                viewBox="0 0 76 210"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="kara_vintageBrass" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#fffaea" />
                    <stop offset="25%" stopColor="#e5c178" />
                    <stop offset="55%" stopColor="#a07832" />
                    <stop offset="85%" stopColor="#634714" />
                    <stop offset="100%" stopColor="#96702c" />
                  </linearGradient>

                  <radialGradient id="kara_baseMetal" cx="35%" cy="35%" r="65%">
                    <stop offset="0%" stopColor="#525866" />
                    <stop offset="45%" stopColor="#2e323b" />
                    <stop offset="80%" stopColor="#181a1f" />
                    <stop offset="100%" stopColor="#0f1013" />
                  </radialGradient>

                  <linearGradient id="kara_counterweightMetal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#544018" />
                    <stop offset="20%" stopColor="#d8b265" />
                    <stop offset="45%" stopColor="#fffaeb" />
                    <stop offset="65%" stopColor="#ad822e" />
                    <stop offset="90%" stopColor="#4a3610" />
                    <stop offset="100%" stopColor="#7a581e" />
                  </linearGradient>

                  <linearGradient id="kara_cartridgeGold" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#f3d082" />
                    <stop offset="50%" stopColor="#9c7229" />
                    <stop offset="100%" stopColor="#3d2a0a" />
                  </linearGradient>
                </defs>

                {/* Quả đối trọng kim loại */}
                <rect x="27" y="6" width="22" height="15" rx="3" fill="url(#kara_counterweightMetal)" stroke="#221808" strokeWidth="0.8" />
                <line x1="27" y1="10" x2="49" y2="10" stroke="#1c1404" strokeWidth="0.8" />
                <line x1="27" y1="13.5" x2="49" y2="13.5" stroke="#fffaea" strokeWidth="0.5" opacity="0.6" />
                <line x1="27" y1="17" x2="49" y2="17" stroke="#1c1404" strokeWidth="0.8" />

                {/* Trục nối sau */}
                <rect x="36" y="19" width="4" height="12" rx="1.5" fill="url(#kara_vintageBrass)" />

                {/* Bệ gimbal cơ khí cổ điển */}
                <circle cx="38" cy="40" r="19" fill="url(#kara_baseMetal)" stroke="#666c78" strokeWidth="1.2" />
                <circle cx="38" cy="40" r="15" fill="#15171b" stroke="#363a42" strokeWidth="0.8" />
                <circle cx="38" cy="40" r="9" fill="url(#kara_vintageBrass)" stroke="#3a2b10" strokeWidth="0.8" />
                <circle cx="38" cy="40" r="4.5" fill="#2a1f0a" />
                <circle cx="37" cy="39" r="1.8" fill="#fff5d6" opacity="0.85" />

                {/* Cần kim cong chữ S vintage */}
                <path
                  d="M38 48 Q38 78 35 102 Q32 130 39 155 L42 174"
                  fill="none"
                  stroke="rgba(0,0,0,0.5)"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                />
                <path
                  d="M38 48 Q38 78 35 102 Q32 130 39 155 L42 174"
                  fill="none"
                  stroke="url(#kara_vintageBrass)"
                  strokeWidth="3.6"
                  strokeLinecap="round"
                />
                <path
                  d="M37.3 49 Q37.3 78 34.3 102 Q31.3 130 38.3 155 L41.3 173"
                  fill="none"
                  stroke="#fffef7"
                  strokeWidth="0.8"
                  opacity="0.65"
                  strokeLinecap="round"
                />

                {/* Khuyên gắn máng kim */}
                <rect x="39" y="171" width="6" height="5" rx="1" transform="rotate(-6 42 174)" fill="url(#kara_counterweightMetal)" stroke="#1a1407" strokeWidth="0.5" />

                {/* Máng kim cổ điển */}
                <g transform="rotate(-14 42 178)">
                  <path d="M37 175 L47 175 L46 200 L38 200 Z" fill="#181a1e" stroke="url(#kara_vintageBrass)" strokeWidth="1.2" />
                  <path d="M47 179 C51 179 53 184 50 189" fill="none" stroke="url(#kara_vintageBrass)" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="40" y1="181" x2="44" y2="181" stroke="#33373f" strokeWidth="1" strokeLinecap="round" />
                  <line x1="40" y1="185" x2="44" y2="185" stroke="#33373f" strokeWidth="1" strokeLinecap="round" />
                  <line x1="40" y1="189" x2="44" y2="189" stroke="#33373f" strokeWidth="1" strokeLinecap="round" />
                  <rect x="38.5" y="193" width="7" height="6" rx="1" fill="url(#kara_cartridgeGold)" stroke="#221808" strokeWidth="0.5" />
                  <line x1="42" y1="200" x2="42" y2="206" stroke="#e0e4eb" strokeWidth="1.2" strokeLinecap="round" />
                  <circle cx="42" cy="206" r="1.1" fill="#ff4d4d" />
                </g>
              </svg>
            </div>

            {/* Đĩa than vân rãnh xoay tròn */}
            <div
              className={`vinyl-wrap ${isPlaying ? 'spinning' : current ? 'spinning-paused' : ''}`}
              onClick={() => onAction?.(isPlaying ? 'pause' : 'resume')}
              data-tip={isPlaying ? 'Nhấn để tạm dừng' : 'Nhấn để phát'}
            >
              <div className="vinyl-grooves" />
              <div className="vinyl-art">
                <img
                  src={coverUrl}
                  alt={current?.title || 'Album Art'}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/default-playlist.jpg'; }}
                />
                <div className="vinyl-spindle-hole">
                  <div className="spindle-dot" />
                </div>
              </div>
            </div>
          </div>

          {/* Thông tin bài hát dưới mâm đĩa */}
          <div
            className="w-full max-w-xs text-center flex flex-col items-center gap-1 shrink-0 cursor-default"
            data-tip={current?.title ? `${current.title}${current.artist ? ` • ${current.artist}` : ''}` : undefined}
          >
            <h2
              className="text-sm sm:text-base font-bold text-on-surface line-clamp-2 leading-snug"
            >
              {isLofiCurrent ? '24/7 Lofi Thư Giãn' : (current?.title || 'Chưa có bài hát')}
            </h2>
            <p
              className="text-xs text-primary-container font-medium truncate max-w-full"
            >
              {isLofiCurrent ? 'Nhạc nền tự động 24/7' : (current?.artist || 'Anna Music')}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-tertiary animate-pulse' : 'bg-outline'}`} />
              <span className="font-mono text-[10px] text-outline uppercase tracking-wider">
                {isPlaying ? 'ĐANG PHÁT' : 'TẠM DỪNG'}
              </span>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: LỜI BÀI HÁT KARAOKE CUỘN MƯỢT MÀ */}
        <div
          ref={scrollRef}
          className="flex-1 h-full overflow-y-auto custom-scroll p-4 sm:p-8 flex flex-col items-center justify-start scroll-smooth"
        >
          {hasSynced ? (
            <div className="w-full max-w-2xl py-[30vh] flex flex-col items-center gap-3">
              {syncedList.map((line, i) => {
                const isActive = i === currentActiveIdx;
                const isPassed = i < currentActiveIdx;
                const timeMs = line.time ?? line.timeMs ?? 0;

                const baseClass = fontSize === 'lg' ? 'text-base sm:text-xl' : 'text-sm sm:text-base';
                const activeClass = fontSize === 'lg' ? 'text-xl sm:text-3xl font-extrabold' : 'text-lg sm:text-2xl font-bold';

                return (
                  <div
                    key={i}
                    ref={isActive ? activeLineRef : null}
                    onClick={() => {
                      if (onLineClick) {
                        onLineClick(timeMs);
                      } else if (onAction && timeMs >= 0) {
                        const sec = Math.max(0, Math.floor(timeMs / 1000));
                        lastSeekTimeRef.current = Date.now();
                        progressBaseRef.current = { baseMs: timeMs, snapshotAt: Date.now(), playing: isPlaying };
                        setLocalProgressMs(timeMs);
                        onAction('seek', sec);
                      }
                    }}
                    title={timeMs > 0 ? `Nhảy tới ${formatTime(timeMs)}` : undefined}
                    className={`w-full max-w-xl text-center px-4 py-2.5 rounded-2xl cursor-pointer transition-all duration-300 ${
                      isActive
                        ? `${activeClass} text-primary-container bg-surface-container/80 border border-primary-container/30 shadow-lg scale-[1.02]`
                        : isPassed
                        ? `${baseClass} text-on-surface/40 hover:text-on-surface/70`
                        : `${baseClass} text-on-surface/20 hover:text-on-surface/50`
                    }`}
                  >
                    {line.text}
                  </div>
                );
              })}
            </div>
          ) : lyricsData?.plainLyrics || lyricsData?.lyrics ? (
            <div className="w-full max-w-xl py-12 text-center">
              <div className="inline-block px-3 py-1 rounded-full bg-surface-container border border-white/5 font-mono text-[10px] text-primary-container font-semibold uppercase mb-6">
                LỜI BÀI HÁT TĨNH
              </div>
              <p className="text-sm sm:text-base text-on-surface/80 leading-loose whitespace-pre-line font-body select-text">
                {lyricsData.plainLyrics || lyricsData.lyrics}
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 my-auto">
              <div className="w-14 h-14 rounded-2xl bg-surface-container flex items-center justify-center text-primary-container/60 mb-3 border border-white/5">
                <Mic2 size={28} />
              </div>
              <h3 className="text-base font-bold text-on-surface mb-1">Chưa có lời bài hát</h3>
              <p className="text-xs text-outline max-w-xs">
                Thư giãn và thưởng thức giai điệu cùng mâm đĩa than vintage Anna Music.
              </p>
            </div>
          )}
        </div>

      </main>

      {/* ── 5. FOOTER CONTROL BAR (ĐỒNG BỘ ĐIỀU KHIỂN HOÀN CHỈNH) ─────────────── */}
      <footer className="relative z-30 bg-surface-container-low/95 backdrop-blur-xl border-t border-white/5 px-4 sm:px-6 py-2.5 sm:py-3 flex flex-col gap-2 shrink-0">
        
        {/* Seek Bar Row */}
        <div className="w-full max-w-4xl mx-auto flex items-center gap-3">
          <span className="font-mono text-[10px] text-primary-container w-10 text-right shrink-0">
            {formatTime(currentDisplayMs)}
          </span>

          <div
            ref={progressBarRef}
            onMouseDown={handleSeekMouseDown}
            className="flex-1 h-2 bg-surface-container-highest rounded-full cursor-pointer relative group flex items-center"
            role="slider"
            aria-valuemin={0}
            aria-valuemax={Math.floor(totalMs / 1000)}
            aria-valuenow={Math.floor(currentDisplayMs / 1000)}
          >
            <div
              className="h-full bg-primary-container rounded-full relative transition-all"
              style={{ width: `${percent}%` }}
            >
              <div
                className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 rounded-full bg-inverse-surface shadow transition-opacity ${
                  isDraggingSeek ? 'opacity-100 scale-110' : 'opacity-0 group-hover:opacity-100'
                }`}
              />
            </div>
          </div>

          <span className="font-mono text-[10px] text-outline w-10 shrink-0">
            {current?.duration || '0:00'}
          </span>
        </div>

        {/* Controls Row */}
        <div className="w-full max-w-4xl mx-auto flex items-center justify-between gap-2">
          
          {/* Left: Favorite & Requester */}
          <div className="flex items-center gap-2 min-w-0 w-36 sm:w-48">
            <button
              onClick={() => {
                if (!current) return;
                setHeartPopping(true);
                setTimeout(() => setHeartPopping(false), 300);
                onAction?.('toggleFavorite', current);
              }}
              disabled={!current}
              className={`p-2 rounded-xl transition-all active:scale-90 ${
                isFav ? 'text-secondary bg-secondary/10' : 'text-outline hover:text-on-surface'
              } ${heartPopping ? 'scale-125' : ''}`}
              title={isFav ? 'Bỏ thích' : 'Thêm vào yêu thích'}
            >
              <Heart size={18} fill={isFav ? 'currentColor' : 'none'} />
            </button>

            {current?.requestedBy && (
              <span className="hidden sm:inline-block font-mono text-[10px] text-outline truncate max-w-[120px]">
                {current.requestedBy.replace(/^<@!?\d+>$/, 'Discord User')}
              </span>
            )}
          </div>

          {/* Center: Playback Transport Buttons */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <button
              onClick={() => onAction?.('shuffle')}
              className={`p-2 rounded-xl transition-colors ${
                isShuffle ? 'text-primary-container bg-primary-container/10' : 'text-outline hover:text-on-surface'
              }`}
              title="Xáo trộn bài hát"
            >
              <Shuffle size={18} />
            </button>

            <button
              onClick={() => onAction?.('previous')}
              className="p-2 rounded-xl text-outline hover:text-on-surface transition-colors active:scale-95"
              title="Bài trước đó"
            >
              <SkipBack size={20} />
            </button>

            <button
              onClick={() => onAction?.(isPlaying ? 'pause' : 'resume')}
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-primary-container hover:bg-primary text-on-primary flex items-center justify-center transition-all active:scale-95 shadow-md"
              title={isPlaying ? 'Tạm dừng (Space)' : 'Phát nhạc (Space)'}
            >
              {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" className="ml-0.5" />}
            </button>

            <button
              onClick={() => onAction?.('skip')}
              className="p-2 rounded-xl text-outline hover:text-on-surface transition-colors active:scale-95"
              title="Bài kế tiếp"
            >
              <SkipForward size={20} />
            </button>

            <button
              onClick={() => !isLofiCurrent && onAction?.('loop')}
              disabled={isLofiCurrent}
              className={`p-2 rounded-xl relative transition-colors ${
                loopMode !== 'off' ? 'text-primary-container bg-primary-container/10' : 'text-outline hover:text-on-surface'
              }`}
              title={`Lặp lại: ${loopMode}`}
            >
              <Repeat size={18} />
              {loopMode === 'song' && (
                <span className="absolute top-1 right-1 font-mono text-[8px] bg-primary-container text-on-primary font-bold px-1 rounded-full">
                  1
                </span>
              )}
              {loopMode === 'queue' && (
                <span className="absolute top-1 right-1 font-mono text-[8px] bg-secondary text-white font-bold px-1 rounded-full">
                  ∞
                </span>
              )}
            </button>
          </div>

          {/* Right: Volume Slider */}
          <div className="flex items-center gap-1.5 sm:gap-2 justify-end w-36 sm:w-48">
            <button onClick={handleToggleMute} className="text-outline hover:text-on-surface p-1">
              {localVolume === 0 ? <VolumeX size={16} className="text-secondary" /> : <Volume2 size={16} />}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={localVolume}
              onChange={(e) => {
                const v = Number(e.target.value);
                setLocalVolume(v);
                onAction?.('volume', v);
              }}
              className="w-16 sm:w-24 h-1 bg-surface-container-highest rounded-full cursor-pointer accent-primary-container"
              aria-label="Âm lượng"
            />
            <span className="font-mono text-[9px] text-outline w-6 text-right hidden sm:inline-block">
              {localVolume}%
            </span>
          </div>

        </div>

      </footer>

    </div>,
    document.body
  );
}
