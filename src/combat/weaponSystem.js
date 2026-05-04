class WeaponSystem {
  constructor(bot, logger, config) {
    this.bot = bot;
    this.logger = logger;
    this.config = config;
    
    this.lastWeaponSwitch = 0;
    this.weaponSwitchCooldown = 500;
    
    this.weapons = {
      sword: null,
      axe: null,
      bow: null,
      crossbow: null,
      trident: null
    };
    
    this.currentWeapon = 'sword';
    this.lastAttack = 0;
    this.attackSpeed = 400;
    
    this.shieldCheckInterval = null;
    this.shieldCheckRange = 6;
    this.opponentBlocking = false;
    
    this.inventoryScanned = false;
  }

  start() {
    this._scanInventory();
    
    this.shieldCheckInterval = setInterval(() => {
      this._checkForShields();
    }, 200);
    
    this.logger.info('Weapon system started');
  }

  stop() {
    if (this.shieldCheckInterval) {
      clearInterval(this.shieldCheckInterval);
      this.shieldCheckInterval = null;
    }
  }

  _scanInventory() {
    if (this.inventoryScanned) return;
    
    const items = this.bot.inventory.items();
    
    for (const item of items) {
      if (!item) continue;
      
      const name = item.name.toLowerCase();
      
      if (name.includes('sword')) {
        if (!this.weapons.sword || this._compareWeapon(item, this.weapons.sword, 'sword')) {
          this.weapons.sword = item;
        }
      }
      
      if (name.includes('axe') && !name.includes('pickaxe')) {
        if (!this.weapons.axe || this._compareWeapon(item, this.weapons.axe, 'axe')) {
          this.weapons.axe = item;
        }
      }
      
      if (name.includes('bow') && !name.includes('string')) {
        this.weapons.bow = item;
      }
      
      if (name.includes('crossbow')) {
        this.weapons.crossbow = item;
      }
      
      if (name.includes('trident')) {
        this.weapons.trident = item;
      }
    }
    
    this.logger.info(`Weapons found: sword=${this.weapons.sword?.name}, axe=${this.weapons.axe?.name}, bow=${this.weapons.bow?.name}`);
    this.inventoryScanned = true;
  }

  _compareWeapon(newItem, existingItem, type) {
    const priorities = {
      sword: ['netherite', 'diamond', 'iron', 'stone', 'wooden'],
      axe: ['netherite', 'diamond', 'iron', 'stone', 'wooden']
    };
    
    const newName = newItem.name.toLowerCase();
    const existName = existingItem.name.toLowerCase();
    
    const newTier = priorities[type].findIndex(t => newName.includes(t));
    const existTier = priorities[type].findIndex(t => existName.includes(t));
    
    return newTier < existTier;
  }

  _checkForShields() {
    if (!this.bot.entity) return;
    
    const target = this.bot.players[Object.keys(this.bot.players).find(u => u !== this.bot.username)];
    const entity = target?.entity;
    
    if (!entity) {
      this.opponentBlocking = false;
      return;
    }
    
    const distance = this.bot.entity.position.distanceTo(entity.position);
    
    if (distance > this.shieldCheckRange) {
      this.opponentBlocking = false;
      return;
    }
    
    const heldItem = entity.heldItem;
    
    if (heldItem && heldItem.name && heldItem.name.includes('shield')) {
      this.opponentBlocking = true;
    } else {
      this.opponentBlocking = false;
    }
  }

  checkAndSwitch(targetEntity) {
    if (!targetEntity) return;
    
    const now = Date.now();
    if (now - this.lastWeaponSwitch < this.weaponSwitchCooldown) return;
    
    this._scanInventory();
    
    if (this.opponentBlocking && this.weapons.axe) {
      this._switchToWeapon('axe');
      this.currentWeapon = 'axe';
    } else if (!this.opponentBlocking && this.currentWeapon === 'axe' && this.weapons.sword) {
      this._switchToWeapon('sword');
      this.currentWeapon = 'sword';
    }
    
    const distance = this.bot.entity.position.distanceTo(targetEntity.position);
    
    if (distance > 4 && this.weapons.bow) {
      this._switchToWeapon('bow');
      this.currentWeapon = 'bow';
    } else if (distance <= 4 && (this.currentWeapon === 'bow' || this.currentWeapon === 'crossbow')) {
      if (this.weapons.sword) {
        this._switchToWeapon('sword');
        this.currentWeapon = 'sword';
      } else if (this.weapons.trident) {
        this._switchToWeapon('trident');
        this.currentWeapon = 'trident';
      }
    }
  }

  _switchToWeapon(type) {
    const weapon = this.weapons[type];
    if (!weapon) return;
    
    const slot = weapon.slot;
    if (slot === undefined) return;
    
    try {
      this.bot.setQuickBarSlot(slot);
      this.lastWeaponSwitch = Date.now();
      this.logger.debug(`Switched to ${type}`);
    } catch (err) {
      this.logger.debug(`Weapon switch error: ${err.message}`);
    }
  }

  hasWeapon(type) {
    return this.weapons[type] !== null;
  }

  getCurrentWeapon() {
    return this.currentWeapon;
  }

  isOpponentBlocking() {
    return this.opponentBlocking;
  }

  getWeapons() {
    return {
      sword: this.weapons.sword?.name,
      axe: this.weapons.axe?.name,
      bow: this.weapons.bow?.name,
      crossbow: this.weapons.crossbow?.name,
      trident: this.weapons.trident?.name
    };
  }

  refreshInventory() {
    this.inventoryScanned = false;
    this._scanInventory();
  }
}

module.exports = WeaponSystem;