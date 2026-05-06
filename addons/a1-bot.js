class A1BotAddon {
  constructor() {
    this.name = 'a1-bot';
    this.bot = null;
    this.engine = null;
    this.logger = null;
    this.enabled = false;
    
    // From a1-bot.js
    this.following = false;
    this.master = null;
    this.pathfinder = null;
    
    // From ultimate-a1.js
    this.mode = 'follow'; // follow, combat, crystal, pvpr, pvpe, survival, pvm, pve
    this.masterEntity = null;
    this.combatEnabled = false;
    this.crystalMode = false;
    this.crystalHotbar = 9;
    this.crystalPlaceDelay = 500;
    this.lastCrystalTime = 0;
    this.autoAttack = false;
    this.attackCooldown = 0;
    this.goals = null;
    this.lastJumpTime = 0;
    
    // From soldier.js
    this.states = ['idle', 'following', 'guarding', 'attacking', 'gathering', 'building', 'fleeing', 'patrolling', 'commanded_task'];
    this.currentState = 'idle';
    this.currentTask = null;
    this.currentTarget = null;
    this.commandPrefix = '!soldier';
    this.commandHandler = null;
    this.taskManager = null;
    this.actionExecutor = null;
    this.botIntelligence = null;
    
    // From pvp.js.backup + pvp.js
    this.attackRange = 4;
    this.cps = 8;
    this.lastAttack = 0;
    this.targets = new Map();
    this.enableCrits = true;
    this.enableStrafe = true;
    this.enableWTap = true;
    this.enableAntiKB = true;
    this.enableWeaponSwitch = true;
    this.autoHeal = true;
    this.healThreshold = 10;
    this.strafeAngle = 0;
    
    // Advanced PvP system (from pvp.js)
    this.advancedPvp = null;
    this.useAdvanced = false;
    this.advancedInitAttempted = false;
    
    // Target tracking
    this.currentTarget = null;
    this.targetLostTime = 0;
    this.targetTimeout = 1000;
    this.chaseRange = 32;
    
    // Response timing
    this.lastPhysicsTick = 0;
    this.physicsTickInterval = 50;
    
    // Friendly fire
    this.friendlyFire = false;
    this.friendlyBots = new Set();
    
    // Follow/Protect states
    this.isFollowing = false;
    this.isProtecting = false;
    this.followTarget = null;
    
    // Pathfinder
    this.pathfinderLoaded = false;
    
    // Combat improvements
    this.reactionTime = 50 + Math.floor(Math.random() * 150);
    this.lastReactionCheck = 0;
    this.attackCooldown = 0;
    this.skillCooldowns = {
      strafe: 0,
      block: 0,
      omen: 0
    };
    this.lastAttackTime = 0;
    
    // Tactical modes
    this.tacticModes = {
      aggressive: { sprint: true, strafe: 0.8, backoff: 0.2, description: 'All-out attack' },
      defensive: { sprint: false, strafe: 0.5, backoff: 0.8, description: 'Play it safe' },
      hitAndRun: { sprint: true, strafe: 0.3, backoff: 0.6, description: 'Quick hits then retreat' },
      surround: { sprint: true, strafe: 1.0, backoff: 0.1, description: 'Circle target' },
      flank: { sprint: true, strafe: 0.2, backoff: 0.3, description: 'Get behind target' }
    };
    this.currentTacticMode = 'agressive';
    this.tacticSwitchThreshold = 10;
    
    // Combat stats
    this.combatStats = {
      hits: 0,
      misses: 0,
      damageDealt: 0,
      damageTaken: 0,
      kills: 0,
      deaths: 0
    };
    
    // Realistic gaming name generator
    this._realisticNames = [
      'BenderHero', 'DexEasy', 'Xeazy', 'ProGamer', 'NoobSlayer',
      'L337Gamer', 'XxTryHardxx', 'DarkKnight', 'ShadowFiend',
      'QuickScope', 'CamperLord', 'RusherX', 'Tactical', 'Aimbot99',
      'VictoryX', 'Destroyer', 'WarriorX', 'StealthMode', 'FragMaster',
      'Ghost', 'Phantom', 'Viper', 'Blaze', 'Storm', 'Thunder', 'Lightning',
      'Shadow', 'Blade', 'Arrow', 'Hunter', 'Predator', 'Sniper', 'Commando',
      'Ranger', 'Titan', 'Phoenix', 'Griffin', 'Dragon', 'Wolf', 'Bear',
      'Eagle', 'Falcon', 'Cobra', 'Python', 'Strike', 'Blitz'
    ];
  }
  
  // ==================== INITIALIZATION ====================
  
  init(bot, engine) {
    this.bot = bot;
    this.engine = engine;
    this.logger = engine.getLogger();
    
    // From soldier.js - get dependencies
    this.commandHandler = engine.commandHandler;
    this.taskManager = engine.getTaskManager ? engine.getTaskManager() : null;
    this.pathfinder = bot.pathfinder;
    
    // From soldier.js - access other addons
    if (engine.getAddon) {
      this.actionExecutor = engine.getAddon('player')?.actionExecutor;
      this.botIntelligence = engine.getAddon('player')?.botIntelligence;
    }
    
    if (!this.actionExecutor) {
      this.logger.warn('[A1] ActionExecutor not found. Some actions may fail.');
    }
    if (!this.botIntelligence) {
      this.logger.warn('[A1] BotIntelligence not found. AI decision making might be limited.');
    }
    if (!this.pathfinder) {
      this.logger.warn('[A1] Pathfinder not found via bot.pathfinder. Will try to load.');
    }
    
    // From pvp.js - load config
    const config = engine.config.pvpMode || engine.config.combat || {};
    this.attackRange = config.attackRange || this.attackRange;
    this.cps = config.cps || this.cps;
    this.enableCrits = config.enableCrits !== false;
    this.enableStrafe = config.enableStrafe !== false;
    this.enableWTap = config.enableWTap !== false;
    this.enableAntiKB = config.enableAntiKB !== false;
    this.enableWeaponSwitch = config.enableWeaponSwitch !== false;
    this.autoHeal = config.autoHeal !== false;
    this.healThreshold = config.healThreshold || this.healThreshold;
    
    // Initialize combat stats
    this.combatStats = {
      hits: 0,
      misses: 0,
      damageDealt: 0,
      damageTaken: 0,
      kills: 0,
      deaths: 0
    };
    
    // Friendly fire
    this.friendlyFire = engine.config.friendlyFire?.enabled || false;
    
    // From ultimate-a1.js - setup pathfinder with custom movements
    this._setupPathfinder();
    
    // From pvp.js - initialize advanced PvP system if available
    this._initAdvancedPvP(config);
    
    // Load pathfinder for follow/protect (from pvp.js)
    this._loadPathfinder();
    
    // From soldier.js - register commands
    this._registerCommands();
    
    // Setup event listeners (combined from all files)
    this._setupEventListeners();
    
    this.logger.info('[A1] Initialized - Mode: ' + this.mode + 
                    (this.useAdvanced ? ' (Advanced PvP)' : ' (Basic PvP)') +
                    ' | Range: ' + this.attackRange + ' | CPS: ' + this.cps);
    
    // Enable addon if the current mode matches
    if (engine.currentMode === this.name || engine.currentMode === 'soldier') {
      setTimeout(() => {
        this.enable();
      }, 1000);
    }
  }
  
  _setupPathfinder() {
    try {
      const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
      this.goals = goals;
      
      if (!this.bot.pathfinder) {
        this.bot.loadPlugin(pathfinder);
      }
      
      const mcData = require('minecraft-data')(this.bot.version);
      const movements = new Movements(this.bot, mcData, {
        canOpenDoors: true,
        canBreakDoors: true,
        canDig: true,
        avoidWater: false,
        swimUpwards: true,
        placeholderMaxDropAndBreak: 100
      });
      
      if (this.bot.pathfinder) {
        this.bot.pathfinder.setMovements(movements);
      }
      
      this.pathfinderLoaded = true;
      this.logger.info('[A1] Pathfinder ready with custom movements');
    } catch (err) {
      this.logger.error('[A1] Pathfinder setup failed:', err.message);
    }
  }
  
  _loadPathfinder() {
    if (this.pathfinderLoaded) return;
    
    try {
      if (this.bot.pathfinder) {
        this.pathfinderLoaded = true;
        return;
      }
      
      const pathfinderModule = require('mineflayer-pathfinder');
      const pathfinder = pathfinderModule.default || pathfinderModule.pathfinder || pathfinderModule;
      
      if (typeof pathfinder !== 'function') {
        this.logger.warn('[A1] Pathfinder export is not a function, trying alternative...');
        if (pathfinderModule.pathfinder && typeof pathfinderModule.pathfinder === 'function') {
          this.bot.loadPlugin(pathfinderModule.pathfinder);
        } else {
          throw new Error('Cannot load pathfinder - invalid export');
        }
      } else {
        this.bot.loadPlugin(pathfinder);
      }
      
      const checkReady = () => {
        if (this.bot.pathfinder) {
          this.pathfinderLoaded = true;
          this.logger.info('[A1] Pathfinder loaded and ready');
        } else {
          setTimeout(checkReady, 100);
        }
      };
      setTimeout(checkReady, 100);
    } catch (e) {
      this.logger.warn('[A1] Pathfinder not available: ' + e.message);
      this.pathfinderLoaded = false;
    }
  }
  
  _initAdvancedPvP(config) {
    if (this.advancedInitAttempted) return;
    this.advancedInitAttempted = true;
    
    try {
      if (typeof require !== 'undefined') {
        const customPvp = require('@nxg-org/mineflayer-custom-pvp');
        if (customPvp && this.bot) {
          customPvp.default(this.bot);
          
          if (this.bot.swordpvp) {
            this._configureAdvancedPvP(config);
            this.useAdvanced = true;
            this.advancedPvp = this.bot.swordpvp;
            this.logger.info('[A1] Advanced PvP system initialized');
          }
        }
      }
    } catch (e) {
      this.logger.warn('[A1] Advanced PvP not available, using basic: ' + e.message);
      this.useAdvanced = false;
    }
  }
  
  _configureAdvancedPvP(config) {
    if (!this.bot || !this.bot.swordpvp) return;
    
    const swordConfig = this.bot.swordpvp.options;
    
    swordConfig.cps = Math.min(12, this.cps);
    
    swordConfig.critConfig = swordConfig.critConfig || {};
    swordConfig.critConfig.enabled = true;
    swordConfig.critConfig.mode = 'packet';
    swordConfig.critConfig.attemptRange = 3;
    swordConfig.critConfig.reaction = swordConfig.critConfig.reaction || {};
    swordConfig.critConfig.reaction.enabled = false;
    
    swordConfig.strafeConfig = swordConfig.strafeConfig || {};
    swordConfig.strafeConfig.enabled = true;
    swordConfig.strafeConfig.mode = swordConfig.strafeConfig.mode || {};
    swordConfig.strafeConfig.mode.mode = 'intelligent';
    swordConfig.strafeConfig.mode.maxOffset = Math.PI * 2;
    swordConfig.strafeConfig.mode.followEntity = true;
    
    swordConfig.tapConfig = swordConfig.tapConfig || {};
    swordConfig.tapConfig.enabled = true;
    swordConfig.tapConfig.mode = 'wtap';
    swordConfig.tapConfig.delay = 0;
    
    swordConfig.rotateConfig = swordConfig.rotateConfig || {};
    swordConfig.rotateConfig.smooth = true;
    swordConfig.rotateConfig.mode = 'constant';
    swordConfig.rotateConfig.lookAtHidden = true;
    
    swordConfig.followConfig = swordConfig.followConfig || {};
    swordConfig.followConfig.mode = 'jump';
    swordConfig.followConfig.distance = this.attackRange;
    swordConfig.followConfig.predictTicks = 10;
    swordConfig.followConfig.keepDistance = true;
    
    swordConfig.shieldConfig = swordConfig.shieldConfig || {};
    swordConfig.shieldConfig.enabled = true;
    swordConfig.shieldConfig.breakShield = true;
    swordConfig.shieldConfig.switchToAxe = true;
    swordConfig.shieldConfig.mode = 'blatant';
    
    swordConfig.onHitConfig = swordConfig.onHitConfig || {};
    swordConfig.onHitConfig.enabled = true;
    swordConfig.onHitConfig.mode = 'backoff';
    swordConfig.onHitConfig.kbCancel = swordConfig.onHitConfig.kbCancel || {};
    swordConfig.onHitConfig.kbCancel.enabled = true;
    swordConfig.onHitConfig.kbCancel.mode = 'jump';
    
    swordConfig.genericConfig = swordConfig.genericConfig || {};
    swordConfig.genericConfig.viewDistance = 128;
    swordConfig.genericConfig.attackRange = this.attackRange;
    swordConfig.genericConfig.tooCloseRange = Math.max(0.5, this.attackRange - 2);
    swordConfig.genericConfig.missChancePerTick = 0.0;
    swordConfig.genericConfig.enemyReach = 4;
    swordConfig.genericConfig.hitThroughWalls = false;
    
    this.logger.info('[A1] Advanced PvP configured for maximum aggression');
  }
  
  _registerCommands() {
    if (!this.commandHandler) {
      this.logger.error('[A1] CommandHandler not available. Cannot register commands.');
      return;
    }
    
    // From soldier.js - register !soldier commands
    this.commandHandler.registerCommand(this.commandPrefix, (username, args) => {
      const action = args[0]?.toLowerCase();
      const params = args.slice(1);
      return this.handleCommand(username, action, params);
    });
    this.logger.info(`[A1] Registered soldier commands with prefix: ${this.commandPrefix}`);
  }
  
_setupEventListeners() {
    
    // Physics tick handler (combined from pvp.js and ultimate-a1)
    this.bot.on('physicsTick', () => {
      this._combatLoop();
      this.update(); // From ultimate-a1
    });
    
    // Death handler
    this.bot.on('death', () => this._onDeath());
    
    // Entity hurt handler
    this.bot.on('entityHurt', (entity) => this._onEntityHurt(entity));
    
    this.logger.info('[A1] Event listeners setup complete');
  }
  
  // ==================== ENABLE/DISABLE ====================
  
  enable() {
    if (this.enabled) return;
    this.enabled = true;
    
    this.logger.info('[A1] Mode activated - ' + this.mode);
    this._setState('idle');
    
    if (this.taskManager) {
      this.taskManager.resume();
    }
  }
  
  disable() {
    if (!this.enabled) return;
    this.enabled = false;
    
    this.logger.info('[A1] Mode deactivated');
    
    if (this.taskManager) {
      this.taskManager.pause();
    }
    
    this._setState('idle');
    this.currentTarget = null;
    
    if (this.bot) {
      this.bot.clearControlStates();
    }
    
    // Stop PvP
    this.currentTarget = null;
    this.targetLostTime = 0;
    if (this.advancedPvp) {
      try { this.advancedPvp.stop(); } catch(e) {}
    }
    this.targets.clear();
    
    const controls = ['forward', 'back', 'left', 'right', 'jump', 'sprint'];
    controls.forEach(ctrl => {
      try { this.bot.setControlState(ctrl, false); } catch(e) {}
    });
    
    this._stopFollow();
    this._stopProtect();
    
    this.logger.info('[A1] All systems stopped');
  }
  
  // ==================== MASTER/PLAYER CHECKS ====================
  
  isMaster(username) {
    return this.master && username.toLowerCase() === this.master.toLowerCase();
  }
  
  // ==================== FOLLOW/COMBAT MODES ====================
  
  setMode(newMode) {
    this.mode = newMode;
    this.bot?.chat(`Mode: ${newMode}`);
    this.logger.info(`[A1] Mode set to: ${newMode}`);
  }
  
  stopAll() {
    this.following = false;
    this.combatEnabled = false;
    this.crystalMode = false;
    this.autoAttack = false;
    this.target = null;
    
    if (this.bot?.pathfinder) {
      this.bot.pathfinder.setGoal(null);
    }
    this.bot?.clearControlStates();
  }
  
  showHelp() {
    this.bot.chat('Commands: !follow, !stop, !pvp, !crystal, !pvm, !pve, !attack, !help');
    this.bot.chat('Soldier: !soldier follow/guard/attack/gather/build/go/patrol/status/flee/stop/help');
  }
  
  // ==================== COMBAT LOOP ====================
  
  _combatLoop() {
    if (!this.enabled) return;
    
    const now = Date.now();
    if (now - this.lastPhysicsTick < this.physicsTickInterval) {
      return;
    }
    this.lastPhysicsTick = now;
    
    if (now - this.lastReactionCheck < this.reactionTime) {
      return;
    }
    this.lastReactionCheck = now;
    
    // ALWAYS use PvP engine as PRIMARY system
    if (this.useAdvanced && this.advancedPvp && this.bot.entity) {
      this._advancedCombatLoop();
    } else {
      this._basicCombatLoop();
    }
    
    // Handle follow/protect behaviors
    if (this.isFollowing || this.isProtecting) {
      this._handleFollowProtect();
    }
    
    // Always run tactics and smart decision making
    this._updateTactics();
    this._smartDecisionMaking();
  }
  
  _advancedCombatLoop() {
    if (!this.enabled || !this.bot.entity) return;
    
    try {
      const enemies = this._findEnemies();
      this._updateTarget(enemies);
      
      if (this.currentTarget && this.currentTarget.entity) {
        try {
          this.advancedPvp.attack(this.currentTarget.entity);
        } catch(e) {
          if (!this.advancedPvp.isAttacking) {
            this.advancedPvp.attack(this.currentTarget.entity);
          }
        }
        
        this._enhancePursuit(this.currentTarget);
        this.bot.setControlState('sprint', true);
        
        if (this.enableWTap && this.lastAttackTime && Date.now() - this.lastAttackTime < 300) {
          this.bot.setControlState('forward', false);
          setTimeout(() => this.bot.setControlState('forward', true), 50);
        }
      } else {
        if (this.advancedPvp && this.advancedPvp.isAttacking) {
          try { this.advancedPvp.stop(); } catch(e) {}
        }
      }
      
      if (this.autoHeal && this.bot.health < this.healThreshold + 5) {
        this._heal();
      }
    } catch (e) {
      this.logger.warn('[A1] Advanced combat failed, falling back to basic: ' + e.message);
      this.useAdvanced = false;
      this._basicCombatLoop();
    }
  }
  
  _enhancePursuit(target) {
    if (!target || !target.entity) return;
    
    const dist = this.bot.entity.position.distanceTo(target.entity.position);
    
    this.bot.setControlState('sprint', true);
    
    if (dist > 1) {
      this.bot.setControlState('forward', true);
      this.bot.setControlState('sprint', true);
    } else if (dist < 0.5) {
      this.bot.setControlState('forward', false);
      this.bot.setControlState('back', true);
      setTimeout(() => {
        this.bot.setControlState('back', false);
        this.bot.setControlState('forward', true);
        this.bot.setControlState('sprint', true);
      }, 150);
    }
    
    if (this.bot.entity.onGround && Math.random() < 0.5) {
      this.bot.setControlState('sprint', true);
      this.bot.setControlState('jump', true);
      setTimeout(() => {
        if (this.bot) this.bot.setControlState('jump', false);
      }, 250);
    }
    
    if (this.enableAntiKB && this.lastAttackTime && Date.now() - this.lastAttackTime < 200) {
      this.bot.setControlState('sprint', false);
      setTimeout(() => {
        if (this.bot) this.bot.setControlState('sprint', true);
      }, 50);
    }
    
    if (Math.random() < 0.25) {
      const strafe = Math.random() > 0.5 ? 'left' : 'right';
      this.bot.setControlState(strafe, true);
      setTimeout(() => {
        if (this.bot) this.bot.setControlState(strafe, false);
      }, 250 + Math.random() * 200);
    }
    
    if (this.enableWTap && this.lastAttackTime && Date.now() - this.lastAttackTime < 300) {
      this.bot.setControlState('forward', false);
      setTimeout(() => {
        if (this.bot) this.bot.setControlState('forward', true);
        setTimeout(() => {
          if (this.bot) this.bot.setControlState('forward', false);
          setTimeout(() => {
            if (this.bot) this.bot.setControlState('forward', true);
          }, 30);
        }, 50);
      }, 30);
    }
  }
  
  _updateTarget(enemies) {
    const now = Date.now();
    
    if (enemies.length === 0) {
      if (this.currentTarget) {
        if (this.targetLostTime === 0) {
          this.targetLostTime = now;
          this.logger.debug('[A1] Target lost, waiting...');
        } else if (now - this.targetLostTime > 5000) {
          this.targetLostTime = 0;
          this.currentTarget = null;
          if (this.advancedPvp && this.advancedPvp.isAttacking) {
            try { this.advancedPvp.stop(); } catch(e) {}
          }
          this.logger.debug('[A1] Gave up on lost target');
        }
      }
      return;
    }
    
    let bestTarget = this._selectBestTarget(enemies);
    
    if (this.useAdvanced && this.advancedPvp) {
      return;
    }
    
    if (bestTarget && bestTarget.entity) {
      const entity = bestTarget.entity;
      if (entity.velocity) {
        const now = Date.now();
        if (!entity._lastVelocityUpdate || now - entity._lastVelocityUpdate > 100) {
          entity._lastVelocity = entity.velocity;
          entity._lastVelocityUpdate = now;
        }
        
        const accelX = entity.velocity.x - (entity._lastVelocity?.x || 0);
        const accelZ = entity.velocity.z - (entity._lastVelocity?.z || 0);
        
        bestTarget._predictedPos = entity.position.offset(
          entity.velocity.x * 2 + accelX * 0.5,
          0,
          entity.velocity.z * 2 + accelZ * 0.5
        );
        
        entity._lastVelocity = { x: entity.velocity.x, z: entity.velocity.z };
        entity._lastVelocityUpdate = now;
      }
    }
    
    if (!this.currentTarget || 
        (this.currentTarget.entity && bestTarget.entity && 
         this.currentTarget.entity.id !== bestTarget.entity.id &&
         this._calculateTargetScore(bestTarget) > this._calculateTargetScore(this.currentTarget) + 20)) {
      this.currentTarget = bestTarget;
      this.targetLostTime = 0;
      this.logger.info('[A1] New target acquired: ' + (bestTarget.username || bestTarget.entity?.username));
    }
  }
  
  _selectBestTarget(enemies) {
    if (enemies.length === 0) return null;
    
    return enemies.reduce((best, current) => {
      const bestScore = this._calculateTargetScore(best);
      const currentScore = this._calculateTargetScore(current);
      return currentScore > bestScore ? current : best;
    }, enemies[0]);
  }
  
  _calculateTargetScore(player) {
    if (!player || !player.entity) return -1;
    
    const dist = this.bot.entity.position.distanceTo(player.entity.position);
    const health = player.entity.health || 20;
    const hunger = player.entity.food || 20;
    const armor = this._getArmorValue(player.entity);
    
    let distanceScore = 0;
    if (dist < 2) {
      distanceScore = 50;
    } else if (dist <= this.attackRange) {
      distanceScore = 100 - dist * 10;
    } else if (dist <= this.chaseRange) {
      distanceScore = 30 - (dist - this.attackRange) * 2;
    } else {
      return -1;
    }
    
    const healthScore = (20 - health) * 8;
    const hungerScore = (20 - hunger) * 2;
    const armorPenalty = armor * 3;
    const aggressionScore = this._getAggressionScore(player);
    const weaponThreat = this._getWeaponThreat(player.entity) * 1.5;
    const opportunityScore = this._getOpportunityScore(player);
    const environmentalScore = this._getEnvironmentalAdvantageScore(player.entity);
    
    const finalScore = 
      (distanceScore * 0.10) +
      (healthScore * 0.25) +
      (hungerScore * 0.05) +
      (armorPenalty * 0.15) +
      (aggressionScore * 0.10) +
      (weaponThreat * 0.15) +
      (opportunityScore * 0.20) +
      (environmentalScore * 0.15);
    
    return finalScore;
  }
  
  _getArmorValue(entity) {
    if (!entity || !entity.getEquipment) return 0;
    try {
      const armor = entity.getEquipment('armor');
      return armor ? armor.defense || 0 : 0;
    } catch(e) {
      return 0;
    }
  }
  
  _getWeaponThreat(entity) {
    if (!entity || !entity.getEquipment) return 0;
    try {
      const weapon = entity.getEquipment('hand');
      if (!weapon) return 0;
      
      const damageMap = {
        'diamond_sword': 15,
        'iron_sword': 10,
        'stone_sword': 7,
        'wooden_sword': 5,
        'netherite_sword': 20
      };
      
      return damageMap[weapon.name] || 0;
    } catch(e) {
      return 0;
    }
  }
  
  _getAggressionScore(player) {
    if (!player || !player.entity) return 0;
    
    const now = Date.now();
    
    if (this.currentTarget && this.currentTarget.entity?.id === player.entity.id) {
      return 50;
    }
    
    try {
      const botPos = this.bot.entity.position;
      const playerPos = player.entity.position;
      const dx = botPos.x - playerPos.x;
      const dz = botPos.z - playerPos.z;
      const dist = Math.sqrt(dx*dx + dz*dz);
      
      if (dist < 5 && player.entity.yaw !== undefined) {
        const playerYaw = player.entity.yaw;
        const targetYaw = Math.atan2(dz, dx);
        const diff = Math.abs(playerYaw - targetYaw);
        if (diff < Math.PI/6) {
          return 30;
        }
      }
    } catch(e) {}
    
    return 0;
  }
  
  _getOpportunityScore(player) {
    const dist = this.bot.entity.position.distanceTo(player.entity.position);
    
    let isolationScore = 0;
    const nearbyAllies = this._countNearbyAllies(player.entity.position);
    if (nearbyAllies === 0) {
      isolationScore = 30;
    } else if (nearbyAllies <= 2) {
      isolationScore = 15;
    }
    
    const distractionScore = this._isDistracted(player) ? 20 : 0;
    const visibilityScore = this._getVisibilityScore(player.entity) ? 15 : 0;
    
    return isolationScore + distractionScore + visibilityScore;
  }
  
  _countNearbyAllies(position) {
    let count = 0;
    const range = 10;
    
    for (const username in this.bot.players) {
      const player = this.bot.players[username];
      if (!player || !player.entity) continue;
      if (username === this.bot.username) continue;
      
      const dist = player.entity.position.distanceTo(position);
      if (dist <= range) {
        if (this.friendlyFire || 
            username === this.engine.config.owner?.username ||
            this.friendlyBots.has(username)) {
          count++;
        }
      }
    }
    return count;
  }
  
  _isDistracted(player) {
    return Math.random() > 0.7;
  }
  
  _getVisibilityScore(entity) {
    return Math.random() > 0.6;
  }
  
  _getEnvironmentalAdvantageScore(entity) {
    if (!entity) return 0;
    
    const pos = entity.position;
    let score = 0;
    
    const edgeThreshold = 2;
    if (pos.x < edgeThreshold || pos.z < edgeThreshold || 
        pos.x > this.bot.worldSize?.width - edgeThreshold || 
        pos.z > this.bot.worldSize?.depth - edgeThreshold) {
      score += 20;
    }
    
    const groundY = this.bot.world?.getHighestBlockAt(new this.bot.Vec3(pos.x, 0, pos.z))?.y || 64;
    if (pos.y < groundY - 2) {
      score += 25;
    }
    
    const hazardCheck = this._checkNearbyHazards(entity);
    score += hazardCheck * 10;
    
    return Math.min(score, 50);
  }
  
  _checkNearbyHazards(entity) {
    if (!entity || !entity.entity) return 0;
    
    const pos = entity.entity.position;
    let hazards = 0;
    
    const checkRange = 3;
    for (let dx = -checkRange; dx <= checkRange; dx++) {
      for (let dz = -checkRange; dz <= checkRange; dz++) {
        for (let dy = -2; dy <= 2; dy++) {
          if (Math.random() > 0.9) {
            hazards++;
          }
        }
      }
    }
    
    return Math.min(hazards / 10, 5);
  }
  
  _basicCombatLoop() {
    if (!this.enabled) return;
    
    const enemies = this._findEnemies();
    if (enemies.length > 0) {
      const target = enemies[0];
      
      this.bot.setControlState('sprint', true);
      
      const dist = this.bot.entity.position.distanceTo(target.entity.position);
      
      if (dist > 1) {
        this.bot.setControlState('forward', true);
        this.bot.setControlState('sprint', true);
      } else if (dist < 0.5) {
        this.bot.setControlState('back', true);
        setTimeout(() => {
          this.bot.setControlState('back', false);
          this.bot.setControlState('forward', true);
          this.bot.setControlState('sprint', true);
        }, 150);
      }
      
      this._attack(target);
    } else {
      this.bot.setControlState('sprint', false);
      this.bot.setControlState('forward', false);
    }
    
    if (this.autoHeal && this.bot.health < this.healThreshold + 5) {
      this._heal();
    }
  }
  
  _findEnemies() {
    if (!this.bot.entity) return [];
    
    const range = this.chaseRange;
    const enemies = [];
    const owner = this.engine.config.owner?.username;
    
    for (const username in this.bot.players) {
      const player = this.bot.players[username];
      if (!player.entity) continue;
      if (username === this.bot.username) continue;
      if (!this.friendlyFire && username === owner) continue;
      if (!this.friendlyFire && this.friendlyBots.has(username)) continue;
      
      const dist = this.bot.entity.position.distanceTo(player.entity.position);
      if (dist <= range) {
        enemies.push(player);
      }
    }
    
    enemies.sort((a, b) => {
      const scoreA = this._calculateTargetScore(a);
      const scoreB = this._calculateTargetScore(b);
      return scoreB - scoreA;
    });
    
    return enemies;
  }
  
  _attack(target) {
    const now = Date.now();
    const minDelay = 1000 / this.cps;
    
    if (now - this.lastAttack < minDelay + this.reactionTime) return;
    this.lastAttack = now;
    this.lastAttackTime = now;
    
    try {
      this.bot.setControlState('sprint', true);
      
      if (target._predictedPos) {
        this.bot.lookAt(target._predictedPos, true);
      } else {
        this.bot.lookAt(target.entity.position, true);
      }
      
      this.bot.attack(target.entity);
      this.combatStats.hits++;
      
      if (this.enableWTap) {
        this.bot.setControlState('forward', false);
        setTimeout(() => {
          if (this.bot) this.bot.setControlState('forward', true);
          setTimeout(() => {
            if (this.bot) this.bot.setControlState('forward', false);
            setTimeout(() => {
              if (this.bot) this.bot.setControlState('forward', true);
            }, 30);
          }, 50);
        }, 50);
      }
    } catch (e) {
      this.combatStats.misses++;
    }
  }
  
  // ==================== SMART DECISION MAKING ====================
  
  _smartDecisionMaking() {
    if (!this.bot.entity) return;
    
    const health = this.bot.health || 20;
    const food = this.bot.food || 20;
    const enemies = this._findEnemies();
    
    if (enemies.length === 0) {
      this.bot.setControlState('sprint', false);
      return;
    }
    
    if (enemies.length > 2 && health < 12) {
      this.logger.info('[A1] Outnumbered (' + enemies.length + ') and low health (' + health + '), retreating!');
      this.bot.setControlState('sprint', true);
      this.bot.setControlState('forward', false);
      this.bot.setControlState('back', true);
      setTimeout(() => this.bot.setControlState('back', false), 1500);
      return;
    }
    
    if (health < 8) {
      if (food > 10) {
        this.logger.info('[A1] Health critical (' + health + '), healing!');
        this._heal();
      } else {
        this.logger.info('[A1] Health critical and no food, retreating!');
        this.bot.setControlState('forward', false);
        this.bot.setControlState('back', true);
        setTimeout(() => this.bot.setControlState('back', false), 1000);
        return;
      }
    }
    
    if (this.currentTarget && this.currentTarget.entity) {
      const dist = this.bot.entity.position.distanceTo(this.currentTarget.entity.position);
      if (dist > this.attackRange * 2) {
        this.logger.info('[A1] Target fleeing, chasing aggressively!');
        this.bot.setControlState('sprint', true);
        this.bot.setControlState('forward', true);
        if (this.bot.entity.onGround) {
          this.bot.setControlState('jump', true);
          setTimeout(() => this.bot.setControlState('jump', false), 100);
        }
      }
    }
    
    if (enemies.length > 1) {
      this.logger.debug('[A1] Multiple enemies (' + enemies.length + '), focusing on weakest');
    }
    
    if (this.currentTarget && this.currentTarget.entity) {
      const armor = this._getArmorValue(this.currentTarget.entity);
      if (armor > 15 && health < 15) {
        this.logger.info('[A1] Target has high armor (' + armor + '), playing defensively');
        this.bot.setControlState('sprint', false);
      }
    }
  }
  
  _updateTactics() {
    if (!this.bot.entity) return;
    
    const health = this.bot.health || 20;
    const food = this.bot.food || 20;
    const enemies = this._findEnemies();
    
    let newMode = this.currentTacticMode;
    
    if (health < 8 && enemies.length > 0) {
      newMode = 'hitAndRun';
    } else if (enemies.length > 2) {
      newMode = 'surround';
    } else if (health < this.tacticSwitchThreshold) {
      newMode = 'defensive';
    } else if (this.currentTarget && this.currentTarget.entity) {
      const dist = this.bot.entity.position.distanceTo(this.currentTarget.entity.position);
      if (dist > 5) {
        newMode = 'flank';
      } else {
        newMode = 'agressive';
      }
    } else {
      newMode = 'agressive';
    }
    
    if (newMode !== this.currentTacticMode) {
      const mode = this.tacticModes[newMode];
      this.currentTacticMode = newMode;
      
      if (this.advancedPvp && this.advancedPvp.options) {
        this.advancedPvp.options.cps = newMode === 'defensive' ? Math.max(4, this.cps - 2) : this.cps;
      }
      
      this.logger.info('[A1] Switching to ' + mode.description + ' (health: ' + health + ')');
    }
    
    if (health < 6 && food > 5) {
      this._heal();
    }
    
    const tactic = this.tacticModes[this.currentTacticMode];
    if (tactic) {
      this.bot.setControlState('sprint', tactic.sprint);
      
      if (Math.random() < tactic.strafe) {
        const strafe = Math.random() > 0.5 ? 'left' : 'right';
        this.bot.setControlState(strafe, true);
        setTimeout(() => {
          if (this.bot) this.bot.setControlState(strafe, false);
        }, 200 + Math.random() * 300);
      }
      
      if (Math.random() < tactic.backoff && this.currentTarget?.entity) {
        const dist = this.bot.entity.position.distanceTo(this.currentTarget.entity.position);
        if (dist < 2) {
          this.bot.setControlState('back', true);
          setTimeout(() => {
            if (this.bot) this.bot.setControlState('back', false);
          }, 200 + Math.random() * 300);
        }
      }
    }
  }
  
  // ==================== HEALING ====================
  
  _heal() {
    try {
      const foods = this.bot.inventory.items().filter(item => 
        item && item.name && (
          item.name.includes('bread') ||
          item.name.includes('apple') ||
          item.name.includes('cooked') ||
          item.name.includes('golden_apple') ||
          item.name.includes('suspicious_stew') ||
          item.name.includes('beetroot_soup') ||
          item.name.includes('mushroom_stew') ||
          item.name.includes('rabbit_stew') ||
          item.name.includes('enchanted_golden_apple') ||
          item.name.includes('beef') ||
          item.name.includes('porkchop') ||
          item.name.includes('chicken') ||
          item.name.includes('mutton') ||
          item.name.includes('rabbit') ||
          item.name.includes('cod') ||
          item.name.includes('salmon') ||
          item.name.includes('baked_potato') ||
          item.name.includes('golden_carrot')
        )
      );
      
      const foodValues = {
        'enchanted_golden_apple': 30,
        'golden_apple': 20,
        'golden_carrot': 14.4,
        'beetroot_soup': 12,
        'mushroom_stew': 12,
        'rabbit_stew': 20,
        'baked_potato': 12,
        'bread': 10,
        'apple': 4.8,
        'beef': 12.8,
        'porkchop': 12.8,
        'chicken': 7.2,
        'mutton': 12.8,
        'rabbit': 10.4,
        'cod': 10.4,
        'salmon': 10.4,
        'suspicious_stew': 10.4
      };
      
      foods.sort((a, b) => {
        const valueA = foodValues[a.name.toLowerCase().replace(/\s+/g, '_')] || 0;
        const valueB = foodValues[b.name.toLowerCase().replace(/\s+/g, '_')] || 0;
        return valueB - valueA;
      });
      
      if (foods.length > 0) {
        this.bot.equip(foods[0], 'hand', err => {
          if (!err) this.bot.consume(() => {});
        });
      }
    } catch(e) {
    }
  }
  
  // ==================== DEATH & DAMAGE HANDLING ====================
  
  _onDeath() {
    this.logger.info('[A1] Died! Respawning...');
    this.combatStats.deaths++;
    this.currentTarget = null;
    this.targetLostTime = 0;
    this._stopFollow();
    this._stopProtect();
    setTimeout(() => {
      try { this.bot.respawn(); } catch(e) {}
    }, 1500);
  }
  
  _onEntityHurt(entity) {
    if (this.isProtecting && this.followTarget) {
      const owner = this.engine.config.owner?.username;
      if (entity.username === owner || (entity.entity && entity.entity.username === owner)) {
        const attacker = this._findNearestEntity(entity.entity || entity);
        if (attacker) {
          this.currentTarget = attacker;
          if (this.useAdvanced && this.advancedPvp) {
            try { this.advancedPvp.attack(attacker.entity); } catch(e) {}
          }
        }
      }
    }
  }
  
  _findNearestEntity(excludeEntity) {
    if (!this.bot.entity) return null;
    
    let nearest = null;
    let nearestDist = Infinity;
    
    for (const username in this.bot.players) {
      const player = this.bot.players[username];
      if (!player.entity || player.entity.id === excludeEntity?.id) continue;
      if (username === this.bot.username) continue;
      
      const dist = this.bot.entity.position.distanceTo(player.entity.position);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = player;
      }
    }
    
    if (this.isProtecting) {
      for (const entity of Object.values(this.bot.entities)) {
        if (!entity || entity.id === excludeEntity?.id) continue;
        if (entity.type !== 'mob' && entity.type !== 'hostile') continue;
        
        const dist = this.bot.entity.position.distanceTo(entity.position);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = { entity: entity, username: entity.username || entity.name };
        }
      }
    }
    
    return nearest;
  }
  
  // ==================== FOLLOW/PROTECT ====================
  
  _startFollow(username) {
    const player = this.bot.players[username];
    if (!player || !player.entity) {
      this.bot.chat('Cannot find player to follow: ' + username);
      this.logger.warn('[A1] Follow failed - player not found: ' + username);
      return false;
    }
    
    if (!this.pathfinderLoaded) {
      this._loadPathfinder();
      if (!this.pathfinderLoaded) {
        this.bot.chat('Pathfinder not available, using simple follow');
      }
    }
    
    this.isFollowing = true;
    this.followTarget = player;
    this.master = username;
    this.logger.info('[A1] Started following: ' + username);
    this.bot.chat('Now following ' + username);
    return true;
  }
  
  _stopFollow() {
    if (!this.isFollowing) return;
    this.isFollowing = false;
    this.followTarget = null;
    this.logger.info('[A1] Stopped following');
    try { this.bot.pathfinder.setGoal(null); } catch(e) {}
  }
  
  _startProtect(username) {
    if (!this._startFollow(username)) return false;
    
    this.isProtecting = true;
    this.logger.info('[A1] Started protecting: ' + username);
    this.bot.chat('Now protecting ' + username);
    return true;
  }
  
  _stopProtect() {
    this.isProtecting = false;
    this.logger.info('[A1] Stopped protecting');
  }
  
  _handleFollowProtect() {
    if (!this.followTarget || !this.followTarget.entity) {
      this._stopFollow();
      this._stopProtect();
      return;
    }
    
    const distToTarget = this.bot.entity.position.distanceTo(this.followTarget.entity.position);
    
    try { this.bot.lookAt(this.followTarget.entity.position); } catch(e) {}
    
    if (this.isProtecting) {
      const threats = this._findThreats();
      if (threats.length > 0) {
        const threat = threats[0];
        this.currentTarget = threat;
        
        if (this.useAdvanced && this.advancedPvp) {
          try { 
            if (!this.advancedPvp.isAttacking) {
              this.advancedPvp.attack(threat.entity);
              this.logger.info('[A1] Protect mode: Attacking threat ' + (threat.username || threat.entity?.name));
            }
            this._enhancePursuit(threat);
          } catch(e) {
            this._attack(threat);
          }
        } else {
          this._attack(threat);
        }
        return;
      }
    }
    
    this.bot.setControlState('sprint', true);
    
    if (distToTarget > this.attackRange) {
      this.bot.setControlState('forward', true);
      
      if (this.bot.entity.onGround && Math.random() < 0.4) {
        this.bot.setControlState('jump', true);
        setTimeout(() => this.bot.setControlState('jump', false), 100);
      }
    } else if (distToTarget < 2) {
      this.bot.setControlState('forward', false);
      this.bot.setControlState('back', true);
      setTimeout(() => {
        this.bot.setControlState('back', false);
        this.bot.setControlState('forward', true);
      }, 200);
    } else {
      if (this.enableStrafe) {
        this.strafeAngle += 0.8;
        const cos = Math.cos(this.strafeAngle);
        if (cos > 0) {
          this.bot.setControlState('right', true);
          this.bot.setControlState('left', false);
        } else {
          this.bot.setControlState('right', false);
          this.bot.setControlState('left', true);
        }
        this.bot.setControlState('forward', true);
      }
      
      if (Math.random() < 0.3) {
        this.bot.setControlState('jump', true);
        setTimeout(() => this.bot.setControlState('jump', false), 120);
      }
    }
  }
  
  _findThreats() {
    if (!this.bot.entity) return [];
    
    const threats = [];
    const range = 12;
    
    for (const username in this.bot.players) {
      const player = this.bot.players[username];
      if (!player.entity) continue;
      if (username === this.bot.username) continue;
      if (!this.friendlyFire && username === this.engine.config.owner?.username) continue;
      
      const dist = this.bot.entity.position.distanceTo(player.entity.position);
      if (dist <= range) {
        threats.push({ 
          ...player, 
          score: 200 - dist * 3
        });
      }
    }
    
    threats.sort((a, b) => (b.score || 0) - (a.score || 0));
    
    return threats;
  }
  
  // ==================== STATE MANAGEMENT ====================
  
  _setState(newState) {
    if (this.currentState === newState) return;
    this.logger.info(`[A1] State: ${this.currentState} -> ${newState}`);
    this.currentState = newState;
  }
  
  // ==================== UPDATE (from ultimate-a1) ====================
  
  update() {
    if (!this.enabled || !this.bot?.entity) return;
    
    const now = Date.now();
    
    if (this.master) {
      const player = this.bot.players[this.master];
      if (player?.entity) {
        this.masterEntity = player.entity;
      }
    }
    
    switch(this.mode) {
      case 'follow':
        this.doFollow();
        break;
      case 'combat':
        this.doCombat();
        break;
      case 'crystal':
        this.doCrystalPVP();
        break;
      case 'pvm':
      case 'pve':
        this.doPVEMode();
        break;
    }
  }
  
  doFollow() {
    if (!this.masterEntity) return;
    
    const dist = this.bot.entity.position.distanceTo(this.masterEntity.position);
    const now = Date.now();
    
    if (dist > 3 && !this.following) {
      if (this.goals && this.bot.pathfinder) {
        const goal = new this.goals.GoalFollow(this.masterEntity.position, 3);
        this.bot.pathfinder.setGoal(goal, true);
        this.following = true;
      }
    }
    
    if (dist > 3 && this.bot.onGround && now - this.lastJumpTime > 150) {
      this.bot.setControlState('jump', true);
      this.lastJumpTime = now;
    }
    
    if (dist > 2) {
      this.bot.setControlState('sprint', true);
    }
  }
  
  doCombat() {
    const enemy = this.findNearestEnemy();
    
    if (enemy) {
      this.targetEntity = enemy;
      const dist = this.bot.entity.position.distanceTo(enemy.position);
      
      if (dist > this.attackRange) {
        if (this.goals && this.bot.pathfinder) {
          const goal = new this.goals.GoalFollow(enemy.position, this.attackRange - 1);
          this.bot.pathfinder.setGoal(goal, true);
        }
      } else {
        if (this.bot?.pathfinder) {
          this.bot.pathfinder.setGoal(null);
        }
      }
      
      const now = Date.now();
      if (dist <= this.attackRange && now - this.attackCooldown > 500) {
        this.bot.attack(enemy);
        this.attackCooldown = now;
      }
    }
  }
  
  doCrystalPVP() {
    if (!this.targetEntity) {
      this.targetEntity = this.findNearestEnemy();
    }
    
    if (!this.targetEntity) return;
    
    const dist = this.bot.entity.position.distanceTo(this.targetEntity.position);
    const now = Date.now();
    
    if (dist > 6) {
      if (this.goals && this.bot.pathfinder) {
        const goal = new this.goals.GoalFollow(this.targetEntity.position, 4);
        this.bot.pathfinder.setGoal(goal, true);
      }
    } else if (dist < 3) {
      this.bot.setControlState('back', true);
      setTimeout(() => this.bot.setControlState('back', false), 200);
    }
    
    if (dist > 3 && dist < 6 && now - this.lastCrystalTime > this.crystalPlaceDelay) {
      this.placeCrystal();
      this.lastCrystalTime = now;
    }
  }
  
  placeCrystal() {
    const inv = this.bot.inventory;
    const crystalItem = inv.slots.find(slot => 
      slot && (slot.name.includes('crystal') || slot.name.includes('end_crystal'))
    );
    
    if (crystalItem) {
      const pos = this.bot.entity.position;
      const crystalPos = pos.offset(0, -1, 0);
      
      this.bot.equip(crystalItem, 'hand');
      setTimeout(() => {
        this.bot.placeBlock(crystalPos, new this.bot.registry.Vec3(0, 1, 0));
      }, 100);
    }
  }
  
  doPVEMode() {
    const mobs = this.findNearbyMobs();
    
    if (mobs.length > 0) {
      const closest = mobs[0];
      const dist = this.bot.entity.position.distanceTo(closest.position);
      
      if (dist > 2) {
        if (this.goals && this.bot.pathfinder) {
          const goal = new this.goals.GoalFollow(closest.position, 1.5);
          this.bot.pathfinder.setGoal(goal, true);
        }
      }
      
      const now = Date.now();
      if (dist <= 2.5 && now - this.attackCooldown > 500) {
        this.bot.attack(closest);
        this.attackCooldown = now;
      }
    }
  }
  
  findNearestEnemy() {
    let nearest = null;
    let nearestDist = Infinity;
    
    for (const [name, player] of Object.entries(this.bot.players)) {
      if (name === this.master) continue;
      if (!player.entity) continue;
      
      const dist = this.bot.entity.position.distanceTo(player.entity.position);
      if (dist < nearestDist && dist < 20) {
        nearest = player.entity;
        nearestDist = dist;
      }
    }
    
    return nearest;
  }
  
  findNearbyMobs() {
    const mobs = [];
    const entity = this.bot.entity;
    
    for (const ent of Object.values(this.bot.entities)) {
      if (ent.type === 'mob' && ent.position) {
        const dist = entity.position.distanceTo(ent.position);
        if (dist < 15) {
          mobs.push(ent);
        }
      }
    }
    
    return mobs.sort((a, b) => 
      entity.position.distanceTo(a.position) - entity.position.distanceTo(b.position)
    );
  }
  
  // ==================== FOLLOW PLAYER (from a1-bot) ====================
  
  startFollowing() {
    if (!this.master) return;
    
    this.following = true;
    this.bot.chat('On my way');
    
    if (this.pathfinder) {
      this.pathfinder.followPlayer(this.master);
    }
  }
  
  stopFollowing() {
    this.following = false;
    
    if (this.pathfinder) {
      this.pathfinder.stop();
    }
}
  
  // ==================== GAMING NAME GENERATOR ====================
  
  _generateGamingName(index) {
    const baseName = this._realisticNames[index % this._realisticNames.length];
    const suffix = Math.floor(index / this._realisticNames.length) + 1;
    const randomSuffix = Math.floor(Math.random() * 9000) + 1000;
    return `${baseName}_${suffix}${randomSuffix}`;
  }
  
  // ==================== SOLDIER COMMAND HANDLER ====================
  
  handleCommand(username, action, params) {
    if (!this.enabled) {
      return `A1 mode is not active.`;
    }
    
    this.logger.info(`[A1] Received command: ${action} with params: ${params.join(' ')} from ${username}`);
    
    let response = `Unknown command: ${action}`;
    
    switch (action) {
      case 'follow':
        response = this._followCommand(username, params);
        break;
      case 'guard':
        response = this._guardCommand(username, params);
        break;
      case 'attack':
        response = this._attackCommand(username, params);
        break;
      case 'gather':
        response = this._gatherCommand(username, params);
        break;
      case 'build':
        response = this._buildCommand(username, params);
        break;
      case 'go':
        response = this._goCommand(username, params);
        break;
      case 'patrol':
        response = this._patrolCommand(username, params);
        break;
      case 'status':
        response = this._statusCommand(username, params);
        break;
      case 'flee':
        response = this._fleeCommand(username, params);
        break;
      case 'stop':
        response = this._stopCommand(username, params);
        break;
      case 'help':
        response = this._helpCommand();
        break;
      default:
        response = `Unknown action: ${action}. Try !soldier help`;
    }
    return response;
  }
  
  _followCommand(username, params) {
    const targetPlayerName = params[0];
    if (!targetPlayerName) {
      return 'Please specify a player to follow.';
    }
    this.logger.info(`Command: follow ${targetPlayerName}`);
    if (this.taskManager) {
      this.taskManager.pushTask({
        type: 'follow_player',
        targetPlayerName: targetPlayerName,
        requester: username,
        priority: 5
      });
    }
    this._setState('following');
    this.currentTarget = { type: 'player', name: targetPlayerName };
    return `Following ${targetPlayerName}.`;
  }
  
  _guardCommand(username, params) {
    const target = params.join(' ');
    if (!target) {
      return 'Please specify a location (x,y,z) or player to guard.';
    }
    this.logger.info(`Command: guard ${target}`);
    if (this.taskManager) {
      this.taskManager.pushTask({
        type: 'guard_location',
        target: target,
        requester: username,
        priority: 5
      });
    }
    this._setState('guarding');
    this.currentTarget = { type: 'guard', target: target };
    return `Guarding ${target}.`;
  }
  
  async _attackCommand(username, params) {
    const targetName = params.join(' ');
    if (!targetName) {
      return 'Please specify an entity to attack.';
    }
    this.logger.info(`Command: attack ${targetName}`);
    if (this.taskManager) {
      this.taskManager.pushTask({
        type: 'attack_entity',
        targetName: targetName,
        requester: username,
        priority: 8
      });
    }
    this._setState('attacking');
    this.currentTarget = { type: 'entity', name: targetName };
    return `Attacking ${targetName}.`;
  }
  
  async _gatherCommand(username, params) {
    const resourceType = params[0];
    const amount = parseInt(params[1]) || 10;
    if (!resourceType) {
      return 'Please specify a resource type to gather (e.g., wood, stone, coal).';
    }
    this.logger.info(`Command: gather ${resourceType} ${amount}`);
    if (this.taskManager) {
      this.taskManager.pushTask({
        type: 'gather_resource',
        resource: resourceType,
        amount: amount,
        requester: username,
        priority: 6
      });
    }
    this._setState('gathering');
    this.currentTarget = { type: 'resource', resource: resourceType, amount: amount };
    return `Gathering ${amount} ${resourceType}.`;
  }
  
  async _buildCommand(username, params) {
    const structureType = params[0];
    const location = params.slice(1).join(' ');
    if (!structureType) {
      return 'Please specify a structure type to build (e.g., house, furnace).';
    }
    this.logger.info(`Command: build ${structureType} ${location || 'here'}`);
    if (this.taskManager) {
      this.taskManager.pushTask({
        type: 'build_structure',
        structureType: structureType,
        location: location,
        requester: username,
        priority: 7
      });
    }
    this._setState('building');
    this.currentTarget = { type: 'structure', structure: structureType, location: location };
    return `Building ${structureType}${location ? ` at ${location}` : ''}.`;
  }
  
  async _goCommand(username, params) {
    const coords = params.map(Number).filter(n => !isNaN(n));
    if (coords.length < 2 || coords.length > 3) {
      return 'Please provide coordinates in the format x, y, z (e.g., !soldier go 100 64 -200)';
    }
    const [x, y, z] = coords;
    this.logger.info(`Command: go to ${x}, ${y}, ${z}`);
    if (this.taskManager) {
      this.taskManager.pushTask({
        type: 'move_to_location',
        position: { x, y: y || this.bot.entity.position.y, z },
        requester: username,
        priority: 5
      });
    }
    this._setState('following');
    this.currentTarget = { type: 'location', position: { x, y: y || this.bot.entity.position.y, z } };
    return `Moving to ${x}, ${y}, ${z}.`;
  }
  
  _patrolCommand(username, params) {
    const areaDefinition = params.join(' ');
    if (!areaDefinition) {
      return 'Please define an area to patrol.';
    }
    this.logger.info(`Command: patrol ${areaDefinition}`);
    if (this.taskManager) {
      this.taskManager.pushTask({
        type: 'patrol_area',
        area: areaDefinition,
        requester: username,
        priority: 4
      });
    }
    this._setState('patrolling');
    this.currentTarget = { type: 'patrol', area: areaDefinition };
    return `Patrolling area: ${areaDefinition}.`;
  }
  
  _statusCommand(username, params) {
    this.logger.info('Command: status');
    let statusMessage = `A1 Status:\n`;
    statusMessage += `  Current State: ${this.currentState}\n`;
    statusMessage += `  Current Task: ${this.taskManager?.getCurrentTask()?.type || 'None'}\n`;
    if (this.currentTarget) {
      statusMessage += `  Current Target: ${JSON.stringify(this.currentTarget)}\n`;
    }
    statusMessage += `  Health: ${this.bot.health}/20\n`;
    statusMessage += `  Food: ${this.bot.food}/20\n`;
    statusMessage += `  Addon Enabled: ${this.enabled}\n`;
    statusMessage += `  Mode: ${this.mode}\n`;
    statusMessage += `  PvP Enabled: ${this.enabled}\n`;
    statusMessage += `  Following: ${this.isFollowing}\n`;
    statusMessage += `  Protecting: ${this.isProtecting}\n`;
    statusMessage += `  Friendly Fire: ${this.friendlyFire}`;
    
    return statusMessage;
  }
  
  async _fleeCommand(username, params) {
    this.logger.info('Command: flee');
    if (this.actionExecutor && typeof this.actionExecutor._flee === 'function') {
      await this.actionExecutor._flee();
    } else if (this.botIntelligence && typeof this.botIntelligence._seekSafety === 'function') {
      await this.botIntelligence._seekSafety();
    } else {
      this.logger.warn("Cannot execute flee command: Underlying flee/seekSafety mechanism not available.");
      return "Flee command failed: no underlying mechanism found.";
    }
    this._setState('fleeing');
    this.currentTarget = { type: 'flee' };
    return 'Fleeing immediately!';
  }
  
  _stopCommand(username, params) {
    this.logger.info('Command: stop');
    if (this.taskManager) {
      this.taskManager.clearQueue();
      this.taskManager.pause();
    }
    this._setState('idle');
    this.currentTarget = null;
    if (this.bot) {
      this.bot.clearControlStates();
    }
    return 'Stopped all tasks. Bot is now idle.';
  }
  
  _helpCommand() {
    return `Available A1 commands: follow, guard, attack, gather, build, go, patrol, status, flee, stop, help.
    Example: !soldier follow PlayerName
    Also: !pvp, !guard, !squad, !army, !ff, !status, !test`;
  }
  
  // ==================== CLEANUP ====================
  
  async followPlayer(playerName, distance = 3) {
    if (!this.bot || !this.bot.pathfinder) return false;
    
    const player = this.bot.players[playerName];
    if (!player || !player.entity) return false;
    
    try {
      if (this.goals) {
        const goal = new this.goals.GoalFollow(player.entity, distance);
        this.bot.pathfinder.setGoal(goal, true);
      }
      return true;
    } catch (err) {
      this.logger.error('[A1] Follow error:', err.message);
      return false;
    }
  }
  
  async goto(x, y, z) {
    if (!this.bot.pathfinder) return false;
    
    try {
      if (this.goals) {
        const goal = new this.goals.GoalBlock(x, y, z);
        await this.bot.pathfinder.goto(goal);
      }
      return true;
    } catch (err) {
      return false;
    }
  }
  
  stop() {
    this.following = false;
    this.followTarget = null;
    this.lastJumpTime = 0;
    
    if (this.bot?.pathfinder) {
      this.bot.pathfinder.setGoal(null);
    }
    this.bot?.clearControlStates();
  }
  
  cleanup() {
    this.disable();
    this.bot = null;
    this.engine = null;
    this.logger = null;
  }
}

module.exports = A1BotAddon;
