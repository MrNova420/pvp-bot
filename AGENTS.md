# PvP Bot - Agent Instructions

## Quick Start
```bash
cd /home/mrnova420/pvp-bot
node setup.js    # First time - configure
node index.js    # Run bot
```

## All Commands
```bash
node setup.js    # Config wizard
node launcher.js # Interactive menu  
node start.js   # Quick start with presets
node index.js   # Direct run
node multi.js   # Multi-bot
```

## Config
Edit CONFIG.json with your server:
- auth.username = bot name
- server.host = server IP
- server.port = 25565
- owner.username = your username

## Common Issues

1. **CONFIG.json not found** - Run: `node setup.js`
2. **Failed to connect** - Wrong IP/port in CONFIG.json
3. **Auth error** - Set `auth.type`: "offline", "mojang", or "microsoft"
4. **Plugin error** - Fixed by using `pathfinder.pathfinder`

## Project Status
✅ All 14 systems integrated
✅ Pathfinding fixed (use pathfinder.pathfinder)
✅ Ready to test