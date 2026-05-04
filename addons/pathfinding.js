class PathfindingAddon {
  constructor() {
    this.name = 'pathfinding';
    this.bot = null;
    this.engine = null;
    this.logger = null;
    this.pathfinder = null;
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
      const defaultMove = new Movements(this.bot, mcData);
      this.bot.pathfinder.setMovements(defaultMove);
      
      this.logger.info('[Pathfinding] Initialized');
    } catch (err) {
      this.logger.error('[Pathfinding] Failed to initialize:', err.message);
    }
  }
  
  async goTo(x, y, z) {
    if (!this.bot.pathfinder) return false;
    
    try {
      const goal = new this.goals.GoalBlock(x, y, z);
      await this.bot.pathfinder.goto(goal);
      this.logger.info(`[Pathfinding] Reached destination: (${x}, ${y}, ${z})`);
      return true;
    } catch (err) {
      this.logger.error(`[Pathfinding] Error:`, err.message);
      return false;
    }
  }
  
  async followPlayer(playerName) {
    const player = this.bot.players[playerName];
    if (!player || !player.entity) return false;
    
    try {
      const goal = new this.goals.GoalFollow(player.entity, 3);
      this.bot.pathfinder.setGoal(goal, true);
      this.logger.info(`[Pathfinding] Following ${playerName}`);
      return true;
    } catch (err) {
      this.logger.error(`[Pathfinding] Follow error:`, err.message);
      return false;
    }
  }
  
  stop() {
    if (this.bot && this.bot.pathfinder) {
      this.bot.pathfinder.setGoal(null);
    }
  }
  
  enable() {
  }
  
  disable() {
    this.stop();
  }
  
  cleanup() {
    this.stop();
  }
}

module.exports = new PathfindingAddon();
