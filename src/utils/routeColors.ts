/**
 * Returns the Leaflet polyline color for a route based on revenue per km.
 * Thresholds assume base rate of ~80 000 R$/km for a typical 500 km rail route.
 */
export function getRouteColor(revenuePerKm: number, isBuilding: boolean): string {
  if (isBuilding) return '#f59e0b';      // amber  — under construction
  if (revenuePerKm <= 0)   return '#64748b'; // slate  — no revenue
  if (revenuePerKm < 60_000)  return '#ef4444'; // red    — loss-making
  if (revenuePerKm < 120_000) return '#f97316'; // orange — below average
  if (revenuePerKm < 220_000) return '#eab308'; // yellow — average
  if (revenuePerKm < 400_000) return '#22c55e'; // green  — good
  return '#10b981';                             // emerald — excellent
}

export interface RouteLegendItem {
  color: string;
  label: string;
}

export const ROUTE_LEGEND: RouteLegendItem[] = [
  { color: '#10b981', label: 'Excelente' },
  { color: '#22c55e', label: 'Boa' },
  { color: '#eab308', label: 'Média' },
  { color: '#f97316', label: 'Abaixo da média' },
  { color: '#ef4444', label: 'Deficitária' },
  { color: '#f59e0b', label: 'Em construção' },
  { color: '#64748b', label: 'Sem receita' },
];
