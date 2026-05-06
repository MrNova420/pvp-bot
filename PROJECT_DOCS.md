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
9. [Improvements Made](#improvements-made)
10. [Usage Guide](#usage-guide)

---

## System Architecture

### Overview
The PvP Bot is built on Mineflayer 4.25.0 with a custom BetterBender 2.0 engine. It supports:
- Multiple bot instances (squad/army spawning)
- Proxy support (SOCKS5/SOCKS4)
- Advanced PvP combat AI
- Admin/user permission system
- Real-time command processing

### File Structure
```
pvp-bot/
├── src/
│   ├── engine.js              # Main bot engine
│   ├── core/
│   │   ├── commandHandler.js   # Command processing
│   │   ├── logger.js           # Logging system
│   │   ├── safety.js           # Safety monitoring
│   │   ├── taskManager.js     # Task management
│   │   ├── stateManager.js     # State persistence
│   │   └── activityTracker.js  # Activity logging
│   └── utils/
│       ├── proxyManager.js     # Proxy management
│       ├── proxySources.js    # Proxy sources (20+)
│       ├── proxyValidator.js  # Proxy testing
│       └── reconnect.js        # Reconnection logic
├── addons/
│   ├── pvp.js                 # Advanced PvP system
│   ├── afk.js                 # AFK mode
│   ├── pathfinding.js         # Navigation
│   ├── building.js            # Building structures
│   ├── mining.js             # Mining automation
│   ├── crafting.js           # Crafting system
│   ├── trading.js            # Trading (planned)
│   └── player.js             # Player behavior
├── CONFIG.json              # Main configuration
├── cli.js                   # CLI menu system
└── package.json
```

---

## Core Engine

### engine.js
Main bot engine that handles:
- Bot lifecycle (start/stop/restart)
- Addon management
- Proxy connection handling
- Child process tracking (squad/army)
- Admin system
- Signal handling (SIGINT/SIGTERM)

### Key Features
1. **Proxy Support**
   - Auto-detects home IP via ipify/ifconfig.me
   - Uses socks-proxy-agent for SOCKS connections
   - Sets HTTP_PROXY/HTTPS_PROXY environment variables
   - Blocks connections that leak home IP

2. **Admin System**
   - Owner + admin users can control bots
   - Admins added via `!admin <player>` command
   - Stored in `engine.admins` Set

3. **Child Process Management**
   - Tracks spawned squad/army bots
   - Broadcasts settings (friendly fire) via IPC
   - Cleans up on shutdown

### Key Methods
```javascript
engine.isAdmin(username)        // Check if user is admin
engine.addAdmin(username)         // Add admin user
engine.getAdmins()               // Get all admins
engine.trackChildProcess(proc)    // Track child
engine.stopAllChildren()         // Kill all children
engine.generateBotName()       // Generate goofy name
engine.addFriendlyBot(name)      // Add to friendly set
```

---

## Addons System

### Loading Addons
Addons are registered in `engine.addons` Map and initialized with `bot` and `engine` references.

### Available Addons

#### 1. PvP Addon (`addons/pvp.js`)
**Features:**
- Advanced combat AI with reaction time (50-200ms)
- Target prediction with velocity + acceleration
- Tactical modes: aggressive, defensive, hitAndRun, surround, flank
- Smart target selection (threat, health, armor, weapon)
- Techniques: W-tap, strafing, knockback, critical hits, bunny hop
- Friendly fire toggle with propagation to squad/army
- Squad/Army spawning (5-bot or 100+ bots)

**Tactical Modes:**
```javascript
aggressive:  { sprint: true, strafe: 0.8, backoff: 0.2 }  // All-out attack
defensive:  { sprint: false, strafe: 0.5, backoff: 0.8 } // Play it safe
hitAndRun: { sprint: true, strafe: 0.3, backoff: 0.6 } // Quick hits then retreat
surround:  { sprint: true, strafe: 1.0, backoff: 0.1 }  // Circle target
flank:     { sprint: true, strafe: 0.2, backoff: 0.3 } // Get behind target
```

#### 2. AFK Addon (`addons/afk.js`)
**Features:**
- Automated movement (random angles, sprint, jump)
- Emergency flee on low health
- Auto-eat when hungry
- Auto-respawn on death
- Threat detection and combat engagement

#### 3. Pathfinding (`addons/pathfinding.js`)
- Navigate to coordinates
- Follow players
- Go home/bed
- Complex path calculation

#### 4. Building (`addons/building.js`)
Commands: `!build house|tower|wall`

#### 5. Mining (`addons/mining.js`)
Command: `!mine <block_type>`

#### 6. Crafting (`addons/crafting.js`)
Command: `!craft <item> [amount]`

#### 7. Player (`addons/player.js`)
- Minecraft progression tracking
- AI mood/energy system
- Complex goal-oriented behavior

---

## Proxy System

### Overview
The proxy system ensures the bot's real IP is never exposed to the Minecraft server.

### How It Works
1. **Home IP Detection**
   - On startup, queries ipify.org/ifconfig.me
   - Stores in `engine.homeIP`

2. **Proxy Acquisition**
   - Fetches from 20+ sources (GitHub repos, APIs)
   - Filters to SOCKS4/SOCKS5 only (no HTTP)
   - Validates with test connections

3. **Connection Process**
   - Uses `socks-proxy-agent` library
   - Sets `HTTP_PROXY`/`HTTPS_PROXY` env vars
   - Creates Mineflayer bot with proxy agent

4. **Verification**
   - After login, checks socket IP
   - **BLOCKS** if matches home IP
   - 10-second interval monitors for IP leaks
   - Kills connection if home IP detected

### Proxy Sources (20+)
- TheSpeedX/PROXY-List (SOCKS4/SOCKS5)
- jetkai/proxy-list
- madveyjake/proxy-list
- clarketm/proxy-list
- roosterkid/proxy-list
- sunny9573/proxy-list
- a2elu/proxy-list
- BlackBeaTE/Proxys (EU/US)
- And 12 more sources...

### Known Limitations
- Free SOCKS proxies are often detected by Aternos
- Server may show home IP due to proxy transparency
- Consider paid residential proxies for full anonymity

---

## Combat System

### PvP Addon Features

#### Reaction Time
- Human-like delay: 50-200ms (randomized)
- Applied to all attack decisions
- Makes combat feel natural, not robotic

#### Target Prediction
- Uses entity velocity for position prediction
- Calculates acceleration (change in velocity)
- Predicts 2 ticks ahead with acceleration
- Stores predicted position in `target._predictedPos`

#### Target Scoring Algorithm
```javascript
Score = (distanceScore * 0.10) +     // 10% - Closer = better
        (healthScore * 0.25) +        // 25% - Lower health = easier
        (hungerScore * 0.05) +      // 5% - Lower hunger = vulnerable
        (armorPenalty * 0.15) +    // 15% - Higher armor = harder
        (aggressionScore * 0.10) +  // 10% - Targeting us?
        (weaponThreat * 0.15) +    // 15% - Dangerous weapons
        (opportunityScore * 0.20) + // 20% - Isolated/distracted
        (environmentalScore * 0.15); // 15% - Positional advantage
```

#### Combat Techniques
1. **W-Tap**: Release forward, then re-press for knockback
2. **Strafing**: Circle strafe around target (configurable)
3. **Knockback Reduction**: Sprint reset after hits
4. **Critical Hits**: Jump before attacking (if not in water)
5. **Bunny Hop**: Jump on landing for speed
6. **Double W-Tap**: Extra knockback technique

#### Tactical Decision Making
- Automatically switches tactics based on:
  - Health level
  - Number of enemies
  - Target armor/weapon
  - Distance to target
  - Environmental factors

---

## Command Reference

### For Everyone

| Command | Usage | Description |
|----------|-------|-------------|
| `!help` | `!help [command]` | Show commands or specific help |
| `!status` | `!status` | Bot status (health, food, position, mode) |
| `!come` | `!come` | Make bot come to you |
| `!follow` | `!follow [player]` | Follow a player |
| `!stop` | `!stop` | Stop current action |
| `!inv` | `!inv` | Show inventory summary |
| `!give` | `!give <item> [amount] [player]` | Give items to player |
| `!craft` | `!craft <item> [amount]` | Craft an item |
| `!mine` | `!mine <block>` | Mine specific block |
| `!build` | `!build <house\|tower\|wall>` | Build structure |
| `!home` | `!home` | Go home |
| `!sleep` | `!sleep` | Sleep in bed |
| `!mode` | `!mode <afk\|player>` | Switch bot mode |
| `!progress` | `!progress` | Show Minecraft progression |
| `!mood` | `!mood` | Show AI mood/status |

### Owner/Admin Only

| Command | Usage | Description |
|----------|-------|-------------|
| `!admin` | `!admin <player>` | Add admin user |
| `!pvp` | `!pvp` | Toggle PvP mode |
| `!ff` | `!ff` | Toggle friendly fire |
| `!guard` | `!guard [player]` | Guard/protect player |
| `!squad` | `!squad` | Spawn 5-bot squad |
| `!army` | `!army [count]` | Spawn 100+ bots |
| `!give` | `!give <amount> <player>` | Give bots to player (they follow/protect) |

### Command Details

#### `!give <amount> <player>`
- **Requires**: Admin rights
- **Effect**: Spawns specified number of bots
- **Behavior**: Bots will follow and protect the target player
- **Example**: `!give 5 Steve` → Spawns 5 bots that follow Steve

#### `!admin <player>`
- **Requires**: Owner only
- **Effect**: Adds player to admin list
- **List admins**: `!admin` (no args)
- **Example**: `!admin Alex` → Alex can now use admin commands

#### `!guard [player]`
- **Effect**: Bot follows and attacks threats to target
- **Default**: Guards owner if no player specified
- **Toggle**: Run again to stop guarding

#### `!squad`
- **Effect**: Spawns owner + 4 bots with gaming names
- **Delay**: 5 seconds between spawns (avoid Aternos throttle)
- **Names**: Random goofy/rage-bait names

#### `!army [count]`
- **Effect**: Spawns 100+ bots with gaming names
- **Default**: 100 bots
- **Example**: `!army 50` → 50 bots join

---

## Admin System

### Overview
The admin system allows the owner to delegate bot control to trusted players.

### Implementation
```javascript
// In engine.js
this.admins = new Set(); // Track admin users

// Check admin rights
isAdmin(username) {
  return this.admins.has(username);
}

// Add admin
addAdmin(username) {
  this.admins.add(username);
}

// Get all admins
getAdmins() {
  return Array.from(this.admins);
}
```

### Permissions
| Role | Commands Available |
|------|-------------------|
| **Owner** | ALL commands + `!admin` |
| **Admins** | PvP commands + `!give` + `!squad` + `!army` |
| **Players** | Basic commands only (`!help`, `!status`, `!come`, etc.) |

### IPC Communication
Child processes (squad/army bots) receive messages from parent:
```javascript
// Parent sends
child.send({ type: 'friendlyFire', value: true });

// Child receives (engine.js)
process.on('message', (msg) => {
  if (msg.type === 'friendlyFire') {
    // Update PvP addon
    const pvp = this.addons.get('pvp');
    pvp.friendlyFire = msg.value;
  }
});
```

---

## Configuration

### CONFIG.json Structure
```json
{
  "server": {
    "host": "MrNova420.aternos.me",  // NO port here!
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
  "reconnect": {
    "enabled": true,
    "unlimitedMode": true,
    "minDelayMs": 5000,
    "maxDelayMs": 15000
  },
  "logging": {
    "level": "info"
  }
}
```

### Critical Rules
1. **server.host** - MUST be hostname only (no port!)
   - ✅ GOOD: `"host": "MrNova420.aternos.me"`
   - ❌ BAD: `"host": "MrNova420.aternos.me:31267"`

2. **Proxy Mode** - Set via environment variable
   ```bash
   USE_PROXY=true node cli.js
   ```

3. **node_modules** - Committed to repo (intentional)

---

## Improvements Made

### Session 1: Proxy System
1. ✅ Auto-detect home IP (ipify/ifconfig.me)
2. ✅ Use socks-proxy-agent for SOCKS connections
3. ✅ Set HTTP_PROXY/HTTPS_PROXY globally
4. ✅ Strict blocking if socket IP = home IP
5. ✅ 10-second monitoring for IP leaks
6. ✅ Kill connection immediately on leak detection
7. ✅ Random bot names (rage-bait/goofy style)
8. ✅ Removed hardcoded IPs (future-proof)

### Session 2: Combat AI
1. ✅ Reaction time (50-200ms human-like delay)
2. ✅ Target prediction (velocity + acceleration)
3. ✅ Smart target scoring (9 factors weighted)
4. ✅ Tactical modes (5 modes with descriptions)
5. ✅ AFK-style sprint-jump movement
6. ✅ W-tap, strafing, knockback techniques
7. ✅ Bunny hop for speed
8. ✅ Double W-tap for extra knockback

### Session 3: Command System
1. ✅ Unified command handler (src/core/commandHandler.js)
2. ✅ Added `!give` command (give bots to player)
3. ✅ Added `!admin` command (admin system)
4. ✅ Friendly fire propagation to squad/army
5. ✅ IPC handler for child processes
6. ✅ Admin permissions system
7. ✅ Comprehensive COMMANDS.md reference
8. ✅ Complete PROJECT_DOCS.md (this file)

### Session 4: Bot Management
1. ✅ Squad spawning (owner + 4 bots)
2. ✅ Army spawning (100+ bots)
3. ✅ Child process tracking and cleanup
4. ✅ Friendly bot tracking (Set)
5. ✅ Random goofy name generator
6. ✅ Gaming name pools (prefixes/mids/suffixes)

---

## Usage Guide

### Quick Start
```bash
# Clone and setup
cd /home/mrnova420/pvp-bot
npm install

# Start with proxy (recommended)
USE_PROXY=true node cli.js
# Select "y" for proxy

# Start without proxy
node cli.js
```

### CLI Menu
1. **Start Bot** - Launches bot with selected options
2. **Stop Bot** - Graceful shutdown
3. **Setup/Config** - Modify CONFIG.json
4. **Combat Presets** - balanced/aggressive/defensive
5. **Edit Config** - Manual editing
6. **Install/Update** - npm install/update

### In-Game Commands
```bash
# Join server, then use chat:

!pvp              # Enable PvP mode
!guard Steve        # Guard Steve
!squad            # Spawn 5-bot squad
!give 5 Alex       # Give 5 bots to Alex
!admin Bob         # Make Bob an admin
!status           # Check bot status
!ff               # Toggle friendly fire
```

### Squad/Army Spawning
```bash
# In-game chat:
!squad              # 5 bots (owner + 4) with gaming names
!army 50            # 50 bots with gaming names
!give 10 Steve      # 10 bots follow Steve
```

### Monitoring
```bash
# Logs location
tail -f data/logs/*.log

# Check bot status in-game
!status

# Check combat stats
!pvp (when enabled)
```

---

## Planned Improvements

### Short Term
1. **Dashboard/Web UI** - Control bots via browser
2. **More Addons** - Farming, trading, exploration
3. **Smarter AI** - Goal-oriented behavior trees
4. **Performance** - CPU/memory optimization

### Long Term
1. **Paid Residential Proxies** - True IP anonymity
2. **Multi-Server Support** - Connect to multiple servers
3. **Database Integration** - Persistent bot states
4. **Machine Learning** - Adaptive combat AI

---

## Troubleshooting

### Bot Won't Start
- Check CONFIG.json syntax
- Verify server is online
- Check logs: `data/logs/`

### Proxy Not Working
- Aternos detects free proxies (known issue)
- Try: Paid residential proxies
- Check: `USE_PROXY=true` is set

### Commands Not Working
- Verify you're the owner or admin
- Check: `!help` for available commands
- Logs: `src/core/commandHandler.js`

### Bots Not Following/Protecting
- Check friendly fire: `!ff`
- Verify target player is online
- Check bot has pathfinding addon

---

**End of Documentation**
*Last updated: 2026-05-06*
*Version: BetterBender 2.0 + PvP Bot*
