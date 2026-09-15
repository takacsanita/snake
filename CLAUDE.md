# Snake Game - Claude Code Guidelines

## Project Overview
- A browser-based classic Snake game requiring no build steps or backend server.
- **File Structure:** Three files, each with a single responsibility:
  - `index.html` — markup only, links `style.css` in `<head>` and loads `script.js` before `</body>`.
  - `style.css` — all styling, including the psychedelic neon-retro theme.
  - `script.js` — all game logic (state machine, input, simulation, canvas rendering).
- **Status:** Implemented and playable. Open `index.html` directly in any browser.

## UI/UX & Design Requirements
- **UI Framework:** Bootstrap 5.3.3, loaded via CDN (`data-bs-theme="dark"`), overridden by `style.css` (loaded after Bootstrap's CSS so its rules win the cascade).
- **Responsiveness:** Canvas is CSS-sized (`width: 100%`, `aspect-ratio: 1/1`) and its pixel buffer is recalculated on `resize` against `devicePixelRatio`, so it stays crisp and square from mobile to desktop.
- **Mobile Controls:** On-screen D-pad (`.dpad`, 4 buttons) shown only below the `md` breakpoint (`d-md-none`), bound via `pointerdown` (works for touch and mouse without the 300ms click delay).

## Psychedelic Neon-Retro Theme (`style.css`)
The redesign only touches page chrome **outside** the canvas — the game board's own rendering (snake/food colors, grid, eyes) is untouched JS and still draws on a fixed dark `--board-bg`, so gameplay contrast is unaffected by the theme.
- **Fonts:** Google Fonts `Press Start 2P` (pixel-chunky, used sparingly for the title, stat labels/values, and overlay headings) + `VT323` (retro terminal mono, used for body copy, buttons, and the difficulty select — legible at small sizes where Press Start 2P would not be).
- **Background:** An animated 4-stop `linear-gradient` mesh (`cosmicDrift` keyframes shifting `background-position` over 20s) plus two blurred, slowly-floating radial "blobs" (`body::before` / `::after`, `floatBlob` keyframes) for a cosmic backdrop — kept low-opacity/blurred so they stay decorative, not distracting.
- **Glow text:** The `<h1>` title uses an animated rainbow gradient clipped to text (`rainbowShift`) plus `text-shadow` for a neon glow; score/high-score values use `currentColor`-based `text-shadow` glows (cyan for score, yellow for high score).
- **Neon panels & buttons:** `.panel` (HUD/controls bar) keeps its glassmorphism but with a magenta-tinted border and outer glow. `.btn-accent` (Start/overlay CTA) has a pulsing neon box-shadow (`neonPulse` keyframes cycling pink→cyan) and a purple→pink gradient fill; `.btn-outline-light` (Pause/Restart/D-pad) uses a cyan neon outline that fills solid on hover.
- **Board frame:** `.board-frame` gets a layered neon glow (`box-shadow`) around the canvas without changing the canvas's own background or drawing.

## Architecture / Code Structure
- **`index.html`:** Header (title + score/high-score badges) → controls bar (Start/Pause/Restart + difficulty `<select>`) → `.board-frame` (canvas + state overlay) → mobile D-pad → keyboard-hint footer. No inline `<style>` or `<script>` — both are external.
- **`style.css`:** Sectioned top-to-bottom as: fonts/theme tokens (`:root`) → animated cosmic background → header/title glow → scoreboard pills → glass panels → board frame/canvas backdrop → overlay → buttons → D-pad → footer hints.
- **`script.js`:** One IIFE, organized top-to-bottom as: config constants → DOM refs → mutable game state → canvas sizing → helpers (`randCell`, `placeFood`, `drawRoundedRect`) → core state transitions (`resetGame`, `startGame`, `togglePause`, `restartGame`, `endGame`) → overlay helpers → input handling (keyboard + D-pad, funneled through one `queueDirection`) → `update()` (simulation step) → `draw()` (canvas rendering — unchanged by the theme work) → `loop()` (the `requestAnimationFrame` driver) → boot sequence.

## State Management
- **Game state machine:** `state` is one of `'idle' | 'running' | 'paused' | 'gameover'`; all transitions go through `startGame` / `togglePause` / `restartGame` / `endGame`.
- **Game loop:** A single persistent `requestAnimationFrame` loop (`loop()`) runs for the page's lifetime. It reschedules itself unconditionally, and only steps the simulation (`update()` + `draw()`) when `state === 'running'` and enough time (`currentSpeed()` ms) has elapsed since `lastTick`. This makes pause/resume trivial (no interval to clear/recreate).
- **Direction buffering:** `direction` is the last-applied direction; `nextDirection` is the queued input, applied once per tick. `queueDirection()` blocks 180° reversals but still starts the game from `idle` on any keypress, including a blocked-reversal one.
- **`localStorage` keys:**
  - `snakeHighScore` — best score achieved, persisted on `endGame()` whenever the current score beats it, restored on page load.
- **Difficulty:** `difficultySelect` (`easy` | `medium` | `hard`) maps to tick intervals in the `SPEEDS` constant (180ms / 110ms / 65ms). Read live each tick via `currentSpeed()`, so changing it mid-game applies immediately without a reset.

## Controls
| Input | Action |
|---|---|
| `ArrowUp` / `W` | Move up |
| `ArrowDown` / `S` | Move down |
| `ArrowLeft` / `A` | Move left |
| `ArrowRight` / `D` | Move right |
| `Space` / `P` | Pause / Resume |
| `R` | Restart |
| On-screen D-pad (mobile, `d-md-none`) | Same 4 directions via `pointerdown` |
| Start / Pause / Restart buttons | Same actions as keyboard, in the controls bar |
| Overlay button | Context-sensitive: Start (idle) / Resume (paused) / Play Again (game over) |

## Tech Stack & Coding Rules
- **Tech Stack:** Vanilla JavaScript (ES6+), HTML5 Canvas, Bootstrap 5.3.3 (CSS/JS via CDN), Google Fonts (`Press Start 2P`, `VT323` via `@import` in `style.css`).
- **Build Process:** No build tools or Node packages. Must remain directly runnable in any browser by opening `index.html` — the three files sit side by side and are referenced by relative path (`style.css`, `script.js`), so keep them in the same directory.
- **Testing:** Open `index.html` in a browser (or serve statically, e.g. `python3 -m http.server`) and play through: move, eat food, pause/resume, trigger wall and self collision, restart, and confirm high score survives a page reload.

## Completed Features
- Wall and self-collision detection with a Game Over overlay showing the final score.
- High score persistence via `localStorage` (`snakeHighScore`).
- Pause/Resume via `Space`/`P` or the Pause button, with a distinct "Paused" overlay.
- Restart via `R` or the Restart button, from any state.
- Three difficulty levels (Easy/Medium/Hard) controlling tick speed, adjustable live.
- Full keyboard (Arrows/WASD) and mobile touch (on-screen D-pad) controls.
- Responsive canvas that stays square and crisp (DPR-aware) at any viewport size.
- Modular file structure (`index.html` / `style.css` / `script.js`).
- Psychedelic neon-retro theme for all page chrome (animated cosmic background, glowing rainbow title, neon-pulse buttons, glass panels) while the canvas game-board rendering itself is untouched.

## Roadmap / Future Enhancements
- Progressive speed increase as the score climbs (currently speed is fixed per difficulty).
- Sound effects / background music (would pair well with the psychedelic theme).
- Alternate game modes (e.g. walls-wrap-around instead of wall-death).
- Persisted per-difficulty high scores (currently one global high score across all difficulties).
- Optional theme toggle (classic vs. psychedelic) if a calmer visual mode is ever wanted.
