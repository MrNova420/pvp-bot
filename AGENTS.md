# PvP Bot - Agent Guidance

## Project Overview
- Minecraft PvP bot using Mineflayer 4.25.0 + BetterBender engine
- Combat features: auto-attack, W-tap, strafing, crits, healing
- Toggled via `!pvp` chat command from owner/admins
- Enhanced proxy support (SOCKS5 only) to avoid Aternos throttling
- Rage-bait goofy gaming names (random generation)
- Smart AI with reaction time, prediction, tactical modes

## Key Files
- Engine: `src/engine.js` (admin tracking, IPC handler, bot management)
- PvP Addon: `addons/pvp.js` (combat AI, tactics, friendly fire)
- Command Handler: `src/core/commandHandler.js` (all chat commands)
- Proxy Manager: `src/utils/proxyManager.js`
- Proxy Sources: `src/utils/proxySources.js` (20+ sources, SOCKS only)
- Config: `CONFIG.json`

## Commands
All commands use `!` prefix. See `COMMANDS.md` for full reference.

**Owner/Admin Only:**
- `!admin <player>` - Add admin user
- `!pvp` - Toggle PvP mode
- `!ff` - Toggle friendly fire
- `!guard [player]` - Guard/protect player
- `!squad` - Spawn 5-bot squad
- `!army [count]` - Spawn 100+ bots
- `!give <amount> <player>` - Give bots to player (they follow/protect)

**Everyone:**
- `!help [cmd]` - Show commands
- `!status` - Bot status
- `!come` - Come to you
- `!follow [player]` - Follow player
- `!stop` - Stop action
- `!inv` - Inventory
- `!give <item> [amt] [player]` - Give items
- `!craft <item> [amt]` - Craft item
- `!mine <block>` - Mine block
- `!build <type>` - Build structure
- `!home` - Go home
- `!sleep` - Sleep
- `!mode <afk|player>` - Switch mode
- `!progress` - Show progression
- `!mood` - Show AI status

## How It Works
1. Start with `USE_PROXY=true node cli.js`
2. On startup: auto-detects home IP via ipify/ifconfig.me
3. On connect: uses **random bot name** from pool (fresh identity)
4. Fetches SOCKS5 proxies → attempts connection via socks-proxy-agent
5. Sets `HTTP_PROXY`/`HTTPS_PROXY` for ALL http/https traffic
6. On login: verifies socket IP, **BLOCKS** if matches home IP
7. On 10s interval: checks IP, **kills** if leaks to home IP
8. On kick/IP issue: preserve proxy mode for reconnect

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
- **Friendly fire propagation** - toggles to all squad/army bots
- **Give bots** - spawn bots that follow/protect a player

## Development Notes
- node_modules is committed - do NOT gitignore
- Package versions locked via package-lock.json
- Proxy feature logs "Connection IP:" after login to verify routing
- Command handler in `src/core/commandHandler.js` handles ALL commands
- PvP addon registers its commands with main handler
- Admin users stored in engine.admins Set
- Friendly fire broadcasts to all child processes via IPC

## Known Issues
- Free SOCKS proxies get detected/routed by Aternos - consider paid residential proxies for full anonymity
- Some proxies fail immediately (ECONNRESET) - system auto-retries with next proxy
- CONFIG.json host should NOT include port number
- Command handler must check admin rights for restricted commands
- IPC messages require child processes to be spawned with `detached: true`
