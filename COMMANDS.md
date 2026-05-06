# PvP Bot - Command Reference

## Overview
All commands use `!` prefix. Commands are processed by the single **CommandHandler** (`src/core/commandHandler.js`) - this is the ONLY source of truth for command processing.

## Command History (Critical Fix Applied)

### Recent Fixes (2026-05-06)
- **REMOVED** duplicate chat listener from `addons/a1-bot.js`
- **ADDED** 12 new commands to CommandHandler: stay, pvp, kill, crystal, pvm, pve, attack, test, ff, guard, squad, army
- **ALL** commands now processed by CommandHandler (single source of truth)

## All Commands (29 total)

### Core Commands (17) - Built into CommandHandler:
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

### A1-Bot Commands (12) - Added from a1-bot.js:
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

## Admin Commands (Owner + Admins Only)

| Command | Usage | Description |
|----------|-------|-------------|
| `!admin` | `!admin <player>` | Add admin user |
| `!admin` | `!admin` | List all admins |
| `!give` | `!give <amount> <player>` | Give bots to player (they follow/protect) |
| `!giveitem` | `!giveitem <item> [amt] [player]` | Give items to player |

## World Interaction Commands

| Command | Usage | Description |
|----------|-------|-------------|
| `!mine` | `!mine <block>` | Mine specific block type |
| `!build` | `!build <house|tower|wall>` | Build a structure |
| `!craft` | `!craft <item> [amount>` | Craft an item |
| `!inv` | `!inv` | Show inventory summary |

## Information Commands

| Command | Usage | Description |
|----------|-------|-------------|
| `!progress` | `!progress` | Show Minecraft progression status |
| `!mood` | `!mood` | Show bot AI mood and energy level |
| `!status` | `!status` | Show bot status (health, food, position, mode) |

## PvP Combat Commands

| Command | Usage | Description |
|----------|-------|-------------|
| `!pvp` | `!pvp` | Toggle PvP combat mode |
| `!kill` | `!kill` | Set combat mode |
| `!crystal` | `!crystal` | Set crystal mode |
| `!pvm` | `!pvm` | Set Player vs Mob mode |
| `!pve` | `!pve` | Set Player vs Entity mode |
| `!attack` | `!attack` | Toggle auto attack |
| `!stay` | `!stay` | Set mode to idle |
| `!ff` | `!ff` | Toggle friendly fire |

## Protection Commands

| Command | Usage | Description |
|----------|-------|-------------|
| `!guard` | `!guard [player]` | Toggle guard mode - follows and attacks threats |
| `!squad` | `!squad` | Spawn 5-bot squad (owner + 4 bots) |
| `!army` | `!army` | Spawn 10-bot army |

## Multi-Bot Commands

| Command | Usage | Description |
|----------|-------|-------------|
| `!give` | `!give <amount> <player>` | Spawn bots for player (they follow/protect) |
| `!squad` | `!squad` | Spawn 5 bots with gaming names |
| `!army` | `!army` | Spawn 10 bots with gaming names |

## Command Permissions

- **Owner** (`Super_nova94332`): All commands
- **Admins**: Admin commands + give + giveitem + squad + army
- **Players**: None (can't use commands - security feature)

## Testing Commands

```bash
!test           - Verify chat and bot working
!status        - Check health, food, position
!pvp           - Toggle PvP mode
!attack        - Toggle auto attack
!ff            - Toggle friendly fire
!guard         - Start guarding yourself
!squad         - Spawn 5-bot squad
!army          - Spawn 10-bot army
!help          - Show all commands
```

## Chat Command Examples

```
!help           - Show all commands
!help pvp       - Show help for !pvp command
!status         - Check bot health and position
!pvp            - Toggle PvP mode
!attack         - Toggle auto attack
!ff             - Toggle friendly fire
!guard Steve    - Guard player Steve
!squad          - Spawn 5-bot squad
!army           - Spawn 10-bot army
!give 5 Steve   - Give 5 bots to Steve
!admin Alex     - Make Alex an admin
!come           - Make bot come to you
!follow Alex    - Follow player Alex
!mine diamond_ore - Mine diamond ore
!build house   - Build a house
!inv           - Check inventory
!craft diamond_sword - Craft diamond sword
!progress      - Check progression
!mood          - Check AI mood
```

## Architecture Notes

- **Single Source of Truth**: All commands processed by `src/core/commandHandler.js`
- **No Duplicate Listeners**: Removed chat listener from a1-bot.js (previously duplicated)
- **Command Registration**: New commands added via `this.registerCommand()` in `_registerDefaultCommands()`
- **Addon Integration**: Commands access addons via `this.engine.addons.get('a1-bot')`

## Tips

1. Use `!give 5 <player>` to spawn 5 bots that follow and protect a player
2. Use `!squad` for quick 5-bot squad with gaming names
3. Use `!army` for large 10-bot army
4. Use `!guard <player>` to have bot follow and protect a specific player
5. Use `!ff` to toggle friendly fire (prevents hitting owner)
6. Use `!pvp` to toggle PvP combat mode
7. Use `!attack` to toggle auto-attack
8. Max 100 bots per owner (configurable in `multi.js`)
9. All bot PIDs tracked in `/tmp/pvp-bot-pids.json` for proper cleanup