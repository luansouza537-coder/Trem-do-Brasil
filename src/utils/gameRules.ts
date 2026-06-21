import { City, Edge, GameResources, GameWorkers } from '../types';

export const RESOURCE_BUY_PRICES: Record<keyof GameResources, number> = {
  aco: 6000000,        // R$ 6.000.000 por ton
  brita: 1500000,      // R$ 1.500.000 por ton
  madeira: 2500050,    // R$ 2.500.050 por ton
  cimento: 3500000,    // R$ 3.500.000 por ton
  cobre: 10000000,     // R$ 10.000.000 por ton
  explosivos: 20000100 // R$ 20.000.100 por ton
};

export const RESOURCE_NAMES: Record<keyof GameResources, string> = {
  aco: 'Aço',
  brita: 'Brita',
  madeira: 'Madeira',
  cimento: 'Cimento',
  cobre: 'Cobre',
  explosivos: 'Explosivos'
};

/**
 * Calculates resource requirements per kilometer for a rail stretch based on terrain and construction types.
 */
export function getTrackResourcesRequired(
  cityA: City,
  cityB: City,
  distance: number,
  type: 'rail' | 'balsa',
  activeCrisisEffects: string[] = []
): GameResources {
  const isNorth = (state: string) => ['AM', 'PA', 'RO', 'RR', 'AP', 'AC', 'TO'].includes(state);
  const isPantanal = (state: string) => ['MS', 'MT'].includes(state);

  // Base tons per KM
  let baseAco = 2.0;       // tons/km
  let baseBrita = 4.0;     // tons/km
  let baseMadeira = 1.5;   // tons/km
  let baseCimento = 2.0;   // tons/km
  let baseCobre = 0.5;     // tons/km
  let baseExplosivos = 0;  // tons/km

  if (type === 'balsa') {
    // Dock structures on both sides
    baseAco = 1.0;
    baseBrita = 0.5;
    baseMadeira = 1.0;
    baseCimento = 1.0;
    baseCobre = 0.2;
    baseExplosivos = 0;
  } else {
    // Region and terrain variations
    if (isNorth(cityA.state) || isNorth(cityB.state)) {
      baseMadeira *= 2.2; // Extra sleepers etc in forest / wet crossings
      baseAco *= 1.4;
    } else if (isPantanal(cityA.state) || isPantanal(cityB.state)) {
      baseCimento *= 2.5; // High concrete foundation needs for marshes
      baseBrita *= 1.8;
      baseMadeira *= 1.4;
    } else if (
      (cityA.portType === 'maritime' && cityB.portType !== 'maritime') ||
      (cityB.portType === 'maritime' && cityA.portType !== 'maritime')
    ) {
      baseExplosivos = 1.0; // Needs massive blasting for steep mountain passes
      baseAco *= 1.8;       // Retaining reinforcements
      baseCobre *= 2.0;
    } else if (cityA.portType === 'fluvial' && cityB.portType === 'fluvial') {
      baseMadeira *= 1.5;
      baseCimento *= 1.6;
    }
  }

  // Raw requirements based on Euclidean/Haversine distance
  const reqs: GameResources = {
    aco: Math.ceil(distance * baseAco),
    brita: Math.ceil(distance * baseBrita),
    madeira: Math.ceil(distance * baseMadeira),
    cimento: Math.ceil(distance * baseCimento),
    cobre: Math.ceil(distance * baseCobre),
    explosivos: Math.ceil(distance * baseExplosivos),
  };

  // Multiply based on temporary crisis / events
  if (activeCrisisEffects.includes('ESCASSES_MADEIRA')) {
    reqs.madeira = Math.ceil(reqs.madeira * 1.8);
  }
  if (activeCrisisEffects.includes('ATRASO_AMBIENTAL_AMAZONIA')) {
    reqs.aco = Math.ceil(reqs.aco * 1.5);
    reqs.cimento = Math.ceil(reqs.cimento * 1.5);
  }
  if (activeCrisisEffects.includes('CRISE_EXPLOSIVOS')) {
    reqs.explosivos = Math.ceil(reqs.explosivos * 2.0);
  }

  return reqs;
}

export const WORKER_SALARIES: Record<keyof GameWorkers, number> = {
  terraplanagem: 4_500_000,
  assentamento:  5_500_000,
  sinalizacao:   7_000_000,
  explosivos:    12_000_000,
  manutencao:    4_000_000,
};

// Onboarding cost = 3× monthly salary per worker type
export const WORKER_HIRE_COST: Record<keyof GameWorkers, number> = {
  terraplanagem: 4_500_000 * 3,
  assentamento:  5_500_000 * 3,
  sinalizacao:   7_000_000 * 3,
  explosivos:    12_000_000 * 3,
  manutencao:    4_000_000 * 3,
};

// Severance = 2× monthly salary per worker type
export const WORKER_SEVERANCE: Record<keyof GameWorkers, number> = {
  terraplanagem: 4_500_000 * 2,
  assentamento:  5_500_000 * 2,
  sinalizacao:   7_000_000 * 2,
  explosivos:    12_000_000 * 2,
  manutencao:    4_000_000 * 2,
};

export const WORKER_NAMES: Record<keyof GameWorkers, string> = {
  terraplanagem: 'Terraplanagem',
  assentamento:  'Assentamento de Trilhos',
  sinalizacao:   'Sinalização & Elétrica',
  explosivos:    'Explosivos & Túneis',
  manutencao:    'Manutenção',
};

export function getConstructionMonths(
  cityA: City,
  cityB: City,
  distance: number,
  type: 'rail' | 'balsa',
  workers: GameWorkers
): number {
  if (type === 'balsa') {
    // Waterways: fixed base of 6 months + 1 month per 400km of surveying/dredging
    // Worker count on assentamento speeds it up slightly
    const baseBalsaMonths = 6 + Math.ceil(distance / 400);
    const workerBonus = workers.assentamento >= 200 ? 0.75 : workers.assentamento >= 50 ? 0.9 : 1.0;
    return Math.max(4, Math.ceil(baseBalsaMonths * workerBonus));
  }

  const isNorth = (s: string) => ['AM','PA','RO','RR','AP','AC','TO'].includes(s);
  const isMountain = (s: string) => ['SC','RS','RJ','ES','MG'].includes(s);

  // Base pace in km/month before worker scaling
  // Realistic pace: a well-staffed front manages ~15-25 km/month sustained
  let kmPerMonth = 20;
  if (isNorth(cityA.state) || isNorth(cityB.state)) kmPerMonth = 12;
  else if (isMountain(cityA.state) || isMountain(cityB.state)) kmPerMonth = 10;

  // Worker scaling: each worker type has diminishing returns
  // Minimum viable crew = 50; optimal = 600-1000; beyond 2000 = no extra gain
  const coreWorkers = workers.terraplanagem + workers.assentamento;
  let workerMod = 0.25; // skeleton crew
  if (coreWorkers >= 50)   workerMod = 0.40;
  if (coreWorkers >= 150)  workerMod = 0.60;
  if (coreWorkers >= 300)  workerMod = 0.80;
  if (coreWorkers >= 600)  workerMod = 1.00;
  if (coreWorkers >= 1000) workerMod = 1.15;
  if (coreWorkers >= 1500) workerMod = 1.25;
  if (coreWorkers >= 2000) workerMod = 1.35; // hard cap

  // Sinalização crew adds up to +15% speed (logistics coordination)
  const sigMod = Math.min(1.15, 1.0 + workers.sinalizacao * 0.001);
  const effectiveKmPerMonth = kmPerMonth * workerMod * sigMod;
  return Math.max(4, Math.ceil(distance / effectiveKmPerMonth));
}

export function getTrackWorkersRequired(
  cityA: City,
  cityB: City,
  distance: number,
  type: 'rail' | 'balsa',
  needsExplosivos: boolean
): GameWorkers {
  return {
    terraplanagem: type === 'balsa' ? 70 : Math.ceil(distance * 0.90),
    assentamento:  type === 'balsa' ? 35 : Math.ceil(distance * 0.55),
    sinalizacao:   Math.ceil(distance * 0.18),
    explosivos:    needsExplosivos ? Math.max(15, Math.ceil(distance * 0.09)) : 0,
    manutencao:    0,
  };
}

// Returns the speed multiplier penalty based on simultaneous active constructions.
// More concurrent projects = slower each one (logistics/engineering divided).
export function getSimultaneousPenalty(activeProjectCount: number): number {
  if (activeProjectCount <= 1) return 1.00;
  if (activeProjectCount === 2) return 0.85;
  if (activeProjectCount === 3) return 0.72;
  if (activeProjectCount === 4) return 0.60;
  return 0.50; // 5+ projects
}

/**
 * Interface representing active funding achievements or development grants.
 */
export interface FundGrant {
  id: string;
  title: string;
  description: string;
  value: number;
  unlocked: boolean;
}

/**
 * Calculates detail costs for standard rail connection based on geographical factors and terrain.
 */
export type TerrainKey = 'cerrado' | 'amazon' | 'pantanal' | 'mountain' | 'valley';

export const TERRAIN_COLORS: Record<TerrainKey, string> = {
  cerrado:  '#ef4444',
  amazon:   '#22c55e',
  pantanal: '#06b6d4',
  mountain: '#a855f7',
  valley:   '#3b82f6',
};

export function getTrackCostDetail(cityA: City, cityB: City, distance: number) {
  const isNorth = (state: string) => ['AM', 'PA', 'RO', 'RR', 'AP', 'AC', 'TO'].includes(state);
  const isPantanal = (state: string) => ['MS', 'MT'].includes(state);

  let terrainName = 'Planalto / Cerrado (Custo Regular)';
  let multiplier = 1.0;
  let terrainKey: TerrainKey = 'cerrado';

  if (isNorth(cityA.state) || isNorth(cityB.state)) {
    terrainName = 'Floresta Amazônica (Preservação e Travessia de Rios)';
    multiplier = 2.0;
    terrainKey = 'amazon';
  } else if (isPantanal(cityA.state) || isPantanal(cityB.state)) {
    terrainName = 'Pantanal Wetlands (Pontes em Áreas Inundadas)';
    multiplier = 1.8;
    terrainKey = 'pantanal';
  } else if (
    (cityA.portType === 'maritime' && cityB.portType !== 'maritime') ||
    (cityB.portType === 'maritime' && cityA.portType !== 'maritime')
  ) {
    terrainName = 'Serras e Chapadas (Subidas e Declives Íngremes)';
    multiplier = 2.2;
    terrainKey = 'mountain';
  } else if (cityA.portType === 'fluvial' && cityB.portType === 'fluvial') {
    terrainName = 'Vales de Rios (Solos de Várzea Instável)';
    multiplier = 1.3;
    terrainKey = 'valley';
  }

  const baseCostPerKm = 40000000;
  const unitCost = baseCostPerKm * multiplier;
  const totalCost = Math.round(distance * unitCost);

  // Infrastructure structures count
  const bridgesCount = terrainKey === 'amazon'   ? Math.ceil(distance / 90)
                     : terrainKey === 'pantanal' ? Math.ceil(distance / 55)
                     : terrainKey === 'valley'   ? Math.ceil(distance / 120)
                     : 0;
  const tunnelsCount = terrainKey === 'mountain' ? Math.ceil(distance / 100) : 0;

  return {
    terrainName,
    terrainKey,
    multiplier,
    unitCost,
    totalCost,
    bridgesCount,
    tunnelsCount,
  };
}

/**
 * Returns elements in each connected component of the active railway grid.
 */
export function getConnectedComponents(cities: City[], edges: Edge[]): string[][] {
  const adj: Record<string, string[]> = {};
  cities.forEach(c => { adj[c.id] = []; });
  edges.forEach(edge => {
    adj[edge.from]?.push(edge.to);
    adj[edge.to]?.push(edge.from);
  });

  const visited = new Set<string>();
  const components: string[][] = [];

  cities.forEach(city => {
    if (!visited.has(city.id)) {
      const comp: string[] = [];
      const queue = [city.id];
      visited.add(city.id);

      while (queue.length > 0) {
        const current = queue.shift()!;
        comp.push(current);
        const neighbors = adj[current] || [];
        neighbors.forEach(n => {
          if (!visited.has(n)) {
            visited.add(n);
            queue.push(n);
          }
        });
      }
      components.push(comp);
    }
  });

  return components;
}

/**
 * Checks regional intermodal export grant formulas reactively.
 */
export function getIntermodalGrants(cities: City[], edges: Edge[]): FundGrant[] {
  const components = getConnectedComponents(cities, edges);

  const getCitiesInComponent = (compIds: string[]) => {
    return cities.filter(c => compIds.includes(c.id));
  };

  // Define port helper sets
  const isAmazonFluvialPort = (c: City) =>
    c.portType === 'fluvial' && ['AM', 'PA', 'RO', 'RR', 'AP', 'AC', 'TO'].includes(c.state);

  const isAgroPantanalPort = (c: City) =>
    c.portType === 'fluvial' && ['MS', 'MT'].includes(c.state);

  const isInnerSpPrPort = (c: City) =>
    c.portType === 'fluvial' && ['SP', 'PR', 'SC', 'RS'].includes(c.state);

  const isCoastMaritimePort = (c: City) =>
    c.portType === 'maritime' && ['SP', 'RJ', 'ES', 'SC', 'PR', 'RS', 'BA', 'SE', 'AL', 'PE', 'PB', 'RN', 'CE', 'MA', 'PI'].includes(c.state);

  const grants: FundGrant[] = [
    {
      id: 'amazon_corridor',
      title: 'Corredor de Commodities Amazônico',
      description: 'Conecte um porto fluvial da Região Norte a um porto marítimo do Sudeste/Sul para exportação de produtos agrícolas.',
      value: 150000000000,
      unlocked: false,
    },
    {
      id: 'agro_pantanal',
      title: 'Rota Pantaneira do Agronegócio',
      description: 'Ligue porto fluvial em MS/MT (Corumbá, Porto Murtinho ou Cáceres) a complexos marítimos de escoamento (Santos, São Sebastião, Paranaguá ou RJ).',
      value: 120000000000,
      unlocked: false,
    },
    {
      id: 'hydro_tiete_parana',
      title: 'Conexão Hidro-Aliança Tietê e Paraná',
      description: 'Conecte portos fluviais de SP ou PR (Pederneiras, Epitácio, Foz) a portos oceânicos ou capitais portuárias.',
      value: 100000000000,
      unlocked: false,
    },
    {
      id: 'northeast_export',
      title: 'Corredor Logístico do Nordeste',
      description: 'Integre portos fluviais do interior a grandes hubs nordestinos (Pecém, Recife, Maceió ou Salvador).',
      value: 80000000000,
      unlocked: false,
    },
  ];

  components.forEach(compIds => {
    const componentCities = getCitiesInComponent(compIds);
    if (componentCities.length < 2) return;

    const hasFluvialAmazon = componentCities.some(isAmazonFluvialPort);
    const hasFluvialAgro = componentCities.some(isAgroPantanalPort);
    const hasFluvialInner = componentCities.some(isInnerSpPrPort);
    const hasMaritimeCoast = componentCities.some(isCoastMaritimePort);

    // Specific sub-region triggers for more refined locks
    if (hasFluvialAmazon && hasMaritimeCoast) {
      const grant = grants.find(g => g.id === 'amazon_corridor');
      if (grant) grant.unlocked = true;
    }
    if (hasFluvialAgro && hasMaritimeCoast) {
      const grant = grants.find(g => g.id === 'agro_pantanal');
      if (grant) grant.unlocked = true;
    }
    if (hasFluvialInner && hasMaritimeCoast) {
      const grant = grants.find(g => g.id === 'hydro_tiete_parana');
      if (grant) grant.unlocked = true;
    }
    if (hasMaritimeCoast && componentCities.some(c => c.portType === 'fluvial' && ['CE', 'PE', 'RN', 'MA', 'AL', 'SE', 'BA'].includes(c.state))) {
      const grant = grants.find(g => g.id === 'northeast_export');
      if (grant) grant.unlocked = true;
    }
  });

  return grants;
}

/**
 * Dijkstra / shortest path along the active railway grid starting from all cities with built yards.
 */
export function calculateRailwayDistancesFromYards(
  cities: City[],
  edges: Edge[],
  maintenanceYards: string[]
): { distances: Record<string, number>; nearestYardIds: Record<string, string> } {
  const distances: Record<string, number> = {};
  const nearestYardIds: Record<string, string> = {};
  cities.forEach(c => {
    distances[c.id] = Infinity;
  });

  if (maintenanceYards.length === 0) {
    return { distances, nearestYardIds };
  }

  // Initialize yards with distance 0
  const queue: { cityId: string; dist: number; yardId: string }[] = [];
  maintenanceYards.forEach(yardId => {
    distances[yardId] = 0;
    nearestYardIds[yardId] = yardId;
    queue.push({ cityId: yardId, dist: 0, yardId });
  });

  // Dijkstra along the active edges graph
  const adj: Record<string, { to: string; dist: number }[]> = {};
  cities.forEach(c => { adj[c.id] = []; });
  edges.forEach(edge => {
    adj[edge.from]?.push({ to: edge.to, dist: edge.distance });
    adj[edge.to]?.push({ to: edge.from, dist: edge.distance });
  });

  while (queue.length > 0) {
    // Sort queue to get lowest distance (Dijkstra)
    queue.sort((a, b) => a.dist - b.dist);
    const { cityId, dist, yardId } = queue.shift()!;

    if (dist > distances[cityId]) continue;

    const neighbors = adj[cityId] || [];
    neighbors.forEach(neighObj => {
      const nextDist = dist + neighObj.dist;
      if (nextDist < distances[neighObj.to]) {
        distances[neighObj.to] = nextDist;
        nearestYardIds[neighObj.to] = yardId;
        queue.push({ cityId: neighObj.to, dist: nextDist, yardId });
      }
    });
  }

  return { distances, nearestYardIds };
}

export function getCityTypeRevenueMultiplier(type: City['type']): number {
  switch (type) {
    case 'mineracao':     return 1.4;
    case 'polo_industrial': return 1.25;
    case 'polo_agricola': return 1.2;
    case 'fronteira':     return 1.15;
    default:              return 1.0;
  }
}

// ── Seasonal effects ────────────────────────────────────────────────────────
export interface SeasonalEffect {
  id: string;
  label: string;
  months: number[]; // 0 = January
  states?: string[]; // if set, construction slow only affects routes touching these states
  revenueFactor?: number;
  constructionSlowFactor?: number;
  headline: string;
}

export const SEASONAL_EFFECTS: SeasonalEffect[] = [
  {
    id: 'chuvas_amazonia',
    label: 'Chuvas Amazônicas',
    months: [0, 1, 2], // Jan–Mar
    states: ['AM', 'PA', 'RO', 'RR', 'AP', 'AC', 'TO'],
    constructionSlowFactor: 1.35,
    headline: '🌧️ Chuvas intensas na Amazônia: obras no Norte com ritmo reduzido em 35%',
  },
  {
    id: 'seca_nordeste',
    label: 'Seca no Nordeste',
    months: [6, 7, 8], // Jul–Sep
    revenueFactor: 0.88,
    headline: '☀️ Seca histórica no Nordeste: demanda de transportes cai 12% no país',
  },
  {
    id: 'festas_dezembro',
    label: 'Temporada de Festas',
    months: [11], // December
    revenueFactor: 1.20,
    headline: '🎄 Temporada festiva: demanda de passageiros sobe 20% em todo o Brasil',
  },
];

export function getActiveSeasonalEffects(monthIdx: number): SeasonalEffect[] {
  return SEASONAL_EFFECTS.filter(e => e.months.includes(monthIdx));
}

// ── Demand growth by year ────────────────────────────────────────────────────
export function getDemandGrowthMultiplier(gameYear: number): number {
  if (gameYear <= 2035) return 1.00;
  if (gameYear <= 2045) return 1.10;
  if (gameYear <= 2055) return 1.22;
  if (gameYear <= 2065) return 1.36;
  return 1.50;
}

export function getMonthlyRevenue(
  edges: Edge[],
  workers: { manutencao: number },
  activeEffects: string[] = [],
  cities: City[] = [],
  balsaFrozenOverride?: boolean,
  gameYear?: number,
  upgradedHubs?: string[]
): number {
  const completedEdges = edges.filter(e => e.status !== 'building');
  const balsaFrozen = balsaFrozenOverride || activeEffects.includes('SECA_TOCANTINS');
  const TRAIN_LEVEL_MULT: Record<1|2|3, number> = { 1: 1.0, 2: 1.25, 3: 1.60 };
  const demandMult = gameYear ? getDemandGrowthMultiplier(gameYear) : 1.0;
  const base = completedEdges.reduce((sum, e) => {
    if (e.type === 'balsa' && balsaFrozen) return sum;
    const baseKm = Math.round(e.distance * (e.type === 'balsa' ? 40000 : 80000));
    const cityA = cities.find(c => c.id === e.from);
    const cityB = cities.find(c => c.id === e.to);
    const multA = cityA ? getCityTypeRevenueMultiplier(cityA.type) : 1.0;
    const multB = cityB ? getCityTypeRevenueMultiplier(cityB.type) : 1.0;
    const avgMult = (multA + multB) / 2;
    const doubledMult = e.doubled ? 1.5 : 1.0;
    const trainMult = TRAIN_LEVEL_MULT[(e.trainLevel ?? 1) as 1|2|3];
    // Passenger upgrade: +40% on high-population endpoints (capitals + industrial)
    const passengerBonus = e.passenger
      ? (() => {
          const highPop = (c: City | undefined) => c && (c.type === 'capital' || c.type === 'polo_industrial');
          return (highPop(cityA) || highPop(cityB)) ? 1.4 : 1.15;
        })()
      : 1.0;
    // Hub bonus: +20% one endpoint, +40% both endpoints
    const hubA = upgradedHubs ? upgradedHubs.includes(e.from) : false;
    const hubB = upgradedHubs ? upgradedHubs.includes(e.to) : false;
    const hubBonus = hubA && hubB ? 1.40 : (hubA || hubB) ? 1.20 : 1.0;
    return sum + Math.round(baseKm * avgMult * doubledMult * trainMult * passengerBonus * hubBonus * demandMult);
  }, 0);
  // Maintenance penalty: gradual scale based on crew size vs network load
  const maintPenalty = completedEdges.length === 0 ? 1.0
    : workers.manutencao === 0 ? 0.85
    : workers.manutencao < 20  ? 0.93
    : workers.manutencao < 50  ? 0.97
    : 1.0;
  // Big maintenance team bonus: +5% revenue per 50 workers above 100 (max +20%)
  const maintBonus = workers.manutencao >= 100
    ? Math.min(1.20, 1.0 + Math.floor((workers.manutencao - 100) / 50) * 0.05)
    : 1.0;
  return Math.round(base * maintPenalty * maintBonus);
}

export function getYearInflationMultiplier(gameYear: number): number {
  if (gameYear <= 2035) return 1.0;
  if (gameYear <= 2045) return 1.15;
  if (gameYear <= 2055) return 1.35;
  if (gameYear <= 2065) return 1.60;
  return 1.90;
}

// Yard level configs for Pátio de Manutenção
export const YARD_COVERAGE_KM: Record<1|2|3, number> = {
  1: 600,
  2: 900,
  3: 1400,
};

export const YARD_CONFIGS: Record<1|2|3, {
  name: string;
  coverage: number;
  cost: number;
  months: number;
  workers: Partial<GameWorkers>;
  resources: Partial<GameResources>;
}> = {
  1: {
    name: 'Básico',
    coverage: 600,
    cost: 15_000_000_000,
    months: 6,
    workers: { terraplanagem: 20, assentamento: 10 },
    resources: { aco: 200, brita: 300, cimento: 150 },
  },
  2: {
    name: 'Avançado',
    coverage: 900,
    cost: 28_000_000_000,
    months: 10,
    workers: { terraplanagem: 40, assentamento: 20 },
    resources: { aco: 400, brita: 600, cimento: 300, cobre: 50 },
  },
  3: {
    name: 'Industrial',
    coverage: 1400,
    cost: 50_000_000_000,
    months: 16,
    workers: { terraplanagem: 80, assentamento: 40, sinalizacao: 20 },
    resources: { aco: 800, brita: 1200, cimento: 600, cobre: 100, madeira: 200 },
  },
};

// Hub (Terminal Central) config
export const HUB_CONFIG = {
  cost: 30_000_000_000,
  months: 8,
  workers: { assentamento: 30, sinalizacao: 15 },
  resources: { aco: 500, cimento: 300, cobre: 80 } as Partial<GameResources>,
};
