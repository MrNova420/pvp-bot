# PvP Bot - BetterBender Edition

A powerful Minecraft PvP bot built on the BetterBender engine with custom combat features.

## Features

- ⚔️ **PvP Combat Mode** - Auto-attack, W-tap, circle strafe, critical hits
- 🛡️ **AFK Mode** - Keeps server alive with human-like movements  
- 🍖 **Auto-Heal** - Automatically eats food when low health
- 🔄 **Auto-Reconnect** - Stays connected 24/7
- 🎮 **CLI Menu** - Easy management system

## Quick Start

```bash
# Install dependencies
npm install

# Run with CLI menu
node cli.js

# Or run directly
node src/engine.js
```

## Configuration

Edit `CONFIG.json` to customize:

```json
{
  "server": {
    "host": "your.server.ip",
    "port": 25565,
    "version": "1.20.1"
  },
  "auth": {
    "type": "offline",
    "username": "YourBotName"
  },
  "owner": {
    "username": "YourUsername"
  },
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
}
```

## In-Game Commands

| Command | Description |
|---------|-------------|
| `!pvp` | Toggle PvP mode on/off |
| `!status` | Show bot status |
| `!mode afk` | Switch to AFK mode |
| `!mode pvp` | Switch to PvP mode |

## PvP Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `attackRange` | Attack distance (blocks) | 4 |
| `cps` | Clicks per second | 8 |
| `enableCrits` | Jump attacks | true |
| `enableStrafe` | Circle strafing | true |
| `enableWTap` | W-tap technique | true |
| `enableAntiKB` | Anti-knockback | true |
| `healThreshold` | HP to auto-eat | 10 |

## Addons

The bot supports multiple addons. Enable/disable in CONFIG:

- **pvp** - Combat mode (default)
- **afk** - AFK mode
- **player** - Full player simulation
- **pathfinding** - Navigation
- **building** - Auto-build
- **mining** - Auto-mine
- **crafting** - Auto-craft

## CLI Menu Options

1. Start Bot
2. Stop Bot  
3. View Status
4. Configuration
5. Exit

## Requirements

- Node.js 18+
- Minecraft Java Edition server (offline mode)

## Credits

- BetterBender engine by MrNova420
- PvP combat system custom implementation

## License

MIT
