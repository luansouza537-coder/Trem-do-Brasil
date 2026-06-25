import React from 'react';

export interface TutorialStepDef {
  id: string;
  title: string;
  message: string;
  refKey?: string;
  advanceOn: 'button' | 'action';
  position: 'center' | 'top' | 'bottom';
}

// Pre-selected short routes so we know exact worker/resource requirements
export const TUTORIAL_ROUTES = {
  rail:      { cityAId: '1',  cityBId: '28', label: 'São Paulo → Campinas',    distanceKm: 84 },
  balsa:     { cityAId: '29', cityBId: '2',  label: 'Santos → Rio de Janeiro', distanceKm: 343 },
  passenger: { cityAId: '1',  cityBId: '28', label: 'São Paulo → Campinas',    distanceKm: 84 },
} as const;

// Worker targets intentionally generous so player has capacity for all tutorial routes
export const TUTORIAL_REQS = {
  workers: {
    terraplanagem: 500,
    assentamento:  500,
  },
  resources: {
    aco:     168,  // ceil(84 × 2.0) for SP→Campinas
    brita:   336,  // ceil(84 × 4.0)
    cimento: 168,  // ceil(84 × 2.0)
  },
} as const;

export const TUTORIAL_STEPS: TutorialStepDef[] = [
  {
    id: 'welcome',
    title: '👋 Bem-vindo ao RENIF!',
    message: 'Você é o diretor da Rede Ferroviária Nacional. Sua missão: conectar todas as cidades do Brasil antes de 2077. Vamos aprender o básico juntos.',
    advanceOn: 'button',
    position: 'center',
  },
  {
    id: 'go_to_team',
    title: '👷 Contrate sua equipe',
    message: 'Toque no botão ⬆ no topo direito do painel para expandi-lo, depois clique na aba "Equipe" para contratar seus primeiros operários.',
    refKey: 'tab-operations',
    advanceOn: 'action',
    position: 'bottom',
  },
  {
    id: 'hire_workers',
    title: '👷 Contrate trabalhadores',
    message: 'Contrate 500 Terraplanagem e 500 Assentamento. Clique em "+10" várias vezes em cada tipo — quanto mais, melhor! Isso garantirá capacidade para todas as obras do tutorial.',
    refKey: 'workers-section',
    advanceOn: 'action',
    position: 'bottom',
  },
  {
    id: 'go_to_resources',
    title: '🪨 Compre insumos',
    message: 'Compre materiais para São Paulo → Campinas: 168 Aço, 335 Brita e 168 Cimento. Role para baixo e clique em "Comprar" em cada recurso até atingir esses valores.',
    refKey: 'resources-section',
    advanceOn: 'action',
    position: 'bottom',
  },
  {
    id: 'click_city',
    title: '🗺️ Clique em São Paulo',
    message: 'Agora vá ao mapa e clique em São Paulo (cidade destacada em âmbar) para selecioná-la como ponto de partida.',
    advanceOn: 'action',
    position: 'bottom',
  },
  {
    id: 'build_rail',
    title: '🚂 Conecte Campinas',
    message: 'São Paulo selecionado! Agora clique em Campinas (também destacada) para construir sua primeira ferrovia de carga.',
    advanceOn: 'action',
    position: 'bottom',
  },
  {
    id: 'switch_balsa',
    title: '⚓ Mude para modo Hidrovia',
    message: 'Os rios do Brasil também conectam cidades! Clique no botão "⚓" na barra inferior para mudar para o modo Hidrovia.',
    refKey: 'mode-balsa',
    advanceOn: 'action',
    position: 'center',
  },
  {
    id: 'build_balsa',
    title: '⚓ Santos → Rio de Janeiro',
    message: 'No mapa, clique em Santos (destacada) e depois em Rio de Janeiro para criar sua primeira rota hidroviária entre os dois portos.',
    advanceOn: 'action',
    position: 'bottom',
  },
  {
    id: 'switch_passenger',
    title: '🚆 Mude para modo Passageiros',
    message: 'Hora de transportar pessoas! Clique em "🚆" na barra inferior para ativar o modo de ferrovia de passageiros.',
    refKey: 'mode-passenger',
    advanceOn: 'action',
    position: 'center',
  },
  {
    id: 'build_passenger',
    title: '🚆 SP → Campinas (Passageiros)',
    message: 'Clique em São Paulo e depois em Campinas para criar sua primeira linha de passageiros. Ela gera receita mensal baseada na demanda!',
    advanceOn: 'action',
    position: 'bottom',
  },
  {
    id: 'done',
    title: '🎉 Tutorial concluído!',
    message: 'Você aprendeu o essencial do RENIF. Agora conecte todas as 162 cidades do Brasil antes de 2077. Boa sorte, diretor!',
    advanceOn: 'button',
    position: 'center',
  },
];

// Registry of DOM refs for tutorial highlighting
const tutorialRefRegistry = new Map<string, React.RefObject<HTMLElement>>();

export function registerTutorialRef(key: string, ref: React.RefObject<HTMLElement>) {
  tutorialRefRegistry.set(key, ref);
}

export function getTutorialRef(key: string): React.RefObject<HTMLElement> | undefined {
  return tutorialRefRegistry.get(key);
}
