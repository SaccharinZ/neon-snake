import {
  DIFFICULTIES,
  DIRECTIONS,
  FOOD_SCORE,
  GRID_SIZE,
  LEVEL_EVERY,
  OPPOSITES,
} from './constants';
import type { DifficultyConfig, DifficultyId, Direction } from './constants';

export interface Cell {
  x: number;
  y: number;
}

export type GameStatus = 'ready' | 'playing' | 'paused' | 'gameover' | 'won';
export type DeathReason = 'self';

export interface EatEvent extends Cell {
  at: number;
}

export interface GameState {
  status: GameStatus;
  difficultyId: DifficultyId;
  snake: Cell[];
  prevSnake: Cell[];
  direction: Direction;
  food: Cell | null;
  foodSpawnedAt: number;
  score: number;
  eaten: number;
  level: number;
  stepMs: number;
  tickedAt: number;
  tickDuration: number;
  lastEat: EatEvent | null;
  deathReason: DeathReason | null;
}

interface AdvanceBase {
  snake: Cell[];
  direction: Direction;
  food: Cell | null;
  score: number;
  eaten: number;
  level: number;
  stepMs: number;
}

export type AdvanceResult =
  | (AdvanceBase & { type: 'move' })
  | (AdvanceBase & { type: 'eat' })
  | (AdvanceBase & { type: 'won' })
  | { type: 'dead'; reason: DeathReason };

const DEFAULT_DIFFICULTY: DifficultyId = 'normal';

function cloneCell(cell: Cell): Cell {
  return { x: cell.x, y: cell.y };
}

export function getDifficulty(difficultyId: DifficultyId): DifficultyConfig {
  return DIFFICULTIES[difficultyId] ?? DIFFICULTIES[DEFAULT_DIFFICULTY];
}

export function getLevel(eaten: number): number {
  return 1 + Math.floor(eaten / LEVEL_EVERY);
}

export function getStepMs(difficultyId: DifficultyId, eaten: number): number {
  const config = getDifficulty(difficultyId);
  const speedUps = Math.floor(eaten / LEVEL_EVERY);
  return Math.max(config.minMs, config.baseMs - speedUps * config.acceleration);
}

export function createInitialSnake(grid = GRID_SIZE): Cell[] {
  const mid = Math.floor(grid / 2);
  return [
    { x: mid + 1, y: mid },
    { x: mid, y: mid },
    { x: mid - 1, y: mid },
    { x: mid - 2, y: mid },
  ];
}

/**
 * Pick a uniformly random free cell. Passing in an RNG keeps the engine easy
 * to test without mocking global state.
 */
export function spawnFood(
  snake: readonly Cell[],
  grid = GRID_SIZE,
  random: () => number = Math.random,
): Cell | null {
  const occupied = new Set(snake.map((cell) => `${cell.x},${cell.y}`));
  const freeCells: Cell[] = [];

  for (let y = 0; y < grid; y += 1) {
    for (let x = 0; x < grid; x += 1) {
      if (!occupied.has(`${x},${y}`)) {
        freeCells.push({ x, y });
      }
    }
  }

  if (freeCells.length === 0) return null;

  const index = Math.min(
    freeCells.length - 1,
    Math.floor(random() * freeCells.length),
  );
  return freeCells[index] ?? null;
}

export function createGame(
  difficultyId: DifficultyId = DEFAULT_DIFFICULTY,
): GameState {
  const config = getDifficulty(difficultyId);
  const snake = createInitialSnake();

  return {
    status: 'ready',
    difficultyId: config.id,
    snake,
    prevSnake: snake.map(cloneCell),
    direction: 'right',
    food: spawnFood(snake),
    foodSpawnedAt: 0,
    score: 0,
    eaten: 0,
    level: 1,
    stepMs: config.baseMs,
    tickedAt: 0,
    tickDuration: config.baseMs,
    lastEat: null,
    deathReason: null,
  };
}

export function isOpposite(a: Direction, b: Direction): boolean {
  return OPPOSITES[a] === b;
}

/**
 * Advance one logical frame. The board edges wrap around, so moving past a
 * boundary re-enters from the opposite side. The tail cell is allowed to be
 * entered on a normal move because it vacates in the same tick; when food is
 * eaten the tail stays put, so every current body cell is a collision.
 */
export function advanceGame(
  state: GameState,
  direction: Direction,
): AdvanceResult {
  const vector = DIRECTIONS[direction];
  const currentHead = state.snake[0];

  if (!currentHead) {
    return { type: 'dead', reason: 'self' };
  }

  const nextHead: Cell = {
    x: (currentHead.x + vector.x + GRID_SIZE) % GRID_SIZE,
    y: (currentHead.y + vector.y + GRID_SIZE) % GRID_SIZE,
  };

  const willEat =
    state.food !== null &&
    nextHead.x === state.food.x &&
    nextHead.y === state.food.y;
  const collidableBody = willEat ? state.snake : state.snake.slice(0, -1);

  if (
    collidableBody.some(
      (cell) => cell.x === nextHead.x && cell.y === nextHead.y,
    )
  ) {
    return { type: 'dead', reason: 'self' };
  }

  const snake = [nextHead, ...state.snake.map(cloneCell)];
  if (!willEat) snake.pop();

  if (!willEat) {
    return {
      type: 'move',
      snake,
      direction,
      food: state.food,
      score: state.score,
      eaten: state.eaten,
      level: state.level,
      stepMs: state.stepMs,
    };
  }

  const eaten = state.eaten + 1;
  const score = state.score + FOOD_SCORE;
  const level = getLevel(eaten);
  const stepMs = getStepMs(state.difficultyId, eaten);
  const nextFood = spawnFood(snake);

  if (nextFood === null) {
    return {
      type: 'won',
      snake,
      direction,
      food: null,
      score,
      eaten,
      level,
      stepMs,
    };
  }

  return {
    type: 'eat',
    snake,
    direction,
    food: nextFood,
    score,
    eaten,
    level,
    stepMs,
  };
}
