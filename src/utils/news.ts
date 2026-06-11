import { City, NewsItem, GameEvent } from '../types';

export function newsRouteComplete(cityA: City, cityB: City, distance: number, type: 'rail' | 'balsa', yearMonth: string): NewsItem {
  const options = type === 'balsa' ? [
    `RENIF inaugura rota hidroviária ${cityA.name}–${cityB.name} (${distance.toFixed(0)} km)`,
    `Hidrovia conectando ${cityA.state} e ${cityB.state} entra em operação`,
  ] : [
    `RENIF conclui ferrovia ${cityA.name}–${cityB.name}, ${distance.toFixed(0)} km de trilhos`,
    `Novo corredor ferroviário conecta ${cityA.name} a ${cityB.name}`,
    `Trecho ${cityA.state}–${cityB.state} inaugurado: ${distance.toFixed(0)} km de vias`,
  ];
  return {
    id: `route_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    headline: options[Math.floor(Math.random() * options.length)],
    yearMonth,
    category: 'infra',
  };
}

export function newsCrisis(event: GameEvent, yearMonth: string): NewsItem {
  return {
    id: `crisis_${event.id}`,
    headline: `⚠️ ${event.title} — impactos nas frentes de obra da RENIF`,
    yearMonth,
    category: 'crisis',
  };
}

export function newsGrant(title: string, value: number, yearMonth: string): NewsItem {
  return {
    id: `grant_${Date.now()}`,
    headline: `💰 Subsídio desbloqueado: "${title}" — R$ ${(value/1e9).toFixed(0)}B creditados`,
    yearMonth,
    category: 'grant',
  };
}

export function newsMission(title: string, reward: number, yearMonth: string): NewsItem {
  return {
    id: `mission_${Date.now()}`,
    headline: `🎯 Meta cumprida: "${title.replace(/^[^ ]+ /, '')}" — Bônus de R$ ${(reward/1e9).toFixed(0)}B`,
    yearMonth,
    category: 'mission',
  };
}

const HEADLINES = [
  'Relatório aponta crescimento de 12% no volume de carga da RENIF',
  'Especialistas elogiam traçado técnico da nova malha ferroviária nacional',
  'Investidores internacionais demonstram interesse no modelo ferroviário brasileiro',
  'RENIF recebe prêmio de inovação em infraestrutura de transporte',
  'Demanda por transporte ferroviário de passageiros supera expectativas',
  'Ferrovia reduz emissões de CO₂ em relação ao modal rodoviário, aponta estudo',
  'Congresso aprova PEC que garante repasses à RENIF por mais 20 anos',
  'FMI destaca infraestrutura ferroviária como diferencial competitivo do Brasil',
  'Engenheiros celebram recorde de produtividade nas frentes de obra',
  'Cidades conectadas registram alta de 18% no PIB regional, diz IBGE',
  'RENIF firma parceria com universidades para projetos de engenharia sustentável',
  'Novo sistema de sinalização digital reduz tempo de parada em 30%',
];

export function newsRandom(gameYear: number, monthIdx: number): NewsItem | null {
  if (Math.random() > 0.35) return null;
  return {
    id: `rnd_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    headline: HEADLINES[Math.floor(Math.random() * HEADLINES.length)],
    yearMonth: `${gameYear}/${String(monthIdx + 1).padStart(2, '0')}`,
    category: 'economy',
  };
}
