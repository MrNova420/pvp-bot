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

## Key Files

| File | Purpose |
|------|---------|
| `src/engine.js` | Bot engine, addon loading, auto-enable, proxy management |
| `addons/a1-bot.js` | Merged PvP addon (1871 lines) - combat, following, squad/army spawning |
| `addons/super-pathfinder.js` | Merged pathfinding (57 lines) |
| `src/core/commandHandler.js` | All chat commands (540 lines, 29 commands) |
| `src/utils/proxyManager.js` | Proxy fetching, validation |
| `CONFIG.json` | Server, auth, addons, combat settings |

## All Addons (10 total)

### Enabled by Default in CONFIG.json:
| Addon | File | Status | Description |
|-------|------|--------|-------------|
| **a1-bot** | `addons/a1-bot.js` | ✅ Enabled | Main PvP/combat system - merged from 5 files |
| **player** | `addons/player.js` | ✅ Enabled | Player behavior, AI decisions, mood system |
| **player-basic** | `addons/player-basic.js` | ✅ Enabled | Basic player movements and actions |
| **super-pathfinder** | `addons/super-pathfinder.js` | ✅ Enabled | Merged navigation (3 files combined) |
| **mining** | `addons/mining.js` | ✅ Enabled | Mine blocks, !mine command |
| **building** | `addons/building.js` | ✅ Enabled | Build structures, !build command |
| **crafting** | `addons/crafting.js` | ✅ Enabled | Craft items, !craft command |

### Disabled by Default:
| Addon | File | Status | Description |
|-------|------|--------|-------------|
| afk | `addons/afk.js` | ❌ Disabled | AFK mode, idle behavior |
| trading | `addons/trading.js` | ❌ Disabled | Trade with villagers |
| player-interactions | `addons/player-interactions.js` | ❌ Disabled | Handle player chat requests |

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

## How It Works

1. **Startup**: `node cli.js` or `USE_PROXY=true node cli.js`
2. **Bot Name**: Random from pool OR BOT_NAME env var (validated 3-16 alphanumeric)
3. **Addons**: Loaded from CONFIG.json `addons` section
4. **Auto-enable**: Matches config `mode.current` OR special case for "pvp" → "a1-bot"
5. **Commands**: ALL processed by CommandHandler (single source of truth)
6. **Proxy**: SOCKS5 via socks-proxy-agent with retry limit (10 max)
7. **IP Check**: Auto-detect home IP, block if connection IP matches

## Proxy System

- **Problem**: Aternos detects/free SOCKS proxies via IP database
- **Solution**: socks-proxy-agent for proper SOCKS5 support
- **Home IP**: Auto-detects via ipify.org/ifconfig.me at startup
- **Strict Blocking**: Rejects connection if socket IP = home IP
- **Monitoring**: 10-second interval checks for IP leaks
- **Retry Limit**: Max 10 retries with exponential backoff
- **Validation**: Tests proxies before use

## Features

- **Auto-detects home IP** - queries ipify/ifconfig.me at startup
- **Random bot names** - rage-bait goofy names (ProRager, XxTryHardxx, etc.)
- **Global proxy env** - sets HTTP_PROXY/HTTPS_PROXY for all traffic
- **Strict blocking** - rejects connection if socket IP = home IP
- **Aggressive monitoring** - 10s interval kills if IP leaks
- **Reaction time** - human-like delay (50-200ms)
- **Smart prediction** - uses velocity + acceleration
- **Tactical modes** - aggressive, defensive, hitAndRun, surround, flank
- **Admin system** - owner can add admins, admins can control bots
- **Friendly fire propagation** - toggles to all squad/army bots via IPC
- **Multi-bot spawning** - up to 100 bots per owner
- **Addon system** - enable/disable addons via CONFIG.json

## Development Notes

- node_modules is committed - do NOT gitignore
- Package versions locked via package-lock.json
- **All commands now in CommandHandler** - single source of truth
- **a1-bot addon NO LONGER has chat listener** - all commands via CommandHandler
- **Auto-enable logic**: `name === currentMode || (currentMode === 'pvp' && name === 'a1-bot')`
- **Proxy retry**: Max 10 with exponential backoff (3s → 6s → 12s → 24s → max 30s)
- **BOT_NAME validation**: 3-16 alphanumeric characters only
- Admin users stored in engine.admins Set
- Friendly fire broadcasts to all child processes via IPC
- Each bot gets unique name via BOT_NAME env var
- PID tracking in `/tmp/pvp-bot-pids.json`
- Max 100 bots per owner (configurable in multi.js)

## Testing Commands

```bash
# Test bot startup
node cli.js

# Test with proxy
USE_PROXY=true node cli.js

# Test specific command
!test   # Verify chat working
!status # Check health/position
!pvp    # Toggle combat mode
!ff     # Toggle friendly fire
!guard  # Start guarding
!squad  # Spawn 5 bots
!army   # Spawn 10 bots
```

## Known Issues

- Free SOCKS proxies get detected/routed by Aternos - consider paid residential proxies
- Some proxies fail immediately (ECONNRESET) - system auto-retries with next proxy
- CONFIG.json host should NOT include port number
- IPC messages require child processes to be spawned with `detached: true`
- Aternos server sees home IP regardless of proxy (server-side limitation)