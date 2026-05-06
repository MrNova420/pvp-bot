# PvP Bot - Complete Project Documentation

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Core Engine](#core-engine)
3. [Addons System](#addons-system)
4. [Proxy System](#proxy-system)
5. [Combat System](#combat-system)
6. [Command Reference](#command-reference)
7. [Admin System](#admin-system)
8. [Configuration](#configuration)
9. [Critical Fixes Applied](#critical-fixes-applied)
10. [Usage Guide](#usage-guide)
11. [Features Overview](#features-overview)
12. [Troubleshooting](#troubleshooting)

---

## System Architecture

### Overview
The PvP Bot is built on **Mineflayer 4.20.1** with a custom **BetterBender 2.0** engine. It supports:
- Multiple bot instances (squad/army spawning)
- Proxy support (SOCKS5 only)
- Advanced PvP combat AI
- Admin/user permission system
- Real-time command processing
- Merged addon system (a1-bot, super-pathfinder)

### Technology Stack
| Component | Technology | Version |
|-----------|-----------|---------|
| Bot Framework | Mineflayer | 4.20.1 |
| Pathfinding | mineflayer-pathfinder | Latest |
| Proxy | socks-proxy-agent | Latest |
| Engine | BetterBender | 2.0 |
| Protocol | Minecraft | 1.20.1 |

### File Structure
```
pvp-bot/
├── src/
│   ├── engine.js              # Main bot engine (1021 lines)
│   ├── cli.js                # CLI menu system
│   ├── multi.js             # Multi-bot spawning
│   ├── index.js            # Legacy entry point
│   └── core/
│       ├── commandHandler.js # ALL command processing (540 lines)
│       ├── logger.js         # Logging system
│       ├── safety.js        # Safety monitoring
│       ├── taskManager.js   # Task management
│       ├── stateManager.js # State persistence
│       └── activityTracker.js # Activity logging
├── addons/
│   ├── a1-bot.js           # Merged PvP addon (1871 lines)
│   ├── super-pathfinder.js  # Merged pathfinding (57 lines)
│   ├── player.js          # Player behavior
│   ├── player-basic.js    # Basic player
│   ├── mining.js          # Mining automation
│   ├── building.js       # Building structures
│   ├── crafting.js      # Crafting system
│   ├── afk.js           # AFK mode
│   ├── trading.js        # Trading
│   └── player-interactions.js # Player chat
├── archive/               # Redundant merged files
│   ├── pvp.js
│   ├── pathfinding.js
│   ├── soldier.js
│   └── ultimate-a1.js
├── CONFIG.json           # Main configuration
├── package.json         # Dependencies
└── data/
    ├── bot-state.json    # Saved state
    ├── proxies.json    # Cached proxies
    └── logs/          # Log files
```

---

## Core Engine

### engine.js - Detailed
**Location**: `src/engine.js` (1021 lines)

The main engine handles the complete bot lifecycle:

#### Constructor (lines 14-55)
```javascript
constructor(config) {
    this.config = config;
    this.logger = new Logger(config.logging);
    this.safety = new SafetyMonitor(config.safety, this.logger);
    this.taskManager = new TaskManager(config.tasks, this.logger);
    this.stateManager = new StateManager({ persistDir: 'data' }, this.logger);
    this.activityTracker = new ActivityTracker({ persistDir: 'data' }, this.logger);
    this.reconnectManager = new ReconnectManager(config.reconnect, this.logger);
    
    this.bot = null;
    this.addons = new Map();
    this.currentMode = config.mode?.current || 'pvp';
    this.running = false;
    this.shuttingDown = false;
    this.eventHandlers = new Map();
    this.spawnedChildren = [];
    this.botNameRegistry = new Set();
    this.admins = new Set();
    this.usingProxy = process.env.USE_PROXY === 'true';
    this.proxyRetryCount = 0;
    this.proxyMaxRetries = 10;
    this.proxyCheckInterval = null;
    this.lastVerifiedIP = null;
    this.currentProxy = null;
    this.homeIP = null;
    this.botNamePool = [...] // 50+ gaming names
}
```

#### Key Methods

| Method | Purpose |
|--------|---------|
| `start()` | Initialize and connect bot |
| `_connect()` | Core connection logic |
| `_connectWithProxy()` | Proxy-based connection |
| `_setupBotEvents()` | Set up all event listeners |
| `_initializeAddons()` | Load and initialize addons |
| `_autoLoadAddons()` | Auto-load from CONFIG.json |
| `isAdmin(username)` | Check admin rights |
| `addAdmin(username)` | Add admin user |
| `getAdmins()` | Get all admins |
| `trackChildProcess(proc)` | Track child bot |
| `stopAllChildren()` | Kill all child bots |
| `generateBotName()` | Generate gaming name |
| `addFriendlyBot(name)` | Track friendly bot |
| `switchMode(mode)` | Switch bot mode |
| `_onFatalError(err)` | Handle fatal errors |

#### Initialization Flow (DETAILED)
```
1. Constructor (new Engine(config))
   └─ Creates Logger, Safety, TaskManager, StateManager, etc.
   
2. start()
   └─ _connect()
       ├─ If USE_PROXY=true: _connectWithProxy()
       │   └─ Fetch proxies, try each with socks-proxy-agent
       └─ Else: mineflayer.createBot() direct
   
3. On login (_setupBotEvents())
   ├─ Set up event listeners (chat, death, error, kick, etc.)
   ├─ Create CommandHandler
   ├─ Initialize addons
   └─ Start proxy monitoring (if enabled)
   
4. On spawn (_initializeAddons())
   ├─ Create CommandHandler (if not exists)
   ├─ For each addon:
   │   ├─ addon.init(bot, engine)
   │   └─ Auto-enable if matches mode.current
   └─ Log "Bot ready!"
```

#### Auto-Enable Logic (CRITICAL FIX)
The engine auto-enables addons based on CONFIG.json mode:

```javascript
// In _initializeAddons() - lines 670-690
for (const [name, addon] of this.addons) {
    try {
        addon.init(this.bot, this);
        this.logger.info(`Addon initialized: ${name}`);
        
        // AUTO-ENABLE LOGIC (FIXED 2026-05-06)
        if ((name === this.currentMode || (this.currentMode === 'pvp' && name === 'a1-bot')) && addon.enable) {
            setTimeout(() => {
                addon.enable();
                this.logger.info(`Auto-enabled ${name} mode addon`);
            }, 500);
        }
    } catch (err) {
        this.logger.error(`Failed to initialize addon ${name}:`, err.message);
    }
}
```

---

## Addons System

### Addon Loading

#### Auto-Load Process
1. Reads `CONFIG.json` `addons` section
2. Loads enabled addons from `addons/` directory
3. Creates addon instances with `bot` and `engine` refs
4. Calls `addon.init(bot, engine)` for each
5. Auto-enables based on mode match

#### Addon Interface
```javascript
class Addon {
    name = 'addon-name';      // Unique name for auto-enable
    enable = true;           // Can be auto-enabled
    
    init(bot, engine) {
        this.bot = bot;
        this.engine = engine;
        this.logger = engine.logger;
    }
    
    enable() {
        this.enabled = true;
    }
    
    disable() {
        this.enabled = false;
    }
}
```

### Available Addons

#### 1. a1-bot (PRIMARY - ENABLED)
**File**: `addons/a1-bot.js` (1871 lines - MERGED)
**Purpose**: Main PvP/combat system

**Merged from**:
- addons/a1-bot.js
- addons/ultimate-a1.js
- addons/soldier.js
- addons/pvp.js
- addons/pvp.js.backup

**Features**:
- Combat AI with reaction time (50-200ms)
- Target selection (health, armor, weapon)
- W-tap, strafing, knockback
- Critical hits, bunny hop
- Tactical modes: combat, crystal, pvm, pve
- Guard mode (follow + protect)
- Squad spawning (5 bots)
- Army spawning (10 bots)
- Friendly fire toggle

**Combat Modes**:
| Mode | Description |
|------|-------------|
| combat | Standard PvP |
| crystal | Crystal PvP |
| pvm | Player vs Mob |
| pve | Player vs Entity |
| idle | No combat |

**Combat Techniques**:
```javascript
// W-Tap: Release forward, re-press for knockback
if (this.enableWTap) {
    this.bot.setControlState('forward', false);
    setTimeout(() => this.bot.setControlState('forward', true), 100);
}

// Strafing: Circle around target
if (this.enableStrafe) {
    const angle = Math.atan2(dy, dx) + Math.PI / 2;
    this.bot.lookAt(yaw + angle);
}

// Critical hits: Jump before attacking
if (this.enableCrits && !inWater) {
    this.bot.setControlState('jump', true);
}
```

#### 2. super-pathfinder (ENABLED - MERGED)
**File**: `addons/super-pathfinder.js` (57 lines)

**Merged from**:
- addons/super-pathfinder.js
- addons/advanced-pathfinder.js
- addons/pathfinding.js

**Features**:
- Go to coordinates
- Follow players
- Go home
- Complex pathfinding

#### 3. player (ENABLED)
**File**: `addons/player.js`

**Features**:
- Minecraft progression tracking
- AI mood/energy system
- Complex goal-oriented behavior

#### 4. player-basic (ENABLED)
**File**: `addons/player-basic.js`
**Purpose**: Basic player movements

#### 5. mining (ENABLED)
**File**: `addons/mining.js`
**Command**: `!mine <block_type>`

#### 6. building (ENABLED)
**File**: `addons/building.js`
**Commands**: `!build house|tower|wall`

#### 7. crafting (ENABLED)
**File**: `addons/crafting.js`
**Commands**: `!craft <item> [amount]`

#### 8-10. Other Addons
| Addon | Status | Purpose |
|-------|--------|---------|
| afk | Disabled | AFK mode |
| trading | Disabled | Trade villagers |
| player-interactions | Disabled | Player chat |

---

## Proxy System

### Detailed Implementation

#### 1. Home IP Detection
On startup, the engine detects the home IP:
```javascript
async _detectHomeIP() {
    try {
        const [ipify, ifconfig] = await Promise.all([
            fetch('https://api.ipify.org'),
            fetch('https://ifconfig.me')
        ]);
        this.homeIP = await ipify.text();
        this.logger.info(`[Engine] Home IP: ${this.homeIP}`);
    } catch (err) {
        this.logger.error('[Engine] Failed to detect home IP:', err.message);
    }
}
```

#### 2. Proxy Connection Flow
```
_connectWithProxy()
├─ Fetch proxies (proxyManager.fetchProxies())
│   └─ Get from 20+ sources
│       └─ Filter SOCKS4/SOCKS5 only
├─ For each proxy:
│   └─ _tryProxy(proxy, options, attemptNum)
│       ├─ Create SocksProxyAgent
│       ├─ Create bot with agent
│       ├─ Test connection
│       └─ Return on success
└─ If all fail:
    ├─ Increment retry count
    ├─ Check max retries (10)
    ├─ Exponential backoff
    └─ Retry or give up
```

#### 3. Proxy Retry Logic (FIXED)
```javascript
// Constructor adds:
this.proxyRetryCount = 0;
this.proxyMaxRetries = 10;

// On all proxies fail:
const backoffMs = Math.min(3000 * Math.pow(2, this.proxyRetryCount), 30000);
// Retry 1: 3s
// Retry 2: 6s
// Retry 3: 12s
// Retry 4: 24s
// Retry 5+: 30s (max)

// After 10 retries: EXIT
```

#### 4. IP Verification (CRITICAL)
After login, verify the connection IP:
```javascript
this.bot.on('login', () => {
    const socketIP = this.bot._client.socket.remoteAddress;
    
    if (socketIP === this.homeIP) {
        this.logger.error(`[ProxyManager] IP LEAK! ${socketIP} = home IP! Killing!`);
        this.bot.quit();
        return;
    }
    
    this.logger.info(`[ProxyManager] Connection IP: ${socketIP} (verified)`);
});
```

#### 5. Ongoing Monitoring
Every 10 seconds, check for IP leaks:
```javascript
this.proxyCheckInterval = setInterval(async () => {
    try {
        const response = await fetch('https://api.ipify.org');
        const currentIP = await response.text();
        
        if (currentIP === this.homeIP) {
            this.logger.error(`[ProxyManager] IP LEAK! Killing bot!`);
            this.stop();
        }
    } catch (err) {
        this.logger.error('[ProxyManager] IP check failed:', err.message);
    }
}, 10000);
```

---

## Combat System

### Detailed Combat Logic

#### Target Selection
```javascript
_findTarget() {
    const targets = [];
    
    // Get all player entities
    for (const entity of Object.values(this.bot.entities.byType('player'))) {
        // Skip self
        if (entity.username === this.bot.username) continue;
        
        // Skip owner (unless friendly fire)
        if (entity.username === this.engine.config.owner?.username && !this.friendlyFire) continue;
        
        const dist = this.bot.entity.position.distanceTo(entity.position);
        if (dist < this.attackRange) {
            targets.push({ entity, distance: dist });
        }
    }
    
    if (targets.length === 0) return null;
    
    // Return closest target
    return targets.sort((a, b) => a.distance - b.distance)[0];
}
```

#### Attack Loop
```javascript
_combatLoop() {
    if (!this.enabled) return;
    if (!this.autoAttack) return;
    
    const target = this._findTarget();
    if (!target) return;
    
    const dist = this.bot.entity.position.distanceTo(target.entity.position);
    
    if (dist <= this.attackRange) {
        this._attackTarget(target.entity);
    } else {
        this._approachTarget(target.entity);
    }
}
```

#### Combat Techniques

1. **W-Tap** - Release forward, re-press
```javascript
if (this.enableWTap) {
    this.bot.setControlState('forward', false);
    setTimeout(() => this.bot.setControlState('forward', true), 100);
}
```

2. **Strafing** - Circle around target
```javascript
if (this.enableStrafe) {
    const angle = Math.atan2(dy, dx) + Math.PI / 2;
    this.bot.lookAt(yaw + angle);
}
```

3. **Knockback Reduction** - Sprint reset
```javascript
if (this.enableAntiKB) {
    this.bot.clearControlStates();
    this.bot.setControlState('sprint', true);
}
```

4. **Critical Hits** - Jump attack
```javascript
if (this.enableCrits && !inWater) {
    if (!this.bot.controlState.jump) {
        this.bot.setControlState('jump', true);
    }
}
```

5. **Bunny Hop** - Jump on landing
```javascript
if (!this.bot.controlState.jump && this.velocity.y < 0) {
    this.bot.setControlState('jump', true);
}
```

---

## Command Reference

### ALL Commands (29 total)

All commands processed by **CommandHandler** - SINGLE SOURCE OF TRUTH.

### Core Commands (17)
| Command | Usage | Description |
|----------|-------|-------------|
| `!help` | `!help [cmd]` | Show all commands or help |
| `!mode` | `!mode <afk|player>` | Switch bot mode |
| `!status` | `!status` | Health, food, position |
| `!come` | `!come` | Come to you |
| `!follow` | `!follow [player]` | Follow player |
| `!stop` | `!stop` | Stop action |
| `!mine` | `!mine <block>` | Mine block |
| `!build` | `!build <house|tower|wall>` | Build structure |
| `!giveitem` | `!giveitem <item> [amt] [player]` | Give items |
| `!inv` | `!inv` | Inventory summary |
| `!craft` | `!craft <item> [amt]` | Craft item |
| `!progress` | `!progress` | MC progression |
| `!mood` | `!mood` | AI mood |
| `!home` | `!home` | Go home |
| `!sleep` | `!sleep` | Sleep in bed |
| `!give` | `!give <amt> <player>` | Spawn bots |
| `!admin` | `!admin <player>` | Add admin |

### A1-Bot Commands (12)
| Command | Usage | Description |
|----------|-------|-------------|
| `!stay` | `!stay` | Set mode to idle |
| `!pvp` | `!pvp` | Toggle PvP mode |
| `!kill` | `!kill` | Set combat mode |
| `!crystal` | `!crystal` | Set crystal mode |
| `!pvm` | `!pvm` | Player vs Mob |
| `!pve` | `!pve` | Player vs Entity |
| `!attack` | `!attack` | Toggle auto attack |
| `!test` | `!test` | Test bot |
| `!ff` | `!ff` | Toggle friendly fire |
| `!guard` | `!guard [player]` | Toggle guard |
| `!squad` | `!squad` | Spawn 5 bots |
| `!army` | `!army` | Spawn 10 bots |

---

## Admin System

### Implementation
```javascript
// In engine.js
this.admins = new Set();

isAdmin(username) {
    return this.admins.has(username) || username === this.config.owner?.username;
}

addAdmin(username) {
    this.admins.add(username);
}

getAdmins() {
    return Array.from(this.admins);
}
```

### Permissions Matrix
| Role | Commands |
|------|---------|
| **Owner** | All 29 commands |
| **Admin** | give, giveitem, squad, army, admin |
| **Player** | None |

### IPC Communication
Parent broadcasts to children:
```javascript
child.send({ type: 'friendlyFire', value: true });
```

---

## Features Overview

### What to Expect

#### 1. Bot Behavior
- **On Start**: Random gaming name from pool (ProRager, XxTryHardxx, etc.)
- **On Connect**: Attempts proxy connection (if USE_PROXY=true)
- **On Spawn**: Initializes all addons based on CONFIG.json
- **On Command**: Processes via CommandHandler

#### 2. Combat Features
- **Auto-attack**: Enemies within range
- **Reaction time**: 50-200ms human-like delay
- **Techniques**: W-tap, strafing, critical hits
- **Target selection**: Smart scoring by health/armor

#### 3. Protection Features
- **Friendly fire**: Prevents hitting owner
- **Guard mode**: Follows and protects player
- **Squad/Army**: Spawns multiple bots

#### 4. Proxy Features
- **Auto-detect**: Home IP on startup
- **Verification**: Blocks if IP matches
- **Monitoring**: 10s interval checks
- **Retry**: 10 max attempts with backoff

#### 5. Multi-Bot Features
- **Squad**: 5 bots with gaming names
- **Army**: 10 bots with gaming names
- **Give**: Spawn bots for player
- **IPC**: Settings sync via process messages

---

## Configuration

### CONFIG.json Structure
```json
{
  "server": {
    "host": "MrNova420.aternos.me",
    "port": 31267,
    "version": "1.20.1"
  },
  "auth": {
    "type": "offline",
    "username": "xxTryHardxx"
  },
  "mode": {
    "current": "pvp",
    "autoSwitch": false
  },
  "pvpMode": {
    "enabled": true,
    "autoAttack": true,
    "attackRange": 4,
    "cps": 8,
    "enableCrits": true,
    "enableStrafe": true,
    "enableWTap": true,
    "enableAntiKB": true
  },
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

## Critical Fixes Applied (2026-05-06)

### Fix #1: Mode Mismatch (CRITICAL)
- **Problem**: a1-bot NOT auto-enabling because mode="pvp" but name="a1-bot"
- **Solution**: Added special case in engine.js line 676

### Fix #2: Dual Chat Listeners (HIGH)
- **Problem**: TWO listeners processing commands
- **Solution**: Removed a1-bot.js chat listener entirely

### Fix #3: Duplicate !pvp (MEDIUM)
- **Problem**: !pvp handled twice
- **Solution**: Single path via CommandHandler

### Fix #4: Proxy Recursion (HIGH)
- **Problem**: Infinite retries on failure
- **Solution**: Added 10 retry limit with backoff

### Fix #5: BOT_NAME Validation (LOW)
- **Problem**: Invalid names cause failures
- **Solution**: Added regex validation

### Fix #6: Dead Code (LOW)
- **Problem**: _handleChat unused after listener removal
- **Solution**: Removed method, moved to CommandHandler

---

## Usage Guide

### Quick Start
```bash
# Direct connection
node cli.js

# With proxy (recommended)
USE_PROXY=true node cli.js
```

### In-Game Commands
```bash
!pvp           # Enable PvP
!attack        # Toggle auto attack
!ff            # Toggle friendly fire
!guard Steve  # Guard Steve
!squad         # Spawn 5 bots
!army          # Spawn 10 bots
!give 5 Alex   # Give 5 bots to Alex
!admin Bob     # Make Bob admin
!status        # Check status
```

### Testing
```bash
!test        # Verify chat working
!status     # Check health/food/position
!mood       # Check AI mood
```

---

## Troubleshooting

### Common Issues
| Issue | Solution |
|-------|----------|
| Bot won't start | Check CONFIG.json, verify server online |
| Proxy not working | Try paid residential proxy |
| Commands not working | Verify owner/admin |
| Bots not following | Check friendly fire |

---

**End of Documentation**
*Last updated: 2026-05-06*
*Version: BetterBender 2.0 + PvP Bot + Critical Fixes*