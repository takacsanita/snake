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
  const musicVolumeSlider = document.getElementById('musicVolumeSlider');
  const sfxVolumeSlider = document.getElementById('sfxVolumeSlider');
  const btnMusicMute = document.getElementById('btnMusicMute');
  const btnSfxMute = document.getElementById('btnSfxMute');

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
    playGameOverSound();
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

  // =====================================================================
  // AUDIO SYSTEM
  // Fully procedural (Web Audio API oscillators/filters/delay) — no
  // external audio files, so the game stays a self-contained page.
  // Everything here is inert until ensureAudioContext() runs, which only
  // happens from inside a real user gesture (click/keydown), satisfying
  // browser autoplay policies.
  // =====================================================================
  const AUDIO_KEYS = {
    musicVolume: 'snakeMusicVolume',
    musicMuted: 'snakeMusicMuted',
    sfxVolume: 'snakeSfxVolume',
    sfxMuted: 'snakeSfxMuted',
  };

  // ---------- Persisted audio preferences (defaults if nothing saved yet) ----------
  let musicVolume = Number(localStorage.getItem(AUDIO_KEYS.musicVolume));
  if (!Number.isFinite(musicVolume)) musicVolume = 0.5;
  let sfxVolume = Number(localStorage.getItem(AUDIO_KEYS.sfxVolume));
  if (!Number.isFinite(sfxVolume)) sfxVolume = 0.7;
  let musicMuted = localStorage.getItem(AUDIO_KEYS.musicMuted) === 'true';
  let sfxMuted = localStorage.getItem(AUDIO_KEYS.sfxMuted) === 'true';

  let audioCtx = null;
  let musicGain = null;   // master volume for the background music graph
  let sfxGain = null;     // master volume for one-shot sound effects
  let musicStarted = false;
  let pulseTimerId = null;

  // Lazily create the AudioContext on first real user gesture (click/keydown).
  // Safe to call repeatedly — it also resumes a context a browser auto-suspended.
  function ensureAudioContext() {
    if (audioCtx) {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      return;
    }
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    musicGain = audioCtx.createGain();
    musicGain.gain.value = musicMuted ? 0 : musicVolume;
    musicGain.connect(audioCtx.destination);

    sfxGain = audioCtx.createGain();
    sfxGain.gain.value = sfxMuted ? 0 : sfxVolume;
    sfxGain.connect(audioCtx.destination);

    buildMusicGraph();
    startMusic();
  }

  // ---------- Background music: chill ambient synth pad + slow generative pulses ----------
  // A calm, focus-friendly soundscape — a soft sustained pad (the harmonic
  // "room tone") that breathes slowly, plus occasional gentle melodic pulses
  // that fade in/out rather than ticking along on a beat. Nothing here is
  // sharp or rhythmically insistent, so it sits behind gameplay instead of
  // competing with it.
  let padFilter, padBus, pulseDelay;
  function buildMusicGraph() {
    // Gentle lowpass keeps the pad soft/rounded; the pad's own sine
    // oscillators are already harmonically simple, so this mostly just
    // takes the edge off the pulses' echoes as they pass through it.
    padFilter = audioCtx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 900;
    padFilter.Q.value = 0.7;
    padFilter.connect(musicGain);

    // Very slow filter drift — barely perceptible, avoids a static/frozen pad.
    const filterLfo = audioCtx.createOscillator();
    filterLfo.type = 'sine';
    filterLfo.frequency.value = 0.025; // one full drift every ~40s
    const filterLfoDepth = audioCtx.createGain();
    filterLfoDepth.gain.value = 150;
    filterLfo.connect(filterLfoDepth).connect(padFilter.frequency);
    filterLfo.start();

    // padBus carries the whole sustained pad, with a slow tremolo so the
    // drone "breathes" instead of droning at a flat, constant volume.
    padBus = audioCtx.createGain();
    padBus.gain.value = 0.9;
    padBus.connect(padFilter);

    const tremoloLfo = audioCtx.createOscillator();
    tremoloLfo.type = 'sine';
    tremoloLfo.frequency.value = 0.06; // one gentle swell every ~17s
    const tremoloDepth = audioCtx.createGain();
    tremoloDepth.gain.value = 0.12;
    tremoloLfo.connect(tremoloDepth).connect(padBus.gain);
    tremoloLfo.start();

    // Long, lush feedback delay for the melodic pulses — the main source of
    // the soundscape's spacious, immersive quality.
    pulseDelay = audioCtx.createDelay(1.2);
    pulseDelay.delayTime.value = 0.55;
    const pulseFeedback = audioCtx.createGain();
    pulseFeedback.gain.value = 0.42;
    pulseDelay.connect(pulseFeedback);
    pulseFeedback.connect(pulseDelay);
    pulseDelay.connect(musicGain);
  }

  // Soft, wide Cmaj9-voiced pad on pure sine tones — mellow, consonant,
  // nothing above a whisper individually so the sum stays gentle.
  function startPad() {
    const padFreqs = [65.41, 130.81, 164.81, 196.0, 246.94, 293.66]; // C2 C3 E3 G3 B3 D4
    padFreqs.forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const level = audioCtx.createGain();
      level.gain.value = 0.045 + i * 0.006;
      osc.connect(level).connect(padBus);
      osc.start();
    });
  }

  // Slow, generative melodic pulses — a soft sine note every couple of
  // seconds (randomized timing/pitch so it never feels like a repeating
  // loop), each with a slow fade-in/fade-out rather than a percussive hit.
  const PULSE_SCALE = [261.63, 293.66, 329.63, 392.0, 440.0]; // C4 D4 E4 G4 A4 (major pentatonic)
  function schedulePulseNote() {
    if (musicMuted || musicVolume <= 0) return; // skip building oscillators when silent
    const now = audioCtx.currentTime;
    const octave = Math.random() < 0.25 ? 0.5 : 1; // occasional soft octave-down for depth
    const freq = PULSE_SCALE[Math.floor(Math.random() * PULSE_SCALE.length)] * octave;

    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const env = audioCtx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.09, now + 0.4);      // slow fade in
    env.gain.exponentialRampToValueAtTime(0.001, now + 3.2); // long, gentle fade out
    osc.connect(env);
    env.connect(musicGain);
    env.connect(pulseDelay);
    osc.start(now);
    osc.stop(now + 3.3);
  }
  function armNextPulse() {
    schedulePulseNote();
    pulseTimerId = setTimeout(armNextPulse, 1800 + Math.random() * 1400); // organic, non-looping spacing
  }

  function startMusic() {
    if (musicStarted) return;
    musicStarted = true;
    startPad();
    armNextPulse();
  }

  // ---------- Sound effects: short procedural blips (no audio files) ----------
  function playTone({ type = 'sine', freq, startFreq, endFreq, duration = 0.15, gain = 0.2 }) {
    if (!audioCtx || !sfxGain) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    osc.type = type;
    if (startFreq && endFreq) {
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
    } else {
      osc.frequency.value = freq;
    }
    const env = audioCtx.createGain();
    env.gain.setValueAtTime(gain, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(env).connect(sfxGain);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function playClickSound() { playTone({ type: 'triangle', freq: 520, duration: 0.06, gain: 0.15 }); }
  function playTurnSound() { playTone({ type: 'sine', freq: 660, duration: 0.05, gain: 0.08 }); }
  function playEatSound() { playTone({ type: 'square', startFreq: 440, endFreq: 880, duration: 0.12, gain: 0.22 }); }

  function playLevelUpSound() {
    // Quick ascending 3-note chiptune riff, played on score milestones.
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      setTimeout(() => playTone({ type: 'square', freq, duration: 0.12, gain: 0.2 }), i * 90);
    });
  }

  function playGameOverSound() {
    // Descending buzzy tones.
    [392.0, 329.63, 261.63, 196.0].forEach((freq, i) => {
      setTimeout(() => playTone({ type: 'sawtooth', freq, duration: 0.22, gain: 0.2 }), i * 130);
    });
  }

  // ---------- Volume/mute UI wiring (also persists prefs to localStorage) ----------
  function applyMusicGain() {
    if (!musicGain) return;
    musicGain.gain.setTargetAtTime(musicMuted ? 0 : musicVolume, audioCtx.currentTime, 0.05);
  }
  function applySfxGain() {
    if (!sfxGain) return;
    sfxGain.gain.setTargetAtTime(sfxMuted ? 0 : sfxVolume, audioCtx.currentTime, 0.05);
  }

  // Icon swap helper — mute buttons hold a single Bootstrap Icons <i>, and we
  // just swap which bi-* glyph class it wears based on the current state.
  const musicMuteIcon = btnMusicMute.querySelector('i');
  const sfxMuteIcon = btnSfxMute.querySelector('i');
  function setMusicMuteUI() {
    musicMuteIcon.className = musicMuted ? 'bi bi-volume-mute-fill' : 'bi bi-music-note-beamed';
    btnMusicMute.classList.toggle('is-muted', musicMuted);
    btnMusicMute.setAttribute('aria-label', musicMuted ? 'Unmute music' : 'Mute music');
  }
  function setSfxMuteUI() {
    sfxMuteIcon.className = sfxMuted ? 'bi bi-volume-mute-fill' : 'bi bi-volume-up-fill';
    btnSfxMute.classList.toggle('is-muted', sfxMuted);
    btnSfxMute.setAttribute('aria-label', sfxMuted ? 'Unmute sound effects' : 'Mute sound effects');
  }

  // Reflect the loaded/initial preferences in the UI before any audio exists.
  musicVolumeSlider.value = String(Math.round(musicVolume * 100));
  sfxVolumeSlider.value = String(Math.round(sfxVolume * 100));
  setMusicMuteUI();
  setSfxMuteUI();

  musicVolumeSlider.addEventListener('input', () => {
    ensureAudioContext();
    musicVolume = Number(musicVolumeSlider.value) / 100;
    localStorage.setItem(AUDIO_KEYS.musicVolume, String(musicVolume));
    applyMusicGain();
  });
  sfxVolumeSlider.addEventListener('input', () => {
    ensureAudioContext();
    sfxVolume = Number(sfxVolumeSlider.value) / 100;
    localStorage.setItem(AUDIO_KEYS.sfxVolume, String(sfxVolume));
    applySfxGain();
  });
  btnMusicMute.addEventListener('click', () => {
    ensureAudioContext();
    musicMuted = !musicMuted;
    localStorage.setItem(AUDIO_KEYS.musicMuted, String(musicMuted));
    setMusicMuteUI();
    applyMusicGain();
  });
  btnSfxMute.addEventListener('click', () => {
    ensureAudioContext();
    sfxMuted = !sfxMuted;
    localStorage.setItem(AUDIO_KEYS.sfxMuted, String(sfxMuted));
    setSfxMuteUI();
    applySfxGain();
  });

  // ---------- Input: direction changes (shared by keyboard + touch) ----------
  function queueDirection(dx, dy) {
    if (state === 'gameover') return;
    ensureAudioContext();
    const wasIdle = state === 'idle';
    // Ignore reversals (can't turn 180° into your own neck), but any key still starts the game.
    if (!(dx === -direction.x && dy === -direction.y)) {
      nextDirection = { x: dx, y: dy };
      playTurnSound();
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
      queueDirection(dx, dy); // also calls ensureAudioContext() — covers "any key starts audio"
    } else if (e.code === 'Space' || e.code === 'KeyP') {
      e.preventDefault();
      ensureAudioContext();
      if (state === 'running' || state === 'paused') { playClickSound(); togglePause(); }
    } else if (e.code === 'KeyR') {
      e.preventDefault();
      ensureAudioContext();
      playClickSound();
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
  btnStart.addEventListener('click', () => { ensureAudioContext(); playClickSound(); startGame(); });
  btnPause.addEventListener('click', () => { ensureAudioContext(); playClickSound(); togglePause(); });
  btnRestart.addEventListener('click', () => { ensureAudioContext(); playClickSound(); restartGame(); });
  overlayBtn.addEventListener('click', () => {
    ensureAudioContext();
    playClickSound();
    if (state === 'idle' || state === 'gameover') restartGame();
    else if (state === 'paused') togglePause();
  });
  difficultySelect.addEventListener('change', ensureAudioContext);

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
      playEatSound();
      if (score % 50 === 0) playLevelUpSound(); // milestone every 5 food eaten
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
