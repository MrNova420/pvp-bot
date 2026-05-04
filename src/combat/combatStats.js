class CombatStats {
  constructor(bot, logger, config) {
    this.bot = bot;
    this.logger = logger;
    this.config = config;
    
    this.stats = {
      hitsLanded: 0,
      hitsMissed: 0,
      damageDealt: 0,
      damageTaken: 0,
      kills: 0,
      deaths: 0,
      critsLanded: 0,
      combos: 0,
      currentCombo: 0,
      maxCombo: 0,
      pearlsUsed: 0,
      potionsThrown: 0,
      crystalsUsed: 0,
      arrowsShot: 0,
      weaponsSwitched: 0,
      startTime: Date.now()
    };
    
    this.lastHitTime = 0;
    this.comboTimeout = 3000;
    this.recentDamage = [];
    this.maxRecentDamage = 20;
  }

  recordHit(crit = false) {
    this.stats.hitsLanded++;
    this.stats.currentCombo++;
    this.lastHitTime = Date.now();
    
    if (this.stats.currentCombo > this.stats.maxCombo) {
      this.stats.maxCombo = this.stats.currentCombo;
    }
    
    if (this.stats.currentCombo >= 3) {
      this.stats.combos++;
    }
    
    if (crit) {
      this.stats.critsLanded++;
    }
    
    this._checkComboTimeout();
  }

  recordMiss() {
    this.stats.hitsMissed++;
    this._checkComboTimeout();
  }

  recordDamage(amount, source) {
    this.stats.damageTaken += amount;
    this.recentDamage.push({
      amount: amount,
      source: source,
      time: Date.now()
    });
    
    if (this.recentDamage.length > this.maxRecentDamage) {
      this.recentDamage.shift();
    }
  }

  recordKill() {
    this.stats.kills++;
    this.stats.currentCombo = 0;
  }

  recordDeath() {
    this.stats.deaths++;
  }

  _checkComboTimeout() {
    if (Date.now() - this.lastHitTime > this.comboTimeout) {
      this.stats.currentCombo = 0;
    }
  }

  recordPearl() {
    this.stats.pearlsUsed++;
  }

  recordPotion() {
    this.stats.potionsThrown++;
  }

  recordCrystal() {
    this.stats.crystalsUsed++;
  }

  recordArrow() {
    this.stats.arrowsShot++;
  }

  recordWeaponSwitch() {
    this.stats.weaponsSwitched++;
  }

  getDPS() {
    const elapsed = (Date.now() - this.stats.startTime) / 1000;
    return this.stats.hitsLanded / elapsed;
  }

  getAccuracy() {
    const total = this.stats.hitsLanded + this.stats.hitsMissed;
    return total > 0 ? (this.stats.hitsLanded / total) * 100 : 0;
  }

  getCritRate() {
    return this.stats.hitsLanded > 0 ? (this.stats.critsLanded / this.stats.hitsLanded) * 100 : 0;
  }

  getKDRatio() {
    return this.stats.deaths > 0 ? this.stats.kills / this.stats.deaths : this.stats.kills;
  }

  getAverageDPS() {
    const elapsed = (Date.now() - this.stats.startTime) / 1000;
    return elapsed > 0 ? this.stats.damageDealt / elapsed : 0;
  }

  getRecentDPS() {
    const now = Date.now();
    const recent = this.recentDamage.filter(d => now - d.time < 5000);
    return recent.reduce((sum, d) => sum + d.amount, 0) / 5;
  }

  getReport() {
    const elapsed = (Date.now() - this.stats.startTime) / 1000;
    const minutes = Math.floor(elapsed / 60);
    const seconds = Math.floor(elapsed % 60);
    
    return {
      sessionTime: `${minutes}m ${seconds}s`,
      hitsLanded: this.stats.hitsLanded,
      hitsMissed: this.stats.hitsMissed,
      accuracy: this.getAccuracy().toFixed(1) + '%',
      critRate: this.getCritRate().toFixed(1) + '%',
      maxCombo: this.stats.maxCombo,
      kills: this.stats.kills,
      deaths: this.stats.deaths,
      KD: this.getKDRatio().toFixed(2),
      DPS: this.getDPS().toFixed(1),
      items: {
        pearls: this.stats.pearlsUsed,
        potions: this.stats.potionsThrown,
        crystals: this.stats.crystalsUsed,
        arrows: this.stats.arrowsShot
      }
    };
  }

  printReport() {
    const report = this.getReport();
    
    console.log('\n========== COMBAT STATS ==========');
    console.log(`Session: ${report.sessionTime}`);
    console.log(`Hits: ${report.hitsLanded} (${report.accuracy} accuracy)`);
    console.log(`Crits: ${report.critRate}`);
    console.log(`Max Combo: ${report.maxCombo}`);
    console.log(`K/D: ${report.KD} (${report.kills}/${report.deaths})`);
    console.log(`DPS: ${report.DPS}`);
    console.log(`Items: ${report.items.pearls}p ${report.items.potions}pot ${report.items.crystals}c ${report.items.arrows}a`);
    console.log('================================\n');
  }

  reset() {
    this.stats = {
      hitsLanded: 0,
      hitsMissed: 0,
      damageDealt: 0,
      damageTaken: 0,
      kills: 0,
      deaths: 0,
      critsLanded: 0,
      combos: 0,
      currentCombo: 0,
      maxCombo: 0,
      pearlsUsed: 0,
      potionsThrown: 0,
      crystalsUsed: 0,
      arrowsShot: 0,
      weaponsSwitched: 0,
      startTime: Date.now()
    };
    this.recentDamage = [];
  }
}

module.exports = CombatStats;