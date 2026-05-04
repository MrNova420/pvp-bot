class TargetManager {
  constructor(bot, logger, config) {
    this.bot = bot;
    this.logger = logger;
    this.config = config;
    
    this.enemies = new Map();
    this.currentTarget = null;
    this.owner = config.owner?.username || 'Player';
    
    this.scanInterval = null;
    this.scanRange = 16;
    this.attackPriority = true;
  }

  start() {
    this.scanInterval = setInterval(() => {
      this._scanForTargets();
    }, 500);
    
    this.logger.info('Target manager started');
  }

  stop() {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
  }

  _scanForTargets() {
    if (!this.bot || !this.bot.entity) return;
    
    this.enemies.clear();
    
    try {
      const nearbyEntities = this.bot.entities;
      if (!nearbyEntities) return;
      
      for (const [id, entity] of nearbyEntities) {
        if (!entity || entity.type !== 'player') continue;
        if (!entity.username || entity.username === this.bot.username) continue;
        if (entity.username === this.owner) continue;
        
        const distance = this.bot.entity.position.distanceTo(entity.position);
        
        if (distance <= this.scanRange) {
          this.enemies.set(entity.username, {
            entity: entity,
            distance: distance,
            lastSeen: Date.now()
          });
        }
      }
    } catch (e) {
      this.logger.debug('Scan error:', e.message);
    }
    
    if (this.enemies.size > 0 && !this.currentTarget) {
      this._selectPriorityTarget();
    }
    
    if (this.currentTarget) {
      const target = this.enemies.get(this.currentTarget);
      if (!target || target.distance > this.scanRange * 1.5) {
        this.currentTarget = null;
        this._selectPriorityTarget();
      }
    }
  }

  _selectPriorityTarget() {
    let closest = null;
    let closestDist = Infinity;
    
    for (const [username, data] of this.enemies) {
      if (data.distance < closestDist) {
        closestDist = data.distance;
        closest = username;
      }
    }
    
    this.currentTarget = closest;
  }

  setTarget(username) {
    if (this.enemies.has(username)) {
      this.currentTarget = username;
      this.logger.info(`Target set to: ${username}`);
    }
  }

  clearTarget() {
    this.currentTarget = null;
  }

  getTarget() {
    if (!this.currentTarget) return null;
    return this.enemies.get(this.currentTarget);
  }

  getTargetEntity() {
    const target = this.getTarget();
    return target ? target.entity : null;
  }

  hasTarget() {
    return this.currentTarget !== null;
  }

  getEnemyCount() {
    return this.enemies.size;
  }

  getAllEnemies() {
    return Array.from(this.enemies.keys());
  }
}

module.exports = TargetManager;