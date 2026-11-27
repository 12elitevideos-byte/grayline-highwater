# Grayline

A first-person island battle royale on the Highwater map. The browser game and Render simulation share the same world generation, collision, inventory, weapons, bot navigation, and storm.

- **Quick Play** runs against bots on your device. The solo setup lets you change the number and difficulty of bots and choose the time, weather, and drop mode.
- **Battle Royale** queues for 15 seconds. The server fills the remaining places with bots, up to 25 total competitors.
- **Private Match** uses a six-character room code. The host can disable bot fill. Starting with bot fill disabled requires two people.

Use a desktop browser with WebGL and a mouse. After joining an online match, click **Resume** to capture the mouse. Opening settings or the map leaves the online match running.

## Run locally

Install Node.js 22 or later. From the project directory:

```sh
npm ci
npm run build
npm test
npm start
```

Open `http://localhost:10000`. Open a second tab and enter the same private room code to test multiplayer. The server and client share the same origin in local development.

## Hosting

The Render service runs `server.mjs` on its assigned port and serves both `/ws` and `/health`. The ChatGPT Sites page serves the static files in `dist/`. If the Render service URL changes, update `dist/server-config.mjs` and set `ALLOWED_ORIGINS` on Render to the comma-separated frontend origins. `GRAYLINE_ARENAS` controls how many active matches this instance can simulate at once (two by default, with excess lobbies queued).

Rooms and matches are held in memory and expire when players leave, when a private lobby has been idle for 20 minutes, or when Render restarts. The Render free plan may take time to wake up after inactivity. Players who lose their connection can start a new match.
