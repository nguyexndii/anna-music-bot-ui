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

export default function DynamicAmbientBackground({ currentTrack }) {
  const [enabled, setEnabled] = useState(() => {
    const saved = localStorage.getItem('anna_ambient_bg');
    return saved !== null ? saved === 'true' : true;
  });

  const [mounted, setMounted] = useState(enabled);
  const [isVisible, setIsVisible] = useState(enabled);

  // Dual-Layer Buffer cho phép đổi màu mượt mà (Crossfade 2.2s như màu nước)
  const initialThumb = getTrackThumb(currentTrack);
  const [layerA, setLayerA] = useState({ thumb: initialThumb, opacity: 1 });
  const [layerB, setLayerB] = useState({ thumb: null, opacity: 0 });
  const activeLayerRef = useRef('A');
  const currentThumbRef = useRef(initialThumb);

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

  // Cơ chế bật/tắt làm mờ dần 1.2s (Smooth Fade In / Fade Out)
  useEffect(() => {
    if (enabled) {
      setMounted(true);
      const timer = setTimeout(() => setIsVisible(true), 30);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => setMounted(false), 1250);
      return () => clearTimeout(timer);
    }
  }, [enabled]);

  // Dual-Layer Color Crossfade 2.2s khi chuyển đổi bài hát
  useEffect(() => {
    const nextThumb = getTrackThumb(currentTrack);
    if (!nextThumb || nextThumb === currentThumbRef.current) return;
    currentThumbRef.current = nextThumb;

    if (activeLayerRef.current === 'A') {
      // Đang hiển thị Layer A -> kích hoạt Layer B và mờ dần Layer A
      setLayerB({ thumb: nextThumb, opacity: 0 });
      const timer = setTimeout(() => {
        setLayerA(prev => ({ ...prev, opacity: 0 }));
        setLayerB({ thumb: nextThumb, opacity: 1 });
        activeLayerRef.current = 'B';
      }, 30);
      return () => clearTimeout(timer);
    } else {
      // Đang hiển thị Layer B -> kích hoạt Layer A và mờ dần Layer B
      setLayerA({ thumb: nextThumb, opacity: 0 });
      const timer = setTimeout(() => {
        setLayerB(prev => ({ ...prev, opacity: 0 }));
        setLayerA({ thumb: nextThumb, opacity: 1 });
        activeLayerRef.current = 'A';
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [currentTrack]);

  if (!mounted) return null;

  const renderOrbs = (thumb) => {
    if (!thumb) return null;
    return (
      <>
        <div className="ambient-orb orb-1" style={{ backgroundImage: `url(${thumb})` }} />
        <div className="ambient-orb orb-2" style={{ backgroundImage: `url(${thumb})` }} />
        <div className="ambient-orb orb-3" style={{ backgroundImage: `url(${thumb})` }} />
        <div className="ambient-orb orb-4" style={{ backgroundImage: `url(${thumb})` }} />
      </>
    );
  };

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
        background: '#090a0d',
        opacity: isVisible ? 1 : 0,
        visibility: isVisible ? 'visible' : 'hidden',
        transition: 'opacity 1.2s cubic-bezier(0.4, 0, 0.2, 1), visibility 1.2s',
        willChange: 'opacity'
      }}
    >
      <style>{`
        /* Các quầng sáng di chuyển trôi dạt khắp màn hình theo chu kỳ 22s */
        .ambient-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(105px) saturate(1.85) brightness(0.42);
          mix-blend-mode: screen;
          will-change: transform, opacity;
          background-size: cover;
          background-position: center;
        }

        .orb-1 {
          width: 580px;
          height: 580px;
          top: 0;
          left: 0;
          opacity: 0.65;
          animation: ambientWander1 22s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite alternate;
        }

        .orb-2 {
          width: 540px;
          height: 540px;
          top: 0;
          left: 0;
          opacity: 0.55;
          animation: ambientWander2 25s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite alternate;
        }

        .orb-3 {
          width: 480px;
          height: 480px;
          top: 0;
          left: 0;
          opacity: 0.45;
          animation: ambientWander3 20s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite alternate;
        }

        .orb-4 {
          width: 440px;
          height: 440px;
          top: 0;
          left: 0;
          opacity: 0.40;
          animation: ambientWander4 28s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite alternate;
        }

        /* Quỹ đạo lượn toàn màn hình 3D GPU-Accelerated */
        @keyframes ambientWander1 {
          0% {
            transform: translate3d(-10vw, -10vh, 0) scale(1) rotate(0deg);
          }
          25% {
            transform: translate3d(35vw, 15vh, 0) scale(1.18) rotate(60deg);
          }
          50% {
            transform: translate3d(65vw, 45vh, 0) scale(0.95) rotate(130deg);
          }
          75% {
            transform: translate3d(40vw, 75vh, 0) scale(1.22) rotate(200deg);
          }
          100% {
            transform: translate3d(85vw, 85vh, 0) scale(1.05) rotate(310deg);
          }
        }

        @keyframes ambientWander2 {
          0% {
            transform: translate3d(85vw, 75vh, 0) scale(1.1) rotate(0deg);
          }
          30% {
            transform: translate3d(70vw, 10vh, 0) scale(0.92) rotate(-90deg);
          }
          60% {
            transform: translate3d(15vw, 35vh, 0) scale(1.28) rotate(-180deg);
          }
          85% {
            transform: translate3d(5vw, 80vh, 0) scale(1.0) rotate(-260deg);
          }
          100% {
            transform: translate3d(50vw, 40vh, 0) scale(1.15) rotate(-360deg);
          }
        }

        @keyframes ambientWander3 {
          0% {
            transform: translate3d(-5vw, 55vh, 0) scale(0.95);
          }
          33% {
            transform: translate3d(30vw, -12vh, 0) scale(1.2);
          }
          66% {
            transform: translate3d(80vw, 20vh, 0) scale(0.88);
          }
          100% {
            transform: translate3d(10vw, 85vh, 0) scale(1.18);
          }
        }

        @keyframes ambientWander4 {
          0% {
            transform: translate3d(50vw, 80vh, 0) scale(1.2);
          }
          35% {
            transform: translate3d(-8vw, 20vh, 0) scale(0.9);
          }
          70% {
            transform: translate3d(75vw, -5vh, 0) scale(1.1);
          }
          100% {
            transform: translate3d(25vw, 60vh, 0) scale(1.0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .orb-1, .orb-2, .orb-3, .orb-4 {
            animation: none !important;
          }
        }
      `}</style>

      {/* Layer A (Hòa sắc đổi màu) */}
      {layerA.thumb && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: layerA.opacity,
            transition: 'opacity 2.2s cubic-bezier(0.4, 0, 0.2, 1)',
            willChange: 'opacity'
          }}
        >
          {renderOrbs(layerA.thumb)}
        </div>
      )}

      {/* Layer B (Hòa sắc đổi màu) */}
      {layerB.thumb && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: layerB.opacity,
            transition: 'opacity 2.2s cubic-bezier(0.4, 0, 0.2, 1)',
            willChange: 'opacity'
          }}
        >
          {renderOrbs(layerB.thumb)}
        </div>
      )}

      {/* Mặt nạ Vignette làm dịu vùng trung tâm, bảo vệ tương phản chữ */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 50% 50%, rgba(12, 14, 18, 0.45) 0%, rgba(12, 14, 18, 0.82) 65%, #0c0e12 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Lớp hạt phim điện ảnh mờ tinh tế */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 0)',
          backgroundSize: '24px 24px',
          opacity: 0.35,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
