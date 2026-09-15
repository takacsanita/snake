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
- **Audio Controls:** A speaker button (`#btnAudioToggle`) in the header toggles a Bootstrap `.collapse` panel (`#audioPanel`) holding independent Music/SFX volume sliders and mute buttons — see [Audio System](#audio-system-scriptjs) below.

## Psychedelic Neon-Retro Theme (`style.css`)
The redesign only touches page chrome **outside** the canvas — the game board's own rendering (snake/food colors, grid, eyes) is untouched JS and still draws on a fixed dark `--board-bg`, so gameplay contrast is unaffected by the theme.
- **Fonts:** Google Fonts `Press Start 2P` (pixel-chunky, used sparingly for the title, stat labels/values, and overlay headings) + `VT323` (retro terminal mono, used for body copy, buttons, and the difficulty select — legible at small sizes where Press Start 2P would not be).
- **Background:** An animated 4-stop `linear-gradient` mesh (`cosmicDrift` keyframes shifting `background-position` over 20s) plus two blurred, slowly-floating radial "blobs" (`body::before` / `::after`, `floatBlob` keyframes) for a cosmic backdrop — kept low-opacity/blurred so they stay decorative, not distracting.
- **Glow text:** The `<h1>` title uses an animated rainbow gradient clipped to text (`rainbowShift`) plus `text-shadow` for a neon glow; score/high-score values use `currentColor`-based `text-shadow` glows (cyan for score, yellow for high score).
- **Neon panels & buttons:** `.panel` (HUD/controls bar) keeps its glassmorphism but with a magenta-tinted border and outer glow. `.btn-accent` (Start/overlay CTA) has a pulsing neon box-shadow (`neonPulse` keyframes cycling pink→cyan) and a purple→pink gradient fill; `.btn-outline-light` (Pause/Restart/D-pad) uses a cyan neon outline that fills solid on hover.
- **Board frame:** `.board-frame` gets a layered neon glow (`box-shadow`) around the canvas without changing the canvas's own background or drawing.
- **Audio panel:** `.audio-row` / `.audio-row-label` lay out each Music/SFX row; `.mute-btn.is-muted` swaps a control to a red "dead neon sign" look; `input[type=range].neon-range` restyles the native slider (track + thumb, WebKit and Firefox pseudo-elements both covered) with the same purple→pink→cyan gradient used elsewhere.
- **Audio icons:** The header audio toggle and both mute buttons use [Bootstrap Icons](https://icons.getbootstrap.com/) (CDN, `bootstrap-icons.min.css`) instead of emoji/text glyphs — `bi-soundwave` (settings toggle), `bi-music-note-beamed` / `bi-volume-up-fill` (music/SFX active), `bi-volume-mute-fill` (either, when muted). `.audio-toggle-btn i, .mute-btn i` give the glyph a `text-shadow: 0 0 …px currentColor` glow (works on icon-font glyphs the same as regular text) that transitions smoothly and swaps color via the existing `.is-muted` class, so the glow itself changes from cyan to red without any extra JS.

## Architecture / Code Structure
- **`index.html`:** Header (title + score/high-score badges + audio toggle button) → collapsible audio settings panel (`#audioPanel`) → controls bar (Start/Pause/Restart + difficulty `<select>`) → `.board-frame` (canvas + state overlay) → mobile D-pad → keyboard-hint footer. No inline `<style>` or `<script>` — both are external. The audio panel's show/hide is handled entirely by Bootstrap's `data-bs-toggle="collapse"` — no custom JS needed for that part.
- **`style.css`:** Sectioned top-to-bottom as: fonts/theme tokens (`:root`) → animated cosmic background → header/title glow → scoreboard pills → glass panels → board frame/canvas backdrop → overlay → buttons → difficulty select → **audio settings panel** → D-pad → footer hints.
- **`script.js`:** One IIFE, organized top-to-bottom as: config constants → DOM refs (including the audio panel's sliders/mute buttons) → mutable game state → canvas sizing → helpers (`randCell`, `placeFood`, `drawRoundedRect`) → core state transitions (`resetGame`, `startGame`, `togglePause`, `restartGame`, `endGame`) → overlay helpers → **audio system** (see below) → input handling (keyboard + D-pad, funneled through one `queueDirection`) → button wiring → `update()` (simulation step, now also triggers eat/level-up SFX) → `draw()` (canvas rendering — unchanged by the theme or audio work) → `loop()` (the `requestAnimationFrame` driver) → boot sequence.

## Audio System (`script.js`)
Fully procedural — built entirely from Web Audio API oscillators/filters/gain nodes, no external audio files, keeping the game a self-contained page (matches the "no build step, no assets" project constraint).

- **Autoplay-safe boot:** `ensureAudioContext()` lazily creates the single shared `AudioContext` (and resumes it if a browser auto-suspended it) — it only ever runs from inside a real user gesture handler (a keydown, a button click, a slider drag), never on page load, so it complies with browser autoplay policies. It's called at the top of `queueDirection()`, every button/overlay click handler, the `difficultySelect` change handler, and the volume slider/mute button handlers — i.e. from every possible "first interaction."
- **Background music — chill ambient synth pad + slow generative pulses:** Built once, in `buildMusicGraph()` + `startMusic()` (both invoked from inside `ensureAudioContext()`, so music silently arms itself on first interaction and then plays for the rest of the page's life, independent of game state). Deliberately calm/unobtrusive rather than an arcade loop, so it sits behind gameplay instead of competing for attention:
  - **Sustained pad** (`startPad()`): six pure `sine` oscillators voicing an open, wide Cmaj9-ish chord (C2/C3/E3/G3/B3/D4) — mellow, consonant, no harsh harmonics — summed into `padBus`.
  - **Breathing tremolo:** a very slow sine LFO (~0.06 Hz, ~17s cycle) modulates `padBus.gain` by ±0.12, so the pad swells and recedes instead of droning at a fixed level.
  - **Gentle filter drift:** a slow lowpass `BiquadFilterNode` (900 Hz, Q 0.7) with an even slower LFO (~0.025 Hz, ~40s cycle) drifting its cutoff — barely perceptible, just enough to keep the pad from feeling frozen.
  - **Generative pulses** (`schedulePulseNote()` / `armNextPulse()`): a self-rescheduling `setTimeout` loop, randomized to 1.8–3.2s between notes, plays a single soft `sine` tone from a C-major-pentatonic scale (`PULSE_SCALE`, with an occasional random octave-down), each with a slow 0.4s fade-in and a long ~3.2s fade-out — no attack transient, no fixed tempo, so it reads as ambient/generative rather than a repeating riff.
  - **Echo/space:** pulse notes are sent into a feedback `DelayNode` (550ms, 42% feedback) for a lush, trailing quality; the sustained pad does not go through the delay, so the harmonic foundation stays clean while the pulses get the spacious treatment.
  - All music nodes ultimately connect to the single `musicGain` node, so volume/mute is one gain change rather than touching each oscillator.
- **Sound effects** (`playTone()` is the shared one-shot synth helper; all SFX are short envelopes into `sfxGain`):
  - `playClickSound()` — Start/Pause/Restart/overlay buttons and Space/P/R keys.
  - `playTurnSound()` — any accepted (non-reversal) direction change, from keyboard or the D-pad.
  - `playEatSound()` — food eaten (rising square-wave blip).
  - `playLevelUpSound()` — extra 3-note ascending chime layered on top of the eat sound every 50 points (5 food) as a milestone cue; purely an audio flourish, does not change difficulty/speed.
  - `playGameOverSound()` — 4-note descending sawtooth phrase on `endGame()`.
- **`localStorage` keys (audio):**
  - `snakeMusicVolume` — float 0–1, music master volume (default 0.5).
  - `snakeMusicMuted` — `'true'`/`'false'`, independent music mute flag.
  - `snakeSfxVolume` — float 0–1, SFX master volume (default 0.7).
  - `snakeSfxMuted` — `'true'`/`'false'`, independent SFX mute flag.
  - All four are read once at boot to initialize `musicGain`/`sfxGain` and the slider/button UI, and written immediately on every slider `input` or mute-button `click`.
- **UI wiring:** `#musicVolumeSlider` / `#sfxVolumeSlider` (native `<input type="range">`, restyled in CSS) drive `applyMusicGain()` / `applySfxGain()`, which use `AudioParam.setTargetAtTime()` for a click-free ramp rather than a hard `.value` jump. `#btnMusicMute` / `#btnSfxMute` toggle their respective muted flags via `setMusicMuteUI()` / `setSfxMuteUI()`, which swap the button's `<i>` between its active/muted Bootstrap Icons class (`bi-music-note-beamed` ↔ `bi-volume-mute-fill` for music, `bi-volume-up-fill` ↔ `bi-volume-mute-fill` for SFX), toggle the `.is-muted` CSS class, and update `aria-label` to match the new state.

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
| `#btnAudioToggle` (header speaker icon) | Shows/hides the audio settings panel |
| Music/SFX sliders + mute buttons | Adjust/mute background music and sound effects independently |

## Tech Stack & Coding Rules
- **Tech Stack:** Vanilla JavaScript (ES6+), HTML5 Canvas, Bootstrap 5.3.3 (CSS/JS via CDN), Bootstrap Icons 1.11.3 (CDN), Google Fonts (`Press Start 2P`, `VT323` via `@import` in `style.css`).
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
- Procedural audio system (Web Audio API, no asset files): a chill, focus-friendly ambient synth pad with slow generative melodic pulses for background music, plus click/turn/eat/level-up/game-over sound effects.
- Independent Music and SFX volume sliders and mute toggles in a collapsible header settings panel, using Bootstrap Icons (vector, neon-glowing, state-toggling) instead of emoji, with preferences persisted via `localStorage`.

## Roadmap / Future Enhancements
- Progressive speed increase as the score climbs (currently speed is fixed per difficulty).
- Alternate game modes (e.g. walls-wrap-around instead of wall-death).
- Persisted per-difficulty high scores (currently one global high score across all difficulties).
- Optional theme toggle (classic vs. psychedelic) if a calmer visual mode is ever wanted.
- More musical variation (e.g. an alternate chord/scale the pad occasionally shifts into, since the current loop is a single fixed pad voicing + pulse scale).
