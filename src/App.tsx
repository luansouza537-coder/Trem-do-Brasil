import React, { useState, useEffect, useMemo } from 'react';
import { CITIES, CITY_MAP } from './data/cities';
import { City, Edge, GameStats, GameResources, GameEvent, GameWorkers, ConstructionProject, NewsItem, InfraProject } from './types';
import { MISSIONS } from './utils/missions';
import { newsRouteComplete, newsCrisis, newsGrant, newsMission, newsRandom } from './utils/news';
import Sidebar from './components/Sidebar';
import GameMap from './components/GameMap';
import PauseScreen from './components/PauseScreen';
import SplashScreen from './components/SplashScreen';
import CutsceneModal from './components/CutsceneModal';
import TutorialModal from './components/TutorialModal';
import { TUTORIAL_STEPS } from './data/tutorialSteps';
import { sound } from './services/sound';
import { 
  getHaversineDistance, 
  pathExists, 
  getComponentSize, 
  formatDistance 
} from './utils/geo';
import {
  getTrackCostDetail,
  RESOURCE_NAMES,
  calculateRailwayDistancesFromYards,
  getTrackResourcesRequired,
  RESOURCE_BUY_PRICES,
  getTrackWorkersRequired,
  getConstructionMonths,
  getSimultaneousPenalty,
  getActiveSeasonalEffects,
  getDemandGrowthMultiplier,
  WORKER_SALARIES,
  WORKER_HIRE_COST,
  WORKER_SEVERANCE,
  WORKER_NAMES,
  getYearInflationMultiplier,
  getMonthlyRevenue,
  getEdgeMonthlyRevenue,
  getCityTypeRevenueMultiplier,
  YARD_CONFIGS,
  HUB_CONFIG,
  WAREHOUSE_CONFIG,
  SILO_CONFIG,
  YARD_COVERAGE_KM
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
import { saveGame, loadGame, deleteSave, hasSave, getSaveDate, getAllSlotDates, SaveGame } from './utils/persistence';
import { useBudget, STARTING_BUDGET } from './hooks/useBudget';
import { SCHEDULED_EVENTS } from './data/scheduledEvents';

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
  const edgesRef = React.useRef<Edge[]>([]);
  const constructionQueueRef = React.useRef<ConstructionProject[]>([]);
  const infraQueueRef = React.useRef<InfraProject[]>([]);
  const activeEventsRef = React.useRef<GameEvent[]>([]);

  // Game States
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [hoveredCityId, setHoveredCityId] = useState<string | null>(null);
  const [tileLayerType, setTileLayerType] = useState<'voyager' | 'positron' | 'dark' | 'satellite' | 'terrain'>('dark');
  const [isMuted, setIsMuted] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showRouteColors, setShowRouteColors] = useState(false);
  const [flyToSignal, setFlyToSignal] = useState<{ lat: number; lng: number; timestamp: number } | null>(null);

  // Tycoon expansions
  const [upgradedHubs, setUpgradedHubs] = useState<string[]>([]);
  const [maintenanceYards, setMaintenanceYards] = useState<string[]>([]);
  const [warehouses, setWarehouses] = useState<string[]>([]);
  const [silos, setSilos] = useState<string[]>([]);
  const [activeCutscene, setActiveCutscene] = useState<'first_rail' | 'half_network' | null>(null);
  const [shownCutscenes, setShownCutscenes] = useState<string[]>([]);
  const shownCutscenesRef = React.useRef<string[]>([]);
  const [infraQueue, setInfraQueue] = useState<InfraProject[]>([]);
  const [yardLevels, setYardLevels] = useState<Record<string, number>>({});
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

  // Workforce state (workers pool)
  const [workers, setWorkers] = useState<GameWorkers>({
    terraplanagem: 500,
    assentamento:  300,
    sinalizacao:   80,
    explosivos:    30,
    manutencao:    150,
  });
  const [constructionQueue, setConstructionQueue] = useState<ConstructionProject[]>([]);
  const [saveSlot, setSaveSlot] = useState(1);
  const [slotDates, setSlotDates] = useState<(string | null)[]>(() => getAllSlotDates());
  const [completedMissions, setCompletedMissions] = useState<string[]>([]);
  const [expiredMissions, setExpiredMissions] = useState<string[]>([]);
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
  const triggeredEventIdsRef = React.useRef<string[]>([]);
  const currentEventRef = React.useRef<GameEvent | null>(null);
  const [triggeredEventIds, setTriggeredEventIds] = useState<string[]>([]);

  // Tutorial state
  const [tutorialStep, setTutorialStep] = useState(0);
  const [tutorialDone, setTutorialDone] = useState(() => localStorage.getItem('trem_tutorial_done') === '1');
  const prevEdgesLengthRef = React.useRef(0);

  const tutorialWaitForAction = !tutorialDone ? (TUTORIAL_STEPS[tutorialStep]?.waitForAction ?? null) : null;

  const handleFinishTutorial = React.useCallback(() => {
    setTutorialDone(true);
    localStorage.setItem('trem_tutorial_done', '1');
  }, []);

  const advanceTutorialOnAction = React.useCallback((action: 'click_city' | 'draw_route') => {
    setTutorialDone(prev => {
      if (prev) return prev;
      return prev;
    });
    setTutorialStep(prev => {
      const step = TUTORIAL_STEPS[prev];
      if (step?.waitForAction === action && prev + 1 < TUTORIAL_STEPS.length) {
        return prev + 1;
      }
      return prev;
    });
  }, []);

  // Detect first completed edge to advance draw_route tutorial step
  useEffect(() => {
    if (tutorialDone) return;
    const completedCount = edges.filter(e => e.status === 'complete').length;
    if (completedCount > 0 && prevEdgesLengthRef.current === 0) {
      advanceTutorialOnAction('draw_route');
    }
    prevEdgesLengthRef.current = completedCount;
  }, [edges, tutorialDone, advanceTutorialOnAction]);

  // Keep refs in sync so the monthly useEffect always reads current values without adding them as deps
  useEffect(() => { edgesRef.current = edges; }, [edges]);
  useEffect(() => { constructionQueueRef.current = constructionQueue; }, [constructionQueue]);
  useEffect(() => { infraQueueRef.current = infraQueue; }, [infraQueue]);
  useEffect(() => { activeEventsRef.current = activeEvents; }, [activeEvents]);
  useEffect(() => { triggeredEventIdsRef.current = triggeredEventIds; }, [triggeredEventIds]);
  useEffect(() => { currentEventRef.current = currentEvent; }, [currentEvent]);

  // Load sound setting preference
  useEffect(() => {
    sound.setMute(isMuted);
  }, [isMuted]);

  // Keyboard shortcut: P = pause/resume
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'p' || e.key === 'P') {
        if (welcomeOpen || victoryOpen || gameOverOpen) return;
        if (document.activeElement?.tagName === 'INPUT') return;
        setPlaySpeed(prev => prev === 'paused' ? 'normal' : 'paused');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [welcomeOpen, victoryOpen, gameOverOpen]);

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
        triggeredEventIds,
        currentPartyStatusEffect: activeEvents.find(e => e.statusEffect.startsWith('PARTIDO_'))?.statusEffect ?? null,
        infraQueue, yardLevels, warehouses, silos,
        shownCutscenes, autoBuyResources, expiredMissions,
      }, saveSlot);
      setHasSaveGame(true);
      setSaveDate(getSaveDate(saveSlot));
      setSlotDates(getAllSlotDates());
    }, 2000);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [edges, upgradedHubs, maintenanceYards, constructionType, resources,
      spentOnResources, workers, spentOnWorkers, activeEvents, gameYear, monthIdx, welcomeOpen, triggeredEventIds,
      infraQueue, yardLevels, warehouses, silos, shownCutscenes, autoBuyResources, expiredMissions]);

  // Keep ref in sync so cutscene useEffect always reads current value
  useEffect(() => { shownCutscenesRef.current = shownCutscenes; }, [shownCutscenes]);

  // Cutscene triggers — runs whenever edges change, reads ref to avoid stale closure
  useEffect(() => {
    const completedCount = edges.filter(e => e.status === 'complete').length;
    if (completedCount === 0) return;
    const shown = shownCutscenesRef.current;
    // First rail: fires as soon as ≥1 edge is complete (handles simultaneous completions)
    if (completedCount >= 1 && !shown.includes('first_rail')) {
      shownCutscenesRef.current = [...shown, 'first_rail'];
      setShownCutscenes(shownCutscenesRef.current);
      setTimeout(() => setActiveCutscene('first_rail'), 800);
      return; // don't check half_network in same tick — let it fire on next change
    }
    const connectedCities = new Set(
      edges.filter(e => e.status === 'complete').flatMap(e => [e.from, e.to])
    );
    const halfTarget = Math.floor(CITIES.length / 2);
    if (connectedCities.size >= halfTarget && !shown.includes('half_network') && !shownCutscenesRef.current.includes('half_network')) {
      shownCutscenesRef.current = [...shownCutscenesRef.current, 'half_network'];
      setShownCutscenes(shownCutscenesRef.current);
      setTimeout(() => setActiveCutscene('half_network'), 800);
    }
  }, [edges]);

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
      const curEvents = activeEventsRef.current;
      const payrollMultiplier = curEvents.reduce((acc, e) => acc * (e.payrollMultiplier ?? 1.0), 1.0);
      const adjustedPayroll = Math.round(monthlyPayroll * payrollMultiplier);
      if (adjustedPayroll > 0) {
        setSpentOnWorkers((prev) => prev + adjustedPayroll);
      }

      // Collect revenue from all completed routes
      const activeEffects = curEvents.map(e => e.statusEffect);
      const cyberAttack = activeEffects.includes('CYBER_ATAQUE');
      let compoundRevMult = curEvents.reduce((acc, e) => acc * (e.revenueMultiplier ?? 1.0), 1.0);
      compoundRevMult = Math.max(0, Math.min(2.0, compoundRevMult));
      const balsaFrozenByEvent = curEvents.some(e => e.balsaFrozen);
      const warehouseBonus = warehouses.length * WAREHOUSE_CONFIG.monthlyBonus;
      const monthlyBonusTotal = curEvents.reduce((acc, e) => acc + (e.monthlyBonus ?? 0), 0) + warehouseBonus;

      // Seasonal effects
      const seasonalEffects = getActiveSeasonalEffects(monthIdx);
      const seasonalRevFactor = seasonalEffects.reduce((acc, s) => acc * (s.revenueFactor ?? 1.0), 1.0);
      // Add seasonal news on first month of each effect
      seasonalEffects.forEach(s => {
        if (s.months[0] === monthIdx) {
          setNewsItems(prev => [{
            id: `seasonal-${s.id}-${gameYear}`,
            headline: s.headline,
            category: s.revenueFactor && s.revenueFactor < 1 ? 'crisis' : s.revenueFactor && s.revenueFactor > 1 ? 'grant' : 'infra',
            yearMonth: `${MONTHS_PT[monthIdx]}/${gameYear}`,
          }, ...prev].slice(0, 60));
        }
      });

      const baseRev = cyberAttack ? 0 : getMonthlyRevenue(edgesRef.current, workers, activeEffects, CITIES, balsaFrozenByEvent, gameYear, upgradedHubs, silos);
      const monthlyRev = cyberAttack ? 0 : (Math.round(baseRev * compoundRevMult * seasonalRevFactor) + monthlyBonusTotal);
      if (cyberAttack) {
        showToast('💻 Ataque Cibernético: sistemas offline — receita mensal bloqueada!', 'error');
      }
      if (monthlyRev > 0) {
        setTotalRevenue(prev => prev + monthlyRev);
      }

      // Monthly summary toast
      const net = monthlyRev - adjustedPayroll;
      const fmt = (v: number) => v >= 1e12 ? `${(v/1e12).toFixed(2)}T` : v >= 1e9 ? `${(v/1e9).toFixed(1)}B` : `${(v/1e6).toFixed(0)}M`;
      showToast(
        `📊 ${MONTHS_PT[monthIdx]}/${gameYear} — Receita: +R$ ${fmt(monthlyRev)} | Folha: -R$ ${fmt(adjustedPayroll)} | Saldo: ${net >= 0 ? '+' : ''}R$ ${fmt(net)}`,
        net >= 0 ? 'success' : 'info'
      );

      // Random monthly news
      const rnd = newsRandom(gameYear, monthIdx);
      if (rnd) setNewsItems(prev => [rnd, ...prev].slice(0, 60));

      // Budget snapshot recorded by a separate useEffect on budgetState.currentBudget

      // Advance construction queue — pre-calculate from ref (avoids stale closure / dep array issue)
      const completedProjects = constructionQueueRef.current.filter(p => p.monthsRemaining <= 1);
      setConstructionQueue(prev => prev
        .filter(p => p.monthsRemaining > 1)
        .map(p => ({ ...p, monthsRemaining: p.monthsRemaining - 1 }))
      );
      if (completedProjects.length > 0) {
        const ym = `${gameYear}/${String(monthIdx + 1).padStart(2, '0')}`;
        setEdges(prevEdges => prevEdges.map(e => {
          const done = completedProjects.find(p => p.edgeId === e.id);
          return done ? { ...e, status: 'complete' as const } : e;
        }));
        const totalReturned: GameWorkers = { terraplanagem: 0, assentamento: 0, sinalizacao: 0, explosivos: 0, manutencao: 0 };
        completedProjects.forEach(p => {
          if (p.workersAllocated) {
            (Object.keys(p.workersAllocated) as Array<keyof GameWorkers>).forEach(k => {
              totalReturned[k] += p.workersAllocated[k];
            });
          }
        });
        if (Object.values(totalReturned).some(v => v > 0)) {
          setWorkers(prev => ({
            terraplanagem: prev.terraplanagem + totalReturned.terraplanagem,
            assentamento:  prev.assentamento  + totalReturned.assentamento,
            sinalizacao:   prev.sinalizacao   + totalReturned.sinalizacao,
            explosivos:    prev.explosivos    + totalReturned.explosivos,
            manutencao:    prev.manutencao    + totalReturned.manutencao,
          }));
        }
        completedProjects.forEach(p => {
          const cityA = CITY_MAP.get(p.from);
          const cityB = CITY_MAP.get(p.to);
          const workerReturn = p.workersAllocated
            ? Object.entries(p.workersAllocated).filter(([,v]) => v > 0).map(([k,v]) => `${v} ${WORKER_NAMES[k as keyof GameWorkers].split(' ')[0]}`).join(', ')
            : '';
          showToast(`✅ Obra concluída: ${cityA?.name} ↔ ${cityB?.name} (${p.distance.toFixed(0)} km)${workerReturn ? ` — ${workerReturn} liberados!` : ''}`, 'success');
          sound.playConnect();
          if (cityA && cityB) {
            setNewsItems(prev => [newsRouteComplete(cityA, cityB, p.distance, p.type, ym), ...prev].slice(0, 60));
          }
        });
      }

      // Process infrastructure build queue — pre-calculate from ref
      const completedInfraProjects = infraQueueRef.current.filter(p => p.monthsRemaining <= 1);
      setInfraQueue(prev => prev
        .filter(p => p.monthsRemaining > 1)
        .map(p => ({ ...p, monthsRemaining: p.monthsRemaining - 1 }))
      );
      if (completedInfraProjects.length > 0) {
        const infraWorkerReturn: GameWorkers = { terraplanagem: 0, assentamento: 0, sinalizacao: 0, explosivos: 0, manutencao: 0 };
        completedInfraProjects.forEach(p => {
          const cityName = CITY_MAP.get(p.cityId)?.name ?? p.cityId;
          if (p.type === 'hub') {
            setUpgradedHubs(prev2 => [...prev2, p.cityId]);
            showToast(`★ Terminal Central em ${cityName} concluído! +1 slot de conexão.`, 'success');
          } else if (p.type === 'warehouse') {
            setWarehouses(prev2 => [...prev2, p.cityId]);
            showToast(`🏭 Armazém Geral em ${cityName} concluído! +R$500M/mês.`, 'success');
          } else if (p.type === 'silo') {
            setSilos(prev2 => [...prev2, p.cityId]);
            showToast(`🌾 Silo Graneleiro em ${cityName} concluído! +30% receita nas rotas.`, 'success');
          } else {
            setMaintenanceYards(prev2 => [...prev2, p.cityId]);
            setYardLevels(prev2 => ({ ...prev2, [p.cityId]: p.yardLevel ?? 1 }));
            const yLevel = (p.yardLevel ?? 1) as 1 | 2 | 3;
            const lvlName = YARD_CONFIGS[yLevel]?.name ?? 'Básico';
            const cov = YARD_CONFIGS[yLevel]?.coverage ?? 0;
            showToast(`🔧 Pátio ${lvlName} em ${cityName} concluído! Cobertura: ${cov}km.`, 'success');
          }
          (Object.keys(infraWorkerReturn) as Array<keyof GameWorkers>).forEach(k => {
            infraWorkerReturn[k] += p.workersAllocated[k] ?? 0;
          });
          sound.playConnect();
        });
        if (Object.values(infraWorkerReturn).some(v => v > 0)) {
          setWorkers(prev2 => ({
            terraplanagem: prev2.terraplanagem + infraWorkerReturn.terraplanagem,
            assentamento:  prev2.assentamento  + infraWorkerReturn.assentamento,
            sinalizacao:   prev2.sinalizacao   + infraWorkerReturn.sinalizacao,
            explosivos:    prev2.explosivos    + infraWorkerReturn.explosivos,
            manutencao:    prev2.manutencao    + infraWorkerReturn.manutencao,
          }));
        }
      }
    }

    // 1. Durations Tick — pre-calculate from ref, then pure state update
    const totalFines = activeEventsRef.current.reduce((acc, e) => acc + (e.costPerMonth && e.monthsLeft > 0 ? e.costPerMonth : 0), 0);
    const expiredEvents = activeEventsRef.current.filter(e => e.monthsLeft <= 1);
    setActiveEvents(prev => prev
      .map(e => ({ ...e, monthsLeft: e.monthsLeft - 1 }))
      .filter(e => e.monthsLeft > 0)
    );
    if (totalFines > 0) {
      setSpentOnResources(p => p + totalFines);
      const fmt = (v: number) => v >= 1e9 ? `R$ ${(v/1e9).toFixed(1)}B` : `R$ ${(v/1e6).toFixed(0)}M`;
      showToast(`💸 Multas mensais de crises ativas: -${fmt(totalFines)}`, 'error');
    }
    expiredEvents.forEach(e => {
      showToast(`✅ Crise encerrada: "${e.title}" — efeitos cessados.`, 'success');
    });

    // 2. Calendar-based scheduled event trigger
    const triggerMonth = monthIdx + 1; // monthIdx is 0-based; triggerMonth is 1-based
    const yearMonth = `${gameYear}/${String(triggerMonth).padStart(2, '0')}`;

    const due = SCHEDULED_EVENTS.filter(
      ev => ev.triggerYear === gameYear &&
            ev.triggerMonth === triggerMonth &&
            !triggeredEventIdsRef.current.includes(ev.id)
    );

    for (const ev of due) {
      // Mark as triggered immediately to avoid double-fire
      setTriggeredEventIds(prev => {
        const next = [...prev, ev.id];
        triggeredEventIdsRef.current = next;
        return next;
      });

      // Party / political election event
      if (ev.category === 'POL' && ev.party) {
        const partyEffect = `PARTIDO_${ev.party}`;
        const partyEvent: GameEvent = {
          id: `pol_${ev.id}`,
          title: ev.title,
          description: ev.description,
          type: 'politics',
          statusEffect: partyEffect,
          durationMonths: 48,
          monthsLeft: 48,
          ...(ev.party === 'PL' ? { revenueMultiplier: 0.85 } : {}),
          ...(ev.party === 'PS' ? { monthlyBonus: 2_000_000_000 } : {}),
        };
        // Remove previous party effect and add new one
        setActiveEvents(prev => [
          ...prev.filter(e => !e.statusEffect.startsWith('PARTIDO_')),
          partyEvent,
        ]);
        setNewsItems(prev => [{
          id: `news_${ev.id}`,
          headline: `🗳️ ${ev.title} — ${ev.description.slice(0, 80)}`,
          yearMonth,
          category: 'crisis',
        }, ...prev].slice(0, 60));
        showToast(`🗳️ ${ev.title}`, 'info');
        continue;
      }

      // Immediate cash bonus/penalty
      if (ev.immediateCash) {
        if (ev.immediateCash > 0) {
          setTotalRevenue(prev => prev + ev.immediateCash!);
          showToast(`💰 ${ev.title}: +R$ ${(ev.immediateCash! / 1e9).toFixed(0)}B creditados`, 'success');
        } else {
          setSpentOnResources(prev => prev + Math.abs(ev.immediateCash!));
          showToast(`💸 ${ev.title}: -R$ ${(Math.abs(ev.immediateCash!) / 1e9).toFixed(0)}B debitados`, 'error');
        }
        setNewsItems(prev => [{
          id: `news_${ev.id}`,
          headline: `${ev.immediateCash! > 0 ? '💰' : '💸'} ${ev.title}`,
          yearMonth,
          category: ev.immediateCash! > 0 ? 'grant' : 'crisis',
        }, ...prev].slice(0, 60));
      }

      // Apply game event effect
      if (ev.gameEvent) {
        const ge = ev.gameEvent;
        const gameEventObj: GameEvent = {
          id: `ge_${ev.id}`,
          title: ev.title,
          description: ev.description,
          type: ge.type,
          statusEffect: ge.statusEffect,
          durationMonths: ge.durationMonths,
          monthsLeft: ge.durationMonths,
          ...(ge.costPerMonth !== undefined ? { costPerMonth: ge.costPerMonth } : {}),
          ...(ge.costToResolve !== undefined ? { costToResolve: ge.costToResolve } : {}),
          ...(ge.workerLoss !== undefined ? { workerLoss: ge.workerLoss } : {}),
          ...(ge.revenueMultiplier !== undefined ? { revenueMultiplier: ge.revenueMultiplier } : {}),
          ...(ge.monthlyBonus !== undefined ? { monthlyBonus: ge.monthlyBonus } : {}),
          ...(ge.resourceMultipliers !== undefined ? { resourceMultipliers: ge.resourceMultipliers } : {}),
          ...(ge.constructionSlowFactor !== undefined ? { constructionSlowFactor: ge.constructionSlowFactor } : {}),
          ...(ge.balsaFrozen !== undefined ? { balsaFrozen: ge.balsaFrozen } : {}),
          ...(ge.blockConstruction !== undefined ? { blockConstruction: ge.blockConstruction } : {}),
          ...(ge.payrollMultiplier !== undefined ? { payrollMultiplier: ge.payrollMultiplier } : {}),
        };

        // Worker loss events apply immediately
        if (ge.workerLoss) {
          setWorkers(prev => ({
            ...prev,
            [ge.workerLoss!.role]: Math.max(0, prev[ge.workerLoss!.role] - ge.workerLoss!.amount),
          }));
        }

        if (ev.category === 'CRI') {
          // Crisis events: show popup for player acknowledgement
          if (!currentEventRef.current) {
            setCurrentEvent(gameEventObj);
            sound.playError();
          } else {
            // If there's already a popup open, add directly to active
            setActiveEvents(prev => [...prev, gameEventObj]);
            setNewsItems(prev => [{
              id: `news_${ev.id}`,
              headline: `⚠️ ${ev.title}`,
              yearMonth,
              category: 'crisis',
            }, ...prev].slice(0, 60));
          }
        } else {
          // POS/NEU events apply automatically, no popup
          setActiveEvents(prev => [...prev, gameEventObj]);
          const icon = ev.category === 'POS' ? '✅' : 'ℹ️';
          showToast(`${icon} ${ev.title}`, ev.category === 'POS' ? 'success' : 'info');
          setNewsItems(prev => [{
            id: `news_${ev.id}`,
            headline: `${icon} ${ev.title}`,
            yearMonth,
            category: ev.category === 'POS' ? 'grant' : 'economy',
          }, ...prev].slice(0, 60));
        }
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

  // Soundtrack: start after splash, respect mute
  useEffect(() => {
    if (!splashDone || !audioRef.current) return;
    audioRef.current.volume = 0.35;
    if (!isMuted) audioRef.current.play().catch(() => {});
    else audioRef.current.pause();
  }, [splashDone, isMuted]);

  // Sound muter toggle
  const handleToggleMute = () => {
    const nextMute = sound.toggleMute();
    setIsMuted(nextMute);
    showToast(nextMute ? 'Som desativado' : 'Som ativado', 'info');
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
    setTriggeredEventIds([]);
    triggeredEventIdsRef.current = [];
    setInfraQueue([]);
    setYardLevels({});
    setWarehouses([]);
    setSilos([]);
    setShownCutscenes([]);
    shownCutscenesRef.current = [];
    setActiveCutscene(null);
    setExpiredMissions([]);
    setAutoBuyResources(true);

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
    setTriggeredEventIds(save.triggeredEventIds ?? []);
    triggeredEventIdsRef.current = save.triggeredEventIds ?? [];
    setInfraQueue(save.infraQueue ?? []);
    setYardLevels(save.yardLevels ?? {});
    setWarehouses(save.warehouses ?? []);
    setSilos(save.silos ?? []);
    const loadedCutscenes = save.shownCutscenes ?? [];
    setShownCutscenes(loadedCutscenes);
    shownCutscenesRef.current = loadedCutscenes;
    setAutoBuyResources(save.autoBuyResources ?? true);
    setExpiredMissions(save.expiredMissions ?? []);
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
  const handleImportSave = (data: SaveGame) => {
    try {
      setEdges(data.edges ?? []);
      setUpgradedHubs(data.upgradedHubs ?? []);
      setMaintenanceYards(data.maintenanceYards ?? []);
      setConstructionType(data.constructionType ?? 'rail');
      setResources(data.resources ?? { aco: 0, brita: 0, madeira: 0, cimento: 0, cobre: 0, explosivos: 0 });
      setSpentOnResources(data.spentOnResources ?? 0);
      setWorkers(data.workers ?? { terraplanagem: 0, assentamento: 0, sinalizacao: 0, explosivos: 0, manutencao: 0 });
      setSpentOnWorkers(data.spentOnWorkers ?? 0);
      setActiveEvents(data.activeEvents ?? []);
      setGameYear(data.gameYear ?? 2027);
      setMonthIdx(data.monthIdx ?? 0);
      setConstructionQueue(data.constructionQueue ?? []);
      setTotalRevenue(data.totalRevenue ?? 0);
      setCompletedMissions(data.completedMissions ?? []);
      setNewsItems(data.newsItems ?? []);
      setTriggeredEventIds(data.triggeredEventIds ?? []);
      setInfraQueue(data.infraQueue ?? []);
      setYardLevels(data.yardLevels ?? {});
      setWarehouses(data.warehouses ?? []);
      setSilos(data.silos ?? []);
      const importedCutscenes = data.shownCutscenes ?? [];
      setShownCutscenes(importedCutscenes);
      shownCutscenesRef.current = importedCutscenes;
      setAutoBuyResources(data.autoBuyResources ?? true);
      setExpiredMissions(data.expiredMissions ?? []);
      showToast('📥 Save importado com sucesso!', 'success');
    } catch {
      showToast('❌ Arquivo inválido — não foi possível importar.', 'error');
    }
  };

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
    const costPerWorker = WORKER_HIRE_COST[role];
    const totalCost = amount * costPerWorker;

    if (budgetState.currentBudget < totalCost) {
      sound.playError();
      showToast(`Orçamento insuficiente para contratar ${amount} profissionais! (R$ ${totalCost.toLocaleString('pt-BR')} — 3× salário/pessoa de onboarding)`, 'error');
      return;
    }

    setSpentOnWorkers(prev => prev + totalCost);
    setWorkers(prev => ({ ...prev, [role]: (prev[role] ?? 0) + amount }));
    sound.playConnect();

    const nameMap: Record<keyof GameWorkers, string> = {
      terraplanagem: 'Terraplanagem', assentamento: 'Assentamento',
      sinalizacao: 'Sinalização', explosivos: 'Explosivos', manutencao: 'Manutenção'
    };
    showToast(`Admissão: +${amount} ${nameMap[role]}(s). Taxa de integração: R$ ${totalCost.toLocaleString('pt-BR')}.`, 'success');
  };

  const handleFireWorker = (role: keyof GameWorkers, amount: number) => {
    const currentQty = workers[role] ?? 0;
    if (currentQty <= 0) {
      showToast("Não há trabalhadores deste tipo contratados!", "error");
      return;
    }
    const actualAmount = Math.min(amount, currentQty);
    const severanceCost = actualAmount * WORKER_SEVERANCE[role];

    // Mass layoff penalty: demitting >30 at once adds R$2B fine
    const massLayoffPenalty = actualAmount > 30 ? 2_000_000_000 : 0;
    const totalCost = severanceCost + massLayoffPenalty;

    setSpentOnWorkers(prev => prev + totalCost);
    setWorkers(prev => ({ ...prev, [role]: Math.max(0, (prev[role] ?? 0) - actualAmount) }));
    sound.playDisconnect();

    const nameMap: Record<keyof GameWorkers, string> = {
      terraplanagem: 'Terraplanagem', assentamento: 'Assentamento',
      sinalizacao: 'Sinalização', explosivos: 'Explosivos', manutencao: 'Manutenção'
    };
    if (massLayoffPenalty > 0) {
      showToast(`Demissão em massa: ${actualAmount} ${nameMap[role]}(s). Rescisão: R$ ${severanceCost.toLocaleString('pt-BR')} + Multa R$ 2B por instabilidade no canteiro!`, 'error');
    } else {
      showToast(`Rescisão: ${actualAmount} ${nameMap[role]}(s). Indenização: R$ ${severanceCost.toLocaleString('pt-BR')}`, 'info');
    }
  };

  // Manual resource purchasing handler
  const handleBuyResource = (resKey: keyof GameResources, amount: number) => {
    const buyActiveEffects = activeEvents.map(e => e.statusEffect);
    const isHighInflation = buyActiveEffects.includes('INFLACAO_GLOBAL');
    const isGeopoliticTension = buyActiveEffects.includes('TENSAO_GEOPOLITICA');
    let unitPrice = RESOURCE_BUY_PRICES[resKey];
    if (resKey === 'aco' && isHighInflation) unitPrice *= 2.0;
    if (resKey === 'cobre' && isHighInflation) unitPrice *= 2.0;
    if (resKey === 'cobre' && isGeopoliticTension) unitPrice *= 1.8;
    // Apply resource price multipliers from active events
    activeEvents.forEach(e => {
      if (e.resourceMultipliers && e.resourceMultipliers[resKey] !== undefined) {
        unitPrice = Math.round(unitPrice * e.resourceMultipliers[resKey]!);
      }
    });
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

  // Returns the native maximum connections for a city based on its size tier
  const getCityNativeMaxConns = (cityId: string): number => {
    // Metropoles (4 native connections): SP, RJ, BH, Curitiba, Salvador, Recife, Fortaleza, Belém, Manaus, Goiânia, Brasília, Porto Alegre
    const METROPOLE_IDS = new Set(['1','2','3','7','8','11','14','17','20','24','25','5']);
    const city = CITIES.find(c => c.id === cityId);
    if (!city) return 2;
    if (METROPOLE_IDS.has(cityId)) return 4;
    if (city.type === 'capital') return 3;
    if (city.type === 'polo_industrial' || city.type === 'mineracao') return 3;
    return 2;
  };

  // ── Budget hook ──────────────────────────────────────────────────────────
  const {
    spentOnResources, setSpentOnResources,
    spentOnWorkers,   setSpentOnWorkers,
    totalRevenue,     setTotalRevenue,
    budgetState,      budgetHistory, setBudgetHistory,
  } = useBudget({
    edges, workers, activeEvents, maintenanceYards,
    upgradedHubs, warehouses, silos,
    gameYear, monthIdx, welcomeOpen, showToast,
  });

  // Revenue-per-km map for route color visualization — only computed when feature is on
  const routeRevenueMap = useMemo(() => {
    if (!showRouteColors) return new Map<string, number>();
    const activeEffects = activeEvents.map(e => e.statusEffect);
    const balsaFrozen = activeEvents.some(e => e.balsaFrozen);
    const map = new Map<string, number>();
    edges.filter(e => e.status === 'complete').forEach(edge => {
      const rev = getEdgeMonthlyRevenue(edge, workers, activeEffects, CITIES, balsaFrozen, gameYear, upgradedHubs, silos);
      map.set(edge.id, edge.distance > 0 ? rev / edge.distance : 0);
    });
    return map;
  }, [showRouteColors, edges, workers, activeEvents, gameYear, upgradedHubs, silos]);

  // Sound effect when budget alert fires (hook handles the toast, App handles the sound)
  const budgetAlertFiredRef = React.useRef(false);
  useEffect(() => {
    if (welcomeOpen) return;
    const pct = budgetState.currentBudget / STARTING_BUDGET;
    if (pct < 0.08 && budgetState.currentBudget > 0 && !budgetAlertFiredRef.current) {
      budgetAlertFiredRef.current = true;
      sound.playError();
    } else if (pct >= 0.15) {
      budgetAlertFiredRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budgetState.currentBudget, welcomeOpen]);

  // Dijkstra nearest yard distance + which yard is nearest
  const { distances: nearestYardDistances, nearestYardIds } = useMemo(() => {
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
        setNewsItems(prev => [newsGrant(g.title, g.value, ym), ...prev].slice(0, 60));
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
      // Check prerequisite (chained missions)
      if (m.unlocksAfter && !completedMissions.includes(m.unlocksAfter)) return;
      if (m.completed && !completedMissions.includes(m.id)) {
        setCompletedMissions(prev => [...prev, m.id]);
        setTotalRevenue(prev => prev + m.reward);
        showToast(`🎯 Missão concluída: "${m.title.replace(/^[^ ]+ /, '')}" — Prêmio: R$ ${(m.reward/1e9).toFixed(0)}B`, 'success');
        sound.playConnect();
        setNewsItems(prev => [newsMission(m.title, m.reward, yearMonth), ...prev].slice(0, 60));
      }
      // Check deadline
      if (m.deadlineYear && gameYear >= m.deadlineYear && !completedMissions.includes(m.id) && !expiredMissions.includes(m.id)) {
        setExpiredMissions(prev => [...prev, m.id]);
        showToast(`⏰ Missão expirada: ${m.title}`, 'error');
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missionResults, welcomeOpen]);

  // Counting edges with no active maintenance coverage (level-aware)
  const unmaintainedEdgesCount = useMemo(() => {
    if (edges.length === 0) return 0;
    return edges.filter(edge => {
      const checkCovered = (cityId: string) => {
        const dist = nearestYardDistances[cityId] ?? Infinity;
        const yardId = nearestYardIds[cityId];
        if (!yardId) return false;
        const level = yardLevels[yardId] ?? 1;
        return dist <= YARD_COVERAGE_KM[level as 1|2|3];
      };
      return !checkCovered(edge.from) && !checkCovered(edge.to);
    }).length;
  }, [edges, nearestYardDistances, nearestYardIds, yardLevels]);

  // Build Terminal Central (hub upgrade) - async construction system
  const handleBuildHub = (cityId: string) => {
    const city = CITIES.find(c => c.id === cityId);
    if (!city) return;

    // Already complete → demolish
    if (upgradedHubs.includes(cityId)) {
      setUpgradedHubs(prev => prev.filter(id => id !== cityId));
      setSpentOnResources(prev => Math.max(0, prev - HUB_CONFIG.cost));
      showToast(`★ Terminal Central em ${city.name} demolido. R$ 30B reembolsados.`, 'info');
      sound.playDisconnect();
      return;
    }

    // Already building → cancel
    const existingProject = infraQueue.find(p => p.cityId === cityId && p.type === 'hub');
    if (existingProject) {
      setInfraQueue(prev => prev.filter(p => p.id !== existingProject.id));
      setSpentOnResources(prev => Math.max(0, prev - Math.round(HUB_CONFIG.cost * 0.5)));
      setResources(prev => {
        const u = { ...prev };
        (Object.keys(existingProject.resourcesConsumed) as (keyof GameResources)[]).forEach(k => {
          u[k] = (u[k] ?? 0) + Math.floor((existingProject.resourcesConsumed[k] ?? 0) * 0.5);
        });
        return u;
      });
      setWorkers(prev => ({
        terraplanagem: prev.terraplanagem + (existingProject.workersAllocated.terraplanagem ?? 0),
        assentamento: prev.assentamento + (existingProject.workersAllocated.assentamento ?? 0),
        sinalizacao: prev.sinalizacao + (existingProject.workersAllocated.sinalizacao ?? 0),
        explosivos: prev.explosivos + (existingProject.workersAllocated.explosivos ?? 0),
        manutencao: prev.manutencao + (existingProject.workersAllocated.manutencao ?? 0),
      }));
      showToast(`★ Construção do Terminal Central em ${city.name} cancelada (50% reembolsado).`, 'info');
      sound.playDisconnect();
      return;
    }

    // Start construction
    const cfg = HUB_CONFIG;
    if ((workers.assentamento ?? 0) < (cfg.workers.assentamento ?? 0)) {
      showToast(`⚠️ Trabalhadores de Assentamento insuficientes para o Terminal Central (${cfg.workers.assentamento} necessários).`, 'error');
      sound.playError(); return;
    }
    if ((workers.sinalizacao ?? 0) < (cfg.workers.sinalizacao ?? 0)) {
      showToast(`⚠️ Trabalhadores de Sinalização insuficientes para o Terminal Central (${cfg.workers.sinalizacao} necessários).`, 'error');
      sound.playError(); return;
    }
    let buyCost = 0;
    const shortages: Partial<GameResources> = {};
    (Object.keys(cfg.resources) as (keyof GameResources)[]).forEach(k => {
      const need = cfg.resources[k] ?? 0;
      const have = resources[k] ?? 0;
      const short = Math.max(0, need - have);
      if (short > 0) { shortages[k] = short; buyCost += short * RESOURCE_BUY_PRICES[k]; }
    });
    if (buyCost > 0 && !autoBuyResources) {
      showToast(`Insumos insuficientes para o Terminal Central. Ative auto-compra ou compre manualmente.`, 'error');
      sound.playError(); return;
    }
    if (budgetState.currentBudget < cfg.cost + buyCost) {
      showToast(`Orçamento insuficiente para o Terminal Central (R$ ${((cfg.cost + buyCost)/1e9).toFixed(0)}B necessários).`, 'error');
      sound.playError(); return;
    }
    setSpentOnResources(prev => prev + cfg.cost + buyCost);
    if (buyCost > 0) {
      setResources(prev => {
        const u = { ...prev };
        (Object.keys(shortages) as (keyof GameResources)[]).forEach(k => { u[k] = (u[k] ?? 0) + (shortages[k] ?? 0); });
        return u;
      });
    }
    setResources(prev => {
      const u = { ...prev };
      (Object.keys(cfg.resources) as (keyof GameResources)[]).forEach(k => { u[k] = Math.max(0, (u[k] ?? 0) - (cfg.resources[k] ?? 0)); });
      return u;
    });
    setWorkers(prev => ({
      terraplanagem: prev.terraplanagem,
      assentamento: Math.max(0, prev.assentamento - (cfg.workers.assentamento ?? 0)),
      sinalizacao: Math.max(0, prev.sinalizacao - (cfg.workers.sinalizacao ?? 0)),
      explosivos: prev.explosivos,
      manutencao: prev.manutencao,
    }));
    const project: InfraProject = {
      id: `hub_${cityId}_${Date.now()}`,
      cityId,
      type: 'hub',
      monthsRemaining: cfg.months,
      totalMonths: cfg.months,
      workersAllocated: { assentamento: cfg.workers.assentamento ?? 0, sinalizacao: cfg.workers.sinalizacao ?? 0 },
      resourcesConsumed: { ...cfg.resources } as Partial<GameResources>,
      startedYear: gameYear,
      startedMonth: monthIdx,
      cost: cfg.cost,
    };
    setInfraQueue(prev => [...prev, project]);
    showToast(`★ Terminal Central em ${city.name} em construção — ${cfg.months} meses.`, 'success');
    sound.playConnect();
  };

  const handleBuildWarehouse = (cityId: string) => {
    const city = CITIES.find(c => c.id === cityId);
    if (!city) return;
    if (warehouses.includes(cityId)) {
      setWarehouses(prev => prev.filter(id => id !== cityId));
      setSpentOnResources(prev => Math.max(0, prev - WAREHOUSE_CONFIG.cost));
      showToast(`🏭 Armazém em ${city.name} demolido. Reembolso parcial aplicado.`, 'info');
      sound.playDisconnect(); return;
    }
    const existing = infraQueue.find(p => p.cityId === cityId && p.type === 'warehouse');
    if (existing) {
      setInfraQueue(prev => prev.filter(p => p.id !== existing.id));
      setSpentOnResources(prev => Math.max(0, prev - Math.round(WAREHOUSE_CONFIG.cost * 0.5)));
      setWorkers(prev => ({
        terraplanagem: prev.terraplanagem + (existing.workersAllocated.terraplanagem ?? 0),
        assentamento: prev.assentamento + (existing.workersAllocated.assentamento ?? 0),
        sinalizacao: prev.sinalizacao + (existing.workersAllocated.sinalizacao ?? 0),
        explosivos: prev.explosivos + (existing.workersAllocated.explosivos ?? 0),
        manutencao: prev.manutencao + (existing.workersAllocated.manutencao ?? 0),
      }));
      showToast(`🏭 Construção do Armazém em ${city.name} cancelada (50% reembolsado).`, 'info');
      sound.playDisconnect(); return;
    }
    const cfg = WAREHOUSE_CONFIG;
    if ((workers.assentamento ?? 0) < (cfg.workers.assentamento ?? 0)) {
      showToast(`⚠️ Assentamento insuficiente para Armazém (${cfg.workers.assentamento} necessários).`, 'error');
      sound.playError(); return;
    }
    if (budgetState.currentBudget < cfg.cost) {
      showToast(`Orçamento insuficiente para Armazém (R$ ${(cfg.cost/1e9).toFixed(0)}B necessários).`, 'error');
      sound.playError(); return;
    }
    setSpentOnResources(prev => prev + cfg.cost);
    setWorkers(prev => ({ ...prev, assentamento: prev.assentamento - (cfg.workers.assentamento ?? 0) }));
    setResources(prev => {
      const u = { ...prev };
      (Object.keys(cfg.resources) as (keyof GameResources)[]).forEach(k => { u[k] = Math.max(0, (u[k] ?? 0) - (cfg.resources[k] ?? 0)); });
      return u;
    });
    setInfraQueue(prev => [...prev, {
      id: `warehouse_${cityId}_${Date.now()}`, cityId, type: 'warehouse',
      monthsRemaining: cfg.months, totalMonths: cfg.months,
      workersAllocated: { assentamento: cfg.workers.assentamento ?? 0 },
      resourcesConsumed: { ...cfg.resources } as Partial<GameResources>,
      startedYear: gameYear, startedMonth: monthIdx, cost: cfg.cost,
    }]);
    showToast(`🏭 Armazém Geral em ${city.name} em construção — ${cfg.months} meses.`, 'success');
    sound.playConnect();
  };

  const handleBuildSilo = (cityId: string) => {
    const city = CITIES.find(c => c.id === cityId);
    if (!city) return;
    if (city.type !== 'polo_agricola') {
      showToast('🌾 Silo só pode ser construído em cidades Polo Agrícola.', 'error');
      sound.playError(); return;
    }
    if (silos.includes(cityId)) {
      setSilos(prev => prev.filter(id => id !== cityId));
      setSpentOnResources(prev => Math.max(0, prev - SILO_CONFIG.cost));
      showToast(`🌾 Silo em ${city.name} demolido. Reembolso parcial aplicado.`, 'info');
      sound.playDisconnect(); return;
    }
    const existing = infraQueue.find(p => p.cityId === cityId && p.type === 'silo');
    if (existing) {
      setInfraQueue(prev => prev.filter(p => p.id !== existing.id));
      setSpentOnResources(prev => Math.max(0, prev - Math.round(SILO_CONFIG.cost * 0.5)));
      setWorkers(prev => ({
        terraplanagem: prev.terraplanagem + (existing.workersAllocated.terraplanagem ?? 0),
        assentamento: prev.assentamento + (existing.workersAllocated.assentamento ?? 0),
        sinalizacao: prev.sinalizacao + (existing.workersAllocated.sinalizacao ?? 0),
        explosivos: prev.explosivos + (existing.workersAllocated.explosivos ?? 0),
        manutencao: prev.manutencao + (existing.workersAllocated.manutencao ?? 0),
      }));
      showToast(`🌾 Construção do Silo em ${city.name} cancelada (50% reembolsado).`, 'info');
      sound.playDisconnect(); return;
    }
    const cfg = SILO_CONFIG;
    if ((workers.assentamento ?? 0) < (cfg.workers.assentamento ?? 0)) {
      showToast(`⚠️ Assentamento insuficiente para Silo (${cfg.workers.assentamento} necessários).`, 'error');
      sound.playError(); return;
    }
    if ((workers.terraplanagem ?? 0) < (cfg.workers.terraplanagem ?? 0)) {
      showToast(`⚠️ Terraplanagem insuficiente para Silo (${cfg.workers.terraplanagem} necessários).`, 'error');
      sound.playError(); return;
    }
    if (budgetState.currentBudget < cfg.cost) {
      showToast(`Orçamento insuficiente para Silo (R$ ${(cfg.cost/1e9).toFixed(0)}B necessários).`, 'error');
      sound.playError(); return;
    }
    setSpentOnResources(prev => prev + cfg.cost);
    setWorkers(prev => ({
      ...prev,
      assentamento: prev.assentamento - (cfg.workers.assentamento ?? 0),
      terraplanagem: prev.terraplanagem - (cfg.workers.terraplanagem ?? 0),
    }));
    setResources(prev => {
      const u = { ...prev };
      (Object.keys(cfg.resources) as (keyof GameResources)[]).forEach(k => { u[k] = Math.max(0, (u[k] ?? 0) - (cfg.resources[k] ?? 0)); });
      return u;
    });
    setInfraQueue(prev => [...prev, {
      id: `silo_${cityId}_${Date.now()}`, cityId, type: 'silo',
      monthsRemaining: cfg.months, totalMonths: cfg.months,
      workersAllocated: { assentamento: cfg.workers.assentamento ?? 0, terraplanagem: cfg.workers.terraplanagem ?? 0 },
      resourcesConsumed: { ...cfg.resources } as Partial<GameResources>,
      startedYear: gameYear, startedMonth: monthIdx, cost: cfg.cost,
    }]);
    showToast(`🌾 Silo Graneleiro em ${city.name} em construção — ${cfg.months} meses. +30% receita nas rotas.`, 'success');
    sound.playConnect();
  };

  // Bitola Dupla — doubles track capacity on a completed edge (+50% revenue, R$20B)
  const handleDoubleTrack = (edgeId: string) => {
    const edge = edges.find(e => e.id === edgeId);
    if (!edge || edge.status === 'building') return;
    if (edge.doubled) { showToast('Esta rota já tem bitola dupla.', 'info'); return; }
    const cost = 20_000_000_000;
    if (budgetState.currentBudget < cost) { showToast('Orçamento insuficiente para bitola dupla (R$20B).', 'error'); sound.playError(); return; }
    setEdges(prev => prev.map(e => e.id === edgeId ? { ...e, doubled: true } : e));
    setSpentOnResources(prev => prev + cost);
    showToast('⊟ Bitola dupla instalada! Receita da rota +50%.', 'success');
    sound.playConnect();
  };

  // Upgrade de Velocidade — increases train level on a completed edge
  const handleUpgradeTrainLevel = (edgeId: string) => {
    const edge = edges.find(e => e.id === edgeId);
    if (!edge || edge.status === 'building') return;
    const level = edge.trainLevel ?? 1;
    if (level >= 3) { showToast('Nível máximo de velocidade atingido.', 'info'); return; }
    const cost = level === 1 ? 15_000_000_000 : 30_000_000_000;
    const newLevel = (level + 1) as 1 | 2 | 3;
    if (budgetState.currentBudget < cost) { showToast(`Orçamento insuficiente (R$${cost/1e9}B necessários).`, 'error'); sound.playError(); return; }
    setEdges(prev => prev.map(e => e.id === edgeId ? { ...e, trainLevel: newLevel } : e));
    setSpentOnResources(prev => prev + cost);
    showToast(`🚄 Velocidade atualizada para Nível ${newLevel}! Receita +${newLevel === 2 ? '25' : '60'}%.`, 'success');
    sound.playConnect();
  };

  // Trem de Passageiros — eletrifica e adapta a rota para passageiros (+40% receita em capitais/industriais)
  const handlePassengerUpgrade = (edgeId: string) => {
    const edge = edges.find(e => e.id === edgeId);
    if (!edge || edge.status === 'building' || edge.type === 'balsa') return;
    if (edge.passenger) { showToast('Esta rota já opera serviço de passageiros.', 'info'); return; }
    const cost = 25_000_000_000;
    if (budgetState.currentBudget < cost) { showToast('Orçamento insuficiente (R$25B necessários).', 'error'); sound.playError(); return; }
    setEdges(prev => prev.map(e => e.id === edgeId ? { ...e, passenger: true } : e));
    setSpentOnResources(prev => prev + cost);
    const fromCity = CITIES.find(c => c.id === edge.from);
    const toCity   = CITIES.find(c => c.id === edge.to);
    const isHighPop = (c: typeof fromCity) => c && (c.type === 'capital' || c.type === 'polo_industrial');
    const bonus = (isHighPop(fromCity) || isHighPop(toCity)) ? '+40%' : '+15%';
    showToast(`🚆 Serviço de passageiros ativo! Receita da rota ${bonus}.`, 'success');
    sound.playConnect();
  };

  // Build Maintenance Yard - async construction system with 3 levels
  const handleBuildYard = (cityId: string, level: 1 | 2 | 3 = 1) => {
    const city = CITIES.find(c => c.id === cityId);
    if (!city) return;
    const cfg = YARD_CONFIGS[level];

    // Already complete → demolish
    if (maintenanceYards.includes(cityId)) {
      const currentLevel = yardLevels[cityId] ?? 1;
      const currentCost = YARD_CONFIGS[currentLevel as 1|2|3].cost;
      setMaintenanceYards(prev => prev.filter(id => id !== cityId));
      setYardLevels(prev => { const u = { ...prev }; delete u[cityId]; return u; });
      setSpentOnResources(prev => Math.max(0, prev - currentCost));
      showToast(`🔧 Pátio ${YARD_CONFIGS[currentLevel as 1|2|3].name} em ${city.name} demolido. Reembolso parcial aplicado.`, 'info');
      sound.playDisconnect();
      return;
    }

    // Already building → cancel
    const existingProject = infraQueue.find(p => p.cityId === cityId && p.type === 'yard');
    if (existingProject) {
      setInfraQueue(prev => prev.filter(p => p.id !== existingProject.id));
      setSpentOnResources(prev => Math.max(0, prev - Math.round(existingProject.cost * 0.5)));
      setResources(prev => {
        const u = { ...prev };
        (Object.keys(existingProject.resourcesConsumed) as (keyof GameResources)[]).forEach(k => {
          u[k] = (u[k] ?? 0) + Math.floor((existingProject.resourcesConsumed[k] ?? 0) * 0.5);
        });
        return u;
      });
      setWorkers(prev => ({
        terraplanagem: prev.terraplanagem + (existingProject.workersAllocated.terraplanagem ?? 0),
        assentamento: prev.assentamento + (existingProject.workersAllocated.assentamento ?? 0),
        sinalizacao: prev.sinalizacao + (existingProject.workersAllocated.sinalizacao ?? 0),
        explosivos: prev.explosivos + (existingProject.workersAllocated.explosivos ?? 0),
        manutencao: prev.manutencao + (existingProject.workersAllocated.manutencao ?? 0),
      }));
      showToast(`🔧 Construção do Pátio em ${city.name} cancelada (50% reembolsado).`, 'info');
      sound.playDisconnect();
      return;
    }

    // Worker checks
    if ((workers.terraplanagem ?? 0) < (cfg.workers.terraplanagem ?? 0)) {
      showToast(`⚠️ Terraplanagem insuficiente para o Pátio ${cfg.name} (${cfg.workers.terraplanagem} necessários).`, 'error');
      sound.playError(); return;
    }
    if ((workers.assentamento ?? 0) < (cfg.workers.assentamento ?? 0)) {
      showToast(`⚠️ Assentamento insuficiente para o Pátio ${cfg.name} (${cfg.workers.assentamento} necessários).`, 'error');
      sound.playError(); return;
    }
    let buyCost = 0;
    const shortages: Partial<GameResources> = {};
    (Object.keys(cfg.resources) as (keyof GameResources)[]).forEach(k => {
      const need = cfg.resources[k] ?? 0;
      const have = resources[k] ?? 0;
      const short = Math.max(0, need - have);
      if (short > 0) { shortages[k] = short; buyCost += short * RESOURCE_BUY_PRICES[k]; }
    });
    if (buyCost > 0 && !autoBuyResources) {
      showToast(`Insumos insuficientes para o Pátio ${cfg.name}. Ative auto-compra ou compre manualmente.`, 'error');
      sound.playError(); return;
    }
    if (budgetState.currentBudget < cfg.cost + buyCost) {
      showToast(`Orçamento insuficiente para Pátio ${cfg.name} (R$ ${((cfg.cost + buyCost)/1e9).toFixed(0)}B necessários).`, 'error');
      sound.playError(); return;
    }
    setSpentOnResources(prev => prev + cfg.cost + buyCost);
    if (buyCost > 0) {
      setResources(prev => {
        const u = { ...prev };
        (Object.keys(shortages) as (keyof GameResources)[]).forEach(k => { u[k] = (u[k] ?? 0) + (shortages[k] ?? 0); });
        return u;
      });
    }
    setResources(prev => {
      const u = { ...prev };
      (Object.keys(cfg.resources) as (keyof GameResources)[]).forEach(k => { u[k] = Math.max(0, (u[k] ?? 0) - (cfg.resources[k] ?? 0)); });
      return u;
    });
    setWorkers(prev => ({
      terraplanagem: Math.max(0, prev.terraplanagem - (cfg.workers.terraplanagem ?? 0)),
      assentamento: Math.max(0, prev.assentamento - (cfg.workers.assentamento ?? 0)),
      sinalizacao: Math.max(0, prev.sinalizacao - (cfg.workers.sinalizacao ?? 0)),
      explosivos: prev.explosivos,
      manutencao: prev.manutencao,
    }));
    const project: InfraProject = {
      id: `yard_${cityId}_${Date.now()}`,
      cityId,
      type: 'yard',
      yardLevel: level,
      monthsRemaining: cfg.months,
      totalMonths: cfg.months,
      workersAllocated: {
        terraplanagem: cfg.workers.terraplanagem ?? 0,
        assentamento: cfg.workers.assentamento ?? 0,
        sinalizacao: cfg.workers.sinalizacao ?? 0
      },
      resourcesConsumed: { ...cfg.resources } as Partial<GameResources>,
      startedYear: gameYear,
      startedMonth: monthIdx,
      cost: cfg.cost,
    };
    setInfraQueue(prev => [...prev, project]);
    showToast(`🔧 Pátio ${cfg.name} em ${city.name} em construção — ${cfg.months} meses. Cobertura: ${cfg.coverage}km.`, 'success');
    sound.playConnect();
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

    // 1b. City pairs where rail is physically impossible (separated by wide rivers/sea)
    const BALSA_ONLY_PAIRS = new Set([
      '17-18', // Belém–Macapá (foz do Amazonas)
      '17-74', // Belém–Santana AP
      '18-74', // Macapá–Santana
      '16-18', // São Luís–Macapá
    ]);
    const routeKey = [idA, idB].sort().join('-');
    if (BALSA_ONLY_PAIRS.has(routeKey) && constructionType !== 'balsa') {
      sound.playError();
      showToast('🚢 Esta rota cruza a Foz do Amazonas — impossível por ferrovia. Selecione modo Hidrovia (balsa)!', 'error');
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
      const isBuilding = existingEdge.status === 'building';
      if (!isBuilding) {
        const confirmed = window.confirm(`Demolir a ferrovia ${cityA.name} ↔ ${cityB.name}?\n\nVocê receberá reembolso total de materiais e custo. Esta ação não pode ser desfeita.`);
        if (!confirmed) return;
      }
      setEdges((prev) => prev.filter((e) => e.id !== existingEdge.id));
      setSelectedCityId(null);
      sound.playDisconnect();
      if (isBuilding) {
        // Return allocated workers when cancelling a build
        const cancelledProject = constructionQueue.find(p => p.edgeId === existingEdge.id);
        if (cancelledProject?.workersAllocated) {
          setWorkers(prev => ({
            terraplanagem: prev.terraplanagem + cancelledProject.workersAllocated.terraplanagem,
            assentamento:  prev.assentamento  + cancelledProject.workersAllocated.assentamento,
            sinalizacao:   prev.sinalizacao   + cancelledProject.workersAllocated.sinalizacao,
            explosivos:    prev.explosivos    + cancelledProject.workersAllocated.explosivos,
            manutencao:    prev.manutencao,
          }));
        }
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

    const maxDegA = getCityNativeMaxConns(idA) + (upgradedHubs.includes(idA) ? 1 : 0);
    const maxDegB = getCityNativeMaxConns(idB) + (upgradedHubs.includes(idB) ? 1 : 0);

    if (degA >= maxDegA) {
      sound.playError();
      showToast(`A cidade ${cityA.name} já possui ${degA} conexões (limite desta cidade). Upgrades de Terminal Central adicionam +1 slot.`, 'error');
      setSelectedCityId(null);
      return;
    }
    if (degB >= maxDegB) {
      sound.playError();
      showToast(`A cidade ${cityB.name} já possui ${degB} conexões (limite desta cidade). Upgrades de Terminal Central adicionam +1 slot.`, 'error');
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

    // Block construction during political crises
    const activeEffectsList = activeEvents.map(e => e.statusEffect);
    if (activeEffectsList.includes('LOBBY_REGIONAL') || activeEvents.some(e => e.blockConstruction)) {
      sound.playError();
      showToast('🏛️ Crise: Emendas Legislativas bloqueiam novas construções! Resolva a crise primeiro.', 'error');
      setSelectedCityId(null);
      return;
    }
    const isMT = (s: string) => s === 'MT';
    const isGO = (s: string) => s === 'GO';
    if (activeEffectsList.includes('CONFLITO_FUNDIARIO') && (isMT(cityA.state) || isMT(cityB.state) || isGO(cityA.state) || isGO(cityB.state))) {
      sound.playError();
      showToast('🌾 Conflito Fundiário: obras em MT e GO estão bloqueadas judicialmente!', 'error');
      setSelectedCityId(null);
      return;
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
    const isTensaoGeo = activeEffects.includes('TENSAO_GEOPOLITICA');
    const shortages: Partial<GameResources> = {};
    let hasShortage = false;

    Object.keys(reqs).forEach((k) => {
      const key = k as keyof GameResources;
      const short = Math.max(0, reqs[key] - (resources[key] ?? 0));
      if (short > 0) {
        shortages[key] = short;
        hasShortage = true;
        let unitPrice = RESOURCE_BUY_PRICES[key];
        if (key === 'aco' && isHighInflation) unitPrice *= 2.0;
        if (key === 'cobre' && isHighInflation) unitPrice *= 2.0;
        if (key === 'cobre' && isTensaoGeo) unitPrice *= 1.8;
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

    // 6. Safe to build: auto-buy missing resources, then consume all requirements
    if (buyCost > 0) {
      setSpentOnResources(prev => prev + buyCost);
      // Add purchased units to stock first so the ledger is visible in the UI
      setResources(prev => {
        const u = { ...prev };
        (Object.keys(shortages) as (keyof GameResources)[]).forEach(key => {
          u[key] = (u[key] ?? 0) + (shortages[key] ?? 0);
        });
        return u;
      });
      const boughtLines = (Object.entries(shortages) as [keyof GameResources, number][])
        .filter(([, v]) => v > 0)
        .map(([k, v]) => `${v}t ${RESOURCE_NAMES[k]}`)
        .join(', ');
      const fmt = (v: number) => v >= 1e9 ? `R$ ${(v/1e9).toFixed(1)}B` : `R$ ${(v/1e6).toFixed(0)}M`;
      showToast(`🛒 Auto-compra de insumos: ${boughtLines} — ${fmt(buyCost)}`, 'info');
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
    const cimentoShortage = activeEffectsList.includes('ESCASSEZ_CIMENTO');
    const rawMonths = getConstructionMonths(cityA, cityB, distanceVal, constructionType, workers);
    const baseMths = cimentoShortage ? Math.ceil(rawMonths * 1.5) : rawMonths;
    if (cimentoShortage) showToast('🏗️ Escassez de cimento: obra terá duração +50% mais longa!', 'info');
    const slowFactor = activeEvents.reduce((acc, e) => acc * (e.constructionSlowFactor ?? 1.0), 1.0);
    const simultaneousPenalty = getSimultaneousPenalty(constructionQueue.length + 1);
    if (constructionQueue.length >= 1) {
      const pct = Math.round((1 - simultaneousPenalty) * 100);
      showToast(`⚠️ ${constructionQueue.length + 1} obras simultâneas — velocidade desta obra reduzida em ${pct}%`, 'info');
    }
    // Seasonal construction slow for Norte states
    const NORTE_STATES = ['AM', 'PA', 'RO', 'RR', 'AP', 'AC', 'TO'];
    const activeSeasonal = getActiveSeasonalEffects(monthIdx);
    const seasonalSlowFactor = activeSeasonal
      .filter(s => s.constructionSlowFactor && s.states?.some(st => [cityA.state, cityB.state].includes(st)))
      .reduce((acc, s) => acc * (s.constructionSlowFactor ?? 1.0), 1.0);
    if (seasonalSlowFactor > 1.0 && (NORTE_STATES.includes(cityA.state) || NORTE_STATES.includes(cityB.state))) {
      showToast(`🌧️ Chuvas amazônicas: obra no Norte terá duração +${Math.round((seasonalSlowFactor - 1) * 100)}% mais longa`, 'info');
    }
    const months = Math.ceil(baseMths * slowFactor * seasonalSlowFactor / simultaneousPenalty);

    // Allocate workers to the project — they stay dedicated until completion
    const allocated: GameWorkers = {
      terraplanagem: reqWorkers.terraplanagem,
      assentamento:  reqWorkers.assentamento,
      sinalizacao:   reqWorkers.sinalizacao,
      explosivos:    reqWorkers.explosivos,
      manutencao:    0,
    };

    // Deduct allocated workers from the free pool
    setWorkers(prev => ({
      terraplanagem: Math.max(0, prev.terraplanagem - allocated.terraplanagem),
      assentamento:  Math.max(0, prev.assentamento  - allocated.assentamento),
      sinalizacao:   Math.max(0, prev.sinalizacao   - allocated.sinalizacao),
      explosivos:    Math.max(0, prev.explosivos    - allocated.explosivos),
      manutencao:    prev.manutencao,
    }));

    const project: ConstructionProject = {
      edgeId: `${idA}-${idB}`,
      from: idA,
      to: idB,
      distance: distanceVal,
      type: constructionType,
      resourcesConsumed: reqs,
      workersAllocated: allocated,
      totalMonths: months,
      monthsRemaining: months,
      startedYear: gameYear,
      startedMonth: monthIdx,
    };
    setConstructionQueue(prev => [...prev, project]);

    // Show allocation summary
    const workerSummary = Object.entries(allocated)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `${v} ${WORKER_NAMES[k as keyof GameWorkers].split(' ')[0]}`)
      .join(', ');
    showToast(`👷 ${workerSummary} alocados na obra — ficarão indisponíveis por ${months} ${months === 1 ? 'mês' : 'meses'}.`, 'info');

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
        const { distances: nextNearestDistances, nearestYardIds: nextNearestYardIds } = calculateRailwayDistancesFromYards(CITIES, completedEdges, maintenanceYards);
        const unmaintainedCount = completedEdges.filter(edge => {
          const checkCovered = (cityId: string) => {
            const dist = nextNearestDistances[cityId] ?? Infinity;
            const yardId = nextNearestYardIds[cityId];
            if (!yardId) return false;
            const lvl = yardLevels[yardId] ?? 1;
            return dist <= (YARD_COVERAGE_KM[lvl as 1|2|3] ?? 600);
          };
          return !checkCovered(edge.from) && !checkCovered(edge.to);
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
    <>
    {activeCutscene === 'first_rail' && (
      <CutsceneModal
        videoSrc="/cutscene_primeira_ferrovia.mp4"
        icon="🚂"
        title="Primeira Ferrovia Concluída"
        subtitle="Marco Histórico da RENIF"
        description="Sua primeira ferrovia está operando! Este é o ponto de partida de uma malha que vai transformar o Brasil. Cada trilho posto é um passo rumo à integração nacional."
        onFinished={() => setActiveCutscene(null)}
      />
    )}
    {activeCutscene === 'half_network' && (
      <CutsceneModal
        videoSrc="/cutscene_50_porcento.mp4"
        icon="🗺️"
        title="Metade do Brasil Conectada"
        subtitle="50% da Malha Concluída"
        description="Você alcançou um marco extraordinário: metade das cidades do Brasil agora estão ligadas pela malha ferroviária da RENIF. A integração nacional está a meio caminho de se tornar realidade."
        onFinished={() => setActiveCutscene(null)}
      />
    )}
    {!splashDone && <SplashScreen onFinished={() => setSplashDone(true)} />}
    <audio ref={audioRef} src="/soundtrack.mp3" loop preload="auto" />
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
        showRouteColors={showRouteColors}
        onToggleRouteColors={() => setShowRouteColors(v => !v)}
        
        // Tycoon extensions
        upgradedHubs={upgradedHubs}
        onBuildHub={handleBuildHub}
        maintenanceYards={maintenanceYards}
        onBuildYard={handleBuildYard}
        infraQueue={infraQueue}
        yardLevels={yardLevels}
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
        onImportSave={handleImportSave}
        onDoubleTrack={handleDoubleTrack}
        onUpgradeTrainLevel={handleUpgradeTrainLevel}
        onPassengerUpgrade={handlePassengerUpgrade}
        expiredMissions={expiredMissions}
        completedMissions={completedMissions}
        saveSlot={saveSlot}
        onSaveSlotChange={setSaveSlot}
        slotDates={slotDates}
        missionResults={missionResults}
        newsItems={newsItems}
        onFlyToRegion={(lat, lng) => setFlyToSignal({ lat, lng, timestamp: Date.now() })}
        mobileExpanded={mobileExpanded}
        onMobileExpandedChange={setMobileExpanded}
      />

      {/* FAB — mobile only — fixed in root stacking context so it's never covered by popups */}
      {!mobileExpanded && (
        <button
          onClick={() => setMobileExpanded(true)}
          className="md:hidden fixed bottom-5 left-4 z-[9990] w-12 h-12 rounded-full bg-amber-500 text-slate-950 shadow-xl flex items-center justify-center text-xl font-black border-2 border-amber-300 active:scale-95 transition-transform"
          title="Abrir painel"
        >
          ☰
        </button>
      )}

      {/* 3. Primary Leaflet Map Container */}
      <main className="flex-1 h-[60vh] md:h-full relative overflow-hidden">

        {/* Floating Map Format / Style Selector widget — hidden on mobile portrait, visible md+ */}
        <div className="hidden md:flex absolute top-4 right-4 z-50 bg-slate-900/95 backdrop-blur-md p-1 px-1.5 rounded-xl border border-slate-800 shadow-2xl items-center gap-1.5 transition-all">
          <div className="px-1 text-[10px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Mapa:</span>
          </div>
          <div className="flex gap-1">
            {(['voyager', 'positron', 'dark', 'satellite', 'terrain'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setTileLayerType(type)}
                className={`px-2 py-1.5 rounded-lg text-[9.5px] font-bold uppercase transition-all tracking-wider ${
                  tileLayerType === type
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {type === 'voyager' ? 'Voyager' : type === 'positron' ? 'Claro' : type === 'dark' ? 'Escuro' : type === 'satellite' ? 'Satélite' : 'Relevo'}
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
          const TRAIN_LVL_MULT: Record<1|2|3, number> = { 1: 1.0, 2: 1.25, 3: 1.60 };
          const cityMonthlyRevenue = cityEdges.reduce((s, e) => {
            const base = Math.round(e.distance * (e.type === 'balsa' ? 40000 : 80000));
            const otherCityId = e.from === selectedCity.id ? e.to : e.from;
            const otherCity = CITIES.find(c => c.id === otherCityId);
            const multA = getCityTypeRevenueMultiplier(selectedCity.type);
            const multB = otherCity ? getCityTypeRevenueMultiplier(otherCity.type) : 1.0;
            const doubledMult = e.doubled ? 1.5 : 1.0;
            const trainMult = TRAIN_LVL_MULT[(e.trainLevel ?? 1) as 1|2|3];
            const passengerBonus = e.passenger ? ((selectedCity.type === 'capital' || selectedCity.type === 'polo_industrial' || otherCity?.type === 'capital' || otherCity?.type === 'polo_industrial') ? 1.4 : 1.15) : 1.0;
            const hubBonus = upgradedHubs.includes(e.from) && upgradedHubs.includes(e.to) ? 1.40 : (upgradedHubs.includes(e.from) || upgradedHubs.includes(e.to)) ? 1.20 : 1.0;
            const demandMult = getDemandGrowthMultiplier(gameYear);
            return s + Math.round(base * (multA + multB) / 2 * doubledMult * trainMult * passengerBonus * hubBonus * demandMult);
          }, 0);
          const mDist = nearestYardDistances[selectedCity.id];
          const nearestYardId = nearestYardIds[selectedCity.id];
          const nearestYardLevel = nearestYardId ? (yardLevels[nearestYardId] ?? 1) : 1;
          const yardCoverage = YARD_COVERAGE_KM[nearestYardLevel as 1|2|3] ?? 600;
          const maintOk = mDist !== undefined && mDist !== Infinity && mDist <= yardCoverage;
          const fmt = (v: number) => v >= 1e12 ? `${(v/1e12).toFixed(1)}T` : v >= 1e9 ? `${(v/1e9).toFixed(1)}B` : `${(v/1e6).toFixed(0)}M`;

          return (
            <div className="fixed bottom-0 left-0 right-0 max-h-[55vh] overflow-y-auto rounded-t-2xl md:absolute md:bottom-auto md:top-4 md:left-4 md:right-auto md:rounded-xl md:max-h-none md:overflow-visible md:w-[480px] bg-slate-900 md:bg-slate-900/97 backdrop-blur-md border border-slate-700 px-4 py-3.5 shadow-2xl z-50 flex flex-col gap-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Train className="w-4 h-4 text-amber-500 shrink-0" />
                  <div>
                    <p className="text-xs font-extrabold text-amber-400">{selectedCity.name} — {selectedCity.state}</p>
                    <p className="text-[10px] text-slate-400">
                      {selectedCity.portType === 'maritime' ? '⚓ Porto Marítimo' : selectedCity.portType === 'fluvial' ? '🚢 Porto Fluvial' : selectedCity.type === 'capital' ? '★ Capital Estadual' : selectedCity.type === 'mineracao' ? '⛏️ Polo de Mineração (+40% receita)' : selectedCity.type === 'polo_industrial' ? '🏭 Polo Industrial (+25% receita)' : selectedCity.type === 'polo_agricola' ? '🌾 Polo Agrícola (+20% receita)' : selectedCity.type === 'fronteira' ? '🌐 Cidade de Fronteira (+15% receita)' : '● Cidade Central'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="text-right">
                    <span className="text-[8.5px] text-slate-600">
                      {(() => {
                        const nat = getCityNativeMaxConns(selectedCity.id);
                        const tot = nat + (isUpgraded ? 1 : 0);
                        const cur = edges.filter(e => e.from === selectedCity.id || e.to === selectedCity.id).length;
                        return `${cur}/${tot} conexões${isUpgraded ? ' (hub)' : ''}`;
                      })()}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedCityId(null)}
                    className="w-7 h-7 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white flex items-center justify-center text-sm font-black transition shrink-0"
                    title="Fechar"
                  >✕</button>
                </div>
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

              {/* Routes list — sorted by revenue with mini bars */}
              {cityEdges.length > 0 && (() => {
                const routesWithRev = cityEdges.map(e => {
                  const otherId = e.from === selectedCity.id ? e.to : e.from;
                  const other = CITIES.find(c => c.id === otherId);
                  const base = Math.round(e.distance * (e.type === 'balsa' ? 40000 : 80000));
                  const multA = getCityTypeRevenueMultiplier(selectedCity.type);
                  const multB = other ? getCityTypeRevenueMultiplier(other.type) : 1.0;
                  const hubBonus = upgradedHubs.includes(e.from) && upgradedHubs.includes(e.to) ? 1.40 : (upgradedHubs.includes(e.from) || upgradedHubs.includes(e.to)) ? 1.20 : 1.0;
                  const demandMult = getDemandGrowthMultiplier(gameYear);
                  const edgeRevenue = Math.round(base * (multA + multB) / 2 * hubBonus * demandMult);
                  return { e, other, edgeRevenue };
                }).sort((a, b) => b.edgeRevenue - a.edgeRevenue);
                const maxRev = routesWithRev[0]?.edgeRevenue ?? 1;
                return (
                  <div className="bg-slate-950/50 rounded-lg border border-slate-800 overflow-hidden">
                    <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-widest px-2.5 pt-2 pb-1">
                      📊 Rotas Ativas — por receita
                    </p>
                    <div className="divide-y divide-slate-900 max-h-36 overflow-y-auto">
                      {routesWithRev.map(({ e, other, edgeRevenue }, idx) => {
                        const barPct = Math.round((edgeRevenue / maxRev) * 100);
                        const upgradeBadges = [
                          e.doubled && '⊟',
                          e.trainLevel && e.trainLevel > 1 && `L${e.trainLevel}`,
                          e.passenger && '🚆',
                        ].filter(Boolean).join(' ');
                        return (
                          <div key={e.id} className="px-2.5 py-1.5 text-[9px]">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-slate-300 font-medium">
                                {idx === 0 && <span className="text-amber-400 mr-0.5">★</span>}
                                {e.type === 'balsa' ? '🚢' : '🚂'} {other?.name ?? e.to}{' '}
                                <span className="text-slate-600">({e.distance.toFixed(0)} km)</span>
                                {upgradeBadges && <span className="ml-1 text-amber-400">{upgradeBadges}</span>}
                              </span>
                              <span className="text-sky-400 font-bold shrink-0 ml-1">+R$ {fmt(edgeRevenue)}/mês</span>
                            </div>
                            <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
                              <div className="h-full bg-sky-600 rounded-full" style={{ width: `${barPct}%` }} />
                            </div>
                            {e.type !== 'balsa' && (
                              <div className="flex gap-1 mt-1">
                                {!e.doubled && <button onClick={() => handleDoubleTrack(e.id)} className="px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-700/40 text-amber-400 text-[8px] hover:bg-amber-900/60">⊟ Bitola Dupla R$20B</button>}
                                {(e.trainLevel ?? 1) < 3 && <button onClick={() => handleUpgradeTrainLevel(e.id)} className="px-1.5 py-0.5 rounded bg-sky-950/60 border border-sky-700/40 text-sky-400 text-[8px] hover:bg-sky-900/60">🚄 Nível {(e.trainLevel ?? 1)+1} R${(e.trainLevel ?? 1) === 1 ? '15' : '30'}B</button>}
                                {!e.passenger && <button onClick={() => handlePassengerUpgrade(e.id)} className="px-1.5 py-0.5 rounded bg-pink-950/60 border border-pink-700/40 text-pink-400 text-[8px] hover:bg-pink-900/60">🚆 Passageiros R$25B</button>}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Nearest unconnected cities suggestion */}
              {(() => {
                const nativeMax = getCityNativeMaxConns(selectedCity.id);
                const maxConnsTotal = nativeMax + (isUpgraded ? 1 : 0);
                const currentConns = edges.filter(e => e.from === selectedCity.id || e.to === selectedCity.id).length;
                if (currentConns >= maxConnsTotal) return null;
                const connectedIds = new Set([selectedCity.id, ...edges.filter(e => e.from === selectedCity.id || e.to === selectedCity.id).map(e => e.from === selectedCity.id ? e.to : e.from)]);
                const unconnected = CITIES
                  .filter(c => !connectedIds.has(c.id))
                  .map(c => ({ city: c, dist: Math.sqrt((c.lat - selectedCity.lat)**2 + (c.lng - selectedCity.lng)**2) }))
                  .sort((a,b) => a.dist - b.dist)
                  .slice(0, 3);
                if (unconnected.length === 0) return null;
                return (
                  <div className="bg-slate-950/40 rounded-lg border border-slate-800/60 p-2">
                    <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-widest mb-1.5">Conexões Sugeridas ({currentConns}/{maxConnsTotal})</p>
                    <div className="flex flex-col gap-1">
                      {unconnected.map(({ city: c, dist }) => {
                        const approxKm = Math.round(dist * 111);
                        return (
                          <div key={c.id} className="flex items-center justify-between text-[9px]">
                            <span className="text-slate-400">{c.name} ({c.state})</span>
                            <span className="text-slate-600">~{approxKm} km</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 border-t border-slate-800/60 pt-2">
                <button
                  onClick={() => handleBuildHub(selectedCity.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10.5px] font-bold transition-all shadow-sm ${
                    isUpgraded ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                    : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700/80'
                  }`}
                >
                  <Star className={`w-3 h-3 ${isUpgraded ? 'fill-amber-400 text-amber-400' : ''}`} />
                  {isUpgraded ? '★ Central Hub Ativo' : '★ Terminal Central (R$ 30B)'}
                </button>
                <button
                  onClick={() => handleBuildYard(selectedCity.id, 1)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10.5px] font-bold transition-all shadow-sm ${
                    hasYard ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                    : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700/80'
                  }`}
                >
                  <Wrench className="w-3 h-3 text-emerald-400" />
                  {hasYard ? '🔧 Pátio Ativo' : '🔧 Pátio Manutenção (R$ 15B)'}
                </button>
                {(() => {
                  const hasWarehouse = warehouses.includes(selectedCity.id);
                  const buildingWarehouse = infraQueue.some(p => p.cityId === selectedCity.id && p.type === 'warehouse');
                  return (
                    <button
                      onClick={() => handleBuildWarehouse(selectedCity.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10.5px] font-bold transition-all shadow-sm ${
                        hasWarehouse ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 hover:bg-sky-500/30'
                        : buildingWarehouse ? 'bg-slate-700/60 text-slate-400 border border-slate-600'
                        : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700/80'
                      }`}
                    >
                      {hasWarehouse ? '🏭 Armazém Ativo (+R$500M/mês)' : buildingWarehouse ? '🏭 Armazém em construção…' : '🏭 Armazém Geral (R$ 8B)'}
                    </button>
                  );
                })()}
                {selectedCity.type === 'polo_agricola' && (() => {
                  const hasSilo = silos.includes(selectedCity.id);
                  const buildingSilo = infraQueue.some(p => p.cityId === selectedCity.id && p.type === 'silo');
                  return (
                    <button
                      onClick={() => handleBuildSilo(selectedCity.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10.5px] font-bold transition-all shadow-sm ${
                        hasSilo ? 'bg-green-500/20 text-green-300 border border-green-500/40 hover:bg-green-500/30'
                        : buildingSilo ? 'bg-slate-700/60 text-slate-400 border border-slate-600'
                        : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700/80'
                      }`}
                    >
                      {hasSilo ? '🌾 Silo Ativo (+30% receita rotas)' : buildingSilo ? '🌾 Silo em construção…' : '🌾 Silo Graneleiro (R$ 12B)'}
                    </button>
                  );
                })()}
              </div>
              {/* Per-edge upgrade actions */}
              {cityEdges.length > 0 && (
                <div className="flex flex-col gap-1.5 border-t border-slate-800/60 pt-2">
                  <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-widest">Upgrades de Rota:</p>
                  {cityEdges.map(e => (
                    <div key={e.id} className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-[9px] text-slate-400 min-w-0 truncate flex-1">{e.type === 'balsa' ? '🚢' : '🚂'} {CITIES.find(c => c.id === (e.from === selectedCity.id ? e.to : e.from))?.name}</span>
                      <button
                        onClick={() => handleDoubleTrack(e.id)}
                        disabled={!!e.doubled}
                        className={`px-2 py-1 rounded text-[8.5px] font-bold border transition cursor-pointer disabled:opacity-40 ${e.doubled ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-amber-500/10 hover:text-amber-300'}`}
                      >
                        {e.doubled ? '⊟ Dupla' : '⊟ Bitola Dupla (R$20B)'}
                      </button>
                      <button
                        onClick={() => handleUpgradeTrainLevel(e.id)}
                        disabled={(e.trainLevel ?? 1) >= 3}
                        className="px-2 py-1 rounded text-[8.5px] font-bold border bg-slate-800 text-slate-300 border-slate-700 hover:bg-sky-500/10 hover:text-sky-300 transition cursor-pointer disabled:opacity-40"
                      >
                        {(e.trainLevel ?? 1) >= 3 ? '🚄 Nível Máx.' : `🚄 Nível ${e.trainLevel ?? 1}→${(e.trainLevel ?? 1) + 1} (R$${(e.trainLevel ?? 1) === 1 ? '15' : '30'}B)`}
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
          onSelectCity={(id) => { setSelectedCityId(id); if (id) advanceTutorialOnAction('click_city'); }}
          onHoverCity={setHoveredCityId}
          onConnectCities={handleConnectCities}
          tileLayerType={tileLayerType}
          flyToSignal={flyToSignal}
          showSuggestions={showSuggestions}
          upgradedHubs={upgradedHubs}
          maintenanceYards={maintenanceYards}
          warehouses={warehouses}
          silos={silos}
          nearestYardDistances={nearestYardDistances}
          constructionQueue={constructionQueue}
          activeEvents={activeEvents}
          routeRevenueMap={routeRevenueMap}
          showRouteColors={showRouteColors}
        />
      </main>

      {/* --- Toasts Stacks HUD Overlay --- */}
      <div className="fixed top-4 right-4 z-[9998] flex flex-col gap-1.5 max-w-[280px] md:max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-3 py-2 rounded-lg border text-[11px] font-medium shadow-xl flex items-center gap-2 transition-all duration-300 pointer-events-auto ${
              toast.type === 'success'
                ? 'bg-emerald-950/97 border-emerald-600/60 text-emerald-200'
                : toast.type === 'error'
                  ? 'bg-rose-950/97 border-rose-600/60 text-rose-200'
                  : 'bg-slate-900/97 border-slate-600/60 text-slate-200'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
            {toast.type === 'error' && <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
            {toast.type === 'info' && <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
            <span className="leading-snug">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* --- TUTORIAL MODAL --- */}
      {!tutorialDone && !welcomeOpen && !hasSaveGame && splashDone && (
        <TutorialModal
          steps={TUTORIAL_STEPS}
          currentIndex={tutorialStep}
          waitingForAction={tutorialWaitForAction !== null}
          onNext={() => setTutorialStep(prev => Math.min(prev + 1, TUTORIAL_STEPS.length - 1))}
          onFinish={handleFinishTutorial}
        />
      )}

      {/* --- PAUSE SCREEN --- */}
      {playSpeed === 'paused' && !welcomeOpen && !victoryOpen && !gameOverOpen && (
        <PauseScreen
          gameYear={gameYear}
          monthIdx={monthIdx}
          connectionsCount={edges.filter(e => e.status !== 'building').length}
          totalDistanceKm={edges.filter(e => e.status !== 'building').reduce((a, e) => a + e.distance, 0)}
          currentBudget={budgetState.currentBudget}
          monthlyRevenue={budgetState.monthlyRevenue ?? 0}
          totalRevenue={totalRevenue}
          maintenanceYardsCount={maintenanceYards.length}
          upgradedHubsCount={upgradedHubs.length}
          constructionQueueCount={constructionQueue.length}
          onResume={() => setPlaySpeed('normal')}
        />
      )}

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
                    {currentEvent.statusEffect === 'GREVE_GERAL' && 'Trilhos +25% mais caros. Multa mensal de R$3B até resolução.'}
                    {currentEvent.statusEffect === 'ATRASO_AMBIENTAL_AMAZONIA' && 'Obras no Norte: +50% em aço/cimento. Multa mensal R$2B.'}
                    {currentEvent.statusEffect === 'INFLACAO_GLOBAL' && 'Aço e Cobre dobram de preço no mercado. Resolução antecipada disponível.'}
                    {currentEvent.statusEffect === 'ESCASSES_MADEIRA' && 'Consumo de Madeira ×1.8 em toda a malha. Multa mensal R$1.5B.'}
                    {currentEvent.statusEffect === 'LOBBY_REGIONAL' && '🚫 TODAS as novas obras bloqueadas! Multa mensal R$2B.'}
                    {currentEvent.statusEffect === 'AUDITORIA_CGU' && 'R$5B descontados do caixa a cada mês durante a auditoria.'}
                    {currentEvent.statusEffect === 'ACIDENTE_OBRA' && '80 especialistas em Explosivos afastados + R$8B de indenização automática.'}
                    {currentEvent.statusEffect === 'SECA_TOCANTINS' && 'Receita de TODAS as rotas de balsa = R$0 durante a seca.'}
                    {currentEvent.statusEffect === 'CYBER_ATAQUE' && '💻 Receita mensal ZERADA enquanto os sistemas estiverem offline.'}
                    {currentEvent.statusEffect === 'TENSAO_GEOPOLITICA' && 'Preço do Cobre +80% no mercado internacional.'}
                    {currentEvent.statusEffect === 'ESCASSEZ_CIMENTO' && 'Duração de todas as obras +50% (menos cimento disponível por mês).'}
                    {currentEvent.statusEffect === 'CONFLITO_FUNDIARIO' && '🚫 Obras em MT e GO bloqueadas judicialmente. Multa mensal R$1.5B.'}
                    {!['GREVE_GERAL','ATRASO_AMBIENTAL_AMAZONIA','INFLACAO_GLOBAL','ESCASSES_MADEIRA','LOBBY_REGIONAL','AUDITORIA_CGU','ACIDENTE_OBRA','SECA_TOCANTINS','CYBER_ATAQUE','TENSAO_GEOPOLITICA','ESCASSEZ_CIMENTO','CONFLITO_FUNDIARIO'].includes(currentEvent.statusEffect) && currentEvent.description}
                  </p>
                  {currentEvent.revenueMultiplier !== undefined && currentEvent.revenueMultiplier < 1 && (
                    <p className="text-[10px] text-red-400 font-bold mt-1">
                      📉 Receita -{Math.round((1 - currentEvent.revenueMultiplier) * 100)}% durante a crise
                    </p>
                  )}
                  {currentEvent.constructionSlowFactor !== undefined && currentEvent.constructionSlowFactor > 1 && (
                    <p className="text-[10px] text-red-400 font-bold mt-1">
                      🐢 Obras +{Math.round((currentEvent.constructionSlowFactor - 1) * 100)}% mais lentas
                    </p>
                  )}
                  {currentEvent.balsaFrozen && (
                    <p className="text-[10px] text-red-400 font-bold mt-1">
                      ⛵ Receita de todas as balsas = R$0
                    </p>
                  )}
                  {currentEvent.blockConstruction && (
                    <p className="text-[10px] text-red-400 font-bold mt-1">
                      🚫 Novas obras bloqueadas durante a crise
                    </p>
                  )}
                  {currentEvent.costPerMonth && (
                    <p className="text-[10px] text-red-400 font-bold mt-1.5">
                      💸 Multa automática: R$ {(currentEvent.costPerMonth / 1_000_000_000).toFixed(1)}B/mês debitados do caixa
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                {currentEvent.costToResolve != null && currentEvent.costToResolve > 0 && (
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
                    <span>💸 Pagar Mitigação Imediata</span>
                    <span className="text-emerald-400 font-black">R$ {(currentEvent.costToResolve! / 1_000_000_000).toFixed(0)}B</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    // Accept and absorb the crisis
                    const ev = currentEvent;
                    setActiveEvents(prev => [...prev, ev]);
                    // Accident: immediately remove workers
                    if (ev.workerLoss) {
                      const { role, amount } = ev.workerLoss;
                      setWorkers(prev => ({ ...prev, [role]: Math.max(0, (prev[role] ?? 0) - amount) }));
                      setSpentOnWorkers(prev => prev + 8_000_000_000); // R$8B indenização automática
                      showToast(`☠️ Acidente: ${amount} trabalhadores de ${WORKER_NAMES[role]} afastados + R$8B de indenização debitados!`, 'error');
                    }
                    showToast(`Crise absorvida: ${ev.title} ativo por ${ev.durationMonths} meses!`, 'info');
                    const ym = `${gameYear}/${String(monthIdx + 1).padStart(2, '0')}`;
                    setNewsItems(prev => [newsCrisis(ev, ym), ...prev].slice(0, 60));
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
    </>
  );
}
