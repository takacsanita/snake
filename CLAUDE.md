# Snake Game - Claude Code Guidelines

## Project Overview
- A browser-based classic Snake game requiring no build steps or backend server.
- **File Structure:** Keep code clean and simple (contained in `index.html` or split into `style.css` and `script.js`).

## UI/UX & Design Requirements
- **UI Framework:** Use Bootstrap 5 (loaded via CDN).
- **Responsiveness:** The layout and game canvas must be fully responsive (seamlessly playable on mobile, tablet, and desktop).
- **Appearance:** Modern, clean, and visually attractive UI (sleek Start/Restart buttons, stylized score & high-score counters, and good contrast).
- **Mobile Controls:** Provide touch/on-screen directional buttons for mobile devices.

## Tech Stack & Coding Rules
- **Tech Stack:** Vanilla JavaScript (ES6+), HTML5 Canvas, Bootstrap 5 (CSS/JS CDN).
- **Build Process:** No build tools (e.g., Webpack, Vite) or Node packages. Must remain directly runnable in any web browser.
- **Testing:** simply opening `index.html`.

## Feature Roadmap
When asked to implement new features, prioritize these enhancements from the README:
- High Score persistence using `localStorage`.
- Difficulty levels (adjustable game speed).
- Pause / Resume functionality (e.g., `Space` or `P` key).