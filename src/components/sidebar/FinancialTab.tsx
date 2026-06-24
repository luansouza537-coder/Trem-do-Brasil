import React from 'react';
import { City, Edge, GameEvent, GameResources, GameWorkers } from '../../types';
import { WORKER_SALARIES, FundGrant } from '../../utils/gameRules';

interface FinancialTabProps {
  edges: Edge[];
  cities: City[];
  workers: GameWorkers;
  activeEvents: GameEvent[];
  budgetState: {
    totalSpent: number;
    spentRail: number;
    spentBalsa: number;
    spentYards: number;
    spentHubs: number;
    grantIncome: number;
    currentBudget: number;
    unlockedGrants: FundGrant[];
    spentOnWorkers?: number;
    spentOnResources?: number;
    totalRevenue?: number;
    monthlyRevenue?: number;
  };
  budgetHistory: { label: string; budget: number }[];
}

export default function FinancialTab({ edges, cities, workers, activeEvents, budgetState, budgetHistory }: FinancialTabProps) {
  const cityName = (id: string) => cities.find(c => c.id === id)?.name ?? id;
  const fmt = (v: number) => v >= 1e12 ? `R$ ${(v/1e12).toFixed(2)}T` : v >= 1e9 ? `R$ ${(v/1e9).toFixed(1)}B` : `R$ ${(v/1e6).toFixed(0)}M`;
  const fmtShort = (v: number) => v >= 1e12 ? `${(v/1e12).toFixed(1)}T` : v >= 1e9 ? `${(v/1e9).toFixed(0)}B` : `${(v/1e6).toFixed(0)}M`;

  const totalPayroll = (workers.terraplanagem * WORKER_SALARIES.terraplanagem) +
    (workers.assentamento * WORKER_SALARIES.assentamento) +
    (workers.sinalizacao * WORKER_SALARIES.sinalizacao) +
    (workers.explosivos * WORKER_SALARIES.explosivos) +
    (workers.manutencao * WORKER_SALARIES.manutencao);

  const monthlyFines = activeEvents.reduce((acc, e) => acc + (e.costPerMonth ?? 0), 0);
  const monthlyRevenue = budgetState.monthlyRevenue ?? 0;
  const monthlyFlow = monthlyRevenue - totalPayroll - monthlyFines;
  const isPositive = monthlyFlow >= 0;

  const completedEdges = edges.filter(e => e.status === 'complete');

  return (
    <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80 bg-slate-950/20 custom-scrollbar">

      {/* Fluxo Mensal */}
      <div className="p-3.5 flex flex-col gap-2.5">
        <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">💰 Fluxo de Caixa Mensal</span>
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-emerald-400 font-bold">+ Receita de Transporte</span>
            <span className="text-emerald-300 font-mono font-bold">{fmt(monthlyRevenue)}</span>
          </div>
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-rose-400 font-bold">− Folha de Pagamento</span>
            <span className="text-rose-300 font-mono font-bold">−{fmt(totalPayroll)}</span>
          </div>
          {monthlyFines > 0 && (
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-orange-400 font-bold">− Multas de Crise</span>
              <span className="text-orange-300 font-mono font-bold">−{fmt(monthlyFines)}</span>
            </div>
          )}
          <div className={`flex justify-between items-center text-[12px] font-black border-t border-slate-700 pt-1.5 mt-0.5`}>
            <span className={isPositive ? 'text-emerald-400' : 'text-rose-400'}>= Saldo Mensal</span>
            <span className={`font-mono ${isPositive ? 'text-emerald-300' : 'text-rose-300'}`}>
              {isPositive ? '+' : ''}{fmt(monthlyFlow)}
            </span>
          </div>
        </div>
      </div>

      {/* Caixa atual */}
      <div className="p-3.5 flex flex-col gap-2">
        <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">🏦 Posição Financeira</span>
        <div className="grid grid-cols-2 gap-2">
          <div className={`rounded-lg border p-2.5 ${budgetState.currentBudget >= 0 ? 'border-emerald-700/40 bg-emerald-950/20' : 'border-rose-700/40 bg-rose-950/20'}`}>
            <p className="text-[9px] text-slate-400 uppercase font-bold mb-0.5">Caixa Atual</p>
            <p className={`text-[11px] font-black font-mono ${budgetState.currentBudget >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
              {budgetState.currentBudget >= 0 ? '' : '−'}{fmt(Math.abs(budgetState.currentBudget))}
            </p>
          </div>
          <div className="rounded-lg border border-sky-700/40 bg-sky-950/20 p-2.5">
            <p className="text-[9px] text-slate-400 uppercase font-bold mb-0.5">Receita Total</p>
            <p className="text-[11px] font-black font-mono text-sky-300">{fmt(budgetState.totalRevenue ?? 0)}</p>
          </div>
          <div className="rounded-lg border border-amber-700/40 bg-amber-950/20 p-2.5">
            <p className="text-[9px] text-slate-400 uppercase font-bold mb-0.5">Folha Paga (total)</p>
            <p className="text-[11px] font-black font-mono text-amber-300">−{fmt(budgetState.spentOnWorkers ?? 0)}</p>
          </div>
          <div className="rounded-lg border border-purple-700/40 bg-purple-950/20 p-2.5">
            <p className="text-[9px] text-slate-400 uppercase font-bold mb-0.5">Subsídios Ganhos</p>
            <p className="text-[11px] font-black font-mono text-purple-300">+{fmt(budgetState.grantIncome)}</p>
          </div>
        </div>
      </div>

      {/* Gastos com Infraestrutura */}
      <div className="p-3.5 flex flex-col gap-2">
        <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">🏗️ Gastos com Obras</span>
        <div className="flex flex-col gap-1 text-[10px]">
          {[
            { label: '🚂 Ferrovias', value: budgetState.spentRail },
            { label: '🚢 Hidrovias', value: budgetState.spentBalsa },
            { label: '🔧 Pátios', value: budgetState.spentYards },
            { label: '★ Terminais', value: budgetState.spentHubs },
            { label: '📦 Materiais', value: budgetState.spentOnResources ?? 0 },
          ].filter(i => i.value > 0).map(item => (
            <div key={item.label} className="flex justify-between text-slate-300">
              <span className="text-slate-400">{item.label}</span>
              <span className="font-mono">−{fmt(item.value)}</span>
            </div>
          ))}
          <div className="flex justify-between font-bold border-t border-slate-700 pt-1 mt-0.5">
            <span className="text-slate-300">Total Investido</span>
            <span className="font-mono text-rose-300">−{fmt(budgetState.totalSpent)}</span>
          </div>
        </div>
      </div>

      {/* Histórico de Caixa */}
      <div className="p-3.5 flex flex-col gap-2">
        <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">📈 Histórico de Caixa</span>
        {budgetHistory.length < 2 ? (
          <p className="text-[9.5px] text-slate-500 italic">Aguardando dados do próximo mês...</p>
        ) : (() => {
          const W = 280, H = 72;
          const values = budgetHistory.map(h => h.budget);
          const minB = Math.min(...values);
          const maxB = Math.max(...values);
          const range = maxB - minB || 1;
          const zeroY = minB < 0 ? H - ((-minB) / range) * (H - 8) - 4 : null;
          const pts = budgetHistory.map((h, i) => {
            const x = (i / (budgetHistory.length - 1)) * W;
            const y = H - ((h.budget - minB) / range) * (H - 8) - 4;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          }).join(' ');
          const last = values[values.length - 1];
          const first = values[0];
          const lineColor = last >= first ? '#10b981' : '#f43f5e';
          return (
            <div>
              <svg width="100%" viewBox={`0 0 ${W} ${H + 10}`} className="overflow-visible">
                {zeroY !== null && (
                  <line x1="0" y1={zeroY} x2={W} y2={zeroY} stroke="#f43f5e" strokeWidth="0.5" strokeDasharray="4,3" opacity="0.5" />
                )}
                <polyline points={pts} fill="none" stroke={lineColor} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                <text x="0" y={H + 9} fontSize="7" fill="#64748b">{budgetHistory[0].label}</text>
                <text x={W} y={H + 9} fontSize="7" fill="#64748b" textAnchor="end">{budgetHistory[budgetHistory.length - 1].label}</text>
                <text x={W} y="8" fontSize="7" fill="#94a3b8" textAnchor="end">{fmtShort(maxB)}</text>
                <text x={W} y={H - 2} fontSize="7" fill="#94a3b8" textAnchor="end">{fmtShort(minB)}</text>
              </svg>
            </div>
          );
        })()}
      </div>

      {/* Crises ativas e seus custos */}
      {activeEvents.filter(e => (e.costPerMonth ?? 0) > 0).length > 0 && (
        <div className="p-3.5 flex flex-col gap-2">
          <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">⚠️ Crises com Custo Mensal</span>
          <div className="flex flex-col gap-1.5">
            {activeEvents.filter(e => (e.costPerMonth ?? 0) > 0).map(e => (
              <div key={e.id} className="flex justify-between text-[10px] bg-rose-950/20 border border-rose-700/30 rounded-lg px-2.5 py-1.5">
                <span className="text-rose-300 font-bold">{e.title}</span>
                <span className="text-rose-400 font-mono font-bold">−{fmt(e.costPerMonth!)} /mês × {e.monthsLeft}m</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rotas em operação */}
      {completedEdges.length > 0 && (
        <div className="p-3.5 flex flex-col gap-2">
          <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">🚂 {completedEdges.length} Rotas em Operação</span>
          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
            {completedEdges.map(e => {
              const rev = Math.round(e.distance * (e.type === 'balsa' ? 40000 : 80000));
              return (
                <div key={e.id} className="flex items-center justify-between text-[9.5px] px-2 py-1 bg-slate-900/50 rounded border border-slate-800">
                  <span className="text-slate-300 font-bold truncate max-w-[60%]">
                    {e.type === 'balsa' ? '🚢' : '🚂'} {cityName(e.from)} ↔ {cityName(e.to)}
                  </span>
                  <span className="text-emerald-400 font-mono shrink-0">+{fmtShort(rev)}/mês</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
