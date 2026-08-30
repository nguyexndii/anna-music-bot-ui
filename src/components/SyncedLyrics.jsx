import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Music, Mic2 } from 'lucide-react';
import { API_BASE } from '../config';

const lyricsCache = new Map();

export default function SyncedLyrics({ guildId, currentTrack, player }) {
  const current = currentTrack || player?.current;
  const targetGuildId = guildId || player?.guildId || localStorage.getItem('anna_guild_id');

  const cacheKey = targetGuildId && current?.title ? `${targetGuildId}:${current.title}` : null;
  const [lyricsData, setLyricsData] = useState(() => (cacheKey ? lyricsCache.get(cacheKey) || null : null));
  const [loading, setLoading] = useState(false);
  const [activeLineIdx, setActiveLineIdx] = useState(-1);
  const activeLineRef = useRef(null);

  // Sync active lyric line with song playback progress
  useEffect(() => {
    if (!current?.startTime || !lyricsData?.syncedLyrics || lyricsData.syncedLyrics.length === 0) return;
    
    const interval = setInterval(() => {
      const elapsedMs = Date.now() - current.startTime;
      const lines = lyricsData.syncedLyrics;
      
      let foundIdx = -1;
      for (let i = 0; i < lines.length; i++) {
        if (elapsedMs >= lines[i].timeMs) {
          foundIdx = i;
        } else {
          break;
        }
      }

      setActiveLineIdx(foundIdx);
    }, 500);

    return () => clearInterval(interval);
  }, [current?.startTime, lyricsData?.syncedLyrics]);

  // Auto-scroll to active line
  useEffect(() => {
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeLineIdx]);

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

  return (
    <div className="bg-anna-surface border border-anna-border/80 rounded-2xl p-6 flex-1 min-h-[420px] max-h-[540px] overflow-y-auto flex flex-col items-center text-center relative shadow-inner">
      {/* Track Header */}
      <div className="mb-6 sticky top-0 bg-anna-surface/90 backdrop-blur-md w-full py-2 z-10 border-b border-anna-border/40 flex flex-col items-center">
        <div className="flex items-center gap-1.5 text-anna-accent text-xs font-bold mb-1">
          <Mic2 className="w-4 h-4" />
          <span>LỜI BÀI HÁT ĐỒNG BỘ</span>
        </div>
        <h3 className="text-sm sm:text-base font-bold text-white max-w-md truncate">
          {current?.title || 'Chưa có bài hát đang phát'}
        </h3>
        <p className="text-xs text-anna-muted mt-0.5 max-w-md truncate">
          {current?.artist && current.artist !== 'Unknown' ? current.artist : 'YouTube Music'}
        </p>
      </div>

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
        <div className="space-y-4 text-sm font-medium text-anna-muted max-w-lg leading-relaxed py-4 w-full">
          {lyricsData.syncedLyrics && lyricsData.syncedLyrics.length > 0 ? (
            lyricsData.syncedLyrics.map((line, idx) => {
              const isActive = idx === activeLineIdx;
              return (
                <p
                  key={idx}
                  ref={isActive ? activeLineRef : null}
                  className={`transition-all duration-300 py-1 px-3 rounded-xl cursor-default ${
                    isActive
                      ? 'text-white text-base sm:text-lg font-bold bg-anna-accent/15 scale-105 shadow-sm text-anna-accent'
                      : 'text-anna-muted/70 hover:text-white'
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
  );
}
