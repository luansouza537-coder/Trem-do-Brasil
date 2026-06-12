import { Edge, GameResources, GameEvent, GameWorkers, ConstructionProject, NewsItem } from '../types';

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
  constructionQueue: ConstructionProject[];
  totalRevenue: number;
  completedMissions: string[];
  newsItems: NewsItem[];
  triggeredEventIds: string[];
  currentPartyStatusEffect: string | null;
}

const getSaveKey = (slot: number) =>
  slot === 1 ? 'renif_v1_savegame' : `renif_v1_savegame_${slot}`;

const SAVE_VERSION = 1;

export function saveGame(state: Omit<SaveGame, 'version' | 'savedAt'>, slot = 1): void {
  try {
    const save: SaveGame = { ...state, version: SAVE_VERSION, savedAt: new Date().toISOString() };
    localStorage.setItem(getSaveKey(slot), JSON.stringify(save));
  } catch {
    // localStorage may be unavailable
  }
}

export function loadGame(slot = 1): SaveGame | null {
  try {
    const raw = localStorage.getItem(getSaveKey(slot));
    if (!raw) return null;
    const save: SaveGame = JSON.parse(raw);
    if (save.version !== SAVE_VERSION) return null;
    // Backwards compatibility defaults
    if (!save.triggeredEventIds) save.triggeredEventIds = [];
    if (save.currentPartyStatusEffect === undefined) save.currentPartyStatusEffect = null;
    return save;
  } catch {
    return null;
  }
}

export function deleteSave(slot = 1): void {
  localStorage.removeItem(getSaveKey(slot));
}

export function hasSave(slot = 1): boolean {
  return !!localStorage.getItem(getSaveKey(slot));
}

export function getSaveDate(slot = 1): string | null {
  try {
    const raw = localStorage.getItem(getSaveKey(slot));
    if (!raw) return null;
    const save: SaveGame = JSON.parse(raw);
    return save.savedAt ? new Date(save.savedAt).toLocaleString('pt-BR') : null;
  } catch {
    return null;
  }
}

export function getAllSlotDates(): (string | null)[] {
  return [1, 2, 3].map(slot => getSaveDate(slot));
}
