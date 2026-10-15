import React from 'react';
import ReactDOM from 'react-dom';
import { CheckCircle2, AlertCircle, Sparkles, Loader2, X } from 'lucide-react';

export default function Toast({ toasts, toast, onDismiss }) {
  // Support both array 'toasts' or single object 'toast'
  const items = Array.isArray(toasts) ? toasts : (toast ? [toast] : []);
  if (items.length === 0) return null;

  const content = (
    <div className="anna-toast-container">
      {items.map((item) => {
        const isError = item.type === 'error';
        const isInfo = item.type === 'info';
        const isActionLoading = isInfo && (item.message.includes('Đang') || item.message.includes('vui lòng'));

        return (
          <div
            key={item.id || item.message}
            onClick={() => onDismiss?.(item.id)}
            className={`anna-toast-item ${isError ? 'toast-error' : isInfo ? 'toast-info' : 'toast-success'}`}
          >
            <div className="anna-toast-icon-wrap">
              {isError ? (
                <AlertCircle size={15} className="text-rose-400" />
              ) : isActionLoading ? (
                <Loader2 size={15} className="animate-spin text-orange-400" />
              ) : isInfo ? (
                <Sparkles size={15} className="text-orange-400" />
              ) : (
                <CheckCircle2 size={15} className="text-emerald-400" />
              )}
            </div>

            <span className="anna-toast-text">{item.message}</span>

            <button
              type="button"
              className="anna-toast-close"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss?.(item.id);
              }}
              aria-label="Đóng thông báo"
            >
              <X size={13} />
            </button>
          </div>
        );
      })}

      <style>{`
        .anna-toast-container {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 999999;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
          pointer-events: none;
          max-width: 420px;
        }

        @media (max-width: 640px) {
          .anna-toast-container {
            top: 14px;
            right: 14px;
            left: 14px;
            max-width: none;
            align-items: center;
          }
        }

        .anna-toast-item {
          pointer-events: auto;
          cursor: pointer;
          user-select: none;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 12px;
          font-family: 'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 13px;
          font-weight: 500;
          line-height: 1.4;
          background: #141417;
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.75);
          animation: toastSlideIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
          transition: transform 0.15s ease, opacity 0.15s ease;
          max-width: 100%;
        }

        .anna-toast-item:hover {
          transform: translateY(-1px);
        }

        .anna-toast-item:active {
          transform: scale(0.98);
        }

        .toast-success {
          color: #f4f4f5;
          border-color: rgba(16, 185, 129, 0.25);
        }

        .toast-error {
          color: #fff1f2;
          border-color: rgba(244, 63, 94, 0.3);
        }

        .toast-info {
          color: #f4f4f5;
          border-color: rgba(249, 115, 22, 0.25);
        }

        .anna-toast-icon-wrap {
          flex-shrink: 0;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .toast-success .anna-toast-icon-wrap {
          background: rgba(16, 185, 129, 0.12);
        }

        .toast-error .anna-toast-icon-wrap {
          background: rgba(244, 63, 94, 0.12);
        }

        .toast-info .anna-toast-icon-wrap {
          background: rgba(249, 115, 22, 0.12);
        }

        .anna-toast-text {
          flex: 1;
          min-width: 0;
          word-break: break-word;
        }

        .anna-toast-close {
          border: 0;
          background: transparent;
          color: rgba(255, 255, 255, 0.4);
          cursor: pointer;
          padding: 2px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.15s, background-color 0.15s;
          flex-shrink: 0;
        }

        .anna-toast-close:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.08);
        }

        @keyframes toastSlideIn {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return ReactDOM.createPortal(content, document.body);
  }
  return content;
}
