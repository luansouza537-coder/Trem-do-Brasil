import { City, Edge } from '../types';

/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula.
 */
export function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Checks if a path exists between startCityId and targetCityId using BFS.
 */
export function pathExists(startCityId: string, targetCityId: string, edges: Edge[]): boolean {
  if (edges.length === 0) return false;

  const adj: Record<string, string[]> = {};
  for (const edge of edges) {
    if (!adj[edge.from]) adj[edge.from] = [];
    if (!adj[edge.to]) adj[edge.to] = [];
    adj[edge.from].push(edge.to);
    adj[edge.to].push(edge.from);
  }

  const visited = new Set<string>();
  const queue = [startCityId];
  visited.add(startCityId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === targetCityId) {
      return true;
    }

    const neighbors = adj[current] || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return false;
}

/**
 * Gets the number of cities in the connected component of startCityId.
 */
export function getComponentSize(startCityId: string, edges: Edge[]): number {
  if (edges.length === 0) return 0;

  const adj: Record<string, string[]> = {};
  for (const edge of edges) {
    if (!adj[edge.from]) adj[edge.from] = [];
    if (!adj[edge.to]) adj[edge.to] = [];
    adj[edge.from].push(edge.to);
    adj[edge.to].push(edge.from);
  }

  const visited = new Set<string>();
  const queue = [startCityId];
  visited.add(startCityId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = adj[current] || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return visited.size;
}

/**
 * Formats a distance in kilometers nicely (e.g. 1.250 km)
 */
export function formatDistance(distance: number): string {
  return distance.toLocaleString('pt-BR') + ' km';
}

/**
 * Returns a list of suggested connections between close neighbor cities.
 */
export function getSuggestedConnections(cities: City[]): { from: string; to: string; distance: number }[] {
  const suggestions: { from: string; to: string; distance: number }[] = [];
  const added = new Set<string>();

  for (const city of cities) {
    // Find closest 3 cities
    const distances = cities
      .filter((c) => c.id !== city.id)
      .map((c) => ({
        id: c.id,
        distance: getHaversineDistance(city.lat, city.lng, c.lat, c.lng),
      }))
      .sort((a, b) => a.distance - b.distance);

    const topClosest = distances.slice(0, 3);
    for (const item of topClosest) {
      const idA = city.id < item.id ? city.id : item.id;
      const idB = city.id < item.id ? item.id : city.id;
      const key = `${idA}-${idB}`;
      if (!added.has(key)) {
        added.add(key);
        suggestions.push({ from: idA, to: idB, distance: item.distance });
      }
    }
  }

  return suggestions;
}

