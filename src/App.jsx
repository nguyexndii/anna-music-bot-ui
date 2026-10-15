import React, { useState, useEffect, useCallback, useRef } from 'react';

import HeroPlayer from './components/HeroPlayer';

import BottomMiniPlayer from './components/BottomMiniPlayer';

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

import NotFoundScreen from './components/NotFoundScreen';

import NoVoiceSession from './components/NoVoiceSession';

import {

  Search,

  ListMusic,

  Mic2,

  Settings,

  History,

  AlertCircle,

  Disc3,

  LogOut,

  Share2,

  Check,

  Radio,

  Sparkles,

  Headphones

} from 'lucide-react';

import { API_BASE } from './config';



// ─── Navigation Items ────────────────────────────────────────────────────────

const TABS = [

  { id: 'search',   label: 'Khám Phá',   sub: 'Tìm kiếm & Gợi ý', Icon: Search    },

  { id: 'queue',    label: 'Hàng Chờ',   sub: 'Bàn DJ & Danh sách', Icon: ListMusic },

  { id: 'lyrics',   label: 'Lời Nhạc',   sub: 'Karaoke Đồng Bộ',   Icon: Mic2      },

  { id: 'history',  label: 'Lịch Sử',    sub: 'Bài hát đã phát',   Icon: History   },

  { id: 'settings', label: 'Cài Đặt',    sub: 'Cá nhân & Máy chủ', Icon: Settings  },

];



// ─── PIN 6-digit Split Input Component ───────────────────────────────────────

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

    if (newValue.length === length && onComplete) {

      onComplete(newValue);

    }

  };



  const handleKeyDown = (e, index) => {

    if (e.key === 'Backspace') {

      if (!digits[index] && index > 0) {

        inputRefs.current[index - 1]?.focus();

        const newDigits = [...digits];

        newDigits[index - 1] = '';

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

      if (extracted.length === length && onComplete) {

        onComplete(extracted);

      }

    }

  };



  return (

    <div className="flex gap-2 sm:gap-3 justify-between mt-3" onPaste={handlePaste}>

      {Array.from({ length }, (_, i) => (

        <input

          key={i}

          ref={(el) => (inputRefs.current[i] = el)}

          type="text"

          inputMode="numeric"

          pattern="[0-9]*"

          maxLength={1}

          autoFocus={autoFocus && i === 0}

          disabled={disabled}

          value={digits[i] || ''}

          onChange={(e) => handleChange(e, i)}

          onKeyDown={(e) => handleKeyDown(e, i)}

          className={`w-11 sm:w-12 h-14 rounded-2xl bg-[#0B0F19] border text-center font-mono text-xl font-bold outline-none transition-all ${

            digits[i]

              ? 'border-cyan-400 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.2)]'

              : 'border-white/10 text-white focus:border-cyan-400 focus:-translate-y-0.5'

          }`}

          aria-label={`Mã PIN số ${i + 1}`}

        />

      ))}

    </div>

  );

}



// ─── New Cyber-Glass Auth Screen ─────────────────────────────────────────────

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

    const val = pin.trim();

    if (!val || val.length < 6) {

      setLocalError('Vui lòng nhập đủ 6 chữ số mã PIN.');

      return;

    }

    localStorage.removeItem('anna_web_token');

    onVerify(val, true);

  };



  return (

    <main className="min-h-screen w-full bg-[#06080F] flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden select-none">

      {/* Aurora Ambient Glows */}

      <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/15 rounded-full blur-[120px] pointer-events-none" />



      <div className="relative z-10 w-full max-w-md rounded-3xl bg-[#0D1322]/90 backdrop-blur-2xl border border-white/10 p-7 sm:p-9 shadow-[0_24px_80px_rgba(0,0,0,0.85)]">

        <div className="flex flex-col items-center text-center mb-7">

          <div className="relative mb-4">

            <img

              src="/logo.gif"

              alt="Anna Music"

              className="w-20 h-20 rounded-3xl object-cover border border-cyan-400/40 shadow-[0_0_30px_rgba(6,182,212,0.25)]"

              style={{ imageRendering: 'pixelated' }}

            />

            <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-cyan-400 text-slate-950 font-mono text-[9px] font-extrabold">

              24/7

            </span>

          </div>



          <h1 className="text-2xl font-extrabold tracking-tight text-white">

            ANNA <span className="text-cyan-400">PULSE</span>

          </h1>

          <p className="font-mono text-[10px] tracking-[0.2em] text-slate-400 uppercase mt-1">

            DISCORD WEB CONSOLE

          </p>

        </div>



        <form onSubmit={submit}>

          <div className="text-center mb-5">

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">

              Gõ lệnh <code className="px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono font-bold">/web</code> trong kênh Discord để lấy mã PIN 6 số.

            </p>

          </div>



          <div className="my-5">

            <label className="block font-mono text-[10px] uppercase tracking-widest text-slate-400 text-center">

              NHẬP MÃ PIN KẾT NỐI

            </label>

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

            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">

              <AlertCircle className="flex-shrink-0 text-rose-400" size={15}/>

              <span>{error}</span>

            </div>

          )}



          <button

            type="submit"

            disabled={isVerifying || pin.length < 6}

            className="w-full h-12 rounded-2xl bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-cyan-500/20 transition disabled:opacity-40 disabled:cursor-not-allowed"

          >

            {isVerifying ? 'Đang xác thực kết nối...' : 'Mở Bảng Điều Khiển'}

          </button>



          <p className="text-[11px] text-slate-500 text-center mt-4">

            Mã PIN dùng 1 lần và tự động đồng bộ với phòng thoại Discord của bạn.

          </p>

        </form>

      </div>

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



  const [user, setUser]                     = useState(null);

  const [guild, setGuild]                   = useState(null);

  const [player, setPlayer]                 = useState(null);

  const [activeWebUsers, setActiveWebUsers] = useState([]);

  const [activeTab, setActiveTab]           = useState('search');

  const [copiedLink, setCopiedLink]         = useState(false);



  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);

  const [isLofiConfirmOpen, setIsLofiConfirmOpen]         = useState(false);

  const [authError, setAuthError]                         = useState(null);

  const [isInitialLoading, setIsInitialLoading]           = useState(true);

  const [isVerifying, setIsVerifying]                     = useState(true);

  const [isRefreshingVoice, setIsRefreshingVoice]         = useState(false);

  const [toasts, setToasts]                               = useState([]);

  const [lyricsSourceInfo, setLyricsSourceInfo]           = useState(null);

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

    }

  }, []);



  const [pendingAction, setPendingAction] = useState(null);

  const pendingTimerRef = useRef(null);

  const lastTrackUrlRef = useRef(player?.current?.url);



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



  useEffect(() => {

    const timer = setTimeout(() => {

      setIsInitialLoading(false);

    }, 1500);

    return () => clearTimeout(timer);

  }, []);



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



  const handleCopySessionLink = () => {

    const tok = localStorage.getItem('anna_web_token');

    const gld = localStorage.getItem('anna_guild_id');

    const link = tok && gld ? `${window.location.origin}/?token=${tok}&guild=${gld}` : window.location.href;

    navigator.clipboard.writeText(link).then(() => {

      setCopiedLink(true);

      showToast('Đã sao chép liên kết phiên Web!');

      setTimeout(() => setCopiedLink(false), 2500);

    });

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

        setTimeout(() => setIsVerifying(false), 400);

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

      iv = setInterval(() => fetchState(false), intervalMs);

    };

    startPolling(2500);



    const handleVisibilityChange = () => {

      if (document.hidden) startPolling(12000);

      else {

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

    const isBatch = Array.isArray(track?.tracks) && track.tracks.length > 0;

    const title = track?.title || track?.name || (track?.isPlaylist ? 'Danh sách phát' : 'bài hát');

    try {

      showToast(`Đang thêm "${title}"...`, 'info');

      const payload = isBatch ? { tracks: track.tracks, token: ct } : { track, token: ct };

      const res = await fetch(`${API_BASE}/api/guilds/${cg}/play`, {

        method: 'POST',

        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ct}` },

        body: JSON.stringify(payload),

      });

      if (res.status === 401) { handleAuthExpired(); return; }

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {

        if (isBatch || data.isPlaylist || data.addedCount || track?.isPlaylist) {

          const c = data.addedCount || (track?.tracks ? track.tracks.length : '');

          showToast(`Đã thêm ${c ? `${c} bài hát` : 'Playlist'} vào hàng chờ!`);

        } else {

          showToast(`Đã thêm "${data.track?.title || title}" vào hàng chờ!`);

        }

        if (!isBatch && data.track && (!player?.current || player.current.is247 || player.current.requestedBy === 'Auto (24/7)')) {

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

    } catch {

      showToast('Không thể gửi yêu cầu đến bot!', 'error');

    }

  };



  // 6. Player action

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



    if (action === 'skip') showToast('Đang chuyển bài tiếp theo... ⏭️', 'info');

    else if (action === 'previous') showToast('Đang quay lại bài trước... ⏮️', 'info');

    else if (action === 'seek') {

      const sec = Math.max(0, Math.floor(Number(value) || 0));

      const m = Math.floor(sec / 60);

      const s = sec % 60;

      showToast(`Đang chuyển đến ${m}:${s < 10 ? '0' : ''}${s}... ⏱️`, 'info');

    } else if (action === 'playNow') showToast('Đang phát ngay bài được chọn... ▶️', 'info');

    else if (action === 'toggleLofiMode') {

      if (isLofiCurrent) showToast('Đang chuyển về phát bài hát của bạn... 🎵', 'info');

      else {

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

          artist: 'Anna Pulse',

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



  if (isNotFound) return <NotFoundScreen onGoHome={handleGoHome} />;



  if (isInitialLoading || isVerifying) {

    return (

      <ConnectingStepper text={isVerifying ? (token ? 'ĐANG XÁC THỰC KẾT NỐI...' : 'ĐANG KHỞI TẠO VOICE...') : 'ĐANG KẾT NỐI DISCORD CONSOLE...'} />

    );

  }



  if (!user) {

    return <AuthScreen onVerify={verifyToken} authError={authError} isVerifying={isVerifying} />;

  }



  if (!user.isInVoice || (!user.isSameVoice && user.botVoice)) {

    return (

      <NoVoiceSession user={user} guildName={guild?.name || user?.guildName} isRefreshing={isRefreshingVoice} onRefresh={handleRefreshVoice} onLogout={handleLogout} />

    );

  }



  const voiceChannelName = player?.voiceChannel?.name || user?.botVoice?.name || user?.userVoice?.name || 'Voice Channel';

  const queueCount = player?.queue?.length || 0;



  return (

    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#06080F] text-slate-100 relative select-none">

      {/* Dynamic Aurora Ambient Background */}

      <DynamicAmbientBackground currentTrack={player?.current} isPlaying={player?.isPlaying} />



      {/* ── 1. TOP COMMAND HEADER BAR ─────────────────────────────────── */}

      <header className="relative z-30 h-16 px-4 lg:px-6 bg-[#080B14]/85 backdrop-blur-xl border-b border-white/[0.07] flex items-center justify-between gap-4 flex-shrink-0">

        {/* Left: Brand + Server & Voice Pill */}

        <div className="flex items-center gap-3 min-w-0">

          <button

            type="button"

            onClick={() => setActiveTab('search')}

            className="flex items-center gap-2.5 group focus:outline-none"

          >

            <img

              src="/logo.gif"

              alt="Anna Logo"

              className="w-9 h-9 rounded-xl object-cover border border-cyan-400/40 shadow-md group-hover:scale-105 transition-transform"

              style={{ imageRendering: 'pixelated' }}

            />

            <div className="text-left hidden sm:block">

              <div className="text-sm font-extrabold tracking-tight text-white flex items-center gap-1">

                <span>ANNA</span>

                <span className="text-cyan-400">PULSE</span>

              </div>

              <div className="font-mono text-[9px] tracking-widest text-slate-400 uppercase">

                {guild?.name || user?.guildName || 'DISCORD SERVER'}

              </div>

            </div>

          </button>



          <span className="text-slate-700 hidden md:inline">/</span>



          {/* Active Voice Channel Pill */}

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-xs font-medium text-emerald-300 truncate max-w-[180px] sm:max-w-[260px]">

            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />

            <Headphones className="flex-shrink-0" size={13}/>

            <span className="truncate font-semibold">{voiceChannelName}</span>

          </div>

        </div>



        {/* Right: Online Listeners + Share Link + User Profile + Logout */}

        <div className="flex items-center gap-2.5 flex-shrink-0">

          {/* Online Avatar Stack */}

          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.07]">

            <div className="flex items-center -space-x-2">

              {(() => {

                const myId = String(user?.userId || user?.id || '');

                const myUser = user ? [{ ...user, isMe: true, userId: myId }] : [];

                const otherOnline = (activeWebUsers || []).filter(u => String(u.userId || u.id) !== myId);

                const allOnline = [...myUser, ...otherOnline];

                return allOnline.slice(0, 4).map((u, i) => (

                  <img

                    key={u.userId || i}

                    src={u.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}

                    alt={u.displayName || u.username}

                    title={`${u.displayName || u.username}${u.isMe ? ' (Bạn)' : ''}`}

                    className={`w-6 h-6 rounded-full object-cover ring-2 ${u.isMe ? 'ring-cyan-400 z-10' : 'ring-[#080B14]'}`}

                  />

                ));

              })()}

            </div>

            <span className="font-mono text-[10px] font-bold text-cyan-400">

              {Math.max(1, (activeWebUsers?.length || 0))} ONLINE

            </span>

          </div>



          {/* Share Link Button */}

          <button

            type="button"

            onClick={handleCopySessionLink}

            className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition"

            title="Sao chép liên kết phiên Web"

          >

            {copiedLink ? (

              <>

                <Check className="text-emerald-400" size={14}/>

                <span className="hidden md:inline text-emerald-400">Đã chép</span>

              </>

            ) : (

              <>

                <Share2 className="text-cyan-400" size={14}/>

                <span className="hidden md:inline">Chia sẻ</span>

              </>

            )}

          </button>



          {/* Logout Button */}

          <button

            type="button"

            onClick={handleLogout}

            className="p-2 rounded-xl bg-white/[0.04] hover:bg-rose-500/15 border border-white/[0.08] hover:border-rose-500/30 text-slate-400 hover:text-rose-400 transition"

            title="Đăng xuất phiên Web"

          >

            <LogOut size={15}/>

          </button>

        </div>

      </header>



      {/* ── 2. MIDDLE WORKSPACE (SIDEBAR + MAIN STAGE) ────────────────── */}

      <div className="relative z-10 flex-1 min-h-0 flex overflow-hidden">

        {/* Left Navigation Sidebar (Desktop) */}

        <aside className="hidden lg:flex w-60 flex-col justify-between p-4 border-r border-white/[0.07] bg-[#080B14]/65 backdrop-blur-xl flex-shrink-0">

          <nav className="space-y-1.5">

            <div className="px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">

              ĐIỀU HƯỚNG STUDIO

            </div>

            {TABS.map(({ id, label, sub, Icon }) => {

              const isActive = activeTab === id;

              const badge = id === 'queue' ? queueCount : 0;

              return (

                <button

                  key={id}

                  type="button"

                  onClick={() => setActiveTab(id)}

                  className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-left transition-all ${

                    isActive

                      ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/15 border border-cyan-500/35 text-white shadow-lg'

                      : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] border border-transparent'

                  }`}

                >

                  <div className="flex items-center gap-3 min-w-0">

                    <div className={`p-2 rounded-xl ${isActive ? 'bg-cyan-400 text-slate-950' : 'bg-white/[0.04] text-slate-400'}`}>

                      <Icon size={16}/>

                    </div>

                    <div className="min-w-0">

                      <div className="text-xs font-bold truncate">{label}</div>

                      <div className="text-[10px] text-slate-500 truncate">{sub}</div>

                    </div>

                  </div>

                  {badge > 0 && (

                    <span className="px-2 py-0.5 rounded-full bg-cyan-400 text-slate-950 font-mono text-[10px] font-extrabold">

                      {badge > 99 ? '99+' : badge}

                    </span>

                  )}

                </button>

              );

            })}

          </nav>



          {/* Quick Server Telemetry Card in Sidebar */}

          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.07] space-y-2.5">

            <div className="flex items-center justify-between">

              <span className="font-mono text-[10px] text-slate-400 uppercase">TRẠNG THÁI BOT</span>

              <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-400 font-bold">

                <Radio size={11}/> LIVE

              </span>

            </div>

            <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">

              <div className="p-2 rounded-xl bg-black/40 border border-white/[0.05]">

                <div className="text-slate-500">HÀNG CHỜ</div>

                <div className="text-cyan-300 font-bold mt-0.5">{queueCount} BÀI</div>

              </div>

              <div className="p-2 rounded-xl bg-black/40 border border-white/[0.05]">

                <div className="text-slate-500">CHẾ ĐỘ 24/7</div>

                <div className="text-indigo-300 font-bold mt-0.5">{player?.mode247 ? 'ĐANG BẬT' : 'TẮT'}</div>

              </div>

            </div>

            {lyricsSourceInfo && (

              <div className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 font-mono text-[9.5px] text-cyan-300 truncate text-center">

                {lyricsSourceInfo.text}

              </div>

            )}

          </div>

        </aside>



        {/* Main Content Canvas */}

        <main className="flex-1 min-w-0 h-full overflow-y-auto p-4 sm:p-6 lg:p-7 pb-24 lg:pb-8 flex flex-col">

          {/* TAB 1: KHÁM PHÁ (Kèm Widescreen Now Playing Hero Banner ở trên đầu) */}

          {activeTab === 'search' && (

            <div className="tab-enter flex-1 flex flex-col min-h-0 max-w-6xl w-full mx-auto">

              <HeroPlayer
                player={player}
                onAction={handlePlayerAction}
                user={user}
                onRequireAdmin={() => setIsPermissionModalOpen(true)}
                pendingAction={pendingAction}
                compact={true}
              />

              <LiveSearch token={token} guildId={guildId} player={player} onOrderSong={handleOrderSong} />

            </div>

          )}



          {/* TAB 2: HÀNG CHỜ & BÀN DJ (Split 2 cột: Trái là Studio Deck, Phải là Danh sách Hàng chờ) */}

          {activeTab === 'queue' && (

            <div className="tab-enter flex-1 grid grid-cols-1 xl:grid-cols-12 gap-6 min-h-0 max-w-7xl w-full mx-auto">

              <div className="xl:col-span-5 flex flex-col min-h-0">

                <HeroPlayer
                  player={player}
                  onAction={handlePlayerAction}
                  user={user}
                  onRequireAdmin={() => setIsPermissionModalOpen(true)}
                  pendingAction={pendingAction}
                  compact={false}
                />

              </div>

              <div className="xl:col-span-7 glass-card rounded-3xl p-5 flex flex-col min-h-0">

                <QueueManager player={player} queue={player?.queue} onAction={handlePlayerAction} pendingAction={pendingAction} />

              </div>

            </div>

          )}



          {/* TAB 3: LỜI NHẠC KARAOKE */}

          {activeTab === 'lyrics' && (

            <div className="tab-enter flex-1 grid grid-cols-1 xl:grid-cols-12 gap-6 min-h-0 max-w-7xl w-full mx-auto">

              <div className="hidden xl:flex xl:col-span-5 flex-col min-h-0">

                <HeroPlayer
                  player={player}
                  onAction={handlePlayerAction}
                  user={user}
                  onRequireAdmin={() => setIsPermissionModalOpen(true)}
                  pendingAction={pendingAction}
                  compact={false}
                />

              </div>

              <div className="xl:col-span-7 glass-card rounded-3xl p-5 flex flex-col min-h-0">

                <SyncedLyrics
                  player={player}
                  onAction={handlePlayerAction}
                  user={user}
                  guildId={guildId}
                  isActive={activeTab === 'lyrics'}
                  onSourceChange={setLyricsSourceInfo}
                />

              </div>

            </div>

          )}



          {/* TAB 4: LỊCH SỬ PHÁT NHẠC */}

          {activeTab === 'history' && (

            <div className="tab-enter flex-1 glass-card rounded-3xl p-5 sm:p-6 flex flex-col min-h-0 max-w-5xl w-full mx-auto">

              <HistoryTab player={player} onOrderSong={handleOrderSong} />

            </div>

          )}



          {/* TAB 5: CÀI ĐẶT HỆ THỐNG */}

          {activeTab === 'settings' && (

            <div className="tab-enter flex-1 max-w-5xl w-full mx-auto">

              <SettingsTab
                token={token}
                guildId={guildId}
                guildName={guild?.name}
                player={player}
                user={user}
                onAction={handlePlayerAction}
                onRequireAdmin={() => setIsPermissionModalOpen(true)}
              />

            </div>

          )}

        </main>

      </div>



      {/* ── 3. PERSISTENT BOTTOM TRANSPORT DOCK (LUÔN HIỂN THỊ) ───────── */}

      <BottomMiniPlayer
        player={player}
        onAction={handlePlayerAction}
        pendingAction={pendingAction}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />



      {/* ── 4. MOBILE BOTTOM NAVIGATION BAR (< 1024px) ────────────────── */}

      <nav className="lg:hidden h-14 bg-[#06080F]/95 border-t border-white/[0.07] flex items-center justify-around px-2 z-40 flex-shrink-0">

        {TABS.map(({ id, label, Icon }) => {

          const isActive = activeTab === id;

          const badge = id === 'queue' ? queueCount : 0;

          return (

            <button

              key={id}

              type="button"

              onClick={() => setActiveTab(id)}

              className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-xl transition ${

                isActive ? 'text-cyan-400 font-bold' : 'text-slate-400'

              }`}

            >

              <Icon size={18}/>

              <span className="text-[10px] mt-0.5">{label}</span>

              {badge > 0 && (

                <span className="absolute top-0.5 right-1.5 px-1.5 rounded-full bg-cyan-400 text-slate-950 font-mono text-[8px] font-extrabold">

                  {badge}

                </span>

              )}

            </button>

          );

        })}

      </nav>



      {/* ── Modals & Toasts ───────────────────────────────────────────── */}

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
