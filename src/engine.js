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
    this.currentMode = config.mode?.current || 'pvp'; // Default to pvp, not afk
    this.running = false;
    this.shuttingDown = false;
    this.eventHandlers = new Map();
    this.spawnedChildren = [];
    this.botNameRegistry = new Set();
    this.admins = new Set(); // Track admin users
    this.usingProxy = process.env.USE_PROXY === 'true';
    this.proxyRetryCount = 0;
    this.proxyMaxRetries = 10;
    this.proxyCheckInterval = null;
    this.lastVerifiedIP = null;
    this.currentProxy = null;
    this.homeIP = null;
    this.botNamePool = [
      'BenderHero', 'DexEasy', 'XxRager', 'ProGamer', 'NoxViper', 'ShadowStrike',
      'CyberNinja', 'PhantomX', 'BlazeFury', 'IceDragon', 'ThunderBolt', 'DarkKnight',
      'SteelWarrior', 'InfernoMax', 'VortexPrime', 'EchoSniper', 'TitanForce', 'AquaStream',
      'ToxicVenom', 'SolarFlare', 'LunarWolf', 'StormBreaker', 'IronGiant', 'MysticMage',
      'SavageBeast', 'EliteOps', 'NightStalker', 'ChaosMaster', 'UltraBots', 'MegaPixel',
      'PwnageUnit', 'FragFragger', 'RageQuit', 'SwagLord', 'Haxxor', 'OwnedYou',
      'BotMaster', 'PvPPro', 'GriefKing', 'NoobDestroyer', 'CreeperKiller', 'ZombieSlayer'
    ]; // Pool of gaming names
    
    this._setupSafetyCallbacks();
    this._setupSignalHandlers();
    
    // Auto-load addons based on config
    this._autoLoadAddons();
    
    // Detect home IP at startup (async but don't wait - non-blocking)
    this._detectHomeIP().catch(() => {});
  }
  
  _autoLoadAddons() {
    const fs = require('fs');
    const path = require('path');
    const addonsDir = path.join(__dirname, '../addons');
    
    if (!fs.existsSync(addonsDir)) {
      this.logger.warn('[Addon] Addons directory not found');
      return;
    }
    
    const addonFiles = fs.readdirSync(addonsDir)
      .filter(f => f.endsWith('.js') && !f.includes('.backup'));
    
    for (const file of addonFiles) {
      try {
        const AddonClass = require(path.join(addonsDir, file));
        const addonName = file.replace('.js', '');
        
        // Only load addons that are explicitly in config and set to true
        const enabled = this.config.addons && this.config.addons[addonName] === true;
        
        if (enabled) {
          this.registerAddon(AddonClass);
          this.logger.info(`[Addon] Auto-loaded: ${addonName}`);
        } else {
          this.logger.debug(`[Addon] Skipped (not enabled): ${addonName}`);
        }
      } catch (err) {
        this.logger.error(`[Addon] Failed to load ${file}:`, err.message);
      }
    }
  }
  
  async _detectHomeIP() {
    const https = require('https');
    const services = [
      'https://api.ipify.org?format=json',
      'https://ifconfig.me/json',
      'https://icanhazip.com/'
    ];
    
    for (const url of services) {
      try {
        const ip = await new Promise((resolve, reject) => {
          https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
              try {
                const json = JSON.parse(data);
                resolve(json.ip || data.trim());
              } catch {
                resolve(data.trim());
              }
            });
          }).on('error', reject);
        });
        
        if (ip && /^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
          this.homeIP = ip;
          this.logger.info(`[ProxyManager] Detected home IP: ${ip}`);
          return;
        }
      } catch (e) {
        // Try next service
      }
    }
    
    // Fallback detection: try direct connection check
    this.homeIP = 'DETECTING';
    this.logger.warn('[ProxyManager] Could not auto-detect home IP, will detect on first direct connection');
  }
  
  getUniqueBotName() {
    // Generate goofy/rage-bait gaming names
    const prefixes = ['xX', 'Xx', 'Pro', 'Epic', 'MLG', 'Noob', 'King', 'Lord', 'Dark', 'Shadow', 'Die', 'Swag', 'TryHard', 'Cringe', 'Omega', 'Ultra'];
    const mids = ['Slayer', 'Killer', 'Master', 'Gamer', 'Legend', 'Pro', 'Beast', 'Warrior', 'Hacker', 'Destroyer', 'Bot', 'Noob', 'Rager', 'Smurf', 'Kid'];
    const suffixes = ['2000', 'YT', 'Live', 'XD', 'Xx', '69', '420', 'OP', 'GG', 'EZ', '123', 'XD', 'LOL', 'RIP', 'AFK'];
    
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const mid = mids[Math.floor(Math.random() * mids.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    
    // Randomly skip suffix 30% of time for shorter names
    const name = Math.random() < 0.3 ? prefix + mid : prefix + mid + suffix;
    
    this.logger.info(`[Bot] Generated rage-bait name: ${name}`);
    return name;
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
  
  getSpawnedChildren() {
    return this.spawnedChildren;
  }
  
  // Admin methods
  isAdmin(username) {
    return this.admins.has(username);
  }
  
  addAdmin(username) {
    this.admins.add(username);
    this.logger.info(`[Admin] Added admin: ${username}`);
  }
  
  getAdmins() {
    return Array.from(this.admins);
  }
  
  addFriendlyBot(name) {
    this.friendlyBots.add(name);
    this.logger.info(`[Bot] Added friendly bot: ${name}`);
  }
  
  generateBotName() {
    // Generate goofy/rage-bait gaming names
    const prefixes = ['xX', 'Xx', 'Pro', 'Epic', 'MLG', 'Noob', 'King', 'Lord', 'Dark', 'Shadow', 'Die', 'Swag', 'TryHard', 'Cringe', 'Omega', 'Ultra'];
    const mids = ['Slayer', 'Killer', 'Master', 'Gamer', 'Legend', 'Pro', 'Beast', 'Warrior', 'Hacker', 'Destroyer', 'Bot', 'Noob', 'Rager', 'Smurf', 'Kid'];
    const suffixes = ['2000', 'YT', 'Live', 'XD', 'Xx', '69', '420', 'OP', 'GG', 'EZ', '123', 'XD', 'LOL', 'RIP', 'AFK'];
    
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const mid = mids[Math.floor(Math.random() * mids.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    
    // Randomly skip suffix 30% of time for shorter names
    const name = Math.random() < 0.3 ? prefix + mid : prefix + mid + suffix;
    
    this.logger.info(`[Bot] Generated rage-bait name: ${name}`);
    return name;
  }
  
  spawnBots(count = 1, targetPlayer = null, options = {}) {
    // Spawn multiple bots via child processes
    const { spawn } = require('child_process');
    const useProxy = options.useProxy !== false;
    const friendlyFire = options.friendlyFire !== false;
    const delay = options.delay || 3000;
    const actualCount = Math.min(count, 100);
    
    this.logger.info(`[Engine] Spawning ${actualCount} bots...`);
    
    const parentName = this.config.owner?.username || 'unknown';
    
    for (let i = 0; i < actualCount; i++) {
      const botName = this.generateBotName();
      
      setTimeout(() => {
        const env = { 
          ...process.env, 
          BOT_NAME: botName,
          USE_PROXY: useProxy ? 'true' : 'false',
          SPAWN_MODE: 'true',
          SPAWN_PARENT: parentName,
          FRIENDLY_FIRE: friendlyFire.toString()
        };
        
        if (targetPlayer) {
          env.SPAWN_TARGET = targetPlayer;
        }
        
        try {
          const proc = spawn('node', ['src/engine.js'], {
            cwd: '/home/mrnova420/pvp-bot',
            detached: true,
            stdio: 'ignore',
            env: env
          });
          
          proc.unref();
          this.trackChildProcess(proc);
          this.addFriendlyBot(botName);
          
          this.logger.info(`[Engine] Spawned bot: ${botName}`);
        } catch (e) {
          this.logger.error(`[Engine] Spawn error: ${e.message}`);
        }
      }, i * delay);
    }
    
    return `Spawning ${actualCount} bots...`;
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
    
    // IPC handler for child processes (receive messages from parent)
    if (process.send) {
      process.on('message', (msg) => {
        this._handleIPCMessage(msg);
      });
      this.logger.info('IPC handler initialized for child process');
    }
  }
  
  _handleIPCMessage(msg) {
    if (!msg || !msg.type) return;
    
    this.logger.info(`[IPC] Received: ${msg.type}`);
    
    if (msg.type === 'friendlyFire') {
      // Update friendly fire setting (check both a1-bot and legacy pvp addon)
      const combatAddon = this.addons.get('a1-bot') || this.addons.get('pvp');
      if (combatAddon) {
        combatAddon.friendlyFire = msg.value === true;
        this.logger.info(`[IPC] Friendly fire set to: ${combatAddon.friendlyFire}`);
      }
    }
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
        
        // Override username if BOT_NAME env var is set (for multi-bot spawning)
        if (process.env.BOT_NAME) {
            let botName = process.env.BOT_NAME;
            
            // Validate bot name
            const validNameRegex = /^[a-zA-Z0-9_]{3,16}$/;
            if (!validNameRegex.test(botName)) {
                this.logger.warn(`[Engine] Invalid BOT_NAME "${botName}" - must be 3-16 alphanumeric chars. Using random name instead.`);
                botName = this.botNamePool[Math.floor(Math.random() * this.botNamePool.length)] + Math.floor(Math.random() * 9000);
            }
            
            authOptions.username = botName;
            this.logger.info(`[Engine] Using bot name from env: ${authOptions.username}`);
        }
        
        let botOptions = {
            username: authOptions.username,
            auth: authOptions.auth,
            version: this.config.server.version,
            hideErrors: false,
            host: this.config.server.host,
            port: this.config.server.port
        };
        
        if (authOptions.password) {
            botOptions.password = authOptions.password;
        }
        
        // Proxy support - NO FALLBACK - keep trying until proxy works!
        if (process.env.USE_PROXY === 'true') {
            // Use random bot name from pool for fresh identity
            const randomName = this.getUniqueBotName();
            this.logger.info(`[ProxyManager] Using fresh bot name: ${randomName}`);
            botOptions.username = randomName;
            
            await this._connectWithProxy(botOptions);
            return;
        }
        
        // Normal direct connection (no proxy)
        this.logger.info(`Connecting to ${this.config.server.host}:${this.config.server.port} as ${authOptions.username}`);
        
        try {
            this.bot = mineflayer.createBot(botOptions);
            this._setupBotEvents();
            
            // Capture home IP on first direct connection for proxy detection
            this.bot.once('login', () => {
                try {
                    const ip = this.bot._client.socket.remoteAddress;
                    if (!this.homeIP || this.homeIP === 'DETECTING') {
                        this.homeIP = ip;
                        this.logger.info(`[ProxyManager] Captured home IP from direct connection: ${ip}`);
                    }
                } catch (e) {}
            });
        } catch (err) {
            this.logger.error('Failed to create bot:', err.message);
            this._handleDisconnect('Failed to create bot');
        }
    }
    
    async _connectWithProxy(botOptions) {
        const ProxyManager = require('./utils/proxyManager');
        
        const proxyConfig = this.config.proxy || {
            enabled: true,
            rotationStrategy: 'random',
            minHealthScore: 0.3,
            maxLatency: 5000,
            blacklistThreshold: 3,
            preferredCountries: [],
            refreshInterval: 900000,
            enableGeoIP: true
        };
        
        this.proxyManager = new ProxyManager(proxyConfig, this.logger);
        
        // Fetch raw proxies immediately - no waiting for validation!
        this.logger.info('[ProxyManager] Fetching proxies...');
        await this.proxyManager.fetchAndValidate();
        this.logger.info(`[ProxyManager] Got ${this.proxyManager.proxies.size} proxies ready to try`);
        
        // Also start background validation to improve pool
        this.proxyManager.fetchAndValidate().catch(() => {}); // Don't wait
        
        // Try up to 500 proxies - should find one fast!
        let attempts = 0;
        const maxAttempts = 500;
        
        while (attempts < maxAttempts) {
            attempts++;
            
            // Get any proxy - tests LIVE when connecting!
            const proxy = this.proxyManager.getAnyProxy();
            if (!proxy) {
                // Refetch if empty
                this.logger.info('[ProxyManager] Refetching proxies...');
                await this.proxyManager.fetchAndValidate();
                await this._sleep(2000);
                continue;
            }
            
            this.logger.info(`[ProxyManager] Attempt ${attempts}: Trying ${proxy.address} (${proxy.type})`);
            
            try {
                const { SocksProxyAgent } = require('socks-proxy-agent');
                const proxyUrl = `${proxy.type}://${proxy.address}`;
                const agent = new SocksProxyAgent(proxyUrl);
                
                // Set global proxy env vars for ALL http/https requests
                process.env.HTTP_PROXY = proxyUrl;
                process.env.HTTPS_PROXY = proxyUrl;
                // Also try setting for global-agent if available
                try { require('global-agent').bootstrap(); } catch(e) {}
                
                // Use socks-proxy-agent for proper proxy routing!
                const options = {
                    ...botOptions,
                    host: this.config.server.host,
                    port: this.config.server.port,
                    connectTimeout: 30000,
                    agent: agent
                };
                
                this.logger.info(`[ProxyManager] → ${options.host}:${options.port} via SOCKS agent ${proxy.address}`);
                
                this.bot = mineflayer.createBot(options);
                
                // Wait for login
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        this.bot.quit();
                        reject(new Error('Login timeout'));
                    }, 25000);
                    
                    this.bot.once('login', () => {
                        clearTimeout(timeout);
                        this.currentProxy = proxy.address;
                        this.proxyManager.recordResult(proxy.address, true, proxy.latency);
                        
                        // Get socket, verify proxy is being used
                        try {
                            const socket = this.bot._client.socket;
                            const remoteAddr = socket.remoteAddress;
                            this.logger.info(`[ProxyManager] ✅ Connected through proxy ${proxy.address}`);
                            this.logger.info(`[ProxyManager] Connection IP: ${remoteAddr}`);
                            
                            // STRICT: Reject if shows home IP - NEVER allow direct connection!
                            if (this.homeIP && remoteAddr === this.homeIP) {
                                this.logger.error(`[ProxyManager] 🚫 BLOCKED - Home IP (${remoteAddr}) detected! Rejecting connection.`);
                                this.bot.quit();
                                this.proxyManager.recordResult(proxy.address, false);
                                reject(new Error('Home IP detected - blocked'));
                                return;
                            }
                            
                            this.logger.info(`[ProxyManager] 🔒 Proxy active - different IP verified!`);
                            
                            // Add aggressive periodic check (every 10s) to catch IP leaks early
                            this.lastVerifiedIP = remoteAddr;
                            this.proxyCheckInterval = setInterval(() => {
                                if (!this.bot || !this.bot._client || !this.bot._client.socket) return;
                                
                                const currentIP = this.bot._client.socket.remoteAddress;
                                this.logger.info(`[ProxyManager] Active check - ${currentIP}`);
                                
                                // STRICT: If IP becomes home IP → kill connection immediately!
                                if (this.homeIP && currentIP === this.homeIP) {
                                    this.logger.error(`[ProxyManager] 🚫 IP LEAK DETECTED! Home IP (${currentIP}) - killing connection.`);
                                    this.bot.quit();
                                    this._handleDisconnect('IP leak to home IP detected');
                                    return;
                                }
                                
                                // Warn if IP changed to different proxy
                                if (this.lastVerifiedIP && currentIP !== this.lastVerifiedIP) {
                                    this.logger.warn(`[ProxyManager] ⚠️ IP changed from ${this.lastVerifiedIP} to ${currentIP}`);
                                    this.lastVerifiedIP = currentIP;
                                }
                            }, 10000);
                            
                        } catch(e) {
                            this.logger.info(`[ProxyManager] Could not verify socket`);
                        }
                        
                        this._setupBotEvents();
                        resolve();
                    });
                    
                    this.bot.once('error', (err) => {
                        clearTimeout(timeout);
                        this.proxyManager.recordResult(proxy.address, false);
                        reject(err);
                    });
                });
                
                return; // Connected!
                
            } catch (err) {
                this.logger.warn(`[ProxyManager] ❌ ${proxy.address} failed: ${err.message}`);
                this.proxyManager.recordResult(proxy.address, false);
                
                // Brief pause, then try next
                await this._sleep(300);
                continue;
            }
        }
        
        // All attempts exhausted - retry with fresh proxies (with limit)
        this.proxyRetryCount++;
        if (this.proxyRetryCount > this.proxyMaxRetries) {
            this.logger.error('[ProxyManager] Max retries exceeded, giving up');
            this._onFatalError(new Error('Proxy connection failed after max retries'));
            return;
        }
        
        const backoffMs = Math.min(3000 * Math.pow(2, this.proxyRetryCount), 30000);
        this.logger.error(`[ProxyManager] All proxies tried (retry ${this.proxyRetryCount}/${this.proxyMaxRetries}), refetching in ${backoffMs}ms...`);
        setTimeout(() => this._connectWithProxy(botOptions), backoffMs);
    }
    
    async _tryProxy(proxy, botOptions, attemptNum) {
        this.logger.info(`[ProxyManager] Attempt ${attemptNum}: Trying ${proxy.address} (${proxy.type})`);
        
        try {
            const { SocksProxyAgent } = require('socks-proxy-agent');
            const agent = new SocksProxyAgent(`${proxy.type}://${proxy.address}`);
            
            // KEEP host and port - they are the TARGET server!
            // The agent handles routing THROUGH the proxy TO this target
            const options = {
                ...botOptions,
                agent: agent
            };
            
            this.logger.info(`[ProxyManager] Connecting via ${proxy.address} → ${options.host}:${options.port}`);
            
            this.bot = mineflayer.createBot(options);
            
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    this.bot.quit();
                    reject(new Error('Login timeout'));
                }, 30000);
                
                this.bot.once('login', () => {
                    clearTimeout(timeout);
                    this.currentProxy = proxy.address;
                    this.proxyManager.recordResult(proxy.address, true, proxy.latency);
                    this.logger.info(`[ProxyManager] ✅ Connected via ${proxy.address}!`);
                    this._setupBotEvents();
                    resolve();
                });
                
                this.bot.once('error', (err) => {
                    clearTimeout(timeout);
                    this.proxyManager.recordResult(proxy.address, false);
                    reject(err);
                });
            });
        } catch (err) {
            this.logger.warn(`[ProxyManager] ❌ ${proxy.address} failed: ${err.message}`);
            this.proxyManager.recordResult(proxy.address, false);
            
            await this._sleep(500);
            await this._connectWithProxy(botOptions);
        }
    }
    
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
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
      
      // Check if kicked for IP-related reasons
      if (reason && reason.includes('ip')) {
        this.logger.warn('[ProxyManager] Kicked due to IP issue - forcing reconnect with proxy');
        // Force proxy mode if USE_PROXY was set
      }
      
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
        
        // Auto-enable addon if it matches current mode
        // Special case: a1-bot addon should auto-enable when mode is "pvp"
        if ((name === this.currentMode || (this.currentMode === 'pvp' && name === 'a1-bot')) && addon.enable) {
          setTimeout(() => {
            addon.enable();
            this.logger.info(`Auto-enabled ${name} mode addon`);
          }, 500);
        }
      } catch (err) {
        this.logger.error(`Failed to initialize addon ${name}:`, err.message);
      }
    }
    
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
    
    // Clear proxy checking interval
    if (this.proxyCheckInterval) {
      clearInterval(this.proxyCheckInterval);
      this.proxyCheckInterval = null;
    }
    
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
    
    // Preserve proxy mode if was using proxy
    if (this.usingProxy) {
      this.logger.info('[ProxyManager] Reconnecting WITH proxy...');
      // USE_PROXY stays in env, _connect() will check it
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
    
    // Clear proxy checking interval
    if (this.proxyCheckInterval) {
      clearInterval(this.proxyCheckInterval);
      this.proxyCheckInterval = null;
    }
    
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
  
  // Save PID for tracking
  const os = require('os');
  const PID_FILE = path.join(os.tmpdir(), 'pvp-bot-pids.json');
  let pids = [];
  if (fs.existsSync(PID_FILE)) {
    pids = JSON.parse(fs.readFileSync(PID_FILE, 'utf8'));
  }
  pids.push(process.pid);
  fs.writeFileSync(PID_FILE, JSON.stringify(pids));
  
  const engine = new BotEngine(config);
  
  // Addons are auto-loaded in constructor based on CONFIG.json
  engine.logger.info(`[Engine] Addons registered: ${Array.from(engine.addons.keys()).join(', ')}`);
  
  engine.start();
}

module.exports = BotEngine;
