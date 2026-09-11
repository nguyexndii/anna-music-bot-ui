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
  // Track the server snapshot so we can compute elapsed properly
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

  // Reset scroll and timeline immediately when song changes (play hết bài này sang bài khác)
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
    // Nếu vừa tua (< 1800ms), không để server poll cũ đè làm giật timeline
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

  // Auto-scroll to center active lyric line inside container ONLY (never moves window/body)
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
      const desiredScrollTop = targetTop - (containerHeight / 2) + (targetHeight / 2);
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
  const isYtCc = lyricsData?.source === 'youtube_cc' || lyricsData?.source === 'youtube_auto_cc';
  const isFav = Boolean(player?.favorites?.some(f =>
    (f.url && current?.url && f.url === current?.url) ||
    (f.title && current?.title && f.title.toLowerCase().trim() === current?.title.toLowerCase().trim())
  ));
  const loopMode = player?.loop || player?.loopMode || 'off';
  const isShuffle = Boolean(player?.shuffle);

  const fontSizes = fontSize === 'lg'
    ? { base: 17, active: 25, linePad: '7px 18px' }
    : { base: 14, active: 20, linePad: '5px 12px' };

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

  // CSS keyframe injection for vinyl spin + styles
  const cssStyles = `
    @keyframes vinylSpin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    @keyframes karaokeLineIn {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .kara-lyrics-area::-webkit-scrollbar { width: 3px; }
    .kara-lyrics-area::-webkit-scrollbar-track { background: transparent; }
    .kara-lyrics-area::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 3px; }
    .kara-vinyl {
      animation-play-state: ${isPlaying ? 'running' : 'paused'};
    }
    .kara-seek-bar:hover .kara-seek-thumb { opacity: 1; }
    @keyframes heartBounce {
      0% { transform: scale(1); }
      40% { transform: scale(1.28); }
      70% { transform: scale(0.92); }
      100% { transform: scale(1); }
    }
    @media (max-width: 680px) {
      .kara-footer-left { width: auto !important; min-width: auto !important; }
      .kara-requester { display: none !important; }
      .kara-footer-right { width: auto !important; min-width: auto !important; }
      .kara-footer-right input[type="range"] { width: 50px !important; }
    }
  `;

  return ReactDOM.createPortal(
    <div
      className="karaoke-stage-root"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        maxHeight: '100vh',
        zIndex: 999999,
        background: '#0a0c10',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        // Vietnamese typography: Be Vietnam Pro native support
        fontFamily: '"Be Vietnam Pro", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#fff',
      }}
    >
      <style>{cssStyles}</style>

      {/* ── Ambient Blurred Background ── */}
      {current?.thumbnail && (
        <div
          style={{
            position: 'absolute',
            inset: -60,
            backgroundImage: `url(${current.thumbnail})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(80px) brightness(0.2) saturate(1.5)',
            opacity: 0.7,
            pointerEvents: 'none',
            zIndex: 0,
            transform: 'scale(1.2)',
          }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 50% 20%, rgba(20,24,32,0.1) 0%, rgba(10,12,16,0.94) 70%)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* ── Top Header ── */}
      <header
        style={{
          position: 'relative',
          zIndex: 20,
          height: 62,
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          background: 'rgba(10,12,16,0.6)',
          gap: 12,
        }}
      >
        {/* Left: Clean Brand + Lyrics Source badge (No cluttered duplicate titles) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <img
            src="/logo.gif"
            alt="Anna Logo"
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              imageRendering: 'pixelated',
              border: '1.5px solid rgba(232,201,119,0.35)',
              flexShrink: 0,
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
            <span style={{
              fontFamily: '"DM Mono", monospace',
              fontSize: 11,
              fontWeight: 800,
              color: 'var(--yellow)',
              letterSpacing: '0.08em',
              whiteSpace: 'nowrap',
            }}>
              ANNA KARAOKE
            </span>
            {lyricsSourceInfo && (
              <span style={{
                fontFamily: '"DM Mono", monospace',
                fontSize: 8.5,
                letterSpacing: '0.06em',
                color: lyricsSourceInfo.color || 'var(--muted)',
                background: lyricsSourceInfo.bg || 'rgba(255,255,255,0.05)',
                border: `1px solid ${lyricsSourceInfo.border || 'rgba(255,255,255,0.1)'}`,
                padding: '2px 7px',
                borderRadius: 5,
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}>
                {(lyricsSourceInfo.text || '').replace(/^NGUỒN:\s*/i, 'LỜI: ')}
              </span>
            )}
            {hasSynced && !isYtCc && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: 'rgba(232, 201, 119, 0.15)',
                  border: '1px solid rgba(232, 201, 119, 0.4)',
                  color: 'var(--yellow)',
                  fontSize: 9.5,
                  fontWeight: 800,
                  fontFamily: '"DM Mono", monospace',
                  cursor: 'help',
                  flexShrink: 0,
                  lineHeight: 1
                }}
                title="⚠️ Lời từ Spotify / Bên thứ ba · Có thể lệch nhẹ so với video YouTube"
              >
                !
              </span>
            )}
          </div>
        </div>

        {/* Right: Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
          {/* Font size: A | A+ only */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 7,
            border: '1px solid rgba(255,255,255,0.08)',
            padding: 2,
            gap: 1,
          }}>
            {['md', 'lg'].map((size) => (
              <button
                key={size}
                onClick={() => setFontSize(size)}
                style={{
                  border: 0,
                  background: fontSize === size ? 'var(--yellow)' : 'transparent',
                  color: fontSize === size ? '#111' : 'rgba(255,255,255,0.5)',
                  fontWeight: 700,
                  fontSize: size === 'lg' ? 11 : 9,
                  padding: '4px 8px',
                  borderRadius: 5,
                  cursor: 'pointer',
                  fontFamily: '"DM Mono", monospace',
                  lineHeight: 1,
                  transition: 'all .15s',
                }}
                title={size === 'md' ? 'Cỡ chữ bình thường' : 'Cỡ chữ lớn'}
              >
                {size === 'md' ? 'A' : 'A+'}
              </button>
            ))}
          </div>

          {/* Offset calibration (only when synced) */}
          {hasSynced && (
            <button
              onClick={() => setShowOffsetBar((p) => !p)}
              style={{
                border: `1px solid ${showOffsetBar ? 'rgba(232,201,119,0.45)' : 'rgba(255,255,255,0.1)'}`,
                background: showOffsetBar ? 'rgba(232,201,119,0.12)' : 'rgba(255,255,255,0.04)',
                color: showOffsetBar ? 'var(--yellow)' : 'rgba(255,255,255,0.7)',
                borderRadius: 7,
                padding: '6px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 10,
                fontFamily: '"DM Mono", monospace',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all .15s',
              }}
              title="Cân chỉnh độ trễ lời bài hát"
            >
              <SlidersHorizontal size={12} />
              <span>{manualOffsetMs !== 0 ? `${manualOffsetMs > 0 ? '+' : ''}${(manualOffsetMs / 1000).toFixed(1)}s` : 'BÙ TRỄ'}</span>
            </button>
          )}

          {/* Auto scroll toggle */}
          {hasSynced && (
            <button
              onClick={() => setAutoScroll((p) => !p)}
              style={{
                border: `1px solid ${autoScroll ? 'rgba(232,201,119,0.45)' : 'rgba(255,255,255,0.1)'}`,
                background: autoScroll ? 'rgba(232,201,119,0.12)' : 'rgba(255,255,255,0.04)',
                color: autoScroll ? 'var(--yellow)' : 'rgba(255,255,255,0.6)',
                borderRadius: 7,
                padding: '6px 10px',
                fontSize: 10,
                fontFamily: '"DM Mono", monospace',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all .15s',
              }}
            >
              {autoScroll ? 'TỰ CUỘN: BẬT' : 'TỰ CUỘN: TẮT'}
            </button>
          )}

          {/* Exit button */}
          <button
            onClick={onClose}
            style={{
              border: '1px solid rgba(239,120,100,0.4)',
              background: 'rgba(239,120,100,0.1)',
              color: 'var(--coral)',
              borderRadius: 7,
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 10,
              fontFamily: '"DM Mono", monospace',
              letterSpacing: '0.04em',
              transition: 'all .15s',
            }}
            title="Đóng toàn màn hình (ESC)"
          >
            <Minimize2 size={12} />
            <span>THOÁT (ESC)</span>
          </button>
        </div>
      </header>

      {/* ── Offset Calibration Sub-bar ── */}
      {showOffsetBar && hasSynced && (
        <div
          style={{
            position: 'relative',
            zIndex: 20,
            background: 'rgba(14,17,22,0.97)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            padding: '8px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 9.5, color: 'var(--muted)', marginRight: 4 }}>
            BÙ TRỄ:
          </span>
          {[-5000, -2000, -1000, -250].map((ms) => (
            <button
              key={ms}
              onClick={() => onUpdateOffset?.(manualOffsetMs + ms)}
              style={{
                padding: '3px 8px', borderRadius: 5, border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 9.5, cursor: 'pointer',
                fontFamily: '"DM Mono", monospace',
              }}
            >
              {ms > 0 ? `+${ms / 1000}s` : `${ms / 1000}s`}
            </button>
          ))}
          <button
            onClick={() => onUpdateOffset?.(0)}
            style={{
              padding: '3px 10px', borderRadius: 5, border: '1px solid var(--yellow)',
              background: 'rgba(232,201,119,0.12)', color: 'var(--yellow)', fontSize: 9.5,
              cursor: 'pointer', fontWeight: 700, fontFamily: '"DM Mono", monospace',
            }}
          >
            RESET
          </button>
          {[250, 1000, 2000, 5000].map((ms) => (
            <button
              key={ms}
              onClick={() => onUpdateOffset?.(manualOffsetMs + ms)}
              style={{
                padding: '3px 8px', borderRadius: 5, border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 9.5, cursor: 'pointer',
                fontFamily: '"DM Mono", monospace',
              }}
            >
              {ms > 0 ? `+${ms / 1000}s` : `${ms / 1000}s`}
            </button>
          ))}
        </div>
      )}

      {/* ── Main Body ── */}
      <main
        style={{
          position: 'relative',
          zIndex: 10,
          flex: 1,
          minHeight: 0,
          display: 'flex',
          alignItems: 'stretch',
          overflow: 'hidden',
        }}
      >
        {/* Left: Vinyl turntable */}
        <div
          style={{
            width: 'clamp(200px, 28%, 320px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px 16px',
            borderRight: '1px solid rgba(255,255,255,0.05)',
            gap: 14,
          }}
        >
          {/* Vinyl record */}
          <div
            className="kara-vinyl"
            style={{
              width: 'min(22vw, 220px)',
              aspectRatio: '1',
              borderRadius: '50%',
              background: `
                repeating-radial-gradient(
                  circle,
                  #090a0c 0px, #090a0c 1.5px,
                  #181a1f 2px, #0e1013 3.5px
                )
              `,
              boxShadow: '0 20px 60px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.08), 0 0 30px rgba(232,201,119,0.1)',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'vinylSpin 10s linear infinite',
              flexShrink: 0,
            }}
          >
            {/* Album art in center */}
            <div style={{
              width: '44%',
              height: '44%',
              borderRadius: '50%',
              overflow: 'hidden',
              boxShadow: '0 0 0 3px #111316, 0 0 0 5px rgba(212,175,55,0.4)',
            }}>
              <img
                src={current?.thumbnail || DEFAULT_TRACK_THUMB}
                alt="Album"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            {/* Spindle */}
            <div style={{
              position: 'absolute',
              width: 14, height: 14,
              borderRadius: '50%',
              background: 'radial-gradient(circle, #e5c178 0%, #a07832 55%, #4a3612 100%)',
              border: '1px solid #0a0c10',
            }}/>
          </div>

          {/* Track title + artist */}
          <div style={{ textAlign: 'center', maxWidth: 220 }}>
            <h2 style={{
              margin: '0 0 4px',
              fontSize: 15,
              fontWeight: 700,
              color: '#fff',
              lineHeight: 1.35,
              // Proper Vietnamese text rendering
              wordBreak: 'break-word',
              hyphens: 'auto',
              lang: 'vi',
            }}>
              {current?.title || 'Chưa có bài hát'}
            </h2>
            <p style={{
              margin: 0,
              fontSize: 12,
              color: 'var(--yellow)',
              fontWeight: 500,
            }}>
              {current?.artist && current.artist !== 'Unknown' ? current.artist : 'Anna Music'}
            </p>
          </div>

          {/* Play status indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: isPlaying ? '#1db954' : 'var(--muted)',
              boxShadow: isPlaying ? '0 0 6px #1db954' : 'none',
              transition: 'all .3s',
              display: 'inline-block',
              flexShrink: 0,
            }}/>
            <span style={{
              fontFamily: '"DM Mono", monospace',
              fontSize: 9,
              color: isPlaying ? 'rgba(255,255,255,0.6)' : 'var(--muted)',
              letterSpacing: '0.1em',
            }}>
              {isPlaying ? 'ĐANG PHÁT' : 'TẠM DỪNG'}
            </span>
          </div>
        </div>

        {/* Right: Lyrics area */}
        <div
          ref={scrollRef}
          className="kara-lyrics-area"
          style={{
            position: 'relative',
            flex: 1,
            height: '100%',
            overflowY: 'auto',
            padding: '40px 28px 45vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            scrollBehavior: 'smooth',
          }}
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
                      progressBaseRef.current = { baseMs: timeMs, snapshotAt: Date.now(), playing: isPlaying };
                      setLocalProgressMs(timeMs);
                      onAction('seek', seekSec);
                    }
                  }}
                  title={timeMs > 0 ? `Nhảy tới ${formatTime(timeMs)}` : undefined}
                  style={{
                    margin: '4px 0',
                    padding: fontSizes.linePad,
                    borderRadius: 14,
                    // Vietnamese typography: Be Vietnam Pro native support
                    fontFamily: '"Be Vietnam Pro", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    fontSize: isActive ? fontSizes.active : fontSizes.base,
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#ffffff' : isPassed ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.18)',
                    lineHeight: 1.5,
                    textAlign: 'center',
                    cursor: timeMs > 0 ? 'pointer' : 'default',
                    maxWidth: '90%',
                    transition: 'font-size 0.25s cubic-bezier(0.2,0.8,0.2,1), color 0.25s ease, background 0.25s ease, box-shadow 0.25s ease, transform 0.25s ease',
                    background: isActive ? 'rgba(232,201,119,0.12)' : 'transparent',
                    border: isActive ? '1px solid rgba(232,201,119,0.3)' : '1px solid transparent',
                    boxShadow: isActive ? '0 6px 22px rgba(0,0,0,0.4), 0 0 16px rgba(232,201,119,0.15)' : 'none',
                    textShadow: isActive ? '0 0 16px rgba(232,201,119,0.4), 0 2px 6px rgba(0,0,0,0.8)' : 'none',
                    transform: isActive ? 'scale(1.02)' : 'scale(1)',
                    userSelect: 'none',
                    wordBreak: 'keep-all',
                    overflowWrap: 'break-word',
                  }}
                >
                  {line.text}
                </div>
              );
            })
          ) : lyricsData?.lyrics ? (
            <div style={{ maxWidth: 680, textAlign: 'center', padding: '16px 0' }}>
              <div style={{
                fontFamily: '"DM Mono", monospace',
                fontSize: 10, color: 'var(--yellow)',
                background: 'rgba(232,201,119,0.08)',
                padding: '4px 14px', borderRadius: 999, display: 'inline-block',
                marginBottom: 22, border: '1px solid rgba(232,201,119,0.25)',
              }}>
                LỜI BÀI HÁT
              </div>
              <p style={{
                whiteSpace: 'pre-line',
                fontFamily: '"Be Vietnam Pro", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontSize: fontSizes.base,
                lineHeight: 2.1,
                color: 'rgba(255,255,255,0.85)',
                margin: 0,
              }}>
                {lyricsData.lyrics}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', textAlign: 'center', color: 'var(--muted)' }}>
              <Mic2 size={36} style={{ color: 'var(--yellow)', marginBottom: 14, opacity: 0.5 }} />
              <p style={{ fontSize: 17, fontWeight: 600, color: '#fff', margin: '0 0 8px' }}>Chưa có lời bài hát</p>
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>Thư giãn và thưởng thức giai điệu cùng Anna Music ♪</p>
            </div>
          )}
        </div>
      </main>

      {/* ── Bottom Player Bar ── */}
      <footer
        style={{
          position: 'relative',
          zIndex: 30,
          padding: '12px 24px 16px',
          background: 'rgba(10,13,18,0.9)',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {/* Seek row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          maxWidth: 900, width: '100%', margin: '0 auto',
        }}>
          <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, color: 'var(--yellow)', minWidth: 40, textAlign: 'right' }}>
            {formatTime(currentDisplayMs)}
          </span>

          {/* Seek bar */}
          <div
            ref={progressBarRef}
            onMouseDown={handleSeekMouseDown}
            onClick={handleSeekClick}
            className="kara-seek-bar"
            style={{
              flex: 1, height: 20, display: 'flex', alignItems: 'center',
              cursor: 'pointer', position: 'relative',
            }}
          >
            <div style={{
              width: '100%', height: 4, borderRadius: 4,
              background: 'rgba(255,255,255,0.12)',
              overflow: 'visible', position: 'relative',
            }}>
              {/* Progress fill */}
              <div style={{
                height: '100%', width: `${percent}%`,
                background: 'var(--yellow)', borderRadius: 4,
                boxShadow: '0 0 8px rgba(232,201,119,0.45)',
                position: 'relative',
              }}>
                {/* Thumb */}
                <div
                  className="kara-seek-thumb"
                  style={{
                    position: 'absolute', right: -6, top: '50%',
                    transform: 'translateY(-50%)',
                    width: 12, height: 12, borderRadius: '50%',
                    background: '#fff',
                    boxShadow: '0 0 6px rgba(232,201,119,0.6)',
                    opacity: isDraggingSeek ? 1 : 0,
                    transition: 'opacity .15s',
                    pointerEvents: 'none',
                  }}
                />
              </div>
            </div>
          </div>

          <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, color: 'rgba(255,255,255,0.35)', minWidth: 40 }}>
            {formatTime(totalMs)}
          </span>
        </div>

        {/* Controls row */}
        <div style={{
          maxWidth: 960, width: '100%', margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {/* Left: Like & Requester Info */}
          <div
            className="kara-footer-left"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              width: 240,
              minWidth: 240,
              justifyContent: 'flex-start',
            }}
          >
            {/* Like / Favorite Button */}
            <button
              onClick={() => {
                if (!current) return;
                setHeartPopping(true);
                setTimeout(() => setHeartPopping(false), 500);
                onAction?.('toggleFavorite', current);
              }}
              style={{
                border: isFav ? '1px solid rgba(239, 68, 68, 0.45)' : '1px solid rgba(255, 255, 255, 0.12)',
                background: isFav ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                color: isFav ? '#ef4444' : 'rgba(255, 255, 255, 0.75)',
                borderRadius: 20,
                padding: '6px 13px',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                transform: heartPopping ? 'scale(1.18)' : 'scale(1)',
                boxShadow: isFav ? '0 0 14px rgba(239, 68, 68, 0.3)' : 'none',
                userSelect: 'none',
                flexShrink: 0,
              }}
              title={isFav ? 'Xóa khỏi danh sách yêu thích' : 'Thêm vào danh sách yêu thích ❤️'}
              onMouseEnter={(e) => {
                if (!isFav) {
                  e.currentTarget.style.color = '#f87171';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isFav) {
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.75)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                }
              }}
            >
              <Heart
                size={16}
                fill={isFav ? '#ef4444' : 'none'}
                color={isFav ? '#ef4444' : 'currentColor'}
                strokeWidth={isFav ? 0 : 2}
              />
              <span style={{
                fontSize: 12,
                fontWeight: 600,
                fontFamily: '"Be Vietnam Pro", sans-serif',
                letterSpacing: '0.02em',
              }}>
                {isFav ? 'Đã thích' : 'Yêu thích'}
              </span>
            </button>

            {/* Requester info badge (if available) */}
            {current?.requestedBy && (
              <div
                className="kara-requester"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 16,
                  padding: '5px 10px',
                  color: 'rgba(255, 255, 255, 0.55)',
                  fontSize: 11.5,
                  maxWidth: 130,
                  overflow: 'hidden',
                  userSelect: 'none',
                  flexShrink: 1,
                }}
                title={`Người yêu cầu: ${current.requestedBy ? current.requestedBy.replace(/^<@!?\d+>$/, 'Discord User') : ''}`}
              >
                {current.requestedByAvatar ? (
                  <img
                    src={current.requestedByAvatar}
                    alt=""
                    style={{ width: 14, height: 14, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                  />
                ) : (
                  <User size={12} style={{ opacity: 0.6, flexShrink: 0 }} />
                )}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {current.requestedBy?.replace(/^<@!?\d+>$/, 'Discord User')}
                </span>
              </div>
            )}
          </div>

          {/* Center transport */}
          <div
            className="kara-footer-center"
            style={{ display: 'flex', alignItems: 'center', gap: 14 }}
          >
            {/* Shuffle */}
            <button
              onClick={() => onAction?.('shuffle')}
              style={{
                border: 0,
                background: isShuffle ? 'rgba(232, 201, 119, 0.15)' : 'transparent',
                color: isShuffle ? 'var(--yellow)' : 'rgba(255,255,255,0.65)',
                cursor: 'pointer',
                padding: 8,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all .15s',
              }}
              title={isShuffle ? 'Xáo trộn: ĐANG BẬT' : 'Xáo trộn hàng chờ'}
              onMouseEnter={(e) => { if (!isShuffle) e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { if (!isShuffle) e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; }}
            >
              <Shuffle size={18} />
            </button>

            {/* Previous */}
            <button
              onClick={handlePrevious}
              style={{
                border: 0,
                background: 'transparent',
                color: 'rgba(255,255,255,0.75)',
                cursor: 'pointer',
                padding: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color .15s',
              }}
              title="Bài trước"
              onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; }}
            >
              <SkipBack size={22} />
            </button>

            {/* Play/Pause */}
            <button
              onClick={handlePlayPause}
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                border: 0,
                background: 'var(--yellow)',
                color: '#111316',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(232,201,119,0.4)',
                transition: 'transform .15s, box-shadow .15s',
              }}
              title={isPlaying ? 'Tạm dừng (Space)' : 'Phát (Space)'}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.07)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {isPlaying
                ? <Pause size={22} fill="#111316" />
                : <Play size={22} fill="#111316" style={{ marginLeft: 2 }} />
              }
            </button>

            {/* Skip */}
            <button
              onClick={handleSkip}
              style={{
                border: 0,
                background: 'transparent',
                color: 'rgba(255,255,255,0.75)',
                cursor: 'pointer',
                padding: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color .15s',
              }}
              title="Bài kế tiếp"
              onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; }}
            >
              <SkipForward size={22} />
            </button>

            {/* Repeat / Loop */}
            <button
              onClick={() => onAction?.('loop')}
              style={{
                border: 0,
                background: loopMode !== 'off' ? 'rgba(232, 201, 119, 0.15)' : 'transparent',
                color: loopMode !== 'off' ? 'var(--yellow)' : 'rgba(255,255,255,0.65)',
                cursor: 'pointer',
                padding: 8,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                transition: 'all .15s',
              }}
              title={`Lặp lại: ${loopMode === 'song' ? 'Lặp lại 1 bài' : loopMode === 'queue' ? 'Lặp lại cả hàng chờ' : 'Tắt lặp lại'}`}
              onMouseEnter={(e) => { if (loopMode === 'off') e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { if (loopMode === 'off') e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; }}
            >
              <Repeat size={18} />
              {loopMode === 'song' && (
                <span style={{
                  position: 'absolute', top: 1, right: 1,
                  fontSize: 8, fontWeight: 700,
                  background: 'var(--yellow)', color: '#111316',
                  borderRadius: '50%', width: 13, height: 13,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  1
                </span>
              )}
              {loopMode === 'queue' && (
                <span style={{
                  position: 'absolute', top: 1, right: 1,
                  fontSize: 8, fontWeight: 700,
                  background: 'var(--coral)', color: '#fff',
                  borderRadius: '50%', width: 13, height: 13,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  ∞
                </span>
              )}
            </button>
          </div>

          {/* Right: Volume */}
          <div
            className="kara-footer-right"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: 240,
              minWidth: 240,
              justifyContent: 'flex-end',
            }}
          >
            <button
              onClick={handleToggleMute}
              style={{
                border: 0,
                background: 'transparent',
                color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                padding: 6,
                display: 'flex',
                alignItems: 'center',
                transition: 'color .15s',
              }}
              title={localVolume > 0 ? 'Tắt tiếng' : 'Bật tiếng'}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
            >
              {localVolume > 0 ? <Volume2 size={17} /> : <VolumeX size={17} style={{ color: 'var(--coral)' }} />}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={localVolume}
              onChange={(e) => handleVolume(Number(e.target.value))}
              style={{ width: 85, accentColor: 'var(--yellow)', height: 3, cursor: 'pointer' }}
            />
            <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 10.5, color: 'rgba(255,255,255,0.5)', minWidth: 32 }}>
              {localVolume}%
            </span>
          </div>
        </div>
      </footer>
    </div>,
    document.body
  );
}
