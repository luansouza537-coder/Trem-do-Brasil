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
  basico: 5000000,       // R$ 5.000.000 por mês (escala realista do jogo, compatível com o orçamento de trilhões/bilhões!)
  operador: 12000000,    // R$ 12.000.000 por mês
  especialista: 25050300, // R$ 25.050.300 por mês
  perfurador: 18000000,   // R$ 18.000.000 por mês
};

export const WORKER_NAMES: Record<keyof GameWorkers, string> = {
  basico: 'Básico (Servente, Carpinteiro, Armador)',
  operador: 'Operador de Máquinas (Escavadeira, Trator, Britador)',
  especialista: 'Especialista (Soldador, Engenheiro, Eletricista)',
  perfurador: 'Túnel / Montanha (Perfuratriz, Mangoteiro)',
};

/**
 * Calculates workforce requirements to build a stretch.
 * @param distance Length of the route in km
 * @param type 'rail' or 'balsa'
 * @param hasExplosives If the route consumes explosives
 */
export function getTrackWorkersRequired(
  cityA: City,
  cityB: City,
  distance: number,
  type: 'rail' | 'balsa',
  hasExplosives: boolean
): GameWorkers {
  if (type === 'balsa') {
    return {
      basico: Math.max(3, Math.ceil(distance * 0.08)),
      operador: Math.max(1, Math.ceil(distance * 0.03)),
      especialista: Math.max(2, Math.ceil(distance * 0.04)),
      perfurador: 0,
    };
  }

  // Montanha/Serra detection
  const isSerras =
    (cityA.portType === 'maritime' && cityB.portType !== 'maritime') ||
    (cityB.portType === 'maritime' && cityA.portType !== 'maritime');

  const needsExplosives = hasExplosives || isSerras || (distance > 250 && Math.random() > 0.5);

  return {
    basico: Math.max(10, Math.ceil(distance * 0.25)),
    operador: Math.max(4, Math.ceil(distance * 0.12)),
    especialista: Math.max(3, Math.ceil(distance * 0.06)),
    perfurador: needsExplosives ? Math.max(5, Math.ceil(distance * 0.10)) : 0,
  };
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
export function getTrackCostDetail(cityA: City, cityB: City, distance: number) {
  const isNorth = (state: string) => ['AM', 'PA', 'RO', 'RR', 'AP', 'AC', 'TO'].includes(state);
  const isPantanal = (state: string) => ['MS', 'MT'].includes(state);

  let terrainName = 'Planalto / Cerrado (Custo Regular)';
  let multiplier = 1.0;

  if (isNorth(cityA.state) || isNorth(cityB.state)) {
    terrainName = 'Floresta Amazônica (Preservação e Travessia de Rios)';
    multiplier = 2.0;
  } else if (isPantanal(cityA.state) || isPantanal(cityB.state)) {
    terrainName = 'Pantanal Wetlands (Pontes em Áreas Inundadas)';
    multiplier = 1.8;
  } else if (
    (cityA.portType === 'maritime' && cityB.portType !== 'maritime') ||
    (cityB.portType === 'maritime' && cityA.portType !== 'maritime')
  ) {
    terrainName = 'Serras e Chapadas (Subidas e Declives Íngremes)';
    multiplier = 2.2;
  } else if (cityA.portType === 'fluvial' && cityB.portType === 'fluvial') {
    terrainName = 'Vales de Rios (Solos de Várzea Instável)';
    multiplier = 1.3;
  }

  const baseCostPerKm = 40000000; // R$ 40.000.000 / km
  const unitCost = baseCostPerKm * multiplier;
  const totalCost = Math.round(distance * unitCost);

  return {
    terrainName,
    multiplier,
    unitCost,
    totalCost,
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
): Record<string, number> {
  const distances: Record<string, number> = {};
  cities.forEach(c => {
    distances[c.id] = Infinity;
  });

  if (maintenanceYards.length === 0) {
    return distances;
  }

  // Initialize yards with distance 0
  const queue: { cityId: string; dist: number }[] = [];
  maintenanceYards.forEach(yardId => {
    distances[yardId] = 0;
    queue.push({ cityId: yardId, dist: 0 });
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
    const { cityId, dist } = queue.shift()!;

    if (dist > distances[cityId]) continue;

    const neighbors = adj[cityId] || [];
    neighbors.forEach(neighObj => {
      const nextDist = dist + neighObj.dist;
      if (nextDist < distances[neighObj.to]) {
        distances[neighObj.to] = nextDist;
        queue.push({ cityId: neighObj.to, dist: nextDist });
      }
    });
  }

  return distances;
}

export function getYearInflationMultiplier(gameYear: number): number {
  if (gameYear <= 2035) return 1.0;
  if (gameYear <= 2045) return 1.15;
  if (gameYear <= 2055) return 1.35;
  if (gameYear <= 2065) return 1.60;
  return 1.90;
}
