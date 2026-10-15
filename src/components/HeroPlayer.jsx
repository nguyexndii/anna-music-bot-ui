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

  Radio,

  Sparkles

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

  return 'STUDIO STREAM';

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



export default function HeroPlayer({ player, onAction, user, onRequireAdmin, pendingAction, compact = false }) {

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

  const [hoverInfo, setHoverInfo] = useState(null);

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

  const isRoomEmpty = Boolean(player?.voiceChannel && player.voiceChannel.humanMemberCount === 0);

  const isSwitchingLofi = pendingAction === 'toggleLofiMode' || pendingAction === 'switchTo247';



  // Widescreen Hero Banner Mode (Hiển thị trên đầu trang Khám Phá)

  if (compact) {

    return (

      <div className="relative rounded-3xl overflow-hidden border border-white/[0.08] bg-[#0B0F19]/90 shadow-2xl p-5 sm:p-6 mb-6 select-none">

        {/* Background Glow từ Ảnh bìa */}

        <div

          className="absolute inset-0 bg-cover bg-center opacity-25 blur-3xl scale-125 pointer-events-none transition-all duration-1000"

          style={{ backgroundImage: `url(${getTrackThumb(current)})` }}

        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#06080F]/95 via-[#0B0F19]/80 to-transparent pointer-events-none" />



        <div className="relative z-10 flex flex-col md:flex-row items-center gap-5 sm:gap-6">

          {/* Square 3D Artwork with Live Equalizer Overlay */}

          <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-2xl overflow-hidden flex-shrink-0 border border-white/15 shadow-2xl shadow-cyan-500/10 group">

            <img

              src={getTrackThumb(current)}

              alt={current?.title || 'Cover'}

              onError={(e) => { e.currentTarget.src = DEFAULT_TRACK_THUMB; }}

              className={`w-full h-full object-cover transition-transform duration-700 ${isPlaying ? 'scale-105' : 'scale-100'}`}

            />

            {isPlaying && (

              <div className="absolute bottom-2.5 right-2.5 px-2 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 flex items-end gap-1 h-6">

                <span className="w-1 bg-cyan-400 rounded-full eq-bar-1" />

                <span className="w-1 bg-indigo-400 rounded-full eq-bar-2" />

                <span className="w-1 bg-cyan-400 rounded-full eq-bar-3" />

                <span className="w-1 bg-indigo-400 rounded-full eq-bar-4" />

              </div>

            )}

          </div>



          {/* Track Details & Quick Scrubber */}

          <div className="flex-1 min-w-0 text-center md:text-left w-full">

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">

              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">

                <Radio size={11} className={`text-cyan-400 ${isPlaying ? 'animate-pulse' : ''}`} />

                <span>{isLofi ? 'LOFI 24/7 RADIO' : getSourceLabel(current)}</span>

              </span>



              {current?.requestedBy && !isLofi && (

                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-[11px] text-slate-300">

                  {current.requestedByAvatar ? (

                    <img src={current.requestedByAvatar} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />

                  ) : (

                    <User className="text-cyan-400" size={11}/>

                  )}

                  <span className="truncate max-w-[150px]">{String(current.requestedBy).replace(/^<@!?\d+>$/, 'Discord User')}</span>

                </span>

              )}

            </div>



            <h2 className="text-xl sm:text-2xl font-extrabold text-white truncate tracking-tight">

              {isLofi ? (current?.title || 'Không Gian Nhạc Lofi Chill 24/7') : (current?.title || 'Sẵn sàng phát nhạc')}

            </h2>

            <p className="text-xs sm:text-sm font-medium text-cyan-400 truncate mt-1">

              {isLofi

                ? 'Anna Pulse • Tự động phát nhạc nền thư giãn'

                : (current?.artist && current.artist !== 'Unknown' ? current.artist : 'Tìm kiếm bài hát bên dưới để thêm vào phòng thoại')}

            </p>



            {/* Quick Interactive Timeline */}

            <div className="mt-4 max-w-xl">

              <div

                ref={progressBarRef}

                onMouseDown={!isPlayable || pendingAction ? undefined : handlePointerDown}

                onTouchStart={!isPlayable || pendingAction ? undefined : handlePointerDown}

                onMouseMove={handleSeekHover}

                onMouseLeave={() => setHoverInfo(null)}

                className={`group relative h-2 rounded-full bg-slate-800/90 flex items-center ${

                  !isPlayable || pendingAction ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'

                }`}

              >

                {hoverInfo && isPlayable && (

                  <div

                    className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded-md bg-slate-900 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] font-bold pointer-events-none shadow-lg z-20"

                    style={{ left: `${hoverInfo.percent}%` }}

                  >

                    {formatTime(hoverInfo.timeMs)}

                  </div>

                )}

                <div

                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 relative transition-all duration-150"

                  style={{ width: `${percent}%` }}

                >

                  <span className="absolute -right-1.5 -top-1 w-4 h-4 rounded-full bg-white shadow-md scale-90 group-hover:scale-110 transition-transform border-2 border-cyan-400" />

                </div>

              </div>

              <div className="flex justify-between font-mono text-[10px] text-slate-400 mt-1.5">

                <span>{formatTime(currentDisplayMs)}</span>

                <span>{current?.duration || '0:00'}</span>

              </div>

            </div>

          </div>



          {/* Right Quick Actions */}

          <div className="flex md:flex-col items-center gap-2.5 flex-shrink-0">

            <button

              type="button"

              onClick={() => window.dispatchEvent(new CustomEvent('anna_open_karaoke'))}

              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 hover:from-cyan-500/30 hover:to-indigo-500/30 border border-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center gap-2 transition shadow-lg"

            >

              <Maximize2 size={14}/>

              <span>Sân Khấu Karaoke</span>

            </button>



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

              className={`px-4 py-2 rounded-xl border font-mono text-[11px] font-bold flex items-center gap-2 transition ${

                isLofi

                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'

                  : 'bg-white/[0.04] border-white/[0.08] text-slate-300 hover:bg-white/[0.08]'

              }`}

            >

              {isSwitchingLofi ? <Loader2 className="animate-spin" size={13}/> : <Coffee size={13}/>}

              <span>{isLofi ? 'Tiếp Tục Nhạc' : 'Chế Độ Lofi'}</span>

            </button>

          </div>

        </div>

      </div>

    );

  }



  // Full Studio Deck Card (Hiển thị ở Tab Đang Phát / Hàng Chờ)

  return (

    <div className="glass-card rounded-3xl p-6 flex flex-col justify-between h-full select-none relative overflow-hidden">

      <div

        className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none"

        style={{ background: 'radial-gradient(circle, #06b6d4, #6366f1)' }}

      />



      {/* Top Status Pill & Utility Icons */}

      <div className="flex items-center justify-between gap-2 relative z-10">

        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-wider px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/25">

          <Sparkles className="text-cyan-400" size={11}/>

          <span>{isLofi ? 'LOFI 24/7 STREAM' : getSourceLabel(current)}</span>

        </span>



        <div className="flex items-center gap-1.5">

          {current?.url && current.url.startsWith('http') && (

            <a

              href={current.url}

              target="_blank"

              rel="noopener noreferrer"

              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-400 hover:text-cyan-300 transition"

              title="Mở bài hát gốc trên trình duyệt"

            >

              <ExternalLink size={14}/>

            </a>

          )}

          <button

            type="button"

            onClick={() => window.dispatchEvent(new CustomEvent('anna_open_karaoke'))}

            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-400 hover:text-cyan-300 transition"

            title="Mở Sân Khấu Karaoke Toàn Màn Hình"

          >

            <Maximize2 size={14}/>

          </button>

          {!isLofi && current && (

            <button

              type="button"

              onClick={handleFavoriteClick}

              className={`p-2 rounded-xl border transition ${ isFav ? 'bg-rose-500/15 border-rose-500/30 text-rose-400' : 'bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-white' } ${heartPopping ? 'heart-pop-anim' : ''}`}

              title={isFav ? 'Xóa khỏi Yêu thích' : 'Thêm vào Yêu thích'}

            >

              <Heart size={15} fill={isFav ? 'currentColor' : 'none'} />

            </button>

          )}

        </div>

      </div>



      {/* Center Floating 3D Square Cover Art */}

      <div className="my-6 flex flex-col items-center relative z-10">

        <div className="relative w-52 h-52 sm:w-60 sm:h-60 rounded-3xl overflow-hidden border border-white/15 shadow-[0_24px_60px_rgba(0,0,0,0.85),0_0_40px_rgba(6,182,212,0.15)] group">

          <img

            src={getTrackThumb(current)}

            alt={current?.title || 'Album Cover'}

            onError={(e) => { e.currentTarget.src = DEFAULT_TRACK_THUMB; }}

            className={`w-full h-full object-cover transition-transform duration-700 ${isPlaying ? 'scale-105' : 'scale-100'}`}

          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />



          {/* Bottom Equalizer & Requester inside Artwork */}

          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">

            {current?.requestedBy && !isLofi ? (

              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/65 backdrop-blur-md border border-white/10 text-[11px] text-slate-200 max-w-[160px] truncate">

                {current.requestedByAvatar ? (

                  <img src={current.requestedByAvatar} alt="" className="w-4 h-4 rounded-full object-cover flex-shrink-0" />

                ) : (

                  <User className="text-cyan-400 flex-shrink-0" size={11}/>

                )}

                <span className="truncate">{String(current.requestedBy).replace(/^<@!?\d+>$/, 'Discord User')}</span>

              </span>

            ) : (

              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/65 backdrop-blur-md border border-white/10 text-[10px] font-mono text-cyan-300">

                24/7 AUTO STREAM

              </span>

            )}



            <div className="px-2.5 py-1.5 rounded-xl bg-black/65 backdrop-blur-md border border-white/10 flex items-end gap-1 h-6">

              <span className={`w-1 bg-cyan-400 rounded-full ${isPlaying ? 'eq-bar-1' : 'h-1.5'}`} />

              <span className={`w-1 bg-indigo-400 rounded-full ${isPlaying ? 'eq-bar-2' : 'h-2.5'}`} />

              <span className={`w-1 bg-cyan-400 rounded-full ${isPlaying ? 'eq-bar-3' : 'h-1.5'}`} />

              <span className={`w-1 bg-indigo-400 rounded-full ${isPlaying ? 'eq-bar-4' : 'h-2'}`} />

            </div>

          </div>

        </div>



        {/* Title & Artist */}

        <div className="text-center mt-5 w-full px-2">

          <h1

            className="text-lg sm:text-xl font-extrabold text-white truncate tracking-tight"

            title={current?.title || 'Chưa có bài hát đang phát'}

          >

            {isLofi ? (current?.title || 'Nhạc Nền Lofi 24/7 Thư Giãn') : (current?.title || 'Sẵn sàng phát nhạc')}

          </h1>

          <p className="text-xs sm:text-sm font-medium text-cyan-400 truncate mt-1">

            {isLofi

              ? 'Anna Pulse • Chill Beats 24/7'

              : (current?.artist && current.artist !== 'Unknown' ? current.artist : 'Chọn bài ở tab Khám Phá để bắt đầu')}

          </p>

        </div>

      </div>



      {/* Scrubber & Controls */}

      <div className="relative z-10">

        <div

          ref={progressBarRef}

          onMouseDown={!isPlayable || pendingAction ? undefined : handlePointerDown}

          onTouchStart={!isPlayable || pendingAction ? undefined : handlePointerDown}

          onMouseMove={handleSeekHover}

          onMouseLeave={() => setHoverInfo(null)}

          className={`group relative h-2 rounded-full bg-slate-800 flex items-center select-none ${

            !isPlayable || pendingAction ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'

          }`}

        >

          {hoverInfo && isPlayable && (

            <div

              className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded bg-slate-900 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] font-bold pointer-events-none shadow-lg z-20"

              style={{ left: `${hoverInfo.percent}%` }}

            >

              {formatTime(hoverInfo.timeMs)}

            </div>

          )}

          <div

            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 relative transition-all duration-150"

            style={{ width: `${percent}%` }}

          >

            <span className="absolute -right-1.5 -top-1 w-4 h-4 rounded-full bg-white shadow-md scale-90 group-hover:scale-110 transition-transform border-2 border-cyan-400" />

          </div>

        </div>



        <div className="flex items-center justify-between font-mono text-[11px] text-slate-400 mt-1.5 tabular-nums">

          <span>{formatTime(currentDisplayMs)}</span>

          <span>{current?.duration || '0:00'}</span>

        </div>



        {/* Transport Buttons */}

        <div className="flex items-center justify-center gap-4 sm:gap-5 mt-3">

          <button

            type="button"

            onClick={() => onAction('shuffle')}

            disabled={!isPlayable || Boolean(pendingAction)}

            className="p-2 rounded-full text-slate-400 hover:text-white disabled:opacity-40 transition"

            title="Xáo trộn ngẫu nhiên hàng chờ"

          >

            <Shuffle size={17}/>

          </button>



          <button

            type="button"

            onClick={() => onAction('previous')}

            disabled={!isPlayable || Boolean(pendingAction)}

            className="p-2 rounded-full text-slate-200 hover:text-white disabled:opacity-40 transition"

            title="Bài trước"

          >

            {pendingAction === 'previous' ? (

              <Loader2 className="animate-spin text-cyan-400" size={19}/>

            ) : (

              <SkipBack fill="currentColor" size={20}/>

            )}

          </button>



          <button

            type="button"

            onClick={() => onAction(isPlaying ? 'pause' : 'resume')}

            disabled={!isPlayable || Boolean(pendingAction)}

            className="w-13 h-13 p-3.5 rounded-2xl bg-gradient-to-br from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-slate-950 flex items-center justify-center shadow-lg shadow-cyan-500/25 hover:scale-105 active:scale-95 transition disabled:opacity-40"

            title={isPlaying ? 'Tạm dừng (Space)' : 'Phát (Space)'}

          >

            {pendingAction === 'playback' ? (

              <Loader2 className="animate-spin text-slate-950" size={22}/>

            ) : isPlaying ? (

              <Pause fill="currentColor" size={22}/>

            ) : (

              <Play className="ml-0.5" fill="currentColor" size={22}/>

            )}

          </button>



          <button

            type="button"

            onClick={() => onAction('skip')}

            disabled={!isPlayable || Boolean(pendingAction)}

            className="p-2 rounded-full text-slate-200 hover:text-white disabled:opacity-40 transition"

            title="Bài kế tiếp"

          >

            {pendingAction === 'skip' ? (

              <Loader2 className="animate-spin text-cyan-400" size={19}/>

            ) : (

              <SkipForward fill="currentColor" size={20}/>

            )}

          </button>



          <button

            type="button"

            onClick={() => onAction('loop')}

            disabled={!isPlayable || Boolean(pendingAction) || isLofi}

            className={`relative p-2 rounded-full transition disabled:opacity-40 ${

              loopMode !== 'off' ? 'text-cyan-400 bg-cyan-500/10' : 'text-slate-400 hover:text-white'

            }`}

            title={`Chế độ lặp: ${loopMode === 'song' ? 'Lặp 1 bài' : loopMode === 'queue' ? 'Lặp hàng chờ' : 'Tắt'}`}

          >

            <Repeat size={17}/>

            {loopMode !== 'off' && (

              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-cyan-400 text-slate-950 font-mono text-[8px] font-bold flex items-center justify-center">

                {loopMode === 'song' ? '1' : '∞'}

              </span>

            )}

          </button>

        </div>



        {/* Footer Lofi & Volume */}

        <div className="mt-5 pt-3.5 border-t border-white/[0.08] flex items-center justify-between gap-3">

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

            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono text-[10px] font-bold tracking-wider transition ${

              isRoomEmpty

                ? 'border-white/[0.06] bg-white/[0.02] text-slate-500 cursor-not-allowed opacity-60'

                : isLofi

                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'

                : 'bg-cyan-500/10 border-cyan-500/25 text-cyan-300 hover:bg-cyan-500/20'

            }`}

          >

            {isSwitchingLofi ? <Loader2 className="animate-spin" size={12}/> : <Coffee size={12}/>}

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

              className="text-slate-400 hover:text-white p-1"

              title={localVolume === 0 ? 'Bật tiếng (M)' : 'Tắt tiếng (M)'}

            >

              {localVolume === 0 ? <VolumeX className="text-rose-400" size={15}/> : <Volume2 size={15}/>}

            </button>

            <input

              type="range"

              min="0"

              max="100"

              value={localVolume}

              onChange={handleVolumeChange}

              className="flex-1 h-1 bg-slate-800 rounded-lg accent-cyan-400 cursor-pointer"

            />

            <span className="font-mono text-[10px] text-slate-400 w-7 text-right tabular-nums">

              {localVolume}%

            </span>

          </div>

        </div>

      </div>

    </div>

  );

}
