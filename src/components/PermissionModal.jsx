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
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="permission-modal-title"
    >
      <div
        className="bg-[#13161b] border border-[#22262e] w-full max-w-md rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center relative overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-outline hover:text-on-surface p-1.5 rounded-lg hover:bg-surface-container transition z-10"
          aria-label="Đóng thông báo"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon with Ring */}
        <div className="relative my-2">
          <div className="w-14 h-14 rounded-xl bg-primary-container/10 border border-primary-container/30 flex items-center justify-center text-primary-container">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-md bg-[#13161b] border border-[#22262e] flex items-center justify-center text-primary-container text-xs">
            <Lock className="w-3 h-3" />
          </span>
        </div>

        {/* Modal Header */}
        <h3 id="permission-modal-title" className="text-lg font-bold text-white mt-3">
          Yêu Cầu Quyền Quản Trị Viên
        </h3>
        
        <p className="text-xs text-anna-muted mt-2 leading-relaxed px-2">
          Bạn không có quyền chỉnh sửa mục này. Chỉ <span className="text-white font-semibold">Chủ sở hữu máy chủ (Server Owner)</span> hoặc thành viên có quyền <span className="text-amber-400 font-semibold">Quản trị viên (Administrator / Manage Server)</span> mới có thể thay đổi Cài Đặt Phát Nhạc của Server.
        </p>

        {/* User Identity Chip */}
        <div className="w-full bg-[#181924] border border-anna-border/80 rounded-2xl p-3 mt-4 flex items-center gap-3 text-left">
          <img
            src={user?.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
            alt=""
            className="w-10 h-10 rounded-xl object-cover border border-anna-border"
          />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-white truncate">
              {user?.displayName || user?.username || 'Thành viên'}
            </div>
            <div className="text-[11px] text-anna-muted flex items-center gap-1 mt-0.5">
              <span className="inline-block w-2 h-2 rounded-full bg-anna-muted"></span>
              <span>Vai trò: <b className="text-anna-text">Thành viên thường</b></span>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold whitespace-nowrap">
            Chỉ Xem
          </span>
        </div>

        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full mt-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition active:scale-95"
        >
          <Check className="w-4 h-4" />
          <span>Đã hiểu</span>
        </button>
      </div>
    </div>
  );
}
