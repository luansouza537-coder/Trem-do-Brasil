export interface TutorialStep {
  id: string;
  icon: string;
  title: string;
  body: string;
  /** ID of a DOM element to highlight (optional) */
  highlightId?: string;
  /** If set, the "Próximo" button is disabled until the player performs this action */
  waitForAction?: 'click_city' | 'draw_route';
  canSkip: boolean;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    icon: '🚂',
    title: 'Bem-vindo ao Trem do Brasil!',
    body: 'Você assume o controle da RENIF em 2027. Tem <strong>50 anos</strong> e <strong>R$ 1,25 trilhão</strong> para construir a maior malha ferroviária do Brasil. Conecte cidades, gere receita e expanda a rede antes que o tempo acabe.',
    canSkip: true,
  },
  {
    id: 'select_city',
    icon: '📍',
    title: 'Selecione uma cidade',
    body: 'Clique em qualquer marcador no mapa para ver os detalhes da cidade. Cidades do tipo <strong>Polo Industrial</strong> e <strong>Mineração</strong> geram até 40% mais receita por km.',
    waitForAction: 'click_city',
    canSkip: false,
  },
  {
    id: 'draw_route',
    icon: '🛤️',
    title: 'Conecte duas cidades',
    body: 'Com uma cidade selecionada, clique em outra para <strong>iniciar uma ferrovia</strong>. A obra leva meses — o tempo avança automaticamente. Quanto mais rotas, mais receita mensal.',
    waitForAction: 'draw_route',
    canSkip: false,
  },
  {
    id: 'team_tab',
    icon: '👷',
    title: 'Gerencie sua equipe',
    body: 'Na aba <strong>Equipe</strong> você contrata trabalhadores e compra insumos (aço, cimento, etc.). Sem insumos suficientes as obras param. Fique de olho na folha de pagamento mensal!',
    highlightId: 'tab-operations',
    canSkip: true,
  },
  {
    id: 'financial_tab',
    icon: '💰',
    title: 'Controle financeiro',
    body: 'A aba <strong>Finanças</strong> mostra seu fluxo de caixa, histórico de saldo e rotas em operação. Se o saldo mensal ficar negativo por muitos meses, a empresa vai à falência!',
    highlightId: 'tab-financial',
    canSkip: true,
  },
];
