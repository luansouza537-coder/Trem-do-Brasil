import React, { useRef, useState } from 'react';

interface CutsceneModalProps {
  videoSrc: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  onFinished: () => void;
}

export default function CutsceneModal({ videoSrc, title, subtitle, description, icon, onFinished }: CutsceneModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<'waiting' | 'playing' | 'achievement'>('waiting');

  const handleStart = () => {
    setPhase('playing');
    videoRef.current?.play();
  };

  const handleVideoEnd = () => {
    setPhase('achievement');
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black flex items-center justify-center">
      <video
        ref={videoRef}
        src={videoSrc}
        playsInline
        className="w-full h-full object-cover"
        onEnded={handleVideoEnd}
        onError={handleVideoEnd}
      />

      {/* Click-to-start overlay */}
      {phase === 'waiting' && (
        <button
          onClick={handleStart}
          className="absolute inset-0 flex flex-col items-center justify-center gap-6 w-full h-full bg-black/75 cursor-pointer"
        >
          <div className="text-5xl mb-2">{icon}</div>
          <div className="flex flex-col items-center gap-1 mb-4">
            <p className="text-amber-400 text-xs font-bold uppercase tracking-[0.3em]">{subtitle}</p>
            <p className="text-white text-2xl font-black text-center px-8">{title}</p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full border-2 border-white/50 flex items-center justify-center bg-white/10 hover:bg-white/20 transition">
              <span className="text-3xl ml-1">▶</span>
            </div>
            <p className="text-white/60 text-xs font-bold uppercase tracking-widest">Toque para assistir</p>
          </div>
        </button>
      )}

      {/* Skip button during playback */}
      {phase === 'playing' && (
        <button
          onClick={handleVideoEnd}
          className="absolute bottom-8 right-8 px-4 py-2 bg-black/60 border border-white/20 text-white/60 text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-black/80 hover:text-white transition"
        >
          ⏭ Pular
        </button>
      )}

      {/* Achievement card after video */}
      {phase === 'achievement' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-5 max-w-sm mx-6 text-center animate-fade-in">
            {/* Icon glow */}
            <div className="relative">
              <div className="absolute inset-0 blur-2xl opacity-60 text-6xl flex items-center justify-center">{icon}</div>
              <span className="text-6xl relative z-10">{icon}</span>
            </div>

            {/* Badge */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-400 bg-amber-950/60 border border-amber-700/50 px-3 py-1 rounded-full">
                🏆 Conquista Desbloqueada
              </span>
              <h2 className="text-white text-2xl font-black mt-2">{title}</h2>
              <p className="text-amber-400 text-xs font-bold uppercase tracking-wider">{subtitle}</p>
            </div>

            {/* Description */}
            <p className="text-slate-300 text-sm leading-relaxed">{description}</p>

            {/* Divider */}
            <div className="w-24 h-px bg-amber-500/40"></div>

            {/* Continue button */}
            <button
              onClick={onFinished}
              className="px-8 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm uppercase tracking-widest rounded-xl transition active:scale-95 shadow-lg shadow-amber-500/30"
            >
              Continuar →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
