# PvP Bot - Command Reference

## Overview
All commands use `!` prefix. Commands are processed by the main command handler and PvP addon.

## Admin Commands
*Only owner and admins can use these*

| Command | Usage | Description |
|----------|-------|-------------|
| `!admin` | `!admin <player>` | Add admin user |
| `!admin` | `!admin` | List all admins |

## Bot Control Commands

| Command | Usage | Description |
|----------|-------|-------------|
| `!help` | `!help [command]` | Show all commands or specific help |
| `!status` | `!status` | Show bot status (health, food, position, mode) |
| `!mode` | `!mode <afk|player>` | Switch bot mode |
| `!come` | `!come` | Make bot come to you |
| `!follow` | `!follow [player]` | Follow a player |
| `!stop` | `!stop` | Stop current action |

## PvP Commands
*Only owner and admins can use these*

| Command | Usage | Description |
|----------|-------|-------------|
| `!pvp` | `!pvp` | Toggle PvP mode on/off |
| `!ff` | `!ff` | Toggle friendly fire |
| `!guard` | `!guard [player]` | Guard/protect a player |
| `!squad` | `!squad` | Spawn 5-bot squad (owner + 4 bots) |
| `!army` | `!army [count]` | Spawn 100+ bots with gaming names |

## Item Commands

| Command | Usage | Description |
|----------|-------|-------------|
| `!give` | `!give <item> [amount] [player]` | Give item to player |
| `!inv` | `!inv` | Show inventory summary |
| `!craft` | `!craft <item> [amount]` | Craft an item |

## World Interaction Commands

| Command | Usage | Description |
|----------|-------|-------------|
| `!mine` | `!mine <block>` | Mine specific block type |
| `!build` | `!build <house|tower|wall>` | Build a structure |
| `!home` | `!home` | Go home |
| `!sleep` | `!sleep` | Go to sleep |

## New Commands (Recently Added)

| Command | Usage | Description |
|----------|-------|-------------|
| `!give` | `!give <amount> <player>` | Give bots to player (they will follow/protect) |
| `!admin` | `!admin <player>` | Give admin access to another user |

## Chat Command Examples

```
!help           - Show all commands
!help pvp       - Show help for !pvp command
!status         - Check bot health and position
!pvp            - Toggle PvP mode
!ff             - Toggle friendly fire
!guard Super_nova94332  - Guard player
!squad          - Spawn 5-bot squad
!give 5 Steve   - Give 5 bots to Steve (they will follow/protect)
!admin Alex      - Make Alex an admin
!come           - Make bot come to you
!follow Alex     - Follow player Alex
!mine diamond_ore - Mine diamond ore
!build house     - Build a house
!inv            - Check inventory
!craft diamond_sword - Craft diamond sword
!home           - Go home
!sleep          - Sleep
```

## Command Permissions

- **Owner**: All commands
- **Admins**: PvP commands + give + admin
- **Players**: None (can't use commands)

## PvP Features

- **Rage-bait names**: Random goofy gaming names (ProRager, XxTryHardxx, etc.)
- **Smart combat**: Reaction time (50-200ms), prediction with velocity + acceleration
- **Tactical modes**: aggressive, defensive, hitAndRun, surround, flank
- **Advanced techniques**: W-tap, strafing, knockback, critical hits, bunny hop
- **Squad/Army**: Spawn multiple bots with gaming names
- **Friendly fire**: Toggle to prevent/allow hitting owner and friends

## Admin System

- Owner can add admins with `!admin <player>`
- Admins can use PvP commands and give bots to players
- Players can't use any commands (security)

## Tips

1. Use `!squad` instead of `!army` for controlled 5-bot groups
2. `!give 5 Steve` gives 5 bots that will follow and protect Steve
3. Friendly fire (`!ff`) affects all bots in squad/army
4. PvP mode uses advanced AI with smart target selection
5. Reaction time makes combat feel human-like (not instant)
