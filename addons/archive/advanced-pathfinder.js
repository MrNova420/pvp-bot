class AdvancedPathfinderAddon {
  constructor() {
    this.name = 'advanced-pathfinder';
    this.bot = null;
    this.engine = null;
    this.logger = null;
    this.enabled = false;
    this.pathfinder = null;
    this.goals = null;
    this.movements = null;
  }

  init(bot, engine) {
    this.bot = bot;
    this.engine = engine;
    this.logger = engine.getLogger();

    try {
      const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
      this.bot.loadPlugin(pathfinder);
      this.goals = goals;
      
      const mcData = require('minecraft-data')(this.bot.version);
      this.movements = new Movements(this.bot, mcData);
      this.bot.pathfinder.setMovements(this.movements);
      
      this.logger.info('[Pathfinder] Ready');
    } catch (err) {
      this.logger.error('[Pathfinder] Init failed:', err.message);
    }
  }

  async followPlayer(playerName, distance = 1) {
    if (!this.bot || !this.bot.pathfinder) return false;
    
    const player = this.bot.players[playerName];
    if (!player || !player.entity) {
      return false;
    }
    
    try {
      // Simple follow - just tell pathfinder to follow the entity
      // distance of 1 means stay right next to them
      const goal = new this.goals.GoalFollow(player.entity, distance);
      this.bot.pathfinder.setGoal(goal, true);
      return true;
    } catch (err) {
      this.logger.error('[Pathfinder] Follow error:', err.message);
      return false;
    }
  }

  async goto(x, y, z) {
    if (!this.bot.pathfinder) return false;
    
    try {
      const goal = new this.goals.GoalBlock(x, y, z);
      await this.bot.pathfinder.goto(goal);
      return true;
    } catch (err) {
      return false;
    }
  }

  stop() {
    if (this.bot && this.bot.pathfinder) {
      this.bot.pathfinder.setGoal(null);
    }
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
    this.stop();
  }

  cleanup() {
    this.disable();
    this.bot = null;
    this.engine = null;
    this.logger = null;
  }
}

module.exports = AdvancedPathfinderAddon;