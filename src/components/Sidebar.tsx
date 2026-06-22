import React, { useRef, useState, useEffect, useCallback } from 'react';
import { City, Edge, GameResources, GameEvent, GameWorkers, ConstructionProject, NewsItem, InfraProject } from '../types';
import { MissionDef } from '../utils/missions';
import { SaveGame } from '../utils/persistence';
import { FundGrant, WORKER_SALARIES, getSimultaneousPenalty } from '../utils/gameRules';
import { Volume2, VolumeX, RotateCw } from 'lucide-react';
import OperationsTab from './sidebar/OperationsTab';
import MissionsTab from './sidebar/MissionsTab';
import NewsTab from './sidebar/NewsTab';
import CitiesTab from './sidebar/CitiesTab';

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
  tileLayerType: 'voyager' | 'positron' | 'dark' | 'satellite' | 'terrain';
  onTileLayerChange: (type: 'voyager' | 'positron' | 'dark' | 'satellite' | 'terrain') => void;
  isMuted: boolean;
  onToggleMute: () => void;
  showSuggestions: boolean;
  onToggleSuggestions: () => void;
  upgradedHubs?: string[];
  onBuildHub?: (cityId: string) => void;
  maintenanceYards?: string[];
  onBuildYard?: (cityId: string, level: 1 | 2 | 3) => void;
  infraQueue?: InfraProject[];
  yardLevels?: Record<string, number>;
  constructionType?: 'rail' | 'balsa';
  onConstructionTypeChange?: (type: 'rail' | 'balsa') => void;
  budgetState?: {
    totalSpent: number; spentRail: number; spentBalsa: number; spentYards: number;
    spentHubs: number; grantIncome: number; currentBudget: number;
    unlockedGrants: FundGrant[]; spentOnWorkers?: number;
    spentOnResources?: number; totalRevenue?: number; monthlyRevenue?: number;
  };
  unmaintainedEdgesCount?: number;
  nearestYardDistances?: Record<string, number>;
  gameYear?: number;
  monthIdx?: number;
  playSpeed?: 'paused' | 'normal' | 'fast';
  onPlaySpeedChange?: (speed: 'paused' | 'normal' | 'fast') => void;
  resources?: GameResources;
  onBuyResource?: (resKey: keyof GameResources, amount: number) => void;
  autoBuyResources?: boolean;
  onToggleAutoBuyResources?: () => void;
  activeEvents?: GameEvent[];
  workers?: GameWorkers;
  onHireWorker?: (role: keyof GameWorkers, count: number) => void;
  onFireWorker?: (role: keyof GameWorkers, count: number) => void;
  budgetHistory?: { label: string; budget: number }[];
  constructionQueue?: ConstructionProject[];
  onAdvanceMonth?: () => void;
  onExportStats?: () => void;
  saveSlot?: number;
  onSaveSlotChange?: (slot: number) => void;
  slotDates?: (string | null)[];
  missionResults?: (MissionDef & { completed: boolean; current: number; target: number })[];
  newsItems?: NewsItem[];
  onImportSave?: (data: SaveGame) => void;
  onDoubleTrack?: (edgeId: string) => void;
  onUpgradeTrainLevel?: (edgeId: string) => void;
  onPassengerUpgrade?: (edgeId: string) => void;
  expiredMissions?: string[];
  completedMissions?: string[];
  onFlyToRegion?: (lat: number, lng: number) => void;
  mobileExpanded?: boolean;
  onMobileExpandedChange?: (v: boolean) => void;
}

export default function Sidebar({
  cities, edges, selectedCityId, hoveredCityId, onSelectCity, onHoverCity, onFlyTo,
  onReset, tileLayerType, onTileLayerChange, isMuted, onToggleMute,
  showSuggestions, onToggleSuggestions,
  upgradedHubs = [], onBuildHub = () => {}, maintenanceYards = [],
  onBuildYard = () => {}, infraQueue = [], yardLevels = {},
  constructionType = 'rail', onConstructionTypeChange = () => {},
  budgetState = {
    totalSpent: 0, spentRail: 0, spentBalsa: 0, spentYards: 0, spentHubs: 0,
    grantIncome: 0, currentBudget: 1250000000000, unlockedGrants: [],
    spentOnWorkers: 0, spentOnResources: 0,
  },
  unmaintainedEdgesCount = 0, nearestYardDistances = {},
  gameYear = 2027, monthIdx = 0, playSpeed = 'normal', onPlaySpeedChange = () => {},
  resources = { aco: 0, brita: 0, madeira: 0, cimento: 0, cobre: 0, explosivos: 0 },
  onBuyResource = () => {}, autoBuyResources = true, onToggleAutoBuyResources = () => {},
  activeEvents = [],
  workers = { terraplanagem: 0, assentamento: 0, sinalizacao: 0, explosivos: 0, manutencao: 0 },
  onHireWorker = () => {}, onFireWorker = () => {}, budgetHistory = [], constructionQueue = [],
  onAdvanceMonth = () => {}, onExportStats = () => {},
  saveSlot = 1, onSaveSlotChange = () => {}, slotDates = [null, null, null],
  missionResults = [], newsItems = [], onImportSave,
  onDoubleTrack = () => {}, onUpgradeTrainLevel = () => {}, onPassengerUpgrade = () => {},
  expiredMissions = [], completedMissions = [], onFlyToRegion,
  mobileExpanded = false, onMobileExpandedChange,
}: SidebarProps) {
  const importFileRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'cities' | 'operations' | 'missions' | 'news'>('cities');
  const setMobileExpanded = useCallback((v: boolean) => onMobileExpandedChange?.(v), [onMobileExpandedChange]);

  // Orientation detection
  const [isPortrait, setIsPortrait] = useState(
    typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : false
  );
  useEffect(() => {
    const handler = () => {
      const portrait = window.innerHeight > window.innerWidth;
      setIsPortrait(portrait);
      // Auto-expand when rotating to landscape on touch devices
      if (!portrait && navigator.maxTouchPoints > 0) {
        onMobileExpandedChange?.(true);
      }
    };
    window.addEventListener('resize', handler);
    window.addEventListener('orientationchange', handler);
    return () => { window.removeEventListener('resize', handler); window.removeEventListener('orientationchange', handler); };
  }, [onMobileExpandedChange]);

  // Swipe between tabs
  const swipeTouchStartX = useRef<number | null>(null);
  const TABS: ('cities' | 'operations' | 'missions' | 'news')[] = ['cities', 'operations', 'missions', 'news'];
  const handleTabSwipe = useCallback((e: React.TouchEvent) => {
    if (swipeTouchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - swipeTouchStartX.current;
    if (Math.abs(dx) < 50) return;
    const idx = TABS.indexOf(activeTab);
    if (dx < 0 && idx < TABS.length - 1) setActiveTab(TABS[idx + 1]);
    if (dx > 0 && idx > 0) setActiveTab(TABS[idx - 1]);
    swipeTouchStartX.current = null;
  }, [activeTab]);

  const activeConns = edges.length;
  const maxConnsCount = cities.length - 1;
  const pctComplete = Math.min(100, Math.round((activeConns / maxConnsCount) * 100));

  return (
    <div id="control-sidebar" className={`w-full md:w-96 text-slate-100 flex flex-col md:h-full overflow-hidden select-none shrink-0 ${
      mobileExpanded
        ? 'fixed inset-0 z-[9999] h-screen bg-slate-950'
        : 'h-[40vh]'
    }`}>
      {/* Header */}
      <div className="p-4 bg-slate-900 border-b border-slate-700/80 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <svg viewBox="0 0 48 48" className="w-12 h-12 drop-shadow-lg" xmlns="http://www.w3.org/2000/svg">
              <circle cx="24" cy="24" r="24" fill="#0f172a"/>
              <circle cx="24" cy="24" r="22" fill="none" stroke="#f59e0b" strokeWidth="1" opacity="0.5"/>
              <path d="M7 39 Q16 27 24 21 Q32 27 41 39" fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round"/>
              <path d="M10 41 Q18 29 24 23 Q30 29 38 41" fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round"/>
              <line x1="14" y1="34" x2="17" y2="36" stroke="#92400e" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="19" y1="28" x2="22" y2="30" stroke="#92400e" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="26" y1="28" x2="29" y2="30" stroke="#92400e" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="31" y1="34" x2="34" y2="36" stroke="#92400e" strokeWidth="1.5" strokeLinecap="round"/>
              <rect x="19" y="14" width="10" height="6" rx="1.5" fill="#dc2626"/>
              <rect x="26" y="11" width="6" height="9" rx="1.2" fill="#dc2626"/>
              <rect x="27" y="12" width="3.5" height="2.5" rx="0.6" fill="#38bdf8"/>
              <rect x="20" y="9" width="2" height="5" rx="1" fill="#1e293b"/>
              <circle cx="22" cy="9" rx="2" ry="1" fill="#334155"/>
              <circle cx="32" cy="17" r="1.5" fill="#fef08a"/>
              <circle cx="21" cy="20.5" r="1.6" fill="#1e293b" stroke="#f59e0b" strokeWidth="0.8"/>
              <circle cx="25.5" cy="20.5" r="1.6" fill="#1e293b" stroke="#f59e0b" strokeWidth="0.8"/>
              <circle cx="30" cy="20.5" r="1.3" fill="#1e293b" stroke="#f59e0b" strokeWidth="0.8"/>
              <circle cx="20" cy="6" r="2" fill="#e2e8f0" opacity="0.55"/>
              <circle cx="23.5" cy="4.5" r="1.5" fill="#e2e8f0" opacity="0.4"/>
              <text x="35" y="42" fontFamily="monospace" fontWeight="900" fontSize="9" fill="#f59e0b" opacity="0.85">RF</text>
            </svg>
          </div>
          <div>
            <h1 className="font-display font-bold text-lg tracking-tight leading-none bg-gradient-to-r from-amber-400 via-orange-400 to-red-500 bg-clip-text text-transparent">
              Trem do Brasil
            </h1>
            <p className="text-[10px] text-slate-500 font-bold tracking-widest mt-0.5 uppercase">RENIF · Rede Ferroviária</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setMobileExpanded(e => !e)}
            className="md:hidden p-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 transition text-[11px] font-black"
            title={mobileExpanded ? 'Minimizar painel' : 'Expandir painel'}>
            {mobileExpanded ? '✕' : '⬆'}
          </button>
          <button onClick={onAdvanceMonth}
            className="p-1.5 rounded-lg border border-sky-900/40 bg-sky-950/20 text-sky-400 hover:bg-sky-900/40 hover:text-sky-200 transition text-[9px] font-black uppercase tracking-wider"
            title="Avançar 1 mês manualmente">
            ⏭+1M
          </button>
          <button onClick={onToggleMute}
            className={`p-2 rounded-lg border transition ${isMuted ? 'border-slate-800 bg-slate-950/40 text-slate-500 hover:text-slate-300' : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
            title={isMuted ? "Ativar som" : "Desativar som"}>
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => {
              const isTouch = navigator.maxTouchPoints > 0;
              if (isTouch && !window.confirm('Reiniciar o jogo? Todo progresso será perdido.')) return;
              onReset();
            }}
            className="p-2 rounded-lg border border-red-900/30 bg-red-950/20 text-red-400 hover:bg-red-900/40 hover:text-red-300 transition"
            title="Reiniciar jogo">
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Compact Stats Header */}
      <div className="p-3 bg-slate-950/90 border-b border-slate-800 flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] md:text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Concessão</span>
            <span className="text-sm md:text-xs font-black text-slate-100">
              {MONTHS[monthIdx]}/2077 de <span className="text-amber-400">{gameYear}</span>
            </span>
            <span className={`text-[10px] md:text-[9px] font-bold ${2077 - gameYear <= 5 ? 'text-rose-400' : 2077 - gameYear <= 15 ? 'text-amber-400' : 'text-slate-500'}`}>
              ⏳ {2077 - gameYear} anos restantes
            </span>
          </div>
          <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 shrink-0">
            {(['paused', 'normal', 'fast'] as const).map(speed => (
              <button key={speed} onClick={() => onPlaySpeedChange(speed)}
                className={`px-2 py-1.5 md:px-1.5 md:py-0.5 rounded text-[10px] md:text-[8px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  playSpeed === speed
                    ? speed === 'paused' ? 'bg-rose-500 text-slate-950 font-black'
                      : speed === 'normal' ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-sky-500 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-slate-200'
                }`}>
                <span className="md:hidden">{speed === 'paused' ? '⏸' : speed === 'normal' ? '1x' : '⚡'}</span>
                <span className="hidden md:inline">{speed === 'paused' ? '⏸️ Pausar' : speed === 'normal' ? '⏱️ 1x' : '⚡ Rápido'}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-slate-900/60 pt-2 text-xs">
          <div>
            <span className="text-[10px] md:text-[9px] text-slate-400 font-bold uppercase tracking-wide block">Caixa</span>
            <span className={`text-[15px] md:text-[12.5px] font-black font-sans flex items-center gap-1 ${
              budgetState.currentBudget < 0 ? 'text-rose-500' :
              budgetState.currentBudget < 100000000000 ? 'text-rose-400' :
              budgetState.currentBudget < 250000000000 ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {budgetState.currentBudget < 100000000000 && <span title="Caixa crítico!">⚠️</span>}
              R$ {budgetState.currentBudget.toLocaleString('pt-BR')}
            </span>
            {(() => {
              const payroll = workers ? (
                (workers.terraplanagem ?? 0) * WORKER_SALARIES.terraplanagem +
                (workers.assentamento ?? 0) * WORKER_SALARIES.assentamento +
                (workers.sinalizacao ?? 0) * WORKER_SALARIES.sinalizacao +
                (workers.explosivos ?? 0) * WORKER_SALARIES.explosivos +
                (workers.manutencao ?? 0) * WORKER_SALARIES.manutencao
              ) : 0;
              const flow = (budgetState.monthlyRevenue ?? 0) - payroll;
              const fmtFlow = (v: number) => v >= 1e9 ? `${(v/1e9).toFixed(1)}B` : `${(v/1e6).toFixed(0)}M`;
              return (
                <span className={`text-[11px] md:text-[9px] font-bold ${flow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {flow >= 0 ? '▲' : '▼'} R$ {fmtFlow(Math.abs(flow))}/mês
                </span>
              );
            })()}
          </div>
          <div className="text-right flex flex-col items-end gap-0.5">
            <span className="text-[10px] md:text-[9px] text-slate-400 font-bold uppercase tracking-wide block">Conexões</span>
            <span className="text-[13px] md:text-[11px] font-black text-amber-400">
              {activeConns} / {maxConnsCount} ({pctComplete}%)
            </span>
            {constructionQueue.length > 1 && (() => {
              const penalty = getSimultaneousPenalty(constructionQueue.length);
              const pct = Math.round((1 - penalty) * 100);
              return (
                <span className="text-[9px] font-bold text-rose-400 bg-rose-950/60 border border-rose-800/50 px-1.5 py-0.5 rounded-full">
                  ⚡ {constructionQueue.length} obras −{pct}% vel.
                </span>
              );
            })()}
            <div className="flex gap-1 md:gap-0.5 mt-0.5">
              {[1, 2, 3].map(s => (
                <button key={s} onClick={() => onSaveSlotChange(s)}
                  title={`Slot ${s}: ${slotDates[s - 1] ?? 'Vazio'}`}
                  className={`w-8 h-8 md:w-5 md:h-5 rounded text-[10px] md:text-[8px] font-black border transition cursor-pointer ${
                    saveSlot === s ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : slotDates[s - 1] ? 'bg-emerald-900/40 text-emerald-400 border-emerald-700/40 hover:bg-emerald-800/60'
                      : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
                  }`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-800 bg-slate-900/95 px-1 pt-1 gap-0.5 shrink-0">
        {([
          { id: 'cities',     icon: '🗺️', label: 'Rotas',    badge: false },
          { id: 'operations', icon: '👷', label: 'Equipe',   badge: activeEvents.length > 0, count: constructionQueue.length > 0 ? constructionQueue.length : 0 },
          { id: 'missions',   icon: '🎯', label: 'Missões',  badge: missionResults.some(m => m.completed), count: 0 },
          { id: 'news',       icon: '📰', label: 'Notícias', badge: newsItems.length > 0 && activeTab !== 'news', count: 0 },
        ] as const).map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 text-center py-2.5 rounded-t-lg text-[10px] font-black tracking-wide transition flex flex-col items-center justify-center gap-0.5 cursor-pointer relative border-b-2 ${
              activeTab === tab.id
                ? 'bg-slate-800 text-amber-400 border-amber-500 shadow-inner'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 border-transparent'
            }`}>
            <span className="text-[16px] leading-none">{tab.icon}</span>
            <span className="text-[9px] font-bold uppercase tracking-widest">{tab.label}</span>
            {'count' in tab && tab.count > 0 && (
              <span className="absolute top-1 right-1 text-[8px] font-black bg-sky-500 text-white rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5">
                {tab.count}
              </span>
            )}
            {tab.badge && (
              <span className="absolute top-1 right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Portrait warning — mobile only */}
      {mobileExpanded && isPortrait && (
        <div className="md:hidden shrink-0 bg-amber-950/40 border-b border-amber-700/40 px-3 py-1.5 text-[9px] text-amber-300 font-bold text-center">
          📱 Gire o celular para paisagem para melhor experiência
        </div>
      )}

      {/* Tab Content */}
      <div
        className="flex-1 overflow-hidden flex flex-col"
        style={mobileExpanded ? { zoom: 1.35 } : undefined}
        onTouchStart={e => { swipeTouchStartX.current = e.touches[0].clientX; }}
        onTouchEnd={handleTabSwipe}
      >
      {activeTab === 'operations' && (
        <OperationsTab
          cities={cities} edges={edges} maintenanceYards={maintenanceYards}
          upgradedHubs={upgradedHubs} resources={resources} workers={workers}
          budgetState={budgetState} unmaintainedEdgesCount={unmaintainedEdgesCount}
          nearestYardDistances={nearestYardDistances} gameYear={gameYear} monthIdx={monthIdx}
          activeEvents={activeEvents} constructionQueue={constructionQueue}
          autoBuyResources={autoBuyResources} infraQueue={infraQueue}
          budgetHistory={budgetHistory} onFlyToRegion={onFlyToRegion}
          onBuyResource={onBuyResource} onToggleAutoBuyResources={onToggleAutoBuyResources}
          onHireWorker={onHireWorker} onFireWorker={onFireWorker}
        />
      )}

      {activeTab === 'missions' && (
        <MissionsTab
          missionResults={missionResults} completedMissions={completedMissions}
          expiredMissions={expiredMissions}
        />
      )}

      {activeTab === 'news' && (
        <NewsTab newsItems={newsItems} />
      )}

      {activeTab === 'cities' && (
        <CitiesTab
          cities={cities} edges={edges} selectedCityId={selectedCityId}
          hoveredCityId={hoveredCityId} onSelectCity={onSelectCity} onHoverCity={onHoverCity}
          onFlyTo={onFlyTo} upgradedHubs={upgradedHubs} maintenanceYards={maintenanceYards}
          infraQueue={infraQueue} yardLevels={yardLevels} constructionType={constructionType}
          onConstructionTypeChange={onConstructionTypeChange} showSuggestions={showSuggestions}
          onToggleSuggestions={onToggleSuggestions} unmaintainedEdgesCount={unmaintainedEdgesCount}
          tileLayerType={tileLayerType} onTileLayerChange={onTileLayerChange}
          onBuildHub={onBuildHub} onBuildYard={onBuildYard}
        />
      )}
      </div>

      {/* Footer */}
      <div className="bg-slate-950 border-t border-slate-900 shrink-0">
        {/* Map type selector — always visible (hidden on desktop since it's on the map) */}
        <div className="md:hidden px-2.5 pt-2 pb-1 flex items-center gap-1.5">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider shrink-0">🗺️ Mapa:</span>
          <div className="flex gap-1 flex-wrap">
            {(['voyager', 'positron', 'dark', 'satellite', 'terrain'] as const).map((type) => (
              <button
                key={type}
                onClick={() => onTileLayerChange(type)}
                className={`px-2 py-1 rounded text-[9px] font-bold uppercase transition-all ${
                  tileLayerType === type
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'text-slate-400 bg-slate-900 border border-slate-700 hover:text-slate-200'
                }`}
              >
                {type === 'voyager' ? 'Voyager' : type === 'positron' ? 'Claro' : type === 'dark' ? 'Escuro' : type === 'satellite' ? 'Satélite' : 'Relevo'}
              </button>
            ))}
          </div>
        </div>

        {/* Export / Import + copyright */}
        <div className="p-2.5 text-[10px] text-slate-500 flex justify-between items-center tracking-wide font-mono">
          <span className="hidden md:inline">© 2027 TREM DO BRASIL · RENIF V1.0</span>
          <div className="flex gap-1.5 items-center">
            {onImportSave && (
              <>
                <input ref={importFileRef} type="file" accept=".json" className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      try {
                        const data = JSON.parse(ev.target?.result as string) as SaveGame;
                        if (!data.edges || !data.gameYear) throw new Error('Invalid save');
                        onImportSave(data);
                      } catch { alert('Arquivo de save inválido.'); }
                    };
                    reader.readAsText(file);
                    e.target.value = '';
                  }}
                />
                <button onClick={() => importFileRef.current?.click()}
                  className="px-2 py-1 rounded border border-slate-700 bg-slate-900 text-slate-400 hover:text-emerald-400 hover:border-emerald-700 transition text-[9px] font-bold uppercase cursor-pointer"
                  title="Importar save de arquivo JSON">
                  📥 Import
                </button>
              </>
            )}
            <button onClick={onExportStats}
              className="px-2 py-1 rounded border border-slate-700 bg-slate-900 text-slate-400 hover:text-sky-400 hover:border-sky-700 transition text-[9px] font-bold uppercase cursor-pointer"
              title="Exportar estatísticas como JSON">
              📊 Export
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
