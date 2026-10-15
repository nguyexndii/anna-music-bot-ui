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
  Radio,
  User,
  Music2
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
  if (s === 'youtube' || u.includes('youtube.com') || u.includes('youtu.be')) return 'YOUTUBE';
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

export default function HeroPlayer({ player, onAction, user, onRequireAdmin, pendingAction }) {
  const isPlaying = player?.isPlaying && !player?.isPaused;
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
  const [previousVolume, setPreviousVolume] = useState(100);
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
    if (!current || isLofi) return;
    setHeartPopping(true);
    setTimeout(() => setHeartPopping(false), 550);
    onAction('toggleFavorite', current);
  };

  const currentDisplayMs = isDragging ? dragMs : progressMs;
  const percent = totalMs > 0 ? Math.min(100, Math.max(0, (currentDisplayMs / totalMs) * 100)) : 0;

  return (
    <div className="flex-1 flex flex-col justify-between min-h-0 py-1">

      {/* ── Top Upper Section: Album Art Deck & Metadata ──────── */}
      <div className="flex flex-col w-full">
        
        {/* Modern Square Album Art Frame (Zero-GPU Lag, Spotify / Linear style) */}
        <div className="relative w-full max-w-[260px] sm:max-w-[280px] aspect-square mx-auto my-2 rounded-2xl border border-white/[0.08] shadow-2xl shadow-black/80 overflow-hidden bg-[#141417] group">
          {isLofi ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#1c1815] to-[#121214] text-orange-400 gap-2.5 p-6 text-center select-none">
              <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shadow-inner">
                <Coffee size={28} className="text-orange-400" />
              </div>
              <span className="font-mono text-xs font-bold tracking-widest text-orange-400 uppercase">
                24/7 LOFI RADIO
              </span>
              <p className="text-[11px] text-zinc-500 leading-relaxed max-w-[180px]">
                Nhạc không lời thư thái & tập trung
              </p>
            </div>
          ) : current ? (
            <img
              src={getTrackThumb(current)}
              alt={current?.title || 'Album Art'}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
              onError={(e) => { e.currentTarget.src = DEFAULT_TRACK_THUMB; }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#141417] text-zinc-600 gap-2">
              <Music2 size={36} className="text-zinc-700" />
              <span className="font-mono text-[11px] tracking-wider text-zinc-500">CHƯA PHÁT BÀI HÁT</span>
            </div>
          )}

          {/* Top Source Pill */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm border border-white/[0.08] text-[9.5px] font-mono font-semibold tracking-wider text-zinc-300 uppercase">
            {isLofi ? 'RADIO 24/7' : getSourceLabel(current)}
          </div>

          {/* Equalizer Playing Indicator Badge */}
          {isPlaying && (
            <div className="absolute bottom-3 right-3 flex items-end gap-0.5 h-3.5 px-1.5 py-1 rounded bg-black/60 backdrop-blur-sm border border-white/[0.08]" aria-hidden="true">
              <span className="w-0.5 bg-orange-500 rounded-full animate-[bounce_1s_infinite_100ms] h-full" />
              <span className="w-0.5 bg-orange-500 rounded-full animate-[bounce_1s_infinite_300ms] h-2/3" />
              <span className="w-0.5 bg-orange-500 rounded-full animate-[bounce_1s_infinite_200ms] h-4/5" />
            </div>
          )}
        </div>

        {/* Track Metadata */}
        <div className="mt-3.5 flex items-start justify-between gap-3 px-1">
          <div className="min-w-0 flex-1">
            <h2
              className="text-base sm:text-lg font-bold text-zinc-100 tracking-tight leading-snug truncate"
              title={isLofi ? '24/7 Lofi Thư Giãn' : (current?.title || 'Chưa có bài hát')}
            >
              {isLofi ? '24/7 Lofi Thư Giãn' : (current?.title || (player?.isPlaying ? 'Đang phát âm thanh' : 'Chưa có bài hát'))}
            </h2>

            <p
              className="text-xs sm:text-sm font-medium text-zinc-400 truncate mt-0.5"
              title={isLofi ? 'Tự động phát khi phòng chờ • Thư thái & Tập trung' : current?.artist}
            >
              {isLofi ? 'Tự động phát khi phòng chờ • Thư thái & Tập trung' : (current?.artist && current.artist !== 'Unknown' ? current.artist : 'Anna Music')}
            </p>

            {/* Requester Badge */}
            {current?.requestedBy && !isLofi && (
              <div className="inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-full bg-[#18181B] border border-white/[0.06] text-[10px] text-zinc-400">
                {current?.requestedByAvatar ? (
                  <img src={current.requestedByAvatar} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />
                ) : (
                  <User size={10} className="text-zinc-500" />
                )}
                <span className="truncate max-w-[150px]">{current.requestedBy}</span>
              </div>
            )}
          </div>

          {/* Favorite Heart Button */}
          {current && !isLofi && (
            <button
              onClick={handleFavoriteClick}
              className={`p-2 rounded-lg border border-white/[0.06] bg-[#141417] hover:bg-[#1C1C21] transition-all flex-shrink-0 ${
                isFav ? 'text-orange-500 border-orange-500/30' : 'text-zinc-400 hover:text-zinc-200'
              } ${heartPopping ? 'scale-125' : ''}`}
              aria-label={isFav ? 'Bỏ thích' : 'Thích bài hát'}
              title={isFav ? 'Bỏ thích' : 'Thêm vào yêu thích'}
            >
              <Heart size={18} fill={isFav ? 'currentColor' : 'none'} />
            </button>
          )}
        </div>

      </div>

      {/* ── Bottom Section: Progress + Controls + Volume + Voice ── */}
      <div className="flex flex-col w-full mt-auto pt-2">

        {/* Seek Bar */}
        <div className="w-full">
          <div
            ref={progressBarRef}
            onMouseDown={handlePointerDown}
            onTouchStart={handlePointerDown}
            onMouseMove={(e) => {
              if (!progressBarRef.current || totalMs <= 0 || !isPlayable) return;
              const r = progressBarRef.current.getBoundingClientRect();
              const x = Math.max(0, Math.min(e.clientX - r.left, r.width));
              setHoverInfo({ percent: (x / r.width) * 100, timeStr: formatTime(Math.floor((x / r.width) * totalMs)), x });
            }}
            onMouseLeave={() => setHoverInfo(null)}
            role="slider"
            aria-valuemin={0}
            aria-valuemax={Math.floor(totalMs / 1000)}
            aria-valuenow={Math.floor(currentDisplayMs / 1000)}
            aria-label="Tua bài hát"
            className="group relative h-4 flex items-center cursor-pointer select-none"
            style={{
              cursor: (!isPlayable || pendingAction || totalMs <= 0) ? 'not-allowed' : 'pointer',
              opacity: !isPlayable ? 0.35 : (pendingAction === 'seek' ? 0.65 : 1),
              pointerEvents: (!isPlayable || pendingAction) ? 'none' : 'auto'
            }}
          >
            {/* Track Background */}
            <div className="w-full h-1 group-hover:h-1.5 rounded-full bg-[#222226] overflow-hidden transition-all relative">
              <div
                className="h-full bg-orange-500 rounded-full transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>

            {/* Hover Tooltip */}
            {hoverInfo && totalMs > 0 && !isDragging && isPlayable && (
              <div
                className="absolute -top-7 font-mono text-[10px] text-zinc-100 bg-[#18181B] border border-white/[0.1] px-1.5 py-0.5 rounded shadow-lg pointer-events-none -translate-x-1/2 whitespace-nowrap"
                style={{ left: `${hoverInfo.percent}%` }}
              >
                {hoverInfo.timeStr}
              </div>
            )}
          </div>

          {/* Time Labels */}
          <div className="flex justify-between items-center text-[11px] font-mono text-zinc-500 tabular-nums px-0.5 -mt-0.5">
            <span className={isDragging ? 'text-orange-400 font-semibold' : ''}>
              {formatTime(totalMs > 0 ? Math.min(currentDisplayMs, totalMs) : (current ? currentDisplayMs : 0))}
            </span>
            <span>{current?.duration || '0:00'}</span>
          </div>
        </div>

        {/* Transport Controls Bar (Spotify Desktop style) */}
        <div className="flex items-center justify-center gap-3 sm:gap-4 my-2.5">
          {/* Shuffle */}
          <button
            onClick={() => onAction('shuffle')}
            disabled={!isPlayable || Boolean(pendingAction)}
            className={`p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] transition-colors relative ${
              player?.shuffle ? 'text-orange-500' : ''
            }`}
            aria-label="Xáo trộn"
            title="Xáo trộn hàng chờ"
            style={!isPlayable ? { opacity: 0.35, cursor: 'not-allowed' } : (pendingAction ? { opacity: 0.6, cursor: 'not-allowed' } : undefined)}
          >
            <Shuffle size={17} />
            {player?.shuffle && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-500" />}
          </button>

          {/* Previous */}
          <button
            onClick={() => onAction('previous')}
            disabled={!isPlayable || Boolean(pendingAction)}
            className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/[0.04] transition-colors active:scale-95"
            aria-label="Bài trước"
            title={pendingAction === 'previous' ? 'Đang quay lại...' : 'Bài trước'}
            style={!isPlayable ? { opacity: 0.35, cursor: 'not-allowed' } : (pendingAction ? { opacity: 0.6, cursor: 'not-allowed' } : undefined)}
          >
            {pendingAction === 'previous' ? (
              <Loader2 size={18} className="animate-spin text-orange-500" />
            ) : (
              <SkipBack size={19} fill="currentColor" />
            )}
          </button>

          {/* High-Contrast Play/Pause Button (Crisp White Round Button) */}
          <button
            onClick={() => onAction(isPlaying ? 'pause' : 'resume')}
            disabled={!isPlayable || Boolean(pendingAction)}
            className="w-12 h-12 rounded-full bg-zinc-100 text-zinc-950 hover:bg-white hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-lg shadow-black/40"
            aria-label={isPlaying ? 'Tạm dừng' : 'Phát'}
            title={pendingAction === 'playback' ? 'Đang xử lý...' : (isPlaying ? 'Tạm dừng' : 'Phát')}
            style={!isPlayable ? { opacity: 0.35, cursor: 'not-allowed' } : (pendingAction ? { opacity: 0.7, cursor: 'not-allowed' } : undefined)}
          >
            {pendingAction === 'playback' ? (
              <Loader2 size={20} className="animate-spin text-zinc-950" />
            ) : isPlaying ? (
              <Pause size={20} fill="currentColor" />
            ) : (
              <Play size={20} fill="currentColor" className="ml-0.5" />
            )}
          </button>

          {/* Skip Next */}
          <button
            onClick={() => onAction('skip')}
            disabled={!isPlayable || Boolean(pendingAction)}
            className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/[0.04] transition-colors active:scale-95"
            aria-label="Bài tiếp"
            title={pendingAction === 'skip' ? 'Đang chuyển bài...' : 'Bài tiếp'}
            style={!isPlayable ? { opacity: 0.35, cursor: 'not-allowed' } : (pendingAction ? { opacity: 0.6, cursor: 'not-allowed' } : undefined)}
          >
            {pendingAction === 'skip' ? (
              <Loader2 size={18} className="animate-spin text-orange-500" />
            ) : (
              <SkipForward size={19} fill="currentColor" />
            )}
          </button>

          {/* Loop Mode */}
          {(() => {
            const loopMode = player?.loopMode || player?.loop || 'off';
            const isLofiCurrent = Boolean(player?.current && (player?.current?.is247 || player?.current?.requestedBy === 'Auto (24/7)')) || Boolean(player?.mode247 && !player?.current);
            return (
              <button
                onClick={() => onAction('loop')}
                disabled={!isPlayable || Boolean(pendingAction) || isLofiCurrent}
                className={`p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] transition-colors relative ${
                  loopMode !== 'off' ? 'text-orange-500' : ''
                }`}
                aria-label="Lặp lại"
                title={isLofiCurrent ? 'Chế độ Lofi 24/7 tự động phát radio liên tục, không hỗ trợ lặp bài' : `Lặp lại: ${loopMode === 'song' ? 'Lặp lại 1 bài' : loopMode === 'queue' ? 'Lặp lại cả hàng chờ' : 'Tắt lặp lại'}`}
                style={{
                  ...((!isPlayable || isLofiCurrent) ? { opacity: 0.35, cursor: 'not-allowed' } : (pendingAction ? { opacity: 0.6, cursor: 'not-allowed' } : {}))
                }}
              >
                <Repeat size={17} />
                {loopMode === 'song' && (
                  <span className="absolute -top-1 -right-1 font-mono text-[8px] font-bold bg-orange-500 text-zinc-950 rounded-full w-3.5 h-3.5 flex items-center justify-center">1</span>
                )}
                {loopMode === 'queue' && (
                  <span className="absolute -top-1 -right-1 font-mono text-[8px] font-bold bg-orange-500 text-zinc-950 rounded-full w-3.5 h-3.5 flex items-center justify-center">∞</span>
                )}
              </button>
            );
          })()}
        </div>

        {/* Volume & 24/7 Footer */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/[0.06]">
          {/* Volume Control */}
          <div className="flex items-center gap-2 flex-1 max-w-[180px]">
            <button
              onClick={toggleMute}
              className="text-zinc-400 hover:text-zinc-200 p-0 flex items-center transition-colors"
              aria-label={(player?.volume || 0) === 0 ? 'Bật tiếng' : 'Tắt tiếng'}
              title="Tắt/Bật tiếng (M)"
            >
              {(player?.volume || 0) === 0 ? (
                <VolumeX size={15} className="text-red-400" />
              ) : (
                <Volume2 size={15} />
              )}
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
                }, 400);
              }}
              aria-label="Âm lượng"
              className="w-full accent-orange-500 h-1 bg-[#222226] rounded-full cursor-pointer"
            />
            <span className="font-mono text-[10px] text-zinc-500 min-w-[28px] tabular-nums text-right">
              {localVolume}%
            </span>
          </div>

          {/* Lofi 24/7 Action Button */}
          <div>
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
              let btnClasses = 'border-orange-500/25 bg-orange-500/10 text-orange-400 hover:bg-orange-500/15';

              if (isRoomEmpty) {
                btnLabel = 'PHÒNG TRỐNG (24/7)';
                btnTitle = 'Phòng Voice hiện không có ai, bot duy trì phát Lofi 24/7';
                btnIcon = <Coffee size={12} />;
                btnClasses = 'border-white/[0.06] bg-white/[0.02] text-zinc-500 cursor-not-allowed opacity-60';
              } else if (isLofiMode) {
                btnLabel = 'TIẾP TỤC PHÁT';
                btnTitle = queueCount > 0 ? `Tiếp tục phát ${queueCount} bài trong hàng chờ` : 'Phát lại bài hát gần nhất';
                btnIcon = <Play size={11} fill="currentColor" />;
                btnClasses = 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15';
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
                  className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-mono font-bold tracking-wider flex items-center gap-1.5 transition-colors ${btnClasses}`}
                >
                  {isSwitching ? <Loader2 size={11} className="animate-spin" /> : btnIcon}
                  <span>{isSwitching ? 'ĐANG CHUYỂN...' : btnLabel}</span>
                </button>
              );
            })()}
          </div>
        </div>

        {/* Voice Channel Info Card */}
        {player?.voiceChannel?.name && (
          <div className="mt-2.5 px-3 py-2 rounded-xl bg-[#141417] border border-white/[0.06] flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-zinc-200 truncate m-0">
                {player.voiceChannel.name}
              </p>
              <p className="font-mono text-[9px] tracking-wider text-zinc-500 m-0 mt-0.5 uppercase">
                {player.voiceChannel.memberCount || 0} THÀNH VIÊN
              </p>
            </div>
            <div className="flex items-center -space-x-1.5 flex-shrink-0">
              {player.voiceChannel.members?.slice(0, 4).map((m, i) => (
                <img
                  key={i}
                  src={m.avatar}
                  alt={m.name}
                  title={m.name}
                  className="w-5 h-5 rounded-full ring-1 ring-[#141417] object-cover"
                />
              ))}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
