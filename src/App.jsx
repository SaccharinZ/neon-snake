import { useEffect, useState } from 'react';
import { GameBoard } from './components/GameBoard';
import {
  DIFFICULTIES,
  DIFFICULTY_ORDER,
  FOOD_SCORE,
  GRID_SIZE,
  LEVEL_EVERY,
} from './game/constants';
import {
  loadSoundPreference,
  saveSoundPreference,
} from './game/storage';
import { useSnakeGame } from './game/useSnakeGame';

const STATUS_META = {
  ready: { label: '待命', tone: 'idle' },
  playing: { label: '运行中', tone: 'live' },
  paused: { label: '已暂停', tone: 'warning' },
  gameover: { label: '已结束', tone: 'danger' },
  won: { label: '已通关', tone: 'win' },
};

const KEY_TO_DIRECTION = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
};

const padScore = (value) => String(value).padStart(4, '0');
const padLength = (value) => String(value).padStart(2, '0');

function SnakeMark() {
  return (
    <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path
        d="M9.5 14.5a7 7 0 0 1 7-7h8a7 7 0 0 1 0 14h-9a7 7 0 0 0 0 14h10.5"
        stroke="currentColor"
        strokeWidth="4.2"
        strokeLinecap="round"
      />
      <circle cx="30" cy="31.5" r="2.7" fill="currentColor" />
    </svg>
  );
}

function SpeakerIcon({ muted }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 9.5v5h3.4l4.3 3.5V6L7.4 9.5H4Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      {muted ? (
        <path
          d="m16 9.5 4 5m0-5-4 5"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      ) : (
        <>
          <path
            d="M15.5 9a4.3 4.3 0 0 1 0 6"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <path
            d="M18 6.7a7.5 7.5 0 0 1 0 10.6"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}

function PauseIcon({ paused }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {paused ? (
        <path d="m9 7 8 5-8 5V7Z" fill="currentColor" />
      ) : (
        <>
          <rect x="7" y="6" width="3.4" height="12" rx="1" fill="currentColor" />
          <rect x="13.6" y="6" width="3.4" height="12" rx="1" fill="currentColor" />
        </>
      )}
    </svg>
  );
}

function ArrowIcon({ direction }) {
  const rotation = {
    up: 0,
    right: 90,
    down: 180,
    left: 270,
  }[direction];

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <path
        d="M12 19V5m0 0L6 11m6-6 6 6"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RestartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 11a8 8 0 1 0-2.2 5.8M20 5v6h-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StatCard({ variant, label, english, value, footer }) {
  return (
    <article className={`score-card score-card--${variant}`}>
      <div className="score-card__head">
        <span>{label}</span>
        <span className="score-card__en">{english}</span>
      </div>
      <strong key={value} className="score-card__value">
        {value}
      </strong>
      {footer}
    </article>
  );
}

export default function App() {
  const [soundEnabled, setSoundEnabled] = useState(loadSoundPreference);
  const {
    game,
    bestScore,
    difficulty,
    startGame,
    pauseGame,
    togglePause,
    turn,
    changeDifficulty,
  } = useSnakeGame({ soundEnabled });

  const status = STATUS_META[game.status] ?? STATUS_META.ready;
  const difficultyLocked =
    game.status === 'playing' || game.status === 'paused';
  const canPause = game.status === 'playing' || game.status === 'paused';
  const levelProgress = game.eaten % LEVEL_EVERY;
  const selectedDifficulty = DIFFICULTIES[difficulty];

  useEffect(() => {
    saveSoundPreference(soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (target instanceof HTMLElement) {
        const tagName = target.tagName;
        if (
          tagName === 'INPUT' ||
          tagName === 'TEXTAREA' ||
          tagName === 'SELECT' ||
          target.isContentEditable
        ) {
          return;
        }
        if (
          (tagName === 'BUTTON' || tagName === 'A') &&
          (event.code === 'Space' || event.code === 'Enter')
        ) {
          return;
        }
      }

      const direction = KEY_TO_DIRECTION[event.code];
      if (direction) {
        if (game.status === 'playing') {
          event.preventDefault();
          turn(direction);
        }
        return;
      }

      if (event.code === 'Space') {
        event.preventDefault();
        if (game.status === 'playing' || game.status === 'paused') {
          togglePause();
        } else {
          startGame();
        }
      } else if (event.code === 'Enter') {
        if (
          game.status === 'ready' ||
          game.status === 'gameover' ||
          game.status === 'won'
        ) {
          event.preventDefault();
          startGame();
        } else if (game.status === 'paused') {
          event.preventDefault();
          togglePause();
        }
      } else if (event.code === 'KeyP') {
        if (game.status === 'playing' || game.status === 'paused') {
          event.preventDefault();
          togglePause();
        }
      } else if (event.code === 'KeyR') {
        event.preventDefault();
        startGame();
      } else if (event.code === 'Escape' && game.status === 'playing') {
        event.preventDefault();
        pauseGame();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [game.status, pauseGame, startGame, togglePause, turn]);

  const handleDifficultyClick = (difficultyId, event) => {
    event.currentTarget.blur();
    changeDifficulty(difficultyId);
  };

  const handleDirectionClick = (direction, event) => {
    event.currentTarget.blur();
    turn(direction);
  };

  const handleTogglePause = (event) => {
    event.currentTarget.blur();
    togglePause();
  };

  const handleRestart = (event) => {
    event.currentTarget.blur();
    startGame();
  };

  const handleSoundToggle = (event) => {
    event.currentTarget.blur();
    setSoundEnabled((enabled) => !enabled);
  };

  return (
    <div className="app">
      <div className="ambient ambient--lime" aria-hidden="true" />
      <div className="ambient ambient--pink" aria-hidden="true" />
      <div className="ambient ambient--cyan" aria-hidden="true" />
      <div className="page-grid" aria-hidden="true" />

      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <SnakeMark />
          </div>
          <div className="brand-copy">
            <p className="brand-kicker">LOCAL ARCADE · 001</p>
            <h1 className="brand-name">
              NEON <em>SNAKE</em>
            </h1>
            <p className="brand-subtitle">霓虹贪吃蛇</p>
          </div>
        </div>

        <div className="topbar-actions">
          <span className="tech-chip">
            <span className="tech-chip__dot" />
            REACT + CANVAS
          </span>
          <button
            type="button"
            className={`sound-toggle ${soundEnabled ? 'is-on' : ''}`}
            onClick={handleSoundToggle}
            aria-pressed={soundEnabled}
            aria-label={soundEnabled ? '关闭音效' : '开启音效'}
          >
            <SpeakerIcon muted={!soundEnabled} />
            <span>{soundEnabled ? '音效 开' : '音效 关'}</span>
          </button>
        </div>
      </header>

      <main className="arcade-layout">
        <section className="play-column" aria-label="游戏区域">
          <div className="scoreboard">
            <StatCard
              variant="score"
              label="当前得分"
              english="SCORE"
              value={padScore(game.score)}
              footer={
                <div className="level-meter">
                  <span className="level-meter__label">
                    LEVEL {String(game.level).padStart(2, '0')}
                  </span>
                  <span className="level-meter__bars" aria-hidden="true">
                    {Array.from({ length: LEVEL_EVERY }, (_, index) => (
                      <i
                        key={index}
                        className={
                          index < levelProgress ? 'is-filled' : undefined
                        }
                      />
                    ))}
                  </span>
                </div>
              }
            />
            <StatCard
              variant="best"
              label="最高记录"
              english="BEST"
              value={padScore(bestScore)}
              footer={<p className="score-card__foot">保存在本地</p>}
            />
            <StatCard
              variant="length"
              label="蛇身长度"
              english="LENGTH"
              value={padLength(game.snake.length)}
              footer={<p className="score-card__foot">每次 +{FOOD_SCORE} 分</p>}
            />
          </div>

          <div className="board-shell">
            <div className="board-chrome">
              <div className={`status-pill status-pill--${status.tone}`}>
                <span className="status-dot" />
                {status.label}
              </div>
              <span className="board-grid-label">
                GRID {GRID_SIZE} × {GRID_SIZE}
              </span>
              <button
                type="button"
                className="pause-button"
                onClick={handleTogglePause}
                disabled={!canPause}
                aria-label={game.status === 'paused' ? '继续游戏' : '暂停游戏'}
              >
                <PauseIcon paused={game.status === 'paused'} />
                <span>{game.status === 'paused' ? '继续' : '暂停'}</span>
              </button>
            </div>

            <GameBoard
              game={game}
              bestScore={bestScore}
              onStart={startGame}
              onResume={togglePause}
              onTurn={turn}
            />

            <div className="board-footer">
              <span>
                <i className="legend-dot legend-dot--snake" />
                霓虹蛇
              </span>
              <span>
                <i className="legend-dot legend-dot--food" />能量果 +{FOOD_SCORE}
              </span>
              <span className="board-footer__hint">边界环绕 · WASD 转向</span>
            </div>
          </div>
        </section>

        <aside className="side-column">
          <section className="side-panel">
            <div className="panel-heading">
              <h2>速度档位</h2>
              <span>01 / DIFFICULTY</span>
            </div>
            <div className="difficulty-list" role="group" aria-label="难度选择">
              {DIFFICULTY_ORDER.map((difficultyId, index) => {
                const option = DIFFICULTIES[difficultyId];
                const active = difficulty === difficultyId;
                return (
                  <button
                    key={difficultyId}
                    type="button"
                    className={`difficulty-option ${active ? 'is-active' : ''}`}
                    aria-pressed={active}
                    disabled={difficultyLocked}
                    title={
                      difficultyLocked
                        ? '游戏进行中无法切换难度'
                        : `${option.label}：${option.description}`
                    }
                    onClick={(event) =>
                      handleDifficultyClick(difficultyId, event)
                    }
                  >
                    <span className="difficulty-index">0{index + 1}</span>
                    <span className="difficulty-copy">
                      <strong>{option.label}</strong>
                      <small>{option.description}</small>
                    </span>
                    <span className="difficulty-bars" aria-hidden="true">
                      {[0, 1, 2].map((bar) => (
                        <i
                          key={bar}
                          className={bar <= index ? 'is-active' : undefined}
                        />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="panel-note">
              {difficultyLocked
                ? '本局进行中，难度已锁定。'
                : `当前：${selectedDifficulty.label} · 每 ${LEVEL_EVERY} 颗加速`}
            </p>
          </section>

          <section className="side-panel controls-panel">
            <div className="panel-heading">
              <h2>方向控制</h2>
              <span>02 / CONTROLS</span>
            </div>
            <div
              className="dpad"
              role="group"
              aria-label="触屏方向键"
              data-disabled={game.status !== 'playing'}
            >
              <button
                type="button"
                className="dpad-button dpad-button--up"
                aria-label="向上"
                disabled={game.status !== 'playing'}
                onClick={(event) => handleDirectionClick('up', event)}
              >
                <ArrowIcon direction="up" />
              </button>
              <button
                type="button"
                className="dpad-button dpad-button--left"
                aria-label="向左"
                disabled={game.status !== 'playing'}
                onClick={(event) => handleDirectionClick('left', event)}
              >
                <ArrowIcon direction="left" />
              </button>
              <span className="dpad-center" aria-hidden="true">
                <i />
              </span>
              <button
                type="button"
                className="dpad-button dpad-button--right"
                aria-label="向右"
                disabled={game.status !== 'playing'}
                onClick={(event) => handleDirectionClick('right', event)}
              >
                <ArrowIcon direction="right" />
              </button>
              <button
                type="button"
                className="dpad-button dpad-button--down"
                aria-label="向下"
                disabled={game.status !== 'playing'}
                onClick={(event) => handleDirectionClick('down', event)}
              >
                <ArrowIcon direction="down" />
              </button>
            </div>
            <div className="shortcut-list">
              <span>
                <kbd>WASD</kbd>
                <i>/</i>
                <kbd>↑↓←→</kbd>
                移动
              </span>
              <span>
                <kbd>SPACE</kbd>
                暂停 / 继续
              </span>
            </div>
          </section>

          <section className="brief-panel">
            <div className="panel-heading">
              <h2>任务简报</h2>
              <span>03 / BRIEF</span>
            </div>
            <ol className="brief-list">
              <li>
                <span>01</span>
                <p>
                  吞下粉色能量果，每次增加 <strong>+{FOOD_SCORE}</strong> 分。
                </p>
              </li>
              <li>
                <span>02</span>
                <p>
                  每吃 <strong>{LEVEL_EVERY}</strong> 颗，速度提升一级。
                </p>
              </li>
              <li>
                <span>03</span>
                <p>边界是环绕通道，咬到自己则本轮结束。</p>
              </li>
            </ol>
          </section>

          <button type="button" className="restart-button" onClick={handleRestart}>
            <RestartIcon />
            重新开局
            <span className="keycap">R</span>
          </button>
        </aside>
      </main>

      <footer className="footer">
        <span>NEON SNAKE · BUILD 001</span>
        <span className="footer-separator" aria-hidden="true" />
        <span>纯前端游戏 · 最高分仅保存在此浏览器</span>
      </footer>

      <p className="sr-only" aria-live="polite">
        {status.label}，当前得分 {game.score}，最高分 {bestScore}，蛇身长度{' '}
        {game.snake.length} 格。
      </p>
    </div>
  );
}
