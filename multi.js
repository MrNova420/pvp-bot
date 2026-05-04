#!/usr/bin/env node

/**
 * PvP Bot - Multi-Bot Launcher
 * Launch multiple bot instances for squad combat
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { spawn, fork } = require('child_process');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

const bots = [];
const maxBots = 5;

async function main() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║     PvP Bot - Multi-Bot Launcher         ║');
  console.log('╚════════════════════════════════════════╝\n');
  
  const configPath = path.join(__dirname, 'CONFIG.json');
  
  if (!fs.existsSync(configPath)) {
    console.log('❌ No CONFIG.json. Run setup first.');
    process.exit(1);
  }
  
  let config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  
  const baseName = config.auth.username;
  
  console.log(`Base username: ${baseName}`);
  console.log(`Max bots: ${maxBots}\n`);
  
  const numBots = await question('How many bots? [1]: ') || '1';
  const count = Math.min(parseInt(numBots) || 1, maxBots);
  
  console.log(`\n🚀 Starting ${count} bot(s)...\n`);
  
  for (let i = 0; i < count; i++) {
    const botName = count > 1 ? `${baseName}_${i + 1}` : baseName;
    
    config.auth.username = botName;
    
    const botConfig = { ...config };
    fs.writeFileSync(configPath, JSON.stringify(botConfig, null, 2));
    
    console.log(`🤖 Starting ${botName}...`);
    
    const bot = spawn('node', ['index.js'], {
      stdio: 'inherit',
      cwd: __dirname,
      detached: false
    });
    
    bots.push(bot);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(`\n✅ ${count} bot(s) running!`);
  console.log('\n📝 Press Ctrl+C to stop all bots\n');
  
  rl.close();
  
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping all bots...');
    process.exit(0);
  });
}

if (require.main === module) {
  main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
}

module.exports = { main };