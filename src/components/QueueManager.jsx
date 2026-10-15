import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  ListOrdered,
  Trash2,
  Music2,
  CheckSquare,
  Square,
  Play,
  GripVertical,
  ArrowUpToLine,
  ArrowUpDown,
  MoreHorizontal,
  X,
  Loader2,
  Coffee
} from 'lucide-react';
import { DEFAULT_TRACK_THUMB } from '../config';

function getSourceLabel(track) {
  if (!track) return 'YouTube Music';
  const u = (track.url || '').toLowerCase();
  const s = (track.source || '').toLowerCase();
  if (s === 'soundcloud' || u.includes('soundcloud.com')) return 'SoundCloud';
  if (s === 'spotify' || u.includes('spotify.com')) return 'Spotify';
  if (s === 'youtube' || u.includes('youtube.com') || u.includes('youtu.be')) return 'YouTube Music';
  return track.artist || 'YouTube Music';
}

function formatRequesterName(name) {
  if (!name) return '';
  if (/^<@!?\d+>$/.test(name) || /^\d{17,20}$/.test(name)) return 'Discord User';
  return name;
}

export default function QueueManager({ queue, onAction, pendingAction, player }) {
  const songs = queue || [];
  const isLofiMode = Boolean(
    player?.current && (player?.current?.is247 || player?.current?.requestedBy === 'Auto (24/7)')
  );

  const [selectedIndices, setSelectedIndices] = useState(new Set());
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [jumpModalData, setJumpModalData] = useState(null);
  const [targetPosition, setTargetPosition] = useState('1');
  const [activeMenuIdx, setActiveMenuIdx] = useState(null);
  const [menuPlacement, setMenuPlacement] = useState('bottom');

  const lastClickedIndexRef = useRef(null);
  const listContainerRef = useRef(null);
  const autoScrollRafRef = useRef(null);

  // Close active dropdown when clicking outside
  useEffect(() => {
    const close = () => setActiveMenuIdx(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  // Auto-scroll logic during drag
  const stopAutoScroll = () => {
    if (autoScrollRafRef.current) {
      cancelAnimationFrame(autoScrollRafRef.current);
      autoScrollRafRef.current = null;
    }
  };

  const startAutoScroll = (direction, speed) => {
    stopAutoScroll();
    const scrollStep = () => {
      const scrollParent = listContainerRef.current?.closest('.overflow-y-auto') || window;
      if (scrollParent === window) {
        window.scrollBy({ top: direction * speed });
      } else {
        scrollParent.scrollBy({ top: direction * speed });
      }
      autoScrollRafRef.current = requestAnimationFrame(scrollStep);
    };
    autoScrollRafRef.current = requestAnimationFrame(scrollStep);
  };

  // Drag and Drop handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex === null || draggedIndex === index) return;

    setDragOverIndex(index);

    const threshold = 100;
    const { clientY } = e;
    const windowHeight = window.innerHeight;

    if (clientY < threshold) {
      const speed = Math.max(2, Math.floor((threshold - clientY) / 10));
      startAutoScroll(-1, speed);
    } else if (clientY > windowHeight - threshold) {
      const speed = Math.max(2, Math.floor((clientY - (windowHeight - threshold)) / 10));
      startAutoScroll(1, speed);
    } else {
      stopAutoScroll();
    }
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    stopAutoScroll();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    onAction('move', { from: draggedIndex, to: targetIndex });
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    stopAutoScroll();
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Quick Move to Top (Play next)
  const handleMoveToTop = (index) => {
    if (index === 0) return;
    onAction('move', { from: index, to: 0 });
    setActiveMenuIdx(null);
  };

  // Open Jump Position Modal
  const openJumpModal = (song, index) => {
    setJumpModalData({ song, index });
    setTargetPosition(String(index + 1));
    setActiveMenuIdx(null);
  };

  const handleConfirmJump = (e) => {
    e.preventDefault();
    if (!jumpModalData) return;
    const targetIdx = parseInt(targetPosition, 10) - 1;
    if (isNaN(targetIdx) || targetIdx < 0 || targetIdx >= songs.length) return;

    if (targetIdx !== jumpModalData.index) {
      onAction('move', { from: jumpModalData.index, to: targetIdx });
    }
    setJumpModalData(null);
  };

  // Toggle menu thông minh (bung lên hoặc xuống tùy vị trí)
  const handleToggleMenu = (e, index) => {
    e.stopPropagation();
    if (activeMenuIdx === index) {
      setActiveMenuIdx(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow < 185) {
      setMenuPlacement('top');
    } else {
      setMenuPlacement('bottom');
    }
    setActiveMenuIdx(index);
  };

  // Multi-select helpers (Shift + Click)
  const toggleSelect = (index, event) => {
    const isShift = Boolean(event && event.shiftKey);
    const newSet = new Set(selectedIndices);

    if (isShift && lastClickedIndexRef.current !== null && lastClickedIndexRef.current !== index) {
      window.getSelection()?.removeAllRanges();
      const start = Math.min(lastClickedIndexRef.current, index);
      const end = Math.max(lastClickedIndexRef.current, index);
      for (let i = start; i <= end; i++) {
        newSet.add(i);
      }
    } else {
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      lastClickedIndexRef.current = index;
    }

    setSelectedIndices(newSet);
  };

  const toggleSelectAll = () => {
    lastClickedIndexRef.current = null;
    if (selectedIndices.size === songs.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(songs.map((_, idx) => idx)));
    }
  };

  const [showClearModal, setShowClearModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);

  const handleDeleteSelected = () => {
    if (selectedIndices.size === 0) return;
    setShowBatchModal(true);
  };

  const confirmBatchDelete = () => {
    onAction('removeBatch', Array.from(selectedIndices));
    setSelectedIndices(new Set());
    lastClickedIndexRef.current = null;
    setShowBatchModal(false);
  };

  const confirmClearAll = () => {
    onAction('clear');
    setSelectedIndices(new Set());
    lastClickedIndexRef.current = null;
    setShowClearModal(false);
  };

  // Tính tổng thời lượng hàng chờ
  const totalSeconds = songs.reduce((acc, s) => {
    if (!s.duration || s.duration.includes('Live')) return acc;
    const parts = s.duration.split(':').map(Number);
    if (parts.length === 2) return acc + parts[0] * 60 + parts[1];
    if (parts.length === 3) return acc + parts[0] * 3600 + parts[1] * 60 + parts[2];
    return acc;
  }, 0);

  const formatTotalTime = (sec) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m ${s}s`;
  };

  const isAllSelected = songs.length > 0 && selectedIndices.size === songs.length;

  return (
    <div ref={listContainerRef} className="flex flex-col gap-3 flex-1 min-h-0">
      {/* ── Portaled Modals (Clean Studio Dark Dialogs) ── */}

      {showClearModal && ReactDOM.createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowClearModal(false); }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
        >
          <div className="w-full max-w-sm rounded-2xl bg-surface-container-low border border-white/[0.08] p-5 shadow-2xl">
            <h4 className="text-base font-bold text-zinc-100 m-0 mb-2">Xóa toàn bộ hàng chờ?</h4>
            <p className="text-xs text-on-surface-variant leading-relaxed m-0 mb-5">
              Bạn có chắc chắn muốn xóa tất cả <b className="text-on-surface">{songs.length} bài hát</b> trong hàng chờ không?
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="px-3.5 py-1.5 rounded-lg border border-white/[0.08] bg-surface-container hover:bg-[#222226] text-xs font-medium text-on-surface transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={confirmClearAll}
                className="px-3.5 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-xs font-bold text-white transition-colors"
              >
                Xóa Hết
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showBatchModal && ReactDOM.createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowBatchModal(false); }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
        >
          <div className="w-full max-w-sm rounded-2xl bg-surface-container-low border border-white/[0.08] p-5 shadow-2xl">
            <h4 className="text-base font-bold text-zinc-100 m-0 mb-2">Xóa {selectedIndices.size} bài đã chọn?</h4>
            <p className="text-xs text-on-surface-variant leading-relaxed m-0 mb-5">
              Các bài hát được đánh dấu sẽ bị xóa khỏi hàng chờ.
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="px-3.5 py-1.5 rounded-lg border border-white/[0.08] bg-surface-container hover:bg-[#222226] text-xs font-medium text-on-surface transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={confirmBatchDelete}
                className="px-3.5 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-xs font-bold text-white transition-colors"
              >
                Xác Nhận Xóa
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {jumpModalData && ReactDOM.createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setJumpModalData(null); }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
        >
          <div className="w-full max-w-sm rounded-2xl bg-surface-container-low border border-white/[0.08] p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3.5">
              <div>
                <h4 className="text-sm font-bold text-zinc-100 m-0">Chuyển Vị Trí Bài Hát</h4>
                <p className="text-[11px] text-on-surface-variant m-0 mt-0.5">Hiện tại: <b className="text-primary-container">#{jumpModalData.index + 1}</b></p>
              </div>
              <button type="button" onClick={() => setJumpModalData(null)} className="text-on-surface-variant hover:text-white p-1">
                <X size={16} />
              </button>
            </div>

            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-surface-container border border-white/[0.06] mb-4">
              <img
                src={jumpModalData.song.thumbnail || DEFAULT_TRACK_THUMB}
                alt=""
                onError={(e) => { e.currentTarget.src = DEFAULT_TRACK_THUMB; }}
                className="w-9 h-9 rounded-md object-cover flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-on-surface truncate m-0">{jumpModalData.song.title}</p>
                <p className="text-[11px] text-outline truncate m-0 mt-0.5">{jumpModalData.song.artist || 'YouTube'}</p>
              </div>
            </div>

            <form onSubmit={handleConfirmJump}>
              <label className="block text-[11px] text-on-surface-variant mb-1.5">
                Nhập số thứ tự muốn chuyển đến (1 - {songs.length}):
              </label>
              <input
                type="number"
                min={1}
                max={songs.length}
                value={targetPosition}
                onChange={(e) => setTargetPosition(e.target.value)}
                className="no-spin-button w-full h-10 rounded-xl border border-white/[0.08] bg-[#101012] text-zinc-100 text-center font-mono text-base font-bold outline-none focus:border-primary-container mb-3"
                autoFocus
              />
              <div className="flex gap-1.5 flex-wrap mb-4">
                <button type="button" onClick={() => setTargetPosition('1')} className="px-2.5 py-1 rounded-md border border-white/[0.06] bg-surface-container text-primary-container text-xs font-mono font-medium">#1 (Kế tiếp)</button>
                {songs.length >= 2 && <button type="button" onClick={() => setTargetPosition('2')} className="px-2.5 py-1 rounded-md border border-white/[0.06] bg-surface-container text-on-surface text-xs font-mono font-medium">#2</button>}
                {songs.length >= 5 && <button type="button" onClick={() => setTargetPosition('5')} className="px-2.5 py-1 rounded-md border border-white/[0.06] bg-surface-container text-on-surface text-xs font-mono font-medium">#5</button>}
                <button type="button" onClick={() => setTargetPosition(String(songs.length))} className="px-2.5 py-1 rounded-md border border-white/[0.06] bg-surface-container text-on-surface-variant text-xs font-mono font-medium">Cuối (#{songs.length})</button>
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setJumpModalData(null)} className="px-3 py-1.5 rounded-lg border border-white/[0.08] bg-surface-container text-xs font-medium text-on-surface">Hủy</button>
                <button type="submit" className="px-3 py-1.5 rounded-lg bg-primary-container hover:bg-cyan-600 text-xs font-bold text-zinc-950">Xác Nhận</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── Top Header Bar ──────────────────────────────── */}
      <div className="flex items-center justify-between p-2.5 px-3.5 rounded-xl bg-surface-container-low border border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          {songs.length > 0 && (
            <button
              type="button"
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 text-on-surface-variant hover:text-on-surface text-xs transition-colors"
            >
              {isAllSelected ? <CheckSquare size={15} className="text-primary-container" /> : <Square size={15} />}
              <span>{isAllSelected ? 'Bỏ chọn' : 'Chọn tất cả'}</span>
            </button>
          )}
          <span className="font-mono text-xs text-outline tabular-nums">
            {songs.length} bài {totalSeconds > 0 ? `• ${formatTotalTime(totalSeconds)}` : ''}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {(() => {
            const isRoomEmpty = Boolean(player?.voiceChannel && player.voiceChannel.humanMemberCount === 0);
            const isSwitching = pendingAction === 'toggleLofiMode' || pendingAction === 'switchTo247';

            let btnLabel = 'VỀ NHẠC LOFI';
            let btnTitle = 'Lưu hàng chờ và chuyển sang nhạc Lofi 24/7';
            let btnIcon = <Coffee size={12} />;
            let btnClasses = 'border-primary-container/25 bg-primary-container/10 text-primary-container hover:bg-primary-container/15';

            if (isRoomEmpty) {
              btnLabel = 'PHÒNG TRỐNG (24/7)';
              btnTitle = 'Phòng Voice hiện không có ai, bot duy trì phát Lofi 24/7';
              btnIcon = <Coffee size={12} />;
              btnClasses = 'border-white/[0.06] bg-white/[0.02] text-outline cursor-not-allowed opacity-60';
            } else if (isLofiMode) {
              btnLabel = 'TIẾP TỤC PHÁT';
              btnTitle = songs.length > 0 ? `Tiếp tục phát ${songs.length} bài hát trong hàng chờ` : 'Phát lại bài hát gần nhất';
              btnIcon = <Play size={11} fill="currentColor" />;
              btnClasses = 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15';
            }

            return (
              <button
                type="button"
                onClick={() => {
                  if (isSwitching) return;
                  if (isRoomEmpty) {
                    onAction('notifyEmptyRoom');
                    return;
                  }
                  onAction('toggleLofiMode');
                }}
                disabled={isSwitching}
                title={btnTitle}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-mono font-bold tracking-wider transition-colors ${btnClasses}`}
              >
                {isSwitching ? <Loader2 size={11} className="animate-spin" /> : btnIcon}
                <span>{isSwitching ? 'ĐANG CHUYỂN...' : btnLabel}</span>
              </button>
            );
          })()}

          {selectedIndices.size > 0 ? (
            <button
              type="button"
              onClick={handleDeleteSelected}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/15 text-red-400 border border-red-500/30 text-xs font-semibold hover:bg-red-500/20 transition-colors"
            >
              <Trash2 size={12} />
              <span>Xóa ({selectedIndices.size})</span>
            </button>
          ) : songs.length > 0 ? (
            <button
              type="button"
              onClick={() => setShowClearModal(true)}
              className="flex items-center gap-1 px-2 py-1 text-red-400 hover:text-red-300 text-xs font-semibold transition-colors"
            >
              <Trash2 size={12} />
              <span>Xóa Hết</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* ── Queue Song List ─────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-1">
        {songs.length === 0 ? (
          <div className="py-16 px-4 text-center text-outline">
            <Music2 size={32} className="mx-auto mb-3 opacity-40 text-on-surface-variant" />
            <p className="font-semibold text-on-surface text-sm mb-1">Hàng chờ đang trống</p>
            <p className="text-xs text-outline mb-4">Chuyển sang tab <b>Khám Phá</b> để thêm bài hát hoặc bật nhạc nền Lofi thư giãn.</p>
            {isLofiMode ? (
              <div className="flex flex-col items-center gap-2.5">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary-container/10 border border-primary-container/25 text-primary-container font-mono text-xs font-bold">
                  <Coffee size={14} />
                  <span>ĐANG PHÁT LOFI THƯ GIÃN 24/7</span>
                </div>
                <button
                  type="button"
                  onClick={() => onAction('toggleLofiMode')}
                  disabled={pendingAction === 'toggleLofiMode'}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-colors"
                >
                  <Play size={12} fill="currentColor" />
                  <span>Tiếp Tục Phát Nhạc</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onAction('toggleLofiMode')}
                disabled={pendingAction === 'toggleLofiMode'}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-container/10 border border-primary-container/25 text-primary-container text-xs font-semibold hover:bg-primary-container/15 transition-colors"
              >
                <Coffee size={13} />
                <span>Bật Nhạc Lofi 24/7</span>
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {songs.map((song, idx) => {
              const isSelected = selectedIndices.has(idx);
              const isDragging = draggedIndex === idx;
              const isDragOver = dragOverIndex === idx;
              const isMenuOpen = activeMenuIdx === idx;
              const displayIndex = String(idx + 1).padStart(2, '0');

              return (
                <div
                  key={idx}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                  onClick={(e) => toggleSelect(idx, e)}
                  className={`group flex items-center gap-2.5 p-2 rounded-xl border transition-all select-none cursor-pointer ${
                    isSelected
                      ? 'bg-primary-container/10 border-primary-container/30'
                      : isDragOver
                      ? 'bg-surface-container border-primary-container'
                      : 'bg-surface-container-low hover:bg-surface-container border-white/[0.05] hover:border-white/[0.09]'
                  } ${isDragging ? 'opacity-40' : 'opacity-100'}`}
                >
                  {/* Drag Grip */}
                  <div className="text-zinc-600 hover:text-on-surface-variant cursor-grab flex items-center" title="Kéo thả đổi vị trí">
                    <GripVertical size={14} />
                  </div>

                  {/* Checkbox */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleSelect(idx, e); }}
                    className="text-outline hover:text-on-surface p-0 flex items-center"
                  >
                    {isSelected ? <CheckSquare size={15} className="text-primary-container" /> : <Square size={15} />}
                  </button>

                  {/* Index badge */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); openJumpModal(song, idx); }}
                    title="Nhấn để đổi vị trí"
                    className="w-5 text-center font-mono text-[11px] font-semibold text-outline group-hover:text-on-surface tabular-nums flex-shrink-0"
                  >
                    {displayIndex}
                  </button>

                  {/* Thumbnail */}
                  <img
                    src={song.thumbnail || DEFAULT_TRACK_THUMB}
                    alt=""
                    onError={(e) => { e.currentTarget.src = DEFAULT_TRACK_THUMB; }}
                    className="w-9 h-9 rounded-md object-cover flex-shrink-0 border border-white/[0.06] bg-surface-container"
                  />

                  {/* Song Title & Artist */}
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-xs font-medium text-on-surface group-hover:text-white truncate m-0" title={song.title}>
                      {song.title}
                    </p>
                    <p className="text-[11px] text-outline truncate m-0 mt-0.5" title={`${song.artist || getSourceLabel(song)} • ${song.duration || ''}`}>
                      <span>{song.artist && song.artist !== 'Unknown' ? song.artist : getSourceLabel(song)}</span>
                      {song.duration ? ` • ${song.duration}` : ''}
                      {song.requestedBy ? ` • 👤 ${formatRequesterName(song.requestedBy)}` : ''}
                    </p>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    {/* Quick Play */}
                    <button
                      type="button"
                      onClick={() => onAction('playNow', idx)}
                      disabled={Boolean(pendingAction)}
                      className="w-7 h-7 rounded-lg border border-white/[0.06] bg-surface-container hover:bg-[#222226] text-on-surface hover:text-white flex items-center justify-center transition-colors"
                      title={pendingAction === 'playNow' ? 'Đang nạp bài...' : 'Phát ngay bài này'}
                    >
                      {pendingAction === 'playNow' ? (
                        <Loader2 size={12} className="animate-spin text-primary-container" />
                      ) : (
                        <Play size={12} fill="currentColor" className="ml-0.5" />
                      )}
                    </button>

                    {/* More Menu Popover */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => handleToggleMenu(e, idx)}
                        className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors ${
                          isMenuOpen
                            ? 'border-primary-container/40 bg-primary-container/10 text-primary-container'
                            : 'border-white/[0.06] bg-surface-container hover:bg-[#222226] text-on-surface-variant hover:text-on-surface'
                        }`}
                        title="Tùy chọn khác..."
                      >
                        <MoreHorizontal size={14} />
                      </button>

                      {isMenuOpen && (
                        <div
                          className={`absolute right-0 z-50 w-44 rounded-xl bg-surface-container-low border border-white/[0.08] shadow-2xl p-1 flex flex-col gap-0.5 animate-in fade-in duration-150 ${
                            menuPlacement === 'top' ? 'bottom-8' : 'top-8'
                          }`}
                        >
                          <button
                            type="button"
                            disabled={Boolean(pendingAction)}
                            onClick={() => { onAction('playNow', idx); setActiveMenuIdx(null); }}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-on-surface hover:bg-[#1E1E22] text-left w-full transition-colors"
                          >
                            <Play size={12} fill="currentColor" className="text-on-surface-variant" />
                            <span>Phát ngay</span>
                          </button>

                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => handleMoveToTop(idx)}
                              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-primary-container hover:bg-[#1E1E22] text-left w-full transition-colors"
                            >
                              <ArrowUpToLine size={13} />
                              <span>Đưa lên đầu (#1)</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => openJumpModal(song, idx)}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-on-surface hover:bg-[#1E1E22] text-left w-full transition-colors"
                          >
                            <ArrowUpDown size={13} className="text-on-surface-variant" />
                            <span>Chuyển vị trí...</span>
                          </button>

                          <div className="h-px bg-white/[0.06] my-1" />

                          <button
                            type="button"
                            onClick={() => { onAction('remove', idx); setActiveMenuIdx(null); }}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-500/10 text-left w-full transition-colors"
                          >
                            <Trash2 size={13} />
                            <span>Xóa khỏi hàng chờ</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
