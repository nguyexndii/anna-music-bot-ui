import React from 'react';

export default function ConnectingStepper({ text = 'ĐANG KHỞI TẠO...' }) {
  return (
    <main
      className="min-h-screen w-full bg-[#09090B] flex flex-col items-center justify-center p-6 text-zinc-100 select-none relative overflow-hidden"
      style={{
        fontFamily: "'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Subtle top vignette */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 30%, rgba(234, 88, 12, 0.07), transparent 70%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center max-w-sm">
        {/* Brand Logo */}
        <div className="w-20 h-20 rounded-2xl overflow-hidden ring-1 ring-cyan-500/30 border border-white/[0.08] shadow-2xl shadow-black/80 bg-zinc-900 mb-5">
          <img
            src="/logo.gif"
            alt="Anna Music Logo"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Brand Title */}
        <h1 className="text-xl font-bold tracking-tight text-zinc-100 mb-1">
          ANNA MUSIC
        </h1>
        <p className="font-mono text-[11px] tracking-widest text-zinc-500 uppercase mb-8">
          STUDIO WEB PLAYER
        </p>

        {/* Minimal Progress Bar */}
        <div className="w-48 h-1 bg-zinc-800 rounded-full overflow-hidden mb-4 relative">
          <div className="h-full w-1/3 bg-cyan-500 rounded-full animate-progress-indeterminate" />
        </div>

        {/* Status Text */}
        <p className="font-mono text-xs tracking-widest text-zinc-400">
          {text}
        </p>
      </div>

      <style>{`
        @keyframes progressIndeterminate {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
        .animate-progress-indeterminate {
          animation: progressIndeterminate 1.4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}</style>
    </main>
  );
}
