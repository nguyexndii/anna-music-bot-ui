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

  // Tính góc xoay cần kim tonearm cơ học chạm rãnh (từ 0° tới ~16° khi chơi nhạc)
  const tonearmAngle = isPlaying ? (2 + (percent / 100) * 14) : -22;

  const coverUrl = getTrackThumb(current);

  return (
    <div className={`w-full flex flex-col justify-between ${isMobileCenter ? 'py-2 px-1 max-w-md mx-auto min-h-[500px]' : 'h-full gap-2'}`}>

      {/* ── 1. MÂM ĐĨA THAN AUDIOPHILE CHÂN THỰC (Audiophile Vinyl Lounge) ───────── */}
      <div className="relative w-full h-[200px] sm:h-[210px] bg-gradient-to-b from-[#0c0e11] via-[#14161b] to-[#1c1e24] rounded-2xl flex items-center justify-center overflow-hidden shadow-2xl border border-white/5 shrink-0 my-1">
        {/* Platter Hợp Kim Nhôm & Đế Mâm Kim Loại */}
        <div className="w-[180px] h-[180px] rounded-full p-[4px] bg-[#121316] shadow-[0_12px_32px_rgba(0,0,0,0.95)] flex items-center justify-center border border-[#2b2d35] relative">
          {/* Đĩa Than Vinyl 33⅓ RPM Quay Tròn */}
          <div
            className={`relative w-[170px] h-[170px] rounded-full flex items-center justify-center cursor-pointer overflow-hidden ${
              isPlaying ? 'animate-spin-record' : ''
            }`}
            style={{
              background: 'radial-gradient(circle, #0e0f11 0%, #151619 40%, #0d0e10 65%, #18191c 78%, #0a0a0c 100%)',
              animationPlayState: isPlaying ? 'running' : 'paused'
            }}
            onClick={() => onAction(isPlaying ? 'pause' : 'resume')}
            title={isPlaying ? 'Nhấn để tạm dừng' : 'Nhấn để phát'}
          >
            {/* Microgrooves Rãnh Đĩa Thật */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                background: 'repeating-radial-gradient(circle at center, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 1px, transparent 1.5px, transparent 3.5px)'
              }}
            />
            <div className="absolute inset-[10px] rounded-full border border-white/[0.04] pointer-events-none" />
            <div className="absolute inset-[24px] rounded-full border border-white/[0.03] pointer-events-none" />
            <div className="absolute inset-[40px] rounded-full border border-[#ffe08e]/10 pointer-events-none" />

            {/* Vệt Sáng Quang Học Phản Chiếu Conic 4 Cánh */}
            <div
              className="absolute inset-0 rounded-full opacity-40 pointer-events-none mix-blend-screen"
              style={{
                background: 'conic-gradient(from 45deg, transparent 0deg, rgba(255,230,169,0.2) 45deg, transparent 90deg, rgba(255,255,255,0.1) 135deg, transparent 180deg, rgba(255,230,169,0.2) 225deg, transparent 270deg, rgba(255,255,255,0.1) 315deg, transparent 360deg)'
              }}
            />

            {/* TÂM MÂM ĐĨA: Ảnh Album Bìa Bài Hát Tròn Lớn Viền Đồng Thau Kép */}
            <div className="relative w-[70px] h-[70px] rounded-full p-[2px] bg-gradient-to-tr from-[#69530b] via-[#c49b2c] to-[#ffe08e] shadow-xl flex items-center justify-center shrink-0 border border-[#ffe08e]/60 z-10 select-none">
              <div className="w-full h-full rounded-full overflow-hidden relative flex items-center justify-center bg-[#18150e]">
                <img
                  src={coverUrl}
                  alt={current?.title || 'Album Art'}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/default-playlist.jpg'; }}
                />
                {/* Lỗ Trục Spindle Đồng Thau & Đen Kim Loại CNC */}
                <div className="absolute inset-0 m-auto w-3 h-3 rounded-full bg-gradient-to-b from-[#ffe08e] to-[#584400] flex items-center justify-center p-[1px] shadow-md pointer-events-none">
                  <div className="w-full h-full rounded-full bg-[#0a0a0c] border border-black/50 flex items-center justify-center">
                    <div className="w-1 h-1 rounded-full bg-[#999]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CẦN KIM CHỮ S ĐỒNG THAU (Tonearm) Xoay Cơ Học */}
        <div
          className="absolute top-1 right-2 z-20 pointer-events-none select-none origin-top-right transition-transform duration-700 ease-out"
          style={{ transform: `rotate(${tonearmAngle}deg)` }}
        >
          {/* Trục Xoay Pivot Đồng Thau */}
          <div className="absolute top-1 right-2 w-6 h-6 rounded-full bg-gradient-to-b from-[#3a3c40] to-[#141518] border border-[#ffe08e]/50 shadow-md flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-[#c49b2c] to-[#ffe6a9]" />
          </div>
          {/* SVG Cần Kim Chữ S Kim Loại Audiophile */}
          <svg className="w-[84px] h-[145px] drop-shadow-[1px_3px_5px_rgba(0,0,0,0.9)]" fill="none" viewBox="0 0 80 140" xmlns="http://www.w3.org/2000/svg">
            <path d="M 67 15 C 65 42, 72 65, 58 92 C 50 108, 40 115, 30 126" stroke="#e8c977" strokeLinecap="round" strokeWidth="2.5" />
            <path d="M 28 126 L 16 134 L 19 139 L 31 131 Z" fill="#282a2d" stroke="#ffe08e" strokeWidth="0.8" />
            <circle cx="17" cy="138" fill="#ffb4a7" r="1.2" />
          </svg>
        </div>

        {/* Direct Drive Badge */}
        <div className="absolute bottom-2 right-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/60 border border-white/5 font-mono text-[9px] text-primary-container tracking-wider uppercase pointer-events-none">
          <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-outline'}`}></span>
          <span>33⅓ RPM • DIRECT DRIVE</span>
        </div>
      </div>

      {/* ── 2. TRACK INFORMATION ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-0.5 shrink-0 px-1 mt-1">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9px] text-outline uppercase tracking-wider">
            {getSourceLabel(current)} • LOSSLESS
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

        <h2 className="text-sm sm:text-base font-bold text-on-surface truncate leading-snug">
          {current?.title || 'Chưa có bài hát đang phát'}
        </h2>
        <p className="text-xs text-primary-container truncate font-medium">
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
