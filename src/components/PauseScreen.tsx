import React from 'react';
import { Train, Play, TrendingUp, MapPin, Wrench, Star, Calendar } from 'lucide-react';

const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
];

function fmt(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9)  return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6)  return `${(n / 1e6).toFixed(1)}M`;
  return n.toLocaleString('pt-BR');
}

interface PauseScreenProps {
  gameYear: number;
  monthIdx: number;
  connectionsCount: number;
  totalDistanceKm: number;
  currentBudget: number;
  monthlyRevenue: number;
  totalRevenue: number;
  maintenanceYardsCount: number;
  upgradedHubsCount: number;
  constructionQueueCount: number;
  onResume: () => void;
}

export default function PauseScreen({
  gameYear,
  monthIdx,
  connectionsCount,
  totalDistanceKm,
  currentBudget,
  monthlyRevenue,
  totalRevenue,
  maintenanceYardsCount,
  upgradedHubsCount,
  constructionQueueCount,
  onResume,
}: PauseScreenProps) {
  const yearsLeft = 2077 - gameYear;
  const progressPct = Math.round(((gameYear - 2027) / 50) * 100);

  return (
    <div className="fixed inset-0 z-[8000] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md mx-4 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />
        <div className="px-6 pt-5 pb-2 flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20">
            <Train className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h2 className="text-white font-display font-bold text-lg leading-none">Jogo Pausado</h2>
            <p className="text-slate-400 text-xs mt-0.5">
              {MONTHS[monthIdx]} de {gameYear}
            </p>
          </div>
        </div>

        {/* Timeline progress */}
        <div className="px-6 py-3">
          <div className="flex justify-between text-[10px] text-slate-500 mb-1">
            <span>2027</span>
            <span className="text-amber-400 font-semibold">{progressPct}% do prazo decorrido</span>
            <span>2077</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-center text-[10px] text-slate-500 mt-1">
            {yearsLeft > 0 ? `${yearsLeft} anos restantes até o prazo` : 'Prazo atingido!'}
          </p>
        </div>

        {/* Stats grid */}
        <div className="px-6 pb-4 grid grid-cols-2 gap-2.5">
          <StatCard icon={<MapPin className="w-3.5 h-3.5 text-sky-400" />} label="Conexões ativas" value={connectionsCount.toString()} />
          <StatCard icon={<Train className="w-3.5 h-3.5 text-emerald-400" />} label="Extensão da malha" value={`${Math.round(totalDistanceKm).toLocaleString('pt-BR')} km`} />
          <StatCard icon={<TrendingUp className="w-3.5 h-3.5 text-amber-400" />} label="Orçamento atual" value={`R$ ${fmt(currentBudget)}`} highlight={currentBudget < 0} />
          <StatCard icon={<TrendingUp className="w-3.5 h-3.5 text-green-400" />} label="Receita/mês" value={`R$ ${fmt(monthlyRevenue)}`} />
          <StatCard icon={<Star className="w-3.5 h-3.5 text-amber-400" />} label="Terminais Centrais" value={upgradedHubsCount.toString()} />
          <StatCard icon={<Wrench className="w-3.5 h-3.5 text-teal-400" />} label="Pátios de Manutenção" value={maintenanceYardsCount.toString()} />
          {constructionQueueCount > 0 && (
            <StatCard
              icon={<Calendar className="w-3.5 h-3.5 text-orange-400" />}
              label="Obras em andamento"
              value={`${constructionQueueCount} trecho(s)`}
              fullWidth
            />
          )}
        </div>

        {/* Resume button */}
        <div className="px-6 pb-6">
          <button
            onClick={onResume}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-amber-500/20 active:scale-95"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            Continuar Jogo
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, highlight = false, fullWidth = false }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <div className={`bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 ${fullWidth ? 'col-span-2' : ''}`}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[9.5px] text-slate-400 uppercase tracking-wide font-medium">{label}</span>
      </div>
      <p className={`text-sm font-bold ${highlight ? 'text-rose-400' : 'text-white'}`}>{value}</p>
    </div>
  );
}
