import React, { useState, useEffect, useRef } from 'react';
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

export default function DynamicAmbientBackground({ currentTrack, isPlaying }) {
  const [enabled, setEnabled] = useState(() => {
    const saved = localStorage.getItem('anna_ambient_bg');
    return saved !== null ? saved === 'true' : true;
  });

  const [activeThumb, setActiveThumb] = useState(() => getTrackThumb(currentTrack));
  const [prevThumb, setPrevThumb] = useState(null);
  const [isCrossfading, setIsCrossfading] = useState(false);
  const crossfadeTimerRef = useRef(null);

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

  // Xử lý chuyển đổi bài hát mượt mà (Crossfade 1.5s giữa thumbnail cũ và mới)
  useEffect(() => {
    const nextThumb = getTrackThumb(currentTrack);
    if (!nextThumb || nextThumb === activeThumb) return;

    if (crossfadeTimerRef.current) {
      clearTimeout(crossfadeTimerRef.current);
    }

    setPrevThumb(activeThumb);
    setActiveThumb(nextThumb);
    setIsCrossfading(true);

    crossfadeTimerRef.current = setTimeout(() => {
      setPrevThumb(null);
      setIsCrossfading(false);
    }, 1600);

    return () => {
      if (crossfadeTimerRef.current) clearTimeout(crossfadeTimerRef.current);
    };
  }, [currentTrack]);

  if (!enabled) return null;

  return (
    <div
      className="ambient-bg-container"
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
        background: '#111316',
      }}
    >
      <style>{`
        @keyframes ambientFloatPulse {
          0% {
            transform: scale(1.2) translate3d(-3%, -2%, 0) rotate(0deg);
          }
          50% {
            transform: scale(1.35) translate3d(3%, 3%, 0) rotate(4deg);
          }
          100% {
            transform: scale(1.2) translate3d(-3%, -2%, 0) rotate(0deg);
          }
        }
        @keyframes ambientFloatSecondary {
          0% {
            transform: scale(1.3) translate3d(4%, 3%, 0) rotate(0deg);
          }
          50% {
            transform: scale(1.15) translate3d(-3%, -3%, 0) rotate(-5deg);
          }
          100% {
            transform: scale(1.3) translate3d(4%, 3%, 0) rotate(0deg);
          }
        }
        .ambient-layer {
          position: absolute;
          inset: -80px;
          background-size: cover;
          background-position: center;
          filter: blur(85px) saturate(1.85) brightness(0.32);
          will-change: transform, opacity;
          transition: opacity 1.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .ambient-anim-primary {
          animation: ambientFloatPulse 18s ease-in-out infinite alternate;
        }
        .ambient-anim-secondary {
          animation: ambientFloatSecondary 22s ease-in-out infinite alternate;
          opacity: 0.65;
          mix-blend-mode: screen;
        }
        @media (prefers-reduced-motion: reduce) {
          .ambient-anim-primary, .ambient-anim-secondary {
            animation: none !important;
          }
        }
      `}</style>

      {/* Lớp ảnh trước đó (nếu đang chuyển bài) */}
      {prevThumb && (
        <div
          className="ambient-layer ambient-anim-primary"
          style={{
            backgroundImage: `url(${prevThumb})`,
            opacity: isCrossfading ? 0 : 0.85,
          }}
        />
      )}

      {/* Lớp ảnh hiện tại */}
      {activeThumb && (
        <>
          <div
            className="ambient-layer ambient-anim-primary"
            style={{
              backgroundImage: `url(${activeThumb})`,
              opacity: isCrossfading ? 0.85 : 0.85,
            }}
          />
          {/* Lớp hiệu ứng ánh sáng phụ thứ 2 tạo độ sâu không gian karaoke */}
          <div
            className="ambient-layer ambient-anim-secondary"
            style={{
              backgroundImage: `url(${activeThumb})`,
            }}
          />
        </>
      )}

      {/* Mặt nạ Vignette & Darkening Radial để giữ độ tương phản chuẩn cho UI */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 50% 30%, rgba(17, 19, 22, 0.42) 0%, rgba(17, 19, 22, 0.86) 65%, #111316 100%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
