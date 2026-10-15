import React, { useState, useEffect } from 'react';

function getAmbientThumb(track) {
  if (track?.thumbnail && !track.thumbnail.includes('yt3.ggpht.com') && !track.thumbnail.includes('default_user')) {
    return track.thumbnail;
  }
  if (track?.url) {
    const match = track.url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (match && match[1]) {
      return `https://i.ytimg.com/vi/${match[1]}/hqdefault.jpg`;
    }
  }
  return null;
}

export default function DynamicAmbientBackground({ currentTrack, isPlaying }) {
  const [enabled, setEnabled] = useState(() => {
    const saved = localStorage.getItem('anna_ambient_bg');
    return saved !== null ? saved === 'true' : true;
  });

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

  const thumbUrl = getAmbientThumb(currentTrack);

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#09090B]"
      aria-hidden="true"
    >
      {/* Dynamic blurred artwork aura */}
      {thumbUrl && (
        <div
          key={thumbUrl}
          className="absolute -inset-24 bg-cover bg-center transition-opacity duration-1000"
          style={{
            backgroundImage: `url(${thumbUrl})`,
            filter: 'blur(90px) saturate(1.6)',
            opacity: isPlaying ? 0.16 : 0.08,
            transform: 'scale(1.15)',
          }}
        />
      )}

      {/* Studio top vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 45% at 50% -10%, rgba(249, 115, 22, 0.09), transparent 70%),
            radial-gradient(circle at 50% 100%, rgba(9, 9, 11, 0.95), rgba(9, 9, 11, 0.65))
          `,
        }}
      />
    </div>
  );
}
