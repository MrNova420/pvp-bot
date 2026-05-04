class BowSystem {
  constructor(bot, logger, config) {
    this.bot = bot;
    this.logger = logger;
    this.config = config;
    
    this.bowSlot = null;
    this.arrowCount = 0;
    this.isCharged = false;
    this.chargeTime = 20;
    this.maxChargeTime = 20;
    this.lastShot = 0;
    this.shootCooldown = 200;
    
    this.bowInterval = null;
    this.rangedEnabled = config.combat?.rangedEnabled !== false;
    this.rangedRange = config.combat?.rangedRange || 20;
  }

  start() {
    this._scanForBow();
    this._scanForArrows();
    
    this.bowInterval = setInterval(() => {
      this._bowLoop();
    }, 100);
    
    this.logger.info('Bow system started');
  }

  stop() {
    if (this.bowInterval) {
      clearInterval(this.bowInterval);
      this.bowInterval = null;
    }
  }

  _scanForBow() {
    const items = this.bot.inventory.items();
    
    for (const item of items) {
      if (item && item.name && (item.name.includes('bow') || item.name.includes('crossbow'))) {
        this.bowSlot = item.slot;
        this.logger.info(`Found bow in slot ${item.slot}`);
        break;
      }
    }
  }

  _scanForArrows() {
    const items = this.bot.inventory.items();
    this.arrowCount = 0;
    
    for (const item of items) {
      if (item && item.name && item.name.includes('arrow')) {
        this.arrowCount += item.count;
      }
    }
    
    this.logger.info(`Found ${this.arrowCount} arrows`);
  }

  _bowLoop() {
    if (!this.rangedEnabled || !this.bot.entity) return;
    
    const target = this.targetManager?.getTargetEntity();
    if (!target) return;
    
    const distance = this.bot.entity.position.distanceTo(target.position);
    
    if (distance > this.rangedRange) {
      this._chargeAndShoot(target);
    }
  }

  _chargeAndShoot(target) {
    if (!this.bowSlot || this.arrowCount === 0) return;
    
    const now = Date.now();
    if (now - this.lastShot < this.shootCooldown) return;
    
    try {
      this.bot.setQuickBarSlot(this.bowSlot);
      
      this.bot.lookAt(target.position.offset(0, 1.6, 0), true);
      
      this.bot.setControlState('forward', true);
      this.bot.activateItem();
      
      setTimeout(() => {
        if (this.bot && this.bot.entity) {
          this.bot.deactivateItem();
          this.lastShot = now;
          this.arrowCount--;
        }
      }, this.chargeTime * 50 + Math.random() * 100);
      
    } catch (err) {
      this.logger.debug(`Bow error: ${err.message}`);
    }
  }

  _predictShot(target) {
    if (!target || !this.bot.entity) return target.position;
    
    const distance = this.bot.entity.position.distanceTo(target.position);
    const flightTime = distance / 25;
    
    const velocity = target.velocity || { x: 0, z: 0 };
    
    const predictedPos = target.position.offset(
      velocity.x * flightTime,
      0,
      velocity.z * flightTime
    );
    
    return predictedPos;
  }

  hasBow() {
    return this.bowSlot !== null && this.arrowCount > 0;
  }

  getArrowCount() {
    return this.arrowCount;
  }

  refresh() {
    this._scanForBow();
    this._scanForArrows();
  }
}

module.exports = BowSystem;