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
    
    // Pathfinder
    this.pathfinderLoaded = false;
    
    // Combat stats
    this.combatStats = {
      hits: 0,
      misses: 0,
      damageDealt: 0,
      damageTaken: 0,
      kills: 0,
      deaths: 0
    };
    
    // Last attack time for sprint reset
    this.lastAttackTime = 0;
    
    // Tactics
    this.currentTactic = 'aggressive'; // aggressive, defensive, hit-and-run
    this.tacticSwitchThreshold = 10; // Health threshold to switch tactics
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
    
    // Load pathfinder for follow/protect
    this._loadPathfinder();
    
    this.logger.info('[PvP] addon initialized - range:' + this.attackRange + ' cps:' + this.cps + 
                    (this.useAdvanced ? ' (Advanced)' : ' (Basic)'));
  }

  _loadPathfinder() {
    try {
      if (this.bot.pathfinder) {
        this.pathfinderLoaded = true;
        return;
      }
      
      // Load pathfinder - try different export patterns
      const pathfinderModule = require('mineflayer-pathfinder');
      const pathfinder = pathfinderModule.default || pathfinderModule.pathfinder || pathfinderModule;
      
      if (typeof pathfinder !== 'function') {
        this.logger.warn('[PvP] Pathfinder export is not a function, trying alternative...');
        // Try the common pattern for mineflayer plugins
        if (pathfinderModule.pathfinder && typeof pathfinderModule.pathfinder === 'function') {
          this.bot.loadPlugin(pathfinderModule.pathfinder);
        } else {
          throw new Error('Cannot load pathfinder - invalid export');
        }
      } else {
        this.bot.loadPlugin(pathfinder);
      }
      
      // Wait for pathfinder to be ready
      const checkReady = () => {
        if (this.bot.pathfinder) {
          this.pathfinderLoaded = true;
          this.logger.info('[PvP] Pathfinder loaded and ready');
        } else {
          setTimeout(checkReady, 100);
        }
      };
      setTimeout(checkReady, 100);
    } catch (e) {
      this.logger.warn('[PvP] Pathfinder not available: ' + e.message);
      this.pathfinderLoaded = false;
    }
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
    
    // Attack speed - MORE AGGRESSIVE
    swordConfig.cps = Math.min(12, this.cps); // Cap at 12 for stability
    
    // Critical hits - ALWAYS ENABLE for maximum damage
    swordConfig.critConfig = swordConfig.critConfig || {};
    swordConfig.critConfig.enabled = true;
    swordConfig.critConfig.mode = 'packet'; // Most reliable for servers
    swordConfig.critConfig.attemptRange = 3; // Try crits from further
    swordConfig.critConfig.reaction = swordConfig.critConfig.reaction || {};
    swordConfig.critConfig.reaction.enabled = false; // Disable reaction for consistency
    
    // Strafe settings - VERY AGGRESSIVE
    swordConfig.strafeConfig = swordConfig.strafeConfig || {};
    swordConfig.strafeConfig.enabled = true; // Always enable strafing
    swordConfig.strafeConfig.mode = swordConfig.strafeConfig.mode || {};
    swordConfig.strafeConfig.mode.mode = 'intelligent'; // Smart strafing
    swordConfig.strafeConfig.mode.maxOffset = Math.PI * 2; // Full 360 strafe
    swordConfig.strafeConfig.mode.followEntity = true; // Strafe around target
    
    // Tap configuration (W-tap) - VERY AGGRESSIVE
    swordConfig.tapConfig = swordConfig.tapConfig || {};
    swordConfig.tapConfig.enabled = true; // Always enable for knockback
    swordConfig.tapConfig.mode = 'wtap';
    swordConfig.tapConfig.delay = 0; // No delay
    
    // Look behavior - CONSTANT tracking
    swordConfig.rotateConfig = swordConfig.rotateConfig || {};
    swordConfig.rotateConfig.smooth = true;
    swordConfig.rotateConfig.mode = 'constant'; // Always look at target
    swordConfig.rotateConfig.lookAtHidden = true; // Even when behind blocks
    
    // Follow configuration - AGGRESSIVE PURSUIT
    swordConfig.followConfig = swordConfig.followConfig || {};
    swordConfig.followConfig.mode = 'jump'; // Jump when following
    swordConfig.followConfig.distance = this.attackRange;
    swordConfig.followConfig.predictTicks = 10; // Better prediction
    swordConfig.followConfig.keepDistance = true; // Maintain optimal distance
    
    // Shield handling - ALWAYS ENABLE
    swordConfig.shieldConfig = swordConfig.shieldConfig || {};
    swordConfig.shieldConfig.enabled = true;
    swordConfig.shieldConfig.breakShield = true;
    swordConfig.shieldConfig.switchToAxe = true;
    swordConfig.shieldConfig.mode = 'blatant'; // More aggressive shield breaking
    
    // On-hit behavior - KB CANCEL for knockback reduction
    swordConfig.onHitConfig = swordConfig.onHitConfig || {};
    swordConfig.onHitConfig.enabled = true;
    swordConfig.onHitConfig.mode = 'backoff'; // Retreat briefly after hit
    swordConfig.onHitConfig.kbCancel = swordConfig.onHitConfig.kbCancel || {};
    swordConfig.onHitConfig.kbCancel.enabled = true;
    swordConfig.onHitConfig.kbCancel.mode = 'jump'; // Jump to reduce knockback
    
    // General aggression settings
    swordConfig.genericConfig = swordConfig.genericConfig || {};
    swordConfig.genericConfig.viewDistance = 128;
    swordConfig.genericConfig.attackRange = this.attackRange;
    swordConfig.genericConfig.tooCloseRange = Math.max(0.5, this.attackRange - 2);
    swordConfig.genericConfig.missChancePerTick = 0.0; // No misses
    swordConfig.genericConfig.enemyReach = 4; // Slightly extended reach
    swordConfig.genericConfig.hitThroughWalls = false;
    
    this.logger.info('[PvP] Advanced PvP configured for maximum aggression');
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
    
    // Throttle to avoid overloading - more responsive
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
    
    // Update tactics based on health and combat situation
    this._updateTactics();
    
    // SMARTER: Check if we should chase or retreat
    this._smartDecisionMaking();
  }
  
  _smartDecisionMaking() {
    if (!this.bot.entity || !this.currentTarget || !this.currentTarget.entity) return;
    
    const health = this.bot.health || 20;
    const dist = this.bot.entity.position.distanceTo(this.currentTarget.entity.position);
    const food = this.bot.food || 20;
    
    // RETREAT if health is low and no food to heal
    if (health < 6 && food < 10) {
      this.logger.info('[PvP] Health critical, retreating!');
      this.bot.setControlState('forward', false);
      this.bot.setControlState('back', true);
      setTimeout(() => this.bot.setControlState('back', false), 500);
      return;
    }
    
    // CHASE aggressively if target is fleeing
    if (dist > this.attackRange * 1.5) {
      this.bot.setControlState('sprint', true);
      this.bot.setControlState('forward', true);
      this.logger.debug('[PvP] Chasing fleeing target...');
    }
    
    // STRATEGIC RETREAT if outnumbered
    const enemies = this._findEnemies();
    if (enemies.length > 2 && health < 15) {
      this.logger.info('[PvP] Outnumbered and low health, retreating!');
      this.bot.setControlState('forward', false);
      this.bot.setControlState('back', true);
      setTimeout(() => this.bot.setControlState('back', false), 1000);
    }
  }

  _updateTactics() {
    if (!this.bot.entity) return;
    
    const health = this.bot.health || 20;
    const food = this.bot.food || 20;
    
    // Switch tactics based on health and food
    if (health < this.tacticSwitchThreshold && this.currentTactic !== 'defensive') {
      this.currentTactic = 'defensive';
      // In defensive mode: less aggressive, more healing, keep distance
      if (this.advancedPvp && this.advancedPvp.options) {
        this.advancedPvp.options.cps = Math.max(4, this.cps - 2); // Slower attacks
      }
      this.logger.info('[PvP] Switching to defensive tactics (health: ' + health + ')');
    } else if (health >= this.tacticSwitchThreshold && this.currentTactic !== 'aggressive') {
      this.currentTactic = 'aggressive';
      // In aggressive mode: max CPS, full sprint, all techniques
      if (this.advancedPvp && this.advancedPvp.options) {
        this.advancedPvp.options.cps = this.cps; // Full CPS
      }
      this.logger.info('[PvP] Switching to aggressive tactics (health: ' + health + ')');
    }
    
    // Emergency heal check
    if (health < 6 && food > 5) {
      this._heal();
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
      if (this.currentTarget && this.currentTarget.entity) {
        // ALWAYS re-issue attack command for maximum aggression
        try {
          this.advancedPvp.attack(this.currentTarget.entity);
        } catch(e) {
          // If attack fails, try to re-initialize
          if (!this.advancedPvp.isAttacking) {
            this.advancedPvp.attack(this.currentTarget.entity);
          }
        }
        
        // Add aggressive pursuit behavior
        this._enhancePursuit(this.currentTarget);
        
        // Sprint always for knockback and speed
        this.bot.setControlState('sprint', true);
      } else {
        // No target - stop attacking
        if (this.advancedPvp && this.advancedPvp.isAttacking) {
          try { this.advancedPvp.stop(); } catch(e) {}
        }
      }
      
      // Auto-heal when low (more aggressive healing)
      if (this.autoHeal && this.bot.health < this.healThreshold + 5) { // Heal earlier
        this._heal();
      }
    } catch (e) {
      // Fallback to basic if advanced fails
      this.logger.warn('[PvP] Advanced combat failed, falling back to basic: ' + e.message);
      this.useAdvanced = false;
      this._basicCombatLoop();
    }
  }

  _enhancePursuit(target) {
    if (!target || !target.entity) return;
    
    const dist = this.bot.entity.position.distanceTo(target.entity.position);
    
    // Always sprint for speed - more aggressive
    this.bot.setControlState('sprint', true);
    
    // If target is too far, sprint towards them
    if (dist > this.attackRange) {
      this.bot.setControlState('forward', true);
    } else if (dist < 2) {
      // Too close, back off a bit
      this.bot.setControlState('forward', false);
      this.bot.setControlState('back', true);
      setTimeout(() => {
        this.bot.setControlState('back', false);
        this.bot.setControlState('forward', true);
      }, 200);
    }
    
    // PRO MOVEMENT: Bunny hopping (jump as soon as you land)
    if (this.bot.entity.onGround && Math.random() < 0.5) {
      this.bot.setControlState('jump', true);
      setTimeout(() => this.bot.setControlState('jump', false), 80);
    }
    
    // Sprint reset after each hit for maximum knockback
    if (this.enableAntiKB && this.lastAttackTime && Date.now() - this.lastAttackTime < 200) {
      this.bot.setControlState('sprint', false);
      setTimeout(() => this.bot.setControlState('sprint', true), 50);
    }
    
    // Random strafe changes for unpredictability
    if (Math.random() < 0.25) {
      const strafe = Math.random() > 0.5 ? 'right' : 'left';
      this.bot.setControlState(strafe, true);
      setTimeout(() => this.bot.setControlState(strafe, false), 250 + Math.random() * 200);
    }
    
    // Occasionally change direction abruptly (pro technique)
    if (Math.random() < 0.1) {
      this.bot.setControlState('left', !this.bot.getControlState('left'));
      this.bot.setControlState('right', !this.bot.getControlState('right'));
    }
  }

  _updateTarget(enemies) {
    const now = Date.now();
    
    if (enemies.length === 0) {
      // No enemies visible
      if (this.currentTarget) {
        // We had a target but lost it - be more patient (5 seconds)
        if (this.targetLostTime === 0) {
          this.targetLostTime = now;
          this.logger.debug('[PvP] Target lost, waiting...');
        } else if (now - this.targetLostTime > 5000) { // Increased from this.targetTimeout
          // Give up on target after 5 seconds
          this.targetLostTime = 0;
          this.currentTarget = null;
          if (this.advancedPvp && this.advancedPvp.isAttacking) {
            try { this.advancedPvp.stop(); } catch(e) {}
          }
          this.logger.debug('[PvP] Gave up on lost target');
        }
      }
      return;
    }
    
    // We have enemies - find the best target
    const bestTarget = this._selectBestTarget(enemies);
    
    // Only switch targets if the new one is SIGNIFICANTLY better (prevent flickering)
    if (!this.currentTarget || 
        (this.currentTarget.entity && bestTarget.entity && 
         this.currentTarget.entity.id !== bestTarget.entity.id &&
         this._calculateTargetScore(bestTarget) > this._calculateTargetScore(this.currentTarget) + 20)) {
      this.currentTarget = bestTarget;
      this.targetLostTime = 0;
      this.logger.info('[PvP] New target acquired: ' + (bestTarget.username || bestTarget.entity?.username));
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
    const armor = this._getArmorValue(player.entity);
    
    // Distance score - closer is better, but not too close
    let distanceScore = 0;
    if (dist < 2) {
      distanceScore = 50; // Too close, harder to hit
    } else if (dist <= this.attackRange) {
      distanceScore = 100 - dist * 10; // Optimal range
    } else if (dist <= this.chaseRange) {
      distanceScore = 30 - (dist - this.attackRange) * 2; // Still chase but lower priority
    } else {
      return -1; // Out of range
    }
    
    // Health score - lower health = easier target
    const healthScore = (20 - health) * 8; // More weight on health
    
    // Armor penalty - harder to kill targets with good armor
    const armorPenalty = armor * 3;
    
    // Prefer targets that are already attacking us
    const aggressionScore = 0; // TODO: implement combat log tracking
    
    // Weapon consideration - targets with better weapons are more dangerous
    const weaponThreat = this._getWeaponThreat(player.entity);
    
    return distanceScore + healthScore - armorPenalty + aggressionScore + weaponThreat;
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
      
      // Higher damage weapons = more threat
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

  _basicCombatLoop() {
    if (!this.enabled) return;
    
    // Find and attack enemies (only players, not mobs)
    const enemies = this._findEnemies();
    if (enemies.length > 0) {
      const target = enemies[0];
      
      // Always sprint for speed and knockback
      this.bot.setControlState('sprint', true);
      
      // Move towards target if too far
      const dist = this.bot.entity.position.distanceTo(target.entity.position);
      if (dist > this.attackRange) {
        this.bot.setControlState('forward', true);
      } else if (dist < 2) {
        // Too close, back off slightly
        this.bot.setControlState('back', true);
        setTimeout(() => this.bot.setControlState('back', false), 150);
      }
      
      this._attack(target);
    } else {
      // No target, stop sprinting
      this.bot.setControlState('sprint', false);
      this.bot.setControlState('forward', false);
    }
    
    // Auto-heal when low (more aggressive healing)
    if (this.autoHeal && this.bot.health < this.healThreshold + 5) {
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
    
    // Sort by score (best target first) - SMARTER than just distance
    enemies.sort((a, b) => {
      const scoreA = this._calculateTargetScore(a);
      const scoreB = this._calculateTargetScore(b);
      return scoreB - scoreA; // Higher score first
    });
    
    return enemies;
  }

  _attack(target) {
    const now = Date.now();
    const minDelay = 1000 / this.cps;
    
    if (now - this.lastAttack < minDelay) return;
    this.lastAttack = now;
    this.lastAttackTime = now; // Set lastAttackTime for sprint reset
    
    try {
      // ALWAYS sprint for knockback and speed
      this.bot.setControlState('sprint', true);
      
      // Look at target - instant
      this.bot.lookAt(target.entity.position);
      
      // Attack - multiple hits if possible
      this.bot.attack(target.entity);
      this.combatStats.hits++;
      
      // W-tap technique - faster and more frequent
      if (this.enableWTap) {
        this.bot.setControlState('forward', false);
        setTimeout(() => {
          this.bot.setControlState('forward', true);
          // Double W-tap for extra knockback
          setTimeout(() => {
            this.bot.setControlState('forward', false);
            setTimeout(() => this.bot.setControlState('forward', true), 30);
          }, 50);
        }, 30);
      }
      
      // Circle strafe (fallback movement) - MORE AGGRESSIVE
      if (this.enableStrafe && !this.useAdvanced) {
        this.strafeAngle += 1.2; // Faster strafe changes
        const cos = Math.cos(this.strafeAngle);
        if (cos > 0) {
          this.bot.setControlState('right', true);
          this.bot.setControlState('left', false);
        } else {
          this.bot.setControlState('right', false);
          this.bot.setControlState('left', true);
        }
        // Also move forward while strafing
        this.bot.setControlState('forward', true);
      }
      
      // Critical hits - ALWAYS try for max damage
      if (this.enableCrits && !this.bot.entity.isInWater && !this.useAdvanced) {
        this.bot.setControlState('jump', true);
        setTimeout(() => this.bot.setControlState('jump', false), 80);
      }
      
      // Sprint reset for knockback - more frequent
      if (this.enableAntiKB && !this.useAdvanced) {
        this.bot.setControlState('sprint', false);
        setTimeout(() => this.bot.setControlState('sprint', true), 40);
      }
      
      // Random jump for unpredictability (bunny hop)
      if (Math.random() < 0.4) { // 40% chance
        this.bot.setControlState('jump', true);
        setTimeout(() => this.bot.setControlState('jump', false), 120);
      }
      
    } catch(e) {
      this.combatStats.misses++;
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
    this.combatStats.deaths++;
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
      this.logger.warn('[PvP] Follow failed - player not found: ' + username);
      return false;
    }
    
    // Load pathfinder if not loaded
    if (!this.pathfinderLoaded) {
      this._loadPathfinder();
      if (!this.pathfinderLoaded) {
        this.bot.chat('Pathfinder not available, using simple follow');
        // Still try to follow even without pathfinder
      }
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
    
    // Follow the target using pathfinder if available
    const dist = this.bot.entity.position.distanceTo(this.followTarget.entity.position);
    
    if (dist > 3) {
      // Move closer using pathfinder if loaded
      if (this.pathfinderLoaded && this.bot.pathfinder) {
        try {
          const { goals } = require('mineflayer-pathfinder');
          const goal = new goals.GoalFollow(this.followTarget.entity, 2);
          this.bot.pathfinder.setGoal(goal);
        } catch(e) {
          // Fallback to simple movement
          this.bot.setControlState('forward', true);
          this.bot.setControlState('sprint', true);
          this.bot.lookAt(this.followTarget.entity.position);
        }
      } else {
        // No pathfinder, use simple movement
        this.bot.setControlState('forward', true);
        this.bot.setControlState('sprint', true);
        this.bot.lookAt(this.followTarget.entity.position);
      }
    } else {
      // Close enough, stop pathfinding
      if (this.pathfinderLoaded && this.bot.pathfinder) {
        try { this.bot.pathfinder.setGoal(null); } catch(e) {}
      }
      // Face the target
      try { this.bot.lookAt(this.followTarget.entity.position); } catch(e) {}
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
    const range = 12; // Increased range for better protection
    
    // Check for hostile mobs - prioritize closer ones
    for (const entity of Object.values(this.bot.entities)) {
      if (!entity || (entity.type !== 'mob' && entity.type !== 'hostile')) continue;
      if (entity.name === 'armor_stand' || entity.name === 'painting' || entity.name === 'item') continue;
      
      const dist = this.bot.entity.position.distanceTo(entity.position);
      if (dist <= range) {
        threats.push({ 
          entity: entity, 
          username: entity.name,
          score: 100 - dist * 5 // Higher score = more threat
        });
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
        // Players are higher threat than mobs
        threats.push({ 
          ...player, 
          score: 200 - dist * 3 // Players are bigger threat
        });
      }
    }
    
    // Sort by threat score (highest first)
    threats.sort((a, b) => (b.score || 0) - (a.score || 0));
    
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
    
    // Follow command - SIMPLIFIED and MORE RESPONSIVE
    if (message.startsWith('!follow')) {
      if (this.isFollowing) {
        this._stopFollow();
        this._stopProtect();
        this.bot.chat('Stopped following');
      } else {
        // Follow the owner by default, or specified player
        const parts = message.split(' ');
        const target = parts[1] || owner;
        const success = this._startFollow(target);
        if (success) {
          this.bot.chat('Following ' + target + ' - will chase and stay close');
        }
      }
      return;
    }
    
    // Protect command - MORE AGGRESSIVE
    if (message.startsWith('!protect')) {
      if (this.isProtecting) {
        this._stopProtect();
        this._stopFollow();
        this.bot.chat('Stopped protecting');
      } else {
        // Protect the owner by default, or specified player
        const parts = message.split(' ');
        const target = parts[1] || owner;
        const success = this._startProtect(target);
        if (success) {
          this.bot.chat('Protecting ' + target + ' - will attack nearby threats!');
        }
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
        this.bot.chat('PvP enabled! Ready to fight!');
      }
    }
    
    // Status command - show combat stats
    if (message === '!status') {
      const stats = this.combatStats;
      this.bot.chat('PvP Stats - Hits: ' + stats.hits + ' | Misses: ' + stats.misses + ' | Kills: ' + stats.kills);
    }
  }
}

module.exports = PvPAddon;