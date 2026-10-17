import {
  Trash2,
  Play,
  GripVertical,
  MoreVertical,
  X,
  Sparkles,
  Radio,
  Loader2,
  Coffee,
  RotateCcw,
  Check,
  CheckSquare,
  Square
} from 'lucide-react';
import { DEFAULT_TRACK_THUMB } from '../config';

function getTrackThumb(track) {
  if (track?.thumbnail && !track.thumbnail.includes('yt3.ggpht.com') && !track.thumbnail.includes('default_user')) {
    return track.thumbnail;
  }
  if (track?.url) {
    const match = track.url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (match && match[1]) {
      return `https://i.ytimg.com/vi/${match[1]}/hqdefault.jpg`;
    }
  }
  return DEFAULT_TRACK_THUMB;
}

function formatRequesterName(name) {
  if (!name) return 'Thành viên';
  if (/^<@!?\d+>$/.test(name) || /^\d{17,20}$/.test(name)) return 'Discord User';
  return name;
}

export default function QueueManager({ queue, onAction, pendingAction, player }) {
  const songs = queue || [];
  const isLofiMode = Boolean(
    player?.current && (player?.current?.is247 || player?.current?.requestedBy === 'Auto (24/7)')
  );
  const isSwitchingTo247 = pendingAction === 'switchTo247';

  const [selectedIndices, setSelectedIndices] = useState(new Set());
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [jumpModalData, setJumpModalData] = useState(null);
  const [targetPosition, setTargetPosition] = useState('1');
  const [activeMenuIdx, setActiveMenuIdx] = useState(null);

  const [showClearModal, setShowClearModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);

  const lastClickedIndexRef = useRef(null);
  const listContainerRef = useRef(null);

  // Đóng menu context khi click ra ngoài
  useEffect(() => {
    const close = () => setActiveMenuIdx(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  // Drag and Drop
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

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e, toIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === toIndex) {
      handleDragEnd();
      return;
    }
    onAction('move', { from: draggedIndex, to: toIndex });
    handleDragEnd();
  };

  // Selection
  const toggleSelect = (index, e) => {
    e?.stopPropagation();
    const newSelected = new Set(selectedIndices);
    if (e?.shiftKey && lastClickedIndexRef.current !== null) {
      const start = Math.min(lastClickedIndexRef.current, index);
      const end = Math.max(lastClickedIndexRef.current, index);
      for (let i = start; i <= end; i++) {
        newSelected.add(i);
      }
    } else {
      if (newSelected.has(index)) {
        newSelected.delete(index);
      } else {
        newSelected.add(index);
      }
      lastClickedIndexRef.current = index;
    }
    setSelectedIndices(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIndices.size === songs.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(songs.map((_, i) => i)));
    }
  };

  const handleRemoveSingle = (index, e) => {
    e?.stopPropagation();
    onAction('remove', index);
  };

  const handleRemoveBatch = () => {
    if (selectedIndices.size === 0) return;
    const indices = Array.from(selectedIndices).sort((a, b) => b - a);
    onAction('removeBatch', indices);
    setSelectedIndices(new Set());
    setShowBatchModal(false);
  };

  const handleClearQueue = () => {
    onAction('clear');
    setSelectedIndices(new Set());
    setShowClearModal(false);
  };

  const handleMoveToTop = (index, e) => {
    e?.stopPropagation();
    if (index === 0) return;
    onAction('move', { from: index, to: 0 });
    setActiveMenuIdx(null);
  };

  const handlePlayNow = (index, e) => {
    e?.stopPropagation();
    onAction('playNow', index);
    setActiveMenuIdx(null);
  };

  const handleJumpSubmit = (e) => {
    e.preventDefault();
    if (!jumpModalData) return;
    const targetIdx = parseInt(targetPosition, 10) - 1;
    if (isNaN(targetIdx) || targetIdx < 0 || targetIdx >= songs.length) return;
    onAction('move', { from: jumpModalData.index, to: targetIdx });
    setJumpModalData(null);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden select-none">

      {/* ── 1. HEADER CONTROLS HÀNG CHỜ ───────────────────────────────────── */}
      <div className="flex items-center justify-between pb-2 shrink-0 border-b border-white/5 mb-2 gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSelectAll}
            disabled={songs.length === 0}
            className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface transition-colors disabled:opacity-40"
          >
            <div
              className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                selectedIndices.size > 0 && selectedIndices.size === songs.length
                  ? 'bg-primary-container border-primary-container text-on-primary shadow-sm'
                  : selectedIndices.size > 0
                  ? 'bg-primary-container/40 border-primary-container text-on-primary'
                  : 'border-outline/40 bg-surface-container-highest/40'
              }`}
            >
              {selectedIndices.size > 0 && <Check size={11} strokeWidth={3} />}
            </div>
            <span className={selectedIndices.size > 0 ? 'text-primary-container' : 'text-on-surface-variant'}>
              {selectedIndices.size > 0 ? `Đã chọn (${selectedIndices.size})` : `Tất Cả (${songs.length})`}
            </span>
          </button>

          {selectedIndices.size > 0 && (
            <button
              onClick={() => setShowBatchModal(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary-container/40 text-secondary hover:bg-secondary-container/60 text-xs font-semibold transition-colors"
            >
              <Trash2 size={13} />
              <span>Xóa ({selectedIndices.size})</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {songs.length > 0 && (
            <button
              onClick={() => setShowClearModal(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container hover:bg-secondary-container/40 hover:text-secondary text-xs text-outline transition-colors"
            >
              <Trash2 size={13} />
              <span>Xóa Hết</span>
            </button>
          )}

          <span className="font-mono text-[10px] text-outline hidden sm:inline-block">
            Kéo thả để đổi vị trí
          </span>
        </div>
      </div>

      {/* ── 2. DANH SÁCH BÀI HÁT TRONG HÀNG CHỜ ─────────────────────────────── */}
      <div
        ref={listContainerRef}
        className="flex-1 min-h-0 overflow-y-auto custom-scroll pr-1 flex flex-col gap-1.5"
      >
        {songs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-surface-container flex items-center justify-center text-outline border border-white/5">
              <span className="material-symbols-outlined text-2xl">queue_music</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-on-surface">Hàng chờ đang trống</h3>
              <p className="text-xs text-outline mt-1 max-w-xs">
                Chuyển sang tab Khám Phá để thêm bài hát hoặc bật nhạc Lofi 24/7 để nghe thư giãn.
              </p>
            </div>
            <button
              onClick={() => onAction('toggleLofiMode')}
              disabled={Boolean(pendingAction)}
              className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-white/5 text-primary-container text-xs font-semibold flex items-center gap-2 transition-all mt-1"
            >
              <Coffee size={15} />
              <span>Bật Nhạc Lofi 24/7 Thư Giãn</span>
            </button>
          </div>
        ) : (
          songs.map((song, idx) => {
            const isSelected = selectedIndices.has(idx);
            const isDragging = draggedIndex === idx;
            const isDragOver = dragOverIndex === idx;
            const isNext = idx === 0;

            return (
              <div
                key={song.url ? `${song.url}-${idx}` : idx}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                onDrop={(e) => handleDrop(e, idx)}
                className={`queue-item group relative flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all border shadow-sm ${
                  isDragging
                    ? 'opacity-40 bg-surface-container-high border-dashed border-primary-container'
                    : isDragOver
                    ? 'border-t-2 border-primary-container bg-surface-container'
                    : isSelected
                    ? 'bg-surface-container border-primary-container/40'
                    : 'bg-surface-container-low hover:bg-surface-container border-transparent hover:border-outline-variant/30'
                }`}
              >
                {/* Drag Indicator */}
                <div className="flex items-center cursor-grab active:cursor-grabbing text-outline group-hover:text-on-surface shrink-0">
                  <GripVertical size={16} />
                </div>

                {/* Custom Checkbox */}
                <button
                  type="button"
                  onClick={(e) => toggleSelect(idx, e)}
                  className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                    isSelected
                      ? 'bg-primary-container border-primary-container text-on-primary shadow-sm'
                      : 'border-outline/40 hover:border-primary-container/60 bg-surface-container-highest/40'
                  }`}
                  aria-label={isSelected ? 'Bỏ chọn bài hát' : 'Chọn bài hát'}
                >
                  {isSelected && <Check size={11} strokeWidth={3} />}
                </button>

                {/* Thứ tự bài #01, #02... */}
                <button
                  type="button"
                  onClick={() => {
                    setJumpModalData({ song, index: idx });
                    setTargetPosition(String(idx + 1));
                  }}
                  className={`font-mono text-[11px] font-semibold rounded px-1.5 py-0.5 shrink-0 w-7 text-center transition-colors ${
                    isNext
                      ? 'text-primary-container bg-primary-container/15'
                      : 'text-outline hover:text-primary-container hover:bg-surface-container-high'
                  }`}
                  title="Nhấp để chuyển vị trí bài hát"
                >
                  #{idx < 9 ? `0${idx + 1}` : idx + 1}
                </button>

                {/* Ảnh bìa bài hát */}
                <div className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-surface-container-high shadow border border-white/5">
                  <img
                    src={getTrackThumb(song)}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/default-playlist.jpg'; }}
                  />
                </div>

                {/* Thông tin bài hát */}
                <div className="flex flex-col min-w-0 flex-1 px-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-on-surface truncate group-hover:text-primary-container transition-colors">
                      {song.title}
                    </span>
                    {isNext && (
                      <span className="px-1.5 py-0.2 rounded bg-primary-container/20 text-primary-container font-mono text-[9px] uppercase tracking-wider shrink-0 font-bold">
                        Kế Tiếp
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-outline font-mono truncate">
                    <span className="truncate text-on-surface-variant font-medium">
                      {song.artist || 'Anna Music'}
                    </span>
                    <span>•</span>
                    <span className="shrink-0">{song.duration || '0:00'}</span>
                    <span>•</span>
                    <span className="truncate max-w-[90px] text-on-surface-variant">
                      @{formatRequesterName(song.requestedBy)}
                    </span>
                  </div>
                </div>

                {/* Actions: Phát ngay & More menu */}
                <div className="flex items-center gap-1 shrink-0 relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => handlePlayNow(idx, e)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-outline hover:text-primary-container hover:bg-surface-container-high transition-colors"
                    title="Phát ngay bài này"
                  >
                    <Play size={16} fill="currentColor" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuIdx(activeMenuIdx === idx ? null : idx);
                    }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors"
                    title="Tùy chọn"
                  >
                    <MoreVertical size={16} />
                  </button>

                  {/* Context Dropdown Menu */}
                  {activeMenuIdx === idx && (
                    <div className="absolute right-0 top-8 w-44 bg-surface-container-high border border-outline-variant/40 rounded-xl shadow-2xl p-1 z-30 flex flex-col gap-0.5 text-xs text-on-surface">
                      <button
                        onClick={(e) => handlePlayNow(idx, e)}
                        className="flex items-center gap-2 px-2.5 py-1.5 text-left rounded-lg hover:bg-surface-container transition-colors w-full"
                      >
                        <Play size={14} className="text-tertiary" />
                        <span>Phát ngay</span>
                      </button>
                      <button
                        onClick={(e) => handleMoveToTop(idx, e)}
                        className="flex items-center gap-2 px-2.5 py-1.5 text-left rounded-lg hover:bg-surface-container transition-colors w-full"
                      >
                        <span className="material-symbols-outlined text-[15px] text-primary-container">vertical_align_top</span>
                        <span>Đưa lên đầu (#1)</span>
                      </button>
                      <button
                        onClick={() => {
                          setJumpModalData({ song, index: idx });
                          setTargetPosition(String(idx + 1));
                          setActiveMenuIdx(null);
                        }}
                        className="flex items-center gap-2 px-2.5 py-1.5 text-left rounded-lg hover:bg-surface-container transition-colors w-full"
                      >
                        <span className="material-symbols-outlined text-[15px] text-primary-container">swap_vert</span>
                        <span>Chuyển vị trí</span>
                      </button>
                      <div className="h-[1px] bg-white/10 my-0.5"></div>
                      <button
                        onClick={(e) => handleRemoveSingle(idx, e)}
                        className="flex items-center gap-2 px-2.5 py-1.5 text-left rounded-lg hover:bg-secondary-container/40 text-secondary transition-colors w-full"
                      >
                        <Trash2 size={14} />
                        <span>Xóa khỏi hàng chờ</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── 3. MODALS (Xác nhận xóa & Chuyển vị trí) ───────────────────────── */}
      {/* Modal Chuyển Vị Trí Bài Hát */}
      {jumpModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-surface-container-low border border-white/10 rounded-2xl p-5 shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-on-surface">Chuyển vị trí bài hát</h3>
              <button
                onClick={() => setJumpModalData(null)}
                className="text-outline hover:text-on-surface p-1"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-on-surface-variant truncate">
              "{jumpModalData.song?.title}"
            </p>
            <form onSubmit={handleJumpSubmit} className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] text-outline uppercase font-mono">
                  Vị trí mong muốn (1 - {songs.length}):
                </label>
                <input
                  type="number"
                  min={1}
                  max={songs.length}
                  value={targetPosition}
                  onChange={(e) => setTargetPosition(e.target.value)}
                  autoFocus
                  className="w-full mt-1 px-3 py-2 bg-surface-container-lowest text-on-surface font-mono rounded-lg border border-white/10 focus:border-primary-container outline-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setJumpModalData(null)}
                  className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs text-outline"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-bold text-xs shadow"
                >
                  Xác nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xác Nhận Xóa Hàng Loạt */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-surface-container-low border border-white/10 rounded-2xl p-5 shadow-2xl flex flex-col gap-3 text-center">
            <div className="w-10 h-10 rounded-full bg-secondary-container/40 text-secondary flex items-center justify-center mx-auto">
              <Trash2 size={20} />
            </div>
            <h3 className="text-sm font-bold text-on-surface">Xóa các bài đã chọn?</h3>
            <p className="text-xs text-on-surface-variant">
              Bạn có chắc chắn muốn xóa {selectedIndices.size} bài hát khỏi hàng chờ không?
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setShowBatchModal(false)}
                className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs text-outline font-medium"
              >
                Hủy
              </button>
              <button
                onClick={handleRemoveBatch}
                className="px-4 py-2 rounded-lg bg-secondary text-white hover:bg-secondary/90 text-xs font-bold shadow"
              >
                Xóa ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xác Nhận Xóa Hết Hàng Chờ */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-surface-container-low border border-white/10 rounded-2xl p-5 shadow-2xl flex flex-col gap-3 text-center">
            <div className="w-10 h-10 rounded-full bg-secondary-container/40 text-secondary flex items-center justify-center mx-auto">
              <Trash2 size={20} />
            </div>
            <h3 className="text-sm font-bold text-on-surface">Xóa toàn bộ hàng chờ?</h3>
            <p className="text-xs text-on-surface-variant">
              Toàn bộ {songs.length} bài hát trong hàng chờ sẽ bị xóa sạch khỏi phòng phát.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setShowClearModal(false)}
                className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs text-outline font-medium"
              >
                Hủy
              </button>
              <button
                onClick={handleClearQueue}
                className="px-4 py-2 rounded-lg bg-secondary text-white hover:bg-secondary/90 text-xs font-bold shadow"
              >
                Xóa sạch
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
