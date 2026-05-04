class PvPAddon {
  constructor() {
    this.name = 'pvp';
    this.bot = null;
    this.engine = null;
    this.logger = null;
    this.enabled = false;
    this.attackRange = 4;
    this.cps = 8;
    this.lastAttack = 0;
    this.targets = new Map();
    
    // Original settings (fallback)
    this.enableCrits = true;
    this.enableStrafe = true;
    this.enableWTap = true;
    this.enableAntiKB = true;
    this.enableWeaponSwitch = true;
    this.autoHeal = true;
    this.healThreshold = 10;
    
    this.strafeAngle = 0;
    
    // Advanced PvP system (from nxg-org/mineflayer-custom-pvp)
    this.advancedPvp = null;
    this.useAdvanced = false;
    this.advancedInitAttempted = false;
    
    // Target tracking
    this.currentTarget = null;
    this.targetLostTime = 0;
    this.targetTimeout = 1000; // ms to wait before giving up on target
    this.chaseRange = 32; // How far we'll chase a target
    
    // Response timing
    this.lastPhysicsTick = 0;
    this.physicsTickInterval = 50; // Target 20 ticks/sec
    
    // Friendly fire
    this.friendlyFire = false;
    
    // Follow/Protect states
    this.isFollowing = false;
    this.isProtecting = false;
    this.followTarget = null;
  }

  init(bot, engine) {
    this.bot = bot;
    this.engine = engine;
    this.logger = engine.logger;
    
    const config = engine.config.pvpMode || {};
    this.attackRange = config.attackRange || 4;
    this.cps = config.cps || 8;
    this.enableCrits = config.enableCrits !== false;
    this.enableStrafe = config.enableStrafe !== false;
    this.enableWTap = config.enableWTap !== false;
    this.enableAntiKB = config.enableAntiKB !== false;
    this.enableWeaponSwitch = config.enableWeaponSwitch !== false;
    this.autoHeal = config.autoHeal !== false;
    this.healThreshold = config.healThreshold || 10;
    
    // Friendly fire setting
    this.friendlyFire = engine.config.friendlyFire?.enabled || false;
    
    // Initialize advanced PvP system if available
    this._initAdvancedPvP(config);
    
    this.logger.info('[PvP] addon initialized - range:' + this.attackRange + ' cps:' + this.cps + 
                    (this.useAdvanced ? ' (Advanced)' : ' (Basic)'));
  }

  _initAdvancedPvP(config) {
    if (this.advancedInitAttempted) return;
    this.advancedInitAttempted = true;
    
    try {
      // Check if advanced PvP library is available
      if (typeof require !== 'undefined') {
        const customPvp = require('@nxg-org/mineflayer-custom-pvp');
        if (customPvp && this.bot) {
          // Load the plugin into the bot
          customPvp.default(this.bot);
          
          // Configure advanced PvP based on config
          if (this.bot.swordpvp) {
            this._configureAdvancedPvP(config);
            this.useAdvanced = true;
            this.advancedPvp = this.bot.swordpvp;
            this.logger.info('[PvP] Advanced PvP system initialized');
          }
        }
      }
    } catch (e) {
      this.logger.warn('[PvP] Advanced PvP not available, using basic: ' + e.message);
      this.useAdvanced = false;
    }
  }

  _configureAdvancedPvP(config) {
    if (!this.bot || !this.bot.swordpvp) return;
    
    // Apply configuration to advanced PvP system
    const swordConfig = this.bot.swordpvp.options;
    
    // Attack speed
    swordConfig.cps = this.cps;
    
    // Critical hits
    if (this.enableCrits !== false) {
      swordConfig.critConfig = swordConfig.critConfig || {};
      swordConfig.critConfig.enabled = true;
      swordConfig.critConfig.mode = 'packet'; // Most reliable
      swordConfig.critConfig.reaction = swordConfig.critConfig.reaction || {};
      swordConfig.critConfig.reaction.enabled = false; // Disable reaction for consistency
    } else {
      swordConfig.critConfig = swordConfig.critConfig || {};
      swordConfig.critConfig.enabled = false;
    }
    
    // Strafe settings
    swordConfig.strafeConfig = swordConfig.strafeConfig || {};
    swordConfig.strafeConfig.enabled = this.enableStrafe !== false;
    swordConfig.strafeConfig.mode = swordConfig.strafeConfig.mode || {};
    swordConfig.strafeConfig.mode.mode = 'intelligent'; // Smart strafing
    
    // Tap configuration (W-tap equivalent)
    swordConfig.tapConfig = swordConfig.tapConfig || {};
    swordConfig.tapConfig.enabled = this.enableWTap !== false;
    swordConfig.tapConfig.mode = 'wtap'; // W-tap for knockback
    
    // Look behavior
    swordConfig.rotateConfig = swordConfig.rotateConfig || {};
    swordConfig.rotateConfig.smooth = true;
    swordConfig.rotateConfig.mode = 'constant';
    
    // Follow configuration - IMPROVED FOR BETTER PURSUIT
    swordConfig.followConfig = swordConfig.followConfig || {};
    swordConfig.followConfig.mode = 'jump'; // Jump when following
    swordConfig.followConfig.distance = this.attackRange;
    swordConfig.followConfig.predictTicks = 6; // Increased prediction for better tracking
    
    // Shield handling
    swordConfig.shieldConfig = swordConfig.shieldConfig || {};
    swordConfig.shieldConfig.enabled = true;
    swordConfig.shieldConfig.breakShield = true;
    swordConfig.shieldConfig.switchToAxe = true;
    
    // General aggression settings
    swordConfig.genericConfig = swordConfig.genericConfig || {};
    swordConfig.genericConfig.viewDistance = 128;
    swordConfig.genericConfig.attackRange = this.attackRange;
    swordConfig.genericConfig.tooCloseRange = Math.max(1, this.attackRange - 1);
    swordConfig.genericConfig.missChancePerTick = 0.0;
    swordConfig.genericConfig.enemyReach = 3;
    swordConfig.genericConfig.hitThroughWalls = false;
  }

  enable() {
    if (this.enabled) return;
    this.enabled = true;
    
    this.bot.on('physicsTick', () => this._combatLoop());
    this.bot.on('chat', (username, msg) => this._handleChat(username, msg));
    this.bot.on('death', () => this._onDeath());
    this.bot.on('entityHurt', (entity) => this._onEntityHurt(entity));
    
    this.logger.info('[PvP] Combat Mode ENABLED');
  }

  disable() {
    if (!this.enabled) return;
    this.enabled = false;
    // Clear target when disabled
    this.currentTarget = null;
    this.targetLostTime = 0;
    if (this.advancedPvp) {
      try { this.advancedPvp.stop(); } catch(e) {}
    }
    this.targets.clear();
    // Stop follow/protect
    this._stopFollow();
    this._stopProtect();
    this.logger.info('[PvP] Combat Mode disabled');
  }

  _combatLoop() {
    if (!this.enabled) return;
    
    // Throttle to avoid overloading
    const now = Date.now();
    if (now - this.lastPhysicsTick < this.physicsTickInterval) {
      return;
    }
    this.lastPhysicsTick = now;
    
    // Use advanced PvP system if available, otherwise fallback to basic
    if (this.useAdvanced && this.advancedPvp && this.bot.entity) {
      this._advancedCombatLoop();
    } else {
      this._basicCombatLoop();
    }
    
    // Handle follow/protect behaviors
    if (this.isFollowing || this.isProtecting) {
      this._handleFollowProtect();
    }
  }

  _advancedCombatLoop() {
    if (!this.enabled || !this.bot.entity) return;
    
    try {
      // Find and update targets (only players, not mobs)
      const enemies = this._findEnemies();
      
      // Update target tracking
      this._updateTarget(enemies);
      
      // If we have a target, pursue and attack
      if (this.currentTarget) {
        // Use advanced PvP system to attack/follow target
        if (!this.advancedPvp.isAttacking) {
          this.advancedPvp.attack(this.currentTarget.entity);
        }
        
        // Optional: Add aggressive pursuit behavior
        this._enhancePursuit(this.currentTarget);
      } else {
        // No target - make sure we're not attacking anything
        if (this.advancedPvp.isAttacking) {
          try { this.advancedPvp.stop(); } catch(e) {}
        }
      }
      
      // Auto-heal when low
      if (this.autoHeal && this.bot.health < this.healThreshold) {
        this._heal();
      }
    } catch (e) {
      // Fallback to basic if advanced fails
      this.logger.warn('[PvP] Advanced combat failed, falling back to basic: ' + e.message);
      this.useAdvanced = false;
      this._basicCombatLoop();
    }
  }

  _updateTarget(enemies) {
    const now = Date.now();
    
    if (enemies.length === 0) {
      // No enemies visible
      if (this.currentTarget) {
        // We had a target but lost it
        if (this.targetLostTime === 0) {
          this.targetLostTime = now;
        } else if (now - this.targetLostTime > this.targetTimeout) {
          // Give up on target after timeout
          this.targetLostTime = 0;
          this.currentTarget = null;
          if (this.advancedPvp.isAttacking) {
            try { this.advancedPvp.stop(); } catch(e) {}
          }
        }
      }
      return;
    }
    
    // We have enemies - find the best target
    const bestTarget = this._selectBestTarget(enemies);
    
    // Check if target changed
    if (!this.currentTarget || this.currentTarget.entity.id !== bestTarget.entity.id) {
      this.currentTarget = bestTarget;
      this.targetLostTime = 0;
      this.logger.debug('[PvP] New target acquired: ' + bestTarget.username);
    }
  }

  _selectBestTarget(enemies) {
    if (enemies.length === 0) return null;
    
    // Score targets based on threat level, distance, health, etc.
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
    
    // Closer targets get higher score
    const distanceScore = Math.max(0, 100 - dist * 10);
    
    // Lower health targets get higher score (easier to kill)
    const healthScore = (20 - health) * 5; // 0-20 health -> 100-0 score
    
    // Prefer targets that are already attacking us (if we could detect that)
    const aggressionScore = 0; // Would need combat log tracking
    
    return distanceScore + healthScore + aggressionScore;
  }

  _enhancePursuit(target) {
    // Add more aggressive pursuit behaviors here
    // For example: prediction, cutting off escape routes, etc.
    // This is kept minimal to avoid interfering with the advanced PvP system
  }

  _basicCombatLoop() {
    if (!this.enabled) return;
    
    // Find and attack enemies (only players, not mobs)
    const enemies = this._findEnemies();
    if (enemies.length > 0) {
      this._attack(enemies[0]);
    }
    
    // Auto-heal when low
    if (this.autoHeal && this.bot.health < this.healThreshold) {
      this._heal();
    }
  }

  _findEnemies() {
    if (!this.bot.entity) return [];
    
    const range = this.chaseRange; // Use chase range for detection
    const enemies = [];
    const owner = this.engine.config.owner?.username;
    
    // Only target players, NOT mobs
    for (const username in this.bot.players) {
      const player = this.bot.players[username];
      if (!player.entity) continue;
      if (username === this.bot.username) continue; // Don't target self
      if (!this.friendlyFire && username === owner) continue; // Skip owner if friendly fire disabled
      
      const dist = this.bot.entity.position.distanceTo(player.entity.position);
      if (dist <= range) {
        enemies.push(player);
      }
    }
    
    // Sort by distance (closest first)
    enemies.sort((a, b) => {
      const distA = this.bot.entity.position.distanceTo(a.entity.position);
      const distB = this.bot.entity.position.distanceTo(b.entity.position);
      return distA - distB;
    });
    
    return enemies;
  }

  _attack(target) {
    const now = Date.now();
    const minDelay = 1000 / this.cps;
    
    if (now - this.lastAttack < minDelay) return;
    this.lastAttack = now;
    
    try {
      // Look at target
      this.bot.lookAt(target.entity.position);
      
      // Attack
      this.bot.attack(target.entity);
      
      // W-tap technique
      if (this.enableWTap) {
        this.bot.setControlState('forward', false);
        setTimeout(() => this.bot.setControlState('forward', true), 30); // Faster W-tap
      }
      
      // Circle strafe (fallback movement) - reduced angle for tighter control
      if (this.enableStrafe && !this.useAdvanced) {
        this.strafeAngle += 0.5; // Increased for more responsive strafing
        const cos = Math.cos(this.strafeAngle);
        const sin = Math.sin(this.strafeAngle);
        if (cos > 0) {
          this.bot.setControlState('right', true);
          this.bot.setControlState('left', false);
        } else {
          this.bot.setControlState('right', false);
          this.bot.setControlState('left', true);
        }
      }
      
      // Critical hits
      if (this.enableCrits && !this.bot.entity.isInWater && !this.useAdvanced) {
        this.bot.setControlState('jump', true);
        setTimeout(() => this.bot.setControlState('jump', false), 100); // Faster jump
      }
      
    } catch(e) {
      // Silently ignore errors to prevent spam
    }
  }

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
      
      // Sort by food value (saturation + hunger restore)
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
        return valueB - valueA; // Higher value first
      });
      
      if (foods.length > 0) {
        this.bot.equip(foods[0], 'hand', err => {
          if (!err) this.bot.consume(() => {});
        });
      }
    } catch(e) {
      // Silently ignore errors
    }
  }

  _onDeath() {
    this.logger.info('[PvP] Died! Respawning...');
    // Clear target on death
    this.currentTarget = null;
    this.targetLostTime = 0;
    this._stopFollow();
    this._stopProtect();
    setTimeout(() => {
      try { this.bot.respawn(); } catch(e) {}
    }, 1500);
  }

  _onEntityHurt(entity) {
    // If protecting and owner is hurt, attack the entity that hurt them
    if (this.isProtecting && this.followTarget) {
      const owner = this.engine.config.owner?.username;
      if (entity.username === owner || (entity.entity && entity.entity.username === owner)) {
        // Find the attacker and attack them
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
    
    // Check players
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
    
    // Check mobs if protecting
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

  // Follow/Protect functions
  _startFollow(username) {
    const player = this.bot.players[username];
    if (!player || !player.entity) {
      this.bot.chat('Cannot find player to follow: ' + username);
      return false;
    }
    
    this.isFollowing = true;
    this.followTarget = player;
    this.logger.info('[PvP] Started following: ' + username);
    this.bot.chat('Now following ' + username);
    return true;
  }

  _stopFollow() {
    if (!this.isFollowing) return;
    this.isFollowing = false;
    this.followTarget = null;
    this.logger.info('[PvP] Stopped following');
    try { this.bot.pathfinder.setGoal(null); } catch(e) {}
  }

  _startProtect(username) {
    if (!this._startFollow(username)) return false;
    
    this.isProtecting = true;
    this.logger.info('[PvP] Started protecting: ' + username);
    this.bot.chat('Now protecting ' + username);
    return true;
  }

  _stopProtect() {
    this.isProtecting = false;
    this.logger.info('[PvP] Stopped protecting');
  }

  _handleFollowProtect() {
    if (!this.followTarget || !this.followTarget.entity) {
      // Target lost
      this._stopFollow();
      this._stopProtect();
      return;
    }
    
    // Follow the target
    const dist = this.bot.entity.position.distanceTo(this.followTarget.entity.position);
    
    if (dist > 3) {
      // Move closer using pathfinder
      try {
        const { pathfinder, goals } = require('mineflayer-pathfinder');
        const goal = new goals.GoalFollow(this.followTarget.entity, 2);
        this.bot.pathfinder.setGoal(goal);
      } catch(e) {}
    }
    
    // If protecting, attack nearby threats
    if (this.isProtecting) {
      const threats = this._findThreats();
      if (threats.length > 0) {
        const threat = threats[0];
        if (this.useAdvanced && this.advancedPvp) {
          try { this.advancedPvp.attack(threat.entity); } catch(e) {}
        } else {
          this._attack(threat);
        }
      }
    }
  }

  _findThreats() {
    if (!this.bot.entity) return [];
    
    const threats = [];
    const range = 8;
    
    // Check for hostile mobs
    for (const entity of Object.values(this.bot.entities)) {
      if (!entity || entity.type !== 'mob' && entity.type !== 'hostile') continue;
      if (entity.name === 'armor_stand' || entity.name === 'painting') continue;
      
      const dist = this.bot.entity.position.distanceTo(entity.position);
      if (dist <= range) {
        threats.push({ entity: entity, username: entity.name });
      }
    }
    
    // Check for other players (if protecting from players too)
    for (const username in this.bot.players) {
      const player = this.bot.players[username];
      if (!player.entity) continue;
      if (username === this.bot.username) continue;
      if (!this.friendlyFire && username === this.engine.config.owner?.username) continue;
      
      const dist = this.bot.entity.position.distanceTo(player.entity.position);
      if (dist <= range) {
        threats.push(player);
      }
    }
    
    return threats;
  }

  _handleChat(username, message) {
    const owner = this.engine.config.owner?.username;
    if (!owner) return;
    
    // Only owner can use these commands (for safety)
    if (username !== owner) return;
    
    // Friendly fire toggle
    if (message === '!ff') {
      this.friendlyFire = !this.friendlyFire;
      this.logger.info('[PvP] Friendly fire: ' + (this.friendlyFire ? 'ENABLED' : 'DISABLED'));
      this.bot.chat('Friendly fire: ' + (this.friendlyFire ? 'ON' : 'OFF'));
      return;
    }
    
    // Follow command
    if (message.startsWith('!follow')) {
      if (this.isFollowing) {
        this._stopFollow();
        this.bot.chat('Stopped following');
      } else {
        // Follow the owner by default, or specified player
        const parts = message.split(' ');
        const target = parts[1] || owner;
        this._startFollow(target);
      }
      return;
    }
    
    // Protect command
    if (message.startsWith('!protect')) {
      if (this.isProtecting) {
        this._stopProtect();
        this._stopFollow();
        this.bot.chat('Stopped protecting');
      } else {
        // Protect the owner by default, or specified player
        const parts = message.split(' ');
        const target = parts[1] || owner;
        this._startProtect(target);
      }
      return;
    }
    
    // PvP toggle
    if (message === '!pvp') {
      if (this.enabled) {
        this.disable();
        this.bot.chat('PvP disabled');
      } else {
        this.enable();
        this.bot.chat('PvP enabled!');
      }
    }
  }
}

module.exports = PvPAddon;