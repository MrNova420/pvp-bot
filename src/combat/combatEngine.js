class CombatEngine {
  constructor(bot, logger, config, targetManager, followSystem, healManager, weaponSystem) {
    this.bot = bot;
    this.logger = logger;
    this.config = config;
    this.targetManager = targetManager;
    this.followSystem = followSystem;
    this.healManager = healManager;
    this.weaponSystem = weaponSystem;
    
    this.enabled = false;
    this.combatInterval = null;
    
    this.combatConfig = config.combat || {};
    this.cps = this.combatConfig.cps || 8;
    this.attackRange = this.combatConfig.attackRange || 4;
    this.enableCrits = this.combatConfig.enableCrits !== false;
    this.enableStrafe = this.combatConfig.enableStrafe !== false;
    this.enableWTap = this.combatConfig.enableWTap !== false;
    this.enableAntiKB = this.combatConfig.enableAntiKB !== false;
    this.enableWeaponSwitch = this.combatConfig.enableWeaponSwitch !== false;
    this.autoAttack = this.combatConfig.autoAttack !== false;
    
    this.lastAttack = 0;
    this.isAttacking = false;
    this.strafeDirection = 1;
    this.strafeTimer = 0;
    
    // W-tap system
    this.wtapTimer = 0;
    this.wtapCooldown = 80;
    this.wtapEnabled = false;
    
    // Anti-knockback system
    this.antiKBTimer = 0;
    this.antiKBActive = false;
    
    // Combat states
    this.combatState = 'neutral';
    this.combatStyle = this.combatConfig.combatStyle || 'hybrid';
    
    // Position history for prediction
    this.positionHistory = [];
    this.maxHistory = 10;
    
    // Reaction delay for human-like behavior
    this.reactionDelay = 100 + Math.random() * 200;
  }

start() {
    if (!this.enabled) {
      this.enabled = true;
    }
    
    this.combatInterval = setInterval(() => {
      this._combatLoop();
    }, 50);
    
    this._setupDamageListener();
    
    this.logger.info('Combat engine started');
    this.logger.info(`Features: W-tap=${this.enableWTap}, Anti-KB=${this.enableAntiKB}, Crits=${this.enableCrits}, Strafe=${this.enableStrafe}`);
  }

  _setupDamageListener() {
    this.bot.on('playerDied', (entity, source) => {
      if (this.enableAntiKB && entity === this.bot.entity && source) {
        this._onDamageTaken(source);
      }
    });
  }

  _onDamageTaken(source) {
    if (this.antiKBActive) return;
    
    this.antiKBActive = true;
    this.antiKBTimer = Date.now();
    
    // Jump to reduce knockback
    if (Math.random() < 0.7) {
      this.bot.setControlState('jump', true);
      setTimeout(() => this.bot.setControlState('jump', false), 150);
    }
    
    // Hold back to reduce knockback distance
    this.bot.setControlState('sprint', false);
    this.bot.setControlState('back', true);
    
    setTimeout(() => {
      this.bot.setControlState('back', false);
      this.antiKBActive = false;
    }, 300 + Math.random() * 200);
  }

  _combatLoop() {
    if (!this.enabled || !this.bot || !this.bot.entity) return;
    
    // Auto heal
    if (this.healManager && this.bot.food < this.combatConfig.healThreshold) {
      this.healManager.tryHeal();
    }
    
    // Update combat state
    this._updateCombatState();
    
    const target = this.targetManager.getTargetEntity();
    
    if (!target) {
      this._stopAttacking();
      return;
    }
    
    const distance = this.bot.entity.position.distanceTo(target.position);
    
    if (distance > this.attackRange) {
      this._approachTarget(target);
      return;
    }
    
    this._engageCombat(target);
  }

  _updateCombatState() {
    const health = this.bot.health;
    const enemyCount = this.targetManager.getEnemyCount();
    
    if (health <= 4) {
      this.combatState = 'flee';
    } else if (health <= 10 && enemyCount > 1) {
      this.combatState = 'defensive';
    } else if (enemyCount === 1 && health > 14) {
      this.combatState = 'aggressive';
    } else {
      this.combatState = 'neutral';
    }
  }

  _approachTarget(target) {
    const distance = this.bot.entity.position.distanceTo(target.position);
    const predictedPos = this._predictPosition(target);
    
    this._lookAt(predictedPos);
    this.bot.setControlState('forward', true);
    
    if (distance > 8) {
      this.bot.setControlState('sprint', true);
    }
  }

  _engageCombat(target) {
    const predictedPos = this._predictPosition(target);
    this._lookAt(predictedPos);
    
    if (this.enableWeaponSwitch && this.weaponSystem) {
      this.weaponSystem.checkAndSwitch(target);
    }
    
    if (this.combatState === 'flee') {
      this._doFlee(target);
      return;
    }
    
    if (this.enableStrafe) {
      this._doCircleStrafe(target);
    }
    
    if (this.enableWTap) {
      this._doWTap();
    }
    
    this._tryAttack(target);
    this.isAttacking = true;
  }

  // Hit prediction - lead targets based on movement
  _predictPosition(target) {
    this.positionHistory.push({
      pos: target.position.clone(),
      time: Date.now()
    });
    
    if (this.positionHistory.length > this.maxHistory) {
      this.positionHistory.shift();
    }
    
    if (this.positionHistory.length < 3) {
      return target.position;
    }
    
    const recent = this.positionHistory.slice(-3);
    const velocity = {
      x: (recent[2].pos.x - recent[0].pos.x) / 2,
      z: (recent[2].pos.z - recent[0].pos.z) / 2
    };
    
    const predictionTime = 100;
    const predictedPos = target.position.offset(
      velocity.x * predictionTime / 50,
      0,
      velocity.z * predictionTime / 50
    );
    
    return predictedPos;
  }

  // Circle strafe movement
  _doCircleStrafe(target) {
    if (!this.bot.entity || !target) return;
    
    const angle = Math.atan2(
      target.position.z - this.bot.entity.position.z,
      target.position.x - this.bot.entity.position.x
    );
    
    this.strafeTimer++;
    
    if (this.strafeTimer > 10 + Math.random() * 15) {
      this.strafeDirection = Math.random() > 0.5 ? 1 : -1;
      this.strafeTimer = 0;
    }
    
    const offsetAngle = angle + (Math.PI / 2) * this.strafeDirection;
    
    const targetCirclePos = this.bot.entity.position.offset(
      Math.cos(offsetAngle) * 0.15,
      0,
      Math.sin(offsetAngle) * 0.15
    );
    
    this._lookAt(targetCirclePos);
    this.bot.setControlState('forward', true);
    
    // Random jump during strafe
    if (Math.random() < 0.05) {
      this.bot.setControlState('jump', true);
      setTimeout(() => this.bot.setControlState('jump', false), 100 + Math.random() * 100);
    }
  }

  // W-tap - sprint reset between hits for max knockback
  _doWTap() {
    const now = Date.now();
    
    if (now - this.wtapTimer > this.wtapCooldown + Math.random() * 50) {
      this.bot.setControlState('sprint', false);
      
      setTimeout(() => {
        if (this.bot) {
          this.bot.setControlState('sprint', true);
        }
      }, 50 + Math.random() * 30);
      
      this.wtapTimer = now;
    }
  }

  _doFlee(target) {
    if (!this.bot.entity) return;
    
    const angle = Math.atan2(
      this.bot.entity.position.z - target.position.z,
      this.bot.entity.position.x - target.position.x
    );
    
    const fleePos = this.bot.entity.position.offset(
      Math.cos(angle) * 3,
      0,
      Math.sin(angle) * 3
    );
    
    this._lookAt(fleePos);
    this.bot.setControlState('forward', true);
    this.bot.setControlState('sprint', true);
    
    this.isAttacking = false;
  }

  _lookAt(targetPos) {
    const lookPos = targetPos.offset(0, 1.6, 0);
    this.bot.lookAt(lookPos, true);
  }

  _tryAttack(target) {
    const now = Date.now();
    const minInterval = 1000 / this.cps;
    const variation = Math.random() * 50;
    
    if (now - this.lastAttack < minInterval + variation) return;
    
    if (this.enableCrits && this._canCrit()) {
      this._performCritAttack(target);
    } else {
      this.bot.attack(target);
    }
    
    this.lastAttack = now;
  }

  _canCrit() {
    const onGround = this.bot.physics?.onGround;
    const velocity = this.bot.entity?.velocity;
    
    return onGround === false || (velocity && velocity.y < 0) || Math.random() < 0.3;
  }

  _performCritAttack(target) {
    const critType = Math.random();
    
    if (critType < 0.6) {
      // Hop crit
      this.bot.setControlState('jump', true);
      
      setTimeout(() => {
        if (this.bot.entity) {
          this.bot.attack(target);
        }
      }, 120 + Math.random() * 30);
      
      setTimeout(() => {
        this.bot.setControlState('jump', false);
      }, 180);
    } else {
      // Normal crit
      this.bot.setControlState('jump', true);
      
      setTimeout(() => {
        if (this.bot.entity) {
          this.bot.attack(target);
        }
      }, 150);
      
      setTimeout(() => {
        this.bot.setControlState('jump', false);
      }, 200);
    }
  }

  _stopAttacking() {
    if (this.isAttacking) {
      this.bot.clearControlStates();
      this.isAttacking = false;
    }
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
    this._stopAttacking();
  }

  getStatus() {
    return {
      enabled: this.enabled,
      attacking: this.isAttacking,
      target: this.targetManager?.currentTarget,
      enemyCount: this.targetManager?.getEnemyCount() || 0,
      combatState: this.combatState
    };
  }
}

module.exports = CombatEngine;