export const GRID_SIZE = 20;
export const FOOD_SCORE = 10;
export const LEVEL_EVERY = 5;

export type Direction = 'up' | 'down' | 'left' | 'right';
export type DifficultyId = 'chill' | 'normal' | 'turbo';

export interface DirectionVector {
  x: number;
  y: number;
  label: string;
}

export const DIRECTIONS: Record<Direction, DirectionVector> = {
  up: { x: 0, y: -1, label: '上' },
  down: { x: 0, y: 1, label: '下' },
  left: { x: -1, y: 0, label: '左' },
  right: { x: 1, y: 0, label: '右' },
};

export const OPPOSITES: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

export interface DifficultyConfig {
  id: DifficultyId;
  label: string;
  en: string;
  description: string;
  baseMs: number;
  acceleration: number;
  minMs: number;
}

export const DIFFICULTIES: Record<DifficultyId, DifficultyConfig> = {
  chill: {
    id: 'chill',
    label: '悠闲',
    en: 'CHILL',
    description: '慢节奏，适合热身',
    baseMs: 155,
    acceleration: 6,
    minMs: 94,
  },
  normal: {
    id: 'normal',
    label: '标准',
    en: 'NORMAL',
    description: '经典速度，刚刚好',
    baseMs: 115,
    acceleration: 7,
    minMs: 68,
  },
  turbo: {
    id: 'turbo',
    label: '狂飙',
    en: 'TURBO',
    description: '手速与反应的试炼',
    baseMs: 82,
    acceleration: 5,
    minMs: 52,
  },
};

export const DIFFICULTY_ORDER = [
  'chill',
  'normal',
  'turbo',
] as const satisfies readonly DifficultyId[];
