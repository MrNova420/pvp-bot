class BuildingAddon {
  constructor() {
    this.name = 'building';
    this.bot = null;
    this.engine = null;
    this.logger = null;
  }
  
  init(bot, engine) {
    this.bot = bot;
    this.engine = engine;
    this.logger = engine.getLogger();
  }
  
  async placeBlock(blockType, x, y, z) {
    try {
      const mcData = require('minecraft-data')(this.bot.version);
      const blockData = mcData.blocksByName[blockType];
      
      if (!blockData) {
        this.logger.warn(`[Building] Unknown block: ${blockType}`);
        return false;
      }
      
      const item = this.bot.inventory.items().find(i => i.type === blockData.id);
      
      if (!item) {
        this.logger.warn(`[Building] No ${blockType} in inventory`);
        return false;
      }
      
      await this.bot.equip(item, 'hand');
      
      const referenceBlock = this.bot.blockAt(new (require('vec3'))(x, y - 1, z));
      
      if (!referenceBlock) {
        this.logger.warn('[Building] No reference block');
        return false;
      }
      
      await this.bot.placeBlock(referenceBlock, new (require('vec3'))(0, 1, 0));
      this.engine.getSafety().recordBlock();
      this.logger.info(`[Building] Placed ${blockType} at (${x}, ${y}, ${z})`);
      return true;
    } catch (err) {
      this.logger.error(`[Building] Error:`, err.message);
      return false;
    }
  }
  
  async buildWall(blockType, length, height) {
    const startPos = this.bot.entity.position;
    let placedBlocks = 0;
    
    for (let x = 0; x < length; x++) {
      for (let y = 0; y < height; y++) {
        const success = await this.placeBlock(
          blockType,
          Math.floor(startPos.x) + x,
          Math.floor(startPos.y) + y,
          Math.floor(startPos.z)
        );
        
        if (success) placedBlocks++;
      }
    }
    
    this.logger.info(`[Building] Built wall: ${placedBlocks} blocks placed`);
    return placedBlocks;
  }
  
  cleanup() {}
}

module.exports = new BuildingAddon();
