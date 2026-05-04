class AFKAddon {
  constructor() {
    this.name = 'afk';
    this.bot = null;
    this.engine = null;
    this.logger = null;
    this.enabled = false;
    
    this.movementInterval = null;
    this.statusInterval = null;
    this.combatCheckInterval = null;
    this.config = {};
    
    this.isMoving = false;
    this.isFleeing = false;
  }
  
  init(bot, engine) {
    this.bot = bot;
    this.engine = engine;
    this.logger = engine.getLogger();
    this.config = engine.config.afkMode || {};
    
    this._setupEventHandlers();
    
    if (engine.currentMode === 'afk') {
      setTimeout(() => {
        this.enable();
      }, 1000);
    }
  }
  
  _setupEventHandlers() {
    this.bot.on('death', () => {
      if (this.enabled && this.config.autoRespawn) {
        setTimeout(() => {
          try {
            this.bot.respawn();
            this.isFleeing = false;
            this.isMoving = false;
            setTimeout(() => {
              this._emergencyFlee();
            }, 500);
          } catch (err) {
            this.logger.error('[AFK] Respawn error:', err.message);
          }
        }, 1500);
      }
    });
    
    this.bot.on('health', () => {
      if (this.enabled) {
        if (this.bot.food < 18 && this.config.autoEat) {
          this._tryEat();
        }
        if (this.bot.health < 10) {
          this._emergencyFlee();
        }
      }
    });
    
    this.bot.on('entityHurt', (entity) => {
      if (this.enabled && entity === this.bot.entity) {
        this._emergencyFlee();
      }
    });
  }
  
  enable() {
    if (this.enabled) return;
    
    if (!this.bot || !this.bot.entity) {
      this.logger.warn('[AFK] Cannot enable - bot not connected');
      return;
    }
    
    this.enabled = true;
    this.logger.info('[AFK] Mode activated - Bot will move and defend itself');
    
    setTimeout(() => {
      this._checkForThreats();
    }, 500);
    
    this.movementInterval = setInterval(() => {
      if (!this.isFleeing) {
        this._performMovement();
      }
    }, 8000);
    
    this.combatCheckInterval = setInterval(() => {
      if (!this.isFleeing) {
        this._checkForThreats();
      }
    }, 300);
    
    const statusInterval = this.config.statusUpdateInterval || 90000;
    this.statusInterval = setInterval(() => {
      this._logStatus();
    }, statusInterval);
    
    setTimeout(() => {
      this._performMovement();
    }, 2000);
  }
  
  disable() {
    if (!this.enabled) return;
    
    this.enabled = false;
    this.logger.info('[AFK] Mode deactivated');
    
    if (this.movementInterval) {
      clearInterval(this.movementInterval);
      this.movementInterval = null;
    }
    
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }
    
    if (this.combatCheckInterval) {
      clearInterval(this.combatCheckInterval);
      this.combatCheckInterval = null;
    }
    
    if (this.bot) {
      this.bot.clearControlStates();
    }
  }
  
  _performMovement() {
    if (!this.bot || !this.bot.entity || !this.enabled) return;
    if (this.isMoving || this.isFleeing) return;
    
    this.isMoving = true;
    
    try {
      const angle = Math.random() * Math.PI * 2;
      const distance = 3 + Math.random() * 6;
      
      const dx = Math.cos(angle) * distance;
      const dz = Math.sin(angle) * distance;
      
      const currentPos = this.bot.entity.position;
      const targetPos = currentPos.offset(dx, 0, dz);
      
      this.bot.clearControlStates();
      this.bot.lookAt(targetPos, true);
      this.bot.setControlState('forward', true);
      
      if (Math.random() < 0.5) {
        this.bot.setControlState('sprint', true);
      }
      
      const moveTime = 1500 + Math.random() * 2000;
      
      setTimeout(() => {
        if (this.bot && this.enabled) {
          this.bot.clearControlStates();
          
          if (Math.random() < 0.4) {
            this.bot.setControlState('jump', true);
            setTimeout(() => {
              if (this.bot) this.bot.setControlState('jump', false);
            }, 250);
          }
        }
        this.isMoving = false;
      }, moveTime);
      
    } catch (err) {
      this.logger.error('[AFK] Movement error:', err.message);
      this.isMoving = false;
      if (this.bot) this.bot.clearControlStates();
    }
  }
  
  _emergencyFlee() {
    if (!this.bot || !this.bot.entity || !this.enabled) return;
    if (this.isFleeing) return;
    
    this.isFleeing = true;
    this.isMoving = false;
    
    try {
      const angle = Math.random() * Math.PI * 2;
      const distance = 60;
      
      const dx = Math.cos(angle) * distance;
      const dz = Math.sin(angle) * distance;
      
      const currentPos = this.bot.entity.position;
      const escapePos = currentPos.offset(dx, 0, dz);
      
      this.logger.info(`[AFK] EMERGENCY FLEE! Health: ${this.bot.health}`);
      
      this.bot.clearControlStates();
      this.bot.lookAt(escapePos, true);
      this.bot.setControlState('forward', true);
      this.bot.setControlState('sprint', true);
      this.bot.setControlState('jump', true);
      
      setTimeout(() => {
        if (this.bot && this.enabled) {
          this.bot.clearControlStates();
        }
        this.isFleeing = false;
      }, 8000);
      
    } catch (err) {
      this.logger.error('[AFK] Emergency flee error:', err.message);
      this.isFleeing = false;
      if (this.bot) this.bot.clearControlStates();
    }
  }
  
  _checkForThreats() {
    if (!this.bot || !this.bot.entity || !this.enabled) return;
    if (!this.config.avoidMobs) return;
    
    try {
      const entities = Object.values(this.bot.entities);
      
      const hostileMobs = entities.filter(e => {
        if (!e || !e.position || !e.type || e.type !== 'mob') return false;
        const mobName = (e.displayName || e.name || '').toLowerCase();
        if (!mobName) return false;
        
        const hostileTypes = ['zombie', 'skeleton', 'spider', 'creeper', 'enderman', 'witch', 'pillager', 'vindicator', 'phantom'];
        return hostileTypes.some(type => mobName.includes(type));
      });
      
      const nearbyHostiles = hostileMobs.filter(mob => {
        const distance = this.bot.entity.position.distanceTo(mob.position);
        return distance < 16;
      }).sort((a, b) => {
        const distA = this.bot.entity.position.distanceTo(a.position);
        const distB = this.bot.entity.position.distanceTo(b.position);
        return distA - distB;
      });
      
      if (nearbyHostiles.length > 0) {
        const closestMob = nearbyHostiles[0];
        const distance = this.bot.entity.position.distanceTo(closestMob.position);
        const health = this.bot.health || 0;
        
        if (distance < 12 || health < 14 || nearbyHostiles.length > 1) {
          this._fleeFromMob(closestMob);
        }
      }
    } catch (err) {
      this.logger.debug('[AFK] Threat check error:', err.message);
    }
  }
  
  _fleeFromMob(mob) {
    if (!this.bot || !this.bot.entity) return;
    if (this.isFleeing) return;
    
    this.isFleeing = true;
    this.isMoving = false;
    
    try {
      const currentPos = this.bot.entity.position;
      const mobPos = mob.position;
      
      const dx = currentPos.x - mobPos.x;
      const dz = currentPos.z - mobPos.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      if (distance > 0.1) {
        const fleeDistance = 50;
        const escapePos = currentPos.offset(
          (dx / distance) * fleeDistance,
          0,
          (dz / distance) * fleeDistance
        );
        
        this.bot.clearControlStates();
        this.bot.lookAt(escapePos, true);
      }
      
      const mobName = mob.displayName || mob.name || 'hostile mob';
      this.logger.info(`[AFK] FLEEING from ${mobName}! Health: ${this.bot.health}`);
      
      this.bot.setControlState('forward', true);
      this.bot.setControlState('sprint', true);
      this.bot.setControlState('jump', true);
      
      setTimeout(() => {
        if (this.bot && this.enabled) {
          this.bot.clearControlStates();
        }
        this.isFleeing = false;
      }, 7000);
      
    } catch (err) {
      this.logger.error('[AFK] Flee error:', err.message);
      this.isFleeing = false;
      if (this.bot) this.bot.clearControlStates();
    }
  }
  
  _tryEat() {
    if (!this.bot || !this.enabled) return;
    
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
                this.logger.info('[AFK] Ate food');
              }
            });
          }
        });
      }
    } catch (err) {
      this.logger.debug('[AFK] Eat error:', err.message);
    }
  }
  
  _logStatus() {
    if (!this.bot || !this.bot.entity) return;
    
    const pos = this.bot.entity.position;
    const status = this.isFleeing ? 'FLEEING' : 'ACTIVE';
    this.logger.info(`[AFK] ${status} | Health=${this.bot.health}/20 | Food=${this.bot.food}/20 | Pos=(${Math.round(pos.x)}, ${Math.round(pos.y)}, ${Math.round(pos.z)})`);
  }
  
  cleanup() {
    this.disable();
  }
}

module.exports = new AFKAddon();
