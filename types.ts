
export interface PoemPair {
  id: string;
  upper: string;
  lower: string;
  author: string;
  title: string;
}

export interface TileData {
  id: string;
  text: string;
  pairId: string;
  type: 'upper' | 'lower';
  isMatched: boolean;
  isNew?: boolean;
  x: number;
  y: number;
}

export type GameStatus = 'idle' | 'playing' | 'paused' | 'gameOver' | 'victory';

export interface ScoreEntry {
  points: number;
  multiplier: number;
  time: number;
}
