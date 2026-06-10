import React, { useState, useMemo } from 'react';
import { City, Edge, GameResources, GameEvent, GameWorkers } from '../types';
import { formatDistance } from '../utils/geo';
import { RESOURCE_BUY_PRICES, RESOURCE_NAMES, WORKER_SALARIES, WORKER_NAMES } from '../utils/gameRules';
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
  onToggleUpgradeHub?: (cityId: string) => void;
  maintenanceYards?: string[];
  onToggleMaintenanceYard?: (cityId: string) => void;
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
    unlockedGrants: any[];
    spentOnWorkers?: number;
    spentOnResources?: number;
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
  onToggleUpgradeHub = () => {},
  maintenanceYards = [],
  onToggleMaintenanceYard = () => {},
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
  workers = { basico: 35, operador: 15, especialista: 8, perfurador: 4 },
  onHireWorker = () => {},
  onFireWorker = () => {},
}: SidebarProps) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'cities' | 'operations'>('cities');
  const [typeFilter, setTypeFilter] = useState<'all' | 'capital' | 'cidade' | 'portos'>('all');
  const [connsFilter, setConnsFilter] = useState<'all' | '0' | '1' | '2'>('all');
  const [showHowToPlay, setShowHowToPlay] = useState(true);

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
    return (workers.basico * WORKER_SALARIES.basico) +
           (workers.operador * WORKER_SALARIES.operador) +
           (workers.especialista * WORKER_SALARIES.especialista) +
           (workers.perfurador * WORKER_SALARIES.perfurador);
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
        <div className="flex items-center gap-2">
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
            <span className={`text-[12.5px] font-black ${budgetState.currentBudget >= 0 ? 'text-emerald-400' : 'text-rose-500'} font-sans`}>
              R$ {budgetState.currentBudget.toLocaleString('pt-BR')}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wide block">Conexões</span>
            <span className="text-[11px] font-black text-amber-400">
              {activeConns} / {maxConnsCount} ({pctComplete}%)
            </span>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-850 bg-slate-900 p-1 gap-1 shrink-0">
        <button
          onClick={() => setActiveTab('cities')}
          className={`flex-1 text-center py-2 rounded-lg text-[10.5px] font-black tracking-wide transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'cities'
              ? 'bg-amber-505 text-slate-950 shadow-md font-extrabold bg-amber-500'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          🗺️ Rotas e Cidades
        </button>
        <button
          onClick={() => setActiveTab('operations')}
          className={`flex-1 text-center py-2 rounded-lg text-[10.5px] font-black tracking-wide transition flex items-center justify-center gap-1.5 cursor-pointer relative ${
            activeTab === 'operations'
              ? 'bg-amber-505 text-slate-950 shadow-md font-extrabold bg-amber-500'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          👷 Equipe e Insumos
          {activeEvents.length > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
          )}
        </button>
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
            </div>
          </div>

          {/* 2. Equipe de Engenharia (Trabalhadores) */}
          <div className="p-3.5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-500" /> Equipe de Engenharia & RH:
              </span>
              <span className="text-[9.5px] text-amber-400 font-bold font-mono">
                Despesa: R$ {(totalPayroll / 1000000).toFixed(0)}M/mês
              </span>
            </div>

            {/* Workers List */}
            <div className="flex flex-col gap-1.5 mt-1">
              {(Object.keys(workers) as Array<keyof GameWorkers>).map((key) => {
                const qty = workers[key] ?? 0;
                const salary = WORKER_SALARIES[key];
                const name = key === 'basico' ? 'Básico (Servente / Carpinteiro)' :
                             key === 'operador' ? 'Operador de Máquinas (Tratores)' :
                             key === 'especialista' ? 'Especialista (Engenheiro / Soldador)' :
                             'Túnel / Montanha (Perfuratriz)';
                const desc = key === 'basico' ? 'Consumo por km de obra padrão.' :
                             key === 'operador' ? 'Acelera obra. Sem isto, custo de trecho DOBRA!' :
                             key === 'especialista' ? 'Essencial para certificar e concluir rotas.' :
                             'Exigido em serras/áreas rochosas com explosivos.';
                
                return (
                  <div key={key} className="bg-slate-950/75 border border-slate-850 p-2 rounded-lg flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="min-w-0">
                        <span className="text-[10px] font-black text-slate-200 block truncate leading-tight">
                          {key === 'basico' && '👷 '}
                          {key === 'operador' && '🚜 '}
                          {key === 'especialista' && '📐 '}
                          {key === 'perfurador' && '🧨 '}
                          {name}
                        </span>
                        <span className="text-[8.5px] text-slate-400 block leading-tight">
                          {desc}
                        </span>
                        <span className="text-[8px] text-slate-500 font-bold font-sans">
                          Salário: R$ {(salary / 1000000).toFixed(1)}M/mês por profissional
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[11.5px] font-black text-amber-400 font-sans block">
                          {qty} ativos
                        </span>
                      </div>
                    </div>

                    {/* Hire / lay-off buttons */}
                    <div className="flex items-center justify-between border-t border-slate-900/60 pt-1.5 mt-1">
                      <div className="flex gap-1">
                        <button
                          onClick={() => onFireWorker(key, 5)}
                          disabled={qty <= 0}
                          className="px-1.5 py-0.5 rounded bg-slate-850 hover:bg-rose-950 hover:text-rose-450 border border-slate-700 disabled:opacity-30 transition cursor-pointer text-[8px] font-black uppercase tracking-wider"
                          title="Dispensar 5 trabalhadores"
                        >
                          Demitir -5
                        </button>
                        <button
                          onClick={() => onFireWorker(key, 1)}
                          disabled={qty <= 0}
                          className="px-1 py-0.5 rounded bg-slate-850 hover:bg-rose-950/40 hover:text-rose-400 border border-slate-700 disabled:opacity-30 transition cursor-pointer text-[8px] font-sans"
                          title="Dispensar 1 trabalhador"
                        >
                          -1
                        </button>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => onHireWorker(key, 1)}
                          className="px-1 py-0.5 rounded bg-slate-850 hover:bg-amber-500/10 hover:text-amber-400 border border-slate-700 cursor-pointer text-[8px] font-sans"
                          title="Contratar 1 trabalhador (Taxa de admissão: R$ 1.5M)"
                        >
                          +1
                        </button>
                        <button
                          onClick={() => onHireWorker(key, 5)}
                          className="px-1.5 py-0.5 rounded bg-slate-850 text-slate-300 hover:bg-amber-500 hover:text-slate-950 border border-slate-700 transition cursor-pointer text-[8px] font-black uppercase tracking-wider"
                          title="Contratar 5 trabalhadores (Taxa de admissão: R$ 7.5M)"
                        >
                          Contratar +5
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

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

      {/* Tab: Cities list and Map selection */}
      {activeTab === 'cities' && (
        <>
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
                          city.type === 'capital' ? 'Capital Estadual' : 'Cidade Central'
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
                  <div className="flex gap-1.5 border-t border-slate-900/50 pt-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onToggleUpgradeHub(city.id)}
                      className={`flex-1 text-center py-1 rounded text-[9.5px] font-bold transition flex items-center justify-center gap-1 ${
                        isUpgraded 
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30' 
                          : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800'
                      }`}
                      title="Sobe de nível permitindo 3 trilhas na cidade"
                    >
                      <span>★ Central Hub (30B)</span>
                    </button>
                    <button
                      onClick={() => onToggleMaintenanceYard(city.id)}
                      className={`flex-1 text-center py-1 rounded text-[9.5px] font-bold transition flex items-center justify-center gap-1 ${
                        hasYard 
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30' 
                          : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800'
                      }`}
                      title="Abastece e repara locomotivas em um raio de até 800 km"
                    >
                      <span>🔧 Pátio (15B)</span>
                    </button>
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
      <div className="p-3 bg-slate-950 border-t border-slate-900 text-[10px] text-slate-500 flex justify-between tracking-wide shrink-0 font-mono">
        <span>© 2026 TRILHO REAL</span>
        <span>BR-RAILWAYS V1.0</span>
      </div>
    </div>
  );
}
