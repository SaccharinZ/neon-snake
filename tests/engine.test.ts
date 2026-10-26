import { expect, test } from 'vitest';
import type { AdvanceResult, Cell, GameState } from '../src/game/engine';
import {
  advanceGame,
  createGame,
  getLevel,
  getStepMs,
  spawnFood,
} from '../src/game/engine';

function makeState(overrides: Partial<GameState> = {}): GameState {
  const base = createGame('normal');
  return {
    ...base,
    status: 'playing',
    snake: [
      { x: 5, y: 5 },
      { x: 4, y: 5 },
      { x: 3, y: 5 },
    ],
    food: { x: 10, y: 10 },
    ...overrides,
  };
}

function expectResultType<T extends AdvanceResult['type']>(
  result: AdvanceResult,
  type: T,
): asserts result is Extract<AdvanceResult, { type: T }> {
  expect(result.type).toBe(type);
  if (result.type !== type) {
    throw new Error(`Expected result type "${type}", received "${result.type}".`);
  }
}

test('createGame starts with a valid snake and food', () => {
  const game = createGame('normal');
  expect(game.status).toBe('ready');
  expect(game.snake).toHaveLength(4);
  expect(game.score).toBe(0);
  expect(game.food).not.toBeNull();

  const food = game.food;
  if (!food) throw new Error('Expected initial food to be spawned.');
  expect(
    game.snake.some((cell) => cell.x === food.x && cell.y === food.y),
  ).toBe(false);
});

test('advanceGame moves the snake one cell in the chosen direction', () => {
  const state = makeState();
  const result = advanceGame(state, 'up');

  expectResultType(result, 'move');
  expect(result.snake[0]).toEqual({ x: 5, y: 4 });
  expect(result.snake).toHaveLength(3);
});

test('eating food grows the snake, scores ten, and respawns food', () => {
  const state = makeState({
    snake: [
      { x: 5, y: 5 },
      { x: 4, y: 5 },
    ],
    food: { x: 6, y: 5 },
  });
  const result = advanceGame(state, 'right');

  expectResultType(result, 'eat');
  expect(result.score).toBe(10);
  expect(result.eaten).toBe(1);
  expect(result.snake).toHaveLength(3);
  expect(result.food).not.toBeNull();

  const food = result.food;
  if (!food) throw new Error('Expected replacement food to be spawned.');
  expect(
    result.snake.some((cell) => cell.x === food.x && cell.y === food.y),
  ).toBe(false);
});

test('crossing the right edge wraps the head to the left side', () => {
  const state = makeState({
    snake: [
      { x: 19, y: 5 },
      { x: 18, y: 5 },
    ],
    food: { x: 10, y: 10 },
  });
  const result = advanceGame(state, 'right');

  expectResultType(result, 'move');
  expect(result.snake[0]).toEqual({ x: 0, y: 5 });
});

test('crossing the top edge wraps the head to the bottom side', () => {
  const state = makeState({
    snake: [
      { x: 5, y: 0 },
      { x: 5, y: 1 },
    ],
    food: { x: 10, y: 10 },
  });
  const result = advanceGame(state, 'up');

  expectResultType(result, 'move');
  expect(result.snake[0]).toEqual({ x: 5, y: 19 });
});

test('wrapping into the opposite side of the body still ends the game', () => {
  const state = makeState({
    snake: [
      { x: 19, y: 5 },
      { x: 0, y: 5 },
      { x: 1, y: 5 },
      { x: 2, y: 5 },
    ],
    food: { x: 10, y: 10 },
  });
  const result = advanceGame(state, 'right');

  expect(result).toEqual({ type: 'dead', reason: 'self' });
});

test('the snake cannot bite its own body', () => {
  const state = makeState({
    snake: [
      { x: 5, y: 5 },
      { x: 4, y: 5 },
      { x: 4, y: 6 },
      { x: 5, y: 6 },
      { x: 6, y: 6 },
    ],
    food: { x: 15, y: 15 },
  });
  const result = advanceGame(state, 'down');

  expect(result).toEqual({ type: 'dead', reason: 'self' });
});

test('moving into the vacating tail cell is legal', () => {
  const state = makeState({
    snake: [
      { x: 5, y: 5 },
      { x: 5, y: 6 },
      { x: 4, y: 6 },
      { x: 4, y: 5 },
    ],
    food: { x: 15, y: 15 },
  });
  const result = advanceGame(state, 'left');

  expectResultType(result, 'move');
  expect(result.snake[0]).toEqual({ x: 4, y: 5 });
  expect(result.snake).toHaveLength(4);
});

test('food spawns only on free cells', () => {
  const snake: Cell[] = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
  ];
  const food = spawnFood(snake, 3, () => 0);

  expect(food).toEqual({ x: 2, y: 0 });
});

test('spawnFood returns null when the board is full', () => {
  const snake: Cell[] = [];
  for (let y = 0; y < 4; y += 1) {
    for (let x = 0; x < 4; x += 1) {
      snake.push({ x, y });
    }
  }

  expect(spawnFood(snake, 4)).toBeNull();
});

test('speed levels increase and respect the floor', () => {
  expect(getLevel(0)).toBe(1);
  expect(getLevel(5)).toBe(2);
  expect(getLevel(10)).toBe(3);

  expect(getStepMs('normal', 0)).toBe(115);
  expect(getStepMs('normal', 5)).toBe(108);
  expect(getStepMs('normal', 100)).toBe(68);
});
