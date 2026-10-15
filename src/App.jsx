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
import KaraokeFullscreenModal from './components/KaraokeFullscreenModal';
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
  Headphones,
  Maximize2,
  ExternalLink,
  Volume2
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
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, length);
    if (!pasted) return;
    onChange(pasted);
    const nextIdx = Math.min(pasted.length, length - 1);
    inputRefs.current[nextIdx]?.focus();
    if (pasted.length === length && onComplete) {
      onComplete(pasted);
    }
  };

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-2.5 my-3" onPaste={handlePaste}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (inputRefs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i] || ''}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          disabled={disabled}
          className={`w-10 h-13 sm:w-12 sm:h-14 text-center font-mono text-xl sm:text-2xl font-bold rounded-xl transition-all outline-none border ${
            digits[i]
              ? 'bg-[#1c1e22] text-[#ffe6a9] border-[#e8c977] shadow-[0_0_12px_rgba(232,201,119,0.2)]'
              : 'bg-[#141619] text-[#e2e2e6] border-white/10 hover:border-white/20 focus:border-[#e8c977]'
          } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
        />
      ))}
    </div>
  );
}

// ─── Audiophile Auth Screen (Google Stitch 2-Column Design) ─────────────────
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
    <main className="min-h-screen w-full bg-[#111316] flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden select-none">
      {/* Subtle warm ambient bloom */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#e8c977]/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#ef7864]/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="grid grid-cols-1 lg:grid-cols-12 w-full max-w-4xl shadow-2xl rounded-2xl overflow-hidden bg-[#16181b] border border-white/5 relative z-10">
        
        {/* CỘT TRÁI: Khối thương hiệu Audiophile Lounge */}
        <div className="lg:col-span-5 flex flex-col justify-between p-6 sm:p-8 bg-[#0c0e11] border-b lg:border-b-0 lg:border-r border-white/5 relative overflow-hidden">
          <div className="relative z-10 flex flex-col gap-4">
            {/* Logo Glyph */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#1c1e22] flex items-center justify-center shadow-md border border-white/10">
                  <Disc3 size={24} className="text-[#e8c977]" />
                </div>
                <div className="flex flex-col">
                  <span className="font-mono text-[9px] tracking-widest text-[#7f786c] uppercase">Boutique Soundbot</span>
                  <span className="font-mono text-xs text-[#9bfcc0] flex items-center gap-1.5 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#9bfcc0] inline-block animate-pulse"></span>
                    Lossless 384kbps
                  </span>
                </div>
              </div>
              {/* 5 Equalizer Wave Bars */}
              <div className="flex items-end gap-1 h-6 px-2.5 py-1 bg-[#1c1e22] rounded-lg border border-white/5">
                <span className="w-1 bg-[#e8c977] rounded-full eq-bar-1" />
                <span className="w-1 bg-[#ef7864] rounded-full eq-bar-2" />
                <span className="w-1 bg-[#e8c977] rounded-full eq-bar-3" />
                <span className="w-1 bg-[#9bfcc0] rounded-full eq-bar-4" />
                <span className="w-1 bg-[#e8c977] rounded-full eq-bar-2" />
              </div>
            </div>

            {/* Brand Title */}
            <div className="pt-2">
              <div className="flex items-baseline gap-1">
                <span className="font-brand text-3xl font-bold text-[#e8c977] leading-none">an</span>
                <span className="font-brand text-3xl font-bold text-[#f5a192] leading-none">na</span>
                <span className="font-sans text-xs font-semibold text-[#aba395] ml-2 tracking-widest uppercase">Vinyl Lounge</span>
              </div>
              <p className="text-xs text-[#aba395] mt-2 leading-relaxed font-sans">
                Không gian điều khiển âm nhạc Discord cao cấp, kết hợp cơ cấu đĩa than cơ học và âm thanh phòng thu trung thực.
              </p>
            </div>
          </div>

          {/* Discord Instruction Box */}
          <div className="p-3.5 rounded-xl bg-[#141619] border border-white/5 mt-6">
            <span className="font-mono text-[10px] text-[#7f786c] uppercase tracking-wider block mb-1">Cách lấy mã PIN:</span>
            <p className="text-xs text-[#e2e2e6] leading-relaxed">
              Vào kênh Discord gõ lệnh <code className="px-2 py-0.5 rounded bg-[#e8c977]/15 border border-[#e8c977]/30 text-[#ffe6a9] font-mono font-bold">/web</code> để nhận mã PIN 6 số dùng 1 lần.
            </p>
          </div>
        </div>

        {/* CỘT PHẢI: Khối nhập PIN 6 số */}
        <div className="lg:col-span-7 flex flex-col justify-center p-6 sm:p-10 bg-[#16181b]">
          <form onSubmit={submit} className="w-full max-w-sm mx-auto flex flex-col gap-4">
            <div className="text-center mb-1">
              <h2 className="text-xl font-bold text-[#e2e2e6] font-sans">Xác Thực Phiên Phát Nhạc</h2>
              <p className="font-mono text-xs text-[#aba395] mt-1">Nhập 6 chữ số từ Discord bot</p>
            </div>

            <div>
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
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="flex-shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifying || pin.length < 6}
              className="w-full h-12 rounded-xl bg-[#e8c977] hover:bg-[#ffe6a9] text-[#111316] font-bold text-sm shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <>
                  <Loader2 size={18} className="animate-spin text-[#111316]" />
                  <span>ĐANG XÁC THỰC KẾT NỐI...</span>
                </>
              ) : (
                <span>MỞ BẢNG ĐIỀU KHIỂN</span>
              )}
            </button>

            <p className="text-[11px] text-[#7f786c] text-center mt-2 font-mono">
              Phiên bảo mật mã hóa • Tự động đồng bộ với phòng Voice
            </p>
          </form>
        </div>

      </div>
    </main>
  );
}

// ─── MAIN APP COMPONENT ──────────────────────────────────────────────────────
export default function App() {
  const [token, setToken] = useState(() => {
    const u = new URLSearchParams(window.location.search);
    return u.get('token') || localStorage.getItem('anna_web_token') || null;
  });

  const [guildId, setGuildId] = useState(() => {
    const u = new URLSearchParams(window.location.search);
    return u.get('guild') || localStorage.getItem('anna_web_guild') || null;
  });

  const [user, setUser] = useState(null);
  const [guild, setGuild] = useState(null);
  const [player, setPlayer] = useState(null);
  const [activeTab, setActiveTab] = useState('search'); // 'search' | 'queue' | 'lyrics' | 'history' | 'settings' | 'player' (mobile)
  const [isVerifying, setIsVerifying] = useState(Boolean(token));
  const [authError, setAuthError] = useState('');
  const [isNotFound, setIsNotFound] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [pendingAction, setPendingAction] = useState(null);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [isLofiConfirmOpen, setIsLofiConfirmOpen] = useState(false);
  const [isKaraokeOpen, setIsKaraokeOpen] = useState(false);
  const [lyricsSourceInfo, setLyricsSourceInfo] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isRefreshingVoice, setIsRefreshingVoice] = useState(false);

  const pendingTimerRef = useRef(null);
  const tokenRef = useRef(token);
  tokenRef.current = token;
  const guildIdRef = useRef(guildId);
  guildIdRef.current = guildId;

  const showToast = useCallback((message, type = 'success', duration = 3000) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const handleDismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleAuthExpired = useCallback(() => {
    localStorage.removeItem('anna_web_token');
    setToken(null);
    setUser(null);
    setAuthError('Phiên đăng nhập đã hết hạn, vui lòng nhập lại mã PIN từ Discord.');
    showToast('Phiên làm việc đã hết hạn!', 'error');
  }, [showToast]);

  // Verify PIN / Token
  const verifyToken = useCallback(async (tokenVal, fromUserSubmit = false) => {
    if (!tokenVal) return;
    setIsVerifying(true);
    setAuthError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenVal }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setToken(data.token);
        setGuildId(data.guildId);
        setUser(data.user);
        setGuild({ id: data.guildId, name: data.user?.guildName });
        localStorage.setItem('anna_web_token', data.token);
        localStorage.setItem('anna_web_guild', data.guildId);
        if (fromUserSubmit) {
          showToast(`Chào mừng ${data.user?.displayName || data.user?.username || 'bạn'} đến với Anna Lounge! ☕`);
        }
      } else {
        localStorage.removeItem('anna_web_token');
        setToken(null);
        setAuthError(data.error || 'Mã PIN không đúng hoặc đã hết hạn.');
      }
    } catch {
      setAuthError('Không thể kết nối đến máy chủ bot.');
    } finally {
      setIsVerifying(false);
    }
  }, [showToast]);

  useEffect(() => {
    const u = new URLSearchParams(window.location.search);
    const urlToken = u.get('token');
    const savedToken = localStorage.getItem('anna_web_token');
    if (urlToken) {
      verifyToken(urlToken);
    } else if (savedToken) {
      verifyToken(savedToken);
    } else {
      setIsVerifying(false);
    }
  }, [verifyToken]);

  // Polling State
  const fetchState = useCallback(async (isFull = false) => {
    const ct = tokenRef.current;
    const cg = guildIdRef.current;
    if (!ct || !cg) return;
    try {
      const res = await fetch(`${API_BASE}/api/guilds/${cg}/state${isFull ? '?full=1' : ''}`, {
        headers: { Authorization: `Bearer ${ct}` },
      });
      if (res.status === 401) {
        handleAuthExpired();
        return;
      }
      if (res.status === 404) {
        setIsNotFound(true);
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setIsNotFound(false);
        setPlayer(prev => {
          if (!prev) return data.player;
          return {
            ...prev,
            ...data.player,
            queue: data.player?.queue !== undefined ? data.player.queue : prev.queue,
            favorites: data.player?.favorites !== undefined ? data.player.favorites : prev.favorites,
          };
        });
        if (data.guild) setGuild(data.guild);
      }
    } catch {
      // Network hiccup - ignore
    }
  }, [handleAuthExpired]);

  useEffect(() => {
    if (!token || !guildId) return;
    fetchState(true);
    const interval = setInterval(() => fetchState(false), 1000);
    return () => clearInterval(interval);
  }, [token, guildId, fetchState]);

  // Order Song (Single or Batch)
  const handleOrderSong = async (track, isBatch = false) => {
    const ct = tokenRef.current;
    const cg = guildIdRef.current;
    if (!ct || !cg) return;

    try {
      const payload = isBatch ? { tracks: track, token: ct } : { track, token: ct };
      const res = await fetch(`${API_BASE}/api/guilds/${cg}/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ct}` },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        handleAuthExpired();
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        if (isBatch) {
          const c = Array.isArray(track) ? track.length : 0;
          showToast(`Đã thêm ${c ? `${c} bài hát` : 'Playlist'} vào hàng chờ!`);
        } else {
          showToast(data.message || `Đã thêm "${track.title}" vào hàng chờ!`);
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

  // Player Actions
  const handlePlayerAction = async (action, value = null) => {
    const ct = tokenRef.current;
    const cg = guildIdRef.current;
    if (!ct || !cg) return;

    const isLofiCurrent = Boolean(
      player?.current && (player?.current?.is247 || player?.current?.requestedBy === 'Auto (24/7)')
    );

    if (action === 'notifyEmptyRoom') {
      showToast('Phòng Voice hiện đang trống, bot duy trì phát Lofi 24/7 ☕', 'info');
      return;
    }

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
    }

    const adminOnly = ['toggle247', 'set247', 'toggleAutoplay', 'setAutoplay', 'settings', 'updateSettings'];
    if (adminOnly.includes(action) && !user?.isAdmin) {
      setPendingAction(null);
      setIsPermissionModalOpen(true);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/guilds/${cg}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ct}` },
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

  const handleRefreshVoice = async () => {
    setIsRefreshingVoice(true);
    await fetchState(true);
    setTimeout(() => setIsRefreshingVoice(false), 800);
    showToast('Đã làm mới thông tin phòng voice!', 'info');
  };

  const handleLogout = () => {
    localStorage.removeItem('anna_web_token');
    localStorage.removeItem('anna_web_guild');
    setToken(null);
    setGuildId(null);
    setUser(null);
    setGuild(null);
    setPlayer(null);
    window.location.href = window.location.origin;
  };

  const handleShareLink = () => {
    const tok = tokenRef.current;
    const gld = guildIdRef.current;
    const link = tok && gld ? `${window.location.origin}/?token=${tok}&guild=${gld}` : window.location.href;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedLink(true);
      showToast('Đã sao chép liên kết nghe nhạc trực tiếp! 🔗');
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  // Render Screens
  if (isNotFound) return <NotFoundScreen onGoHome={() => (window.location.href = window.location.origin)} />;

  if (isVerifying) {
    return (
      <ConnectingStepper text={token ? 'ĐANG XÁC THỰC KẾT NỐI VỚI BOT...' : 'ĐANG KẾT NỐI DISCORD CONSOLE...'} />
    );
  }

  if (!token || !user) {
    return <AuthScreen onVerify={verifyToken} authError={authError} isVerifying={isVerifying} />;
  }

  const inSameVoice = user?.isInVoice && (!player?.voiceChannel || user.voiceChannelId === player.voiceChannel.id);
  if (!inSameVoice && !user?.isAdmin) {
    return (
      <NoVoiceSession
        user={user}
        guildName={guild?.name || user?.guildName}
        isRefreshing={isRefreshingVoice}
        onRefresh={handleRefreshVoice}
        onLogout={handleLogout}
      />
    );
  }

  const queueCount = player?.queue?.length || 0;

  return (
    <div className="h-screen h-[100dvh] w-full flex flex-col bg-[#111316] text-[#e2e2e6] overflow-hidden select-none relative font-sans">
      {/* Dynamic Ambient Background theo ảnh bìa */}
      <DynamicAmbientBackground currentTrack={player?.current} isPlaying={player?.isPlaying} />

      {/* ── TOP APP WRAPPER: STRICT 100vh - (Header + Body + MiniPlayer) ──── */}
      <div className="flex-1 flex overflow-hidden w-full h-[calc(100vh-68px)]">

        {/* ── 1. LEFT SIDEBAR (GỌN GÀNG, 210px CỐ ĐỊNH TRÊN DESKTOP) ──────── */}
        <aside className="w-[210px] shrink-0 bg-[#16181b] border-r border-white/5 hidden lg:flex flex-col justify-between p-3 select-none z-20">
          <div className="flex flex-col gap-3">
            {/* Logo Brand */}
            <div className="px-2 pt-1 pb-1 flex flex-col cursor-pointer" onClick={() => setActiveTab('search')}>
              <div className="flex items-baseline gap-1">
                <span className="font-brand text-2xl font-bold text-[#e8c977] leading-none">an</span>
                <span className="font-brand text-2xl font-bold text-[#f5a192] leading-none">na</span>
              </div>
              <span className="font-mono text-[9px] tracking-widest text-[#7f786c] uppercase mt-1">MUSIC WEB PLAYER</span>
            </div>

            {/* Room Live Badge */}
            <div className="px-2.5 py-1.5 rounded-lg bg-[#1c1e22] border border-white/5 flex items-center gap-2 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#9bfcc0] animate-pulse shrink-0"></span>
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] font-bold text-[#9bfcc0] uppercase tracking-wider truncate">
                  {player?.isPlaying ? 'Phòng Thoại Đang Phát' : 'Phòng Thoại Chờ'}
                </span>
                <span className="font-mono text-[10px] text-[#e2e2e6] truncate">
                  {player?.voiceChannel?.name || 'Lounge VC'} • 384k
                </span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex flex-col gap-1 mt-1 text-xs font-medium">
              {TABS.map(({ id, label, Icon }) => {
                const isActive = activeTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg transition-all ${
                      isActive
                        ? 'bg-[#e8c977]/15 text-[#e8c977] font-semibold border border-[#e8c977]/25'
                        : 'text-[#aba395] hover:bg-[#1c1e22] hover:text-[#e2e2e6] border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon size={17} className={isActive ? 'text-[#e8c977]' : 'text-[#aba395]'} />
                      <span className="truncate">{label}</span>
                    </div>
                    {id === 'queue' && queueCount > 0 && (
                      <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-[#2e3137] text-[#e8c977] font-bold">
                        {queueCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* User Profile & Action Widget Ở Đáy Sidebar */}
          <div className="p-2.5 bg-[#0c0e11] rounded-xl border border-white/5 flex flex-col gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={user.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                alt={user.displayName}
                className="w-7 h-7 rounded-full object-cover ring-1 ring-white/10 shrink-0"
              />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-bold text-[#e2e2e6] truncate" title={user.displayName || user.username}>
                  {user.displayName || user.username}
                </span>
                <span className="font-mono text-[9px] text-[#7f786c] truncate">
                  {user.isAdmin ? 'Server Admin' : 'Thành viên'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-white/5">
              <button
                onClick={handleShareLink}
                className="flex items-center justify-center gap-1 py-1 rounded bg-[#1c1e22] hover:bg-[#24272c] text-[10px] font-mono text-[#aba395] hover:text-[#e8c977] transition-colors"
                title="Sao chép link chia sẻ"
              >
                {copiedLink ? <Check size={11} className="text-emerald-400" /> : <Share2 size={11} />}
                <span>{copiedLink ? 'ĐÃ COPY' : 'SHARE'}</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-1 py-1 rounded bg-[#1c1e22] hover:bg-rose-500/15 text-[10px] font-mono text-[#aba395] hover:text-rose-400 transition-colors"
                title="Đăng xuất khỏi phiên"
              >
                <LogOut size={11} />
                <span>THOÁT</span>
              </button>
            </div>
          </div>
        </aside>

        {/* ── 2. MAIN CENTER AREA (TOP HEADER + WORKSPACE) ─────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#111316]">
          
          {/* Top Fixed Header Bar (48px) */}
          <header className="h-12 border-b border-white/5 px-4 flex items-center justify-between gap-3 shrink-0 bg-[#0c0e11]/80 backdrop-blur-md z-10">
            {/* Live Search Quick Trigger Input */}
            <div
              onClick={() => setActiveTab('search')}
              className="flex items-center gap-2.5 px-3 py-1.5 bg-[#141619] border border-white/5 hover:border-[#e8c977]/40 rounded-xl cursor-pointer w-full max-w-sm transition-all"
            >
              <Search size={14} className="text-[#aba395] shrink-0" />
              <span className="text-xs text-[#7f786c] truncate">Tìm bài hát, nghệ sĩ hoặc dán link...</span>
              <kbd className="hidden sm:inline font-mono text-[9px] text-[#7f786c] bg-[#1c1e22] px-1.5 py-0.5 rounded ml-auto">
                /
              </kbd>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2.5 shrink-0">
              {/* Hi-Fi Lossless Chip */}
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#16181b] border border-white/5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-mono text-[10px] text-emerald-400 font-bold">LOSSLESS 384K</span>
              </div>

              {/* Discord Voice Room Listener Avatars */}
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#16181b] border border-white/5">
                <Headphones size={13} className="text-[#aba395]" />
                <span className="font-mono text-[11px] text-[#e2e2e6] font-semibold">
                  {player?.voiceChannel?.humanMemberCount ?? player?.voiceChannel?.memberCount ?? 1}
                </span>
              </div>

              {/* Karaoke Fullscreen Launcher Button */}
              <button
                onClick={() => setIsKaraokeOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#e8c977]/10 hover:bg-[#e8c977]/20 border border-[#e8c977]/30 text-[#e8c977] text-xs font-mono font-bold transition-all"
                title="Mở toàn màn hình Karaoke"
              >
                <Maximize2 size={13} />
                <span className="hidden md:inline">KARAOKE</span>
              </button>
            </div>
          </header>

          {/* Workspace Body: Render Current Tab */}
          <main className="flex-1 p-3.5 flex flex-col gap-3 min-h-0 overflow-hidden relative">
            
            {/* Desktop & Mobile Tab Views */}
            {activeTab === 'search' && (
              <div className="tab-enter flex-1 flex flex-col min-h-0 w-full h-full">
                <LiveSearch
                  token={token}
                  guildId={guildId}
                  player={player}
                  onOrderSong={handleOrderSong}
                />
              </div>
            )}

            {activeTab === 'queue' && (
              <div className="tab-enter flex-1 flex flex-col min-h-0 w-full h-full">
                <QueueManager
                  player={player}
                  queue={player?.queue}
                  onAction={handlePlayerAction}
                  pendingAction={pendingAction}
                />
              </div>
            )}

            {activeTab === 'lyrics' && (
              <div className="tab-enter flex-1 flex flex-col min-h-0 w-full h-full">
                <SyncedLyrics
                  player={player}
                  onAction={handlePlayerAction}
                  user={user}
                  guildId={guildId}
                  isActive={activeTab === 'lyrics'}
                  onSourceChange={setLyricsSourceInfo}
                />
              </div>
            )}

            {activeTab === 'history' && (
              <div className="tab-enter flex-1 flex flex-col min-h-0 w-full h-full">
                <HistoryTab
                  player={player}
                  onOrderSong={handleOrderSong}
                />
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="tab-enter flex-1 overflow-y-auto w-full h-full pr-1">
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

            {/* Mobile Specialized 'player' Tab View (Mâm đĩa than lớn ở trung tâm) */}
            {activeTab === 'player' && (
              <div className="tab-enter lg:hidden flex-1 flex flex-col justify-center items-center w-full h-full overflow-hidden py-2">
                <div className="w-full max-w-sm h-full flex flex-col justify-between">
                  <HeroPlayer
                    player={player}
                    onAction={handlePlayerAction}
                    user={user}
                    onRequireAdmin={() => setIsPermissionModalOpen(true)}
                    pendingAction={pendingAction}
                    compact={false}
                    onOpenKaraoke={() => setIsKaraokeOpen(true)}
                  />
                </div>
              </div>
            )}

          </main>
        </div>

        {/* ── 3. RIGHT PANEL: NOW PLAYING DECK (340px CỐ ĐỊNH TRÊN DESKTOP) ── */}
        <div className="w-[340px] shrink-0 h-full hidden lg:block overflow-hidden">
          <HeroPlayer
            player={player}
            onAction={handlePlayerAction}
            user={user}
            onRequireAdmin={() => setIsPermissionModalOpen(true)}
            pendingAction={pendingAction}
            compact={false}
            onOpenKaraoke={() => setIsKaraokeOpen(true)}
          />
        </div>

      </div>

      {/* ── 4. PERSISTENT BOTTOM MINI PLAYER (68px BOTTOM BAR TRÊN DESKTOP) ─── */}
      <div className="hidden lg:block w-full shrink-0">
        <BottomMiniPlayer
          player={player}
          onAction={handlePlayerAction}
          pendingAction={pendingAction}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenKaraoke={() => setIsKaraokeOpen(true)}
        />
      </div>

      {/* ── 5. MOBILE BOTTOM DOCK & NAVIGATION BAR (< 1024px) ─────────────── */}
      <div className="lg:hidden fixed bottom-0 w-full flex flex-col z-40 bg-[#111316]">
        {/* Mobile Mini Player Dock (Khi không ở tab 'player') */}
        {activeTab !== 'player' && (
          <div className="w-full h-14 bg-[#0c0e11] border-t border-white/5 px-3 flex items-center justify-between shadow-xl">
            <div
              onClick={() => setActiveTab('player')}
              className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
            >
              <div className="w-9 h-9 rounded-lg overflow-hidden bg-[#1c1e22] border border-white/10 shrink-0">
                <img
                  src={player?.current?.thumbnail || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                  alt="Thumb"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-[#e2e2e6] truncate">
                  {player?.current?.title || (player?.mode247 ? '24/7 Lofi Thư Giãn' : 'Chưa có bài hát')}
                </span>
                <span className="text-[10px] text-[#aba395] truncate">
                  {player?.current?.artist || 'Anna Music'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handlePlayerAction(player?.isPlaying && !player?.isPaused ? 'pause' : 'resume')}
                className="w-8 h-8 rounded-full bg-[#e8c977] text-[#111316] font-bold flex items-center justify-center shadow"
              >
                {player?.isPlaying && !player?.isPaused ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
              </button>
              <button
                onClick={() => handlePlayerAction('skip')}
                className="p-1.5 text-[#aba395] hover:text-[#e2e2e6]"
              >
                <SkipForward size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Mobile 5-Tab Navigation Bar */}
        <nav className="h-14 pb-safe bg-[#16181b]/95 backdrop-blur-xl border-t border-white/5 flex items-center justify-around px-1 z-50">
          {TABS.map(({ id, label, Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex flex-col items-center justify-center py-1 px-2 relative transition-all ${
                  isActive ? 'text-[#e8c977] font-bold scale-105' : 'text-[#aba395] hover:text-[#e2e2e6]'
                }`}
              >
                <Icon size={18} />
                <span className="text-[10px] mt-0.5">{label}</span>
                {id === 'queue' && queueCount > 0 && (
                  <span className="absolute top-0.5 right-2 w-3.5 h-3.5 rounded-full bg-[#e8c977] text-[#111316] text-[8px] font-bold flex items-center justify-center">
                    {queueCount}
                  </span>
                )}
              </button>
            );
          })}
          {/* Nút Tab Đĩa Than chuyên biệt trên mobile */}
          <button
            onClick={() => setActiveTab('player')}
            className={`flex flex-col items-center justify-center py-1 px-2 relative transition-all ${
              activeTab === 'player' ? 'text-[#e8c977] font-bold scale-105' : 'text-[#aba395] hover:text-[#e2e2e6]'
            }`}
          >
            <Disc3 size={18} className={player?.isPlaying && !player?.isPaused ? 'animate-spin' : ''} />
            <span className="text-[10px] mt-0.5">Đĩa Than</span>
          </button>
        </nav>
      </div>

      {/* ── 6. Modals & Notifications ─────────────────────────────────────── */}
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

      <KaraokeFullscreenModal
        isOpen={isKaraokeOpen}
        onClose={() => setIsKaraokeOpen(false)}
        player={player}
        lyricsData={lyricsSourceInfo}
        onAction={handlePlayerAction}
        lyricsSourceInfo={lyricsSourceInfo}
      />

      <Toast toasts={toasts} onDismiss={handleDismissToast} />

    </div>
  );
}
