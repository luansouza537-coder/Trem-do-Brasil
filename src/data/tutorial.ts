import React from 'react';

export interface TutorialStepDef {
  id: string;
  title: string;
  message: string;
  refKey?: string;
  advanceOn: 'button' | 'action';
  position: 'center' | 'top' | 'bottom';
}

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
    message: 'Sem trabalhadores, nada é construído. O painel lateral foi aberto — clique na aba "Equipe" para contratar seus primeiros operários.',
    refKey: 'tab-operations',
    advanceOn: 'action',
    position: 'bottom',
  },
  {
    id: 'hire_workers',
    title: '👷 Contrate trabalhadores',
    message: 'Clique em "+ 10" várias vezes nos tipos Terraplanagem e Assentamento de Trilhos. Você precisa de pelo menos 50 de Terraplanagem e 30 de Assentamento para construir sua primeira linha.',
    refKey: 'workers-section',
    advanceOn: 'action',
    position: 'bottom',
  },
  {
    id: 'go_to_resources',
    title: '🪨 Compre insumos',
    message: 'Você precisa de aço, brita e cimento para construir. Role para baixo na aba Equipe e compre insumos na seção de Recursos.',
    refKey: 'resources-section',
    advanceOn: 'action',
    position: 'bottom',
  },
  {
    id: 'click_city',
    title: '🗺️ Selecione uma cidade',
    message: 'Ótimo! Agora vá ao mapa e clique em qualquer cidade para selecioná-la como ponto de partida da sua primeira ferrovia.',
    advanceOn: 'action',
    position: 'bottom',
  },
  {
    id: 'build_rail',
    title: '🚂 Construa sua primeira ferrovia',
    message: 'Perfeito! Agora clique em outra cidade para conectar as duas com uma ferrovia. O modo 🚂 Ferrovia já está ativo.',
    advanceOn: 'action',
    position: 'bottom',
  },
  {
    id: 'switch_balsa',
    title: '⚓ Mude para modo Hidrovia',
    message: 'Os grandes rios do Brasil também conectam cidades! Clique no botão "⚓" na barra inferior para mudar para o modo Hidrovia.',
    refKey: 'mode-balsa',
    advanceOn: 'action',
    position: 'center',
  },
  {
    id: 'build_balsa',
    title: '⚓ Construa uma Hidrovia',
    message: 'Agora conecte duas cidades com porto para criar sua primeira rota hidroviária. Sugestão: Santos ↔ Rio de Janeiro.',
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
    title: '🚆 Construa uma linha de passageiros',
    message: 'Conecte duas cidades para criar sua primeira linha de passageiros. Ela gera receita mensal baseada na demanda e tarifa!',
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
