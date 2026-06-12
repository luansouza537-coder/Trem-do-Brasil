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
    reward: 8_000_000_000,
    check: (_, edges) => { const n = done(edges).length; return { completed: n >= 1, current: Math.min(n, 1), target: 1 }; },
  },
  {
    id: 'five_connections',
    title: '🔩 Malha Inicial',
    description: 'Conclua 5 conexões ferroviárias.',
    reward: 18_000_000_000,
    check: (_, edges) => { const n = done(edges).length; return { completed: n >= 5, current: n, target: 5 }; },
  },
  {
    id: 'ten_connections',
    title: '🔗 Malha Regional',
    description: 'Conclua 10 conexões ferroviárias.',
    reward: 35_000_000_000,
    check: (_, edges) => { const n = done(edges).length; return { completed: n >= 10, current: n, target: 10 }; },
  },
  {
    id: 'twenty_five_connections',
    title: '🗺️ Corredor Nacional',
    description: 'Conclua 25 conexões ferroviárias.',
    reward: 80_000_000_000,
    check: (_, edges) => { const n = done(edges).length; return { completed: n >= 25, current: n, target: 25 }; },
  },
  {
    id: 'fifty_connections',
    title: '🏗️ Mega Malha',
    description: 'Conclua 50 conexões ferroviárias.',
    reward: 170_000_000_000,
    check: (_, edges) => { const n = done(edges).length; return { completed: n >= 50, current: n, target: 50 }; },
  },
  {
    id: 'hundred_connections',
    title: '🌐 Rede Continental',
    description: 'Conclua 100 conexões ferroviárias.',
    reward: 400_000_000_000,
    check: (_, edges) => { const n = done(edges).length; return { completed: n >= 100, current: n, target: 100 }; },
  },
  {
    id: 'three_yards',
    title: '🔧 Primeiros Pátios',
    description: 'Construa 3 pátios de manutenção.',
    reward: 20_000_000_000,
    check: (_, _e, yards) => ({ completed: yards.length >= 3, current: yards.length, target: 3 }),
  },
  {
    id: 'five_yards',
    title: '🔧 Rede de Manutenção',
    description: 'Construa 5 pátios de manutenção.',
    reward: 45_000_000_000,
    check: (_, _e, yards) => ({ completed: yards.length >= 5, current: yards.length, target: 5 }),
  },
  {
    id: 'ten_yards',
    title: '🏭 Cobertura Nacional',
    description: 'Construa 10 pátios de manutenção.',
    reward: 100_000_000_000,
    check: (_, _e, yards) => ({ completed: yards.length >= 10, current: yards.length, target: 10 }),
  },
  {
    id: 'all_maritime_ports',
    title: '⚓ Soberania Portuária',
    description: 'Conecte todos os portos marítimos à malha.',
    reward: 120_000_000_000,
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
    reward: 150_000_000_000,
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
    reward: 100_000_000_000,
    check: (cities, edges) => {
      const northIds = new Set(cities.filter(c => ['AM','PA','RO','RR','AP','AC','TO'].includes(c.state)).map(c => c.id));
      const sulIds   = new Set(cities.filter(c => ['RS','SC','PR'].includes(c.state)).map(c => c.id));
      const comps = getConnectedComponents(cities, done(edges));
      const ok = comps.some(comp => comp.some(id => northIds.has(id)) && comp.some(id => sulIds.has(id)));
      return { completed: ok, current: ok ? 1 : 0, target: 1 };
    },
  },
  {
    id: 'northeast_connected',
    title: '🌵 Integração do Nordeste',
    description: 'Conecte todas as 9 capitais nordestinas numa mesma malha.',
    reward: 90_000_000_000,
    check: (cities, edges) => {
      const neIds = new Set(cities.filter(c => c.type === 'capital' && ['MA','PI','CE','RN','PB','PE','AL','SE','BA'].includes(c.state)).map(c => c.id));
      const comps = getConnectedComponents(cities, done(edges));
      const ok = comps.some(comp => [...neIds].every(id => comp.includes(id)));
      const best = comps.reduce((mx, comp) => Math.max(mx, comp.filter(id => neIds.has(id)).length), 0);
      return { completed: ok, current: ok ? 9 : best, target: 9 };
    },
  },
  {
    id: 'distance_5000',
    title: '📏 Cinco Mil Quilômetros',
    description: 'Alcance 5.000 km de malha concluída.',
    reward: 35_000_000_000,
    check: (_, edges) => {
      const dist = Math.round(done(edges).reduce((s, e) => s + e.distance, 0));
      return { completed: dist >= 5000, current: dist, target: 5000 };
    },
  },
  {
    id: 'distance_10000',
    title: '📏 Dez Mil Quilômetros',
    description: 'Alcance 10.000 km de malha concluída.',
    reward: 60_000_000_000,
    check: (_, edges) => {
      const dist = Math.round(done(edges).reduce((s, e) => s + e.distance, 0));
      return { completed: dist >= 10000, current: dist, target: 10000 };
    },
  },
  {
    id: 'distance_25000',
    title: '🛤️ Vinte e Cinco Mil Km',
    description: 'Alcance 25.000 km de malha concluída.',
    reward: 150_000_000_000,
    check: (_, edges) => {
      const dist = Math.round(done(edges).reduce((s, e) => s + e.distance, 0));
      return { completed: dist >= 25000, current: dist, target: 25000 };
    },
  },
  {
    id: 'distance_50000',
    title: '🌎 Cinquenta Mil Km',
    description: 'Alcance 50.000 km de malha concluída.',
    reward: 350_000_000_000,
    check: (_, edges) => {
      const dist = Math.round(done(edges).reduce((s, e) => s + e.distance, 0));
      return { completed: dist >= 50000, current: dist, target: 50000 };
    },
  },
  {
    id: 'amazon_fluvial',
    title: '🌊 Integração Amazônica',
    description: 'Conecte 3 portos fluviais da Região Norte.',
    reward: 70_000_000_000,
    check: (cities, edges) => {
      const targets = cities.filter(c => c.portType === 'fluvial' && ['AM','PA','RO','RR','AP','AC','TO'].includes(c.state));
      const ids = new Set(done(edges).flatMap(e => [e.from, e.to]));
      const n = targets.filter(c => ids.has(c.id)).length;
      return { completed: n >= 3, current: n, target: 3 };
    },
  },
  {
    id: 'matopiba',
    title: '🌾 Corredor MATOPIBA',
    description: 'Conecte pelo menos 2 cidades de cada estado do MATOPIBA (MA, TO, PI, BA) na mesma malha.',
    reward: 80_000_000_000,
    check: (cities, edges) => {
      const states = ['MA','TO','PI','BA'];
      const comps = getConnectedComponents(cities, done(edges));
      const ok = comps.some(comp => {
        const citiesInComp = new Set(comp);
        return states.every(st =>
          cities.filter(c => c.state === st && citiesInComp.has(c.id)).length >= 2
        );
      });
      const best = ok ? 4 : comps.reduce((mx, comp) => {
        const citiesInComp = new Set(comp);
        return Math.max(mx, states.filter(st =>
          cities.filter(c => c.state === st && citiesInComp.has(c.id)).length >= 2
        ).length);
      }, 0);
      return { completed: ok, current: best, target: 4 };
    },
  },
];
