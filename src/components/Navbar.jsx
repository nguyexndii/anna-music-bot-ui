import React, { useState } from 'react';
import { Share2, Check, Radio } from 'lucide-react';

export default function Navbar({ guild, user, activeWebUsers = [], onOpenAuthModal }) {
  const [copied, setCopied] = useState(false);

  const copyWebLink = () => {
    const token = localStorage.getItem('anna_web_token');
    const guildId = localStorage.getItem('anna_guild_id');
    const link = token && guildId ? `${window.location.origin}/?token=${token}&guild=${guildId}` : window.location.href;

    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const otherUsers = (activeWebUsers || []).filter(u => u.userId && user && String(u.userId) !== String(user.userId));

  return (
    <header className="sticky top-0 z-40 bg-[#09090B]/95 backdrop-blur-md border-b border-white/[0.07] px-4 lg:px-6 h-14 flex items-center transition-all">
      <div className="w-full flex items-center justify-between gap-4">

        {/* Brand & Server / Voice Info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg overflow-visible flex-shrink-0">
            <img
              src="/logo.gif"
              alt="Anna Music Logo"
              className="w-8 h-8 rounded-lg object-cover ring-1 ring-orange-500/30 border border-white/10"
              style={{ imageRendering: 'pixelated' }}
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#09090B]" />
          </div>

          <div className="min-w-0 flex items-center gap-2.5">
            <h1 className="font-bold text-zinc-100 text-sm tracking-tight flex items-center gap-1.5 whitespace-nowrap">
              <span>an</span><span className="text-orange-500">na</span>
            </h1>

            <span className="text-zinc-600 hidden sm:inline">•</span>

            {/* Voice Channel Status Pill */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#141417] border border-white/[0.06] text-xs font-medium text-zinc-400 truncate max-w-[200px] sm:max-w-[320px]">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${user?.isInVoice ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-500'}`} aria-hidden="true" />
              <span className="truncate">
                {user?.botVoice?.name || guild?.name || (user ? 'Đang kết nối Server...' : 'Anna Music')}
              </span>
            </div>
          </div>
        </div>

        {/* User Profile & Utility Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
          {/* Share Link Button */}
          <button
            onClick={copyWebLink}
            aria-label="Sao chép liên kết Web Player"
            title="Sao chép liên kết phiên Web"
            className="px-2.5 py-1.5 rounded-lg bg-[#141417] hover:bg-[#18181C] text-zinc-300 hover:text-zinc-100 border border-white/[0.07] text-xs font-medium transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-500"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                <span className="hidden sm:inline text-emerald-400">Đã chép link</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-zinc-400" aria-hidden="true" />
                <span className="hidden sm:inline">Chia sẻ</span>
              </>
            )}
          </button>

          {user ? (
            <div className="flex items-center gap-2 bg-[#141417] border border-white/[0.07] px-2.5 py-1 rounded-lg">
              {/* Avatar Stack */}
              <div className="flex items-center -space-x-2 relative">
                {otherUsers.slice(0, 3).map((other, idx) => (
                  <img
                    key={other.userId || idx}
                    src={other.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                    alt={`Avatar của ${other.displayName || other.username}`}
                    title={`${other.displayName || other.username} (Đang xem Web)`}
                    className="w-5 h-5 rounded-full ring-1 ring-[#141417] object-cover opacity-75 hover:opacity-100 transition-opacity"
                  />
                ))}

                <img
                  src={user.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                  alt={`Avatar của ${user.displayName}`}
                  title={`${user.displayName || user.username} (Bạn)`}
                  className="w-5 h-5 rounded-full ring-1 ring-orange-500/60 object-cover z-10"
                />
              </div>

              <span className="text-xs font-medium text-zinc-200 max-w-[100px] truncate hidden md:inline">
                {user.displayName || user.username}
              </span>

              <span className="text-[10px] font-mono font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20 px-1.5 py-0.2 rounded">
                {otherUsers.length > 0 ? `${otherUsers.length + 1}` : '1'}
              </span>
            </div>
          ) : (
            <div className="text-xs text-zinc-500 font-medium px-2.5 py-1 rounded-lg bg-[#141417] border border-white/[0.06]">
              Chưa kết nối
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
