import React from 'react';
import { MissionDef, MISSIONS } from '../../utils/missions';

interface MissionsTabProps {
  missionResults: (MissionDef & { completed: boolean; current: number; target: number })[];
  completedMissions: string[];
  expiredMissions: string[];
}

export default function MissionsTab({
  missionResults,
  completedMissions,
  expiredMissions,
}: MissionsTabProps) {

  const fmt = (v: number) => v >= 1e9 ? `R$ ${(v/1e9).toFixed(0)}B` : `R$ ${(v/1e6).toFixed(0)}M`;

  return (
    <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 bg-slate-950/10 custom-scrollbar">

      {/* Missions list */}
      <div className="p-3.5 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">🎯 Missões e Recompensas:</span>
          <span className="text-[9px] text-emerald-400 font-bold bg-emerald-950/50 border border-emerald-800 px-1.5 py-0.5 rounded">
            {missionResults.filter(m => m.completed).length}/{missionResults.length} concluídas
          </span>
        </div>
        <div className="flex flex-col gap-2 mt-1">
          {missionResults.map(m => {
            const pct = Math.min(100, Math.round((m.current / m.target) * 100));
            const isLocked = !!(m.unlocksAfter && !completedMissions.includes(m.unlocksAfter));
            const prereqMission = m.unlocksAfter ? MISSIONS.find(def => def.id === m.unlocksAfter) : null;
            return (
              <div key={m.id} className={`p-2.5 rounded-lg border flex flex-col gap-1.5 ${
                isLocked ? 'bg-slate-950/30 border-slate-800/50 opacity-60' :
                m.completed ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-slate-950/60 border-slate-800'
              }`}>
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <span className={`text-[10px] font-black block leading-tight ${isLocked ? 'text-slate-500' : m.completed ? 'text-emerald-300' : 'text-slate-200'}`}>
                      {isLocked ? '🔒 ' : ''}{m.title}
                    </span>
                    <span className="text-[8.5px] text-slate-400 leading-tight">{m.description}</span>
                    {isLocked && prereqMission && (
                      <span className="text-[8px] text-slate-500 block mt-0.5">Requer: {prereqMission.title}</span>
                    )}
                  </div>
                  <span className={`text-[9px] font-black shrink-0 ml-1 ${m.completed ? 'text-emerald-400' : isLocked ? 'text-slate-600' : 'text-amber-400'}`}>
                    {m.completed ? '✓' : fmt(m.reward)}
                  </span>
                </div>
                {!m.completed && !isLocked && (
                  <>
                    <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
                      <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[8px] text-slate-500">{m.current.toLocaleString('pt-BR')} / {m.target.toLocaleString('pt-BR')} — {pct}%</span>
                    {m.deadlineYear && (
                      <span className="text-[8px] text-orange-400 font-bold">⏰ Prazo: até {m.deadlineYear}</span>
                    )}
                  </>
                )}
                {m.completed && (
                  <span className="text-[8px] text-emerald-500 font-bold">✅ Prêmio {fmt(m.reward)} recebido!</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
