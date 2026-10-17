import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

export default function FastTooltip() {
  const [tooltip, setTooltip] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const handleMouseOver = (e) => {
      // Tự động chuyển đổi title sang data-tip và xóa bỏ title để tránh browser hiện 2 tooltip đè nhau
      let curr = e.target;
      while (curr && curr !== document.body && curr !== document.documentElement) {
        if (curr.hasAttribute && curr.hasAttribute('title')) {
          const rawTitle = curr.getAttribute('title');
          if (rawTitle && rawTitle.trim()) {
            curr.setAttribute('data-tip', rawTitle.trim());
          }
          curr.removeAttribute('title');
        }
        curr = curr.parentElement;
      }

      const target = e.target.closest('[data-tip]');
      if (!target) return;

      const text = target.getAttribute('data-tip');
      if (!text || !text.trim()) return;

      clearTimeout(timerRef.current);
      // Hiển thị siêu nhanh chỉ sau 80ms (thay vì 1500ms mặc định của browser)
      timerRef.current = setTimeout(() => {
        const rect = target.getBoundingClientRect();
        const topSpace = rect.top;
        const showBelow = topSpace < 48; // Nếu sát mép trên màn hình thì hiện bên dưới

        setTooltip({
          text,
          x: Math.max(12, Math.min(window.innerWidth - 12, rect.left + rect.width / 2)),
          y: showBelow ? rect.bottom + 8 : rect.top - 8,
          placement: showBelow ? 'bottom' : 'top'
        });
      }, 80);
    };

    const handleMouseOut = (e) => {
      const target = e.target.closest('[data-tip]');
      if (target) {
        clearTimeout(timerRef.current);
        setTooltip(null);
      }
    };

    const handleScroll = () => {
      clearTimeout(timerRef.current);
      setTooltip(null);
    };

    const handleDismiss = () => {
      clearTimeout(timerRef.current);
      setTooltip(null);
    };

    window.addEventListener('mouseover', handleMouseOver, { passive: true });
    window.addEventListener('mouseout', handleMouseOut, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('pointerdown', handleDismiss, { passive: true });

    return () => {
      clearTimeout(timerRef.current);
      window.removeEventListener('mouseover', handleMouseOver);
      window.removeEventListener('mouseout', handleMouseOut);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('pointerdown', handleDismiss);
    };
  }, []);

  if (!tooltip) return null;

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed',
        left: `${tooltip.x}px`,
        top: `${tooltip.y}px`,
        transform: tooltip.placement === 'top' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
        zIndex: 9999999,
        pointerEvents: 'none',
      }}
      className="animate-in fade-in zoom-in-95 duration-100 ease-out"
    >
      <div className="bg-[#181a20]/95 backdrop-blur-md text-[#f5f5f7] border border-white/15 px-3 py-1.5 rounded-xl shadow-2xl text-xs font-medium max-w-sm sm:max-w-md break-words text-center leading-snug tracking-wide">
        {tooltip.text}
      </div>
    </div>,
    document.body
  );
}
