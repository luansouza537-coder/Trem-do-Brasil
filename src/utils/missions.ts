import { City, Edge } from '../types';
import { getConnectedComponents } from './gameRules';

export interface MissionDef {
  id: string;
  title: string;
  description: string;
  reward: number;
  check: (cities: City[], edges: Edge[], yards: string[]) => { completed: boolean; current: number; target: number };
}

const done = (edges: Edge[]) => edges.filter(e => e.status !== 'building');

export const MISSIONS: MissionDef[] = [
  {
    id: 'first_rail',
    title: '🚂 Primeiros Trilhos',
    description: 'Conclua sua primeira conexão ferroviária.',
    reward: 5_000_000_000,
    check: (_, edges) => { const n = done(edges).length; return { completed: n >= 1, current: Math.min(n, 1), target: 1 }; },
  },
  {
    id: 'ten_connections',
    title: '🔗 Malha Regional',
    description: 'Conclua 10 conexões ferroviárias.',
    reward: 25_000_000_000,
    check: (_, edges) => { const n = done(edges).length; return { completed: n >= 10, current: n, target: 10 }; },
  },
  {
    id: 'twenty_five_connections',
    title: '🗺️ Corredor Nacional',
    description: 'Conclua 25 conexões ferroviárias.',
    reward: 60_000_000_000,
    check: (_, edges) => { const n = done(edges).length; return { completed: n >= 25, current: n, target: 25 }; },
  },
  {
    id: 'fifty_connections',
    title: '🏗️ Mega Malha',
    description: 'Conclua 50 conexões ferroviárias.',
    reward: 120_000_000_000,
    check: (_, edges) => { const n = done(edges).length; return { completed: n >= 50, current: n, target: 50 }; },
  },
  {
    id: 'all_maritime_ports',
    title: '⚓ Soberania Portuária',
    description: 'Conecte todos os portos marítimos à malha.',
    reward: 80_000_000_000,
    check: (cities, edges) => {
      const ports = cities.filter(c => c.portType === 'maritime');
      const ids = new Set(done(edges).flatMap(e => [e.from, e.to]));
      const n = ports.filter(c => ids.has(c.id)).length;
      return { completed: n >= ports.length, current: n, target: ports.length };
    },
  },
  {
    id: 'all_capitals',
    title: '🏛️ União das Capitais',
    description: 'Conecte todas as 27 capitais estaduais.',
    reward: 100_000_000_000,
    check: (cities, edges) => {
      const caps = cities.filter(c => c.type === 'capital');
      const ids = new Set(done(edges).flatMap(e => [e.from, e.to]));
      const n = caps.filter(c => ids.has(c.id)).length;
      return { completed: n >= caps.length, current: n, target: caps.length };
    },
  },
  {
    id: 'north_south',
    title: '🧭 Eixo Norte–Sul',
    description: 'Conecte a Região Norte à Região Sul numa mesma malha.',
    reward: 70_000_000_000,
    check: (cities, edges) => {
      const northIds = new Set(cities.filter(c => ['AM','PA','RO','RR','AP','AC','TO'].includes(c.state)).map(c => c.id));
      const sulIds   = new Set(cities.filter(c => ['RS','SC','PR'].includes(c.state)).map(c => c.id));
      const comps = getConnectedComponents(cities, done(edges));
      const ok = comps.some(comp => comp.some(id => northIds.has(id)) && comp.some(id => sulIds.has(id)));
      return { completed: ok, current: ok ? 1 : 0, target: 1 };
    },
  },
  {
    id: 'five_yards',
    title: '🔧 Rede de Manutenção',
    description: 'Construa 5 pátios de manutenção.',
    reward: 30_000_000_000,
    check: (_, _e, yards) => ({ completed: yards.length >= 5, current: yards.length, target: 5 }),
  },
  {
    id: 'distance_10000',
    title: '📏 Dez Mil Quilômetros',
    description: 'Alcance 10.000 km de malha concluída.',
    reward: 40_000_000_000,
    check: (_, edges) => {
      const dist = Math.round(done(edges).reduce((s, e) => s + e.distance, 0));
      return { completed: dist >= 10000, current: dist, target: 10000 };
    },
  },
  {
    id: 'amazon_fluvial',
    title: '🌊 Integração Amazônica',
    description: 'Conecte 3 portos fluviais da Região Norte.',
    reward: 50_000_000_000,
    check: (cities, edges) => {
      const targets = cities.filter(c => c.portType === 'fluvial' && ['AM','PA','RO','RR','AP','AC','TO'].includes(c.state));
      const ids = new Set(done(edges).flatMap(e => [e.from, e.to]));
      const n = targets.filter(c => ids.has(c.id)).length;
      return { completed: n >= 3, current: n, target: 3 };
    },
  },
];
