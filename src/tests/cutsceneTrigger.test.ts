import { describe, it, expect } from 'vitest';
import type { Edge } from '../types';

// Replica da lógica de disparo de cutscene em App.tsx (linhas ~329-351)
// Garante que cada tipo de rota dispara APENAS a cutscene correspondente.
function pickCutscene(
  edges: Pick<Edge, 'type' | 'status'>[],
  shown: string[]
): string | null {
  const firstRail      = edges.find(e => e.type === 'rail'      && e.status === 'complete');
  const firstBalsa     = edges.find(e => e.type === 'balsa'     && e.status === 'complete');
  const firstPassenger = edges.find(e => e.type === 'passenger' && e.status === 'complete');

  if (firstRail      && !shown.includes('first_rail'))      return 'first_rail';
  if (firstBalsa     && !shown.includes('first_balsa'))     return 'first_balsa';
  if (firstPassenger && !shown.includes('first_passenger')) return 'first_passenger';
  return null;
}

const edge = (type: Edge['type'], status: Edge['status'] = 'complete'): Pick<Edge, 'type' | 'status'> =>
  ({ type, status });

describe('cutscene trigger — tipo de rota', () => {
  it('primeira ferrovia dispara first_rail', () => {
    expect(pickCutscene([edge('rail')], [])).toBe('first_rail');
  });

  it('primeira hidrovia dispara first_balsa (não first_rail)', () => {
    expect(pickCutscene([edge('balsa')], [])).toBe('first_balsa');
  });

  it('primeira linha de passageiros dispara first_passenger', () => {
    expect(pickCutscene([edge('passenger')], [])).toBe('first_passenger');
  });

  it('BUG ANTIGO: hidrovia criada antes da ferrovia não deve disparar first_rail', () => {
    // Cenário que gerou o bug: usuário criou hidrovia primeiro
    const result = pickCutscene([edge('balsa')], []);
    expect(result).not.toBe('first_rail');
    expect(result).toBe('first_balsa');
  });

  it('rota em construção (building) não dispara cutscene', () => {
    expect(pickCutscene([edge('rail', 'building')], [])).toBeNull();
  });

  it('cutscene já exibida não dispara novamente', () => {
    expect(pickCutscene([edge('rail')], ['first_rail'])).toBeNull();
  });

  it('quando ferrovia e hidrovia concluem juntas, first_rail tem prioridade', () => {
    const result = pickCutscene([edge('rail'), edge('balsa')], []);
    expect(result).toBe('first_rail');
  });

  it('após first_rail exibido, hidrovia subsequente dispara first_balsa', () => {
    const result = pickCutscene([edge('rail'), edge('balsa')], ['first_rail']);
    expect(result).toBe('first_balsa');
  });

  it('sem rotas concluídas retorna null', () => {
    expect(pickCutscene([], [])).toBeNull();
  });
});
