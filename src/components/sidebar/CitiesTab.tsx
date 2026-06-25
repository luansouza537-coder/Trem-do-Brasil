import React, { useState, useMemo } from 'react';
import { City, Edge, InfraProject } from '../../types';
import { YARD_CONFIGS } from '../../utils/gameRules';
import { formatDistance } from '../../utils/geo';
import { Search, Layers, Compass, AlertTriangle } from 'lucide-react';

interface CitiesTabProps {
  cities: City[];
  edges: Edge[];
  selectedCityId: string | null;
  hoveredCityId: string | null;
  onSelectCity: (id: string | null) => void;
  onHoverCity: (id: string | null) => void;
  onFlyTo: (lat: number, lng: number) => void;
  upgradedHubs: string[];
  maintenanceYards: string[];
  infraQueue: InfraProject[];
  yardLevels: Record<string, number>;
  constructionType: 'rail' | 'balsa' | 'passenger';
  onConstructionTypeChange: (type: 'rail' | 'balsa' | 'passenger') => void;
  showSuggestions: boolean;
  onToggleSuggestions: () => void;
  showRouteColors?: boolean;
  onToggleRouteColors?: () => void;
  unmaintainedEdgesCount: number;
  tileLayerType: 'voyager' | 'positron' | 'dark' | 'satellite' | 'terrain';
  onTileLayerChange: (type: 'voyager' | 'positron' | 'dark' | 'satellite' | 'terrain') => void;
  onBuildHub: (cityId: string) => void;
  onBuildYard: (cityId: string, level: 1 | 2 | 3) => void;
}

const REGIONS: { name: string; color: string; ids: string[] }[] = [
  { name: 'Norte', color: '#10b981', ids: ['17','18','19','20','21','22','27','49','50','73','74','75','76','77','78','82','86','96','97'] },
  { name: 'Nordeste', color: '#f59e0b', ids: ['8','9','10','11','12','13','14','15','16','44','45','46','47','48','51','52','61','62','63','64','65','84','91','92','93'] },
  { name: 'Centro-Oeste', color: '#60a5fa', ids: ['23','24','25','26','53','54','55','79','80','81','87'] },
  { name: 'Sudeste', color: '#a78bfa', ids: ['1','2','3','4','28','29','30','31','38','39','40','41','42','43','58','59','60','83','85','88','90','94','95'] },
  { name: 'Sul', color: '#f472b6', ids: ['5','6','7','32','33','34','35','36','37','56','66','67','68','69','70','71','72','89'] },
];

export default function CitiesTab({
  cities,
  edges,
  selectedCityId,
  hoveredCityId,
  onSelectCity,
  onHoverCity,
  onFlyTo,
  upgradedHubs,
  maintenanceYards,
  infraQueue,
  yardLevels,
  constructionType,
  onConstructionTypeChange,
  showSuggestions,
  onToggleSuggestions,
  showRouteColors = false,
  onToggleRouteColors = () => {},
  unmaintainedEdgesCount,
  tileLayerType,
  onTileLayerChange,
  onBuildHub,
  onBuildYard,
}: CitiesTabProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'capital' | 'cidade' | 'portos' | 'mineracao' | 'polo_agricola' | 'polo_industrial' | 'fronteira'>('all');
  const [connsFilter, setConnsFilter] = useState<'all' | '0' | '1' | '2'>('all');
  const [showLegend, setShowLegend] = useState(false);
  const [showStateGrid, setShowStateGrid] = useState(false);
  const [sortByConns, setSortByConns] = useState(false);

  const cityConnections = useMemo(() => {
    const counts: Record<string, number> = {};
    cities.forEach(c => { counts[c.id] = 0; });
    edges.forEach(edge => {
      counts[edge.from] = (counts[edge.from] || 0) + 1;
      counts[edge.to] = (counts[edge.to] || 0) + 1;
    });
    return counts;
  }, [cities, edges]);

  const totalDistance = useMemo(() => edges.reduce((acc, e) => acc + e.distance, 0), [edges]);

  const completedCitiesCount = useMemo(() => Object.values(cityConnections).filter(c => c === 2).length, [cityConnections]);
  const leafCitiesCount = useMemo(() => Object.values(cityConnections).filter(c => c === 1).length, [cityConnections]);
  const unconnCitiesCount = useMemo(() => Object.values(cityConnections).filter(c => c === 0).length, [cityConnections]);

  const filteredCities = useMemo(() => {
    return cities.filter(city => {
      const nameMatch = city.name.toLowerCase().includes(search.toLowerCase()) ||
                        city.state.toLowerCase().includes(search.toLowerCase());
      const typeMatch = typeFilter === 'all' ||
                        (typeFilter === 'portos' ? !!city.portType : city.type === typeFilter);
      const conns = cityConnections[city.id] || 0;
      const connsMatch = connsFilter === 'all' || conns.toString() === connsFilter;
      return nameMatch && typeMatch && connsMatch;
    }).sort((a, b) => sortByConns
      ? (cityConnections[b.id] || 0) - (cityConnections[a.id] || 0)
      : a.name.localeCompare(b.name));
  }, [cities, search, typeFilter, connsFilter, cityConnections, sortByConns]);

  const hasActiveFilter = search !== '' || typeFilter !== 'all' || connsFilter !== 'all';

  // Rota mais lucrativa por cidade (para destacar no card de rotas)
  const topEdgeRevByCity = useMemo(() => {
    const result: Record<string, string> = {};
    cities.forEach(city => {
      const cityEdges = edges.filter(e => (e.from === city.id || e.to === city.id) && e.status !== 'building');
      if (cityEdges.length < 2) return;
      let maxRev = -1, maxId = '';
      cityEdges.forEach(e => {
        const rev = Math.round(e.distance * (e.type === 'balsa' ? 40000 : 80000));
        if (rev > maxRev) { maxRev = rev; maxId = e.id; }
      });
      result[city.id] = maxId;
    });
    return result;
  }, [cities, edges]);

  return (
    <>
      {/* Region Progress */}
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
            >
              🚂 Ferrovia
            </button>
            <button
              onClick={() => onConstructionTypeChange('balsa')}
              className={`px-2.5 py-1.5 rounded-lg text-[9.5px] font-bold border flex items-center gap-1.5 transition cursor-pointer ${
                constructionType === 'balsa'
                  ? 'bg-sky-500/25 border-sky-500/50 text-sky-300 font-extrabold'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              ⚓ Hidrovia
            </button>
            <button
              onClick={() => onConstructionTypeChange('passenger')}
              className={`px-2.5 py-1.5 rounded-lg text-[9.5px] font-bold border flex items-center gap-1.5 transition cursor-pointer ${
                constructionType === 'passenger'
                  ? 'bg-purple-500/25 border-purple-500/50 text-purple-300 font-extrabold'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              🚆 Passag.
            </button>
          </div>
        </div>

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
          <div title="Não conectadas" className="text-slate-400 font-black">{unconnCitiesCount}</div>
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
          {(['voyager', 'positron', 'dark', 'satellite', 'terrain'] as const).map((type) => (
            <button
               key={type}
               onClick={() => onTileLayerChange(type)}
               className={`px-1.5 py-0.5 rounded text-[9.5px] capitalize font-semibold transition cursor-pointer ${
                 tileLayerType === type
                   ? 'bg-amber-500 text-slate-950 font-bold'
                   : 'text-slate-400 hover:text-slate-200'
               }`}
            >
              {type === 'voyager' ? 'Voyager' : type === 'positron' ? 'Claro' : type === 'dark' ? 'Escuro' : type === 'satellite' ? 'Satélite' : 'Relevo'}
            </button>
          ))}
        </div>
      </div>

      {/* Guia de Trilhas / Sugestões + Cores de Receita */}
      <div className="px-3 py-1.5 bg-slate-950/65 border-b border-slate-850 flex items-center justify-between text-[10px] text-slate-355 shrink-0 gap-2">
        <span className="flex items-center gap-1 font-semibold text-slate-400 shrink-0">
          <Compass className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> Guia:
        </span>
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={onToggleRouteColors}
            title="Colorir rotas por rentabilidade"
            className={`px-2 py-0.5 rounded text-[9px] uppercase font-extrabold tracking-wider transition cursor-pointer ${
              showRouteColors
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-slate-900 text-slate-500 border border-slate-800 hover:text-slate-300'
            }`}
          >
            🎨 Receita
          </button>
          <button
            onClick={onToggleSuggestions}
            className={`px-2 py-0.5 rounded text-[9px] uppercase font-extrabold tracking-wider transition cursor-pointer ${
              showSuggestions
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-slate-900 text-slate-500 border border-slate-800 hover:text-slate-300'
            }`}
          >
            {showSuggestions ? 'Ver Guia' : 'Ocultar Guia'}
          </button>
        </div>
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
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300 text-xs">
              Limpar
            </button>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-500 w-12 font-medium shrink-0">Tipo:</span>
            <div className="flex bg-slate-900/60 p-0.5 rounded-lg border border-slate-800/80 w-full justify-between gap-0.5">
              {(['all', 'capital', 'cidade', 'portos'] as const).map((f) => (
                <button key={f}
                  onClick={() => setTypeFilter(f)}
                  className={`flex-1 text-center py-0.5 text-[10px] rounded transition font-medium cursor-pointer ${
                    typeFilter === f
                      ? f === 'capital' ? 'bg-amber-950/50 text-amber-400 font-semibold'
                        : f === 'cidade' ? 'bg-blue-950/50 text-blue-400 font-semibold'
                        : f === 'portos' ? 'bg-teal-950/50 text-teal-400 font-semibold'
                        : 'bg-slate-800 text-slate-200'
                      : 'text-slate-500 hover:text-slate-350'
                  }`}
                >
                  {f === 'all' ? 'Todas' : f === 'capital' ? 'Capitais' : f === 'cidade' ? 'Cidades' : 'Portos'}
                </button>
              ))}
            </div>
            <div className="flex bg-slate-900/60 p-0.5 rounded-lg border border-slate-800/80 mt-1 w-full justify-between">
              {([
                { key: 'mineracao', label: '⛏️ Mineração', cls: 'bg-orange-950/50 text-orange-400' },
                { key: 'polo_agricola', label: '🌾 Agro', cls: 'bg-lime-950/50 text-lime-400' },
                { key: 'polo_industrial', label: '🏭 Industria', cls: 'bg-violet-950/50 text-violet-400' },
                { key: 'fronteira', label: '🌐 Fronteira', cls: 'bg-pink-950/50 text-pink-400' },
              ] as const).map(f => (
                <button key={f.key}
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

          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-500 w-12 font-medium shrink-0">Conexões:</span>
            <div className="flex bg-slate-900/60 p-0.5 rounded-lg border border-slate-800/80 w-full justify-between">
              {(['all', '0', '1', '2'] as const).map((connOption) => (
                <button key={connOption}
                  onClick={() => setConnsFilter(connOption)}
                  className={`flex-1 text-center py-0.5 text-[10px] rounded transition font-medium cursor-pointer ${
                    connsFilter === connOption ? 'bg-slate-850 text-amber-500 font-semibold' : 'text-slate-500 hover:text-slate-300'
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
      <div className="px-4 py-2 bg-slate-950/80 text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex justify-between items-center shrink-0">
        <span>Catálogo ({filteredCities.length} cidades)</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSortByConns(v => !v)}
            title={sortByConns ? 'Ordenar A-Z' : 'Ordenar por conexões'}
            className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold border transition cursor-pointer ${
              sortByConns ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
          >
            {sortByConns ? '🔗 Conex.' : 'A-Z'}
          </button>
          {hasActiveFilter && (
            <button
              onClick={() => { setSearch(''); setTypeFilter('all'); setConnsFilter('all'); }}
              className="px-1.5 py-0.5 rounded text-[8.5px] font-bold border bg-rose-950/40 text-rose-400 border-rose-800/40 hover:bg-rose-900/60 transition cursor-pointer"
              title="Limpar filtros"
            >
              ✕ limpar
            </button>
          )}
        </div>
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
            const topEdgeId = topEdgeRevByCity[city.id];

            return (
              <div
                key={city.id}
                onMouseEnter={() => onHoverCity(city.id)}
                onMouseLeave={() => onHoverCity(null)}
                className={`p-3 transition-all cursor-pointer flex flex-col gap-2 ${
                  isSelected ? 'bg-amber-500/10 border-l-4 border-amber-500'
                    : isHovered ? 'bg-slate-900/50' : 'hover:bg-slate-900/30'
                }`}
                onClick={() => { onFlyTo(city.lat, city.lng); onSelectCity(city.id); }}
              >
                <div className="flex items-center justify-between select-none">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full ring-4 ${
                      city.portType === 'maritime' ? 'bg-amber-400 ring-amber-500/20'
                        : city.portType === 'fluvial' ? 'bg-teal-400 ring-teal-500/30'
                        : city.type === 'capital' ? 'bg-amber-400 ring-amber-500/20'
                        : 'bg-sky-400 ring-sky-500/20'
                    }`} />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-200 text-xs">{city.name}</span>
                        <span className="text-[10px] text-slate-500 font-bold bg-slate-900 px-1 py-0.5 rounded">{city.state}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1.5">
                        {city.portType === 'maritime' ? (
                          <><span className="text-amber-400 font-bold">⚓ Porto Marítimo</span>{city.type === 'capital' && <span className="text-slate-600">• Cap</span>}</>
                        ) : city.portType === 'fluvial' ? (
                          <><span className="text-teal-400 font-bold">🚢 Porto Fluvial</span>{city.type === 'capital' && <span className="text-slate-600">• Cap</span>}</>
                        ) : (
                          city.type === 'capital' ? 'Capital Estadual' :
                          city.type === 'mineracao' ? <span className="text-orange-400">⛏️ Mineração</span> :
                          city.type === 'polo_agricola' ? <span className="text-lime-400">🌾 Polo Agrícola</span> :
                          city.type === 'polo_industrial' ? <span className="text-violet-400">🏭 Polo Industrial</span> :
                          city.type === 'fronteira' ? <span className="text-pink-400">🌐 Fronteira</span> : 'Cidade'
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {isUpgraded && <span className="text-amber-400 text-xs font-bold" title="Terminal Central Ativo">★</span>}
                    {hasYard && <span className="text-emerald-400 text-xs font-bold" title="Pátio de Manutenção Ativo">🔧</span>}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      conns >= maxConns ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-500/20'
                        : conns > 0 ? 'bg-sky-950/50 text-sky-400 border border-sky-500/20'
                        : 'bg-slate-900 text-slate-500 border border-slate-800'
                    }`}>
                      {conns}/{maxConns} {conns >= maxConns && '✓'}
                    </span>
                  </div>
                </div>

                {isSelected && (
                  <div className="flex flex-col gap-1.5 border-t border-slate-900/50 pt-2" onClick={(e) => e.stopPropagation()}>
                    {/* Rota mais lucrativa */}
                    {topEdgeId && (() => {
                      const topEdge = edges.find(e => e.id === topEdgeId);
                      if (!topEdge) return null;
                      const otherId = topEdge.from === city.id ? topEdge.to : topEdge.from;
                      const otherCity = cities.find(c => c.id === otherId);
                      const rev = Math.round(topEdge.distance * (topEdge.type === 'balsa' ? 40000 : 80000));
                      const fmt = (v: number) => v >= 1e9 ? `${(v/1e9).toFixed(1)}B` : `${(v/1e6).toFixed(0)}M`;
                      return (
                        <div className="flex items-center justify-between bg-yellow-950/20 border border-yellow-600/30 rounded px-2 py-1">
                          <span className="text-[9px] text-yellow-300 font-bold">⭐ Rota mais lucrativa: {topEdge.type === 'balsa' ? '🚢' : '🚂'} {otherCity?.name}</span>
                          <span className="text-[8.5px] text-yellow-400 font-bold font-mono">+R$ {fmt(rev)}/mês</span>
                        </div>
                      );
                    })()}
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
  );
}
