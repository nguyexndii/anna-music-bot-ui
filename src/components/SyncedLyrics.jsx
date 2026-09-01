import React, { useState, useEffect, useRef } from 'react';
import { Loader2, SlidersHorizontal, Coffee, Sparkles } from 'lucide-react';
import { API_BASE } from '../config';

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

export default function SyncedLyrics({ player, onAction }) {
  const current = player?.current;
  const songKey = current?.title ? `${current.title}|${current.artist || ''}` : '';

  const isLofiTrack = Boolean(
    (current?.requestedBy === 'Auto (24/7)' && !current?.artist) ||
    current?.title?.toLowerCase()?.includes('lofi') ||
    current?.title?.toLowerCase()?.includes('lo-fi') ||
    current?.title?.toLowerCase()?.includes('chillhop') ||
    current?.title?.toLowerCase()?.includes('beats to relax') ||
    current?.title?.toLowerCase()?.includes('không lời') ||
    current?.title?.toLowerCase()?.includes('instrumental')
  );

  const [lyricsData, setLyricsData] = useState(() => {
    return songKey && lyricsCache.has(songKey) ? lyricsCache.get(songKey) : null;
  });
  const [loading, setLoading]       = useState(() => {
    return !isLofiTrack && Boolean(songKey && !lyricsCache.has(songKey));
  });
  const [activeLineIdx, setActiveLineIdx] = useState(-1);
  const [autoScroll, setAutoScroll] = useState(true);
  const [manualOffsetMs, setManualOffsetMs] = useState(0);

  const [showSyncAdjust, setShowSyncAdjust] = useState(false);

  const activeLineRef = useRef(null);
  const containerRef  = useRef(null);

  // When changing to a new song: scroll back to top immediately!
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [current?.title]);

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

    const key = `${current.title}|${current.artist || ''}`;
    if (lyricsCache.has(key)) {
      const cached = lyricsCache.get(key);
      setLyricsData(cached);
      setManualOffsetMs(cached?.autoOffsetMs || 0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setActiveLineIdx(-1);

    const durMs = current.durationMs || parseDurationToMs(current.duration);
    const params = new URLSearchParams({ title: current.title });
    if (current.artist && current.artist !== 'Unknown') params.set('artist', current.artist);
    if (durMs > 0) params.set('duration', durMs);

    fetch(`${API_BASE}/api/lyrics?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const result = d?.success ? d : null;
        if (result) {
          lyricsCache.set(key, result);
          if (result.autoOffsetMs) {
            setManualOffsetMs(result.autoOffsetMs);
          } else {
            setManualOffsetMs(0);
          }
        }
        setLyricsData(result);
        setLoading(false);
      })
      .catch(() => {
        setLyricsData(null);
        setLoading(false);
      });
  }, [current?.title, current?.artist, current?.duration, current?.durationMs, isLofiTrack]);

  // Sync active line (calculated with playback duration + manual offset)
  useEffect(() => {
    if (!lyricsData?.syncedLyrics?.length) return;
    const base = current?.playbackDurationMs ?? (current?.startTime ? Math.max(0, Date.now() - current.startTime) : 0);
    const t0   = Date.now();
    const paused = player?.isPaused || !player?.isPlaying;

    const tick = () => {
      const elapsed = (paused ? base : Math.max(0, base + (Date.now() - t0))) - manualOffsetMs;
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
  }, [current?.title, current?.startTime, current?.playbackDurationMs, player?.isPaused, player?.isPlaying, lyricsData?.syncedLyrics, manualOffsetMs]);

  // Auto-scroll — smoothly center active line (even for last lines)
  useEffect(() => {
    if (!autoScroll || !activeLineRef.current || !containerRef.current) return;
    activeLineRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [activeLineIdx, autoScroll]);

  // Lofi / 24/7 special view
  if (isLofiTrack || lyricsData?.isLofi) {
    return (
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
        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', maxWidth: 320, lineHeight: 1.6 }}>
          Bản nhạc thư giãn tự động không lời. Chúc bạn có những phút giây làm việc và học tập hiệu quả ☕
        </p>
      </div>
    );
  }


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

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {/* Sync Offset Adjuster Toggle */}
          {lyricsData?.syncedLyrics?.length > 0 && (
            <button
              onClick={() => setShowSyncAdjust(p => !p)}
              style={{
                border: `1px solid ${showSyncAdjust ? 'var(--yellow)' : 'var(--border)'}`,
                background: showSyncAdjust ? 'rgba(232,201,119,.12)' : 'transparent',
                color: showSyncAdjust ? 'var(--yellow)' : 'var(--muted)',
                borderRadius: 8, padding: '5px 8px', display: 'flex', alignItems: 'center', gap: 4,
                cursor: 'pointer', fontSize: 10, fontFamily: '"DM Mono", monospace'
              }}
              title="Chỉnh độ trễ nhịp lời bài hát (+/- giây)"
            >
              <SlidersHorizontal size={11} />
              <span>{manualOffsetMs !== 0 ? `${manualOffsetMs > 0 ? '+' : ''}${(manualOffsetMs/1000).toFixed(1)}s` : 'KHỚP'}</span>
            </button>
          )}

          {/* Auto Scroll Toggle */}
          {lyricsData?.syncedLyrics?.length > 0 && (
            <button
              onClick={() => setAutoScroll(p => !p)}
              style={{
                border: `1px solid ${autoScroll ? 'var(--yellow)' : 'var(--border)'}`,
                background: autoScroll ? 'rgba(232,201,119,.08)' : 'transparent',
                color: autoScroll ? 'var(--yellow)' : 'var(--muted)',
                borderRadius: 8, padding: '5px 10px',
                fontFamily: '"DM Mono", monospace', fontSize: 9.5, letterSpacing: '0.08em',
                cursor: 'pointer',
              }}
            >
              {autoScroll ? 'TỰ CUỘN' : 'TỰ CUỘN: TẮT'}
            </button>
          )}

          {lyricsData?.lyrics && !lyricsData?.syncedLyrics?.length && (
            <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: 'var(--muted)', letterSpacing: '0.1em' }}>
              LỜI THƯỜNG
            </span>
          )}
        </div>
      </div>

      {/* ── Sync Calibration Bar with Multi-tier Offset Controls ── */}
      {showSyncAdjust && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap',
          padding: '8px 12px', marginBottom: 12, borderRadius: 12,
          background: 'var(--paper)', border: '1px solid var(--border)', flexShrink: 0
        }}>
          <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 9.5, color: 'var(--muted)' }}>CHỈNH NHỊP:</span>
          <button
            onClick={() => setManualOffsetMs(p => p - 10000)}
            style={{ padding: '3px 7px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--soft)', color: 'var(--ink)', fontSize: 10, cursor: 'pointer' }}
          >
            -10s
          </button>
          <button
            onClick={() => setManualOffsetMs(p => p - 2000)}
            style={{ padding: '3px 7px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--soft)', color: 'var(--ink)', fontSize: 10, cursor: 'pointer' }}
          >
            -2s
          </button>
          <button
            onClick={() => setManualOffsetMs(p => p - 500)}
            style={{ padding: '3px 7px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--soft)', color: 'var(--ink)', fontSize: 10, cursor: 'pointer' }}
          >
            -0.5s
          </button>
          <button
            onClick={() => setManualOffsetMs(0)}
            style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid var(--yellow)', background: 'transparent', color: 'var(--yellow)', fontSize: 10, fontFamily: '"DM Mono", monospace', cursor: 'pointer', fontWeight: 700 }}
          >
            RESET
          </button>
          <button
            onClick={() => setManualOffsetMs(p => p + 500)}
            style={{ padding: '3px 7px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--soft)', color: 'var(--ink)', fontSize: 10, cursor: 'pointer' }}
          >
            +0.5s
          </button>
          <button
            onClick={() => setManualOffsetMs(p => p + 2000)}
            style={{ padding: '3px 7px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--soft)', color: 'var(--ink)', fontSize: 10, cursor: 'pointer' }}
          >
            +2s
          </button>
          <button
            onClick={() => setManualOffsetMs(p => p + 10000)}
            style={{ padding: '3px 7px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--soft)', color: 'var(--ink)', fontSize: 10, cursor: 'pointer' }}
          >
            +10s
          </button>
          <button
            onClick={() => setManualOffsetMs(p => p + 20000)}
            style={{ padding: '3px 7px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--soft)', color: 'var(--yellow)', fontSize: 10, cursor: 'pointer', fontWeight: 600 }}
          >
            +20s
          </button>
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
              <p style={{ fontWeight: 500, color: 'var(--ink)', fontSize: 15, margin: '0 0 6px' }}>Không có lời bài hát đồng bộ</p>
              <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0, maxWidth: 300, lineHeight: 1.6 }}>
                {current ? 'Bản nhạc này chưa có dữ liệu mốc giây (Beat / Nhạc không lời / Remix).' : 'Phát một bài hát để xem lời nhé!'}
              </p>
            </div>
          </div>
        )}

        {!loading && lyricsData && (
          <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {lyricsData.syncedLyrics?.length > 0 ? (
              lyricsData.syncedLyrics.map((line, i) => {
                const isActive = i === activeLineIdx;
                const timeMs = line.time ?? line.timeMs ?? 0;
                return (
                  <p
                    key={i}
                    ref={isActive ? activeLineRef : null}
                    onClick={() => { if (timeMs >= 0 && onAction) onAction('seek', Math.floor((timeMs + manualOffsetMs) / 1000)); }}
                    title={timeMs > 0 ? `Nhảy tới ${formatLyricTime(timeMs)}` : undefined}
                    style={{
                      margin: isActive ? '8px 0' : '4px 0',
                      padding: isActive ? '12px 24px' : '8px 18px',
                      borderRadius: isActive ? 18 : 12,
                      fontSize: isActive ? 19 : 14.5,
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? '#ffffff' : 'rgba(238, 233, 224, 0.4)',
                      lineHeight: 1.5,
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                      transform: isActive ? 'scale(1.02)' : 'none',
                      background: isActive ? 'rgba(232, 201, 119, 0.12)' : 'transparent',
                      border: isActive ? '1px solid rgba(232, 201, 119, 0.3)' : '1px solid transparent',
                      boxShadow: isActive ? '0 6px 20px rgba(0,0,0,0.35), inset 0 0 10px rgba(232,201,119,0.06)' : 'none',
                      textShadow: isActive ? '0 0 12px rgba(232, 201, 119, 0.35)' : 'none',
                      maxWidth: '92%',
                      textAlign: 'center',
                      userSelect: 'none',
                    }}
                  >
                    {line.text}
                  </p>
                );
              })
            ) : (
              <div style={{ whiteSpace: 'pre-line', fontSize: 14, lineHeight: 2.2, color: 'var(--muted)', padding: '8px 16px', maxWidth: '90%', textAlign: 'center' }}>
                {lyricsData.lyrics}
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function formatLyricTime(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}
