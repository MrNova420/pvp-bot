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

## Key Files
- Engine: `src/engine.js` (admin tracking, IPC handler, bot management, addon loader)
- PvP Addon: `addons/pvp.js` (combat AI, tactics, friendly fire)
- Command Handler: `src/core/commandHandler.js` (all chat commands)
- Proxy Manager: `src/utils/proxyManager.js`
- Proxy Sources: `src/utils/proxySources.js` (20+ sources, SOCKS only)
- Config: `CONFIG.json` (server, auth, addons, combat settings)

## All Addons/Plugins (10 total)

### Enabled by Default in CONFIG.json:
| Addon | File | Status | Description |
|-------|------|--------|-------------|
| pvp | `addons/pvp.js` | ✅ Enabled | Main PvP combat system with AI, tactics, prediction |
| player | `addons/player.js` | ✅ Enabled | Player behavior, AI decisions, mood system |
| player-basic | `addons/player-basic.js` | ✅ Enabled | Basic player movements and actions |
| pathfinding | `addons/pathfinding.js` | ✅ Enabled | Navigation, follow, come-to-player |
| mining | `addons/mining.js` | ✅ Enabled | Mine blocks, !mine command |
| building | `addons/building.js` | ✅ Enabled | Build structures, !build command |
| crafting | `addons/crafting.js` | ✅ Enabled | Craft items, !craft command |

### Disabled by Default:
| Addon | File | Status | Description |
|-------|------|--------|-------------|
| afk | `addons/afk.js` | ❌ Disabled | AFK mode, idle behavior |
| trading | `addons/trading.js` | ❌ Disabled | Trade with villagers |
| superPathfinder | `addons/super-pathfinder.js` | ❌ Disabled | Advanced pathfinding (not implemented) |
| player-interactions | `addons/player-interactions.js` | ❌ Disabled | Handle player chat requests |
| soldier | `addons/soldier.js` | ❌ Disabled | Squad behavior, military formations |
| a1-bot | `addons/a1-bot.js` | ❌ Disabled | Simple follow bot |
| ultimate-a1 | `addons/ultimate-a1.js` | ❌ Disabled | Enhanced A1 bot with more features |

## Commands (18 total)
All commands use `!` prefix. See `COMMANDS.md` for full reference.

**Owner/Admin Only:**
- `!admin <player>` - Add admin user
- `!admin` - List all admins
- `!pvp` - Toggle PvP mode
- `!tactical <mode>` - Set tactical mode (aggressive/defensive/hitAndRun/surround/flank)
- `!give <amount> <player>` - Give bots to player (they follow/protect)
- `!giveitem <item> [amt] [player]` - Give items to player

**Everyone:**
- `!help [cmd]` - Show commands
- `!status` - Bot status (health, food, position, mode)
- `!come` - Come to you
- `!follow [player]` - Follow player
- `!stop` - Stop action
- `!inv` - Inventory summary
- `!craft <item> [amt]` - Craft item
- `!mine <block>` - Mine block type
- `!build <type>` - Build structure (house/tower/wall)
- `!home` - Go home
- `!sleep` - Sleep in bed
- `!mode <pvp|afk>` - Switch mode
- `!progress` - Show Minecraft progression
- `!mood` - Show AI mood and status

## How It Works
1. Start with `node cli.js` or `USE_PROXY=true node cli.js`
2. On startup: auto-detects home IP via ipify/ifconfig.me
3. On connect: uses **random bot name** from pool (fresh identity)
4. Fetches SOCKS5 proxies → attempts connection via socks-proxy-agent
5. Sets `HTTP_PROXY`/`HTTPS_PROXY` for ALL http/https traffic
6. On login: verifies socket IP, **BLOCKS** if matches home IP
7. On 10s interval: checks IP, **kills** if leaks to home IP
8. On kick/IP issue: preserve proxy mode for reconnect
9. Addons auto-load based on CONFIG.json `addons` section

## Proxy System (What Was Done)
- **Problem**: Aternos detects and blocks free SOCKS proxies via IP database
- **Solution**: Use socks-proxy-agent for proper SOCKS5 support (not mineflayer native)
- **Home IP Detection**: Auto-detects via ipify.org/ifconfig.me at startup
- **Strict Blocking**: Rejects connection if socket IP = home IP (68.50.101.6)
- **Monitoring**: 10-second interval checks for IP leaks, kills bot if detected
- **Proxy Sources**: 20+ SOCKS4/SOCKS5 proxy list URLs in `proxySources.js`
- **Validation**: Tests proxies before use via `proxyValidator.js`
- **Limitation**: Free proxies get detected by Aternos - consider paid residential proxies

## Features
- **Auto-detects home IP** - queries ipify/ifconfig.me at startup
- **Random bot names** - rage-bait goofy names (ProRager, XxTryHardxx, etc.)
- **Global proxy env** - sets HTTP_PROXY/HTTPS_PROXY for all traffic
- **Strict blocking** - rejects connection if socket IP = home IP
- **Aggressive monitoring** - 10s interval kills if IP leaks
- **Future-proof** - no hardcoded IPs
- **Reaction time** - human-like delay (50-200ms)
- **Smart prediction** - uses velocity + acceleration
- **Tactical modes** - aggressive, defensive, hitAndRun, surround, flank
- **Admin system** - owner can add admins, admins can control bots
- **Friendly fire propagation** - toggles to all squad/army bots via IPC
- **Give bots** - spawn bots that follow/protect a player
- **Multi-bot spawning** - up to 100 bots per owner
- **Addon system** - enable/disable addons via CONFIG.json
- **ClI logging** - full debug/warning/error logs when started

## Development Notes
- node_modules is committed - do NOT gitignore
- Package versions locked via package-lock.json
- Proxy feature logs "Connection IP:" after login to verify routing
- Command handler in `src/core/commandHandler.js` handles ALL commands
- PvP addon registers its commands with main handler
- Admin users stored in engine.admins Set
- Friendly fire broadcasts to all child processes via IPC
- Each bot gets unique name via BOT_NAME env var (no CONFIG.json overwriting)
- PID tracking in `/tmp/pvp-bot-pids.json` for proper cleanup
- Max bots per owner: 100 (configurable in multi.js)

## Known Issues
- Free SOCKS proxies get detected/routed by Aternos - consider paid residential proxies for full anonymity
- Some proxies fail immediately (ECONNRESET) - system auto-retries with next proxy
- CONFIG.json host should NOT include port number
- Command handler must check admin rights for restricted commands
- IPC messages require child processes to be spawned with `detached: true`
- Aternos server sees home IP regardless of proxy (server-side limitation)
