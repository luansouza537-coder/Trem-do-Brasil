import React, { useState, useMemo } from 'react';
import { City, Edge, GameResources, GameEvent, GameWorkers, ConstructionProject, InfraProject } from '../../types';
import { RESOURCE_BUY_PRICES, RESOURCE_NAMES, WORKER_SALARIES, WORKER_NAMES, FundGrant } from '../../utils/gameRules';
import { getAdvisorMessages, AdvisorPriority } from '../../utils/advisor';
import { AlertTriangle, Users, CheckCircle, Info } from 'lucide-react';

const SPECIALIST_NAMES = ['Eng. Souza', 'Dr. Carvalho', 'Tec. Lima', 'Eng. Silva', 'Dr. Oliveira', 'Tec. Santos', 'Eng. Pereira', 'Dr. Costa', 'Tec. Rodrigues', 'Eng. Almeida', 'Dr. Nascimento', 'Tec. Ferreira', 'Eng. Gomes', 'Dr. Araújo', 'Tec. Martins', 'Eng. Ribeiro', 'Dr. Barbosa', 'Tec. Melo', 'Eng. Vieira', 'Dr. Xavier'];
const getSpecialistName = (role: string): string => {
  const hash = role.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return SPECIALIST_NAMES[hash % SPECIALIST_NAMES.length];
};

interface OperationsTabProps {
  cities: City[];
  edges: Edge[];
  maintenanceYards: string[];
  upgradedHubs: string[];
  resources: GameResources;
  workers: GameWorkers;
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
  unmaintainedEdgesCount: number;
  nearestYardDistances: Record<string, number>;
  gameYear: number;
  monthIdx: number;
  activeEvents: GameEvent[];
  constructionQueue: ConstructionProject[];
  autoBuyResources: boolean;
  infraQueue: InfraProject[];
  budgetHistory: { label: string; budget: number }[];
  onFlyToRegion?: (lat: number, lng: number) => void;
  onBuyResource: (resKey: keyof GameResources, amount: number) => void;
  onToggleAutoBuyResources: () => void;
  onHireWorker: (role: keyof GameWorkers, count: number) => void;
  onFireWorker: (role: keyof GameWorkers, count: number) => void;
}

export default function OperationsTab({
  cities,
  edges,
  maintenanceYards,
  upgradedHubs,
  resources,
  workers,
  budgetState,
  unmaintainedEdgesCount,
  nearestYardDistances,
  gameYear,
  monthIdx,
  activeEvents,
  constructionQueue,
  autoBuyResources,
  infraQueue,
  budgetHistory,
  onFlyToRegion,
  onBuyResource,
  onToggleAutoBuyResources,
  onHireWorker,
  onFireWorker,
}: OperationsTabProps) {
  const [showHowToPlay, setShowHowToPlay] = useState(true);

  const totalPayroll = useMemo(() => {
    return (workers.terraplanagem * WORKER_SALARIES.terraplanagem) +
           (workers.assentamento  * WORKER_SALARIES.assentamento)  +
           (workers.sinalizacao   * WORKER_SALARIES.sinalizacao)   +
           (workers.explosivos    * WORKER_SALARIES.explosivos)    +
           (workers.manutencao    * WORKER_SALARIES.manutencao);
  }, [workers]);

  const borderColor: Record<AdvisorPriority, string> = {
    critical: 'border-rose-500/60 bg-rose-950/20',
    warning:  'border-amber-500/50 bg-amber-950/15',
    tip:      'border-sky-500/40 bg-sky-950/15',
    positive: 'border-emerald-500/40 bg-emerald-950/15',
  };
  const titleColor: Record<AdvisorPriority, string> = {
    critical: 'text-rose-400',
    warning:  'text-amber-400',
    tip:      'text-sky-400',
    positive: 'text-emerald-400',
  };

  const advisorMsgs = getAdvisorMessages({
    cities,
    edges,
    maintenanceYards,
    upgradedHubs,
    resources,
    workers,
    currentBudget: budgetState.currentBudget,
    monthlyRevenue: budgetState.monthlyRevenue ?? 0,
    activeEvents,
    constructionQueue,
    unmaintainedEdgesCount,
    gameYear,
    monthIdx,
  });

  return (
    <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80 bg-slate-950/20 custom-scrollbar">

      {/* 0. Conselheiro RENIF */}
      {advisorMsgs.length > 0 && (
        <div className="p-3 bg-slate-900/40 flex flex-col gap-2">
          <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase flex items-center gap-1.5">
            🧠 Conselheiro RENIF
          </span>
          <div className="flex flex-col gap-1.5">
            {advisorMsgs.map(msg => (
              <div key={msg.id} className={`rounded-lg border p-2.5 ${borderColor[msg.priority]}`}>
                <p className={`text-[10px] font-bold mb-0.5 ${titleColor[msg.priority]}`}>
                  {msg.icon} {msg.title}
                </p>
                <p className="text-[9.5px] text-slate-300 leading-relaxed">{msg.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fly-to-Region */}
      {onFlyToRegion && (
        <div className="p-3 bg-slate-950/60 border-b border-slate-850 flex flex-col gap-2 shrink-0">
          <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">🗺️ Regiões</span>
          <div className="flex flex-wrap gap-1.5">
            {([
              { label: 'Norte', lat: -3.5, lng: -62 },
              { label: 'Nordeste', lat: -8, lng: -38 },
              { label: 'Centro-Oeste', lat: -15.5, lng: -52 },
              { label: 'Sudeste', lat: -20, lng: -44 },
              { label: 'Sul', lat: -27, lng: -52 },
            ] as const).map(r => (
              <button
                key={r.label}
                onClick={() => onFlyToRegion(r.lat, r.lng)}
                className="px-2 py-1 rounded-lg text-[9px] font-bold bg-slate-800 border border-slate-700 text-slate-300 hover:bg-amber-500/20 hover:text-amber-300 hover:border-amber-500/40 transition cursor-pointer"
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 1. Finanças detalhadas (Demonstrativo) */}
      <div className="p-3.5 bg-slate-900/30 flex flex-col gap-2">
        <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase flex items-center gap-1.5">
          📊 Demonstrativo de Finanças:
        </span>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-slate-400 bg-slate-950/50 p-2 rounded-lg border border-slate-850">
          <div className="flex justify-between"><span>Vias Férreas:</span> <span className="text-slate-200 font-mono">R$ {budgetState.spentRail.toLocaleString('pt-BR')}</span></div>
          <div className="flex justify-between"><span>Pátios (🔧):</span> <span className="text-slate-200 font-mono">R$ {budgetState.spentYards.toLocaleString('pt-BR')}</span></div>
          <div className="flex justify-between"><span>Balsas (🚢):</span> <span className="text-slate-200 font-mono">R$ {budgetState.spentBalsa.toLocaleString('pt-BR')}</span></div>
          <div className="flex justify-between"><span>Cen. Hubs (★):</span> <span className="text-slate-200 font-mono">R$ {budgetState.spentHubs.toLocaleString('pt-BR')}</span></div>
          <div className="flex justify-between col-span-2 border-t border-slate-850 pt-1 mt-1 text-[9.5px]">
            <span className="text-amber-500 font-semibold">Salários de RH Pagos:</span>
            <span className="text-amber-400 font-mono font-bold">R$ {(budgetState.spentOnWorkers ?? 0).toLocaleString('pt-BR')}</span>
          </div>
          <div className="flex justify-between col-span-2 border-t border-slate-850 pt-1 mt-1 text-[9.5px]">
            <span className="text-amber-500 font-semibold">Compra de Materiais:</span>
            <span className="text-amber-400 font-mono font-bold">R$ {(budgetState.spentOnResources ?? 0).toLocaleString('pt-BR')}</span>
          </div>
          <div className="col-span-2 border-t border-slate-805 pt-1 mt-1 flex justify-between">
             <span className="text-emerald-500 font-medium">Subsídios Regionais:</span>
             <span className="text-emerald-400 font-bold font-sans">+R$ {budgetState.grantIncome.toLocaleString('pt-BR')}</span>
          </div>
          <div className="col-span-2 border-t border-slate-850 pt-1 mt-1 flex justify-between text-[9.5px]">
            <span className="text-sky-400 font-semibold">Receita Mensal (Transporte):</span>
            <span className="text-sky-300 font-bold font-mono">+R$ {(budgetState.monthlyRevenue ?? 0).toLocaleString('pt-BR')}/mês</span>
          </div>
          <div className="col-span-2 flex justify-between text-[9.5px]">
            <span className="text-sky-500 font-medium">Receita Total Acumulada:</span>
            <span className="text-sky-400 font-bold font-mono">+R$ {(budgetState.totalRevenue ?? 0).toLocaleString('pt-BR')}</span>
          </div>
        </div>
      </div>

      {/* 1b. Histórico de Caixa (SVG chart) */}
      <div className="p-3.5 bg-slate-900/20 flex flex-col gap-2">
        <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase flex items-center gap-1.5">
          📈 Histórico de Caixa (últimos 24 meses):
        </span>
        {budgetHistory.length < 2 ? (
          <p className="text-[9.5px] text-slate-500 italic">Aguardando dados do próximo mês...</p>
        ) : (() => {
          const W = 280, H = 64;
          const minB = Math.min(...budgetHistory.map(h => h.budget));
          const maxB = Math.max(...budgetHistory.map(h => h.budget));
          const range = maxB - minB || 1;
          const pts = budgetHistory.map((h, i) => {
            const x = (i / (budgetHistory.length - 1)) * W;
            const y = H - ((h.budget - minB) / range) * (H - 8) - 4;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          }).join(' ');
          const isUp = budgetHistory[budgetHistory.length - 1].budget >= budgetHistory[0].budget;
          const lineColor = isUp ? '#10b981' : '#f43f5e';
          const fmt = (v: number) => v >= 1e12 ? `${(v/1e12).toFixed(1)}T` : v >= 1e9 ? `${(v/1e9).toFixed(0)}B` : `${(v/1e6).toFixed(0)}M`;
          return (
            <div className="relative">
              <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
                <polyline points={pts} fill="none" stroke={lineColor} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
                <text x="0" y={H} fontSize="7" fill="#64748b">{budgetHistory[0].label}</text>
                <text x={W} y={H} fontSize="7" fill="#64748b" textAnchor="end">{budgetHistory[budgetHistory.length-1].label}</text>
                <text x={W} y="8" fontSize="7" fill="#94a3b8" textAnchor="end">{fmt(maxB)}</text>
                <text x={W} y={H - 2} fontSize="7" fill="#94a3b8" textAnchor="end">{fmt(minB)}</text>
              </svg>
            </div>
          );
        })()}
      </div>

      {/* 2. Equipe de Engenharia (Trabalhadores) */}
      <div className="p-3.5 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-amber-500" /> Equipes de Obra:
            <span className="text-slate-500 font-normal normal-case tracking-normal">
              {Object.values(workers).reduce((a, b) => a + b, 0).toLocaleString('pt-BR')} pessoas
            </span>
          </span>
          <div className="text-right">
            <span className="text-[9.5px] text-amber-400 font-bold font-mono block">R$ {totalPayroll.toLocaleString('pt-BR')}/mês</span>
            <span className="text-[8px] text-slate-500 font-mono">R$ {(totalPayroll * 12).toLocaleString('pt-BR')}/ano</span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 mt-1">
          {(Object.keys(workers) as Array<keyof GameWorkers>).map((key) => {
            const qty = workers[key] ?? 0;
            const salary = WORKER_SALARIES[key];
            const emoji = key === 'terraplanagem' ? '🚜' : key === 'assentamento' ? '🔩' : key === 'sinalizacao' ? '⚡' : key === 'explosivos' ? '🧨' : '🔧';
            const desc = key === 'terraplanagem' ? 'Escavação, aterros e preparo do leito ferroviário' :
                         key === 'assentamento'  ? 'Colocação de dormentes, trilhos e lastro de brita' :
                         key === 'sinalizacao'   ? 'Cabos de cobre, sinaleiros e controle de tráfego' :
                         key === 'explosivos'    ? 'Perfuração e detonação em serras e montanhas' :
                                                  'Inspeção e reparo de trilhos em operação';

            const maintEffect = key === 'manutencao' ? (
              qty === 0
                ? { label: '⚠️ Sem manutenção: -15% receita', cls: 'text-red-400' }
                : qty >= 100
                  ? { label: `✅ Bônus: +${Math.min(20, Math.floor((qty - 100) / 50) * 5)}% receita`, cls: 'text-emerald-400' }
                  : { label: '— Sem bônus (≥100 para +receita)', cls: 'text-slate-500' }
            ) : null;

            return (
              <div key={key} className={`bg-slate-950/75 border p-2 rounded-lg flex flex-col gap-1 ${key === 'manutencao' ? (qty === 0 ? 'border-red-900/60' : qty >= 100 ? 'border-emerald-900/60' : 'border-slate-850') : 'border-slate-850'}`}>
                <div className="flex items-center justify-between gap-1.5">
                  <div className="min-w-0">
                    <span className="text-[10px] font-black text-slate-200 block truncate leading-tight">
                      {emoji} {WORKER_NAMES[key]}
                    </span>
                    <span className="text-[8.5px] text-slate-400 block leading-tight">{desc}</span>
                    {qty > 0 && (
                      <span className="text-[8px] text-sky-400 block leading-tight">Equipe chefiada por {getSpecialistName(key)}</span>
                    )}
                    <span className="text-[8px] text-slate-500 font-bold font-sans">
                      R$ {salary.toLocaleString('pt-BR')}/pessoa/mês
                    </span>
                    {maintEffect && (
                      <span className={`text-[8px] font-bold block mt-0.5 ${maintEffect.cls}`}>{maintEffect.label}</span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[14px] font-black text-amber-400 font-sans block">
                      {qty.toLocaleString('pt-BR')}
                    </span>
                    <span className="text-[8px] text-slate-500">pessoas</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-900/60 pt-1.5 mt-1 gap-1">
                  <div className="flex gap-1">
                    <button onClick={() => onFireWorker(key, 100)} disabled={qty <= 0}
                      className="px-1.5 py-0.5 rounded bg-slate-850 hover:bg-rose-950 hover:text-rose-400 border border-slate-700 disabled:opacity-30 transition cursor-pointer text-[8px] font-black uppercase">
                      -100
                    </button>
                    <button onClick={() => onFireWorker(key, 50)} disabled={qty <= 0}
                      className="px-1 py-0.5 rounded bg-slate-850 hover:bg-rose-950/40 hover:text-rose-400 border border-slate-700 disabled:opacity-30 transition cursor-pointer text-[8px]">
                      -50
                    </button>
                    <button onClick={() => onFireWorker(key, 10)} disabled={qty <= 0}
                      className="px-1 py-0.5 rounded bg-slate-850 hover:bg-rose-950/40 hover:text-rose-400 border border-slate-700 disabled:opacity-30 transition cursor-pointer text-[8px]">
                      -10
                    </button>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => onHireWorker(key, 10)}
                      className="px-1 py-0.5 rounded bg-slate-850 hover:bg-amber-500/10 hover:text-amber-400 border border-slate-700 cursor-pointer text-[8px]">
                      +10
                    </button>
                    <button onClick={() => onHireWorker(key, 50)}
                      className="px-1 py-0.5 rounded bg-slate-850 hover:bg-amber-500/10 hover:text-amber-400 border border-slate-700 cursor-pointer text-[8px]">
                      +50
                    </button>
                    <button onClick={() => onHireWorker(key, 100)}
                      className="px-1.5 py-0.5 rounded bg-slate-850 text-slate-300 hover:bg-amber-500 hover:text-slate-950 border border-slate-700 transition cursor-pointer text-[8px] font-black uppercase">
                      +100
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2b. Obras em Andamento */}
      {constructionQueue.length > 0 && (
        <div className="p-3.5 flex flex-col gap-2 bg-orange-950/10 border-t border-orange-500/20">
          <span className="text-[10px] text-orange-400 font-semibold tracking-wider uppercase flex items-center gap-1.5">
            🚧 Obras em Andamento ({constructionQueue.length})
            {constructionQueue.length > 0 && (
              <span className="text-[9px] text-slate-500 normal-case font-normal tracking-normal">
                — média {Math.round(constructionQueue.reduce((s, p) => s + p.monthsRemaining, 0) / constructionQueue.length)} meses
              </span>
            )}
          </span>
          <div className="flex flex-col gap-2">
            {constructionQueue.map(p => {
              const pct = Math.round(((p.totalMonths - p.monthsRemaining) / p.totalMonths) * 100);
              return (
                <div key={p.edgeId} className="bg-slate-950/60 border border-orange-500/20 rounded-lg p-2 flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[9.5px] font-bold text-slate-200 truncate">
                      {p.type === 'balsa' ? '🚢' : '🚂'} {p.from} → {p.to}
                    </span>
                    <span className="text-[8px] text-orange-400 font-bold shrink-0 ml-1">
                      {p.monthsRemaining} mes(es)
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
                    <div className="h-full bg-orange-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] text-slate-500">{p.distance.toFixed(0)} km · {pct}% concluído</span>
                    {p.workersAllocated && (
                      <span className="text-[7.5px] text-orange-400/80 font-mono">
                        👷 {Object.entries(p.workersAllocated).filter(([,v]) => v > 0).map(([k,v]) => `${v} ${k.slice(0,4)}.`).join(' ')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Insumos de Construção */}
      <div className="p-3.5 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase flex items-center gap-1">
            📦 Insumos de Construção (Estoque):
          </span>
          <label className="flex items-center gap-1.5 cursor-pointer" title="Adquire insumos automaticamente durante as obras se houver recursos financeiros suficientes">
            <input
              type="checkbox"
              checked={autoBuyResources}
              onChange={onToggleAutoBuyResources}
              className="w-3 h-3 rounded border-slate-705 bg-slate-950 text-amber-500 font-bold focus:ring-0 cursor-pointer"
            />
            <span className="text-[9.5px] font-bold text-slate-300">Auto-Comprar</span>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-1">
          {(Object.keys(RESOURCE_NAMES) as Array<keyof GameResources>).map((key) => {
            const qty = resources[key] ?? 0;
            const hasStock = qty > 0;
            const isCrisis = activeEvents.some(e =>
              (key === 'aco' && e.statusEffect === 'INFLACAO_GLOBAL') ||
              (key === 'cobre' && e.statusEffect === 'INFLACAO_GLOBAL') ||
              (key === 'madeira' && e.statusEffect === 'ESCASSES_MADEIRA') ||
              (key === 'explosivos' && e.statusEffect === 'CRISE_EXPLOSIVOS')
            );
            const rawCost = RESOURCE_BUY_PRICES[key];
            const activeCost = isCrisis ? rawCost * 2.0 : rawCost;
            const bundleSize = key === 'explosivos' ? 20 : key === 'cobre' ? 50 : key === 'brita' ? 250 : 100;

            return (
              <div key={key} className="bg-slate-950/70 border border-slate-850 p-2 rounded-lg flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-300 flex items-center gap-1 truncate">
                    {key === 'aco' && '🔩'}
                    {key === 'brita' && '🪨'}
                    {key === 'madeira' && '🪵'}
                    {key === 'cimento' && '🧱'}
                    {key === 'cobre' && '⚡'}
                    {key === 'explosivos' && '🧨'}
                    {RESOURCE_NAMES[key]}
                  </span>
                  <span className={`text-[11px] font-black shrink-0 ${hasStock ? 'text-amber-400' : 'text-rose-500'}`}>
                    {qty.toLocaleString('pt-BR')} t
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-slate-900/60 pt-1.5 mt-1.5">
                  <span className={`text-[8.5px] truncate font-semibold ${isCrisis ? 'text-red-400 font-extrabold' : 'text-slate-500'}`} title={isCrisis ? "Preço de escassez inflacionado" : "Preço de mercado"}>
                    {isCrisis ? '⚠️ ' : ''}R$ {(activeCost / 1000000).toFixed(1)}M
                  </span>
                  <button
                    onClick={() => onBuyResource(key, bundleSize)}
                    className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-slate-850 text-slate-300 hover:bg-amber-500 hover:text-slate-950 border border-slate-700 hover:border-amber-500 transition cursor-pointer"
                  >
                    +{bundleSize}t
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Crises em Andamento */}
      {activeEvents.length > 0 && (
        <div className="p-3.5 bg-slate-900/10 flex flex-col gap-2">
          <span className="text-[10px] text-rose-450 font-extrabold tracking-wider uppercase flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            Crises e Multas Ativas ({activeEvents.length}):
          </span>
          <div className="flex flex-col gap-1.5">
            {activeEvents.map((e) => (
              <div key={e.id} className="bg-rose-950/20 border border-rose-500/20 rounded-lg p-2 flex flex-col justify-between">
                <div className="flex justify-between items-start gap-1">
                  <span className="text-[10px] font-black text-rose-300 leading-tight">{e.title}</span>
                  <span className="text-[8px] font-black text-rose-400 uppercase bg-rose-950 px-1 py-0.5 rounded border border-rose-900/30 shrink-0">
                    {e.monthsLeft} meses
                  </span>
                </div>
                <p className="text-[8.5px] text-slate-400 leading-snug mt-1 italic">
                  {e.statusEffect === 'GREVE_GERAL' && '• Custos operacionais do projeto acrescidos em +25%.'}
                  {e.statusEffect === 'ATRASO_AMBIENTAL_AMAZONIA' && '• Metais e cimento do Norte encarecem +50%.'}
                  {e.statusEffect === 'INFLACAO_GLOBAL' && '• Inflação: Dobra o custo de compra de Aço & Cobre.'}
                  {e.statusEffect === 'ESCASSES_MADEIRA' && '• Desgaste: Madeira e dormentes exigem 1.8x.'}
                  {e.statusEffect === 'LOBBY_REGIONAL' && '• Multas regulatórias atrasam repasses estruturais.'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Regional Intermodal Export Grants */}
      <div className="p-3.5 flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-amber-500" /> Bônus de Exportação (Porto-Trilho):
          </span>
          <span className="text-[9px] text-emerald-400 bg-emerald-950 border border-emerald-900 p-0.5 px-1 rounded font-bold">
            {budgetState.unlockedGrants.filter(g => g.unlocked).length} / {budgetState.unlockedGrants.length}
          </span>
        </div>

        <div className="flex flex-col gap-1 max-h-[140px] overflow-y-auto custom-scrollbar mt-1 pr-1">
          {budgetState.unlockedGrants.map((grant) => (
            <div
              key={grant.id}
              className={`p-1.5 rounded text-[9.5px] border flex justify-between items-center transition ${
                grant.unlocked
                  ? 'bg-emerald-950/25 border-emerald-500/30 text-emerald-300'
                  : 'bg-slate-900/30 border-slate-850 text-slate-500'
              }`}
            >
              <span className="truncate font-medium">{grant.title}</span>
              <span className={`font-mono font-bold ${grant.unlocked ? 'text-emerald-400 font-black' : 'text-slate-600'}`}>
                {grant.unlocked ? '✓ Ganho R$' : '+R$'} {grant.value.toLocaleString('pt-BR')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Instructional Box */}
      {showHowToPlay && (
        <div className="p-3.5 bg-gradient-to-r from-blue-950/30 to-indigo-950/30 text-xs leading-relaxed relative text-slate-300">
          <button
            onClick={() => setShowHowToPlay(false)}
            className="absolute top-2 right-2 text-slate-500 hover:text-slate-300 font-bold"
          >
            ✕
          </button>
          <div className="flex gap-2">
            <Info className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sky-300 mb-1">Como Jogar:</p>
              <ul className="list-disc pl-4 space-y-1 text-slate-300">
                <li>Selecione uma cidade no mapa ou na lista de catálogo.</li>
                <li>Clique em outra cidade para erguer um trilho ou balsa.</li>
                <li>Utilize insumos de estoque para compor as ferrovias.</li>
                <li>Atente-se aos limites de até 2 conexões por cidade!</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
