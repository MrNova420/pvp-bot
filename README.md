# PvP Bot - BetterBender Edition

A powerful Minecraft PvP bot built on the BetterBender engine with advanced combat features.

## Features

### Core Features
- ⚔️ **Advanced PvP Combat** - Auto-attack, W-tap, smart strafing, critical hits (80-100% consistency)
- 🛡️ **Intelligent Defense** - Auto-shield, emergency walling, water bucket fall negation
- 🎯 **Smart Targeting** - Priority targeting, threat assessment, enemy behavior prediction
- 🧠 **Advanced Movement** - Sprint auto-jumping, sprint-reset, long-sprint optimization
- 🛠️ **Inventory Management** - Hotbar optimization, food prioritization, automatic weapon switching
- 🍖 **Auto-Heal** - Smart healing with food value prioritization
- 🔄 **Auto-Reconnect** - Stays connected 24/7
- 🎮 **CLI Menu** - Easy management system
- 👥 **Follow & Protect** - Passive following and active protection

### Advanced Features
- 🎯 **Reaction Time** - Human-like delay (50-200ms) for natural combat
- 📡 **Target Prediction** - Uses velocity + acceleration for position prediction
- 🎮 **Tactical Modes** - aggressive, defensive, hitAndRun, surround, flank
- 👥 **Multi-Bot** - Spawn up to 100 bots with gaming names
- 🛡️ **Proxy System** - SOCKS5 support with IP leak detection
- 🔒 **Admin System** - Owner + admin permissions

### What to Expect

#### Bot Startup
1. **Name**: Random gaming name (ProRager, XxTryHardxx, ShadowStrike, etc.)
2. **Connection**: Direct or via proxy (USE_PROXY=true)
3. **Initialization**: Auto-loads addons from CONFIG.json
4. **Auto-enable**: a1-bot enables when mode is 'pvp'

#### Combat Behavior
- **Auto-attack** targets within 4 blocks
- **Smart selection** by health, armor, weapon
- **Techniques**: W-tap, strafing, critical hits
- **Reaction delay**: 50-200ms (not instant)

#### Protection Features
- **Friendly fire toggle**: `!ff`
- **Guard mode**: `!guard [player]`
- **Squad spawning**: 5 bots
- **Army spawning**: 10 bots

---

## Quick Start

### Installation
```bash
# Dependencies are committed - should work out of the box
cd /home/mrnova420/pvp-bot

# Install if needed
npm install
```

### Running
```bash
# With CLI menu
node cli.js

# Direct start
node src/engine.js

# With proxy (recommended for Aternos)
USE_PROXY=true node cli.js
```

### In-Game Commands

#### Basic (Everyone)
| Command | Description |
|---------|-------------|
| `!help` | Show all commands |
| `!help [cmd]` | Help for specific command |
| `!status` | Bot status (health, food, position) |
| `!inv` | Inventory summary |
| `!progress` | Minecraft progression |
| `!mood` | AI mood/energy |

#### Movement (Everyone)
| Command | Description |
|---------|-------------|
| `!come` | Come to you |
| `!follow [player]` | Follow player |
| `!stop` | Stop current action |
| `!home` | Go home |
| `!sleep` | Sleep in bed |

#### PvP (Owner/Admin)
| Command | Description |
|---------|-------------|
| `!pvp` | Toggle PvP mode |
| `!attack` | Toggle auto-attack |
| `!ff` | Toggle friendly fire |
| `!guard [player]` | Guard player |
| `!squad` | Spawn 5 bots |
| `!army` | Spawn 10 bots |

#### World (Owner/Admin)
| Command | Description |
|---------|-------------|
| `!mine <block>` | Mine block |
| `!build <type>` | Build structure |
| `!craft <item>` | Craft item |
| `!giveitem <item> [amt] [player]` | Give items |

#### Admin (Owner Only)
| Command | Description |
|---------|-------------|
| `!admin <player>` | Add admin |
| `!give <amt> <player>` | Spawn bots for player |

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
  "friendlyFire": {
    "enabled": false,
    "description": "If false, won't target owner"
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
    "enableWeaponSwitch": true,
    "autoHeal": true,
    "healThreshold": 10
  },
  "addons": {
    "a1-bot": true,
    "super-pathfinder": true,
    "player": true,
    "player-basic": true,
    "mining": true,
    "building": true,
    "crafting": true
  },
  "owner": {
    "username": "Super_nova94332"
  }
}
```

### PvP Settings
| Setting | Description | Default |
|---------|-------------|---------|
| `attackRange` | Attack distance (blocks) | 4 |
| `cps` | Clicks per second | 8 |
| `enableCrits` | Critical hit system | true |
| `enableStrafe` | Smart strafing | true |
| `enableWTap` | W-tap knockback | true |
| `enableAntiKB` | Anti-knockback | true |
| `enableWeaponSwitch` | Auto weapon swap | true |
| `autoHeal` | Auto eat food | true |
| `healThreshold` | HP to auto-eat | 10 |
| `friendlyFire` | Allow targeting owner | false |

---

## Advanced Combat Features

### Combat System
- **Critical Hits**: Jump before attack (80-100% rate)
- **W-Tap**: Release forward for knockback
- **Strafing**: Circle around target
- **Knockback Reduction**: Sprint reset
- **Weapon Switching**: Axe vs shields

### Movement System
- **Bunny Hop**: Jump on landing
- **Sprint Reset**: Between hits
- **Momentum Conservation**: Speed maintenance
- **Smart Pathfinding**: Navigation

### Targeting
- **Health Priority**: Lower = better target
- **Armor Consideration**: More armor = harder
- **Weapon Threat**: Dangerous weapons = priority
- **Distance**: Closer = attack
- **Prediction**: Velocity + acceleration

### Defensive Systems
- **Auto-Shield**: When taking damage
- **Emergency Walling**: Low health
- **Water Bucket**: Fall negation
- **Retreat**: When outnumbered
- **Hazard Avoidance**: Lava, void

---

## Addons System

### Enabled Addons (7)
| Addon | File | Purpose |
|------|------|---------|
| a1-bot | addons/a1-bot.js | PvP combat |
| super-pathfinder | addons/super-pathfinder.js | Navigation |
| player | addons/player.js | AI behavior |
| player-basic | addons/player-basic.js | Basic movement |
| mining | addons/mining.js | Auto-mine |
| building | addons/building.js | Auto-build |
| crafting | addons/crafting.js | Auto-craft |

### Disabled Addons (3)
| Addon | File | Purpose |
|------|------|---------|
| afk | addons/afk.js | AFK mode |
| trading | addons/trading.js | Villager trade |
| player-interactions | addons/player-interactions.js | Player chat |

### Archive (Merged Into Others)
| File | Now In |
|------|--------|
| pvp.js | a1-bot.js |
| pathfinding.js | super-pathfinder.js |
| soldier.js | a1-bot.js |
| ultimate-a1.js | a1-bot.js |

---

## Proxy System

### How It Works
1. **Home IP Detection**: Queries ipify.org on startup
2. **Proxy Fetching**: Gets SOCKS5 from 20+ sources
3. **Connection**: Uses socks-proxy-agent
4. **Verification**: Checks socket IP ≠ home IP
5. **Monitoring**: 10s interval checks for leaks

### Usage
```bash
USE_PROXY=true node cli.js
```

### Features
- Auto-detects home IP
- SOCKS5 only (no HTTP)
- Blocks if IP matches home
- 10-second monitoring
- Retry with backoff (10 max)

---

## Admin System

### Permissions
| Role | Status | Commands |
|------|--------|----------|
| Owner | Full | All 29 |
| Admin | Limited | give, squad, army, admin |
| Player | None | Watch only |

### Commands
```bash
!admin <player>  # Add admin
!admin           # List admins
```

---

## Critical Fixes Applied (2026-05-06)

### Fixes Made
1. **Mode Mismatch** - engine.js now auto-enables a1-bot when mode is 'pvp'
2. **Dual Chat Listeners** - Removed a1-bot.js chat listener, all via CommandHandler
3. **Duplicate !pvp** - Single path now
4. **Proxy Recursion** - Added 10 retry limit with exponential backoff
5. **BOT_NAME Validation** - Validates 3-16 alphanumeric chars
6. **Dead Code** - Removed unused _handleChat method

---

## Troubleshooting

### Bot Won't Start
- Check CONFIG.json syntax
- Verify server is online
- Check logs: `data/logs/`

### Proxy Issues
- Aternos detects free proxies (known)
- Try: Paid residential proxy
- Check: `USE_PROXY=true`

### Commands Not Working
- Verify you're owner or admin
- Use `!help` to see available

### Bots Not Following
- Check friendly fire: `!ff`
- Verify target player online

---

## Requirements

- Node.js 18+
- Minecraft Java Edition server (offline mode)
- Mineflayer 4.20.1

---

## Credits

- **BetterBender Engine** by MrNova420
- **PvP System**: Merged from 5 files (a1-bot, ultimate-a1, soldier, pvp)
- **Pathfinding**: Merged from 3 files (super-pathfinder, advanced-pathfinder, pathfinding)

---

## Version

- **Engine**: BetterBender 2.0
- **Mineflayer**: 4.20.1
- **Protocol**: 1.20.1
- **Last Updated**: 2026-05-06

---

## License

MIT