export interface City {
  id: string;
  name: string;
  state: string;
  lat: number;
  lng: number;
  type: 'capital' | 'cidade' | 'mineracao' | 'fronteira' | 'polo_agricola' | 'polo_industrial';
  portType?: 'maritime' | 'fluvial';
}

export interface Edge {
  id: string;
  from: string;
  to: string;
  distance: number;
  type?: 'rail' | 'balsa';
  resourcesConsumed?: GameResources;
  status?: 'complete' | 'building';
}

export interface GameStats {
  connectionsCount: number;
  totalDistance: number;
  isComplete: boolean;
  hasErrors: boolean;
}

export interface GameResources {
  aco: number;
  brita: number;
  madeira: number;
  cimento: number;
  cobre: number;
  explosivos: number;
}

export interface GameWorkers {
  terraplanagem: number;
  assentamento: number;
  sinalizacao: number;
  explosivos: number;
  manutencao: number;
}

export interface ConstructionProject {
  edgeId: string;
  from: string;
  to: string;
  distance: number;
  type: 'rail' | 'balsa';
  resourcesConsumed: GameResources;
  workersAllocated: GameWorkers;
  totalMonths: number;
  monthsRemaining: number;
  startedYear: number;
  startedMonth: number;
}

export interface NewsItem {
  id: string;
  headline: string;
  yearMonth: string;
  category: 'infra' | 'economy' | 'crisis' | 'grant' | 'mission';
}

export interface GameEvent {
  id: string;
  title: string;
  description: string;
  type: 'strike' | 'env_delay' | 'politics' | 'crisis' | 'natural' | 'cyber' | 'accident' | 'positive' | 'neutral';
  statusEffect: string;
  costToResolve?: number;
  costPerMonth?: number;
  workerLoss?: { role: keyof GameWorkers; amount: number };
  durationMonths: number;
  monthsLeft: number;
  resolved?: boolean;
  revenueMultiplier?: number;
  monthlyBonus?: number;
  resourceMultipliers?: Partial<Record<keyof GameResources, number>>;
  constructionSlowFactor?: number;
  balsaFrozen?: boolean;
  blockConstruction?: boolean;
  payrollMultiplier?: number;
}

export type PoliticalParty = 'PL' | 'PS' | 'PB';
