#!/bin/bash
# PvP Bot Installer

echo "╔════════════════════════════════════════╗"
echo "║   PvP Bot - Setup                  ║"
echo "╚════════════════════════════════════════╝"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if CONFIG exists
if [ -f "CONFIG.json" ]; then
    echo "✅ Already configured"
else
    echo "📋 Running config setup..."
    node setup.js
fi

echo ""
echo "🚀 Ready to run:"
echo "   npm start        # Use menu"
echo "   node index.js   # Direct start"
echo "   node start.js  # Quick start"