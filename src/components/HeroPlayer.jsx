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
  Radio,
  Lock,
  Heart,
  Loader2,
  Coffee,
  RotateCcw
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

function getSourceLabel(track) {
  if (!track) return 'YOUTUBE MUSIC';
  const u = (track.url || '').toLowerCase();
  const s = (track.source || '').toLowerCase();
  if (s === 'soundcloud' || u.includes('soundcloud.com')) return 'SOUNDCLOUD';
  if (s === 'spotify' || u.includes('spotify.com')) return 'SPOTIFY';
  if (s === 'youtube' || u.includes('youtube.com') || u.includes('youtu.be')) return 'YOUTUBE MUSIC';
  if (track.album && track.album !== 'Unknown' && !track.album.toLowerCase().includes('unknown')) {
    return track.album.toUpperCase();
  }
  return 'YOUTUBE MUSIC';
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

export default function HeroPlayer({ player, onAction, user, onRequireAdmin, pendingAction, isMobileCenter = false }) {
  const isPlaying = player?.isPlaying && !player?.isPaused;
  const current   = player?.current;
  const isLofi    = Boolean(
    current?.is247 ||
    current?.requestedBy === 'Auto (24/7)' ||
    current?.requestedBy === 'Auto (24/7 Lofi)' ||
    (player?.mode247 && (!current || current?.requestedBy?.includes?.('Auto')))
  );
  const isPlayable = Boolean(current && (player?.isPlaying || player?.isPaused) && !player?.isPreparing);
  const isFav     = player?.favorites?.some(f =>
    (f.url && current?.url && f.url === current?.url) ||
    (f.title && current?.title && f.title.toLowerCase().trim() === current?.title.toLowerCase().trim())
  );

  const [progressMs, setProgressMs]   = useState(0);
  const [isDragging, setIsDragging]   = useState(false);
  const [dragMs, setDragMs]           = useState(0);
  const [hoverInfo, setHoverInfo]     = useState(null);
  const [localVolume, setLocalVolume] = useState(player?.volume ?? 80);
  const [previousVolume, setPreviousVolume] = useState(100);
  const [heartPopping, setHeartPopping] = useState(false);
  const [wasPlaying, setWasPlaying]   = useState(isPlaying);
  const [lastTrackId, setLastTrackId] = useState(current?.title);
  const [isSwinging, setIsSwinging]   = useState(false);

  // Kích hoạt hiệu ứng vung cần kim cơ học khi đổi bài hoặc play/pause (như nhánh main)
  useEffect(() => {
    const playChanged = wasPlaying !== isPlaying;
    const trackChanged = lastTrackId !== current?.title;
    if (trackChanged) {
      setProgressMs(0);
      progressBaseRef.current = { baseMs: 0, snapshotAt: Date.now(), playing: isPlaying };
    }
    if (playChanged || trackChanged) {
      setWasPlaying(isPlaying);
      setLastTrackId(current?.title);
      setIsSwinging(true);
      const timer = setTimeout(() => setIsSwinging(false), 950);
      return () => clearTimeout(timer);
    }
  }, [isPlaying, wasPlaying, current?.title, lastTrackId]);

  const progressBarRef   = useRef(null);
  const progressBaseRef = useRef({ baseMs: 0, snapshotAt: Date.now(), playing: false });
  const volumeDebounceRef = useRef(null);
  const lastSeekTimeRef  = useRef(0);

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

  // 250ms rAF progress ticker
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
  }, [isDragging, totalMs]);

  // Keyboard Shortcuts (Space, M, ArrowLeft, ArrowRight)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (isPlayable && !pendingAction) onAction(isPlaying ? 'pause' : 'resume');
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        toggleMute();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        seekRelative(5);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        seekRelative(-5);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlayable, isPlaying, pendingAction, totalMs, progressMs]);

  const seekRelative = (sec) => {
    if (!isPlayable || pendingAction || totalMs <= 0) return;
    const cur = isDragging ? dragMs : progressMs;
    const nxt = Math.max(0, Math.min(cur + sec * 1000, totalMs));
    setProgressMs(nxt);
    progressBaseRef.current = { baseMs: nxt, snapshotAt: Date.now(), playing: isPlaying };
    lastSeekTimeRef.current = Date.now();
    onAction('seek', Math.floor(nxt / 1000));
  };

  const toggleMute = () => {
    if (localVolume > 0) {
      setPreviousVolume(localVolume);
      setLocalVolume(0);
      onAction('volume', 0);
    } else {
      const restored = previousVolume || 80;
      setLocalVolume(restored);
      onAction('volume', restored);
    }
  };

  const calcProgressFromEvent = useCallback((e) => {
    if (!progressBarRef.current || totalMs <= 0) return 0;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    return Math.floor((clickX / rect.width) * totalMs);
  }, [totalMs]);

  const handlePointerDown = (e) => {
    if (!isPlayable || pendingAction || totalMs <= 0) return;
    setIsDragging(true);
    const ms = calcProgressFromEvent(e);
    setDragMs(ms);
  };

  const handlePointerMove = useCallback((e) => {
    if (!isDragging || totalMs <= 0) return;
    const ms = calcProgressFromEvent(e);
    setDragMs(ms);
  }, [isDragging, totalMs, calcProgressFromEvent]);

  const handlePointerUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    setProgressMs(dragMs);
    progressBaseRef.current = { baseMs: dragMs, snapshotAt: Date.now(), playing: isPlaying };
    lastSeekTimeRef.current = Date.now();
    onAction('seek', Math.floor(dragMs / 1000));
  }, [isDragging, dragMs, isPlaying, onAction]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handlePointerMove);
      window.addEventListener('mouseup', handlePointerUp);
      window.addEventListener('touchmove', handlePointerMove);
      window.addEventListener('touchend', handlePointerUp);
    }
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  const currentDisplayMs = isDragging ? dragMs : progressMs;
  const percent = totalMs > 0 ? Math.min(100, Math.max(0, (currentDisplayMs / totalMs) * 100)) : 0;

  // Cần kim mâm than realtime: quét trong rãnh đen 16.5° -> 33.5° (chuẩn nhánh main)
  const tonearmAngle = (isPlaying || isDragging) ? (16.5 + (percent / 100) * 17) : -24;
  const tonearmTransition = isSwinging
    ? 'transform 0.9s cubic-bezier(0.34, 1.25, 0.64, 1)'
    : isDragging
    ? 'transform 0.08s ease-out'
    : 'transform 1s linear';

  const coverUrl = getTrackThumb(current);

  return (
    <div className={`w-full flex flex-col justify-between ${isMobileCenter ? 'py-2 px-1 max-w-md mx-auto min-h-[500px]' : 'h-full gap-2'}`}>

      {/* ── 1. MÂM ĐĨA THAN VINTAGE & CÂY KIM REALTIME (Chuẩn nhánh main) ──────── */}
      <div className="vinyl-deck relative my-2 select-none">
        {/* Tonearm (Needle - Phong cách Mâm Đĩa Than Cổ Điển Chạy Realtime) */}
        <div
          className={`tonearm-assembly ${isPlaying ? 'on-record' : ''}`}
          style={{
            transform: `rotate(${tonearmAngle}deg)`,
            transition: tonearmTransition,
          }}
          title={isPlaying ? `Kim đĩa than: ${Math.round(percent)}% bài hát` : 'Kim đĩa than đang ở vị trí nghỉ'}
          aria-hidden="true"
        >
          <svg
            className="tonearm-svg"
            viewBox="0 0 76 210"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="vintageBrass" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#fffaea" />
                <stop offset="25%" stopColor="#e5c178" />
                <stop offset="55%" stopColor="#a07832" />
                <stop offset="85%" stopColor="#634714" />
                <stop offset="100%" stopColor="#96702c" />
              </linearGradient>

              <radialGradient id="baseMetal" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#525866" />
                <stop offset="45%" stopColor="#2e323b" />
                <stop offset="80%" stopColor="#181a1f" />
                <stop offset="100%" stopColor="#0f1013" />
              </radialGradient>

              <linearGradient id="counterweightMetal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#544018" />
                <stop offset="20%" stopColor="#d8b265" />
                <stop offset="45%" stopColor="#fffaeb" />
                <stop offset="65%" stopColor="#ad822e" />
                <stop offset="90%" stopColor="#4a3610" />
                <stop offset="100%" stopColor="#7a581e" />
              </linearGradient>

              <linearGradient id="cartridgeGold" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f3d082" />
                <stop offset="50%" stopColor="#9c7229" />
                <stop offset="100%" stopColor="#3d2a0a" />
              </linearGradient>
            </defs>

            {/* 1. Counterweight (Quả đối trọng kim loại phía sau trục) */}
            <rect x="27" y="6" width="22" height="15" rx="3" fill="url(#counterweightMetal)" stroke="#221808" strokeWidth="0.8" />
            <line x1="27" y1="10" x2="49" y2="10" stroke="#1c1404" strokeWidth="0.8" />
            <line x1="27" y1="13.5" x2="49" y2="13.5" stroke="#fffaea" strokeWidth="0.5" opacity="0.6" />
            <line x1="27" y1="17" x2="49" y2="17" stroke="#1c1404" strokeWidth="0.8" />

            {/* Rear arm stub */}
            <rect x="36" y="19" width="4" height="12" rx="1.5" fill="url(#vintageBrass)" />

            {/* 2. Base & Gimbal Housing (Bệ trục đỡ cơ khí cổ điển) */}
            <circle cx="38" cy="40" r="19" fill="url(#baseMetal)" stroke="#666c78" strokeWidth="1.2" />
            <circle cx="38" cy="40" r="15" fill="#15171b" stroke="#363a42" strokeWidth="0.8" />
            <circle cx="38" cy="40" r="9" fill="url(#vintageBrass)" stroke="#3a2b10" strokeWidth="0.8" />
            <circle cx="38" cy="40" r="4.5" fill="#2a1f0a" />
            <circle cx="37" cy="39" r="1.8" fill="#fff5d6" opacity="0.85" />

            {/* 3. Classic S-Shaped Curved Tonearm Tube (Cần kim cong vintage) */}
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
              stroke="url(#vintageBrass)"
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

            {/* 4. Headshell Connector Ring */}
            <rect x="39" y="171" width="6" height="5" rx="1" transform="rotate(-6 42 174)" fill="url(#counterweightMetal)" stroke="#1a1407" strokeWidth="0.5" />

            {/* 5. Vintage Headshell (Máng kim cổ điển có góc nghiêng theo rãnh đĩa) */}
            <g transform="rotate(-14 42 178)">
              <path
                d="M37 175 L47 175 L46 200 L38 200 Z"
                fill="#181a1e"
                stroke="url(#vintageBrass)"
                strokeWidth="1.2"
              />
              <path
                d="M47 179 C51 179 53 184 50 189"
                fill="none"
                stroke="url(#vintageBrass)"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <line x1="40" y1="181" x2="44" y2="181" stroke="#33373f" strokeWidth="1" strokeLinecap="round" />
              <line x1="40" y1="185" x2="44" y2="185" stroke="#33373f" strokeWidth="1" strokeLinecap="round" />
              <line x1="40" y1="189" x2="44" y2="189" stroke="#33373f" strokeWidth="1" strokeLinecap="round" />
              <rect x="38.5" y="193" width="7" height="6" rx="1" fill="url(#cartridgeGold)" stroke="#221808" strokeWidth="0.5" />
              <line x1="42" y1="200" x2="42" y2="206" stroke="#e0e4eb" strokeWidth="1.2" strokeLinecap="round" />
              <circle cx="42" cy="206" r="1.1" fill="#ff4d4d" />
            </g>
          </svg>
        </div>

        {/* Vinyl Disc (Đĩa than cổ điển vân rãnh xoay tròn) */}
        <div
          className={`vinyl-wrap ${isPlaying ? 'spinning' : current ? 'spinning-paused' : ''}`}
          aria-label={isLofi ? 'Đĩa nhạc: 24/7 Lofi Thư Giãn' : (current?.title ? `Đĩa nhạc: ${current.title}` : 'Chưa có bài hát')}
          onClick={() => onAction(isPlaying ? 'pause' : 'resume')}
          title={isPlaying ? 'Nhấn để tạm dừng' : 'Nhấn để phát'}
        >
          <div className="vinyl-grooves" />
          <div className="vinyl-art">
            <img
              src={coverUrl}
              alt={current?.title || 'Album Art'}
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/default-playlist.jpg'; }}
            />
            {/* Lỗ trục trung tâm bọc vành đồng thau vintage */}
            <div className="vinyl-spindle-hole">
              <div className="spindle-dot" />
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. TRACK INFORMATION ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-0.5 shrink-0 px-1 mt-1">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9px] text-outline uppercase tracking-wider">
            {getSourceLabel(current)}
          </span>
          <button
            onClick={() => {
              setHeartPopping(true);
              setTimeout(() => setHeartPopping(false), 300);
              onAction('toggleFavorite', current);
            }}
            disabled={!current}
            className={`transition-transform active:scale-90 ${
              isFav ? 'text-secondary' : 'text-outline hover:text-on-surface'
            } ${heartPopping ? 'scale-125' : ''}`}
            title={isFav ? 'Bỏ thích' : 'Thêm vào yêu thích'}
          >
            <Heart size={18} fill={isFav ? 'currentColor' : 'none'} />
          </button>
        </div>

        <h2
          data-tip={current?.title}
          title={current?.title}
          className="text-sm sm:text-base font-bold text-on-surface truncate leading-snug cursor-default"
        >
          {current?.title || 'Chưa có bài hát đang phát'}
        </h2>
        <p
          data-tip={current?.artist}
          title={current?.artist}
          className="text-xs text-primary-container truncate font-medium cursor-default"
        >
          {current?.artist || (isLofi ? 'Anna Music • Lofi 24/7' : 'Boutique Soundbot')}
        </p>
      </div>

      {/* ── 3. TIMELINE & PROGRESS BAR ──────────────────────────────────────── */}
      <div className="flex flex-col gap-1 shrink-0 px-1 mt-1">
        <div
          ref={progressBarRef}
          onMouseDown={handlePointerDown}
          onTouchStart={handlePointerDown}
          onMouseMove={(e) => {
            if (!progressBarRef.current || totalMs <= 0 || !isPlayable) return;
            const r = progressBarRef.current.getBoundingClientRect();
            const x = Math.max(0, Math.min(e.clientX - r.left, r.width));
            setHoverInfo({ percent: (x / r.width) * 100, timeStr: formatTime(Math.floor((x / r.width) * totalMs)) });
          }}
          onMouseLeave={() => setHoverInfo(null)}
          className="relative w-full h-1.5 bg-surface-container-highest rounded-full cursor-pointer group"
          role="slider"
          aria-valuemin={0}
          aria-valuemax={Math.floor(totalMs / 1000)}
          aria-valuenow={Math.floor(currentDisplayMs / 1000)}
        >
          <div
            className="h-full bg-primary-container rounded-full transition-all"
            style={{ width: `${percent}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-inverse-surface rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `${percent}%` }}
          />
          {hoverInfo && totalMs > 0 && !isDragging && isPlayable && (
            <div
              className="absolute -top-7 -translate-x-1/2 bg-surface-container-lowest border border-white/10 rounded px-1.5 py-0.5 font-mono text-[9px] text-on-surface pointer-events-none whitespace-nowrap"
              style={{ left: `${hoverInfo.percent}%` }}
            >
              {hoverInfo.timeStr}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between font-mono text-[10px] text-outline">
          <span className={isDragging ? 'text-primary-container font-bold' : ''}>
            {formatTime(totalMs > 0 ? Math.min(currentDisplayMs, totalMs) : currentDisplayMs)}
          </span>
          <span>{current?.duration || '0:00'}</span>
        </div>
      </div>

      {/* ── 4. MAIN PLAYBACK CONTROLS ───────────────────────────────────────── */}
      <div className="flex items-center justify-between px-2 shrink-0 my-1">
        <button
          onClick={() => onAction('shuffle')}
          disabled={!isPlayable || Boolean(pendingAction)}
          className={`p-1.5 rounded-lg transition-colors ${
            player?.shuffle ? 'text-primary-container' : 'text-outline hover:text-on-surface'
          }`}
          title="Xáo trộn bài hát"
        >
          <Shuffle size={18} />
        </button>

        <button
          onClick={() => onAction('previous')}
          disabled={!isPlayable || Boolean(pendingAction)}
          className="p-1.5 rounded-lg text-outline hover:text-on-surface transition-colors active:scale-95"
          title="Bài trước đó"
        >
          {pendingAction === 'previous' ? (
            <Loader2 size={19} className="animate-spin text-primary-container" />
          ) : (
            <SkipBack size={20} />
          )}
        </button>

        <button
          onClick={() => onAction(isPlaying ? 'pause' : 'resume')}
          disabled={!isPlayable || Boolean(pendingAction)}
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-primary-container hover:bg-primary text-on-primary flex items-center justify-center transition-all active:scale-95 shadow-md disabled:opacity-50"
          title={isPlaying ? 'Tạm dừng' : 'Phát nhạc'}
        >
          {pendingAction === 'playback' ? (
            <Loader2 size={22} className="animate-spin text-on-primary" />
          ) : isPlaying ? (
            <Pause size={22} fill="currentColor" />
          ) : (
            <Play size={22} fill="currentColor" className="ml-0.5" />
          )}
        </button>

        <button
          onClick={() => onAction('skip')}
          disabled={!isPlayable || Boolean(pendingAction)}
          className="p-1.5 rounded-lg text-outline hover:text-on-surface transition-colors active:scale-95"
          title="Bài kế tiếp"
        >
          {pendingAction === 'skip' ? (
            <Loader2 size={19} className="animate-spin text-primary-container" />
          ) : (
            <SkipForward size={20} />
          )}
        </button>

        {(() => {
          const loopMode = player?.loopMode || player?.loop || 'off';
          const isLofiCurrent = Boolean(player?.current && (player?.current?.is247 || player?.current?.requestedBy === 'Auto (24/7)'));
          return (
            <button
              onClick={() => onAction('loop')}
              disabled={!isPlayable || Boolean(pendingAction) || isLofiCurrent}
              className={`p-1.5 rounded-lg transition-colors relative ${
                loopMode !== 'off' ? 'text-primary-container font-bold' : 'text-outline hover:text-on-surface'
              }`}
              title={isLofiCurrent ? 'Nhạc Lofi 24/7 phát tự động, không lặp lại' : `Lặp lại: ${loopMode}`}
            >
              <Repeat size={18} />
              {loopMode === 'song' && (
                <span className="absolute -top-1 -right-1 font-mono text-[8px] bg-primary-container text-on-primary font-bold px-1 rounded-full">
                  1
                </span>
              )}
              {loopMode === 'queue' && (
                <span className="absolute -top-1 -right-1 font-mono text-[8px] bg-secondary text-white font-bold px-1 rounded-full">
                  ∞
                </span>
              )}
            </button>
          );
        })()}
      </div>

      {/* ── 5. VOLUME CONTROL BAR ───────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-1 shrink-0">
        <button onClick={toggleMute} className="text-outline hover:text-on-surface p-1">
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
            if (volumeDebounceRef.current) clearTimeout(volumeDebounceRef.current);
            volumeDebounceRef.current = setTimeout(() => {
              volumeDebounceRef.current = null;
              onAction('volume', v);
            }, 350);
          }}
          className="flex-1 h-1 bg-surface-container-highest rounded-full cursor-pointer accent-primary-container"
          aria-label="Âm lượng"
        />
        <span className="font-mono text-[9px] text-outline w-7 text-right">{localVolume}%</span>
      </div>

      {/* ── 6. SMART LOFI SWITCHER ─────────────────────────────────────────── */}
      <div className="shrink-0 mt-0.5">
        {(() => {
          const isLofiMode = Boolean(current && (current.is247 || current.requestedBy === 'Auto (24/7)'));
          return (
            <button
              onClick={() => onAction('toggleLofiMode')}
              disabled={Boolean(pendingAction)}
              className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all active:scale-[0.99] ${
                isLofiMode
                  ? 'bg-secondary-container/20 border-secondary/30 text-secondary hover:bg-secondary-container/30'
                  : 'bg-surface-container hover:bg-surface-container-high border-white/5 text-primary-container'
              }`}
            >
              {isLofiMode ? (
                <>
                  <RotateCcw size={14} />
                  <span>TIẾP TỤC PHÁT NHẠC CỦA BẠN</span>
                </>
              ) : (
                <>
                  <Coffee size={14} />
                  <span>CHUYỂN VỀ NHẠC LOFI THƯ GIÃN</span>
                </>
              )}
            </button>
          );
        })()}
      </div>

      {/* ── 7. DISCORD VOICE ROOM STATUS WIDGET ──────────────────────────────── */}
      <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container border border-white/5 shrink-0 mt-0.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded bg-surface-container-highest flex items-center justify-center text-tertiary shrink-0">
            <Radio size={13} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-semibold text-on-surface truncate">
              {player?.voiceChannel?.name || 'Phòng Voice Tổng'}
            </span>
            <span className="font-mono text-[9px] text-outline">
              {player?.voiceChannel?.humanMemberCount ?? 1} thành viên • 48kHz
            </span>
          </div>
        </div>
        <span className="font-mono text-[9px] text-tertiary uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-tertiary-container/30">
          LIVE
        </span>
      </div>

    </div>
  );
}
