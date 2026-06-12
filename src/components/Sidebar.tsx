import React, { useState, useMemo } from 'react';
import { City, Edge, GameResources, GameEvent, GameWorkers, ConstructionProject, NewsItem, InfraProject } from '../types';
import { MissionDef } from '../utils/missions';
import { formatDistance } from '../utils/geo';
import { RESOURCE_BUY_PRICES, RESOURCE_NAMES, WORKER_SALARIES, WORKER_NAMES, FundGrant, YARD_CONFIGS, HUB_CONFIG } from '../utils/gameRules';
import {
  Train,
  Search,
  MapPin,
  Volume2,
  VolumeX,
  RotateCw,
  Info,
  Filter,
  CheckCircle,
  Maximize2,
  Anchor,
  Compass,
  Layers,
  Map,
  X,
  AlertTriangle,
  Users,
  UserPlus,
  UserMinus
} from 'lucide-react';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

interface SidebarProps {
  cities: City[];
  edges: Edge[];
  selectedCityId: string | null;
  hoveredCityId: string | null;
  onSelectCity: (cityId: string | null) => void;
  onHoverCity: (cityId: string | null) => void;
  onFlyTo: (lat: number, lng: number) => void;
  onReset: () => void;
  tileLayerType: 'voyager' | 'positron' | 'dark' | 'satellite';
  onTileLayerChange: (type: 'voyager' | 'positron' | 'dark' | 'satellite') => void;
  isMuted: boolean;
  onToggleMute: () => void;
  showSuggestions: boolean;
  onToggleSuggestions: () => void;

  // Tycoon extensions
  upgradedHubs?: string[];
  onBuildHub?: (cityId: string) => void;
  maintenanceYards?: string[];
  onBuildYard?: (cityId: string, level: 1 | 2 | 3) => void;
  infraQueue?: InfraProject[];
  yardLevels?: Record<string, number>;
  constructionType?: 'rail' | 'balsa';
  onConstructionTypeChange?: (type: 'rail' | 'balsa') => void;
  budgetState?: {
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
  unmaintainedEdgesCount?: number;
  nearestYardDistances?: Record<string, number>;
  gameYear?: number;
  monthIdx?: number;
  playSpeed?: 'paused' | 'normal' | 'fast';
  onPlaySpeedChange?: (speed: 'paused' | 'normal' | 'fast') => void;

  // Resource and crisis management
  resources?: GameResources;
  onBuyResource?: (resKey: keyof GameResources, amount: number) => void;
  autoBuyResources?: boolean;
  onToggleAutoBuyResources?: () => void;
  activeEvents?: GameEvent[];

  // Workforce (Trabalhadores) props
  workers?: GameWorkers;
  onHireWorker?: (role: keyof GameWorkers, count: number) => void;
  onFireWorker?: (role: keyof GameWorkers, count: number) => void;
  budgetHistory?: { label: string; budget: number }[];
  constructionQueue?: ConstructionProject[];

  // New feature props
  onAdvanceMonth?: () => void;
  onExportStats?: () => void;
  saveSlot?: number;
  onSaveSlotChange?: (slot: number) => void;
  slotDates?: (string | null)[];
  missionResults?: (MissionDef & { completed: boolean; current: number; target: number })[];
  newsItems?: NewsItem[];
}

export default function Sidebar({
  cities,
  edges,
  selectedCityId,
  hoveredCityId,
  onSelectCity,
  onHoverCity,
  onFlyTo,
  onReset,
  tileLayerType,
  onTileLayerChange,
  isMuted,
  onToggleMute,
  showSuggestions,
  onToggleSuggestions,

  // Tycoon extensions
  upgradedHubs = [],
  onBuildHub = () => {},
  maintenanceYards = [],
  onBuildYard = () => {},
  infraQueue = [],
  yardLevels = {},
  constructionType = 'rail',
  onConstructionTypeChange = () => {},
  budgetState = {
    totalSpent: 0,
    spentRail: 0,
    spentBalsa: 0,
    spentYards: 0,
    spentHubs: 0,
    grantIncome: 0,
    currentBudget: 1250000000000,
    unlockedGrants: [],
    spentOnWorkers: 0,
    spentOnResources: 0,
  },
  unmaintainedEdgesCount = 0,
  nearestYardDistances = {},
  gameYear = 2027,
  monthIdx = 0,
  playSpeed = 'normal',
  onPlaySpeedChange = () => {},

  // Resource and crisis management
  resources = { aco: 0, brita: 0, madeira: 0, cimento: 0, cobre: 0, explosivos: 0 },
  onBuyResource = () => {},
  autoBuyResources = true,
  onToggleAutoBuyResources = () => {},
  activeEvents = [],

  // Workforce default values
  workers = { terraplanagem: 0, assentamento: 0, sinalizacao: 0, explosivos: 0, manutencao: 0 },
  onHireWorker = () => {},
  onFireWorker = () => {},
  budgetHistory = [],
  constructionQueue = [],
  onAdvanceMonth = () => {},
  onExportStats = () => {},
  saveSlot = 1,
  onSaveSlotChange = () => {},
  slotDates = [null, null, null],
  missionResults = [],
  newsItems = [],
}: SidebarProps) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'cities' | 'operations' | 'missions'>('cities');
  const [typeFilter, setTypeFilter] = useState<'all' | 'capital' | 'cidade' | 'portos' | 'mineracao' | 'polo_agricola' | 'polo_industrial' | 'fronteira'>('all');
  const [connsFilter, setConnsFilter] = useState<'all' | '0' | '1' | '2'>('all');
  const [showHowToPlay, setShowHowToPlay] = useState(true);
  const [showLegend, setShowLegend] = useState(false);
  const [showStateGrid, setShowStateGrid] = useState(false);
  const [expandedNewsId, setExpandedNewsId] = useState<string | null>(null);

  // Calculate connections per city
  const cityConnections = useMemo(() => {
    const counts: Record<string, number> = {};
    cities.forEach(c => { counts[c.id] = 0; });
    edges.forEach(edge => {
      counts[edge.from] = (counts[edge.from] || 0) + 1;
      counts[edge.to] = (counts[edge.to] || 0) + 1;
    });
    return counts;
  }, [cities, edges]);

  // Monthly workforce payroll calculation
  const totalPayroll = useMemo(() => {
    return (workers.terraplanagem * WORKER_SALARIES.terraplanagem) +
           (workers.assentamento  * WORKER_SALARIES.assentamento)  +
           (workers.sinalizacao   * WORKER_SALARIES.sinalizacao)   +
           (workers.explosivos    * WORKER_SALARIES.explosivos)    +
           (workers.manutencao    * WORKER_SALARIES.manutencao);
  }, [workers]);

  // Derived stats
  const totalDistance = useMemo(() => {
    return edges.reduce((acc, edge) => acc + edge.distance, 0);
  }, [edges]);

  const activeConns = edges.length;
  const maxConnsCount = cities.length - 1; // 56 for 57 cities
  const pctComplete = Math.min(100, Math.round((activeConns / maxConnsCount) * 100));

  // Count degrees
  const completedCitiesCount = useMemo(() => {
    return Object.values(cityConnections).filter(c => c === 2).length;
  }, [cityConnections]);

  const leafCitiesCount = useMemo(() => {
    return Object.values(cityConnections).filter(c => c === 1).length;
  }, [cityConnections]);

  const unconnCitiesCount = useMemo(() => {
    return Object.values(cityConnections).filter(c => c === 0).length;
  }, [cityConnections]);

  // Filtered Cities list
  const filteredCities = useMemo(() => {
    return cities.filter(city => {
      const nameMatch = city.name.toLowerCase().includes(search.toLowerCase()) ||
                        city.state.toLowerCase().includes(search.toLowerCase());

      const typeMatch = typeFilter === 'all' ||
                        (typeFilter === 'portos' ? !!city.portType : city.type === typeFilter);

      const conns = cityConnections[city.id] || 0;
      const connsMatch = connsFilter === 'all' || conns.toString() === connsFilter;

      return nameMatch && typeMatch && connsMatch;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [cities, search, typeFilter, connsFilter, cityConnections]);

  return (
    <div id="control-sidebar" className="w-full md:w-96 text-slate-100 flex flex-col h-[40vh] md:h-full overflow-hidden select-none shrink-0">
      {/* Header */}
      <div className="p-4 bg-slate-900 border-b border-slate-700/80 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-amber-500 to-red-600 rounded-xl shadow-inner relative overflow-hidden group">
            <Train className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
            <div className="absolute inset-0 bg-white/20 translate-y-full hover:translate-y-0 transition-transform"></div>
          </div>
          <div>
            <h1 className="font-display font-bold text-lg tracking-tight bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              Trilho Real
            </h1>
            <p className="text-xs text-slate-400 font-medium">Conectando o Brasil 🚂</p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onAdvanceMonth}
            className="p-1.5 rounded-lg border border-sky-900/40 bg-sky-950/20 text-sky-400 hover:bg-sky-900/40 hover:text-sky-200 transition text-[9px] font-black uppercase tracking-wider"
            title="Avançar 1 mês manualmente"
          >
            ⏭+1M
          </button>
          <button
            onClick={onToggleMute}
            className={`p-2 rounded-lg border transition ${
              isMuted
                ? 'border-slate-800 bg-slate-950/40 text-slate-500 hover:text-slate-300'
                : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
            title={isMuted ? "Ativar som" : "Desativar som"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={onReset}
            className="p-2 rounded-lg border border-red-900/30 bg-red-950/20 text-red-400 hover:bg-red-900/40 hover:text-red-300 transition"
            title="Reiniciar jogo"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Compact Header & Permanent Stats */}
      <div className="p-3 bg-slate-950/90 border-b border-slate-800 flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Concessão</span>
            <span className="text-xs font-black text-slate-100">
              {MONTHS[monthIdx]}/2077 de <span className="text-amber-400">{gameYear}</span>
            </span>
          </div>
          <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 shrink-0">
            <button
              onClick={() => onPlaySpeedChange('paused')}
              className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                playSpeed === 'paused' ? 'bg-rose-500 text-slate-950 font-black' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ⏸️ Pausar
            </button>
            <button
              onClick={() => onPlaySpeedChange('normal')}
              className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                playSpeed === 'normal' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ⏱️ 1x
            </button>
            <button
              onClick={() => onPlaySpeedChange('fast')}
              className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                playSpeed === 'fast' ? 'bg-sky-500 text-slate-950 font-black' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ⚡ Rápido
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-900/60 pt-2 text-xs">
          <div>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wide block">Caixa</span>
            <span className={`text-[12.5px] font-black font-sans flex items-center gap-1 ${
              budgetState.currentBudget < 0 ? 'text-rose-500' :
              budgetState.currentBudget < 100000000000 ? 'text-rose-400' :
              budgetState.currentBudget < 250000000000 ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {budgetState.currentBudget < 100000000000 && <span title="Caixa crítico!">⚠️</span>}
              R$ {budgetState.currentBudget.toLocaleString('pt-BR')}
            </span>
          </div>
          <div className="text-right flex flex-col items-end gap-0.5">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wide block">Conexões</span>
            <span className="text-[11px] font-black text-amber-400">
              {activeConns} / {maxConnsCount} ({pctComplete}%)
            </span>
            {/* Save slot selector */}
            <div className="flex gap-0.5 mt-0.5">
              {[1, 2, 3].map(s => (
                <button
                  key={s}
                  onClick={() => onSaveSlotChange(s)}
                  title={`Slot ${s}: ${slotDates[s - 1] ?? 'Vazio'}`}
                  className={`w-5 h-5 rounded text-[8px] font-black border transition cursor-pointer ${
                    saveSlot === s
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : slotDates[s - 1]
                        ? 'bg-emerald-900/40 text-emerald-400 border-emerald-700/40 hover:bg-emerald-800/60'
                        : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-850 bg-slate-900 p-1 gap-0.5 shrink-0">
        {([
          { id: 'cities', label: '🗺️ Rotas', badge: false },
          { id: 'operations', label: '👷 Equipe', badge: activeEvents.length > 0 },
          { id: 'missions', label: '🎯 Objetivos', badge: missionResults.some(m => m.completed) && newsItems.length > 0 },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 text-center py-2 rounded-lg text-[9.5px] font-black tracking-wide transition flex items-center justify-center gap-1 cursor-pointer relative ${
              activeTab === tab.id
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {tab.label}
            {tab.badge && (
              <span className="absolute top-1 right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Operations & Management */}
      {activeTab === 'operations' && (
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80 bg-slate-950/20 custom-scrollbar">

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
              </span>
              <span className="text-[9.5px] text-amber-400 font-bold font-mono">
                R$ {totalPayroll.toLocaleString('pt-BR')}/mês
              </span>
            </div>

            {/* Workers List */}
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

                // Maintenance-specific effect indicator
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
                🚧 Obras em Andamento ({constructionQueue.length}):
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

            {/* Resources Grid */}
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

                // buy bundle size
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
      )}

      {/* Tab: Missions & News */}
      {activeTab === 'missions' && (
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
                const fmt = (v: number) => v >= 1e9 ? `R$ ${(v/1e9).toFixed(0)}B` : `R$ ${(v/1e6).toFixed(0)}M`;
                return (
                  <div key={m.id} className={`p-2.5 rounded-lg border flex flex-col gap-1.5 ${
                    m.completed ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-slate-950/60 border-slate-800'
                  }`}>
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <span className={`text-[10px] font-black block leading-tight ${m.completed ? 'text-emerald-300' : 'text-slate-200'}`}>
                          {m.title}
                        </span>
                        <span className="text-[8.5px] text-slate-400 leading-tight">{m.description}</span>
                      </div>
                      <span className={`text-[9px] font-black shrink-0 ml-1 ${m.completed ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {m.completed ? '✓' : fmt(m.reward)}
                      </span>
                    </div>
                    {!m.completed && (
                      <>
                        <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
                          <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[8px] text-slate-500">{m.current.toLocaleString('pt-BR')} / {m.target.toLocaleString('pt-BR')} — {pct}%</span>
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

          {/* News feed */}
          <div className="p-3.5 flex flex-col gap-2">
            <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">📰 Feed de Notícias:</span>
            {newsItems.length === 0 ? (
              <p className="text-[9.5px] text-slate-500 italic">Nenhuma notícia ainda. Continue construindo a malha!</p>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                {newsItems.map(item => {
                  const isExpanded = expandedNewsId === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setExpandedNewsId(isExpanded ? null : item.id)}
                      className={`p-2 rounded-lg border cursor-pointer transition-colors ${
                        item.category === 'infra'    ? 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/60' :
                        item.category === 'crisis'   ? 'bg-rose-950/20 border-rose-800/30 text-rose-300 hover:bg-rose-950/40' :
                        item.category === 'grant'    ? 'bg-emerald-950/20 border-emerald-800/30 text-emerald-300 hover:bg-emerald-950/40' :
                        item.category === 'mission'  ? 'bg-amber-950/20 border-amber-700/30 text-amber-200 hover:bg-amber-950/40' :
                        'bg-slate-950/40 border-slate-800/60 text-slate-400 hover:bg-slate-900/60'
                      }`}
                    >
                      <span className={`block text-[10px] leading-snug break-words ${isExpanded ? '' : 'line-clamp-2'}`}>{item.headline}</span>
                      <span className="text-[8px] text-slate-500 mt-0.5 block">{item.yearMonth}</span>
                      {!isExpanded && item.headline.length > 60 && (
                        <span className="text-[8px] text-slate-600 mt-0.5 block">clique para ler mais</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Cities list and Map selection */}
      {activeTab === 'cities' && (
        <>
          {/* Region Progress Mini-Map */}
          {(() => {
            const REGIONS: { name: string; color: string; ids: string[] }[] = [
              { name: 'Norte', color: '#10b981', ids: ['17','18','19','20','21','22','27','49','50','73','74','75','76','77','78','82','86','96','97'] },
              { name: 'Nordeste', color: '#f59e0b', ids: ['8','9','10','11','12','13','14','15','16','44','45','46','47','48','51','52','61','62','63','64','65','84','91','92','93'] },
              { name: 'Centro-Oeste', color: '#60a5fa', ids: ['23','24','25','26','53','54','55','79','80','81','87'] },
              { name: 'Sudeste', color: '#a78bfa', ids: ['1','2','3','4','28','29','30','31','38','39','40','41','42','43','58','59','60','83','85','88','90','94','95'] },
              { name: 'Sul', color: '#f472b6', ids: ['5','6','7','32','33','34','35','36','37','56','66','67','68','69','70','71','72','89'] },
            ];
            return (
              <div className="p-3 bg-slate-950/60 border-b border-slate-850 flex flex-col gap-2 shrink-0">
                <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">🗺️ Progresso por Região:</span>
                <div className="flex flex-col gap-1.5">
                  {REGIONS.map(region => {
                    const total = region.ids.length;
                    const connected = region.ids.filter(id => (cityConnections[id] ?? 0) > 0).length;
                    const pct = Math.round((connected / total) * 100);
                    return (
                      <div key={region.name} className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-slate-400 w-20 shrink-0">{region.name}</span>
                        <div className="flex-1 bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: region.color }} />
                        </div>
                        <span className="text-[9px] font-mono text-slate-400 shrink-0 w-10 text-right">{connected}/{total}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Map Legend */}
          <div className="p-2.5 bg-slate-950/50 border-b border-slate-850 shrink-0">
            <button
              onClick={() => setShowLegend(v => !v)}
              className="w-full flex items-center justify-between text-[10px] text-slate-400 font-semibold tracking-wider uppercase"
            >
              <span>🗺️ Legenda do Mapa</span>
              <span className="text-slate-500">{showLegend ? '▲' : '▼'}</span>
            </button>
            {showLegend && (
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[9px] text-slate-400">
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-500 inline-block shrink-0"></span>Não conectada</div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block shrink-0"></span>1 conexão</div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block shrink-0"></span>2 conexões (ok)</div>
                <div className="flex items-center gap-1.5"><span className="font-bold text-amber-400">★</span><span className="ml-1">Terminal Central</span></div>
                <div className="flex items-center gap-1.5"><span>🔧</span><span className="ml-1">Pátio de Manutenção</span></div>
                <div className="flex items-center gap-1.5"><span className="w-6 h-1.5 bg-red-500 inline-block rounded"></span>Ferrovia</div>
                <div className="flex items-center gap-1.5"><span className="w-6 border-t-2 border-dashed border-sky-400 inline-block"></span>Hidrovia</div>
                <div className="flex items-center gap-1.5"><span className="w-6 border-t-2 border-dashed border-orange-500 inline-block"></span>Em construção</div>
                <div className="col-span-2 border-t border-slate-800 pt-1 mt-0.5 text-[8.5px] text-slate-500 font-semibold uppercase tracking-wider">Tipos especiais</div>
                <div className="flex items-center gap-1.5"><span>⛏️</span><span className="text-orange-400">Mineração +40% receita</span></div>
                <div className="flex items-center gap-1.5"><span>🌾</span><span className="text-lime-400">Polo Agrícola +20%</span></div>
                <div className="flex items-center gap-1.5"><span>🏭</span><span className="text-violet-400">Polo Industrial +25%</span></div>
                <div className="flex items-center gap-1.5"><span>🌐</span><span className="text-pink-400">Fronteira +15%</span></div>
              </div>
            )}
          </div>

          {/* State connection grid */}
          <div className="p-2.5 bg-slate-950/50 border-b border-slate-850 shrink-0">
            <button
              onClick={() => setShowStateGrid(v => !v)}
              className="w-full flex items-center justify-between text-[10px] text-slate-400 font-semibold tracking-wider uppercase"
            >
              <span>📍 Conexões por Estado</span>
              <span className="text-slate-500">{showStateGrid ? '▲' : '▼'}</span>
            </button>
            {showStateGrid && (() => {
              const stateCities: Record<string, string[]> = {};
              cities.forEach(c => {
                if (!stateCities[c.state]) stateCities[c.state] = [];
                stateCities[c.state].push(c.id);
              });
              return (
                <div className="mt-2 flex flex-wrap gap-1">
                  {Object.entries(stateCities).sort(([a],[b]) => a.localeCompare(b)).map(([state, ids]) => {
                    const connected = ids.filter(id => (cityConnections[id] ?? 0) > 0).length;
                    const full = connected === ids.length;
                    const partial = connected > 0;
                    return (
                      <div
                        key={state}
                        title={`${state}: ${connected}/${ids.length} cidades conectadas`}
                        className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded border ${
                          full ? 'bg-emerald-900/40 border-emerald-600/40 text-emerald-300'
                               : partial ? 'bg-amber-900/30 border-amber-600/30 text-amber-400'
                               : 'bg-slate-900/40 border-slate-700 text-slate-500'
                        }`}
                      >
                        {state} {connected}/{ids.length}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Construction Mode Selector */}
          <div className="bg-slate-900/95 border-b border-slate-850 p-3 flex flex-col gap-2 shrink-0">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 uppercase text-[9px] tracking-wider">Modo de Obra Ativo:</span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => onConstructionTypeChange('rail')}
                  className={`px-2.5 py-1.5 rounded-lg text-[9.5px] font-bold border flex items-center gap-1.5 transition cursor-pointer ${
                    constructionType === 'rail'
                      ? 'bg-amber-500/25 border-amber-500/50 text-amber-300 font-extrabold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                  title="Assentar trilhos de aço convencionais"
                >
                  <Train className="w-3 h-3 text-amber-450" />
                  Ferrovia
                </button>
                <button
                  onClick={() => onConstructionTypeChange('balsa')}
                  className={`px-2.5 py-1.5 rounded-lg text-[9.5px] font-bold border flex items-center gap-1.5 transition cursor-pointer ${
                    constructionType === 'balsa'
                      ? 'bg-sky-500/25 border-sky-500/50 text-sky-300 font-extrabold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                  title="Interconectar portos temporariamente usando balsa"
                >
                  <Anchor className="w-3 h-3 text-sky-450" />
                  Hidrovia
                </button>
              </div>
            </div>

            {/* Maintenance Risk alert */}
            {unmaintainedEdgesCount > 0 && (
              <div className="bg-rose-950/20 border border-rose-500/30 rounded-lg p-2 flex items-start gap-2.5 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] text-rose-300 font-bold">⚠️ Risco de Quebras!</p>
                  <p className="text-[9px] text-rose-450 leading-tight">Você possui {unmaintainedEdgesCount} trechos distantes mais de 800 km de um pátio de manutenção. Eles correm risco de quebra!</p>
                </div>
              </div>
            )}
          </div>

          {/* Quick Stats Grid */}
          <div className="bg-slate-950/40 p-2.5 border-b border-slate-900 grid grid-cols-2 gap-2 text-center text-[9px] font-bold text-slate-400 shrink-0">
            <div className="bg-slate-900/50 p-1.5 rounded-lg border border-slate-850">
              <span className="block text-[8.5px] text-slate-500 font-normal">Extensão Total</span>
              <span className="text-emerald-400 font-bold block truncate mt-0.5" title={formatDistance(totalDistance)}>
                {totalDistance.toLocaleString('pt-BR')} <span className="text-[8px] font-normal text-slate-400">km</span>
              </span>
            </div>
            <div className="bg-slate-900/50 p-1.5 rounded-lg border border-slate-850 grid grid-cols-3 gap-0.5 text-[10px] text-slate-300">
              <div title="Não conectadas" className="text-slate-405 text-slate-400 font-black">{unconnCitiesCount}</div>
              <div title="Extremidades" className="text-sky-400 font-black">{leafCitiesCount}</div>
              <div title="Conectadas/Saturadas" className="text-emerald-400 font-black">{completedCitiesCount}</div>
            </div>
          </div>

          {/* Map style selector */}
          <div className="px-3 py-1.5 bg-slate-950/60 border-b border-slate-850 flex items-center justify-between text-[10px] text-slate-300 shrink-0">
            <span className="flex items-center gap-1 font-semibold text-slate-400">
              <Layers className="w-3 h-3" /> Estilo:
            </span>
            <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800">
              {(['voyager', 'positron', 'dark', 'satellite'] as const).map((type) => (
                <button
                   key={type}
                   onClick={() => onTileLayerChange(type)}
                   className={`px-1.5 py-0.5 rounded text-[9.5px] capitalize font-semibold transition cursor-pointer ${
                     tileLayerType === type
                       ? 'bg-amber-500 text-slate-950 font-bold'
                       : 'text-slate-400 hover:text-slate-200'
                   }`}
                >
                  {type === 'voyager' ? 'Voyager' : type === 'positron' ? 'Claro' : type === 'dark' ? 'Escuro' : 'Satélite'}
                </button>
              ))}
            </div>
          </div>

          {/* Guia de Trilhas / Sugestões */}
          <div className="px-3 py-1.5 bg-slate-950/65 border-b border-slate-850 flex items-center justify-between text-[10px] text-slate-355 shrink-0">
            <span className="flex items-center gap-1 font-semibold text-slate-400">
              <Compass className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> Guia Planejado:
            </span>
            <button
              onClick={onToggleSuggestions}
              className={`px-2 py-0.5 rounded text-[9px] uppercase font-extrabold tracking-wider transition cursor-pointer ${
                showSuggestions
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-slate-900 text-slate-500 border border-slate-800 hover:text-slate-300'
              }`}
              title="Exibir ou ocultar as linhas recomendadas como guias no mapa"
            >
              {showSuggestions ? 'Ver Guia' : 'Ocultar Guia'}
            </button>
          </div>

          {/* Search & Filters */}
          <div className="p-3 bg-slate-950/40 flex flex-col gap-2 shrink-0 border-b border-slate-900">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar cidade ou estado..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-505 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all font-sans"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300 text-xs"
                >
                  Limpar
                </button>
              )}
            </div>

            {/* Filters bar */}
            <div className="flex flex-col gap-1.5">
              {/* Filter Type */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-500 w-12 font-medium shrink-0">Tipo:</span>
                <div className="flex bg-slate-900/60 p-0.5 rounded-lg border border-slate-800/80 w-full justify-between gap-0.5">
                  <button
                    onClick={() => setTypeFilter('all')}
                    className={`flex-1 text-center py-0.5 text-[10px] rounded transition font-medium cursor-pointer ${
                      typeFilter === 'all' ? 'bg-slate-800 text-slate-200' : 'text-slate-500 hover:text-slate-350'
                    }`}
                  >
                    Todas
                  </button>
                  <button
                    onClick={() => setTypeFilter('capital')}
                    className={`flex-1 text-center py-0.5 text-[10px] rounded transition font-medium cursor-pointer ${
                      typeFilter === 'capital' ? 'bg-amber-950/50 text-amber-400 font-semibold' : 'text-slate-500 hover:text-slate-350'
                    }`}
                  >
                    Capitais
                  </button>
                  <button
                    onClick={() => setTypeFilter('cidade')}
                    className={`flex-1 text-center py-0.5 text-[10px] rounded transition font-medium cursor-pointer ${
                      typeFilter === 'cidade' ? 'bg-blue-950/50 text-blue-400 font-semibold' : 'text-slate-500 hover:text-slate-350'
                    }`}
                  >
                    Cidades
                  </button>
                  <button
                    onClick={() => setTypeFilter('portos')}
                    className={`flex-1 text-center py-0.5 text-[10px] rounded transition font-medium cursor-pointer ${
                      typeFilter === 'portos' ? 'bg-teal-950/50 text-teal-400 font-semibold' : 'text-slate-500 hover:text-slate-350'
                    }`}
                  >
                    Portos
                  </button>
                </div>
                <div className="flex bg-slate-900/60 p-0.5 rounded-lg border border-slate-800/80 mt-1 w-full justify-between">
                  {([
                    { key: 'mineracao', label: '⛏️ Mineração', cls: 'bg-orange-950/50 text-orange-400' },
                    { key: 'polo_agricola', label: '🌾 Agro', cls: 'bg-lime-950/50 text-lime-400' },
                    { key: 'polo_industrial', label: '🏭 Industria', cls: 'bg-violet-950/50 text-violet-400' },
                    { key: 'fronteira', label: '🌐 Fronteira', cls: 'bg-pink-950/50 text-pink-400' },
                  ] as const).map(f => (
                    <button
                      key={f.key}
                      onClick={() => setTypeFilter(typeFilter === f.key ? 'all' : f.key)}
                      className={`flex-1 text-center py-0.5 text-[9px] rounded transition font-medium cursor-pointer ${
                        typeFilter === f.key ? f.cls + ' font-semibold' : 'text-slate-500 hover:text-slate-350'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter Connections */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-500 w-12 font-medium shrink-0">Conexões:</span>
                <div className="flex bg-slate-900/60 p-0.5 rounded-lg border border-slate-800/80 w-full justify-between">
                  {(['all', '0', '1', '2'] as const).map((connOption) => (
                    <button
                      key={connOption}
                      onClick={() => setConnsFilter(connOption)}
                      className={`flex-1 text-center py-0.5 text-[10px] rounded transition font-medium cursor-pointer ${
                        connsFilter === connOption
                          ? 'bg-slate-850 text-amber-500 font-semibold'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {connOption === 'all' ? 'Ver todas' : `${connOption}/2`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Directory Title */}
          <div className="px-4 py-2 bg-slate-950/80 text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex justify-between shrink-0">
            <span>Catálogo ({filteredCities.length} cidades)</span>
            <span>clique para focar</span>
          </div>

          {/* Directory List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-900/80 bg-slate-950/20 custom-scrollbar">
        {filteredCities.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            Nenhuma cidade corresponde aos filtros aplicados.
          </div>
        ) : (
          filteredCities.map(city => {
            const conns = cityConnections[city.id] || 0;
            const isSelected = selectedCityId === city.id;
            const isHovered = hoveredCityId === city.id;

            const isUpgraded = upgradedHubs.includes(city.id);
            const hasYard = maintenanceYards.includes(city.id);
            const maxConns = isUpgraded ? 3 : 2;

            return (
              <div
                key={city.id}
                onMouseEnter={() => onHoverCity(city.id)}
                onMouseLeave={() => onHoverCity(null)}
                className={`p-3 transition-all cursor-pointer flex flex-col gap-2 ${
                  isSelected
                    ? 'bg-amber-500/10 border-l-4 border-amber-500'
                    : isHovered
                      ? 'bg-slate-900/50'
                      : 'hover:bg-slate-900/30'
                }`}
                onClick={() => {
                  onFlyTo(city.lat, city.lng);
                  onSelectCity(city.id);
                }}
              >
                <div className="flex items-center justify-between select-none">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full ring-4 ${
                      city.portType === 'maritime'
                        ? 'bg-amber-400 ring-amber-500/20'
                        : city.portType === 'fluvial'
                          ? 'bg-teal-400 ring-teal-500/30'
                          : city.type === 'capital'
                            ? 'bg-amber-400 ring-amber-500/20'
                            : 'bg-sky-400 ring-sky-500/20'
                    }`} />

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-200 text-xs group-hover:text-amber-400 transition-colors">
                          {city.name}
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold bg-slate-900 px-1 py-0.5 rounded">
                          {city.state}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1.5">
                        {city.portType === 'maritime' ? (
                          <>
                            <span className="text-amber-400 font-bold flex items-center gap-1" title="Porto Marítimo">⚓ Porto Marítimo</span>
                            {city.type === 'capital' && <span className="text-slate-600">• Cap</span>}
                          </>
                        ) : city.portType === 'fluvial' ? (
                          <>
                            <span className="text-teal-400 font-bold flex items-center gap-1" title="Porto Fluvial">🚢 Porto Fluvial</span>
                            {city.type === 'capital' && <span className="text-slate-600">• Cap</span>}
                          </>
                        ) : (
                          city.type === 'capital' ? 'Capital Estadual' :
                          city.type === 'mineracao' ? <span className="text-orange-400">⛏️ Mineração</span> :
                          city.type === 'polo_agricola' ? <span className="text-lime-400">🌾 Polo Agrícola</span> :
                          city.type === 'polo_industrial' ? <span className="text-violet-400">🏭 Polo Industrial</span> :
                          city.type === 'fronteira' ? <span className="text-pink-400">🌐 Fronteira</span> :
                          'Cidade'
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Connection Status Indicator with Upgrades */}
                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {isUpgraded && <span className="text-amber-400 text-xs font-bold" title="Terminal Central Integrador Ativo">★</span>}
                    {hasYard && <span className="text-emerald-400 text-xs font-bold" title="Pátio de Manutenção Ativo">🔧</span>}

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      conns >= maxConns
                        ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-500/20'
                        : conns > 0
                          ? 'bg-sky-950/50 text-sky-400 border border-sky-500/20'
                          : 'bg-slate-900 text-slate-500 border border-slate-800'
                    }`}>
                      {conns}/{maxConns} {conns >= maxConns && '✓'}
                    </span>
                  </div>
                </div>

                {/* Upgrades panel only displayed for selected entry drawer */}
                {isSelected && (
                  <div className="flex flex-col gap-1.5 border-t border-slate-900/50 pt-2" onClick={(e) => e.stopPropagation()}>
                    {/* Terminal Central */}
                    {(() => {
                      const buildingHub = infraQueue.find(p => p.cityId === city.id && p.type === 'hub');
                      if (isUpgraded) return (
                        <div className="flex items-center justify-between bg-amber-950/20 border border-amber-800/30 rounded px-2 py-1">
                          <span className="text-[9px] text-amber-300 font-bold">★ Terminal Central ativo</span>
                          <button onClick={() => onBuildHub(city.id)} className="text-[8px] text-slate-500 hover:text-rose-400 transition">demolir</button>
                        </div>
                      );
                      if (buildingHub) return (
                        <div className="flex items-center justify-between bg-amber-950/10 border border-amber-900/30 rounded px-2 py-1">
                          <span className="text-[9px] text-amber-400">★ Construindo… {buildingHub.monthsRemaining}/{buildingHub.totalMonths} meses</span>
                          <button onClick={() => onBuildHub(city.id)} className="text-[8px] text-slate-500 hover:text-rose-400 transition">cancelar</button>
                        </div>
                      );
                      return (
                        <button onClick={() => onBuildHub(city.id)}
                          className="w-full text-center py-1 rounded text-[9.5px] font-bold bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800 transition">
                          ★ Terminal Central — 8 meses · R$30B
                        </button>
                      );
                    })()}

                    {/* Pátio de Manutenção */}
                    {(() => {
                      const buildingYard = infraQueue.find(p => p.cityId === city.id && p.type === 'yard');
                      const yardLevel = yardLevels[city.id] as 1|2|3|undefined;
                      const cfg = yardLevel ? YARD_CONFIGS[yardLevel] : null;
                      if (hasYard && cfg) return (
                        <div className="flex items-center justify-between bg-emerald-950/20 border border-emerald-800/30 rounded px-2 py-1">
                          <span className="text-[9px] text-emerald-300 font-bold">🔧 Pátio {cfg.name} ativo ({cfg.coverage}km)</span>
                          <button onClick={() => onBuildYard(city.id, 1)} className="text-[8px] text-slate-500 hover:text-rose-400 transition">demolir</button>
                        </div>
                      );
                      if (buildingYard) {
                        const bCfg = YARD_CONFIGS[buildingYard.yardLevel ?? 1];
                        return (
                          <div className="flex items-center justify-between bg-emerald-950/10 border border-emerald-900/30 rounded px-2 py-1">
                            <span className="text-[9px] text-emerald-400">🔧 Pátio {bCfg.name}… {buildingYard.monthsRemaining}/{buildingYard.totalMonths} meses</span>
                            <button onClick={() => onBuildYard(city.id, 1)} className="text-[8px] text-slate-500 hover:text-rose-400 transition">cancelar</button>
                          </div>
                        );
                      }
                      return (
                        <div className="flex flex-col gap-1">
                          <span className="text-[8px] text-slate-500 font-semibold uppercase tracking-wide">Construir Pátio:</span>
                          <div className="flex gap-1">
                            {([1,2,3] as const).map(lvl => {
                              const c = YARD_CONFIGS[lvl];
                              return (
                                <button key={lvl} onClick={() => onBuildYard(city.id, lvl)}
                                  className="flex-1 py-1 rounded text-[8.5px] font-bold bg-slate-900 text-emerald-400 border border-emerald-900/40 hover:bg-emerald-950/30 transition leading-tight">
                                  <div>{c.name}</div>
                                  <div className="text-[7.5px] text-slate-500">{c.months}m · R${(c.cost/1e9).toFixed(0)}B · {c.coverage}km</div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
        </>
      )}

      {/* Footer Branding */}
      <div className="p-2.5 bg-slate-950 border-t border-slate-900 text-[10px] text-slate-500 flex justify-between items-center tracking-wide shrink-0 font-mono">
        <span>© 2026 TRILHO REAL · BR-RAILWAYS V1.0</span>
        <button
          onClick={onExportStats}
          className="px-2 py-1 rounded border border-slate-700 bg-slate-900 text-slate-400 hover:text-sky-400 hover:border-sky-700 transition text-[9px] font-bold uppercase cursor-pointer"
          title="Exportar estatísticas como JSON"
        >
          📊 Export
        </button>
      </div>
    </div>
  );
}
