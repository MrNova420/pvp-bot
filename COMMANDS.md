# PvP Bot - Command Reference

## Overview
All commands use `!` prefix. Commands are processed by the main command handler (`src/core/commandHandler.js`) and individual addons.

## Admin Commands (Owner + Admins Only)
*Only the owner and admins can use these commands*

| Command | Usage | Description |
|----------|-------|-------------|
| `!admin` | `!admin <player>` | Add admin user |
| `!admin` | `!admin` | List all admins |
| `!pvp` | `!pvp` | Toggle PvP mode on/off |
| `!pvp` | `!pvp <mode>` | Set PvP mode (aggressive/defensive/hitAndRun/surround/flank) |
| `!tactical` | `!tactical <mode>` | Set tactical combat mode |
| `!give` | `!give <amount> <player>` | Give bots to player (they will follow/protect) |
| `!giveitem` | `!giveitem <item> [amount] [player]` | Give items to player |

## Bot Control Commands

| Command | Usage | Description |
|----------|-------|-------------|
| `!help` | `!help [command]` | Show all commands or specific help |
| `!status` | `!status` | Show bot status (health, food, position, mode) |
| `!mode` | `!mode <pvp|afk>` | Switch bot mode |
| `!come` | `!come` | Make bot come to you |
| `!follow` | `!follow [player]` | Follow a player |
| `!stop` | `!stop` | Stop current action |
| `!home` | `!home` | Go to saved home location |
| `!sleep` | `!sleep` | Sleep in bed |

## World Interaction Commands

| Command | Usage | Description |
|----------|-------|-------------|
| `!mine` | `!mine <block>` | Mine specific block type |
| `!build` | `!build <house|tower|wall>` | Build a structure |
| `!craft` | `!craft <item> [amount]` | Craft an item |
| `!inv` | `!inv` | Show inventory summary |

## Information Commands

| Command | Usage | Description |
|----------|-------|-------------|
| `!progress` | `!progress` | Show Minecraft progression status |
| `!mood` | `!mood` | Show bot AI mood and energy level |

## PvP Features
- **Rage-bait names**: Random goofy gaming names (ProRager, XxTryHardxx, etc.)
- **Smart combat**: Reaction time (50-200ms), prediction with velocity + acceleration
- **Tactical modes**: aggressive, defensive, hitAndRun, surround, flank
- **Advanced techniques**: W-tap, strafing, knockback, critical hits, bunny hop
- **Multi-bot**: Spawn up to 100 bots with gaming names via `!give`
- **Friendly fire**: Toggle to prevent/allow hitting owner and friends

## Command Permissions

- **Owner** (`Super_nova94332`): All commands
- **Admins**: Admin commands + give + giveitem
- **Players**: None (can't use commands - security feature)

## Chat Command Examples

```
!help           - Show all commands
!help pvp       - Show help for !pvp command
!status         - Check bot health and position
!pvp            - Toggle PvP mode
!pvp aggressive - Set aggressive tactical mode
!tactical defensive - Set defensive mode
!give 5 Steve   - Give 5 bots to Steve (they will follow/protect)
!giveitem diamond_sword 1 Steve - Give diamond sword to Steve
!admin Alex      - Make Alex an admin
!come           - Make bot come to you
!follow Alex     - Follow player Alex
!mine diamond_ore - Mine diamond ore
!build house     - Build a house
!inv            - Check inventory
!craft diamond_sword - Craft diamond sword
!home           - Go home
!sleep          - Sleep
!progress       - Check progression
!mood           - Check AI mood
```

## Addon Command Registration
- Main commands: Registered in `src/core/commandHandler.js`
- PvP commands: Registered by `addons/pvp.js` (if enabled)
- All addons can register commands via `engine.commandHandler.registerCommand()`

## Tips
1. Use `!give 5 <player>` to spawn 5 bots that follow and protect a player
2. `!pvp aggressive` for all-out attack mode
3. `!pvp defensive` for safe play with auto-retreat
4. Reaction time makes combat feel human-like (not instant)
5. Tactical modes affect strafe patterns and engagement distance
6. Enable/disable addons in CONFIG.json `addons` section
7. Max 100 bots per owner (configurable in `multi.js`)
8. All bot PIDs tracked in `/tmp/pvp-bot-pids.json` for proper cleanup
