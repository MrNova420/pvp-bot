# PvP Bot - Agent Guidance

## Project Overview
- Minecraft PvP bot using Mineflayer 4.20.1 + BetterBender 2.0 engine
- Combat features: auto-attack, W-tap, strafing, crits, healing
- Toggle via `!pvp` chat command from owner/admins
- Enhanced proxy support (SOCKS5 only) to avoid Aternos throttling
- Rage-bait goofy gaming names (random generation)
- Smart AI with reaction time, prediction, tactical modes
- **Multi-bot support**: Spawn up to 100 bots per owner
- **Addon system**: Enable/disable addons via CONFIG.json

## Critical Fixes Applied (2026-05-06)

### 1. Mode Mismatch Fix (CRITICAL - FIXED)
**Problem**: a1-bot addon name is "a1-bot" but config mode.current was "pvp" - auto-enable check failed (`'a1-bot' === 'pvp'` = FALSE)

**Solution**: Added special case in engine.js line 676:
```javascript
if ((name === this.currentMode || (this.currentMode === 'pvp' && name === 'a1-bot')) && addon.enable)
```

### 2. Dual Chat Listeners Removed (HIGH - FIXED)
**Problem**: BOTH engine.js:610 AND a1-bot.js:374 had chat listeners processing commands

**Solution**: 
- Removed chat listener from a1-bot.js entirely
- Added 12 new commands to CommandHandler
- All command processing now centralized in CommandHandler

### 3. Duplicate !pvp Handling Removed (MEDIUM - FIXED)
**Problem**: !pvp was handled in TWO places (a1-bot.js line 393 + line 1612)

**Solution**: Single command path now via CommandHandler

### 4. Chat Listener Enabled Check (MEDIUM - FIXED)
**Problem**: a1-bot chat listener didn't check `this.enabled` flag

**Solution**: Removed listener entirely (commands now in CommandHandler)

### 5. Proxy Infinite Recursion (HIGH - FIXED)
**Problem**: `_connectWithProxy()` recursively retried forever on failure

**Solution**: Added retry limit (10 max) with exponential backoff in engine.js:
```javascript
this.proxyRetryCount = 0;
this.proxyMaxRetries = 10;
const backoffMs = Math.min(3000 * Math.pow(2, this.proxyRetryCount), 30000);
```

### 6. BOT_NAME Validation (LOW - FIXED)
**Problem**: No validation of BOT_NAME env var - invalid names caused connection failures

**Solution**: Added validation in engine.js:
```javascript
const validNameRegex = /^[a-zA-Z0-9_]{3,16}$/;
if (!validNameRegex.test(botName)) { /* use random name */ }
```

### 7. Dead Code Cleanup (LOW - DONE)
**Problem**: _handleChat method in a1-bot.js was dead code after removing chat listener

**Solution**: Removed entire _handleChat method (~160 lines), all functionality moved to CommandHandler

### 8. Mode Routing Fix (HIGH - FIXED)
**Problem**: update() duplicated combat handling already done by _combatLoop()

**Solution**: update() now only routes follow/crystal/pvm/pve modes. Combat handled exclusively by _combatLoop()

### 9. Feature Activation (HIGH - FIXED)
**Problem**: 69+ features in a1-bot.js were coded but not all activating

**Solution**: 
- enable() now starts combat mode with auto-attack
- 11 soldier commands registered in CommandHandler
- Advanced PvP engine properly integrated

## All a1-bot Features (69+ Active)

### Offensive Techniques
- Auto-attack at configurable CPS (8 default)
- Packet-based critical hits (advanced)
- W-Tap sprint reset for knockback
- End Crystal PvP with configurable delay
- Weapon switching to best available
- Axe shield breaking (advanced)

### Defensive Techniques
- Anti-knockback sprint toggle
- KB cancel via jump (advanced)
- Auto-shield (advanced)
- On-hit backoff
- Distance management (too-close backpedal)
- Auto-healing with 19 food types

### Movement Strategies
- Intelligent strafe (advanced)
- Circular strafing (sine wave)
- Jump pursuit for crits
- Sprint pursuit
- Predictive following (10 ticks)
- Jump dodging
- Tactical backoff

### Targeting (8-Factor Scoring)
- Velocity + acceleration prediction
- Armor value calculation
- Weapon threat assessment (5 tiers)
- Aggression detection
- Opportunity scoring (isolation, distraction, visibility)
- Environmental advantage
- Ally counting
- Target persistence (score delta of 20 for switch)

### AI Decision Making
- Outnumbered retreat (3+ enemies, <12 HP)
- Critical health heal/retreat (<8 HP)
- Aggressive fleeing target chase (>2x range)
- Focus weakest target
- Tactical mode auto-switching (5 rules)
- CPS adjustment for defense
- Reaction time randomization (50-200ms)

### Tactical Modes (Auto-Switching)
- aggressive: Sprint on, high strafe, minimal backoff
- defensive: No sprint, balanced strafe, high backoff
- hitAndRun: Sprint on, moderate strafe, high backoff
- surround: Sprint on, max strafe, minimal backoff
- flank: Sprint on, low strafe, moderate backoff

## Key Files

| File | Purpose |
|------|---------|
| `src/engine.js` | Bot engine, addon loading, auto-enable, proxy management |
| `addons/a1-bot.js` | Merged PvP addon (1998 lines) - combat, following, squad/army spawning |
| `addons/super-pathfinder.js` | Merged pathfinding (188 lines) |
| `src/core/commandHandler.js` | All chat commands (559 lines, 29 commands) |
| `src/utils/proxyManager.js` | Proxy fetching, validation |
| `CONFIG.json` | Server, auth, addons, combat settings |

## All Addons (10 total)

### Enabled by Default in CONFIG.json:
| Addon | File | Status | Description |
|-------|------|--------|-------------|
| **a1-bot** | `addons/a1-bot.js` | ✅ Enabled | Main PvP/combat system - merged from 5 files |
| **super-pathfinder** | `addons/super-pathfinder.js` | ✅ Enabled | Merged navigation |
| | | | |
| | | | |

### Disabled by Default:
| Addon | File | Status | Description |
|-------|------|--------|-------------|
| afk | `addons/afk.js` | ❌ Disabled | AFK mode, idle behavior |
| trading | `addons/trading.js` | ❌ Disabled | Trade with villagers |
| player-interactions | `addons/player-interactions.js` | ❌ Disabled | Handle player chat requests |
| player | `addons/player.js` | ❌ Disabled | Player behavior (disabled for stability) |
| building | `addons/building.js` | ❌ Disabled | Build structures |
| mining | `addons/mining.js` | ❌ Disabled | Mine blocks |
| crafting | `addons/crafting.js` | ❌ Disabled | Craft items |

### Moved to archive/ (redundant):
- `addons/archive/pvp.js` - Functionality merged into a1-bot.js
- `addons/archive/pathfinding.js` - Functionality merged into super-pathfinder.js
- `addons/archive/soldier.js` - Functionality merged into a1-bot.js
- `addons/archive/ultimate-a1.js` - Functionality merged into a1-bot.js

## All Commands (29 total)

All commands processed by `src/core/commandHandler.js`. Commands use `!` prefix.

### Core Commands (17):
| Command | Usage | Description |
|----------|-------|-------------|
| `!help` | `!help [cmd]` | Show all commands or help for specific command |
| `!mode` | `!mode <afk|player>` | Switch bot mode |
| `!status` | `!status` | Bot status (health, food, position, mode) |
| `!come` | `!come` | Come to you |
| `!follow` | `!follow [player]` | Follow a player |
| `!stop` | `!stop` | Stop current action |
| `!mine` | `!mine <block>` | Mine specific block type |
| `!build` | `!build <house|tower|wall>` | Build a structure |
| `!giveitem` | `!giveitem <item> [amt] [player]` | Give items to player |
| `!inv` | `!inv` | Inventory summary |
| `!craft` | `!craft <item> [amt]` | Craft an item |
| `!progress` | `!progress` | Minecraft progression status |
| `!mood` | `!mood` | Bot AI mood and energy |
| `!home` | `!home` | Go to home location |
| `!sleep` | `!sleep` | Sleep in bed |
| `!give` | `!give <amount> <player>` | Spawn bots for player |
| `!admin` | `!admin <player>` | Add admin user |

### A1-Bot Commands (12):
| Command | Usage | Description |
|----------|-------|-------------|
| `!stay` | `!stay` | Set mode to idle |
| `!pvp` | `!pvp` | Toggle PvP combat mode |
| `!kill` | `!kill` | Set combat mode |
| `!crystal` | `!crystal` | Set crystal mode |
| `!pvm` | `!pvm` | Player vs Mob mode |
| `!pve` | `!pve` | Player vs Entity mode |
| `!attack` | `!attack` | Toggle auto attack |
| `!test` | `!test` | Test command - verify bot working |
| `!ff` | `!ff` | Toggle friendly fire |
| `!guard` | `!guard [player]` | Toggle guard mode |
| `!squad` | `!squad` | Spawn 5-bot squad |
| `!army` | `!army` | Spawn 10-bot army |

### Soldier Commands (11):
| Command | Usage | Description |
|----------|-------|-------------|
| `!soldier follow` | `!soldier follow <player>` | Follow player |
| `!soldier guard` | `!soldier guard <target>` | Guard location/player |
| `!soldier attack` | `!soldier attack <entity>` | Attack entity |
| `!soldier gather` | `!soldier gather <resource> [amt]` | Gather resources |
| `!soldier build` | `!soldier build <structure>` | Build structure |
| `!soldier go` | `!soldier go <x> <y> <z>` | Move to coordinates |
| `!soldier patrol` | `!soldier patrol <area>` | Patrol area |
| `!soldier status` | `!soldier status` | Status report |
| `!soldier flee` | `!soldier flee` | Flee immediately |
| `!soldier stop` | `!soldier stop` | Stop all tasks |
| `!soldier help` | `!soldier help` | Help listing |

## How It Works

1. **Startup**: `node cli.js` or `USE_PROXY=true node cli.js`
2. **Bot Name**: Random from pool OR BOT_NAME env var (validated 3-16 alphanumeric)
3. **Addons**: Loaded from CONFIG.json `addons` section
4. **Auto-enable**: All enabled addons auto-enable on spawn
5. **Commands**: ALL processed by CommandHandler (single source of truth)
6. **Proxy**: SOCKS5 via socks-proxy-agent with retry limit (10 max)
7. **IP Check**: Auto-detect home IP, block if connection IP matches
8. **Combat**: a1-bot auto-starts in combat mode with advanced PvP

## Proxy System

- **Sources**: 7 SOCKS5 proxy sources only (no HTTP)
- **Connect**: socks-proxy-agent
- **Verify**: Check socket IP ≠ home IP
- **Monitor**: 10s interval for IP leaks
- **Retry**: 10 max with exponential backoff (3s→6s→12s→24s→30s)
- **Lifetime**: Same proxy for bot's full lifecycle

## Testing Commands

```bash
# Test bot startup
node cli.js

# Test with proxy
USE_PROXY=true node cli.js

# Test commands
!test   # Verify chat working
!status # Check health/position
!pvp    # Toggle combat mode
!ff     # Toggle friendly fire
!guard  # Start guarding
!squad  # Spawn 5 bots
!army   # Spawn 10 bots
!soldier status  # Soldier status report
```

## Known Issues

- Free SOCKS proxies get detected/routed by Aternos - consider paid residential proxies
- Some proxies fail immediately (ECONNRESET) - system auto-retries with next proxy
- CONFIG.json host should NOT include port number
- IPC messages require child processes to be spawned with `detached: true`
- Aternos server sees home IP regardless of proxy (server-side limitation)