import React, { useRef, useState } from 'react';
import { City, Edge, GameResources, GameEvent, GameWorkers, ConstructionProject, NewsItem, InfraProject } from '../types';
import { MissionDef } from '../utils/missions';
import { SaveGame } from '../utils/persistence';
import { FundGrant } from '../utils/gameRules';
import { Volume2, VolumeX, RotateCw } from 'lucide-react';
import OperationsTab from './sidebar/OperationsTab';
import MissionsTab from './sidebar/MissionsTab';
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
}: SidebarProps) {
  const importFileRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'cities' | 'operations' | 'missions'>('cities');

  const activeConns = edges.length;
  const maxConnsCount = cities.length - 1;
  const pctComplete = Math.min(100, Math.round((activeConns / maxConnsCount) * 100));

  return (
    <div id="control-sidebar" className="w-full md:w-96 text-slate-100 flex flex-col h-[40vh] md:h-full overflow-hidden select-none shrink-0">
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
          <button onClick={onReset}
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
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Concessão</span>
            <span className="text-xs font-black text-slate-100">
              {MONTHS[monthIdx]}/2077 de <span className="text-amber-400">{gameYear}</span>
            </span>
            <span className={`text-[9px] font-bold ${2077 - gameYear <= 5 ? 'text-rose-400' : 2077 - gameYear <= 15 ? 'text-amber-400' : 'text-slate-500'}`}>
              ⏳ {2077 - gameYear} anos restantes
            </span>
          </div>
          <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 shrink-0">
            {(['paused', 'normal', 'fast'] as const).map(speed => (
              <button key={speed} onClick={() => onPlaySpeedChange(speed)}
                className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  playSpeed === speed
                    ? speed === 'paused' ? 'bg-rose-500 text-slate-950 font-black'
                      : speed === 'normal' ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-sky-500 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-slate-200'
                }`}>
                {speed === 'paused' ? '⏸️ Pausar' : speed === 'normal' ? '⏱️ 1x' : '⚡ Rápido'}
              </button>
            ))}
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
            {(() => {
              const payroll = workers ? (
                (workers.terraplanagem ?? 0) * 850000 + (workers.assentamento ?? 0) * 1200000 +
                (workers.sinalizacao ?? 0) * 2200000 + (workers.explosivos ?? 0) * 3500000 +
                (workers.manutencao ?? 0) * 950000
              ) : 0;
              const flow = (budgetState.monthlyRevenue ?? 0) - payroll;
              const fmtFlow = (v: number) => v >= 1e9 ? `${(v/1e9).toFixed(1)}B` : `${(v/1e6).toFixed(0)}M`;
              return (
                <span className={`text-[9px] font-bold ${flow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {flow >= 0 ? '▲' : '▼'} R$ {fmtFlow(Math.abs(flow))}/mês
                </span>
              );
            })()}
          </div>
          <div className="text-right flex flex-col items-end gap-0.5">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wide block">Conexões</span>
            <span className="text-[11px] font-black text-amber-400">
              {activeConns} / {maxConnsCount} ({pctComplete}%)
            </span>
            <div className="flex gap-0.5 mt-0.5">
              {[1, 2, 3].map(s => (
                <button key={s} onClick={() => onSaveSlotChange(s)}
                  title={`Slot ${s}: ${slotDates[s - 1] ?? 'Vazio'}`}
                  className={`w-5 h-5 rounded text-[8px] font-black border transition cursor-pointer ${
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
      <div className="flex border-b border-slate-850 bg-slate-900 p-1 gap-0.5 shrink-0">
        {([
          { id: 'cities', label: '🗺️ Rotas', badge: false },
          { id: 'operations', label: `👷 Equipe${constructionQueue.length > 0 ? ` (${constructionQueue.length})` : ''}`, badge: activeEvents.length > 0 },
          { id: 'missions', label: '🎯 Objetivos', badge: missionResults.some(m => m.completed) && newsItems.length > 0 },
        ] as const).map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 text-center py-2 rounded-lg text-[9.5px] font-black tracking-wide transition flex items-center justify-center gap-1 cursor-pointer relative ${
              activeTab === tab.id ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}>
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

      {/* Tab Content */}
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
          newsItems={newsItems} expiredMissions={expiredMissions}
        />
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

      {/* Footer */}
      <div className="p-2.5 bg-slate-950 border-t border-slate-900 text-[10px] text-slate-500 flex justify-between items-center tracking-wide shrink-0 font-mono">
        <span>© 2027 TREM DO BRASIL · RENIF V1.0</span>
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
  );
}
