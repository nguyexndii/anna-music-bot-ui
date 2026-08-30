import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Music, Mic2, FlaskConical } from 'lucide-react';
import { API_BASE } from '../config';

const lyricsCache = new Map();

export default function SyncedLyrics({ guildId, currentTrack, player, onAction }) {
  const current = currentTrack || player?.current;
  const targetGuildId = guildId || player?.guildId || localStorage.getItem('anna_guild_id');

  const cacheKey = targetGuildId && current?.title ? `${targetGuildId}:${current.title}` : null;
  const [lyricsData, setLyricsData] = useState(() => (cacheKey ? lyricsCache.get(cacheKey) || null : null));
  const [loading, setLoading] = useState(false);
  const [activeLineIdx, setActiveLineIdx] = useState(-1);
  const activeLineRef = useRef(null);

  // Local auto-scroll preference (Bật/Tắt cuộn theo bài hát)
  const [autoScroll, setAutoScroll] = useState(() => {
    const saved = localStorage.getItem('anna_karaoke_autoscroll');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    const handleStorage = (e) => {
      setAutoScroll(e.detail);
    };
    window.addEventListener('anna_autoscroll_change', handleStorage);
    return () => window.removeEventListener('anna_autoscroll_change', handleStorage);
  }, []);

  // Sync active lyric line with song playback progress
  useEffect(() => {
    if (!current?.startTime || !lyricsData?.syncedLyrics || lyricsData.syncedLyrics.length === 0) return;
    
    const checkActiveLine = () => {
      const elapsedMs = Math.max(0, Date.now() - current.startTime);
      const lines = lyricsData.syncedLyrics;
      
      let foundIdx = -1;
      for (let i = 0; i < lines.length; i++) {
        const lineTime = lines[i].time ?? lines[i].timeMs ?? lines[i].startTimeMs ?? 0;
        if (elapsedMs >= lineTime) {
          foundIdx = i;
        } else {
          break;
        }
      }

      setActiveLineIdx(foundIdx);
    };

    checkActiveLine();
    const interval = setInterval(checkActiveLine, 250);

    return () => clearInterval(interval);
  }, [current?.startTime, lyricsData?.syncedLyrics]);

  // Auto-scroll to active line (CHỈ cuộn khi autoScroll === true)
  useEffect(() => {
    if (autoScroll && activeLineRef.current) {
      activeLineRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeLineIdx, autoScroll]);

  // Fetch lyrics when track changes
  useEffect(() => {
    if (!targetGuildId || !current?.title) {
      setLyricsData(null);
      return;
    }

    const key = `${targetGuildId}:${current.title}`;
    if (lyricsCache.has(key)) {
      setLyricsData(lyricsCache.get(key));
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    fetch(`${API_BASE}/api/guilds/${targetGuildId}/lyrics`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          setLoading(false);
          if (data.success && (data.lyrics || data.syncedLyrics)) {
            lyricsCache.set(key, data);
            setLyricsData(data);
          } else {
            setLyricsData(null);
          }
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [targetGuildId, current?.title]);

  const toggleAutoScroll = () => {
    const next = !autoScroll;
    setAutoScroll(next);
    localStorage.setItem('anna_karaoke_autoscroll', String(next));
    window.dispatchEvent(new CustomEvent('anna_autoscroll_change', { detail: next }));
  };

  return (
    <div className="bg-anna-surface border border-anna-border/80 rounded-2xl flex-1 min-h-[420px] max-h-[540px] flex flex-col shadow-inner overflow-hidden">
      {/* Fixed Track Header */}
      <div className="px-6 py-3.5 border-b border-anna-border/60 bg-anna-card/50 backdrop-blur-md flex flex-col items-center text-center flex-shrink-0 z-10">
        <div className="flex items-center gap-1.5 text-anna-accent text-xs font-bold mb-0.5">
          <Mic2 className="w-4 h-4" />
          <span>LỜI BÀI HÁT ĐỒNG BỘ</span>
        </div>
        <h3 className="text-sm sm:text-base font-bold text-white max-w-md truncate">
          {current?.title || 'Chưa có bài hát đang phát'}
        </h3>
        <p className="text-xs text-anna-muted mt-0.5 max-w-md truncate">
          {current?.artist && current.artist !== 'Unknown' ? current.artist : 'YouTube Music'}
        </p>

        {/* Trial Auto-scroll Note & Quick Toggle */}
        <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 font-medium flex items-center gap-1">
            <FlaskConical className="w-3 h-3 text-amber-400" />
            <span>Thử nghiệm: Tự cuộn theo bài</span>
          </span>
          <button
            onClick={toggleAutoScroll}
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition active:scale-95 ${
              autoScroll
                ? 'bg-anna-accent text-white shadow-sm shadow-anna-accent/30'
                : 'bg-anna-card text-anna-muted hover:text-white border border-anna-border'
            }`}
            title="Bật/Tắt tự động cuộn theo bài hát (Hoặc tùy chỉnh trong Cài Đặt)"
          >
            {autoScroll ? 'Đang Bật' : 'Đang Tắt'}
          </button>
        </div>
      </div>

      {/* Scrollable Lyrics Container */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center text-center">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 text-anna-accent gap-2">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="text-xs text-anna-muted font-medium">Đang tìm lời bài hát...</span>
          </div>
        )}

        {/* Not Found State */}
        {!loading && !lyricsData && (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-anna-muted py-16 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-anna-card border border-anna-border flex items-center justify-center shadow-inner">
              <Music className="w-6 h-6 text-anna-muted opacity-60" />
            </div>
            <p className="text-xs font-medium max-w-xs leading-relaxed">
              {current ? 'Không tìm thấy lời bài hát khớp cho ca khúc này.' : 'Hãy phát một bài hát để xem lời bài hát đồng bộ nhé!'}
            </p>
          </div>
        )}

        {/* Lyrics Display */}
        {!loading && lyricsData && (
          <div className="space-y-4 text-sm font-medium text-anna-muted max-w-lg leading-relaxed py-2 w-full">
            {lyricsData.syncedLyrics && lyricsData.syncedLyrics.length > 0 ? (
              lyricsData.syncedLyrics.map((line, idx) => {
                const isActive = idx === activeLineIdx;
                const timeMs = line.time ?? line.timeMs ?? 0;

                return (
                  <p
                    key={idx}
                    ref={isActive ? activeLineRef : null}
                    onClick={() => {
                      if (timeMs >= 0 && onAction) {
                        onAction('seek', Math.floor(timeMs / 1000));
                      }
                    }}
                    title={timeMs > 0 ? `Nhấn để nhảy tới ${Math.floor(timeMs / 60000)}:${String(Math.floor((timeMs % 60000) / 1000)).padStart(2, '0')}` : ''}
                    className={`transition-all duration-300 py-1.5 px-4 rounded-xl cursor-pointer select-none ${
                      isActive
                        ? 'text-white text-base sm:text-lg font-bold bg-anna-accent/20 scale-105 shadow-sm text-anna-accent'
                        : 'text-anna-muted/70 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {line.text}
                  </p>
                );
              })
            ) : (
              <div className="whitespace-pre-line text-xs sm:text-sm leading-relaxed text-anna-text text-left sm:text-center px-4 font-sans">
                {lyricsData.lyrics}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
