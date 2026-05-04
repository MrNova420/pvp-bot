class PotionSystem {
  constructor(bot, logger, config) {
    this.bot = bot;
    this.logger = logger;
    this.config = config;
    
    this.potionCooldown = 5000;
    this.lastPotion = 0;
    this.potions = {
      healing: [],
      regeneration: [],
      weakness: [],
      harming: [],
      strength: [],
      speed: [],
      fireResistance: [],
      invisibility: []
    };
    
    this.potionInterval = null;
    this.autoPotion = config.combat?.autoPotion || false;
    this.lowHealthThreshold = 8;
    this.enemyLowHealth = false;
  }

  start() {
    this._scanForPotions();
    this.logger.info('Potion system started');
  }

  stop() {
    if (this.potionInterval) {
      clearInterval(this.potionInterval);
      this.potionInterval = null;
    }
  }

  _scanForPotions() {
    const items = this.bot.inventory.items();
    
    for (const item of items) {
      if (!item) continue;
      const name = item.name.toLowerCase();
      
      if (name.includes('splash_potion')) {
        if (name.includes('healing') && !name.includes('regeneration')) {
          this.potions.healing.push(item);
        } else if (name.includes('regeneration')) {
          this.potions.regeneration.push(item);
        } else if (name.includes('weakness')) {
          this.potions.weakness.push(item);
        } else if (name.includes('harming')) {
          this.potions.harming.push(item);
        } else if (name.includes('strength')) {
          this.potions.strength.push(item);
        } else if (name.includes('speed')) {
          this.potions.speed.push(item);
        } else if (name.includes('fire_resistance') || name.includes('fire resistance')) {
          this.potions.fireResistance.push(item);
        }
      }
    }
    
    this.logger.info(`Potions: healing=${this.potions.healing.length}, regen=${this.potions.regeneration.length}, weakness=${this.potions.weakness.length}`);
  }

  _throwPotion(type, targetPosition) {
    const now = Date.now();
    if (now - this.lastPotion < this.potionCooldown) return false;
    
    if (this.potions[type].length === 0) {
      this._scanForPotions();
      if (this.potions[type].length === 0) return false;
    }
    
    const potion = this.potions[type][0];
    const slot = potion.slot;
    
    try {
      this.bot.setQuickBarSlot(slot);
      if (targetPosition) {
        this.bot.lookAt(targetPosition, true);
      }
      this.bot.activateItem();
      this.lastPotion = now;
      this.potions[type].pop();
      this.logger.info(`Threw ${type} potion`);
      return true;
    } catch (err) {
      this.logger.debug(`Potion error: ${err.message}`);
      return false;
    }
  }

  throwHealing(targetEntity) {
    const targetPos = targetEntity ? targetEntity.position : this.bot.entity.position;
    return this._throwPotion('healing', targetPos);
  }

  throwRegen(targetEntity) {
    const targetPos = targetEntity ? targetEntity.position : this.bot.entity.position;
    return this._throwPotion('regeneration', targetPos);
  }

  throwWeakness(targetEntity) {
    if (!targetEntity) return false;
    return this._throwPotion('weakness', targetEntity.position);
  }

  throwHarming(targetEntity) {
    if (!targetEntity) return false;
    return this._throwPotion('harming', targetEntity.position);
  }

  throwStrengthSelf() {
    return this._throwPotion('strength', this.bot.entity.position);
  }

  throwSpeedSelf() {
    return this._throwPotion('speed', this.bot.entity.position);
  }

  tryAutoPotions() {
    if (!this.autoPotion || !this.bot.entity) return false;
    
    const health = this.bot.health;
    const target = this.targetManager?.getTargetEntity();
    
    if (health <= this.lowHealthThreshold && this.potions.healing.length > 0) {
      return this.throwHealing(this.bot.entity);
    }
    
    if (health <= 10 && this.potions.regeneration.length > 0 && this.potions.healing.length === 0) {
      return this.throwRegen(this.bot.entity);
    }
    
    if (target && this.enemyLowHealth && this.potions.harming.length > 0) {
      return this.throwHarming(target);
    }
    
    return false;
  }

  getPotionCount(type) {
    if (type) {
      return this.potions[type]?.length || 0;
    }
    let total = 0;
    for (const t in this.potions) {
      total += this.potions[t].length;
    }
    return total;
  }

  canThrow() {
    return Date.now() - this.lastPotion >= this.potionCooldown;
  }

  refreshPotions() {
    for (const type in this.potions) {
      this.potions[type] = [];
    }
    this._scanForPotions();
  }
}

module.exports = PotionSystem;