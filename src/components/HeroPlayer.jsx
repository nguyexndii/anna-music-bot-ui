import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Volume2, VolumeX, Radio, Lock, Heart, Loader2, Coffee, RotateCcw } from 'lucide-react';


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
  if (s === 'youtube' || u.includes('youtube.com') || u.includes('youtu.be')) return 'YOUTUBE';
  if (track.album && track.album !== 'Unknown' && !track.album.toLowerCase().includes('unknown')) {
    return track.album.toUpperCase();
  }
  return 'YOUTUBE MUSIC';
}

export default function HeroPlayer({ player, onAction, user, onRequireAdmin, pendingAction }) {

  const isPlaying = player?.isPlaying && !player?.isPaused;
  const current   = player?.current;
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

  // Detect play state change or track change to trigger mechanical swing
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

  // 250ms rAF-driven smooth progress ticker (lockstep with server & seek)
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
    setProgressMs(ms); setIsDragging(false);
    onAction('seek', s);
  }, [totalMs, onAction, isPlaying]);

  const handlePointerDown = (e) => {
    if (!current || totalMs <= 0) return;
    const x = e.clientX ?? e.touches?.[0]?.clientX;
    if (x === undefined) return;
    setIsDragging(true); setDragMs(calculateTimeFromEvent(x));
  };

  useEffect(() => {
    if (!isDragging) return;
    const move = (e) => { const x = e.clientX ?? e.touches?.[0]?.clientX; if (x !== undefined) setDragMs(calculateTimeFromEvent(x)); };
    const up   = (e) => { const x = e.clientX ?? e.changedTouches?.[0]?.clientX; handleSeekCommit(x !== undefined ? calculateTimeFromEvent(x) : dragMs); };
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move); window.addEventListener('touchend', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); window.removeEventListener('touchmove', move); window.removeEventListener('touchend', up); };
  }, [isDragging, dragMs, calculateTimeFromEvent, handleSeekCommit]);

  // Keyboard shortcuts
  useEffect(() => {
    const kd = (e) => {
      if (['INPUT','TEXTAREA'].includes(e.target.tagName)) return;
      if (e.code === 'Space') { e.preventDefault(); onAction(isPlaying ? 'pause' : 'resume'); }
      else if (e.code === 'KeyM') { e.preventDefault(); toggleMute(); }
      else if (e.code === 'ArrowLeft') { e.preventDefault(); if (current && totalMs > 0) handleSeekCommit(Math.max(0, (isDragging ? dragMs : progressMs) - 5000)); }
      else if (e.code === 'ArrowRight') { e.preventDefault(); if (current && totalMs > 0) handleSeekCommit(Math.min(totalMs, (isDragging ? dragMs : progressMs) + 5000)); }
    };
    window.addEventListener('keydown', kd);
    return () => window.removeEventListener('keydown', kd);
  }, [isPlaying, current, totalMs, isDragging, dragMs, progressMs, handleSeekCommit]);

  const toggleMute = () => {
    if ((player?.volume || 0) > 0) {
      setPreviousVolume(player?.volume || 100);
      setLocalVolume(0);
      onAction('volume', 0);
    } else {
      const restored = previousVolume || 100;
      setLocalVolume(restored);
      onAction('volume', restored);
    }
  };

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    if (!current) return;
    setHeartPopping(true);
    setTimeout(() => setHeartPopping(false), 550);
    onAction('toggleFavorite', current);
  };

  const currentDisplayMs = isDragging ? dragMs : progressMs;
  const percent = totalMs > 0 ? Math.min(100, Math.max(0, (currentDisplayMs / totalMs) * 100)) : 0;

  // Cần kim mâm than: chỉ quét trong vùng rãnh đen (16.5° -> 33.5°), tuyệt đối không chạm/lấn vào ảnh ở tâm đĩa
  const tonearmAngle = (isPlaying || isDragging) ? (16.5 + (percent / 100) * 17) : -24;
  const tonearmTransition = isSwinging
    ? 'transform 0.9s cubic-bezier(0.34, 1.25, 0.64, 1)'
    : isDragging
    ? 'transform 0.08s ease-out'
    : 'transform 1s linear';

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 0 }}>

      {/* ── Top Upper Section: Vinyl Record + Track Meta ─────── */}
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        
        {/* Vinyl Player Deck */}
        <div className="vinyl-deck">
          {/* Tonearm (Needle - Phong cách Mâm Đĩa Than Cổ Điển) */}
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
                {/* Antique Champagne Brass Metallic Gradient */}
                <linearGradient id="vintageBrass" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#fffaea" />
                  <stop offset="25%" stopColor="#e5c178" />
                  <stop offset="55%" stopColor="#a07832" />
                  <stop offset="85%" stopColor="#634714" />
                  <stop offset="100%" stopColor="#96702c" />
                </linearGradient>

                {/* Gunmetal Base Gradient */}
                <radialGradient id="baseMetal" cx="35%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#525866" />
                  <stop offset="45%" stopColor="#2e323b" />
                  <stop offset="80%" stopColor="#181a1f" />
                  <stop offset="100%" stopColor="#0f1013" />
                </radialGradient>

                {/* Counterweight Knurled Brass */}
                <linearGradient id="counterweightMetal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#544018" />
                  <stop offset="20%" stopColor="#d8b265" />
                  <stop offset="45%" stopColor="#fffaeb" />
                  <stop offset="65%" stopColor="#ad822e" />
                  <stop offset="90%" stopColor="#4a3610" />
                  <stop offset="100%" stopColor="#7a581e" />
                </linearGradient>

                {/* Cartridge Vintage Gold / Matte Black */}
                <linearGradient id="cartridgeGold" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#f3d082" />
                  <stop offset="50%" stopColor="#9c7229" />
                  <stop offset="100%" stopColor="#3d2a0a" />
                </linearGradient>
              </defs>

              {/* 1. Counterweight (Quả đối trọng kim loại phía sau trục) */}
              <rect x="27" y="6" width="22" height="15" rx="3" fill="url(#counterweightMetal)" stroke="#221808" strokeWidth="0.8" />
              {/* Calibration Rings (Vạch chia độ cân kim cơ học) */}
              <line x1="27" y1="10" x2="49" y2="10" stroke="#1c1404" strokeWidth="0.8" />
              <line x1="27" y1="13.5" x2="49" y2="13.5" stroke="#fffaea" strokeWidth="0.5" opacity="0.6" />
              <line x1="27" y1="17" x2="49" y2="17" stroke="#1c1404" strokeWidth="0.8" />

              {/* Rear arm stub */}
              <rect x="36" y="19" width="4" height="12" rx="1.5" fill="url(#vintageBrass)" />

              {/* 2. Base & Gimbal Housing (Bệ trục đỡ cơ khí cổ điển) */}
              <circle cx="38" cy="40" r="19" fill="url(#baseMetal)" stroke="#666c78" strokeWidth="1.2" />
              <circle cx="38" cy="40" r="15" fill="#15171b" stroke="#363a42" strokeWidth="0.8" />
              {/* Pivot Dome / Bearing Screw */}
              <circle cx="38" cy="40" r="9" fill="url(#vintageBrass)" stroke="#3a2b10" strokeWidth="0.8" />
              <circle cx="38" cy="40" r="4.5" fill="#2a1f0a" />
              <circle cx="37" cy="39" r="1.8" fill="#fff5d6" opacity="0.85" />

              {/* 3. Classic S-Shaped Curved Tonearm Tube (Cần kim cong vintage) */}
              {/* Soft shadow under tube */}
              <path
                d="M38 48 Q38 78 35 102 Q32 130 39 155 L42 174"
                fill="none"
                stroke="rgba(0,0,0,0.5)"
                strokeWidth="4.5"
                strokeLinecap="round"
              />
              {/* Main brass tube */}
              <path
                d="M38 48 Q38 78 35 102 Q32 130 39 155 L42 174"
                fill="none"
                stroke="url(#vintageBrass)"
                strokeWidth="3.6"
                strokeLinecap="round"
              />
              {/* Highlight along tube */}
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
                {/* Headshell body */}
                <path
                  d="M37 175 L47 175 L46 200 L38 200 Z"
                  fill="#181a1e"
                  stroke="url(#vintageBrass)"
                  strokeWidth="1.2"
                />
                {/* Finger lift (Tay nâng kim uốn cong) */}
                <path
                  d="M47 179 C51 179 53 184 50 189"
                  fill="none"
                  stroke="url(#vintageBrass)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                {/* Ventilation slots on headshell */}
                <line x1="40" y1="181" x2="44" y2="181" stroke="#33373f" strokeWidth="1" strokeLinecap="round" />
                <line x1="40" y1="185" x2="44" y2="185" stroke="#33373f" strokeWidth="1" strokeLinecap="round" />
                <line x1="40" y1="189" x2="44" y2="189" stroke="#33373f" strokeWidth="1" strokeLinecap="round" />

                {/* Cartridge Gold Badge / Shure-style emblem */}
                <rect x="38.5" y="193" width="7" height="6" rx="1" fill="url(#cartridgeGold)" stroke="#221808" strokeWidth="0.5" />

                {/* Stylus Cantilever & Needle Tip (Mũi kim đọc đĩa) */}
                <line x1="42" y1="200" x2="42" y2="206" stroke="#e0e4eb" strokeWidth="1.2" strokeLinecap="round" />
                {/* Diamond/Ruby Stylus jewel tip */}
                <circle cx="42" cy="206" r="1.1" fill="#ff4d4d" />
              </g>
            </svg>
          </div>

          {/* Vinyl Disc (Đĩa than cổ điển vân rãnh xoay tròn) */}
          <div
            className={`vinyl-wrap ${isPlaying ? 'spinning' : current ? 'spinning-paused' : ''}`}
            aria-label={current?.title ? `Đĩa nhạc: ${current.title}` : 'Chưa có bài hát'}
          >
            <div className="vinyl-grooves" />
            <div className="vinyl-art">
              {current?.thumbnail ? (
                <img src={current.thumbnail} alt={`Bìa album: ${current.title}`} />
              ) : (
                <div className="vinyl-art-fallback">
                  <span>{current?.title?.[0] || '♪'}</span>
                </div>
              )}
            </div>
            {/* Center Spindle Hole */}
            <div className="vinyl-spindle-hole">
              <div className="spindle-dot" />
            </div>
          </div>
        </div>

        {/* Track Meta */}
        <div className="track-meta" style={{ marginTop: 8 }}>
          <div style={{ minWidth: 0, flex: 1, paddingRight: 8 }}>
            <p className="track-eyebrow">
              {(current?.is247 || current?.requestedBy === 'Auto (24/7)') ? '24/7 · LOFI THƯ GIÃN' : getSourceLabel(current)}
            </p>
            <h1 className="track-title" title={current?.title}>
              {current?.title || 'Chưa có bài hát'}
            </h1>
            <p className="track-artist" title={current?.artist}>
              {current?.artist && current.artist !== 'Unknown' ? current.artist : 'Anna Music'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {current && (
              <button
                className={`fav-btn${isFav ? ' liked' : ''}${heartPopping ? ' heart-pop-anim' : ''}`}
                onClick={handleFavoriteClick}
                aria-label={isFav ? 'Bỏ thích' : 'Thích bài hát'}
                title={isFav ? 'Bỏ thích' : 'Thêm vào yêu thích'}
              >
                <Heart size={21} fill={isFav ? 'currentColor' : 'none'} />
              </button>
            )}
          </div>
        </div>

      </div>

      {/* ── Bottom Section: Progress + Controls + Volume + Voice ── */}
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', marginTop: 'auto', paddingTop: 10 }}>

        {/* Progress Bar */}
        <div className="progress-wrap" style={{ marginTop: 6 }}>
          <div
            ref={progressBarRef}
            className="progress-track"
            onMouseDown={handlePointerDown}
            onTouchStart={handlePointerDown}
            onMouseMove={(e) => {
              if (!progressBarRef.current || totalMs <= 0) return;
              const r = progressBarRef.current.getBoundingClientRect();
              const x = Math.max(0, Math.min(e.clientX - r.left, r.width));
              setHoverInfo({ percent: x / r.width * 100, timeStr: formatTime(Math.floor(x / r.width * totalMs)), x });
            }}
            onMouseLeave={() => setHoverInfo(null)}
            role="slider"
            aria-valuemin={0}
            aria-valuemax={Math.floor(totalMs / 1000)}
            aria-valuenow={Math.floor(currentDisplayMs / 1000)}
            aria-label="Tua bài hát"
            style={{
              cursor: (pendingAction || totalMs <= 0) ? 'not-allowed' : 'pointer',
              opacity: pendingAction === 'seek' ? 0.65 : 1,
              pointerEvents: pendingAction ? 'none' : 'auto'
            }}
          >
            <div className="progress-fill" style={{ width: `${percent}%` }} />
            {hoverInfo && totalMs > 0 && !isDragging && (
              <div style={{
                position: 'absolute', top: -28, left: `${hoverInfo.percent}%`,
                transform: 'translateX(-50%)',
                background: '#0d0f11', border: '1px solid var(--border)',
                borderRadius: 6, padding: '2px 7px',
                fontFamily: '"DM Mono", monospace', fontSize: 10, color: 'var(--ink)',
                pointerEvents: 'none', whiteSpace: 'nowrap',
              }}>
                {hoverInfo.timeStr}
              </div>
            )}
          </div>
          <div className="time-row">
            <span style={{ color: isDragging ? 'var(--yellow)' : undefined }}>
              {formatTime(totalMs > 0 ? Math.min(currentDisplayMs, totalMs) : (current ? currentDisplayMs : 0))}
            </span>
            <span>{current?.duration || '0:00'}</span>
          </div>
        </div>

        {/* Controls Deck */}
        <div className="player-controls" style={{ marginTop: 14 }}>
          <button
            className={`ctrl-btn${player?.shuffle ? ' active' : ''}`}
            onClick={() => onAction('shuffle')}
            disabled={Boolean(pendingAction)}
            aria-label="Xáo trộn"
            title="Xáo trộn hàng chờ"
            style={pendingAction ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
          >
            <Shuffle size={17} />
          </button>
          <button
            className="ctrl-btn"
            onClick={() => onAction('previous')}
            disabled={Boolean(pendingAction)}
            aria-label="Bài trước"
            title={pendingAction === 'previous' ? 'Đang quay lại...' : 'Bài trước'}
            style={pendingAction ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
          >
            {pendingAction === 'previous' ? (
              <Loader2 size={19} className="animate-spin" />
            ) : (
              <SkipBack size={21} fill="currentColor" />
            )}
          </button>
          <button
            className="ctrl-btn ctrl-play"
            onClick={() => onAction(isPlaying ? 'pause' : 'resume')}
            disabled={Boolean(pendingAction)}
            aria-label={isPlaying ? 'Tạm dừng' : 'Phát'}
            title={pendingAction === 'playback' ? 'Đang xử lý...' : (isPlaying ? 'Tạm dừng' : 'Phát')}
            style={pendingAction ? { opacity: 0.7, cursor: 'not-allowed' } : undefined}
          >
            {pendingAction === 'playback' ? (
              <Loader2 size={22} className="animate-spin text-black" />
            ) : isPlaying ? (
              <Pause size={22} fill="currentColor" />
            ) : (
              <Play size={22} fill="currentColor" style={{ marginLeft: 2 }} />
            )}
          </button>
          <button
            className="ctrl-btn"
            onClick={() => onAction('skip')}
            disabled={Boolean(pendingAction)}
            aria-label="Bài tiếp"
            title={pendingAction === 'skip' ? 'Đang chuyển bài...' : 'Bài tiếp'}
            style={pendingAction ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
          >
            {pendingAction === 'skip' ? (
              <Loader2 size={19} className="animate-spin" />
            ) : (
              <SkipForward size={21} />
            )}
          </button>
          {(() => {
            const loopMode = player?.loopMode || player?.loop || 'off';
            const isLofiCurrent = Boolean(player?.current && (player?.current?.is247 || player?.current?.requestedBy === 'Auto (24/7)')) || Boolean(player?.mode247 && !player?.current);
            return (
              <button
                className={`ctrl-btn${loopMode !== 'off' ? ' active' : ''}`}
                onClick={() => onAction('loop')}
                disabled={Boolean(pendingAction) || isLofiCurrent}
                aria-label="Lặp lại"
                title={isLofiCurrent ? 'Chế độ Lofi 24/7 tự động phát radio liên tục, không hỗ trợ lặp bài' : `Lặp lại: ${loopMode === 'song' ? 'Lặp lại 1 bài' : loopMode === 'queue' ? 'Lặp lại cả hàng chờ' : 'Tắt lặp lại'}`}
                style={{
                  position: 'relative',
                  ...(isLofiCurrent ? { opacity: 0.35, cursor: 'not-allowed', filter: 'grayscale(1)' } : (pendingAction ? { opacity: 0.6, cursor: 'not-allowed' } : {}))
                }}
              >
                <Repeat size={17} />
                {loopMode === 'song' && (
                  <span style={{ position: 'absolute', top: -4, right: -4, fontSize: 8, fontWeight: 700, background: 'var(--yellow)', color: '#1c1e21', borderRadius: '50%', width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</span>
                )}
                {loopMode === 'queue' && (
                  <span style={{ position: 'absolute', top: -4, right: -4, fontSize: 8, fontWeight: 700, background: 'var(--coral)', color: '#ffffff', borderRadius: '50%', width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>∞</span>
                )}
              </button>
            );
          })()}
        </div>

        {/* Footer: Volume + 24/7 */}
        <div className="now-footer" style={{ marginTop: 16 }}>
          <div className="volume-row">
            <button
              onClick={toggleMute}
              style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--muted)', flexShrink: 0 }}
              aria-label={(player?.volume || 0) === 0 ? 'Bật tiếng' : 'Tắt tiếng'}
              title="Tắt/Bật tiếng (M)"
            >
              {(player?.volume || 0) === 0
                ? <VolumeX size={15} style={{ color: 'var(--coral)' }} />
                : <Volume2 size={15} />}
            </button>
            <input
              type="range" min={0} max={100} value={localVolume}
              onChange={(e) => {
                const v = Number(e.target.value);
                setLocalVolume(v);
                if (volumeDebounceRef.current) clearTimeout(volumeDebounceRef.current);
                volumeDebounceRef.current = setTimeout(() => { volumeDebounceRef.current = null; onAction('volume', v); }, 400);
              }}
              aria-label="Âm lượng"
              style={{ flex: 1, accentColor: 'var(--yellow)', height: 3, cursor: 'pointer' }}
            />
            <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: 'var(--muted)', minWidth: 24 }}>{localVolume}%</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {(() => {
              const isRoomEmpty = Boolean(player?.voiceChannel && player.voiceChannel.humanMemberCount === 0);
              const isLofiMode = Boolean(
                current && (current.is247 || current.requestedBy === 'Auto (24/7)')
              );
              const queueCount = player?.queue?.length || 0;
              const isSwitching = pendingAction === 'toggleLofiMode' || pendingAction === 'switchTo247';

              let btnLabel = 'VỀ NHẠC LOFI';
              let btnTitle = 'Lưu hàng chờ và chuyển sang nhạc Lofi 24/7';
              let btnIcon = <Coffee size={12} />;
              let btnStyle = {
                border: '1px solid rgba(232,201,119,0.35)',
                background: 'rgba(232,201,119,0.08)',
                color: 'var(--yellow)'
              };

              if (isRoomEmpty) {
                btnLabel = 'PHÒNG TRỐNG (24/7)';
                btnTitle = 'Phòng Voice hiện không có ai, bot duy trì phát Lofi 24/7';
                btnIcon = <Coffee size={12} />;
                btnStyle = {
                  border: '1px solid var(--border)',
                  background: 'rgba(255,255,255,0.03)',
                  color: 'var(--muted)',
                  opacity: 0.65,
                  cursor: 'not-allowed'
                };
              } else if (isLofiMode) {
                btnLabel = 'TIẾP TỤC PHÁT NHẠC';
                btnTitle = queueCount > 0 ? `Tiếp tục phát ${queueCount} bài trong hàng chờ` : 'Phát lại bài hát gần nhất';
                btnIcon = <Play size={11} fill="currentColor" />;
                btnStyle = {
                  border: '1px solid rgba(74,222,128,0.5)',
                  background: 'rgba(74,222,128,0.12)',
                  color: '#4ade80'
                };
              }

              return (
                <button
                  onClick={() => {
                    if (isSwitching) return;
                    if (isRoomEmpty) {
                      onAction('notifyEmptyRoom');
                      return;
                    }
                    onAction('toggleLofiMode');
                  }}
                  disabled={isSwitching}
                  title={btnTitle}
                  style={{
                    borderRadius: 9,
                    padding: '5px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    fontFamily: '"DM Mono", monospace',
                    fontSize: 9.5,
                    letterSpacing: '0.06em',
                    fontWeight: 700,
                    cursor: isRoomEmpty ? 'not-allowed' : (isSwitching ? 'wait' : 'pointer'),
                    transition: 'all .18s ease',
                    whiteSpace: 'nowrap',
                    opacity: isSwitching ? 0.65 : 1,
                    ...btnStyle
                  }}
                >
                  {isSwitching ? <Loader2 size={11} className="animate-spin" /> : btnIcon}
                  <span>{isSwitching ? 'ĐANG CHUYỂN...' : btnLabel}</span>
                </button>
              );
            })()}
          </div>
        </div>

        {/* Voice channel info */}
        {player?.voiceChannel?.name && (
          <div style={{
            marginTop: 12, padding: '8px 12px',
            border: '1px solid var(--border)', borderRadius: 10,
            background: 'var(--paper)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ minWidth: 0, flex: 1, paddingRight: 8 }}>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--ink)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {player.voiceChannel.name}
              </p>
              <p style={{ margin: '2px 0 0', fontFamily: '"DM Mono", monospace', fontSize: 8.5, letterSpacing: '0.1em', color: 'var(--muted)' }}>
                {player.voiceChannel.memberCount || 0} THÀNH VIÊN
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: -6, flexShrink: 0 }}>
              {player.voiceChannel.members?.slice(0, 4).map((m, i) => (
                <img key={i} src={m.avatar} alt={m.name} title={m.name}
                  style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid var(--paper)', objectFit: 'cover', marginLeft: i > 0 ? -6 : 0 }} />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
