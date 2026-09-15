# Snake

The classic Snake game, playable in the browser with no build step or server required.

## How to Play

1. Open `index.html` in your web browser
2. Press any arrow key or use WASD to start the game and control the snake
3. Guide the snake to eat the food (shown as a square on the grid)
4. Each time the snake eats food, it grows longer
5. Avoid colliding with the walls or the snake's own body
6. The game ends when you hit an obstacle
7. Try to get the highest score possible

## Controls

- **Arrow Keys** (↑ ↓ ← →) or **WASD**: Move the snake
- **Space** or **P**: Pause / Resume
- **R**: Restart
- **On-screen D-pad**: Touch controls on mobile devices

## Game Features

- Score and persistent high score (saved in your browser via `localStorage`)
- Pause/Resume at any time
- Three difficulty levels (Easy / Medium / Hard) that adjust game speed live
- Wall and self-collision detection with a Game Over screen
- Fully responsive layout (mobile, tablet, desktop) built with Bootstrap 5
- Psychedelic neon-retro UI: animated cosmic gradient background, glowing rainbow title, neon-pulse buttons — with a glowing/pulsing food and gradient snake on the game board itself

## Project Structure

```
snake/
├── index.html          # Markup: links style.css, loads script.js
├── style.css           # All styling, including the psychedelic theme
├── script.js           # All game logic (state, input, rendering)
├── README.md           # This file
├── CLAUDE.md           # Architecture & state-management reference
└── .gitignore          # Git configuration
```

## Development

### Quick Start

No build step required! Simply open `index.html` in your browser:
- Double-click `index.html`, or
- Drag it into your browser, or
- Run a local server: `python3 -m http.server 8000` then visit `http://localhost:8000`

### Running a Local Server (Recommended)

For the best experience, serve the files locally:

```bash
# Using Python 3
python3 -m http.server 8000

# Using Python 2
python -m SimpleHTTPServer 8000

# Using Node.js (if you have http-server installed)
npx http-server
```

Then open `http://localhost:8000` in your browser.

### Technologies

- **HTML5 Canvas**: Game rendering
- **Bootstrap 5** (CDN): UI components and responsive layout
- **JavaScript (Vanilla, ES6+)**: Game logic and interactions
- **Google Fonts** (`Press Start 2P`, `VT323`): Retro/psychedelic typography
- No build tools or Node packages — only CDN dependencies (Bootstrap, Google Fonts)

## Implementation Details

The game uses:
- HTML5 Canvas for rendering the grid, snake, and food
- A single persistent `requestAnimationFrame` loop, throttled to the selected difficulty's tick rate
- Keyboard event listeners plus a touch-friendly on-screen D-pad, both feeding one shared input handler
- `localStorage` for high score persistence across sessions
- Collision detection for walls, food, and self

See [CLAUDE.md](CLAUDE.md) for a deeper architecture breakdown (state machine, `localStorage` keys, control mappings).

## Future Enhancements

Potential features to add:
- Progressive speed increase as the score climbs
- Sound effects and background music
- Multiple game modes (e.g. walls that wrap instead of killing you)
- Per-difficulty high scores

## License

This is a learning project. Feel free to modify and extend it!
