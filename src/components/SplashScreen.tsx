import React, { useRef, useState } from 'react';

interface SplashScreenProps {
  onFinished: () => void;
}

export default function SplashScreen({ onFinished }: SplashScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  const handleStart = () => {
    setStarted(true);
    videoRef.current?.play();
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black flex items-center justify-center">
      <video
        ref={videoRef}
        src="/intro.mp4"
        playsInline
        className="w-full h-full object-cover"
        onEnded={onFinished}
        onError={onFinished}
      />

      {/* Click-to-start overlay */}
      {!started && (
        <button
          onClick={handleStart}
          className="absolute inset-0 flex flex-col items-center justify-center gap-6 w-full h-full bg-black/70 cursor-pointer"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full border-2 border-white/60 flex items-center justify-center bg-white/10 hover:bg-white/20 transition">
              <span className="text-4xl ml-1">▶</span>
            </div>
            <p className="text-white/80 text-sm font-bold uppercase tracking-widest">Clique para iniciar</p>
          </div>
        </button>
      )}

      {/* Skip button — shown only after video started */}
      {started && (
        <button
          onClick={onFinished}
          className="absolute bottom-8 right-8 px-4 py-2 bg-black/60 border border-white/20 text-white/70 text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-black/80 hover:text-white transition"
        >
          ⏭ Pular
        </button>
      )}
    </div>
  );
}
