#!/usr/bin/env node

/**
 * PvP Bot - Multi-Bot Launcher
 * Launch multiple bot instances for squad combat
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { spawn, fork } = require('child_process');
const os = require('os');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

const bots = [];
const maxBots = 100; // Max 100 bots per owner
const PID_FILE = path.join(os.tmpdir(), 'pvp-bot-pids.json');

function savePID(pid) {
  let pids = [];
  if (fs.existsSync(PID_FILE)) {
    pids = JSON.parse(fs.readFileSync(PID_FILE, 'utf8'));
  }
  pids.push(pid);
  fs.writeFileSync(PID_FILE, JSON.stringify(pids));
}

// Generate unique bot name without overwriting CONFIG.json
function generateBotName(baseName, index) {
  const suffixes = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa'];
  const suffix = suffixes[index % suffixes.length] || `Bot${index + 1}`;
  return `${baseName}_${suffix}`;
}

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
    const botName = count > 1 ? generateBotName(baseName, i) : baseName;
    
    console.log(`🤖 Starting ${botName}...`);
    
    // Pass bot name via environment variable - NO config file modification
    const env = {
      ...process.env,
      BOT_NAME: botName,
      USE_PROXY: 'true' // Enable proxy for multi-bot to avoid throttling
    };
    
    const bot = spawn('node', ['src/engine.js'], {
      stdio: 'inherit',
      cwd: __dirname,
      detached: false,
      env: env
    });
    
    bots.push(bot);
    savePID(bot.pid);
    
    await new Promise(resolve => setTimeout(resolve, 3000)); // Increased delay for stability
  }
  
  console.log(`\n✅ ${count} bot(s) running!`);
  console.log('\n📝 Press Ctrl+C to stop all bots\n');
  
  rl.close();
  
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping all bots...');
    
    // Kill bots spawned by this process
    for (const bot of bots) {
      try {
        if (!bot.killed) {
          bot.kill('SIGINT');
        }
      } catch (e) {}
    }
    
    // Kill all tracked PIDs
    try {
      const fs = require('fs');
      const os = require('os');
      const PID_FILE = path.join(os.tmpdir(), 'pvp-bot-pids.json');
      if (fs.existsSync(PID_FILE)) {
        const pids = JSON.parse(fs.readFileSync(PID_FILE, 'utf8'));
        for (const pid of pids) {
          try { 
            process.kill(pid, 'SIGINT'); 
            console.log(`  Stopped bot (PID: ${pid})`);
          } catch (e) {}
        }
        fs.unlinkSync(PID_FILE);
      }
    } catch (e) {}
    
    // Force kill any remaining node processes for pvp-bot
    try {
      require('child_process').execSync('pkill -f "node.*pvp-bot"', { timeout: 3000 });
    } catch (e) {}
    
    console.log('✅ All bots stopped!');
    setTimeout(() => process.exit(0), 500);
  });
}

if (require.main === module) {
  main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
}

module.exports = { main };