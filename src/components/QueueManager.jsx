import React, { useState, useRef, useEffect } from 'react';
import {
  ListOrdered,
  Trash2,
  Music2,
  Clock,
  CheckSquare,
  Square,
  Play,
  ChevronUp,
  ChevronDown,
  GripVertical,
  ArrowUpToLine,
  ArrowUpDown,
  MoreHorizontal,
  X,
  Sparkles
} from 'lucide-react';

export default function QueueManager({ queue, onAction }) {
  const songs = queue || [];
  const [selectedIndices, setSelectedIndices] = useState(new Set());
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [jumpModalData, setJumpModalData] = useState(null); // { song, index }
  const [targetPosition, setTargetPosition] = useState('1');
  const [activeMenuIdx, setActiveMenuIdx] = useState(null);

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

  // Multi-select helpers
  const toggleSelect = (index) => {
    const newSet = new Set(selectedIndices);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedIndices(newSet);
  };

  const toggleSelectAll = () => {
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
    setShowBatchModal(false);
  };

  const confirmClearAll = () => {
    onAction('clear');
    setSelectedIndices(new Set());
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
    <div ref={listContainerRef} style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minHeight: 0 }}>
      {/* ── Modal Xác Nhận Xóa Hết ──────────────────────── */}
      {showClearModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
          <div style={{ width: '100%', maxWidth: 360, borderRadius: 16, background: 'var(--paper)', border: '1px solid var(--border)', padding: 22, boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
            <h4 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>Xóa toàn bộ hàng chờ?</h4>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
              Bạn có chắc chắn muốn xóa tất cả <b style={{ color: 'var(--ink)' }}>{songs.length} bài hát</b> trong hàng chờ không?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setShowClearModal(false)}
                className="ghost-button"
                style={{ height: 38, padding: '0 16px', borderRadius: 8, fontSize: 12 }}
              >
                Hủy
              </button>
              <button
                onClick={confirmClearAll}
                style={{ height: 38, padding: '0 16px', borderRadius: 8, fontSize: 12, background: 'var(--coral)', color: '#fff', border: 0, fontWeight: 700, cursor: 'pointer' }}
              >
                Xóa Hết
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Xác Nhận Xóa Bài Đã Chọn ──────────────── */}
      {showBatchModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
          <div style={{ width: '100%', maxWidth: 360, borderRadius: 16, background: 'var(--paper)', border: '1px solid var(--border)', padding: 22, boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
            <h4 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>Xóa {selectedIndices.size} bài đã chọn?</h4>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
              Các bài hát được đánh dấu sẽ bị xóa khỏi hàng chờ.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setShowBatchModal(false)}
                className="ghost-button"
                style={{ height: 38, padding: '0 16px', borderRadius: 8, fontSize: 12 }}
              >
                Hủy
              </button>
              <button
                onClick={confirmBatchDelete}
                style={{ height: 38, padding: '0 16px', borderRadius: 8, fontSize: 12, background: 'var(--coral)', color: '#fff', border: 0, fontWeight: 700, cursor: 'pointer' }}
              >
                Xác Nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Chuyển Vị Trí Nhanh (Jump Position) ───── */}
      {jumpModalData && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
          <div style={{ width: '100%', maxWidth: 380, borderRadius: 16, background: 'var(--paper)', border: '1px solid var(--border)', padding: 22, boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>Chuyển Vị Trí Bài Hát</h4>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--muted)' }}>Hiện tại: <b style={{ color: 'var(--yellow)' }}>#{jumpModalData.index + 1}</b></p>
              </div>
              <button onClick={() => setJumpModalData(null)} style={{ border: 0, background: 'transparent', color: 'var(--muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, background: 'var(--soft)', marginBottom: 16 }}>
              <img src={jumpModalData.song.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100'} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{jumpModalData.song.title}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{jumpModalData.song.artist || 'YouTube'}</p>
              </div>
            </div>

            <form onSubmit={handleConfirmJump}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>
                Nhập số thứ tự muốn chuyển đến (1 - {songs.length}):
              </label>
              <input
                type="number"
                min={1}
                max={songs.length}
                value={targetPosition}
                onChange={(e) => setTargetPosition(e.target.value)}
                style={{ width: '100%', height: 42, borderRadius: 10, border: '1px solid var(--border)', background: '#141619', color: '#fff', textAlign: 'center', fontSize: 16, fontFamily: '"DM Mono", monospace', fontWeight: 700, outline: 'none', marginBottom: 12 }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                <button type="button" onClick={() => setTargetPosition('1')} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--soft)', color: 'var(--yellow)', fontSize: 11, cursor: 'pointer' }}>#1 (Kế tiếp)</button>
                {songs.length >= 2 && <button type="button" onClick={() => setTargetPosition('2')} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--soft)', color: 'var(--ink)', fontSize: 11, cursor: 'pointer' }}>#2</button>}
                {songs.length >= 5 && <button type="button" onClick={() => setTargetPosition('5')} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--soft)', color: 'var(--ink)', fontSize: 11, cursor: 'pointer' }}>#5</button>}
                <button type="button" onClick={() => setTargetPosition(String(songs.length))} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--soft)', color: 'var(--muted)', fontSize: 11, cursor: 'pointer' }}>Cuối (#{songs.length})</button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setJumpModalData(null)} className="ghost-button" style={{ height: 38, padding: '0 16px', borderRadius: 8, fontSize: 12 }}>Hủy</button>
                <button type="submit" className="primary-button" style={{ height: 38, padding: '0 16px', borderRadius: 8, fontSize: 12, width: 'auto' }}>Xác Nhận</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Top Header Bar ──────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 12, background: 'var(--paper)', border: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {songs.length > 0 && (
            <button
              onClick={toggleSelectAll}
              style={{ display: 'flex', alignItems: 'center', gap: 6, border: 0, background: 'transparent', color: 'var(--muted)', fontSize: 12, cursor: 'pointer', padding: 0 }}
            >
              {isAllSelected ? <CheckSquare size={16} style={{ color: 'var(--yellow)' }} /> : <Square size={16} />}
              <span>{isAllSelected ? 'Bỏ chọn' : 'Chọn tất cả'}</span>
            </button>
          )}
          <span style={{ fontFamily: '"DM Mono", monospace', fontSize: 11, color: 'var(--muted)' }}>
            {songs.length} bài {totalSeconds > 0 ? `• ${formatTotalTime(totalSeconds)}` : ''}
          </span>
        </div>

        <div>
          {selectedIndices.size > 0 ? (
            <button
              onClick={handleDeleteSelected}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, background: 'rgba(239,120,100,0.15)', color: 'var(--coral)', border: '1px solid rgba(239,120,100,0.3)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
            >
              <Trash2 size={13} />
              <span>Xóa ({selectedIndices.size})</span>
            </button>
          ) : songs.length > 0 ? (
            <button
              onClick={() => setShowClearModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, border: 0, background: 'transparent', color: 'var(--coral)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
            >
              <Trash2 size={13} />
              <span>Xóa Hết</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* ── Queue Song List ─────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingRight: 2 }}>
        {songs.length === 0 ? (
          <div style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--muted)' }}>
            <Music2 size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <p style={{ fontWeight: 500, color: 'var(--ink)', fontSize: 15, margin: '0 0 4px' }}>Hàng chờ đang trống</p>
            <p style={{ fontSize: 12, margin: 0 }}>Chuyển sang tab <b>Khám Phá</b> để thêm bài hát vào hàng chờ nhé!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {songs.map((song, idx) => {
              const isSelected = selectedIndices.has(idx);
              const isDragging = draggedIndex === idx;
              const isDragOver = dragOverIndex === idx;
              const isMenuOpen = activeMenuIdx === idx;

              return (
                <div
                  key={idx}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                  onClick={() => toggleSelect(idx)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                    borderRadius: 10, background: isSelected ? 'rgba(232,201,119,0.08)' : 'var(--paper)',
                    border: `1px solid ${isSelected ? 'rgba(232,201,119,0.3)' : isDragOver ? 'var(--yellow)' : 'var(--border)'}`,
                    opacity: isDragging ? 0.4 : 1,
                    cursor: 'pointer', transition: 'border-color .15s, background .15s',
                    position: 'relative'
                  }}
                >
                  {/* Drag Grip */}
                  <div style={{ color: 'var(--muted)', cursor: 'grab', display: 'flex', alignItems: 'center' }} title="Kéo thả đổi vị trí">
                    <GripVertical size={14} />
                  </div>

                  {/* Checkbox */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleSelect(idx); }}
                    style={{ border: 0, background: 'transparent', color: isSelected ? 'var(--yellow)' : 'var(--muted)', cursor: 'pointer', padding: 0 }}
                  >
                    {isSelected ? <CheckSquare size={15} /> : <Square size={15} />}
                  </button>

                  {/* Index badge */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); openJumpModal(song, idx); }}
                    title="Nhấn để đổi vị trí"
                    style={{
                      width: 22, height: 22, borderRadius: 6, border: '1px solid var(--border)',
                      background: 'var(--soft)', color: 'var(--muted)', fontSize: 10, fontFamily: '"DM Mono", monospace',
                      fontWeight: 700, display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0
                    }}
                  >
                    {idx + 1}
                  </button>

                  {/* Thumbnail */}
                  <img
                    src={song.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100'}
                    alt=""
                    style={{ width: 38, height: 38, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                  />

                  {/* Song Title & Artist (Spans full remaining space with clean tooltip) */}
                  <div style={{ minWidth: 0, flex: 1, paddingRight: 8 }}>
                    <p
                      title={song.title}
                      style={{
                        margin: 0, fontSize: 12.5, fontWeight: 600, color: 'var(--ink)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                      }}
                    >
                      {song.title}
                    </p>
                    <p
                      title={`${song.artist || 'YouTube'} • ${song.duration || ''} • Yêu cầu bởi: ${song.requestedBy || 'User'}`}
                      style={{
                        margin: '2px 0 0', fontSize: 11, color: 'var(--muted)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                      }}
                    >
                      <span>{song.artist || 'YouTube Music'}</span>
                      {song.duration ? ` • ${song.duration}` : ''}
                      {song.requestedBy ? ` • 👤 ${song.requestedBy}` : ''}
                    </p>
                  </div>

                  {/* Right Actions: Quick Play + Dropdown More Menu */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                    {/* Quick Play */}
                    <button
                      type="button"
                      onClick={() => onAction('playNow', idx)}
                      style={{
                        width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)',
                        background: 'var(--soft)', color: 'var(--ink)', display: 'grid', placeItems: 'center',
                        cursor: 'pointer'
                      }}
                      title="Phát ngay bài này"
                    >
                      <Play size={13} fill="currentColor" style={{ marginLeft: 1 }} />
                    </button>

                    {/* More Menu Dropdown Toggle */}
                    <div style={{ position: 'relative' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuIdx(isMenuOpen ? null : idx);
                        }}
                        style={{
                          width: 30, height: 30, borderRadius: 8,
                          border: `1px solid ${isMenuOpen ? 'var(--yellow)' : 'var(--border)'}`,
                          background: isMenuOpen ? 'var(--soft)' : 'transparent',
                          color: isMenuOpen ? 'var(--yellow)' : 'var(--muted)',
                          display: 'grid', placeItems: 'center', cursor: 'pointer'
                        }}
                        title="Tùy chọn khác..."
                      >
                        <MoreHorizontal size={15} />
                      </button>

                      {/* Dropdown Popover */}
                      {isMenuOpen && (
                        <div
                          style={{
                            position: 'absolute', right: 0, top: 36, zIndex: 50,
                            width: 170, borderRadius: 12, background: '#1c1e22',
                            border: '1px solid var(--border)', boxShadow: '0 12px 30px rgba(0,0,0,0.6)',
                            padding: '6px', display: 'flex', flexDirection: 'column', gap: 2,
                            animation: 'tabFadeIn 0.15s ease'
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => { onAction('playNow', idx); setActiveMenuIdx(null); }}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 6, border: 0, background: 'transparent', color: 'var(--ink)', fontSize: 11.5, cursor: 'pointer', textAlign: 'left', width: '100%' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--soft)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <Play size={12} fill="currentColor" />
                            <span>Phát ngay</span>
                          </button>

                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => handleMoveToTop(idx)}
                              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 6, border: 0, background: 'transparent', color: 'var(--yellow)', fontSize: 11.5, cursor: 'pointer', textAlign: 'left', width: '100%' }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--soft)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              <ArrowUpToLine size={13} />
                              <span>Đưa lên đầu (#1)</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => openJumpModal(song, idx)}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 6, border: 0, background: 'transparent', color: 'var(--ink)', fontSize: 11.5, cursor: 'pointer', textAlign: 'left', width: '100%' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--soft)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <ArrowUpDown size={13} />
                            <span>Chuyển vị trí...</span>
                          </button>

                          <div style={{ height: 1, background: 'var(--border)', margin: '3px 0' }} />

                          <button
                            type="button"
                            onClick={() => { onAction('remove', idx); setActiveMenuIdx(null); }}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 6, border: 0, background: 'transparent', color: 'var(--coral)', fontSize: 11.5, cursor: 'pointer', textAlign: 'left', width: '100%' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239,120,100,0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
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
