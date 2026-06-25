import React, { useEffect, useRef } from 'react';
import { TutorialStep } from '../data/tutorialSteps';

interface TutorialModalProps {
  steps: TutorialStep[];
  currentIndex: number;
  waitingForAction: boolean;
  onNext: () => void;
  onFinish: () => void;
}

export default function TutorialModal({
  steps,
  currentIndex,
  waitingForAction,
  onNext,
  onFinish,
}: TutorialModalProps) {
  const step = steps[currentIndex];
  const isLast = currentIndex === steps.length - 1;
  const highlightRef = useRef<HTMLElement | null>(null);

  // Apply/remove highlight ring on target element
  useEffect(() => {
    if (highlightRef.current) {
      highlightRef.current.classList.remove('tutorial-highlight');
      highlightRef.current = null;
    }
    if (step.highlightId) {
      const el = document.getElementById(step.highlightId);
      if (el) {
        el.classList.add('tutorial-highlight');
        highlightRef.current = el;
      }
    }
    return () => {
      if (highlightRef.current) {
        highlightRef.current.classList.remove('tutorial-highlight');
        highlightRef.current = null;
      }
    };
  }, [step.highlightId]);

  if (!step) return null;

  return (
    <>
      {/* Backdrop — subtle, doesn't block the map */}
      <div className="fixed inset-x-0 bottom-0 z-[9980] pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(2,6,23,0.85) 0%, transparent 100%)', height: '40%' }}
      />

      {/* Card */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9981] w-[92vw] max-w-md pointer-events-auto">
        <div className="bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden">

          {/* Progress bar */}
          <div className="h-0.5 bg-slate-800">
            <div
              className="h-full bg-amber-500 transition-all duration-500"
              style={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}
            />
          </div>

          <div className="p-4 flex flex-col gap-3">
            {/* Header */}
            <div className="flex items-start gap-3">
              <span className="text-3xl shrink-0 mt-0.5">{step.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="text-white font-black text-sm leading-tight">{step.title}</h3>
                  <span className="text-[9px] text-slate-500 font-bold shrink-0">
                    {currentIndex + 1}/{steps.length}
                  </span>
                </div>
                <p
                  className="text-slate-300 text-[11px] leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: step.body }}
                />
              </div>
            </div>

            {/* Waiting indicator */}
            {waitingForAction && (
              <div className="flex items-center gap-2 bg-amber-950/40 border border-amber-700/40 rounded-lg px-3 py-2">
                <span className="text-amber-400 animate-pulse text-xs">⏳</span>
                <span className="text-amber-300 text-[10px] font-bold">
                  {step.waitForAction === 'click_city' && 'Clique em uma cidade no mapa...'}
                  {step.waitForAction === 'draw_route' && 'Selecione uma cidade e clique em outra para conectar...'}
                </span>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between gap-2 pt-1">
              {/* Step dots */}
              <div className="flex gap-1">
                {steps.map((_, i) => (
                  <span
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      i === currentIndex ? 'bg-amber-400' : i < currentIndex ? 'bg-slate-500' : 'bg-slate-700'
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                {/* Skip all button */}
                <button
                  onClick={onFinish}
                  className="text-[9px] text-slate-500 hover:text-slate-300 transition font-bold uppercase tracking-wider px-2 py-1"
                >
                  Pular tudo
                </button>

                {/* Next / Finish */}
                <button
                  onClick={isLast ? onFinish : onNext}
                  disabled={waitingForAction}
                  className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition
                    ${waitingForAction
                      ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950 active:scale-95 shadow-lg shadow-amber-500/20'
                    }`}
                >
                  {isLast ? 'Começar →' : 'Próximo →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
