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
  Maximize2,
  Mic,
  ListMusic,
  Infinity
} from 'lucide-react';

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
  setActiveTab
}) {
  const isPlaying = player?.isPlaying && !player?.isPaused;
  const current = player?.current;

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

  // Sync startTime
  useEffect(() => {
    if (isDragging) return;
    if (current?.startTime) {
      setProgressMs(Math.max(0, Date.now() - current.startTime));
    } else {
      setProgressMs(0);
    }
  }, [current?.title, current?.startTime, isDragging]);

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
    if (!current || totalMs <= 0) return;
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
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0f1016]/95 backdrop-blur-xl border-t border-anna-border/80 px-3 sm:px-6 py-2.5 shadow-2xl transition-all animate-in slide-in-from-bottom duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-6">
        
        {/* Left: Track Info & Disc Thumbnail */}
        <div className="flex items-center gap-3 min-w-0 w-1/4 sm:w-1/3">
          <div
            onClick={onToggleMinimize}
            className="relative cursor-pointer group flex-shrink-0"
            title="Nhấp để mở rộng Đĩa than"
          >
            <img
              src={current?.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100'}
              alt={current?.title || 'Ảnh bìa'}
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl object-cover ring-1 ring-white/10 shadow-md ${
                isPlaying ? 'animate-spin-slow' : ''
              }`}
            />
            <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
              <Maximize2 className="w-4 h-4 text-white" />
            </div>
          </div>

          <div className="min-w-0">
            <h4
              onClick={onToggleMinimize}
              className="text-xs sm:text-sm font-bold text-white truncate cursor-pointer hover:text-anna-accent transition"
            >
              {current?.title || 'Chưa phát bài nào'}
            </h4>
            <p className="text-[11px] text-anna-muted truncate mt-0.5">
              {current?.artist && current.artist !== 'Unknown' ? current.artist : 'YouTube Music'}
            </p>
          </div>
        </div>

        {/* Center: Controls & Seek Scrubber */}
        <div className="flex-1 max-w-xl flex flex-col items-center gap-1">
          {/* Button Row */}
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => onAction('shuffle')}
              title="Xáo trộn hàng chờ"
              className="p-1.5 text-anna-muted hover:text-white transition"
            >
              <Shuffle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            <button
              onClick={() => onAction('seek', 0)}
              title="Phát lại từ đầu"
              className="p-1.5 text-anna-muted hover:text-white transition"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={() => onAction(isPlaying ? 'pause' : 'resume')}
              title={isPlaying ? 'Tạm dừng' : 'Tiếp tục phát'}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white text-black hover:scale-105 active:scale-95 transition shadow-lg flex items-center justify-center"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-black" />
              ) : (
                <Play className="w-5 h-5 fill-black ml-0.5" />
              )}
            </button>

            <button
              onClick={() => onAction('skip')}
              title="Chuyển bài tiếp theo"
              className="p-1.5 text-anna-muted hover:text-white transition"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <button
              onClick={() => onAction('loop')}
              title={`Lặp lại: ${player?.loopMode || 'off'}`}
              className={`p-1.5 transition ${
                player?.loopMode && player.loopMode !== 'off'
                  ? 'text-anna-accent'
                  : 'text-anna-muted hover:text-white'
              }`}
            >
              <Repeat className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>

          {/* Scrubber Timeline */}
          <div className="w-full flex items-center gap-2 text-[10px] font-mono text-anna-muted">
            <span className="w-8 text-right">{formatMsToTime(currentDisplayMs)}</span>

            <div
              ref={progressBarRef}
              onMouseDown={handlePointerDown}
              onTouchStart={handlePointerDown}
              className="relative flex-1 h-1.5 bg-white/10 hover:h-2 rounded-full cursor-pointer transition-all group select-none flex items-center"
            >
              <div
                className="h-full bg-gradient-to-r from-anna-accent to-anna-pink rounded-full transition-all"
                style={{ width: `${percent}%` }}
              ></div>
              <div
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white shadow-md transition ${
                  isDragging ? 'scale-125' : 'scale-0 group-hover:scale-100'
                }`}
                style={{ left: `${percent}%` }}
              ></div>
            </div>

            <span className="w-8">{current?.duration || '0:00'}</span>
          </div>
        </div>

        {/* Right: Quick Tab Buttons & Volume & Maximize */}
        <div className="flex items-center justify-end gap-2 sm:gap-3 w-1/4 sm:w-1/3">
          {/* Lời bài hát button */}
          <button
            onClick={() => setActiveTab('lyrics')}
            title="Xem lời bài hát đồng bộ"
            className={`p-2 rounded-xl border transition ${
              activeTab === 'lyrics'
                ? 'bg-anna-accent text-white border-anna-accent'
                : 'bg-anna-card/60 text-anna-muted hover:text-white border-anna-border/60'
            }`}
          >
            <Mic className="w-4 h-4" />
          </button>

          {/* Hàng chờ button */}
          <button
            onClick={() => setActiveTab('queue')}
            title="Xem danh sách hàng chờ"
            className={`p-2 rounded-xl border transition relative ${
              activeTab === 'queue'
                ? 'bg-anna-accent text-white border-anna-accent'
                : 'bg-anna-card/60 text-anna-muted hover:text-white border-anna-border/60'
            }`}
          >
            <ListMusic className="w-4 h-4" />
            {player?.queue?.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-anna-pink text-white text-[9px] font-bold flex items-center justify-center">
                {player.queue.length}
              </span>
            )}
          </button>

          {/* Volume Control */}
          <div className="hidden md:flex items-center gap-1.5">
            <button
              onClick={toggleMute}
              className="text-anna-muted hover:text-white p-1"
              title={localVolume === 0 ? 'Bật âm' : 'Tắt âm'}
            >
              {localVolume === 0 ? <VolumeX className="w-4 h-4 text-anna-red" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="150"
              value={localVolume}
              onChange={handleVolumeChange}
              className="w-16 h-1 bg-white/10 rounded-lg accent-anna-accent cursor-pointer"
            />
          </div>

          {/* Expand Button */}
          <button
            onClick={onToggleMinimize}
            title="Mở rộng Đĩa than xoay tròn"
            className="p-2 rounded-xl bg-white/10 hover:bg-anna-accent text-white transition flex items-center gap-1.5 text-xs font-semibold"
          >
            <Maximize2 className="w-4 h-4" />
            <span className="hidden lg:inline">Mở đĩa</span>
          </button>
        </div>

      </div>
    </div>
  );
}