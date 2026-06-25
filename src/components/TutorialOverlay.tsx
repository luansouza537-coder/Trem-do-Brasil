import React, { useEffect, useState } from 'react';
import { TutorialStepDef } from '../data/tutorial';

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TutorialOverlayProps {
  step: TutorialStepDef;
  stepIndex: number;
  totalSteps: number;
  highlightRef?: React.RefObject<HTMLElement>;
  onNext: () => void;
  onSkip: () => void;
}

export default function TutorialOverlay({
  step, stepIndex, totalSteps, highlightRef, onNext, onSkip,
}: TutorialOverlayProps) {
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);

  useEffect(() => {
    if (!highlightRef?.current) { setSpotlight(null); return; }
    const update = () => {
      const r = highlightRef.current?.getBoundingClientRect();
      if (r) setSpotlight({ top: r.top - 6, left: r.left - 6, width: r.width + 12, height: r.height + 12 });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [highlightRef, step.id]);

  const isButtonStep = step.advanceOn === 'button';

  const balloonPosition = step.position === 'top'
    ? 'top-[12%]'
    : step.position === 'bottom'
    ? 'bottom-[14%]'
    : 'top-1/2 -translate-y-1/2';

  return (
    <div className="fixed inset-0 z-[99990] pointer-events-none">
      {/* Dark overlay only for button steps (welcome/done). Action steps need the screen fully interactive. */}
      {isButtonStep && (
        spotlight ? (
          <div
            className="absolute inset-0 pointer-events-auto"
            style={{
              background: 'rgba(0,0,0,0.80)',
              WebkitMaskImage: `radial-gradient(ellipse ${spotlight.width / 2 + 20}px ${spotlight.height / 2 + 20}px at ${spotlight.left + spotlight.width / 2}px ${spotlight.top + spotlight.height / 2}px, transparent 70%, black 100%)`,
              maskImage: `radial-gradient(ellipse ${spotlight.width / 2 + 20}px ${spotlight.height / 2 + 20}px at ${spotlight.left + spotlight.width / 2}px ${spotlight.top + spotlight.height / 2}px, transparent 70%, black 100%)`,
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-black/80 pointer-events-auto" />
        )
      )}

      {/* Spotlight border glow — always visible when ref found */}
      {spotlight && (
        <div
          className="absolute rounded-xl border-2 border-amber-400 shadow-[0_0_20px_4px_rgba(251,191,36,0.5)] pointer-events-none"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
          }}
        />
      )}

      {/* Instruction balloon */}
      <div className={`absolute left-1/2 -translate-x-1/2 ${balloonPosition} w-[85vw] max-w-sm pointer-events-auto`}>
        <div className="bg-slate-900/95 border border-amber-500/60 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-sm">
          {/* Progress bar */}
          <div className="h-1 bg-slate-800">
            <div
              className="h-full bg-amber-500 transition-all duration-500"
              style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
            />
          </div>

          <div className="p-5 flex flex-col gap-4">
            {/* Step counter */}
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-500">
                Passo {stepIndex + 1} de {totalSteps}
              </span>
              <button
                onClick={onSkip}
                className="text-[9px] text-slate-500 hover:text-slate-300 transition font-bold uppercase tracking-wider"
              >
                Pular ✕
              </button>
            </div>

            {/* Title */}
            <div>
              <h2 className="text-white text-lg font-black leading-tight">{step.title}</h2>
              <p className="text-slate-300 text-sm leading-relaxed mt-2">{step.message}</p>
            </div>

            {/* Action hint or button */}
            {isButtonStep ? (
              <button
                onClick={onNext}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-sm uppercase tracking-widest rounded-xl transition shadow-lg shadow-amber-500/30"
              >
                {stepIndex === totalSteps - 1 ? '🎉 Começar a jogar!' : 'Entendi →'}
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2">
                <span className="text-amber-400 animate-pulse text-base">👆</span>
                <span className="text-[10px] text-slate-400 font-bold">Faça a ação acima para continuar</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
