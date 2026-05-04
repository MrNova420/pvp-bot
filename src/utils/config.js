const fs = require('fs');
const path = require('path');

function loadConfig() {
  const configPath = path.join(__dirname, 'CONFIG.json');
  if (!fs.existsSync(configPath)) {
    console.log('CONFIG.json not found. Using defaults...');
    return getDefaultConfig();
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function getDefaultConfig() {
  return {
    auth: {
      username: 'PvP_Bot',
      password: '',
      type: 'offline'
    },
    server: {
      host: 'localhost',
      port: 25565,
      version: '1.20.4'
    },
    owner: {
      username: 'Player',
      followDistance: 3,
      protectEnabled: true
    },
    combat: {
      autoAttack: true,
      attackRange: 4,
      cps: 15,
      enableCrits: true,
      enableStrafe: true,
      autoHeal: true,
      healThreshold: 14
    },
    logging: {
      enabled: true,
      level: 'info'
    }
  };
}

module.exports = { loadConfig, getDefaultConfig };