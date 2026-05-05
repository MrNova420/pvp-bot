#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { spawn } = require('child_process');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║     PvP Bot - Quick Start               ║');
  console.log('╚════════════════════════════════════════╝\n');
  
  const configsDir = path.join(__dirname, 'configs');
  const configPath = path.join(__dirname, 'CONFIG.json');
  
  if (!fs.existsSync(configPath)) {
    console.log('📋 Run setup first: node setup.js');
    rl.close();
    process.exit(1);
    return;
  }
  
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  
  console.log('Available presets:');
  console.log('1. balanced  - Balanced (recommended)');
  console.log('2. aggressive - Max damage');
  console.log('3. defensive - Safe play');
  console.log('');
  
  const choice = await question('Select preset [1]: ') || '1';
  
  const presets = {
    '1': 'balanced',
    '2': 'aggressive', 
    '3': 'defensive'
  };
  
  const preset = presets[choice] || 'balanced';
  const presetPath = path.join(configsDir, `${preset}.json`);
  
  if (fs.existsSync(presetPath)) {
    const presetConfig = JSON.parse(fs.readFileSync(presetPath, 'utf8'));
    config.combat = { ...config.combat, ...presetConfig.combat };
  }
  
    console.log(`\n🚀 Starting with ${preset} preset...\n`);
    
    // Ask about proxy usage
    const useProxy = await question('Use proxies to avoid Aternos throttling? (y/N): ') || 'n';
    const useProxyBool = useProxy.toLowerCase() === 'y' || useProxy.toLowerCase() === 'yes';
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    
    // Prepare environment variables
    const env = { ...process.env };
    if (useProxyBool) {
      env.USE_PROXY = 'true';
      console.log('🔌 Proxy support ENABLED - each bot will use a different free proxy');
    } else {
      console.log('🔌 Proxy support DISABLED - using direct connections');
    }
    
    const bot = spawn('node', ['index.js'], { 
      stdio: 'inherit', 
      cwd: __dirname,
      env: env
    });
  
  bot.on('exit', (code) => {
    process.exit(code);
  });
  
  rl.close();
}

if (require.main === module) {
  main();
}

module.exports = { main };