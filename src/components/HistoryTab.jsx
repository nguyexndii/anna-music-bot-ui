import React, { useState, useMemo } from 'react';

function formatRelativeTime(dateString) {
  if (!dateString) return 'Gần đây';
  const date = new Date(dateString);
  if (isNaN(date)) return 'Gần đây';
  const diff = Date.now() - date;
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (mins < 1)   return 'Vừa xong';
  if (mins < 60)  return `${mins} phút trước`;
  if (hrs < 24)   return `${hrs} giờ trước`;
  if (days === 1) return 'Hôm qua';
  if (days < 7)   return `${days} ngày trước`;
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

export default function HistoryTab({ player, onOrderSong }) {
  const [query, setQuery] = useState('');
  const history = player?.history || [];

  const filtered = useMemo(() => {
    if (!query.trim()) return history;
    const q = query.toLowerCase();
    return history.filter(t => `${t.title} ${t.artist}`.toLowerCase().includes(q));
  }, [history, query]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Search box */}
      <div className="search-box" style={{ marginBottom: 20 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Tìm trong lịch sử..."
        />
        {query && (
          <button onClick={() => setQuery('')} style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--muted)', padding: 0 }}>✕</button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--muted)', textAlign: 'center', padding: '40px 0' }}>
          <div style={{ display: 'flex', gap: 3 }}>
            {[10, 18, 24, 18, 10].map((h, i) => (
              <span key={i} style={{ width: 2.5, height: h, background: 'var(--border)', borderRadius: 2, display: 'block' }} />
            ))}
          </div>
          <div>
            <p style={{ fontWeight: 500, color: 'var(--ink)', fontSize: 14, margin: '0 0 4px' }}>
              {query ? 'Không tìm thấy' : 'Chưa có lịch sử'}
            </p>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
              {query ? 'Thử từ khóa khác' : 'Các bài đã phát sẽ xuất hiện ở đây'}
            </p>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div className="section-label">
            <span>{filtered.length} BÀI</span>
          </div>
          {filtered.map((track, i) => (
            <button
              key={`${track.title}-${i}`}
              className="song-row"
              onClick={() => onOrderSong?.(track)}
              title={`Phát lại: ${track.title}`}
            >
              <div className="song-thumb" style={{ background: `linear-gradient(145deg, hsl(${(i * 40) % 360},40%,40%), hsl(${(i * 40 + 60) % 360},35%,25%))` }}>
                {track.thumbnail
                  ? <img src={track.thumbnail} alt="" />
                  : <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 10, color: 'rgba(255,255,255,.6)' }}>{i + 1}</span>
                }
              </div>
              <div className="song-info">
                <span className="song-name">{track.title}</span>
                <span className="song-sub">{track.artist && track.artist !== 'Unknown' ? track.artist : 'YouTube'}</span>
              </div>
              <span className="song-dur">{formatRelativeTime(track.playedAt)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
