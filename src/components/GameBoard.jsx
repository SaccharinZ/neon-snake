import { useEffect, useRef } from 'react';
import { DIRECTIONS, GRID_SIZE } from '../game/constants';

const TAU = Math.PI * 2;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundRectPath(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function getAnimatedSnake(game, now) {
  const { snake, prevSnake, status, tickedAt, tickDuration } = game;

  if (
    status !== 'playing' ||
    !tickedAt ||
    !prevSnake ||
    prevSnake.length === 0
  ) {
    return snake;
  }

  const progress = clamp(
    (now - tickedAt) / Math.max(1, tickDuration),
    0,
    1,
  );

  if (progress >= 1) return snake;

  return snake.map((segment, index) => {
    const previous = index === 0 ? prevSnake[0] : prevSnake[index - 1];
    if (!previous) return segment;

    // Take the short way around the board so a wrapped head slides across the
    // edge instead of gliding through every cell in between.
    let targetX = segment.x;
    let targetY = segment.y;
    const deltaX = targetX - previous.x;
    const deltaY = targetY - previous.y;

    if (deltaX > 1) targetX -= GRID_SIZE;
    if (deltaX < -1) targetX += GRID_SIZE;
    if (deltaY > 1) targetY -= GRID_SIZE;
    if (deltaY < -1) targetY += GRID_SIZE;

    return {
      x: previous.x + (targetX - previous.x) * progress,
      y: previous.y + (targetY - previous.y) * progress,
    };
  });
}

function drawBoard(context, width, height, cell, now) {
  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, '#081219');
  background.addColorStop(0.55, '#071017');
  background.addColorStop(1, '#09150f');
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  const glow = context.createRadialGradient(
    width * 0.48,
    height * 0.42,
    0,
    width * 0.48,
    height * 0.42,
    width * 0.72,
  );
  glow.addColorStop(0, 'rgba(52, 122, 91, 0.2)');
  glow.addColorStop(0.6, 'rgba(27, 70, 60, 0.055)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);

  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      if ((x + y) % 2 === 0) {
        context.fillStyle = 'rgba(149, 255, 204, 0.018)';
        context.fillRect(x * cell, y * cell, cell, cell);
      }
    }
  }

  context.strokeStyle = 'rgba(148, 255, 207, 0.048)';
  context.lineWidth = 1;
  context.beginPath();
  for (let index = 1; index < GRID_SIZE; index += 1) {
    const line = Math.round(index * cell) + 0.5;
    context.moveTo(line, 0);
    context.lineTo(line, height);
    context.moveTo(0, line);
    context.lineTo(width, line);
  }
  context.stroke();

  const scanY = (now * 0.018) % (height + 180) - 90;
  const scan = context.createLinearGradient(0, scanY - 70, 0, scanY + 70);
  scan.addColorStop(0, 'rgba(132, 255, 189, 0)');
  scan.addColorStop(0.5, 'rgba(132, 255, 189, 0.028)');
  scan.addColorStop(1, 'rgba(132, 255, 189, 0)');
  context.fillStyle = scan;
  context.fillRect(0, scanY - 70, width, 140);

  context.strokeStyle = 'rgba(198, 255, 74, 0.25)';
  context.lineWidth = 1.5;
  const corner = Math.max(12, cell * 0.65);
  const inset = Math.max(6, cell * 0.22);
  context.beginPath();
  context.moveTo(inset, inset + corner);
  context.lineTo(inset, inset);
  context.lineTo(inset + corner, inset);
  context.moveTo(width - inset - corner, inset);
  context.lineTo(width - inset, inset);
  context.lineTo(width - inset, inset + corner);
  context.moveTo(width - inset, height - inset - corner);
  context.lineTo(width - inset, height - inset);
  context.lineTo(width - inset - corner, height - inset);
  context.moveTo(inset + corner, height - inset);
  context.lineTo(inset, height - inset);
  context.lineTo(inset, height - inset - corner);
  context.stroke();
}

function drawFood(context, game, now, cell) {
  if (!game.food) return;

  const x = (game.food.x + 0.5) * cell;
  const y = (game.food.y + 0.5) * cell;
  const spawnAge = game.foodSpawnedAt
    ? (now - game.foodSpawnedAt) / 220
    : 1;
  const settle = clamp(spawnAge, 0, 1);
  const scale = 0.35 + 0.65 * (1 - (1 - settle) ** 3);
  const pulse = 0.5 + 0.5 * Math.sin(now / 240);
  const radius = cell * (0.26 + pulse * 0.018) * scale;

  context.save();
  context.translate(x, y);

  const aura = context.createRadialGradient(
    0,
    0,
    radius * 0.2,
    0,
    0,
    cell * 0.92,
  );
  aura.addColorStop(0, 'rgba(255, 77, 145, 0.34)');
  aura.addColorStop(0.45, 'rgba(255, 77, 145, 0.11)');
  aura.addColorStop(1, 'rgba(255, 77, 145, 0)');
  context.fillStyle = aura;
  context.beginPath();
  context.arc(0, 0, cell * 0.92, 0, TAU);
  context.fill();

  context.save();
  context.rotate(now * 0.0014);
  context.strokeStyle = 'rgba(255, 119, 175, 0.48)';
  context.lineWidth = Math.max(1, cell * 0.035);
  context.lineCap = 'round';
  context.beginPath();
  context.arc(0, 0, cell * 0.325 * scale, -0.35, Math.PI * 0.88);
  context.stroke();
  context.beginPath();
  context.arc(0, 0, cell * 0.325 * scale, Math.PI * 0.98, Math.PI * 1.78);
  context.stroke();
  context.restore();

  const core = context.createRadialGradient(
    -radius * 0.35,
    -radius * 0.4,
    radius * 0.08,
    0,
    0,
    radius,
  );
  core.addColorStop(0, '#ffe2ec');
  core.addColorStop(0.28, '#ff9abf');
  core.addColorStop(0.72, '#ff4d91');
  core.addColorStop(1, '#ce1d68');
  context.fillStyle = core;
  context.shadowColor = 'rgba(255, 77, 145, 0.85)';
  context.shadowBlur = cell * 0.62;
  context.beginPath();
  context.arc(0, 0, Math.max(1, radius), 0, TAU);
  context.fill();
  context.shadowBlur = 0;

  context.fillStyle = 'rgba(255, 255, 255, 0.9)';
  context.beginPath();
  context.arc(
    -radius * 0.3,
    -radius * 0.36,
    Math.max(1, cell * 0.042),
    0,
    TAU,
  );
  context.fill();

  context.restore();
}

function drawEatBurst(context, game, now, cell) {
  if (!game.lastEat) return;

  const age = (now - game.lastEat.at) / 560;
  if (age < 0 || age >= 1) return;

  const centerX = (game.lastEat.x + 0.5) * cell;
  const centerY = (game.lastEat.y + 0.5) * cell;
  const eased = 1 - (1 - age) ** 2;

  context.save();
  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * TAU + index * 0.21;
    const distance = cell * (0.15 + eased * (0.52 + (index % 4) * 0.13));
    const x = centerX + Math.cos(angle) * distance;
    const y = centerY + Math.sin(angle) * distance;
    const dot = Math.max(0.8, cell * 0.045 * (1 - age * 0.55));

    context.globalAlpha = (1 - age) * 0.9;
    context.fillStyle = index % 3 === 0 ? '#ffe2a7' : '#ff7bad';
    context.beginPath();
    context.arc(x, y, dot, 0, TAU);
    context.fill();
  }
  context.restore();
}

function drawSnakeLayer(
  context,
  game,
  positions,
  cell,
  offsetX = 0,
  offsetY = 0,
) {
  const count = positions.length;

  for (let index = count - 1; index >= 0; index -= 1) {
    const segment = positions[index];
    const isHead = index === 0;
    const ratio = count > 1 ? index / (count - 1) : 0;
    const taper = 1 - ratio * 0.08;
    const inset = cell * (isHead ? 0.065 : 0.1);
    const size = (cell - inset * 2) * taper;
    const x = (segment.x + offsetX) * cell + (cell - size) / 2;
    const y = (segment.y + offsetY) * cell + (cell - size) / 2;
    const radius = cell * (isHead ? 0.3 : 0.23);

    context.save();
    if (isHead) {
      context.shadowColor = 'rgba(190, 255, 76, 0.7)';
      context.shadowBlur = cell * 0.7;
      context.fillStyle = '#caff4d';
    } else {
      const hue = 82 + ratio * 76;
      const lightness = 64 - ratio * 15;
      context.fillStyle = `hsl(${hue} 88% ${lightness}%)`;
    }

    roundRectPath(context, x, y, size, size, radius);
    context.fill();

    if (isHead) {
      context.shadowBlur = 0;
      const shine = context.createLinearGradient(x, y, x + size, y + size);
      shine.addColorStop(0, 'rgba(255, 255, 255, 0.34)');
      shine.addColorStop(0.48, 'rgba(255, 255, 255, 0.04)');
      shine.addColorStop(1, 'rgba(0, 0, 0, 0.08)');
      context.fillStyle = shine;
      roundRectPath(context, x, y, size, size, radius);
      context.fill();
    } else {
      context.fillStyle = 'rgba(255, 255, 255, 0.13)';
      roundRectPath(
        context,
        x + size * 0.2,
        y + size * 0.13,
        size * 0.6,
        Math.max(1, size * 0.09),
        size * 0.06,
      );
      context.fill();
    }
    context.restore();
  }

  const head = positions[0];
  if (!head) return;

  const direction = DIRECTIONS[game.direction] ?? DIRECTIONS.right;
  const centerX = (head.x + offsetX + 0.5) * cell;
  const centerY = (head.y + offsetY + 0.5) * cell;
  const forward = cell * 0.11;
  const side = cell * 0.18;
  const eyeRadius = Math.max(1.2, cell * 0.105);
  const pupilRadius = Math.max(0.7, cell * 0.048);

  for (const sign of [-1, 1]) {
    const eyeX =
      centerX + direction.x * forward - direction.y * side * sign;
    const eyeY =
      centerY + direction.y * forward + direction.x * side * sign;

    context.fillStyle = '#f3ffe4';
    context.beginPath();
    context.arc(eyeX, eyeY, eyeRadius, 0, TAU);
    context.fill();

    context.fillStyle = '#0a1510';
    context.beginPath();
    context.arc(
      eyeX + direction.x * pupilRadius * 0.55,
      eyeY + direction.y * pupilRadius * 0.55,
      pupilRadius,
      0,
      TAU,
    );
    context.fill();
  }
}

function drawSnake(context, game, positions, cell) {
  const wrapsHorizontally = positions.some(
    (segment) => segment.x < 0 || segment.x >= GRID_SIZE,
  );
  const wrapsVertically = positions.some(
    (segment) => segment.y < 0 || segment.y >= GRID_SIZE,
  );
  const xOffsets = wrapsHorizontally ? [-GRID_SIZE, 0, GRID_SIZE] : [0];
  const yOffsets = wrapsVertically ? [-GRID_SIZE, 0, GRID_SIZE] : [0];

  // Draw wrapped copies so a head crossing an edge is visible entering from
  // the opposite side during the interpolation frame.
  for (const offsetY of yOffsets) {
    for (const offsetX of xOffsets) {
      drawSnakeLayer(context, game, positions, cell, offsetX, offsetY);
    }
  }
}

function drawScene(context, game, now, width, height) {
  const cell = Math.min(width, height) / GRID_SIZE;
  context.clearRect(0, 0, width, height);
  drawBoard(context, width, height, cell, now);
  drawFood(context, game, now, cell);
  drawEatBurst(context, game, now, cell);
  drawSnake(context, game, getAnimatedSnake(game, now), cell);
}

function ScoreBadge({ label, value }) {
  return (
    <div className="overlay-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function GameBoard({ game, bestScore, onStart, onResume, onTurn }) {
  const canvasRef = useRef(null);
  const gameRef = useRef(game);
  const touchStartRef = useRef(null);
  gameRef.current = game;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const context = canvas.getContext('2d');
    if (!context) return undefined;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let frameId = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0) return;

      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      const pixelWidth = Math.max(1, Math.round(width * dpr));
      const pixelHeight = Math.max(1, Math.round(height * dpr));

      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
    };

    const render = (now) => {
      if (width > 0 && height > 0) {
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawScene(context, gameRef.current, now, width, height);
      }
      frameId = window.requestAnimationFrame(render);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();
    frameId = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
    };
  }, []);

  const handleTouchStart = (event) => {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || event.changedTouches.length === 0) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;

    if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 20) return;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      onTurn(deltaX > 0 ? 'right' : 'left');
    } else {
      onTurn(deltaY > 0 ? 'down' : 'up');
    }
  };

  const handlePrimaryAction = (event) => {
    event.currentTarget.blur();
    onStart();
  };

  const handleResume = (event) => {
    event.currentTarget.blur();
    onResume();
  };

  const isOpen =
    game.status === 'ready' ||
    game.status === 'paused' ||
    game.status === 'gameover' ||
    game.status === 'won';

  return (
    <div
      className={`game-board game-board--${game.status}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => {
        touchStartRef.current = null;
      }}
    >
      <canvas
        ref={canvasRef}
        className="game-canvas"
        role="img"
        aria-label={`贪吃蛇棋盘，当前得分 ${game.score}，蛇身长度 ${game.snake.length} 格`}
      />
      <div className="board-scanlines" aria-hidden="true" />

      {isOpen && (
        <div className="board-overlay" aria-live="polite">
          {game.status === 'ready' && (
            <div className="overlay-card">
              <p className="overlay-kicker">
                <span className="kicker-dot" />
                SYSTEM READY
              </p>
              <h2 className="overlay-title">准备开吃</h2>
              <p className="overlay-copy">
                操控霓虹蛇吞下能量果。穿过边界会从另一侧出现，咬到自己才会结束本局。
              </p>
              <button
                type="button"
                className="primary-button overlay-action"
                onClick={handlePrimaryAction}
              >
                开始游戏
                <span className="keycap">SPACE</span>
              </button>
            </div>
          )}

          {game.status === 'paused' && (
            <div className="overlay-card">
              <p className="overlay-kicker">
                <span className="kicker-dot kicker-dot--amber" />
                PAUSED
              </p>
              <h2 className="overlay-title">暂停中</h2>
              <p className="overlay-copy">
                喘口气，能量果不会逃跑。准备好后继续推进。
              </p>
              <button
                type="button"
                className="primary-button overlay-action"
                onClick={handleResume}
              >
                继续游戏
                <span className="keycap">SPACE</span>
              </button>
            </div>
          )}

          {(game.status === 'gameover' || game.status === 'won') && (
            <div className="overlay-card">
              <p
                className={`overlay-kicker ${
                  game.status === 'won' ? 'overlay-kicker--win' : 'overlay-kicker--danger'
                }`}
              >
                <span
                  className={`kicker-dot ${
                    game.status === 'won' ? '' : 'kicker-dot--pink'
                  }`}
                />
                {game.status === 'won' ? 'SECTOR CLEARED' : 'SIGNAL LOST'}
              </p>
              <h2 className="overlay-title">
                {game.status === 'won' ? '完美通关' : '游戏结束'}
              </h2>
              <p className="overlay-copy">
                {game.status === 'won'
                  ? '整张棋盘都被你占满了，这是贪吃蛇的终极形态。'
                  : '咬到了自己的身体。别急，换个路线再来一次。'}
              </p>
              <div className="overlay-stats">
                <ScoreBadge label="本局得分" value={game.score} />
                <ScoreBadge label="最高记录" value={bestScore} />
              </div>
              <button
                type="button"
                className="primary-button overlay-action"
                onClick={handlePrimaryAction}
              >
                再来一局
                <span className="keycap">R</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
