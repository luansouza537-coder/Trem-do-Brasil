import { City, Edge, GameResources, GameWorkers, GameEvent, ConstructionProject } from '../types';

export type AdvisorPriority = 'critical' | 'warning' | 'tip' | 'positive';

export interface AdvisorMessage {
  id: string;
  priority: AdvisorPriority;
  icon: string;
  title: string;
  body: string;
}

interface AdvisorInput {
  cities: City[];
  edges: Edge[];
  maintenanceYards: string[];
  upgradedHubs: string[];
  resources: GameResources;
  workers: GameWorkers;
  currentBudget: number;
  monthlyRevenue: number;
  activeEvents: GameEvent[];
  constructionQueue: ConstructionProject[];
  unmaintainedEdgesCount: number;
  gameYear: number;
  monthIdx: number;
}

function fmt(n: number): string {
  if (n >= 1e12) return `R$ ${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9)  return `R$ ${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6)  return `R$ ${(n / 1e6).toFixed(1)}M`;
  return `R$ ${n.toLocaleString('pt-BR')}`;
}

export function getAdvisorMessages(input: AdvisorInput): AdvisorMessage[] {
  const msgs: AdvisorMessage[] = [];
  const {
    cities, edges, maintenanceYards, upgradedHubs, resources, workers,
    currentBudget, monthlyRevenue, activeEvents, constructionQueue,
    unmaintainedEdgesCount, gameYear, monthIdx,
  } = input;

  const completedEdges = edges.filter(e => e.status !== 'building');
  const yearsLeft = 2077 - gameYear - (monthIdx > 0 ? 0 : 0);
  const connectedCityIds = new Set<string>();
  completedEdges.forEach(e => { connectedCityIds.add(e.from); connectedCityIds.add(e.to); });
  const isolatedCities = cities.filter(c => !connectedCityIds.has(c.id));
  const totalWorkers = Object.values(workers).reduce((a, b) => a + b, 0);
  const monthsOfBudget = monthlyRevenue > 0 ? currentBudget / Math.max(1, monthlyRevenue) : Infinity;

  // --- CRITICAL ---

  // Budget critically low (< 6 months of revenue runway)
  if (currentBudget < 0) {
    msgs.push({
      id: 'budget_negative',
      priority: 'critical',
      icon: '🔴',
      title: 'Orçamento negativo!',
      body: `Você está no vermelho (${fmt(currentBudget)}). Obras serão bloqueadas. Aguarde receita ou venda ativos.`,
    });
  } else if (currentBudget < 50_000_000_000 && monthlyRevenue < 5_000_000_000) {
    msgs.push({
      id: 'budget_critical',
      priority: 'critical',
      icon: '🚨',
      title: 'Caixa crítico',
      body: `Restam apenas ${fmt(currentBudget)} e sua receita mensal é ${fmt(monthlyRevenue)}. Suspenda obras novas.`,
    });
  }

  // Deadline pressure
  if (yearsLeft <= 5 && isolatedCities.length > 0) {
    msgs.push({
      id: 'deadline_pressure',
      priority: 'critical',
      icon: '⏳',
      title: `${yearsLeft} anos para o prazo`,
      body: `Ainda há ${isolatedCities.length} cidade(s) sem conexão. Priorize rotas curtas para fechar a malha.`,
    });
  }

  // Too many unresolved crises
  const crisisEvents = activeEvents.filter(e => e.type === 'crisis' || e.type === 'strike');
  if (crisisEvents.length >= 3) {
    msgs.push({
      id: 'crisis_overload',
      priority: 'critical',
      icon: '☠️',
      title: 'Múltiplas crises simultâneas',
      body: `${crisisEvents.length} crises ativas. Resolva primeiro as que têm maior custo mensal para parar a sangria de caixa.`,
    });
  }

  // No workers at all while queue is running
  if (totalWorkers < 20 && constructionQueue.length > 0) {
    msgs.push({
      id: 'no_workers',
      priority: 'critical',
      icon: '👷',
      title: 'Obras sem mão de obra',
      body: `Você tem ${totalWorkers} trabalhadores mas ${constructionQueue.length} obra(s) em andamento. Contrate equipes urgentemente.`,
    });
  }

  // --- WARNINGS ---

  // Unmaintained edges
  if (unmaintainedEdgesCount > 0 && maintenanceYards.length > 0) {
    msgs.push({
      id: 'unmaintained',
      priority: 'warning',
      icon: '🔧',
      title: `${unmaintainedEdgesCount} trecho(s) sem manutenção`,
      body: 'Trechos descobertos perdem receita e podem causar acidentes. Construa um Pátio de Manutenção próximo.',
    });
  } else if (unmaintainedEdgesCount > 0 && maintenanceYards.length === 0) {
    msgs.push({
      id: 'no_yards',
      priority: 'warning',
      icon: '🔧',
      title: 'Nenhum Pátio de Manutenção',
      body: `Toda a sua malha (${completedEdges.length} trechos) está sem cobertura. Construa um pátio para evitar penalidades.`,
    });
  }

  // Low revenue despite many connections
  if (completedEdges.length >= 5 && monthlyRevenue < 2_000_000_000) {
    msgs.push({
      id: 'low_revenue',
      priority: 'warning',
      icon: '📉',
      title: 'Receita baixa para a malha atual',
      body: `${completedEdges.length} conexões gerando apenas ${fmt(monthlyRevenue)}/mês. Priorize rotas entre capitais e polos industriais — pagam mais.`,
    });
  }

  // Budget runway short
  if (currentBudget > 0 && monthsOfBudget < 24 && monthlyRevenue < currentBudget) {
    msgs.push({
      id: 'runway_short',
      priority: 'warning',
      icon: '💸',
      title: `Caixa para ~${Math.round(monthsOfBudget)} meses`,
      body: 'Com o ritmo atual de gastos, seu orçamento esgota rápido. Expanda a malha para aumentar receita antes de contratar mais.',
    });
  }

  // Resources nearly depleted with active queue
  const criticalResources: string[] = [];
  if (resources.aco < 50 && constructionQueue.length > 0) criticalResources.push('Aço');
  if (resources.cimento < 50 && constructionQueue.length > 0) criticalResources.push('Cimento');
  if (resources.explosivos < 5 && constructionQueue.some(p => p.resourcesConsumed.explosivos > 0)) criticalResources.push('Explosivos');
  if (criticalResources.length > 0) {
    msgs.push({
      id: 'resources_low',
      priority: 'warning',
      icon: '📦',
      title: 'Materiais em falta',
      body: `${criticalResources.join(', ')} estão com estoque crítico. Ative a auto-compra ou adquira manualmente para não travar obras.`,
    });
  }

  // Many isolated capitals
  const isolatedCapitals = isolatedCities.filter(c => c.type === 'capital');
  if (isolatedCapitals.length >= 3) {
    msgs.push({
      id: 'isolated_capitals',
      priority: 'warning',
      icon: '🏛️',
      title: `${isolatedCapitals.length} capitais isoladas`,
      body: `${isolatedCapitals.slice(0, 3).map(c => c.name).join(', ')}${isolatedCapitals.length > 3 ? '...' : ''} ainda sem conexão. Capitais geram as maiores receitas por km.`,
    });
  }

  // Idle workers (many workers, no active construction)
  if (totalWorkers > 200 && constructionQueue.length === 0) {
    msgs.push({
      id: 'idle_workers',
      priority: 'warning',
      icon: '😴',
      title: 'Equipe ociosa',
      body: `${totalWorkers} trabalhadores contratados mas nenhuma obra ativa. Você paga folha sem retorno — inicie uma construção ou demita excedente.`,
    });
  }

  // --- TIPS ---

  // Suggest closest isolated city to connect
  if (isolatedCities.length > 0 && completedEdges.length >= 2) {
    const connectedCities = cities.filter(c => connectedCityIds.has(c.id));
    let bestTarget: City | null = null;
    let bestDist = Infinity;
    for (const iso of isolatedCities) {
      for (const conn of connectedCities) {
        const d = Math.sqrt((iso.lat - conn.lat) ** 2 + (iso.lng - conn.lng) ** 2);
        if (d < bestDist) { bestDist = d; bestTarget = iso; }
      }
    }
    if (bestTarget) {
      const approxKm = Math.round(bestDist * 111);
      msgs.push({
        id: 'closest_isolated',
        priority: 'tip',
        icon: '📍',
        title: `${bestTarget.name} está isolada`,
        body: `Cidade mais próxima da malha atual (~${approxKm} km). Conectá-la aumenta a cobertura e gera receita adicional.`,
      });
    }
  }

  // Suggest hub upgrade for high-connection cities
  const highConnCities = cities.filter(c => {
    const conns = completedEdges.filter(e => e.from === c.id || e.to === c.id).length;
    return conns >= 3 && !upgradedHubs.includes(c.id);
  });
  if (highConnCities.length > 0) {
    msgs.push({
      id: 'suggest_hub',
      priority: 'tip',
      icon: '★',
      title: 'Terminal Central recomendado',
      body: `${highConnCities[0].name} tem ${completedEdges.filter(e => e.from === highConnCities[0].id || e.to === highConnCities[0].id).length} conexões. Upgrade para Terminal Central libera +1 slot de conexão.`,
    });
  }

  // Low worker diversity (only one type hired)
  const hiredTypes = Object.entries(workers).filter(([, v]) => v > 0).length;
  if (hiredTypes === 1 && totalWorkers > 0 && constructionQueue.length > 0) {
    msgs.push({
      id: 'worker_diversity',
      priority: 'tip',
      icon: '👥',
      title: 'Equipe pouco diversificada',
      body: 'Construções eficientes precisam de terraplanagem + assentamento + sinalização. Ter só um tipo reduz a velocidade das obras.',
    });
  }

  // Positive feedback
  if (completedEdges.length >= 10 && activeEvents.filter(e => e.type === 'crisis').length === 0 && currentBudget > 200_000_000_000) {
    msgs.push({
      id: 'doing_well',
      priority: 'positive',
      icon: '🚂',
      title: 'Malha em expansão sólida',
      body: `${completedEdges.length} conexões, caixa saudável (${fmt(currentBudget)}) e sem crises ativas. Bom momento para acelerar obras na região Norte.`,
    });
  }

  if (monthlyRevenue > 50_000_000_000) {
    msgs.push({
      id: 'high_revenue',
      priority: 'positive',
      icon: '📈',
      title: 'Receita expressiva',
      body: `${fmt(monthlyRevenue)}/mês — sua malha está gerando retorno real. Reinvista em pátios de manutenção para proteger esse fluxo.`,
    });
  }

  // Deduplicate and cap at 5 messages, prioritizing critical > warning > tip > positive
  const order: AdvisorPriority[] = ['critical', 'warning', 'tip', 'positive'];
  msgs.sort((a, b) => order.indexOf(a.priority) - order.indexOf(b.priority));
  return msgs.slice(0, 5);
}
