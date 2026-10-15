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
  Maximize2,
  User,
  ExternalLink,
  Sparkles,
  Radio
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
  if (!track) return 'YOUTUBE MUSIC • LOSSLESS';
  const u = (track.url || '').toLowerCase();
  const s = (track.source || '').toLowerCase();
  if (s === 'soundcloud' || u.includes('soundcloud.com')) return 'SOUNDCLOUD • 320 KBPS';
  if (s === 'spotify' || u.includes('spotify.com')) return 'SPOTIFY • HI-FI';
  if (s === 'youtube' || u.includes('youtube.com') || u.includes('youtu.be')) return 'YOUTUBE MUSIC • 1411 KBPS';
  if (track.album && track.album !== 'Unknown' && !track.album.toLowerCase().includes('unknown')) {
    return `${track.album.toUpperCase()} • HI-RES`;
  }
  return 'YOUTUBE MUSIC • LOSSLESS';
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

export default function HeroPlayer({
  player,
  onAction,
  user,
  onRequireAdmin,
  pendingAction,
  compact = false,
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
  const isRoomEmpty = Boolean(player?.voiceChannel && player.voiceChannel.humanMemberCount === 0);
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
  const [wasPlaying, setWasPlaying] = useState(isPlaying);
  const [lastTrackId, setLastTrackId] = useState(current?.title);
  const [isSwinging, setIsSwinging] = useState(false);

  const progressBarRef = useRef(null);
  const progressBaseRef = useRef({ baseMs: 0, snapshotAt: Date.now(), playing: false });
  const volumeDebounceRef = useRef(null);
  const lastSeekTimeRef = useRef(0);

  const totalMs = parseDurationToMs(current?.duration);

  // Mechanical swing trigger on play / pause / track change
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

  // 250ms rAF-driven smooth progress ticker
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

  // Keyboard shortcuts
  useEffect(() => {
    const kd = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (!isPlayable && e.code !== 'KeyM') return;
      if (e.code === 'Space') {
        e.preventDefault();
        onAction(isPlaying ? 'pause' : 'resume');
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        toggleMute();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (current && totalMs > 0) handleSeekCommit(Math.max(0, (isDragging ? dragMs : progressMs) - 5000));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (current && totalMs > 0) handleSeekCommit(Math.min(totalMs, (isDragging ? dragMs : progressMs) + 5000));
      }
    };
    window.addEventListener('keydown', kd);
    return () => window.removeEventListener('keydown', kd);
  }, [isPlayable, isPlaying, current, totalMs, isDragging, dragMs, progressMs, handleSeekCommit]);

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

  // Cần kim mâm than: quét từ 16.5° -> 33.5° trên rãnh đĩa, trả về -24° khi dừng
  const tonearmAngle = (isPlaying || isDragging) ? (16.5 + (percent / 100) * 17) : -24;
  const tonearmTransition = isSwinging
    ? 'transform 0.9s cubic-bezier(0.34, 1.25, 0.64, 1)'
    : isDragging
    ? 'transform 0.08s ease-out'
    : 'transform 1s linear';

  const thumbUrl = getTrackThumb(current);
  const loopMode = player?.loopMode || player?.loop || 'off';
  const isSwitchingLofi = pendingAction === 'toggleLofiMode' || pendingAction === 'switchTo247';

  // ───────────────────────────────────────────────────────────────────────────
  // COMPACT VIEW (Dành cho Mobile hoặc Header Banner)
  // ───────────────────────────────────────────────────────────────────────────
  if (compact) {
    return (
      <div className="w-full bg-surface-container-low border border-white/5 rounded-2xl p-4 flex flex-col gap-3 shadow-lg select-none">
        <div className="flex items-center gap-3">
          {/* Mâm đĩa than thu nhỏ */}
          <div className="relative w-16 h-16 rounded-full bg-[#0c0e11] p-1 border border-white/10 shrink-0 shadow-md">
            <div className={`w-full h-full rounded-full flex items-center justify-center relative overflow-hidden ${isPlaying ? 'spinning-vinyl' : 'spinning-vinyl-paused'}`}
                 style={{ background: 'radial-gradient(circle, #0e1013 38%, #181c23 46%, #0d0f12 58%, #1a1e27 72%, #090a0d 100%)' }}>
              <div className="w-6 h-6 rounded-full overflow-hidden border border-[#e8c977]">
                <img src={thumbUrl} alt="Cover" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] text-outline uppercase tracking-wider">{getSourceLabel(current)}</span>
              {!isLofi && current && (
                <button onClick={handleFavoriteClick} className="text-secondary hover:scale-110 active:scale-95 transition-transform" title="Yêu thích">
                  <Heart size={15} fill={isFav ? 'currentColor' : 'none'} className={heartPopping ? 'heart-pop-anim' : ''} />
                </button>
              )}
            </div>
            <h3 className="text-sm font-bold text-on-surface truncate leading-tight mt-0.5" title={current?.title}>
              {current?.title || (isLofi ? 'Anna Radio 24/7' : 'Chưa có bài hát')}
            </h3>
            <p className="text-xs text-primary-container truncate font-medium">
              {current?.artist || (isLofi ? 'Phát nền thư giãn' : 'Anna Music')}
            </p>
          </div>
        </div>

        {/* Scrubber */}
        <div className="flex items-center gap-2 font-mono text-[10px] text-outline">
          <span className="w-8 text-right text-primary-container font-medium">{formatTime(currentDisplayMs)}</span>
          <div
            ref={progressBarRef}
            onPointerDown={handlePointerDown}
            className="flex-1 h-3 flex items-center cursor-pointer relative group"
          >
            <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden">
              <div className="h-full bg-primary-container rounded-full" style={{ width: `${percent}%` }} />
            </div>
          </div>
          <span className="w-8">{current?.duration || '0:00'}</span>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // DESKTOP FULL VIEW: MÂM ĐĨA THAN VINYL CỔ ĐIỂN CHÂN THỰC (TONEARM + CONIC GROOVES)
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <aside className="w-full h-full bg-surface-container-low border-l border-white/5 p-3 flex flex-col justify-between select-none overflow-y-auto no-scrollbar z-20">
      
      {/* 1. Top Status Header */}
      <div className="flex items-center justify-between pb-1 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse"></span>
          <span className="font-mono text-[10px] font-bold text-primary tracking-widest uppercase">
            {isLofi ? 'LOFI RADIO 24/7' : 'ĐANG PHÁT HI-FI'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex -space-x-1.5 items-center">
            {player?.voiceChannel?.members?.slice(0, 3).map((m, idx) => (
              <img
                key={idx}
                src={m.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                alt={m.name}
                title={m.name}
                className="w-5 h-5 rounded-full object-cover ring-1 ring-surface"
              />
            )) || (
              <span className="w-5 h-5 rounded-full bg-primary-container text-on-primary font-bold text-[9px] flex items-center justify-center ring-1 ring-surface">A</span>
            )}
          </div>
          <span className="font-mono text-[9px] text-primary-container font-semibold">
            {player?.voiceChannel?.memberCount || 1} V-ROOM
          </span>
        </div>
      </div>

      {/* 2. MÂM ĐĨA THAN VINYL CỔ ĐIỂN CHÂN THỰC (TONEARM + CONIC SHEEN) */}
      <div className="relative w-full h-[185px] bg-[#0c0e11] rounded-xl border border-white/5 flex items-center justify-center overflow-hidden shrink-0 shadow-inner my-1">
        {/* Radial Platter Shadow */}
        <div className="w-[172px] h-[172px] rounded-full p-[4px] bg-[#14161a] shadow-[0_10px_25px_rgba(0,0,0,0.9)] flex items-center justify-center border border-[#2b2d35]/50 relative">
          
          {/* The Rotating Vinyl */}
          <div
            className={`relative w-[164px] h-[164px] rounded-full flex items-center justify-center shadow-2xl cursor-pointer ${
              isPlaying ? 'spinning-vinyl' : 'spinning-vinyl-paused'
            }`}
            onClick={() => onAction(isPlaying ? 'pause' : 'resume')}
            title={isPlaying ? 'Nhấn để tạm dừng' : 'Nhấn để phát'}
            style={{
              background: 'radial-gradient(circle, rgb(14, 16, 19) 38%, rgb(24, 28, 35) 42%, rgb(13, 15, 18) 46%, rgb(28, 32, 41) 52%, rgb(14, 16, 20) 58%, rgb(25, 29, 38) 64%, rgb(11, 13, 16) 72%, rgb(26, 30, 39) 82%, rgb(9, 10, 13) 92%, rgb(20, 22, 28) 100%)'
            }}
          >
            {/* Vinyl Grooves Conic Sheen */}
            <div
              className="absolute inset-0 rounded-full mix-blend-screen opacity-70 pointer-events-none"
              style={{
                background: 'conic-gradient(from 40deg, transparent 0deg, rgba(255,255,255,0.06) 30deg, rgba(255,255,255,0.2) 55deg, rgba(255,255,255,0.04) 80deg, transparent 110deg, transparent 180deg, rgba(255,255,255,0.06) 210deg, rgba(255,255,255,0.2) 235deg, rgba(255,255,255,0.04) 260deg, transparent 290deg)'
              }}
            />
            <div className="absolute inset-[15px] rounded-full border border-black/30 pointer-events-none"></div>
            <div className="absolute inset-[32px] rounded-full border border-black/40 pointer-events-none"></div>

            {/* Center Vintage Round Label (Champagne tone) */}
            <div className="relative w-[64px] h-[64px] rounded-full bg-[#e8c977] p-[2px] shadow-md flex items-center justify-center select-none overflow-hidden border border-[#9b7829]">
              <div className="w-full h-full rounded-full flex flex-col items-center justify-between py-1 bg-gradient-to-b from-[#f5df9d] via-[#e8c977] to-[#cfab52] text-[#332503]">
                <span className="text-[5.5px] font-bold font-mono tracking-widest uppercase">ANNA VINYL</span>
                {/* Mini artwork center */}
                <div className="w-6 h-6 rounded-full overflow-hidden border border-[#584400]/40 shadow-inner">
                  <img
                    alt="Album Artwork"
                    className="w-full h-full object-cover"
                    src={thumbUrl}
                    onError={(e) => { e.currentTarget.src = DEFAULT_TRACK_THUMB; }}
                  />
                </div>
                <span className="text-[5px] font-mono tracking-wider font-semibold">33⅓ RPM</span>
              </div>

              {/* Spindle hole center */}
              <div className="absolute w-3 h-3 rounded-full bg-[#181a1f] border border-[#d8dce6] flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-[#0a0c0e]"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Cần Kim Tonearm Chữ S Đồng Thau Chân Thực (Từ Nhánh Main) */}
        <div
          className="absolute top-1 right-2 z-20 pointer-events-none select-none origin-top-right"
          style={{
            transform: `rotate(${tonearmAngle}deg)`,
            transition: tonearmTransition,
          }}
          title={isPlaying ? `Kim đĩa than: ${Math.round(percent)}%` : 'Kim đang ở vị trí nghỉ'}
        >
          <svg className="w-[84px] h-[150px]" viewBox="0 0 76 210" fill="none">
            <defs>
              <linearGradient id="vintageBrassDeck" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#fffaea" />
                <stop offset="25%" stopColor="#e5c178" />
                <stop offset="55%" stopColor="#a07832" />
                <stop offset="85%" stopColor="#634714" />
                <stop offset="100%" stopColor="#96702c" />
              </linearGradient>
              <radialGradient id="baseMetalDeck" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#525866" />
                <stop offset="45%" stopColor="#2e323b" />
                <stop offset="80%" stopColor="#181a1f" />
                <stop offset="100%" stopColor="#0f1013" />
              </radialGradient>
              <linearGradient id="counterweightMetalDeck" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#544018" />
                <stop offset="20%" stopColor="#d8b265" />
                <stop offset="45%" stopColor="#fffaeb" />
                <stop offset="65%" stopColor="#ad822e" />
                <stop offset="90%" stopColor="#4a3610" />
                <stop offset="100%" stopColor="#7a581e" />
              </linearGradient>
            </defs>

            {/* Counterweight */}
            <rect x="27" y="6" width="22" height="15" rx="3" fill="url(#counterweightMetalDeck)" stroke="#221808" strokeWidth="0.8" />
            <line x1="27" y1="10" x2="49" y2="10" stroke="#1c1404" strokeWidth="0.8" />
            <line x1="27" y1="13.5" x2="49" y2="13.5" stroke="#fffaea" strokeWidth="0.5" opacity="0.6" />
            <line x1="27" y1="17" x2="49" y2="17" stroke="#1c1404" strokeWidth="0.8" />
            <rect x="36" y="19" width="4" height="12" rx="1.5" fill="url(#vintageBrassDeck)" />

            {/* Pivot Bearing */}
            <circle cx="38" cy="40" r="19" fill="url(#baseMetalDeck)" stroke="#666c78" strokeWidth="1.2" />
            <circle cx="38" cy="40" r="15" fill="#15171b" stroke="#363a42" strokeWidth="0.8" />
            <circle cx="38" cy="40" r="9" fill="url(#vintageBrassDeck)" stroke="#3a2b10" strokeWidth="0.8" />
            <circle cx="38" cy="40" r="4.5" fill="#2a1f0a" />

            {/* S-Shaped Brass Arm Tube */}
            <path d="M38 48 Q38 78 35 102 Q32 130 39 155 L42 174" fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="4.5" strokeLinecap="round" />
            <path d="M38 48 Q38 78 35 102 Q32 130 39 155 L42 174" fill="none" stroke="url(#vintageBrassDeck)" strokeWidth="3.2" strokeLinecap="round" />

            {/* Cartridge Head & Stylus */}
            <rect x="38" y="174" width="8" height="18" rx="2" fill="#181a1f" stroke="#584400" strokeWidth="0.8" transform="rotate(-18 42 183)" />
            <polygon points="41,192 45,190 43,198" fill="#e8c977" />
          </svg>
        </div>

        {/* Direct Drive Tag */}
        <div className="absolute bottom-1.5 right-2 px-1.5 py-0.5 rounded bg-black/60 border border-white/5 font-mono text-[8px] text-primary-container tracking-wider flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>DIRECT DRIVE</span>
        </div>
      </div>

      {/* 3. Track Information */}
      <div className="flex flex-col gap-0.5 shrink-0 px-0.5">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9px] text-outline uppercase tracking-wider">
            {getSourceLabel(current)}
          </span>
          <div className="flex items-center gap-1.5">
            {current?.url && (
              <a
                href={current.url}
                target="_blank"
                rel="noreferrer"
                className="text-outline hover:text-on-surface transition-colors p-1"
                title="Mở link bài hát gốc"
              >
                <ExternalLink size={13} />
              </a>
            )}
            {!isLofi && current && (
              <button
                onClick={handleFavoriteClick}
                className="text-secondary hover:scale-110 active:scale-95 transition-transform p-1"
                title={isFav ? 'Bỏ thích' : 'Thêm vào yêu thích'}
              >
                <Heart size={16} fill={isFav ? 'currentColor' : 'none'} className={heartPopping ? 'heart-pop-anim' : ''} />
              </button>
            )}
          </div>
        </div>
        <h3 className="text-sm font-bold text-on-surface truncate leading-tight mt-0.5" title={current?.title}>
          {current?.title || (isLofi ? '24/7 Lofi Thư Giãn' : 'Chưa có bài hát đang phát')}
        </h3>
        <p className="text-xs text-primary-container truncate font-medium">
          {current?.artist || (isLofi ? 'Anna Radio' : 'Anna Music')}
          {current?.requestedBy && !isLofi && (
            <span className="text-outline text-[11px] ml-1.5 font-normal">
              • bởi {current.requestedBy.replace(/^<@!?\d+>$/, 'Discord User')}
            </span>
          )}
        </p>
      </div>

      {/* 4. Progress Bar & Scrubbing */}
      <div className="flex flex-col gap-1 shrink-0 px-0.5 my-1">
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
          className="relative w-full h-3 flex items-center cursor-pointer group"
        >
          {/* Hover Time Tooltip */}
          {hoverInfo && (
            <div
              className="absolute -top-6 -translate-x-1/2 px-1.5 py-0.5 rounded bg-surface-container-highest border border-white/10 text-[9px] font-mono text-primary font-bold shadow-lg pointer-events-none z-30"
              style={{ left: `${hoverInfo.percent}%` }}
            >
              {hoverInfo.time}
            </div>
          )}
          {/* Track rail */}
          <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden group-hover:h-1.5 transition-all">
            <div className="h-full bg-primary-container rounded-full transition-all" style={{ width: `${percent}%` }} />
          </div>
        </div>
        <div className="flex items-center justify-between font-mono text-[10px] text-outline">
          <span className="text-primary-container font-semibold">{formatTime(currentDisplayMs)}</span>
          <span>{current?.duration || '0:00'}</span>
        </div>
      </div>

      {/* 5. Playback Transport Controls */}
      <div className="flex items-center justify-between shrink-0 px-2 my-0.5">
        {/* Shuffle */}
        <button
          onClick={() => onAction('shuffle')}
          disabled={!isPlayable || Boolean(pendingAction)}
          className={`p-1.5 rounded-lg transition-colors ${
            player?.shuffle ? 'text-primary-container bg-primary-container/15 font-bold' : 'text-outline hover:text-on-surface'
          }`}
          title={player?.shuffle ? 'Tắt phát ngẫu nhiên' : 'Bật phát ngẫu nhiên'}
        >
          <Shuffle size={16} />
        </button>

        {/* Previous */}
        <button
          onClick={() => onAction('previous')}
          disabled={!isPlayable || Boolean(pendingAction)}
          className="p-1.5 text-outline hover:text-on-surface transition-colors"
          title="Bài trước (⏮)"
        >
          {pendingAction === 'previous' ? <Loader2 size={18} className="animate-spin text-primary-container" /> : <SkipBack size={19} fill="currentColor" />}
        </button>

        {/* Master Play / Pause circular button */}
        <button
          onClick={() => onAction(isPlaying ? 'pause' : 'resume')}
          disabled={!isPlayable && !isLofi}
          className="w-11 h-11 rounded-full bg-primary-container hover:bg-primary text-on-primary font-bold flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"
          title={isPlaying ? 'Tạm dừng (Space)' : 'Phát (Space)'}
        >
          {pendingAction === 'pause' || pendingAction === 'resume' ? (
            <Loader2 size={20} className="animate-spin text-on-primary" />
          ) : isPlaying ? (
            <Pause size={20} fill="currentColor" />
          ) : (
            <Play size={20} fill="currentColor" className="ml-0.5" />
          )}
        </button>

        {/* Next */}
        <button
          onClick={() => onAction('skip')}
          disabled={!isPlayable || Boolean(pendingAction)}
          className="p-1.5 text-outline hover:text-on-surface transition-colors"
          title="Bài kế tiếp (⏭)"
        >
          {pendingAction === 'skip' ? <Loader2 size={18} className="animate-spin text-primary-container" /> : <SkipForward size={19} fill="currentColor" />}
        </button>

        {/* Loop */}
        <button
          onClick={() => !isLofi && onAction('loop')}
          disabled={!isPlayable || Boolean(pendingAction) || isLofi}
          className={`p-1.5 rounded-lg relative transition-colors ${
            loopMode !== 'off' ? 'text-primary-container bg-primary-container/15' : 'text-outline hover:text-on-surface'
          }`}
          title={isLofi ? 'Chế độ Lofi 24/7 phát radio liên tục' : `Lặp: ${loopMode === 'song' ? '1 bài' : loopMode === 'queue' ? 'Hàng chờ' : 'Tắt'}`}
        >
          <Repeat size={16} />
          {loopMode === 'song' && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-primary-container text-on-primary text-[8px] font-bold flex items-center justify-center">1</span>
          )}
          {loopMode === 'queue' && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-secondary text-white text-[8px] font-bold flex items-center justify-center">∞</span>
          )}
        </button>
      </div>

      {/* 6. Volume Slider & Quick Mode Toggles */}
      <div className="flex flex-col gap-2 shrink-0 pt-2 border-t border-white/5 px-0.5">
        <div className="flex items-center gap-2">
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
            className="flex-1 h-1 bg-surface-container rounded-full appearance-none cursor-pointer accent-[#e8c977]"
          />
          <span className="font-mono text-[10px] text-outline w-7 text-right">{localVolume}%</span>
        </div>

        {/* Dual action buttons: Lofi mode toggle + Fullscreen Karaoke */}
        <div className="grid grid-cols-2 gap-1.5 pt-0.5">
          <button
            onClick={() => {
              if (isSwitchingLofi) return;
              if (isRoomEmpty) {
                onAction('notifyEmptyRoom');
                return;
              }
              onAction('toggleLofiMode');
            }}
            disabled={isSwitchingLofi}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border font-mono text-[9px] font-bold tracking-wider transition-all ${
              isLofi
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-surface-container border-white/5 text-primary-container hover:bg-surface-container-high'
            }`}
            title={isLofi ? 'Đang phát Lofi, bấm để quay lại nhạc thường' : 'Chuyển sang nhạc nền Lofi 24/7'}
          >
            {isSwitchingLofi ? <Loader2 size={12} className="animate-spin" /> : <Coffee size={12} />}
            <span className="truncate">{isSwitchingLofi ? 'ĐANG ĐỔI...' : isLofi ? 'LOFI: BẬT' : 'CHẾ ĐỘ LOFI'}</span>
          </button>

          <button
            onClick={() => onOpenKaraoke?.()}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-surface-container border border-white/5 text-on-surface hover:text-primary-container hover:bg-surface-container-high font-mono text-[9px] font-bold tracking-wider transition-all"
            title="Mở sân khấu Karaoke toàn màn hình"
          >
            <Maximize2 size={12} />
            <span>KARAOKE</span>
          </button>
        </div>
      </div>

    </aside>
  );
}
