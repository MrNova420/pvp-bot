class PearlSystem {
  constructor(bot, logger, config) {
    this.bot = bot;
    this.logger = logger;
    this.config = config;
    
    this.pearlCooldown = 4000;
    this.lastPearl = 0;
    this.pearls = [];
    
    this.pearlInterval = null;
    this.autoPearl = config.combat?.autoPearl || false;
    this.lowHealthThreshold = 6;
    this.enemyCountThreshold = 3;
    this.distanceThreshold = 2;
  }

  start() {
    this._scanForPearls();
    
    this.logger.info('Pearl system started');
  }

  stop() {
    if (this.pearlInterval) {
      clearInterval(this.pearlInterval);
      this.pearlInterval = null;
    }
  }

  _scanForPearls() {
    if (this.pearls.length > 0) return;
    
    const items = this.bot.inventory.items();
    
    for (const item of items) {
      if (item && item.name && item.name.includes('ender_pearl')) {
        this.pearls.push(item);
      }
    }
    
    this.logger.info(`Found ${this.pearls.length} ender pearls`);
  }

  _usePearl(targetPosition) {
    if (!this.bot.entity) return false;
    
    const now = Date.now();
    if (now - this.lastPearl < this.pearlCooldown) return false;
    
    if (this.pearls.length === 0) {
      this._scanForPearls();
      if (this.pearls.length === 0) return false;
    }
    
    const pearl = this.pearls[0];
    const slot = pearl.slot;
    
    try {
      this.bot.setQuickBarSlot(slot);
      
      if (targetPosition) {
        this.bot.lookAt(targetPosition, true);
      }
      
      this.bot.activateItem();
      
      this.lastPearl = now;
      this.pearls.pop();
      
      this.logger.info('Used ender pearl');
      return true;
    } catch (err) {
      this.logger.debug(`Pearl error: ${err.message}`);
      return false;
    }
  }

  throwPearlToward(direction) {
    if (!this.bot.entity) return false;
    
    const currentPos = this.bot.entity.position;
    const angle = typeof direction === 'number' ? direction : Math.atan2(direction.z, direction.x);
    
    const throwDistance = 20 + Math.random() * 15;
    const targetPos = currentPos.offset(
      Math.cos(angle) * throwDistance,
      direction.y || 0,
      Math.sin(angle) * throwDistance
    );
    
    return this._usePearl(targetPos);
  }

  throwPearlBehind() {
    if (!this.bot.entity) return false;
    
    const target = this.targetManager?.getTargetEntity();
    if (!target) return false;
    
    const angle = Math.atan2(
      this.bot.entity.position.z - target.position.z,
      this.bot.entity.position.x - target.position.x
    );
    
    return this.throwPearlToward({ x: Math.cos(angle), y: 1, z: Math.sin(angle) });
  }

  throwPearlAway() {
    if (!this.bot.entity) return false;
    
    const target = this.targetManager?.getTargetEntity();
    if (!target) return false;
    
    const angle = Math.atan2(
      this.bot.entity.position.z - target.position.z,
      this.bot.entity.position.x - target.position.x
    );
    
    return this.throwPearlToward({ x: Math.cos(angle), y: 0, z: Math.sin(angle) });
  }

  pearlToSafety() {
    if (!this.bot.entity) return false;
    
    const target = this.targetManager?.getTargetEntity();
    let angle = Math.random() * Math.PI * 2;
    
    if (target) {
      angle = Math.atan2(
        this.bot.entity.position.z - target.position.z,
        this.bot.entity.position.x - target.position.x
      );
    }
    
    return this.throwPearlToward({ x: Math.cos(angle), y: 1, z: Math.sin(angle) });
  }

  tryAutoPearl() {
    if (!this.autoPearl) return false;
    if (!this.bot.entity) return false;
    
    const health = this.bot.health;
    const enemyCount = this.targetManager?.getEnemyCount() || 0;
    const target = this.targetManager?.getTargetEntity();
    
    if (health <= this.lowHealthThreshold && enemyCount >= this.enemyCountThreshold) {
      return this.pearlToSafety();
    }
    
    if (target) {
      const distance = this.bot.entity.position.distanceTo(target.position);
      
      if (distance <= this.distanceThreshold && health <= 10 && enemyCount > 1) {
        return this.throwPearlAway();
      }
    }
    
    return false;
  }

  getPearlCount() {
    if (this.pearls.length === 0) {
      this._scanForPearls();
    }
    return this.pearls.length;
  }

  canPearl() {
    return this.pearls.length > 0 && Date.now() - this.lastPearl >= this.pearlCooldown;
  }

  refreshPearls() {
    this.pearls = [];
    this._scanForPearls();
  }
}

module.exports = PearlSystem;