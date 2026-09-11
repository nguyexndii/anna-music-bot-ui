import React, { useState, useEffect, useRef } from 'react';
import { Loader2, SlidersHorizontal, Sparkles, AlignLeft, Disc3, Maximize2 } from 'lucide-react';
import { API_BASE } from '../config';
import KaraokeFullscreenModal from './KaraokeFullscreenModal';

// Module-level cache to prevent re-fetching when user switches tabs
const lyricsCache = new Map();

function parseDurationToMs(str) {
  if (!str || str.toLowerCase().includes('live')) return 0;
  const parts = str.split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
  if (parts.length === 2) return (parts[0] * 60 + parts[1]) * 1000;
  return parts[0] * 1000;
}

// Tự động viết hoa chữ cái đầu tiên của câu hát để hiển thị chỉn chu, đẹp mắt
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

  // Chỉ coi là nhạc nền Lofi không lời nếu bài hát do bot tự động phát 24/7 khi hàng chờ trống
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

  const isYtCc = lyricsData?.source === 'youtube_cc' || lyricsData?.source === 'youtube_auto_cc';

  const [manualOffsetMs, setManualOffsetMs] = useState(() => {
    return getSavedOffset(current?.title, isYtCc) ?? 0;
  });
  const [showSyncAdjust, setShowSyncAdjust] = useState(false);
  const [viewMode, setViewMode] = useState('synced'); // 'synced' or 'plain'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentSourceInfo, setCurrentSourceInfo] = useState(null);

  const activeLineRef = useRef(null);
  const containerRef  = useRef(null);
  const lastSeekRef   = useRef(null);

  // Lắng nghe sự kiện mở Karaoke toàn màn hình hoặc chuyển chế độ Lofi
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

  // Khi qua bài mới hoặc đổi nguồn lyric: Cuộn ngay lập tức lên đầu trang và cập nhật offset tương ứng
  useEffect(() => {
    setActiveLineIdx(-1);
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    const saved = getSavedOffset(current?.title, isYtCc);
    setManualOffsetMs(saved ?? 0);
  }, [current?.title, current?.url, isYtCc]);

  // Khi dữ liệu lời bài hát mới nạp xong: đảm bảo luôn ở đầu trang
  useEffect(() => {
    if (containerRef.current && activeLineIdx <= 0) {
      containerRef.current.scrollTop = 0;
    }
  }, [lyricsData, current?.title]);

  // Khi người dùng chuyển từ tab khác quay lại tab Lời Nhạc:
  useEffect(() => {
    if (!isActive || !containerRef.current) return;
    if (activeLineIdx <= 0) {
      containerRef.current.scrollTop = 0;
    } else if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [isActive]);

  // Báo cáo nguồn lyric ra ngoài để hiển thị ở thanh footer (ngang hàng ANNA MUSIC - WEB PLAYER)
  useEffect(() => {
    const report = (info) => {
      onSourceChange?.(info);
      setCurrentSourceInfo(info);
    };

    if (!current?.title) {
      report(null);
      return;
    }

    if (isLofiTrack || lyricsData?.isLofi) {
      report({
        text: 'LOFI CHILL · TỰ ĐỘNG',
        color: 'var(--yellow)',
        bg: 'rgba(232,201,119,0.08)',
        border: 'rgba(232,201,119,0.25)',
        title: 'Bản nhạc Lofi thư giãn tự động'
      });
      return;
    }

    if (loading) {
      report({
        text: 'ĐANG TÌM LỜI...',
        color: 'var(--muted)',
        bg: 'transparent',
        border: 'transparent'
      });
      return;
    }

    if (!lyricsData || !lyricsData.lyrics) {
      report({
        text: 'REMIX / BEAT · KHÔNG CÓ LỜI',
        color: 'var(--muted)',
        bg: 'rgba(255,255,255,0.04)',
        border: 'var(--border)',
        title: 'Bản nhạc không có dữ liệu lời bài hát'
      });
      return;
    }

    if (lyricsData.source === 'youtube_cc') {
      report({
        text: 'LỜI: CC CHÍNH THỨC',
        color: '#38ef7d',
        bg: 'rgba(56,239,125,0.08)',
        border: 'rgba(56,239,125,0.25)',
        title: 'Lời nhạc trích xuất từ phụ đề CC chính thức của nghệ sĩ trên YouTube'
      });
    } else if (lyricsData.source === 'youtube_auto_cc') {
      report({
        text: 'LỜI: CC TỰ ĐỘNG (AI)',
        color: '#e8c977',
        bg: 'rgba(232, 201, 119, 0.08)',
        border: 'rgba(232, 201, 119, 0.25)',
        title: 'Lời tạo tự động từ giọng hát (AI) bởi YouTube, có thể có từ nhận diện chưa chuẩn'
      });
    } else if (lyricsData.source === 'lrclib') {
      report({
        text: 'LỜI: SPOTIFY / LRCLIB',
        color: '#1db954',
        bg: 'rgba(29,185,84,0.08)',
        border: 'rgba(29,185,84,0.25)',
        title: 'Lời nhạc đồng bộ từ cơ sở dữ liệu Spotify / Apple Music (LRCLIB)'
      });
    } else if (lyricsData.source === 'syncedlyrics') {
      report({
        text: 'LỜI: SYNCEDLYRICS',
        color: '#ff9e64',
        bg: 'rgba(255,158,100,0.08)',
        border: 'rgba(255,158,100,0.25)',
        title: 'Lời nhạc từ mạng lưới Syncedlyrics đa nguồn'
      });
    } else {
      report({
        text: 'LỜI: ĐỒNG BỘ',
        color: 'var(--yellow)',
        bg: 'rgba(232,201,119,0.08)',
        border: 'rgba(232,201,119,0.25)'
      });
    }
  }, [lyricsData, loading, isLofiTrack, current?.title, onSourceChange]);

  // Fetch lyrics with caching
  useEffect(() => {
    if (isLofiTrack) {
      setLyricsData(null);
      setLoading(false);
      return;
    }

    if (!current?.title) {
      setLyricsData(null);
      setLoading(false);
      return;
    }

    const key = `${current.title}|${current.artist || ''}|${current.url || ''}`;

    if (lyricsCache.has(key)) {
      const cached = lyricsCache.get(key);
      const isYtTrack = Boolean(current.url && (current.url.includes('youtube.com') || current.url.includes('youtu.be')));
      if (!isYtTrack || cached?.source === 'youtube_cc' || cached?.isLofi || cached?._fetchedFresh) {
        const isYt = cached?.source === 'youtube_cc';
        const savedOffset = getSavedOffset(current.title, isYt);
        setLyricsData(cached);
        setManualOffsetMs(savedOffset !== null ? savedOffset : 0);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    setActiveLineIdx(-1);

    const durMs = current.durationMs || parseDurationToMs(current.duration);
    const params = new URLSearchParams({ title: current.title });
    if (current.artist && current.artist !== 'Unknown') params.set('artist', current.artist);
    if (durMs > 0) params.set('duration', durMs);
    if (current.url) params.set('url', current.url);

    const fetchUrl = guildId
      ? `${API_BASE}/api/guilds/${guildId}/lyrics`
      : `${API_BASE}/api/lyrics?${params}`;

    fetch(fetchUrl)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const result = (d?.success && d?.lyrics) ? { ...d, _fetchedFresh: true } : null;
        if (result) {
          lyricsCache.set(key, result);
          const isYt = result?.source === 'youtube_cc';
          const savedOffset = getSavedOffset(current.title, isYt);
          setManualOffsetMs(savedOffset !== null ? savedOffset : 0);
        }
        setLyricsData(result);
        setLoading(false);
      })
      .catch(() => {
        if (guildId) {
          fetch(`${API_BASE}/api/lyrics?${params}`)
            .then(r => r.ok ? r.json() : null)
            .then(d => {
              const result = (d?.success && d?.lyrics) ? { ...d, _fetchedFresh: true } : null;
              if (result) {
                lyricsCache.set(key, result);
                const isYt = result?.source === 'youtube_cc';
                const savedOffset = getSavedOffset(current.title, isYt);
                setManualOffsetMs(savedOffset !== null ? savedOffset : 0);
              }
              setLyricsData(result);
              setLoading(false);
            })
            .catch(() => {
              setLyricsData(null);
              setLoading(false);
            });
        } else {
          setLyricsData(null);
          setLoading(false);
        }
      });
  }, [current?.title, current?.artist, current?.duration, current?.durationMs, current?.url, guildId, isLofiTrack]);

  // Sync active line — compensates for server poll delay using serverTime
  useEffect(() => {
    if (!lyricsData?.syncedLyrics?.length) return;
    const paused = player?.isPaused || !player?.isPlaying;

    // If recently sought, use local seek anchor to avoid jumping
    let base;
    if (lastSeekRef.current && Date.now() - lastSeekRef.current.timestamp < 1800) {
      const elapsedSinceSeek = Date.now() - lastSeekRef.current.timestamp;
      base = lastSeekRef.current.timeMs + (paused ? 0 : elapsedSinceSeek);
    } else if (typeof current?.playbackDurationMs === 'number' && typeof current?.serverTime === 'number') {
      const networkCompensation = paused ? 0 : Math.max(0, Date.now() - current.serverTime);
      base = current.playbackDurationMs + networkCompensation;
    } else if (current?.startTime) {
      base = Math.max(0, Date.now() - current.startTime);
    } else {
      base = 0;
    }

    const t0 = Date.now();
    const baseAtT0 = base;

    const tick = () => {
      const elapsed = (paused ? baseAtT0 : Math.max(0, baseAtT0 + (Date.now() - t0))) + manualOffsetMs;
      let found = -1;
      for (let i = 0; i < lyricsData.syncedLyrics.length; i++) {
        const lt = lyricsData.syncedLyrics[i].time ?? lyricsData.syncedLyrics[i].timeMs ?? 0;
        if (elapsed >= lt) found = i; else break;
      }
      setActiveLineIdx(found);
    };

    tick();
    const iv = setInterval(tick, 150);
    return () => clearInterval(iv);
  }, [current?.title, current?.startTime, current?.playbackDurationMs, current?.serverTime, player?.isPaused, player?.isPlaying, lyricsData?.syncedLyrics, manualOffsetMs]);

  // Auto-scroll — smoothly center active line, or scroll to top if song just started
  useEffect(() => {
    if (!autoScroll || viewMode === 'plain' || !containerRef.current) return;
    if (activeLineIdx <= 0) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [activeLineIdx, autoScroll, viewMode]);

  const updateOffset = (newOffset) => {
    setManualOffsetMs(newOffset);
    saveOffset(current?.title, newOffset, isYtCc);
  };

  // Lofi / 24/7 special view
  if (isLofiTrack || lyricsData?.isLofi) {
    return (
      <>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '40px 20px', textAlign: 'center' }}>
          <div style={{
            fontFamily: '"DM Mono", monospace', fontSize: 10, letterSpacing: '0.16em',
            color: 'var(--yellow)', background: 'rgba(232,201,119,0.1)', padding: '5px 14px',
            borderRadius: 999, border: '1px solid rgba(232,201,119,0.3)', marginBottom: 14
          }}>
            LOFI 24/7 · PHÁT TỰ ĐỘNG
          </div>
          <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>
            Không gian âm nhạc Lofi Chill
          </h3>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--muted)', maxWidth: 320, lineHeight: 1.6 }}>
            Bản nhạc thư giãn tự động không lời. Chúc bạn có những phút giây làm việc và học tập hiệu quả ☕
          </p>
          <button
            onClick={() => setIsFullscreen(true)}
            style={{
              border: '1px solid rgba(232, 201, 119, 0.45)',
              background: 'rgba(232, 201, 119, 0.12)',
              color: 'var(--yellow)',
              borderRadius: 10, padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 6,
              cursor: 'pointer', fontSize: 11, fontFamily: '"DM Mono", monospace', fontWeight: 700,
              boxShadow: '0 4px 14px rgba(232,201,119,0.15)',
              transition: 'all .18s',
            }}
          >
            <Maximize2 size={13} />
            <span>MỞ TOÀN MÀN HÌNH</span>
          </button>
        </div>

        <KaraokeFullscreenModal
          isOpen={isFullscreen}
          onClose={() => setIsFullscreen(false)}
          player={player}
          lyricsData={lyricsData}
          activeLineIdx={activeLineIdx}
          manualOffsetMs={manualOffsetMs}
          onUpdateOffset={updateOffset}
          onAction={onAction}
          lyricsSourceInfo={currentSourceInfo}
        />
      </>
    );
  }

  const hasSynced = Boolean(lyricsData?.syncedLyrics?.length > 0);
  const showSynced = hasSynced && viewMode === 'synced';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* ── Lyrics Topbar Header ──────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 14, flexShrink: 0,
      }}>
        <div style={{ minWidth: 0, flex: 1, paddingRight: 10 }}>
          <p
            title={current?.title}
            style={{
              fontFamily: '"DM Mono", monospace', fontSize: 9.5, letterSpacing: '0.14em',
              color: 'var(--yellow)', margin: '0 0 2px', textTransform: 'uppercase',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
            }}
          >
            {current?.title || 'Chưa có bài hát'}
          </p>
          <p
            title={current?.artist}
            style={{
              fontSize: 11.5, color: 'var(--muted)', margin: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
            }}
          >
            {current?.artist && current.artist !== 'Unknown' ? current.artist : ''}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          {/* Fullscreen Karaoke Stage Button */}
          <button
            onClick={() => setIsFullscreen(true)}
            style={{
              border: '1px solid rgba(232, 201, 119, 0.45)',
              background: 'rgba(232, 201, 119, 0.12)',
              color: 'var(--yellow)',
              borderRadius: 8, padding: '5px 9px', display: 'flex', alignItems: 'center', gap: 5,
              cursor: 'pointer', fontSize: 10, fontFamily: '"DM Mono", monospace', fontWeight: 700,
              transition: 'all .18s',
            }}
            title="Mở chế độ Lời nhạc & Karaoke toàn màn hình (Phím tắt: ESC để đóng)"
          >
            <Maximize2 size={11} />
            <span>TOÀN MÀN HÌNH</span>
          </button>

          {/* View Mode Toggle (Synced vs Plain text) */}
          {hasSynced && (
            <button
              onClick={() => setViewMode(m => m === 'plain' ? 'synced' : 'plain')}
              style={{
                border: `1px solid ${viewMode === 'plain' ? 'rgba(232,201,119,0.45)' : 'var(--border)'}`,
                background: viewMode === 'plain' ? 'rgba(232,201,119,.12)' : 'transparent',
                color: viewMode === 'plain' ? 'var(--yellow)' : 'var(--muted)',
                borderRadius: 8, padding: '5px 8px', display: 'flex', alignItems: 'center', gap: 4,
                cursor: 'pointer', fontSize: 10, fontFamily: '"DM Mono", monospace',
                transition: 'all .18s',
              }}
              title={viewMode === 'plain' ? 'Chuyển sang xem lời chạy theo nhạc' : 'Chuyển sang đọc toàn bộ lời bài hát'}
            >
              <AlignLeft size={11} />
            </button>
          )}

          {/* Sync Offset Adjuster Toggle (icon only) */}
          {showSynced && (
            <button
              onClick={() => setShowSyncAdjust(p => !p)}
              style={{
                border: `1px solid ${showSyncAdjust ? 'rgba(232,201,119,0.45)' : 'var(--border)'}`,
                background: showSyncAdjust ? 'rgba(232,201,119,.12)' : 'transparent',
                color: showSyncAdjust ? 'var(--yellow)' : 'var(--muted)',
                borderRadius: 8, padding: '5px 7px', display: 'flex', alignItems: 'center',
                cursor: 'pointer',
                transition: 'all .18s',
                position: 'relative',
              }}
              title={`Chỉnh độ trễ nhịp lời bài hát${manualOffsetMs !== 0 ? ` (${manualOffsetMs > 0 ? '+' : ''}${(manualOffsetMs/1000).toFixed(1)}s)` : ''}`}
            >
              <SlidersHorizontal size={11} />
              {manualOffsetMs !== 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'var(--yellow)',
                }}/>
              )}
            </button>
          )}

          {/* External Lyrics Warning Tooltip Icon (!) */}
          {showSynced && !isYtCc && (
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(232, 201, 119, 0.12)',
                border: '1px solid rgba(232, 201, 119, 0.4)',
                color: 'var(--yellow)',
                fontSize: 11,
                fontWeight: 800,
                fontFamily: '"DM Mono", monospace',
                cursor: 'help',
                userSelect: 'none',
                flexShrink: 0,
                lineHeight: 1,
                transition: 'all .18s',
              }}
              title="⚠️ Lời từ Spotify / Bên thứ ba · Có thể lệch nhẹ so với video YouTube"
            >
              !
            </span>
          )}

          {/* Auto Scroll Toggle (icon + minimal) */}
          {showSynced && (
            <button
              onClick={() => setAutoScroll(p => !p)}
              style={{
                border: `1px solid ${autoScroll ? 'rgba(232,201,119,0.45)' : 'var(--border)'}`,
                background: autoScroll ? 'rgba(232,201,119,.08)' : 'transparent',
                color: autoScroll ? 'var(--yellow)' : 'var(--muted)',
                borderRadius: 8, padding: '5px 7px', display: 'flex', alignItems: 'center',
                cursor: 'pointer',
                fontSize: 9, fontFamily: '"DM Mono", monospace',
                transition: 'all .18s',
              }}
              title={autoScroll ? 'Tắt tự cuộn' : 'Bật tự cuộn'}
            >
              {/* Simple scroll icon */}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v10"/><path d="m16 6-4 4-4-4"/><path d="M3 20h18"/><path d="M3 16h18"/>
              </svg>
            </button>
          )}

          {lyricsData?.lyrics && !hasSynced && (
            <span style={{
              fontFamily: '"DM Mono", monospace', fontSize: 9.5, color: 'var(--yellow)', letterSpacing: '0.08em',
              border: '1px solid rgba(232, 201, 119, 0.3)', borderRadius: 6, padding: '4px 8px', background: 'rgba(232, 201, 119, 0.08)',
              fontWeight: 600
            }}>
              LỜI ĐỌC
            </span>
          )}
        </div>
      </div>

      {/* ── Sync Calibration Bar with Multi-tier Offset Controls ── */}
      {showSyncAdjust && showSynced && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 6,
          padding: '10px 14px', marginBottom: 12, borderRadius: 12,
          background: 'var(--paper)', border: '1px solid var(--border)', flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 9.5, color: 'var(--muted)', marginRight: 2 }}>BÙ TRỄ:</span>
            <button
              onClick={() => updateOffset(manualOffsetMs - 10000)}
              style={{ padding: '3px 7px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--soft)', color: 'var(--yellow)', fontSize: 10, cursor: 'pointer', fontWeight: 600 }}
              title="Lùi lời lại 10 giây (dành cho MV có intro dài)"
            >
              -10s
            </button>
            <button
              onClick={() => updateOffset(manualOffsetMs - 5000)}
              style={{ padding: '3px 7px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--soft)', color: 'var(--ink)', fontSize: 10, cursor: 'pointer' }}
              title="Lùi lời lại 5 giây"
            >
              -5s
            </button>
            <button
              onClick={() => updateOffset(manualOffsetMs - 2000)}
              style={{ padding: '3px 7px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--soft)', color: 'var(--ink)', fontSize: 10, cursor: 'pointer' }}
              title="Lùi lời lại 2 giây"
            >
              -2s
            </button>
            <button
              onClick={() => updateOffset(manualOffsetMs - 1000)}
              style={{ padding: '3px 7px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--soft)', color: 'var(--ink)', fontSize: 10, cursor: 'pointer' }}
              title="Lùi lời lại 1 giây"
            >
              -1s
            </button>
            <button
              onClick={() => updateOffset(manualOffsetMs - 250)}
              style={{ padding: '3px 7px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--soft)', color: 'var(--ink)', fontSize: 10, cursor: 'pointer' }}
              title="Lùi lời lại 250 mili-giây"
            >
              -0.2s
            </button>
            <button
              onClick={() => updateOffset(0)}
              style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid var(--yellow)', background: 'transparent', color: 'var(--yellow)', fontSize: 10, fontFamily: '"DM Mono", monospace', cursor: 'pointer', fontWeight: 700 }}
              title="Đặt lại mặc định"
            >
              RESET
            </button>
            <button
              onClick={() => updateOffset(manualOffsetMs + 250)}
              style={{ padding: '3px 7px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--soft)', color: 'var(--ink)', fontSize: 10, cursor: 'pointer' }}
              title="Cho chữ nhảy sớm hơn 250 mili-giây"
            >
              +0.2s
            </button>
            <button
              onClick={() => updateOffset(manualOffsetMs + 1000)}
              style={{ padding: '3px 7px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--soft)', color: 'var(--ink)', fontSize: 10, cursor: 'pointer' }}
              title="Cho chữ nhảy sớm hơn 1 giây"
            >
              +1s
            </button>
            <button
              onClick={() => updateOffset(manualOffsetMs + 2000)}
              style={{ padding: '3px 7px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--soft)', color: 'var(--ink)', fontSize: 10, cursor: 'pointer' }}
              title="Cho chữ nhảy sớm hơn 2 giây"
            >
              +2s
            </button>
            <button
              onClick={() => updateOffset(manualOffsetMs + 5000)}
              style={{ padding: '3px 7px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--soft)', color: 'var(--ink)', fontSize: 10, cursor: 'pointer' }}
              title="Cho chữ nhảy sớm hơn 5 giây"
            >
              +5s
            </button>
            <button
              onClick={() => updateOffset(manualOffsetMs + 10000)}
              style={{ padding: '3px 7px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--soft)', color: 'var(--yellow)', fontSize: 10, cursor: 'pointer', fontWeight: 600 }}
              title="Cho chữ nhảy sớm hơn 10 giây"
            >
              +10s
            </button>
          </div>
          <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--muted)', fontFamily: '"DM Mono", monospace' }}>
            {manualOffsetMs === 0 ? (
              isYtCc ? (
                <span style={{ color: '#38ef7d' }}>
                  ✓ Đã đồng bộ chuẩn 100% từ phụ đề CC của video YouTube (bao gồm cả đoạn phim intro MV)
                </span>
              ) : (
                <span>💡 MV YouTube có intro đóng phim dài: bấm <b>-10s</b> hoặc <b>-5s</b> | Lời chạy chậm hơn tiếng: bấm <b>+1s</b> / <b>+2s</b></span>
              )
            ) : (
              <span style={{ color: 'var(--yellow)' }}>
                Đang bù nhịp: <b>{manualOffsetMs > 0 ? `+${(manualOffsetMs/1000).toFixed(2)}s (sớm hơn)` : `${(manualOffsetMs/1000).toFixed(2)}s (trễ hơn)`}</b> · Đã tự động lưu vào máy!
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Scroll Container (Centered Lyrics with Top & Bottom Fade Mask) ── */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '20px',
          paddingBottom: '55%',
          paddingRight: 6,
          textAlign: 'center',
          minHeight: 0,
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 8%, black 85%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 8%, black 85%, transparent 100%)',
        }}
      >
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 10, color: 'var(--muted)' }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--yellow)' }} />
            <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, letterSpacing: '0.12em' }}>ĐANG TẢI LỜI BÀI HÁT...</span>
          </div>
        )}

        {!loading && !lyricsData && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '70px 20px', gap: 14, textAlign: 'center' }}>
            <div style={{ width: 44, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
              {[10, 18, 22, 18, 10].map((h, i) => (
                <span key={i} style={{ width: 2.5, height: h, background: 'var(--border)', borderRadius: 2, display: 'block' }} />
              ))}
            </div>
            <div>
              <p style={{ fontWeight: 500, color: 'var(--ink)', fontSize: 15, margin: '0 0 6px' }}>Không có lời bài hát</p>
              <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0, maxWidth: 300, lineHeight: 1.6 }}>
                {current ? 'Bản nhạc này chưa có dữ liệu lời bài hát (Beat / Remix / Nhạc không lời).' : 'Phát một bài hát để xem lời nhé!'}
              </p>
            </div>
          </div>
        )}

        {!loading && lyricsData && (
          <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {showSynced ? (
              lyricsData.syncedLyrics.map((line, i) => {
                const isActive = i === activeLineIdx;
                const timeMs = line.time ?? line.timeMs ?? 0;
                return (
                  <p
                    key={i}
                    ref={isActive ? activeLineRef : null}
                    onClick={() => {
                      if (timeMs >= 0 && onAction) {
                        const seekSec = Math.max(0, Math.floor(timeMs / 1000));
                        lastSeekRef.current = { timeMs, timestamp: Date.now() };
                        setActiveLineIdx(i);
                        onAction('seek', seekSec);
                      }
                    }}
                    title={timeMs > 0 ? `Nhảy tới ${formatLyricTime(timeMs)}` : undefined}
                    style={{
                      margin: '5px 0',
                      padding: '10px 20px',
                      borderRadius: 16,
                      fontSize: 17,
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? '#ffffff' : 'rgba(238, 233, 224, 0.36)',
                      lineHeight: 1.55,
                      cursor: 'pointer',
                      transition: 'color 0.25s ease, background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
                      background: isActive ? 'rgba(232, 201, 119, 0.12)' : 'transparent',
                      border: isActive ? '1px solid rgba(232, 201, 119, 0.3)' : '1px solid transparent',
                      boxShadow: isActive ? '0 6px 20px rgba(0,0,0,0.35), inset 0 0 10px rgba(232,201,119,0.06)' : 'none',
                      textShadow: isActive ? '0 0 14px rgba(232, 201, 119, 0.35)' : 'none',
                      maxWidth: '96%',
                      textAlign: 'center',
                      userSelect: 'none',
                    }}
                  >
                    {capitalizeFirstLetter(line.text)}
                  </p>
                );
              })
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                <div style={{
                  fontFamily: '"DM Mono", monospace', fontSize: 10, letterSpacing: '0.12em',
                  color: 'var(--yellow)', background: 'rgba(232, 201, 119, 0.08)', padding: '5px 16px',
                  borderRadius: 999, border: '1px solid rgba(232, 201, 119, 0.25)', marginBottom: 18,
                  fontWeight: 600
                }}>
                  LỜI BÀI HÁT
                </div>
                <div style={{ whiteSpace: 'pre-line', fontSize: 15.5, lineHeight: 2.2, color: 'var(--ink)', padding: '8px 20px', maxWidth: '92%', textAlign: 'center', opacity: 0.95 }}>
                  {formatPlainLyrics(lyricsData.lyrics)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <KaraokeFullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        player={player}
        lyricsData={lyricsData}
        activeLineIdx={activeLineIdx}
        manualOffsetMs={manualOffsetMs}
        onUpdateOffset={updateOffset}
        onAction={onAction}
        lyricsSourceInfo={currentSourceInfo}
      />
    </div>
  );
}

function formatLyricTime(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}
