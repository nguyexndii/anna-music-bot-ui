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
  Mic,
  ListMusic,
  Heart,
  Loader2
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

export default function BottomMiniPlayer({
  player,
  onAction,
  onToggleMinimize,
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

  // Local progress interpolation
  const [progressMs, setProgressMs] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMs, setDragMs] = useState(0);
  const [previousVolume, setPreviousVolume] = useState(100);
  const [localVolume, setLocalVolume] = useState(player?.volume ?? 80);
  const volumeDebounceRef = useRef(null);

  const progressBarRef = useRef(null);
  const totalMs = parseDurationToMs(current?.duration);

  // Volume sync
  useEffect(() => {
    if (volumeDebounceRef.current) return;
    if (player?.volume !== undefined) setLocalVolume(player.volume);
  }, [player?.volume]);

  // Sync startTime / playbackDurationMs
  useEffect(() => {
    if (isDragging) return;
    if (current?.playbackDurationMs !== undefined) {
      setProgressMs(current.playbackDurationMs);
    } else if (current?.startTime) {
      setProgressMs(Math.max(0, Date.now() - current.startTime));
    } else {
      setProgressMs(0);
    }
  }, [current?.title, current?.startTime, current?.playbackDurationMs, isDragging]);

  // 1s ticker
  useEffect(() => {
    if (!isPlaying || totalMs <= 0 || isDragging) return;
    const timer = setInterval(() => {
      setProgressMs((prev) => (prev < totalMs ? prev + 1000 : prev));
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlaying, totalMs, isDragging]);

  const calculateTimeFromEvent = useCallback((clientX) => {
    if (!progressBarRef.current || totalMs <= 0) return 0;
    const rect = progressBarRef.current.getBoundingClientRect();
    const offsetX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    return Math.floor((offsetX / rect.width) * totalMs);
  }, [totalMs]);

  const handleSeekCommit = useCallback((targetMs) => {
    const targetSeconds = Math.max(0, Math.min(Math.floor(totalMs / 1000), Math.floor(targetMs / 1000)));
    setProgressMs(targetMs);
    setIsDragging(false);
    onAction('seek', targetSeconds);
  }, [totalMs, onAction]);

  const handlePointerDown = (e) => {
    if (!isPlayable || !current || totalMs <= 0) return;
    const clientX = e.clientX || (e.touches && e.touches[0]?.clientX);
    if (clientX === undefined) return;
    setIsDragging(true);
    setDragMs(calculateTimeFromEvent(clientX));
  };

  useEffect(() => {
    if (!isDragging) return;
    const handlePointerMove = (e) => {
      const clientX = e.clientX || (e.touches && e.touches[0]?.clientX);
      if (clientX !== undefined) setDragMs(calculateTimeFromEvent(clientX));
    };
    const handlePointerUp = (e) => {
      const clientX = e.clientX || (e.changedTouches && e.changedTouches[0]?.clientX);
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
    }, 200);
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

  return (
    <div
      onClick={onToggleMinimize}
      title="Nhấp vào thanh để mở màn hình đang phát"
      className="w-full flex-shrink-0 z-50 bg-[#111113]/95 backdrop-blur-md border-t border-white/[0.08] px-3 sm:px-6 py-2 shadow-2xl transition-all cursor-pointer animate-in slide-in-from-bottom"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-6">
        
        {/* Left: Track Info */}
        <div className="flex items-center gap-3 min-w-0 w-1/4 sm:w-1/3">
          <div className="w-10 h-10 rounded-md overflow-hidden bg-[#18181B] border border-white/[0.08] flex-shrink-0">
            <img
              src={current?.thumbnail || DEFAULT_TRACK_THUMB}
              alt={current?.title || 'Ảnh bìa'}
              onError={(e) => { e.currentTarget.src = DEFAULT_TRACK_THUMB; }}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs sm:text-sm font-semibold text-zinc-100 truncate">
                {isLofi ? '24/7 Lofi Thư Giãn' : (current?.title || 'Chưa phát bài nào')}
              </h4>
              {current && !isLofi && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction('toggleFavorite', current);
                  }}
                  title={player?.favorites?.some(f => (f.url && current?.url && f.url === current?.url) || (f.title && current?.title && f.title.toLowerCase().trim() === current?.title.toLowerCase().trim())) ? "Xóa khỏi Yêu thích" : "Thêm vào Yêu thích"}
                  className="p-0.5 text-zinc-500 hover:text-orange-400 transition-colors"
                >
                  <Heart
                    className={`w-3.5 h-3.5 ${
                      player?.favorites?.some(f => (f.url && current?.url && f.url === current?.url) || (f.title && current?.title && f.title.toLowerCase().trim() === current?.title.toLowerCase().trim()))
                        ? 'fill-orange-500 text-orange-500'
                        : ''
                    }`}
                  />
                </button>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 truncate mt-0.5">
              {isLofi ? 'Chế độ phát nền 24/7' : (current?.artist && current.artist !== 'Unknown' ? current.artist : 'YouTube Music')}
            </p>
          </div>
        </div>

        {/* Center: Controls & Scrubber */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex-1 max-w-xl flex flex-col items-center gap-1"
        >
          {/* Button Row */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => onAction('shuffle')}
              disabled={!isPlayable || Boolean(pendingAction)}
              title="Xáo trộn hàng chờ"
              className={`p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 transition-colors ${
                player?.shuffle ? 'text-orange-500' : ''
              }`}
            >
              <Shuffle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            <button
              type="button"
              onClick={() => onAction('previous')}
              disabled={!isPlayable || Boolean(pendingAction)}
              title={pendingAction === 'previous' ? 'Đang quay lại...' : 'Bài trước'}
              className="p-1.5 rounded-md text-zinc-300 hover:text-white transition-colors"
            >
              {pendingAction === 'previous' ? (
                <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
              ) : (
                <SkipBack className="w-4 h-4 fill-currentColor" />
              )}
            </button>

            {/* High-contrast Play/Pause Button */}
            <button
              type="button"
              onClick={() => onAction(isPlaying ? 'pause' : 'resume')}
              disabled={!isPlayable || Boolean(pendingAction)}
              title={pendingAction === 'playback' ? 'Đang xử lý...' : (isPlaying ? 'Tạm dừng' : 'Tiếp tục phát')}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-zinc-100 text-zinc-950 hover:bg-white hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-md"
            >
              {pendingAction === 'playback' ? (
                <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
              ) : isPlaying ? (
                <Pause className="w-4 h-4 fill-zinc-950" />
              ) : (
                <Play className="w-4 h-4 fill-zinc-950 ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => onAction('skip')}
              disabled={!isPlayable || Boolean(pendingAction)}
              title={pendingAction === 'skip' ? 'Đang chuyển bài...' : 'Chuyển bài tiếp theo'}
              className="p-1.5 rounded-md text-zinc-300 hover:text-white transition-colors"
            >
              {pendingAction === 'skip' ? (
                <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
              ) : (
                <SkipForward className="w-4 h-4 fill-currentColor" />
              )}
            </button>

            {(() => {
              const loopMode = player?.loopMode || player?.loop || 'off';
              const isLofiCurrent = Boolean(player?.current && (player?.current?.is247 || player?.current?.requestedBy === 'Auto (24/7)')) || Boolean(player?.mode247 && !player?.current);
              return (
                <button
                  type="button"
                  onClick={() => onAction('loop')}
                  disabled={!isPlayable || Boolean(pendingAction) || isLofiCurrent}
                  title={isLofiCurrent ? 'Chế độ Lofi 24/7 tự động phát radio liên tục' : `Lặp lại: ${loopMode}`}
                  className={`relative p-1.5 rounded-md transition-colors ${
                    loopMode !== 'off' ? 'text-orange-500' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Repeat className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {loopMode === 'song' && (
                    <span className="absolute -top-1 -right-1 font-mono text-[7px] font-bold bg-orange-500 text-zinc-950 rounded-full w-3 h-3 flex items-center justify-center">
                      1
                    </span>
                  )}
                  {loopMode === 'queue' && (
                    <span className="absolute -top-1 -right-1 font-mono text-[7px] font-bold bg-orange-500 text-zinc-950 rounded-full w-3 h-3 flex items-center justify-center">
                      ∞
                    </span>
                  )}
                </button>
              );
            })()}
          </div>

          {/* Scrubber Timeline */}
          <div className="w-full flex items-center gap-2 text-[10px] font-mono text-zinc-500 tabular-nums">
            <span className="w-8 text-right">{formatMsToTime(currentDisplayMs)}</span>

            <div
              ref={progressBarRef}
              onMouseDown={(!isPlayable || pendingAction) ? undefined : handlePointerDown}
              onTouchStart={(!isPlayable || pendingAction) ? undefined : handlePointerDown}
              className={`relative flex-1 h-1 hover:h-1.5 bg-[#222226] rounded-full transition-all group select-none flex items-center ${(!isPlayable || pendingAction) ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div
                className="h-full bg-orange-500 rounded-full transition-all"
                style={{ width: `${percent}%` }}
              />
              <div
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-md transition ${
                  isDragging ? 'scale-125' : 'scale-0 group-hover:scale-100'
                }`}
                style={{ left: `${percent}%` }}
              />
            </div>

            <span className="w-8">{current?.duration || '0:00'}</span>
          </div>
        </div>

        {/* Right: Quick Tab Buttons & Volume */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-end gap-2 w-1/4 sm:w-1/3"
        >
          {/* Lời bài hát */}
          <button
            type="button"
            onClick={() => setActiveTab('lyrics')}
            title="Xem lời bài hát đồng bộ"
            className={`p-1.5 rounded-lg border transition-colors ${
              activeTab === 'lyrics'
                ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                : 'bg-[#18181B] text-zinc-400 hover:text-white border-white/[0.06]'
            }`}
          >
            <Mic className="w-4 h-4" />
          </button>

          {/* Hàng chờ */}
          <button
            type="button"
            onClick={() => setActiveTab('queue')}
            title="Xem danh sách hàng chờ"
            className={`p-1.5 rounded-lg border transition-colors relative ${
              activeTab === 'queue'
                ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                : 'bg-[#18181B] text-zinc-400 hover:text-white border-white/[0.06]'
            }`}
          >
            <ListMusic className="w-4 h-4" />
            {player?.queue?.length > 0 && (
              <span className="absolute -top-1 -right-1 font-mono text-[8px] font-bold bg-orange-500 text-zinc-950 rounded-full px-1 py-0.2">
                {player.queue.length}
              </span>
            )}
          </button>

          {/* Volume Control */}
          <div className="hidden md:flex items-center gap-1.5 ml-2">
            <button
              type="button"
              onClick={toggleMute}
              className="text-zinc-500 hover:text-zinc-300 p-0.5"
              title={localVolume === 0 ? 'Bật âm' : 'Tắt âm'}
            >
              {localVolume === 0 ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={localVolume}
              onChange={handleVolumeChange}
              className="w-16 h-1 bg-[#222226] rounded-lg accent-orange-500 cursor-pointer"
            />
          </div>
        </div>

      </div>
    </div>
  );
}