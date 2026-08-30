import React, { useState } from 'react';
import { ListOrdered, Trash2, Music2, Clock, CheckSquare, Square, Play, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';

export default function QueueManager({ queue, onAction }) {
  const songs = queue || [];
  const [selectedIndices, setSelectedIndices] = useState(new Set());
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Drag and Drop handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      onAction('move', { from: draggedIndex, to: targetIndex });
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Toggle selection for a single track
  const toggleSelect = (idx) => {
    setSelectedIndices(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  // Select / Deselect All
  const toggleSelectAll = () => {
    if (selectedIndices.size === songs.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(songs.map((_, idx) => idx)));
    }
  };

  // Delete selected tracks
  const handleDeleteSelected = () => {
    if (selectedIndices.size === 0) return;
    const count = selectedIndices.size;
    if (confirm(`Bạn có chắc chắn muốn xóa ${count} bài hát đã chọn khỏi hàng chờ?`)) {
      onAction('removeBatch', Array.from(selectedIndices));
      setSelectedIndices(new Set());
    }
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
    <div className="flex-1 flex flex-col gap-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between bg-anna-surface px-4 py-2.5 rounded-xl border border-anna-border">
        <div className="flex items-center gap-3">
          {songs.length > 0 && (
            <button
              onClick={toggleSelectAll}
              title={isAllSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
              className="p-1 text-anna-muted hover:text-white transition flex items-center gap-1.5 focus-visible:outline-none"
            >
              {isAllSelected ? (
                <CheckSquare className="w-4 h-4 text-anna-accent" />
              ) : selectedIndices.size > 0 ? (
                <CheckSquare className="w-4 h-4 text-anna-accent/70" />
              ) : (
                <Square className="w-4 h-4 text-anna-muted" />
              )}
            </button>
          )}

          <div className="flex items-center gap-1.5">
            <ListOrdered className="w-4 h-4 text-anna-accent" aria-hidden="true" />
            <span className="text-xs font-bold text-white">
              Hàng Chờ ({songs.length}/200 bài)
            </span>
          </div>

          {songs.length > 0 && totalSeconds > 0 && (
            <span className="hidden sm:flex items-center gap-1 text-[11px] text-anna-muted font-mono bg-anna-card px-2 py-0.5 rounded-full border border-anna-border/50">
              <Clock className="w-3 h-3 text-anna-accent" aria-hidden="true" />
              <span>{formatTotalTime(totalSeconds)}</span>
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {selectedIndices.size > 0 ? (
            <button
              onClick={handleDeleteSelected}
              className="text-xs bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/40 font-bold flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition shadow-sm active:scale-95 animate-in fade-in"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Xóa ({selectedIndices.size})</span>
            </button>
          ) : songs.length > 0 ? (
            <button
              onClick={() => {
                if (confirm('Bạn có chắc chắn muốn xóa toàn bộ bài hát trong hàng chờ?')) {
                  onAction('stop');
                }
              }}
              aria-label="Xóa toàn bộ bài hát trong hàng chờ"
              className="text-xs text-anna-red hover:underline font-semibold flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-anna-red focus-visible:outline-none rounded-lg px-2 py-1 transition"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Xóa Hết</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Queue List */}
      <div className="bg-anna-surface border border-anna-border/80 rounded-2xl p-4 flex-1 min-h-[360px] max-h-[500px] overflow-y-auto flex flex-col gap-2">
        {songs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-anna-muted">
            <div className="w-12 h-12 rounded-2xl bg-anna-card border border-anna-border flex items-center justify-center mb-3 shadow-inner">
              <Music2 className="w-6 h-6 text-anna-muted" aria-hidden="true" />
            </div>
            <p className="text-sm font-semibold text-white">Hàng chờ đang trống</p>
            <p className="text-xs text-anna-muted mt-1">
              Hãy chuyển qua tab <b>Live Search</b> để thêm bài hát vào hàng chờ nhé!
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {songs.map((song, idx) => {
              const isSelected = selectedIndices.has(idx);
              const isDragging = draggedIndex === idx;
              const isDragOver = dragOverIndex === idx;

              return (
                <div
                  key={idx}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                  onClick={() => toggleSelect(idx)}
                  className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border transition group cursor-pointer select-none ${
                    isDragging
                      ? 'opacity-40 scale-[0.98] border-dashed border-anna-accent bg-anna-accent/10'
                      : isDragOver
                      ? 'border-t-2 border-t-anna-accent bg-anna-accent/20 shadow-md scale-[1.01]'
                      : isSelected
                      ? 'bg-anna-accent/15 border-anna-accent/50 shadow-sm'
                      : 'bg-anna-card hover:bg-anna-hover border-anna-border/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Drag Handle */}
                    <div
                      className="cursor-grab active:cursor-grabbing text-anna-muted group-hover:text-white p-0.5"
                      title="Kéo thả để đổi thứ tự bài hát"
                    >
                      <GripVertical className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                    </div>

                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(idx);
                      }}
                      className="text-anna-muted hover:text-white p-0.5"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-anna-accent" />
                      ) : (
                        <Square className="w-4 h-4 text-anna-muted group-hover:text-anna-text" />
                      )}
                    </button>

                    <span className="w-4 text-center text-xs font-mono font-bold text-anna-muted">
                      {idx + 1}
                    </span>
                    <img
                      src={song.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100'}
                      alt={`Ảnh bìa ${song.title}`}
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{song.title}</p>
                      <p className="text-[11px] text-anna-muted flex items-center gap-1.5 mt-0.5">
                        <span>{song.artist || 'YouTube'}</span>
                        <span>•</span>
                        <span className="font-mono">{song.duration}</span>
                        <span>•</span>
                        <span className="text-[10px] text-anna-accent">
                          👤 {song.requestedBy || 'User'}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Play Now Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAction('playNow', idx);
                      }}
                      aria-label={`Phát ngay bài ${song.title}`}
                      className="p-1.5 rounded-lg text-anna-muted hover:text-white hover:bg-anna-accent/30 transition opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                      title="Phát ngay bài này"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>

                    {/* Move Up */}
                    {idx > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAction('move', { from: idx, to: idx - 1 });
                        }}
                        className="p-1 rounded-lg text-anna-muted hover:text-white hover:bg-white/10 transition opacity-0 group-hover:opacity-100"
                        title="Đẩy lên trên"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Move Down */}
                    {idx < songs.length - 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAction('move', { from: idx, to: idx + 1 });
                        }}
                        className="p-1 rounded-lg text-anna-muted hover:text-white hover:bg-white/10 transition opacity-0 group-hover:opacity-100"
                        title="Đẩy xuống dưới"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Delete Single Track */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAction('remove', idx);
                      }}
                      aria-label={`Xóa bài ${song.title} khỏi hàng chờ`}
                      className="p-1.5 rounded-lg text-anna-muted hover:text-anna-red hover:bg-anna-red/10 transition opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-anna-red focus-visible:outline-none"
                      title="Xóa khỏi hàng chờ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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
