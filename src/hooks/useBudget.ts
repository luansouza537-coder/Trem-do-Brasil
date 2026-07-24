import { useState, useMemo, useEffect, useRef, Dispatch, SetStateAction } from 'react';
import { Edge, GameEvent, GameWorkers } from '../types';
import { FundGrant, getTrackCostDetail, getIntermodalGrants, getMonthlyRevenue, getPassengerMonthlyRevenue, getActiveSeasonalEffects, WAREHOUSE_CONFIG } from '../utils/gameRules';
import { CITIES, CITY_MAP } from '../data/cities';

export const STARTING_BUDGET = 1_250_000_000_000;

export interface BudgetState {
  totalSpent: number;
  spentRail: number;
  spentBalsa: number;
  spentYards: number;
  spentHubs: number;
  grantIncome: number;
  currentBudget: number;
  unlockedGrants: FundGrant[];
  spentOnWorkers: number;
  spentOnResources: number;
  totalRevenue: number;
  monthlyRevenue: number;
}

interface UseBudgetDeps {
  edges: Edge[];
  workers: GameWorkers;
  activeEvents: GameEvent[];
  maintenanceYards: string[];
  upgradedHubs: string[];
  warehouses: string[];
  silos: string[];
  gameYear: number;
  monthIdx: number;
  welcomeOpen: boolean;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

interface UseBudgetReturn {
  spentOnResources: number;
  setSpentOnResources: Dispatch<SetStateAction<number>>;
  spentOnWorkers: number;
  setSpentOnWorkers: Dispatch<SetStateAction<number>>;
  totalRevenue: number;
  setTotalRevenue: Dispatch<SetStateAction<number>>;
  budgetState: BudgetState;
  budgetHistory: { label: string; budget: number }[];
  setBudgetHistory: Dispatch<SetStateAction<{ label: string; budget: number }[]>>;
}

export function useBudget({
  edges,
  workers,
  activeEvents,
  maintenanceYards,
  upgradedHubs,
  warehouses,
  silos,
  gameYear,
  monthIdx,
  welcomeOpen,
  showToast,
}: UseBudgetDeps): UseBudgetReturn {
  const [spentOnResources, setSpentOnResources] = useState(0);
  const [spentOnWorkers, setSpentOnWorkers] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [budgetHistory, setBudgetHistory] = useState<{ label: string; budget: number }[]>([]);

  const lowBudgetAlertedRef = useRef(false);

  const intermodalGrants = useMemo(() => getIntermodalGrants(CITIES, edges), [edges]);

  const budgetState = useMemo((): BudgetState => {
    let spentRail = 0;
    let spentBalsa = 0;
    edges.forEach(edge => {
      // Use costPaid (inflation-adjusted) when available; fall back to base cost for
      // edges created before this field existed (e.g. loaded from old saves).
      const paid = edge.costPaid;
      if (paid !== undefined) {
        if (edge.type === 'balsa') spentBalsa += paid;
        else spentRail += paid;
      } else {
        const cityA = CITY_MAP.get(edge.from);
        const cityB = CITY_MAP.get(edge.to);
        if (cityA && cityB) {
          if (edge.type === 'balsa') {
            spentBalsa += Math.round(edge.distance * 12_000_000);
          } else {
            spentRail += getTrackCostDetail(cityA, cityB, edge.distance).totalCost;
          }
        }
      }
    });

    const grantIncome = intermodalGrants.filter(g => g.unlocked).reduce((sum, g) => sum + g.value, 0);
    const totalSpent = spentRail + spentBalsa + spentOnResources + spentOnWorkers;
    const currentBudget = STARTING_BUDGET - totalSpent + grantIncome + totalRevenue;

    const activeEffectsForDisplay = activeEvents.map(e => e.statusEffect);
    const seasonalRevForDisplay = getActiveSeasonalEffects(monthIdx).reduce((acc, s) => acc * (s.revenueFactor ?? 1.0), 1.0);
    const balsaFrozenForDisplay = activeEvents.some(e => e.balsaFrozen);
    const warehouseBonusDisplay = warehouses.length * WAREHOUSE_CONFIG.monthlyBonus;
    const cyberAttackDisplay = activeEffectsForDisplay.includes('CYBER_ATAQUE');
    const compoundRevMultDisplay = Math.max(0, Math.min(2.0,
      activeEvents.reduce((acc, e) => acc * (e.revenueMultiplier ?? 1.0), 1.0)
    ));
    const cargoRevDisplay = cyberAttackDisplay ? 0 : Math.round(
      getMonthlyRevenue(edges, workers, activeEffectsForDisplay, CITIES, balsaFrozenForDisplay, gameYear, upgradedHubs, silos)
      * compoundRevMultDisplay * seasonalRevForDisplay
    );
    const passengerRevDisplay = cyberAttackDisplay ? 0 : getPassengerMonthlyRevenue(edges, CITIES, gameYear, activeEffectsForDisplay);
    const monthlyRevenue = cargoRevDisplay + passengerRevDisplay + warehouseBonusDisplay;

    return {
      totalSpent,
      spentRail,
      spentBalsa,
      spentYards: 0,
      spentHubs: 0,
      grantIncome,
      currentBudget,
      unlockedGrants: intermodalGrants,
      spentOnWorkers,
      spentOnResources,
      totalRevenue,
      monthlyRevenue,
    };
  }, [edges, upgradedHubs, spentOnResources, spentOnWorkers, intermodalGrants, totalRevenue, gameYear, workers, activeEvents, monthIdx, warehouses, silos]);

  // Record budget snapshot each time it changes
  useEffect(() => {
    setBudgetHistory(prev => [
      ...prev.slice(-23),
      { label: `${gameYear}/${String(monthIdx + 1).padStart(2, '0')}`, budget: budgetState.currentBudget },
    ]);
    // intentionally omit gameYear/monthIdx — snapshot fires when budget changes, label is current at that time
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budgetState.currentBudget]);

  // Critically low budget alert
  useEffect(() => {
    if (welcomeOpen) return;
    const pct = budgetState.currentBudget / STARTING_BUDGET;
    if (pct < 0.08 && budgetState.currentBudget > 0 && !lowBudgetAlertedRef.current) {
      lowBudgetAlertedRef.current = true;
      showToast('🚨 ALERTA CRÍTICO: Caixa abaixo de 8% do orçamento inicial! Reduza gastos urgentemente.', 'error');
    } else if (pct >= 0.15) {
      lowBudgetAlertedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budgetState.currentBudget, welcomeOpen]);

  return {
    spentOnResources,
    setSpentOnResources,
    spentOnWorkers,
    setSpentOnWorkers,
    totalRevenue,
    setTotalRevenue,
    budgetState,
    budgetHistory,
    setBudgetHistory,
  };
}
