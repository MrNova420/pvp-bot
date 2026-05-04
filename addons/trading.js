class TradingAddon {
  constructor() {
    this.name = 'trading';
    this.bot = null;
    this.engine = null;
    this.logger = null;
  }
  
  init(bot, engine) {
    this.bot = bot;
    this.engine = engine;
    this.logger = engine.getLogger();
  }
  
  async findVillager() {
    const entities = Object.values(this.bot.entities);
    const villager = entities.find(e => e.name === 'villager');
    
    if (villager) {
      this.logger.info('[Trading] Found villager');
      return villager;
    }
    
    this.logger.warn('[Trading] No villager found');
    return null;
  }
  
  async openTradeWindow(villager) {
    try {
      const villagerEntity = this.bot.nearestEntity(e => e.id === villager.id);
      
      if (!villagerEntity) {
        this.logger.warn('[Trading] Villager not found');
        return false;
      }
      
      await this.bot.activateEntity(villagerEntity);
      this.logger.info('[Trading] Opened trade window');
      return true;
    } catch (err) {
      this.logger.error('[Trading] Error opening trade:', err.message);
      return false;
    }
  }
  
  cleanup() {}
}

module.exports = new TradingAddon();
