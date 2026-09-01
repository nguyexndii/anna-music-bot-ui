import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Music } from 'lucide-react';
import { API_BASE } from '../config';

export default function SyncedLyrics({ player, onAction, isLyricsEnabled, onToggleLyrics }) {
  const [lyricsData, setLyricsData] = useState(null);
  const [loading, setLoading]       = useState(false);
  const [activeLineIdx, setActiveLineIdx] = useState(-1);
  const [autoScroll, setAutoScroll] = useState(true);
  const activeLineRef   = useRef(null);
  const containerRef    = useRef(null);

  const current = player?.current;

  // Fetch lyrics when song changes
  useEffect(() => {
    if (!current?.title) { setLyricsData(null); return; }
    setLoading(true); setActiveLineIdx(-1);
    const params = new URLSearchParams({ title: current.title });
    if (current.artist && current.artist !== 'Unknown') params.set('artist', current.artist);
    if (current.durationMs) params.set('duration', current.durationMs);
    fetch(`${API_BASE}/api/lyrics?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setLyricsData(d?.success ? d : null); setLoading(false); })
      .catch(() => { setLyricsData(null); setLoading(false); });
  }, [current?.title]);

  // Sync active line
  useEffect(() => {
    if (!lyricsData?.syncedLyrics?.length) return;
    const base = current?.playbackDurationMs ?? (current?.startTime ? Math.max(0, Date.now() - current.startTime) : 0);
    const t0   = Date.now();
    const paused = player?.isPaused || !player?.isPlaying;
    const tick = () => {
      const elapsed = paused ? base : Math.max(0, base + (Date.now() - t0));
      let found = -1;
      for (let i = 0; i < lyricsData.syncedLyrics.length; i++) {
        const lt = lyricsData.syncedLyrics[i].time ?? lyricsData.syncedLyrics[i].timeMs ?? 0;
        if (elapsed >= lt) found = i; else break;
      }
      setActiveLineIdx(found);
    };
    tick();
    const iv = setInterval(tick, 200);
    return () => clearInterval(iv);
  }, [current?.title, current?.startTime, current?.playbackDurationMs, player?.isPaused, player?.isPlaying, lyricsData?.syncedLyrics]);

  // Auto-scroll — center active line, with bottom padding trick
  useEffect(() => {
    if (!autoScroll || !activeLineRef.current || !containerRef.current) return;
    activeLineRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [activeLineIdx, autoScroll]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20, flexShrink: 0,
      }}>
        <div>
          <p style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, letterSpacing: '0.16em', color: 'var(--muted)', margin: '0 0 4px', textTransform: 'uppercase' }}>
            {current?.title || 'Chưa có bài hát'}
          </p>
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
            {current?.artist && current.artist !== 'Unknown' ? current.artist : ''}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {lyricsData?.syncedLyrics?.length > 0 && (
            <button
              onClick={() => setAutoScroll(p => !p)}
              style={{
                border: `1px solid ${autoScroll ? 'var(--yellow)' : 'var(--border)'}`,
                background: autoScroll ? 'rgba(232,201,119,.08)' : 'transparent',
                color: autoScroll ? 'var(--yellow)' : 'var(--muted)',
                borderRadius: 8, padding: '4px 10px',
                fontFamily: '"DM Mono", monospace', fontSize: 9, letterSpacing: '0.1em',
                cursor: 'pointer',
              }}
            >
              {autoScroll ? 'TỰ CUỘN: BẬT' : 'TỰ CUỘN: TẮT'}
            </button>
          )}
          {lyricsData?.lyrics && !lyricsData?.syncedLyrics?.length && (
            <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, color: 'var(--muted)', letterSpacing: '0.1em' }}>
              LỜI THƯỜNG
            </span>
          )}
        </div>
      </div>

      {/* Scroll container — paddingBottom = 50% so last line can center */}
      <div
        ref={containerRef}
        style={{
          flex: 1, overflowY: 'auto', paddingBottom: '50%',
          paddingRight: 4,
        }}
      >
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 10, color: 'var(--muted)' }}>
            <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, letterSpacing: '0.12em' }}>ĐANG TÌM LỜI BÀI HÁT...</span>
          </div>
        )}

        {!loading && !lyricsData && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 14, textAlign: 'center' }}>
            <div style={{ width: 40, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
              {[10, 16, 20, 16, 10].map((h, i) => (
                <span key={i} style={{ width: 2, height: h, background: 'var(--border)', borderRadius: 2, display: 'block' }} />
              ))}
            </div>
            <div>
              <p style={{ fontWeight: 500, color: 'var(--ink)', fontSize: 14, margin: '0 0 6px' }}>Không có lời bài hát</p>
              <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0, maxWidth: 260, lineHeight: 1.6 }}>
                {current ? 'Bản nhạc này chưa có lời đồng bộ (Beat / Lofi / EDM).' : 'Phát một bài hát để xem lời nhé!'}
              </p>
            </div>
          </div>
        )}

        {!loading && lyricsData && (
          <div style={{ paddingTop: 8 }}>
            {lyricsData.syncedLyrics?.length > 0 ? (
              lyricsData.syncedLyrics.map((line, i) => {
                const isActive = i === activeLineIdx;
                const timeMs = line.time ?? line.timeMs ?? 0;
                return (
                  <p
                    key={i}
                    ref={isActive ? activeLineRef : null}
                    onClick={() => { if (timeMs >= 0 && onAction) onAction('seek', Math.floor(timeMs / 1000)); }}
                    title={timeMs > 0 ? `Nhảy tới ${formatLyricTime(timeMs)}` : undefined}
                    style={{
                      margin: 0,
                      padding: '9px 10px',
                      borderRadius: 8,
                      fontSize: isActive ? 18 : 15,
                      fontWeight: isActive ? 500 : 400,
                      color: isActive ? 'var(--ink)' : 'var(--muted)',
                      lineHeight: 1.45,
                      cursor: 'pointer',
                      transition: 'all 0.25s cubic-bezier(0.2,0.8,0.2,1)',
                      transform: isActive ? 'scale(1.01)' : 'none',
                      transformOrigin: 'left center',
                      background: isActive ? 'rgba(232,201,119,0.06)' : 'transparent',
                      borderLeft: isActive ? '2px solid var(--yellow)' : '2px solid transparent',
                    }}
                  >
                    {line.text}
                  </p>
                );
              })
            ) : (
              <div style={{ whiteSpace: 'pre-line', fontSize: 13, lineHeight: 2, color: 'var(--muted)', padding: '4px 10px' }}>
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
