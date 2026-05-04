#!/usr/bin/env node

/**
 * PvP Bot - Entry Point
 */

const path = require('path');
const fs = require('fs');

const configPath = path.join(__dirname, 'CONFIG.json');
const fs2 = require('fs');

if (!fs2.existsSync(configPath)) {
  console.log('╔═══════════════════════════════════════╗');
  console.log('║          PvP Bot - Setup             ║');
  console.log('╚═══════════════════════════════════════╝');
  console.log('');
  console.log('❌ CONFIG.json not found!');
  console.log('📝 Running setup...');
  console.log('');
  
  const setup = require('./setup');
} else {
  const PvPEngine = require('./src/engine');
  
  console.log('🤖 PvP Bot - Ultimate Combat Bot v2.0');
  console.log('📄 Config: ' + configPath);
  console.log('');
  
  const engine = new PvPEngine(configPath);
  
  engine.start();
  
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping...');
    if (engine) engine.stop();
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Stopping...');
    if (engine) engine.stop();
  });
}