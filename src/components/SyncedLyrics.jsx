import React, { useState, useEffect, useRef } from 'react';
import {
  Loader2,
  SlidersHorizontal,
  Sparkles,
  AlignLeft,
  Maximize2
} from 'lucide-react';
import { API_BASE, DEFAULT_TRACK_THUMB } from '../config';
import KaraokeFullscreenModal from './KaraokeFullscreenModal';

const lyricsCache = new Map();

function formatTime(ms) {
  if (!ms || isNaN(ms) || ms < 0) return '00:00';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m < 10 ? '0' : ''}${m}:${sec < 10 ? '0' : ''}${sec}`;
}

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
  const [currentLineProgress, setCurrentLineProgress] = useState(0);
  const [effectiveCurrentMs, setEffectiveCurrentMs] = useState(0);

  const activeLineRef = useRef(null);
  const containerRef  = useRef(null);

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

  // Tải lời bài hát (Sửa lỗi: dùng cả title và hỗ trợ /api/guilds/:guildId/lyrics)
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

    const fetchLyricsData = async () => {
      try {
        let resData = null;

        // Ưu tiên 1: Lấy theo guildId nếu có
        if (guildId) {
          const res = await fetch(`${API_BASE}/api/guilds/${guildId}/lyrics`, {
            signal: controller.signal
          }).catch(() => null);
          if (res && res.ok) {
            const data = await res.json().catch(() => null);
            if (data && data.success && (data.syncedLyrics?.length || data.lyrics)) {
              resData = data;
            }
          }
        }

        // Ưu tiên 2: Gọi endpoint /api/lyrics với tham số chuẩn title
        if (!resData) {
          const query = new URLSearchParams({
            title: current.title,
            q: current.title,
            artist: current.artist && current.artist !== 'YouTube Music' ? current.artist : '',
            duration: String(parseDurationToMs(current.duration) || 0),
            url: current.url || '',
          });
          const res = await fetch(`${API_BASE}/api/lyrics?${query.toString()}`, {
            signal: controller.signal
          }).catch(() => null);
          if (res && res.ok) {
            const data = await res.json().catch(() => null);
            if (data && data.success && (data.syncedLyrics?.length || data.lyrics)) {
              resData = data;
            }
          }
        }

        if (!isMounted) return;

        if (resData && (resData.syncedLyrics || resData.lyrics)) {
          // Chuẩn hóa danh sách các dòng lời có timestamp bắt đầu và kết thúc
          const rawLines = resData.syncedLyrics || resData.lines || [];
          const lines = rawLines.map((l, idx, arr) => {
            const timeMs = Number(l.time ?? l.timeMs ?? 0);
            const nextTimeMs = arr[idx + 1] ? Number(arr[idx + 1].time ?? arr[idx + 1].timeMs ?? timeMs + 4000) : timeMs + 6000;
            return {
              text: l.text || l.line || '',
              timeMs: timeMs,
              endTimeMs: nextTimeMs,
              durationMs: Math.max(1200, nextTimeMs - timeMs)
            };
          });

          const normalizedData = {
            ...resData,
            synced: lines.length > 0,
            lines: lines,
            plainLyrics: resData.lyrics || lines.map(l => l.text).join('\n')
          };

          lyricsCache.set(songKey, normalizedData);
          setLyricsData(normalizedData);
          updateSourceInfo(normalizedData);
        } else {
          setLyricsData(null);
          onSourceChange?.(null);
        }
      } catch (err) {
        if (err.name !== 'AbortError' && isMounted) {
          setLyricsData(null);
          onSourceChange?.(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchLyricsData();

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

  const isPlaying = player?.isPlaying && !player?.isPaused;
  const lines = lyricsData?.lines || [];
  const totalTrackMs = parseDurationToMs(current?.duration);
  const trackPercent = totalTrackMs > 0 ? Math.min(100, Math.max(0, (effectiveCurrentMs / totalTrackMs) * 100)) : 0;

  // Tính toán câu hát đang phát và thanh tiến trình vạch tua câu hát
  useEffect(() => {
    if (!lyricsData?.synced || !lines.length || !isPlaying || !isActive) return;

    let animId;

    const tick = () => {
      let currentProgress = 0;
      if (typeof current?.playbackDurationMs === 'number' && typeof current?.serverTime === 'number') {
        const networkDelay = Math.max(0, Date.now() - current.serverTime);
        currentProgress = current.playbackDurationMs + networkDelay;
      } else if (current?.startTime) {
        currentProgress = Date.now() - current.startTime;
      }

      const effectiveTime = Math.max(0, currentProgress + manualOffsetMs);
      setEffectiveCurrentMs(effectiveTime);

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

      // Tính phần trăm tiến trình của câu hát đang hát hiện tại
      if (foundIdx >= 0 && lines[foundIdx]) {
        const curLine = lines[foundIdx];
        const duration = Math.max(800, curLine.endTimeMs - curLine.timeMs);
        const elapsed = Math.max(0, effectiveTime - curLine.timeMs);
        const p = Math.min(100, Math.max(0, (elapsed / duration) * 100));
        setCurrentLineProgress(p);
      } else {
        setCurrentLineProgress(0);
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [lyricsData, lines, isPlaying, isActive, current?.playbackDurationMs, current?.serverTime, current?.startTime, manualOffsetMs, activeLineIdx]);

  // Tự động cuộn
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

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden select-none bg-surface/40">

      {/* ── 1. SUB-HEADER CỦA LYRICS CANVAS (Chuẩn Stitch) ────────────────── */}
      <div className="shrink-0 flex items-center justify-between pb-3 pt-1 border-b border-white/5 mb-3 px-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-symbols-outlined text-primary-container text-base shrink-0">mic</span>
          <span className="font-mono text-xs text-on-surface-variant font-medium truncate">
            {player?.voiceChannel?.name ? `Phòng: #${player.voiceChannel.name}` : 'Lời Nhạc Đồng Bộ'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Cỡ chữ A- / A+ */}
          <div className="flex items-center gap-1 bg-surface-container px-1 py-0.5 rounded-lg border border-white/5">
            <button
              onClick={() => setFontSizeLevel(p => Math.max(0, p - 1))}
              className={`px-1.5 py-0.5 rounded text-xs font-bold transition-colors ${
                fontSizeLevel === 0 ? 'bg-primary-container text-on-primary' : 'text-outline hover:text-on-surface'
              }`}
              title="Giảm cỡ chữ"
            >
              A-
            </button>
            <button
              onClick={() => setFontSizeLevel(p => Math.min(2, p + 1))}
              className={`px-1.5 py-0.5 rounded text-xs font-bold transition-colors ${
                fontSizeLevel === 2 ? 'bg-primary-container text-on-primary' : 'text-outline hover:text-on-surface'
              }`}
              title="Tăng cỡ chữ"
            >
              A+
            </button>
          </div>

          {/* Nút Chế độ: Lời chạy / Toàn bộ */}
          <div className="flex items-center gap-0.5 bg-surface-container p-0.5 rounded-lg border border-white/5 text-[11px]">
            <button
              onClick={() => setViewMode('synced')}
              className={`px-2 py-0.5 rounded transition-colors ${
                viewMode === 'synced' ? 'bg-primary-container text-on-primary font-bold' : 'text-outline hover:text-on-surface'
              }`}
            >
              Lời Chạy
            </button>
            <button
              onClick={() => setViewMode('plain')}
              className={`px-2 py-0.5 rounded transition-colors ${
                viewMode === 'plain' ? 'bg-primary-container text-on-primary font-bold' : 'text-outline hover:text-on-surface'
              }`}
            >
              Toàn Bộ
            </button>
          </div>

          {/* Bù trễ */}
          <button
            onClick={() => setShowSyncAdjust(!showSyncAdjust)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs transition-colors ${
              showSyncAdjust ? 'bg-primary-container text-on-primary font-bold border-primary-container' : 'bg-surface-container border-white/5 text-outline hover:text-on-surface'
            }`}
            title="Chỉnh độ trễ"
          >
            <SlidersHorizontal size={13} />
            <span className="hidden sm:inline">Bù Trễ</span>
            {manualOffsetMs !== 0 && (
              <span className="font-mono text-[9px] px-1 rounded bg-black/40 text-primary-container">
                {manualOffsetMs > 0 ? `+${(manualOffsetMs / 1000).toFixed(1)}s` : `${(manualOffsetMs / 1000).toFixed(1)}s`}
              </span>
            )}
          </button>

          {/* Toàn màn hình */}
          <button
            onClick={() => setIsFullscreen(true)}
            className="p-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-outline hover:text-primary-container border border-white/5 transition-colors"
            title="Toàn màn hình Karaoke"
          >
            <Maximize2 size={15} />
          </button>
        </div>
      </div>

      {/* ── 2. THANH BÙ TRỄ HIỆU CHỈNH ───────────────────────────────────────── */}
      {showSyncAdjust && (
        <div className="bg-surface-container border border-white/10 p-2 rounded-xl flex items-center justify-between gap-2 shrink-0 mb-3 text-xs animate-fade-in flex-wrap">
          <span className="font-mono text-outline text-[11px]">
            Độ lệch: <b className="text-primary-container">{manualOffsetMs > 0 ? `+${manualOffsetMs}ms` : `${manualOffsetMs}ms`}</b>
          </span>
          <div className="flex items-center gap-1 font-mono text-[10px]">
            <button onClick={() => handleAdjustOffset(-1000)} className="px-2 py-0.5 rounded bg-surface-container-highest hover:bg-surface-container-low text-on-surface">-1s</button>
            <button onClick={() => handleAdjustOffset(-200)} className="px-2 py-0.5 rounded bg-surface-container-highest hover:bg-surface-container-low text-on-surface">-0.2s</button>
            <button onClick={handleResetOffset} className="px-2 py-0.5 rounded bg-secondary-container/40 text-secondary hover:bg-secondary-container font-bold">RESET</button>
            <button onClick={() => handleAdjustOffset(200)} className="px-2 py-0.5 rounded bg-surface-container-highest hover:bg-surface-container-low text-on-surface">+0.2s</button>
            <button onClick={() => handleAdjustOffset(1000)} className="px-2 py-0.5 rounded bg-surface-container-highest hover:bg-surface-container-low text-on-surface">+1s</button>
          </div>
        </div>
      )}

      {/* ── 3. KHUNG HIỂN THỊ LỜI NHẠC KARAOKE CHUẨN STITCH ─────────────────── */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-y-auto custom-scroll pr-2 flex flex-col relative"
      >
        {isLofiTrack ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-3 text-outline">
            <span className="material-symbols-outlined text-4xl text-primary-container">spa</span>
            <div>
              <h3 className="text-base font-bold text-on-surface">Nhạc Lofi 24/7 Thư Giãn</h3>
              <p className="text-xs text-outline mt-1">Bản ghi này là nhạc nền không lời.</p>
            </div>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-2 text-outline">
            <Loader2 size={26} className="animate-spin text-primary-container" />
            <span className="text-xs">Đang nạp lời bài hát...</span>
          </div>
        ) : !lyricsData ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-3 text-outline">
            <span className="material-symbols-outlined text-4xl">mic_off</span>
            <div className="text-xs">Chưa có lời bài hát cho bài này.</div>
          </div>
        ) : viewMode === 'plain' || !lyricsData.synced ? (
          <div className="p-4 rounded-2xl bg-surface-container-low border border-white/5 text-on-surface leading-relaxed whitespace-pre-line font-body select-text text-sm sm:text-base">
            {formatPlainLyrics(lyricsData.plainLyrics || '')}
          </div>
        ) : (
          <div className="flex flex-col gap-3 py-16 px-1 sm:px-4">
            {/* Thanh tiến trình đoạn dạo đầu trước câu hát đầu tiên */}
            {effectiveCurrentMs < (lines[0]?.timeMs || 0) && (lines[0]?.timeMs || 0) > 2000 && (
              <div className="bg-surface-container/70 border border-primary-container/20 rounded-2xl p-3.5 shadow-md mb-2 flex items-center justify-between gap-3 animate-fade-in">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="material-symbols-outlined text-primary-container text-lg animate-pulse">graphic_eq</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-on-surface">Đoạn nhạc dạo đầu</span>
                    <span className="font-mono text-[10px] text-outline">Đang chuẩn bị vào câu hát đầu tiên...</span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="h-1.5 w-24 sm:w-36 bg-surface-container-highest rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-container rounded-full transition-all duration-150 ease-linear"
                      style={{ width: `${Math.min(100, Math.max(0, (effectiveCurrentMs / lines[0].timeMs) * 100))}%` }}
                    />
                  </div>
                  <span className="font-mono text-[11px] text-primary-container font-semibold">
                    {formatTime(effectiveCurrentMs)} / {formatTime(lines[0].timeMs)}
                  </span>
                </div>
              </div>
            )}

            {lines.map((line, idx) => {
              const isActive = activeLineIdx === idx;
              const isPast = activeLineIdx > idx;

              if (isActive) {
                return (
                  /* ── CÂU ĐANG HÁT NỔI BẬT VỚI VẠCH TIẾN TRÌNH THỜI GIAN ── */
                  <div
                    key={idx}
                    ref={activeLineRef}
                    onClick={() => handleLineClick(line.timeMs)}
                    className="bg-surface-container/90 border border-primary-container/30 rounded-2xl p-4 shadow-xl my-1 flex flex-col gap-2.5 transition-all duration-300 ease-out cursor-pointer group"
                    title="Nhấn để tua lại đầu câu này"
                  >
                    <div className="flex items-baseline gap-3">
                      <span className="font-mono text-xs text-primary-container font-bold shrink-0">
                        {formatTime(line.timeMs)}
                      </span>
                      <p className={`font-body font-bold text-primary-container leading-snug tracking-tight transition-all duration-300 ${
                        fontSizeLevel === 2 ? 'text-2xl sm:text-3xl' : fontSizeLevel === 0 ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'
                      }`}>
                        {capitalizeFirstLetter(line.text)}
                      </p>
                    </div>

                    {/* Vạch tiến trình đồng bộ thời gian thực của bài hát (chạy liên tục, không reset khi đổi câu) */}
                    <div
                      className="flex items-center gap-3 ml-12 max-w-md select-none group/seek"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="font-mono text-[11px] text-primary-container font-semibold shrink-0">
                        {formatTime(effectiveCurrentMs)}
                      </span>
                      <div
                        onClick={(e) => {
                          if (totalTrackMs <= 0) return;
                          const rect = e.currentTarget.getBoundingClientRect();
                          const clickX = e.clientX - rect.left;
                          const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                          const targetSec = Math.floor((ratio * totalTrackMs) / 1000);
                          onAction('seek', targetSec);
                        }}
                        className="h-1.5 flex-1 min-w-[120px] bg-surface-container-highest rounded-full overflow-hidden cursor-pointer relative"
                        title="Nhấp để tua nhạc"
                      >
                        <div
                          className="h-full bg-primary-container rounded-full transition-all duration-100 ease-linear"
                          style={{ width: `${trackPercent}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] text-outline font-semibold shrink-0">
                        {current?.duration || formatTime(totalTrackMs)}
                      </span>
                    </div>
                  </div>
                );
              }

              /* ── CÁC CÂU CHƯA HÁT HOẶC ĐÃ QUA ── */
              return (
                <div
                  key={idx}
                  onClick={() => handleLineClick(line.timeMs)}
                  className={`flex items-baseline gap-4 py-2 px-3 rounded-xl transition-all duration-300 ease-out cursor-pointer ${
                    isPast
                      ? 'opacity-35 hover:opacity-80 text-outline'
                      : 'opacity-70 hover:opacity-100 text-on-surface'
                  }`}
                  title={`Nhảy tới ${formatTime(line.timeMs)}`}
                >
                  <span className="font-mono text-[11px] text-outline w-12 shrink-0">
                    {formatTime(line.timeMs)}
                  </span>
                  <p className={`font-body font-medium transition-all duration-300 ${
                    fontSizeLevel === 2 ? 'text-lg sm:text-xl' : fontSizeLevel === 0 ? 'text-sm sm:text-base' : 'text-base sm:text-lg'
                  }`}>
                    {capitalizeFirstLetter(line.text)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 4. FOOTER CANVAS LỜI NHẠC ────────────────────────────────────────── */}
      <div className="shrink-0 pt-2 border-t border-white/5 flex items-center justify-between text-outline text-[11px] font-mono px-1">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-tertiary">
            <span className="material-symbols-outlined text-[14px]">check_circle</span>
            Đồng bộ thời gian thực
          </span>
          <span>•</span>
          <span>Nhấp dòng để chuyển đoạn hát</span>
        </div>
        <span className="text-[10px] uppercase font-bold text-outline">
          ANNA KARAOKE ENGINE
        </span>
      </div>

      {/* Fullscreen Modal */}
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
