# PvP Bot - Complete User Guide

## Table of Contents
1. [Quick Start](#quick-start)
2. [Configuration](#configuration)
3. [Commands](#commands)
4. [Combat Features](#combat-features)
5. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Basic Setup (5 minutes)

```bash
# 1. Go to project
cd /home/mrnova420/pvp-bot

# 2. Open menu
node cli.js

# 3. Select option 3 (Setup)
# 4. Enter:
#    - Server IP (e.g., play.myserver.com)
#    - Server Port (default: 25565)
#    - Bot username
#    - Your username (to protect)

# 5. Start bot
node cli.js
# Select option 1
```

---

## Configuration

### Using the Menu

```bash
node cli.js
```

Shows interactive menu:
- Configure server/bot
- View current settings
- Switch combat presets
- Edit manually

### Manual Config

Edit `CONFIG.json`:

```json
{
  "auth": {
    "username": "MyPvPBot",
    "type": "offline"
  },
  "server": {
    "host": "server.ip.here",
    "port": 25565,
    "version": "1.20.4"
  },
  "owner": {
    "username": "MyUsername"
  },
  "combat": {
    "attackRange": 4,
    "cps": 15,
    "enableWTap": true,
    "enableAntiKB": true,
    "combatStyle": "hybrid"
  }
}
```

### Auth Types

| Type | Use For |
|------|---------|
| `"offline"` | Cracked/offline servers |
| `"mojang"` | Premium Java accounts |
| `"microsoft"` | Microsoft accounts |

---

## Commands

### Main Commands

```bash
# Interactive menu (recommended)
node cli.js

# Direct start
node index.js

# Setup wizard
node setup.js

# Quick start with presets
node start.js
```

### Package.json Scripts

```bash
npm run cli      # Interactive menu
npm start       # Direct start
npm run setup   # Setup wizard
npm run quick   # Quick start
npm run multi   # Multi-bot
```

---

## Combat Features

### Core Techniques

| Feature | Description | Config |
|---------|-------------|--------|
| W-tap | Sprint reset between hits for max knockback | `enableWTap` |
| Anti-KB | Reduce knockback when hit | `enableAntiKB` |
| Critical Hits | +50% damage on jumps | `enableCrits` |
| Circle Strafe | Move around target | `enableStrafe` |
| Weapon Switch | Auto-detect and counter shields | `enableWeaponSwitch` |

### Combat Presets

```bash
# In menu, select option 5
```

- **balanced** - Recommended for most servers
- **aggressive** - Max damage, always attack
- **defensive** - Safe play, retreats when hurt

### Combat Settings

| Setting | Default | Description |
|---------|---------|-------------|
| attackRange | 4 | Distance to start attacking |
| cps | 15 | Clicks per second |
| healThreshold | 14 | Food level to auto-eat |
| combatStyle | hybrid | aggressive/defensive/hybrid |

---

## Troubleshooting

### Common Issues

#### 1. "CONFIG.json not found"
```bash
node cli.js
# Select option 3 (Setup)
```

#### 2. "Failed to connect"
- Check server IP in CONFIG.json
- Verify server is online
- Check firewall allows连接

#### 3. "Auth error"
- Wrong `auth.type`
- For cracked servers: use `"offline"`
- For premium: use `"mojang"` or `"microsoft"`

#### 4. Bot not attacking
- Check `autoAttack: true` in config
- Check owner username is correct
- Enemies must be within `attackRange`

#### 5. Bot walks away from owner
- Check `followDistance` (default: 3)
- Check `protectEnabled: true`

### Debug Commands

```bash
# View full config
node cli.js
# Select option 4

# Check logs
# Scroll through terminal output
```

---

## Combat Systems (14 Total)

1. **combatEngine.js** - Main combat logic
2. **targetManager.js** - Enemy tracking
3. **followSystem.js** - Guard owner
4. **healManager.js** - Auto-eat
5. **weaponSystem.js** - Weapon switching
6. **pearlSystem.js** - Ender pearls
7. **potionSystem.js** - Potions
8. **bowSystem.js** - Ranged attacks
9. **crystalSystem.js** - Crystal combos
10. **combatStats.js** - Hit tracking
11. **attackCooldown.js** - Weapon timing
12. **revengeSystem.js** - Kill tracking
13. **networkTracker.js** - Ping tracking
14. **serverUtils.js** - Version detection

---

## Support

### File Locations
- Config: `CONFIG.json`
- Presets: `configs/*.json`
- Combat: `src/combat/*.js`
- Logs: Terminal output

### Tips
1. Start with balanced preset
2. Increase CPS if hitting fast enemies
3. Enable W-tap for max knockback
4. Use pearls when surrounded

---

**Ready to dominate!** 🎮