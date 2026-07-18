import { describe, it, expect } from 'vitest';
import { getConstructionMonths } from '../utils/gameRules';
import type { City, GameWorkers } from '../types';

const workers = (terra: number, assent: number, sinal = 0): GameWorkers => ({
  terraplanagem: terra,
  assentamento: assent,
  sinalizacao: sinal,
  explosivos: 0,
  manutencao: 0,
});

const city = (state: string): City => ({
  id: state,
  name: state,
  state,
  lat: -15,
  lng: -50,
  type: 'cidade',
});

const SP = city('SP');
const AM = city('AM'); // Norte
const SC = city('SC'); // Montanha

describe('getConstructionMonths — ferrovia', () => {
  it('retorna mínimo de 4 meses para rotas muito curtas', () => {
    const months = getConstructionMonths(SP, SP, 10, 'rail', workers(600, 600));
    expect(months).toBeGreaterThanOrEqual(4);
  });

  it('rotas no Norte levam mais tempo que no Centro-Oeste (mesmo km)', () => {
    const centro = getConstructionMonths(SP, SP, 200, 'rail', workers(600, 600));
    const norte  = getConstructionMonths(AM, SP, 200, 'rail', workers(600, 600));
    expect(norte).toBeGreaterThan(centro);
  });

  it('rotas em estados montanhosos levam mais tempo que planície', () => {
    const planicie  = getConstructionMonths(SP, SP, 200, 'rail', workers(600, 600));
    const montanha  = getConstructionMonths(SC, SP, 200, 'rail', workers(600, 600));
    expect(montanha).toBeGreaterThan(planicie);
  });

  it('equipe maior reduz tempo de construção', () => {
    const pequena = getConstructionMonths(SP, SP, 300, 'rail', workers(50, 50));
    const grande  = getConstructionMonths(SP, SP, 300, 'rail', workers(600, 600));
    expect(grande).toBeLessThan(pequena);
  });

  it('equipe acima de 2000 não reduz mais (hard cap)', () => {
    const dois_mil    = getConstructionMonths(SP, SP, 500, 'rail', workers(1000, 1000));
    const tres_mil    = getConstructionMonths(SP, SP, 500, 'rail', workers(1500, 1500));
    expect(tres_mil).toBeLessThanOrEqual(dois_mil);
  });

  it('equipe de sinalização grande adiciona bônus de velocidade', () => {
    const semSinal  = getConstructionMonths(SP, SP, 300, 'rail', workers(600, 600, 0));
    const comSinal  = getConstructionMonths(SP, SP, 300, 'rail', workers(600, 600, 500));
    expect(comSinal).toBeLessThanOrEqual(semSinal);
  });
});

describe('getConstructionMonths — balsa', () => {
  it('base de 6 meses para distâncias curtas', () => {
    const months = getConstructionMonths(SP, SP, 100, 'balsa', workers(35, 35));
    expect(months).toBeGreaterThanOrEqual(4);
    expect(months).toBeLessThanOrEqual(7);
  });

  it('distâncias longas aumentam tempo da balsa', () => {
    const curta  = getConstructionMonths(SP, SP, 100,  'balsa', workers(35, 35));
    const longa  = getConstructionMonths(SP, SP, 1200, 'balsa', workers(35, 35));
    expect(longa).toBeGreaterThan(curta);
  });

  it('equipe grande de assentamento (≥200) aplica bônus 0.75', () => {
    const pequena = getConstructionMonths(SP, SP, 400, 'balsa', workers(35, 35));
    const grande  = getConstructionMonths(SP, SP, 400, 'balsa', workers(200, 200));
    expect(grande).toBeLessThan(pequena);
  });
});
