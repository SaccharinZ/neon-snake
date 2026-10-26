import { useCallback, useEffect, useRef, useState } from 'react';
import { DIFFICULTIES } from './constants';
import type { DifficultyId, Direction } from './constants';
import { advanceGame, createGame, isOpposite } from './engine';
import type { Cell, EatEvent, GameState } from './engine';
import { loadBestScore, saveBestScore } from './storage';
import {
  playCrashSound,
  playEatSound,
  playLevelUpSound,
  playStartSound,
  playWinSound,
  unlockAudio,
} from './sound';

export interface UseSnakeGameOptions {
  soundEnabled?: boolean;
}

export interface SnakeGameController {
  game: GameState;
  bestScore: number;
  difficulty: DifficultyId;
  startGame: () => void;
  pauseGame: () => void;
  togglePause: () => void;
  turn: (direction: Direction) => boolean;
  changeDifficulty: (difficultyId: DifficultyId) => void;
}

const cloneCell = (cell: Cell): Cell => ({ x: cell.x, y: cell.y });

export function useSnakeGame({
  soundEnabled = true,
}: UseSnakeGameOptions = {}): SnakeGameController {
  const [game, setGame] = useState<GameState>(() => createGame());
  const [bestScore, setBestScore] = useState<number>(loadBestScore);
  const [difficulty, setDifficulty] = useState<DifficultyId>('normal');

  const gameRef = useRef<GameState>(game);
  const bestRef = useRef<number>(bestScore);
  const directionQueueRef = useRef<Direction[]>([]);
  const soundRef = useRef<boolean>(soundEnabled);
  const difficultyRef = useRef<DifficultyId>(difficulty);
  const stepRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    soundRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    bestRef.current = bestScore;
  }, [bestScore]);

  const commit = useCallback((nextGame: GameState) => {
    gameRef.current = nextGame;
    setGame(nextGame);
  }, []);

  const updateBest = useCallback((score: number) => {
    if (score <= bestRef.current) return;
    bestRef.current = score;
    setBestScore(score);
    saveBestScore(score);
  }, []);

  const startGame = useCallback(() => {
    unlockAudio();
    directionQueueRef.current = [];
    const nextGame = createGame(difficultyRef.current);
    const now = performance.now();

    commit({
      ...nextGame,
      status: 'playing',
      foodSpawnedAt: now,
    });

    if (soundRef.current) playStartSound();
  }, [commit]);

  const pauseGame = useCallback(() => {
    const current = gameRef.current;
    if (current.status !== 'playing') return;
    commit({ ...current, status: 'paused' });
  }, [commit]);

  const resumeGame = useCallback(() => {
    const current = gameRef.current;
    if (current.status !== 'paused') return;
    commit({
      ...current,
      status: 'playing',
      prevSnake: current.snake.map(cloneCell),
      tickedAt: 0,
    });
  }, [commit]);

  const togglePause = useCallback(() => {
    const current = gameRef.current;
    if (current.status === 'playing') {
      pauseGame();
    } else if (current.status === 'paused') {
      resumeGame();
    }
  }, [pauseGame, resumeGame]);

  const turn = useCallback((direction: Direction): boolean => {
    const current = gameRef.current;
    if (current.status !== 'playing') return false;

    const queue = directionQueueRef.current;
    const lastDirection = queue.at(-1) ?? current.direction;

    if (direction === lastDirection || isOpposite(direction, lastDirection)) {
      return false;
    }

    if (queue.length >= 2) return false;

    queue.push(direction);
    return true;
  }, []);

  const changeDifficulty = useCallback(
    (difficultyId: DifficultyId) => {
      if (!DIFFICULTIES[difficultyId]) return;

      const current = gameRef.current;
      if (current.status === 'playing' || current.status === 'paused') return;

      directionQueueRef.current = [];
      difficultyRef.current = difficultyId;
      setDifficulty(difficultyId);

      const nextGame = createGame(difficultyId);
      commit({ ...nextGame, foodSpawnedAt: performance.now() });
    },
    [commit],
  );

  stepRef.current = () => {
    const current = gameRef.current;
    if (current.status !== 'playing') return;

    const direction = directionQueueRef.current.shift() ?? current.direction;
    const result = advanceGame(current, direction);
    const now = performance.now();

    if (result.type === 'dead') {
      commit({
        ...current,
        status: 'gameover',
        direction,
        deathReason: result.reason,
      });

      if (soundRef.current) playCrashSound();
      return;
    }

    const lastEat: EatEvent | null =
      result.type === 'eat' && current.food
        ? { ...current.food, at: now }
        : current.lastEat;

    const nextGame: GameState = {
      ...current,
      status: result.type === 'won' ? 'won' : 'playing',
      snake: result.snake,
      prevSnake: current.snake.map(cloneCell),
      direction,
      food: result.food,
      score: result.score,
      eaten: result.eaten,
      level: result.level,
      stepMs: result.stepMs,
      tickedAt: now,
      tickDuration: Math.max(36, Math.min(current.stepMs * 0.9, 120)),
      lastEat,
      foodSpawnedAt:
        result.type === 'eat' ? now : current.foodSpawnedAt,
    };

    commit(nextGame);
    updateBest(result.score);

    if (result.type === 'eat' && soundRef.current) {
      playEatSound();
      if (result.level > current.level) playLevelUpSound();
    }

    if (result.type === 'won' && soundRef.current) {
      playWinSound();
    }
  };

  useEffect(() => {
    if (game.status !== 'playing') return undefined;

    let frameId = 0;
    let cancelled = false;
    let lastMoveAt = performance.now();

    const frame = (now: number): void => {
      if (cancelled) return;

      if (now - lastMoveAt >= gameRef.current.stepMs) {
        lastMoveAt = now;
        stepRef.current?.();
      }

      frameId = window.requestAnimationFrame(frame);
    };

    frameId = window.requestAnimationFrame(frame);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
    };
  }, [game.status]);

  useEffect(() => {
    const handleVisibilityChange = (): void => {
      if (document.visibilityState === 'hidden') pauseGame();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pauseGame]);

  return {
    game,
    bestScore,
    difficulty,
    startGame,
    pauseGame,
    togglePause,
    turn,
    changeDifficulty,
  };
}
