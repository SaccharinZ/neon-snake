import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceGame,
  createGame,
  getLevel,
  getStepMs,
  spawnFood,
} from '../src/game/engine.js';

function makeState(overrides = {}) {
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

test('createGame starts with a valid snake and food', () => {
  const game = createGame('normal');
  assert.equal(game.status, 'ready');
  assert.equal(game.snake.length, 4);
  assert.equal(game.score, 0);
  assert.ok(game.food);
  assert.ok(
    !game.snake.some(
      (cell) => cell.x === game.food.x && cell.y === game.food.y,
    ),
  );
});

test('advanceGame moves the snake one cell in the chosen direction', () => {
  const state = makeState();
  const result = advanceGame(state, 'up');

  assert.equal(result.type, 'move');
  assert.deepEqual(result.snake[0], { x: 5, y: 4 });
  assert.equal(result.snake.length, 3);
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

  assert.equal(result.type, 'eat');
  assert.equal(result.score, 10);
  assert.equal(result.eaten, 1);
  assert.equal(result.snake.length, 3);
  assert.ok(
    !result.snake.some(
      (cell) => cell.x === result.food.x && cell.y === result.food.y,
    ),
  );
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

  assert.equal(result.type, 'move');
  assert.deepEqual(result.snake[0], { x: 0, y: 5 });
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

  assert.equal(result.type, 'move');
  assert.deepEqual(result.snake[0], { x: 5, y: 19 });
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

  assert.deepEqual(result, { type: 'dead', reason: 'self' });
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

  assert.deepEqual(result, { type: 'dead', reason: 'self' });
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

  assert.equal(result.type, 'move');
  assert.deepEqual(result.snake[0], { x: 4, y: 5 });
  assert.equal(result.snake.length, 4);
});

test('food spawns only on free cells', () => {
  const snake = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
  ];
  const food = spawnFood(snake, 3, () => 0);

  assert.deepEqual(food, { x: 2, y: 0 });
});

test('spawnFood returns null when the board is full', () => {
  const snake = [];
  for (let y = 0; y < 4; y += 1) {
    for (let x = 0; x < 4; x += 1) {
      snake.push({ x, y });
    }
  }

  assert.equal(spawnFood(snake, 4), null);
});

test('speed levels increase and respect the floor', () => {
  assert.equal(getLevel(0), 1);
  assert.equal(getLevel(5), 2);
  assert.equal(getLevel(10), 3);

  assert.equal(getStepMs('normal', 0), 115);
  assert.equal(getStepMs('normal', 5), 108);
  assert.equal(getStepMs('normal', 100), 68);
});
