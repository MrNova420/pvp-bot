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
    
    this.enableCrits = true;
    this.enableStrafe = true;
    this.enableWTap = true;
    this.enableAntiKB = true;
    this.enableWeaponSwitch = true;
    this.autoHeal = true;
    this.healThreshold = 10;
    
    this.strafeAngle = 0;
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
    
    this.logger.info('[PvP] addon initialized - range:' + this.attackRange + ' cps:' + this.cps);
  }

  enable() {
    if (this.enabled) return;
    this.enabled = true;
    
    this.bot.on('physicsTick', () => this._combatLoop());
    this.bot.on('chat', (username, msg) => this._handleChat(username, msg));
    this.bot.on('death', () => this._onDeath());
    
    this.logger.info('[PvP] Combat Mode ENABLED');
  }

  disable() {
    if (!this.enabled) return;
    this.enabled = false;
    this.targets.clear();
    this.logger.info('[PvP] Combat Mode disabled');
  }

  _combatLoop() {
    if (!this.enabled) return;
    
    // Find and attack enemies
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
    
    const range = this.attackRange;
    const enemies = [];
    
    for (const username in this.bot.players) {
      const player = this.bot.players[username];
      if (player.entity && username !== this.bot.username) {
        const dist = this.bot.entity.position.distanceTo(player.entity.position);
        if (dist <= range) {
          enemies.push(player);
        }
      }
    }
    
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
        setTimeout(() => this.bot.setControlState('forward', true), 50);
      }
      
      // Circle strafe
      if (this.enableStrafe) {
        this.strafeAngle += 0.3;
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
      if (this.enableCrits && !this.bot.entity.isInWater) {
        this.bot.setControlState('jump', true);
        setTimeout(() => this.bot.setControlState('jump', false), 150);
      }
      
    } catch(e) {}
  }

  _heal() {
    try {
      const foods = this.bot.inventory.items().filter(item => 
        item && item.name && (
          item.name.includes('bread') ||
          item.name.includes('apple') ||
          item.name.includes('cooked')
        )
      );
      
      if (foods.length > 0) {
        this.bot.equip(foods[0], 'hand', err => {
          if (!err) this.bot.consume(() => {});
        });
      }
    } catch(e) {}
  }

  _onDeath() {
    this.logger.info('[PvP] Died! Respawning...');
    setTimeout(() => {
      try { this.bot.respawn(); } catch(e) {}
    }, 1500);
  }

  _handleChat(username, message) {
    const owner = this.engine.config.owner?.username;
    if (!owner) return;
    
    if (message === '!pvp' && username === owner) {
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