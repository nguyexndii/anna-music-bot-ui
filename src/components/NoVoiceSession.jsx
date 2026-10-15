import React from 'react';
import { MicOff, RefreshCw, HelpCircle, Radio, Volume2, LogOut } from 'lucide-react';

export default function NoVoiceSession({ user, guildName, onRefresh, isRefreshing, onLogout }) {
  const isInVoice = Boolean(user?.isInVoice);
  const botVoice = user?.botVoice;
  const userVoice = user?.userVoice;
  const isDifferentVoice = isInVoice && botVoice && userVoice && userVoice.id !== botVoice.id;

  return (
    <main className="min-h-screen w-full bg-[#09090B] flex flex-col items-center justify-center px-4 py-8 text-zinc-100 select-none relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 25%, rgba(6, 182, 212, 0.08), transparent 70%)',
        }}
      />

      {/* Brand Header */}
      <div className="relative z-10 flex flex-col items-center mb-6">
        <img
          src="/logo.gif"
          alt="Anna Music"
          className="w-16 h-16 rounded-2xl object-cover border border-white/10 ring-1 ring-cyan-500/30 shadow-2xl mb-3"
          style={{ imageRendering: 'pixelated' }}
        />
        <div className="text-2xl font-extrabold tracking-tight">
          <span>an</span><span className="text-cyan-500">na</span>
        </div>
        <div className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase mt-1">
          STUDIO WEB PLAYER
        </div>
      </div>

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-lg bg-[#111113] border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/80 space-y-5">
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isDifferentVoice
                ? 'bg-amber-500/10 border border-amber-500/25 text-amber-400'
                : 'bg-cyan-500/10 border border-cyan-500/25 text-cyan-400'
            }`}
          >
            {isDifferentVoice ? <MicOff className="w-6 h-6" /> : <Radio className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-zinc-100 tracking-tight">
              {isDifferentVoice ? 'Khác Phòng Voice Với Bot' : 'Chưa Tham Gia Phòng Voice'}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Máy chủ: <span className="text-cyan-400 font-semibold">{guildName || user?.guildName || 'Discord'}</span>
            </p>
          </div>
        </div>

        <div className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
          {isDifferentVoice ? (
            <p>
              Bot hiện đang phát nhạc tại phòng <b className="text-cyan-400 font-semibold">{botVoice?.name}</b>, còn bạn đang ở phòng <b className="text-zinc-200 font-semibold">{userVoice?.name}</b>. Vui lòng chuyển sang cùng phòng với Bot để điều khiển nhạc!
            </p>
          ) : botVoice ? (
            <p>
              Bot đang hoạt động tại phòng <b className="text-cyan-400 font-semibold">{botVoice?.name}</b>. Hãy tham gia vào phòng Voice này trên Discord để bắt đầu nghe và gọi bài nhé!
            </p>
          ) : (
            <p>
              Để sử dụng Web Player và gọi bài hát, bạn cần tham gia vào một kênh thoại (Voice Channel) trong máy chủ Discord trước.
            </p>
          )}
        </div>

        <div className="bg-[#16161A] border border-white/[0.06] rounded-xl p-4 space-y-2">
          <p className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-cyan-400" />
            <span>Hướng dẫn nhanh:</span>
          </p>
          <ol className="text-xs text-zinc-400 space-y-1.5 list-decimal list-inside leading-relaxed">
            {botVoice ? (
              <>
                <li>Mở Discord và vào kênh Voice: <b className="text-cyan-400 font-semibold">{botVoice.name}</b>.</li>
                <li>Quay lại đây và nhấn nút <b className="text-zinc-200">"Đồng Bộ Phiên Voice"</b> bên dưới.</li>
              </>
            ) : (
              <>
                <li>Mở Discord và vào một kênh Voice bất kỳ trong máy chủ.</li>
                <li>Quay lại đây và nhấn nút <b className="text-zinc-200">"Đồng Bộ Phiên Voice"</b>.</li>
              </>
            )}
          </ol>
        </div>

        <div className="pt-1 flex flex-col sm:flex-row items-center gap-2.5">
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-[0.98] disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Đang kiểm tra...' : 'Đồng Bộ Phiên Voice'}</span>
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full sm:w-auto py-3 px-4 rounded-xl bg-[#18181C] hover:bg-[#222228] border border-white/[0.08] text-zinc-300 hover:text-white text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-2"
              title="Đăng xuất để nhập mã PIN khác"
            >
              <LogOut className="w-4 h-4 text-zinc-400" />
              <span>Đổi Mã PIN</span>
            </button>
          )}
        </div>

        <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-500 pt-1">
          <HelpCircle className="w-3.5 h-3.5 opacity-70" />
          <span>Gõ lệnh <code className="text-cyan-400 font-mono font-bold bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded">/web</code> trong Discord nếu bạn muốn tạo phiên mới</span>
        </div>
      </div>
    </main>
  );
}
