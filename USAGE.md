# PvP Bot - Usage Guide

## Table of Contents
1. [Running the Bot](#running-the-bot)
2. [In-Game Commands](#in-game-commands)
3. [Configuration](#configuration)
4. [Features Explained](#features-explained)
5. [Troubleshooting](#troubleshooting)
6. [Performance Tuning](#performance-tuning)

---

## Running the Bot

### Quick Start
```bash
# CLI Menu (Recommended)
node cli.js

# Direct run
node src/engine.js

# With proxy (recommended for Aternos)
USE_PROXY=true node cli.js
```

### First Setup
1. Run `node cli.js`
2. Select **Configuration** (option 4)
3. Configure:
   - Server: host, port, version
   - Auth: username
   - Owner: your Minecraft username

---

## In-Game Commands

### All Commands (29 Total)

#### Basic Commands (Everyone Can Use)
```bash
!help           # Show all commands
!help [cmd]    # Help for specific command
!status        # Health: 20/20 | Food: 20/20 | Position: (x, y, z)
!inv           # Inventory summary
!progress      # Minecraft progression
!mood          # AI mood and energy
```

#### Movement Commands
```bash
!come          # Come to your position
!follow       # Follow you
!follow Alex  # Follow player Alex
!stop         # Stop current action
!home         # Go to saved home
!sleep        # Sleep in bed
```

#### PvP Combat Commands (Owner/Admin)
```bash
!pvp          # Toggle PvP mode ON/OFF
!attack       # Toggle auto-attack ON/OFF
!ff           # Toggle friendly fire (don't hit owner)
!guard        # Guard you - follow and attack threats
!guard Alex  # Guard player Alex
!stay        # Set mode to idle
```

#### Combat Mode Commands
```bash
!kill         # Set to combat mode
!crystal     # Set to crystal PvP mode
!pvm          # Set to Player vs Mob mode
!pve          # Set to Player vs Entity mode
```

#### Multi-Bot Commands (Owner/Admin)
```bash
!squad        # Spawn 5 bots (owner + 4)
!army         # Spawn 10 bots
!give 5 Alex # Give 5 bots to Alex
```

#### World Commands
```bash
!mine coal      # Mine coal ore
!build house   # Build a house
!craft stick 1 # Craft 1 stick
```

#### Admin Commands (Owner Only)
```bash
!admin        # List all admins
!admin Bob   # Make Bob an admin
```

---

## Configuration

### Server Settings
```json
{
  "server": {
    "host": "MrNova420.aternos.me",
    "port": 31267,
    "version": "1.20.1"
  }
}
```

**Note**: Host should be hostname ONLY, no port!

### PvP Mode Settings
```json
{
  "pvpMode": {
    "enabled": true,
    "autoAttack": true,
    "attackRange": 4,
    "cps": 8,
    "enableCrits": true,
    "enableStrafe": true,
    "enableWTap": true,
    "enableAntiKB": true,
    "enableWeaponSwitch": true,
    "autoHeal": true,
    "healThreshold": 10
  }
}
```

### Addon Settings
```json
{
  "addons": {
    "a1-bot": true,
    "super-pathfinder": true,
    "player": true,
    "player-basic": true,
    "mining": true,
    "building": true,
    "crafting": true
  }
}
```

---

## Features Explained

### Combat System

#### Reaction Time (50-200ms)
The bot doesn't attack INSTANTLY - it has human-like delay:
```javascript
// Reaction time
const reactionDelay = Math.random() * 150 + 50; // 50-200ms
setTimeout(() => this.attack(), reactionDelay);
```
This makes combat feel natural, not robotic.

#### W-Tap Technique
Release forward key, then re-press for knockback:
```javascript
if (this.enableWTap) {
    this.bot.setControlState('forward', false);
    setTimeout(() => this.bot.setControlState('forward', true), 100);
}
```

#### Strafing
Circle around the target:
```javascript
if (this.enableStrafe) {
    const angle = Math.atan2(dy, dx) + Math.PI / 2;
    this.bot.lookAt(yaw + angle);
}
```

#### Critical Hits
Jump before attacking:
```javascript
if (this.enableCrits && !inWater) {
    this.bot.setControlState('jump', true);
}
```

#### Target Selection
Smart selection by:
- **Distance**: Closer = better
- **Health**: Lower = easier
- **Armor**: Less = easier
- **Weapon**: Dangerous = priority

---

### Proxy System

#### How It Works
1. **Detect Home IP**: Queries ipify.org on startup
2. **Fetch Proxies**: Gets SOCKS5 from 20+ sources
3. **Connect**: Uses socks-proxy-agent
4. **Verify**: Checks socket IP ≠ home IP
5. **Monitor**: 10s interval for leaks

#### Usage
```bash
USE_PROXY=true node cli.js
```

---

## Troubleshooting

### Bot Won't Start
- Check CONFIG.json syntax
- Verify server is online
- Check logs: `data/logs/`

### Gets Kicked
- Server version mismatch
- Offline mode not enabled
- Try lower CPS

### Not Attacking
- Use `!pvp` to enable
- Check attackRange
- Verify has weapon

### Proxy Not Working
- Aternos detects free proxies
- Try paid residential proxy

### Commands Not Working
- Verify you're owner/admin
- Use `!help` to check

### Bots Not Following
- Check friendly fire: `!ff`
- Target player must be online

---

## Performance Tuning

### Beginner Settings
```json
{
  "cps": 5,
  "attackRange": 3,
  "enableCrits": false,
  "enableStrafe": false
}
```

### Balanced Settings
```json
{
  "cps": 8,
  "attackRange": 4,
  "enableCrits": true,
  "enableStrafe": true,
  "enableWTap": true
}
```

### Aggressive Settings
```json
{
  "cps": 12,
  "attackRange": 5,
  "enableCrits": true,
  "enableStrafe": true,
  "enableWTap": true,
  "enableAntiKB": true,
  "autoHeal": true,
  "healThreshold": 15
}
```

---

## Expected Behavior

### On Start
1. Random gaming name generated
2. Connects to server
3. Initializes addons
4. Auto-enables PvP (if mode = 'pvp')

### On Command
- Processes via CommandHandler
- Single source of truth (no duplicates)
- Returns response to chat

### On Combat
- Auto-attacks within range
- Uses techniques (W-tap, strafe, crits)
- Smart target selection
- Auto-heals when low

### On Multi-Bot
- Spawns with gaming names
- IPC syncs settings
- Friendly toward each other

---

**End of Usage Guide**
*Last updated: 2026-05-06*