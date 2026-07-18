import { describe, it, expect } from 'vitest';
import { getIntermodalGrants } from '../utils/gameRules';
import type { City, Edge } from '../types';

// ── helpers ──────────────────────────────────────────────────────────────────

let _id = 1;
const city = (state: string, portType?: City['portType']): City => ({
  id: String(_id++),
  name: `${state}-${_id}`,
  state,
  lat: -15,
  lng: -50,
  type: 'cidade',
  portType,
});

const edge = (from: City, to: City): Edge => ({
  id: `${from.id}-${to.id}`,
  from: from.id,
  to: to.id,
  distance: 100,
  type: 'rail',
  status: 'complete',
});

const unlocked = (grants: ReturnType<typeof getIntermodalGrants>) =>
  grants.filter(g => g.unlocked).map(g => g.id);

// ── testes ───────────────────────────────────────────────────────────────────

describe('getIntermodalGrants — amazon_corridor (R$150B)', () => {
  it('porto fluvial AM + porto marítimo SP desbloqueia o grant', () => {
    const manaus  = city('AM', 'fluvial');
    const santos  = city('SP', 'maritime');
    const cities  = [manaus, santos];
    const edges   = [edge(manaus, santos)];
    expect(unlocked(getIntermodalGrants(cities, edges))).toContain('amazon_corridor');
  });

  it('porto fluvial PA + porto marítimo RJ desbloqueia o grant', () => {
    const belem  = city('PA', 'fluvial');
    const rio    = city('RJ', 'maritime');
    expect(unlocked(getIntermodalGrants([belem, rio], [edge(belem, rio)]))).toContain('amazon_corridor');
  });

  it('dois portos fluviais amazônicos sem costeiro NÃO desbloqueia', () => {
    const a = city('AM', 'fluvial');
    const b = city('PA', 'fluvial');
    expect(unlocked(getIntermodalGrants([a, b], [edge(a, b)]))).not.toContain('amazon_corridor');
  });

  it('cidades desconectadas NÃO desbloqueiam (componentes separados)', () => {
    const manaus = city('AM', 'fluvial');
    const santos = city('SP', 'maritime');
    // sem edge entre eles
    expect(unlocked(getIntermodalGrants([manaus, santos], []))).not.toContain('amazon_corridor');
  });
});

describe('getIntermodalGrants — agro_pantanal (R$120B)', () => {
  it('porto fluvial MS + marítimo SP desbloqueia', () => {
    const corumba = city('MS', 'fluvial');
    const santos  = city('SP', 'maritime');
    expect(unlocked(getIntermodalGrants([corumba, santos], [edge(corumba, santos)]))).toContain('agro_pantanal');
  });

  it('porto fluvial MT + marítimo PR desbloqueia', () => {
    const caceres    = city('MT', 'fluvial');
    const paranagua  = city('PR', 'maritime');
    expect(unlocked(getIntermodalGrants([caceres, paranagua], [edge(caceres, paranagua)]))).toContain('agro_pantanal');
  });

  it('porto fluvial AM não conta para agro_pantanal', () => {
    const manaus = city('AM', 'fluvial');
    const santos = city('SP', 'maritime');
    expect(unlocked(getIntermodalGrants([manaus, santos], [edge(manaus, santos)]))).not.toContain('agro_pantanal');
  });
});

describe('getIntermodalGrants — hydro_tiete_parana (R$100B)', () => {
  it('porto fluvial SP + marítimo costeiro desbloqueia', () => {
    const pederneiras = city('SP', 'fluvial');
    const santos      = city('SP', 'maritime');
    expect(unlocked(getIntermodalGrants([pederneiras, santos], [edge(pederneiras, santos)]))).toContain('hydro_tiete_parana');
  });

  it('porto fluvial PR + marítimo desbloqueia', () => {
    const foz      = city('PR', 'fluvial');
    const paranagua = city('PR', 'maritime');
    expect(unlocked(getIntermodalGrants([foz, paranagua], [edge(foz, paranagua)]))).toContain('hydro_tiete_parana');
  });

  it('BUG ANTIGO: porto fluvial RS NÃO deve desbloquear hydro_tiete_parana', () => {
    // Porto Alegre (RS fluvial) + Rio Grande (RS maritime) estava desbloqueando
    // erroneamente o grant Tietê/Paraná antes da correção.
    const portoAlegre = city('RS', 'fluvial');
    const rioGrande   = city('RS', 'maritime');
    expect(unlocked(getIntermodalGrants([portoAlegre, rioGrande], [edge(portoAlegre, rioGrande)]))).not.toContain('hydro_tiete_parana');
  });

  it('porto fluvial SC NÃO deve desbloquear hydro_tiete_parana', () => {
    const sc      = city('SC', 'fluvial');
    const scMar   = city('SC', 'maritime');
    expect(unlocked(getIntermodalGrants([sc, scMar], [edge(sc, scMar)]))).not.toContain('hydro_tiete_parana');
  });
});

describe('getIntermodalGrants — corridor_sul_laguna (R$70B)', () => {
  it('porto fluvial RS + marítimo RS desbloqueia (Porto Alegre → Rio Grande)', () => {
    const portoAlegre = city('RS', 'fluvial');
    const rioGrande   = city('RS', 'maritime');
    expect(unlocked(getIntermodalGrants([portoAlegre, rioGrande], [edge(portoAlegre, rioGrande)]))).toContain('corridor_sul_laguna');
  });

  it('porto fluvial SC + marítimo SC desbloqueia', () => {
    const sc    = city('SC', 'fluvial');
    const scMar = city('SC', 'maritime');
    expect(unlocked(getIntermodalGrants([sc, scMar], [edge(sc, scMar)]))).toContain('corridor_sul_laguna');
  });

  it('porto fluvial RS + marítimo SC (cross-state) desbloqueia', () => {
    const portoAlegre = city('RS', 'fluvial');
    const imbituba    = city('SC', 'maritime');
    expect(unlocked(getIntermodalGrants([portoAlegre, imbituba], [edge(portoAlegre, imbituba)]))).toContain('corridor_sul_laguna');
  });

  it('porto fluvial SP não desbloqueia corridor_sul_laguna', () => {
    const sp    = city('SP', 'fluvial');
    const spMar = city('SP', 'maritime');
    expect(unlocked(getIntermodalGrants([sp, spMar], [edge(sp, spMar)]))).not.toContain('corridor_sul_laguna');
  });
});

describe('getIntermodalGrants — northeast_export (R$80B)', () => {
  it('porto fluvial PE + marítimo PE desbloqueia', () => {
    const petrolina = city('PE', 'fluvial');
    const recife    = city('PE', 'maritime');
    expect(unlocked(getIntermodalGrants([petrolina, recife], [edge(petrolina, recife)]))).toContain('northeast_export');
  });

  it('porto fluvial CE + marítimo CE desbloqueia', () => {
    const ceFluvial = city('CE', 'fluvial');
    const ceMaritimo = city('CE', 'maritime');
    expect(unlocked(getIntermodalGrants([ceFluvial, ceMaritimo], [edge(ceFluvial, ceMaritimo)]))).toContain('northeast_export');
  });

  it('porto fluvial AM não desbloqueia northeast_export', () => {
    const manaus = city('AM', 'fluvial');
    const fortal = city('CE', 'maritime');
    // Amazônico conectado ao NE costeiro: desbloqueia amazon_corridor, mas não northeast_export
    // (a condição de NE exige fluvial do NE, não da Amazônia)
    const result = unlocked(getIntermodalGrants([manaus, fortal], [edge(manaus, fortal)]));
    expect(result).not.toContain('northeast_export');
  });
});

describe('getIntermodalGrants — múltiplos grants simultâneos', () => {
  it('rede grande pode desbloquear vários grants de uma vez', () => {
    // Rede: Manaus(AM fluvial) → Santos(SP maritime) → Corumbá(MS fluvial)
    const manaus   = city('AM', 'fluvial');
    const santos   = city('SP', 'maritime');
    const corumba  = city('MS', 'fluvial');
    const cities   = [manaus, santos, corumba];
    const edges    = [edge(manaus, santos), edge(santos, corumba)];
    const result   = unlocked(getIntermodalGrants(cities, edges));
    expect(result).toContain('amazon_corridor');
    expect(result).toContain('agro_pantanal');
  });

  it('sem nenhuma conexão nenhum grant é desbloqueado', () => {
    const a = city('AM', 'fluvial');
    const b = city('SP', 'maritime');
    expect(unlocked(getIntermodalGrants([a, b], []))).toHaveLength(0);
  });
});
