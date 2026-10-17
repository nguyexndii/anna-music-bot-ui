import React, { useState, useEffect, useRef } from 'react';
import {
  Loader2,
  SlidersHorizontal,
  Sparkles,
  AlignLeft,
  Disc3,
  Maximize2,
  RotateCcw,
  Volume2
} from 'lucide-react';
import { API_BASE, DEFAULT_TRACK_THUMB } from '../config';
import KaraokeFullscreenModal from './KaraokeFullscreenModal';

const lyricsCache = new Map();

function parseDurationToMs(str) {
  if (!str || str.toLowerCase().includes('live')) return 0;
  const parts = str.split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
  if (parts.length === 2) return (parts[0] * 60 + parts[1]) * 1000;
  return parts[0] * 1000;
}

function capitalizeFirstLetter(str) {
  if (!str || typeof str !== 'string') return '';
  const trimmed = str.trim();
  if (!trimmed) return '';
  return trimmed.replace(/^([“"‘'(\[]*)(\p{L})/u, (_, p1, p2) => p1 + p2.toUpperCase());
}

function formatPlainLyrics(text) {
  if (!text || typeof text !== 'string') return '';
  return text.split('\n').map(line => capitalizeFirstLetter(line)).join('\n');
}

function getSavedOffset(title, isYtCc = false) {
  if (!title) return null;
  try {
    const key = isYtCc ? `lyrics_offset_ytcc_${title}` : `lyrics_offset_${title}`;
    const raw = localStorage.getItem(key);
    return raw !== null ? Number(raw) : null;
  } catch (e) {
    return null;
  }
}

function saveOffset(title, offsetMs, isYtCc = false) {
  if (!title) return;
  try {
    const key = isYtCc ? `lyrics_offset_ytcc_${title}` : `lyrics_offset_${title}`;
    localStorage.setItem(key, String(offsetMs));
  } catch (e) {}
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

export default function SyncedLyrics({ player, onAction, isActive = true, guildId, onSourceChange }) {
  const current = player?.current;
  const songKey = current?.title ? `${current.title}|${current.artist || ''}|${current.url || ''}` : '';

  const isLofiTrack = Boolean(
    current && (current.is247 || current.requestedBy === 'Auto (24/7)')
  );

  const [lyricsData, setLyricsData] = useState(() => {
    return songKey && lyricsCache.has(songKey) ? lyricsCache.get(songKey) : null;
  });
  const [loading, setLoading]       = useState(() => {
    return !isLofiTrack && Boolean(songKey && !lyricsCache.has(songKey));
  });
  const [activeLineIdx, setActiveLineIdx] = useState(-1);
  const [autoScroll, setAutoScroll] = useState(true);

  const isYtCc = lyricsData?.source === 'youtube_cc';

  const [manualOffsetMs, setManualOffsetMs] = useState(() => {
    return getSavedOffset(current?.title, isYtCc) ?? 0;
  });
  const [showSyncAdjust, setShowSyncAdjust] = useState(false);
  const [viewMode, setViewMode] = useState('synced');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fontSizeLevel, setFontSizeLevel] = useState(1); // 0: nhỏ, 1: chuẩn, 2: to

  const activeLineRef = useRef(null);
  const containerRef  = useRef(null);
  const lastSeekRef   = useRef(null);

  useEffect(() => {
    const handleOpen = () => setIsFullscreen(true);
    const handleSwitchLofi = () => {
      setLyricsData(null);
      setLoading(false);
      setActiveLineIdx(-1);
    };
    window.addEventListener('anna_open_karaoke', handleOpen);
    window.addEventListener('anna_switch_lofi', handleSwitchLofi);
    return () => {
      window.removeEventListener('anna_open_karaoke', handleOpen);
      window.removeEventListener('anna_switch_lofi', handleSwitchLofi);
    };
  }, []);

  useEffect(() => {
    setActiveLineIdx(-1);
    const saved = getSavedOffset(current?.title, isYtCc);
    setManualOffsetMs(saved !== null ? saved : 0);
  }, [current?.title, isYtCc]);

  // Tải lời bài hát
  useEffect(() => {
    if (!current?.title || isLofiTrack) {
      setLyricsData(null);
      setLoading(false);
      onSourceChange?.(null);
      return;
    }

    if (lyricsCache.has(songKey)) {
      const cached = lyricsCache.get(songKey);
      setLyricsData(cached);
      setLoading(false);
      updateSourceInfo(cached);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const controller = new AbortController();
    const query = new URLSearchParams({
      track: current.title,
      artist: current.artist || '',
      duration: current.duration || '',
      url: current.url || '',
      guild: guildId || '',
    });

    fetch(`${API_BASE}/api/lyrics?${query.toString()}`, { signal: controller.signal })
      .then(async res => {
        if (!res.ok) throw new Error('Lyrics fetch failed');
        return res.json();
      })
      .then(data => {
        if (!isMounted) return;
        if (data.success && data.lyrics) {
          lyricsCache.set(songKey, data.lyrics);
          setLyricsData(data.lyrics);
          updateSourceInfo(data.lyrics);
        } else {
          setLyricsData(null);
          onSourceChange?.(null);
        }
        setLoading(false);
      })
      .catch(err => {
        if (err.name !== 'AbortError' && isMounted) {
          setLyricsData(null);
          setLoading(false);
          onSourceChange?.(null);
        }
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [songKey, current?.title, current?.artist, current?.duration, isLofiTrack, guildId]);

  const updateSourceInfo = (lyrics) => {
    if (!lyrics) {
      onSourceChange?.(null);
      return;
    }
    const info = {
      text: lyrics.source === 'spotify' ? 'Spotify / LRCLIB' : lyrics.source === 'youtube_cc' ? 'YouTube Subtitles' : 'Karaoke Lyrics',
      color: 'var(--yellow)',
      border: 'rgba(232,201,119,0.3)',
      bg: 'rgba(232,201,119,0.08)'
    };
    onSourceChange?.(info);
  };

  // Tính toán dòng đang hát
  const totalMs = parseDurationToMs(current?.duration);
  const isPlaying = player?.isPlaying && !player?.isPaused;

  useEffect(() => {
    if (!lyricsData?.synced || !lyricsData.lines?.length || !isPlaying || !isActive) return;

    let animId;
    const lines = lyricsData.lines;

    const tick = () => {
      let currentProgress = 0;
      if (typeof current?.playbackDurationMs === 'number' && typeof current?.serverTime === 'number') {
        const networkDelay = Math.max(0, Date.now() - current.serverTime);
        currentProgress = current.playbackDurationMs + networkDelay;
      } else if (current?.startTime) {
        currentProgress = Date.now() - current.startTime;
      }

      const effectiveTime = Math.max(0, currentProgress + manualOffsetMs);

      let foundIdx = -1;
      for (let i = lines.length - 1; i >= 0; i--) {
        if (effectiveTime >= lines[i].timeMs) {
          foundIdx = i;
          break;
        }
      }

      if (foundIdx !== activeLineIdx) {
        setActiveLineIdx(foundIdx);
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [lyricsData, isPlaying, isActive, current?.playbackDurationMs, current?.serverTime, current?.startTime, manualOffsetMs, activeLineIdx]);

  // Tự động cuộn theo câu hát
  useEffect(() => {
    if (!autoScroll || activeLineIdx < 0 || !activeLineRef.current || !containerRef.current) return;
    activeLineRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, [activeLineIdx, autoScroll]);

  const handleLineClick = (timeMs) => {
    if (typeof timeMs !== 'number') return;
    const targetSeconds = Math.max(0, Math.floor(timeMs / 1000));
    onAction('seek', targetSeconds);
  };

  const handleAdjustOffset = (deltaMs) => {
    const next = manualOffsetMs + deltaMs;
    setManualOffsetMs(next);
    saveOffset(current?.title, next, isYtCc);
  };

  const handleResetOffset = () => {
    setManualOffsetMs(0);
    saveOffset(current?.title, 0, isYtCc);
  };

  const lines = lyricsData?.lines || [];

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden select-none">

      {/* ── 1. TOOLBAR LYRICS WORKSPACE ───────────────────────────────────── */}
      <div className="shrink-0 bg-surface-container-low border border-white/5 p-2.5 rounded-xl flex items-center justify-between gap-2 shadow-sm mb-2.5 flex-wrap">
        {/* Track Info */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-surface-container overflow-hidden shrink-0 border border-white/5 relative">
            <img
              src={getTrackThumb(current)}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/default-playlist.jpg'; }}
            />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-xs sm:text-sm font-bold text-on-surface truncate">
                {current?.title || 'Chưa có bài hát'}
              </span>
              <span className="text-[9px] text-tertiary bg-surface-container px-1 py-0.2 rounded border border-tertiary/20 shrink-0 font-bold uppercase font-mono">
                {lyricsData?.synced ? 'KARAOKE SẴN SÀNG' : 'LỜI BÀI HÁT'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-outline font-mono truncate">
              <span className="truncate text-on-surface-variant">{current?.artist || 'Anna Music'}</span>
              <span>•</span>
              <span className="text-primary-container">{current?.duration || '0:00'}</span>
            </div>
          </div>
        </div>

        {/* Controls Cluster */}
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {/* Mode Toggle: Synced vs Plain */}
          <div className="bg-surface-container p-0.5 rounded-lg flex items-center border border-white/5 text-xs">
            <button
              onClick={() => setViewMode('synced')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                viewMode === 'synced' ? 'bg-primary-container text-on-primary' : 'text-outline hover:text-on-surface'
              }`}
            >
              Lời Chạy
            </button>
            <button
              onClick={() => setViewMode('plain')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                viewMode === 'plain' ? 'bg-primary-container text-on-primary' : 'text-outline hover:text-on-surface'
              }`}
            >
              Toàn Bộ
            </button>
          </div>

          {/* Font Size A / A+ */}
          <div className="bg-surface-container p-0.5 rounded-lg flex items-center border border-white/5">
            <button
              onClick={() => setFontSizeLevel(prev => Math.max(0, prev - 1))}
              className={`w-6 h-6 rounded flex items-center justify-center font-bold text-[11px] transition-colors ${
                fontSizeLevel === 0 ? 'bg-primary-container text-on-primary' : 'text-outline hover:text-on-surface'
              }`}
              title="Thu nhỏ cỡ chữ"
            >
              A
            </button>
            <button
              onClick={() => setFontSizeLevel(prev => Math.min(2, prev + 1))}
              className={`w-6 h-6 rounded flex items-center justify-center font-bold text-[11px] transition-colors ${
                fontSizeLevel === 2 ? 'bg-primary-container text-on-primary' : 'text-outline hover:text-on-surface'
              }`}
              title="Phóng to cỡ chữ"
            >
              A+
            </button>
          </div>

          {/* Autoscroll Toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-container border border-white/5 hover:bg-surface-container-high text-[11px] font-medium transition-colors"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${autoScroll ? 'bg-tertiary' : 'bg-outline'}`}></span>
            <span className="font-mono text-[10px] text-on-surface uppercase">
              {autoScroll ? 'TỰ CUỘN: BẬT' : 'TỰ CUỘN: TẮT'}
            </span>
          </button>

          {/* Offset Trigger Button */}
          <button
            onClick={() => setShowSyncAdjust(!showSyncAdjust)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-medium transition-colors ${
              showSyncAdjust
                ? 'bg-primary-container text-on-primary border-primary-container font-bold'
                : 'bg-surface-container border-white/5 text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <SlidersHorizontal size={13} />
            <span>Bù Trễ</span>
            {manualOffsetMs !== 0 && (
              <span className="font-mono text-[9px] px-1 rounded bg-black/40 text-primary-container font-bold">
                {manualOffsetMs > 0 ? `+${(manualOffsetMs / 1000).toFixed(1)}s` : `${(manualOffsetMs / 1000).toFixed(1)}s`}
              </span>
            )}
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={() => setIsFullscreen(true)}
            className="p-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-outline hover:text-primary-container border border-white/5 transition-colors"
            title="Mở toàn màn hình Karaoke"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      {/* ── 2. THANH ĐIỀU CHỈNH BÙ TRỄ OFFSET (Khi mở) ──────────────────────── */}
      {showSyncAdjust && (
        <div className="bg-surface-container-low border border-white/5 p-2 rounded-xl flex items-center justify-between gap-2 shrink-0 mb-2 shadow-sm animate-fade-in flex-wrap text-xs">
          <span className="text-[11px] text-outline font-mono">
            Chỉnh độ trễ hiển thị: <b className="text-primary-container">{manualOffsetMs > 0 ? `+${manualOffsetMs}ms` : `${manualOffsetMs}ms`}</b>
          </span>
          <div className="flex items-center gap-1 font-mono text-[10px]">
            <button onClick={() => handleAdjustOffset(-2000)} className="px-1.5 py-0.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface">-2s</button>
            <button onClick={() => handleAdjustOffset(-1000)} className="px-1.5 py-0.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface">-1s</button>
            <button onClick={() => handleAdjustOffset(-200)} className="px-1.5 py-0.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface">-0.2s</button>
            <button onClick={handleResetOffset} className="px-2 py-0.5 rounded bg-secondary-container/40 text-secondary hover:bg-secondary-container font-bold">RESET</button>
            <button onClick={() => handleAdjustOffset(200)} className="px-1.5 py-0.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface">+0.2s</button>
            <button onClick={() => handleAdjustOffset(1000)} className="px-1.5 py-0.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface">+1s</button>
            <button onClick={() => handleAdjustOffset(2000)} className="px-1.5 py-0.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface">+2s</button>
          </div>
        </div>
      )}

      {/* ── 3. VÙNG HIỂN THỊ LỜI NHẠC ───────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-y-auto custom-scroll pr-1 flex flex-col relative"
      >
        {isLofiTrack ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-surface-container flex items-center justify-center text-primary-container border border-white/5">
              <span className="material-symbols-outlined text-2xl">spa</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-on-surface">Nhạc Lofi 24/7 Thư Giãn</h3>
              <p className="text-xs text-outline mt-1 max-w-xs">
                Bản ghi này là nhạc nền không lời. Hãy thư giãn và tận hưởng không gian!
              </p>
            </div>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-2 text-outline">
            <Loader2 size={24} className="animate-spin text-primary-container" />
            <span className="text-xs">Đang đồng bộ lời bài hát...</span>
          </div>
        ) : !lyricsData ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-2 text-outline">
            <span className="material-symbols-outlined text-3xl">mic_off</span>
            <span className="text-xs">Chưa có lời bài hát cho bài này.</span>
          </div>
        ) : viewMode === 'plain' || !lyricsData.synced ? (
          /* Chế độ lời toàn bộ */
          <div className="p-4 bg-surface-container-low rounded-xl border border-white/5 text-on-surface leading-relaxed whitespace-pre-line font-body select-text text-sm sm:text-base">
            {formatPlainLyrics(lyricsData.plainLyrics || lyricsData.text || '')}
          </div>
        ) : (
          /* Chế độ lời Karaoke đồng bộ từng dòng */
          <div className="flex flex-col gap-2 py-12 px-2 text-center">
            {lines.map((line, idx) => {
              const isActive = activeLineIdx === idx;
              const isPast = activeLineIdx > idx;

              const fontClass =
                fontSizeLevel === 2
                  ? 'text-xl sm:text-2xl'
                  : fontSizeLevel === 0
                  ? 'text-sm sm:text-base'
                  : 'text-base sm:text-lg';

              return (
                <div
                  key={idx}
                  ref={isActive ? activeLineRef : null}
                  onClick={() => handleLineClick(line.timeMs)}
                  className={`py-2 px-3 rounded-xl transition-all duration-300 cursor-pointer ${fontClass} ${
                    isActive
                      ? 'text-primary-container font-bold scale-[1.03] bg-primary-container/10 border border-primary-container/20 shadow-md'
                      : isPast
                      ? 'text-outline hover:text-on-surface opacity-70'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {capitalizeFirstLetter(line.text)}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 4. KARAOKE FULLSCREEN MODAL ────────────────────────────────────── */}
      <KaraokeFullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        player={player}
        lyricsData={lyricsData}
        activeLineIdx={activeLineIdx}
        onLineClick={handleLineClick}
        onAction={onAction}
      />

    </div>
  );
}
