class CrystalSystem {
  constructor(bot, logger, config) {
    this.bot = bot;
    this.logger = logger;
    this.config = config;
    
    this.crystals = [];
    this.obsidian = [];
    this.lastCrystal = 0;
    this.crystalCooldown = 2000;
    this.anchorCharged = false;
    this.respawnAnchor = null;
    
    this.crystalInterval = null;
    this.crystalEnabled = config.combat?.crystalEnabled || false;
  }

  start() {
    this._scanForMaterials();
    this.logger.info('Crystal system started');
  }

  stop() {
    if (this.crystalInterval) {
      clearInterval(this.crystalInterval);
      this.crystalInterval = null;
    }
  }

  _scanForMaterials() {
    const items = this.bot.inventory.items();
    
    this.crystals = [];
    this.obsidian = [];
    this.respawnAnchor = null;
    
    for (const item of items) {
      if (!item) continue;
      const name = item.name.toLowerCase();
      
      if (name === 'end_crystal') {
        this.crystals.push(item);
      } else if (name === 'obsidian') {
        this.obsidian.push(item);
      } else if (name === 'respawn_anchor') {
        this.respawnAnchor = item;
      }
    }
    
    this.logger.info(`Materials: crystals=${this.crystals.length}, obsidian=${this.obsidian.length}`);
  }

  async _placeCrystal(targetEntity) {
    const now = Date.now();
    if (now - this.lastCrystal < this.crystalCooldown) return false;
    if (this.crystals.length === 0 || this.obsidian.length === 0) return false;
    
    try {
      const obsidianSlot = this.obsidian[0].slot;
      const crystalSlot = this.crystals[0].slot;
      
      this.bot.setQuickBarSlot(obsidianSlot);
      const pos = this._getCrystalPosition(targetEntity);
      
      await this._placeBlockAt(pos);
      
      this.bot.setQuickBarSlot(crystalSlot);
      await this._placeBlockAt(pos);
      
      this.bot.lookAt(targetEntity.position, true);
      this.bot.attack(this.bot.entity);
      
      this.lastCrystal = now;
      this.crystals.pop();
      
      this.logger.info('Crystal combo executed');
      return true;
    } catch (err) {
      this.logger.debug(`Crystal error: ${err.message}`);
      return false;
    }
  }

  _getCrystalPosition(targetEntity) {
    if (!this.bot.entity || !targetEntity) return null;
    
    const botPos = this.bot.entity.position;
    const targetPos = targetEntity.position;
    
    const direction = {
      x: targetPos.x - botPos.x,
      z: targetPos.z - botPos.z
    };
    
    const dist = Math.sqrt(direction.x * direction.x + direction.z * direction.z);
    const normalized = {
      x: direction.x / dist,
      z: direction.z / dist
    };
    
    const crystalPos = {
      x: targetPos.x + normalized.x * 1.5,
      y: targetPos.y,
      z: targetPos.z + normalized.z * 1.5
    };
    
    return crystalPos;
  }

  async _placeBlockAt(position) {
    if (!position) return;
    
    const block = this.bot.blockAt(position);
    if (block && block.name !== 'air') {
      this.bot.placeBlock(block, this.bot.entity.position);
    }
  }

  _useRespawnAnchor() {
    if (!this.respawnAnchor || !this.anchorCharged) return;
    
    try {
      this.bot.setQuickBarSlot(this.respawnAnchor.slot);
      this.bot.activateItem();
      this.logger.info('Respawn anchor used');
    } catch (err) {
      this.logger.debug(`Anchor error: ${err.message}`);
    }
  }

  tryCrystalCombo(targetEntity) {
    if (!this.crystalEnabled) return false;
    if (!targetEntity) return false;
    
    const distance = this.bot.entity.position.distanceTo(targetEntity.position);
    
    if (distance <= 6 && distance > 2) {
      return this._placeCrystal(targetEntity);
    }
    
    return false;
  }

  getCrystalCount() {
    return this.crystals.length;
  }

  refresh() {
    this._scanForMaterials();
  }
}

module.exports = CrystalSystem;