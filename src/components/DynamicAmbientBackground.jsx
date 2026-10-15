import React, { useState, useEffect } from 'react';

export default function DynamicAmbientBackground({ currentTrack, isPlaying }) {
  const [enabled, setEnabled] = useState(() => {
    const saved = localStorage.getItem('anna_ambient_bg');
    return saved !== null ? saved === 'true' : true;
  });

  // Lắng nghe sự kiện bật/tắt từ SettingsTab
  useEffect(() => {
    const handleToggle = (e) => {
      if (typeof e.detail === 'boolean') {
        setEnabled(e.detail);
      }
    };
    window.addEventListener('anna_ambient_bg_change', handleToggle);
    return () => window.removeEventListener('anna_ambient_bg_change', handleToggle);
  }, []);

  if (!enabled) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 bg-[#09090B]"
      aria-hidden="true"
      style={{
        background: `
          radial-gradient(ellipse 80% 40% at 50% -10%, rgba(234, 88, 12, 0.08), transparent 70%),
          #09090B
        `,
      }}
    >
      {/* Lớp hạt Noise tĩnh siêu nhẹ tăng độ tinh tế (Zero CPU) */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.25) 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />
    </div>
  );
}
