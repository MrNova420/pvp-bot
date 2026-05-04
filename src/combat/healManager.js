class HealManager {
  constructor(bot, logger, config) {
    this.bot = bot;
    this.logger = logger;
    this.config = config;
    
    this.healInterval = null;
    this.autoHeal = config.combat?.autoHeal !== false;
    this.healThreshold = config.combat?.healThreshold || 14;
    this.lastEat = 0;
    this.eatCooldown = 2000;
  }

  start() {
    if (!this.autoHeal) return;
    
    this.healInterval = setInterval(() => {
      this._healLoop();
    }, 1000);
    
    this.logger.info('Heal manager started');
  }

  stop() {
    if (this.healInterval) {
      clearInterval(this.healInterval);
      this.healInterval = null;
    }
  }

  _healLoop() {
    if (!this.bot.entity) return;
    
    if (this.bot.food < this.healThreshold) {
      this.tryHeal();
    }
  }

  tryHeal() {
    const now = Date.now();
    if (now - this.lastEat < this.eatCooldown) return;
    
    if (!this.bot.heldItem) return;
    
    const itemName = this.bot.heldItem.name;
    const foodItems = [
      'apple',
      'bread',
      'carrot',
      'cooked_beef',
      'cooked_chicken',
      'cooked_porkchop',
      'cooked_salmon',
      'golden_apple',
      'enchanted_golden_apple',
      'melon_slice',
      'golden_carrot',
      'suspicious_stew',
      'honey_bottle',
      'cooked_mutton'
    ];
    
    if (foodItems.some(food => itemName.includes(food))) {
      this.bot.consume((err) => {
        if (!err) {
          this.logger.info('Ate food');
          this.lastEat = now;
        }
      });
      return;
    }
    
    const foods = this.bot.inventory.items().filter(item => {
      return foodItems.some(food => item.name.includes(food));
    });
    
    if (foods.length > 0) {
      this.bot.equip(foods[0], 'hand', (err) => {
        if (!err) {
          this.bot.consume((e) => {
            if (!e) {
              this.logger.info('Ate food from inventory');
              this.lastEat = now;
            }
          });
        }
      });
    }
  }

  checkHealth() {
    return this.bot.health;
  }

  isLowHealth() {
    return this.bot.health <= this.healThreshold;
  }
}

module.exports = HealManager;