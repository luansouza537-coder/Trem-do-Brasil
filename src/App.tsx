import React, { useState, useEffect, useMemo } from 'react';
import { CITIES } from './data/cities';
import { City, Edge, GameStats, GameResources, GameEvent, GameWorkers, ConstructionProject, NewsItem } from './types';
import { MISSIONS } from './utils/missions';
import { newsRouteComplete, newsCrisis, newsGrant, newsMission, newsRandom } from './utils/news';
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
  getTrackCostDetail,
  getIntermodalGrants,
  calculateRailwayDistancesFromYards,
  getTrackResourcesRequired,
  RESOURCE_BUY_PRICES,
  getTrackWorkersRequired,
  getConstructionMonths,
  WORKER_SALARIES,
  WORKER_NAMES,
  getYearInflationMultiplier,
  getMonthlyRevenue
} from './utils/gameRules';
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
  Info,
  DollarSign,
  Wrench,
  Star,
  Zap,
  Anchor,
  Ship,
  Check,
  Layers
} from 'lucide-react';
import { saveGame, loadGame, deleteSave, hasSave, getSaveDate, getAllSlotDates } from './utils/persistence';

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

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function App() {
  const lastPaidMonthRef = React.useRef('');
  const lowBudgetAlertedRef = React.useRef(false);
  const edgesRef = React.useRef<Edge[]>([]);

  // Game States
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [hoveredCityId, setHoveredCityId] = useState<string | null>(null);
  const [tileLayerType, setTileLayerType] = useState<'voyager' | 'positron' | 'dark' | 'satellite'>('dark');
  const [isMuted, setIsMuted] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [flyToSignal, setFlyToSignal] = useState<{ lat: number; lng: number; timestamp: number } | null>(null);

  // Tycoon expansions
  const [upgradedHubs, setUpgradedHubs] = useState<string[]>([]);
  const [maintenanceYards, setMaintenanceYards] = useState<string[]>([]);
  const [constructionType, setConstructionType] = useState<'rail' | 'balsa'>('rail');

  // Resource & Crises states
  const [resources, setResources] = useState<GameResources>({
    aco: 2500,
    brita: 4000,
    madeira: 2000,
    cimento: 2500,
    cobre: 850,
    explosivos: 300
  });
  const [autoBuyResources, setAutoBuyResources] = useState(true);
  const [spentOnResources, setSpentOnResources] = useState(0);

  // Workforce state (workers pool and spent payroll)
  const [workers, setWorkers] = useState<GameWorkers>({
    terraplanagem: 500,
    assentamento:  300,
    sinalizacao:   80,
    explosivos:    30,
    manutencao:    150,
  });
  const [spentOnWorkers, setSpentOnWorkers] = useState(0);
  const [constructionQueue, setConstructionQueue] = useState<ConstructionProject[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [saveSlot, setSaveSlot] = useState(1);
  const [slotDates, setSlotDates] = useState<(string | null)[]>(() => getAllSlotDates());
  const [completedMissions, setCompletedMissions] = useState<string[]>([]);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);

  const [activeEvents, setActiveEvents] = useState<GameEvent[]>([]);
  const [currentEvent, setCurrentEvent] = useState<GameEvent | null>(null);

  // Overlays
  const [welcomeOpen, setWelcomeOpen] = useState(true);
  const [victoryOpen, setVictoryOpen] = useState(false);
  const [gameOverOpen, setGameOverOpen] = useState(false);

  // Time and progression state (2027 to 2077)
  const [gameYear, setGameYear] = useState(2027);
  const [monthIdx, setMonthIdx] = useState(0);
  const [playSpeed, setPlaySpeed] = useState<'paused' | 'normal' | 'fast'>('normal');
  
  // Custom Toast stacks
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // Random history trivia index on win
  const [historyFactIndex, setHistoryFactIndex] = useState(0);

  const [hasSaveGame, setHasSaveGame] = useState(() => hasSave());
  const [saveDate, setSaveDate] = useState<string | null>(() => getSaveDate());
  const autoSaveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [budgetHistory, setBudgetHistory] = useState<{ label: string; budget: number }[]>([]);

  // Keep edgesRef in sync for use inside non-edges-dependent effects
  useEffect(() => { edgesRef.current = edges; }, [edges]);

  // Load sound setting preference
  useEffect(() => {
    sound.setMute(isMuted);
  }, [isMuted]);

  // Auto-save game state to localStorage whenever key state changes (debounced 2s)
  useEffect(() => {
    if (welcomeOpen) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveGame({
        edges, upgradedHubs, maintenanceYards, constructionType,
        resources, spentOnResources, workers, spentOnWorkers,
        activeEvents, gameYear, monthIdx, constructionQueue, totalRevenue,
        completedMissions, newsItems,
      }, saveSlot);
      setHasSaveGame(true);
      setSaveDate(getSaveDate(saveSlot));
      setSlotDates(getAllSlotDates());
    }, 2000);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [edges, upgradedHubs, maintenanceYards, constructionType, resources,
      spentOnResources, workers, spentOnWorkers, activeEvents, gameYear, monthIdx, welcomeOpen]);

  // Dynamic time progression with configurable speeds:
  // - 'paused': No ticking
  // - 'normal': campaign 20 hours (1 month = 120,000ms = 120s / 2mins)
  // - 'fast': fast sandbox (1 month = 6000ms = 6s)
  useEffect(() => {
    if (welcomeOpen || victoryOpen || gameOverOpen || playSpeed === 'paused') return;

    const intervalTime = playSpeed === 'normal' ? 120000 : 6000;

    const interval = setInterval(() => {
      setMonthIdx((prevMonth) => {
        if (prevMonth === 11) {
          setGameYear((prevYear) => {
            if (prevYear >= 2077) {
              clearInterval(interval);
              setGameOverOpen(true);
              sound.playError();
              return 2077;
            }
            return prevYear + 1;
          });
          return 0;
        }
        return prevMonth + 1;
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [welcomeOpen, victoryOpen, gameOverOpen, playSpeed]);

  // Decrement crisis durations, deduct wages, and trigger monthly random events
  useEffect(() => {
    if (welcomeOpen || victoryOpen || gameOverOpen || playSpeed === 'paused') return;

    // 0. Pay Workforce / Payroll
    const monthKey = `${monthIdx}-${gameYear}`;
    if (lastPaidMonthRef.current !== monthKey) {
      lastPaidMonthRef.current = monthKey;

      const monthlyPayroll = (workers.terraplanagem * WORKER_SALARIES.terraplanagem) +
                             (workers.assentamento  * WORKER_SALARIES.assentamento)  +
                             (workers.sinalizacao   * WORKER_SALARIES.sinalizacao)   +
                             (workers.explosivos    * WORKER_SALARIES.explosivos)    +
                             (workers.manutencao    * WORKER_SALARIES.manutencao);

      const totalWorkers = workers.terraplanagem + workers.assentamento + workers.sinalizacao + workers.explosivos + workers.manutencao;
      if (monthlyPayroll > 0) {
        setSpentOnWorkers((prev) => prev + monthlyPayroll);
      }

      // Collect revenue from all completed routes
      const monthlyRev = getMonthlyRevenue(edgesRef.current);
      if (monthlyRev > 0) {
        setTotalRevenue(prev => prev + monthlyRev);
      }

      // Monthly summary toast
      const net = monthlyRev - monthlyPayroll;
      const fmt = (v: number) => v >= 1e12 ? `${(v/1e12).toFixed(2)}T` : v >= 1e9 ? `${(v/1e9).toFixed(1)}B` : `${(v/1e6).toFixed(0)}M`;
      showToast(
        `📊 ${MONTHS_PT[monthIdx]}/${gameYear} — Receita: +R$ ${fmt(monthlyRev)} | Folha: -R$ ${fmt(monthlyPayroll)} | Saldo: ${net >= 0 ? '+' : ''}R$ ${fmt(net)}`,
        net >= 0 ? 'success' : 'info'
      );

      // Random monthly news
      const rnd = newsRandom(gameYear, monthIdx);
      if (rnd) setNewsItems(prev => [rnd, ...prev].slice(0, 40));

      // Budget snapshot recorded by a separate useEffect on budgetState.currentBudget

      // Advance construction queue
      setConstructionQueue(prev => {
        const stillBuilding: ConstructionProject[] = [];
        const completed: ConstructionProject[] = [];
        prev.forEach(p => {
          if (p.monthsRemaining <= 1) completed.push(p);
          else stillBuilding.push({ ...p, monthsRemaining: p.monthsRemaining - 1 });
        });
        if (completed.length > 0) {
          const ym = `${gameYear}/${String(monthIdx + 1).padStart(2, '0')}`;
          setEdges(prevEdges => prevEdges.map(e => {
            const done = completed.find(p => p.edgeId === e.id);
            return done ? { ...e, status: 'complete' as const } : e;
          }));
          completed.forEach(p => {
            const cityA = CITIES.find(c => c.id === p.from);
            const cityB = CITIES.find(c => c.id === p.to);
            showToast(`✅ Construção concluída: ${cityA?.name} ↔ ${cityB?.name} (${p.distance.toFixed(0)} km)`, 'success');
            sound.playConnect();
            if (cityA && cityB) {
              setNewsItems(prev => [newsRouteComplete(cityA, cityB, p.distance, p.type, ym), ...prev].slice(0, 40));
            }
          });
        }
        return stillBuilding;
      });
    }

    // 1. Durations Tick
    setActiveEvents((prev) => {
      const updated = prev.map(e => ({ ...e, monthsLeft: e.monthsLeft - 1 }));
      const expired = updated.filter(e => e.monthsLeft <= 0);
      const active = updated.filter(e => e.monthsLeft > 0);

      expired.forEach(e => {
        showToast(`Crise resolvida: os efeitos da crise "${e.title}" terminaram!`, 'success');
      });

      return active;
    });

    // 2. Random Event Trigger Roll (e.g. 15% probability of checking, max 2 concurrent events)
    // Avoid triggering in the first 4 months of 2027 to let the user get acclimated
    if (gameYear === 2027 && monthIdx < 4) return;

    if (Math.random() < 0.15 && activeEvents.length < 2 && !currentEvent) {
      const candidateEvents: GameEvent[] = [
        {
          id: 'greve_' + Date.now(),
          title: 'Greve Geral Ferroviária 🚧',
          description: 'Sindicatos paralisaram parcialmente as obras reivindicando melhorias nas frentes de trabalho e adicionais salariais de campo. Custos adicionais serão aplicados!',
          type: 'strike',
          statusEffect: 'GREVE_GERAL',
          costToResolve: 35000000000, // R$ 35 B
          durationMonths: 12,
          monthsLeft: 12
        },
        {
          id: 'licenca_' + Date.now(),
          title: 'Impasse de Licença na Amazônia 🌳',
          description: 'Estudos de impacto ambiental no trecho Norte foram travados provisoriamente pelo IBAMA para preservação de mananciais de igarapé. O custo de metal/cimento dispara em 50% na Região Norte.',
          type: 'env_delay',
          statusEffect: 'ATRASO_AMBIENTAL_AMAZONIA',
          costToResolve: 25000000000, // R$ 25 B
          durationMonths: 18,
          monthsLeft: 18
        },
        {
          id: 'crise_' + Date.now(),
          title: 'Super Inflação de Insumos 📈',
          description: 'Uma escalada geopolítica internacional travou frotas de cargueiros de minério, dobrando instantaneamente o preço de aquisição de Aço e Cobre.',
          type: 'crisis',
          statusEffect: 'INFLACAO_GLOBAL',
          durationMonths: 10,
          monthsLeft: 10
        },
        {
          id: 'natural_' + Date.now(),
          title: 'Grande Cheia no Pantanal 🌧️',
          description: 'Chuvas torrenciais inundaram as bacias estuarinas de MS/MT. Dormentes e sapatas de madeira foram totalmente levados pelas corredeiras, exigindo 1.8x mais consumo de Madeira.',
          type: 'natural',
          statusEffect: 'ESCASSES_MADEIRA',
          costToResolve: 15000000000, // R$ 15 B
          durationMonths: 14,
          monthsLeft: 14
        },
        {
          id: 'politics_' + Date.now(),
          title: 'Multas e Emendas Legislativas 🏛️',
          description: 'Bancadas parlamentares congelaram temporariamente autorizações e emendas de escoamento marítimo regional por pressões políticas locais.',
          type: 'politics',
          statusEffect: 'LOBBY_REGIONAL',
          costToResolve: 20000000000, // R$ 20 B
          durationMonths: 8,
          monthsLeft: 8
        }
      ];

      // Exclude events already active
      const available = candidateEvents.filter(
        cand => !activeEvents.some(act => act.statusEffect === cand.statusEffect)
      );

      if (available.length > 0) {
        const selected = available[Math.floor(Math.random() * available.length)];
        setCurrentEvent(selected);
        sound.playError();
      }
    }
  }, [monthIdx, gameYear, workers]);

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
    if (!skipConfirmation && (edges.length > 0 || upgradedHubs.length > 0 || maintenanceYards.length > 0)) {
      if (!window.confirm("Você tem certeza de que deseja demolir todos os trilhos, upgrades e começar de novo?")) {
        return;
      }
    }
    setEdges([]);
    setSelectedCityId(null);
    setHoveredCityId(null);
    setUpgradedHubs([]);
    setMaintenanceYards([]);
    setConstructionType('rail');
    setVictoryOpen(false);
    setGameOverOpen(false);
    setGameYear(2027);
    setMonthIdx(0);
    setPlaySpeed('normal');
    
    // Reset resources & crises state
    setResources({
      aco: 2500,
      brita: 4000,
      madeira: 2000,
      cimento: 2500,
      cobre: 850,
      explosivos: 300
    });
    setSpentOnResources(0);

    // Reset workers state
    setWorkers({
      terraplanagem: 500,
      assentamento:  300,
      sinalizacao:   80,
      explosivos:    30,
      manutencao:    150,
    });
    setSpentOnWorkers(0);
    setConstructionQueue([]);
    setTotalRevenue(0);
    setCompletedMissions([]);
    setNewsItems([]);

    setActiveEvents([]);
    setCurrentEvent(null);

    sound.playReset();
    deleteSave(); setHasSaveGame(false); setSaveDate(null);
    showToast("Malha ferroviária e estruturas demolidas. Comece a traçar novas rotas!", "info");
  };

  // Load saved game state from localStorage
  const handleLoadGame = (slot = saveSlot) => {
    const save = loadGame(slot);
    if (!save) return;
    setEdges(save.edges);
    setUpgradedHubs(save.upgradedHubs);
    setMaintenanceYards(save.maintenanceYards);
    setConstructionType(save.constructionType);
    setResources(save.resources);
    setSpentOnResources(save.spentOnResources);
    setWorkers(save.workers);
    setSpentOnWorkers(save.spentOnWorkers);
    setActiveEvents(save.activeEvents);
    setGameYear(save.gameYear);
    setMonthIdx(save.monthIdx);
    setConstructionQueue(save.constructionQueue ?? []);
    setTotalRevenue(save.totalRevenue ?? 0);
    setCompletedMissions(save.completedMissions ?? []);
    setNewsItems(save.newsItems ?? []);
    setSaveSlot(slot);
    setWelcomeOpen(false);
    sound.playConnect();
    showToast(`Partida carregada! Slot ${slot} — Ano ${save.gameYear}.`, 'success');
  };

  // Advance one game month manually
  const handleAdvanceMonth = () => {
    if (victoryOpen || gameOverOpen) return;
    setMonthIdx(prev => {
      if (prev === 11) {
        setGameYear(py => {
          if (py >= 2077) { setGameOverOpen(true); return 2077; }
          return py + 1;
        });
        return 0;
      }
      return prev + 1;
    });
  };

  // Export game statistics as JSON
  const handleExportStats = () => {
    const completedEdges = edges.filter(e => e.status !== 'building');
    const stats = {
      exportedAt: new Date().toISOString(),
      gameYear,
      month: monthIdx + 1,
      budgetCurrent: budgetState.currentBudget,
      budgetSpent: budgetState.totalSpent,
      totalRevenue,
      monthlyRevenue: budgetState.monthlyRevenue,
      connectionsComplete: completedEdges.length,
      connectionsBuilding: edges.filter(e => e.status === 'building').length,
      totalDistanceKm: Math.round(edges.reduce((s, e) => s + e.distance, 0)),
      workers,
      upgradedHubs: upgradedHubs.length,
      maintenanceYards: maintenanceYards.length,
      activeEvents: activeEvents.map(e => ({ title: e.title, monthsLeft: e.monthsLeft })),
    };
    const blob = new Blob([JSON.stringify(stats, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `renif-stats-${gameYear}-${String(monthIdx + 1).padStart(2, '0')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('📊 Estatísticas exportadas com sucesso!', 'success');
  };

  // Hire workforce handler
  const handleHireWorker = (role: keyof GameWorkers, amount: number) => {
    const onboardingFeePerWorker = 1500000; // R$ 1.500.000 por trabalhador
    const totalCost = amount * onboardingFeePerWorker;

    if (budgetState.currentBudget < totalCost) {
      sound.playError();
      showToast(`Orçamento insuficiente para qualificar e admitir ${amount} profissionais! (Investimento de admissão: R$ ${totalCost.toLocaleString('pt-BR')})`, 'error');
      return;
    }

    setSpentOnWorkers(prev => prev + totalCost);
    setWorkers(prev => ({
      ...prev,
      [role]: (prev[role] ?? 0) + amount
    }));
    sound.playConnect();

    const nameMap: Record<keyof GameWorkers, string> = {
      terraplanagem: 'Terraplanagem',
      assentamento: 'Assentamento',
      sinalizacao: 'Sinalização',
      explosivos: 'Explosivos', manutencao: 'Manutenção'
    };

    showToast(`Admissão: +${amount} ${nameMap[role]}(s) contratado(s). Taxa paga: R$ ${totalCost.toLocaleString('pt-BR')}.`, 'success');
  };

  // Fire/Dispense workforce handler
  const handleFireWorker = (role: keyof GameWorkers, amount: number) => {
    const currentQty = workers[role] ?? 0;
    if (currentQty <= 0) {
      showToast("Não há trabalhadores deste tipo contratados!", "error");
      return;
    }

    const actualAmount = Math.min(amount, currentQty);
    const severanceCost = actualAmount * 500000; // R$ 500.000 por trabalhador

    setSpentOnWorkers(prev => prev + severanceCost);
    setWorkers(prev => ({
      ...prev,
      [role]: Math.max(0, (prev[role] ?? 0) - actualAmount)
    }));
    sound.playDisconnect();

    const nameMap: Record<keyof GameWorkers, string> = {
      terraplanagem: 'Terraplanagem',
      assentamento: 'Assentamento',
      sinalizacao: 'Sinalização',
      explosivos: 'Explosivos', manutencao: 'Manutenção'
    };

    showToast(`Rescisão: ${actualAmount} ${nameMap[role]}(s) desligados. Indenização: R$ ${severanceCost.toLocaleString('pt-BR')}`, 'info');
  };

  // Manual resource purchasing handler
  const handleBuyResource = (resKey: keyof GameResources, amount: number) => {
    const isHighInflation = activeEvents.some(e => 
      (resKey === 'aco' && e.statusEffect === 'INFLACAO_GLOBAL') || 
      (resKey === 'cobre' && e.statusEffect === 'INFLACAO_GLOBAL')
    );
    const unitPrice = RESOURCE_BUY_PRICES[resKey] * (isHighInflation ? 2.0 : 1.0);
    const totalCost = amount * unitPrice;

    if (budgetState.currentBudget < totalCost) {
      sound.playError();
      showToast(`Orçamento insuficiente para adquirir ${amount}t de ${resKey === 'aco' ? 'Aço' : resKey === 'brita' ? 'Brita' : resKey === 'madeira' ? 'Madeira' : resKey === 'cimento' ? 'Cimento' : resKey === 'cobre' ? 'Cobre' : 'Explosivos'} (Necessário R$ ${totalCost.toLocaleString('pt-BR')})!`, 'error');
      return;
    }

    setSpentOnResources(prev => prev + totalCost);
    setResources(prev => ({
      ...prev,
      [resKey]: (prev[resKey] ?? 0) + amount
    }));
    sound.playConnect();
    showToast(`Adquirido: +${amount}t de ${resKey === 'aco' ? 'Aço' : resKey === 'brita' ? 'Brita' : resKey === 'madeira' ? 'Madeira' : resKey === 'cimento' ? 'Cimento' : resKey === 'cobre' ? 'Cobre' : 'Explosivos'} por R$ ${totalCost.toLocaleString('pt-BR')}.`, 'success');
  };

  // Get active connection limits for a single city node (takes upgraded hub limits into account)
  const getCityDegree = (cityId: string, currentEdges: Edge[] = edges): number => {
    return currentEdges.reduce(
      (acc, edge) => (edge.from === cityId || edge.to === cityId ? acc + 1 : acc),
      0
    );
  };

  // Dynamic cost & grant budget state (calculated reactively to avoid state bugs)
  const startingBudget = 1250000000000; // R$ 1.250.000.000.000,00 starting cash

  // Split intermodal grants into own useMemo — only re-runs when edges change
  const intermodalGrants = useMemo(() => getIntermodalGrants(CITIES, edges), [edges]);

  const budgetState = useMemo(() => {
    let spentRail = 0;
    let spentBalsa = 0;

    edges.forEach(edge => {
      const cityA = CITIES.find(c => c.id === edge.from);
      const cityB = CITIES.find(c => c.id === edge.to);
      if (cityA && cityB) {
        if (edge.type === 'balsa') {
          spentBalsa += Math.round(edge.distance * 12000000);
        } else {
          spentRail += getTrackCostDetail(cityA, cityB, edge.distance).totalCost;
        }
      }
    });

    const spentYards = maintenanceYards.length * 15000000000;
    const spentHubs = upgradedHubs.length * 30000000000;

    const grantIncome = intermodalGrants
      .filter(g => g.unlocked)
      .reduce((sum, g) => sum + g.value, 0);

    const totalSpent = spentRail + spentBalsa + spentYards + spentHubs + spentOnResources + spentOnWorkers;
    const currentBudget = startingBudget - totalSpent + grantIncome + totalRevenue;
    const monthlyRevenue = getMonthlyRevenue(edges);

    return {
      totalSpent,
      spentRail,
      spentBalsa,
      spentYards,
      spentHubs,
      grantIncome,
      currentBudget,
      unlockedGrants: intermodalGrants,
      spentOnWorkers,
      spentOnResources,
      totalRevenue,
      monthlyRevenue,
    };
  }, [edges, maintenanceYards, upgradedHubs, spentOnResources, spentOnWorkers, intermodalGrants, totalRevenue]);

  // Record budget snapshot whenever the budget actually changes (after payroll/expenses settle)
  useEffect(() => {
    setBudgetHistory(prev => [
      ...prev.slice(-23),
      { label: `${gameYear}/${String(monthIdx + 1).padStart(2, '0')}`, budget: budgetState.currentBudget }
    ]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budgetState.currentBudget]);

  // Budget critically low alert
  useEffect(() => {
    if (welcomeOpen) return;
    const pct = budgetState.currentBudget / startingBudget;
    if (pct < 0.08 && budgetState.currentBudget > 0 && !lowBudgetAlertedRef.current) {
      lowBudgetAlertedRef.current = true;
      showToast('🚨 ALERTA CRÍTICO: Caixa abaixo de 8% do orçamento inicial! Reduza gastos urgentemente.', 'error');
      sound.playError();
    } else if (pct >= 0.15) {
      lowBudgetAlertedRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budgetState.currentBudget, welcomeOpen]);

  // Dijkstra nearest yard distance
  const nearestYardDistances = useMemo(() => {
    return calculateRailwayDistancesFromYards(CITIES, edges, maintenanceYards);
  }, [edges, maintenanceYards]);

  // Evaluate missions reactively
  const missionResults = useMemo(() => {
    return MISSIONS.map(m => ({ ...m, ...m.check(CITIES, edges, maintenanceYards) }));
  }, [edges, maintenanceYards]);

  // News when a grant is newly unlocked
  const prevGrantsRef = React.useRef<string[]>([]);
  useEffect(() => {
    if (welcomeOpen) return;
    const ym = `${gameYear}/${String(monthIdx + 1).padStart(2, '0')}`;
    budgetState.unlockedGrants.filter(g => g.unlocked).forEach(g => {
      if (!prevGrantsRef.current.includes(g.id)) {
        setNewsItems(prev => [newsGrant(g.title, g.value, ym), ...prev].slice(0, 40));
      }
    });
    prevGrantsRef.current = budgetState.unlockedGrants.filter(g => g.unlocked).map(g => g.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budgetState.unlockedGrants, welcomeOpen]);

  // Grant rewards for newly completed missions
  useEffect(() => {
    if (welcomeOpen) return;
    const yearMonth = `${gameYear}/${String(monthIdx + 1).padStart(2, '0')}`;
    missionResults.forEach(m => {
      if (m.completed && !completedMissions.includes(m.id)) {
        setCompletedMissions(prev => [...prev, m.id]);
        setTotalRevenue(prev => prev + m.reward);
        showToast(`🎯 Missão concluída: "${m.title.replace(/^[^ ]+ /, '')}" — Prêmio: R$ ${(m.reward/1e9).toFixed(0)}B`, 'success');
        sound.playConnect();
        setNewsItems(prev => [newsMission(m.title, m.reward, yearMonth), ...prev].slice(0, 40));
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missionResults, welcomeOpen]);

  // Counting edges with no active maintenance coverage (> 800 km or Infinity)
  const unmaintainedEdgesCount = useMemo(() => {
    if (edges.length === 0) return 0;
    return edges.filter(edge => {
      const dA = nearestYardDistances[edge.from] ?? Infinity;
      const dB = nearestYardDistances[edge.to] ?? Infinity;
      return Math.min(dA, dB) > 800;
    }).length;
  }, [edges, nearestYardDistances]);

  // Toggle upgraded hub status (Central Hub with up to 3 links)
  const handleToggleUpgradeHub = (cityId: string) => {
    if (upgradedHubs.includes(cityId)) {
      setUpgradedHubs(prev => prev.filter(id => id !== cityId));
      showToast("Upgrade de Terminal Central removido. R$ 30.000.000.000 reembolsados!", "info");
      sound.playDisconnect();
    } else {
      if (budgetState.currentBudget < 30000000000) {
        showToast("Orçamento insuficiente para expandir este Terminal Central (necessário R$ 30.000.000.000)!", "error");
        sound.playError();
        return;
      }
      setUpgradedHubs(prev => [...prev, cityId]);
      showToast("Upgrade de Alta Conectividade! Esta cidade agora suporta até 3 conexões de linhas.", "success");
      sound.playConnect();
    }
  };

  // Toggle Maintenance Yard construction
  const handleToggleMaintenanceYard = (cityId: string) => {
    if (maintenanceYards.includes(cityId)) {
      setMaintenanceYards(prev => prev.filter(id => id !== cityId));
      showToast("Pátio de manutenção demolido. R$ 15.000.000.000 reembolsados!", "info");
      sound.playDisconnect();
    } else {
      if (budgetState.currentBudget < 15000000000) {
        showToast("Orçamento insuficiente para construir pátio de manutenção (necessário R$ 15.000.000.000)!", "error");
        sound.playError();
        return;
      }
      setMaintenanceYards(prev => [...prev, cityId]);
      showToast("Pátio de Manutenção Ativado! Rotas férreas em um raio de até 800 km serão cobertas.", "success");
      sound.playConnect();
    }
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

      const isBuilding = existingEdge.status === 'building';
      if (isBuilding) {
        setConstructionQueue(prev => prev.filter(p => p.edgeId !== existingEdge.id));
      }

      const refundRatio = isBuilding ? 0.5 : 1.0;
      const baseCost = existingEdge.type === 'balsa'
        ? Math.round(existingEdge.distance * 12000000)
        : getTrackCostDetail(cityA, cityB, existingEdge.distance).totalCost;
      const refundedCost = Math.round(baseCost * refundRatio);

      const activeEffects = activeEvents.map(e => e.statusEffect);
      const consumed = existingEdge.resourcesConsumed
        ?? getTrackResourcesRequired(cityA, cityB, existingEdge.distance, existingEdge.type ?? 'rail', []);
      const refundedResources: GameResources = {} as GameResources;
      Object.keys(consumed).forEach(k => {
        const key = k as keyof GameResources;
        refundedResources[key] = Math.floor(consumed[key] * refundRatio);
      });
      setResources(prev => {
        const u = { ...prev };
        Object.keys(refundedResources).forEach(k => {
          const key = k as keyof GameResources;
          u[key] = (u[key] ?? 0) + refundedResources[key];
        });
        return u;
      });

      const refundedText = Object.entries(refundedResources)
        .map(([k, v]) => `${(v as number).toFixed(0)}t de ${k === 'aco' ? 'Aço' : k === 'brita' ? 'Brita' : k === 'madeira' ? 'Madeira' : k === 'cimento' ? 'Cimento' : k === 'cobre' ? 'Cobre' : 'Explosivos'}`)
        .join(", ");

      if (isBuilding) {
        showToast(`🚧 Obra cancelada (reembolso 50%): R$ ${refundedCost.toLocaleString('pt-BR')} e materiais devolvidos: ${refundedText}`, 'info');
      } else {
        showToast(`Rota ${cityA.name} ↔ ${cityB.name} demolida. R$ ${refundedCost.toLocaleString('pt-BR')} liberados. Insumos: ${refundedText}`, 'info');
      }
      return;
    }

    // 4. Validate degrees: Limit to maximum (2 or 3) connections per city center
    const degA = getCityDegree(idA);
    const degB = getCityDegree(idB);

    const maxDegA = upgradedHubs.includes(idA) ? 3 : 2;
    const maxDegB = upgradedHubs.includes(idB) ? 3 : 2;

    if (degA >= maxDegA) {
      sound.playError();
      showToast(`A cidade ${cityA.name} atingiu seu limite máximo de ${maxDegA} conexões! Upgrades podem ser feitos no painel lateral.`, 'error');
      setSelectedCityId(null);
      return;
    }
    if (degB >= maxDegB) {
      sound.playError();
      showToast(`A cidade ${cityB.name} atingiu seu limite máximo de ${maxDegB} conexões! Upgrades podem ser feitos no painel lateral.`, 'error');
      setSelectedCityId(null);
      return;
    }

    // 5. Detect and block loop circuitry (Cycles)
    const pathAlreadyExists = pathExists(idA, idB, edges);
    if (pathAlreadyExists) {
      const compSize = getComponentSize(idA, edges);
      if (compSize < CITIES.length) {
        sound.playError();
        showToast(`Impossível construir rota: esta conexão criaria um loop fechado (ciclo) prematuro no sistema ferroviário!`, 'error');
        setSelectedCityId(null);
        return;
      }
    }

    // Checking construction type & budgets
    const distanceVal = getHaversineDistance(cityA.lat, cityA.lng, cityB.lat, cityB.lng);
    const inflationMultiplier = getYearInflationMultiplier(gameYear);
    let targetCost = 0;

    if (constructionType === 'balsa') {
      if (!cityA.portType || !cityB.portType) {
        sound.playError();
        showToast("Balsas Hidroviárias só podem ser estabelecidas entre cidades com Terminais Portuários (fluviais ou marítimos)!", "error");
        setSelectedCityId(null);
        return;
      }
      targetCost = Math.round(distanceVal * 12000000 * inflationMultiplier);
    } else {
      targetCost = Math.round(getTrackCostDetail(cityA, cityB, distanceVal).totalCost * inflationMultiplier);
    }
    if (inflationMultiplier > 1.0) {
      showToast(`⚠️ Inflação acumulada ${gameYear}: +${Math.round((inflationMultiplier - 1) * 100)}% sobre custo base`, 'info');
    }

    // Verify resource requirements and shortages
    const activeEffects = activeEvents.map(e => e.statusEffect);
    const reqs = getTrackResourcesRequired(cityA, cityB, distanceVal, constructionType, activeEffects);

    // Verify workforce requirements
    const hasExplosives = reqs.explosivos > 0;
    const reqWorkers = getTrackWorkersRequired(cityA, cityB, distanceVal, constructionType, hasExplosives);

    if (workers.terraplanagem < reqWorkers.terraplanagem) {
      sound.playError();
      showToast(`⚠️ Equipe de Terraplanagem insuficiente! Este trecho requer pelo menos ${reqWorkers.terraplanagem} trabalhadores (atual: ${workers.terraplanagem}). Contrate mais no painel de equipes!`, 'error');
      setSelectedCityId(null);
      return;
    }
    if (workers.assentamento < reqWorkers.assentamento) {
      sound.playError();
      showToast(`⚠️ Equipe de Assentamento insuficiente! Este trecho requer pelo menos ${reqWorkers.assentamento} trabalhadores (atual: ${workers.assentamento}). Contrate mais no painel de equipes!`, 'error');
      setSelectedCityId(null);
      return;
    }
    if (reqWorkers.explosivos > 0 && workers.explosivos < reqWorkers.explosivos) {
      sound.playError();
      showToast(`⚠️ Equipe de Explosivos insuficiente! Túneis e serras neste trecho requerem pelo menos ${reqWorkers.explosivos} especialistas em explosivos (atual: ${workers.explosivos}).`, 'error');
      setSelectedCityId(null);
      return;
    }
    let buyCost = 0;
    const isHighInflation = activeEffects.includes('INFLACAO_GLOBAL');
    const shortages: Partial<GameResources> = {};
    let hasShortage = false;

    Object.keys(reqs).forEach((k) => {
      const key = k as keyof GameResources;
      const short = Math.max(0, reqs[key] - (resources[key] ?? 0));
      if (short > 0) {
        shortages[key] = short;
        hasShortage = true;
        const unitPrice = RESOURCE_BUY_PRICES[key] * (isHighInflation ? 2.0 : 1.0);
        buyCost += short * unitPrice;
      }
    });

    if (hasShortage && !autoBuyResources) {
      sound.playError();
      const shortageDetails = Object.entries(shortages)
        .map(([k, v]) => `${v?.toFixed(0)}t de ${k === 'aco' ? 'Aço' : k === 'brita' ? 'Brita' : k === 'madeira' ? 'Madeira' : k === 'cimento' ? 'Cimento' : k === 'cobre' ? 'Cobre' : 'Explosivos'}`)
        .join(", ");
      showToast(`Insumos insuficientes em estoque! Falta: ${shortageDetails}. Ative "Auto-Comprar" no estoque ou compre os insumos manualmente no mercado.`, 'error');
      setSelectedCityId(null);
      return;
    }

    const totalNeededBudget = targetCost + buyCost;

    if (budgetState.currentBudget < totalNeededBudget) {
      sound.playError();
      const shortageText = buyCost > 0 ? ` (Sendo R$ ${targetCost.toLocaleString('pt-BR')} da obra + R$ ${buyCost.toLocaleString('pt-BR')} para compra de insumos de mercado)` : '';
      showToast(`Orçamento insuficiente para criar esta rota! Total necessário: R$ ${totalNeededBudget.toLocaleString('pt-BR')}${shortageText}, disponível: R$ ${budgetState.currentBudget.toLocaleString('pt-BR')}`, 'error');
      setSelectedCityId(null);
      return;
    }

    // 6. Safe to build: Deduct used materials and apply buying costs if autoBuy occurred
    if (buyCost > 0) {
      setSpentOnResources(prev => prev + buyCost);
    }

    setResources(prev => {
      const u = { ...prev };
      Object.keys(reqs).forEach(k => {
        const key = k as keyof GameResources;
        u[key] = Math.max(0, (u[key] ?? 0) - reqs[key]);
      });
      return u;
    });

    // Start construction — edge enters queue as 'building'
    const months = getConstructionMonths(cityA, cityB, distanceVal, constructionType, workers);
    const project: ConstructionProject = {
      edgeId: `${idA}-${idB}`,
      from: idA,
      to: idB,
      distance: distanceVal,
      type: constructionType,
      resourcesConsumed: reqs,
      totalMonths: months,
      monthsRemaining: months,
      startedYear: gameYear,
      startedMonth: monthIdx,
    };
    setConstructionQueue(prev => [...prev, project]);

    const buildingEdge: Edge = {
      id: `${idA}-${idB}`,
      from: idA,
      to: idB,
      distance: distanceVal,
      type: constructionType,
      resourcesConsumed: reqs,
      status: 'building',
    };
    const nextEdges = [...edges, buildingEdge];
    setEdges(nextEdges);

    setSelectedCityId(null);
    sound.playConnect();

    const formattedCost = targetCost.toLocaleString('pt-BR');
    const consumedText = Object.entries(reqs)
      .map(([k, v]) => `${v.toFixed(0)}t de ${k === 'aco' ? 'Aço' : k === 'brita' ? 'Brita' : k === 'madeira' ? 'Madeira' : k === 'cimento' ? 'Cimento' : k === 'cobre' ? 'Cobre' : 'Explosivos'}`)
      .join(", ");

    const autoBuyText = buyCost > 0
      ? ` | Auto-compra: R$ ${(buyCost / 1000000000).toFixed(2)}B`
      : '';

    if (constructionType === 'balsa') {
      showToast(`🚧 Obra iniciada: ${cityA.name} ⇄ ${cityB.name} (${distanceVal.toFixed(0)} km) — ${months} mes(es) — R$ ${formattedCost}${autoBuyText}. Materiais: ${consumedText}`, 'info');
    } else {
      const detail = getTrackCostDetail(cityA, cityB, distanceVal);
      showToast(`🚧 Obra iniciada: ${cityA.name} ⇄ ${cityB.name} (${distanceVal.toFixed(0)} km) — Terreno: ${detail.terrainName} — ${months} mes(es) — R$ ${formattedCost}${autoBuyText}. Materiais: ${consumedText}`, 'info');
    }

    // 7. Check for perfect linear win conditions (only completed edges count)
    const completedEdges = nextEdges.filter(e => e.status !== 'building');
    const hasFinishedPath = completedEdges.length === CITIES.length - 1;
    if (hasFinishedPath) {
      const componentSize = getComponentSize(CITIES[0].id, completedEdges);
      if (componentSize === CITIES.length) {
        const nextNearestDistances = calculateRailwayDistancesFromYards(CITIES, completedEdges, maintenanceYards);
        const unmaintainedCount = completedEdges.filter(edge => {
          const dA = nextNearestDistances[edge.from] ?? Infinity;
          const dB = nextNearestDistances[edge.to] ?? Infinity;
          return Math.min(dA, dB) > 800;
        }).length;

        if (unmaintainedCount === 0) {
          setTimeout(() => {
            sound.playTrainWhistle();
            setHistoryFactIndex(Math.floor(Math.random() * HISTORIC_FACTS.length));
            setVictoryOpen(true);
          }, 600);
        } else {
          showToast(`🚂 Malha Nacional unificada! Porém, ${unmaintainedCount} trechos estão desprovidos de manutenção. Instale Pátios de Manutenção adicionais para obter a autorização final e vencer!`, 'info');
        }
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
        
        // Tycoon extensions
        upgradedHubs={upgradedHubs}
        onToggleUpgradeHub={handleToggleUpgradeHub}
        maintenanceYards={maintenanceYards}
        onToggleMaintenanceYard={handleToggleMaintenanceYard}
        constructionType={constructionType}
        onConstructionTypeChange={setConstructionType}
        budgetState={budgetState}
        unmaintainedEdgesCount={unmaintainedEdgesCount}
        nearestYardDistances={nearestYardDistances}
        gameYear={gameYear}
        monthIdx={monthIdx}
        playSpeed={playSpeed}
        onPlaySpeedChange={setPlaySpeed}

        // Resources and crises expansion
        resources={resources}
        onBuyResource={handleBuyResource}
        autoBuyResources={autoBuyResources}
        onToggleAutoBuyResources={() => setAutoBuyResources(!autoBuyResources)}
        activeEvents={activeEvents}

        // Workforce (Trabalhadores) props
        workers={workers}
        onHireWorker={handleHireWorker}
        onFireWorker={handleFireWorker}
        budgetHistory={budgetHistory}
        constructionQueue={constructionQueue}

        // New feature props
        onAdvanceMonth={handleAdvanceMonth}
        onExportStats={handleExportStats}
        saveSlot={saveSlot}
        onSaveSlotChange={setSaveSlot}
        slotDates={slotDates}
        missionResults={missionResults}
        newsItems={newsItems}
      />

      {/* 3. Primary Leaflet Map Container */}
      <main className="flex-1 h-[60vh] md:h-full relative overflow-hidden">
        
        {/* Floating Map Format / Style Selector widget */}
        <div className="absolute top-4 right-4 z-50 flex bg-slate-900/95 backdrop-blur-md p-1 px-1.5 rounded-xl border border-slate-800 shadow-2xl items-center gap-1.5 transition-all">
          <div className="px-1 text-[10px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Mapa:</span>
          </div>
          <div className="flex gap-1">
            {(['voyager', 'positron', 'dark', 'satellite'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setTileLayerType(type)}
                className={`px-2 py-1.5 rounded-lg text-[9.5px] font-bold uppercase transition-all tracking-wider ${
                  tileLayerType === type
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {type === 'voyager' ? 'Voyager' : type === 'positron' ? 'Claro' : type === 'dark' ? 'Escuro' : 'Satélite'}
              </button>
            ))}
          </div>
        </div>

        {/* City stats popup when selected */}
        {selectedCityId && (() => {
          const selectedCity = CITIES.find(c => c.id === selectedCityId);
          if (!selectedCity) return null;
          const isUpgraded = upgradedHubs.includes(selectedCity.id);
          const hasYard = maintenanceYards.includes(selectedCity.id);
          const cityEdges = edges.filter(e => (e.from === selectedCity.id || e.to === selectedCity.id) && e.status !== 'building');
          const cityMonthlyRevenue = cityEdges.reduce((s, e) => s + Math.round(e.distance * (e.type === 'balsa' ? 40000 : 80000)), 0);
          const mDist = nearestYardDistances[selectedCity.id];
          const maintOk = mDist !== undefined && mDist !== Infinity && mDist <= 800;
          const fmt = (v: number) => v >= 1e12 ? `${(v/1e12).toFixed(1)}T` : v >= 1e9 ? `${(v/1e9).toFixed(1)}B` : `${(v/1e6).toFixed(0)}M`;

          return (
            <div className="absolute top-4 left-4 right-4 md:right-auto md:w-[480px] bg-slate-900/97 backdrop-blur-md border border-slate-700 px-4 py-3.5 rounded-xl shadow-2xl z-50 flex flex-col gap-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Train className="w-4 h-4 text-amber-500 shrink-0" />
                  <div>
                    <p className="text-xs font-extrabold text-amber-400">{selectedCity.name} — {selectedCity.state}</p>
                    <p className="text-[10px] text-slate-400">
                      {selectedCity.portType === 'maritime' ? '⚓ Porto Marítimo' : selectedCity.portType === 'fluvial' ? '🚢 Porto Fluvial' : selectedCity.type === 'capital' ? '★ Capital Estadual' : '● Cidade Central'}
                    </p>
                  </div>
                </div>
                <span className="text-[9px] text-slate-500 font-mono">Clique no mapa para cancelar</span>
              </div>

              {/* Stats grid — only if connected */}
              {cityEdges.length > 0 && (
                <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 text-center">
                  <div>
                    <p className="text-[8.5px] text-slate-500 uppercase tracking-wide">Conexões</p>
                    <p className="text-[14px] font-black text-amber-400">{cityEdges.length}</p>
                  </div>
                  <div>
                    <p className="text-[8.5px] text-slate-500 uppercase tracking-wide">Receita/Mês</p>
                    <p className="text-[13px] font-black text-sky-400">R$ {fmt(cityMonthlyRevenue)}</p>
                  </div>
                  <div>
                    <p className="text-[8.5px] text-slate-500 uppercase tracking-wide">Manutenção</p>
                    <p className={`text-[11px] font-black ${maintOk ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {maintOk ? `✓ ${mDist?.toFixed(0)} km` : '⚠️ Sem cobertura'}
                    </p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 border-t border-slate-800/60 pt-2">
                <button
                  onClick={() => handleToggleUpgradeHub(selectedCity.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10.5px] font-bold transition-all shadow-sm ${
                    isUpgraded ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                    : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700/80'
                  }`}
                >
                  <Star className={`w-3 h-3 ${isUpgraded ? 'fill-amber-400 text-amber-400' : ''}`} />
                  {isUpgraded ? '★ Central Hub Ativo' : '★ Terminal Central (R$ 30B)'}
                </button>
                <button
                  onClick={() => handleToggleMaintenanceYard(selectedCity.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10.5px] font-bold transition-all shadow-sm ${
                    hasYard ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                    : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700/80'
                  }`}
                >
                  <Wrench className="w-3 h-3 text-emerald-400" />
                  {hasYard ? '🔧 Pátio Ativo' : '🔧 Pátio Manutenção (R$ 15B)'}
                </button>
              </div>
            </div>
          );
        })()}

        {/* Floating Quick Stats Overlays for Map */}
        <div className="absolute bottom-4 left-4 flex gap-2 z-40 bg-slate-900/85 p-2.5 rounded-xl border border-slate-800 backdrop-blur-md pointer-events-none hidden md:flex items-center">
          <Train className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-slate-300 text-[11px] font-medium">
            Remoção rápida: Clique em qualquer rota para removê-la da malha ferroviária.
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
          upgradedHubs={upgradedHubs}
          maintenanceYards={maintenanceYards}
          nearestYardDistances={nearestYardDistances}
          constructionQueue={constructionQueue}
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
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col relative animate-in fade-in zoom-in-95 duration-200">
            {/* Top decorative banner */}
            <div className="h-2 bg-gradient-to-r from-amber-500 via-orange-500 to-red-650"></div>
            
            <div className="p-6 md:p-10">
              {/* Header */}
              <div className="flex items-center gap-3.5 mb-6">
                <div className="p-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl text-slate-950 flex shadow-lg">
                  <Train className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="font-display font-extrabold text-xl text-slate-100 uppercase tracking-tight">
                    RENIF
                  </h2>
                  <p className="text-xs text-amber-500 font-bold tracking-wider uppercase">
                    Rede Nacional de Integração Ferroviária
                  </p>
                </div>
              </div>

              {/* Text Body - Scrollable to fit any screen beautifully */}
              <div className="max-h-[50vh] md:max-h-[55vh] overflow-y-auto pr-4 space-y-4 text-slate-300 text-sm leading-relaxed custom-scrollbar [scrollbar-width:thin]">
                <p>
                  Após décadas sofrendo com gargalos logísticos que encareciam produtos, limitavam a indústria e isolavam regiões inteiras, o Brasil finalmente decide agir. Em um pacto nacional sem precedentes, governo, empresas e sociedade deixam de lado suas diferenças para perseguir um único objetivo: realizar a maior obra de infraestrutura da história do país.
                </p>
                <p>
                  A meta é ambiciosa. Construir uma ferrovia capaz de conectar todas as 27 capitais brasileiras, os principais polos do agronegócio e da indústria, além dos maiores portos marítimos e fluviais do território nacional.
                </p>
                <p>
                  Ao todo, 97 cidades estratégicas serão interligadas por trilhos, criando uma rede capaz de integrar definitivamente o país e eliminar barreiras que por décadas frearam seu desenvolvimento.
                </p>
                <p className="font-semibold text-amber-400">
                  Você foi escolhido para liderar essa missão histórica.
                </p>
                <p>
                  Sua nomeação como Administrador da RENIF (Rede Nacional de Integração Ferroviária), a recém-criada estatal responsável pelo projeto, coloca sobre seus ombros a responsabilidade de transformar esse sonho em realidade.
                </p>
                <p className="font-semibold text-slate-200">
                  Os desafios serão enormes.
                </p>
                <p>
                  Você precisará planejar rotas eficientes através de serras, florestas, rios e planícies. Será necessário administrar recursos fundamentais como aço, brita, madeira, cimento, cobre e explosivos, garantindo que nunca faltem nos canteiros de obras.
                </p>
                <p className="font-medium text-orange-400">
                  O prazo para concluir a rede é de apenas 50 anos.
                </p>
                <p>
                  O orçamento inicial é de R$ 1,25 trilhão — uma quantia gigantesca, mas que pode desaparecer rapidamente caso decisões erradas sejam tomadas.
                </p>
                <p>
                  Além dos obstáculos técnicos, você enfrentará greves, atrasos em licenças ambientais, pressões políticas, crises econômicas e as dificuldades naturais impostas pela Amazônia, pelo Pantanal e pelas regiões montanhosas do país.
                </p>
                <p className="font-semibold text-slate-200">
                  Cada escolha terá consequências.
                </p>
                <p>
                  A boa notícia é que cada cidade conectada fortalecerá a economia nacional. Novos recursos financeiros serão gerados pelo transporte de cargas e passageiros, ajudando a financiar os próximos trechos da ferrovia.
                </p>
                <p className="text-rose-450 font-medium">
                  Mas o tempo não para.
                </p>
                <p>
                  A cada ano perdido, os custos aumentam, a pressão cresce e o sonho da integração nacional fica mais distante.
                </p>
                <p className="font-extrabold text-white text-[15px]">
                  O futuro do Brasil será construído sobre trilhos.
                </p>
                <p className="text-amber-300 font-semibold">
                  E agora, essa responsabilidade está em suas mãos.
                </p>
                <p className="text-xs text-slate-400 italic font-medium uppercase tracking-wider bg-slate-950/40 p-3.5 rounded-xl border border-slate-800">
                  Clique em &quot;Iniciar Jornada&quot; e escreva a história da maior ferrovia já construída no Brasil.
                </p>
              </div>

              {/* Action */}
              <div className="mt-8 flex flex-col gap-3">
                {/* Save slot selector */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Slot de Jogo:</span>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map(slot => {
                      const date = slotDates[slot - 1];
                      return (
                        <button
                          key={slot}
                          onClick={() => { setSaveSlot(slot); if (date) handleLoadGame(slot); }}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                            saveSlot === slot
                              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                              : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                          }`}
                        >
                          <div className="text-[10px] font-black uppercase">Slot {slot}</div>
                          <div className="text-[9px] mt-0.5 truncate">{date ? `💾 ${date}` : 'Vazio'}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={() => {
                    const date = slotDates[saveSlot - 1];
                    if (date && !window.confirm(`Iniciar nova partida no Slot ${saveSlot} apagará o progresso salvo. Continuar?`)) return;
                    deleteSave(saveSlot);
                    setHasSaveGame(false);
                    setSlotDates(getAllSlotDates());
                    setWelcomeOpen(false);
                    sound.playSelect();
                  }}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-display font-extrabold uppercase py-3.5 px-6 rounded-xl transition-all shadow-lg text-xs tracking-widest cursor-pointer active:scale-95"
                >
                  {slotDates[saveSlot - 1] ? `Nova Partida no Slot ${saveSlot} 🆕` : 'Iniciar Jornada 🚂'}
                </button>
              </div>
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
                Parabéns! Você ligou com maestria as <strong>{CITIES.length} principais capitais, cidades e portos brasileiros</strong> em uma única linha contínua, estruturando uma rota perfeita de ponta a ponta do país!
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
                    {CITIES.length - 1} <span className="text-xs font-normal text-slate-400">/ {CITIES.length - 1}</span>
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

      {/* --- CRISIS EVENT MODAL --- */}
      {currentEvent && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[10000] flex items-center justify-center p-4 select-none">
          <div className="bg-slate-900 border-2 border-red-500/40 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col relative animate-in fade-in zoom-in-95 duration-200">
            {/* Red top strip */}
            <div className="h-2 bg-gradient-to-r from-red-650 via-rose-500 to-red-500"></div>
            
            <div className="p-6 md:p-8">
              {/* Heading */}
              <div className="flex items-center gap-3.5 mb-4">
                <div className="p-2.5 bg-red-950/30 text-rose-450 rounded-xl border border-red-500/10">
                  <AlertTriangle className="w-5.5 h-5.5 text-red-500 shrink-0" />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-sm text-red-100 uppercase tracking-tight">
                    {currentEvent.title}
                  </h3>
                  <p className="text-[9px] text-amber-500 font-bold tracking-wider uppercase">
                    Incidente Crítico • Ano {gameYear}
                  </p>
                </div>
              </div>

              {/* Msg */}
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-4 rounded-xl border border-slate-850/60 mb-5 italic">
                "{currentEvent.description}"
              </p>

              {/* Modifiers */}
              <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-850 flex items-start gap-2.5 mb-6 text-xs text-slate-300 leading-relaxed">
                <span className="text-sm mt-0.5" role="img" aria-label="warning">🛑</span>
                <div>
                  <p className="font-extrabold text-[10px] text-red-400 uppercase tracking-widest mb-1">Impactos sobre frentes ferroviárias:</p>
                  <p className="text-[11px] text-slate-400">
                    {currentEvent.statusEffect === 'GREVE_GERAL' && 'Todos os trilhos custam +25% mais caro por greve de operários.'}
                    {currentEvent.statusEffect === 'ATRASO_AMBIENTAL_AMAZONIA' && 'Tranchas metálicas na Região Norte consumirão +50% extra de aço/cimento.'}
                    {currentEvent.statusEffect === 'INFLACAO_GLOBAL' && 'Insumos do mercado duplicam custo de compra voluntária de Aço e Cobre.'}
                    {currentEvent.statusEffect === 'ESCASSES_MADEIRA' && 'A sapataria de madeira de todos os trilhos exige 1.8x mais cota unitária.'}
                    {currentEvent.statusEffect === 'LOBBY_REGIONAL' && 'Investimentos travados até resolução jurídica ou pagamento.'}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                {currentEvent.costToResolve && (
                  <button
                    onClick={() => {
                      if (budgetState.currentBudget < currentEvent.costToResolve!) {
                        showToast("Orçamento insuficiente para pagar mitigação imediata!", "error");
                        sound.playError();
                        return;
                      }
                      // Pay resolving fee
                      setSpentOnResources(prev => prev + currentEvent.costToResolve!);
                      showToast(`Crise resolvida: ${currentEvent.title} resolvida imediatamente por R$ ${currentEvent.costToResolve!.toLocaleString('pt-BR')}`, 'success');
                      setCurrentEvent(null);
                      sound.playSelect();
                    }}
                    className="w-full bg-slate-800 hover:bg-slate-750 text-slate-100 font-display font-bold py-2.5 px-4 rounded-xl transition text-xs uppercase tracking-wide flex justify-between items-center border border-slate-750 cursor-pointer"
                  >
                    <span>💸 Pagar Mitigação</span>
                    <span className="text-emerald-400 font-black">R$ {(currentEvent.costToResolve / 1000000000).toFixed(0)} Bilhões</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    // Accept and absorb the crisis
                    setActiveEvents(prev => [...prev, currentEvent]);
                    showToast(`Medida emergencial aceita: ${currentEvent.title} ativo por ${currentEvent.durationMonths} meses!`, 'info');
                    const ym = `${gameYear}/${String(monthIdx + 1).padStart(2, '0')}`;
                    setNewsItems(prev => [newsCrisis(currentEvent, ym), ...prev].slice(0, 40));
                    setCurrentEvent(null);
                    sound.playSelect();
                  }}
                  className="w-full bg-gradient-to-r from-red-650 to-rose-600 hover:from-red-650 hover:to-rose-650 text-white font-display font-extrabold uppercase py-2.5 px-4 rounded-xl transition shadow-md text-xs tracking-wider cursor-pointer"
                >
                   Aceitar e Absorver ({currentEvent.durationMonths} Meses)
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* --- GAME OVER MODAL --- */}
      {gameOverOpen && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[99999] flex items-center justify-center p-4 select-none animate-in fade-in duration-300">
          <div className="bg-slate-900 border-2 border-rose-500/50 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col relative zoom-in-95">
            {/* Top red header */}
            <div className="h-2 bg-gradient-to-r from-red-500 via-rose-600 to-amber-600 animate-pulse"></div>

            <div className="p-6 md:p-10 relative flex flex-col text-center">
              {/* Alert Icon */}
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-red-500 to-rose-700 text-slate-100 rounded-2xl flex items-center justify-center mb-6 shadow-xl relative scale-105">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>

              <h2 className="font-display font-extrabold text-2xl md:text-3xl tracking-tight bg-gradient-to-r from-red-400 to-rose-300 bg-clip-text text-transparent uppercase">
                Concessão Expirada!
              </h2>
              <p className="text-xs text-rose-400 font-bold uppercase tracking-widest mt-1">
                Fim do Prazo de 50 Anos (2027 - 2077) ⏱️
              </p>

              <hr className="w-16 border-rose-500/40 mx-auto my-5" />

              <p className="text-sm text-slate-300 leading-relaxed mb-6">
                O ano limite de <strong>2077</strong> foi alcançado! A concessionária não conseguiu estruturar e cobrir com manutenção toda a rede nacional com as <strong>{CITIES.length} cidades</strong> brasileiras. Suas linhas férreas foram repassadas ao Estado.
              </p>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 bg-slate-950/80 p-5 rounded-2xl border border-slate-800 mb-6">
                <div className="text-center">
                  <span className="text-[10px] text-slate-500 tracking-wider uppercase font-semibold">Trilhos Ativos</span>
                  <p className="text-xl font-black text-rose-400 mt-1">
                    {edges.length} <span className="text-xs font-normal text-slate-400">/ {CITIES.length - 1}</span>
                  </p>
                </div>
                
                <div className="text-center border-l border-slate-800">
                  <span className="text-[10px] text-slate-500 tracking-wider uppercase font-semibold">Extensão Coberta</span>
                  <p className="text-xl font-black text-slate-300 mt-1">
                    {totalDistance.toLocaleString('pt-BR')} <span className="text-xs font-normal text-slate-400">km</span>
                  </p>
                </div>
              </div>

              {/* Action row */}
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => {
                    handleResetGame(true);
                  }}
                  className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-display font-medium py-3.5 px-6 rounded-xl transition shadow-lg text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <RefreshCw className="w-4 h-4 text-white" /> Tentar Novamente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
