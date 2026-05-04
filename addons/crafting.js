class CraftingAddon {
  constructor() {
    this.name = 'crafting';
    this.bot = null;
    this.engine = null;
    this.logger = null;
  }
  
  init(bot, engine) {
    this.bot = bot;
    this.engine = engine;
    this.logger = engine.getLogger();
  }
  
  async craftItem(itemName, count = 1) {
    try {
      const mcData = require('minecraft-data')(this.bot.version);
      const item = mcData.itemsByName[itemName];
      
      if (!item) {
        this.logger.warn(`[Crafting] Unknown item: ${itemName}`);
        return false;
      }
      
      const recipe = this.bot.recipesFor(item.id, null, 1, null)[0];
      
      if (!recipe) {
        this.logger.warn(`[Crafting] No recipe for: ${itemName}`);
        return false;
      }
      
      await this.bot.craft(recipe, count);
      this.logger.info(`[Crafting] Crafted ${count}x ${itemName}`);
      return true;
    } catch (err) {
      this.logger.error(`[Crafting] Error crafting ${itemName}:`, err.message);
      return false;
    }
  }
  
  canCraft(itemName) {
    try {
      const mcData = require('minecraft-data')(this.bot.version);
      const item = mcData.itemsByName[itemName];
      
      if (!item) return false;
      
      const recipes = this.bot.recipesFor(item.id, null, 1, null);
      return recipes && recipes.length > 0;
    } catch (err) {
      return false;
    }
  }
  
  cleanup() {}
}

module.exports = new CraftingAddon();
