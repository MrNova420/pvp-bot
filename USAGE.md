# PvP Bot - Usage Guide

## Running the Bot

### Option 1: CLI Menu (Recommended)
```bash
node cli.js
```
This gives you an interactive menu to start/stop/configure the bot.

### Option 2: Direct Run
```bash
node src/engine.js
```
Runs the bot directly without the menu.

### Option 3: NPM Script
```bash
npm start
# or
npm run start
```

## First Setup

1. Run `node cli.js`
2. Select **Configuration** (option 4)
3. Configure your server details:
   - Server IP/Port
   - Bot username
   - Owner username (for commands)

## In-Game Usage

### Starting PvP Mode

Once the bot is connected to the server:

1. Join the game
2. Type `!pvp` in chat
3. The bot will start combat mode

### Combat Features

When PvP is enabled:
- **Auto-attack** - Attacks enemies within range
- **W-tap** - Rapid forward key taps for hit accuracy
- **Circle strafe** - Automatic circular movement
- **Critical hits** - Jump attacks for extra damage
- **Auto-heal** - Eats food when health is low

### Stopping PvP

Type `!pvp` again or switch to AFK mode with `!mode afk`

## Configuration

### Server Settings
```json
"server": {
  "host": "MrNova420.aternos.me",
  "port": 31267,
  "version": "1.20.1"
}
```

### PvP Settings
```json
"pvpMode": {
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
```

### Addons
Enable/disable features:
```json
"addons": {
  "afk": true,
  "pvp": true,
  "player": false,
  "pathfinding": false
}
```

## Troubleshooting

### Bot gets kicked
- Check server version matches CONFIG
- Ensure offline mode is enabled on server
- Try different CPS settings

### Bot not attacking
- Make sure PvP mode is enabled: `!pvp`
- Check attackRange setting
- Ensure bot has a weapon in hand

### Connection issues
- Verify server IP and port
- Check server is online
- Ensure no firewall blocking

## Mode Switching

| Command | Action |
|---------|--------|
| `!pvp` | Toggle PvP combat |
| `!mode afk` | Switch to AFK mode |
| `!mode pvp` | Switch to PvP mode |
| `!status` | Show current status |

## Performance

Recommended settings by skill level:

**Beginner:**
```json
{
  "cps": 5,
  "attackRange": 3,
  "enableCrits": false,
  "enableStrafe": false
}
```

**Advanced:**
```json
{
  "cps": 12,
  "attackRange": 4,
  "enableCrits": true,
  "enableStrafe": true,
  "enableWTap": true
}
```

## Support

For issues and questions, check the GitHub repository.
