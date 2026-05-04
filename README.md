# PvP Bot - BetterBender Edition

A powerful Minecraft PvP bot built on the BetterBender engine with advanced combat features.

## Features

- ⚔️ **Advanced PvP Combat Mode** - Auto-attack, W-tap, smart strafing, critical hits (80-100% consistency)
- 🛡️ **Intelligent Defense** - Auto-shield, emergency walling, water bucket fall negation
- 🎯 **Smart Targeting** - Priority targeting, threat assessment, enemy behavior prediction
- 🧠 **Advanced Movement** - Sprint auto-jumping, sprint-reset, long-sprint optimization, momentum conservation
- 🛠️ **Inventory Management** - Hotbar optimization, food prioritization, automatic weapon switching
- 🍖 **Auto-Heal** - Smart healing with food value prioritization
- 🔄 **Auto-Reconnect** - Stays connected 24/7
- 🎮 **CLI Menu** - Easy management system
- 👥 **Follow & Protect** - Passive following and active protection of owner from players/mobs

## Quick Start

```bash
# Install dependencies (if needed - committed node_modules work)
npm install

# Run with CLI menu
node cli.js

# Or run directly
node src/engine.js
```

## Configuration

Edit `CONFIG.json` to customize:

```json
{
  "server": {
    "host": "your.server.ip",
    "port": 25565,
    "version": "1.20.1"
  },
  "auth": {
    "type": "offline",
    "username": "YourBotName"
  },
  "owner": {
    "username": "YourUsername"
  },
  "friendlyFire": {
    "enabled": false,
    "description": "If false, bot will not target the owner in PvP mode"
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
    "autoHeal": true,
    "healThreshold": 10
  }
}
```

## In-Game Commands

| Command | Description |
|---------|-------------|
| `!pvp` | Toggle PvP mode on/off |
| `!ff` | Toggle friendly fire (owner targeting) |
| `!follow [player]` | Passively follow owner or specified player |
| `!protect [player]` | Follow and protect owner/player from threats |
| `!status` | Show bot status |
| `!mode afk` | Switch to AFK mode |
| `!mode pvp` | Switch to PvP mode |

## PvP Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `attackRange` | Attack distance (blocks) | 4 |
| `cps` | Clicks per second | 8 |
| `enableCrits` | Critical hit system (advanced) | true |
| `enableStrafe` | Smart strafing patterns | true |
| `enableWTap` | W-tap technique for knockback | true |
| `enableAntiKB` | Anti-knockback measures | true |
| `healThreshold` | HP to auto-eat | 10 |
| `friendlyFire` | Allow targeting owner | false |

## Advanced PvP Features

When enabled in CONFIG.json:

**Combat System:**
- 80-100% critical hit rate (packet/hop/reactive modes)
- Intelligent shield detection & countering
- Weapon switching to axe vs shielded opponents
- Tactical movement with multiple strafing patterns
- Sprint-tapping for knockback manipulation
- Precision targeting with movement prediction

**Movement System:**
- Sprint auto-jumping (bunny hopping) for maintained momentum
- Sprint-reset between hits for increased knockback
- Long-sprint preservation during actions
- Obstacle avoidance and terrain exploitation
- Edge-hugging and corner-cutting movement

**Defensive Systems:**
- Auto-shield when taking burst damage
- Emergency walling when low health
- Water bucket usage for fall negation
- Strategic retreat when outnumbered
- Environmental hazard avoidance (lava, void)

**Inventory Management:**
- Hotbar optimization (best weapon/food ready)
- Food prioritization by saturation value
- Automatic weapon switching (sword/axe)
- Potion automation (speed, strength, healing)
- Golden apple/potion usage for emergencies

**Follow & Protect Modes:**
- `!follow` - Passively follows owner (or specified player)
- `!protect` - Follows and attacks any entity that harms the followed player
- Protect mode handles both players and hostile mobs
- Uses pathfinding for intelligent pursuit

## Addons

The bot supports multiple addons. Enable/disable in CONFIG:

- **pvp** - Advanced combat mode (default)
- **afk** - AFK mode with human-like movements
- **player** - Full player simulation
- **pathfinding** - Navigation with block placement/breaking
- **building** - Auto-build structures
- **mining** - Auto-mine resources
- **crafting** - Auto-craft items

## CLI Menu Options

1. Start Bot
2. Stop Bot  
3. View Status
4. Configuration
5. Exit

## Requirements

- Node.js 18+
- Minecraft Java Edition server (offline mode)
- Compatible with Mineflayer 4.x

## Credits

- BetterBender engine by MrNova420
- Advanced PvP system integrating @nxg-org/mineflayer-custom-pvp and mineflayer-movement
- Original PvP combat system custom implementation

## License

MIT