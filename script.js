// =====================================================================
// SNAKE GAME
// Self-contained IIFE so nothing leaks into the global scope.
// NOTE: canvas rendering (draw/update) is intentionally left as-is —
// only the surrounding page chrome was restyled, not the game board.
// =====================================================================
(() => {
  'use strict';

  // ---------- Config ----------
  const GRID_SIZE = 20;                 // board is GRID_SIZE x GRID_SIZE cells
  const HIGH_SCORE_KEY = 'snakeHighScore';
  const SPEEDS = { easy: 180, medium: 110, hard: 65 }; // ms per tick, by difficulty

  // ---------- DOM references ----------
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('scoreValue');
  const highScoreEl = document.getElementById('highScoreValue');
  const btnStart = document.getElementById('btnStart');
  const btnPause = document.getElementById('btnPause');
  const btnRestart = document.getElementById('btnRestart');
  const difficultySelect = document.getElementById('difficultySelect');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlayMessage = document.getElementById('overlayMessage');
  const overlayBtn = document.getElementById('overlayBtn');

  // ---------- Game state ----------
  let cellSize = 0;
  let snake, direction, nextDirection, food, score, highScore;
  let state = 'idle';           // 'idle' | 'running' | 'paused' | 'gameover'
  let lastTick = 0;             // timestamp of the last simulation step
  let rafId = null;

  // ---------- Setup: canvas sizing (keeps the board crisp at any size) ----------
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    cellSize = canvas.width / GRID_SIZE;
    draw(); // redraw immediately so a resize never shows a blank frame
  }

  // ---------- Helpers ----------
  function randCell() {
    return Math.floor(Math.random() * GRID_SIZE);
  }

  function placeFood() {
    let pos;
    do {
      pos = { x: randCell(), y: randCell() };
    } while (snake.some(s => s.x === pos.x && s.y === pos.y));
    food = pos;
  }

  function drawRoundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
  }

  // ---------- Core: (re)initialize a fresh game ----------
  function resetGame() {
    const mid = Math.floor(GRID_SIZE / 2);
    snake = [{ x: mid - 1, y: mid }, { x: mid - 2, y: mid }, { x: mid - 3, y: mid }];
    direction = { x: 1, y: 0 };
    nextDirection = direction;
    score = 0;
    scoreEl.textContent = '0';
    placeFood();
    draw();
  }

  function startGame() {
    if (state === 'running') return;
    if (state === 'idle' || state === 'gameover') resetGame();
    state = 'running';
    lastTick = 0;
    hideOverlay();
    btnPause.disabled = false;
    btnPause.textContent = 'Pause';
    if (rafId === null) rafId = requestAnimationFrame(loop);
  }

  function togglePause() {
    if (state === 'running') {
      state = 'paused';
      btnPause.textContent = 'Resume';
      showOverlay('Paused', 'Take a breath. Resume whenever you are ready.', 'Resume');
    } else if (state === 'paused') {
      state = 'running';
      btnPause.textContent = 'Pause';
      lastTick = 0;
      hideOverlay();
    }
  }

  function restartGame() {
    resetGame();
    state = 'running';
    lastTick = 0;
    btnPause.disabled = false;
    btnPause.textContent = 'Pause';
    hideOverlay();
    if (rafId === null) rafId = requestAnimationFrame(loop);
  }

  function endGame() {
    state = 'gameover';
    btnPause.disabled = true;
    if (score > highScore) {
      highScore = score;
      highScoreEl.textContent = String(highScore);
      localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
    }
    showOverlay('Game Over', `You scored ${score}. Press Restart to try again.`, 'Play Again');
  }

  // ---------- Overlay helpers ----------
  function showOverlay(title, message, btnLabel) {
    overlayTitle.textContent = title;
    overlayMessage.textContent = message;
    overlayBtn.textContent = btnLabel;
    overlay.classList.remove('d-none');
  }
  function hideOverlay() {
    overlay.classList.add('d-none');
  }

  // ---------- Input: direction changes (shared by keyboard + touch) ----------
  function queueDirection(dx, dy) {
    if (state === 'gameover') return;
    const wasIdle = state === 'idle';
    // Ignore reversals (can't turn 180° into your own neck), but any key still starts the game.
    if (!(dx === -direction.x && dy === -direction.y)) {
      nextDirection = { x: dx, y: dy };
    }
    if (wasIdle) startGame();
  }

  const KEY_MAP = {
    ArrowUp: [0, -1], KeyW: [0, -1],
    ArrowDown: [0, 1], KeyS: [0, 1],
    ArrowLeft: [-1, 0], KeyA: [-1, 0],
    ArrowRight: [1, 0], KeyD: [1, 0],
  };

  window.addEventListener('keydown', (e) => {
    if (KEY_MAP[e.code]) {
      e.preventDefault();
      const [dx, dy] = KEY_MAP[e.code];
      queueDirection(dx, dy);
    } else if (e.code === 'Space' || e.code === 'KeyP') {
      e.preventDefault();
      if (state === 'running' || state === 'paused') togglePause();
    } else if (e.code === 'KeyR') {
      e.preventDefault();
      restartGame();
    }
  }, { passive: false });

  // On-screen D-pad (works for touch and mouse via pointer events)
  document.querySelectorAll('.dpad button').forEach(btn => {
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const map = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
      const [dx, dy] = map[btn.dataset.dir];
      queueDirection(dx, dy);
    });
  });

  // ---------- Buttons ----------
  btnStart.addEventListener('click', startGame);
  btnPause.addEventListener('click', togglePause);
  btnRestart.addEventListener('click', restartGame);
  overlayBtn.addEventListener('click', () => {
    if (state === 'idle' || state === 'gameover') restartGame();
    else if (state === 'paused') togglePause();
  });

  // Difficulty is read live each tick via currentSpeed(), so changing it applies immediately.
  function currentSpeed() {
    return SPEEDS[difficultySelect.value] || SPEEDS.medium;
  }

  // ---------- Simulation step ----------
  function update() {
    direction = nextDirection;
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

    // Wall collision
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
      endGame();
      return;
    }
    // Self collision
    if (snake.some(seg => seg.x === head.x && seg.y === head.y)) {
      endGame();
      return;
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
      score += 10;
      scoreEl.textContent = String(score);
      placeFood();
    } else {
      snake.pop(); // move forward (no growth) when no food was eaten
    }
  }

  // ---------- Rendering ----------
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // subtle grid backdrop
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let i = 1; i < GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(canvas.width, i * cellSize);
      ctx.stroke();
    }

    if (!snake) return;

    // food (soft pulsing glow)
    const pulse = 1 + 0.12 * Math.sin(performance.now() / 180);
    const fx = food.x * cellSize + cellSize / 2;
    const fy = food.y * cellSize + cellSize / 2;
    const fr = (cellSize / 2.6) * pulse;
    const grad = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr * 1.8);
    grad.addColorStop(0, '#ff5d6c');
    grad.addColorStop(1, 'rgba(255,93,108,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(fx, fy, fr * 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff5d6c';
    ctx.beginPath();
    ctx.arc(fx, fy, fr, 0, Math.PI * 2);
    ctx.fill();

    // snake (head brighter, fading toward the tail)
    const pad = Math.max(1, cellSize * 0.08);
    snake.forEach((seg, i) => {
      const t = snake.length > 1 ? i / (snake.length - 1) : 0;
      const lightness = 55 - t * 25;
      ctx.fillStyle = `hsl(150, 90%, ${lightness}%)`;
      drawRoundedRect(
        seg.x * cellSize + pad, seg.y * cellSize + pad,
        cellSize - pad * 2, cellSize - pad * 2,
        Math.max(2, cellSize * 0.22)
      );
    });

    // eyes on the head, oriented with current direction
    const headSeg = snake[0];
    const cx = headSeg.x * cellSize + cellSize / 2;
    const cy = headSeg.y * cellSize + cellSize / 2;
    const eyeOffset = cellSize * 0.18;
    const perp = { x: -direction.y, y: direction.x };
    ctx.fillStyle = '#06210f';
    [-1, 1].forEach(side => {
      const ex = cx + direction.x * eyeOffset + perp.x * eyeOffset * side;
      const ey = cy + direction.y * eyeOffset + perp.y * eyeOffset * side;
      ctx.beginPath();
      ctx.arc(ex, ey, cellSize * 0.07, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // ---------- Game loop (rAF, throttled to the difficulty's tick rate) ----------
  function loop(timestamp) {
    rafId = requestAnimationFrame(loop);
    if (state !== 'running') return;
    if (!lastTick) lastTick = timestamp;
    if (timestamp - lastTick >= currentSpeed()) {
      lastTick = timestamp;
      update();
      draw();
    }
  }

  // ---------- Boot ----------
  highScore = Number(localStorage.getItem(HIGH_SCORE_KEY)) || 0;
  highScoreEl.textContent = String(highScore);
  window.addEventListener('resize', resizeCanvas);
  resetGame();
  resizeCanvas();
  rafId = requestAnimationFrame(loop);
})();
