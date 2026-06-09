import React, { useState, useMemo } from 'react';
import { City, Edge } from '../types';
import { formatDistance } from '../utils/geo';
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
  X
} from 'lucide-react';

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
}: SidebarProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'capital' | 'cidade'>('all');
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
      
      const typeMatch = typeFilter === 'all' || city.type === typeFilter;
      
      const conns = cityConnections[city.id] || 0;
      const connsMatch = connsFilter === 'all' || conns.toString() === connsFilter;

      return nameMatch && typeMatch && connsMatch;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [cities, search, typeFilter, connsFilter, cityConnections]);

  return (
    <div id="control-sidebar" className="w-full md:w-96 text-slate-100 flex flex-col h-full overflow-hidden select-none">
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

      {/* Stats Dashboard */}
      <div className="p-4 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="grid grid-cols-2 gap-3 mb-3">
          {/* Track counter */}
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase block mb-0.5">Trilhos</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-amber-400 font-sans">{activeConns}</span>
              <span className="text-xs text-slate-500">/ {maxConnsCount}</span>
            </div>
            {/* Tiny progress bar */}
            <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-amber-500 to-orange-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${pctComplete}%` }}
              />
            </div>
          </div>

          {/* Distance counter */}
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase block mb-0.5">Extensão Total</span>
            <span className="text-lg font-bold text-emerald-400 block truncate mt-0.5" title={formatDistance(totalDistance)}>
              {totalDistance.toLocaleString('pt-BR')} <span className="text-xs font-normal text-slate-400">km</span>
            </span>
            <span className="text-[10px] text-slate-500 block leading-tight mt-1">Estimativa Haversine</span>
          </div>
        </div>

        {/* Node progress checklist */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-slate-900/40 py-1.5 px-2 rounded-lg border border-slate-900">
            <span className="text-slate-400 block text-[10px]">Não conectadas</span>
            <span className="font-bold text-slate-300 text-sm">{unconnCitiesCount}</span>
          </div>
          <div className="bg-slate-900/40 py-1.5 px-2 rounded-lg border border-slate-900">
            <span className="text-sky-400 block text-[10px]">Extremidades (1/2)</span>
            <span className="font-bold text-sky-300 text-sm">{leafCitiesCount}</span>
          </div>
          <div className="bg-slate-900/40 py-1.5 px-2 rounded-lg border border-slate-900">
            <span className="text-emerald-400 block text-[10px]">Saturadas (2/2)</span>
            <span className="font-bold text-emerald-300 text-sm">{completedCitiesCount}</span>
          </div>
        </div>
      </div>

      {/* Map style selector */}
      <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-850 flex items-center justify-between text-xs text-slate-300">
        <span className="flex items-center gap-1.5 font-medium text-slate-400">
          <Layers className="w-3.5 h-3.5" /> Estilo do Mapa:
        </span>
        <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800">
          {(['voyager', 'positron', 'dark', 'satellite'] as const).map((type) => (
            <button
               key={type}
               onClick={() => onTileLayerChange(type)}
               className={`px-2 py-0.5 rounded text-[10px] capitalize font-medium transition ${
                 tileLayerType === type 
                   ? 'bg-amber-500 text-slate-950 font-semibold' 
                   : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
               }`}
            >
              {type === 'voyager' ? 'Voyager' : type === 'positron' ? 'Claro' : type === 'dark' ? 'Escuro' : 'Satélite'}
            </button>
          ))}
        </div>
      </div>

      {/* Guia de Trilhas / Sugestões */}
      <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-850 flex items-center justify-between text-xs text-slate-300">
        <span className="flex items-center gap-1.5 font-medium text-slate-400">
          <Compass className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> Guia de Ferrovias:
        </span>
        <button
          onClick={onToggleSuggestions}
          className={`px-2.5 py-1 rounded text-[10px] uppercase font-bold tracking-wider transition ${
            showSuggestions 
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30' 
              : 'bg-slate-900 text-slate-500 border border-slate-800 hover:text-slate-300'
          }`}
          title="Exibir ou ocultar as linhas recomendadas como guias no mapa"
        >
          {showSuggestions ? 'Ver Planejamento' : 'Ocultar Guia'}
        </button>
      </div>

      {/* Instructional Box */}
      {showHowToPlay && (
        <div className="m-3 p-3 bg-gradient-to-r from-blue-950/50 to-indigo-950/50 rounded-xl border border-blue-500/30 text-xs leading-relaxed relative text-slate-300 shadow-inner">
          <button 
            onClick={() => setShowHowToPlay(false)}
            className="absolute top-2 right-2 text-slate-500 hover:text-slate-300"
          >
            <X className="w-3 h-3" />
          </button>
          <div className="flex gap-2">
            <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sky-300 mb-1">Como Jogar:</p>
              <ul className="list-disc pl-4 space-y-1 text-slate-300">
                <li>Selecione uma cidade no mapa ou na lista abaixo.</li>
                <li>Clique em outra cidade para erguer um trilho ferroviário.</li>
                <li><strong>Trilhos Planejados:</strong> Fáceis linhas tracejadas cinzas indicam rotas recomendadas. Clique diretamente sobre elas para assentar os trilhos!</li>
                <li>Cada cidade suporta no máximo <strong>2 conexões</strong>.</li>
                <li>Não é permitido fechar <strong>ciclos/circuitos</strong> antes do fim.</li>
                <li>Conecte todas as <strong>57 cidades</strong> em uma linha única e contínua!</li>
              </ul>
            </div>
          </div>
        </div>
      )}

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
            <div className="flex bg-slate-900/60 p-0.5 rounded-lg border border-slate-800/80 w-full justify-between">
              <button
                onClick={() => setTypeFilter('all')}
                className={`flex-1 text-center py-0.5 text-[10px] rounded transition font-medium ${
                  typeFilter === 'all' ? 'bg-slate-800 text-slate-200' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setTypeFilter('capital')}
                className={`flex-1 text-center py-0.5 text-[10px] rounded transition font-medium ${
                  typeFilter === 'capital' ? 'bg-amber-950/50 text-amber-400 font-semibold' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Capitais
              </button>
              <button
                onClick={() => setTypeFilter('cidade')}
                className={`flex-1 text-center py-0.5 text-[10px] rounded transition font-medium ${
                  typeFilter === 'cidade' ? 'bg-blue-950/50 text-blue-400 font-semibold' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Cidades
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
                  className={`flex-1 text-center py-0.5 text-[10px] rounded transition font-medium ${
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
            
            return (
              <div
                key={city.id}
                onMouseEnter={() => onHoverCity(city.id)}
                onMouseLeave={() => onHoverCity(null)}
                className={`p-3 transition-all cursor-pointer flex items-center justify-between group ${
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
                <div className="flex items-center gap-2.5">
                  <div className={`w-2 h-2 rounded-full ring-4 ${
                    city.type === 'capital' 
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
                    <span className="text-[10px] text-slate-400 font-medium">
                      {city.type === 'capital' ? 'Capital Estadual' : 'Cidade Importante'}
                    </span>
                  </div>
                </div>

                {/* Connection Status Indicator */}
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    conns === 2 
                      ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-500/20' 
                      : conns === 1 
                        ? 'bg-sky-950/50 text-sky-400 border border-sky-500/20' 
                        : 'bg-slate-900 text-slate-500 border border-slate-800'
                  }`}>
                    {conns}/2 {conns === 2 && '✓'}
                  </span>
                  
                  <Maximize2 className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Branding */}
      <div className="p-3 bg-slate-950 border-t border-slate-900 text-[10px] text-slate-500 flex justify-between tracking-wide shrink-0 font-mono">
        <span>© 2026 TRILHO REAL</span>
        <span>BR-RAILWAYS V1.0</span>
      </div>
    </div>
  );
}
