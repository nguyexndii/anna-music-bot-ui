import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import HeroPlayer from './components/HeroPlayer';
import LiveSearch from './components/LiveSearch';
import QueueManager from './components/QueueManager';
import SyncedLyrics from './components/SyncedLyrics';
import SettingsTab from './components/SettingsTab';
import PermissionModal from './components/PermissionModal';
import ConnectingStepper from './components/ConnectingStepper';
import NoVoiceSession from './components/NoVoiceSession';
import BottomMiniPlayer from './components/BottomMiniPlayer';
import Toast from './components/Toast';
import { Search, ListMusic, Mic2, Settings, KeyRound, AlertCircle, Compass } from 'lucide-react';
import { API_BASE } from './config';

export default function App() {
  const [token, setToken] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('token') || localStorage.getItem('anna_web_token') || null;
  });
  const [guildId, setGuildId] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('guild') || localStorage.getItem('anna_guild_id') || null;
  });

  const [user, setUser] = useState(null);
  const [guild, setGuild] = useState(null);
  const [player, setPlayer] = useState(null);
  const [activeWebUsers, setActiveWebUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('search');
  const [isPlayerMinimized, setIsPlayerMinimized] = useState(() => {
    return localStorage.getItem('anna_player_minimized') === 'true';
  });
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);

  const togglePlayerMinimize = () => {
    setIsPlayerMinimized((prev) => {
      const next = !prev;
      localStorage.setItem('anna_player_minimized', String(next));
      return next;
    });
  };
  const [authError, setAuthError] = useState(null);
  const [isVerifying, setIsVerifying] = useState(Boolean(token));
  const [isRefreshingVoice, setIsRefreshingVoice] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  }, []);

  // 1. Hàm xác thực Token / PIN
  const verifyToken = useCallback((tokenToVerify) => {
    if (!tokenToVerify) {
      setIsVerifying(false);
      return;
    }

    setIsVerifying(true);
    setAuthError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    fetch(`${API_BASE}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: tokenToVerify }),
      signal: controller.signal
    })
      .then(async (res) => {
        clearTimeout(timeoutId);
        const data = await res.json().catch(() => ({}));
        setIsVerifying(false);

        if (res.ok && data.success && data.user) {
          setUser(data.user);
          setGuildId(data.user.guildId);
          setToken(tokenToVerify);
          localStorage.setItem('anna_web_token', tokenToVerify);
          localStorage.setItem('anna_guild_id', data.user.guildId);
          setAuthError(null);
        } else {
          setUser(null);
          localStorage.removeItem('anna_web_token');
          localStorage.removeItem('anna_guild_id');
          setAuthError(data.error || 'Mã PIN không đúng hoặc đã hết hạn (2 phút).');
        }
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        setIsVerifying(false);
        setUser(null);
        localStorage.removeItem('anna_web_token');
        localStorage.removeItem('anna_guild_id');
        setAuthError(err.name === 'AbortError' 
          ? 'Kết nối đến bot quá thời gian. Vui lòng kiểm tra lại bot trên VPS!' 
          : 'Không thể kết nối đến máy chủ bot. Vui lòng kiểm tra lại bot trên VPS!');
      });
  }, []);

  // 2. Đọc Token & Guild từ URL parameters (khi bấm nút "Mở Web Player" trên Discord)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    const guildFromUrl = urlParams.get('guild');

    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      localStorage.setItem('anna_web_token', tokenFromUrl);
      if (guildFromUrl) {
        setGuildId(guildFromUrl);
        localStorage.setItem('anna_guild_id', guildFromUrl);
      }
      verifyToken(tokenFromUrl);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      const savedToken = localStorage.getItem('anna_web_token');
      if (savedToken) {
        verifyToken(savedToken);
      } else {
        setIsVerifying(false);
      }
    }
  }, [verifyToken]);

  // 3. Làm mới kiểm tra Voice Session
  const handleRefreshVoice = () => {
    const currentToken = token || localStorage.getItem('anna_web_token');
    if (!currentToken) return;

    setIsRefreshingVoice(true);
    fetch(`${API_BASE}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: currentToken })
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        setIsRefreshingVoice(false);

        if (res.ok && data.success && data.user) {
          setUser(data.user);
          if (data.user.isInVoice) {
            showToast('Đã kết nối phòng Voice thành công!');
          } else {
            showToast('Bạn chưa tham gia kênh Voice trên Discord!', 'error');
          }
        } else {
          setUser(null);
          setToken(null);
          localStorage.removeItem('anna_web_token');
          showToast(data.error || 'Phiên kết nối đã hết hạn!', 'error');
        }
      })
      .catch(() => {
        setIsRefreshingVoice(false);
        showToast('Không thể kết nối đến máy chủ bot!', 'error');
      });
  };

  // 4. Polling trạng thái phát nhạc (2s)
  const fetchState = useCallback(() => {
    const currentGuild = guildId || user?.guildId;
    const currentToken = token || localStorage.getItem('anna_web_token');
    if (!currentGuild || !user) return;

    fetch(`${API_BASE}/api/guilds/${currentGuild}/state`, {
      headers: currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {}
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          if (data.guild) setGuild(data.guild);
          if (data.player) setPlayer(data.player);
          if (data.activeWebUsers) setActiveWebUsers(data.activeWebUsers);
        }
      })
      .catch(() => {});
  }, [guildId, token, user]);

  useEffect(() => {
    if (!user) return;
    fetchState();
    const interval = setInterval(fetchState, 2000);
    return () => clearInterval(interval);
  }, [user, fetchState]);

  // 5. Order bài hát từ Web
  const handleOrderSong = async (track) => {
    const currentGuild = guildId || user?.guildId;
    const currentToken = token || localStorage.getItem('anna_web_token');
    if (!currentGuild || !currentToken) return;

    try {
      showToast(`Đang thêm "${track.title}"...`);
      const res = await fetch(`${API_BASE}/api/guilds/${currentGuild}/play`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify({ track, token: currentToken })
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        showToast(`Đã thêm vào hàng chờ!`);
        fetchState();
      } else {
        showToast(data.error || 'Lỗi thêm bài hát', 'error');
        if (data.error && data.error.includes('Voice')) {
          handleRefreshVoice();
        }
      }
    } catch (err) {
      showToast('Không thể gửi yêu cầu đến bot!', 'error');
    }
  };

  // 6. Thao tác điều khiển Player
  const handlePlayerAction = async (action, value = null) => {
    const currentGuild = guildId || user?.guildId;
    const currentToken = token || localStorage.getItem('anna_web_token');
    if (!currentGuild || !currentToken) return;

    const serverSettingActions = ['toggle247', 'set247', 'toggleAutoplay', 'setAutoplay', 'settings', 'updateSettings'];
    if (serverSettingActions.includes(action) && !user?.isAdmin) {
      setIsPermissionModalOpen(true);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/guilds/${currentGuild}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify({ action, value, token: currentToken })
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 403 || data.code === 'PERMISSION_DENIED') {
        setIsPermissionModalOpen(true);
        return;
      }

      if (res.ok && data.success) {
        if (data.message) showToast(data.message);
        fetchState();
      } else {
        showToast(data.error || 'Lỗi thao tác!', 'error');
      }
    } catch (err) {
      showToast('Lỗi gửi lệnh điều khiển!', 'error');
    }
  };

  return (
    <div className="min-h-screen flex flex-col selection:bg-anna-accent selection:text-white">
      {/* Top Navbar */}
      <Navbar
        guild={guild || (user ? { name: user.guildName } : null)}
        user={user}
        activeWebUsers={activeWebUsers}
      />

      {/* Main Routing Views */}
      {isVerifying ? (
        <ConnectingStepper step={3} statusText="Đang kết nối và đồng bộ Voice session..." />
      ) : !user ? (
        /* Màn hình nhập mã PIN khi vào link trần https://anna-music-bot-ui.pages.dev/ hoặc khi mã hết hạn */
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-3xl bg-anna-surface border border-anna-border flex items-center justify-center mb-4 shadow-xl">
            <KeyRound className="w-8 h-8 text-anna-accent" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Nhập Mã PIN Kết Nối</h2>
          <p className="text-xs sm:text-sm text-anna-muted max-w-md leading-relaxed mb-4">
            Vui lòng gõ lệnh <code className="text-anna-accent font-mono font-bold">.web</code> trong Discord để nhận mã PIN 6 số (hoặc bấm nút <span className="text-white font-semibold">"Mở Web Player"</span> để vào thẳng).
          </p>

          {authError && (
            <div className="w-full max-w-sm mb-5 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              let val = e.target.tokenInput.value.trim();
              if (val.includes('token=')) {
                try {
                  const parsed = new URL(val);
                  val = parsed.searchParams.get('token') || val;
                } catch {
                  const match = val.match(/token=([a-zA-Z0-9._-]+)/);
                  if (match) val = match[1];
                }
              }
              if (val) {
                verifyToken(val);
              }
            }}
            className="w-full max-w-sm flex items-center gap-2 bg-anna-surface border border-anna-border focus-within:border-anna-accent rounded-2xl p-1.5 shadow-2xl transition"
          >
            <input
              name="tokenInput"
              type="text"
              placeholder="Nhập 6 số PIN (VD: 992075)..."
              maxLength={30}
              className="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder-anna-muted focus:outline-none text-center font-mono tracking-wider"
              autoFocus
            />
            <button
              type="submit"
              className="px-5 py-2 bg-anna-accent hover:bg-anna-accentHover text-white text-xs font-bold rounded-xl transition shadow-md shadow-anna-accent/25 active:scale-95"
            >
              Kết Nối
            </button>
          </form>
        </div>
      ) : !user.isInVoice ? (
        /* Màn hình No Voice Session khi user chưa vào kênh Voice (Giống FlaviBot) */
        <NoVoiceSession
          guildName={user.guildName}
          onRefresh={handleRefreshVoice}
          isRefreshing={isRefreshingVoice}
        />
      ) : (
        /* Giao diện Dashboard phát nhạc đầy đủ */
        <main
          className={`flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 ${
            isPlayerMinimized
              ? 'grid grid-cols-1 gap-6 pb-28'
              : 'grid grid-cols-1 lg:grid-cols-12 gap-6'
          } animate-in fade-in duration-300`}
        >
          {/* Left Column: Hero Player Deck (5 Cols) when Expanded */}
          {!isPlayerMinimized && (
            <div className="lg:col-span-5">
              <HeroPlayer
                player={player}
                onAction={handlePlayerAction}
                user={user}
                onRequireAdmin={() => setIsPermissionModalOpen(true)}
                onToggleMinimize={togglePlayerMinimize}
              />
            </div>
          )}

          {/* Right/Full Column: Tabs (7 Cols or 12 Cols when minimized) */}
          <div className={`${isPlayerMinimized ? 'col-span-12' : 'lg:col-span-7'} flex flex-col gap-4`}>
            {/* Tab Navigation Buttons */}
            <div className="flex items-center gap-2 bg-anna-surface p-1.5 rounded-2xl border border-anna-border/80 shadow-md overflow-x-auto">
              <button
                onClick={() => setActiveTab('search')}
                className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 ${
                  activeTab === 'search'
                    ? 'bg-anna-accent text-white shadow-sm shadow-anna-accent/20'
                    : 'text-anna-muted hover:text-white hover:bg-anna-card'
                }`}
              >
                <Compass className="w-4 h-4" />
                <span>Khám Phá</span>
              </button>

              <button
                onClick={() => setActiveTab('queue')}
                className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 ${
                  activeTab === 'queue'
                    ? 'bg-anna-accent text-white shadow-sm shadow-anna-accent/20'
                    : 'text-anna-muted hover:text-white hover:bg-anna-card'
                }`}
              >
                <ListMusic className="w-4 h-4" />
                <span>Hàng Chờ</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-anna-border text-white">
                  {player?.queue?.length || 0}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('lyrics')}
                className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 ${
                  activeTab === 'lyrics'
                    ? 'bg-anna-accent text-white shadow-sm shadow-anna-accent/20'
                    : 'text-anna-muted hover:text-white hover:bg-anna-card'
                }`}
              >
                <Mic2 className="w-4 h-4" />
                <span>Lời Bài Hát</span>
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 ${
                  activeTab === 'settings'
                    ? 'bg-anna-accent text-white shadow-sm shadow-anna-accent/20'
                    : 'text-anna-muted hover:text-white hover:bg-anna-card'
                }`}
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>

            {/* Active Tab Body (Giữ nguyên DOM để không mất nội dung tìm kiếm & không load lại Lyric) */}
            <div className={activeTab === 'search' ? 'contents' : 'hidden'}>
              <LiveSearch onOrderSong={handleOrderSong} player={player} />
            </div>
            <div className={activeTab === 'queue' ? 'contents' : 'hidden'}>
              <QueueManager queue={player?.queue} onAction={handlePlayerAction} />
            </div>
            <div className={activeTab === 'lyrics' ? 'contents' : 'hidden'}>
              <SyncedLyrics
                player={player}
                isLyricsEnabled={player?.lyricsSync !== false}
                onToggleLyrics={() => handlePlayerAction('toggleLyrics')}
              />
            </div>
            <div className={activeTab === 'settings' ? 'contents' : 'hidden'}>
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
        </main>
      )}

      {/* Bottom Mini Player when Minimized */}
      {isPlayerMinimized && user?.isInVoice && (
        <BottomMiniPlayer
          player={player}
          onAction={handlePlayerAction}
          onToggleMinimize={togglePlayerMinimize}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      )}

      {/* Permission Denied Modal for Non-Admins */}
      <PermissionModal
        isOpen={isPermissionModalOpen}
        onClose={() => setIsPermissionModalOpen(false)}
        user={user}
      />

      {/* Toast Notification */}
      <Toast toast={toast} />
    </div>
  );
}
