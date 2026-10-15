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
  User,
} from 'lucide-react';
import { DEFAULT_TRACK_THUMB } from '../config';

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

export default function KaraokeFullscreenModal({
  isOpen,
  onClose,
  player,
  lyricsData,
  activeLineIdx = -1,
  manualOffsetMs = 0,
  onUpdateOffset,
  onAction,
  lyricsSourceInfo,
}) {
  const current = player?.current;
  const isPlaying = player?.isPlaying && !player?.isPaused;
  const totalMs = parseDurationToMs(current?.duration);

  const [fontSize, setFontSize] = useState('md'); // 'md' | 'lg'
  const [autoScroll, setAutoScroll] = useState(true);
  const [showOffsetBar, setShowOffsetBar] = useState(false);

  // Real-time progress: compute from server data + elapsed time since last poll
  const [localProgressMs, setLocalProgressMs] = useState(0);
  const [isDraggingSeek, setIsDraggingSeek] = useState(false);
  const [dragSeekMs, setDragSeekMs] = useState(0);
  const [localVolume, setLocalVolume] = useState(player?.volume ?? 80);
  const [prevVolume, setPrevVolume] = useState(80);
  const [heartPopping, setHeartPopping] = useState(false);

  const scrollRef = useRef(null);
  const activeLineRef = useRef(null);
  const progressBarRef = useRef(null);
  const animFrameRef = useRef(null);
  const lastSpaceRef = useRef(0);
  const lastSeekTimeRef = useRef(0);
  const progressBaseRef = useRef({ baseMs: 0, snapshotAt: 0, playing: false });

  // Lock body scroll when modal is open to ensure window never moves
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.scrollTo(0, 0);
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Sync volume from player
  useEffect(() => {
    if (player?.volume !== undefined) setLocalVolume(player.volume);
  }, [player?.volume]);

  // Reset scroll and timeline immediately when song changes
  const lastTrackTitleRef = useRef(current?.title);
  useEffect(() => {
    if (current?.title !== lastTrackTitleRef.current) {
      lastTrackTitleRef.current = current?.title;
      lastSeekTimeRef.current = 0;
      progressBaseRef.current = { baseMs: 0, snapshotAt: Date.now(), playing: isPlaying };
      setLocalProgressMs(0);
      scrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [current?.title, isPlaying]);

  // Sync the progress base when player data changes (every server poll)
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

  // 250ms rAF-driven smooth progress ticker
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

  // Real-time active lyric calculation in lockstep with timeline
  const currentDisplayMs = isDraggingSeek ? dragSeekMs : localProgressMs;
  const effectiveTimeMs = currentDisplayMs + manualOffsetMs;
  let computedActiveIdx = -1;
  if (lyricsData?.syncedLyrics?.length) {
    for (let i = 0; i < lyricsData.syncedLyrics.length; i++) {
      const lt = lyricsData.syncedLyrics[i].time ?? lyricsData.syncedLyrics[i].timeMs ?? 0;
      if (effectiveTimeMs >= lt) computedActiveIdx = i;
      else break;
    }
  }

  const currentActiveIdx = computedActiveIdx !== -1 ? computedActiveIdx : activeLineIdx;

  // Auto-scroll to center active lyric line inside container ONLY
  useEffect(() => {
    if (!autoScroll || !scrollRef.current) return;
    if (currentActiveIdx <= 0) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (activeLineRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const target = activeLineRef.current;
      const containerHeight = container.clientHeight;
      const targetTop = target.offsetTop;
      const targetHeight = target.offsetHeight;
      const desiredScrollTop = targetTop - containerHeight / 2 + targetHeight / 2;
      container.scrollTo({
        top: Math.max(0, desiredScrollTop),
        behavior: 'smooth',
      });
    }
  }, [currentActiveIdx, autoScroll]);

  // Keyboard shortcuts
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
  const hasSynced = Boolean(lyricsData?.syncedLyrics?.length > 0);
  const isYtCc = lyricsData?.source === 'youtube_cc';
  const isFav = Boolean(
    player?.favorites?.some(
      (f) =>
        (f.url && current?.url && f.url === current?.url) ||
        (f.title && current?.title && f.title.toLowerCase().trim() === current?.title.toLowerCase().trim())
    )
  );
  const loopMode = player?.loop || player?.loopMode || 'off';
  const isLofiCurrent =
    Boolean(player?.current && (player?.current?.is247 || player?.current?.requestedBy === 'Auto (24/7)')) ||
    Boolean(player?.mode247 && !player?.current);
  const isShuffle = Boolean(player?.shuffle);

  const fontSizes =
    fontSize === 'lg'
      ? { base: 18, active: 28, linePad: '10px 20px' }
      : { base: 15, active: 22, linePad: '8px 16px' };

  const handleSeekClick = (e) => {
    if (!progressBarRef.current || totalMs <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetMs = Math.floor(ratio * totalMs);
    lastSeekTimeRef.current = Date.now();
    progressBaseRef.current = { baseMs: targetMs, snapshotAt: Date.now(), playing: isPlaying };
    setLocalProgressMs(targetMs);
    onAction?.('seek', Math.floor(targetMs / 1000));
  };

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

  const handlePrevious = () => onAction?.('previous');
  const handlePlayPause = () => onAction?.(isPlaying ? 'pause' : 'resume');
  const handleSkip = () => onAction?.('skip');
  const handleVolume = (v) => {
    setLocalVolume(v);
    onAction?.('volume', v);
  };

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[999999] flex flex-col bg-[#09090B] text-zinc-100 font-sans select-none overflow-hidden"
      style={{
        fontFamily: "'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* ── Subtle Zero-CPU Vignette ── */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(234, 88, 12, 0.08), transparent 70%)',
        }}
      />

      {/* ── Studio Header ── */}
      <header className="relative z-20 h-14 px-5 sm:px-6 flex items-center justify-between border-b border-white/[0.07] bg-[#09090B]/95 gap-3">
        {/* Left: Brand + Lyrics Source badge */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-8 h-8 rounded-lg overflow-hidden ring-1 ring-orange-500/30 flex-shrink-0 bg-zinc-900">
            <img src="/logo.gif" alt="Anna Logo" className="w-full h-full object-cover" />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-xs font-bold tracking-wider text-orange-400">
              ANNA KARAOKE
            </span>
            {lyricsSourceInfo && (
              <span className="font-mono text-[10px] tracking-wider px-2 py-0.5 rounded border border-white/10 bg-white/[0.04] text-zinc-400 font-medium truncate max-w-[150px] sm:max-w-[200px]">
                {(lyricsSourceInfo.text || '').replace(/^NGUỒN:\s*/i, 'LỜI: ')}
              </span>
            )}
            {hasSynced && !isYtCc && (
              <span
                className="w-4 h-4 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 font-mono text-[10px] font-bold flex items-center justify-center cursor-help flex-shrink-0"
                title="Lời từ Spotify / Bên thứ ba · Có thể lệch nhẹ so với bản thu âm"
              >
                !
              </span>
            )}
          </div>
        </div>

        {/* Right: Controls & Exit */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Font size toggle */}
          <div className="flex items-center bg-[#141417] border border-white/[0.08] rounded-lg p-0.5">
            {['md', 'lg'].map((size) => (
              <button
                key={size}
                onClick={() => setFontSize(size)}
                className={`px-2.5 py-1 text-xs font-mono font-medium rounded transition-all ${
                  fontSize === size
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title={size === 'md' ? 'Cỡ chữ chuẩn' : 'Cỡ chữ phóng to'}
              >
                {size === 'md' ? 'A' : 'A+'}
              </button>
            ))}
          </div>

          {/* Offset calibration button */}
          {hasSynced && (
            <button
              onClick={() => setShowOffsetBar((p) => !p)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-all ${
                showOffsetBar
                  ? 'bg-orange-500/15 border-orange-500/40 text-orange-400'
                  : 'bg-[#141417] border-white/[0.08] text-zinc-300 hover:bg-[#1A1A1F]'
              }`}
              title="Cân chỉnh độ trễ đồng bộ lời"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>
                {manualOffsetMs !== 0
                  ? `${manualOffsetMs > 0 ? '+' : ''}${(manualOffsetMs / 1000).toFixed(1)}s`
                  : 'BÙ TRỄ'}
              </span>
            </button>
          )}

          {/* Auto scroll toggle */}
          {hasSynced && (
            <button
              onClick={() => setAutoScroll((p) => !p)}
              className={`hidden sm:flex items-center px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-all ${
                autoScroll
                  ? 'bg-orange-500/15 border-orange-500/40 text-orange-400'
                  : 'bg-[#141417] border-white/[0.08] text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {autoScroll ? 'TỰ CUỘN: BẬT' : 'TỰ CUỘN: TẮT'}
            </button>
          )}

          {/* Exit button */}
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 border border-white/[0.1] text-zinc-200 text-xs font-mono font-medium transition-all"
            title="Đóng toàn màn hình (ESC)"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ESC</span>
          </button>
        </div>
      </header>

      {/* ── Offset Calibration Sub-bar ── */}
      {showOffsetBar && hasSynced && (
        <div className="relative z-20 bg-[#111113] border-b border-white/[0.07] px-4 py-2 flex items-center justify-center gap-1.5 flex-wrap">
          <span className="font-mono text-xs text-zinc-400 mr-2">BÙ TRỄ ĐỒNG BỘ:</span>
          {[-5000, -2000, -1000, -250].map((ms) => (
            <button
              key={ms}
              onClick={() => onUpdateOffset?.(manualOffsetMs + ms)}
              className="px-2 py-1 rounded bg-[#16161A] hover:bg-[#202026] border border-white/[0.08] text-zinc-300 text-xs font-mono transition"
            >
              {ms > 0 ? `+${ms / 1000}s` : `${ms / 1000}s`}
            </button>
          ))}
          <button
            onClick={() => onUpdateOffset?.(0)}
            className="px-3 py-1 rounded bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-400 text-xs font-mono font-bold transition"
          >
            MẶC ĐỊNH
          </button>
          {[250, 1000, 2000, 5000].map((ms) => (
            <button
              key={ms}
              onClick={() => onUpdateOffset?.(manualOffsetMs + ms)}
              className="px-2 py-1 rounded bg-[#16161A] hover:bg-[#202026] border border-white/[0.08] text-zinc-300 text-xs font-mono transition"
            >
              {ms > 0 ? `+${ms / 1000}s` : `${ms / 1000}s`}
            </button>
          ))}
        </div>
      )}

      {/* ── Main Studio Stage ── */}
      <main className="relative z-10 flex-1 min-h-0 flex items-stretch overflow-hidden">
        {/* Left: Modern Square Album Frame (Zero-GPU Lag) */}
        <div className="w-[280px] lg:w-[360px] hidden md:flex flex-col items-center justify-center p-6 border-r border-white/[0.07] bg-[#0C0C0E]/70 gap-5">
          <div className="w-56 h-56 lg:w-64 lg:h-64 rounded-2xl overflow-hidden border border-white/[0.1] shadow-2xl bg-zinc-900 relative group flex-shrink-0">
            <img
              src={current?.thumbnail || DEFAULT_TRACK_THUMB}
              alt={current?.title || 'Album Art'}
              className="w-full h-full object-cover"
            />
            {isPlaying && (
              <div className="absolute top-3 right-3 px-2 py-1 rounded-md bg-black/75 backdrop-blur-sm border border-white/10 flex items-center gap-1.5 shadow-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono text-[10px] font-bold text-zinc-200 tracking-wider">LIVE</span>
              </div>
            )}
          </div>

          <div className="text-center w-full px-2 max-w-[280px]">
            <h2
              className="text-base lg:text-lg font-bold text-zinc-100 line-clamp-2 leading-snug"
              title={current?.title}
            >
              {isLofiCurrent ? '24/7 Lofi Thư Giãn' : current?.title || 'Chưa có bài hát'}
            </h2>
            <p className="text-xs lg:text-sm font-medium text-zinc-400 truncate mt-1">
              {isLofiCurrent
                ? 'Chế độ phát nền 24/7'
                : current?.artist && current.artist !== 'Unknown'
                ? current.artist
                : 'Anna Music'}
            </p>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08]">
            <span
              className={`w-2 h-2 rounded-full ${
                isPlaying ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-zinc-500'
              }`}
            />
            <span className="font-mono text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
              {isPlaying ? 'Đang phát' : 'Tạm dừng'}
            </span>
          </div>
        </div>

        {/* Right: Lyrics Area */}
        <div
          ref={scrollRef}
          className="relative flex-1 h-full overflow-y-auto px-6 sm:px-12 py-12 pb-[40vh] flex flex-col items-center scroll-smooth focus:outline-none"
        >
          {hasSynced ? (
            lyricsData.syncedLyrics.map((line, i) => {
              const isActive = i === currentActiveIdx;
              const isPassed = i < currentActiveIdx;
              const timeMs = line.time ?? line.timeMs ?? 0;

              return (
                <div
                  key={i}
                  ref={isActive ? activeLineRef : null}
                  onClick={() => {
                    if (timeMs >= 0 && onAction) {
                      const seekSec = Math.max(0, Math.floor(timeMs / 1000));
                      lastSeekTimeRef.current = Date.now();
                      progressBaseRef.current = {
                        baseMs: timeMs,
                        snapshotAt: Date.now(),
                        playing: isPlaying,
                      };
                      setLocalProgressMs(timeMs);
                      onAction('seek', seekSec);
                    }
                  }}
                  title={timeMs > 0 ? `Nhảy tới ${formatTime(timeMs)}` : undefined}
                  style={{
                    padding: fontSizes.linePad,
                    fontSize: isActive ? fontSizes.active : fontSizes.base,
                  }}
                  className={`my-1 text-center max-w-3xl rounded-xl transition-all duration-200 cursor-pointer select-none leading-relaxed ${
                    isActive
                      ? 'font-bold text-zinc-100 bg-orange-500/10 border border-orange-500/30 shadow-lg shadow-black/40 scale-[1.02]'
                      : isPassed
                      ? 'font-medium text-zinc-500 hover:text-zinc-300'
                      : 'font-normal text-zinc-600 hover:text-zinc-400'
                  }`}
                >
                  {line.text}
                </div>
              );
            })
          ) : lyricsData?.lyrics ? (
            <div className="max-w-2xl text-center py-6">
              <span className="font-mono text-xs uppercase tracking-wider text-orange-400 bg-orange-500/10 border border-orange-500/20 px-3 py-1 rounded-full inline-block mb-6">
                Lời bài hát không đồng bộ
              </span>
              <p
                style={{ fontSize: fontSizes.base }}
                className="whitespace-pre-line text-zinc-300 leading-loose"
              >
                {lyricsData.lyrics}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-2/3 text-center">
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-zinc-500 mb-4 shadow-xl">
                <Mic2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-semibold text-zinc-200">Chưa có lời bài hát</h3>
              <p className="text-xs text-zinc-500 mt-1">
                Thư giãn và thưởng thức giai điệu cùng Anna Music ♪
              </p>
            </div>
          )}
        </div>
      </main>

      {/* ── Docked Bottom Player Bar ── */}
      <footer className="relative z-30 px-4 sm:px-8 py-3.5 bg-[#111113] border-t border-white/[0.08] flex flex-col gap-2.5">
        {/* Seek timeline row */}
        <div className="flex items-center gap-3 max-w-4xl w-full mx-auto">
          <span className="font-mono text-xs text-orange-400 min-w-[42px] text-right font-medium">
            {formatTime(currentDisplayMs)}
          </span>

          <div
            ref={progressBarRef}
            onMouseDown={handleSeekMouseDown}
            onClick={handleSeekClick}
            className="group flex-1 h-5 flex items-center cursor-pointer relative"
          >
            <div className="w-full h-1.5 rounded-full bg-zinc-800 relative overflow-hidden group-hover:h-2 transition-all">
              <div
                className="h-full bg-orange-500 rounded-full relative"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          <span className="font-mono text-xs text-zinc-500 min-w-[42px] font-medium">
            {formatTime(totalMs)}
          </span>
        </div>

        {/* Transport row */}
        <div className="max-w-4xl w-full mx-auto flex items-center justify-between">
          {/* Left: Like & Requester Info */}
          <div className="flex items-center gap-3 w-48 sm:w-60 justify-start">
            {!isLofiCurrent && (
              <button
                onClick={() => {
                  if (!current) return;
                  setHeartPopping(true);
                  setTimeout(() => setHeartPopping(false), 500);
                  onAction?.('toggleFavorite', current);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                  isFav
                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                    : 'bg-[#16161A] border-white/[0.07] text-zinc-400 hover:text-zinc-200'
                } ${heartPopping ? 'scale-110' : 'scale-100'}`}
                title={isFav ? 'Bỏ thích' : 'Yêu thích'}
              >
                <Heart
                  className="w-4 h-4"
                  fill={isFav ? 'currentColor' : 'none'}
                />
                <span className="hidden sm:inline">{isFav ? 'Đã thích' : 'Thích'}</span>
              </button>
            )}

            {current?.requestedBy && (
              <div
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#16161A] border border-white/[0.07] text-zinc-400 text-xs max-w-[140px] truncate"
                title={`Yêu cầu bởi: ${current.requestedBy.replace(/^<@!?\d+>$/, 'Discord User')}`}
              >
                {current.requestedByAvatar ? (
                  <img
                    src={current.requestedByAvatar}
                    alt=""
                    className="w-3.5 h-3.5 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <User className="w-3.5 h-3.5 opacity-60 flex-shrink-0" />
                )}
                <span className="truncate">
                  {current.requestedBy.replace(/^<@!?\d+>$/, 'Discord User')}
                </span>
              </div>
            )}
          </div>

          {/* Center: Playback Controls */}
          <div className="flex items-center gap-3 sm:gap-5">
            {/* Shuffle */}
            <button
              onClick={() => onAction?.('shuffle')}
              className={`p-2 rounded-lg transition ${
                isShuffle
                  ? 'text-orange-400 bg-orange-500/10'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title={isShuffle ? 'Xáo trộn: Đang bật' : 'Xáo trộn hàng chờ'}
            >
              <Shuffle className="w-4 h-4" />
            </button>

            {/* Previous */}
            <button
              onClick={handlePrevious}
              className="p-2 text-zinc-400 hover:text-zinc-200 transition"
              title="Bài trước"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            {/* High-Contrast White Play/Pause Button */}
            <button
              onClick={handlePlayPause}
              className="w-11 h-11 rounded-full bg-zinc-100 hover:bg-white text-zinc-950 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform"
              title={isPlaying ? 'Tạm dừng (Space)' : 'Phát (Space)'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-zinc-950" />
              ) : (
                <Play className="w-5 h-5 fill-zinc-950 ml-0.5" />
              )}
            </button>

            {/* Next */}
            <button
              onClick={handleSkip}
              className="p-2 text-zinc-400 hover:text-zinc-200 transition"
              title="Bài kế tiếp"
            >
              <SkipForward className="w-5 h-5" />
            </button>

            {/* Loop */}
            <button
              onClick={() => !isLofiCurrent && onAction?.('loop')}
              disabled={isLofiCurrent}
              className={`p-2 rounded-lg relative transition ${
                isLofiCurrent
                  ? 'text-zinc-600 opacity-40 cursor-not-allowed'
                  : loopMode !== 'off'
                  ? 'text-orange-400 bg-orange-500/10'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title={
                isLofiCurrent
                  ? 'Chế độ Lofi phát liên tục, không hỗ trợ lặp'
                  : `Lặp lại: ${
                      loopMode === 'song'
                        ? '1 bài'
                        : loopMode === 'queue'
                        ? 'Cả danh sách'
                        : 'Tắt'
                    }`
              }
            >
              <Repeat className="w-4 h-4" />
              {loopMode === 'song' && (
                <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-orange-500 text-zinc-950 text-[9px] font-bold flex items-center justify-center">
                  1
                </span>
              )}
              {loopMode === 'queue' && (
                <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-zinc-200 text-zinc-950 text-[9px] font-bold flex items-center justify-center">
                  ∞
                </span>
              )}
            </button>
          </div>

          {/* Right: Volume */}
          <div className="flex items-center justify-end gap-2 w-48 sm:w-60">
            <button
              onClick={handleToggleMute}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 transition"
              title={localVolume > 0 ? 'Tắt tiếng' : 'Bật tiếng'}
            >
              {localVolume > 0 ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4 text-rose-400" />
              )}
            </button>

            <input
              type="range"
              min={0}
              max={100}
              value={localVolume}
              onChange={(e) => handleVolume(Number(e.target.value))}
              className="w-16 sm:w-20 h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-orange-500"
            />

            <span className="font-mono text-xs text-zinc-500 min-w-[32px] text-right">
              {localVolume}%
            </span>
          </div>
        </div>
      </footer>
    </div>,
    document.body
  );
}
