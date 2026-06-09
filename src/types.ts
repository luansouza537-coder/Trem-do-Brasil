export interface City {
  id: string;
  name: string;
  state: string;
  lat: number;
  lng: number;
  type: 'capital' | 'cidade';
}

export interface Edge {
  id: string;
  from: string;
  to: string;
  distance: number;
}

export interface GameStats {
  connectionsCount: number;
  totalDistance: number;
  isComplete: boolean;
  hasErrors: boolean;
}
