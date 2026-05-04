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

function clear() {
  console.clear();
}

async function main() {
  clear();
  
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║     PvP Bot - Ultimate Combat Bot       ║');
  console.log('╚════════════════════════════════════════╝\n');
  
  const configPath = path.join(__dirname, 'CONFIG.json');
  
  if (!fs.existsSync(configPath)) {
    console.log('📋 No CONFIG.json found. Running setup...\n');
    rl.close();
    const setup = spawn('node', ['setup.js'], { stdio: 'inherit', cwd: __dirname });
    setup.on('exit', () => process.exit(0));
    return;
  }
  
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  
  console.log(`🤖 Bot: ${config.auth.username}`);
  console.log(`🎮 Server: ${config.server.host}:${config.server.port}`);
  console.log(`👤 Owner: ${config.owner.username}`);
  console.log(`⚔️  Style: ${config.combat.combatStyle}\n`);
  
  console.log('═══════════════════════════════════════');
  console.log('            MENU');
  console.log('═══════════════════════════════════════');
  console.log('');
  console.log('1. 🚀 Start Bot');
  console.log('2. ⚔️  Start Aggressive Mode');
  console.log('3. 🛡️  Start Defensive Mode');
  console.log('4. ⚙️  Run Setup/Config');
  console.log('5. 📝 View Config');
  console.log('6. ❌ Exit');
  console.log('');
  
  const choice = await question('Select: ');
  
  rl.close();
  
  switch (choice) {
    case '1':
      startBot(config);
      break;
    case '2':
      startBot(config, 'aggressive');
      break;
    case '3':
      startBot(config, 'defensive');
      break;
    case '4':
      const setup = spawn('node', ['setup.js'], { stdio: 'inherit', cwd: __dirname });
      setup.on('exit', () => process.exit(0));
      break;
    case '5':
      console.log('\n📝 Current CONFIG.json:\n');
      console.log(JSON.stringify(config, null, 2));
      console.log('');
      break;
    case '6':
      console.log('👋 Goodbye!');
      process.exit(0);
      break;
    default:
      console.log('❌ Invalid choice');
      process.exit(1);
  }
}

function startBot(config, style = null) {
  if (style) {
    config.combat.combatStyle = style;
  }
  
  console.log(`\n🚀 Starting bot in ${config.combat.combatStyle} mode...\n`);
  
  const bot = spawn('node', ['index.js'], { 
    stdio: 'inherit', 
    cwd: __dirname,
    env: { ...process.env }
  });
  
  bot.on('exit', (code) => {
    console.log(`\n⚠️ Bot exited with code ${code}`);
    process.exit(code);
  });
}

if (require.main === module) {
  main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
}

module.exports = { main, startBot };