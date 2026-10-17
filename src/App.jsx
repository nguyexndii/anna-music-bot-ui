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
import BrandLogo from './components/BrandLogo';
import FastTooltip from './components/FastTooltip';
import NotFoundScreen from './components/NotFoundScreen';
import FavoritesTab from './components/FavoritesTab';
import {
  Search,
  ListMusic,
  Mic2,
  Settings,
  History,
  AlertCircle,
  Disc3,
  Disc,
  Play,
  Pause,
  SkipForward,
  Loader2,
  Share2,
  LogOut,
  Radio,
  Volume2,
  Heart,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Compass,
  Clock,
  SlidersHorizontal,
  CheckCircle2,
  Database,
  Headphones,
  User as UserIcon,
  X
} from 'lucide-react';
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

// ─── Tab Definitions (Tactile Navigation) ────────────────────────────────────
const TABS = [
  { id: 'player',    label: 'Đang Phát', icon: Disc,          mobileOnly: true },
  { id: 'search',    label: 'Khám Phá',  icon: Compass,       mobileOnly: false },
  { id: 'favorites', label: 'Yêu Thích', icon: Heart,         mobileOnly: false },
  { id: 'queue',     label: 'Hàng Chờ',  icon: ListMusic,     mobileOnly: false },
  { id: 'lyrics',    label: 'Lời Nhạc',  icon: Mic2,          mobileOnly: false },
  { id: 'history',   label: 'Lịch Sử',   icon: Clock,         mobileOnly: false },
  { id: 'settings',  label: 'Cài Đặt',   icon: Settings,      mobileOnly: false },
];

// ─── PIN 6-digit Split Input Component ────────────────────────────────────────
function PinCodeInput({ length = 6, value = '', onChange, onComplete, disabled = false, autoFocus = true }) {
  const inputRefs = useRef([]);
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  const handleChange = (e, index) => {
    const rawVal = e.target.value;
    const char = rawVal.replace(/[^0-9]/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = char;
    const newValue = newDigits.join('');
    onChange(newValue);

    if (char && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        onChange(newDigits.join(''));
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        onChange(newDigits.join(''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text');
    let extracted = pasteData.replace(/[^0-9]/g, '').slice(0, length);
    if (pasteData.includes('token=')) {
      const m = pasteData.match(/token=([0-9]{6})/);
      if (m) extracted = m[1];
    }
    if (extracted) {
      onChange(extracted);
      const focusIndex = Math.min(extracted.length, length - 1);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  return (
    <div className="grid grid-cols-6 gap-2 sm:gap-2.5" onPaste={handlePaste}>
      {Array.from({ length }, (_, i) => (
        <div key={i} className="relative">
          <input
            ref={(el) => (inputRefs.current[i] = el)}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            autoFocus={autoFocus && i === 0}
            disabled={disabled}
            value={digits[i] || ''}
            onChange={(e) => handleChange(e, i)}
            onKeyDown={(e) => {
              handleKeyDown(e, i);
              if (e.key === 'Enter') {
                const curVal = digits.join('');
                if (curVal.length === length && onComplete) {
                  onComplete(curVal);
                }
              }
            }}
            aria-label={`Số thứ ${i + 1}`}
            className="w-full h-12 sm:h-13 py-2 bg-surface-container-lowest text-center font-mono text-xl sm:text-2xl text-on-surface font-semibold rounded-xl shadow-inner border border-outline-variant/30 focus:border-primary-container focus:outline-none focus:bg-surface-container-high transition-all"
          />
          <div
            className={`absolute bottom-1 left-2 right-2 h-0.5 rounded-full transition-all ${
              digits[i] ? 'bg-primary-container' : 'bg-transparent'
            }`}
          />
        </div>
      ))}
    </div>
  );
}

// ─── PIN / Auth screen (Chuẩn Google Stitch Tối Giản) ───────────────────────
function AuthScreen({ onVerify, authError, isVerifying }) {
  const [pin, setPin] = useState('');
  const [localError, setLocalError] = useState('');
  const error = localError || authError;

  const handleComplete = (completedPin) => {
    if (isVerifying || completedPin.length !== 6) return;
    setLocalError('');
    localStorage.removeItem('anna_web_token');
    onVerify(completedPin, true);
  };

  const submit = (e) => {
    e?.preventDefault();
    setLocalError('');
    let val = pin.trim();
    if (!val || val.length < 6) {
      setLocalError('Vui lòng nhập đủ 6 chữ số mã PIN.');
      return;
    }
    localStorage.removeItem('anna_web_token');
    onVerify(val, true);
  };

  return (
    <div className="bg-surface font-body text-on-surface antialiased h-screen h-[100dvh] overflow-hidden flex items-center justify-center p-4 md:p-6 select-none relative z-10">
      {/* Main Auth Container Căn Giữa Hoàn Hảo */}
      <div className="w-full max-w-md bg-surface-container-low border border-border/80 rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col items-center relative z-10">

        {/* Logo Anna Mới */}
        <div className="flex flex-col items-center mb-5">
          <BrandLogo size="lg" showSubtext={true} />

          {/* Sóng nhạc 5 bars động uốn cong theo viền */}
          <div className="flex items-center justify-center gap-1.5 h-6 px-3 bg-surface-container rounded-full border border-white/10 mt-4 shadow-inner">
            <span className="w-1 bg-primary-container rounded-full animate-equalizer-1" />
            <span className="w-1 bg-primary-container rounded-full animate-equalizer-2" />
            <span className="w-1 bg-secondary rounded-full animate-equalizer-3" />
            <span className="w-1 bg-primary-container rounded-full animate-equalizer-4" />
            <span className="w-1 bg-primary-container rounded-full animate-equalizer-5" />
          </div>
        </div>

        {/* Tiêu đề & Hướng dẫn */}
        <div className="text-center mb-5">
          <h1 className="text-xl font-bold text-on-surface tracking-tight">
            Nhập mã PIN kết nối
          </h1>
          <p className="text-xs text-on-surface-variant mt-1">
            Dùng lệnh{' '}
            <code className="px-1.5 py-0.5 bg-surface-container-highest rounded text-primary-container font-mono text-[11px] font-bold border border-white/5">
              /web
            </code>{' '}
            trong Discord để nhận mã PIN 6 số.
          </p>
        </div>

        {/* Form nhập PIN 6 số */}
        <form className="w-full space-y-4" onSubmit={submit}>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] text-outline uppercase tracking-wider font-bold">
                MÃ PIN 6 CHỮ SỐ
              </label>
              {pin && (
                <button
                  type="button"
                  onClick={() => setPin('')}
                  className="font-mono text-[11px] text-outline hover:text-on-surface transition-colors"
                >
                  Xóa tất cả
                </button>
              )}
            </div>

            <PinCodeInput
              length={6}
              value={pin}
              onChange={(val) => {
                setPin(val);
                setLocalError('');
              }}
              onComplete={handleComplete}
              disabled={isVerifying}
              autoFocus={true}
            />
          </div>

          {error && (
            <p className="text-xs text-error flex items-center gap-1.5 bg-error-container/20 p-2.5 rounded-xl border border-error/30 animate-fade-in">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </p>
          )}

          <button
            type="submit"
            disabled={isVerifying || pin.length < 6}
            className="w-full h-11 bg-primary-container hover:bg-primary active:scale-[0.99] text-on-primary font-sans text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isVerifying ? (
              <>
                <Loader2 size={16} className="animate-spin text-on-primary" />
                <span>Đang kết nối...</span>
              </>
            ) : (
              <>
                <span>Kết Nối</span>
                <ArrowRight size={16} className="shrink-0 text-on-primary" />
              </>
            )}
          </button>
        </form>

        {/* Thông báo phiên an toàn */}
        <div className="mt-4 p-2.5 bg-surface-container rounded-xl flex items-center gap-2 border border-white/5 w-full text-left">
          <ShieldCheck size={16} className="text-primary-container shrink-0" />
          <span className="text-[11px] text-outline leading-tight">
            Mã PIN có hiệu lực trong phiên này. Đóng tab sẽ tự động ngắt kết nối an toàn.
          </span>
        </div>

      </div>

      <footer className="absolute bottom-4 font-mono text-[10px] text-outline/50 uppercase tracking-widest">
        ANNA MUSIC • WEB PLAYER
      </footer>
    </div>
  );
}

// ─── No Voice Screen (Stitch Clean Minimal) ──────────────────────────────────
function NoVoiceScreen({ user, onRefresh, isRefreshing, onLogout }) {
  return (
    <div className="bg-surface font-body text-on-surface antialiased h-screen h-[100dvh] overflow-hidden flex flex-col justify-between p-4 md:p-6 items-center select-none relative z-10">
      <header className="w-full max-w-md flex items-center justify-center shrink-0">
        <BrandLogo size="md" showSubtext={false} />
      </header>

      <main className="w-full max-w-md my-auto bg-surface-container-low border border-outline-variant/30 rounded-2xl p-6 shadow-2xl flex flex-col gap-4 text-center">
        <div>
          <span className="px-2.5 py-0.5 rounded bg-primary-container/15 text-primary-container font-mono text-[10px] font-bold uppercase tracking-wider">
            PHIÊN KẾT NỐI
          </span>
          <h1 className="text-xl font-bold text-on-surface mt-2">Chưa ở trong kênh Voice</h1>
          <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed">
            Để sử dụng web player, bạn cần tham gia một kênh thoại (Voice Channel) trên Discord trước. Bot và bạn phải ở cùng kênh.
          </p>
        </div>

        {user?.guildName && (
          <div className="p-2.5 rounded-lg bg-surface-container border border-white/5 font-mono text-xs text-primary-container flex items-center justify-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
            <span>MÁY CHỦ: {user.guildName.toUpperCase()}</span>
          </div>
        )}

        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="w-full h-10 bg-primary-container hover:bg-primary active:scale-[0.99] text-on-primary font-semibold text-xs rounded-lg flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50"
          >
            {isRefreshing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Đang kiểm tra...</span>
              </>
            ) : (
              <>
                <RefreshCw size={15} className="shrink-0" />
                <span>Thử Lại</span>
              </>
            )}
          </button>
          <button
            onClick={onLogout}
            className="w-full h-9 bg-surface-container hover:bg-surface-container-high text-outline hover:text-on-surface text-xs rounded-lg transition-colors"
          >
            Đăng xuất
          </button>
        </div>
        <p className="text-[11px] text-outline">Sau khi vào kênh Voice, nhấn Thử Lại để đồng bộ.</p>
      </main>

      <footer className="text-xs text-outline font-mono">ANNA MUSIC • VOICE GATEWAY</footer>
    </div>
  );
}

// ─── Main App Console ────────────────────────────────────────────────────────
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
  const [searchQuery, setSearchQuery] = useState('');
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [isLofiConfirmOpen, setIsLofiConfirmOpen]         = useState(false);
  const [authError, setAuthError]                         = useState(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isVerifying, setIsVerifying]     = useState(true);
  const [isRefreshingVoice, setIsRefreshingVoice] = useState(false);
  const [toasts, setToasts]               = useState([]);
  const [lyricsSourceInfo, setLyricsSourceInfo] = useState(null);
  const [isNotFound, setIsNotFound] = useState(() => {
    if (typeof window === 'undefined') return false;
    const p = window.location.pathname;
    return p !== '/' && p !== '' && p !== '/index.html';
  });

  useEffect(() => {
    const checkPath = () => {
      const p = window.location.pathname;
      setIsNotFound(p !== '/' && p !== '' && p !== '/index.html');
    };
    window.addEventListener('popstate', checkPath);
    return () => window.removeEventListener('popstate', checkPath);
  }, []);

  const handleGoHome = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/');
      setIsNotFound(false);
      setActiveTab('search');
    }
  }, []);

  const [pendingAction, setPendingAction] = useState(null);
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

  // Splash loading screen
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Toast stack manager
  const showToast = useCallback((message, type = 'success') => {
    if (!message) return;
    setToasts(prev => {
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

  // 1. Verify token/PIN
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
        const delay = Math.max(0, 600 - elapsed);
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

  // 4. Poll state
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
    fetchState(true);

    let iv = null;
    const startPolling = (intervalMs) => {
      if (iv) clearInterval(iv);
      iv = setInterval(() => {
        fetchState(false);
      }, intervalMs);
    };

    startPolling(2500);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        startPolling(12000);
      } else {
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
        body: JSON.stringify({ track }),
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

  // 6. Player actions
  const handlePlayerAction = async (action, value = null) => {
    const cg = guildId || user?.guildId;
    const ct = token || localStorage.getItem('anna_web_token');
    if (!cg || !ct) return;

    if (action === 'notifyEmptyRoom') {
      showToast('Phòng Voice hiện đang trống, bot duy trì phát Lofi 24/7 ☕', 'info');
      return;
    }
    if (action === 'notifyAlreadyLofi') {
      showToast('Bot hiện đang phát nhạc nền Lofi thư giãn rồi nhé ☕', 'info');
      return;
    }

    const isLofiCurrent = Boolean(player?.current && (player?.current?.is247 || player?.current?.requestedBy === 'Auto (24/7)'));
    if (action === 'toggleLofiMode' && !isLofiCurrent && value !== 'confirmed') {
      setIsLofiConfirmOpen(true);
      return;
    }

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
      window.dispatchEvent(new CustomEvent('anna_switch_lofi'));
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
        body: JSON.stringify({ action, value }),
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

  const switchTab = (id) => {
    if (id === activeTab) return;
    setActiveTab(id);
  };

  // ── Renders ─────────────────────────────────────────────────────────────────
  if (isNotFound) {
    return <NotFoundScreen onGoHome={handleGoHome} />;
  }

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

  return (
    <div className="h-screen h-[100dvh] w-screen overflow-hidden flex flex-col bg-surface text-on-surface relative select-none font-body">
      {/* ── 1. TOP HEADER (Fixed 56px, Thanh Search Căn Giữa Hoàn Hảo) ── */}
      <header className="h-[56px] flex-shrink-0 bg-surface-container-lowest border-b border-white/5 px-4 flex items-center justify-between z-30 select-none">
        {/* Left: Brand Logo + Chip Voice Room (Cột trái w-64 cố định) */}
        <div className="flex items-center gap-2.5 w-64 shrink-0">
          <BrandLogo
            size="sm"
            onClick={() => switchTab('search')}
            showSubtext={true}
          />

          {/* Quick Room Chip Voice Status (Sạch sẽ, bỏ 48kHz Opus, chống lặp icon) */}
          <div className="hidden xl:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-container border border-white/5 text-xs shrink-0">
            <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse shrink-0"></span>
            <span className="font-mono text-[11px] text-tertiary font-semibold truncate max-w-[110px]" title={player?.voiceChannel?.name || guild?.name || 'Phòng Voice'}>
              {(() => {
                const raw = player?.voiceChannel?.name || guild?.name || 'Phòng Voice';
                return `🔊︱${raw.replace(/^🔊︱/, '').replace(/^🔊/, '').trim()}`;
              })()}
            </span>
          </div>
        </div>

        {/* Center: Search Input Bar (CĂN GIỮA HOÀN HẢO MÀN HÌNH) */}
        <div className="flex-1 max-w-xl mx-auto flex justify-center px-2">
          <div className="w-full flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-xl border border-white/5 focus-within:border-primary-container/50 transition-colors shadow-sm">
            <Search size={16} strokeWidth={1.75} className="text-outline shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                const val = e.target.value;
                setSearchQuery(val);
                if (activeTab !== 'search') setActiveTab('search');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const trimmed = (searchQuery || '').trim();
                  if (!trimmed) return;
                  if (
                    trimmed.startsWith('http://') ||
                    trimmed.startsWith('https://') ||
                    trimmed.includes('youtube.com/') ||
                    trimmed.includes('youtu.be/') ||
                    trimmed.includes('spotify.com/') ||
                    trimmed.includes('soundcloud.com/')
                  ) {
                    handleOrderSong({ url: trimmed });
                    setSearchQuery('');
                    return;
                  }
                  if (activeTab !== 'search') setActiveTab('search');
                }
              }}
              placeholder="Dán liên kết YouTube / Spotify hoặc gõ tên bài..."
              className="bg-transparent border-none text-xs text-on-surface placeholder:text-outline w-full focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-outline hover:text-on-surface p-0.5"
                title="Xóa tìm kiếm"
              >
                <X size={14} strokeWidth={1.75} />
              </button>
            )}
            {/* Nút bật/tắt Tìm kiếm Nâng Cao */}
            <button
              type="button"
              onClick={() => {
                const currentMode = localStorage.getItem('anna_search_mode') || 'official';
                const nextMode = currentMode === 'official' ? 'all' : 'official';
                localStorage.setItem('anna_search_mode', nextMode);
                window.dispatchEvent(new CustomEvent('anna_search_mode_change', { detail: nextMode }));
                setSearchQuery(q => q); // trigger rerender
              }}
              className="px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wider flex items-center gap-1 shrink-0 transition-all bg-primary-container/20 text-primary-container hover:bg-primary-container/30 border border-primary-container/30"
              title="Chuyển đổi giữa chế độ Chính thức (Official) và Mở rộng (Tất cả nguồn)"
            >
              <SlidersHorizontal size={13} strokeWidth={1.75} />
              <span className="hidden sm:inline">
                {(localStorage.getItem('anna_search_mode') || 'official') === 'all' ? 'NÂNG CAO' : 'CHÍNH CHỦ'}
              </span>
            </button>
            <kbd className="hidden sm:inline-block font-mono text-[9px] text-outline bg-surface-container-high px-1 py-0.5 rounded border border-white/5">
              ↵
            </kbd>
          </div>
        </div>

        {/* Right Header Utilities: Online Counter (Cột phải w-64 cố định) */}
        <div className="w-64 flex items-center justify-end gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container border border-white/5">
            <div className="flex -space-x-2 items-center">
              {(() => {
                const myId = String(user?.userId || user?.id || '');
                const myUser = user ? [{ ...user, isMe: true, userId: myId }] : [];
                const otherOnline = (activeWebUsers || []).filter(u => String(u.userId || u.id) !== myId);
                const allOnline = [...myUser, ...otherOnline];
                const visible = allOnline.slice(0, 3);
                return visible.map((u, i) => (
                  <img
                    key={u.userId || u.id || i}
                    src={u.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                    alt=""
                    className="w-5 h-5 rounded-full object-cover ring-1 ring-surface shrink-0"
                    title={u.displayName || u.username}
                  />
                ));
              })()}
            </div>
            <span className="font-mono text-[10px] text-primary-container font-semibold">
              {Math.max(1, (activeWebUsers?.length || 0) + 1)} ONLINE
            </span>
          </div>
        </div>
      </header>

      {/* ── 2. MAIN 3-COLUMN ZERO-SCROLL WORKSPACE ─────────────────────────── */}
      <div className="flex-1 flex overflow-hidden w-full min-h-0 relative z-10">

        {/* ── CỘT 1: LEFT SIDEBAR (Desktop 200px) ───────────────────────────── */}
        <aside className="hidden lg:flex w-[200px] shrink-0 bg-surface-container-low/95 backdrop-blur-xl border-r border-white/5 flex-col justify-between p-3 select-none z-20">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[10px] tracking-widest text-outline px-2.5 py-1 uppercase font-semibold">
              MENU CHÍNH
            </span>

            {/* Navigation Tabs (Tactile Hi-Fi Console) */}
            <nav className="flex flex-col gap-1 text-xs font-medium" aria-label="Điều hướng chính">
              {TABS.filter(t => !t.mobileOnly).map(({ id, label, icon: TabIcon }) => {
                const isActive = effectiveContentTab === id;
                const queueCount = id === 'queue' ? (player?.queue?.length || 0) : 0;
                const favCount = id === 'favorites' ? (player?.favorites?.length || 0) : 0;
                const badgeCount = queueCount || favCount;

                return (
                  <button
                    key={id}
                    onClick={() => switchTab(id)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-left text-[13px] border-0 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
                      isActive
                        ? 'bg-surface-container text-primary-container font-semibold shadow-sm'
                        : 'text-on-surface-variant hover:bg-surface-container/60 hover:text-on-surface'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <TabIcon size={17} strokeWidth={1.75} className={isActive ? 'text-primary-container' : 'text-outline'} />
                      <span>{label}</span>
                    </div>
                    {badgeCount > 0 && (
                      <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-surface-container-high text-primary-container font-bold">
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* User Profile & Actions Box (Bỏ nút Chia sẻ theo yêu cầu) */}
          <div className="p-2.5 bg-surface-container-lowest rounded-xl border border-white/5 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <img
                src={user.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                alt=""
                className="w-7 h-7 rounded-full object-cover border border-primary-container/40 shrink-0"
              />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-semibold text-on-surface truncate">
                  {user.displayName || user.username}
                </span>
                <div className="flex items-center gap-1">
                  {user.isAdmin ? (
                    <ShieldCheck size={12} strokeWidth={1.75} className="text-tertiary" />
                  ) : (
                    <UserIcon size={12} strokeWidth={1.75} className="text-tertiary" />
                  )}
                  <span className="text-[9px] text-tertiary uppercase font-mono tracking-wider">
                    {user.isAdmin ? 'Quản Trị' : 'Thành Viên'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-surface-container hover:bg-secondary-container hover:text-white text-[11px] text-on-surface-variant transition-colors"
              title="Rời phiên nghe nhạc"
            >
              <LogOut size={13} strokeWidth={1.75} />
              <span>Rời phòng</span>
            </button>
          </div>
        </aside>

        {/* ── CỘT 2: MAIN CENTER CONSOLE (Không còn header con và nút logo thừa) ── */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-surface/70 backdrop-blur-md overflow-hidden relative">

          {/* Sub-bar hiển thị nguồn lời bài hát nếu đang ở tab Lời Nhạc */}
          {effectiveContentTab === 'lyrics' && lyricsSourceInfo && (
            <div className="px-4 py-1.5 flex items-center justify-between bg-surface-container-lowest/60 border-b border-white/5 text-xs shrink-0 z-20">
              <div className="flex items-center gap-2">
                <span className="font-bold text-on-surface">Lời Nhạc Đồng Bộ</span>
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
              </div>
              <div
                className="flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] border"
                style={{
                  color: lyricsSourceInfo.color || 'var(--muted)',
                  background: lyricsSourceInfo.bg || 'transparent',
                  borderColor: lyricsSourceInfo.border || 'transparent'
                }}
                title={lyricsSourceInfo.title || undefined}
              >
                <Database size={12} strokeWidth={1.75} />
                <span>{lyricsSourceInfo.text}</span>
              </div>
            </div>
          )}

          {/* Vùng Nội Dung Tab (Đảm bảo min-h-0 và không bị cắt màn hình) */}
          <main className="flex-1 min-h-0 p-3 sm:p-4 overflow-hidden flex flex-col pb-[110px] lg:pb-3">
            {/* Trên Mobile: nếu activeTab === 'player', hiển thị mâm đĩa than trung tâm */}
            {activeTab === 'player' ? (
              <div className="lg:hidden flex-1 min-h-0 overflow-y-auto custom-scroll flex flex-col">
                <HeroPlayer
                  player={player}
                  onAction={handlePlayerAction}
                  user={user}
                  onRequireAdmin={() => setIsPermissionModalOpen(true)}
                  pendingAction={pendingAction}
                  isMobileCenter={true}
                />
              </div>
            ) : null}

            {/* Tab Khám Phá */}
            <div className={`flex-1 min-h-0 ${effectiveContentTab === 'search' ? 'flex flex-col' : 'hidden'}`}>
              <LiveSearch
                onOrderSong={handleOrderSong}
                player={player}
                guildId={guildId}
                token={token}
                externalQuery={searchQuery}
                onQueryChange={setSearchQuery}
              />
            </div>

            {/* Tab Bài Hát Yêu Thích */}
            <div className={`flex-1 min-h-0 ${effectiveContentTab === 'favorites' ? 'flex flex-col' : 'hidden'}`}>
              <FavoritesTab
                favorites={player?.favorites || []}
                onOrderSong={handleOrderSong}
                onAction={handlePlayerAction}
              />
            </div>

            {/* Tab Hàng Chờ */}
            <div className={`flex-1 min-h-0 ${effectiveContentTab === 'queue' ? 'flex flex-col' : 'hidden'}`}>
              <QueueManager queue={player?.queue} onAction={handlePlayerAction} pendingAction={pendingAction} player={player} />
            </div>

            {/* Tab Lời Nhạc */}
            <div className={`flex-1 min-h-0 ${effectiveContentTab === 'lyrics' ? 'flex flex-col' : 'hidden'}`}>
              <SyncedLyrics
                player={player}
                onAction={handlePlayerAction}
                isActive={effectiveContentTab === 'lyrics'}
                guildId={guildId}
                token={token}
                onSourceChange={setLyricsSourceInfo}
              />
            </div>

            {/* Tab Lịch Sử */}
            <div className={`flex-1 min-h-0 ${effectiveContentTab === 'history' ? 'flex flex-col' : 'hidden'}`}>
              <HistoryTab player={player} onOrderSong={handleOrderSong} />
            </div>

            {/* Tab Cài Đặt */}
            <div className={`flex-1 min-h-0 overflow-y-auto custom-scroll ${effectiveContentTab === 'settings' ? 'flex flex-col' : 'hidden'}`}>
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
          </main>
        </div>

        {/* ── CỘT 3: RIGHT PANEL "ĐANG PHÁT" (Desktop 350px cố định 100vh) ───── */}
        <aside className="hidden lg:flex w-[350px] xl:w-[370px] shrink-0 bg-surface-container-low/95 backdrop-blur-xl border-l border-white/5 p-3.5 flex-col justify-between overflow-y-auto custom-scroll select-none z-20">
          {/* Header Panel */}
          <div className="flex items-center justify-between pb-1 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary-container"></span>
              <span className="font-mono text-[10px] font-bold text-primary tracking-widest uppercase">
                ĐANG PHÁT
              </span>
            </div>
          </div>

          {/* Turntable & Controls Deck */}
          <HeroPlayer
            player={player}
            onAction={handlePlayerAction}
            user={user}
            onRequireAdmin={() => setIsPermissionModalOpen(true)}
            pendingAction={pendingAction}
          />
        </aside>
      </div>

      {/* ── MOBILE CONTROLS & BOTTOM NAVIGATION ─────────────────────────────── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 select-none pb-safe">
        {/* Mobile Mini Player Bar (khi đang ở tab khác 'player' và có bài đang phát) */}
        {player?.current && activeTab !== 'player' && (
          <div
            onClick={() => switchTab('player')}
            className="mx-2 mb-1.5 bg-surface-container-low/95 backdrop-blur-xl border border-white/10 rounded-xl p-2 flex items-center justify-between shadow-2xl cursor-pointer"
            title="Nhấn để mở màn hình đang phát đĩa than"
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface-container shrink-0 border border-white/5 relative">
                <img
                  src={getTrackThumb(player.current)}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/default-playlist.jpg'; }}
                />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-semibold text-on-surface truncate">
                  {player.current.title}
                </span>
                <span className="text-[11px] text-primary-container truncate font-mono">
                  {player.current.artist || 'Anna Music'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => handlePlayerAction(player.isPlaying ? 'pause' : 'resume')}
                disabled={Boolean(pendingAction)}
                className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center shadow"
                aria-label={player.isPlaying ? 'Tạm dừng' : 'Phát'}
              >
                {pendingAction === 'playback' ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : player.isPlaying ? (
                  <Pause size={16} />
                ) : (
                  <Play size={16} fill="currentColor" className="ml-0.5" />
                )}
              </button>
              <button
                onClick={() => handlePlayerAction('skip')}
                disabled={Boolean(pendingAction)}
                className="w-8 h-8 rounded-full bg-surface-container text-outline hover:text-on-surface flex items-center justify-center"
                aria-label="Chuyển bài"
              >
                {pendingAction === 'skip' ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <SkipForward size={16} />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Bottom Tab Bar (Mobile Tabs) */}
        <nav className="h-14 bg-surface-container-lowest/95 backdrop-blur-2xl border-t border-white/10 px-2 flex items-center justify-around text-[10px]">
          {TABS.map(({ id, label, icon: TabIcon }) => {
            const isActive = activeTab === id;
            const queueCount = id === 'queue' ? (player?.queue?.length || 0) : 0;
            return (
              <button
                key={id}
                onClick={() => switchTab(id)}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-lg transition-colors relative ${
                  isActive ? 'text-primary-container font-bold' : 'text-outline hover:text-on-surface'
                }`}
              >
                <TabIcon size={19} strokeWidth={1.75} className={isActive ? 'text-primary-container' : 'text-outline'} />
                <span className="tracking-tight text-[10px]">{label}</span>
                {queueCount > 0 && (
                  <span className="absolute top-0.5 right-2 font-mono text-[8px] px-1 rounded-full bg-primary-container text-on-primary font-bold">
                    {queueCount > 99 ? '99+' : queueCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Modals & Toasts ─────────────────────────────────────────────────── */}
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
      <FastTooltip />
    </div>
  );
}
