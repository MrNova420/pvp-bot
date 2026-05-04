class MiningAddon {
  constructor() {
    this.name = 'mining';
    this.bot = null;
    this.engine = null;
    this.logger = null;
  }
  
  init(bot, engine) {
    this.bot = bot;
    this.engine = engine;
    this.logger = engine.getLogger();
  }
  
  async mineNearest(blockType) {
    try {
      const mcData = require('minecraft-data')(this.bot.version);
      const blockData = mcData.blocksByName[blockType];
      
      if (!blockData) {
        this.logger.warn(`[Mining] Unknown block: ${blockType}`);
        return false;
      }
      
      const block = this.bot.findBlock({
        matching: blockData.id,
        maxDistance: 64
      });
      
      if (!block) {
        this.logger.warn(`[Mining] No ${blockType} found nearby`);
        return false;
      }
      
      const tool = this._getBestTool(block);
      if (tool) {
        await this.bot.equip(tool, 'hand');
      }
      
      await this.bot.dig(block);
      this.engine.getSafety().recordBlock();
      this.logger.info(`[Mining] Mined ${blockType}`);
      return true;
    } catch (err) {
      this.logger.error(`[Mining] Error:`, err.message);
      return false;
    }
  }
  
  _getBestTool(block) {
    const tools = this.bot.inventory.items().filter(item => {
      return item.name.includes('pickaxe') || 
             item.name.includes('shovel') || 
             item.name.includes('axe');
    });
    
    if (tools.length === 0) return null;
    
    return tools[0];
  }
  
  cleanup() {}
}

module.exports = new MiningAddon();
