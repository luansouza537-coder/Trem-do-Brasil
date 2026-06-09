import React, { useState, useEffect, useMemo } from 'react';
import { CITIES } from './data/cities';
import { City, Edge, GameStats } from './types';
import Sidebar from './components/Sidebar';
import GameMap from './components/GameMap';
import { sound } from './services/sound';
import { 
  getHaversineDistance, 
  pathExists, 
  getComponentSize, 
  formatDistance 
} from './utils/geo';
import { 
  Train, 
  Trophy, 
  HelpCircle, 
  AlertTriangle, 
  ChevronRight, 
  Sparkles, 
  RefreshCw, 
  Volume2, 
  VolumeX, 
  CheckCircle2,
  Info
} from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

const HISTORIC_FACTS = [
  "A Estrada de Ferro Mauá foi a primeira ferrovia do Brasil, inaugurada em 1854 no Rio de Janeiro por D. Pedro II, com uma extensão inicial de apenas 14,5 km!",
  "A ferrovia Santos-Jundiaí era uma impressionante façanha da engenharia imperial que usava potentes cabos de aço para tracionar locomotivas montanha acima pela íngreme Serra do Mar.",
  "Com trens de até 330 vagões que se estendem por quase 3,5 km de ponta a ponta, a Estrada de Ferro de Carajás é reconhecida como uma das ferrovias de carga mais potentes e eficientes do planeta.",
  "O famoso 'Trem da Morte' conecta o Brasil (via Corumbá, MS) com Santa Cruz de la Sierra na Bolívia. Recebeu esse nome célebre no passado por ter transportado doentes de febre amarela, e hoje é um trajeto lendário de mochileiros.",
  "Construída no coração de Rondônia, a lendária Estrada de Ferro Madeira-Mamoré ficou tragicamente conhecida como a 'Ferrovia do Diabo', devido às milhares de vidas cobradas por malária e febre amarela durante o ciclo da borracha."
];

export default function App() {
  // Game States
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [hoveredCityId, setHoveredCityId] = useState<string | null>(null);
  const [tileLayerType, setTileLayerType] = useState<'voyager' | 'positron' | 'dark' | 'satellite'>('dark');
  const [isMuted, setIsMuted] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [flyToSignal, setFlyToSignal] = useState<{ lat: number; lng: number; timestamp: number } | null>(null);

  // Overlays
  const [welcomeOpen, setWelcomeOpen] = useState(true);
  const [victoryOpen, setVictoryOpen] = useState(false);
  
  // Custom Toast stacks
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // Random history trivia index on win
  const [historyFactIndex, setHistoryFactIndex] = useState(0);

  // Load sound setting preference
  useEffect(() => {
    sound.setMute(isMuted);
  }, [isMuted]);

  // Toast notifier trigger
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  // Sound muter toggle
  const handleToggleMute = () => {
    const nextMute = sound.toggleMute();
    setIsMuted(nextMute);
    showToast(nextMute ? 'Efeitos sonoros desativados' : 'Efeitos sonoros ativados', 'info');
  };

  // Reset the railway grid
  const handleResetGame = (skipConfirmation = false) => {
    if (!skipConfirmation && edges.length > 0) {
      if (!window.confirm("Você tem certeza de que deseja demolir todos os trilhos e começar de novo?")) {
        return;
      }
    }
    setEdges([]);
    setSelectedCityId(null);
    setHoveredCityId(null);
    setVictoryOpen(false);
    sound.playReset();
    showToast("Malha ferroviária demolida. Comece a traçar novas rotas!", "info");
  };

  // Get active connection limits for a single city node
  const getCityDegree = (cityId: string, currentEdges: Edge[] = edges): number => {
    return currentEdges.reduce(
      (acc, edge) => (edge.from === cityId || edge.to === cityId ? acc + 1 : acc),
      0
    );
  };

  // Calculate distance sum
  const totalDistance = useMemo(() => {
    return edges.reduce((acc, edge) => acc + edge.distance, 0);
  }, [edges]);

  // Main track-drawing click routine
  const handleConnectCities = (idA: string, idB: string) => {
    // 1. Prevent connecting City A with itself
    if (idA === idB) {
      setSelectedCityId(null);
      return;
    }

    // 2. Locate cities
    const cityA = CITIES.find((c) => c.id === idA);
    const cityB = CITIES.find((c) => c.id === idB);
    if (!cityA || !cityB) return;

    // 3. Handle deletion if segment already exists (Eraser tool)
    const edgeId1 = `${idA}-${idB}`;
    const edgeId2 = `${idB}-${idA}`;
    const existingEdge = edges.find((e) => e.id === edgeId1 || e.id === edgeId2);

    if (existingEdge) {
      setEdges((prev) => prev.filter((e) => e.id !== existingEdge.id));
      setSelectedCityId(null);
      sound.playDisconnect();
      showToast(`Ferrovia entre ${cityA.name} e ${cityB.name} foi demolida.`, 'info');
      return;
    }

    // 4. Validate degrees: Limit to maximum 2 rails per city center
    const degA = getCityDegree(idA);
    const degB = getCityDegree(idB);

    if (degA >= 2) {
      sound.playError();
      showToast(`A cidade ${cityA.name} já esgotou seu limite máximo de 2 eixos ferroviários!`, 'error');
      setSelectedCityId(null);
      return;
    }
    if (degB >= 2) {
      sound.playError();
      showToast(`A cidade ${cityB.name} já esgotou seu limite máximo de 2 eixos ferroviários!`, 'error');
      setSelectedCityId(null);
      return;
    }

    // 5. Detect and block loop circuitry (Cycles)
    // A connection forms a cycle if a path already links A and B directly or indirectly,
    // *unless* this connection closes the final loop. Wait: but we want an open, single linear route,
    // which has N nodes and N-1 edges, with NO cycles. So we PROHIBIT cycles at all times.
    const pathAlreadyExists = pathExists(idA, idB, edges);
    if (pathAlreadyExists) {
      const compSize = getComponentSize(idA, edges);
      // If we already connected all 57 cities in a path, and we are connecting the 2 loose ends to form a loop:
      // Typically, an open line of 57 cities has 56 links. Connecting the ends would create a closed loop of 57 links.
      // The prompt says: "proíba qualquer conexão entre dois nós que já pertencem ao mesmo componente conexo, a menos que o componente já tenha todos os nós – assim se evita ciclos antes do fim."
      if (compSize < CITIES.length) {
        sound.playError();
        showToast(`Impossível assentar trilho: esta conexão criaria um loop fechado (ciclo) prematuro no sistema de trens de ${cityA.name}!`, 'error');
        setSelectedCityId(null);
        return;
      }
    }

    // 6. Safe to build: Calculate distance and append edge
    const distanceVal = getHaversineDistance(cityA.lat, cityA.lng, cityB.lat, cityB.lng);
    const newEdge: Edge = {
      id: `${idA}-${idB}`,
      from: idA,
      to: idB,
      distance: distanceVal,
    };

    const nextEdges = [...edges, newEdge];
    setEdges(nextEdges);
    setSelectedCityId(null);
    sound.playConnect();
    showToast(`Novo trilho: ${cityA.name} ⇄ ${cityB.name} (${distanceVal} km)`, 'success');

    // 7. Check for perfect linear win conditions
    // Connections: 56 edges total, and all 57 cities are in a single component
    const hasFinishedPath = nextEdges.length === CITIES.length - 1;
    if (hasFinishedPath) {
      const componentSize = getComponentSize(CITIES[0].id, nextEdges);
      if (componentSize === CITIES.length) {
        // Play victory signals (steam whistle!)
        setTimeout(() => {
          sound.playTrainWhistle();
          setHistoryFactIndex(Math.floor(Math.random() * HISTORIC_FACTS.length));
          setVictoryOpen(true);
        }, 600);
      }
    }
  };

  // Select focus and smoothly fly map camera to city bounds
  const handleFlyToCity = (lat: number, lng: number) => {
    setFlyToSignal({
      lat,
      lng,
      timestamp: Date.now()
    });
  };

  return (
    <div id="game-workspace" className="flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-slate-950 font-sans" style={{ contentVisibility: 'auto' }}>
      
      {/* 2. Left Overlay Sidebar Panel */}
      <Sidebar
        cities={CITIES}
        edges={edges}
        selectedCityId={selectedCityId}
        hoveredCityId={hoveredCityId}
        onSelectCity={setSelectedCityId}
        onHoverCity={setHoveredCityId}
        onFlyTo={handleFlyToCity}
        onReset={() => handleResetGame(false)}
        tileLayerType={tileLayerType}
        onTileLayerChange={setTileLayerType}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        showSuggestions={showSuggestions}
        onToggleSuggestions={() => setShowSuggestions(!showSuggestions)}
      />

      {/* 3. Primary Leaflet Map Container */}
      <main className="flex-1 h-2/3 md:h-full relative overflow-hidden">
        
        {/* Helper overlay when a city is selected */}
        {selectedCityId && (
          <div className="absolute top-4 left-4 right-4 md:right-auto md:w-[450px] bg-slate-900/95 backdrop-blur-md border border-amber-500/40 px-4 py-3 rounded-xl shadow-2xl z-50 animate-bounce transition-all">
            <div className="flex items-start gap-2.5">
              <Train className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-100">
                  Partida: <span className="text-amber-400 font-extrabold">{CITIES.find(c => c.id === selectedCityId)?.name}</span>
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">
                  Selecione outra cidade no mapa ou busque na lista lateral para assentar um novo trilho entre elas. Clique em qualquer área limpa do mapa para cancelar.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Floating Quick Stats Overlays for Map */}
        <div className="absolute bottom-4 left-4 flex gap-2 z-40 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 backdrop-blur-md pointer-events-none hidden md:flex items-center">
          <Train className="w-4 h-4 text-emerald-500 text-slate-400" />
          <span className="text-slate-300 text-[11px] font-medium">
            Remoção rápida: Clique em qualquer trilho assentado para removê-lo.
          </span>
        </div>

        {/* Map Mount */}
        <GameMap
          cities={CITIES}
          edges={edges}
          selectedCityId={selectedCityId}
          hoveredCityId={hoveredCityId}
          onSelectCity={setSelectedCityId}
          onHoverCity={setHoveredCityId}
          onConnectCities={handleConnectCities}
          tileLayerType={tileLayerType}
          flyToSignal={flyToSignal}
          showSuggestions={showSuggestions}
        />
      </main>

      {/* --- Toasts Stacks HUD Overlay --- */}
      <div className="absolute bottom-6 right-6 z-[2000] flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-3.5 rounded-xl border text-xs font-medium shadow-2xl flex items-center gap-2.5 transition-all duration-300 transform translate-y-0 opacity-100 pointer-events-auto ${
              toast.type === 'success'
                ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-200'
                : toast.type === 'error'
                  ? 'bg-rose-950/95 border-rose-500/50 text-rose-200'
                  : 'bg-slate-900/95 border-slate-700/60 text-slate-200'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {toast.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-amber-400 shrink-0" />}
            <span className="leading-snug">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* --- WELCOME TUTORIAL MODAL --- */}
      {welcomeOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col relative animate-in fade-in zoom-in-95 duration-200">
            {/* Top decorative banner */}
            <div className="h-2 bg-gradient-to-r from-amber-500 via-orange-500 to-red-600"></div>
            
            <div className="p-6 md:p-8">
              {/* Header */}
              <div className="flex items-center gap-3.5 mb-6">
                <div className="p-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl text-slate-950 flex shadow-lg">
                  <Train className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="font-display font-extrabold text-xl text-slate-100 uppercase tracking-tight">
                    Trilho Real
                  </h2>
                  <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase">
                    Desafio Ferroviário do Brasil
                  </p>
                </div>
              </div>

              {/* Pitch */}
              <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                Bem-vindo ao <strong>Trilho Real</strong>! Seu objetivo é construir uma linha férrea que unifique o território nacional passendo por <strong>57 cidades</strong> estratégicas (as 27 capitais federativas + 30 polos regionais majoritários).
              </p>

              {/* Guide items */}
              <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-3.5">
                Diretrizes de Assentamento:
              </h3>
              
              <div className="space-y-4 mb-8">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Percurso Linear</h4>
                    <p className="text-xs text-slate-400 mt-1 leading-normal">
                      Cada cidade comporta no máximo duas conexões (entrada e saída) de modo a estruturar uma fileira contínua sem ramificações em teia.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Barreira contra Loops (Ciclos)</h4>
                    <p className="text-xs text-slate-400 mt-1 leading-normal">
                      Circuitos fechados antes da hora isolam trechos. O jogo proíbe loops parciais; você só vencerá quando a cadeia simples amarrar as 57 cidades.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Comando de Demolição</h4>
                    <p className="text-xs text-slate-400 mt-1 leading-normal">
                      Errou um trecho? Clique sobre qualquer trilho vermelho desenhado no mapa para eliminá-lo instantaneamente.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action */}
              <button
                onClick={() => {
                  setWelcomeOpen(false);
                  sound.playSelect();
                }}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-display font-extrabold uppercase py-3.5 px-6 rounded-xl transition-all shadow-lg text-sm tracking-widest cursor-pointer active:scale-95"
              >
                Começar Expedição 🚂
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- VICTORY CONGRATULATIONS MODAL --- */}
      {victoryOpen && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[99999] flex items-center justify-center p-4 select-none">
          <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col relative animate-in fade-in duration-300 zoom-in-95">
            
            {/* Victory background flare */}
            <div className="absolute inset-0 bg-radial-gradient from-amber-500/10 via-transparent to-transparent pointer-events-none"></div>

            {/* Sparkles */}
            <div className="absolute top-4 left-4 animate-bounce text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="absolute bottom-4 right-4 animate-ping text-orange-400 duration-1000">
              <Sparkles className="w-4 h-4" />
            </div>

            <div className="p-6 md:p-10 relative flex flex-col text-center">
              {/* Crown Icon / Winner banner */}
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-yellow-400 via-amber-500 to-red-600 text-slate-950 rounded-2xl flex items-center justify-center hover:scale-110 transition-transform mb-6 shadow-xl relative">
                <Trophy className="w-8 h-8" />
                <div className="absolute -inset-1 bg-white/10 rounded-2xl animate-pulse"></div>
              </div>

              <h2 className="font-display font-extrabold text-2xl md:text-3xl tracking-tight bg-gradient-to-r from-yellow-400 via-amber-300 to-orange-400 bg-clip-text text-transparent uppercase">
                Vitória Espetacular!
              </h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                A Grande Malha de Aço está Concluída 🚂
              </p>

              <hr className="w-16 border-amber-500/40 mx-auto my-5" />

              <p className="text-sm text-slate-300 leading-relaxed mb-6">
                Parabéns! Você ligou com maestria as <strong>57 principais cidades e capitais brasileiras</strong> em uma única linha contínua, estruturando uma rota perfeita de ponta a ponta do país!
              </p>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 bg-slate-950/80 p-5 rounded-2xl border border-slate-800 mb-6">
                <div className="text-center">
                  <span className="text-[10px] text-slate-500 tracking-wider uppercase font-semibold">Distância Coberta</span>
                  <p className="text-xl font-black text-emerald-400 mt-1">
                    {totalDistance.toLocaleString('pt-BR')} <span className="text-sm font-normal">km</span>
                  </p>
                </div>
                
                <div className="text-center border-l border-slate-800">
                  <span className="text-[10px] text-slate-500 tracking-wider uppercase font-semibold">Trilhos Assentados</span>
                  <p className="text-xl font-black text-amber-400 mt-1">
                    56 <span className="text-xs font-normal text-slate-400">/ 56</span>
                  </p>
                </div>
              </div>

              {/* Educational Railway Trivia Box */}
              <div className="bg-amber-950/20 rounded-2xl p-4 border border-amber-500/20 text-left mb-8">
                <div className="flex gap-2.5">
                  <Train className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-amber-400 uppercase">Curiosidade de História Ferroviária</span>
                    <p className="text-xs text-amber-100/70 mt-1 leading-relaxed italic">
                      "{HISTORIC_FACTS[historyFactIndex]}"
                    </p>
                  </div>
                </div>
              </div>

              {/* Action row */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    handleResetGame(true);
                  }}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-display font-bold py-3 px-6 rounded-xl transition shadow-lg text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <RefreshCw className="w-4 h-4" /> Jogar Novamente
                </button>
                
                <button
                  onClick={() => setVictoryOpen(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-display font-medium py-3 px-6 rounded-xl transition text-xs uppercase tracking-widest cursor-pointer active:scale-95"
                >
                  Fechar Janela
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
