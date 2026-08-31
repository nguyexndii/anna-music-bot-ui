import React, { useState, useEffect } from 'react';
import { Sliders, Radio, Sparkles, ShieldCheck, User, Mic2, FlaskConical, ScrollText, Check, ChevronDown } from 'lucide-react';
import { API_BASE } from '../config';

export default function SettingsTab({ guildId, guildName, token, player, onAction, user }) {
  const isAdmin = Boolean(user?.isAdmin);
  
  // Local User Preferences
  const [autoScrollLyrics, setAutoScrollLyrics] = useState(() => {
    const saved = localStorage.getItem('anna_karaoke_autoscroll');
    return saved !== null ? saved === 'true' : true;
  });

  // Server Settings State
  const [serverSettings, setServerSettings] = useState(null);
  const [textChannels, setTextChannels] = useState([]);
  const [selectedLogChannel, setSelectedLogChannel] = useState('');
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSavingLogChannel, setIsSavingLogChannel] = useState(false);

  useEffect(() => {
    if (!isAdmin || !guildId || !token) return;

    setIsLoadingSettings(true);
    fetch(`${API_BASE}/api/guilds/${guildId}/settings`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setIsLoadingSettings(false);
        if (data.success) {
          setServerSettings(data.settings);
          setTextChannels(data.textChannels || []);
          setSelectedLogChannel(data.settings?.logChannelId || '');
        }
      })
      .catch(() => {
        setIsLoadingSettings(false);
      });
  }, [isAdmin, guildId, token]);

  const toggleAutoScroll = () => {
    const next = !autoScrollLyrics;
    setAutoScrollLyrics(next);
    localStorage.setItem('anna_karaoke_autoscroll', String(next));
    window.dispatchEvent(new CustomEvent('anna_autoscroll_change', { detail: next }));
  };

  const handleSelectLogChannel = async (channelId) => {
    const targetChannel = channelId || null;
    setSelectedLogChannel(targetChannel || '');
    setIsSavingLogChannel(true);
    await onAction('setLogChannel', targetChannel);
    setIsSavingLogChannel(false);
  };

  return (
    <div className="bg-anna-surface border border-anna-border/80 rounded-2xl p-6 pb-8 flex-1 min-h-[250px] max-h-[calc(100vh-320px)] overflow-y-auto flex flex-col gap-6 animate-in fade-in">
      
      {/* Header with Role Badge */}
      <div className="flex items-center justify-between pb-3 border-b border-anna-border/50">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Sliders className="w-4 h-4 text-anna-accent" />
          <span>Cài Đặt</span>
        </h3>

        {isAdmin ? (
          <span className="text-[10px] px-2.5 py-1 rounded-full bg-anna-green/10 border border-anna-green/30 text-anna-green font-bold flex items-center gap-1 shadow-sm">
            <ShieldCheck className="w-3 h-3" />
            <span>Quản Trị Viên</span>
          </span>
        ) : (
          <span className="text-[10px] px-2.5 py-1 rounded-full bg-anna-card border border-anna-border text-anna-muted font-bold flex items-center gap-1">
            <User className="w-3 h-3" />
            <span>Thành Viên</span>
          </span>
        )}
      </div>

      {/* SECTION 1: Cài Đặt Cá Nhân (Dành cho TẤT CẢ mọi người) */}
      <div className="flex flex-col gap-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-anna-muted flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-anna-accent" />
          <span>Tùy Chọn Cá Nhân (Chỉ áp dụng trên thiết bị này)</span>
        </h4>

        {/* Karaoke Auto-Scroll Toggle */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-anna-card border border-anna-border/80 hover:border-anna-border transition">
          <div className="pr-4">
            <div className="flex items-center gap-2">
              <Mic2 className="w-4 h-4 text-anna-accent" />
              <p className="text-xs font-bold text-white">Tự động cuộn theo bài hát (Karaoke Sync)</p>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold flex items-center gap-0.5">
                <FlaskConical className="w-2.5 h-2.5" />
                <span>Thử nghiệm</span>
              </span>
            </div>
            <p className="text-[11px] text-anna-muted mt-1 leading-relaxed">
              Tự động cuộn và làm nổi bật theo từng câu hát khi bài hát đang phát. Tắt nếu bạn muốn tự do lướt đọc toàn bộ lời bài hát từ đầu đến cuối mà không bị giật màn hình.
            </p>
          </div>

          <button
            onClick={toggleAutoScroll}
            title={autoScrollLyrics ? "Tắt tự động cuộn" : "Bật tự động cuộn"}
            className={`w-12 h-6 rounded-full relative p-0.5 transition-all flex-shrink-0 active:scale-95 focus-visible:ring-2 focus-visible:ring-anna-accent focus-visible:outline-none ${
              autoScrollLyrics ? 'bg-anna-accent shadow-lg shadow-anna-accent/20' : 'bg-anna-border'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform duration-200 ${
                autoScrollLyrics ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      {/* SECTION 2: Cài Đặt Server (CHỈ HIỂN THỊ KHI LÀ QUẢN TRỊ VIÊN) */}
      {isAdmin && (
        <div className="flex flex-col gap-3 pt-3 border-t border-anna-border/50 animate-in fade-in">
          <h4 className="text-xs font-bold uppercase tracking-wider text-anna-green flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Cài Đặt Máy Chủ (Dành cho Quản Trị Viên)</span>
          </h4>

          {/* Log Channel Selection */}
          <div className="p-4 rounded-xl bg-anna-card border border-anna-border/80 flex flex-col gap-3 transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <ScrollText className="w-3.5 h-3.5 text-anna-accent" />
                  <span>Kênh Nhật Ký Hoạt Động (Log Channel)</span>
                </p>
                <p className="text-[11px] text-anna-muted mt-1 leading-relaxed">
                  Gửi toàn bộ nhật ký (sửa tin nhắn, xóa tin nhắn, lệnh nhạc, web player, voice...) vào kênh Discord được chọn thay vì chỉ hiện trong console.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-anna-border/40">
              <select
                value={selectedLogChannel}
                onChange={(e) => handleSelectLogChannel(e.target.value)}
                disabled={isSavingLogChannel}
                className="flex-1 bg-anna-surface border border-anna-border text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-anna-accent font-medium transition cursor-pointer"
              >
                <option value="">🚫 Tắt kênh nhật ký (Không gửi vào Discord)</option>
                {textChannels.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    # {ch.name}
                  </option>
                ))}
              </select>

              {selectedLogChannel && (
                <button
                  onClick={() => handleSelectLogChannel('')}
                  disabled={isSavingLogChannel}
                  className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition flex items-center justify-center gap-1 active:scale-95"
                >
                  Tắt Log
                </button>
              )}
            </div>
          </div>

          {/* 24/7 Lofi Mode */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-anna-card border border-anna-border/80 hover:border-anna-border transition">
            <div className="pr-4">
              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-anna-pink" />
                <span>Chế độ Treo Lofi 24/7</span>
              </p>
              <p className="text-[11px] text-anna-muted mt-1 leading-relaxed">
                Tự động phát Lofi thư giãn khi không có người nghe hoặc hết bài hát trong hàng chờ. Bot sẽ duy trì liên tục trong phòng Voice.
              </p>
            </div>

            <button
              onClick={() => onAction('toggle247')}
              title={player?.mode247 ? "Tắt chế độ 24/7" : "Bật chế độ 24/7"}
              className={`w-12 h-6 rounded-full relative p-0.5 transition-all flex-shrink-0 active:scale-95 focus-visible:ring-2 focus-visible:ring-anna-pink focus-visible:outline-none ${
                player?.mode247 ? 'bg-anna-pink shadow-lg shadow-anna-pink/20' : 'bg-anna-border'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform duration-200 ${
                  player?.mode247 ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Autoplay Similar Songs */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-anna-card border border-anna-border/80 hover:border-anna-border transition">
            <div className="pr-4">
              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-anna-green" />
                <span>Tự Động Phát Bài Tương Tự (Autoplay)</span>
              </p>
              <p className="text-[11px] text-anna-muted mt-1 leading-relaxed">
                Tự động tìm và phát các bài hát tương tự phù hợp khi hết hàng chờ trong phòng Voice.
              </p>
            </div>

            <button
              onClick={() => onAction('toggleAutoplay')}
              title={player?.autoplay !== false ? "Tắt Autoplay" : "Bật Autoplay"}
              className={`w-12 h-6 rounded-full relative p-0.5 transition-all flex-shrink-0 active:scale-95 focus-visible:ring-2 focus-visible:ring-anna-green focus-visible:outline-none ${
                player?.autoplay !== false ? 'bg-anna-green shadow-lg shadow-anna-green/20' : 'bg-anna-border'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform duration-200 ${
                  player?.autoplay !== false ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
