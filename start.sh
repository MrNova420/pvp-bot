#!/bin/bash
# PvP Bot - Quick Start Script

echo "🚀 Starting PvP Bot..."

# Check if config exists
if [ ! -f "CONFIG.json" ]; then
    echo "📋 Running setup..."
    node setup.js
    exit $?
fi

# Start the bot
node index.js "$@"