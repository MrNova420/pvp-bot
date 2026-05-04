#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   PvP Bot - Setup Installer            ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log('📦 Checking dependencies...\n');
  
  try {
    require('mineflayer');
    console.log('✅ Dependencies already installed');
  } catch (e) {
    console.log('📦 Installing dependencies...');
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed');
  }

  console.log('\n⚙️  Configuration Setup\n');
  
  const configPath = path.join(__dirname, 'CONFIG.json');
  let config = {};
  
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log('📄 CONFIG.json found');
  }

  console.log('\n--- Server Details ---');
  const serverHost = await question(`Server IP [${config.server?.host || 'localhost'}]: `);
  const serverPort = await question(`Server Port [${config.server?.port || 25565}]: `);
  const serverVersion = await question(`MC Version [${config.server?.version || '1.20.4'}]: `);
  
  console.log('\n--- Bot Account ---');
  const botUsername = await question(`Bot Username [${config.auth?.username || 'PvP_Bot'}]: `);
  const authType = await question(`Auth Type (offline/mojang/microsoft) [${config.auth?.type || 'offline'}]: `);
  
  console.log('\n--- Owner Account ---');
  const ownerUsername = await question(`Owner Username (who to protect) [${config.owner?.username || ''}]: `);

  console.log('\n--- Combat Style ---');
  console.log('1. Aggressive - Always attack, max damage');
  console.log('2. Defensive - Retreat when low, defensive');
  console.log('3. Hybrid - Balanced (recommended)');
  const styleChoice = await question('Choice [3]: ');
  
  const styles = { '1': 'aggressive', '2': 'defensive', '3': 'hybrid' };
  const combatStyle = styles[styleChoice] || 'hybrid';

  const newConfig = {
    auth: {
      username: botUsername || config.auth?.username || 'PvP_Bot',
      password: config.auth?.password || '',
      type: authType || config.auth?.type || 'offline'
    },
    server: {
      host: serverHost || config.server?.host || 'localhost',
      port: parseInt(serverPort) || config.server?.port || 25565,
      version: serverVersion || config.server?.version || '1.20.4'
    },
    owner: {
      username: ownerUsername || config.owner?.username || 'Player',
      followDistance: config.owner?.followDistance || 3,
      protectEnabled: true
    },
    combat: {
      autoAttack: true,
      attackRange: 4,
      cps: 15,
      enableCrits: true,
      enableStrafe: true,
      enableWTap: true,
      enableAntiKB: true,
      enableWeaponSwitch: true,
      autoHeal: true,
      healThreshold: 14,
      autoPearl: true,
      autoPotion: true,
      rangedEnabled: true,
      rangedRange: 20,
      crystalEnabled: true,
      revengeEnabled: true,
      combatStyle: combatStyle
    },
    logging: {
      enabled: true,
      level: 'info'
    }
  };

  fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
  
  console.log('\n✅ Configuration saved!');
  console.log(`\n📝 Edit ${configPath} to modify settings`);
  console.log('\n🚀 To start the bot:');
  console.log('   node index.js');
  console.log('   or');
  console.log('   npm start\n');

  rl.close();
}

if (require.main === module) {
  main().catch(err => {
    console.error('Setup error:', err);
    process.exit(1);
  });
}

module.exports = { main };