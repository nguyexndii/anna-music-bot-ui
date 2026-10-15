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

  Mic2,

  ListMusic,

  Heart,

  Loader2,

  Maximize2,

  Coffee

} from 'lucide-react';

import { DEFAULT_TRACK_THUMB } from '../config';



function parseDurationToMs(durationStr) {

  if (!durationStr || durationStr === 'LIVE' || durationStr.includes('Live')) return 0;

  const parts = durationStr.split(':').map(Number);

  if (parts.length === 2) return (parts[0] * 60 + parts[1]) * 1000;

  if (parts.length === 3) return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;

  return 0;

}



function formatMsToTime(ms) {

  if (!ms || ms < 0) return '0:00';

  const totalSeconds = Math.floor(ms / 1000);

  const minutes = Math.floor(totalSeconds / 60);

  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

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

  activeTab,

  setActiveTab,

  pendingAction

}) {

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

  const [previousVolume, setPreviousVolume] = useState(80);

  const [localVolume, setLocalVolume] = useState(player?.volume ?? 80);

  const volumeDebounceRef = useRef(null);

  const lastSeekTimeRef = useRef(0);

  const progressBaseRef = useRef({ baseMs: 0, snapshotAt: Date.now(), playing: false });



  const progressBarRef = useRef(null);

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

    const rect = progressBarRef.current.getBoundingClientRect();

    const offsetX = Math.max(0, Math.min(clientX - rect.left, rect.width));

    return Math.floor((offsetX / rect.width) * totalMs);

  }, [totalMs]);



  const handleSeekCommit = useCallback((targetMs) => {

    const targetSeconds = Math.max(0, Math.min(Math.floor(totalMs / 1000), Math.floor(targetMs / 1000)));

    lastSeekTimeRef.current = Date.now();

    progressBaseRef.current = { baseMs: targetMs, snapshotAt: Date.now(), playing: isPlaying };

    setProgressMs(targetMs);

    setIsDragging(false);

    onAction('seek', targetSeconds);

  }, [totalMs, onAction, isPlaying]);



  const handlePointerDown = (e) => {

    if (!isPlayable || !current || totalMs <= 0) return;

    const clientX = e.clientX ?? e.touches?.[0]?.clientX;

    if (clientX === undefined) return;

    setIsDragging(true);

    setDragMs(calculateTimeFromEvent(clientX));

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

    const handlePointerMove = (e) => {

      const clientX = e.clientX ?? e.touches?.[0]?.clientX;

      if (clientX !== undefined) setDragMs(calculateTimeFromEvent(clientX));

    };

    const handlePointerUp = (e) => {

      const clientX = e.clientX ?? e.changedTouches?.[0]?.clientX;

      if (clientX !== undefined) handleSeekCommit(calculateTimeFromEvent(clientX));

      else handleSeekCommit(dragMs);

    };

    window.addEventListener('mousemove', handlePointerMove);

    window.addEventListener('mouseup', handlePointerUp);

    window.addEventListener('touchmove', handlePointerMove);

    window.addEventListener('touchend', handlePointerUp);

    return () => {

      window.removeEventListener('mousemove', handlePointerMove);

      window.removeEventListener('mouseup', handlePointerUp);

      window.removeEventListener('touchmove', handlePointerMove);

      window.removeEventListener('touchend', handlePointerUp);

    };

  }, [isDragging, dragMs, calculateTimeFromEvent, handleSeekCommit]);



  const handleVolumeChange = (e) => {

    const val = parseInt(e.target.value, 10);

    setLocalVolume(val);

    if (volumeDebounceRef.current) clearTimeout(volumeDebounceRef.current);

    volumeDebounceRef.current = setTimeout(() => {

      onAction('volume', val);

      volumeDebounceRef.current = null;

    }, 180);

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



  const currentDisplayMs = isDragging ? dragMs : progressMs;

  const percent = totalMs > 0 ? Math.min(100, Math.max(0, (currentDisplayMs / totalMs) * 100)) : 0;

  const loopMode = player?.loopMode || player?.loop || 'off';

  const isRoomEmpty = Boolean(player?.voiceChannel && player.voiceChannel.humanMemberCount === 0);



  return (

    <footer className="w-full h-20 bg-[#080B14]/95 backdrop-blur-2xl border-t border-white/[0.08] px-3 sm:px-6 flex items-center justify-between gap-3 sm:gap-6 z-40 select-none flex-shrink-0">

      {/* Left: Artwork & Track Info */}

      <div className="flex items-center gap-3 min-w-0 w-[30%] sm:w-[28%]">

        <div

          onClick={() => window.dispatchEvent(new CustomEvent('anna_open_karaoke'))}

          className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-900 border border-white/10 flex-shrink-0 cursor-pointer group"

          title="Mở Sân khấu Karaoke toàn màn hình"

        >

          <img

            src={getTrackThumb(current)}

            alt={current?.title || 'Cover'}

            onError={(e) => { e.currentTarget.src = DEFAULT_TRACK_THUMB; }}

            className="w-full h-full object-cover group-hover:scale-110 transition-transform"

          />

          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">

            <Maximize2 className="text-white" size={14}/>

          </div>

        </div>



        <div className="min-w-0 flex-1">

          <div className="flex items-center gap-1.5">

            <p

              onClick={() => setActiveTab?.('queue')}

              className="text-xs sm:text-sm font-bold text-slate-100 hover:text-cyan-300 truncate cursor-pointer m-0 transition-colors"

              title={current?.title}

            >

              {isLofi ? (current?.title || '24/7 Lofi Thư Giãn') : (current?.title || 'Chưa phát bài nào')}

            </p>

            {current && !isLofi && (

              <button

                type="button"

                onClick={() => onAction('toggleFavorite', current)}

                className={`p-1 rounded-lg transition ${isFav ? 'text-rose-400' : 'text-slate-500 hover:text-slate-200'}`}

                title={isFav ? 'Xóa khỏi Yêu thích' : 'Thêm vào Yêu thích'}

              >

                <Heart size={14} fill={isFav ? 'currentColor' : 'none'} />

              </button>

            )}

          </div>

          <p className="text-[11px] text-cyan-400/90 truncate m-0 mt-0.5 font-medium">

            {isLofi ? 'Chế độ phát nền 24/7' : (current?.artist && current.artist !== 'Unknown' ? current.artist : 'Anna Pulse Studio')}

          </p>

        </div>

      </div>



      {/* Center: Transport Controls + Scrubber */}

      <div className="flex-1 max-w-xl flex flex-col items-center gap-1.5">

        <div className="flex items-center gap-3 sm:gap-5">

          <button

            type="button"

            onClick={() => onAction('shuffle')}

            disabled={!isPlayable || Boolean(pendingAction)}

            title="Xáo trộn hàng chờ"

            className="p-1.5 text-slate-400 hover:text-white disabled:opacity-35 transition"

          >

            <Shuffle size={15}/>

          </button>



          <button

            type="button"

            onClick={() => onAction('previous')}

            disabled={!isPlayable || Boolean(pendingAction)}

            title="Bài trước"

            className="p-1.5 text-slate-200 hover:text-white disabled:opacity-35 transition"

          >

            {pendingAction === 'previous' ? (

              <Loader2 className="animate-spin text-cyan-400" size={16}/>

            ) : (

              <SkipBack fill="currentColor" size={17}/>

            )}

          </button>



          <button

            type="button"

            onClick={() => onAction(isPlaying ? 'pause' : 'resume')}

            disabled={!isPlayable || Boolean(pendingAction)}

            title={isPlaying ? 'Tạm dừng (Space)' : 'Phát (Space)'}

            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-slate-950 flex items-center justify-center shadow-lg shadow-cyan-500/20 hover:scale-105 active:scale-95 transition disabled:opacity-40"

          >

            {pendingAction === 'playback' ? (

              <Loader2 className="animate-spin text-slate-950" size={17}/>

            ) : isPlaying ? (

              <Pause fill="currentColor" size={17}/>

            ) : (

              <Play className="ml-0.5" fill="currentColor" size={17}/>

            )}

          </button>



          <button

            type="button"

            onClick={() => onAction('skip')}

            disabled={!isPlayable || Boolean(pendingAction)}

            title="Bài kế tiếp"

            className="p-1.5 text-slate-200 hover:text-white disabled:opacity-35 transition"

          >

            {pendingAction === 'skip' ? (

              <Loader2 className="animate-spin text-cyan-400" size={16}/>

            ) : (

              <SkipForward fill="currentColor" size={17}/>

            )}

          </button>



          <button

            type="button"

            onClick={() => onAction('loop')}

            disabled={!isPlayable || Boolean(pendingAction) || isLofi}

            title="Chế độ lặp"

            className={`relative p-1.5 rounded-lg transition disabled:opacity-35 ${

              loopMode !== 'off' ? 'text-cyan-400 bg-cyan-500/10' : 'text-slate-400 hover:text-white'

            }`}

          >

            <Repeat size={15}/>

            {loopMode !== 'off' && (

              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-cyan-400 text-slate-950 font-mono text-[8px] font-bold flex items-center justify-center">

                {loopMode === 'song' ? '1' : '∞'}

              </span>

            )}

          </button>

        </div>



        {/* Scrubber Bar */}

        <div className="w-full flex items-center gap-2.5 font-mono text-[10px] text-slate-400 tabular-nums">

          <span className="w-8 text-right">{formatMsToTime(currentDisplayMs)}</span>

          <div

            ref={progressBarRef}

            onMouseDown={!isPlayable || pendingAction ? undefined : handlePointerDown}

            onTouchStart={!isPlayable || pendingAction ? undefined : handlePointerDown}

            onMouseMove={handleSeekHover}

            onMouseLeave={() => setHoverInfo(null)}

            className={`relative flex-1 h-1.5 hover:h-2 bg-slate-800 rounded-full transition-all group flex items-center ${

              !isPlayable || pendingAction ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'

            }`}

          >

            {hoverInfo && isPlayable && (

              <div

                className="absolute -top-7 -translate-x-1/2 px-1.5 py-0.5 rounded bg-slate-900 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] font-bold pointer-events-none shadow-lg z-20"

                style={{ left: `${hoverInfo.percent}%` }}

              >

                {formatMsToTime(hoverInfo.timeMs)}

              </div>

            )}

            <div

              className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-full relative"

              style={{ width: `${percent}%` }}

            />

            <div

              className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white border-2 border-cyan-400 shadow transition ${

                isDragging ? 'scale-125' : 'scale-0 group-hover:scale-100'

              }`}

              style={{ left: `${percent}%` }}

            />

          </div>

          <span className="w-8">{current?.duration || '0:00'}</span>

        </div>

      </div>



      {/* Right: Lofi Switch, Lyrics, Queue & Volume */}

      <div className="flex items-center justify-end gap-2 w-[30%] sm:w-[28%]">

        <button

          type="button"

          onClick={() => {

            if (isRoomEmpty) {

              onAction('notifyEmptyRoom');

              return;

            }

            onAction('toggleLofiMode');

          }}

          className={`hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border font-mono text-[10px] font-bold transition ${

            isLofi

              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'

              : 'bg-white/[0.04] border-white/[0.08] text-slate-300 hover:text-cyan-300'

          }`}

          title="Chuyển đổi chế độ Lofi 24/7"

        >

          <Coffee size={12}/>

          <span>{isLofi ? 'LOFI: BẬT' : 'LOFI'}</span>

        </button>



        <button

          type="button"

          onClick={() => window.dispatchEvent(new CustomEvent('anna_open_karaoke'))}

          className="p-2 rounded-xl bg-white/[0.04] hover:bg-cyan-500/15 text-slate-300 hover:text-cyan-300 border border-white/[0.08] transition"

          title="Mở Sân khấu Karaoke toàn màn hình"

        >

          <Mic2 size={15}/>

        </button>



        <button

          type="button"

          onClick={() => setActiveTab?.('queue')}

          className={`relative p-2 rounded-xl border transition hidden sm:flex ${

            activeTab === 'queue'

              ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'

              : 'bg-white/[0.04] text-slate-300 hover:text-white border-white/[0.08]'

          }`}

          title="Xem Hàng chờ"

        >

          <ListMusic size={15}/>

          {player?.queue?.length > 0 && (

            <span className="absolute -top-1 -right-1 font-mono text-[9px] font-bold bg-cyan-400 text-slate-950 rounded-full px-1.5">

              {player.queue.length}

            </span>

          )}

        </button>



        <div className="hidden md:flex items-center gap-1.5 ml-1">

          <button

            type="button"

            onClick={toggleMute}

            className="text-slate-400 hover:text-white p-1"

            title={localVolume === 0 ? 'Bật âm' : 'Tắt âm'}

          >

            {localVolume === 0 ? <VolumeX className="text-rose-400" size={15}/> : <Volume2 size={15}/>}

          </button>

          <input

            type="range"

            min="0"

            max="100"

            value={localVolume}

            onChange={handleVolumeChange}

            className="w-20 h-1 bg-slate-800 rounded-lg accent-cyan-400 cursor-pointer"

          />

        </div>

      </div>

    </footer>

  );

}
