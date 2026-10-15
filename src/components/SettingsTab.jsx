import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Radio,
  Sparkles,
  ShieldCheck,
  User,
  Mic2,
  ScrollText,
  Lock,
  Bell,
  Volume2,
  Music,
  Hash,
  Disc,
} from 'lucide-react';
import { API_BASE } from '../config';

export default function SettingsTab({ guildId, guildName, token, player, onAction, user }) {
  const isAdmin = Boolean(user?.isAdmin);

  // Local User Preferences
  const [autoScrollLyrics, setAutoScrollLyrics] = useState(() => {
    const saved = localStorage.getItem('anna_karaoke_autoscroll');
    return saved !== null ? saved === 'true' : true;
  });

  const [ambientBgEnabled, setAmbientBgEnabled] = useState(() => {
    const saved = localStorage.getItem('anna_ambient_bg');
    return saved !== null ? saved === 'true' : true;
  });

  const toggleAmbientBg = () => {
    const next = !ambientBgEnabled;
    setAmbientBgEnabled(next);
    localStorage.setItem('anna_ambient_bg', String(next));
    window.dispatchEvent(new CustomEvent('anna_ambient_bg_change', { detail: next }));
  };

  // Server Settings State
  const [serverSettings, setServerSettings] = useState({
    logChannelId: null,
    musicChannelId: null,
    lockedVoiceChannelId: null,
    mode247: false,
    autoplay: true,
    crossfadeDuration: 0,
    updateVoiceStatus: true,
    announceSongs: true,
    djOnly: false,
    djRoleId: null,
    defaultVolume: 80,
    useAiAssistant: true,
    autoplayLayers: ['ytmix', 'ai', 'lastfm', 'heuristic'],
  });

  const [textChannels, setTextChannels] = useState([]);
  const [voiceChannels, setVoiceChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');

  useEffect(() => {
    if (!isAdmin || !guildId || !token) return;

    setIsLoadingSettings(true);
    fetch(`${API_BASE}/api/guilds/${guildId}/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setIsLoadingSettings(false);
        if (data.success && data.settings) {
          setServerSettings((prev) => ({ ...prev, ...data.settings }));
          setTextChannels(data.textChannels || []);
          setVoiceChannels(data.voiceChannels || []);
          setRoles(data.roles || []);
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

  const updateSetting = async (key, value) => {
    const newSettings = { ...serverSettings, [key]: value };
    setServerSettings(newSettings);
    setIsSaving(true);

    try {
      const res = await fetch(`${API_BASE}/api/guilds/${guildId}/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ [key]: value }),
      });
      const data = await res.json().catch(() => ({}));
      setIsSaving(false);
      if (res.ok && data.success) {
        setSaveSuccessMessage('Đã lưu thay đổi!');
        setTimeout(() => setSaveSuccessMessage(''), 2500);
      }
    } catch (err) {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="bg-[#111113] border border-white/[0.07] rounded-xl p-5 sm:p-6 pb-8 flex flex-col gap-5 animate-in fade-in text-zinc-100"
      style={{
        fontFamily: "'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Header with Role Badge */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.07]">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-zinc-100">Cài Đặt</h3>
          {saveSuccessMessage && (
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold animate-in fade-in">
              ✓ {saveSuccessMessage}
            </span>
          )}
        </div>

        {isAdmin ? (
          <span className="font-mono text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold flex items-center gap-1.5 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Quản Trị Viên</span>
          </span>
        ) : (
          <span className="font-mono text-[10px] px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-400 font-bold flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            <span>Thành Viên</span>
          </span>
        )}
      </div>

      {/* SECTION 1: Cài Đặt Cá Nhân */}
      <div className="flex flex-col gap-3">
        <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-cyan-400" />
          <span>Tùy Chọn Cá Nhân</span>
        </h4>

        {/* Karaoke Auto-Scroll Toggle */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl bg-[#16161A] border border-white/[0.06] hover:border-white/[0.1] transition">
          <div className="pr-4">
            <div className="flex items-center gap-2">
              <Mic2 className="w-4 h-4 text-cyan-400" />
              <p className="text-xs font-bold text-zinc-100">Tự động cuộn lời bài hát (Karaoke Sync)</p>
            </div>
            <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
              Tự động cuộn và làm nổi bật theo từng câu hát khi bài hát đang phát.
            </p>
          </div>

          <button
            onClick={toggleAutoScroll}
            title={autoScrollLyrics ? 'Tắt tự động cuộn' : 'Bật tự động cuộn'}
            className={`w-11 h-6 rounded-full relative p-0.5 transition-all flex-shrink-0 active:scale-95 focus-visible:outline-none ${
              autoScrollLyrics ? 'bg-cyan-500 shadow-md shadow-cyan-500/25' : 'bg-zinc-800'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform duration-200 ${
                autoScrollLyrics ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Ambient Glow Background Toggle */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl bg-[#16161A] border border-white/[0.06] hover:border-white/[0.1] transition">
          <div className="pr-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <p className="text-xs font-bold text-zinc-100">Nền mờ động theo màu bài hát (Ambient Glow)</p>
            </div>
            <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
              Hiệu ứng ánh sáng hào quang chuyển động mờ theo tông màu ảnh bìa bài hát đang phát.
            </p>
          </div>

          <button
            onClick={toggleAmbientBg}
            title={ambientBgEnabled ? 'Tắt nền studio' : 'Bật nền studio'}
            className={`w-11 h-6 rounded-full relative p-0.5 transition-all flex-shrink-0 active:scale-95 focus-visible:outline-none ${
              ambientBgEnabled ? 'bg-cyan-500 shadow-md shadow-cyan-500/25' : 'bg-zinc-800'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform duration-200 ${
                ambientBgEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* SECTION 2: Cài Đặt Server (Chỉ hiển thị cho Quản Trị Viên) */}
      {isAdmin && (
        <div className="flex flex-col gap-3.5 pt-3 border-t border-white/[0.07] animate-in fade-in">
          <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Cài Đặt Máy Chủ (Administrator)</span>
          </h4>

          {/* 1. Log Channel */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-[#16161A] border border-white/[0.06] flex flex-col gap-2.5 transition">
            <div>
              <p className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                <ScrollText className="w-3.5 h-3.5 text-cyan-400" />
                <span>Kênh Nhật Ký Hoạt Động (Log Channel)</span>
              </p>
              <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                Ghi lại toàn bộ nhật ký hoạt động của bot vào kênh Discord được chỉ định.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-white/[0.06]">
              <select
                value={serverSettings.logChannelId || ''}
                onChange={(e) => updateSetting('logChannelId', e.target.value || null)}
                disabled={isSaving}
                className="flex-1 bg-[#121215] border border-white/[0.08] text-zinc-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 font-medium transition cursor-pointer"
              >
                <option value="">🚫 Tắt kênh nhật ký</option>
                {textChannels.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    # {ch.name}
                  </option>
                ))}
              </select>

              {serverSettings.logChannelId && (
                <button
                  onClick={() => updateSetting('logChannelId', null)}
                  disabled={isSaving}
                  className="px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition active:scale-95"
                >
                  Tắt Log
                </button>
              )}
            </div>
          </div>

          {/* 2. Lock Command Channel */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-[#16161A] border border-white/[0.06] flex flex-col gap-2.5 transition">
            <div>
              <p className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-cyan-400" />
                <span>Kênh Nhận Lệnh (Music Channel)</span>
              </p>
              <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                Giới hạn chỉ cho phép sử dụng lệnh bot tại kênh chat được chỉ định.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-white/[0.06]">
              <select
                value={serverSettings.musicChannelId || ''}
                onChange={(e) => updateSetting('musicChannelId', e.target.value || null)}
                disabled={isSaving}
                className="flex-1 bg-[#121215] border border-white/[0.08] text-zinc-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 font-medium transition cursor-pointer"
              >
                <option value="">🌐 Cho phép dùng lệnh ở mọi kênh</option>
                {textChannels.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    # {ch.name}
                  </option>
                ))}
              </select>

              {serverSettings.musicChannelId && (
                <button
                  onClick={() => updateSetting('musicChannelId', null)}
                  disabled={isSaving}
                  className="px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition active:scale-95"
                >
                  Mở Khóa
                </button>
              )}
            </div>
          </div>

          {/* 3. Lock Voice Channel */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-[#16161A] border border-white/[0.06] flex flex-col gap-2.5 transition">
            <div>
              <p className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Khóa Phòng Voice Cố Định</span>
              </p>
              <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                Cố định bot chỉ tham gia và phát nhạc tại phòng Voice được chọn.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-white/[0.06]">
              <select
                value={serverSettings.lockedVoiceChannelId || ''}
                onChange={(e) => updateSetting('lockedVoiceChannelId', e.target.value || null)}
                disabled={isSaving}
                className="flex-1 bg-[#121215] border border-white/[0.08] text-zinc-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 font-medium transition cursor-pointer"
              >
                <option value="">🔊 Cho phép bot vào mọi phòng Voice</option>
                {voiceChannels.map((vc) => (
                  <option key={vc.id} value={vc.id}>
                    🔊 {vc.name}
                  </option>
                ))}
              </select>

              {serverSettings.lockedVoiceChannelId && (
                <button
                  onClick={() => updateSetting('lockedVoiceChannelId', null)}
                  disabled={isSaving}
                  className="px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition active:scale-95"
                >
                  Mở Khóa
                </button>
              )}
            </div>
          </div>

          {/* 4. 24/7 Mode */}
          <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl bg-[#16161A] border border-white/[0.06] hover:border-white/[0.1] transition">
            <div className="pr-4">
              <p className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
                <span>Chế Độ 24/7 (Luôn Trực Tuyến)</span>
              </p>
              <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                Duy trì kết nối liên tục trong phòng Voice và phát nhạc nền khi hàng chờ trống.
              </p>
            </div>

            <button
              onClick={() => {
                const next = !serverSettings.mode247;
                updateSetting('mode247', next);
                onAction('set247', next);
              }}
              title={serverSettings.mode247 ? 'Tắt chế độ 24/7' : 'Bật chế độ 24/7'}
              className={`w-11 h-6 rounded-full relative p-0.5 transition-all flex-shrink-0 active:scale-95 focus-visible:outline-none ${
                serverSettings.mode247 ? 'bg-cyan-500 shadow-md shadow-cyan-500/25' : 'bg-zinc-800'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform duration-200 ${
                  serverSettings.mode247 ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* 5. Autoplay */}
          <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl bg-[#16161A] border border-white/[0.06] hover:border-white/[0.1] transition">
            <div className="pr-4">
              <p className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Tự Động Phát Bài Tương Tự (Autoplay)</span>
              </p>
              <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                Tự động tìm kiếm và nối tiếp các bài hát tương tự khi kết thúc hàng chờ.
              </p>
            </div>

            <button
              onClick={() => {
                const next = serverSettings.autoplay === false;
                updateSetting('autoplay', next);
                onAction('setAutoplay', next);
              }}
              title={serverSettings.autoplay !== false ? 'Tắt Autoplay' : 'Bật Autoplay'}
              className={`w-11 h-6 rounded-full relative p-0.5 transition-all flex-shrink-0 active:scale-95 focus-visible:outline-none ${
                serverSettings.autoplay !== false ? 'bg-cyan-500 shadow-md shadow-cyan-500/25' : 'bg-zinc-800'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform duration-200 ${
                  serverSettings.autoplay !== false ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* 5b. Autoplay Layers */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-[#16161A] border border-white/[0.06] flex flex-col gap-2.5 transition">
            <div>
              <p className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>Thứ Tự Tầng Gợi Ý Autoplay</span>
              </p>
              <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                Tích chọn các tầng gợi ý nhạc bạn muốn dùng. Nếu chỉ chọn YouTube Mix, bot sẽ chỉ lấy nhạc từ YouTube Mix.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-white/[0.06]">
              {[
                { id: 'ytmix', label: 'YouTube Mix (RD)', badge: '🔴', desc: 'Chuẩn gu thuật toán YouTube' },
                { id: 'ai', label: 'Gemini DJ AI', badge: '✨', desc: 'Gợi ý thông minh theo vibe' },
                { id: 'lastfm', label: 'Last.fm Similar', badge: '📻', desc: 'Thư viện bài hát quốc tế' },
                { id: 'heuristic', label: 'Heuristic Fallback', badge: '🔍', desc: 'Cùng ca sĩ / bài nổi bật' },
              ].map((layer) => {
                const currentLayers =
                  Array.isArray(serverSettings.autoplayLayers) && serverSettings.autoplayLayers.length > 0
                    ? serverSettings.autoplayLayers
                    : ['ytmix', 'ai', 'lastfm', 'heuristic'];
                const isChecked = currentLayers.includes(layer.id);
                return (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => {
                      let nextLayers;
                      if (isChecked) {
                        if (currentLayers.length <= 1) return;
                        nextLayers = currentLayers.filter((id) => id !== layer.id);
                      } else {
                        nextLayers = [...currentLayers, layer.id];
                      }
                      updateSetting('autoplayLayers', nextLayers);
                    }}
                    disabled={isSaving}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition ${
                      isChecked
                        ? 'bg-cyan-500/10 border-cyan-500/40 text-zinc-100'
                        : 'bg-[#121215] border-white/[0.06] text-zinc-400 hover:border-white/[0.1]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{layer.badge}</span>
                      <div>
                        <div className="text-xs font-semibold">{layer.label}</div>
                        <div className="text-[10px] text-zinc-500">{layer.desc}</div>
                      </div>
                    </div>
                    <span
                      className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isChecked
                          ? 'bg-cyan-500 text-white'
                          : 'bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      {isChecked ? 'BẬT' : 'TẮT'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5c. Gemini DJ AI Assistant */}
          <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl bg-[#16161A] border border-white/[0.06] hover:border-white/[0.1] transition">
            <div className="pr-4">
              <p className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400"/>
                <span>Trợ Lý DJ Gemini AI (Thông Minh)</span>
              </p>
              <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                Sử dụng AI để phân tích tâm trạng, câu hát và gợi ý bài hát cùng ngôn ngữ & vibe.
              </p>
            </div>

            <button
              onClick={() => updateSetting('useAiAssistant', serverSettings.useAiAssistant === false)}
              title={serverSettings.useAiAssistant !== false ? 'Tắt DJ AI' : 'Bật DJ AI'}
              className={`w-11 h-6 rounded-full relative p-0.5 transition-all flex-shrink-0 active:scale-95 focus-visible:outline-none ${
                serverSettings.useAiAssistant !== false ? 'bg-cyan-500 shadow-md shadow-cyan-500/25' : 'bg-zinc-800'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform duration-200 ${
                  serverSettings.useAiAssistant !== false ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* 6b. Default Server Volume */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-[#16161A] border border-white/[0.06] flex flex-col gap-2.5 transition">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-cyan-400"/>
                <span>Âm Lượng Mặc Định Máy Chủ</span>
              </p>
              <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                {serverSettings.defaultVolume || 80}%
              </span>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
              {[30, 50, 80, 100].map((vol) => (
                <button
                  key={vol}
                  type="button"
                  onClick={() => updateSetting('defaultVolume', vol)}
                  className={`flex-1 py-1.5 rounded-lg font-mono text-xs font-semibold border transition ${
                    Number(serverSettings.defaultVolume) === vol
                      ? 'bg-cyan-500 text-white border-cyan-500'
                      : 'bg-[#121215] text-zinc-400 border-white/[0.07] hover:text-zinc-200'
                  }`}
                >
                  {vol}%
                </button>
              ))}
            </div>
          </div>

          {/* 6. Crossfade */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-[#16161A] border border-white/[0.06] flex flex-col gap-2.5 transition">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                <Disc className="w-3.5 h-3.5 text-cyan-400" />
                <span>Hòa Âm Chuyển Bài (Fade-in)</span>
              </p>
              <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                {serverSettings.crossfadeDuration > 0
                  ? `${serverSettings.crossfadeDuration}s`
                  : 'Tắt (0s)'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Tạo hiệu ứng tăng dần âm lượng khi bắt đầu bài hát mới để chuyển bài mượt mà hơn.
            </p>

            <div className="flex items-center gap-3 pt-2 border-t border-white/[0.06]">
              <input
                type="range"
                min="0"
                max="10"
                step="1"
                value={serverSettings.crossfadeDuration || 0}
                onChange={(e) => updateSetting('crossfadeDuration', parseInt(e.target.value, 10))}
                className="flex-1 accent-cyan-500 bg-zinc-800 cursor-pointer h-1.5 rounded-full"
              />
              <span className="font-mono text-xs text-zinc-500 w-8 text-right">
                {serverSettings.crossfadeDuration || 0}s
              </span>
            </div>
          </div>

          {/* 7. Voice Channel Status */}
          <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl bg-[#16161A] border border-white/[0.06] hover:border-white/[0.1] transition">
            <div className="pr-4">
              <p className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Trạng Thái Kênh Voice (Voice Status)</span>
              </p>
              <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                Hiển thị tên bài hát đang phát trên thanh trạng thái của phòng Voice.
              </p>
            </div>

            <button
              onClick={() => updateSetting('updateVoiceStatus', serverSettings.updateVoiceStatus === false)}
              title={serverSettings.updateVoiceStatus !== false ? 'Tắt trạng thái voice' : 'Bật trạng thái voice'}
              className={`w-11 h-6 rounded-full relative p-0.5 transition-all flex-shrink-0 active:scale-95 focus-visible:outline-none ${
                serverSettings.updateVoiceStatus !== false ? 'bg-cyan-500 shadow-md shadow-cyan-500/25' : 'bg-zinc-800'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform duration-200 ${
                  serverSettings.updateVoiceStatus !== false ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* 8. Announce Songs */}
          <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl bg-[#16161A] border border-white/[0.06] hover:border-white/[0.1] transition">
            <div className="pr-4">
              <p className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-cyan-400" />
                <span>Thông Báo Bài Hát Mới</span>
              </p>
              <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                Gửi tin nhắn thông báo kèm nút điều khiển mỗi khi chuyển sang bài hát tiếp theo.
              </p>
            </div>

            <button
              onClick={() => updateSetting('announceSongs', serverSettings.announceSongs === false)}
              title={serverSettings.announceSongs !== false ? 'Tắt thông báo bài hát' : 'Bật thông báo bài hát'}
              className={`w-11 h-6 rounded-full relative p-0.5 transition-all flex-shrink-0 active:scale-95 focus-visible:outline-none ${
                serverSettings.announceSongs !== false ? 'bg-cyan-500 shadow-md shadow-cyan-500/25' : 'bg-zinc-800'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform duration-200 ${
                  serverSettings.announceSongs !== false ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* 9. DJ Mode */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-[#16161A] border border-white/[0.06] flex flex-col gap-2.5 transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Chế Độ DJ (DJ Only)</span>
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                  Chỉ cho phép Quản trị viên và thành viên có vai trò DJ điều khiển nhạc.
                </p>
              </div>

              <button
                onClick={() => updateSetting('djOnly', !serverSettings.djOnly)}
                className={`w-11 h-6 rounded-full relative p-0.5 transition-all flex-shrink-0 active:scale-95 ${
                  serverSettings.djOnly ? 'bg-cyan-500 shadow-md shadow-cyan-500/25' : 'bg-zinc-800'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform duration-200 ${
                    serverSettings.djOnly ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {serverSettings.djOnly && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-white/[0.06] animate-in fade-in">
                <span className="text-xs text-zinc-300 font-medium">Vai trò DJ:</span>
                <select
                  value={serverSettings.djRoleId || ''}
                  onChange={(e) => updateSetting('djRoleId', e.target.value || null)}
                  disabled={isSaving}
                  className="flex-1 bg-[#121215] border border-white/[0.08] text-zinc-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 font-medium transition cursor-pointer"
                >
                  <option value="">🏷️ Chọn vai trò Discord...</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      @{r.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
