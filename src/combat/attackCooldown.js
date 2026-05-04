class AttackCooldown {
  constructor(bot, logger) {
    this.bot = bot;
    this.logger = logger;
    
    this.weaponSpeeds = {
      'wooden_sword': 0.6,
      'stone_sword': 0.6,
      'iron_sword': 0.6,
      'diamond_sword': 0.6,
      'netherite_sword': 0.6,
      'golden_sword': 0.6,
      'wooden_axe': 1.2,
      'stone_axe': 1.2,
      'iron_axe': 1.1,
      'diamond_axe': 1.0,
      'netherite_axe': 1.0,
      'trident': 0.9,
      'mace': 0.8
    };
    
    this.currentWeapon = null;
    this.cooldownStart = 0;
    this.cooldownDuration = 0;
    this.cooldownPercent = 0;
    this.lastAttackTime = 0;
    
    this.critRequirement = 0.848;
    this.lastAttack = 0;
  }

  setWeapon(item) {
    if (!item) {
      this.currentWeapon = 'fists';
      this.cooldownDuration = 0;
      return;
    }
    
    const name = item.name.toLowerCase();
    let speed = 0.6;
    
    for (const [weapon, spd] of Object.entries(this.weaponSpeeds)) {
      if (name.includes(weapon)) {
        speed = spd;
        break;
      }
    }
    
    this.currentWeapon = name;
    this.cooldownDuration = speed * 1000;
    this.cooldownStart = 0;
  }

  startCooldown() {
    this.cooldownStart = Date.now();
    this.lastAttackTime = Date.now();
  }

  update() {
    if (this.cooldownStart === 0 || this.cooldownDuration === 0) {
      this.cooldownPercent = 1;
      return 1;
    }
    
    const elapsed = Date.now() - this.cooldownStart;
    this.cooldownPercent = Math.min(1, elapsed / this.cooldownDuration);
    
    return this.cooldownPercent;
  }

  canAttack() {
    return this.update() >= 0.1;
  }

  canCrit() {
    return this.update() >= this.critRequirement;
  }

  getDamageMultiplier() {
    const percent = this.update();
    return 0.2 + (percent * percent * 0.8);
  }

  getOptimalAttackTime() {
    return this.cooldownDuration * 0.35;
  }

  shouldAttack() {
    const percent = this.update();
    const optimal = this.getOptimalAttackTime();
    
    if (percent < 0.3) return false;
    if (percent >= 0.85) return true;
    if (percent >= optimal / this.cooldownDuration) {
      return Math.random() < 0.6;
    }
    return false;
  }

  getTimeToFull() {
    return Math.max(0, this.cooldownDuration * (1 - this.cooldownPercent));
  }
}

module.exports = AttackCooldown;