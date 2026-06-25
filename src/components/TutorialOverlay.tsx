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
  /** Optional live progress text, e.g. "3 / 10 trabalhadores" */
  progressText?: string;
  /** 0–1 fraction for the step-specific progress bar (shown when progressText present) */
  progressFraction?: number;
  onNext: () => void;
  onSkip: () => void;
}

export default function TutorialOverlay({
  step, stepIndex, totalSteps, highlightRef, progressText, progressFraction, onNext, onSkip,
}: TutorialOverlayProps) {
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const [minimized, setMinimized] = useState(false);

  // Reset minimized state on step change so new instructions show by default
  useEffect(() => { setMinimized(false); }, [step.id]);

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
    ? 'top-[10%]'
    : step.position === 'bottom'
    ? 'bottom-[10%]'
    : 'top-1/2 -translate-y-1/2';

  return (
    <div className="fixed inset-0 z-[99990] pointer-events-none">
      {/* Dark overlay only for button steps */}
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

      {/* Spotlight border glow */}
      {spotlight && (
        <div
          className="absolute rounded-xl border-2 border-amber-400 shadow-[0_0_20px_4px_rgba(251,191,36,0.5)] pointer-events-none"
          style={{ top: spotlight.top, left: spotlight.left, width: spotlight.width, height: spotlight.height }}
        />
      )}

      {/* Instruction balloon */}
      <div className={`absolute left-1/2 -translate-x-1/2 ${balloonPosition} w-[85vw] max-w-sm pointer-events-auto`}>
        {minimized ? (
          /* Minimized pill */
          <button
            onClick={() => setMinimized(false)}
            className="mx-auto flex items-center gap-2 bg-slate-900/95 border border-amber-500/60 rounded-full px-4 py-2 shadow-xl backdrop-blur-sm"
          >
            <span className="text-amber-400 text-sm animate-pulse">📋</span>
            <span className="text-white text-xs font-bold">{step.title}</span>
            <span className="text-slate-400 text-[10px]">▲ ver</span>
          </button>
        ) : (
          <div className="bg-slate-900/95 border border-amber-500/60 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-sm">
            {/* Tutorial progress bar */}
            <div className="h-1 bg-slate-800">
              <div
                className="h-full bg-amber-500 transition-all duration-500"
                style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
              />
            </div>

            <div className="p-4 flex flex-col gap-3">
              {/* Header row */}
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-500">
                  Passo {stepIndex + 1} de {totalSteps}
                </span>
                <div className="flex items-center gap-2">
                  {/* Minimize button — only for action steps */}
                  {!isButtonStep && (
                    <button
                      onClick={() => setMinimized(true)}
                      className="text-[9px] text-slate-500 hover:text-slate-300 transition font-bold uppercase tracking-wider"
                    >
                      ▼ min
                    </button>
                  )}
                  <button
                    onClick={onSkip}
                    className="text-[9px] text-slate-500 hover:text-slate-300 transition font-bold uppercase tracking-wider"
                  >
                    Pular ✕
                  </button>
                </div>
              </div>

              {/* Title + message */}
              <div>
                <h2 className="text-white text-base font-black leading-tight">{step.title}</h2>
                <p className="text-slate-300 text-xs leading-relaxed mt-1">{step.message}</p>
              </div>

              {/* Step-specific progress indicator */}
              {progressText && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-bold">Progresso</span>
                    <span className="text-[10px] text-amber-400 font-black">{progressText}</span>
                  </div>
                  {progressFraction !== undefined && (
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(1, progressFraction) * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Action hint or next button */}
              {isButtonStep ? (
                <button
                  onClick={onNext}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-sm uppercase tracking-widest rounded-xl transition shadow-lg shadow-amber-500/30"
                >
                  {stepIndex === totalSteps - 1 ? '🎉 Começar a jogar!' : 'Entendi →'}
                </button>
              ) : (
                <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2">
                  <span className="text-amber-400 animate-pulse text-sm">👆</span>
                  <span className="text-[10px] text-slate-400 font-bold">Faça a ação acima para continuar</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
