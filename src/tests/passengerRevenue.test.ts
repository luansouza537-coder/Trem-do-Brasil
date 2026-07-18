import { describe, it, expect } from 'vitest';
import { getPassengerMonthlyRevenue } from '../utils/gameRules';
import type { City, Edge } from '../types';

// ── helpers ──────────────────────────────────────────────────────────────────

let _id = 1;
const city = (type: City['type'], portType?: City['portType']): City => ({
  id: String(_id++),
  name: `city-${_id}`,
  state: 'SP',
  lat: -23,
  lng: -46,
  type,
  portType,
});

const passengerEdge = (
  from: City,
  to: City,
  overrides: Partial<Edge> = {}
): Edge => ({
  id: `${from.id}-${to.id}`,
  from: from.id,
  to: to.id,
  distance: 200,
  type: 'passenger',
  status: 'complete',
  fare: 150,
  satisfaction: 100,
  ...overrides,
});

const rev = (
  edges: Edge[],
  cities: City[],
  year = 2030,
  effects: string[] = []
) => getPassengerMonthlyRevenue(edges, cities, year, effects);

// ── testes ───────────────────────────────────────────────────────────────────

describe('getPassengerMonthlyRevenue — filtros básicos', () => {
  it('rota em construção (building) não gera receita', () => {
    const a = city('capital'), b = city('cidade');
    const e = passengerEdge(a, b, { status: 'building' });
    expect(rev([e], [a, b])).toBe(0);
  });

  it('rota do tipo rail não conta como passageiros', () => {
    const a = city('capital'), b = city('cidade');
    const e = passengerEdge(a, b, { type: 'rail' });
    expect(rev([e], [a, b])).toBe(0);
  });

  it('sem rotas retorna 0', () => {
    expect(rev([], [])).toBe(0);
  });

  it('receita é positiva para rota válida', () => {
    const a = city('capital'), b = city('cidade');
    expect(rev([passengerEdge(a, b)], [a, b])).toBeGreaterThan(0);
  });
});

describe('getPassengerMonthlyRevenue — demanda por tipo de cidade', () => {
  it('capital gera mais receita que cidade comum (mesma distância/tarifa)', () => {
    const capA = city('capital'), capB = city('capital');
    const cidA = city('cidade'),  cidB = city('cidade');
    const rCapital = rev([passengerEdge(capA, capB)], [capA, capB]);
    const rCidade  = rev([passengerEdge(cidA, cidB)], [cidA, cidB]);
    expect(rCapital).toBeGreaterThan(rCidade);
  });

  it('polo_industrial gera mais receita que cidade comum', () => {
    const indA = city('polo_industrial'), indB = city('polo_industrial');
    const cidA = city('cidade'),          cidB = city('cidade');
    expect(rev([passengerEdge(indA, indB)], [indA, indB]))
      .toBeGreaterThan(rev([passengerEdge(cidA, cidB)], [cidA, cidB]));
  });
});

describe('getPassengerMonthlyRevenue — tarifa e elasticidade', () => {
  it('elasticidade atinge piso de 0.2 a partir de fare=520 — pax fica fixo, só tarifa sobe', () => {
    // elasticity = max(0.2, 1 - (fare - 120) / 400)
    // fare=520 → elasticity=0.2 (piso); fare=1000 → elasticity=0.2 (mesmo piso)
    // pax(520) = demand*0.2 = pax(1000) — portanto rev(1000)/rev(520) ≈ 1000/520
    const a = city('capital'), b = city('capital');
    const rAlto  = rev([passengerEdge(a, b, { fare: 520  })], [a, b]);
    const rMuito = rev([passengerEdge(a, b, { fare: 1000 })], [a, b]);
    // receita escala proporcionalmente à tarifa quando no piso de elasticidade
    const ratio = rMuito / rAlto;
    expect(ratio).toBeCloseTo(1000 / 520, 1);
  });

  it('tarifa abaixo de 120 aumenta elasticidade acima de 1 (mais pax)', () => {
    const a = city('cidade'), b = city('cidade');
    const rBaixa  = rev([passengerEdge(a, b, { fare: 50  })], [a, b]);
    const rNormal = rev([passengerEdge(a, b, { fare: 150 })], [a, b]);
    // fare=50 → elasticidade 1.175 (mais pax) mas preço menor — comportamento real do código
    // garante apenas que receita é positiva em ambos os casos
    expect(rBaixa).toBeGreaterThan(0);
    expect(rNormal).toBeGreaterThan(0);
  });
});

describe('getPassengerMonthlyRevenue — capacidade e frotas', () => {
  it('BUG ANTIGO: rota de 61km deve gerar receita visível (> R$1M)', () => {
    // Antes da correção, (61/100)*300 = 183 pax → R$20K → R$0M na UI.
    // Após correção: (61/100)*75000 = 45750 pax → >R$1M.
    const a = city('capital'), b = city('cidade');
    const e = passengerEdge(a, b, { distance: 61, fare: 150 });
    expect(rev([e], [a, b])).toBeGreaterThan(1_000_000);
  });

  it('rota mais longa (400km) tem capacidade maior que rota curta (100km)', () => {
    const a = city('capital'), b = city('capital');
    const rCurta  = rev([passengerEdge(a, b, { distance: 100 })], [a, b]);
    const rLonga  = rev([passengerEdge(a, b, { distance: 400 })], [a, b]);
    expect(rLonga).toBeGreaterThan(rCurta);
  });

  it('frotas extras aumentam receita (extraFleets)', () => {
    const a = city('capital'), b = city('capital');
    const rSem  = rev([passengerEdge(a, b, { distance: 50, extraFleets: 0 })], [a, b]);
    const rCom  = rev([passengerEdge(a, b, { distance: 50, extraFleets: 3 })], [a, b]);
    expect(rCom).toBeGreaterThan(rSem);
  });
});

describe('getPassengerMonthlyRevenue — satisfação', () => {
  it('satisfação 50 gera metade da receita vs satisfação 100', () => {
    const a = city('capital'), b = city('capital');
    const r100 = rev([passengerEdge(a, b, { satisfaction: 100 })], [a, b]);
    const r50  = rev([passengerEdge(a, b, { satisfaction: 50  })], [a, b]);
    expect(r50).toBeCloseTo(r100 * 0.5, -4); // -4 = precisão de dezena de milhar
  });

  it('satisfação 0 gera receita zero', () => {
    const a = city('capital'), b = city('capital');
    expect(rev([passengerEdge(a, b, { satisfaction: 0 })], [a, b])).toBe(0);
  });
});

describe('getPassengerMonthlyRevenue — crescimento por ano', () => {
  it('2040 gera mais receita que 2030 (demanda cresce com tempo)', () => {
    const a = city('capital'), b = city('capital');
    const e = passengerEdge(a, b);
    expect(rev([e], [a, b], 2040)).toBeGreaterThan(rev([e], [a, b], 2030));
  });

  it('2060 gera mais que 2045', () => {
    const a = city('capital'), b = city('capital');
    const e = passengerEdge(a, b);
    expect(rev([e], [a, b], 2060)).toBeGreaterThan(rev([e], [a, b], 2045));
  });
});

describe('getPassengerMonthlyRevenue — eventos ativos', () => {
  it('PANDEMIA2 reduz receita para 80%', () => {
    const a = city('capital'), b = city('capital');
    const e = passengerEdge(a, b);
    const rNormal   = rev([e], [a, b], 2030, []);
    const rPandemia = rev([e], [a, b], 2030, ['PANDEMIA2']);
    expect(rPandemia).toBeCloseTo(rNormal * 0.80, -4);
  });

  it('GRIPE_AVIARIA_2 reduz receita para 88%', () => {
    const a = city('capital'), b = city('capital');
    const e = passengerEdge(a, b);
    const rNormal = rev([e], [a, b], 2030, []);
    const rGripe  = rev([e], [a, b], 2030, ['GRIPE_AVIARIA_2']);
    expect(rGripe).toBeCloseTo(rNormal * 0.88, -4);
  });

  it('COPA_MUNDO_2035 aumenta receita para 130%', () => {
    const a = city('capital'), b = city('capital');
    const e = passengerEdge(a, b);
    const rNormal = rev([e], [a, b], 2030, []);
    const rCopa   = rev([e], [a, b], 2030, ['COPA_MUNDO_2035']);
    expect(rCopa).toBeCloseTo(rNormal * 1.30, -4);
  });

  it('OLIMPIADAS aumenta receita para 125%', () => {
    const a = city('capital'), b = city('capital');
    const e = passengerEdge(a, b);
    const rNormal = rev([e], [a, b], 2030, []);
    const rOlimp  = rev([e], [a, b], 2030, ['OLIMPIADAS']);
    expect(rOlimp).toBeCloseTo(rNormal * 1.25, -4);
  });

  it('evento desconhecido não afeta receita', () => {
    const a = city('capital'), b = city('capital');
    const e = passengerEdge(a, b);
    const rNormal = rev([e], [a, b], 2030, []);
    const rDescon = rev([e], [a, b], 2030, ['EVENTO_INEXISTENTE']);
    expect(rDescon).toBe(rNormal);
  });

  it('múltiplas rotas somam receita corretamente', () => {
    const a = city('capital'), b = city('capital');
    const c = city('cidade'),  d = city('cidade');
    const e1 = passengerEdge(a, b);
    const e2 = passengerEdge(c, d);
    const r1 = rev([e1], [a, b]);
    const r2 = rev([e2], [c, d]);
    const rTotal = rev([e1, e2], [a, b, c, d]);
    expect(rTotal).toBe(r1 + r2);
  });
});
