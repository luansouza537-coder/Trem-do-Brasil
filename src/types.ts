export interface City {
  id: string;
  name: string;
  state: string;
  lat: number;
  lng: number;
  type: 'capital' | 'cidade';
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
  totalMonths: number;
  monthsRemaining: number;
  startedYear: number;
  startedMonth: number;
}

export interface GameEvent {
  id: string;
  title: string;
  description: string;
  type: 'strike' | 'env_delay' | 'politics' | 'crisis' | 'natural';
  statusEffect: string;
  costToResolve?: number;
  durationMonths: number;
  monthsLeft: number;
  resolved?: boolean;
}
