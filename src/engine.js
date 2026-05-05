const mineflayer = require('mineflayer');
const Logger = require('./core/logger');
const SafetyMonitor = require('./core/safety');
const TaskManager = require('./core/taskManager');
const StateManager = require('./core/stateManager');
const ActivityTracker = require('./core/activityTracker');
const ReconnectManager = require('./utils/reconnect');
const CommandHandler = require('./core/commandHandler');
const { getAuthOptions } = require('./utils/auth');
const fs = require('fs');
const path = require('path');

class BotEngine {
  constructor(config) {
    this.config = config;
    this.logger = new Logger(config.logging);
    this.safety = new SafetyMonitor(config.safety, this.logger);
    this.taskManager = new TaskManager(config.tasks, this.logger);
    this.stateManager = new StateManager({ persistDir: 'data' }, this.logger);
    this.activityTracker = new ActivityTracker({ persistDir: 'data' }, this.logger);
    this.reconnectManager = new ReconnectManager(config.reconnect, this.logger);
    
    this.bot = null;
    this.addons = new Map();
    this.currentMode = config.mode?.current || 'afk';
    this.running = false;
    this.shuttingDown = false;
    this.eventHandlers = new Map();
    this.spawnedChildren = []; // Track spawned child processes for cleanup
    
    this._setupSafetyCallbacks();
    this._setupSignalHandlers();
  }

  trackChildProcess(childProcess) {
    this.spawnedChildren.push(childProcess);
    this.logger.debug(`Tracking child process: ${childProcess.pid}`);
    
    // Also listen for exit to clean up tracking
    childProcess.on('exit', (code, signal) => {
      this.logger.debug(`Child process ${childProcess.pid} exited with code ${code}`);
      const index = this.spawnedChildren.indexOf(childProcess);
      if (index > -1) {
        this.spawnedChildren.splice(index, 1);
      }
    });
  }

  stopAllChildren() {
    this.logger.info(`Stopping ${this.spawnedChildren.length} spawned child processes`);
    for (const child of this.spawnedChildren) {
      this.logger.debug(`Stopping child process ${child.pid}`);
      try {
        if (!child.killed) {
          child.kill('SIGINT');
        }
      } catch (err) {
        this.logger.error(`Failed to kill child process ${child.pid}:`, err.message);
      }
    }
    this.spawnedChildren = [];
  }
  
  _setupSafetyCallbacks() {
    this.safety.on('throttle', (metrics) => {
      this.logger.warn('Safety throttle activated', metrics);
      if (this.currentMode === 'player' && this.config.safety.autoThrottle) {
        this.switchMode('afk');
      }
      this.taskManager.pause();
    });
    
    this.safety.on('restore', (metrics) => {
      this.logger.info('Safety throttle deactivated', metrics);
      this.taskManager.resume();
    });
  }
  
  _setupSignalHandlers() {
    const shutdown = () => {
      this.logger.info('Shutdown signal received');
      this.stop();
    };
    
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }
  
  registerAddon(addon) {
    // Handle both class (needs new) and instance (already ready)
    let addonInstance = addon;
    if (typeof addon === 'function') {
      addonInstance = new addon();
    }
    
    if (!addonInstance.name || !addonInstance.init) {
      throw new Error('Invalid addon: must have name and init method');
    }
    
    this.addons.set(addonInstance.name, addonInstance);
    this.logger.info(`Addon registered: ${addonInstance.name}`);
  }
  
  async start() {
    if (this.running) {
      this.logger.warn('Bot already running');
      return;
    }
    
    this.logger.info('Starting BetterBender 2.0...');
    this.running = true;
    
    this.safety.start();
    
    this._connect();
  }
  
  async _connect() {
    if (this.shuttingDown) return;
    
    const authOptions = getAuthOptions(this.config.auth);
    
    const botOptions = {
      host: this.config.server.host,
      port: this.config.server.port,
      username: authOptions.username,
      auth: authOptions.auth,
      version: this.config.server.version,
      hideErrors: false
    };
    
    if (authOptions.password) {
      botOptions.password = authOptions.password;
    }
    
    // Use proxy if env var is set
    if (process.env.USE_PROXY === 'true') {
      try {
        const ProxyManager = require('./utils/proxyManager');
        const proxySocket = await ProxyManager.createProxiedSocket(
          this.config.server.host,
          this.config.server.port
        );
        botOptions.client = proxySocket;
        this.logger.info('Using proxy connection');
      } catch (e) {
        this.logger.warn(`Failed to create proxy connection: ${e.message}, falling back to direct connection`);
      }
    }
    
    this.logger.info(`Connecting to ${this.config.server.host}:${this.config.server.port} as ${authOptions.username}`);
    
    try {
      this.bot = mineflayer.createBot(botOptions);
      this._setupBotEvents();
    } catch (err) {
      this.logger.error('Failed to create bot:', err.message);
      this._handleDisconnect('Failed to create bot');
    }
  }
  
  _setupBotEvents() {
    this.bot.once('login', () => {
      this.logger.info('Bot logged in successfully');
      this.reconnectManager.reset();
      this.activityTracker.record('login', { server: this.config.server.host });
    });
    
    this.bot.once('spawn', () => {
      this.logger.info('Bot spawned in world');
      this._restoreState();
      this._initializeAddons();
      this._setupPositionTracking();
    });
    
    this.bot.on('error', (err) => {
      this.logger.error('Bot error:', err.message);
      if (err.code) {
        this.reconnectManager.recordFailure(err.code);
      }
    });
    
    this.bot.on('kicked', (reason) => {
      this.logger.warn('Bot kicked:', reason);
      this._handleDisconnect('Kicked');
    });
    
    this.bot.on('end', () => {
      this.logger.info('Bot disconnected');
      this._handleDisconnect('Connection ended');
    });
    
    this.bot.on('death', () => {
      this.logger.warn('Bot died');
      const pos = this.bot.entity ? this.bot.entity.position : null;
      this.activityTracker.record('death', { position: pos });
      this._emit('bot_death');
    });
    
    this.bot.on('health', () => {
      if (this.bot.health <= 5) {
        this.logger.warn(`Low health: ${this.bot.health}`);
      }
    });
    
    this.bot.on('messagestr', (message) => {
      this._emit('chat_message', { message });
    });
    
    this.bot.on('chat', (username, message) => {
      if (this.commandHandler && username && username !== this.bot.username) {
        const response = this.commandHandler.handleMessage(message, username);
        if (response) {
          setTimeout(() => {
            try {
              this.bot.chat(response);
            } catch (err) {
              this.logger.error('Chat response error:', err.message);
            }
          }, 500);
        }
      }
    });
  }
  
  _restoreState() {
    const savedState = this.stateManager.getState();
    
    if (savedState.lastPosition) {
      this.logger.info(`Last known position: (${Math.round(savedState.lastPosition.x)}, ${Math.round(savedState.lastPosition.y)}, ${Math.round(savedState.lastPosition.z)})`);
      this.logger.info(`Explored ${savedState.exploredChunks?.length || 0} chunks`);
    }
    
    if (savedState.playerRelationships) {
      const playerCount = Object.keys(savedState.playerRelationships).length;
      if (playerCount > 0) {
        this.logger.info(`Remembering ${playerCount} players`);
      }
    }
    
    if (savedState.landmarks && savedState.landmarks.length > 0) {
      this.logger.info(`Restored ${savedState.landmarks.length} landmarks`);
    }
    
    const taskStatus = this.taskManager.getStatus();
    if (taskStatus.queueLength > 0) {
      this.logger.info(`Resuming with ${taskStatus.queueLength} queued tasks`);
      this.taskManager.resume();
    }
  }
  
  _setupPositionTracking() {
    this.positionInterval = setInterval(() => {
      if (this.bot && this.bot.entity && this.bot.entity.position) {
        this.stateManager.updatePosition(this.bot.entity.position);
        
        const chunkX = Math.floor(this.bot.entity.position.x / 16);
        const chunkZ = Math.floor(this.bot.entity.position.z / 16);
        this.stateManager.addExploredChunk(chunkX, chunkZ);
      }
    }, 30000);
  }
  
  _initializeAddons() {
    this.logger.info('Initializing addons...');
    
    this.commandHandler = new CommandHandler(this.bot, this, this.logger);
    this.logger.info('Command handler initialized');
    
    for (const [name, addon] of this.addons) {
      try {
        addon.init(this.bot, this);
        this.logger.info(`Addon initialized: ${name}`);
      } catch (err) {
        this.logger.error(`Failed to initialize addon ${name}:`, err.message);
      }
    }
    
    setTimeout(() => {
      const currentAddon = this.addons.get(this.currentMode);
      if (currentAddon && !currentAddon.enabled && currentAddon.enable) {
        this.logger.info(`Ensuring ${this.currentMode} mode is enabled`);
        currentAddon.enable();
      }
    }, 1000);
    
    this._setupCorePlayerBehaviors();
    this._emit('bot_ready');
  }
  
  _setupCorePlayerBehaviors() {
    this.bot.on('death', () => {
      setTimeout(() => {
        try {
          this.logger.info('Auto-respawning...');
          this.bot.respawn();
          
          setTimeout(() => {
            if (this.bot.entity && this.bot.game && this.bot.game.dimension === 'minecraft:overworld') {
              this.bot.chat('Respawned! Time for revenge...');
            }
          }, 2000);
        } catch (err) {
          this.logger.error('Respawn error:', err.message);
        }
      }, 1000);
    });
    
    this.bot.on('spawn', async () => {
      setTimeout(async () => {
        if (!this.bot.entity) return;
        
        const bed = this.bot.findBlock({
          matching: (block) => block && block.name && block.name.includes('bed'),
          maxDistance: 32
        });
        
        if (!bed) {
          const bedItem = this.bot.inventory.items().find(i => i.name.includes('bed'));
          if (bedItem) {
            try {
              this.logger.info('Placing bed for spawn point...');
              await this.bot.equip(bedItem, 'hand');
              
              const pos = this.bot.entity.position.offset(0, -1, 0);
              const referenceBlock = this.bot.blockAt(pos);
              
              if (referenceBlock && referenceBlock.name !== 'air') {
                const Vec3 = require('vec3');
                await this.bot.placeBlock(referenceBlock, new Vec3(0, 1, 0));
                this.logger.info('Bed placed successfully!');
              }
            } catch (err) {
              this.logger.debug('Bed placement error:', err.message);
            }
          }
        }
        
        if (this.bot.time.timeOfDay > 12000 && this.bot.time.timeOfDay < 24000) {
          const bedToSleep = this.bot.findBlock({
            matching: (block) => block && block.name && block.name.includes('bed'),
            maxDistance: 32
          });
          
          if (bedToSleep) {
            try {
              await this.bot.sleep(bedToSleep);
              this.logger.info('Sleeping through the night...');
            } catch (err) {
              this.logger.debug('Cannot sleep:', err.message);
            }
          }
        }
      }, 5000);
    });
    
    setInterval(() => {
      if (!this.bot || !this.bot.entity) return;
      
      if (this.bot.food < 18) {
        this._tryEat();
      }
    }, 10000);
  }
  
  _tryEat() {
    try {
      const foods = this.bot.inventory.items().filter(item => {
        return item && item.name && (
          item.name.includes('bread') ||
          item.name.includes('beef') ||
          item.name.includes('pork') ||
          item.name.includes('chicken') ||
          item.name.includes('fish') ||
          item.name.includes('apple') ||
          item.name.includes('carrot') ||
          item.name.includes('potato') ||
          item.name.includes('mutton') ||
          item.name.includes('cooked')
        );
      });
      
      if (foods.length > 0) {
        this.bot.equip(foods[0], 'hand', (err) => {
          if (!err) {
            this.bot.consume((err) => {
              if (!err) {
                this.logger.info('Ate food');
              }
            });
          }
        });
      }
    } catch (err) {
      this.logger.debug('Eat error:', err.message);
    }
  }
  
  _handleDisconnect(reason) {
    if (this.shuttingDown) return;
    
    this.logger.info(`Handling disconnect: ${reason}`);
    
    // Stop all spawned child processes on disconnect
    this.stopAllChildren();
    
    for (const [name, addon] of this.addons) {
      if (addon.cleanup) {
        try {
          addon.cleanup();
        } catch (err) {
          this.logger.error(`Addon cleanup failed: ${name}`, err.message);
        }
      }
    }
    
    if (this.reconnectManager.shouldReconnect()) {
      this.reconnectManager.scheduleReconnect(() => {
        this._connect();
      });
    } else {
      this.logger.error('Reconnect disabled or max attempts reached');
      this.running = false;
    }
  }
  
  switchMode(newMode) {
    if (newMode === this.currentMode) return;
    
    if (!this.bot || !this.bot.entity) {
      this.logger.warn(`Cannot switch mode - bot not connected. Will switch to ${newMode} when ready.`);
      this.currentMode = newMode;
      return;
    }
    
    this.logger.info(`Switching mode: ${this.currentMode} -> ${newMode}`);
    
    for (const [name, addon] of this.addons) {
      if (addon.disable && addon.enabled) {
        addon.disable();
      }
    }
    
    const oldMode = this.currentMode;
    this.currentMode = newMode;
    this.stateManager.updateMode(newMode);
    this.activityTracker.record('mode_change', { from: oldMode, to: newMode });
    
    const targetAddon = this.addons.get(newMode);
    if (targetAddon && targetAddon.enable && targetAddon.logger) {
      targetAddon.enable();
    }
    
    this._emit('mode_changed', { mode: newMode });
  }
  
  stop() {
    if (this.shuttingDown) return;
    
    this.shuttingDown = true;
    this.logger.info('Stopping bot...');
    
    // Stop all spawned child processes first
    this.stopAllChildren();
    
    this.reconnectManager.cancel();
    
    if (this.positionInterval) {
      clearInterval(this.positionInterval);
      this.positionInterval = null;
    }
    
    if (this.bot) {
      this.bot.quit();
      this.bot = null;
    }
    
    for (const [name, addon] of this.addons) {
      if (addon.cleanup) {
        try {
          addon.cleanup();
        } catch (err) {
          this.logger.error(`Addon cleanup failed: ${name}`, err.message);
        }
      }
    }
    
    this.safety.stop();
    this.stateManager.cleanup();
    this.activityTracker.cleanup();
    this.logger.shutdown();
    
    this.running = false;
    this.logger.info('Bot stopped');
    
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  }
  
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }
  
  _emit(event, data = {}) {
    if (this.eventHandlers.has(event)) {
      for (const handler of this.eventHandlers.get(event)) {
        try {
          handler(data);
        } catch (err) {
          this.logger.error(`Event handler error for ${event}:`, err.message);
        }
      }
    }
  }
  
  getBot() {
    return this.bot;
  }
  
  getSafety() {
    return this.safety;
  }
  
  getTaskManager() {
    return this.taskManager;
  }
  
  getLogger() {
    return this.logger;
  }
  
  getStatus() {
    return {
      running: this.running,
      mode: this.currentMode,
      connected: this.bot && this.bot.player,
      health: this.bot ? this.bot.health : 0,
      food: this.bot ? this.bot.food : 0,
      position: this.bot && this.bot.entity ? this.bot.entity.position : null,
      safety: this.safety.getMetrics(),
      tasks: this.taskManager.getStatus(),
      state: this.stateManager.getState()
    };
  }
  
  getStateManager() {
    return this.stateManager;
  }
  
  getActivityTracker() {
    return this.activityTracker;
  }
  
  getAddon(name) {
    return this.addons.get(name);
  }
}

if (require.main === module) {
  const configPath = process.argv[2] || 'CONFIG.json';
  
  if (!fs.existsSync(configPath)) {
    console.error(`Config file not found: ${configPath}`);
    console.log('Please copy CONFIG.example.json to CONFIG.json and configure it');
    process.exit(1);
  }
  
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  
  const engine = new BotEngine(config);
  
  const AFKAddon = require('../addons/afk');
  const PvPAddon = require('../addons/pvp');
  
  engine.registerAddon(AFKAddon);
  engine.registerAddon(PvPAddon);
  
  engine.start();
}

module.exports = BotEngine;
