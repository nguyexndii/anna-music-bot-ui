import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  Heart,
  Loader2,
  Coffee,
  Mic2,
  Maximize2
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

export default function BottomMiniPlayer({
  player,
  onAction,
  pendingAction,
  activeTab,
  setActiveTab,
  onOpenKaraoke
}) {
  const isPlaying = Boolean(player?.isPlaying && !player?.isPaused);
  const current = player?.current;
  const isLofi = Boolean(
    current?.is247 ||
    current?.requestedBy === 'Auto (24/7)' ||
    current?.requestedBy === 'Auto (24/7 Lofi)' ||
    (player?.mode247 && (!current || current?.requestedBy?.includes?.('Auto')))
  );
  const isPlayable = Boolean(current && (player?.isPlaying || player?.isPaused) && !player?.isPreparing);

  const isFav = player?.favorites?.some(f =>
    (f.url && current?.url && f.url === current?.url) ||
    (f.title && current?.title && f.title.toLowerCase().trim() === current?.title.toLowerCase().trim())
  );

  const [progressMs, setProgressMs] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMs, setDragMs] = useState(0);
  const [hoverInfo, setHoverInfo] = useState(null);
  const [localVolume, setLocalVolume] = useState(player?.volume ?? 80);
  const [previousVolume, setPreviousVolume] = useState(80);
  const [heartPopping, setHeartPopping] = useState(false);

  const progressBarRef = useRef(null);
  const progressBaseRef = useRef({ baseMs: 0, snapshotAt: Date.now(), playing: false });
  const volumeDebounceRef = useRef(null);
  const lastSeekTimeRef = useRef(0);

  const totalMs = parseDurationToMs(current?.duration);

  // Sync volume from server
  useEffect(() => {
    if (volumeDebounceRef.current) return;
    if (player?.volume !== undefined) setLocalVolume(player.volume);
  }, [player?.volume]);

  // Sync progress base from server
  useEffect(() => {
    if (isDragging || Date.now() - lastSeekTimeRef.current < 1800) return;
    let baseMs = 0;
    if (typeof current?.playbackDurationMs === 'number' && typeof current?.serverTime === 'number') {
      const networkDelay = Math.max(0, Date.now() - current.serverTime);
      baseMs = current.playbackDurationMs + (isPlaying ? networkDelay : 0);
    } else if (current?.startTime) {
      baseMs = isPlaying ? Math.max(0, Date.now() - current.startTime) : 0;
    }
    progressBaseRef.current = { baseMs, snapshotAt: Date.now(), playing: isPlaying };
    setProgressMs(Math.min(baseMs, totalMs || Infinity));
  }, [current?.title, current?.startTime, current?.playbackDurationMs, current?.serverTime, isPlaying, totalMs, isDragging]);

  // 250ms rAF ticker
  useEffect(() => {
    let animId;
    let lastTick = 0;
    const tick = (now) => {
      if (now - lastTick >= 250) {
        lastTick = now;
        if (!isDragging) {
          const { baseMs, snapshotAt, playing } = progressBaseRef.current;
          const elapsed = playing ? Math.max(0, Date.now() - snapshotAt) : 0;
          const computed = Math.min(baseMs + elapsed, totalMs || Infinity);
          setProgressMs(computed);
        }
      }
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [totalMs, isDragging]);

  const calculateTimeFromEvent = useCallback((clientX) => {
    if (!progressBarRef.current || totalMs <= 0) return 0;
    const r = progressBarRef.current.getBoundingClientRect();
    return Math.floor((Math.max(0, Math.min(clientX - r.left, r.width)) / r.width) * totalMs);
  }, [totalMs]);

  const handleSeekCommit = useCallback((ms) => {
    const s = Math.max(0, Math.min(Math.floor(totalMs / 1000), Math.floor(ms / 1000)));
    lastSeekTimeRef.current = Date.now();
    progressBaseRef.current = { baseMs: ms, snapshotAt: Date.now(), playing: isPlaying };
    setProgressMs(ms);
    setIsDragging(false);
    onAction('seek', s);
  }, [totalMs, onAction, isPlaying]);

  const handlePointerDown = (e) => {
    if (!isPlayable || !current || totalMs <= 0) return;
    const x = e.clientX ?? e.touches?.[0]?.clientX;
    if (x === undefined) return;
    setIsDragging(true);
    setDragMs(calculateTimeFromEvent(x));
  };

  useEffect(() => {
    if (!isDragging) return;
    const move = (e) => {
      const x = e.clientX ?? e.touches?.[0]?.clientX;
      if (x !== undefined) setDragMs(calculateTimeFromEvent(x));
    };
    const up = (e) => {
      const x = e.clientX ?? e.changedTouches?.[0]?.clientX;
      handleSeekCommit(x !== undefined ? calculateTimeFromEvent(x) : dragMs);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move);
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
  }, [isDragging, dragMs, calculateTimeFromEvent, handleSeekCommit]);

  const toggleMute = () => {
    if ((player?.volume || 0) > 0) {
      setPreviousVolume(player?.volume || 80);
      setLocalVolume(0);
      onAction('volume', 0);
    } else {
      const restored = previousVolume || 80;
      setLocalVolume(restored);
      onAction('volume', restored);
    }
  };

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    if (!current || isLofi) return;
    setHeartPopping(true);
    setTimeout(() => setHeartPopping(false), 550);
    onAction('toggleFavorite', current);
  };

  const currentDisplayMs = isDragging ? dragMs : progressMs;
  const percent = totalMs > 0 ? Math.min(100, Math.max(0, (currentDisplayMs / totalMs) * 100)) : 0;
  const thumbUrl = getTrackThumb(current);
  const loopMode = player?.loopMode || player?.loop || 'off';
  const isSwitchingLofi = pendingAction === 'toggleLofiMode' || pendingAction === 'switchTo247';

  return (
    <footer className="h-[68px] bg-surface-container-lowest border-t border-white/5 px-4 flex items-center justify-between gap-4 select-none shrink-0 z-30 shadow-2xl">
      
      {/* Left: Mini Artwork + Track Meta */}
      <div className="flex items-center gap-3 w-[260px] min-w-0">
        <div
          onClick={() => onOpenKaraoke?.()}
          className="w-11 h-11 rounded-lg bg-surface-container border border-white/5 overflow-hidden shrink-0 relative group cursor-pointer"
          title="Mở toàn màn hình Karaoke"
        >
          <img
            alt="Thumbnail"
            className="w-full h-full object-cover"
            src={thumbUrl}
            onError={(e) => { e.currentTarget.src = DEFAULT_TRACK_THUMB; }}
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Maximize2 size={15} className="text-white" />
          </div>
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              onClick={() => onOpenKaraoke?.()}
              className="text-xs font-bold text-on-surface truncate cursor-pointer hover:text-primary-container transition-colors"
              title={current?.title}
            >
              {current?.title || (isLofi ? 'Anna Radio 24/7' : 'Chưa có bài hát')}
            </span>
            {!isLofi && current && (
              <button
                onClick={handleFavoriteClick}
                className="text-secondary shrink-0 hover:scale-110 active:scale-95 transition-transform"
                title={isFav ? 'Bỏ thích' : 'Yêu thích'}
              >
                <Heart size={14} fill={isFav ? 'currentColor' : 'none'} className={heartPopping ? 'heart-pop-anim' : ''} />
              </button>
            )}
          </div>
          <span className="text-[11px] text-outline truncate">
            {current?.artist || (isLofi ? 'Phát nền thư giãn' : 'Anna Music')}
          </span>
        </div>
      </div>

      {/* Center: Playback Transport & Progress Scrubber */}
      <div className="flex-1 max-w-xl flex flex-col items-center gap-1">
        <div className="flex items-center gap-4">
          {/* Shuffle */}
          <button
            onClick={() => onAction('shuffle')}
            disabled={!isPlayable || Boolean(pendingAction)}
            className={`text-outline hover:text-on-surface transition-colors p-1 ${
              player?.shuffle ? 'text-primary-container font-bold' : ''
            }`}
            title="Xáo trộn hàng chờ"
          >
            <Shuffle size={15} />
          </button>

          {/* Previous */}
          <button
            onClick={() => onAction('previous')}
            disabled={!isPlayable || Boolean(pendingAction)}
            className="text-outline hover:text-on-surface transition-colors p-1"
            title="Bài trước"
          >
            {pendingAction === 'previous' ? <Loader2 size={16} className="animate-spin text-primary-container" /> : <SkipBack size={17} fill="currentColor" />}
          </button>

          {/* Play/Pause Gold Circular Button */}
          <button
            onClick={() => onAction(isPlaying ? 'pause' : 'resume')}
            disabled={!isPlayable && !isLofi}
            className="w-8 h-8 rounded-full bg-primary-container hover:bg-primary text-on-primary font-bold flex items-center justify-center shadow hover:scale-105 active:scale-95 transition-all"
            title={isPlaying ? 'Tạm dừng (Space)' : 'Phát (Space)'}
          >
            {pendingAction === 'pause' || pendingAction === 'resume' ? (
              <Loader2 size={16} className="animate-spin text-on-primary" />
            ) : isPlaying ? (
              <Pause size={16} fill="currentColor" />
            ) : (
              <Play size={16} fill="currentColor" className="ml-0.5" />
            )}
          </button>

          {/* Next */}
          <button
            onClick={() => onAction('skip')}
            disabled={!isPlayable || Boolean(pendingAction)}
            className="text-outline hover:text-on-surface transition-colors p-1"
            title="Bài kế tiếp"
          >
            {pendingAction === 'skip' ? <Loader2 size={16} className="animate-spin text-primary-container" /> : <SkipForward size={17} fill="currentColor" />}
          </button>

          {/* Loop */}
          <button
            onClick={() => !isLofi && onAction('loop')}
            disabled={!isPlayable || Boolean(pendingAction) || isLofi}
            className={`text-outline hover:text-on-surface relative transition-colors p-1 ${
              loopMode !== 'off' ? 'text-primary-container font-bold' : ''
            }`}
            title={isLofi ? 'Chế độ Lofi 24/7 phát radio' : `Lặp lại: ${loopMode === 'song' ? '1 bài' : loopMode === 'queue' ? 'Hàng chờ' : 'Tắt'}`}
          >
            <Repeat size={15} />
            {loopMode === 'song' && (
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary-container text-on-primary text-[7px] font-bold flex items-center justify-center">1</span>
            )}
            {loopMode === 'queue' && (
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-secondary text-white text-[7px] font-bold flex items-center justify-center">∞</span>
            )}
          </button>
        </div>

        {/* Scrubber Bar */}
        <div className="w-full flex items-center gap-2 font-mono text-[10px] text-outline">
          <span className="w-8 text-right text-primary-container font-semibold">{formatTime(currentDisplayMs)}</span>
          <div
            ref={progressBarRef}
            onPointerDown={handlePointerDown}
            onPointerMove={(e) => {
              if (!isPlayable || totalMs <= 0) return;
              const t = calculateTimeFromEvent(e.clientX);
              const r = progressBarRef.current.getBoundingClientRect();
              setHoverInfo({ time: formatTime(t), percent: Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)) });
            }}
            onPointerLeave={() => setHoverInfo(null)}
            className="flex-1 h-3 flex items-center cursor-pointer relative group"
          >
            {hoverInfo && (
              <div
                className="absolute -top-5 -translate-x-1/2 px-1.5 py-0.5 rounded bg-surface-container-highest border border-white/10 text-[9px] font-mono text-primary font-bold shadow pointer-events-none"
                style={{ left: `${hoverInfo.percent}%` }}
              >
                {hoverInfo.time}
              </div>
            )}
            <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden group-hover:h-1.5 transition-all">
              <div className="h-full bg-primary-container rounded-full" style={{ width: `${percent}%` }} />
            </div>
          </div>
          <span className="w-8">{current?.duration || '0:00'}</span>
        </div>
      </div>

      {/* Right: Quick Mode Switch + Lyrics + Volume */}
      <div className="flex items-center justify-end gap-3 w-[260px]">
        {/* Lofi Radio pill */}
        <button
          onClick={() => onAction('toggleLofiMode')}
          disabled={isSwitchingLofi}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-mono text-[10px] font-bold tracking-wider transition-all ${
            isLofi
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-surface-container border-white/5 text-outline hover:text-primary-container'
          }`}
          title="Bật/Tắt chế độ Lofi thư giãn 24/7"
        >
          {isSwitchingLofi ? <Loader2 size={12} className="animate-spin" /> : <Coffee size={12} />}
          <span className="hidden sm:inline">{isLofi ? 'LOFI: BẬT' : 'LOFI'}</span>
        </button>

        {/* Karaoke Lyrics trigger button */}
        <button
          onClick={() => {
            if (activeTab === 'lyrics') {
              onOpenKaraoke?.();
            } else {
              setActiveTab?.('lyrics');
            }
          }}
          className={`p-1.5 rounded-lg border transition-all ${
            activeTab === 'lyrics'
              ? 'bg-primary-container/15 border-primary-container/40 text-primary-container'
              : 'border-white/5 text-outline hover:text-on-surface hover:bg-surface-container'
          }`}
          title="Mở lời bài hát Karaoke"
        >
          <Mic2 size={15} />
        </button>

        {/* Volume controls */}
        <div className="flex items-center gap-1.5">
          <button onClick={toggleMute} className="text-outline hover:text-on-surface p-1" title={localVolume === 0 ? 'Bật âm' : 'Tắt âm'}>
            {localVolume === 0 ? <VolumeX size={15} className="text-secondary" /> : <Volume2 size={15} />}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={localVolume}
            onChange={(e) => {
              const v = Number(e.target.value);
              setLocalVolume(v);
              if (volumeDebounceRef.current) clearTimeout(volumeDebounceRef.current);
              volumeDebounceRef.current = setTimeout(() => {
                volumeDebounceRef.current = null;
                onAction('volume', v);
              }, 300);
            }}
            className="w-16 h-1 bg-surface-container rounded-full appearance-none cursor-pointer accent-[#e8c977]"
          />
        </div>
      </div>

    </footer>
  );
}
