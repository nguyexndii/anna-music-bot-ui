import React from 'react';
import { MicOff, RefreshCw, HelpCircle, Radio, Volume2 } from 'lucide-react';

export default function NoVoiceSession({ user, guildName, onRefresh, isRefreshing }) {
  const isInVoice = Boolean(user?.isInVoice);
  const botVoice = user?.botVoice;
  const userVoice = user?.userVoice;
  const isDifferentVoice = isInVoice && botVoice && userVoice && userVoice.id !== botVoice.id;

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center min-h-[70vh] px-4 py-8 animate-in fade-in duration-200 text-zinc-100 select-none"
      style={{
        fontFamily: "'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Breadcrumb style path */}
      <div className="font-mono text-xs text-zinc-500 mb-6 flex items-center gap-2">
        <span className="text-zinc-300 font-medium">Studio Player</span>
        <span>›</span>
        <span className="text-orange-400 font-semibold">
          {isDifferentVoice ? 'Khác Phòng Voice' : 'Yêu Cầu Voice'}
        </span>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-lg bg-[#111113] border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/80 space-y-6">
        {/* Header with Icon */}
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg ${
              isDifferentVoice
                ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                : 'bg-orange-500/10 border border-orange-500/20 text-orange-400'
            }`}
          >
            {isDifferentVoice ? <MicOff className="w-6 h-6" /> : <Radio className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-zinc-100 tracking-tight">
              {isDifferentVoice ? 'Khác Phòng Voice Với Bot' : 'Chưa Tham Gia Phòng Voice'}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Máy chủ: <span className="text-zinc-200 font-semibold">{guildName || user?.guildName || 'Discord'}</span>
            </p>
          </div>
        </div>

        {/* Dynamic Contextual Description */}
        <div className="text-xs sm:text-sm text-zinc-400 leading-relaxed space-y-2">
          {isDifferentVoice ? (
            <p>
              Bot hiện đang phát nhạc tại phòng <b className="text-orange-400 font-semibold">{botVoice?.name}</b>. Bạn đang ở phòng <b className="text-zinc-200 font-semibold">{userVoice?.name}</b>. Vui lòng chuyển sang cùng phòng với Bot để bắt đầu nghe và order nhạc!
            </p>
          ) : botVoice ? (
            <p>
              Bot đang phát nhạc tại phòng <b className="text-orange-400 font-semibold">{botVoice?.name}</b>. Hãy tham gia vào phòng Voice này trên Discord để cùng nghe nhạc nhé!
            </p>
          ) : (
            <p>
              Để sử dụng Web Player và order nhạc, bạn cần tham gia vào một kênh Voice trong máy chủ Discord.
            </p>
          )}
        </div>

        {/* Steps List */}
        <div className="bg-[#16161A] border border-white/[0.06] rounded-xl p-4 space-y-2.5">
          <p className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-orange-400" />
            <span>Cách tiếp tục:</span>
          </p>
          <ol className="text-xs text-zinc-400 space-y-2 list-decimal list-inside leading-relaxed">
            {botVoice ? (
              <>
                <li>Mở Discord và tham gia vào kênh Voice: <b className="text-orange-400 font-semibold">{botVoice.name}</b>.</li>
                <li>Quay lại trình duyệt và nhấn nút <span className="text-zinc-200 font-semibold">"Làm Mới Phiên Voice"</span> bên dưới.</li>
              </>
            ) : (
              <>
                <li>Mở Discord và vào một kênh Voice bất kỳ trong máy chủ.</li>
                <li>Quay lại đây và nhấn nút <span className="text-zinc-200 font-semibold">"Làm Mới Phiên Voice"</span>.</li>
              </>
            )}
          </ol>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex flex-col items-center gap-3">
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="w-full py-3 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-[0.98] disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Đang kiểm tra kết nối...' : 'Làm Mới Phiên Voice'}</span>
          </button>

          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <HelpCircle className="w-3.5 h-3.5 opacity-70" />
            <span>Hoặc gõ lệnh <code className="text-orange-400 font-mono font-bold bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded">/web</code> trong Discord để mở lại</span>
          </div>
        </div>
      </div>
    </div>
  );
}
