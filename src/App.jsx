import React, { useState, useEffect, useCallback, useRef } from 'react';
import HeroPlayer from './components/HeroPlayer';
import LiveSearch from './components/LiveSearch';
import QueueManager from './components/QueueManager';
import SyncedLyrics from './components/SyncedLyrics';
import SettingsTab from './components/SettingsTab';
import HistoryTab from './components/HistoryTab';
import PermissionModal from './components/PermissionModal';
import ConnectingStepper from './components/ConnectingStepper';
import LofiConfirmModal from './components/LofiConfirmModal';
import Toast from './components/Toast';
import DynamicAmbientBackground from './components/DynamicAmbientBackground';
import { Search, ListMusic, Mic2, Settings, History, AlertCircle, Disc3, Play, Pause, SkipForward, Loader2 } from 'lucide-react';
import { API_BASE, DEFAULT_TRACK_THUMB } from './config';

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

// ─── Rail tab definitions ────────────────────────────────────────────────────
const TABS = [
  { id: 'player',   label: 'Đang Phát', Icon: Disc3,     mobileOnly: true },
  { id: 'search',   label: 'Khám Phá', Icon: Search                      },
  { id: 'queue',    label: 'Hàng Chờ', Icon: ListMusic                   },
  { id: 'lyrics',   label: 'Lời Nhạc', Icon: Mic2                        },
  { id: 'history',  label: 'Lịch Sử',  Icon: History                     },
  { id: 'settings', label: 'Cài Đặt',  Icon: Settings                    },
];

// ─── Brand Logo Mark ────────────────────────────────────────────────────────
function BrandMark({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="brand-logo-btn group"
      title="Về trang Khám Phá"
      aria-label="Về trang Khám Phá"
    >
      <img src="/logo.gif" alt="Anna Logo" className="brand-logo-img" />
      <div className="brand-mark-text">
        <span className="y">an</span><span className="c">na</span>
      </div>
    </button>
  );
}

// ─── PIN / Auth screen ───────────────────────────────────────────────────────
function AuthScreen({ onVerify, authError, isVerifying }) {
  const [pin, setPin] = useState('');
  const [localError, setLocalError] = useState('');
  const error = localError || authError;

  const submit = (e) => {
    e.preventDefault();
    setLocalError('');
    let val = e.target.tokenInput.value.trim();
    if (val.includes('token=')) {
      try {
        const parsed = new URL(val);
        val = parsed.searchParams.get('token') || val;
      } catch {
        const m = val.match(/token=([a-zA-Z0-9._-]+)/);
        if (m) val = m[1];
      }
    }
    if (!val) return;
    localStorage.removeItem('anna_web_token');
    onVerify(val, true);
  };

  return (
    <main className="auth-shell">
      <div className="auth-brand">
        <img src="/logo.gif" alt="Anna Music" style={{ width: 64, height: 64, borderRadius: 18, margin: '0 auto 14px', border: '1.5px solid var(--border)', objectFit: 'cover', imageRendering: 'pixelated', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }} />
        <div className="brand-name"><span className="y">an</span><b className="c">na</b></div>
        <div className="brand-subtitle">MUSIC WEB PLAYER</div>
      </div>
      <form className="auth-card" onSubmit={submit}>
        <div className="card-kicker">KẾT NỐI TÀI KHOẢN</div>
        <h1>Nhập mã PIN</h1>
        <p className="card-copy">Dùng lệnh <code style={{color:'var(--yellow)'}}>/web</code> trong Discord để nhận mã 6 số</p>
        <label className="pin-label" htmlFor="tokenInput">MÃ PIN</label>
        <input
          id="tokenInput"
          name="tokenInput"
          autoFocus
          inputMode="numeric"
          maxLength={30}
          value={pin}
          onChange={e => { setPin(e.target.value); setLocalError(''); }}
          placeholder="Nhập PIN 6 số..."
        />
        <div className="pin-digits" aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className={pin[i] ? 'filled' : ''}></span>
          ))}
        </div>
        {error && <p className="form-error"><AlertCircle size={12} style={{display:'inline',marginRight:4}} />{error}</p>}
        <button className="primary-button" type="submit" disabled={isVerifying}>
          {isVerifying ? 'Đang kết nối...' : 'Kết Nối'}
        </button>
        <p className="card-footnote">Mã PIN chỉ có hiệu lực trong phiên hiện tại.</p>
      </form>
      <footer className="auth-footer">ANNA MUSIC</footer>
    </main>
  );
}

// ─── No Voice screen ─────────────────────────────────────────────────────────
function NoVoiceScreen({ user, onRefresh, isRefreshing, onLogout }) {
  return (
    <main className="auth-shell">
      <div className="auth-brand">
        <img src="/logo.gif" alt="Anna Music" style={{ width: 64, height: 64, borderRadius: 18, margin: '0 auto 14px', border: '1.5px solid var(--border)', objectFit: 'cover', imageRendering: 'pixelated', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }} />
        <div className="brand-name"><span className="y">an</span><b className="c">na</b></div>
        <div className="brand-subtitle">MUSIC WEB PLAYER</div>
      </div>
      <section className="auth-card voice-card">
        <div className="quiet-shape" aria-hidden="true">
          <i /><i /><i /><i /><i />
        </div>
        <div className="card-kicker">PHIÊN KẾT NỐI</div>
        <h1>Chưa ở trong kênh Voice</h1>
        <p className="card-copy">
          Để sử dụng web player, bạn cần tham gia một kênh thoại (Voice Channel) trên Discord trước. Bot và bạn phải ở cùng kênh.
        </p>
        {user?.guildName && (
          <div className="server-badge">{user.guildName.toUpperCase()}</div>
        )}
        <div className="voice-actions">
          <button className="primary-button" onClick={onRefresh} disabled={isRefreshing}>
            {isRefreshing ? 'Đang kiểm tra...' : 'Thử Lại'}
          </button>
        </div>
        <p className="hint">Sau khi vào kênh Voice, nhấn Thử Lại để đồng bộ.</p>
      </section>
      <footer className="auth-footer">ANNA MUSIC</footer>
    </main>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────
export default function App() {
  const [token, setToken] = useState(() => {
    const u = new URLSearchParams(window.location.search);
    return u.get('token') || localStorage.getItem('anna_web_token') || null;
  });
  const [guildId, setGuildId] = useState(() => {
    const u = new URLSearchParams(window.location.search);
    return u.get('guild') || localStorage.getItem('anna_guild_id') || null;
  });

  const [user, setUser]                   = useState(null);
  const [guild, setGuild]                 = useState(null);
  const [player, setPlayer]               = useState(null);
  const [activeWebUsers, setActiveWebUsers] = useState([]);
  const [activeTab, setActiveTab]         = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 1024) {
      return 'player';
    }
    return 'search';
  });
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [isLofiConfirmOpen, setIsLofiConfirmOpen]         = useState(false);
  const [authError, setAuthError]                         = useState(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isVerifying, setIsVerifying]     = useState(true);
  const [isRefreshingVoice, setIsRefreshingVoice] = useState(false);
  const [toasts, setToasts]               = useState([]);
  const [lyricsSourceInfo, setLyricsSourceInfo] = useState(null);
  const [pendingAction, setPendingAction] = useState(null); // 'skip' | 'previous' | 'playback' | 'seek' | 'playNow'
  const actionLockRef = useRef({});
  const pendingTimerRef = useRef(null);
  const lastTrackUrlRef = useRef(player?.current?.url);

  // Tự động mở khóa nút bấm (Pending Action) khi bài hát mới đã bắt đầu phát
  useEffect(() => {
    if (!pendingAction) return;
    const currUrl = player?.current?.url;
    const isNowPlaying = player?.isPlaying && !player?.isPaused;

    if (['skip', 'previous', 'playNow', 'switchTo247', 'toggleLofiMode'].includes(pendingAction)) {
      if (currUrl && currUrl !== lastTrackUrlRef.current && isNowPlaying) {
        lastTrackUrlRef.current = currUrl;
        setPendingAction(null);
        if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
      }
    } else if (pendingAction === 'playback') {
      setPendingAction(null);
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    }
  }, [player?.current?.url, player?.isPlaying, player?.isPaused, pendingAction]);

  useEffect(() => {
    lastTrackUrlRef.current = player?.current?.url;
  }, [player?.current?.url]);

  // Splash loading screen with logo (1.8 - 2.0s) on app startup
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Toast stack manager (ngăn chặn thông báo trùng lặp)
  const showToast = useCallback((message, type = 'success') => {
    if (!message) return;
    setToasts(prev => {
      // Chống hiển thị 2 thông báo y hệt nhau cùng lúc
      if (prev.some(t => t.message === message)) return prev;
      const id = Date.now() + Math.random().toString(36).substring(2, 6);
      setTimeout(() => {
        setToasts(p => p.filter(t => t.id !== id));
      }, 2500);
      return [...prev.slice(-2), { id, message, type }];
    });
  }, []);

  const handleDismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleAuthExpired = useCallback((msg = 'Phiên làm việc đã hết hạn. Vui lòng kết nối lại!') => {
    setUser(null); setToken(null);
    localStorage.removeItem('anna_web_token');
    showToast(msg, 'error');
    setAuthError(msg);
  }, [showToast]);

  const handleLogout = () => {
    setUser(null); setToken(null);
    localStorage.removeItem('anna_web_token');
    localStorage.removeItem('anna_guild_id');
    setAuthError(null);
  };

  // 1. Verify token/PIN with smooth min delay (800ms)
  const verifyToken = useCallback((tokenToVerify, isUserInitiated = false) => {
    if (!tokenToVerify) { setIsVerifying(false); return; }
    setIsVerifying(true);
    if (isUserInitiated) setAuthError(null);
    const startTime = Date.now();
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 7000);
    fetch(`${API_BASE}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: tokenToVerify }),
      signal: controller.signal,
    })
      .then(async res => {
        clearTimeout(tid);
        const data = await res.json().catch(() => ({}));
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 700 - elapsed);
        setTimeout(() => {
          setIsVerifying(false);
          if (res.ok && data.success && data.user) {
            const sess = data.token || tokenToVerify;
            setUser(data.user); setGuildId(data.user.guildId); setToken(sess);
            localStorage.setItem('anna_web_token', sess);
            localStorage.setItem('anna_guild_id', data.user.guildId);
            setAuthError(null);
          } else {
            setUser(null); setToken(null);
            localStorage.removeItem('anna_web_token');
            localStorage.removeItem('anna_guild_id');
            if (isUserInitiated) setAuthError(data.error || 'Mã PIN không đúng hoặc đã hết hạn.');
            else setAuthError(null);
          }
        }, delay);
      })
      .catch(err => {
        clearTimeout(tid);
        setIsVerifying(false);
        setUser(null); setToken(null);
        localStorage.removeItem('anna_web_token');
        localStorage.removeItem('anna_guild_id');
        if (isUserInitiated)
          setAuthError(err.name === 'AbortError' ? 'Kết nối quá thời gian!' : 'Không thể kết nối đến máy chủ bot!');
        else setAuthError(null);
      });
  }, []);

  // 2. URL token on mount
  useEffect(() => {
    const u = new URLSearchParams(window.location.search);
    const tok = u.get('token'); const gld = u.get('guild');
    if (tok) {
      setToken(tok); localStorage.setItem('anna_web_token', tok);
      if (gld) { setGuildId(gld); localStorage.setItem('anna_guild_id', gld); }
      verifyToken(tok, true);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      const saved = localStorage.getItem('anna_web_token');
      if (saved) {
        verifyToken(saved, false);
      } else {
        setTimeout(() => setIsVerifying(false), 500);
      }
    }
  }, [verifyToken]);

  // 3. Refresh voice session
  const handleRefreshVoice = () => {
    const tok = token || localStorage.getItem('anna_web_token');
    if (!tok) return;
    setIsRefreshingVoice(true);
    fetch(`${API_BASE}/api/auth/verify`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: tok }),
    })
      .then(async res => {
        if (res.status === 401) { setIsRefreshingVoice(false); handleAuthExpired('Phiên kết nối đã hết hạn!'); return; }
        const data = await res.json().catch(() => ({}));
        setIsRefreshingVoice(false);
        if (res.ok && data.success && data.user) {
          setUser(data.user);
          if (data.user.isInVoice) showToast('Đã kết nối phòng Voice thành công!');
          else showToast('Bạn chưa tham gia kênh Voice!', 'error');
        } else {
          setUser(null); setToken(null);
          localStorage.removeItem('anna_web_token');
          showToast(data.error || 'Phiên kết nối đã hết hạn!', 'error');
        }
      })
      .catch(() => { setIsRefreshingVoice(false); showToast('Không thể kết nối đến máy chủ bot!', 'error'); });
  };

  // 4. Poll state (siêu nhẹ 2.5s khi xem tab, 12s khi ẩn tab, nạp full 1 lần ban đầu)
  const fetchState = useCallback((isFull = false) => {
    const cg = guildId || user?.guildId;
    const ct = token || localStorage.getItem('anna_web_token');
    if (!cg || !user) return;
    fetch(`${API_BASE}/api/guilds/${cg}/state${isFull ? '?full=1' : ''}`, {
      headers: ct ? { 'Authorization': `Bearer ${ct}` } : {},
    })
      .then(async res => {
        if (res.status === 401) { handleAuthExpired(); return; }
        const data = await res.json().catch(() => ({}));
        if (data.success) {
          if (data.guild) setGuild(data.guild);
          if (data.player) {
            setPlayer(prev => {
              if (!prev) return data.player;
              return {
                ...prev,
                ...data.player,
                favorites: data.player.favorites !== undefined ? data.player.favorites : (prev.favorites || []),
                history: data.player.history !== undefined ? data.player.history : (prev.history || []),
                topTracks: data.player.topTracks !== undefined ? data.player.topTracks : (prev.topTracks || []),
                recentPlaylists: data.player.recentPlaylists !== undefined ? data.player.recentPlaylists : (prev.recentPlaylists || [])
              };
            });
          }
          if (data.activeWebUsers) setActiveWebUsers(data.activeWebUsers);
        }
      })
      .catch(() => {});
  }, [guildId, token, user, handleAuthExpired]);

  useEffect(() => {
    if (!user) return;
    // Nạp đầy đủ 1 lần từ đầu (để tab Khám Phá có dữ liệu tức thì 0s, không bị loading)
    fetchState(true);

    let iv = null;

    const startPolling = (intervalMs) => {
      if (iv) clearInterval(iv);
      iv = setInterval(() => {
        fetchState(false);
      }, intervalMs);
    };

    startPolling(2500);

    // Page Visibility API: giảm tải 85% request khi thu nhỏ tab / qua tab khác
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab đang ở chế độ nền: chậm lại 12s/lần
        startPolling(12000);
      } else {
        // Quay lại tab: gọi ngay lập tức và đưa về nhịp 2.5s
        fetchState(false);
        startPolling(2500);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (iv) clearInterval(iv);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, fetchState]);

  // 5. Order song
  const handleOrderSong = async (track) => {
    const cg = guildId || user?.guildId;
    const ct = token || localStorage.getItem('anna_web_token');
    if (!cg || !ct) return;
    const title = track?.title || track?.name || (track?.isPlaylist ? 'Danh sách phát' : 'bài hát');
    try {
      showToast(`Đang thêm "${title}"...`, 'info');
      const res = await fetch(`${API_BASE}/api/guilds/${cg}/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ct}` },
        body: JSON.stringify({ track, token: ct }),
      });
      if (res.status === 401) { handleAuthExpired(); return; }
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        if (data.isPlaylist || data.addedCount || track?.isPlaylist) {
          const c = data.addedCount || (data.tracks ? data.tracks.length : '');
          showToast(`Đã thêm Playlist${c ? ` (${c} bài)` : ''} vào hàng chờ!`);
        } else {
          showToast(`Đã thêm "${data.track?.title || title}" vào hàng chờ!`);
        }
        if (data.track && (!player?.current || player.current.is247 || player.current.requestedBy === 'Auto (24/7)')) {
          setPlayer(prev => prev ? {
            ...prev,
            current: {
              ...data.track,
              is247: false,
              requestedBy: user?.displayName || user?.username || 'User'
            }
          } : prev);
        }
        fetchState(true);
      } else {
        showToast(data.error || 'Lỗi thêm bài hát', 'error');
        if (data.error?.includes('Voice')) handleRefreshVoice();
      }
    } catch { showToast('Không thể gửi yêu cầu đến bot!', 'error'); }
  };

  // 6. Player action với chống spam và phản hồi trực quan tức thì
  const handlePlayerAction = async (action, value = null) => {
    const cg = guildId || user?.guildId;
    const ct = token || localStorage.getItem('anna_web_token');
    if (!cg || !ct) return;

    if (action === 'notifyEmptyRoom') {
      showToast('Phòng Voice hiện đang trống, bot duy trì phát Lofi 24/7 ☕', 'info');
      return;
    }

    // Nếu đã ở chế độ Lofi rồi, thông báo nhẹ nhàng và dừng lại
    if (action === 'notifyAlreadyLofi') {
      showToast('Bot hiện đang phát nhạc nền Lofi thư giãn rồi nhé ☕', 'info');
      return;
    }

    // Nếu chuyển sang Lofi từ danh sách người dùng, yêu cầu xác nhận trước để tránh bấm nhầm
    const isLofiCurrent = Boolean(player?.current && (player?.current?.is247 || player?.current?.requestedBy === 'Auto (24/7)'));
    if (action === 'toggleLofiMode' && !isLofiCurrent && value !== 'confirmed') {
      setIsLofiConfirmOpen(true);
      return;
    }

    // Chặn spam thao tác nếu đang có tác vụ chuyển bài hoặc tua đang xử lý
    if (pendingAction) {
      showToast('Đang xử lý bài hát, vui lòng chờ chút nhé...', 'info');
      return;
    }

    const actionKey = (action === 'pause' || action === 'resume') ? 'playback' : action;
    const isHeavyAction = ['skip', 'previous', 'playNow', 'seek', 'playback', 'switchTo247', 'toggleLofiMode'].includes(actionKey);

    if (isHeavyAction) {
      setPendingAction(actionKey);
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
      const timeoutMs = ['skip', 'previous', 'playNow', 'switchTo247', 'toggleLofiMode'].includes(actionKey) ? 7500 : (actionKey === 'seek' ? 2000 : 1200);
      pendingTimerRef.current = setTimeout(() => {
        setPendingAction(null);
      }, timeoutMs);
    }

    if (action === 'skip') {
      showToast('Đang chuyển bài tiếp theo... ⏭️', 'info');
    } else if (action === 'previous') {
      showToast('Đang quay lại bài trước... ⏮️', 'info');
    } else if (action === 'seek') {
      const sec = Math.max(0, Math.floor(Number(value) || 0));
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      showToast(`Đang chuyển đến ${m}:${s < 10 ? '0' : ''}${s}... ⏱️`, 'info');
    } else if (action === 'playNow') {
      showToast('Đang phát ngay bài được chọn... ▶️', 'info');
    } else if (action === 'toggleLofiMode') {
      const isLofiCurrent = Boolean(player?.current && (player?.current?.is247 || player?.current?.requestedBy === 'Auto (24/7)'));
      if (isLofiCurrent) {
        showToast('Đang chuyển về phát bài hát của bạn... 🎵', 'info');
      } else {
        showToast('Đang lưu hàng chờ và chuyển sang nhạc Lofi thư giãn... ☕', 'info');
        window.dispatchEvent(new CustomEvent('anna_switch_lofi'));
      }
    } else if (action === 'switchTo247') {
      showToast('Đang chuyển sang nhạc nền Lofi 24/7 thư giãn... ☕', 'info');
      // Phát sự kiện dọn lời bài hát ngay lập tức
      window.dispatchEvent(new CustomEvent('anna_switch_lofi'));
      // Cập nhật lạc quan giao diện hiển thị Lofi
      setPlayer(prev => prev ? {
        ...prev,
        mode247: true,
        current: {
          ...prev.current,
          title: 'Đang tải nhạc Lofi 24/7 thư giãn...',
          artist: 'Anna Music',
          is247: true,
          requestedBy: 'Auto (24/7)'
        }
      } : prev);
    }

    const adminOnly = ['toggle247','set247','toggleAutoplay','setAutoplay','settings','updateSettings'];
    if (adminOnly.includes(action) && !user?.isAdmin) {
      setPendingAction(null);
      setIsPermissionModalOpen(true);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/guilds/${cg}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ct}` },
        body: JSON.stringify({ action, value, token: ct }),
      });
      if (res.status === 401) {
        setPendingAction(null);
        handleAuthExpired();
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (res.status === 403 || data.code === 'PERMISSION_DENIED') {
        setPendingAction(null);
        setIsPermissionModalOpen(true);
        return;
      }
      if (res.ok && data.success) {
        if (data.message) showToast(data.message);
        const shouldFull = ['toggleFavorite', 'clear', 'remove', 'removeBatch', 'switchTo247', 'toggleLofiMode'].includes(action);
        fetchState(shouldFull);
      } else {
        setPendingAction(null);
        showToast(data.error || 'Lỗi thao tác!', 'error');
      }
    } catch {
      setPendingAction(null);
      showToast('Lỗi gửi lệnh điều khiển!', 'error');
    }
  };

  // Tab switching
  const switchTab = (id) => {
    if (id === activeTab) return;
    setActiveTab(id);
  };

  // ── Renders ─────────────────────────────────────────────────────────────────
  if (isInitialLoading || isVerifying) {
    return (
      <ConnectingStepper
        text={isVerifying ? (token ? 'ĐANG KẾT NỐI BOT...' : 'ĐANG XÁC THỰC...') : 'ĐANG KHỞI TẠO...'}
      />
    );
  }

  if (!user) {
    return (
      <AuthScreen
        onVerify={verifyToken}
        authError={authError}
        isVerifying={isVerifying}
      />
    );
  }

  if (!user.isInVoice || (!user.isSameVoice && user.botVoice)) {
    return (
      <NoVoiceScreen
        user={user}
        onRefresh={handleRefreshVoice}
        isRefreshing={isRefreshingVoice}
        onLogout={handleLogout}
      />
    );
  }

  const effectiveContentTab = activeTab === 'player' ? 'search' : activeTab;
  const activeTabDef = TABS.find(t => t.id === effectiveContentTab);
  const otherUsers = (activeWebUsers || []).filter(u => u.userId && user && String(u.userId) !== String(user.userId));

  return (
    <div className="music-app" data-active-tab={activeTab} style={{ position: 'relative', overflow: 'hidden' }}>
      {/* ── Dynamic Ambient Blurred Background ─────────── */}
      <DynamicAmbientBackground currentTrack={player?.current} isPlaying={player?.isPlaying} />

      {/* ── Rail ─────────────────────────────────────── */}
      <aside className="rail" style={{ position: 'sticky', zIndex: 10 }}>
        <BrandMark onClick={() => switchTab('search')} />
        <nav className="rail-nav" aria-label="Điều hướng">
          {TABS.map(({ id, label, Icon, mobileOnly }) => {
            const queueCount = id === 'queue' ? (player?.queue?.length || 0) : 0;
            return (
              <button
                key={id}
                className={`rail-btn${activeTab === id ? ' active' : ''}${mobileOnly ? ' mobile-only-tab' : ''}`}
                onClick={() => switchTab(id)}
                aria-label={label}
                aria-pressed={activeTab === id}
                style={{ position: 'relative' }}
              >
                <div style={{ position: 'relative', display: 'inline-flex' }}>
                  <Icon size={20} strokeWidth={1.6} />
                  {queueCount > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: -5,
                      right: -8,
                      background: 'var(--yellow)',
                      color: '#111',
                      fontSize: 9,
                      fontWeight: 800,
                      minWidth: 15,
                      height: 15,
                      borderRadius: 999,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 3px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                      fontFamily: '"DM Mono", monospace'
                    }}>
                      {queueCount > 99 ? '99+' : queueCount}
                    </span>
                  )}
                </div>
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        <div className="rail-bottom">
          <img
            className="rail-avatar"
            src={user.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
            alt={user.displayName || user.username}
            title={`${user.displayName || user.username} (bạn)`}
            style={{ borderColor: 'var(--yellow)' }}
          />
        </div>
      </aside>

      {/* ── Now Playing ───────────────────────────────── */}
      <section className="now-playing" style={{ position: 'relative', zIndex: 1 }}>
        <header className="now-topbar">
          <span className="now-eyebrow">ĐANG PHÁT</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Online Users Avatar Stack (Avatar của bạn chồng lên những người còn lại) */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {(() => {
                const myId = String(user?.userId || user?.id || '');
                const myUser = user ? [{ ...user, isMe: true, userId: myId }] : [];
                const otherOnline = (activeWebUsers || []).filter(u => String(u.userId || u.id) !== myId);
                const allOnline = [...myUser, ...otherOnline];
                const maxVisible = 4;
                const visible = allOnline.slice(0, maxVisible);
                const extra = allOnline.length - maxVisible;

                return (
                  <>
                    {visible.map((u, i) => {
                      const baseZ = 20 - i;
                      return (
                        <img
                          key={u.userId || u.id || i}
                          src={u.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                          alt={u.displayName || u.username}
                          title={`${u.displayName || u.username || 'Người dùng'}${u.isMe ? ' (Bạn)' : ''}`}
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            border: `2px solid ${u.isMe ? 'var(--yellow)' : 'var(--border)'}`,
                            objectFit: 'cover',
                            marginLeft: i > 0 ? -8 : 0,
                            zIndex: baseZ,
                            transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease, z-index 0.2s ease',
                            cursor: 'pointer',
                            position: 'relative'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.35) translateY(-1px)';
                            e.currentTarget.style.zIndex = '50';
                            e.currentTarget.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.75)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.zIndex = String(baseZ);
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        />
                      );
                    })}
                    {extra > 0 && (
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: '#23262c',
                          border: '2px solid var(--border)',
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: 9,
                          fontFamily: '"DM Mono", monospace',
                          fontWeight: 700,
                          color: 'var(--yellow)',
                          marginLeft: -8,
                          zIndex: 5,
                          cursor: 'default'
                        }}
                        title={`+${extra} người khác đang online`}
                      >
                        +{extra > 9 ? '9+' : extra}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            <span className="now-eyebrow" style={{ color: 'var(--yellow)' }}>
              {Math.max(1, (activeWebUsers?.length || 0) + (user ? (activeWebUsers?.some(u => String(u.userId || u.id) === String(user.userId || user.id)) ? 0 : 1) : 0))} ONLINE
            </span>
          </div>
        </header>
        <HeroPlayer
          player={player}
          onAction={handlePlayerAction}
          user={user}
          onRequireAdmin={() => setIsPermissionModalOpen(true)}
          pendingAction={pendingAction}
        />
      </section>

      {/* ── Content Panel ─────────────────────────────── */}
      <section className="content-panel" style={{ position: 'relative', zIndex: 1 }}>
        <header className="content-header">
          <h2 className="content-title">
            {activeTabDef?.label}
            {effectiveContentTab === 'queue' && (
              <span className="live-dot" title="Hàng chờ đang hoạt động" />
            )}
            {effectiveContentTab === 'search' && player?.isPlaying && (
              <span className="live-dot" title="Đang phát" />
            )}
          </h2>
          <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 9, letterSpacing: '0.14em', color: 'var(--muted)', textTransform: 'uppercase' }}>
            {guild?.name || user?.guildName || ''}
          </span>
        </header>

        <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
          <div className="tab-enter" style={{ height: '100%', display: effectiveContentTab === 'search' ? 'flex' : 'none', flexDirection: 'column' }}>
            <LiveSearch onOrderSong={handleOrderSong} player={player} guildId={guildId} token={token} />
          </div>
          <div className="tab-enter" style={{ height: '100%', display: effectiveContentTab === 'queue' ? 'flex' : 'none', flexDirection: 'column' }}>
            <QueueManager queue={player?.queue} onAction={handlePlayerAction} pendingAction={pendingAction} player={player} />
          </div>
          <div className="tab-enter" style={{ height: '100%', display: effectiveContentTab === 'lyrics' ? 'flex' : 'none', flexDirection: 'column' }}>
            <SyncedLyrics
              player={player}
              onAction={handlePlayerAction}
              isActive={effectiveContentTab === 'lyrics'}
              guildId={guildId}
              onSourceChange={setLyricsSourceInfo}
            />
          </div>
          <div className="tab-enter" style={{ height: '100%', display: effectiveContentTab === 'history' ? 'flex' : 'none', flexDirection: 'column' }}>
            <HistoryTab player={player} onOrderSong={handleOrderSong} />
          </div>
          <div className="tab-enter" style={{ height: '100%', display: effectiveContentTab === 'settings' ? 'flex' : 'none', flexDirection: 'column' }}>
            <SettingsTab
              guildId={guildId}
              guildName={guild?.name}
              token={token}
              player={player}
              user={user}
              onAction={handlePlayerAction}
              onRequireAdmin={() => setIsPermissionModalOpen(true)}
            />
          </div>
        </div>


        <footer className="panel-footer">
          <span>ANNA MUSIC</span>
          {effectiveContentTab === 'lyrics' && lyricsSourceInfo && (
            <span
              style={{
                fontFamily: '"DM Mono", monospace',
                fontSize: '9.5px',
                letterSpacing: '0.12em',
                color: lyricsSourceInfo.color || 'var(--muted)',
                background: lyricsSourceInfo.bg || 'transparent',
                border: `1px solid ${lyricsSourceInfo.border || 'transparent'}`,
                padding: '2px 9px',
                borderRadius: '6px',
                fontWeight: 600,
                textTransform: 'uppercase',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                userSelect: 'none'
              }}
              title={lyricsSourceInfo.title || undefined}
            >
              {lyricsSourceInfo.text}
            </span>
          )}
          <span>WEB PLAYER</span>
        </footer>
      </section>

      {/* ── Mobile Mini Player (Mobile & Tablet) ─────── */}
      {player?.current && activeTab !== 'player' && (
        <aside
          className="mobile-mini-player"
          onClick={() => switchTab('player')}
          title="Nhấn để mở màn hình đang phát"
        >
          <div className="mini-player-body">
            <img
              src={getTrackThumb(player.current)}
              alt=""
              className="mini-player-thumb"
            />
            <div className="mini-player-info">
              <div className="mini-player-title">{player.current.title}</div>
              <div className="mini-player-artist">{player.current.artist || 'Anna Music'}</div>
            </div>

            <div className="mini-player-actions" onClick={(e) => e.stopPropagation()}>
              <button
                className="mini-ctrl-btn"
                onClick={() => handlePlayerAction(player.isPlaying ? 'pause' : 'resume')}
                disabled={Boolean(pendingAction)}
                style={pendingAction ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
                aria-label={player.isPlaying ? 'Tạm dừng' : 'Phát'}
              >
                {pendingAction === 'playback' ? (
                  <Loader2 size={16} className="animate-spin text-white" />
                ) : player.isPlaying ? (
                  <Pause size={17} />
                ) : (
                  <Play size={17} fill="currentColor" />
                )}
              </button>
              <button
                className="mini-ctrl-btn"
                onClick={() => handlePlayerAction('skip')}
                disabled={Boolean(pendingAction)}
                style={pendingAction ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
                aria-label="Chuyển bài"
              >
                {pendingAction === 'skip' ? (
                  <Loader2 size={16} className="animate-spin text-white" />
                ) : (
                  <SkipForward size={17} />
                )}
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* ── Modals / Toasts ───────────────────────────── */}
      <PermissionModal
        isOpen={isPermissionModalOpen}
        onClose={() => setIsPermissionModalOpen(false)}
        user={user}
      />
      <LofiConfirmModal
        isOpen={isLofiConfirmOpen}
        onClose={() => setIsLofiConfirmOpen(false)}
        onConfirm={() => handlePlayerAction('toggleLofiMode', 'confirmed')}
        queueCount={player?.queue?.length || 0}
      />
      <Toast toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}
