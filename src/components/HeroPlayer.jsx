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
  ExternalLink
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
  const isFav = Boolean(
    player?.favorites?.some(f =>
      (f.url && current?.url && f.url === current?.url) ||
      (f.title && current?.title && f.title.toLowerCase().trim() === current?.title.toLowerCase().trim())
    )
  );

  const [progressMs, setProgressMs] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMs, setDragMs] = useState(0);
  const [hoverInfo, setHoverInfo] = useState(null); // { percent, timeMs }
  const [localVolume, setLocalVolume] = useState(player?.volume ?? 80);
  const [previousVolume, setPreviousVolume] = useState(80);
  const [heartPopping, setHeartPopping] = useState(false);

  const progressBarRef = useRef(null);
  const progressBaseRef = useRef({ baseMs: 0, snapshotAt: Date.now(), playing: false });
  const volumeDebounceRef = useRef(null);
  const lastSeekTimeRef = useRef(0);

  const totalMs = parseDurationToMs(current?.duration);

  useEffect(() => {
    if (volumeDebounceRef.current) return;
    if (player?.volume !== undefined) setLocalVolume(player.volume);
  }, [player?.volume]);

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

  const handleSeekHover = (e) => {
    if (!progressBarRef.current || totalMs <= 0 || !isPlayable) return;
    const r = progressBarRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    setHoverInfo({
      percent: ratio * 100,
      timeMs: Math.floor(ratio * totalMs)
    });
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

  const toggleMute = useCallback(() => {
    if (localVolume > 0) {
      setPreviousVolume(localVolume);
      setLocalVolume(0);
      onAction('volume', 0);
    } else {
      const restored = previousVolume || 80;
      setLocalVolume(restored);
      onAction('volume', restored);
    }
  }, [localVolume, previousVolume, onAction]);

  useEffect(() => {
    const kd = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
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
  }, [isPlayable, isPlaying, current, totalMs, isDragging, dragMs, progressMs, handleSeekCommit, onAction, toggleMute]);

  const handleVolumeChange = (e) => {
    const val = parseInt(e.target.value, 10);
    setLocalVolume(val);
    if (volumeDebounceRef.current) clearTimeout(volumeDebounceRef.current);
    volumeDebounceRef.current = setTimeout(() => {
      onAction('volume', val);
      volumeDebounceRef.current = null;
    }, 180);
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
  const loopMode = player?.loopMode || player?.loop || 'off';
  const tonearmAngle = isPlaying ? 2 + (percent / 100) * 14 : -24;
  const isRoomEmpty = Boolean(player?.voiceChannel && player.voiceChannel.humanMemberCount === 0);
  const isSwitchingLofi = pendingAction === 'toggleLofiMode' || pendingAction === 'switchTo247';

  return (
    <div className="flex-1 flex flex-col justify-between min-h-0 select-none">
      {/* ── Center Vinyl Record & Tonearm ── */}
      <div className="my-auto flex flex-col justify-center">
        <div className="vinyl-deck">
          <div className={`vinyl-wrap ${isPlaying ? 'spinning' : 'spinning-paused'}`}>
            <div className="vinyl-grooves" />
            <div className="vinyl-art">
              <img
                src={getTrackThumb(current)}
                alt={current?.title || 'Vinyl Cover'}
                onError={(e) => { e.currentTarget.src = DEFAULT_TRACK_THUMB; }}
              />
            </div>
            <div className="vinyl-spindle-hole">
              <div className="spindle-dot" />
            </div>
          </div>

          {/* Mechanical Tonearm */}
          <div
            className="tonearm-assembly"
            style={{ transform: `rotate(${tonearmAngle}deg)` }}
            aria-hidden="true"
          >
            <svg viewBox="0 0 68 195" className="tonearm-svg">
              <circle cx="38" cy="40" r="18" fill="#18181b" stroke="rgba(255,255,255,0.14)" strokeWidth="1.5" />
              <circle cx="38" cy="40" r="10" fill="#27272a" stroke="#f97316" strokeWidth="1" />
              <rect x="33" y="10" width="10" height="16" rx="3" fill="#3f3f46" />
              <path
                d="M 38 40 L 38 135 Q 38 152 24 168"
                fill="none"
                stroke="#d4d4d8"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <polygon points="18,164 28,170 20,182 12,176" fill="#f97316" />
            </svg>
          </div>
        </div>

        {/* ── Track Metadata & Actions ── */}
        <div className="mt-2">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono text-[9.5px] font-bold tracking-wider px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/25">
                {isLofi ? 'LOFI 24/7' : getSourceLabel(current)}
              </span>
              {current?.requestedBy && !isLofi && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#18181B] border border-white/[0.06] text-[10.5px] text-zinc-400 max-w-[165px] truncate">
                  {current.requestedByAvatar ? (
                    <img src={current.requestedByAvatar} alt="" className="w-3.5 h-3.5 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <User className="text-zinc-500 flex-shrink-0" size={10} />
                  )}
                  <span className="truncate">{String(current.requestedBy).replace(/^<@!?\d+>$/, 'Discord User')}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {current?.url && current.url.startsWith('http') && (
                <a
                  href={current.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg bg-[#18181B] hover:bg-[#222226] border border-white/[0.07] text-zinc-400 hover:text-orange-400 transition-colors"
                  title="Mở liên kết bài hát gốc"
                >
                  <ExternalLink size={13} />
                </a>
              )}

              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('anna_open_karaoke'))}
                className="p-1.5 rounded-lg bg-[#18181B] hover:bg-[#222226] border border-white/[0.07] text-zinc-400 hover:text-orange-400 transition-colors"
                title="Mở Sân khấu Karaoke toàn màn hình"
              >
                <Maximize2 size={13} />
              </button>

              {!isLofi && current && (
                <button
                  type="button"
                  onClick={handleFavoriteClick}
                  className={`fav-btn ${isFav ? 'liked' : ''} ${heartPopping ? 'heart-pop-anim' : ''}`}
                  title={isFav ? 'Xóa khỏi Yêu thích' : 'Thêm vào Yêu thích'}
                >
                  <Heart fill={isFav ? 'currentColor' : 'none'} size={19} />
                </button>
              )}
            </div>
          </div>

          <h1
            className="text-lg sm:text-xl font-bold text-zinc-100 truncate tracking-tight m-0"
            title={current?.title || 'Chưa có bài hát đang phát'}
          >
            {isLofi ? (current?.title || 'Nhạc nền Lofi 24/7 Thư Giãn') : (current?.title || 'Sẵn sàng phát nhạc')}
          </h1>
          <p className="text-xs sm:text-sm font-medium text-orange-400 truncate mt-0.5 mb-0">
            {isLofi
              ? 'Anna Music • Chill Beats 24/7'
              : (current?.artist && current.artist !== 'Unknown' ? current.artist : 'Chọn bài ở tab Khám Phá để bắt đầu')}
          </p>
        </div>

        {/* ── Scrubber Progress Bar with Hover Time Preview ── */}
        <div className="mt-4">
          <div
            ref={progressBarRef}
            onMouseDown={!isPlayable || pendingAction ? undefined : handlePointerDown}
            onTouchStart={!isPlayable || pendingAction ? undefined : handlePointerDown}
            onMouseMove={handleSeekHover}
            onMouseLeave={() => setHoverInfo(null)}
            className={`group relative h-2 rounded-full bg-[#222226] flex items-center select-none ${
              !isPlayable || pendingAction ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            {hoverInfo && isPlayable && (
              <div
                className="absolute -top-7 -translate-x-1/2 px-1.5 py-0.5 rounded bg-zinc-900 border border-orange-500/40 text-orange-400 font-mono text-[10px] font-bold pointer-events-none shadow-lg z-20"
                style={{ left: `${hoverInfo.percent}%` }}
              >
                {formatTime(hoverInfo.timeMs)}
              </div>
            )}
            <div
              className="h-full rounded-full bg-orange-500 relative transition-all duration-150"
              style={{ width: `${percent}%` }}
            >
              <span className="absolute -right-1.5 -top-1 w-4 h-4 rounded-full bg-white shadow-md scale-90 group-hover:scale-110 transition-transform border-2 border-orange-500" />
            </div>
          </div>

          <div className="flex items-center justify-between font-mono text-[10.5px] text-zinc-500 mt-1.5 tabular-nums">
            <span>{formatTime(currentDisplayMs)}</span>
            <span>{current?.duration || '0:00'}</span>
          </div>
        </div>

        {/* ── Transport Controls ── */}
        <div className="flex items-center justify-center gap-5 mt-3">
          <button
            type="button"
            onClick={() => onAction('shuffle')}
            disabled={!isPlayable || Boolean(pendingAction)}
            className="p-2 rounded-full text-zinc-400 hover:text-zinc-100 disabled:opacity-40 transition"
            title="Xáo trộn ngẫu nhiên hàng chờ"
          >
            <Shuffle size={17} />
          </button>

          <button
            type="button"
            onClick={() => onAction('previous')}
            disabled={!isPlayable || Boolean(pendingAction)}
            className="p-2 rounded-full text-zinc-300 hover:text-white disabled:opacity-40 transition"
            title="Bài trước"
          >
            {pendingAction === 'previous' ? (
              <Loader2 className="animate-spin text-orange-500" size={19} />
            ) : (
              <SkipBack fill="currentColor" size={20} />
            )}
          </button>

          <button
            type="button"
            onClick={() => onAction(isPlaying ? 'pause' : 'resume')}
            disabled={!isPlayable || Boolean(pendingAction)}
            className="w-12 h-12 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center shadow-lg shadow-orange-500/30 hover:scale-105 active:scale-95 transition disabled:opacity-40"
            title={isPlaying ? 'Tạm dừng (Space)' : 'Phát (Space)'}
          >
            {pendingAction === 'playback' ? (
              <Loader2 className="animate-spin text-white" size={20} />
            ) : isPlaying ? (
              <Pause fill="currentColor" size={21} />
            ) : (
              <Play className="ml-0.5" fill="currentColor" size={21} />
            )}
          </button>

          <button
            type="button"
            onClick={() => onAction('skip')}
            disabled={!isPlayable || Boolean(pendingAction)}
            className="p-2 rounded-full text-zinc-300 hover:text-white disabled:opacity-40 transition"
            title="Bài kế tiếp"
          >
            {pendingAction === 'skip' ? (
              <Loader2 className="animate-spin text-orange-500" size={19} />
            ) : (
              <SkipForward fill="currentColor" size={20} />
            )}
          </button>

          <button
            type="button"
            onClick={() => onAction('loop')}
            disabled={!isPlayable || Boolean(pendingAction) || isLofi}
            className={`relative p-2 rounded-full transition disabled:opacity-40 ${
              loopMode !== 'off' ? 'text-orange-400 bg-orange-500/10' : 'text-zinc-400 hover:text-zinc-100'
            }`}
            title={`Chế độ lặp: ${loopMode === 'song' ? 'Lặp 1 bài' : loopMode === 'queue' ? 'Lặp hàng chờ' : 'Tắt'}`}
          >
            <Repeat size={17} />
            {loopMode !== 'off' && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-orange-500 text-zinc-950 font-mono text-[8px] font-bold flex items-center justify-center">
                {loopMode === 'song' ? '1' : '∞'}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Bottom Footer: 24/7 Lofi Switch & Volume Slider ── */}
      <footer className="pt-3 border-t border-white/[0.07] flex items-center justify-between gap-3 flex-shrink-0">
        <button
          type="button"
          onClick={() => {
            if (isSwitchingLofi) return;
            if (isRoomEmpty) {
              onAction('notifyEmptyRoom');
              return;
            }
            onAction('toggleLofiMode');
          }}
          disabled={Boolean(pendingAction)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-mono text-[10px] font-bold tracking-wider transition ${
            isRoomEmpty
              ? 'border-white/[0.06] bg-white/[0.02] text-zinc-500 cursor-not-allowed opacity-60'
              : isLofi
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/15'
              : 'bg-orange-500/10 border-orange-500/25 text-orange-400 hover:bg-orange-500/15'
          }`}
          title={
            isRoomEmpty
              ? 'Phòng Voice hiện không có ai, bot duy trì phát Lofi 24/7'
              : isLofi
              ? 'Quay lại phát nhạc của người dùng'
              : 'Lưu hàng chờ và chuyển sang nhạc nền Lofi 24/7'
          }
        >
          {isSwitchingLofi ? <Loader2 className="animate-spin" size={12} /> : <Coffee size={12} />}
          <span>
            {isSwitchingLofi
              ? 'ĐANG CHUYỂN...'
              : isRoomEmpty
              ? 'PHÒNG TRỐNG (24/7)'
              : isLofi
              ? 'TIẾP TỤC NHẠC'
              : 'CHẾ ĐỘ LOFI'}
          </span>
        </button>

        <div className="flex items-center gap-2 w-32 sm:w-36">
          <button
            type="button"
            onClick={toggleMute}
            className="text-zinc-400 hover:text-zinc-100 p-1"
            title={localVolume === 0 ? 'Bật tiếng (M)' : 'Tắt tiếng (M)'}
          >
            {localVolume === 0 ? <VolumeX className="text-rose-400" size={15} /> : <Volume2 size={15} />}
          </button>
          <input
            type="range"
            min="0"
            max="100"
            value={localVolume}
            onChange={handleVolumeChange}
            className="flex-1 h-1 bg-[#222226] rounded-lg accent-orange-500 cursor-pointer"
          />
          <span className="font-mono text-[10px] text-zinc-400 w-7 text-right tabular-nums">
            {localVolume}%
          </span>
        </div>
      </footer>
    </div>
  );
}
