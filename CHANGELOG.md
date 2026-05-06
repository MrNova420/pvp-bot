# PvP Bot - Complete Changelog

## Project Overview
Minecraft PvP bot using Mineflayer 4.20.1 + BetterBender 2.0 engine with advanced combat features.

---

## Version History

### v2.0 - Critical Fixes (2026-05-06)
**Status**: Current - All fixes applied and committed

#### Critical Fixes Applied (7 Total)

##### Fix #1: Mode Mismatch (CRITICAL)
**Problem**: a1-bot addon name is "a1-bot" but config mode.current was "pvp" - auto-enable check failed
- Check `'a1-bot' === 'pvp'` = FALSE
- Result: addon initialized but NEVER auto-enabled

**Solution**: Added special case in engine.js line 676
```javascript
// Old:
if (name === this.currentMode && addon.enable)

// New:
if ((name === this.currentMode || (this.currentMode === 'pvp' && name === 'a1-bot')) && addon.enable)
```

**Location**: src/engine.js:676-681

##### Fix #2: Dual Chat Listeners (HIGH)
**Problem**: TWO chat listeners processing commands
- engine.js:610 - calls commandHandler.handleMessage()
- a1-bot.js:374 - processes commands directly

**Solution**: 
- Removed chat listener from a1-bot.js (lines 374-403)
- All commands now processed by CommandHandler only

**Location**: addons/a1-bot.js:372-403 (removed)

##### Fix #3: Duplicate !pvp (MEDIUM)
**Problem**: !pvp handled in TWO places
- Line 393: this.setMode('combat')
- Line ~1612: this.enable()/disable()

**Solution**: Single command path now via CommandHandler

**Location**: addons/a1-bot.js:1612 (_handleChat removed)

##### Fix #4: Chat Listener Ignored enabled Flag (MEDIUM)
**Problem**: a1-bot chat listener didn't check this.enabled

**Solution**: Removed listener entirely (commands now in CommandHandler)

**Location**: addons/a1-bot.js (chat listener removed)

##### Fix #5: Proxy Infinite Recursion (HIGH)
**Problem**: _connectWithProxy() recursively retried forever on failure

**Solution**: Added retry limit with exponential backoff
```javascript
this.proxyRetryCount = 0;
this.proxyMaxRetries = 10;
const backoffMs = Math.min(3000 * Math.pow(2, this.proxyRetryCount), 30000);
```

**Location**: src/engine.js:500-510

##### Fix #6: BOT_NAME Validation (LOW)
**Problem**: No validation of BOT_NAME env var

**Solution**: Added regex validation
```javascript
const validNameRegex = /^[a-zA-Z0-9_]{3,16}$/;
if (!validNameRegex.test(botName)) { /* use random name */ }
```

**Location**: src/engine.js:301-310

##### Fix #7: Dead Code Cleanup (LOW)
**Problem**: _handleChat method unused after chat listener removal

**Solution**: Removed entire _handleChat method (~160 lines)

**Location**: addons/a1-bot.js:1565-1723 (removed)

---

## Command System

### All Commands (29 Total)

#### Core Commands (17) - Built into CommandHandler
| # | Command | Usage | Description |
|---|--------|-------|-------------|
| 1 | `!help` | `!help [cmd]` | Show all commands or help |
| 2 | `!mode` | `!mode <afk|player>` | Switch bot mode |
| 3 | `!status` | `!status` | Health, food, position |
| 4 | `!come` | `!come` | Come to you |
| 5 | `!follow` | `!follow [player]` | Follow player |
| 6 | `!stop` | `!stop` | Stop action |
| 7 | `!mine` | `!mine <block>` | Mine block |
| 8 | `!build` | `!build <house|tower|wall>` | Build structure |
| 9 | `!giveitem` | `!giveitem <item> [amt] [player]` | Give items |
| 10 | `!inv` | `!inv` | Inventory summary |
| 11 | `!craft` | `!craft <item> [amt]` | Craft item |
| 12 | `!progress` | `!progress` | MC progression |
| 13 | `!mood` | `!mood` | AI mood |
| 14 | `!home` | `!home` | Go home |
| 15 | `!sleep` | `!sleep` | Sleep in bed |
| 16 | `!give` | `!give <amt> <player>` | Spawn bots |
| 17 | `!admin` | `!admin <player>` | Add admin |

#### A1-Bot Commands (12) - Added from a1-bot.js
| # | Command | Usage | Description |
|---|--------|-------|-------------|
| 18 | `!stay` | `!stay` | Set mode to idle |
| 19 | `!pvp` | `!pvp` | Toggle PvP mode |
| 20 | `!kill` | `!kill` | Set combat mode |
| 21 | `!crystal` | `!crystal` | Set crystal mode |
| 22 | `!pvm` | `!pvm` | Player vs Mob |
| 23 | `!pve` | `!pve` | Player vs Entity |
| 24 | `!attack` | `!attack` | Toggle auto attack |
| 25 | `!test` | `!test` | Test bot |
| 26 | `!ff` | `!ff` | Toggle friendly fire |
| 27 | `!guard` | `!guard [player]` | Toggle guard |
| 28 | `!squad` | `!squad` | Spawn 5 bots |
| 29 | `!army` | `!army` | Spawn 10 bots |

---

## Addon System

### All Addons (10 Total)

#### Enabled by Default (7)
| Addon | File | Lines | Status | Description |
|-------|------|-------|--------|-------------|
| a1-bot | addons/a1-bot.js | 1871 | ✅ | Main PvP/combat - MERGED from 5 files |
| super-pathfinder | addons/super-pathfinder.js | 57 | ✅ | Navigation - MERGED from 3 files |
| player | addons/player.js | - | ✅ | AI behavior |
| player-basic | addons/player-basic.js | - | ✅ | Basic movement |
| mining | addons/mining.js | - | ✅ | Auto-mine |
| building | addons/building.js | - | ✅ | Auto-build |
| crafting | addons/crafting.js | - | ✅ | Auto-craft |

#### Disabled by Default (3)
| Addon | File | Status | Description |
|-------|------|--------|-------------|
| afk | addons/afk.js | ❌ | AFK mode |
| trading | addons/trading.js | ❌ | Villager trade |
| player-interactions | addons/player-interactions.js | ❌ | Player chat |

#### Moved to archive/ (Redundant - Merged Into Others)
| Original File | Now In |
|-------------|-------|
| addons/archive/pvp.js | addons/a1-bot.js |
| addons/archive/pathfinding.js | addons/super-pathfinder.js |
| addons/archive/soldier.js | addons/a1-bot.js |
| addons/archive/ultimate-a1.js | addons/a1-bot.js |
| addons/archive/pvp.js.backup | addons/a1-bot.js |

---

## File Structure

### Source Files (src/)
| File | Lines | Purpose |
|------|------|---------|
| src/engine.js | 1021 | Main bot engine |
| src/cli.js | - | CLI menu |
| src/multi.js | - | Multi-bot spawning |
| src/core/commandHandler.js | 540 | All commands |
| src/core/logger.js | - | Logging |
| src/core/safety.js | - | Safety monitor |
| src/core/taskManager.js | - | Task management |
| src/core/stateManager.js | - | State persistence |
| src/core/activityTracker.js | - | Activity logging |

### Configuration
| File | Purpose |
|------|---------|
| CONFIG.json | Main config (server, auth, addons, pvpMode) |

---

## Combat System

### Features
- **Reaction Time**: 50-200ms human-like delay
- **Target Prediction**: Uses velocity + acceleration
- **Smart Selection**: Health, armor, weapon, distance

### Combat Techniques
1. **W-Tap**: Release forward, re-press for knockback
2. **Strafing**: Circle around target
3. **Critical Hits**: Jump before attacking
4. **Knockback Reduction**: Sprint reset after hits
5. **Bunny Hop**: Jump on landing

### Tactical Modes
| Mode | Description |
|------|-------------|
| combat | Standard PvP |
| crystal | Crystal PvP |
| pvm | Player vs Mob |
| pve | Player vs Entity |
| idle | No combat |

---

## Proxy System

### How It Works
1. **Home IP Detection**: Queries ipify.org on startup
2. **Proxy Fetching**: Gets SOCKS5 from 20+ sources
3. **Connection**: Uses socks-proxy-agent
4. **Verification**: Checks socket IP ≠ home IP
5. **Monitoring**: 10s interval for leaks
6. **Retry**: 10 max with exponential backoff

### Usage
```bash
USE_PROXY=true node cli.js
```

---

## Admin System

### Permissions Matrix
| Role | Status | Commands |
|------|--------|----------|
| Owner | Full | All 29 commands |
| Admin | Limited | give, squad, army, admin |
| Player | None | Watch only |

### Implementation
- Stored in engine.admins Set
- Owner: Super_nova94332 (config)
- IPC broadcasts settings to children

---

## Configuration Reference

### CONFIG.json Structure
```json
{
  "server": { "host", "port", "version" },
  "auth": { "type", "username" },
  "mode": { "current": "pvp", "autoSwitch" },
  "friendlyFire": { "enabled" },
  "pvpMode": {
    "enabled", "autoAttack", "attackRange", "cps",
    "enableCrits", "enableStrafe", "enableWTap", "enableAntiKB",
    "enableWeaponSwitch", "autoHeal", "healThreshold"
  },
  "addons": {
    "a1-bot": true, "super-pathfinder": true,
    "player": true, "player-basic": true,
    "mining": true, "building": true, "crafting": true
  },
  "owner": { "username" }
}
```

---

## Testing Commands

```bash
# Start bot
node cli.js

# With proxy
USE_PROXY=true node cli.js

# In-game
!test        # Verify chat
!status     # Check status
!pvp        # Toggle PvP
!attack     # Toggle auto attack
!ff         # Toggle friendly fire
!guard      # Start guarding
!squad      # Spawn 5 bots
!army       # Spawn 10 bots
```

---

## Known Issues (Pre-Fix)

### Fixed Issues
- ❌ Mode mismatch - ✅ FIXED
- ❌ Dual chat listeners - ✅ FIXED  
- ❌ Duplicate !pvp - ✅ FIXED
- ❌ Proxy recursion - ✅ FIXED
- ❌ BOT_NAME validation - ✅ FIXED

### Known Limitations
- Free SOCKS proxies detected by Aternos
- Some proxies fail with ECONNRESET
- Aternos sees home IP regardless of proxy

---

## Version Information

| Component | Version |
|-----------|---------|
| Engine | BetterBender 2.0 |
| Mineflayer | 4.20.1 |
| Protocol | 1.20.1 |
| Node.js | 18+ |

---

## Credits

- **BetterBender Engine**: MrNova420
- **PvP System**: Merged from 5 files
- **Pathfinding**: Merged from 3 files

---

**End of Changelog**
*Last updated: 2026-05-06*
*All fixes applied and committed*