# PvP Bot - BetterBender Edition

A Minecraft PvP bot powered by BetterBender engine with custom PvP combat addon.

## Features

- **PvP Combat Mode**: Auto-attack, W-tap, circle strafe, critical hits
- **AFK Mode**: Keeps server alive with random movements
- **Auto-Heal**: Automatically eats food when low on health
- **BetterBender Engine**: Stable 24/7 operation

## Setup

```bash
npm install
```

## Configuration

Edit `CONFIG.json` to set:
- Server host/port
- Bot username
- PvP settings (CPS, range, features)
- Owner username (for commands)

## Commands

In-game chat:
- `!pvp` - Toggle PvP mode on/off
- `!status` - Show bot status
- `!mode afk|player` - Switch mode

## Run

```bash
node src/engine.js
```

Or use the launcher:
```bash
node launcher.js
```

## PvP Settings

Configurable in `CONFIG.json`:
```json
"pvpMode": {
  "enabled": true,
  "autoAttack": true,
  "attackRange": 4,
  "cps": 8,
  "enableCrits": true,
  "enableStrafe": true,
  "enableWTap": true,
  "enableAntiKB": true,
  "autoHeal": true,
  "healThreshold": 10
}
```

## Credits

- BetterBender engine by MrNova420
- PvP addon custom implementation