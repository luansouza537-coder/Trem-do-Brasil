// =============================================================================
// terrainData.ts — Geographic utilities for Trem do Brasil
// =============================================================================
// Provides:
//   1. Biome classification by real coordinates (not just state)
//   2. River crossing detection along routes
//   3. City connection tiers based on real population/type
//   4. Impossible rail routes (balsa-only)
// =============================================================================

import { CITIES } from '../data/cities';

// =============================================================================
// SECTION 1: BIOME CLASSIFICATION
// =============================================================================

export type Biome =
  | 'amazon'
  | 'cerrado'
  | 'caatinga'
  | 'mata_atlantica'
  | 'pantanal'
  | 'pampa'
  | 'mountain';

function isAmazon(lat: number, lng: number, state: string): boolean {
  if (['AM', 'AP', 'RR', 'AC', 'RO'].includes(state)) return true;
  if (state === 'PA' && lat > -8) return true;
  if (state === 'MA' && lng < -46 && lat > -6) return true;
  if (state === 'TO' && lat > -8 && lng < -49) return true;
  if (state === 'MT' && lat > -10) return true;
  return false;
}

function isPantanal(lat: number, lng: number, state: string): boolean {
  if (state === 'MS' && lng < -55 && lat > -21) return true;
  if (state === 'MT' && lng < -57 && lat > -17) return true;
  return false;
}

function isCaatinga(lat: number, lng: number, state: string): boolean {
  if (['CE', 'RN', 'PB'].includes(state) && lng > -40) return true;
  if (state === 'PE' && lng > -37) return true;
  if (state === 'AL' && lng > -37) return true;
  if (state === 'SE' && lng > -37) return true;
  if (state === 'BA' && lat > -14 && lng > -40) return true;
  if (state === 'PI' && lat > -8) return true;
  if (state === 'MG' && lat > -16 && lng > -43) return true;
  return false;
}

function isMountain(lat: number, lng: number, state: string): boolean {
  if (state === 'RJ' && lng < -43 && lat < -21.5) return true; // Serra do Mar RJ
  if (state === 'ES' && lng < -41) return true;
  if (state === 'SC' && lng < -49.5 && lat < -26.5) return true;
  if (state === 'RS' && lat < -28 && lng < -51) return true;
  if (state === 'MG' && lat < -19 && lng > -43.5 && lng < -41) return true; // Serra do Espinhaço
  if (state === 'SP' && lng > -46 && lat < -23.5) return true; // Serra do Mar SP
  return false;
}

function isPampa(lat: number, lng: number, state: string): boolean {
  return state === 'RS' && lat < -28;
}

function isMataAtlantica(lat: number, lng: number, state: string): boolean {
  if (['BA', 'SE', 'AL', 'PE', 'PB', 'RN', 'CE', 'MA'].includes(state) && lng > -38.5) return true;
  if (['ES', 'RJ', 'SP', 'PR', 'SC', 'RS'].includes(state) && lng > -44) return true;
  return false;
}

/**
 * Returns the biome for a city based on its real geographic coordinates.
 * Priority order: pantanal > amazon > mountain > pampa > caatinga > mata_atlantica > cerrado
 */
export function getCityBiome(city: { lat: number; lng: number; state: string }): Biome {
  const { lat, lng, state } = city;

  if (isPantanal(lat, lng, state)) return 'pantanal';
  if (isAmazon(lat, lng, state)) return 'amazon';
  if (isMountain(lat, lng, state)) return 'mountain';
  if (isPampa(lat, lng, state)) return 'pampa';
  if (isCaatinga(lat, lng, state)) return 'caatinga';
  if (isMataAtlantica(lat, lng, state)) return 'mata_atlantica';
  return 'cerrado';
}

// =============================================================================
// SECTION 2: RIVER CROSSING DETECTION
// =============================================================================

export interface RiverCorridor {
  name: string;
  /** Latitude band [minLat, maxLat] the river occupies */
  latBand?: [number, number];
  /** Longitude band [minLng, maxLng] the river occupies */
  lngBand?: [number, number];
  /** Cost multiplier applied when a route crosses this river */
  multiplier: number;
  description: string;
}

export const MAJOR_RIVERS: RiverCorridor[] = [
  {
    name: 'Foz do Amazonas',
    latBand: [-2, 1],
    lngBand: [-50, -48],
    multiplier: 2.5,
    description: 'Foz do Amazonas — travessia praticamente impossível por terra',
  },
  {
    name: 'Amazonas/Solimões',
    latBand: [-4, 0.5],
    lngBand: [-73, -48],
    multiplier: 1.8,
    description: 'Travessia do Rio Amazonas (até 10km de largura)',
  },
  {
    name: 'Rio Negro/Branco',
    latBand: [-3, 3],
    lngBand: [-63, -59],
    multiplier: 1.5,
    description: 'Travessia dos rios Negro e Branco',
  },
  {
    name: 'Rio Madeira',
    latBand: [-13, -3],
    lngBand: [-65, -58],
    multiplier: 1.5,
    description: 'Travessia do Rio Madeira',
  },
  {
    name: 'Rio Paraná',
    latBand: [-27, -18],
    lngBand: [-56, -51],
    multiplier: 1.5,
    description: 'Travessia do Rio Paraná (represado — Itaipu)',
  },
  {
    name: 'Rio Tocantins',
    latBand: [-11, -3],
    lngBand: [-50, -47.5],
    multiplier: 1.4,
    description: 'Travessia do Rio Tocantins',
  },
  {
    name: 'Rio Xingu',
    latBand: [-9, -1.5],
    lngBand: [-53, -51.5],
    multiplier: 1.4,
    description: 'Travessia do Rio Xingu',
  },
  {
    name: 'Rio Paraguay',
    latBand: [-22, -17],
    lngBand: [-58, -56],
    multiplier: 1.4,
    description: 'Travessia do Rio Paraguay',
  },
  {
    name: 'Rio Araguaia',
    latBand: [-16, -6],
    lngBand: [-52.5, -50],
    multiplier: 1.3,
    description: 'Travessia do Rio Araguaia',
  },
  {
    name: 'Rio São Francisco',
    latBand: [-20, -9],
    lngBand: [-47, -36.5],
    multiplier: 1.3,
    description: 'Travessia do Rio São Francisco',
  },
  {
    name: 'Rio Tietê/Reservatório',
    latBand: [-23, -20],
    lngBand: [-52, -46],
    multiplier: 1.2,
    description: 'Travessia do Rio Tietê',
  },
  {
    name: 'Rio Doce',
    latBand: [-21, -18.5],
    lngBand: [-43.5, -40],
    multiplier: 1.2,
    description: 'Travessia do Rio Doce',
  },
];

/**
 * Returns true if the line segment from (aLat,aLng) to (bLat,bLng) crosses
 * the given river corridor band.
 *
 * Strategy: A route "crosses" a river band when:
 *  - The route's bounding box overlaps with the corridor box, AND
 *  - For corridors with a latBand: the two endpoints are on opposite sides of
 *    the band's center latitude (one above, one below), while both fall within
 *    the corridor's lngBand (if defined).
 *  - For corridors with only a lngBand: analogous check on longitude.
 *
 * This is intentionally conservative — it avoids false positives for routes
 * that merely run alongside a river without crossing it.
 */
function routeCrossesRiver(
  aLat: number, aLng: number,
  bLat: number, bLng: number,
  river: RiverCorridor,
): boolean {
  const { latBand, lngBand } = river;

  if (latBand && lngBand) {
    // Both bands defined — corridor is a rectangular area.
    // Check bounding-box overlap first (quick reject).
    const minLat = Math.min(aLat, bLat);
    const maxLat = Math.max(aLat, bLat);
    const minLng = Math.min(aLng, bLng);
    const maxLng = Math.max(aLng, bLng);

    if (maxLat < latBand[0] || minLat > latBand[1]) return false;
    if (maxLng < lngBand[0] || minLng > lngBand[1]) return false;

    // The route crosses the latitude band if the endpoints straddle it.
    const crossesLat =
      (aLat < latBand[0] && bLat > latBand[1]) ||
      (bLat < latBand[0] && aLat > latBand[1]) ||
      // Both inside the lat band — check they also span across in longitude.
      (aLat >= latBand[0] && aLat <= latBand[1] && bLat >= latBand[0] && bLat <= latBand[1]);

    // Where does the route cross the band's centre latitude?
    const bandCentLat = (latBand[0] + latBand[1]) / 2;
    const t = Math.abs(aLat - bLat) > 0.001
      ? (bandCentLat - aLat) / (bLat - aLat)
      : 0.5;
    const crossLng = aLng + t * (bLng - aLng);

    const lngAtCrossIsInBand = crossLng >= lngBand[0] && crossLng <= lngBand[1];

    return crossesLat && lngAtCrossIsInBand;
  }

  if (latBand) {
    // River defined only by lat band (runs east–west).
    const minLat = Math.min(aLat, bLat);
    const maxLat = Math.max(aLat, bLat);
    if (maxLat < latBand[0] || minLat > latBand[1]) return false;
    return (aLat < latBand[0] && bLat > latBand[1]) ||
           (bLat < latBand[0] && aLat > latBand[1]);
  }

  if (lngBand) {
    // River defined only by lng band (runs north–south).
    const minLng = Math.min(aLng, bLng);
    const maxLng = Math.max(aLng, bLng);
    if (maxLng < lngBand[0] || minLng > lngBand[1]) return false;
    return (aLng < lngBand[0] && bLng > lngBand[1]) ||
           (bLng < lngBand[0] && aLng > lngBand[1]);
  }

  return false;
}

export interface RiverCrossingInfo {
  crosses: boolean;
  rivers: string[];
  multiplier: number;
  description: string;
}

/**
 * Returns river-crossing info for a straight-line route between two cities.
 * The multiplier is the product of all crossed rivers' multipliers (capped at 3.0).
 */
export function getRiverCrossingInfo(
  cityA: { lat: number; lng: number },
  cityB: { lat: number; lng: number },
): RiverCrossingInfo {
  const crossed: RiverCorridor[] = [];

  for (const river of MAJOR_RIVERS) {
    if (routeCrossesRiver(cityA.lat, cityA.lng, cityB.lat, cityB.lng, river)) {
      crossed.push(river);
    }
  }

  if (crossed.length === 0) {
    return { crosses: false, rivers: [], multiplier: 1.0, description: '' };
  }

  const multiplier = Math.min(
    crossed.reduce((acc, r) => acc * r.multiplier, 1.0),
    3.0,
  );

  const rivers = crossed.map(r => r.name);
  const description = crossed.map(r => r.description).join(' | ');

  return { crosses: true, rivers, multiplier, description };
}

// =============================================================================
// SECTION 3: CITY CONNECTION TIERS
// =============================================================================

/**
 * Metrópoles (population > ~2 M or major national hubs) get 4 native connections.
 * IDs: SP(1), RJ(2), BH(3), Curitiba(7), Salvador(8), Recife(11), Fortaleza(14),
 *       Belém(17), Manaus(20), Goiânia(24), Brasília(25), Porto Alegre(5)
 */
const METROPOLES = new Set(['1', '2', '3', '5', '7', '8', '11', '14', '17', '20', '24', '25']);

/**
 * Returns the native maximum number of rail connections for a city based on
 * its real-world size and economic role.
 *
 * - Metrópole (pop > 2M / major hub): 4 connections
 * - State capital or industrial/mining pole:  3 connections
 * - All other cities: 2 connections
 */
export function getCityNativeMaxConnections(city: { id: string; type: string }): number {
  if (METROPOLES.has(city.id)) return 4;
  if (city.type === 'capital') return 3;
  if (city.type === 'polo_industrial' || city.type === 'mineracao') return 3;
  return 2;
}

// =============================================================================
// SECTION 4: IMPOSSIBLE RAIL ROUTES (BALSA-ONLY)
// =============================================================================

/**
 * City pairs where constructing a rail bridge is physically/economically
 * impossible in the game — players must use balsas (ferries) instead.
 *
 * Key format: sorted city IDs joined with '-'
 */
export const BALSA_ONLY_PAIRS = new Set([
  '17-18', // Belém – Macapá (foz do Amazonas, 10+ km de largura)
  '16-18', // São Luís – Macapá (across the Amazon estuary)
  '17-74', // Belém – Santana/AP (across Amazonas delta)
  '18-74', // Macapá – Santana (river channel)
]);

/**
 * Returns true if the route between two cities requires a balsa (ferry) and
 * cannot be served by a direct rail connection.
 */
export function isBalsaOnlyRoute(cityAId: string, cityBId: string): boolean {
  const key = [cityAId, cityBId].sort().join('-');
  return BALSA_ONLY_PAIRS.has(key);
}

// =============================================================================
// SECTION 5: PRE-COMPUTED BIOME CACHE
// =============================================================================

/**
 * Biome for every city in CITIES, keyed by city id.
 * Computed once at module load — use this instead of calling getCityBiome
 * repeatedly in hot paths.
 */
export const CITY_BIOME_CACHE: Record<string, Biome> = {};
CITIES.forEach(c => {
  CITY_BIOME_CACHE[c.id] = getCityBiome(c);
});
