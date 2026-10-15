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

export default function DynamicAmbientBackground({ currentTrack, isPlaying = true }) {
  const [enabled, setEnabled] = useState(() => {
    const saved = localStorage.getItem('anna_ambient_bg');
    return saved !== null ? saved === 'true' : true;
  });

  const [mounted, setMounted] = useState(enabled);
  const [isVisible, setIsVisible] = useState(enabled);

  const initialThumb = getTrackThumb(currentTrack);
  const [layerA, setLayerA] = useState({ thumb: initialThumb, opacity: 1 });
  const [layerB, setLayerB] = useState({ thumb: null, opacity: 0 });
  const activeLayerRef = useRef('A');
  const currentThumbRef = useRef(initialThumb);

  useEffect(() => {
    const handleToggle = (e) => {
      if (typeof e.detail === 'boolean') {
        setEnabled(e.detail);
      }
    };
    window.addEventListener('anna_ambient_bg_change', handleToggle);
    return () => window.removeEventListener('anna_ambient_bg_change', handleToggle);
  }, []);

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

  useEffect(() => {
    const nextThumb = getTrackThumb(currentTrack);
    if (!nextThumb || nextThumb === currentThumbRef.current) return;
    currentThumbRef.current = nextThumb;

    if (activeLayerRef.current === 'A') {
      setLayerB({ thumb: nextThumb, opacity: 0 });
      const timer = setTimeout(() => {
        setLayerA(prev => ({ ...prev, opacity: 0 }));
        setLayerB({ thumb: nextThumb, opacity: 1 });
        activeLayerRef.current = 'B';
      }, 30);
      return () => clearTimeout(timer);
    } else {
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
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
        background: '#06080f',
        opacity: isVisible ? (isPlaying ? 1 : 0.65) : 0,
        visibility: isVisible ? 'visible' : 'hidden',
        transition: 'opacity 1.2s cubic-bezier(0.4, 0, 0.2, 1), visibility 1.2s',
        willChange: 'opacity'
      }}
    >
      <style>{`
        .ambient-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(105px) saturate(1.85) brightness(0.40);
          mix-blend-mode: screen;
          will-change: transform, opacity;
          background-size: cover;
          background-position: center;
          animation-play-state: ${isPlaying ? 'running' : 'paused'};
        }
        .orb-1 {
          width: 580px; height: 580px; top: 0; left: 0; opacity: 0.62;
          animation: ambientWander1 22s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite alternate;
        }
        .orb-2 {
          width: 540px; height: 540px; top: 0; left: 0; opacity: 0.52;
          animation: ambientWander2 25s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite alternate;
        }
        .orb-3 {
          width: 480px; height: 480px; top: 0; left: 0; opacity: 0.42;
          animation: ambientWander3 20s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite alternate;
        }
        .orb-4 {
          width: 440px; height: 440px; top: 0; left: 0; opacity: 0.38;
          animation: ambientWander4 28s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite alternate;
        }
        @keyframes ambientWander1 {
          0%   { transform: translate3d(-10vw, -10vh, 0) scale(1) rotate(0deg); }
          50%  { transform: translate3d(55vw, 35vh, 0) scale(1.15) rotate(120deg); }
          100% { transform: translate3d(80vw, 80vh, 0) scale(1.05) rotate(260deg); }
        }
        @keyframes ambientWander2 {
          0%   { transform: translate3d(80vw, 70vh, 0) scale(1.1) rotate(0deg); }
          50%  { transform: translate3d(20vw, 25vh, 0) scale(1.22) rotate(-140deg); }
          100% { transform: translate3d(45vw, 40vh, 0) scale(1.0) rotate(-280deg); }
        }
        @keyframes ambientWander3 {
          0%   { transform: translate3d(-5vw, 55vh, 0) scale(0.95); }
          50%  { transform: translate3d(65vw, 15vh, 0) scale(1.18); }
          100% { transform: translate3d(15vw, 80vh, 0) scale(1.1); }
        }
        @keyframes ambientWander4 {
          0%   { transform: translate3d(50vw, 80vh, 0) scale(1.15); }
          50%  { transform: translate3d(-8vw, 20vh, 0) scale(0.92); }
          100% { transform: translate3d(30vw, 55vh, 0) scale(1.05); }
        }
        @media (prefers-reduced-motion: reduce) {
          .orb-1, .orb-2, .orb-3, .orb-4 { animation: none !important; }
        }
      `}</style>

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

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 50% 50%, rgba(6, 8, 15, 0.55) 0%, rgba(6, 8, 15, 0.88) 70%, #06080f 100%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
