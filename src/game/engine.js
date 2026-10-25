import {
  DIFFICULTIES,
  DIRECTIONS,
  FOOD_SCORE,
  GRID_SIZE,
  LEVEL_EVERY,
} from './constants.js';

const DEFAULT_DIFFICULTY = 'normal';

function cloneCell(cell) {
  return { x: cell.x, y: cell.y };
}

export function getDifficulty(difficultyId) {
  return DIFFICULTIES[difficultyId] ?? DIFFICULTIES[DEFAULT_DIFFICULTY];
}

export function getLevel(eaten) {
  return 1 + Math.floor(eaten / LEVEL_EVERY);
}

export function getStepMs(difficultyId, eaten) {
  const config = getDifficulty(difficultyId);
  const speedUps = Math.floor(eaten / LEVEL_EVERY);
  return Math.max(config.minMs, config.baseMs - speedUps * config.acceleration);
}

export function createInitialSnake(grid = GRID_SIZE) {
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
export function spawnFood(snake, grid = GRID_SIZE, random = Math.random) {
  const occupied = new Set(snake.map((cell) => `${cell.x},${cell.y}`));
  const freeCells = [];

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
  return freeCells[index];
}

export function createGame(difficultyId = DEFAULT_DIFFICULTY) {
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

export function isOpposite(a, b) {
  return (
    (a === 'up' && b === 'down') ||
    (a === 'down' && b === 'up') ||
    (a === 'left' && b === 'right') ||
    (a === 'right' && b === 'left')
  );
}

/**
 * Advance one logical frame. The board edges wrap around, so moving past a
 * boundary re-enters from the opposite side. The tail cell is allowed to be
 * entered on a normal move because it vacates in the same tick; when food is
 * eaten the tail stays put, so every current body cell is a collision.
 */
export function advanceGame(state, direction) {
  const vector = DIRECTIONS[direction] ?? DIRECTIONS.right;
  const currentHead = state.snake[0];
  const nextHead = {
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
