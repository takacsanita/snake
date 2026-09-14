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

- **Arrow Keys** (↑ ↓ ← →): Move the snake
- **WASD**: Alternative movement controls
- **Space** or **R**: Restart the game after game over

## Game Features

- Score tracking during gameplay
- Game over detection (wall collision and self-collision)
- Smooth animation and responsive controls
- Retro-style grid-based gameplay
- No dependencies—pure HTML, CSS, and JavaScript

## Project Structure

```
snake/
├── index.html          # Main game file (HTML + CSS + JavaScript)
├── README.md          # This file
└── .gitignore         # Git configuration
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

- **HTML5**: Game canvas and structure
- **CSS3**: Styling and animations
- **JavaScript (Vanilla)**: Game logic and interactions
- No external dependencies or build tools

## Implementation Details

The game uses:
- HTML5 Canvas for rendering the game grid and snake
- Keyboard event listeners for player input
- Game loop with requestAnimationFrame for smooth 60 FPS gameplay
- Collision detection for walls, food, and self

## Future Enhancements

Potential features to add:
- Difficulty levels (game speed)
- High score persistence (localStorage)
- Sound effects and background music
- Multiple game modes
- Mobile touch controls
- Pause/resume functionality

## License

This is a learning project. Feel free to modify and extend it!
