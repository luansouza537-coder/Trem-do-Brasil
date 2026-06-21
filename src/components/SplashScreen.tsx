import React, { useRef, useState } from 'react';

interface SplashScreenProps {
  onFinished: () => void;
}

export default function SplashScreen({ onFinished }: SplashScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showSkip, setShowSkip] = useState(false);

  return (
    <div className="fixed inset-0 z-[99999] bg-black flex items-center justify-center">
      <video
        ref={videoRef}
        src="/intro.mp4"
        autoPlay
        muted
        playsInline
        className="w-full h-full object-cover"
        onCanPlay={() => setShowSkip(true)}
        onEnded={onFinished}
        onError={onFinished}
      />
      {showSkip && (
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
