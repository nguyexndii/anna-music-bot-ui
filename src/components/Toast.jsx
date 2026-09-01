import React from 'react';

export default function Toast({ toast }) {
  if (!toast) return null;
  const isError = toast.type === 'error';
  return (
    <div style={{
      position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, pointerEvents: 'none',
      background: isError ? '#2a1616' : 'var(--paper)',
      border: `1px solid ${isError ? '#5c2020' : 'var(--border)'}`,
      borderLeft: `3px solid ${isError ? 'var(--coral)' : 'var(--yellow)'}`,
      color: 'var(--ink)',
      borderRadius: 10, padding: '10px 18px',
      fontFamily: '"DM Sans", sans-serif',
      fontSize: 13,
      boxShadow: '0 8px 24px rgba(0,0,0,.4)',
      whiteSpace: 'nowrap',
      animation: 'toastIn .2s cubic-bezier(0.2,0.8,0.2,1)',
    }}>
      {toast.message}
      <style>{`@keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }`}</style>
    </div>
  );
}
