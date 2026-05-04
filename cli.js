#!/usr/bin/env node

/**
 * PvP Bot - CLI Menu System
 * Easy management of the bot
 */

const readline = require('readline');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const CONFIG_PATH = path.join(__dirname, 'CONFIG.json');
let config = {};
let engineProcess = null;

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function clear() {
  console.clear();
}

async function main() {
  clear();
  
  console.log('');
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║        PvP Bot - Ultimate Combat Bot         ║');
  console.log('║            CLI Management System            ║');
  console.log('╚═══════════════════════════════════════════╝');
  console.log('');
  
  loadConfig();
  
  await showMainMenu();
}

function loadConfig() {
  if (fs.existsSync(CONFIG_PATH)) {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  }
}

async function showMainMenu() {
  console.log('');
  console.log('📊 Status: ' + (engineProcess ? '🟢 Running' : '🔴 Stopped'));
  console.log('');
  
  if (config.auth?.username) {
    console.log('🤖 Bot:    ' + config.auth.username);
  }
  if (config.server?.host) {
    console.log('🎮 Server: ' + config.server.host + ':' + config.server.port);
  }
  if (config.owner?.username) {
    console.log('👤 Owner:  ' + config.owner.username);
  }
  if (config.combat?.combatStyle) {
    console.log('⚔️  Style:  ' + config.combat.combatStyle);
  }
  
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('              MAIN MENU');
  console.log('═══════════════════════════════════════════');
  console.log('');
  console.log('1. 🚀  Start Bot');
  console.log('2. ⏹️  Stop Bot');
  console.log('3. ⚙️  Setup/Config');
  console.log('4. 📝  View Config');
  console.log('5. 🎭  Combat Presets');
  console.log('6. 🔧  Edit Config Manually');
  console.log('7. 📦  Install/Update');
  console.log('8. ❓  Help');
  console.log('9. ❌  Exit');
  console.log('');
  
  const choice = await question('Select: ');
  
  switch (choice) {
    case '1': await startBot(); break;
    case '2': await stopBot(); break;
    case '3': await runSetup(); break;
    case '4': await viewConfig(); break;
    case '5': await combatPresets(); break;
    case '6': await editConfig(); break;
    case '7': await installDeps(); break;
    case '8': await showHelp(); break;
    case '9': 
      console.log('\n👋 Goodbye!');
      process.exit(0);
    default:
      console.log('\n❌ Invalid choice');
  }
  
  if (choice !== '9') {
    await showMainMenu();
  }
}

async function startBot() {
  if (engineProcess) {
    console.log('\n❌ Bot is already running!');
    return;
  }
  
  if (!config.server?.host || config.server.host === 'your.server.ip') {
    console.log('\n❌ Server not configured!');
    console.log('Run setup first: option 3');
    return;
  }
  
  console.log('\n🚀 Starting bot...');
  
  engineProcess = spawn('node', ['src/engine.js'], {
    stdio: 'inherit',
    cwd: __dirname,
    detached: false
  });
  
  engineProcess.on('exit', (code) => {
    console.log('\n⚠️ Bot stopped (code: ' + code + ')');
    engineProcess = null;
  });
}

async function stopBot() {
  if (!engineProcess) {
    console.log('\n❌ Bot is not running!');
    return;
  }
  
  console.log('\n⏹️ Stopping bot...');
  engineProcess.kill('SIGINT');
  engineProcess = null;
}

async function runSetup() {
  console.log('\n⚙️ Running setup...');
  rl.close();
  
  const setup = spawn('node', ['setup.js'], {
    stdio: 'inherit',
    cwd: __dirname
  });
  
  setup.on('exit', () => {
    loadConfig();
    main();
  });
}

async function viewConfig() {
  console.log('\n📝 Current Configuration:\n');
  console.log(JSON.stringify(config, null, 2));
  console.log('');
}

async function combatPresets() {
  console.log('\n🎭 Combat Presets:\n');
  console.log('1. balanced    - Recommended');
  console.log('2. aggressive - Max damage');
  console.log('3. defensive - Safe play');
  console.log('');
  
  const choice = await question('Select preset: ');
  
  const presets = {
    '1': 'balanced',
    '2': 'aggressive',
    '3': 'defensive'
  };
  
  const preset = presets[choice];
  if (!preset) {
    console.log('\n❌ Invalid choice');
    return;
  }
  
  const presetPath = path.join(__dirname, 'configs', preset + '.json');
  if (fs.existsSync(presetPath)) {
    const presetConfig = JSON.parse(fs.readFileSync(presetPath, 'utf8'));
    config.combat = { ...config.combat, ...presetConfig.combat };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    console.log('\n✅ Applied preset: ' + preset);
  } else {
    console.log('\n❌ Preset not found');
  }
}

async function editConfig() {
  console.log('\n🔧 Manual Edit\n');
  console.log('1. Change bot name');
  console.log('2. Change server IP');
  console.log('3. Change server port');
  console.log('4. Change owner');
  console.log('5. Toggle combat features');
  console.log('6. Back to menu');
  console.log('');
  
  const choice = await question('Select: ');
  
  switch (choice) {
    case '1':
      const botName = await question('Bot username [' + config.auth?.username + ']: ');
      if (botName.trim()) {
        config.auth.username = botName.trim();
        console.log('✅ Bot name updated');
      }
      break;
    case '2':
      const serverIP = await question('Server IP [' + config.server?.host + ']: ');
      if (serverIP.trim()) {
        config.server.host = serverIP.trim();
        console.log('✅ Server IP updated');
      }
      break;
    case '3':
      const serverPort = await question('Server port [' + config.server?.port + ']: ');
      if (serverPort.trim()) {
        config.server.port = parseInt(serverPort.trim());
        console.log('✅ Server port updated');
      }
      break;
    case '4':
      const owner = await question('Owner username [' + config.owner?.username + ']: ');
      if (owner.trim()) {
        config.owner.username = owner.trim();
        console.log('✅ Owner updated');
      }
      break;
    case '5':
      console.log('\nCombat Features:');
      console.log('enableWTap:    ' + config.combat?.enableWTap);
      console.log('enableAntiKB: ' + config.combat?.enableAntiKB);
      console.log('enableCrits:  ' + config.combat?.enableCrits);
      console.log('enableStrafe:  ' + config.combat?.enableStrafe);
      
      const toggle = await question('Toggle (wtap/antikb/crits/strafe): ');
      if (toggle.trim()) {
        const key = 'enable' + toggle.trim().charAt(0).toUpperCase() + toggle.trim().slice(1);
        if (config.combat && config.combat[key] !== undefined) {
          config.combat[key] = !config.combat[key];
          console.log('✅ Toggled ' + key);
        }
      }
      break;
    case '6':
      return;
    default:
      console.log('\n❌ Invalid choice');
      return;
  }
  
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  console.log('✅ Config saved!');
}

async function installDeps() {
  console.log('\n📦 Installing dependencies...');
  rl.close();
  
  const install = spawn('npm', ['install'], {
    stdio: 'inherit',
    cwd: __dirname
  });
  
  install.on('exit', () => {
    console.log('\n✅ Done!');
    main();
  });
}

async function showHelp() {
  console.log('');
  console.log('╔═══════════════════════════════════════╗');
  console.log('║            HELP & GUIDES               ║');
  console.log('╚══════════════════════════════════���═��══╝');
  console.log('');
  console.log('📖 Quick Start:');
  console.log('  1. Run: node setup.js');
  console.log('  2. Enter server IP');
  console.log('  3. Enter bot name');
  console.log('  4. Enter YOUR username (to protect)');
  console.log('  5. Run: node src/engine.js');
  console.log('');
  console.log('⚔️  Combat Features:');
  console.log('  - W-tap: Sprint reset for max knockback');
  console.log('  - Anti-KB: Reduce knockback when hit');
  console.log('  - Crits: Critical hit attacks');
  console.log('  - Strafe: Circle movement');
  console.log('');
  console.log('🎭 Presets:');
  console.log('  - Balanced: Recommended');
  console.log('  - Aggressive: Max damage');
  console.log('  - Defensive: Safe play');
  console.log('');
  console.log('📁 Files:');
  console.log('  - CONFIG.json: Bot configuration');
  console.log('  - configs/: Combat presets');
  console.log('  - src/combat/: Combat systems');
  console.log('');
}

if (require.main === module) {
  main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
}

module.exports = { main };