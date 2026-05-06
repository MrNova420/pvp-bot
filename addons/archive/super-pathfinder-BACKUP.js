class SuperPathfinderAddon {
  constructor() {
    this.name = 'super-pathfinder';
    this.bot = null;
    this.engine = null;
    this.logger = null;
    this.enabled = false;
    
    this.pathfinder = null;
    this.goals = null;
    this.movements = null;
    
    this.following = false;
    this.followTarget = null;
    this.lastJumpTime = 0;
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
      
      this.movements = new Movements(this.bot, mcData, {
        canOpenDoors: true,
        canBreakDoors: true,
        canDig: true,
        avoidWater: false,
        swimUpwards: true,
        placeholderMaxDropAndBreak: 100
      });
      
      this.bot.pathfinder.setMovements(this.movements);
      
      this.bot.on('physicsTick', () => this.tick());
      
    } catch (err) {
      this.logger.error('[Super Pathfinder] Init failed:', err.message);
    }
  }

  tick() {
    if (!this.bot.entity || !this.following || !this.followTarget) return;
    
    const player = this.bot.players[this.followTarget];
    if (!player || !player.entity) return;
    
    const dist = this.bot.entity.position.distanceTo(player.entity.position);
    const now = Date.now();
    
    // Different tiers based on distance
    
    // Far - Pro jump-sprint
    if (dist > 4) {
      this.bot.setControlState('forward', true);
      this.bot.setControlState('sprint', true);
      if (this.bot.onGround && now - this.lastJumpTime > 150) {
        this.bot.setControlState('jump', true);
        this.lastJumpTime = now;
      }
    }
    // Medium - normal sprint
    else if (dist > 2) {
      this.bot.setControlState('forward', true);
      this.bot.setControlState('sprint', true);
      this.bot.setControlState('jump', false);
    }
    // Close - walk
    else if (dist > 1) {
      this.bot.setControlState('forward', true);
      this.bot.setControlState('sprint', false);
    }
    // Very close - stop
    else {
      this.bot.setControlState('forward', false);
      this.bot.setControlState('sprint', false);
      this.bot.setControlState('jump', false);
    }
  }

  async followPlayer(playerName, distance = 3) {
    if (!this.bot || !this.bot.pathfinder) return false;
    
    const player = this.bot.players[playerName];
    if (!player || !player.entity) return false;
    
    this.following = true;
    this.followTarget = playerName;
    this.lastJumpTime = 0;
    
    const goal = new this.goals.GoalFollow(player.entity, distance);
    this.bot.pathfinder.setGoal(goal, true);
    
    this.logger.info('[Super Pathfinder] Following ' + playerName);
    return true;
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
    this.following = false;
    this.followTarget = null;
    this.lastJumpTime = 0;
    
    if (this.bot?.pathfinder) {
      this.bot.pathfinder.setGoal(null);
    }
    this.bot?.clearControlStates();
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

module.exports = SuperPathfinderAddon;