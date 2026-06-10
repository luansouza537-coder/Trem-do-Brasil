import { Edge, GameResources, GameEvent, GameWorkers } from '../types';

export interface SaveGame {
  version: number;
  savedAt: string;
  edges: Edge[];
  upgradedHubs: string[];
  maintenanceYards: string[];
  constructionType: 'rail' | 'balsa';
  resources: GameResources;
  spentOnResources: number;
  workers: GameWorkers;
  spentOnWorkers: number;
  activeEvents: GameEvent[];
  gameYear: number;
  monthIdx: number;
}

const SAVE_KEY = 'renif_v1_savegame';
const SAVE_VERSION = 1;

export function saveGame(state: Omit<SaveGame, 'version' | 'savedAt'>): void {
  try {
    const save: SaveGame = { ...state, version: SAVE_VERSION, savedAt: new Date().toISOString() };
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // localStorage may be unavailable
  }
}

export function loadGame(): SaveGame | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const save: SaveGame = JSON.parse(raw);
    if (save.version !== SAVE_VERSION) return null;
    return save;
  } catch {
    return null;
  }
}

export function deleteSave(): void {
  localStorage.removeItem(SAVE_KEY);
}

export function hasSave(): boolean {
  return !!localStorage.getItem(SAVE_KEY);
}

export function getSaveDate(): string | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const save: SaveGame = JSON.parse(raw);
    return save.savedAt ? new Date(save.savedAt).toLocaleString('pt-BR') : null;
  } catch {
    return null;
  }
}
