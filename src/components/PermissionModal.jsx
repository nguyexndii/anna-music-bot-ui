import React, { useEffect } from 'react';
import { ShieldAlert, Lock, X, Check } from 'lucide-react';

export default function PermissionModal({ isOpen, onClose, user }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="permission-modal-title"
    >
      <div
        className="bg-[#141417] border border-white/[0.08] w-full max-w-md rounded-2xl p-6 shadow-2xl shadow-black/80 flex flex-col items-center text-center relative overflow-hidden text-zinc-100"
        style={{
          fontFamily: "'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-on-surface-variant hover:text-zinc-100 p-1.5 rounded-lg hover:bg-white/[0.06] transition"
          aria-label="Đóng thông báo"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon */}
        <div className="relative my-2">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-inner">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#18181C] border border-amber-500/30 flex items-center justify-center text-amber-400 text-[10px]">
            <Lock className="w-3 h-3" />
          </span>
        </div>

        {/* Modal Header */}
        <h3 id="permission-modal-title" className="text-base font-bold text-zinc-100 mt-2">
          Yêu Cầu Quyền Quản Trị Viên
        </h3>

        <p className="text-xs text-on-surface-variant mt-2 leading-relaxed px-2">
          Bạn không có quyền chỉnh sửa mục này. Chỉ{' '}
          <span className="text-on-surface font-semibold">Chủ sở hữu máy chủ (Server Owner)</span> hoặc
          thành viên có quyền{' '}
          <span className="text-primary-container font-semibold">
            Quản trị viên (Administrator / Manage Server)
          </span>{' '}
          mới có thể thay đổi Cài Đặt Phát Nhạc của Server.
        </p>

        {/* User Identity Chip */}
        <div className="w-full bg-[#18181C] border border-white/[0.07] rounded-xl p-3 mt-4 flex items-center gap-3 text-left">
          <img
            src={user?.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
            alt=""
            className="w-9 h-9 rounded-lg object-cover border border-white/[0.08]"
          />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-on-surface truncate">
              {user?.displayName || user?.username || 'Thành viên'}
            </div>
            <div className="text-[11px] text-on-surface-variant flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
              <span>
                Vai trò: <b className="text-on-surface font-medium">Thành viên thường</b>
              </span>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono font-bold whitespace-nowrap">
            Chỉ Xem
          </span>
        </div>

        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full mt-5 py-2.5 rounded-xl bg-primary-container hover:bg-cyan-600 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-primary-container/20 transition active:scale-95"
        >
          <Check className="w-4 h-4 stroke-[2.5]" />
          <span>Đã hiểu</span>
        </button>
      </div>
    </div>
  );
}
