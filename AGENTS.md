# BetterBender PvP Bot - Agent Guidance

## Project Overview
- PvP bot for Minecraft using Mineflayer, based on BetterBender engine
- Provides combat features (auto-attack, W-tap, strafing, crits, healing)
- Toggled via `!pvp` chat command from owner
- Connects to MrNova420.aternos.me:31267 (offline mode)

## Key Files
- Engine: `src/engine.js` (main loop, loads addons)
- PvP Addon: `addons/pvp.js` (combat logic)
- Config: `CONFIG.json` (server, pvpMode, addons toggles)
- Entry: `cli.js` (starts engine) or `npm start`

## Development Commands
- Start: `npm start` or `node cli.js`
- Setup: `npm run setup` (first-time config)
- Test: `npm test` (runs test/smoke.js)
- PM2: `npm run pm2:start` etc.

## Important Conventions
- **DO NOT** run `npm install` after pulling without checking versions - it may install incompatible mineflayer versions causing kicks. Use committed node_modules or verify package-lock.json matches working versions.
- Config changes in CONFIG.json require restart to take effect.
- Addons toggled in CONFIG.json > addons section.
- PvP mode is default (mode.current = "pvp" in CONFIG.json).
- All custom code lives in `/addons/` and `/src/`; prefer extending existing files.

## Troubleshooting
- If kicked with "multiplayer.disconnect.invalid_player_movement": check that node_modules versions match working set (see BetterBender-Bot-Improved for reference).
- Ensure mineflayer version is compatible with server (currently 4.20.1).
- Check logs in `data/logs/` for runtime issues.

## Repository Notes
- node_modules is committed (unusual but required for stable builds). Do NOT gitignore.
- Package versions are locked via package-lock.json; updates should be tested carefully.
- This bot is designed for 24/7 operation with safety monitors (CPU/memory limits).